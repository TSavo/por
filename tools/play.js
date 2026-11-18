const screen = document.querySelector("#screen");
const viewportArt = document.querySelector("#viewport-art");
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

function togglePresentation() {
  enhanced = !enhanced;
  document.documentElement.dataset.presentation = enhanced ? "enhanced" : "classic";
  presentation.setAttribute("aria-pressed", String(enhanced));
  showScreen();
}

function showScreen() {
  if (!state.frame) return;
  const frame = enhanced ? state.enhancedFrame ?? state.frame : state.frame;
  screen.src = enhanced && !state.journal && state.art ? state.art : `data:image/png;base64,${frame}`;
  const replacement = enhanced && !state.journal && state.viewportArt;
  viewportArt.hidden = !replacement;
  if (replacement && viewportArt.getAttribute("src") !== replacement) viewportArt.src = replacement;
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
    if (changed) render();
    closeJournal.disabled = !state.ready || Boolean(state.stopped);
    autoTrack.disabled = closeJournal.disabled;
    status.textContent = state.stopped ?? state.notice ??
      (state.ready ? "Arrows to move or select. Enter to confirm." : "Game running…");
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
closeJournal.addEventListener("click", () => send("j"));
autoTrack.addEventListener("click", () => send("track auto"));
presentation.addEventListener("click", () => {
  togglePresentation();
  screen.focus();
});
window.addEventListener("keydown", (event) => {
  if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
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
  const key = commands[event.key] ?? (/^[a-z0-9]$/i.test(event.key) ? event.key : null);
  if (!key) return;
  event.preventDefault();
  void send(key === "J" ? "key J" : key);
});
void poll();
