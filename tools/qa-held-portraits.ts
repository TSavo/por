import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { isDeepStrictEqual } from "node:util";
import type { EncounterAnchor } from "../src/lib/assets.js";
import { heldPortraitDiscovery } from "./discover-held-portraits.js";
import { encounterKey, type EncounterPlacement } from "./encounter-art.js";
import { scriptIllustrations } from "./portrait-art.js";
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
  approachTransitions?: ApproachTransition[];
  combatWithoutPortraits?: CombatWithoutPortrait[];
}

interface EncounterPaint {
  placement: EncounterPlacement;
  sha256: string;
}

interface ApproachTransitionProof extends EncounterPaint {
  route: string;
  data: ChromeProof["data"];
  checkpointSha256: string;
  rendererSha256: string;
  nextPortrait: string;
}

interface ApproachTransition {
  producer: string;
  checkpoint: string;
  chrome: { original: ApproachTransitionProof; port: ApproachTransitionProof };
}

interface SceneryProof {
  route: string;
  data: ChromeProof["data"];
  position: [number, number, number];
  caption: string;
  checkpointSha256: string;
  rendererSha256: string;
  encounter?: EncounterPaint;
}

interface IllustratedSceneryProof extends Omit<SceneryProof, "position" | "encounter"> {
  portrait: string;
  sha256: string;
  paneSampleSha256: string;
  durationMs: number;
  samples: number;
  poses: string[];
}

type SceneryPrompt = {
  producer: string;
  prompt: string;
  caption: string;
  checkpoint: string;
} & ({
  position: [number, number, number];
  illustration?: never;
  chrome: { original: SceneryProof; port: SceneryProof };
} | {
  illustration: {
    id: string;
    native: {
      heldCaption: string;
      viewportSha256: string;
      pictureDraws: 0;
    };
  };
  chrome: { original: IllustratedSceneryProof; port: IllustratedSceneryProof };
});

interface StaticPortraitChromeProof extends Omit<OneShotProof, "producer"> {
  caption: string;
  incomingPortrait?: string;
  returnedApproach?: SceneryProof;
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
    heldCaption: string;
    idlePolls: number;
    panelSamples: { idlePolls: number; sha256: string }[];
  } & ({
    inheritedFrom?: never;
    inheritedMember?: never;
    drawCursor: string;
    members?: number[];
    composed?: ScriptSite["composedPortrait"];
  } & ({ battlePanelSha256: string; clearedPanelSha256?: never } |
       { battlePanelSha256?: never; clearedPanelSha256: string }) | {
    inheritedFrom?: never;
    inheritedMember?: never;
    drawCursor: string;
    composed?: never;
    retainedApproach: {
      placement: EncounterPlacement;
      position: SceneryProof["position"];
      returnedPanelSha256: string;
    };
  } | {
    inheritedFrom: string;
    inheritedMember?: number;
  });
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
  steps: (EncounterPaint & { caption: string })[];
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
  native: { drawCursor: string; evidence: string } & ({ members: number[] } | { composed: string });
  chrome: { original: OneShotProof; port: OneShotProof };
}

interface CombatWithoutPortrait {
  producer: string;
  combat: string;
  checkpoint: string;
  native: { approachDraws: Record<ChromeProof["data"], number>; evidence: string };
  chrome: Record<ChromeProof["data"], OneShotProof & { checkpointSha256: string }>;
}

type ScriptSite = typeof heldPortraitDiscovery.eclCandidates[number];
const scriptSiteId = (site: ScriptSite) => `${site.scriptArchive}:${site.scriptBlock}:${site.address}`;
const promptId = (cursor: string, caller: string | null) => caller ? `${cursor}/${caller}` : cursor;

const landmarkOverlandRenderer = "e57b7792a347ed2c98757fbe4f30fde819f94b2d103865f7d07ad5a0abb78497";
const saltlineExplorationRenderer = "90fb7e1b9dd389ea45605810f27ca019f6c0e11650985cac7edd0f5dd52c8e20";
const explorationMovementRenderer = "256261c40a690714d94703629e96516402dafed25462c5dcb34db9789f18db4f";
const titleBuildVersionRenderer = "14d61fd7ee9265e1b34205a359a7631c932bdba29f274fcf406065a2f4969489";
const battleEntryRenderer = "1ff8ef0a4d635d4390caaad3f85782fd99c4728df2051a01d8477381403db6ed";
const wetOverlandRenderer = "9bfeac762a897378393767763da854233f71e30be96d9d080c8c1454d1f7715a";
const localOverlandRenderer = "670f378f0b468f4d0a0a1423a530f58a201df0c691dbdbf085d0781222ddea74";
const auctionMenusRenderer = "2defbf41128e63bc3acac2f0a794de76dfffb2d906573403576e5b7fa3ab462b";
const captivePenMenusRenderer = "f1294e65d761f61f763319e6521f74f0b5f28ab57c6eb67c0251971fbdff060c";
const pittMenuRenderer = "63ed7feeedcc946fa2d875929600db3ad193e883eb12beb0e83f2ec54c1c85b9";
const rendererBeforePittMenus = "c3582f5d74fae550739186491060b39f7fcbd25c399b99de80a104f1d1f8808e";

// Exact reviewed revisions that preserve the held portrait paint and timing code.
// This covers narration logging, the wilderness atlas, settings, and Classic palette-only clips.
const previousRendererProof = new Map<string, string>([
  // Only native battle setup polls resume after the notice paint. The Bane
  // altar and Kobold throne checks cover the notice and opening turn in both data modes.
  [battleEntryRenderer, titleBuildVersionRenderer],
  // The build version changes only the title screen label.
  [titleBuildVersionRenderer, explorationMovementRenderer],
  // The tween draws the exploration viewport and local map marker. Portrait
  // selection, animation deadlines, and paint surfaces still use the discrete state.
  [explorationMovementRenderer, saltlineExplorationRenderer],
  // The renderer rename and lighting affect the WebGL exploration atlas and canvas.
  [saltlineExplorationRenderer, landmarkOverlandRenderer],
  // The local landmark plane is drawn only inside a window with authored feature artwork.
  [landmarkOverlandRenderer, wetOverlandRenderer],
  // Detail masks are loaded only for a complete local window that uses authored wet terrain.
  [wetOverlandRenderer, localOverlandRenderer],
  // The local terrain branch needs a native overland encounter with complete authored slots.
  // The held portraits and their local approach receipts use other surfaces.
  [localOverlandRenderer, auctionMenusRenderer],
  // Only the three Podal auction menu transitions change. Their receipt records the new renderer.
  [auctionMenusRenderer, captivePenMenusRenderer],
  // The two Pitt menus keep their incoming pose. Existing loops and scenery are untouched.
  [pittMenuRenderer, rendererBeforePittMenus],
  // The two captive-pen prompts retain the already decoded merchant pose.
  [captivePenMenusRenderer, pittMenuRenderer],
  // Classic skips the new Enhanced-only abandoned camp clip. Existing clips keep their filters.
  ["c3582f5d74fae550739186491060b39f7fcbd25c399b99de80a104f1d1f8808e",
    "db6e5267e6521bc9737d197ed4eca705e396fdc5a1e0f4253f6bff07487724d0"],
  // The Slums secret cache uses the existing full-screen reward layout.
  ["db6e5267e6521bc9737d197ed4eca705e396fdc5a1e0f4253f6bff07487724d0",
    "4a5ce4805ccc29ba0770cc0246dc6e35173ba6e789188d5e2500bced96a31584"],
  // Swapping decoded held cels preserves the bindings, deadlines and panel layout.
  // Paired Chrome controls cover every prior loop with a distinct 20 ms pose.
  ["4a5ce4805ccc29ba0770cc0246dc6e35173ba6e789188d5e2500bced96a31584",
    "5e85ce66c1cf3a5e4daa5c4da33c4bb0f1e440ec93368ab94157bc2312f13360"],
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
  // Checkpoints are JSON text. Git can change their line endings between capture and checkout.
  function checkpointDigests(file: string) {
    const text = readFileSync(file, "utf8").replace(/\r\n/g, "\n");
    return new Set([digest(text), digest(text.replace(/\n/g, "\r\n"))]);
  }
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
  function verifiedEncounterAsset({ placement, sha256 }: EncounterPaint) {
    const [x, y, key, width, height, webglYOffset = 0] = placement;
    const anchor = encounters.get(key);
    const image = assets.get(key);
    return Boolean(anchor && image && x === anchor.x && y === anchor.y && width === anchor.width &&
      height === anchor.height && webglYOffset === (anchor.webglYOffset ?? 0) &&
      existsSync(image) && digest(readFileSync(image)) === sha256);
  }
  function approachCues(cues: string[] | undefined, proof: { original: ApproachProof; port: ApproachProof } | undefined) {
    if (!cues || !proof) return cues;
    const { original, port } = proof;
    if (original.route !== port.route || original.data !== "original" || port.data !== "port" ||
        !matchesRenderer(original.rendererSha256) || !matchesRenderer(port.rendererSha256)) return cues;
    return cues.filter(cue => {
      const caption = normalizeCaption(cue);
      return !original.steps.some(step =>
        normalizeCaption(step.caption).includes(caption) && verifiedEncounterAsset(step) &&
        port.steps.some(other => isDeepStrictEqual(other.placement, step.placement) &&
          other.sha256 === step.sha256 && normalizeCaption(other.caption).includes(caption)));
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
    if (!evidence.native.evidence) return "native draw evidence is missing";
    if ("composed" in evidence.native) {
      const source = evidence.native.composed;
      const portrait = evidence.chrome.original.portrait;
      const combatIllustration = /^scene-illustration:area:(\d+):ecl:([a-f0-9]+)(?::cue:[\w-]+)?$/.exec(portrait);
      const matchesCombat = Number(combatIllustration?.[1]) === site.scriptBlock &&
        (combatIllustration?.[2] === site.immediateCombat || combatIllustration?.[2] === site.immediateCombatResume);
      if (source !== site.composedPortrait?.source || (!portrait.endsWith(":" + source) && !matchesCombat)) {
        return "native evidence must match the composed portrait selected by the script";
      }
    } else if (evidence.native.members.length !== 1 || evidence.native.members[0] !== 0) {
      return "native evidence must show a single draw of member 0";
    }
    return combatArtProblem(evidence.producer, evidence.chrome);
  }

  function combatArtProblem(producer: string, { original, port }: OneShot["chrome"]) {
    if (original.route !== port.route || original.portrait !== port.portrait) return "Chrome replays disagree";
    for (const [data, proof] of Object.entries({ original, port })) {
      if (proof.data !== data || proof.producer !== producer || !matchesRenderer(proof.rendererSha256) ||
          proof.bindingSha256 !== digest(portraitLoopSignature(proof.portrait))) return "Chrome proof predates the current renderer or binding";
      const image = assets.get(proof.portrait);
      if (!image || digest(readFileSync(image)) !== proof.artSha256) return "Chrome proof predates the current artwork";
    }
    return null;
  }

  const combatWithoutPortraits = inventory.combatWithoutPortraits ?? [];
  const combatWithoutPortraitByProducer = new Map(combatWithoutPortraits.map(proof => [proof.producer, proof]));
  if (combatWithoutPortraitByProducer.size !== combatWithoutPortraits.length) {
    throw new Error("Duplicate combat producer without a native portrait");
  }
  for (const { producer } of combatWithoutPortraits) {
    if (oneShotByProducer.has(producer) || !eclCandidates.some(site => scriptSiteId(site) === producer)) {
      throw new Error(`Invalid combat producer without a native portrait ${producer}`);
    }
  }

  function combatWithoutPortraitProblem(site: ScriptSite, proof: CombatWithoutPortrait) {
    if (site.opcode !== 0x0c || site.block === null || site.promptCandidates.length || site.immediateCombat !== proof.combat) {
      return "native script no longer leads directly to the measured fight";
    }
    const { original, port } = proof.native.approachDraws;
    if (!proof.native.evidence || !Number.isInteger(original) || original < 0 || original !== port) {
      return "native approach counts do not match";
    }
    const fixture = path("qa", "fixtures", proof.checkpoint);
    if (!existsSync(fixture)) return "combat replay save is missing";
    const hashes = checkpointDigests(fixture);
    if (!hashes.has(proof.chrome.original.checkpointSha256) || !hashes.has(proof.chrome.port.checkpointSha256)) {
      return "Chrome proof predates the current replay save";
    }
    return combatArtProblem(proof.producer, proof.chrome);
  }
  const observed = new Map<ScriptSite, { prompt: string; block: number; scene: typeof scenes[number] }[]>();
  const unmapped = [];
  for (const scene of scenes) {
    const scope = /^area:(\d+):ecl:([a-f\d]{4})(?::caller:([a-f\d]{4}))?:(PIC[1-8]\.DAX):(\d+)$/.exec(scene.id);
    if (!scope) throw new Error(`Invalid held portrait scene ${scene.id}`);
    const [, area, cursor, caller, archive, block] = scope;
    const prompt = promptId(cursor!, caller ?? null);
    const matches = eclCandidates.filter(site => (scene.producer ? scriptSiteId(site) === scene.producer : site.scriptBlock === Number(area)) &&
      site.pictureArchive === archive && (site.block === null || site.block === Number(block)) &&
      (!site.boundedBlocks || site.boundedBlocks.includes(Number(block))) &&
      site.promptCandidates.some(lead => promptId(lead.next, lead.caller) === prompt));
    // A shared scene key alone cannot identify which of two loads supplied the picture.
    if (matches.length !== 1) {
      unmapped.push({ id: scene.id, sites: matches.map(scriptSiteId) });
      continue;
    }
    const site = matches[0]!;
    const evidence = observed.get(site) ?? [];
    evidence.push({ prompt, block: Number(block), scene });
    observed.set(site, evidence);
  }

  function verifiedSceneryPrompt(producer: string, prompt: string) {
    return inventory.sceneryPrompts?.some(proof => {
      if (proof.producer !== producer || proof.prompt !== prompt) return false;
      const fixture = path("qa", "fixtures", proof.checkpoint);
      const caption = normalizeCaption(proof.caption);
      if (!caption || proof.chrome.original.route !== proof.chrome.port.route || !existsSync(fixture)) return false;
      const checkpoint = checkpointDigests(fixture);
      if (proof.illustration) {
        const { id, native } = proof.illustration;
        const [, area] = producer.split(":");
        const [cursor, caller] = prompt.split("/");
        const [, artArea, artCursor, artCaller] =
          /^scene-illustration:area:(\d+):ecl:([a-f\d]{4})(?::caller:([a-f\d]{4}))?(?::cue:[a-z\d-]+)?$/.exec(id) ?? [];
        // The mansion map and the exterior share ECL1 block 24.
        const matchingArea = artArea === area || (artArea === "31" && producer.startsWith("ECL1.DAX:24:"));
        const image = assets.get(id);
        const pane = proof.chrome.original.paneSampleSha256;
        if (!matchingArea || artCursor !== cursor || artCaller !== caller || !scriptIllustrations.has(id) ||
            !image || !existsSync(image) || native.pictureDraws !== 0 || !/^[a-f0-9]{64}$/.test(native.viewportSha256) ||
            !normalizeCaption(native.heldCaption).includes(caption) || !/^[a-f0-9]{64}$/.test(pane)) return false;
        const sha256 = digest(readFileSync(image));
        return (["original", "port"] as const).every(data => {
          const observed = proof.chrome[data];
          return observed.data === data && matchesRenderer(observed.rendererSha256) &&
            checkpoint.has(observed.checkpointSha256) && normalizeCaption(observed.caption).includes(caption) &&
            observed.portrait === id && observed.sha256 === sha256 && observed.paneSampleSha256 === pane &&
            observed.durationMs >= 2000 && observed.samples >= 30 && isDeepStrictEqual(observed.poses, [id]);
        });
      }
      const { original, port } = proof.chrome;
      if (!isDeepStrictEqual(original.encounter, port.encounter) ||
          (original.encounter && !verifiedEncounterAsset(original.encounter))) return false;
      return (["original", "port"] as const).every(data => {
        const observed = proof.chrome[data];
        const reviewed = [landmarkOverlandRenderer, wetOverlandRenderer, localOverlandRenderer, auctionMenusRenderer, captivePenMenusRenderer, pittMenuRenderer, rendererBeforePittMenus];
        const sceneryRevision = (hash: string) => hash === titleBuildVersionRenderer || hash === battleEntryRenderer
          ? explorationMovementRenderer : hash;
        const sceneryRenderer = sceneryRevision(renderer);
        const revision = reviewed.indexOf(sceneryRenderer);
        const observedRenderer = sceneryRevision(observed.rendererSha256);
        const sameSceneryRenderer = observedRenderer === sceneryRenderer ||
          (revision >= 0 && reviewed.slice(revision + 1).includes(observedRenderer));
        return observed.data === data && sameSceneryRenderer &&
          checkpoint.has(observed.checkpointSha256) && isDeepStrictEqual(observed.position, proof.position) &&
          normalizeCaption(observed.caption).includes(caption);
      });
    });
  }

  function staticPortraitProblem(site: ScriptSite, prompt: string, variant: StaticPortraitVariant): string | null {
    const { caption, checkpoint, portrait, native, chrome } = variant;
    const expectedCaption = normalizeCaption(caption);
    if (!normalizeCaption(native.heldCaption).includes(expectedCaption)) return "native evidence has a different caption";
    const samples = native.panelSamples;
    const panel = samples[0]?.sha256;
    if (!panel || !/^[a-f0-9]{64}$/.test(panel) ||
        native.idlePolls <= 0 || samples[0]?.idlePolls !== 0 || samples.at(-1)?.idlePolls !== native.idlePolls ||
        samples.some((sample, index) => sample.sha256 !== panel ||
          (index > 0 && sample.idlePolls <= samples[index - 1]!.idlePolls))) {
      return "native samples must hold the same picture through the prompt";
    }
    if ("retainedApproach" in native) {
      const { placement, position, returnedPanelSha256 } = native.retainedApproach;
      const sprite = encounterKey.exec(placement[2]);
      if (site.opcode !== 0x0c || !portrait.startsWith("scene-illustration:") || native.drawCursor !== site.next ||
          !sprite || Number(sprite[1]) !== site.scriptBlock || sprite[4] !== "SPRIT" + site.scriptArchive[3] + ".DAX" ||
          Number(sprite[5]) !== site.approachSelectors?.sprite.literal ||
          Number(sprite[6]) !== site.approachSelectors?.distance.literal ||
          position[0] !== site.scriptBlock || returnedPanelSha256 !== panel) {
        return "native illustration must retain the measured approach at the same position";
      }
    } else if (native.inheritedFrom !== undefined) {
      const producer = scriptSiteId(site);
      const source = inventory.scenes.find(scene => scene.id === native.inheritedFrom && scene.producer === producer);
      const verified = scenes.some(scene => scene.id === native.inheritedFrom && scene.producer === producer && scene.verified);
      const member = native.inheritedMember ?? 0;
      if (!verified || !source?.chrome || !source.poses.some(pose => pose.member === member && pose.viewport === panel)) {
        return "retained static portrait must match the native member of a verified scene from the same producer";
      }
      if (native.inheritedMember === undefined) {
        if (source.chrome.original.portrait !== portrait || source.chrome.port.portrait !== portrait) {
          return "retained static portrait must show its inherited picture";
        }
      } else {
        const incoming = `portrait:${source.id}:${member}:0`;
        const target = assets.get(portrait);
        if (!target || !existsSync(target)) return "retained portrait pose is missing its target artwork";
        const artSha = digest(readFileSync(target));
        const incomingChrome = source.chrome;
        if ((["original", "port"] as const).some(data =>
          chrome?.[data].incomingPortrait !== incoming || incomingChrome[data].sha256[incoming] !== artSha)) {
          return "Chrome must retain the measured incoming pose";
        }
      }
    } else {
      const retained = site.retainedComposedDraw;
      const draws = retained?.prompt === prompt ? [retained.cursor] : [site.next, ...site.approachSites];
      if (!draws.includes(native.drawCursor)) return "native draw cursor no longer matches the measured producer";
      const compositions = site.composedPortraitVariants ?? (site.composedPortrait ? [site.composedPortrait] : []);
      const sourceMatches = compositions.length
        ? native.members === undefined && compositions.some(composition => isDeepStrictEqual(native.composed, composition))
        : native.composed === undefined && isDeepStrictEqual(native.members, [0]);
      if (!sourceMatches) return "native evidence has a different picture source or selector";
      if (native.clearedPanelSha256 !== undefined) {
        if (!compositions.length || !/^[a-f0-9]{64}$/.test(native.clearedPanelSha256) ||
            native.clearedPanelSha256 === panel) return "native exit must clear the composed picture";
      } else if (native.battlePanelSha256 !== panel) return "native battle notice must retain the selected picture";
    }
    const fixture = path("qa", "fixtures", checkpoint);
    const image = assets.get(portrait);
    if (!existsSync(fixture) || !image || !existsSync(image)) return "missing static portrait art or checkpoint";
    const checkpointSha = checkpointDigests(fixture);
    const artSha = digest(readFileSync(image));
    const bindingSha = digest(portraitLoopSignature(portrait));
    if (!chrome) return "paired Chrome evidence is missing";
    const { original, port } = chrome;
    if (original.route !== port.route) return "Chrome replays disagree";
    for (const data of ["original", "port"] as const) {
      const proof = chrome[data];
      if (proof.data !== data || !matchesRenderer(proof.rendererSha256) || proof.bindingSha256 !== bindingSha ||
          !checkpointSha.has(proof.checkpointSha256) || proof.artSha256 !== artSha) {
        return "Chrome proof predates the renderer, binding, artwork, or checkpoint";
      }
      if (!normalizeCaption(proof.caption).includes(expectedCaption) ||
          proof.portrait !== portrait || proof.replaced !== false || !(proof.durationMs >= 3000) ||
          !(proof.samples >= 90) || !isDeepStrictEqual(proof.poses, [portrait])) {
        return "Chrome did not hold the expected portrait and caption";
      }
      if ("retainedApproach" in native) {
        const returned = proof.returnedApproach;
        if (!returned?.encounter || returned.route !== proof.route || returned.data !== proof.data ||
            returned.checkpointSha256 !== proof.checkpointSha256 || returned.rendererSha256 !== proof.rendererSha256 ||
            !isDeepStrictEqual(returned.position, native.retainedApproach.position) ||
            !isDeepStrictEqual(returned.encounter.placement, native.retainedApproach.placement) ||
            !verifiedEncounterAsset(returned.encounter)) {
          return "Chrome must restore the measured approach after the illustration";
        }
      }
    }
    return null;
  }

  type StaticEvidence = { scenes: typeof scenes; verified: boolean; compositions: Set<string> };
  const staticBySite = new Map<ScriptSite, Map<string, StaticEvidence>>();
  const allScenes = [...scenes];
  for (const { producer, prompt, variants } of inventory.staticPortraitPrompts ?? []) {
    const site = eclCandidates.find(candidate => scriptSiteId(candidate) === producer);
    if (!site?.promptCandidates.some(lead => promptId(lead.next, lead.caller) === prompt)) {
      throw new Error("Unknown static portrait prompt " + producer + "/" + prompt);
    }
    const evidence = staticBySite.get(site) ?? new Map<string, StaticEvidence>();
    const captions = variants.map(variant => normalizeCaption(variant.caption));
    const cueAndMembers = variants.map(({ native }, index) =>
      `${captions[index]}:${native.inheritedMember ?? ""}:${(native.inheritedFrom === undefined ? native.composed?.source : undefined) ?? ""}`);
    const witnessed = new Set(variants.map(variant => variant.portrait));
    if (evidence.has(prompt) || !variants.length || captions.some(caption => !caption) ||
        new Set(cueAndMembers).size !== variants.length || witnessed.size !== variants.length) {
      throw new Error("Missing or duplicate static portrait variants at " + producer + "/" + prompt);
    }
    const [cursor, caller] = prompt.split("/");
    const scope = "scene-illustration:area:" + site.scriptBlock + ":ecl:" + cursor + (caller ? ":caller:" + caller : "");
    const illustration = (key: string) => key === scope || key.startsWith(scope + ":cue:");
    const compositions = new Set<string>();
    const observedVariants = variants.map(variant => {
      const composition = variant.native.inheritedFrom === undefined ? variant.native.composed?.source : undefined;
      const nativeSource = composition ?? (site.block === null ? undefined : `${site.pictureArchive}:${site.block}:0:0`);
      const nativeBase = nativeSource &&
        `portrait:area:${site.scriptBlock}:ecl:${cursor}${caller ? `:caller:${caller}` : ""}:${nativeSource}`;
      const scoped = illustration(variant.portrait) || variant.portrait === nativeBase || (composition &&
        (variant.portrait === `portrait:area:${site.scriptBlock}:${composition}` || variant.portrait === `portrait:${composition}`));
      const member = variant.native.inheritedMember;
      const inheritedCaller = /:caller:([a-f\d]{4}):/.exec(variant.native.inheritedFrom ?? "")?.[1];
      const registeredMember = member !== undefined && nativeBase &&
        variant.portrait === nativeBase.replace(/:0:0$/, `:${member}:0`) &&
        site.promptCandidates.some(lead => promptId(lead.next, lead.caller) === prompt &&
          (lead.address === inheritedCaller || site.retainedVerticalMenus?.[prompt] === inheritedCaller));
      const reason = (member !== undefined ? registeredMember : scoped || variant.native.inheritedFrom !== undefined)
        ? staticPortraitProblem(site, prompt, variant) : "static portrait belongs to a different prompt";
      if (reason === null && composition) compositions.add(composition);
      return { id: variant.portrait, producer, verified: reason === null, reason, remainingCues: undefined };
    });
    // One caller can choose multiple cue illustrations. Every registered cue needs its own proof.
    const complete = [...assets.keys()].filter(illustration).every(key => witnessed.has(key)) &&
      variants.every(({ native }) => native.inheritedMember === undefined ||
        inventory.scenes.find(scene => scene.id === native.inheritedFrom && scene.producer === producer)?.poses.every(pose =>
          variants.some(variant => variant.native.inheritedFrom === native.inheritedFrom &&
            variant.native.inheritedMember !== undefined && variant.native.panelSamples[0]?.sha256 === pose.viewport)));
    evidence.set(prompt, { scenes: observedVariants, verified: complete && observedVariants.every(scene => scene.verified), compositions });
    staticBySite.set(site, evidence);
    allScenes.push(...observedVariants);
  }

  function verifiedApproachTransition(site: ScriptSite) {
    const handoff = site.approachHandoff;
    if (!handoff) return false;
    const menu = eclCandidates.find(candidate => candidate.scriptArchive === site.scriptArchive &&
      candidate.scriptBlock === site.scriptBlock && candidate.address === handoff.menu);
    const proof = menu && staticBySite.get(menu)?.get(handoff.prompt);
    if (!menu || !proof?.verified) return false;
    return inventory.approachTransitions?.some(transition => {
      if (transition.producer !== scriptSiteId(site)) return false;
      const { original, port } = transition.chrome;
      const checkpoint = path("qa", "fixtures", transition.checkpoint);
      if (!existsSync(checkpoint) || original.route !== port.route ||
          original.placement[2] !== handoff.sprite || !verifiedEncounterAsset(original) ||
          !isDeepStrictEqual(original.placement, port.placement) || original.sha256 !== port.sha256 ||
          original.nextPortrait !== port.nextPortrait ||
          !inventory.staticPortraitPrompts?.some(prompt => prompt.producer === scriptSiteId(menu) &&
            prompt.prompt === handoff.prompt && prompt.variants.some(variant =>
              variant.portrait === original.nextPortrait && variant.checkpoint === transition.checkpoint &&
              variant.chrome?.original.route === original.route))) return false;
      const hashes = checkpointDigests(checkpoint);
      return (["original", "port"] as const).every(data => {
        const observed = transition.chrome[data];
        return observed.data === data && hashes.has(observed.checkpointSha256) && matchesRenderer(observed.rendererSha256);
      });
    });
  }

  const sites = eclCandidates.map(site => {
    const id = scriptSiteId(site);
    if (site.unreachableOriginal) return {
      id, source: `${site.pictureArchive}:${site.block}`, measured: false, verified: false, unmeasured: [], scenes: [],
      unreachableOriginal: true, reason: site.unreachableOriginal,
    };
    const oneShot = oneShotByProducer.get(id);
    const oneShotReason = oneShot ? oneShotProblem(site, oneShot) : null;
    const combatWithoutPortrait = combatWithoutPortraitByProducer.get(id);
    const combatWithoutPortraitReason = combatWithoutPortrait ? combatWithoutPortraitProblem(site, combatWithoutPortrait) : null;
    const evidence = observed.get(site) ?? [];
    const prompts = [...new Set(site.promptCandidates.map(({ next, caller }) => promptId(next, caller)))];
    const scenery = new Set(prompts.filter(prompt => verifiedSceneryPrompt(id, prompt)));
    const staticEvidence = staticBySite.get(site);
    const held = staticEvidence ? [...staticEvidence.values()].flatMap(proof => proof.scenes) : [];
    // One instruction can display several captions at the same cursor.
    const missingPrompts = prompts.flatMap(prompt => {
      const held = staticEvidence?.get(prompt);
      if (site.composedPortraitVariants) {
        const missing = site.composedPortraitVariants.filter(({ source }) => !held?.compositions.has(source))
          .map(({ source }) => `${prompt} (${source})`);
        return missing.length || held?.verified ? missing : [prompt];
      }
      if (site.boundedBlocks && !site.composedPortrait) {
        return site.boundedBlocks.filter(block =>
          !evidence.some(entry => entry.prompt === prompt && entry.block === block && entry.scene.verified))
          .map(block => `${prompt} (${site.pictureArchive}:${block})`);
      }
      return scenery.has(prompt) || held?.verified || evidence.some(entry => entry.prompt === prompt) ? [] : [prompt];
    });
    const unmeasured = [
      ...missingPrompts,
      ...new Set(evidence.flatMap(({ scene }) => scene.remainingCues ?? [])),
    ];
    const approach = verifiedApproachTransition(site);
    const measured = evidence.length > 0 || held.length > 0 || scenery.size > 0 || Boolean(oneShot || combatWithoutPortrait || approach);
    // A variable selector may feed several portraits into the same prompt.
    // Observing one portrait cannot discharge the other possible selections.
    const verified = oneShot ? oneShotReason === null : combatWithoutPortrait ? combatWithoutPortraitReason === null :
      (site.block !== null || Boolean(site.boundedBlocks)) && measured &&
      !unmeasured.length && held.every(scene => scene.verified) && evidence.every(({ scene }) => scene.verified);
    return {
      id,
      source: site.composedPortraitVariants?.map(({ source }) => source).join(", ") ?? site.composedPortrait?.source ??
        `${site.pictureArchive}:${site.block ?? site.boundedBlocks?.join(", ") ?? `selector ${site.selector.address?.toString(16) ?? "unknown"}`}`,
      measured, verified, unmeasured, scenes: [...evidence.map(({ scene }) => scene.id), ...held.map(scene => scene.id)],
      reason: oneShot ? oneShotReason ?? "single native draw, paired Chrome checks passed" :
        combatWithoutPortrait ? combatWithoutPortraitReason ?? "no native portrait draw, paired Chrome checks passed" :
        site.block === null && !site.boundedBlocks ? "selector unresolved" : scenery.size ? "paired Chrome checks confirmed scenery at " + [...scenery].join(", ") :
          approach ? "paired Chrome checks confirmed approach into " + site.approachHandoff!.menu :
            prompts.length ? null : "no prompt lead resolved",
    };
  });
  for (const site of nativeCandidates.filter(({ status }) => status === "candidate")) {
    sites.push({
      id: `${site.unit}:${site.address}`, source: `${site.pictureArchive}:${site.block}`,
      measured: false, verified: false, unmeasured: [], scenes: [], reason: "restore bank and prompt unresolved",
    });
  }
  const unreachable = sites.filter(site => site.unreachableOriginal).length;
  const summary = {
    verified: sites.filter(site => site.verified).length,
    unreachable,
    reachable: sites.length - unreachable,
    oneShotsVerified: sites.filter(site => site.verified && oneShotByProducer.has(site.id)).length,
    measured: sites.filter(site => site.measured).length,
    total: sites.length,
    scenesMeasured: allScenes.length,
    scenesVerified: allScenes.filter(scene => scene.verified).length,
    unmappedScenes: unmapped.length,
  };
  return { ...summary, remaining: summary.reachable - summary.verified, sites, scenes: allScenes, unmapped };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const report = heldPortraitCoverage();
  console.log(`Held portraits: ${report.verified} / ${report.total} candidate sites visually verified (measured ${report.measured}, one-shot ${report.oneShotsVerified}). Reachable: ${report.reachable}, proven unreachable in original: ${report.unreachable}, R = ${report.remaining}.`);
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
