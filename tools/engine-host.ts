/**
 * What the game engine (tools/boot-translated.ts, tools/live-input.ts) needs from where it runs (#225):
 * its settings, the player's next command, a place for the lines it reports, and the files its
 * diagnostics write. Under Node that is the process: its environment, stdin, stdout and the disk.
 * In the browser it is a Web Worker (tools/web/engine-worker.ts): the page's settings, a shared
 * buffer the page writes keys into, and messages to the page. Diagnostics stay on the Node side.
 */
import { appendFileSync, mkdirSync, mkdtempSync, readFileSync, readSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { ResidentResources } from "../src/resources/provider.js";

export interface EngineHost {
  /** The engine's settings (POR_*). */
  env: Record<string, string | undefined>;
  /** The player's next command, waiting for it; undefined when there will be none. */
  readCommand(): string | undefined;
  /** One line to whoever reads the engine: POR_FRAME, POR_SOUND, ... or a diagnostic. */
  print(line: string): void;
  /** A prompt without a line end, for a terminal. */
  write(text: string): void;
  exit(code: number): never;
  onExit(listener: () => void): void;
  /** The resources and root the engine runs from, when the host has them already (the browser). */
  game?: { resources: ResidentResources; root: "res:game" | "res:original" };
  /** Diagnostic files: traces, recordings, screenshots. Only a Node host has them. */
  files?: {
    read(path: string): string;
    append(path: string, text: string): void;
    write(path: string, data: string | Uint8Array, exclusive?: boolean): void;
    mkdir(path: string): void;
    mkdtemp(prefix: string): string;
    join(...parts: string[]): string;
    dirname(path: string): string;
  };
}

function nodeHost(): EngineHost {
  return {
    env: process.env,
    readCommand() {
      const byte = Buffer.alloc(1);
      let line = "";
      while (readSync(0, byte, 0, 1, null) === 1) {
        if (byte[0] === 10) return line.trim();
        if (byte[0] !== 13) line += String.fromCharCode(byte[0]!);
      }
      return line.length ? line.trim() : undefined;
    },
    print(line) { console.log(line); },
    write(text) { process.stdout.write(text); },
    exit(code) { process.exit(code); },
    onExit(listener) { process.once("exit", listener); },
    files: {
      read: (path) => readFileSync(path, "utf8"),
      append: (path, text) => appendFileSync(path, text),
      write: (path, data, exclusive) => writeFileSync(path, data, exclusive ? { flag: "wx" } : undefined),
      mkdir: (path) => { mkdirSync(path, { recursive: true }); },
      mkdtemp: (prefix) => mkdtempSync(prefix),
      join: (...parts) => join(...parts),
      dirname: (path) => dirname(path),
    },
  };
}

let host: EngineHost | undefined;

/** Set by a host that is not this Node process, before the engine is imported. */
export function useEngineHost(next: EngineHost): void {
  host = next;
}

export function engineHost(): EngineHost {
  return host ??= nodeHost();
}

/** The diagnostic files, which only a Node host has: asking for one elsewhere is a mistake to report. */
export function diagnosticFiles(): NonNullable<EngineHost["files"]> {
  const files = engineHost().files;
  if (!files) throw new Error("Diagnostic files are written only when the game runs under Node");
  return files;
}
