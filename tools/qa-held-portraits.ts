import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { heldPortraitDiscovery } from "./discover-held-portraits.js";
import { portraitLoopSignature } from "./held-portrait-loops.mjs";
import { verifyHeldPortraitPaint, type ChromeProof, type Pose } from "./verify-held-portrait-paint.js";

interface HeldPortraitInventory {
  scenes: {
    id: string;
    producer?: string;
    poses: Pose[];
    chrome?: { original: ChromeProof; port: ChromeProof };
    remainingCues?: string[];
  }[];
}

interface OneShotProof {
  producer: string;
  route: string;
  data: ChromeProof["data"];
  portrait: string;
  rendererSha256: string;
  bindingSha256: string;
  artSha256: string;
}

interface OneShot {
  producer: string;
  combat: string;
  native: { drawCursor: string; members: number[]; evidence: string };
  chrome: { original: OneShotProof; port: OneShotProof };
}

type ScriptSite = typeof heldPortraitDiscovery.eclCandidates[number];
const scriptSiteId = (site: ScriptSite) => `${site.scriptArchive}:${site.scriptBlock}:${site.address}`;
const promptId = (cursor: string, caller: string | null) => caller ? `${cursor}/${caller}` : cursor;

// 3e497fec changes the values recorded by logShownArtwork after drawing. Its
// exact output script can reuse captures of the preceding display code.
const previousRendererProof = new Map([
  ["a25fa97665544a065cee8986d0cf43dc3e5cebeb91ef17d5734051a801fb1d06",
    "b5456b97bd58b95bb61d643df48258b33ea946d3a63c22a1c5eb5db724ad5521"],
]);

export function heldPortraitCoverage(root = fileURLToPath(new URL("../", import.meta.url))) {
  const path = (...parts: string[]) => join(root, ...parts);
  const digest = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
  const renderer = digest(readFileSync(path("tools", "play.js"), "utf8").replace(/\r\n/g, "\n"));
  const previousRenderer = previousRendererProof.get(renderer);
  const matchesRenderer = (hash: string) => hash === renderer || (previousRenderer !== undefined && hash === previousRenderer);
  const inventory = JSON.parse(readFileSync(path("qa", "held-portraits.json"), "utf8")) as HeldPortraitInventory;
  const oneShots = JSON.parse(readFileSync(path("qa", "held-portrait-one-shots.json"), "utf8")) as OneShot[];
  const oneShotByProducer = new Map(oneShots.map(proof => [proof.producer, proof]));
  if (oneShotByProducer.size !== oneShots.length) throw new Error("Duplicate one-shot portrait producer");
  const assets = new Map<string, string>();
  for (const name of ["upgrades/slums/manifest.json", "upgrades/manifest.json"]) {
    const manifest = JSON.parse(readFileSync(path(name), "utf8")) as { assets: Record<string, string> };
    for (const [id, file] of Object.entries(manifest.assets)) {
      if (id.startsWith("portrait:") || id.startsWith("scene-illustration:")) assets.set(id, path(dirname(name), file));
    }
  }
  const scenes = inventory.scenes.map(({ id, producer, poses, chrome, remainingCues }) => {
    const result = (reason: string | null) => ({ id, producer, verified: reason === null, reason, remainingCues });
    if (!chrome) return result("paired Chrome evidence is missing");
    try {
      for (const proof of [chrome.original, chrome.port]) {
        if (!matchesRenderer(proof.rendererSha256)) return result(`${proof.data} Chrome evidence predates the current renderer`);
        if (!proof.portrait || proof.bindingSha256 !== digest(portraitLoopSignature(proof.portrait))) {
          return result(`${proof.data} Chrome evidence predates the current portrait binding`);
        }
        for (const [key, hash] of Object.entries(proof.sha256)) {
          const file = assets.get(key);
          if (!file || digest(readFileSync(file)) !== hash) return result(`the current art differs for ${key}`);
        }
      }
      verifyHeldPortraitPaint(id, poses, chrome.original, chrome.port);
    } catch (error) {
      return result(error instanceof Error ? error.message : String(error));
    }
    return result(null);
  });

  const { eclCandidates, nativeCandidates } = heldPortraitDiscovery;
  for (const { producer } of oneShots) {
    if (!eclCandidates.some(site => scriptSiteId(site) === producer)) throw new Error(`Unknown one-shot portrait producer ${producer}`);
  }
  function oneShotProblem(site: ScriptSite, evidence: OneShot): string | null {
    if (site.block === null || site.promptCandidates.length || site.immediateCombat !== evidence.combat) {
      return "native script no longer leads directly to the measured fight";
    }
    if (evidence.native.drawCursor !== site.next && !site.approachSites.includes(evidence.native.drawCursor)) {
      return "native draw cursor no longer matches the measured producer";
    }
    if (evidence.native.members.length !== 1 || evidence.native.members[0] !== 0 || !evidence.native.evidence) {
      return "native evidence must show a single draw of member 0";
    }
    const { original, port } = evidence.chrome;
    if (original.route !== port.route || original.portrait !== port.portrait) return "Chrome replays disagree";
    for (const [data, proof] of Object.entries(evidence.chrome)) {
      if (proof.data !== data || proof.producer !== evidence.producer || !matchesRenderer(proof.rendererSha256) ||
          proof.bindingSha256 !== digest(portraitLoopSignature(proof.portrait))) return "Chrome proof predates the current renderer or binding";
      const image = assets.get(proof.portrait);
      if (!image || digest(readFileSync(image)) !== proof.artSha256) return "Chrome proof predates the current artwork";
    }
    return null;
  }
  const observed = new Map<ScriptSite, { prompt: string; scene: typeof scenes[number] }[]>();
  const unmapped = [];
  for (const scene of scenes) {
    const scope = /^area:(\d+):ecl:([a-f\d]{4})(?::caller:([a-f\d]{4}))?:(PIC[1-8]\.DAX):(\d+)$/.exec(scene.id);
    if (!scope) throw new Error(`Invalid held portrait scene ${scene.id}`);
    const [, area, cursor, caller, archive, block] = scope;
    const prompt = promptId(cursor!, caller ?? null);
    const matches = eclCandidates.filter(site => (scene.producer ? scriptSiteId(site) === scene.producer : site.scriptBlock === Number(area)) &&
      site.pictureArchive === archive && (site.block === null || site.block === Number(block)) &&
      site.promptCandidates.some(lead => promptId(lead.next, lead.caller) === prompt));
    // A shared scene key alone cannot identify which of two loads supplied the picture.
    if (matches.length !== 1) {
      unmapped.push({ id: scene.id, sites: matches.map(scriptSiteId) });
      continue;
    }
    const site = matches[0]!;
    const evidence = observed.get(site) ?? [];
    evidence.push({ prompt, scene });
    observed.set(site, evidence);
  }

  const sites = eclCandidates.map(site => {
    const id = scriptSiteId(site);
    const oneShot = oneShotByProducer.get(id);
    const oneShotReason = oneShot ? oneShotProblem(site, oneShot) : null;
    const evidence = observed.get(site) ?? [];
    const prompts = [...new Set(site.promptCandidates.map(({ next, caller }) => promptId(next, caller)))];
    // One instruction can display several captions at the same cursor.
    const unmeasured = [
      ...prompts.filter(prompt => !evidence.some(entry => entry.prompt === prompt)),
      ...new Set(evidence.flatMap(({ scene }) => scene.remainingCues ?? [])),
    ];
    const measured = evidence.length > 0 || oneShot !== undefined;
    // A variable selector may feed several portraits into the same prompt.
    // Observing one portrait cannot discharge the other possible selections.
    const verified = oneShot ? oneShotReason === null : site.block !== null && evidence.length > 0 &&
      !unmeasured.length && evidence.every(({ scene }) => scene.verified);
    return {
      id,
      source: `${site.pictureArchive}:${site.block ?? `selector ${site.selector.address?.toString(16) ?? "unknown"}`}`,
      measured, verified, unmeasured, scenes: evidence.map(({ scene }) => scene.id),
      reason: oneShot ? oneShotReason ?? "single native draw, paired Chrome checks passed" :
        site.block === null ? "selector unresolved" : prompts.length ? null : "no prompt lead resolved",
    };
  });
  for (const site of nativeCandidates.filter(({ status }) => status === "candidate")) {
    sites.push({
      id: `${site.unit}:${site.address}`, source: `${site.pictureArchive}:${site.block}`,
      measured: false, verified: false, unmeasured: [], scenes: [], reason: "restore bank and prompt unresolved",
    });
  }
  const summary = {
    verified: sites.filter(site => site.verified).length,
    oneShotsVerified: sites.filter(site => site.verified && oneShotByProducer.has(site.id)).length,
    measured: sites.filter(site => site.measured).length,
    total: sites.length,
    scenesMeasured: scenes.length,
    scenesVerified: scenes.filter(scene => scene.verified).length,
    unmappedScenes: unmapped.length,
  };
  return { ...summary, remaining: summary.total - summary.verified, sites, scenes, unmapped };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const report = heldPortraitCoverage();
  console.log(`Held portraits: ${report.verified} / ${report.total} picture sites verified (measured ${report.measured}, one-shot ${report.oneShotsVerified}), R = ${report.remaining}.`);
  console.log(`Native prompt evidence: ${report.scenesVerified} / ${report.scenesMeasured} captured scenes passed paired Chrome checks.`);
  if (!process.argv.includes("--summary")) {
    console.log("Picture site              Source                   Measured  Verified");
    for (const site of report.sites) {
      const notes = [site.reason, site.unmeasured.length ? `unmeasured prompts ${site.unmeasured.join(", ")}` : null]
        .filter(Boolean).join(". ");
      console.log(`  ${site.id.padEnd(24)}${site.source.padEnd(26)}${(site.measured ? "yes" : "no").padEnd(10)}${site.verified ? "yes" : "no"}  ${notes}`.trimEnd());
      for (const id of site.scenes) {
        const scene = report.scenes.find(entry => entry.id === id)!;
        console.log(`    ${id} — ${scene.reason ?? "paired Chrome check passed"}`);
      }
    }
    for (const { id, sites } of report.unmapped) console.log(`  Unmapped ${id}${sites.length ? ` — multiple possible loads ${sites.join(", ")}` : ""}`);
  }
  if (report.remaining || report.unmappedScenes) process.exitCode = 1;
}
