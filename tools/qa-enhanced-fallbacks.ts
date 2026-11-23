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
  observer?: number;
}

interface Ledger {
  schema: 1;
  runs: Record<string, Capture>;
}

const file = "qa/enhanced-fallbacks.json";
const observerVersion = 2;

const fixtureEndpoints = ["end-frame.json", "last-screen.txt"];
const hasEndpoint = (directory: string) => fixtureEndpoints.some(name => existsSync(join(directory, name)));

function fixtureDigest(directory: string, inputsOnly = false): string {
  const hash = createHash("sha256");
  for (const file of readdirSync(directory).filter(name =>
    /^(?:[A-J]|roster|boot|end-frame)\.json$|^(?:commands|prompts)\.jsonl$|^last-screen\.txt$/.test(name) &&
    (!inputsOnly || !fixtureEndpoints.includes(name))).sort()) {
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
  // Keep the earlier receipts for reference. They could miss a view
  // where every announced tile painted but part of the panel was exposed.
  const { runs: ledgerRuns } = readLedger(root);
  const runs = Object.fromEntries(Object.entries(ledgerRuns).filter(([, run]) => run.observer === observerVersion));
  const fixtures = join(root, "qa", "fixtures");
  const recordedWalks = recordedWalkNames(fixtures).sort();
  const directWalks = recordedWalks.filter(name => runs[name]?.fixtureSha256 === fixtureDigest(join(fixtures, name)));
  const capturedInputs = new Map(directWalks.flatMap(name => {
    const directory = join(fixtures, name);
    return hasEndpoint(directory) ? [[fixtureDigest(directory, true), name] as const] : [];
  }));
  const aliasedWalks: { walk: string; receipt: string }[] = [];
  const missingWalks = recordedWalks.filter(name => {
    if (directWalks.includes(name)) return false;
    const directory = join(fixtures, name);
    // An exported copy without its own endpoint can share its full leg's capture.
    const receipt = !hasEndpoint(directory) && capturedInputs.get(fixtureDigest(directory, true));
    if (!receipt) return true;
    aliasedWalks.push({ walk: name, receipt });
    return false;
  });
  const keys = new Map<string, number>();
  let frames = 0, presented = 0;
  const currentRuns = Object.entries(runs).filter(([name]) => !recordedWalks.includes(name) || directWalks.includes(name));
  for (const [, run] of currentRuns) {
    presented += run.presented;
    frames += run.frames.length;
    for (const frame of run.frames) for (const key of frame.keys) keys.set(key, (keys.get(key) ?? 0) + 1);
  }
  return {
    observer: observerVersion, frames, presented, walks: recordedWalks.length - missingWalks.length, recordedWalks: recordedWalks.length,
    missingWalks, aliasedWalks, runs: currentRuns.length, additionalReplays: currentRuns.length - directWalks.length,
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
    const { observer, data, presented, frames } = JSON.parse(readFileSync(resolve(directory, "enhanced-fallbacks.json"), "utf8")) as
      Capture & { data: string };
    assert.equal(observer, observerVersion, "Replay with the current Enhanced fallback observer");
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
    ledger.runs[name] = { observer, presented, frames, fixtureSha256: fixtureDigest(fixture) };
    ledger.runs = Object.fromEntries(Object.entries(ledger.runs).sort(([a], [b]) => a.localeCompare(b)));
    writeFileSync(join(root, file), JSON.stringify(ledger, null, 1) + "\n");
  } else assert.ok(command === undefined, "Usage: verify:enhanced-fallbacks [--record NAME CHROME_LEG [SOURCE_LEG]]");

  const coverage = enhancedFallbackCoverage(root);
  console.log(`Enhanced artwork: ${coverage.frames} fallback frames / ${coverage.keys.length} distinct keys across ${coverage.presented} presented views.`);
  console.log(`Recorded walks measured: ${coverage.walks} / ${coverage.recordedWalks}.`);
  if (coverage.additionalReplays) console.log(`${coverage.additionalReplays} additional replay captures are included.`);
  for (const { walk, receipt } of coverage.aliasedWalks) console.log(`  ${walk} shares the ${receipt} capture (identical replay inputs).`);
  for (const { key, frames } of coverage.keys) console.log(`  ${frames}  ${key}`);
  if (coverage.missingWalks.length) console.log(`Awaiting Chrome captures: ${coverage.missingWalks.join(", ")}`);
  if (coverage.frames || coverage.missingWalks.length) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main();
