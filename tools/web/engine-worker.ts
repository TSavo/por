/**
 * The game engine in a Web Worker (#225, #228): tools/boot-translated.ts and tools/live-input.ts, run
 * against resources the page preloaded. The page posts one "start" message with the resident bytes
 * (`game:` ids, the player's `original:` files, saves, the engine's manifests), the engine's settings
 * and the command buffer. From then on the worker only posts: every line the engine prints, and every
 * save or roster write, which the page persists (IndexedDB).
 */
import "./shims/buffer-global.js";
import { useEngineHost } from "../engine-host.js";
import { MemoryResources, useResources, type ResourceId } from "../../src/resources/provider.js";
import { DosExit } from "../../src/runtime/dos.js";
import { CommandReader } from "./command-channel.js";

export interface EngineStart {
  type: "start";
  entries: [ResourceId, Uint8Array][];
  env: Record<string, string>;
  root: "res:game" | "res:original";
  commands: SharedArrayBuffer;
}
export type EngineMessage =
  | { type: "lines"; lines: string[] }
  | { type: "put"; id: ResourceId; data?: Uint8Array; receipt: Int32Array<SharedArrayBuffer> }
  | { type: "stopped"; message: string; dosExitCode?: number };

class EngineExit extends Error {}

const post = (message: EngineMessage) => (self as unknown as Worker).postMessage(message);

self.onmessage = async ({ data }: MessageEvent<EngineStart>) => {
  if (data?.type !== "start") return;
  const { entries, env, root, commands } = data;
  // Modules beyond the engine's two files still glance at process.env for their own diagnostics.
  Object.assign((globalThis as unknown as { process: { env: Record<string, string> } }).process.env, env);
  const resources = new MemoryResources(entries, (id, bytes) => {
    const receipt = new Int32Array(new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT));
    post({ type: "put", id, data: bytes, receipt });
    while (Atomics.load(receipt, 0) === 0) Atomics.wait(receipt, 0, 0);
    if (Atomics.load(receipt, 0) < 0) throw new Error(`Could not store ${id}`);
  });
  useResources(resources);
  const reader = new CommandReader(commands);
  // Lines are sent together, once the engine waits for the player, as the server's pipe delivered them.
  let pending: string[] = [];
  const flush = () => { if (pending.length) { post({ type: "lines", lines: pending }); pending = []; } };
  useEngineHost({
    env,
    readCommand() { flush(); return reader.read(); },
    print(line) { for (const part of line.split("\n")) pending.push(part); if (pending.length > 64) flush(); },
    write() {},
    exit(code) { flush(); throw new EngineExit(`Game stopped (exit ${code}).`); },
    onExit() {},
    game: { resources, root },
  });
  const { useGameRoot } = await import("../gamedata.js");
  useGameRoot(root);
  try {
    await import("../boot-translated.js");
    flush();
    post({ type: "stopped", message: "Game stopped (exit 0)." });
  } catch (error) {
    flush();
    post({ type: "stopped", message: error instanceof Error ? error.message : String(error),
      dosExitCode: error instanceof DosExit ? error.code : undefined });
  }
};
