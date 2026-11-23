import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { openChromeCampaignLeg } from "./chrome-campaign-replay.mjs";

const [chromePath, output = "out"] = process.argv.slice(2);
assert.ok(chromePath, "Usage: node tools/verify-character-icon-editor.mjs <Chrome executable> [output directory]");
mkdirSync(output, { recursive: true });
const directory = mkdtempSync(resolve(output, "icon-editor-"));
const saves = join(directory, "saves");
mkdirSync(saves);
const open = name => openChromeCampaignLeg({
  chromePath, directory: join(directory, name), checkpointDir: saves,
  bootKeys: "", startAt: "24000000", inputCompat: "",
});
let game = await open("opening");
let frame;
const text = () => frame.text.toSorted(([a], [b]) => a - b).map(([, character]) => String.fromCharCode(character)).join("");
async function press(...keys) {
  for (const key of keys) {
    await game.pressKey(key);
    frame = await game.nextFrame();
  }
}

// The campaign replay's acknowledged input waits for a busy scene to finish.
async function play(...keys) {
  for (const key of keys) {
    await game.send(key);
    frame = await game.nextFrame();
  }
}

async function paintedIcons() {
  return game.evaluate(`(() => {
    const sprites = [...document.querySelectorAll("#tile-art:not([hidden]) .combat-sprite")];
    return sprites.map(image => {
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      canvas.getContext("2d").drawImage(image, 0, 0);
      return { y: Number.parseFloat(image.style.top), key: image.dataset.partyPalette, pixels: canvas.toDataURL() };
    });
  })()`);
}

async function editorIcons() {
  const painted = await paintedIcons();
  const row = (y) => painted.filter(icon => icon.y === y).map(icon => icon.pixels);
  const old = row(28), current = row(52);
  assert.equal(old.length, 2, "The Old row should show ready and action art");
  assert.equal(current.length, 2, "The New row should show ready and action art");
  return { old, current };
}

async function creationMenu() {
  frame = await game.nextFrame();
  for (let i = 0; i < 6 && !/CreateNewCharacter/i.test(text()); i++) {
    // The publisher splash is presentation-only. The title underneath accepts the game input.
    await game.evaluate(`new Promise(resolve => {
      const splash = document.querySelector("#publisher-splash");
      if (splash.hidden) {
        resolve();
        return;
      }
      const observer = new MutationObserver(() => {
        if (!splash.hidden) return;
        observer.disconnect();
        resolve();
      });
      observer.observe(splash, { attributes: true, attributeFilter: ["hidden"] });
    })`);
    await press("enter");
  }
  assert.match(text(), /CreateNewCharacter/i);
}

try {
  await creationMenu();
  await press("c");
  for (let i = 0; i < 6 && !/Keepthischaracter/i.test(text()); i++) await press("enter");
  assert.match(text(), /Keepthischaracter/i);
  await press("y", ..."iconqa", "enter", "k");
  assert.match(text(), /Partscolor-1color-2SizeExit/i);

  const initial = await editorIcons();
  let previous = initial.current;
  for (const [choice, ...keys] of [
    ["first head", "p", "h", "n"],
    ["second head", "n"],
    ["weapon", "k", "w", "n"],
    ["first body colour", "k", "e", "1", "b", "n"],
    ["next body colour", "n"],
    ["second colour menu", "k", "e", "2", "b", "n"],
    ["large icon", "k", "e", "s", "l"],
  ]) {
    await press(...keys);
    const { old, current } = await editorIcons();
    assert.deepEqual(old, initial.old, `The Old row changed after ${choice}`);
    for (const pose of [0, 1]) {
      assert.notEqual(current[pose], previous[pose], `${choice} did not change the painted ${pose ? "action" : "ready"} icon`);
    }
    previous = current;
  }

  await press("k", "e");
  assert.match(text(), /Isthisiconok\?YesNo/i);
  assert.deepEqual((await editorIcons()).current, previous);
  const kept = (await paintedIcons()).filter(icon => icon.y === 52);
  assert.match(kept[0].key, /^combat:party:66:65:palette:/);
  assert.match(kept[1].key, /^combat:party:66:193:palette:/);
  writeFileSync(join(directory, "kept-icon.png"), await game.screenshot());

  await press("y");
  await game.close();
  game = await open("roster-reload");
  await creationMenu();
  await press("a");
  assert.match(text(), /ICONQAAddacharacter/i);
  await press("a");
  if (/Addacharacter/i.test(text())) await press("e");
  assert.match(text(), /BEGINAdventuring/i);
  await play("b");
  const exploring = /AreaCastViewEncampSearchLook/i;
  if (exploring.test(text()) && /15,1w/i.test(text())) await play("up");
  for (let i = 0; i < 40 && !exploring.test(text()); i++) {
    assert.match(text(), /Press.*(?:continue|return)/i);
    await play("enter");
  }
  assert.match(text(), /0,4w.*AreaCastViewEncampSearchLook/i);
  await play("e", "s", "a");
  assert.match(text(), /QuitTODOSYesNo/i);
  await play("n");
  await game.close();
  game = await open("slot-reload");
  await creationMenu();
  await play("l", "a");
  assert.match(text(), /ICONQA.*0,4w.*AreaCastViewEncampSearchLook/i);

  const encounter = /CombatWaitFlee(?:Advance|Parlay)/i;
  for (let i = 0; i < 48 && !encounter.test(text()); i++) {
    if (/Press.*(?:continue|return)/i.test(text())) await play("enter");
    else {
      assert.match(text(), exploring);
      await play("up");
    }
  }
  assert.match(text(), encounter);
  await play("c", "enter");
  const captures = ["battle.png", "battle-strike.png"];
  const seen = new Set();
  // Initiative may put a monster on screen first. Quick lets the original game
  // move the combatants and play the character's attack.
  for (let turn = 0; turn < 24 && seen.size < kept.length; turn++) {
    const icons = await paintedIcons();
    for (const [pose, expected] of kept.entries()) {
      if (seen.has(pose) || !icons.some(icon => icon.key === expected.key && icon.pixels === expected.pixels)) continue;
      writeFileSync(join(directory, captures[pose]), await game.screenshot());
      seen.add(pose);
    }
    if (seen.size < kept.length) await play("q");
  }
  assert.ok(seen.has(0), "The reloaded character should paint the kept ready icon in combat");
  assert.ok(seen.has(1), "The reloaded character should paint the kept action icon in combat");
  console.log(`Verified both icon preview poses and both combat poses after roster and slot reload. Captures in ${directory}`);
} finally {
  await game.close();
}
