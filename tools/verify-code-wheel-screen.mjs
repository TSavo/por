// Checks the code-wheel prompt in Chrome, on the version 1.3 game.
//
//   npm run verify:code-wheel-screen -- <chrome-executable>
//
// The owner's ruling: Classic display does what the GOG game does, which is to show the game's
// own prompt and take any word. Enhanced display shows the whole translation wheel as part of
// the game and refuses a wrong word.
//
// Every item runs from a fresh start and is reported as pass or FAIL with its reason. The check
// exits with an error if any item fails.
//
// Two ways of putting the wheel on the game page have been written. The items and what they
// require are the same for both. Only the `hooks` below differ: where the page keeps the
// question, the wheel and the count of tries.
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { setTimeout as delay } from "node:timers/promises";
import { openChromeCampaignLeg } from "./chrome-campaign-replay.mjs";

const [chromePath] = process.argv.slice(2);
if (!chromePath) throw new Error("Usage: verify-code-wheel-screen.mjs <chrome-executable>");
const dir = mkdtempSync(join(process.env.POR_CAMPAIGN_OUTPUT_DIR ?? tmpdir(), "por-code-wheel-"));
const wheel = JSON.parse(readFileSync(new URL("../src/codewheel/wheel.json", import.meta.url), "utf8"));

/**
 * The word the wheel gives, read the way a player reads it: turn the inner disc until the Dethek
 * rune sits against the Espruar rune, then read the path's six windows from the inside out.
 * The question's own `word` field is not used.
 */
function readWheel({ espruar, dethek, path }) {
  const e = wheel.outer.runes.indexOf(espruar), k = wheel.inner.runes.indexOf(dethek);
  const { windows } = wheel.inner.paths.find(({ id }) => id === path);
  return windows.map((w, ring) => wheel.outer.rings[ring][(((w - k + e) % 36) + 36) % 36]).join("");
}

// Expressions evaluated in the page. "overlay" is the page that draws the wheel over the game
// picture and checks the word itself (it has a `codeWheel` object). "iframe" is the page that
// shows the standalone wheel page in a frame and lets the game check the word.
const overlay = 'typeof codeWheel === "object"';
const frameDocument = 'document.querySelector("#boot-wheel")?.contentDocument';
const hooks = {
  /** The game is at the code-wheel prompt, by the frame state. */
  atPrompt: "Boolean(state.codeWheel) || Number.isInteger(state.codeWheelQuestion)",
  /** The number of the question the frame state names. */
  stateQuestion: "state.codeWheel?.number ?? state.codeWheelQuestion",
  /** The number of the question the player is being asked now. */
  askedQuestion: `${overlay} && codeWheel.question ? codeWheel.question.number : state.codeWheelQuestion`,
  wheelShown: `${overlay} ? !document.querySelector("#code-wheel").hidden
    : Boolean(document.querySelector("#boot-wheel")) && !document.querySelector("#boot-wheel").hidden`,
  /** The wheel's pictures are loaded and the disc's centre is painted. */
  wheelDrawn: `${overlay}
    ? Boolean(codeWheel.painted) && document.querySelector("#wheel-canvas").getContext("2d").getImageData(450, 380, 1, 1).data[3] === 255
    : Boolean(${frameDocument}?.querySelector("#status")?.hidden) &&
      ${frameDocument}.querySelector("#wheel").getContext("2d").getImageData(450, 380, 1, 1).data[3] === 255`,
  /** How many positions the inner disc is turned. */
  turn: `${overlay} ? codeWheel.turn : Number((${frameDocument}?.querySelector("#turn")?.textContent ?? "").split("/")[0])`,
  /** Wrong words so far. The game's own counter starts at 1 for the first try. */
  tries: `${overlay} ? codeWheel.tries : (state.codeWheelAttempt ?? 1) - 1`,
  /** True while keys the page has accepted are still on their way to the game. */
  busy: `${overlay} && codeWheel.busy`,
  ended: `${overlay} ? codeWheel.ended : Boolean(state.stopped)`,
  /** Everything the player can read about a refusal or an ended session. */
  notices: `[...document.querySelectorAll("#wheel-message, #wheel-ended, #status")]
    .filter(element => element.getClientRects().length).map(element => element.textContent).join(" ") +
    " " + (state.messages ?? []).map(({ message }) => message).join(" ")`,
};

const results = [];
async function item(name, body) {
  const saves = join(dir, `${results.length}-saves`);
  mkdirSync(saves);
  let chrome;
  try {
    // No scheduled keys: the page answers the prompt.
    chrome = await openChromeCampaignLeg({ chromePath, directory: join(dir, String(results.length)), checkpointDir: saves,
      bootKeys: "", startAt: "24000000", inputCompat: "" });
    const page = expression => chrome.evaluate(expression);
    // POR_CODE_WHEEL_UNENFORCED=1 switches off the overlay page's own check of the word, to show
    // the refusal items failing without it.
    if (process.env.POR_CODE_WHEEL_UNENFORCED === "1") await page(`${overlay} && (codeWheel.enforce = false), undefined`);
    const until = async (what, expression, limit = 60_000) => {
      for (const deadline = Date.now() + limit; Date.now() < deadline; await delay(50)) {
        const value = await page(expression);
        if (value) return value;
      }
      throw new Error(`Timed out waiting for ${what}. The screen shows: ${await screenText()}`);
    };
    const screenText = () => page(`(() => {
      const cells = Array(1000).fill(" ");
      for (const [cell, character] of state.text ?? []) cells[cell] = String.fromCharCode(character);
      return cells.join("").replace(/ +/g, " ");
    })()`);
    const settled = `(Boolean(state.stopped) || (state.ready && !posting && renderingSequence === undefined)) && !(${hooks.busy})`;
    // A real key press on the page, given once the page has dealt with the one before.
    const key = async name => {
      await until("the page to be ready for a key", settled);
      await page(`window.dispatchEvent(new KeyboardEvent("keydown", {
        key: ${JSON.stringify(name)}, bubbles: true, cancelable: true })), undefined`);
      await until(`the page to deal with ${name}`, settled);
    };
    const type = async word => { for (const letter of word) await key(letter); };
    const enter = async () => { await key("Enter"); await delay(1000); await until("the page to settle", settled); };
    const asked = async () => {
      const number = await page(hooks.askedQuestion);
      const question = wheel.questions.find(entry => entry.number === number);
      assert.ok(question, `The page asks question ${number}, which is not one of the 13`);
      return question;
    };
    const wrongWord = async () => readWheel(await asked()) === "WRONGS" ? "WRONGX" : "WRONGS";
    const mainMenu = async () => /Create New Character/.test(await screenText());
    const toggleDisplay = () => page('document.querySelector("#presentation").click()');
    // The title waits for one key. The prompt follows it.
    await chrome.nextFrame();
    const toPrompt = async () => {
      await key(" ");
      await until("the code-wheel prompt", `state.ready && (${hooks.atPrompt})`);
    };
    await body({ page, until, screenText, key, type, enter, asked, wrongWord, mainMenu, toggleDisplay, toPrompt });
    results.push({ name, passed: true });
    console.log(`pass  ${name}`);
  } catch (error) {
    const reason = (error.cause?.message ?? error.message).split("\n")[0];
    results.push({ name, passed: false, reason });
    console.log(`FAIL  ${name}\n      ${reason}`);
  } finally {
    await chrome?.close();
  }
}

await item("(a) Enhanced shows the wheel at the prompt, and the state names one of the 13 questions", async ({ page, until, screenText, toPrompt }) => {
  await toPrompt();
  const number = await page(hooks.stateQuestion);
  assert.ok(wheel.questions.length === 13 && wheel.questions.some(question => question.number === number),
    `The state names question ${number}, which is not one of the 13`);
  assert.match(await screenText(), /INPUT THE CODE WORD/i, "The game is at its own prompt");
  assert.equal(await page(hooks.wheelShown), true, "Enhanced shows the wheel at the prompt");
  await until("the wheel to be drawn", hooks.wheelDrawn, 20_000);
});

await item("(a2) the state gives the question's Espruar slot, Dethek slot and path", async ({ page, toPrompt }) => {
  await toPrompt();
  const number = await page(hooks.stateQuestion);
  const expected = wheel.questions.find(entry => entry.number === number);
  assert.ok(expected, `The state names question ${number}, which is not one of the 13`);
  assert.deepEqual(await page("state.codeWheel ?? null"),
    { number, espruar: expected.espruar, dethek: expected.dethek, path: expected.path });
});

await item("(b) a wrong word is refused with \"Sorry, that's incorrect.\" and the game stays at the prompt", async ({ page, screenText, type, enter, wrongWord, mainMenu, toPrompt }) => {
  await toPrompt();
  await type(await wrongWord());
  await enter();
  assert.equal(await mainMenu(), false, "A wrong word must not reach the main menu");
  assert.match(await page(hooks.notices) + await screenText(), /Sorry, that's incorrect\./, "The refusal is shown");
  assert.equal(await page(hooks.tries), 1, "The wrong word counts as one try");
  assert.ok(await page(hooks.atPrompt), "The game is still at the prompt");
  assert.match(await screenText(), /INPUT THE CODE WORD/i);
});

await item("(b2) a refused word's Enter is not passed to the game", async ({ page, type, key, wrongWord, toPrompt }) => {
  await toPrompt();
  await type(await wrongWord());
  const before = await page("state.sequence");
  await key("Enter");
  await delay(1500);
  assert.equal(await page("state.sequence"), before, "The game took a key after the wrong word's Enter");
});

await item("(c) the right word, read from the wheel, is accepted and the game reaches its main menu", async ({ until, type, enter, asked, mainMenu, page, toPrompt }) => {
  await toPrompt();
  await type(readWheel(await asked()).toLowerCase());
  await enter();
  await until("the main menu", `state.ready && !(${hooks.atPrompt})`, 20_000);
  assert.equal(await mainMenu(), true, "The right word reaches the main menu");
  assert.equal(await page(hooks.wheelShown), false, "The wheel leaves with the prompt");
});

await item("(c2) after one wrong word, the right word for the question then asked is accepted", async ({ until, type, enter, asked, wrongWord, mainMenu, page, toPrompt }) => {
  await toPrompt();
  await type(await wrongWord());
  await enter();
  assert.ok(await page(hooks.atPrompt), "The game is still at the prompt after a wrong word");
  await type(readWheel(await asked()).toLowerCase());
  await enter();
  await until("the main menu", `state.ready && !(${hooks.atPrompt})`, 20_000);
  assert.equal(await mainMenu(), true);
});

await item("(d) three wrong words end the session, with a clear message", async ({ page, type, enter, key, wrongWord, mainMenu, toPrompt }) => {
  await toPrompt();
  for (let attempt = 1; attempt <= 3; attempt++) {
    assert.equal(await page(hooks.ended), false, `The session must not end before wrong word ${attempt}`);
    await type(await wrongWord());
    await enter();
  }
  assert.equal(await page(hooks.ended), true, "The session ends on the third wrong word");
  assert.equal(await mainMenu(), false);
  const notices = await page(hooks.notices);
  assert.match(notices, /Sorry, that's incorrect\./, `The end message says why. It reads: ${notices.trim()}`);
  assert.match(notices, /reload/i, `The end message says to reload. It reads: ${notices.trim()}`);
  // Nothing more reaches the game.
  const before = await page("state.sequence");
  await page(`window.dispatchEvent(new KeyboardEvent("keydown", { key: "a", bubbles: true, cancelable: true })), undefined`);
  await page(`window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true })), undefined`);
  await delay(1500);
  assert.equal(await page("state.sequence"), before, "After the session ends no key reaches the game");
});

await item("(e) Classic shows no wheel and its own picture, and accepts any word", async ({ page, until, screenText, type, enter, mainMenu, toggleDisplay, toPrompt }) => {
  await toggleDisplay();
  assert.equal(await page("document.documentElement.dataset.presentation"), "classic");
  await toPrompt();
  assert.match(await screenText(), /INPUT THE CODE WORD/i);
  assert.equal(await page(hooks.wheelShown), false, "Classic shows no wheel");
  await until("the Classic picture", 'renderingSequence === undefined && document.querySelector("#screen").src === `data:image/png;base64,${state.frame}`', 10_000);
  assert.equal(await page('document.querySelector("#tile-art").hidden && document.querySelector("#game-text").hidden'), true);
  assert.equal(await page('getComputedStyle(document.querySelector("#screen")).aspectRatio'), "8 / 5", "The Classic picture keeps its shape");
  await type("zzz");
  await enter();
  assert.equal(await mainMenu(), true, "Classic takes any word");
});

await item("(f) Left and Right turn the inner disc from the keyboard, one position at a time", async ({ page, until, key, toPrompt }) => {
  await toPrompt();
  await until("the wheel to be drawn", hooks.wheelDrawn, 20_000);
  const before = await page("state.sequence");
  await key("ArrowRight"); await key("ArrowRight"); await key("ArrowLeft");
  assert.equal(await page(hooks.turn), 1, "Right, Right, Left leaves the disc one position on");
  assert.equal(await page("state.sequence"), before, "Turning the disc sends the game no key");
});

await item("(g) switching the display at the prompt works both ways", async ({ page, type, enter, mainMenu, toggleDisplay, toPrompt }) => {
  await toPrompt();
  assert.equal(await page(hooks.wheelShown), true, "Enhanced shows the wheel");
  await toggleDisplay();
  assert.equal(await page(hooks.wheelShown), false, "Switched to Classic, the wheel is gone");
  await toggleDisplay();
  assert.equal(await page(hooks.wheelShown), true, "Back in Enhanced the wheel returns");
  await toggleDisplay();
  await type("zzz");
  await enter();
  assert.equal(await mainMenu(), true, "Switched to Classic at the prompt, any word is accepted");
});

await item("(g2) started in Classic and switched to Enhanced at the prompt, the wheel shows and a wrong word is refused", async ({ page, type, enter, mainMenu, wrongWord, toggleDisplay, toPrompt }) => {
  await toggleDisplay();
  await toPrompt();
  await toggleDisplay();
  assert.equal(await page("document.documentElement.dataset.presentation"), "enhanced");
  assert.equal(await page(hooks.wheelShown), true, "Enhanced shows the wheel");
  await type(await wrongWord());
  await enter();
  assert.equal(await mainMenu(), false, "A wrong word must not reach the main menu");
});

const failed = results.filter(({ passed }) => !passed);
console.log(`${results.length - failed.length} of ${results.length} items pass. Details of each run: ${dir}`);
if (failed.length) process.exitCode = 1;
