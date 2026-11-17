import { assetId, lookupOverride, type OverrideManifest } from "./lib/assets.js";
import { EclMachine, disassemble, formatInstruction } from "./lib/ecl.js";
import { loadGame, interestingView, type ByteSource, type LoadedGame } from "./lib/files.js";
import { Frame } from "./lib/ega.js";
import { canStep, composeScreen, directionDelta, renderViewport } from "./lib/world.js";

type Mode = "classic" | "upgraded";

interface ViewState {
  x: number;
  y: number;
  dir: number;
}

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("missing #app");

const state: ViewState = { x: 8, y: 8, dir: 0 };
let mode: Mode = "classic";
let game: LoadedGame | null = null;
let machine: EclMachine | null = null;
let manifest: OverrideManifest = { version: 1, assets: {} };
let screen: "title" | "town" = "title";
let message = "Loading the gold box…";
let error = "";
let dataRoot = "";

function httpSource(): ByteSource {
  return {
    async list() {
      const response = await fetch("/api/files");
      if (!response.ok) throw new Error(`file list failed (${response.status})`);
      const body = (await response.json()) as { files: string[]; root: string | null; error?: string };
      dataRoot = body.root ?? "";
      if (!body.root) throw new Error(body.error ?? "Game directory not found.");
      return body.files;
    },
    async read(name: string) {
      const response = await fetch(`/api/file/${encodeURIComponent(name)}`);
      if (!response.ok) throw new Error(`${name} failed (${response.status})`);
      return new Uint8Array(await response.arrayBuffer());
    },
  };
}

function paint(frame: Frame, canvas: HTMLCanvasElement): void {
  canvas.width = frame.width;
  canvas.height = frame.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const pixels = new Uint8ClampedArray(frame.toRgba());
  const image = new ImageData(pixels as Uint8ClampedArray<ArrayBuffer>, frame.width, frame.height);
  ctx.putImageData(image, 0, 0);
}

function currentFrame(): Frame {
  if (!game) return new Frame(320, 200, 1);
  if (screen === "title" && game.title) {
    const frame = new Frame(Math.max(320, game.title.width), Math.max(200, game.title.height), 0);
    frame.blit(game.title.pixels, game.title.width, game.title.height, 0, 0);
    return frame;
  }
  if (game.area) {
    const view = renderViewport(game.area.assets, state.x, state.y, state.dir);
    return composeScreen(view);
  }
  const frame = new Frame(320, 200, 1);
  return frame;
}

function overrideNote(): string {
  if (mode !== "upgraded" || !game) return "Classic pixels. F10 switches presentation and leaves the party where it is.";
  const titleId = game.titleFile ? assetId("pic", game.titleFile, 1) : "scene:title";
  const hit = lookupOverride(manifest, titleId) ?? lookupOverride(manifest, "scene:viewport");
  if (hit) return `Upgraded art is in use for ${titleId}.`;
  return "Upgraded chrome is on. No replacement art is registered, so every picture falls back to the classic EGA asset.";
}

function render(): void {
  if (!app) return;
  document.body.classList.toggle("mode-classic", mode === "classic");
  document.body.classList.toggle("mode-upgraded", mode === "upgraded");
  const log = machine ? machine.log.slice(-12).join("\n") : "";
  const disasm = game?.ecl
    ? disassemble(game.ecl).lines.slice(0, 18).join("\n")
    : "";
  const pos = game?.area
    ? `Area ${game.area.area}  (${state.x},${state.y}) facing ${["N", "", "E", "", "S", "", "W"][state.dir] ?? state.dir}`
    : "No map loaded";
  app.innerHTML = `
    <header>
      <h1>Pool of Radiance <span>Phlan, 1988. One set of rules, two ways to look at them.</span></h1>
      <div class="row">
        <span class="badge">${mode === "classic" ? "Classic" : "Upgraded"}</span>
        <button id="toggle" type="button">F10 presentation</button>
      </div>
    </header>
    <div class="layout">
      <div class="stage">
        <canvas id="screen" width="320" height="200"></canvas>
        <p>${escapeHtml(overrideNote())}</p>
      </div>
      <aside class="panel">
        <p class="status ${error ? "error" : ""}">${escapeHtml(error || message)}</p>
        <p class="status">${escapeHtml(dataRoot ? `Data ${dataRoot}` : "No game directory mounted.")}</p>
        <p>${escapeHtml(pos)}</p>
        <div class="row">
          <button id="title" type="button">Title</button>
          <button id="town" type="button">Town view</button>
          <button id="step" type="button">Step ECL</button>
        </div>
        <p>Arrows move and turn. The 3D window is the classic 88×88 glyph view from GEO and WALLDEF. ECL text is the script, not a rewrite.</p>
        <div class="log">${escapeHtml([log, disasm].filter(Boolean).join("\n\n") || "No script yet.")}</div>
      </aside>
    </div>
  `;
  const canvas = document.querySelector<HTMLCanvasElement>("#screen");
  if (canvas && game) paint(currentFrame(), canvas);
  document.querySelector("#toggle")?.addEventListener("click", () => setMode(mode === "classic" ? "upgraded" : "classic"));
  document.querySelector("#title")?.addEventListener("click", () => {
    screen = "title";
    render();
  });
  document.querySelector("#town")?.addEventListener("click", () => {
    screen = "town";
    render();
  });
  document.querySelector("#step")?.addEventListener("click", () => stepEcl());
}

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function setMode(next: Mode): void {
  mode = next;
  render();
}

function stepEcl(): void {
  if (!machine) return;
  const result = machine.step();
  message = result.halted
    ? `ECL halted: ${result.reason}`
    : `${formatInstruction(result.instruction)}${result.printed ? `  “${result.printed.trim()}”` : ""}`;
  render();
}

function move(forward: boolean): void {
  if (!game?.area) return;
  const dir = forward ? state.dir : (state.dir + 4) % 8;
  if (!canStep(game.area.assets.map, state.x, state.y, dir)) {
    message = "A wall is there.";
    render();
    return;
  }
  const d = directionDelta(dir);
  state.x += d.x;
  state.y += d.y;
  message = forward ? "You step forward." : "You step back.";
  screen = "town";
  render();
}

function onKey(event: KeyboardEvent): void {
  if (event.key === "F10") {
    event.preventDefault();
    setMode(mode === "classic" ? "upgraded" : "classic");
    return;
  }
  if (event.key === "ArrowLeft") {
    state.dir = (state.dir + 6) % 8;
    screen = "town";
    message = "You turn left.";
    render();
  } else if (event.key === "ArrowRight") {
    state.dir = (state.dir + 2) % 8;
    screen = "town";
    message = "You turn right.";
    render();
  } else if (event.key === "ArrowUp") move(true);
  else if (event.key === "ArrowDown") move(false);
  else if (event.key === "n" || event.key === "N") stepEcl();
  else if (event.key === "t" || event.key === "T") {
    screen = "title";
    render();
  }
}

async function boot(): Promise<void> {
  render();
  try {
    const manifestResponse = await fetch("/api/overrides");
    if (manifestResponse.ok) manifest = (await manifestResponse.json()) as OverrideManifest;
    game = await loadGame(httpSource());
    if (game.area) {
      const start = interestingView(game.area.assets.map);
      state.x = start.x;
      state.y = start.y;
      state.dir = start.dir;
    }
    if (game.ecl) {
      machine = new EclMachine(game.ecl);
      machine.init();
      for (let i = 0; i < 24 && !machine.halted; i++) {
        const step = machine.step();
        if (step.printed) break;
      }
    }
    message = game.notes.join(" · ") || "Game data loaded.";
    if (!game.title && !game.area) {
      error = "The directory was found, but it has neither a title picture nor a GEO/WALLDEF pair.";
    }
    screen = game.title ? "title" : "town";
  } catch (caught) {
    error = caught instanceof Error ? caught.message : String(caught);
    message = "";
  }
  render();
}

window.addEventListener("keydown", onKey);
void boot();
