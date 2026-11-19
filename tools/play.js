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
const audioToggle = document.querySelector("#audio-toggle");
const audioSettings = document.querySelector("#audio-settings");
const audioControls = {
  hardware: document.querySelector("#audio-hardware"), master: document.querySelector("#audio-master"),
  effects: document.querySelector("#audio-effects"), dialogue: document.querySelector("#audio-dialogue"),
  narration: document.querySelector("#audio-narration"), muted: document.querySelector("#audio-muted"),
};
const defaultAudioPreferences = { hardware: "pc-speaker", master: 0.8, effects: 1,
  dialogue: 1, narration: 1, muted: false };
let audioPreferences = defaultAudioPreferences;
try { audioPreferences = { ...defaultAudioPreferences, ...JSON.parse(localStorage.getItem("por.audio.v1") ?? "{}") }; } catch {}
let currentEffect;
let lastSoundId = null;
let blockedEffect;
let voiceManifest = { lines: [] };
let soundManifest = { events: [] };
let currentVoice;
let blockedVoice;
let narrationQueue = [];
let visibilityPausedEffect;
let visibilityPausedVoice;
let lastTextId = null;
let lastNarrationId = null;
const narratedScenes = new Set();
let state = { sequence: -1 };
let posting = false;
let quickPollAfter = 0;
let enhanced = false;
let animationFrame;
let animationTimer;
let advanceAnimation;
let screenRender = 0;
const failedSceneArt = new WeakSet();
const failedEnhancedFrames = new WeakSet();

function syncAudioControls() {
  for (const key of ["hardware", "master", "effects", "dialogue", "narration"])
    audioControls[key].value = String(audioPreferences[key]);
  audioControls.muted.checked = audioPreferences.muted;
  if (currentEffect) currentEffect.volume = audioPreferences.muted ? 0 : audioPreferences.master * audioPreferences.effects;
  if (currentVoice) currentVoice.volume = audioPreferences.muted ? 0 :
    audioPreferences.master * audioPreferences[currentVoice.dataset.voiceType];
}

function saveAudioPreferences() {
  localStorage.setItem("por.audio.v1", JSON.stringify(audioPreferences));
  syncAudioControls();
}

function stopEffect() {
  if (!currentEffect) return;
  currentEffect.pause();
  currentEffect.removeAttribute("src");
  currentEffect = undefined;
  blockedEffect = undefined;
  visibilityPausedEffect = undefined;
}

function playSound(sound) {
  if (sound.index === 0 || sound.index === 0xff) { stopEffect(); return; }
  if (sound.index < 1 || sound.index > 20 || audioPreferences.hardware === "silent") return;
  stopEffect();
  const entry = soundManifest.events.find((candidate) => candidate.index === sound.index);
  const source = enhanced && entry?.enhancedFile ? `/enhanced-audio/${entry.enhancedFile}`
    : `/audio/${audioPreferences.hardware}-${String(sound.index).padStart(2, "0")}.wav`;
  const effect = new Audio(source);
  effect.volume = audioPreferences.muted ? 0 : audioPreferences.master * audioPreferences.effects;
  effect.loop = [13, 14, 15].includes(sound.index);
  currentEffect = effect;
  effect.play().then(() => { blockedEffect = undefined; }).catch(() => { if (currentEffect === effect) blockedEffect = sound; });
}

function playPendingSounds() {
  for (const sound of state.sounds ?? []) {
    if (sound.id <= lastSoundId) continue;
    lastSoundId = sound.id;
    playSound(sound);
  }
}

function resumeBlockedAudio() {
  if (blockedEffect) {
    const sound = blockedEffect;
    blockedEffect = undefined;
    playSound(sound);
  }
  if (blockedVoice && enhanced) {
    const line = blockedVoice;
    blockedVoice = undefined;
    beginVoice(line);
  }
}

syncAudioControls();
fetch("/voice-manifest.json").then((response) => response.json()).then((manifest) => { voiceManifest = manifest; }).catch(() => {});
fetch("/sound-manifest.json").then((response) => response.json()).then((manifest) => { soundManifest = manifest; }).catch(() => {});
audioToggle.addEventListener("click", () => {
  audioSettings.hidden = !audioSettings.hidden;
  audioToggle.setAttribute("aria-expanded", String(!audioSettings.hidden));
  if (audioSettings.hidden) (journal.hidden ? screen : closeJournal).focus({ preventScroll: true });
  resumeBlockedAudio();
});
for (const key of ["hardware", "master", "effects", "dialogue", "narration", "muted"]) {
  audioControls[key].addEventListener("input", () => {
    audioPreferences = { ...audioPreferences, [key]: key === "muted"
      ? audioControls[key].checked : key === "hardware" ? audioControls[key].value : Number(audioControls[key].value) };
    if (key === "hardware") stopEffect();
    saveAudioPreferences();
  });
}

function finishAnimation() {
  clearTimeout(animationTimer);
  animationTimer = undefined;
  advanceAnimation = undefined;
  animationFrame = undefined;
}

function stopVoice(clearNarrationQueue = true) {
  if (currentVoice) currentVoice.pause();
  currentVoice = undefined;
  blockedVoice = undefined;
  visibilityPausedVoice = undefined;
  if (clearNarrationQueue) narrationQueue = [];
}

function beginVoice(line) {
  if (!enhanced) return;
  const voice = new Audio(line.url ?? `/voice/${line.file}`);
  voice.preload = "auto";
  voice.dataset.voiceType = line.type;
  if (line.queuedNarration) voice.dataset.queuedNarration = "true";
  voice.volume = audioPreferences.muted ? 0 : audioPreferences.master * audioPreferences[line.type];
  currentVoice = voice;
  voice.addEventListener("ended", () => {
    if (currentVoice !== voice) return;
    currentVoice = undefined;
    visibilityPausedVoice = undefined;
    playNextNarration();
  }, { once: true });
  voice.play().catch(() => {
    if (currentVoice !== voice) return;
    currentVoice = undefined;
    blockedVoice = line;
  });
}

function playVoice(line) {
  stopVoice();
  beginVoice(line);
}

function playNextNarration() {
  if (!enhanced || currentVoice || blockedVoice) return;
  const line = narrationQueue.shift();
  if (line) beginVoice(line);
}

function enqueueNarration(narration) {
  narrationQueue.push({ type: "narration", queuedNarration: true,
    url: `/narration/${encodeURIComponent(narration.asset)}` });
  playNextNarration();
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    if (currentEffect && !currentEffect.paused) {
      currentEffect.pause();
      visibilityPausedEffect = currentEffect;
    }
    if (currentVoice && !currentVoice.paused) {
      currentVoice.pause();
      visibilityPausedVoice = currentVoice;
    }
    return;
  }
  if (visibilityPausedEffect === currentEffect) {
    const effect = visibilityPausedEffect;
    visibilityPausedEffect = undefined;
    effect.play().catch(() => {});
  }
  if (enhanced && visibilityPausedVoice === currentVoice) {
    const voice = visibilityPausedVoice;
    visibilityPausedVoice = undefined;
    voice.play().catch(() => {});
  }
});

function playPendingVoice() {
  if (lastTextId === null) lastTextId = state.textId ?? 0;
  for (const message of state.messages ?? []) {
    if (message.id <= lastTextId) continue;
    lastTextId = message.id;
    const normalized = message.message.replace(/\s+/g, " ").toUpperCase();
    const line = voiceManifest.lines.find((candidate) => candidate.match && normalized.includes(candidate.match));
    if (line) playVoice(line);
  }
  if (enhanced && state.scene && !narratedScenes.has(state.scene)) {
    const line = voiceManifest.lines.find((candidate) => candidate.scene === state.scene);
    if (line) { narratedScenes.add(state.scene); playVoice(line); }
  }
}

function playPendingNarration() {
  if (lastNarrationId === null) lastNarrationId = state.narrationId ?? 0;
  for (const narration of state.narrations ?? []) {
    if (narration.id <= lastNarrationId) continue;
    lastNarrationId = narration.id;
    if (enhanced) enqueueNarration(narration);
  }
}

function playAnimation() {
  finishAnimation();
  const frames = state.animation ?? [];
  let index = 0;
  if (!frames.length) return;
  advanceAnimation = () => {
    animationFrame = frames[index++];
    if (!animationFrame) finishAnimation();
    void showScreen();
  };
  advanceAnimation();
}

function holdAnimationFrame(view) {
  if (view !== animationFrame || animationTimer !== undefined || !advanceAnimation) return;
  animationTimer = setTimeout(() => {
    animationTimer = undefined;
    advanceAnimation?.();
  }, view.durationMs ?? 120);
}

function togglePresentation() {
  enhanced = !enhanced;
  document.documentElement.dataset.presentation = enhanced ? "enhanced" : "classic";
  presentation.setAttribute("aria-pressed", String(enhanced));
  if (!enhanced) stopVoice();
  if (animationFrame) {
    // Let the new presentation finish decoding before timing the frame again.
    clearTimeout(animationTimer);
    animationTimer = undefined;
  }
  showScreen();
  playPendingVoice();
}

async function showScreen() {
  if (!state.frame) return;
  const render = ++screenRender;
  const view = animationFrame ?? state;
  const useEnhanced = enhanced && !failedEnhancedFrames.has(view);
  const frame = useEnhanced ? view.enhancedFrame ?? view.frame : view.frame;
  const sceneArt = useEnhanced && !failedSceneArt.has(view) && view.art;
  const source = sceneArt || `data:image/png;base64,${frame}`;
  const showArt = useEnhanced && !sceneArt;
  function pictureBackdrop() {
    const backdrop = document.createElement("div");
    backdrop.className = "perspective-backdrop";
    backdrop.style.backgroundImage = `url("data:image/png;base64,${frame}")`;
    return backdrop;
  }
  function spriteBackdrop(image, sourceRect) {
    const backdrop = document.createElement("div");
    backdrop.className = "sprite-fallback";
    const displayWidth = image.style.width || "7.5%";
    const displayHeight = image.style.height || "12%";
    const [left, top, width, height] = sourceRect ??
      [image.style.left, image.style.top, displayWidth, displayHeight].map(parseFloat);
    Object.assign(backdrop.style, { left: image.style.left, top: image.style.top, width: displayWidth, height: displayHeight });
    backdrop.style.backgroundImage = `url("data:image/png;base64,${view.frame}")`;
    backdrop.style.backgroundSize = `${10000 / width}% ${10000 / height}%`;
    backdrop.style.backgroundPosition = `${left * 100 / (100 - width)}% ${top * 100 / (100 - height)}%`;
    return backdrop;
  }
  let layers = [];
  const placements = [...(view.tiles ?? []), ...(view.battleTiles ?? []), ...(view.combatArt ?? [])];
  if (view.portrait) placements.push([8, 8, view.portrait, undefined, undefined, 120, 120]);
  if (view.encounter) placements.push(view.encounter.slice(0, 3));
  if (showArt) {
    const perspective = view.perspective && !view.portrait;
    if (perspective || view.classicPortrait) layers.push(pictureBackdrop());
    layers.push(...placements.map(([x, y, id, reflected, , width, height]) => {
      const tile = document.createElement("img");
      tile.alt = "";
      const terrain = id.startsWith("tile:");
      // Interior tiles overlap by half a CSS pixel to cover rounding seams.
      // The final column and row stop at the edge of the picture panel.
      const overlapRight = terrain && x < 104;
      const overlapBottom = terrain && y < 104;
      if (terrain) tile.classList.add("terrain-tile");
      const sky = id.startsWith("tile:16:") ? "swamp" : id.startsWith("tile:28:") ? "zhentil"
        : id.startsWith("tile:24:") ? "bane" : undefined;
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
        tile.style.width = overlapRight ? `calc(${width / 3.2}% + 0.5px)` : `${width / 3.2}%`;
        tile.style.height = overlapBottom ? `calc(${height / 2}% + 0.5px)` : `${height / 2}%`;
      }
      if (reflected || (terrain && state.reflectedTiles?.includes(id))) tile.style.transform = "scaleX(-1)";
      tile.style.left = `${x / 3.2}%`;
      tile.style.top = `${y / 2}%`;
      tile.src = `/art/${id}`;
      return tile;
    }));
  }
  // Keep the last complete view on screen until the replacement layers
  // are ready. The raw framebuffer can still contain the original art.
  try {
    const nextFrame = new Image();
    nextFrame.src = source;
    const decodeLayer = async layer => {
      if (!(layer instanceof HTMLImageElement)) return layer;
      try {
        await layer.decode();
        return layer;
      } catch (error) {
        // Terrain remains in the enhanced framebuffer underneath its PNGs.
        if (layer.matches(".terrain-tile, .battle-tile")) return null;
        if (layer.matches(".encounter-portrait")) return pictureBackdrop();
        if (layer.matches(".combat-sprite")) return spriteBackdrop(layer);
        if (layer.matches(".encounter-sprite")) {
          const [x, y, , width, height] = view.encounter;
          return spriteBackdrop(layer, [x / 3.2, y / 2, width / 3.2, height / 2]);
        }
        throw error;
      }
    };
    const [, decodedLayers] = await Promise.all([nextFrame.decode(), Promise.all(layers.map(decodeLayer))]);
    layers = decodedLayers.filter(Boolean);
  } catch {
    if (render !== screenRender) return;
    if (sceneArt) failedSceneArt.add(view);
    else if (useEnhanced) failedEnhancedFrames.add(view);
    else {
      holdAnimationFrame(view);
      return;
    }
    void showScreen();
    return;
  }
  if (render !== screenRender) return;
  screen.src = source;
  tileArt.replaceChildren(...layers);
  tileArt.hidden = !showArt;
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
  holdAnimationFrame(view);
}

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
    if (lastSoundId === null) lastSoundId = next.soundId ?? 0;
    if (lastTextId === null) lastTextId = next.textId ?? 0;
    if (lastNarrationId === null) lastNarrationId = next.narrationId ?? 0;
    const changed = next.sequence !== state.sequence;
    if (changed) state = next;
    else Object.assign(state, next);
    closeJournal.disabled = !state.ready || Boolean(state.stopped);
    autoTrack.disabled = closeJournal.disabled;
    if (changed) {
      render();
      playAnimation();
      if (state.automaticCombat) {
        quickPollAfter = performance.now() + 160 +
          (state.animation ?? []).reduce((total, frame) => total + (frame.durationMs ?? 120), 0);
      }
    }
    if (state.automaticCombat && !state.journal && state.ready && !animationFrame && performance.now() >= quickPollAfter) {
      void send(":poll");
    }
    playPendingSounds();
    playPendingVoice();
    playPendingNarration();
    status.textContent = state.stopped ?? state.notice ??
      (state.automaticCombat && !state.journal ? "Combat in progress…"
        : state.ready ? "Arrows or keypad to move. Enter to confirm." : "Game running…");
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
  resumeBlockedAudio();
  if (event.key !== "F10" && event.target instanceof HTMLElement && event.target.closest("#audio-settings")) return;
  const advancingCoveredPrint = currentVoice?.dataset.queuedNarration === "true" && ["Enter", " "].includes(event.key);
  if (currentVoice && event.key !== "F10" && !advancingCoveredPrint) stopVoice();
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
