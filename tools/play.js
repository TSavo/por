const screen = document.querySelector("#screen");
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
const failedSceneArt = new WeakSet();
const failedTileArt = new WeakSet();

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
  const view = animationFrame ?? state;
  const useEnhanced = enhanced && !failedTileArt.has(view);
  const frame = useEnhanced ? view.enhancedFrame ?? view.frame : view.frame;
  const sceneArt = useEnhanced && !view.journal && !failedSceneArt.has(view) && view.art;
  screen.src = sceneArt || `data:image/png;base64,${frame}`;
  const placements = [...(view.tiles ?? []), ...(view.battleTiles ?? []), ...(view.combatArt ?? [])];
  if (view.portrait) placements.push([8, 8, view.portrait, undefined, undefined, 120, 120]);
  if (view.encounter) placements.push(view.encounter.slice(0, 3));
  tileArt.hidden = !useEnhanced || Boolean(sceneArt || view.journal);
  if (!tileArt.hidden) {
    const perspective = view.perspective && !view.portrait;
    const backdrop = perspective ? document.createElement("div") : null;
    if (backdrop) {
      backdrop.className = "perspective-backdrop";
      backdrop.style.backgroundImage = `url("data:image/png;base64,${frame}")`;
    }
    tileArt.replaceChildren(...(backdrop ? [backdrop] : []), ...placements.map(([x, y, id, reflected, , width, height]) => {
      const tile = document.createElement("img");
      tile.alt = "";
      const terrain = id.startsWith("tile:");
      if (terrain) tile.classList.add("terrain-tile");
      const sky = id.startsWith("tile:16:") ? "swamp" : id.startsWith("tile:28:") ? "zhentil" : undefined;
      if (sky) {
        tile.dataset.sky = sky;
        // Align the sky across all eleven rows. The gradient travels 80 guest pixels.
        tile.style.backgroundPositionY = `${((y - 24) / 80) * 100}%`;
      }
      if (id === view.portrait) tile.className = "encounter-portrait";
      if (id === view.encounter?.[2]) {
        tile.className = "encounter-sprite";
        width = view.encounter[3];
        height = view.encounter[4];
      }
      if (id.startsWith("battle-tile:")) tile.className = "battle-tile";
      if (reflected !== undefined) tile.className = "combat-sprite";
      if (perspective && (terrain || id === view.encounter?.[2])) {
        const scale = 120 / 88;
        x = 8 + (x - 24) * scale;
        y = 8 + (y - 24) * scale;
        width = (width ?? 8) * scale;
        height = (height ?? 8) * scale;
      }
      if (width !== undefined && height !== undefined) {
        tile.style.width = terrain ? `calc(${width / 3.2}% + 0.5px)` : `${width / 3.2}%`;
        tile.style.height = terrain ? `calc(${height / 2}% + 0.5px)` : `${height / 2}%`;
      }
      if (reflected) tile.style.transform = "scaleX(-1)";
      tile.style.left = `${x / 3.2}%`;
      tile.style.top = `${y / 2}%`;
      tile.addEventListener("error", () => {
        if (!tile.isConnected || view !== (animationFrame ?? state)) return;
        // The enhanced framebuffer can omit the original actor under this tile.
        failedTileArt.add(view);
        showScreen();
      }, { once: true });
      tile.src = `/art/${id}`;
      return tile;
    }));
  }
  gameText.hidden = !useEnhanced || Boolean(sceneArt);
  if (!gameText.hidden) {
    gameText.replaceChildren(...(view.text ?? []).map(([cell, character, color]) => {
      const glyph = document.createElement("span");
      glyph.textContent = String.fromCharCode(character);
      glyph.style.left = `${(cell % 40) * 2.5}%`;
      glyph.style.top = `${Math.floor(cell / 40) * 4}%`;
      glyph.style.color = `rgb(${state.textColors[color].join(",")})`;
      return glyph;
    }));
  }
}

screen.addEventListener("error", () => {
  const view = animationFrame ?? state;
  if (view.art && screen.getAttribute("src") === view.art) {
    failedSceneArt.add(view);
    showScreen();
  }
});
function render() {
  showScreen();
  const focused = document.activeElement;
  const wasOpen = !journal.hidden;
  const open = Boolean(state.journal);
  journal.hidden = !open;
  if (!open) {
    if (journal.contains(focused)) screen.focus();
    return;
  }
  if (!wasOpen || (autoTrack === focused && !state.journal.trackedId)) closeJournal.focus();
  autoTrack.hidden = !state.journal.trackedId;
  const heading = document.createElement("strong");
  const directions = document.createElement("p");
  heading.textContent = state.journal.objective.title;
  directions.textContent = state.journal.objective.nextStep;
  objective.replaceChildren(heading, directions);
  const focusedLead = leads.contains(focused) ? focused.dataset.leadId : undefined;
  leads.replaceChildren();
  let restoredFocus;
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
      track.dataset.leadId = lead.id;
      const selected = lead.id === state.journal.trackedId;
      track.textContent = selected ? "Tracking" : "Track";
      track.setAttribute("aria-label", `${track.textContent} ${lead.title}`);
      track.setAttribute("aria-disabled", String(selected));
      track.addEventListener("click", () => { if (!selected) void send(`track ${number}`); });
      if (focusedLead === lead.id) restoredFocus = track;
      item.append(track);
    }
    item.append(detail);
    leads.append(item);
  }
  if (focusedLead) (restoredFocus ?? closeJournal).focus({ preventScroll: true });
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
    if (changed) state = next;
    else Object.assign(state, next);
    closeJournal.disabled = !state.ready || Boolean(state.stopped);
    autoTrack.disabled = closeJournal.disabled;
    if (changed) {
      render();
      playAnimation();
    }
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
