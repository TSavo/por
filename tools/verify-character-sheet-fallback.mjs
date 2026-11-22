import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openChromeCampaignLeg } from "./chrome-campaign-replay.mjs";

const [chromePath] = process.argv.slice(2);
assert.ok(chromePath, "Usage: node tools/verify-character-sheet-fallback.mjs <Chrome executable>");
const root = mkdtempSync(join(tmpdir(), "por-character-sheet-"));
const checkpointDir = join(root, "saves");
mkdirSync(checkpointDir);
const chrome = await openChromeCampaignLeg({
  chromePath, directory: join(root, "capture"), checkpointDir,
  bootKeys: "", startAt: "24000000", inputCompat: "",
});
try {
  await chrome.nextFrame();
  for (const key of ["enter", "enter", "enter", "c", ...Array(5).fill("enter"), "y", ..."test", "enter"]) {
    await chrome.send(key);
    await chrome.nextFrame();
  }
  await chrome.evaluate(`(async () => {
    const publisher = document.querySelector("#publisher-splash");
    while (!publisher.hidden) await new Promise(resolve => setTimeout(resolve, 20));
  })()`);
  const before = await chrome.evaluate(`({
    parts: state.characterSheet,
    rendered: document.querySelectorAll(".character-sheet-part").length,
    text: document.querySelector("#game-text").textContent,
    classicAvailable: state.classicAvailable,
  })`);
  assert.equal(before.parts.length, 2);
  assert.equal(before.rendered, 2);
  assert.match(before.text, /male\s*dwarf/i);
  writeFileSync(join(root, "complete.png"), await chrome.screenshot());
  for (const missing of [0, 1]) {
    const view = await chrome.evaluate(`(async () => {
      const original = state;
      const characterSheet = original.characterSheet.map((part, index) => index === ${missing}
        ? [part[0], part[1], "character-sheet:missing-test-" + index, part[3], part[4]]
        : part);
      state = { ...original, characterSheet };
      try {
        await showScreen();
        while (renderingSequence === state.sequence) await new Promise(resolve => setTimeout(resolve, 20));
        const text = document.querySelector("#game-text");
        const fallback = document.querySelector(".sprite-fallback");
        return {
          text: text.textContent,
          showsEnhancedText: !text.hidden,
          usesEnhancedFrame: document.querySelector("#screen").src === "data:image/png;base64," + original.enhancedFrame,
          parts: document.querySelectorAll(".character-sheet-part").length,
          fallback: fallback && [fallback.style.left, fallback.style.top, fallback.style.width, fallback.style.height],
          usesClassicCrop: Boolean(fallback?.style.backgroundImage.includes(original.frame)),
        };
      } finally {
        state = original;
      }
    })()`);
    writeFileSync(join(root, `missing-${missing}.png`), await chrome.screenshot());
    assert.deepEqual(view, {
      text: before.text, showsEnhancedText: true, usesEnhancedFrame: true, parts: 0,
      fallback: before.classicAvailable ? ["70%", "4%", "27.5%", "44%"] : null,
      usesClassicCrop: before.classicAvailable,
    });
    await chrome.evaluate("showScreen()");
  }
  await chrome.send("h");
  await chrome.nextFrame();
  assert.equal(await chrome.evaluate('document.querySelectorAll(".character-sheet-part").length'), 2);
  console.log(`Verified the character sheet stays Enhanced with a missing head or body. Captures: ${root}`);
} finally {
  await chrome.close();
}
