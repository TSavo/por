import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { openChromeCampaignLeg } from "./chrome-campaign-replay.mjs";

const [chromePath, output = "out", option, size] = process.argv.slice(2);
assert.ok(chromePath, "Usage: node tools/verify-character-icon-editor.mjs <Chrome executable> [output directory] [--sweep small|tall]");
assert.ok(option === undefined && size === undefined || option === "--sweep" && ["small", "tall"].includes(size), "Use --sweep small or --sweep tall");
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

async function paintedIcons(fromY = 0) {
  return game.evaluate(`(() => {
    const sprites = [...document.querySelectorAll("#tile-art:not([hidden]) .combat-sprite")];
    return sprites.map(image => {
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight - ${fromY};
      canvas.getContext("2d").drawImage(image, 0, -${fromY});
      return { y: Number.parseFloat(image.style.top), key: image.dataset.partyPalette, pixels: canvas.toDataURL() };
    });
  })()`);
}

async function editorIcons(fromY = 0) {
  const painted = await paintedIcons(fromY);
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

async function sweepEditor(size) {
  const offset = size === "tall" ? 64 : 0;
  if (offset) await press("s", "l", "k");
  await press("p", "h");
  for (let body = 0; body < 32; body++) {
    if (body % 4 === 0) {
      await game.evaluate(`(() => {
        const canvas = document.createElement("canvas");
        canvas.width = 50 + 14 * 96;
        canvas.height = 20 + 8 * 96;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#343330";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#f0e9d8";
        ctx.font = "12px sans-serif";
        for (let h = 0; h < 14; h++) ctx.fillText("Head " + (h + ${offset}), 54 + h * 96, 14);
        window.iconReviewSheet = canvas;
      })()`);
    }
    for (let head = 0; head < 14; head++) {
      const rendered = await game.evaluate(`(() => {
        const images = [...document.querySelectorAll("#tile-art:not([hidden]) .combat-sprite")]
          .filter(image => parseFloat(image.style.top) === 52)
          .sort((a, b) => parseFloat(a.style.left) - parseFloat(b.style.left));
        const keys = state.combatArt.filter(([, y]) => y === 104)
          .sort(([a], [b]) => a - b).map(([, , key]) => key);
        const ctx = window.iconReviewSheet.getContext("2d");
        return images.map((image, pose) => {
          const key = image.dataset.partyPalette ?? decodeURI(new URL(image.src).pathname).slice("/art/".length);
          const row = 20 + (${body % 4} * 2 + pose) * 96;
          if (${head} === 0) ctx.fillText(String(${offset + body} + 128 * pose), 4, row + 48);
          ctx.drawImage(image, 50 + ${head} * 96, row);
          return [key, keys[pose], image.naturalWidth, image.naturalHeight];
        });
      })()`);
      assert.equal(rendered.length, 2, `Missing preview at head ${head}, body ${body}`);
      for (const [pose, [painted, requested, width, height]] of rendered.entries()) {
        const base = (h) => `combat:party:${offset + h}:${offset + body + 128 * pose}`;
        const alias = !offset && head >= 11 ? head - 11 : head;
        assert.ok([base(head), base(alias)].includes(requested), `Selected ${base(head)}, got ${requested}`);
        assert.deepEqual([painted, width, height], [requested, 96, 96]);
      }
      await press("n");
    }
    if (body % 4 === 3) {
      const image = await game.evaluate("window.iconReviewSheet.toDataURL('image/png')");
      writeFileSync(join(directory, `sheet-${offset + body - 3}-${offset + body}.png`), Buffer.from(image.split(",")[1], "base64"));
      console.log(`Verified bodies ${offset + body - 3}–${offset + body}`);
    }
    if (body < 31) await press("k", "w", "n", "k", "h");
  }
  console.log(`Verified all 448 ${size} selections and 896 painted poses through Chrome keyboard input. Captures in ${directory}`);
}

async function verify() {
  await creationMenu();
  await press("c");
  for (let i = 0; i < 6 && !/Keepthischaracter/i.test(text()); i++) await press("enter");
  assert.match(text(), /Keepthischaracter/i);
  await press("y", ..."iconqa", "enter", "k");
  assert.match(text(), /Partscolor-1color-2SizeExit/i);
  if (option === "--sweep") return sweepEditor(size);

  // CBODY 3/131 supplies both flail poses. Only the upper part of each image
  // should change as all fourteen small CHEAD choices cycle back to the first.
  await press("p", "w", "n", "n", "n", "k", "h");
  const flail = (await editorIcons(64)).current;
  for (let head = 1; head <= 14; head++) {
    await press("n");
    assert.deepEqual((await editorIcons(64)).current, flail,
      `Changing to flail head ${head % 14} changed the legs or weapon`);
  }
  await press("k", "w", "p", "p", "p", "k", "e");

  const initial = await editorIcons();
  // A head edit must preserve the unarmed body's legs, belt, and equipment in both poses (#275).
  const initialBody = (await editorIcons(48)).current;
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
    if (choice === "first head") {
      assert.deepEqual((await editorIcons(48)).current, initialBody, "Changing only the head also changed the body");
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
}

try {
  await verify();
} finally {
  await game.close();
}
