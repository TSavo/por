/**
 * The resource layer's Node backend (#224): ids onto the checkout's or a release's files on disk, and
 * the player's saves and settings onto their own files. `npm run play` and the pipe runner read
 * everything through it; the engine sees ids, never paths.
 */
import { randomUUID } from "node:crypto";
import { closeSync, mkdirSync, openSync, readFileSync, readSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { layoutPath, safeName } from "../../src/resources/layout.js";
import { resourceKind, type ResidentResources, type ResourceData, type ResourceId, type ResourceProvider } from "../../src/resources/provider.js";
import { serverUrl } from "../../src/resources/urls.js";
import { classicSoundDirectory } from "../classic-sounds.js";
import { fromPortRoot, fromWorkingRoot } from "../port-root.js";

export interface NodeDiskOptions {
  /** The port's own game data (`game:`), a directory with manifest.json. */
  game?: string;
  /** The player's own original files (`original:`), read where they are. */
  original?: string;
  /** Where `save:A`..`save:J` and `save:roster` are kept, as `<name>.json`. */
  saves?: string;
  /** The file `setting:original-files` is (a release's original-files.json). */
  originalFilesSetting?: string;
  /** The optional journal profile file (`journal:profile`, POR_JOURNAL_PROFILE). */
  journalProfile?: string;
  /** The PNG under `upgrades:` an `art:` id names, from the art catalogue. */
  artFile?: (artId: string) => string | undefined;
}

type Env = Record<string, string | undefined>;

/** The directories each kind is read from, first found wins, as the server has always looked. */
function directories(env: Env, options: NodeDiskOptions): Partial<Record<string, string[]>> {
  const upgrades = env.POR_UPGRADES_DIR ?? fromWorkingRoot("upgrades");
  const unique = (...paths: (string | undefined)[]) => [...new Set(paths.filter((path): path is string => Boolean(path)))];
  return {
    game: unique(options.game ?? fromPortRoot("game")),
    original: unique(options.original),
    upgrades: unique(upgrades),
    atlas: unique(fromPortRoot("upgrades", "maps")),
    codewheel: unique(fromPortRoot("upgrades", "codewheel")),
    font: unique(join(upgrades, "font.woff2"), fromWorkingRoot("upgrades", "font.woff2")),
    "audio:classic": unique(env.POR_AUDIO_DIR ?? classicSoundDirectory),
    "audio:enhanced": unique(env.POR_ENHANCED_AUDIO_DIR ?? fromWorkingRoot("audio", "enhanced")),
    voice: unique(env.POR_VOICE_DIR ?? fromWorkingRoot("audio", "voices")),
    narration: unique(env.POR_ASSETS_DIR ?? fromWorkingRoot("audio")),
    map: unique(fromPortRoot("src", "maps")),
    manifest: unique(fromPortRoot()),
    save: unique(options.saves),
  };
}

export class NodeDiskResources implements ResidentResources, ResourceProvider {
  private readonly dirs: Partial<Record<string, string[]>>;
  constructor(private readonly options: NodeDiskOptions = {}, env: Env = process.env) {
    this.dirs = directories(env, options);
  }

  /** The file an id is on this computer, or undefined when it has none. */
  path(id: ResourceId): string | undefined {
    const parsed = resourceKind(id);
    if (!parsed) return;
    const { kind, name } = parsed;
    if (kind === "setting") return name === "original-files" ? this.options.originalFilesSetting : undefined;
    if (kind === "journal") return name === "profile" ? this.options.journalProfile : undefined;
    if (kind === "art") {
      const file = this.options.artFile?.(name);
      return file && file !== id ? this.path(file) : undefined;
    }
    if (kind === "font") return this.first(this.dirs.font ?? [], "");
    if (kind === "save") return /^(?:[A-J]|roster)$/.test(name) ? this.first(this.dirs.save ?? [], `${name}.json`) : undefined;
    if (!safeName(name)) return;
    if (kind === "audio") {
      const colon = name.indexOf(":");
      const set = `audio:${name.slice(0, colon)}`;
      return colon > 0 ? this.first(this.dirs[set] ?? [], name.slice(colon + 1)) : undefined;
    }
    if (kind === "manifest" && layoutPath(id) === undefined) return;
    return this.first(this.dirs[kind] ?? [], name);
  }

  private first(bases: string[], name: string): string | undefined {
    const paths = bases.map((base) => name ? join(base, ...name.split("/")) : base);
    if (paths.length <= 1) return paths[0];
    return paths.find((path) => statSync(path, { throwIfNoEntry: false })?.isFile()) ?? paths[0];
  }

  readNow(id: ResourceId, length?: number): Uint8Array | undefined {
    const path = this.path(id);
    if (!path) return;
    try {
      if (length === undefined) {
        const bytes = readFileSync(path);
        return new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      }
      const head = Buffer.alloc(length);
      const file = openSync(path, "r");
      try {
        const read = readSync(file, head, 0, length, 0);
        return new Uint8Array(head.buffer, head.byteOffset, read);
      } finally { closeSync(file); }
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "ENOENT" || code === "EISDIR" || code === "ENOTDIR") return;
      throw error;
    }
  }

  listNow(prefix: string): ResourceId[] {
    const parsed = resourceKind(prefix);
    if (!parsed) return [];
    const { kind, name } = parsed;
    if (kind === "save") {
      const base = this.dirs.save?.[0];
      if (!base) return [];
      return [..."ABCDEFGHIJ", "roster"].filter((slot) => statSync(join(base, `${slot}.json`), { throwIfNoEntry: false })?.isFile())
        .map((slot) => `save:${slot}`).filter((id) => id.startsWith(prefix));
    }
    const base = kind === "audio" ? this.dirs[`audio:${name.split(":")[0]}`]?.[0] : this.dirs[kind]?.[0];
    if (!base) return [];
    const recursive = kind === "game" || kind === "original";
    const folderName = kind === "audio" ? name.split(":").slice(1).join(":") : name;
    const folder = folderName.includes("/") ? folderName.slice(0, folderName.lastIndexOf("/") + 1) : "";
    const directory = join(base, ...folder.split("/").filter(Boolean));
    let names: string[];
    try {
      names = recursive
        ? (readdirSync(directory, { recursive: true, encoding: "utf8" }) as string[])
          .filter((entry) => statSync(join(directory, entry), { throwIfNoEntry: false })?.isFile())
        : readdirSync(directory, { withFileTypes: true }).filter((entry) => entry.isFile()).map((entry) => entry.name);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT" || (error as NodeJS.ErrnoException).code === "ENOTDIR") return [];
      throw error;
    }
    const kindPrefix = kind === "audio" ? `audio:${name.split(":")[0]}:` : `${kind}:`;
    return names.map((entry) => kindPrefix + folder + relative(directory, join(directory, entry)).split(sep).join("/"))
      .filter((id) => id.startsWith(prefix)).sort();
  }

  putNow(id: ResourceId, data: ResourceData): void {
    const path = this.writable(id);
    mkdirSync(dirname(path), { recursive: true });
    const pending = `${path}.${randomUUID()}.tmp`;
    try {
      writeFileSync(pending, typeof data === "string" ? data : data, { flag: "wx" });
      renameSync(pending, path);
    } finally {
      rmSync(pending, { force: true });
    }
  }

  removeNow(id: ResourceId): void {
    rmSync(this.writable(id), { force: true });
  }

  private writable(id: ResourceId): string {
    const kind = resourceKind(id)?.kind;
    const path = kind === "save" || kind === "setting" || kind === "journal" ? this.path(id) : undefined;
    if (!path) throw new Error(`${id} cannot be written here`);
    return path;
  }

  async getBytes(id: ResourceId) { return this.readNow(id); }
  async getText(id: ResourceId) {
    const bytes = this.readNow(id);
    return bytes && new TextDecoder().decode(bytes);
  }
  async getJson<T = unknown>(id: ResourceId) {
    const text = await this.getText(id);
    return text === undefined ? undefined : JSON.parse(text) as T;
  }
  getUrl(id: ResourceId) { return serverUrl(id); }
  async list(prefix: string) { return this.listNow(prefix); }
  async put(id: ResourceId, data: ResourceData) { this.putNow(id, data); }
  async remove(id: ResourceId) { this.removeNow(id); }
}

