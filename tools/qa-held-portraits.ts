import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { heldPortraitDiscovery } from "./discover-held-portraits.js";
import { portraitLoopSignature } from "./held-portrait-loops.mjs";
import { verifyHeldPortraitPaint, type ChromeProof, type Pose } from "./verify-held-portrait-paint.js";

interface HeldPortraitInventory {
  scenes: { id: string; producer?: string; poses: Pose[]; chrome?: { original: ChromeProof; port: ChromeProof } }[];
}

type ScriptSite = typeof heldPortraitDiscovery.eclCandidates[number];
const scriptSiteId = (site: ScriptSite) => `${site.scriptArchive}:${site.scriptBlock}:${site.address}`;
const promptId = (cursor: string, caller: string | null) => caller ? `${cursor}/${caller}` : cursor;

export function heldPortraitCoverage(root = fileURLToPath(new URL("../", import.meta.url))) {
  const path = (...parts: string[]) => join(root, ...parts);
  const digest = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
  const renderer = digest(readFileSync(path("tools", "play.js"), "utf8").replace(/\r\n/g, "\n"));
  const inventory = JSON.parse(readFileSync(path("qa", "held-portraits.json"), "utf8")) as HeldPortraitInventory;
  const assets = new Map<string, string>();
  for (const name of ["upgrades/slums/manifest.json", "upgrades/manifest.json"]) {
    const manifest = JSON.parse(readFileSync(path(name), "utf8")) as { assets: Record<string, string> };
    for (const [id, file] of Object.entries(manifest.assets)) {
      if (id.startsWith("portrait:") || id.startsWith("scene-illustration:")) assets.set(id, path(dirname(name), file));
    }
  }
  const scenes = inventory.scenes.map(({ id, producer, poses, chrome }) => {
    const result = (reason: string | null) => ({ id, producer, verified: reason === null, reason });
    if (!chrome) return result("paired Chrome evidence is missing");
    try {
      for (const proof of [chrome.original, chrome.port]) {
        if (proof.rendererSha256 !== renderer) return result(`${proof.data} Chrome evidence predates the current renderer`);
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
    const evidence = observed.get(site) ?? [];
    const prompts = [...new Set(site.promptCandidates.map(({ next, caller }) => promptId(next, caller)))];
    const unmeasured = prompts.filter(prompt => !evidence.some(entry => entry.prompt === prompt));
    const measured = evidence.length > 0;
    // A variable selector may feed several portraits into the same prompt.
    // Observing one portrait cannot discharge the other possible selections.
    const verified = site.block !== null && measured && !unmeasured.length &&
      evidence.every(({ scene }) => scene.verified);
    return {
      id: scriptSiteId(site),
      source: `${site.pictureArchive}:${site.block ?? `selector ${site.selector.address?.toString(16) ?? "unknown"}`}`,
      measured, verified, unmeasured, scenes: evidence.map(({ scene }) => scene.id),
      reason: site.block === null ? "selector unresolved" : prompts.length ? null : "no prompt lead resolved",
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
  console.log(`Held portraits: ${report.verified} / ${report.total} picture sites verified (measured ${report.measured}), R = ${report.remaining}.`);
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
