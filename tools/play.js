const screen = document.querySelector("#screen");
const journal = document.querySelector("#journal");
const menu = document.querySelector("#game-menu");
const menuButton = document.querySelector("#menu-button");
const resume = document.querySelector("#resume");
const toggle = document.querySelector("#toggle");
const objective = document.querySelector("#objective");
const leads = document.querySelector("#leads");
const status = document.querySelector("#status");
let state = { sequence: -1 };
let posting = false;

function showMenu(open) {
  menu.hidden = !open;
  menuButton.setAttribute("aria-expanded", String(open));
  (open ? resume : screen).focus();
}

function render() {
  if (state.frame) screen.src = `data:image/png;base64,${state.frame}`;
  const open = Boolean(state.journal);
  journal.hidden = !open;
  toggle.setAttribute("aria-expanded", String(open));
  toggle.textContent = open ? "Close journal (J)" : "Journal (J)";
  if (open && !menu.hidden) showMenu(false);
  if (!open) {
    if (document.activeElement === toggle || journal.contains(document.activeElement)) screen.focus();
    return;
  }
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
      track.textContent = "Track";
      track.setAttribute("aria-label", `Track ${lead.title}`);
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
  try {
    const result = await fetch("/key", { method: "POST", body: key });
    if (result.ok) state.ready = false;
  } finally {
    posting = false;
  }
}

async function poll() {
  try {
    const response = await fetch("/state");
    const next = await response.json();
    const changed = next.sequence !== state.sequence;
    state = next;
    if (changed) render();
    menuButton.disabled = toggle.disabled = !state.ready || Boolean(state.stopped);
    status.textContent = state.stopped ?? (state.ready ? "Arrows to move or select. Enter to confirm." : "Game running…");
  } catch {
    status.textContent = "Waiting for the local game runner…";
  }
  setTimeout(poll, 100);
}

const commands = {
  ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
  Enter: "enter", Escape: "escape", " ": "space", Backspace: "backspace",
};
toggle.addEventListener("click", () => {
  showMenu(false);
  void send("j");
});
menuButton.addEventListener("click", () => showMenu(menu.hidden));
resume.addEventListener("click", () => {
  showMenu(false);
  if (state.journal) void send("j");
});
window.addEventListener("keydown", (event) => {
  if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.target instanceof HTMLButtonElement && ["Enter", " "].includes(event.key)) return;
  if (event.key.toLowerCase() === "j" && !event.shiftKey) {
    event.preventDefault();
    if (!menu.hidden) showMenu(false);
    void send("j");
    return;
  }
  if (!menu.hidden) {
    if (event.key === "Escape") {
      event.preventDefault();
      showMenu(false);
    }
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
