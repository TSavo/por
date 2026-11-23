/**
 * The resource layer (#223): every file the game reads, named by a logical id rather than a path.
 *
 * An id is `<kind>:<name>`, for example `game:program/overlays.bin`, `art:scene:title-name`,
 * `atlas:new-phlan-concept-v1.png`, `audio:classic:pc-speaker-01.mp3`, `voice:<file>`,
 * `narration:voices/narration/<file>`, `map:atlas.json`, `font`, `codewheel:path-1.png`, `save:A`,
 * `setting:original-files`, and `index`, the list of what there is (tools/web/resource-index.ts). Backends map ids onto where the bytes are: the Node disk backend onto the
 * checkout or a release (tools/resources/node-disk.ts), the browser onto the server's URLs and
 * IndexedDB (tools/web/), a packaged app onto loose local files next to it.
 *
 * Two faces:
 *  - `ResourceProvider` is what a page uses: asynchronous reads, a URL for `<img>`, `Audio` and WebGL,
 *    listing, and `put`/`remove` for saves and settings.
 *  - `ResidentResources` is what the engine uses. The engine is synchronous, so it only ever reads
 *    bytes already resident (preloaded before the first CPU step, or read at once by a disk backend),
 *    and its writes update memory before the engine resumes.
 */

export type ResourceId = string;
export type ResourceData = Uint8Array | string;

/** The kinds of id. A name follows the kind and its colon; `font` and `index` have none. */
export const resourceKinds = [
  "game", "original", "upgrades", "art", "art-materials", "atlas", "codewheel", "font", "audio", "voice",
  "narration", "map", "manifest", "save", "setting", "journal", "index", "page", "config",
] as const;
export type ResourceKind = typeof resourceKinds[number];

export function resourceKind(id: ResourceId): { kind: ResourceKind; name: string } | undefined {
  const colon = id.indexOf(":");
  const kind = (colon < 0 ? id : id.slice(0, colon)) as ResourceKind;
  if (!resourceKinds.includes(kind)) return;
  return { kind, name: colon < 0 ? "" : id.slice(colon + 1) };
}

export interface ResourceProvider {
  getBytes(id: ResourceId): Promise<Uint8Array | undefined>;
  getText(id: ResourceId): Promise<string | undefined>;
  getJson<T = unknown>(id: ResourceId): Promise<T | undefined>;
  /** Where a page loads the resource from (`<img>`, `Audio`, WebGL textures), or undefined if there is none. */
  getUrl(id: ResourceId): string | undefined;
  /** The ids under a prefix such as `game:` or `save:`. */
  list(prefix: string): Promise<ResourceId[]>;
  put(id: ResourceId, data: ResourceData): Promise<void>;
  remove(id: ResourceId): Promise<void>;
}

export interface ResidentResources {
  /** The bytes, or with `length` only the first bytes, or undefined when there is no such resource. */
  readNow(id: ResourceId, length?: number): Uint8Array | undefined;
  /** The ids under a prefix, sorted. */
  listNow(prefix: string): ResourceId[];
  /** Write a save or setting, visible to the next `readNow` after the write succeeds. */
  putNow(id: ResourceId, data: ResourceData): void;
  removeNow(id: ResourceId): void;
}

const utf8 = new TextDecoder();
export const encodeText = (text: string): Uint8Array => new TextEncoder().encode(text);

export function readTextNow(resources: ResidentResources, id: ResourceId): string | undefined {
  const bytes = resources.readNow(id);
  return bytes && utf8.decode(bytes);
}

export function readJsonNow<T = unknown>(resources: ResidentResources, id: ResourceId): T | undefined {
  const text = readTextNow(resources, id);
  return text === undefined ? undefined : JSON.parse(text) as T;
}

/**
 * Resident bytes in memory: what a browser preloaded before the engine started. If the host provides
 * persistence, the in-memory record changes only after that write succeeds.
 */
export class MemoryResources implements ResidentResources {
  readonly entries = new Map<ResourceId, Uint8Array>();
  constructor(entries?: Iterable<[ResourceId, Uint8Array]>,
    private readonly persist?: (id: ResourceId, data: Uint8Array | undefined) => void) {
    if (entries) for (const [id, data] of entries) this.entries.set(id, data);
  }
  readNow(id: ResourceId, length?: number) {
    const data = this.entries.get(id);
    return data && length !== undefined ? data.subarray(0, length) : data;
  }
  listNow(prefix: string) {
    return [...this.entries.keys()].filter((id) => id.startsWith(prefix)).sort();
  }
  putNow(id: ResourceId, data: ResourceData) {
    const bytes = typeof data === "string" ? encodeText(data) : data;
    this.persist?.(id, bytes);
    this.entries.set(id, bytes);
  }
  removeNow(id: ResourceId) {
    this.persist?.(id, undefined);
    this.entries.delete(id);
  }
}

let active: ResidentResources | undefined;

/** The engine's resources for this process or worker, set by its host before the game boots. */
export function useResources(resources: ResidentResources): void {
  active = resources;
}

export function resources(): ResidentResources {
  if (!active) throw new Error("No resource provider: the host sets one before the game boots");
  return active;
}

export function hasResources(): boolean {
  return active !== undefined;
}
