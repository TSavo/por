type Producer = "ECL1.DAX:18:9964" | "ECL1.DAX:18:9b6d" | "ECL1.DAX:18:a140";
type Data = "original" | "port";
type View = "battle" | "scenery" | "encounter" | "portrait";

interface Requirement {
  route: string;
  checkpoint: string;
  caption: RegExp;
  view: View;
  approaches?: readonly string[];
  portrait?: string;
  nativeDraw: string;
  nativePrompt?: string;
}

export interface PodolChromeReceipt {
  route: string;
  data: Data;
  checkpointSha256: string;
  rendererSha256: string;
  caption: string;
  view: View;
  approaches: { id: string; sha256: string }[];
  portrait?: { id: string; sha256: string; durationMs?: number };
}

export interface PodolPatrolProof {
  producer: Producer;
  route: string;
  native: {
    draw: string;
    prompt?: string;
    sha256: string;
    caption: string;
    idlePolls?: number;
  };
  chrome: Record<Data, PodolChromeReceipt>;
}

interface Site {
  next: string;
  boundedBlocks?: number[];
  approachSites: string[];
  promptCandidates: { next: string; caller: string | null }[];
  immediateCombat: string | null;
}

interface ProofChecks {
  fixture: (checkpoint: string, sha256: string) => boolean;
  renderer: (sha256: string) => boolean;
  art: (id: string, sha256: string) => boolean;
}

const original = "podal-patrol-portraits/I.json";
const disguised = "podal-patrol-disguised/I.json";
const sneaking = "podal-patrol-sneaking/I.json";
const actors = [
  { name: "goblin", block: 2 },
  { name: "orc", block: 4 },
  { name: "hobgoblin", block: 6 },
  { name: "ogre", block: 8 },
] as const;

const sprite = (block: number, cursor: string, member: number) =>
  `encounter:area:18:ecl:${cursor}:SPRIT1.DAX:${block}:${member}:0`;
const word = (text: string) => text.replace(/\s/g, "").toUpperCase();
const sha256 = /^[a-f0-9]{64}$/;

function requirements(producer: Producer): Requirement[] {
  if (producer === "ECL1.DAX:18:9964") {
    return actors.map(({ name, block }) => ({
      route: block === 2 ? "podal-patrol-rest-ambush" : `podal-${name}-rest-ambush`,
      checkpoint: original, caption: /HITPOINTS.*MOVEVIEWAIM/, view: "battle",
      approaches: [sprite(block, "996d", 2)], nativeDraw: "996d",
    }));
  }
  if (producer === "ECL1.DAX:18:a140") {
    return actors.map(({ name, block }) => ({
      route: `podal-${name}-overheard-patrol`, checkpoint: disguised,
      caption: new RegExp(`ASYOUMOVEYOUOVERHEARSOME${name.toUpperCase()}SSAY,`),
      view: "scenery", approaches: [
        sprite(block, "a149", 2),
        ...(block === 8 ? [] : [sprite(block, "a163", 2)]),
        sprite(block, "a163", 1), sprite(block, "a181", 0),
      ],
      nativeDraw: "a181",
    }));
  }
  return [
    ...actors.map(({ name, block }): Requirement => ({
      route: `podal-${name}-patrol-sneak-hold`, checkpoint: sneaking,
      caption: new RegExp(`YOUSPOTAGROUPOF${name.toUpperCase()}S.*PRESS<ENTER>/<RETURN>TOCONTINUE`),
      view: "encounter", approaches: [sprite(block, "b240:caller:9d1f", 1)],
      nativeDraw: "9b7b", nativePrompt: "b240/9d1f",
    })),
    ...actors.map(({ name, block }): Requirement => ({
      route: `podal-${name}-patrol-demands-identity`, checkpoint: disguised,
      caption: new RegExp(`GROUPOF${name.toUpperCase()}S\\.THEY${block === 4 ? "CHECKOUT" : "GLAREAT"}YOURPARTY,ANDDEMAND,'WHOAREYOU\\?'.*HAUGHTYSLYNICEMEEKABUSIVE`),
      view: "portrait", portrait: `portrait:area:18:ecl:9c3f:PIC1.DAX:${block}:0:0`,
      nativeDraw: "9bce", nativePrompt: "9c3f",
    })),
  ];
}

export function podolPatrolCoverage(producer: string, site: Site, proofs: readonly PodolPatrolProof[], checks: ProofChecks) {
  if (producer !== "ECL1.DAX:18:9964" && producer !== "ECL1.DAX:18:9b6d" && producer !== "ECL1.DAX:18:a140") {
    return undefined;
  }
  const measured = proofs.some(proof => proof.producer === producer);
  const [next, combat, approaches, prompts] = producer === "ECL1.DAX:18:9964"
    ? ["996d", "9ded", "", ""]
    : producer === "ECL1.DAX:18:9b6d"
      ? ["9b76", null, "9b7b,9bce,9c30", "9c3f,b240/9d1f"]
      : ["a149", null, "a163,a181", ""];
  const promptIds = site.promptCandidates.map(({ next, caller }) => caller ? `${next}/${caller}` : next);
  if (site.next !== next || site.immediateCombat !== combat || site.boundedBlocks?.join(",") !== "2,4,6,8" ||
      site.approachSites.join(",") !== approaches || promptIds.sort().join(",") !== prompts) {
    return { measured, missing: ["native branch or selector changed"] };
  }
  const missing = requirements(producer).filter(expected => {
    const matching = proofs.filter(proof => proof.producer === producer && proof.route === expected.route);
    if (matching.length !== 1) return true;
    const proof = matching[0]!;
    const { native, chrome } = proof;
    if (native.draw !== expected.nativeDraw || native.prompt !== expected.nativePrompt || !sha256.test(native.sha256)) return true;
    if (!expected.caption.test(word(native.caption)) ||
        (expected.nativePrompt !== undefined && (native.idlePolls ?? 0) < 24)) return true;
    return !(["original", "port"] as const).every(data => {
      const receipt = chrome[data];
      if (!receipt || receipt.data !== data || receipt.route !== expected.route || receipt.view !== expected.view ||
          !checks.renderer(receipt.rendererSha256) || !checks.fixture(expected.checkpoint, receipt.checkpointSha256) ||
          !expected.caption.test(word(receipt.caption))) return false;
      if (receipt.approaches.map(pose => pose.id).join(",") !== (expected.approaches ?? []).join(",") ||
          !receipt.approaches.every(({ id, sha256 }) => checks.art(id, sha256))) return false;
      if (!expected.portrait) return !receipt.portrait;
      const portrait = receipt.portrait;
      return portrait?.id === expected.portrait && (portrait.durationMs ?? 0) >= 3650 &&
        checks.art(portrait.id, portrait.sha256);
    });
  }).map(({ route }) => route);
  return { measured, missing };
}
