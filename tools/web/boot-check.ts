/**
 * The boot proof of #225, in tools/web/boot.html: the bundled engine runs in a worker from preloaded
 * `game/` data and replays a walk given as the exact commands a runner read. `window.porBootCheck`
 * answers what each frame showed, for tools/web/check-boot.mjs to compare with the Node runner.
 */
import { engineRoot, preloadEngineResources, startEngine } from "./engine.js";
import { HttpResources } from "./http-provider.js";
import { IdbResources } from "./idb-provider.js";
import { originalEntries, originalFolderAt } from "./original-picker.js";
import type { ResourceIndex } from "./resource-index.js";

/**
 * The player's records in IndexedDB (#227): `clear` empties them first, `seed` puts records in (slot
 * files the Node game wrote, as base64), and the check answers what the records are when the game stops.
 */
interface RecordsOption { database: string; clear?: boolean; seed?: [string, string][] }

interface FrameSummary { text: string; exploration?: unknown; pixels?: string; scene?: string }

declare global { interface Window { porBootCheck(options: { env: Record<string, string>; commands: string[]; original?: string; records?: RecordsOption }): Promise<unknown> } }

window.porBootCheck = async ({ env, commands, original: originalUrl, records }) => {
  const provider = new HttpResources();
  const store = records && await IdbResources.open("", records.database);
  if (store && records?.clear) for (const id of await store.list("")) await store.remove(id);
  for (const [id, base64] of records?.seed ?? []) await store!.put(id, Uint8Array.from(atob(base64), (character) => character.charCodeAt(0)));
  const index = (await provider.getJson<ResourceIndex>("index"))!;
  // The player's original files, as a picked folder is read (#226).
  const original = originalUrl ? await originalFolderAt(originalUrl) : undefined;
  if (original && "problem" in original) return { problem: original.problem };
  const started = performance.now();
  const frames: FrameSummary[] = [];
  const other: string[] = [];
  let firstFrameMs: number | undefined;
  const entries = [...await preloadEngineResources(provider, index), ...original ? await originalEntries(original) : [], ...store?.residentRecords() ?? []];
  const preloaded: Record<string, number> = {};
  for (const [id, bytes] of entries) preloaded[id.split(":")[0]!] = (preloaded[id.split(":")[0]!] ?? 0) + bytes.length;
  return new Promise((done) => {
    const finish = (stopped: string) => done({
      records: store && Object.fromEntries(store.residentRecords().map(([id, bytes]) => [id, new TextDecoder().decode(bytes)])), original: original && { folder: original.folder, release: original.release, files: original.files.size }, frames, other: other.slice(-20), stopped, preloaded, firstFrameMs,
      totalMs: Math.round(performance.now() - started), crossOriginIsolated });
    try {
      const engine = startEngine({
        entries, root: engineRoot(original), env: { ...index.engineEnv, ...env },
        onLines(lines) {
          for (const line of lines) {
            if (line.startsWith("POR_FRAME ")) {
              firstFrameMs ??= Math.round(performance.now() - started);
              const frame = JSON.parse(line.slice(10)) as { text?: [number, number, number][]; exploration?: unknown; pixels?: string; scene?: string };
              const cells = Array<string>(1000).fill(" ");
              for (const [cell, character] of frame.text ?? []) cells[cell] = String.fromCharCode(character);
              frames.push({ text: cells.join("").replace(/ +/g, " ").trim(), exploration: frame.exploration, pixels: frame.pixels, scene: frame.scene });
            } else if (!line.startsWith("POR_")) other.push(line);
          }
        },
        onPut(id, data) { if (store) return data ? store.put(id, data) : store.remove(id); },
        onStopped: finish,
      });
      for (const command of commands) if (!engine.write(command)) throw new Error("command buffer full");
    } catch (error) { finish(String(error)); }
  });
};
