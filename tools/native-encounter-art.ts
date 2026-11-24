import type { Cpu } from "../src/cpu/machine.js";
import type { EncounterAnchor } from "../src/lib/assets.js";
import { data } from "../src/runtime/bindings.js";
import type { PictureRecord } from "../src/runtime/game-data.js";
import type { EncounterPlacement } from "./encounter-art.js";

const address = (segment: number, offset: number) => ((segment << 4) + offset) & 0xfffff;

export function observeNativeEncounterArt(anchors: Record<string, EncounterAnchor>, viewport: () => Buffer,
  pictures: readonly PictureRecord[], viewportMark: () => number) {
  // Different SPRIT banks can store the exact same cel. The original
  // framebuffer matcher can find the area's artwork for any such copy.
  const bySignature = new Map<string, string[]>();
  const equivalents = new Map<string, string[]>();
  for (const { file, block, pictures: members } of pictures) {
    if (!/^SPRIT[1-8]\.DAX$/.test(file)) continue;
    members.forEach(({ width, height, x, y, frameHashes }, member) => {
      const hash = frameHashes[0];
      if (!hash) return;
      const signature = `${width}:${height}:${x}:${y}:${hash}`;
      const group = bySignature.get(signature) ?? [];
      const source = `${file}:${block}:${member}:0`;
      group.push(source);
      bySignature.set(signature, group);
      equivalents.set(source, group);
    });
  }
  const members = new Map<number, string>();
  let drawn: string | undefined;
  // placement: the artwork last found for this cel. The original keeps the cel on screen while the
  // script runs on into code no anchor is scoped to (the parlay reply at ECL7 a3b9 after the
  // approach at a194, #336), so the picture stays until the guest writes over the viewport.
  let visible: { member: string; pixels: Buffer; mark: number; placement?: EncounterPlacement } | undefined;
  return {
    load(cpu: Cpu) {
      const argument = (offset: number) => cpu.read16(cpu.ss, (cpu.sp + offset) & 0xffff);
      const local = (offset: number) => cpu.read16(cpu.ss, (cpu.bp + offset) & 0xffff);
      const pointer = address(argument(6), argument(4));
      members.delete(pointer);
      const nameOffset = local(14), nameSegment = local(16);
      if (cpu.read8(nameSegment, nameOffset) !== 5) return;
      const name = String.fromCharCode(...[1, 2, 3, 4, 5].map(index =>
        cpu.read8(nameSegment, (nameOffset + index) & 0xffff)));
      if (name !== "SPRIT") return;
      const bank = cpu.read8(cpu.ds, data.eclArchive);
      const block = local(12) & 255;
      const member = (local(-0x12) & 255) - 1;
      if (bank >= 1 && bank <= 8 && member >= 0) members.set(pointer, `SPRIT${bank}.DAX:${block}:${member}:0`);
    },
    release(cpu: Cpu) {
      const offset = cpu.read16(cpu.ss, (cpu.sp + 4) & 0xffff);
      const segment = cpu.read16(cpu.ss, (cpu.sp + 6) & 0xffff);
      members.delete(address(cpu.read16(segment, offset + 2), cpu.read16(segment, offset)));
    },
    draw(cpu: Cpu) {
      const sourceOffset = cpu.read16(cpu.ss, (cpu.sp + 8) & 0xffff);
      const sourceSegment = cpu.read16(cpu.ss, (cpu.sp + 10) & 0xffff);
      drawn = members.get(address(sourceSegment, sourceOffset));
    },
    presented() {
      visible = drawn ? { member: drawn, pixels: viewport(), mark: viewportMark() } : undefined;
      drawn = undefined;
    },
    clear() {
      visible = undefined;
    },
    match(area?: number, cursor?: number, caller?: number): EncounterPlacement | undefined {
      if (!visible || area === undefined) return;
      // The bundled viewport can stay byte-identical when the guest clears the encounter.
      if (visible.mark !== viewportMark() || !visible.pixels.equals(viewport())) {
        visible = undefined;
        return;
      }
      const scopes = [`area:${area}:`, ""];
      if (cursor !== undefined) {
        const script = `area:${area}:ecl:${cursor.toString(16).padStart(4, "0")}:`;
        scopes.unshift(script);
        if (caller !== undefined) scopes.unshift(`${script}caller:${caller.toString(16).padStart(4, "0")}:`);
      }
      for (const scope of scopes) {
        const direct = `encounter:${scope}${visible.member}`;
        const available = (key: string) => {
          const anchor = anchors[key];
          return anchor && (anchor.area === undefined || anchor.area === area);
        };
        const matching = available(direct) ? [direct] : (equivalents.get(visible.member) ?? [])
          .map(member => `encounter:${scope}${member}`).filter(available);
        // If equivalent sources have different artwork for this scope,
        // retain the existing next-scope lookup instead of guessing.
        const [key] = matching;
        if (!key || matching.length !== 1) continue;
        const anchor = anchors[key]!;
        const { x, y, width, height, webglYOffset } = anchor;
        visible.placement = webglYOffset ? [x, y, key, width, height, webglYOffset] : [x, y, key, width, height];
        return visible.placement;
      }
      return visible.placement;
    },
  };
}
