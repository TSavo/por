import { existsSync, readFileSync } from "node:fs";
import { sha256, TRANSPARENT, type TileName, type WorldData } from "./first-person-cells.js";
import { fromPortRoot } from "./port-root.js";
import { hasResources, readJsonNow, resources } from "../src/resources/provider.js";

const BLANK = sha256(new Uint8Array(64));

export function readExplorationCellHashes(): Record<string, string> {
  if (hasResources()) return readJsonNow<{ cells: Record<string, string> }>(resources(), "manifest:qa/art-worklist-cells.json")?.cells ?? {};
  const file = fromPortRoot("qa", "art-worklist-cells.json");
  return existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as { cells: Record<string, string> }).cells : {};
}

/** What is behind the tiles of a cell: `s<sky>`, `h<sky>.<line>.<band>.<ground>` for the horizon row, `g<ground>`, or `-` when none of it shows. */
export type Backdrop = string;
function backdropPixels(backdrop: Backdrop): Uint8Array {
  const out = new Uint8Array(64);
  if (backdrop[0] === "g" || backdrop[0] === "s") out.fill(Number(backdrop.slice(1)));
  else if (backdrop[0] === "h") {
    // Rows 40..47 of the view: three of sky, one line, two of band, two of ground (ovl29 0x0174).
    const [sky, line, band, ground] = backdrop.slice(1).split(".").map(Number) as [number, number, number, number];
    out.fill(sky, 0, 24);
    out.fill(line, 24, 32);
    out.fill(band, 32, 48);
    out.fill(ground, 48, 64);
  }
  return out;
}

export type CellKind = "one stored tile" | "one tile over a solid colour" | "plain backdrop" | "several tiles together";
export interface Cell { signature: string; backdrop: Backdrop; tiles: TileName[]; kind: CellKind; hash?: string }

export class ExplorationCells {
  private readonly byName = new Map<string, { hash: string; overColour?: string[] }>();
  private readonly memo = new Map<string, Cell>();
  /** Hashes of cells made of several tiles, by signature. */
  readonly composed = new Map<string, string>();
  private readonly cache: Record<string, string>;
  missingHashes = 0;
  constructor(world: WorldData, private readonly pixels: Map<TileName, Uint8Array> | undefined, cache: Record<string, string>) {
    const byHash = new Map(world.catalogue.tiles.map((tile) => [tile.hash, tile]));
    for (const [block, hashes] of world.tileBlocks) hashes.forEach((hash, index) => this.byName.set(`${block}:${index}`, byHash.get(hash) ?? { hash }));
    this.cache = cache;
  }
  hashOf(tile: TileName): string { return this.byName.get(tile)!.hash; }
  opaque(tile: TileName): boolean { return !this.byName.get(tile)!.overColour; }
  /** A tile with no pixel that shows: over any colour it is that colour. */
  invisible(tile: TileName): boolean { return this.byName.get(tile)!.overColour?.[0] === BLANK; }
  /** Tiles that can show at least through the stack, bottom first, and whether the backdrop can show. */
  prune(stack: readonly TileName[]): { tiles: TileName[]; open: boolean } {
    let tiles = stack.filter((tile) => !this.invisible(tile));
    for (let index = tiles.length - 1; index >= 0; index--) {
      if (this.opaque(tiles[index]!)) return { tiles: tiles.slice(index), open: false };
    }
    return { tiles, open: true };
  }
  cell(backdrop: Backdrop, tiles: readonly TileName[]): Cell {
    const signature = `${backdrop}|${tiles.join(",")}`;
    let cell = this.memo.get(signature);
    if (cell) return cell;
    const solid = backdrop[0] === "g" || backdrop[0] === "s" ? Number(backdrop.slice(1)) : undefined;
    const base = { signature, backdrop, tiles: [...tiles] };
    if (backdrop === "-" && tiles.length === 1) cell = { ...base, kind: "one stored tile", hash: this.hashOf(tiles[0]!) };
    else if (solid !== undefined && tiles.length === 0) cell = { ...base, kind: "plain backdrop", hash: sha256(new Uint8Array(64).fill(solid)) };
    else if (solid !== undefined && tiles.length === 1) cell = { ...base, kind: "one tile over a solid colour", hash: this.byName.get(tiles[0]!)!.overColour![solid]! };
    else {
      const hash = this.pixels ? sha256(this.render(signature)) : this.cache[signature];
      if (hash) this.composed.set(signature, hash); else this.missingHashes++;
      cell = { ...base, kind: "several tiles together", hash };
    }
    this.memo.set(signature, cell);
    return cell;
  }
  /** The 64 pixels of a cell, from the original tiles. */
  render(signature: string): Uint8Array {
    const [backdrop, list] = signature.split("|") as [Backdrop, string];
    const out = backdropPixels(backdrop);
    for (const tile of list ? list.split(",") : []) {
      const pixels = this.pixels!.get(tile);
      if (!pixels) throw new Error(`${tile} is not in the 1.3 files given`);
      for (let i = 0; i < 64; i++) if (pixels[i] !== TRANSPARENT) out[i] = pixels[i]!;
    }
    return out;
  }
}
