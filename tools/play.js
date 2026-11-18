const screen = document.querySelector("#screen");
const viewportArt = document.querySelector("#viewport-art");
const tileArt = document.querySelector("#tile-art");
const gameText = document.querySelector("#game-text");
const journal = document.querySelector("#journal");
const closeJournal = document.querySelector("#close-journal");
const autoTrack = document.querySelector("#auto-track");
const objective = document.querySelector("#objective");
const leads = document.querySelector("#leads");
const status = document.querySelector("#status");
const presentation = document.querySelector("#presentation");
let state = { sequence: -1 };
let posting = false;
let enhanced = false;
let animationFrame;
let animationTimer;

function finishAnimation() {
  clearTimeout(animationTimer);
  animationFrame = undefined;
}

function playAnimation() {
  finishAnimation();
  const frames = state.animation ?? [];
  let index = 0;
  function advance() {
    animationFrame = frames[index++];
    showScreen();
    if (animationFrame) animationTimer = setTimeout(advance, 120);
  }
  if (frames.length) advance();
}

function togglePresentation() {
  enhanced = !enhanced;
  document.documentElement.dataset.presentation = enhanced ? "enhanced" : "classic";
  presentation.setAttribute("aria-pressed", String(enhanced));
  showScreen();
}

function showScreen() {
  if (!state.frame) return;
  const view = animationFrame ? { ...state, ...animationFrame } : state;
  const frame = enhanced ? view.enhancedFrame ?? view.frame : view.frame;
  screen.src = enhanced && !view.journal && view.art ? view.art : `data:image/png;base64,${frame}`;
  const replacement = enhanced && !view.journal && view.viewportArt;
  viewportArt.hidden = !replacement;
  if (replacement && viewportArt.getAttribute("src") !== replacement) viewportArt.src = replacement;
  tileArt.hidden = !enhanced || Boolean(view.art || view.journal || replacement);
  if (!tileArt.hidden) {
    const placements = [...(view.tiles ?? []), ...(view.battleTiles ?? []), ...(view.combatArt ?? [])];
    if (view.portrait) placements.push([24, 24, view.portrait]);
    if (view.encounter) placements.push(view.encounter.slice(0, 3));
    tileArt.replaceChildren(...placements.map(([x, y, id, reflected]) => {
      const tile = document.createElement("img");
      tile.alt = "";
      if (id === view.portrait) tile.className = "encounter-portrait";
      if (id === view.encounter?.[2]) {
        tile.className = "encounter-sprite";
        tile.style.width = `${view.encounter[3] / 3.2}%`;
        tile.style.height = `${view.encounter[4] / 2}%`;
      }
      if (id.startsWith("battle-tile:")) tile.className = "battle-tile";
      if (reflected !== undefined) tile.className = "combat-sprite";
      if (reflected) tile.style.transform = "scaleX(-1)";
      tile.style.left = `${x / 3.2}%`;
      tile.style.top = `${y / 2}%`;
      tile.addEventListener("error", () => tile.remove(), { once: true });
      tile.src = `/art/${id}`;
      return tile;
    }));
  }
  gameText.hidden = !enhanced || Boolean(view.art && !view.journal);
  if (!gameText.hidden) {
    gameText.replaceChildren(...(view.text ?? []).map(([cell, character, color]) => {
      const glyph = document.createElement("span");
      glyph.textContent = String.fromCharCode(character);
      glyph.style.left = `${(cell % 40) * 2.5}%`;
      glyph.style.top = `${Math.floor(cell / 40) * 4}%`;
      glyph.style.color = `rgb(${view.textColors[color].join(",")})`;
      return glyph;
    }));
  }
}

screen.addEventListener("error", () => {
  if (state.art && screen.getAttribute("src") === state.art) {
    state.art = undefined;
    showScreen();
  }
});
viewportArt.addEventListener("error", () => {
  if (viewportArt.getAttribute("src") !== state.viewportArt) return;
  state.viewportArt = undefined;
  viewportArt.removeAttribute("src");
  viewportArt.hidden = true;
});

function render() {
  showScreen();
  const open = Boolean(state.journal);
  journal.hidden = !open;
  if (!open) {
    if (journal.contains(document.activeElement)) screen.focus();
    return;
  }
  if (autoTrack === document.activeElement && !state.journal.trackedId) closeJournal.focus();
  autoTrack.hidden = !state.journal.trackedId;
  const heading = document.createElement("strong");
  const directions = document.createElement("p");
  heading.textContent = state.journal.objective.title;
  directions.textContent = state.journal.objective.nextStep;
  objective.replaceChildren(heading, directions);
  leads.replaceChildren();
  let index = 0;
  for (const lead of state.journal.leads) {
    const item = document.createElement("li");
    const title = document.createElement("strong");
    const detail = document.createElement("p");
    title.textContent = lead.title;
    detail.textContent = lead.detail;
    item.append(title);
    if (lead.status && lead.status !== "turned-in") {
      const number = ++index;
      const track = document.createElement("button");
      track.type = "button";
      const selected = lead.id === state.journal.trackedId;
      track.textContent = selected ? "Tracking" : "Track";
      track.setAttribute("aria-label", `${track.textContent} ${lead.title}`);
      track.disabled = selected;
      track.addEventListener("click", () => send(`track ${number}`));
      item.append(track);
    }
    item.append(detail);
    leads.append(item);
  }
}

async function send(key) {
  if (!state.ready || posting || state.stopped) return;
  if (animationFrame) {
    finishAnimation();
    showScreen();
  }
  posting = true;
  const sequence = state.sequence;
  try {
    const result = await fetch("/key", {
      method: "POST", headers: { "X-POR-Frame": String(sequence) }, body: key,
    });
    if (state.sequence === sequence && (result.ok || result.status === 409)) state.ready = false;
  } catch {
    status.textContent = "Waiting for the local game runner…";
  } finally {
    posting = false;
  }
}

async function poll() {
  try {
    const response = await fetch(`/state?after=${state.sequence}`);
    const next = await response.json();
    const changed = next.sequence !== state.sequence;
    state = changed ? next : { ...state, ...next };
    if (changed) {
      render();
      playAnimation();
    }
    closeJournal.disabled = !state.ready || Boolean(state.stopped);
    autoTrack.disabled = closeJournal.disabled;
    status.textContent = state.stopped ?? state.notice ??
      (state.ready ? "Arrows or keypad to move. Enter to confirm." : "Game running…");
  } catch {
    status.textContent = "Waiting for the local game runner…";
  }
  setTimeout(poll, 100);
}

const commands = {
  ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
  Home: "home", PageUp: "pageup", End: "end", PageDown: "pagedown",
  Enter: "enter", Escape: "escape", " ": "space", Backspace: "backspace",
};
const keypadDirections = {
  Numpad1: "end", Numpad2: "down", Numpad3: "pagedown",
  Numpad4: "left", Numpad6: "right",
  Numpad7: "home", Numpad8: "up", Numpad9: "pageup",
};
closeJournal.addEventListener("click", () => send("j"));
autoTrack.addEventListener("click", () => send("track auto"));
presentation.addEventListener("click", () => {
  togglePresentation();
  if (journal.hidden) screen.focus({ preventScroll: true });
});
window.addEventListener("keydown", (event) => {
  if (event.repeat || event.ctrlKey || event.metaKey) return;
  if (event.altKey) {
    if (!event.shiftKey && event.code === "KeyQ" && !state.journal) {
      event.preventDefault();
      void send("alt-q");
    }
    return;
  }
  if (event.key === "F10") {
    event.preventDefault();
    togglePresentation();
    return;
  }
  if (event.target instanceof HTMLButtonElement && ["Enter", " "].includes(event.key)) return;
  if (event.key.toLowerCase() === "j" && !event.shiftKey) {
    event.preventDefault();
    void send("j");
    return;
  }
  if (state.journal) {
    if (event.key === "Escape") void send("j");
    return;
  }
  const key = keypadDirections[event.code] ?? commands[event.key] ?? (/^[a-z0-9]$/i.test(event.key) ? event.key : null);
  if (!key) return;
  event.preventDefault();
  void send(key === "J" ? "key J" : key);
});
void poll();
