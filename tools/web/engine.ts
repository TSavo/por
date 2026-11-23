/**
 * Start the engine's worker from the page (#225): preload what the engine reads synchronously, the
 * port's own game data (`game:`), the player's original files and saves when there are any, and the
 * engine's own manifests, then hand the bytes over. Art, audio and the atlas are never preloaded:
 * the page fetches them by URL when they are on screen.
 */
import type { PickedOriginalFolder } from "../../src/resources/original-folder.js";
import type { ResourceId, ResourceProvider } from "../../src/resources/provider.js";
import { CommandWriter, createCommandBuffer } from "./command-channel.js";
import type { EngineMessage, EngineStart } from "./engine-worker.js";
import { originalEntries } from "./original-picker.js";
import type { ResourceIndex } from "./resource-index.js";

/** What the engine reads besides its game files, by id. */
export const engineManifests: readonly ResourceId[] = [
  "manifest:src/audio/voice-master-manifest.json",
  "manifest:src/codewheel/wheel.json",
  "map:atlas.json",
];

export interface EngineOptions {
  /** Every resource the engine reads synchronously, read beforehand (preloadEngineResources). */
  entries: [ResourceId, Uint8Array][];
  /** Which root the engine runs from: the port's own data, or the player's version 1.3 files (#226). */
  root: "res:game" | "res:original";
  /** The engine's settings: the artwork keys and the runner's settings. */
  env: Record<string, string>;
  onLines(lines: string[]): void;
  onPut?(id: ResourceId, data: Uint8Array | undefined): void;
  onStopped(message: string): void;
  workerUrl?: URL;
}

export interface RunningEngine {
  /** One command, as the runner read it from stdin. False if the buffer is full. */
  write(command: string): boolean;
  stop(): void;
}

/** The port's game data and the manifests the engine reads, from the provider. */
export async function preloadEngineResources(provider: ResourceProvider, index: ResourceIndex, more: readonly ResourceId[] = []) {
  const ids = [...index.game.map((name) => `game:${name}`), ...engineManifests, ...more];
  return Promise.all(ids.map(async (id): Promise<[ResourceId, Uint8Array]> => {
    const bytes = await provider.getBytes(id);
    if (!bytes) throw new Error(`Cannot load ${id}`);
    return [id, bytes];
  }));
}

/** The engine's root for the player's original files: version 1.3 is run from as it is (#226). */
export const engineRoot = (original?: PickedOriginalFolder) => original?.release === "1.3" ? "res:original" as const : "res:game" as const;

/** Start the engine's worker with copies of the entries: the page keeps its own. */
export function startEngine(options: EngineOptions): RunningEngine {
  const commands = createCommandBuffer();
  const writer = new CommandWriter(commands);
  const worker = new Worker(options.workerUrl ?? new URL("./engine-worker.js", import.meta.url), { type: "module" });
  worker.onmessage = ({ data }: MessageEvent<EngineMessage>) => {
    if (data.type === "lines") options.onLines(data.lines);
    else if (data.type === "put") options.onPut?.(data.id, data.data);
    else if (data.type === "stopped") options.onStopped(data.message);
  };
  worker.onerror = (event) => options.onStopped(event.message || "The game's worker failed.");
  const start: EngineStart = { type: "start", entries: options.entries, root: options.root, commands, env: options.env };
  worker.postMessage(start);
  return {
    write: (command) => writer.write(command),
    stop() { writer.close(); worker.terminate(); },
  };
}

export { originalEntries };
