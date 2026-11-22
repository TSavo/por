import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

interface FallbackFrame {
  sequence: number;
  animation: boolean;
  keys: string[];
}

interface Capture {
  presented: number;
  frames: FallbackFrame[];
  fixtureSha256?: string;
}

interface Ledger {
  schema: 1;
  runs: Record<string, Capture>;
}

const file = "qa/enhanced-fallbacks.json";

function fixtureDigest(directory: string): string {
  const hash = createHash("sha256");
  for (const file of readdirSync(directory).filter(name =>
    /^(?:[A-J]|roster|boot|end-frame)\.json$|^(?:commands|prompts)\.jsonl$|^last-screen\.txt$/.test(name)).sort()) {
    hash.update(file + "\n");
    hash.update(readFileSync(join(directory, file), "utf8").replace(/\r\n/g, "\n"));
  }
  return hash.digest("hex");
}

function readLedger(root: string): Ledger {
  const path = join(root, file);
  if (!existsSync(path)) return { schema: 1, runs: {} };
  const ledger = JSON.parse(readFileSync(path, "utf8")) as Ledger;
  assert.equal(ledger.schema, 1, "Unknown Enhanced fallback ledger schema");
  return ledger;
}

function recordedWalkNames(fixtures: string, path = ""): string[] {
  return readdirSync(join(fixtures, path), { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .flatMap(entry => {
      const name = path ? `${path}/${entry.name}` : entry.name;
      return existsSync(join(fixtures, name, "commands.jsonl")) ? [name] : recordedWalkNames(fixtures, name);
    });
}

export function enhancedFallbackCoverage(root: string) {
  const { runs } = readLedger(root);
  const fixtures = join(root, "qa", "fixtures");
  const recordedWalks = recordedWalkNames(fixtures).sort();
  const missingWalks = recordedWalks.filter(name => !runs[name] || runs[name].fixtureSha256 !== fixtureDigest(join(fixtures, name)));
  const keys = new Map<string, number>();
  let frames = 0, presented = 0;
  const currentRuns = Object.entries(runs).filter(([name]) => !missingWalks.includes(name));
  for (const [, run] of currentRuns) {
    presented += run.presented;
    frames += run.frames.length;
    for (const frame of run.frames) for (const key of frame.keys) keys.set(key, (keys.get(key) ?? 0) + 1);
  }
  return {
    frames, presented, walks: recordedWalks.length - missingWalks.length, recordedWalks: recordedWalks.length,
    missingWalks, runs: currentRuns.length,
    keys: [...keys].sort(([a], [b]) => a.localeCompare(b)).map(([key, count]) => ({ key, frames: count })),
  };
}

function main(): void {
  const root = process.cwd();
  const [command, name, directory, sourceDirectory] = process.argv.slice(2);
  if (command === "--record") {
    assert.ok(name && /^[a-z0-9][a-z0-9-]*(?:\/[a-z0-9][a-z0-9-]*)*$/.test(name) && directory,
      "Pass a recording name and the completed Chrome leg directory");
    assert.ok(existsSync(resolve(directory, "end-frame.json")), "The replay must reach its expected final frame");
    const { data, presented, frames } = JSON.parse(readFileSync(resolve(directory, "enhanced-fallbacks.json"), "utf8")) as
      Capture & { data: string };
    assert.equal(data, "original", "Count original-picture fallbacks with the GOG 1.3 files");
    assert.ok(Number.isSafeInteger(presented) && presented > 0 && Array.isArray(frames) && frames.length <= presented,
      "The Chrome fallback capture is missing its frame count");
    for (const frame of frames) {
      assert.ok(Number.isSafeInteger(frame.sequence) && typeof frame.animation === "boolean" && frame.keys.length &&
        new Set(frame.keys).size === frame.keys.length && frame.keys.every(key => typeof key === "string" && key.length),
      "The Chrome fallback capture is missing a frame's distinct keys");
    }
    const fixture = sourceDirectory ? resolve(sourceDirectory) : join(root, "qa", "fixtures", name);
    assert.ok(existsSync(join(fixture, "commands.jsonl")),
      "Pass the recorded source leg directory for a walk kept outside qa/fixtures");
    if (sourceDirectory) {
      assert.ok(existsSync(join(fixture, "last-screen.txt")) || existsSync(join(fixture, "end-frame.json")),
        "The recorded source leg must include its expected final screen");
    }
    const read = (directory: string, name: string) => readFileSync(join(directory, name), "utf8").replace(/\r\n/g, "\n");
    assert.equal(read(directory, "commands.jsonl").trim(), read(fixture, "commands.jsonl").trim(),
      "The Chrome replay did not consume all of the fixture commands");
    if (existsSync(join(fixture, "end-frame.json"))) {
      assert.deepEqual(JSON.parse(read(directory, "end-frame.json")), JSON.parse(read(fixture, "end-frame.json")),
        "The Chrome replay ended on a different frame from the recorded campaign leg");
    }
    if (existsSync(join(fixture, "last-screen.txt"))) {
      const normalize = (text: string) => text.replace(/\s+/g, " ").trim().toLowerCase();
      const final = JSON.parse(read(directory, "end-frame.json")) as { text: [number, number][] };
      const cells = Array<string>(1000).fill(" ");
      for (const [cell, character] of final.text) cells[cell] = String.fromCharCode(character);
      assert.equal(normalize(cells.join("")), normalize(read(fixture, "last-screen.txt")),
        "The Chrome replay ended on a different screen from the recorded walk");
    }
    const ledger = readLedger(root);
    ledger.runs[name] = { presented, frames, fixtureSha256: fixtureDigest(fixture) };
    ledger.runs = Object.fromEntries(Object.entries(ledger.runs).sort(([a], [b]) => a.localeCompare(b)));
    writeFileSync(join(root, file), JSON.stringify(ledger, null, 1) + "\n");
  } else assert.ok(command === undefined, "Usage: verify:enhanced-fallbacks [--record NAME CHROME_LEG [SOURCE_LEG]]");

  const coverage = enhancedFallbackCoverage(root);
  console.log(`Enhanced artwork: ${coverage.frames} fallback frames / ${coverage.keys.length} distinct keys across ${coverage.presented} presented views.`);
  console.log(`Recorded walks measured: ${coverage.walks} / ${coverage.recordedWalks}.`);
  const additionalReplays = coverage.runs - coverage.walks;
  if (additionalReplays) console.log(`${additionalReplays} additional replay captures are included.`);
  for (const { key, frames } of coverage.keys) console.log(`  ${frames}  ${key}`);
  if (coverage.missingWalks.length) console.log(`Awaiting Chrome captures: ${coverage.missingWalks.join(", ")}`);
  if (coverage.frames || coverage.missingWalks.length) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main();
