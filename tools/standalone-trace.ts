/**
 * Traces for `npm run qa:standalone`: what the running game takes from the original files.
 *
 * Set POR_TRACE_STANDALONE to a directory and the runner (tools/boot-translated.ts) writes there,
 * one set of files per runner process:
 *
 *   <pid>.files.json     every DOS open, read, write and delete, by file, with the bytes read
 *   <pid>.memory.bin     two maps of the guest's first megabyte, one byte per address:
 *                        was it ever read, and was it read before anything was written to it
 *   <pid>.memory.json    where the program, its data, its stack and the overlay slices sit
 *   <pid>.enhanced.json  what each Enhanced frame was made of, and the original pixels left in it
 *
 * The trace only observes. It reads no key, writes nothing to the guest and draws no dice, so a
 * traced run plays exactly as an untraced one. Without the variable none of this code runs.
 *
 * The runner is killed while it waits for its next command, so the files are rewritten before each
 * wait when something has changed, and once more when the process exits by itself.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Cpu } from "../src/cpu/machine.js";
import type { Frame } from "../src/lib/ega.js";
import type { NativeExploration } from "./native-exploration.js";
import { dosFileObservers } from "../src/runtime/dos.js";
import { glyphObservers } from "../src/runtime/video.js";

interface FileRecord {
  opens: number; misses: number; creates: number; reads: number; bytesRead: number; writes: number; bytesWritten: number;
  deletes: number;
  /** One byte per file offset the game has read. */
  seen: Uint8Array;
}

/** What tools/live-input.ts knows about one frame it built for the Enhanced display. */
export interface EnhancedFrameFacts {
  /** The guest's frame with everything the host hands to the page as its own layer blanked out. */
  enhanced: Frame;
  journal: boolean;
  codeWheelPrompt: boolean;
  scene?: string;
  battlefield: boolean;
  /** The id of the artwork shown in the picture panel. */
  portrait?: string;
  /** The game drew a picture the host has no artwork for: area, script cursor, caller, candidate sources. */
  classicPortrait?: { area?: number; cursor?: number; caller?: number; sources: string[] };
  characterSheet: boolean;
  overlandMap: boolean;
  /** The party stands on the overland map and nothing is animating: the page lays its illustrated map over the view. */
  travelMap: boolean;
  perspective: boolean;
  /** The first-person view as the game composed it, when the 3D view can be built from it. */
  nativeScenery?: NativeExploration & { area: number };
  encounter?: string;
  combatArt: number;
  battleTiles: readonly (readonly [number, number, string])[];
  combatSelections: readonly (readonly [number, number, string])[];
  panelFrame?: readonly (readonly [number, number, string])[];
}

const width = 320, height = 200;

function ranges(seen: Uint8Array): [number, number][] {
  const found: [number, number][] = [];
  for (let at = 0; at < seen.length; at++) {
    if (!seen[at]) continue;
    const start = at;
    while (at < seen.length && seen[at]) at++;
    found.push([start, at]);
  }
  return found;
}

function create(directory: string) {
  mkdirSync(directory, { recursive: true });
  const path = (name: string) => join(directory, `${process.pid}.${name}`);

  // 1. Files.
  const files = new Map<string, FileRecord>();
  let filesDirty = false;
  const record = (name: string) => {
    let entry = files.get(name);
    if (!entry) files.set(name, entry = { opens: 0, misses: 0, creates: 0, reads: 0, bytesRead: 0, writes: 0, bytesWritten: 0,
      deletes: 0, seen: new Uint8Array(0) });
    return entry;
  };
  dosFileObservers.add(({ kind, name, found, offset = 0, bytes = 0 }) => {
    const entry = record(name);
    filesDirty = true;
    if (kind === "open") found ? entry.opens++ : entry.misses++;
    else if (kind === "create") entry.creates++;
    else if (kind === "delete") entry.deletes++;
    else if (kind === "write") { entry.writes++; entry.bytesWritten += bytes; }
    else {
      entry.reads++;
      entry.bytesRead += bytes;
      if (offset + bytes > entry.seen.length) {
        const grown = new Uint8Array(offset + bytes);
        grown.set(entry.seen);
        entry.seen = grown;
      }
      entry.seen.fill(1, offset, offset + bytes);
    }
  });

  // 2. Guest memory. Bit 0: read. Bit 1: read before anything was written there.
  const memory = new Uint8Array(0x100000);
  const written = new Uint8Array(0x100000);
  let memoryDirty = false;
  let layout: object | undefined;
  const traceMemory = (cpu: Cpu, boot: { ss: number; sp: number }, dataSegment: number,
    slices: readonly { index: number; fileOffset: number; loadPara: number; codeBytes: number }[]) => {
    if (layout) return;
    layout = { dataSegment, stackSegment: boot.ss, stackPointer: boot.sp || 0xfffe,
      slices: slices.map(({ index, fileOffset, loadPara, codeBytes }) => ({ index, fileOffset, loadPara, codeBytes })) };
    writeFileSync(path("memory.json"), JSON.stringify(layout) + "\n");
    const read8 = cpu.read8, write8 = cpu.write8;
    cpu.read8 = function (segment, offset) {
      const address = ((segment << 4) + (offset & 0xffff)) & 0xfffff;
      // The first read decides: 3 when nothing had been written there yet, 1 otherwise.
      if (memory[address] === 0) { memory[address] = written[address] ? 1 : 3; memoryDirty = true; }
      return read8.call(this, segment, offset);
    };
    cpu.write8 = function (segment, offset, value) {
      written[((segment << 4) + (offset & 0xffff)) & 0xfffff] = 1;
      write8.call(this, segment, offset, value);
    };
  };

  // 3. Enhanced frames.
  interface Kind { frames: number; framesWithOriginalPixels: number; originalPixels: number; inPanel: number; elsewhere: number }
  const kinds = new Map<string, Kind>();
  const scenes = new Map<string, number>();
  const pictureArt = new Map<string, number>();
  const pictureFallbacks = new Map<string, number>();
  const scenery = new Map<string, { frames: number; scenery: EnhancedFrameFacts["nativeScenery"] }>();
  const encounters = new Map<string, number>();
  let frames = 0, framesDirty = false;
  const covered = new Uint8Array(width * height);
  const cover = (x: number, y: number, w: number, h: number) => {
    for (let row = Math.max(0, y); row < Math.min(height, y + h); row++) {
      covered.fill(1, row * width + Math.max(0, x), row * width + Math.min(width, x + w));
    }
  };
  const bump = (map: Map<string, number>, key: string) => map.set(key, (map.get(key) ?? 0) + 1);
  const frame = (facts: EnhancedFrameFacts) => {
    frames++;
    framesDirty = true;
    // The page's layers, as tools/play.js stacks them over the frame.
    const street = facts.perspective && facts.nativeScenery && !facts.portrait && !facts.classicPortrait && !facts.characterSheet &&
      !facts.combatArt && !facts.battleTiles.length && !facts.scene;
    const kind = facts.journal ? "journal" : facts.codeWheelPrompt ? "code-wheel question" : facts.scene ? facts.scene
      : facts.battlefield ? "battle" : facts.portrait ? "picture with artwork" : facts.classicPortrait ? "picture without artwork"
      : facts.characterSheet ? "character sheet"
      : facts.overlandMap ? facts.travelMap ? "overland map, illustrated" : "overland map, original" : street ? "first-person view, 3D"
      : facts.perspective ? "first-person view, original" : "text and menus";
    covered.fill(0);
    if (!facts.scene && !facts.codeWheelPrompt) {
      // Artwork fills the picture panel; the 3D view is drawn over it.
      if (facts.portrait || street || (facts.overlandMap && facts.travelMap)) cover(8, 8, 120, 120);
      for (const [x, y] of facts.panelFrame ?? []) cover(x, y, 8, 8);
      for (const [x, y] of facts.battleTiles) cover(x, y, 8, 8);
      for (const [x, y] of facts.combatSelections) cover(x, y, 24, 24);
    }
    let inPanel = 0, elsewhere = 0;
    const pixels = facts.enhanced.pixels;
    const panel = facts.battlefield ? 176 : 128;
    for (let at = 0; at < width * height; at++) {
      if (!pixels[at] || covered[at]) continue;
      const x = at % width, y = (at - x) / width;
      if (x >= 8 && x < panel && y >= 8 && y < panel) inPanel++;
      else elsewhere++;
    }
    let entry = kinds.get(kind);
    if (!entry) kinds.set(kind, entry = { frames: 0, framesWithOriginalPixels: 0, originalPixels: 0, inPanel: 0, elsewhere: 0 });
    entry.frames++;
    if (inPanel + elsewhere) entry.framesWithOriginalPixels++;
    entry.originalPixels += inPanel + elsewhere;
    entry.inPanel += inPanel;
    entry.elsewhere += elsewhere;
    if (facts.scene) bump(scenes, facts.scene);
    if (facts.portrait) bump(pictureArt, facts.portrait);
    if (facts.classicPortrait) {
      const { area, cursor, caller, sources } = facts.classicPortrait;
      bump(pictureFallbacks, JSON.stringify({ area, cursor: cursor?.toString(16), caller: caller?.toString(16), sources }));
    }
    if (facts.encounter) bump(encounters, facts.encounter);
    if (street && facts.nativeScenery) {
      const { area, frontSlots, glyphs, skyColor, groundColor } = facts.nativeScenery;
      const key = JSON.stringify([area, frontSlots, glyphs, skyColor, groundColor]);
      const seen = scenery.get(key);
      if (seen) seen.frames++;
      else scenery.set(key, { frames: 1, scenery: facts.nativeScenery });
    }
  };

  // 4. Characters drawn with the game's font.
  // `black` counts draws in colour 0, which put no visible pixel on the screen.
  const glyphs = new Map<number, { drawn: number; captured: number; black: number }>();
  glyphObservers.add((character, color, captured) => {
    let entry = glyphs.get(character);
    if (!entry) glyphs.set(character, entry = { drawn: 0, captured: 0, black: 0 });
    entry.drawn++;
    if (captured) entry.captured++;
    else if (!color) entry.black++;
    framesDirty = true;
  });

  // 5. Sound events the game asked for.
  const sounds = new Map<string, number>();
  const sound = (index: number) => { bump(sounds, String(index)); framesDirty = true; };

  const flush = () => {
    if (filesDirty) {
      filesDirty = false;
      writeFileSync(path("files.json"), JSON.stringify(Object.fromEntries([...files].map(([name, { seen, ...counts }]) =>
        [name, { ...counts, read: ranges(seen) }]))) + "\n");
    }
    if (memoryDirty) {
      memoryDirty = false;
      writeFileSync(path("memory.bin"), memory);
    }
    if (framesDirty) {
      framesDirty = false;
      writeFileSync(path("enhanced.json"), JSON.stringify({
        frames, kinds: Object.fromEntries(kinds), scenes: Object.fromEntries(scenes),
        pictureArt: Object.fromEntries(pictureArt), pictureFallbacks: Object.fromEntries(pictureFallbacks),
        encounters: Object.fromEntries(encounters), scenery: [...scenery.values()],
        glyphs: Object.fromEntries(glyphs), sounds: Object.fromEntries(sounds),
      }) + "\n");
    }
  };
  process.once("exit", flush);
  return { traceMemory, frame, sound, flush };
}

/** The trace, when POR_TRACE_STANDALONE names a directory. Undefined otherwise. */
export const standaloneTrace = process.env.POR_TRACE_STANDALONE ? create(process.env.POR_TRACE_STANDALONE) : undefined;
