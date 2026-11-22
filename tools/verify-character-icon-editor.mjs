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
const game = await openChromeCampaignLeg({
  chromePath, directory: join(directory, "opening"), checkpointDir: saves,
  bootKeys: "", startAt: "24000000", inputCompat: "",
});

let frame;
const text = () => frame.text.toSorted(([a], [b]) => a - b).map(([, character]) => String.fromCharCode(character)).join("");
async function press(...keys) {
  for (const key of keys) {
    await game.pressKey(key);
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
      return { y: Number.parseFloat(image.style.top), pixels: canvas.toDataURL() };
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

try {
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
  const keptReady = previous[0];
  const keptKey = await game.evaluate('state.combatArt.find(([x, y]) => x === 32 && y === 104)?.[2]');
  assert.match(keptKey, /^combat:party:66:65:palette:/);
  writeFileSync(join(directory, "kept-icon.png"), await game.screenshot());

  await press("y", "a");
  assert.match(text(), /ICONQAAddacharacter/i);
  await press("a");
  if (/Addacharacter/i.test(text())) await press("e");
  assert.match(text(), /BEGINAdventuring/i);
  await press("b");
  const exploring = /AreaCastViewEncampSearchLook/i;
  if (exploring.test(text()) && /15,1w/i.test(text())) await press("up");
  for (let i = 0; i < 40 && !exploring.test(text()); i++) {
    assert.match(text(), /Press.*(?:continue|return)/i);
    await press("enter");
  }
  assert.match(text(), /0,4w.*AreaCastViewEncampSearchLook/i);
  await press("up");
  for (let i = 0; i < 5 && !/15,4w/i.test(text()); i++) await press("enter");
  assert.match(text(), /15,4w.*AreaCastViewEncampSearchLook/i);

  const encounter = /CombatWaitFlee(?:Advance|Parlay)/i;
  for (let i = 0; i < 48 && !encounter.test(text()); i++) {
    if (/Press.*(?:continue|return)/i.test(text())) await press("enter");
    else {
      assert.match(text(), exploring);
      await press("up");
    }
  }
  assert.match(text(), encounter);
  await press("c", "enter");
  assert.match(text(), /ICONQAHitpoints/i);
  assert.ok(await game.evaluate(`state.combatArt.some(([, , id]) => id === ${JSON.stringify(keptKey)})`),
    "Combat should use the exact icon chosen in the editor");
  assert.ok((await paintedIcons()).some(({ pixels }) => pixels === keptReady),
    "The kept ready artwork should paint on the battlefield");
  writeFileSync(join(directory, "battle.png"), await game.screenshot());
  console.log(`Verified both icon preview poses and the kept ready pose in combat. Captures in ${directory}`);
} finally {
  await game.close();
}
