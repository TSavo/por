/**
 * The boot proof of #225, in tools/web/boot.html: the bundled engine runs in a worker from preloaded
 * `game/` data and replays a walk given as the exact commands a runner read. `window.porBootCheck`
 * answers what each frame showed, for tools/web/check-boot.mjs to compare with the Node runner.
 */
import { engineRoot, preloadEngineResources, startEngine } from "./engine.js";
import { HttpResources } from "./http-provider.js";
import { originalEntries, originalFolderAt } from "./original-picker.js";
import type { ResourceIndex } from "./resource-index.js";

interface FrameSummary { text: string; exploration?: unknown; pixels?: string; scene?: string }

declare global { interface Window { porBootCheck(options: { env: Record<string, string>; commands: string[]; original?: string }): Promise<unknown> } }

window.porBootCheck = async ({ env, commands, original: originalUrl }) => {
  const provider = new HttpResources();
  const index = (await provider.getJson<ResourceIndex>("index"))!;
  // The player's original files, as a picked folder is read (#226).
  const original = originalUrl ? await originalFolderAt(originalUrl) : undefined;
  if (original && "problem" in original) return { problem: original.problem };
  const started = performance.now();
  const frames: FrameSummary[] = [];
  const other: string[] = [];
  let firstFrameMs: number | undefined;
  const entries = [...await preloadEngineResources(provider, index), ...original ? await originalEntries(original) : []];
  const preloaded: Record<string, number> = {};
  for (const [id, bytes] of entries) preloaded[id.split(":")[0]!] = (preloaded[id.split(":")[0]!] ?? 0) + bytes.length;
  return new Promise((done) => {
    const finish = (stopped: string) => done({ original: original && { folder: original.folder, release: original.release, files: original.files.size }, frames, other: other.slice(-20), stopped, preloaded, firstFrameMs,
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
        onStopped: finish,
      });
      for (const command of commands) if (!engine.write(command)) throw new Error("command buffer full");
    } catch (error) { finish(String(error)); }
  });
};
