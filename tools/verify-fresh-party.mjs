import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline";

const names = ["alda", "brin", "cora", "dorn", "enna", "fenn"];
mkdirSync("out", { recursive: true });
const saveDir = mkdtempSync(join("out", "fresh-party-"));

async function replay(bootKeys, startAt, actions) {
  const runner = spawn(process.execPath, ["--import", "tsx", "tools/boot-translated.ts"], {
    env: {
      ...process.env, POR_PREGEN_PARTY: "0", POR_BROWSER_PLAY: "1", POR_SAVE_DIR: saveDir,
      POR_BOOT_KEY_FILE: "", POR_BOOT_KEYS: bootKeys, POR_LIVE_AT: startAt, POR_BOOT_STEPS: "450000000",
    },
    stdio: ["pipe", "pipe", "inherit"],
  });
  const lines = createInterface({ input: runner.stdout });
  const iterator = lines[Symbol.asyncIterator]();
  let lastKey = "(boot)";
  const timer = setTimeout(() => runner.kill(), 90_000);
  async function nextFrame() {
    for (;;) {
      const { value, done } = await iterator.next();
      if (done) throw new Error("Runner stopped after " + lastKey);
      if (value.startsWith("entry:")) throw new Error(value);
      if (value.startsWith("POR_FRAME ")) return JSON.parse(value.slice(10));
    }
  }
  try {
    let frame = await nextFrame();
    for (const key of actions) {
      lastKey = key;
      runner.stdin.write(key + "\n");
      frame = await nextFrame();
    }
    return frame;
  } finally {
    clearTimeout(timer);
    lines.close();
    runner.kill();
  }
}

function visibleText(frame) {
  const cells = Array(1000).fill(" ");
  for (const [cell, character] of frame.text) cells[cell] = String.fromCharCode(character);
  return cells.join("").toLowerCase().replace(/ +/g, " ");
}

function expectParty(text) {
  for (const name of names) assert.match(text, new RegExp("\\b" + name + "\\b"));
}

const creation = names.flatMap((name, index) => [
  ...(index ? ["c"] : []),
  "enter", "enter", "enter", "enter", "enter", "y", ...name, "enter", "k", "e", "y",
]);
const added = ["a", "a", ...names.slice(1).flatMap(() => ["end", "a"])];
const tour = ["b", "enter", "enter", "enter", "y", ...Array(8).fill("enter")];
const camp = ["e", "s", "s", "a"];
const saved = await replay("31000000:1c0d,45000000:2e63", "50000000", [...creation, ...added, ...tour, ...camp]);
const savedText = visibleText(saved);
expectParty(savedText);
assert.match(savedText, /quit to dos/);
const slot = JSON.parse(readFileSync(join(saveDir, "A.json"), "utf8"));
assert.equal(Object.keys(slot.party).filter((name) => /\.SAV$/.test(name)).length, names.length);

const reloaded = await replay("31000000:1c0d,45000000:266c,52000000:1e61", "85000000", ["up", "enter", "enter"]);
const reloadedText = visibleText(reloaded);
expectParty(reloadedText);
assert.match(reloadedText, /15,4 w/);
assert.match(reloadedText, /slums of phlan/);
console.log("Created six characters, completed Rolf's tour, saved and reloaded, and entered the Slums.");
console.log("Replay save:", saveDir);
