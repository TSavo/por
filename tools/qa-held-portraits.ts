import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { isDeepStrictEqual } from "node:util";
import type { EncounterAnchor } from "../src/lib/assets.js";
import { heldPortraitDiscovery } from "./discover-held-portraits.js";
import type { EncounterPlacement } from "./encounter-art.js";
import { portraitLoopSignature } from "./held-portrait-loops.mjs";
import { verifyHeldPortraitPaint, type ChromeProof, type Pose } from "./verify-held-portrait-paint.js";

interface HeldPortraitInventory {
  scenes: {
    id: string;
    producer?: string;
    poses: Pose[];
    chrome?: { original: ChromeProof; port: ChromeProof };
    remainingCues?: string[];
    approachChrome?: { original: ApproachProof; port: ApproachProof };
  }[];
  sceneryPrompts?: SceneryPrompt[];
  staticPortraitPrompts?: StaticPortraitPrompt[];
}

interface SceneryProof {
  route: string;
  data: ChromeProof["data"];
  position: [number, number, number];
  caption: string;
  checkpointSha256: string;
  rendererSha256: string;
}

interface SceneryPrompt {
  producer: string;
  prompt: string;
  caption: string;
  checkpoint: string;
  position: [number, number, number];
  chrome: { original: SceneryProof; port: SceneryProof };
}

interface StaticPortraitChromeProof extends Omit<OneShotProof, "producer"> {
  caption: string;
  checkpointSha256: string;
  durationMs: number;
  samples: number;
  poses: string[];
  replaced: boolean;
}

interface StaticPortraitVariant {
  caption: string;
  checkpoint: string;
  portrait: string;
  native: {
    drawCursor: string;
    members?: number[];
    composed?: ScriptSite["composedPortrait"];
    heldCaption: string;
    idlePolls: number;
    panelSamples: { idlePolls: number; sha256: string }[];
    battlePanelSha256: string;
  };
  chrome?: { original: StaticPortraitChromeProof; port: StaticPortraitChromeProof };
}

interface StaticPortraitPrompt {
  producer: string;
  prompt: string;
  variants: StaticPortraitVariant[];
}

interface ApproachProof {
  route: string;
  data: ChromeProof["data"];
  rendererSha256: string;
  steps: { placement: EncounterPlacement; caption: string; sha256: string }[];
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

// Exact reviewed revisions that preserve the held portrait paint and timing code.
// This covers narration logging, the wilderness atlas, settings, and Classic palette-only clips.
const previousRendererProof = new Map<string, string>([
  // The publisher splash cleanup changes only the Classic title switch.
  ["5e85ce66c1cf3a5e4daa5c4da33c4bb0f1e440ec93368ab94157bc2312f13360",
    "e1a9d6795fd9c4c6251e83c8c403bb7032ce22cd05dccca755b8d12298ed2148"],
  ["a25fa97665544a065cee8986d0cf43dc3e5cebeb91ef17d5734051a801fb1d06",
    "b5456b97bd58b95bb61d643df48258b33ea946d3a63c22a1c5eb5db724ad5521"],
  ["40e3b6aa3c316d2d8e093b2ccbe82e167c15a73da050b955a6e6e948c2d2eaf4",
    "a25fa97665544a065cee8986d0cf43dc3e5cebeb91ef17d5734051a801fb1d06"],
  ["122ca5ba2735a1293db688ad12ab6f7b67ce92a7d4edbe30fb76edc33403f901",
    "40e3b6aa3c316d2d8e093b2ccbe82e167c15a73da050b955a6e6e948c2d2eaf4"],
  ["e1a9d6795fd9c4c6251e83c8c403bb7032ce22cd05dccca755b8d12298ed2148",
    "122ca5ba2735a1293db688ad12ab6f7b67ce92a7d4edbe30fb76edc33403f901"],
]);

export function heldPortraitCoverage(root = fileURLToPath(new URL("../", import.meta.url))) {
  const path = (...parts: string[]) => join(root, ...parts);
  const digest = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
  const renderer = digest(readFileSync(path("tools", "play.js"), "utf8").replace(/\r\n/g, "\n"));
  const acceptedRenderers = new Set<string>();
  for (let hash: string | undefined = renderer; hash && !acceptedRenderers.has(hash); hash = previousRendererProof.get(hash)) {
    acceptedRenderers.add(hash);
  }
  const matchesRenderer = (hash: string) => acceptedRenderers.has(hash);
  const inventory = JSON.parse(readFileSync(path("qa", "held-portraits.json"), "utf8")) as HeldPortraitInventory;
  const oneShots = JSON.parse(readFileSync(path("qa", "held-portrait-one-shots.json"), "utf8")) as OneShot[];
  const oneShotByProducer = new Map(oneShots.map(proof => [proof.producer, proof]));
  if (oneShotByProducer.size !== oneShots.length) throw new Error("Duplicate one-shot portrait producer");
  const assets = new Map<string, string>();
  const encounters = new Map<string, EncounterAnchor>();
  for (const name of ["upgrades/slums/manifest.json", "upgrades/manifest.json"]) {
    const manifest = JSON.parse(readFileSync(path(name), "utf8")) as {
      assets: Record<string, string>; encounters?: Record<string, EncounterAnchor>;
    };
    for (const [id, file] of Object.entries(manifest.assets)) {
      if (/^(portrait|scene-illustration|encounter):/.test(id)) assets.set(id, path(dirname(name), file));
    }
    for (const [id, anchor] of Object.entries(manifest.encounters ?? {})) encounters.set(id, anchor);
  }
  const normalizeCaption = (text: string) => text.replace(/[^a-z]/gi, "").toUpperCase();
  function approachCues(cues: string[] | undefined, proof: { original: ApproachProof; port: ApproachProof } | undefined) {
    if (!cues || !proof) return cues;
    const { original, port } = proof;
    if (original.route !== port.route || original.data !== "original" || port.data !== "port" ||
        !matchesRenderer(original.rendererSha256) || !matchesRenderer(port.rendererSha256)) return cues;
    return cues.filter(cue => {
      const caption = normalizeCaption(cue);
      return !original.steps.some(({ placement, sha256, caption: observed }) => {
        const [x, y, key, width, height, webglYOffset = 0] = placement;
        const anchor = encounters.get(key);
        const image = assets.get(key);
        if (!anchor || !image || x !== anchor.x || y !== anchor.y || width !== anchor.width || height !== anchor.height ||
            webglYOffset !== (anchor.webglYOffset ?? 0) || !normalizeCaption(observed).includes(caption) ||
            !existsSync(image) || digest(readFileSync(image)) !== sha256) return false;
        return port.steps.some(step => isDeepStrictEqual(step.placement, placement) &&
          step.sha256 === sha256 && normalizeCaption(step.caption).includes(caption));
      });
    });
  }
  const scenes = inventory.scenes.map(({ id, producer, poses, chrome, remainingCues, approachChrome }) => {
    remainingCues = approachCues(remainingCues, approachChrome);
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

  function verifiedSceneryPrompt(producer: string, prompt: string) {
    return inventory.sceneryPrompts?.some(proof => {
      if (proof.producer !== producer || proof.prompt !== prompt) return false;
      const { original, port } = proof.chrome;
      const fixture = path("qa", "fixtures", proof.checkpoint);
      const caption = normalizeCaption(proof.caption);
      if (!caption || original.route !== port.route || !existsSync(fixture)) return false;
      const checkpoint = digest(readFileSync(fixture));
      return (["original", "port"] as const).every(data => {
        const observed = proof.chrome[data];
        return observed.data === data && observed.rendererSha256 === renderer &&
          observed.checkpointSha256 === checkpoint && isDeepStrictEqual(observed.position, proof.position) &&
          normalizeCaption(observed.caption).includes(caption);
      });
    });
  }

  function staticPortraitProblem(site: ScriptSite, variant: StaticPortraitVariant): string | null {
    const { caption, checkpoint, portrait, native, chrome } = variant;
    const expectedCaption = normalizeCaption(caption);
    if (!normalizeCaption(native.heldCaption).includes(expectedCaption)) return "native evidence has a different caption";
    if (native.drawCursor !== site.next && !site.approachSites.includes(native.drawCursor)) {
      return "native draw cursor no longer matches the measured producer";
    }
    const samples = native.panelSamples;
    const panel = samples[0]?.sha256;
    const sourceMatches = site.composedPortrait
      ? native.members === undefined && isDeepStrictEqual(native.composed, site.composedPortrait)
      : native.composed === undefined && isDeepStrictEqual(native.members, [0]);
    if (!sourceMatches) return "native evidence has a different picture source or selector";
    if (!panel || !/^[a-f0-9]{64}$/.test(panel) ||
        native.idlePolls <= 0 || samples[0]?.idlePolls !== 0 || samples.at(-1)?.idlePolls !== native.idlePolls ||
        samples.some((sample, index) => sample.sha256 !== panel ||
          (index > 0 && sample.idlePolls <= samples[index - 1]!.idlePolls)) ||
        native.battlePanelSha256 !== panel) {
      return "native samples must hold the selected picture through the prompt and battle notice";
    }
    const fixture = path("qa", "fixtures", checkpoint);
    const image = assets.get(portrait);
    if (!existsSync(fixture) || !image || !existsSync(image)) return "missing static portrait art or checkpoint";
    const checkpointSha = digest(readFileSync(fixture));
    const artSha = digest(readFileSync(image));
    const bindingSha = digest(portraitLoopSignature(portrait));
    if (!chrome) return "paired Chrome evidence is missing";
    const { original, port } = chrome;
    if (original.route !== port.route) return "Chrome replays disagree";
    for (const data of ["original", "port"] as const) {
      const proof = chrome[data];
      if (proof.data !== data || !matchesRenderer(proof.rendererSha256) || proof.bindingSha256 !== bindingSha ||
          proof.checkpointSha256 !== checkpointSha || proof.artSha256 !== artSha) {
        return "Chrome proof predates the renderer, binding, artwork, or checkpoint";
      }
      if (!normalizeCaption(proof.caption).includes(expectedCaption) ||
          proof.portrait !== portrait || proof.replaced !== false || !(proof.durationMs >= 3000) ||
          !(proof.samples >= 90) || !isDeepStrictEqual(proof.poses, [portrait])) {
        return "Chrome did not hold the expected portrait and caption";
      }
    }
    return null;
  }

  type StaticEvidence = { scenes: typeof scenes; verified: boolean };
  const staticBySite = new Map<ScriptSite, Map<string, StaticEvidence>>();
  const allScenes = [...scenes];
  for (const { producer, prompt, variants } of inventory.staticPortraitPrompts ?? []) {
    const site = eclCandidates.find(candidate => scriptSiteId(candidate) === producer);
    if (!site?.promptCandidates.some(lead => promptId(lead.next, lead.caller) === prompt)) {
      throw new Error("Unknown static portrait prompt " + producer + "/" + prompt);
    }
    const evidence = staticBySite.get(site) ?? new Map<string, StaticEvidence>();
    const captions = variants.map(variant => normalizeCaption(variant.caption));
    const witnessed = new Set(variants.map(variant => variant.portrait));
    if (evidence.has(prompt) || !variants.length || captions.some(caption => !caption) ||
        new Set(captions).size !== variants.length || witnessed.size !== variants.length) {
      throw new Error("Missing or duplicate static portrait variants at " + producer + "/" + prompt);
    }
    const [cursor, caller] = prompt.split("/");
    const scope = "scene-illustration:area:" + site.scriptBlock + ":ecl:" + cursor + (caller ? ":caller:" + caller : "");
    const nativeSource = site.composedPortrait?.source ??
      (site.block === null ? undefined : `${site.pictureArchive}:${site.block}:0:0`);
    const nativeBase = nativeSource &&
      `portrait:area:${site.scriptBlock}:ecl:${cursor}${caller ? `:caller:${caller}` : ""}:${nativeSource}`;
    const illustration = (key: string) => key === scope || key.startsWith(scope + ":cue:");
    const scoped = (key: string) => illustration(key) || key === nativeBase;
    const observedVariants = variants.map(variant => {
      const reason = scoped(variant.portrait) ? staticPortraitProblem(site, variant) : "static portrait belongs to a different prompt";
      return { id: variant.portrait, producer, verified: reason === null, reason, remainingCues: undefined };
    });
    // One caller can choose multiple cue illustrations. Every registered cue needs its own proof.
    const complete = [...assets.keys()].filter(illustration).every(key => witnessed.has(key));
    evidence.set(prompt, { scenes: observedVariants, verified: complete && observedVariants.every(scene => scene.verified) });
    staticBySite.set(site, evidence);
    allScenes.push(...observedVariants);
  }

  const sites = eclCandidates.map(site => {
    const id = scriptSiteId(site);
    const oneShot = oneShotByProducer.get(id);
    const oneShotReason = oneShot ? oneShotProblem(site, oneShot) : null;
    const evidence = observed.get(site) ?? [];
    const prompts = [...new Set(site.promptCandidates.map(({ next, caller }) => promptId(next, caller)))];
    const scenery = new Set(prompts.filter(prompt => verifiedSceneryPrompt(id, prompt)));
    const staticEvidence = staticBySite.get(site);
    const held = staticEvidence ? [...staticEvidence.values()].flatMap(proof => proof.scenes) : [];
    // One instruction can display several captions at the same cursor.
    const unmeasured = [
      ...prompts.filter(prompt => !scenery.has(prompt) && !staticEvidence?.get(prompt)?.verified &&
        !evidence.some(entry => entry.prompt === prompt)),
      ...new Set(evidence.flatMap(({ scene }) => scene.remainingCues ?? [])),
    ];
    const measured = evidence.length > 0 || held.length > 0 || oneShot !== undefined;
    // A variable selector may feed several portraits into the same prompt.
    // Observing one portrait cannot discharge the other possible selections.
    const verified = oneShot ? oneShotReason === null : site.block !== null && measured &&
      !unmeasured.length && held.every(scene => scene.verified) && evidence.every(({ scene }) => scene.verified);
    return {
      id,
      source: site.composedPortrait?.source ?? `${site.pictureArchive}:${site.block ?? `selector ${site.selector.address?.toString(16) ?? "unknown"}`}`,
      measured, verified, unmeasured, scenes: [...evidence.map(({ scene }) => scene.id), ...held.map(scene => scene.id)],
      reason: oneShot ? oneShotReason ?? "single native draw, paired Chrome checks passed" :
        site.block === null ? "selector unresolved" : scenery.size ? "paired Chrome checks confirmed scenery at " + [...scenery].join(", ") :
          prompts.length ? null : "no prompt lead resolved",
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
    scenesMeasured: allScenes.length,
    scenesVerified: allScenes.filter(scene => scene.verified).length,
    unmappedScenes: unmapped.length,
  };
  return { ...summary, remaining: summary.total - summary.verified, sites, scenes: allScenes, unmapped };
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
