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
// Items (h) to (l) cover the wheel as the cardboard one beside the keyboard: put away and brought
// back at the question, and opened as a tool for the rest of the game. The items that play past
// start-up add the game's ready-made characters to the party (POR_PREGEN_PARTY) and walk the
// opening to the first exploration menu. Every leg runs with POR_TRACE_KEYS=1, so its runner.log
// names each key the game was given.
//
// POR_CODE_WHEEL_ITEMS=h,i2 runs only the items whose letter is listed, while working on one.
//
// Two ways of putting the wheel on the game page have been written. The items and what they
// require are the same for both. Only the `hooks` below differ: where the page keeps the
// question, the wheel and the count of tries.
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { setTimeout as delay } from "node:timers/promises";
import { openChromeCampaignLeg } from "./chrome-campaign-replay.mjs";

const [chromePath] = process.argv.slice(2);
if (!chromePath) throw new Error("Usage: verify-code-wheel-screen.mjs <chrome-executable>");
const dir = mkdtempSync(join(process.env.POR_CAMPAIGN_OUTPUT_DIR ?? tmpdir(), "por-code-wheel-"));
const wheel = JSON.parse(readFileSync(new URL("../src/codewheel/wheel.json", import.meta.url), "utf8"));
process.env.POR_TRACE_KEYS = "1";
const only = (process.env.POR_CODE_WHEEL_ITEMS ?? "").split(",").filter(Boolean);

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
  /** The disc itself is in view. Put away at the question, only the question's card is. */
  discShown: `!document.querySelector("#code-wheel").hidden && document.querySelector("#wheel").getClientRects().length > 0`,
  /** Opened as a tool, with nothing to answer. */
  toolOpen: `${overlay} && Boolean(codeWheel.tool) && !document.querySelector("#code-wheel").hidden`,
  /** Everything the player can read about a refusal or an ended session. */
  notices: `[...document.querySelectorAll("#wheel-message, #wheel-ended, #status")]
    .filter(element => element.getClientRects().length).map(element => element.textContent).join(" ") +
    " " + (state.messages ?? []).map(({ message }) => message).join(" ")`,
};

/**
 * The translate position, read from the wheel the way the Cluebook describes it (page 56): the
 * two TRANSLATE FROM tabs matched. This is how far the inner disc is turned there.
 */
const tabsMatched = (wheel.outer.runes.indexOf("translate-tab") - wheel.inner.runes.indexOf("translate-tab") + 36) % 36;
/** With the inner disc turned `turn` positions: the letter in ring 1 under the dotted path, and the runes at the tabs. */
function readAtTabs(turn) {
  const dots = wheel.inner.paths.find(({ id }) => id === "dots");
  return {
    letter: wheel.outer.rings[0][(dots.windows[0] + turn) % 36],
    // The inner disc's tab points at an Espruar rune on the outer rim, and the outer disc's tab at a Dethek rune.
    espruar: wheel.outer.runes[(wheel.inner.runes.indexOf("translate-tab") + turn) % 36],
    dethek: wheel.inner.runes[(wheel.outer.runes.indexOf("translate-tab") - turn + 72) % 36],
  };
}

const explorationMenu = /Area Cast View Encamp Search Look/;
const results = [];
async function item(name, body, { party = false } = {}) {
  if (only.length && !only.includes(/^\((\w+)\)/.exec(name)?.[1])) return;
  const saves = join(dir, `${results.length}-saves`);
  mkdirSync(saves);
  const leg = join(dir, String(results.length));
  let chrome;
  try {
    // No scheduled keys: the page answers the prompt.
    chrome = await openChromeCampaignLeg({ chromePath, directory: leg, checkpointDir: saves,
      bootKeys: "", startAt: "24000000", inputCompat: "", pregenParty: party });
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
    const click = selector => page(`document.querySelector(${JSON.stringify(selector)}).click()`);
    const visible = selector => page(`Boolean(document.querySelector(${JSON.stringify(selector)})?.getClientRects().length)`);
    /** Every key the game has been given, from the runner's POR_TRACE_KEYS lines. */
    const gameKeys = async () => {
      await delay(400);
      return existsSync(join(leg, "runner.log"))
        ? readFileSync(join(leg, "runner.log"), "utf8").split("\n").filter(line => line.startsWith("POR_KEY ")) : [];
    };
    /** The game's frame and what the page shows of it. */
    const gameScreen = () => page(`JSON.stringify({ sequence: state.sequence, ready: state.ready, frame: state.frame, text: state.text,
      picture: document.querySelector("#screen").src, words: document.querySelector("#game-text").innerHTML,
      art: document.querySelector("#tile-art").hidden })`);
    const toMainMenu = async () => {
      await toPrompt();
      await type(readWheel(await asked()).toLowerCase());
      await enter();
      await until("the main menu", `state.ready && !(${hooks.atPrompt})`, 20_000);
      assert.equal(await mainMenu(), true, "The right word reaches the main menu");
    };
    /** Add the first ready-made character, begin, and answer the opening until the exploration menu. */
    const toExploration = async () => {
      await toMainMenu();
      for (const letter of ["a", "a", "e", "b"]) await key(letter);
      for (let presses = 0; !explorationMenu.test(await screenText()); presses++) {
        assert.ok(presses < 60, `The opening did not reach the exploration menu: ${await screenText()}`);
        await key(/Yes No\s*$/.test((await screenText()).trimEnd()) ? "n" : "Enter");
      }
    };
    /** A turn of the mouse wheel over the disc. */
    const mouseWheel = down => page(`document.querySelector("#wheel").dispatchEvent(new WheelEvent("wheel", {
      deltaY: ${down ? 100 : -100}, bubbles: true, cancelable: true })), undefined`);
    await body({ page, until, screenText, key, type, enter, asked, wrongWord, mainMenu, toggleDisplay, toPrompt,
      click, visible, gameKeys, gameScreen, toMainMenu, toExploration, mouseWheel });
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

await item("(h) put away at the question, the game's question screen is in view, and brought back the turn and the typed letters are kept", async ({ page, until, screenText, key, type, toPrompt, click, visible }) => {
  await toPrompt();
  await until("the wheel to be drawn", hooks.wheelDrawn, 20_000);
  for (let turns = 0; turns < 3; turns++) await key("ArrowRight");
  await type("ab");
  const before = await page("state.sequence");
  assert.equal(await visible("#wheel-toggle"), true, "A Code wheel control is beside Journal and Map");
  // Put away with the visible control.
  assert.equal(await visible("#wheel-close"), true, "The wheel has a visible control to put it away");
  await click("#wheel-close");
  assert.equal(await page(hooks.discShown), false, "Put away, the disc is out of view");
  assert.match(await screenText(), /INPUT THE CODE WORD/i, "The game is at its own question");
  // The game's question, in Enhanced display, is what the player now sees: nothing of the wheel covers its text.
  assert.equal(await page("document.documentElement.dataset.presentation"), "enhanced");
  assert.equal(await page(`(() => {
    const box = document.querySelector("#screen").getBoundingClientRect();
    return [.2, .5, .8].every(across => [.1, .3, .5].every(down =>
      !document.elementFromPoint(box.left + box.width * across, box.top + box.height * down)?.closest("#code-wheel")));
  })()`), true, "Put away, the wheel leaves the game's question in view");
  // The rune pair, the path and the word are still there to use.
  for (const part of ["#wheel-espruar", "#wheel-dethek", "#wheel-path", "#wheel-word"]) {
    assert.equal(await visible(part), true, `Put away, ${part} is still in view`);
  }
  assert.equal(await page('document.querySelector("#wheel-word").textContent'), "AB", "Put away, the typed letters are kept");
  // Bring it back with the visible control.
  assert.equal(await visible("#wheel-open"), true, "Put away, a visible control brings the wheel back");
  await click("#wheel-open");
  assert.equal(await page(hooks.discShown), true, "The control brings the wheel back");
  assert.equal(await page(hooks.turn), 3, "Brought back, the disc is turned as it was");
  assert.equal(await page('document.querySelector("#wheel-word").textContent'), "AB", "Brought back, the typed letters are kept");
  // Escape puts it away and brings it back. So does the control beside Journal and Map.
  await key("Escape");
  assert.equal(await page(hooks.discShown), false, "Escape puts the wheel away");
  await type("c");
  await key("Escape");
  assert.equal(await page(hooks.discShown), true, "Escape brings the wheel back");
  await click("#wheel-toggle");
  assert.equal(await page(hooks.discShown), false, "The Code wheel control puts the wheel away");
  await click("#wheel-toggle");
  assert.equal(await page(hooks.discShown), true, "The Code wheel control brings the wheel back");
  assert.equal(await page(hooks.turn), 3);
  assert.equal(await page('document.querySelector("#wheel-word").textContent'), "ABC", "Letters typed while it was away are kept");
  assert.equal(await page("state.sequence"), before, "Putting the wheel away and bringing it back sends the game no key");
});

await item("(h2) with the wheel put away, the right word is accepted and the game reaches its main menu", async ({ page, until, key, type, enter, asked, mainMenu, toPrompt }) => {
  await toPrompt();
  await key("Escape");
  assert.equal(await page(hooks.discShown), false, "Escape puts the wheel away");
  await type(readWheel(await asked()).toLowerCase());
  await enter();
  await until("the main menu", `state.ready && !(${hooks.atPrompt})`, 20_000);
  assert.equal(await mainMenu(), true, "The right word reaches the main menu with the wheel put away");
  assert.equal(await page(hooks.wheelShown), false, "Nothing of the wheel is left after the prompt");
});

await item("(h3) with the wheel put away, a wrong word is refused the same way, and the third ends the session", async ({ page, screenText, key, type, enter, asked, wrongWord, mainMenu, toPrompt, visible }) => {
  await toPrompt();
  await key("Escape");
  assert.equal(await page(hooks.discShown), false, "Escape puts the wheel away");
  await type(await wrongWord());
  await enter();
  assert.equal(await mainMenu(), false, "A wrong word must not reach the main menu");
  assert.match(await page(hooks.notices), /Sorry, that's incorrect\./, "The refusal is shown with the wheel put away");
  assert.equal(await page(hooks.tries), 1, "The wrong word counts as one try");
  assert.equal(await page(hooks.discShown), false, "The wheel stays put away after a wrong word");
  assert.match(await screenText(), /INPUT THE CODE WORD/i);
  // The question now asked is the one the card shows.
  const { espruar } = await asked();
  assert.equal(await page('new URL(document.querySelector("#wheel-espruar").src).pathname'), `/code-wheel/${espruar}.png`);
  assert.equal(await visible("#wheel-espruar"), true);
  for (let attempt = 2; attempt <= 3; attempt++) {
    assert.equal(await page(hooks.ended), false, `The session must not end before wrong word ${attempt}`);
    await type(await wrongWord());
    await enter();
  }
  assert.equal(await page(hooks.ended), true, "The session ends on the third wrong word");
  assert.equal(await mainMenu(), false);
  assert.match(await page(hooks.notices), /reload/i, "The end message says to reload");
});

await item("(i) mouse only: after start-up the Code wheel control opens the wheel, the mouse wheel turns it, its control closes it, and the game is exactly as it was", async ({ page, until, click, visible, gameKeys, gameScreen, toExploration, mouseWheel }) => {
  await toExploration();
  const screen = await gameScreen(), keys = await gameKeys();
  assert.equal(await visible("#wheel-toggle"), true, "A Code wheel control is beside Journal and Map");
  assert.equal(await page('document.querySelector("#wheel-toggle").disabled'), false);
  await click("#wheel-toggle");
  assert.equal(await page(hooks.toolOpen), true, "The control opens the wheel at the exploration menu");
  await until("the wheel to be drawn", hooks.wheelDrawn, 20_000);
  assert.equal(await visible("#wheel-word"), false, "Opened as a tool, the wheel asks for no word");
  const turn = await page(hooks.turn);
  await mouseWheel(true); await mouseWheel(true); await mouseWheel(false);
  assert.equal(await page(hooks.turn), (turn + 1) % 36, "The mouse wheel turns the disc one position at a time");
  await click("#wheel-close");
  assert.equal(await page(hooks.wheelShown), false, "Its control closes the wheel");
  assert.equal(await gameScreen(), screen, "Closed, the game's screen and state are exactly as before");
  assert.deepEqual(await gameKeys(), keys, "No key reached the game while the wheel was open");
  // The disc stays where it was left, and the page remembers it.
  await click("#wheel-toggle");
  assert.equal(await page(hooks.turn), (turn + 1) % 36, "Opened again, the disc is where it was left");
  assert.equal(await page('localStorage.getItem("por.codeWheel.turn")'), String((turn + 1) % 36), "The page keeps the disc's position");
  await click("#wheel-toggle");
  assert.equal(await page(hooks.wheelShown), false, "The control closes the wheel too");
}, { party: true });

await item("(i2) keyboard only: W opens the wheel at the exploration and camp menus, arrows turn it, W or Escape closes it, other keys go nowhere, and the game is exactly as it was", async ({ page, until, key, screenText, gameKeys, gameScreen, toExploration }) => {
  await toExploration();
  const screen = await gameScreen(), keys = await gameKeys();
  await key("w");
  assert.equal(await page(hooks.toolOpen), true, "W opens the wheel at the exploration menu");
  await until("the wheel to be drawn", hooks.wheelDrawn, 20_000);
  const turn = await page(hooks.turn);
  await key("ArrowRight"); await key("ArrowRight"); await key("ArrowLeft");
  assert.equal(await page(hooks.turn), (turn + 1) % 36, "Right, Right, Left leaves the disc one position on");
  // Keys that are not the wheel's own are dropped: none is given to the game, as with the Journal open.
  for (const other of ["a", "c", "e", "j", "m", "1", "Enter", " ", "ArrowUp", "ArrowDown", "Backspace"]) await key(other);
  assert.equal(await page(hooks.toolOpen), true, "Other keys leave the wheel open");
  assert.equal(await page(hooks.turn), (turn + 1) % 36);
  await key("w");
  assert.equal(await page(hooks.wheelShown), false, "W closes the wheel");
  assert.equal(await gameScreen(), screen, "Closed, the game's screen and state are exactly as before");
  await key("w");
  assert.equal(await page(hooks.toolOpen), true, "W opens it again");
  await key("Escape");
  assert.equal(await page(hooks.wheelShown), false, "Escape closes the wheel");
  assert.equal(await gameScreen(), screen, "Closed with Escape, the game's screen and state are exactly as before");
  assert.deepEqual(await gameKeys(), keys, "No key reached the game while the wheel was open");
  // The game still takes its own keys afterwards, and W is free at the camp menu as well.
  await key("e");
  assert.match(await screenText(), /Camp: Save View Magic Rest Alter Exit/, "E still opens the Camp menu");
  const camp = await gameScreen(), campKeys = await gameKeys();
  await key("w");
  assert.equal(await page(hooks.toolOpen), true, "W opens the wheel at the Camp menu");
  await key("Escape");
  assert.equal(await gameScreen(), camp, "Closed at the Camp menu, the game is exactly as before");
  assert.deepEqual(await gameKeys(), campKeys, "No key reached the game from the Camp menu");
}, { party: true });

await item("(j) W still reaches the game where the game reads letters", async ({ page, key, type, enter, asked, until, mainMenu, toPrompt, gameKeys }) => {
  await toPrompt();
  // At the question every letter belongs to the word.
  await key("w");
  assert.equal(await page('document.querySelector("#wheel-word").textContent'), "W", "At the question W is a letter of the word");
  assert.equal(await page(hooks.discShown), true, "At the question W does not put the wheel away");
  await key("Backspace");
  const word = readWheel(await asked()).toLowerCase();
  await type(word);
  await enter();
  await until("the main menu", `state.ready && !(${hooks.atPrompt})`, 20_000);
  assert.equal(await mainMenu(), true);
  assert.deepEqual((await gameKeys()).slice(-7), [...word, "enter"].map(letter => `POR_KEY ${JSON.stringify(letter === "j" ? "key j" : letter)}`),
    "The game is given the word's letters, a W among them when the word has one");
  // The party menu is not one of the menus where W is the wheel's: the game is given the key.
  const keys = await gameKeys();
  await key("w");
  assert.equal(await page(hooks.wheelShown), false, "At the party menu W does not open the wheel");
  assert.deepEqual((await gameKeys()).slice(keys.length), ['POR_KEY "w"'], "At the party menu the game is given W");
});

await item("(k) Classic has no Code wheel control, no shortcut and no wheel", async ({ page, key, click, visible, gameKeys, toggleDisplay, toExploration }) => {
  await toExploration();
  // Open in Enhanced, the wheel goes when the display is switched to Classic, and stays away on the way back.
  await click("#wheel-toggle");
  assert.equal(await page(hooks.toolOpen), true);
  await toggleDisplay();
  assert.equal(await page("document.documentElement.dataset.presentation"), "classic");
  assert.equal(await page(hooks.wheelShown), false, "Classic shows no wheel");
  assert.equal(await visible("#wheel-toggle"), false, "Classic has no Code wheel control");
  const keys = await gameKeys();
  await key("w");
  assert.equal(await page(hooks.wheelShown), false, "In Classic W opens nothing");
  assert.deepEqual((await gameKeys()).slice(keys.length), ['POR_KEY "w"'], "In Classic the game is given W");
  await key("Escape");
  assert.deepEqual((await gameKeys()).slice(keys.length), ['POR_KEY "w"', 'POR_KEY "escape"'], "In Classic the game is given Escape");
  await toggleDisplay();
  assert.equal(await page(hooks.wheelShown), false, "Back in Enhanced the wheel is still closed");
}, { party: true });

await item("(l) Translate lines up the two TRANSLATE FROM tabs, and ring 1 under the dotted path reads what the Cluebook says", async ({ page, until, key, click, visible, gameKeys, toExploration }) => {
  // What the wheel must give, from the Cluebook's example (page 56) and the game's own rune font.
  assert.equal(readAtTabs(tabsMatched).letter, "0", "wheel.json: with the tabs matched, ring 1 under the dotted path shows 0");
  assert.deepEqual(readAtTabs(tabsMatched + 1), { letter: "A", espruar: "espruar-27", dethek: "dethek-03" },
    "wheel.json: one space clockwise it shows A, with the two A runes at the tabs");
  await toExploration();
  const keys = await gameKeys();
  await click("#wheel-toggle");
  await until("the wheel to be drawn", hooks.wheelDrawn, 20_000);
  assert.equal(await visible("#wheel-translate"), true, "The tool has a Translate control");
  await key("ArrowRight");
  await click("#wheel-translate");
  assert.equal(await page(hooks.turn), tabsMatched, "Translate turns the disc until the two tabs meet");
  // By hand from there: each position clockwise brings the next rune to the tabs.
  await key("ArrowRight");
  assert.deepEqual(readAtTabs(await page(hooks.turn)), { letter: "A", espruar: "espruar-27", dethek: "dethek-03" });
  // The Sokal Keep scroll's first rune is the game's Espruar L, glyphs 17 18, which is espruar-02 in the game's question table.
  for (let turns = 0; readAtTabs(await page(hooks.turn)).espruar !== "espruar-02"; turns++) {
    assert.ok(turns < 36, "espruar-02 never came to the tab");
    await key("ArrowRight");
  }
  assert.equal(readAtTabs(await page(hooks.turn)).letter, "L", "With the tab at the scroll's first rune, ring 1 under the dotted path reads L");
  // T is the same control from the keyboard.
  await key("t");
  assert.equal(await page(hooks.turn), tabsMatched, "T lines the tabs up from the keyboard");
  // The wheel is read, not read out: nothing on the page states the letter.
  assert.doesNotMatch(await page('document.querySelector("#code-wheel").innerText'), /\breads\b|translates as/i);
  assert.deepEqual(await gameKeys(), keys, "No key reached the game");
}, { party: true });

const failed = results.filter(({ passed }) => !passed);
console.log(`${results.length - failed.length} of ${results.length} items pass. Details of each run: ${dir}`);
if (failed.length) process.exitCode = 1;
