const screen = document.querySelector("#screen");
const bootWheel = document.querySelector("#boot-wheel");
let wheelStartup = false;
const tileArt = document.querySelector("#tile-art");
const gameText = document.querySelector("#game-text");
const journal = document.querySelector("#journal");
const closeJournal = document.querySelector("#close-journal");
const autoTrack = document.querySelector("#auto-track");
const objective = document.querySelector("#objective");
const leads = document.querySelector("#leads");
const status = document.querySelector("#status");
const automap = document.querySelector("#automap");
const automapSvg = document.querySelector("#automap-svg");
const automapTitle = document.querySelector("#automap-title");
const mapToggle = document.querySelector("#map-toggle");
const closeMap = document.querySelector("#close-map");
const markMap = document.querySelector("#mark-map");
const localMap = document.querySelector("#local-map");
const regionMap = document.querySelector("#region-map");
const atlasMap = document.querySelector("#atlas-map");
const atlasView = document.querySelector("#atlas-view");
const atlasSheet = document.querySelector("#atlas-sheet");
const atlasImageLink = document.querySelector("#atlas-image-link");
const atlasImage = document.querySelector("#atlas-image");
const atlasError = document.querySelector("#atlas-error");
const travelMap = document.querySelector("#travel-map");
const travelArt = document.querySelector("#travel-art");
const closeTravelMap = document.querySelector("#close-travel-map");
const travelLandmarks = [...travelMap.querySelectorAll("[data-destination]")];
const phlanLandmark = travelMap.querySelector('[data-destination="phlan"]');
const phlanApproaches = document.querySelector("#phlan-approaches");
const approachButtons = [...phlanApproaches.querySelectorAll("[data-approach]")];
const presentation = document.querySelector("#presentation");
const journalToggle = document.querySelector("#journal-toggle");
const audioToggle = document.querySelector("#audio-toggle");
const partyMaterialColors = [
  [0, 0, 0], [0, 0, 170], [0, 170, 0], [0, 170, 170],
  [170, 0, 0], [170, 0, 170], [170, 85, 0], [170, 170, 170],
  [85, 85, 85], [85, 85, 255], [85, 255, 85], [85, 255, 255],
  [255, 85, 85], [255, 85, 255], [255, 255, 85], [255, 255, 255],
];
const partyPaletteImages = new Map();

function recolorPartySprite(image, id) {
  const palette = id.split(":palette:")[1];
  if (!palette) return;
  if (!partyPaletteImages.has(id)) {
    if (partyPaletteImages.size >= 256) partyPaletteImages.delete(partyPaletteImages.keys().next().value);
    partyPaletteImages.set(id, (async () => {
      const response = await fetch(`/art-materials/${id}`);
      if (response.status === 204) return;
      if (!response.ok) throw new Error("Could not load party material mask");
      const mask = await createImageBitmap(await response.blob());
      try {
        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext("2d");
        context.drawImage(mask, 0, 0);
        const materials = context.getImageData(0, 0, canvas.width, canvas.height).data;
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0);
        const art = context.getImageData(0, 0, canvas.width, canvas.height);
        for (let pixel = 0; pixel < art.data.length; pixel += 4) {
          const material = materials[pixel];
          if (!materials[pixel + 3] || !material || material >= partyMaterialColors.length) continue;
          const target = Number.parseInt(palette[material], 16);
          if (target === material) continue;
          const rgb = partyMaterialColors[target];
          const peak = Math.max(...rgb);
          const value = Math.max(art.data[pixel], art.data[pixel + 1], art.data[pixel + 2]);
          const tint = peak ? rgb.map(color => color / peak) : [0.26, 0.26, 0.26];
          const exposure = peak ? peak / Math.max(...partyMaterialColors[material]) : 1;
          for (let channel = 0; channel < 3; channel++) {
            art.data[pixel + channel] = value * exposure * tint[channel];
          }
        }
        context.putImageData(art, 0, 0);
        return canvas.toDataURL();
      } finally {
        mask.close();
      }
    })().catch(error => {
      partyPaletteImages.delete(id);
      throw error;
    }));
  }
  return partyPaletteImages.get(id);
}
// The page's settings: the sound, and in a release the player's own original files (#74).
const settingsPanel = document.querySelector("#settings");
const originalFiles = {
  panel: document.querySelector("#original-files"), status: document.querySelector("#original-files-status"),
  path: document.querySelector("#original-files-path"), use: document.querySelector("#original-files-use"),
  stop: document.querySelector("#original-files-stop"), message: document.querySelector("#original-files-message"),
};
const audioControls = {
  hardware: document.querySelector("#audio-hardware"), master: document.querySelector("#audio-master"),
  effects: document.querySelector("#audio-effects"),
  narration: document.querySelector("#audio-narration"), muted: document.querySelector("#audio-muted"),
};
// No Dialogue level: one narrator performs every character, so every spoken line is narration.
const defaultAudioPreferences = { hardware: "pc-speaker", master: 0.8, effects: 1,
  narration: 1, muted: false };
let audioPreferences = defaultAudioPreferences;
try { audioPreferences = { ...defaultAudioPreferences, ...JSON.parse(localStorage.getItem("por.audio.v1") ?? "{}") }; } catch {}
let currentEffect;
let enhancedScorePlaying = false;
let titleCueStarted = false;
let lastSoundId = null;
let blockedEffect;
let voiceManifest = { lines: [] };
let soundManifest = { events: [] };
let currentVoice;
let blockedVoice;
let narrationQueue = [];
let keyEndsVoice;
let pendingVoiceStop;
let visibilityPausedEffect;
let visibilityPausedVoice;
let lastTextId = null;
let lastNarrationId = null;
const narratedScenes = new Set();
let state = { sequence: -1 };
let posting = false;
let quickPollAfter = 0;
let enhanced = false;
let streetUnavailable = false;
let streetLoading;
let streetViewport;
let streetModule;
let streetAtlas;
let overlandViewport;
let overlandLoading;
// Enhanced overland play always shows the illustrated Moonsea map: there is no switch back to the original tiles.
const travelArtEnabled = true;
let travelArtReady = false;
let travelExpanded = false;
let activeTravel;
const failedSurfaces = new Set();
// The game runner records the discovered map and keeps it in the save slot.
let discoveredMaps = {};
let automapRevision;
let automapLoading = false;
let legacyAutomapPending = false;
let geographyModel = { areas: [] };
let atlas = [];
let mapMode = "local";
async function syncAutomap() {
  if (automapLoading || state.automapRevision === undefined || state.automapRevision === automapRevision) return;
  automapLoading = true;
  try {
    const { revision, maps } = await (await fetch("/automap.json")).json();
    discoveredMaps = maps;
    automapRevision = revision;
    if (!automap.hidden) renderAutomap();
  } catch {
    // The next poll asks again.
  } finally {
    automapLoading = false;
  }
}

// Earlier versions kept the map in this browser. Hand a loaded slot's copy to the runner once.
function offerLegacyAutomap() {
  const slot = state.saveSlot;
  if (legacyAutomapPending || !slot || state.saveSlotAction !== "load" || !state.ready || posting ||
    state.stopped || state.journal) return;
  const moved = `por.automap.moved.${slot}`;
  let stored;
  try {
    if (localStorage.getItem(moved)) return;
    stored = localStorage.getItem(`por.automap.v2.${slot}`);
  } catch { return; }
  if (!stored) return;
  legacyAutomapPending = true;
  fetch("/automap", { method: "POST", body: stored }).then(response => {
    if (!response.ok) return;
    localStorage.setItem(moved, "1");
    state.ready = false;
  }).catch(() => {}).finally(() => { legacyAutomapPending = false; });
}
const areaNames = {
  0: "New Phlan", 3: "Valjevo Castle", 5: "Valjevo Castle",
  17: "Nomad Camp", 18: "Podal Plaza", 26: "West Overland", 27: "East Overland",
};
let animationFrame;
let animationTimer;
let advanceAnimation;
// The clips still to play. The next batch of an animation the game plays by itself joins the end.
let animationQueue = [];
let screenRender = 0;
let renderingSequence;
const failedSceneArt = new WeakSet();
const failedEnhancedFrames = new WeakSet();

function syncAudioControls() {
  for (const key of ["hardware", "master", "effects", "narration"])
    audioControls[key].value = String(audioPreferences[key]);
  audioControls.muted.checked = audioPreferences.muted;
  if (currentEffect) currentEffect.volume = audioPreferences.muted ? 0 : audioPreferences.master * audioPreferences.effects;
  if (currentVoice) currentVoice.volume = audioPreferences.muted ? 0 :
    audioPreferences.master * audioPreferences.narration;
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
  enhancedScorePlaying = false;
  blockedEffect = undefined;
  visibilityPausedEffect = undefined;
}

function playSound(sound) {
  if (sound.index === 0 || sound.index === 0xff) { stopEffect(); return; }
  if (sound.index < 1 || sound.index > 20) return;
  const entry = soundManifest.events.find((candidate) => candidate.index === sound.index);
  const replacement = enhanced && entry?.enhancedFile;
  // Silent is the Classic hardware choice: it silences the original's sounds, not Enhanced ones.
  if (!replacement && audioPreferences.hardware === "silent") return;
  if (sound.enhancedOnly && !replacement) return;
  // The server marks events whose Classic file does not belong to the running build.
  if (!replacement && entry?.classic === false) return;
  if (sound.index === 13 && replacement && !sound.enhancedOnly) return;
  stopEffect();
  const source = replacement ? `/enhanced-audio/${replacement}`
    : `/audio/${audioPreferences.hardware}-${String(sound.index).padStart(2, "0")}.wav`;
  const effect = new Audio(source);
  effect.volume = audioPreferences.muted ? 0 : audioPreferences.master * audioPreferences.effects;
  effect.loop = !replacement && (entry?.loop ?? [13, 14, 15].includes(sound.index));
  enhancedScorePlaying = Boolean(replacement && entry.kind === "score");
  currentEffect = effect;
  effect.play().then(() => { blockedEffect = undefined; }).catch(() => { if (currentEffect === effect) blockedEffect = sound; });
}

// The game's name fades in over the title art, then SPECIAL EDITION under it (the owner, 2026-11-22).
// Each is its own picture with a transparent background (scene:title-name, scene:title-edition);
// without them the title art shows alone.
const titleLayers = [["#title-name", "/art/scene:title-name"], ["#title-edition", "/art/scene:title-edition"]].map(([selector, source]) => {
  const image = document.querySelector(selector);
  const layer = { image, source };
  image.addEventListener("load", () => { if (titleLayersShown) requestAnimationFrame(() => image.classList.add("shown")); });
  image.addEventListener("error", () => { image.hidden = true; layer.missing = true; });
  return layer;
});
let titleLayersShown = false;
// The runner passes the publisher screen before the page sees its first frame (it runs ahead to
// POR_LIVE_AT), so the page shows the publisher art itself, once, before the title: about three
// seconds, then a fade to the harbour, and only then do the title's name and SPECIAL EDITION fade in.
// Presentation only: the game is already at its title and waits there. So a key pressed while the
// publisher screen is up must not reach the game, which would leave its title before the player saw
// it (#127): the key brings the title up instead (publisherSplashUp, leavePublisherSplash).
const publisherSplash = document.querySelector("#publisher-splash");
let publisherSplashDone = false;
let publisherSplashLeaving = false;
let publisherSplashTimer;
/** The publisher screen is up, or fading out over the title: from the title's first frame until it is gone. */
function publisherSplashUp() {
  return !publisherSplashDone && Boolean(publisherSplash.getAttribute("src"));
}
function leavePublisherSplash() {
  if (publisherSplashDone || publisherSplashLeaving) return;
  publisherSplashLeaving = true;
  clearTimeout(publisherSplashTimer);
  publisherSplash.classList.remove("shown");
  publisherSplashTimer = setTimeout(() => { publisherSplash.hidden = true; publisherSplashDone = true; showTitleName(); }, 1200);
}
/**
 * The splash is Enhanced's: switching to Classic ends it at once, wherever it is in its fade (#153),
 * so nothing of it shows over the game's own title. Switching back finds it done and shows the title.
 */
function endPublisherSplash() {
  if (publisherSplashDone || !publisherSplash.getAttribute("src")) return;
  publisherSplashLeaving = true;
  publisherSplashDone = true;
  clearTimeout(publisherSplashTimer);
  publisherSplash.classList.remove("shown");
  publisherSplash.hidden = true;
}
function showPublisherSplash() {
  if (publisherSplashDone) return false;
  if (state.scene === "scene:publisher" || !enhanced || state.scene !== "scene:title") {
    if (state.scene === "scene:publisher") publisherSplashDone = true;
    return false;
  }
  if (!publisherSplash.getAttribute("src")) {
    publisherSplash.hidden = false;
    publisherSplash.addEventListener("load", () => {
      if (publisherSplashLeaving || publisherSplashDone) return;
      requestAnimationFrame(() => { if (!publisherSplashLeaving) publisherSplash.classList.add("shown"); });
      publisherSplashTimer = setTimeout(leavePublisherSplash, 3500);
    }, { once: true });
    publisherSplash.addEventListener("error", () => { publisherSplash.hidden = true; publisherSplashDone = true; showTitleName(); }, { once: true });
    publisherSplash.src = "/art/scene:publisher";
  }
  return true;
}
function showTitleName() {
  if (showPublisherSplash()) return;
  const showing = enhanced && state.scene === "scene:title";
  if (showing === titleLayersShown) return;
  titleLayersShown = showing;
  for (const { image, source, missing } of titleLayers) {
    image.classList.remove("shown");
    image.hidden = !showing || Boolean(missing);
    if (!showing || missing) continue;
    if (image.getAttribute("src")) {
      if (image.complete && image.naturalWidth) requestAnimationFrame(() => image.classList.add("shown"));
    } else image.src = source;
  }
}

const buildVersionLabel = document.querySelector("#build-version");
function showBuildVersion() {
  // Presentation only: the same label in Classic and Enhanced, only while the title is up.
  const label = state.buildVersion;
  const showing = Boolean(label) && state.scene === "scene:title";
  buildVersionLabel.hidden = !showing;
  if (showing && buildVersionLabel.textContent !== label) buildVersionLabel.textContent = label;
}

function playTitleCue() {
  showTitleName();
  showBuildVersion();
  if (!enhanced || (state.scene !== "scene:title" && state.scene !== "scene:publisher")) {
    titleCueStarted = false;
    return;
  }
  if (titleCueStarted || !soundManifest.events.some(entry => entry.index === 13 && entry.enhancedFile)) return;
  titleCueStarted = true;
  playSound({ index: 13, enhancedOnly: true });
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
fetch("/sound-manifest.json").then((response) => response.json()).then((manifest) => {
  soundManifest = manifest;
  playTitleCue();
}).catch(() => {});
fetch("/geography-model.json").then((response) => response.json()).then((model) => {
  geographyModel = model;
  if (!automap.hidden && mapMode === "region") renderAutomap();
}).catch(() => {});
fetch("/atlas.json").then((response) => response.ok ? response.json() : []).then((sheets) => {
  atlas = sheets;
  if (!automap.hidden) renderAutomap();
}).catch(() => {});
atlasImage.addEventListener("error", () => {
  atlasImageLink.hidden = true;
  atlasError.hidden = false;
});
audioToggle.addEventListener("click", () => {
  settingsPanel.hidden = !settingsPanel.hidden;
  audioToggle.setAttribute("aria-expanded", String(!settingsPanel.hidden));
  if (settingsPanel.hidden) (journal.hidden ? screen : closeJournal).focus({ preventScroll: true });
  resumeBlockedAudio();
});

// "Use my original files" (#74). Only a release offers it: the server answers /original-files when the
// launcher names the setting's file. The launcher reads the setting when the game starts, so a change
// takes effect at the next start, and the page says so.
const releaseNames = { "1.3": "version 1.3", first: "the first release" };
function describeOriginalFiles({ inUse, path, problem }) {
  const now = !inUse ? "Not in use: the game runs from its own data, and the Classic display is not available."
    : inUse.release === "1.3" ? `In use: ${inUse.folder} (version 1.3). The Classic display is available (F10).`
    : `In use: ${inUse.folder} (the first release). The Classic display is available (F10), with its pictures; the game is version 1.3.`;
  const next = problem ? ` The setting cannot be used (${problem}).`
    : (path ?? null) !== (inUse?.folder ?? null) ? (path ? ` From the next start: ${path}.` : " From the next start: none.") : "";
  originalFiles.status.textContent = now + next;
  originalFiles.stop.hidden = !path;
  if (!originalFiles.path.value) originalFiles.path.value = path ?? "";
}
let originalFilesState;
fetch("/original-files").then((response) => response.ok ? response.json() : undefined).then((setting) => {
  if (!setting) return;
  originalFilesState = setting;
  originalFiles.path.placeholder = setting.example ?? "";
  describeOriginalFiles(setting);
  originalFiles.panel.hidden = false;
}).catch(() => {});
async function chooseOriginalFiles(path) {
  originalFiles.use.disabled = originalFiles.stop.disabled = true;
  originalFiles.message.textContent = path ? "Checking the folder…" : "";
  try {
    const response = await fetch("/original-files", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ path }),
    });
    const reply = await response.json().catch(() => ({}));
    if (!response.ok) {
      originalFiles.message.textContent = `Not saved: ${reply.problem ?? `the game answered ${response.status}`}.`;
      return;
    }
    originalFilesState = { ...originalFilesState, path: reply.path, problem: null };
    describeOriginalFiles(originalFilesState);
    if (reply.path) originalFiles.path.value = reply.path;
    originalFiles.message.textContent = reply.path
      ? `Saved: ${reply.path} (${releaseNames[reply.release]}). It takes effect the next time the game starts: close the game and start it again.`
      : "Saved: no original files. From the next start the game runs from its own data, without the Classic display.";
  } catch (error) {
    originalFiles.message.textContent = `Not saved: ${error.message}.`;
  } finally {
    originalFiles.use.disabled = originalFiles.stop.disabled = false;
  }
}
originalFiles.use.addEventListener("click", () => {
  const path = originalFiles.path.value.trim();
  if (path) chooseOriginalFiles(path);
  else originalFiles.message.textContent = "Name the folder first.";
});
originalFiles.path.addEventListener("keydown", (event) => {
  if (event.key === "Enter") originalFiles.use.click();
});
originalFiles.stop.addEventListener("click", () => chooseOriginalFiles(null));
for (const key of ["hardware", "master", "effects", "narration", "muted"]) {
  audioControls[key].addEventListener("input", () => {
    audioPreferences = { ...audioPreferences, [key]: key === "muted"
      ? audioControls[key].checked : key === "hardware" ? audioControls[key].value : Number(audioControls[key].value) };
    if (key === "hardware") {
      stopEffect();
      titleCueStarted = false;
      playTitleCue();
    }
    saveAudioPreferences();
  });
}

function finishAnimation() {
  clearTimeout(animationTimer);
  animationTimer = undefined;
  advanceAnimation = undefined;
  animationFrame = undefined;
  animationQueue = [];
}

// The narration playback log: what the page was told to narrate and what the audio element then
// did. It observes only and never changes what plays. window.porNarrationPlayback() returns it
// to the Chrome checks. docs/NARRATION-QA.md describes the fields.
const narrationPlayback = [];
const voiceLog = new WeakMap();
const soundingVoices = new Map();
let shownArtwork = null;
const playbackSeconds = () => Math.round(performance.now()) / 1000;
function logNarrationQueued(narration) {
  const entry = { id: narration.id, unitId: narration.unitId, ...(narration.variantId ? { variantId: narration.variantId } : {}),
    asset: narration.asset, queuedAt: playbackSeconds(), queuedFrame: state.sequence,
    // Lines sounding or waiting when this one was queued: it has to wait its turn behind them.
    ...(currentVoice || blockedVoice || narrationQueue.length ? { ahead: narrationQueue.length + (currentVoice || blockedVoice ? 1 : 0) } : {}),
    // A recording from voices.json is speaking: the page matched it to the text this narration reads.
    ...(currentVoice && currentVoice.dataset.queuedNarration !== "true" ? { behindVoiceLine: currentVoice.getAttribute("src") } : {}) };
  narrationPlayback.push(entry);
  if (narrationPlayback.length > 2048) narrationPlayback.shift();
  return entry;
}
function closeNarrationLog(entry, outcome, reason, voice) {
  if (!entry || entry.outcome) return;
  Object.assign(entry, { outcome, ...(reason ? { reason } : {}), endedAt: playbackSeconds(), endFrame: state.sequence,
    ...(voice ? { position: voice.currentTime } : {}), artAtEnd: shownArtwork });
}
function logVoice(voice, entry) {
  voiceLog.set(voice, entry);
  voice.addEventListener("playing", () => {
    const others = [...soundingVoices].filter(([other]) => other !== voice && !other.paused && !other.ended);
    soundingVoices.set(voice, entry);
    for (const [, other] of others) if (other && !other.outcome) other.talkedOverBy = entry?.id ?? "a voice line";
    if (!entry || entry.startedAt !== undefined) return;
    Object.assign(entry, { startedAt: playbackSeconds(), startFrame: state.sequence, duration: voice.duration,
      artAtStart: shownArtwork, artSeen: [shownArtwork], artTimes: [0] });
    if (others.length) entry.startedOver = others.map(([, other]) => other?.id ?? "a voice line");
  });
  voice.addEventListener("pause", () => {
    if (entry && !entry.outcome && !voice.ended) entry.pauses = (entry.pauses ?? 0) + 1;
  });
  voice.addEventListener("ended", () => { soundingVoices.delete(voice); closeNarrationLog(entry, "ended", undefined, voice); });
  voice.addEventListener("error", () => { soundingVoices.delete(voice); closeNarrationLog(entry, "stopped", "load error", voice); });
}
function logVoiceStopped(voice, blocked, queued, reason) {
  const playing = voice && voiceLog.get(voice);
  if (voice) soundingVoices.delete(voice);
  if (playing) closeNarrationLog(playing, playing.startedAt === undefined ? "never-started" : "stopped",
    playing.startedAt === undefined ? `${reason}, before the recording had loaded` : reason, voice);
  closeNarrationLog(blocked?.log, "never-started", `play() was refused (${blocked?.log?.refused}), then ${reason}`);
  for (const line of queued) {
    if (playing && line.log && !line.log.outcome) line.log.behind = playing.id;
    closeNarrationLog(line.log, "never-started", `queue cleared: ${reason}`);
  }
}
function logShownArtwork(key) {
  shownArtwork = key;
  for (const [voice, entry] of soundingVoices) {
    if (entry && !entry.outcome && !voice.paused && entry.artSeen.at(-1) !== key && entry.artSeen.length < 16) {
      entry.artSeen.push(key);
      entry.artTimes.push(Math.round((playbackSeconds() - entry.startedAt) * 1000) / 1000);
    }
  }
}
window.porNarrationPlayback = () => ({ at: playbackSeconds(), frame: state.sequence, queued: narrationQueue.length,
  sounding: [...soundingVoices.keys()].filter(voice => !voice.paused && !voice.ended).length,
  lines: narrationPlayback.map(entry => entry.outcome ? entry
    : { ...entry, position: [...soundingVoices].find(([, sounding]) => sounding === entry)?.[0].currentTime }) });

function stopVoice(clearNarrationQueue = true, reason = "replaced") {
  logVoiceStopped(currentVoice, blockedVoice, clearNarrationQueue ? narrationQueue : [], reason);
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
  voice.volume = audioPreferences.muted ? 0 : audioPreferences.master * audioPreferences.narration;
  currentVoice = voice;
  logVoice(voice, line.log);
  voice.addEventListener("ended", () => {
    if (currentVoice !== voice) return;
    currentVoice = undefined;
    visibilityPausedVoice = undefined;
    playNextNarration();
  }, { once: true });
  voice.play().catch((error) => {
    if (line.log && !line.log.outcome) line.log.refused = error?.name ?? "refused";
    if (currentVoice !== voice) return;
    currentVoice = undefined;
    blockedVoice = line;
  });
}

function playVoice(line) {
  stopVoice(true, "a voice line replaced it");
  beginVoice(line);
}

function playNextNarration() {
  if (!enhanced || currentVoice || blockedVoice) return;
  const line = narrationQueue.shift();
  if (line) beginVoice(line);
}

function enqueueNarration(narration) {
  narrationQueue.push({ type: "narration", queuedNarration: true, log: logNarrationQueued(narration),
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

// When the last batch of an animation the game plays by itself arrived, or the key that began it was sent.
let selfPlayingBatchAt;
/** The clips each mode can show, including Classic palette holds and Enhanced illustrations. */
function presentedClips() {
  const frames = state.animation ?? [];
  return frames.filter(frame => enhanced ? !frame.classicOnly : !frame.enhancedOnly);
}
function playAnimation(continues = false) {
  let frames = presentedClips();
  if (state.presentationPolling || continues) {
    // The runner draws such an animation several times slower than the original showed it (its DOS
    // clock moves one hundredth per reading). The page asks for the next batch at once, so the time
    // this batch took to arrive is what drawing it cost. Each batch is spread over the time the next
    // one will take, which the frame names by its size, up to 0.9 s a picture, so the poses keep
    // moving while it is drawn, rather than playing at once and then holding for seconds (#125). The
    // game's own timing is untouched.
    const now = performance.now();
    const next = typeof state.presentationPolling === "number" ? state.presentationPolling : frames.length;
    const perPicture = frames.length ? (now - (selfPlayingBatchAt ?? now)) / frames.length : 0;
    // Poses cost the runner unevenly (each is drawn as many times as the original holds it), so a batch
    // can take half as long again as the last one foretold: spreading by that much more keeps the
    // pictures running into the next batch, at the cost of a slower animation, never a stop.
    const spread = frames.length ? Math.min(900, 1.5 * perPicture * next / frames.length) : 0;
    selfPlayingBatchAt = state.presentationPolling ? now : undefined;
    if (state.presentationPolling) {
      frames = frames.map(frame => ({ ...frame, gameMs: frame.durationMs ?? 120, durationMs: Math.max(frame.durationMs ?? 120, spread) }));
    } else {
      // The game has gone on to its next prompt (the castle departure): the poses still to come play
      // at the original's pace, and all within a second, so the next picture is not kept waiting
      // behind them (#125).
      const rest = [...animationQueue, ...frames.map(frame => ({ ...frame, gameMs: frame.durationMs ?? 120 }))];
      const total = rest.reduce((sum, frame) => sum + (frame.gameMs ?? frame.durationMs ?? 120), 0);
      const scale = Math.min(1, 1000 / Math.max(total, 1));
      for (const frame of rest) frame.durationMs = Math.max(16, (frame.gameMs ?? frame.durationMs ?? 120) * scale);
      animationQueue.length = 0;
      frames = rest;
    }
  }
  // The game's next batch of an animation it plays by itself (#121) follows the clips still playing,
  // so the pictures run on while the game draws the batch after (#125).
  if (continues && advanceAnimation) {
    animationQueue.push(...frames);
    return;
  }
  finishAnimation();
  if (!frames.length) {
    void showScreen();
    return;
  }
  animationQueue = [...frames];
  advanceAnimation = () => {
    animationFrame = animationQueue.shift();
    if (!animationFrame) finishAnimation();
    void showScreen();
  };
  advanceAnimation();
}

// Enhanced holds each picture of an approaching encounter at least this long. On 1990 hardware the
// drawing itself took visible time; the port draws at once, and at game speed 1 the scripted pause
// is 225 ms, too quick to take in (#129). Classic keeps the original's pause exactly.
const enhancedApproachMs = 800;
const overlandImages = new Map();
const failedOverlandTerrain = new WeakSet();
function overlandImage(id) {
  let image = overlandImages.get(id);
  if (!image) {
    const tile = new Image();
    tile.src = `/art/${id}`;
    image = tile.decode().then(() => tile).catch(error => {
      overlandImages.delete(id);
      throw error;
    });
    overlandImages.set(id, image);
  }
  return image;
}

function holdAnimationFrame(view) {
  if (view !== animationFrame || animationTimer !== undefined || !advanceAnimation) return;
  const ms = view.durationMs ?? 120;
  animationTimer = setTimeout(() => {
    animationTimer = undefined;
    advanceAnimation?.();
  }, enhanced && view.approach ? Math.max(enhancedApproachMs, ms) : ms);
}

// The shipped game has no original pictures, so it has no Classic switch. The player's own original
// files make Classic available (ROADMAP.md, "The release shape").
// The game always starts in Enhanced (the owner, 2026-11-22). With the player's own files the switch
// to Classic is there; without them it is hidden. The checks open the page with ?display=classic to
// start where they were written to start.
const startInClassic = new URLSearchParams(location.search).get("display") === "classic";
let presentationSettled = false;
function settlePresentation() {
  if (presentationSettled || state.classicAvailable === undefined) return;
  presentationSettled = true;
  if (state.classicAvailable && startInClassic) return;
  if (!enhanced) togglePresentation();
  presentation.hidden = !state.classicAvailable;
}

function togglePresentation() {
  if (enhanced && state.classicAvailable === false) return;
  enhanced = !enhanced;
  if (!enhanced) activeTravel = undefined;
  if (!enhanced) endPublisherSplash();
  document.documentElement.dataset.presentation = enhanced ? "enhanced" : "classic";
  presentation.setAttribute("aria-pressed", String(enhanced));
  mapToggle.hidden = !enhanced;
  renderTravelMap();
  journalToggle.hidden = !enhanced;
  if (!enhanced && !automap.hidden) toggleAutomap();
  if (!enhanced) stopVoice(true, "switched to Classic");
  if (!enhanced && enhancedScorePlaying) stopEffect();
  playTitleCue();
  if (animationFrame) {
    // Let the new presentation finish decoding before timing the frame again.
    clearTimeout(animationTimer);
    animationTimer = undefined;
  }
  showScreen();
  renderCodeWheel();
  playPendingVoice();
}

function explorationSurface(view) {
  if (view.art || view.portrait || view.classicPortrait || view.characterSheet ||
    view.combatArt?.length || view.battleTiles?.length || view.battleProps?.length) return;
  if (view.overlandMap) return { materialId: "overland" };
  if (!view.perspective || view.areaView) return;
  if (view.scenery) return view.scenery;
  // Some old title/tour handoffs report position before the draw hook fires.
  const pose = view.exploration;
  if (pose?.area === 0 && [pose.cameraX, pose.cameraY].every(value => Number.isInteger(value) && value >= 0 && value < 16)) {
    return { materialId: "phlan", x: pose.cameraX, y: pose.cameraY, facing: pose.facing };
  }
}

travelArt.addEventListener("load", () => {
  travelArtReady = true;
  renderTravelMap();
});
travelArt.setAttribute("href", "/atlas/phlan-region-concept-v2-geography.png");

function renderTravelMap(view = animationFrame ?? state) {
  const overland = enhanced && view.overlandMap && !view.journal && !view.classicPortrait && !view.combatArt?.length;
  const illustrated = overland && travelArtReady;
  // The regional atlas covers travel. A decoded local encounter or portrait occupies its panel.
  const picture = Boolean(view.portrait || view.scene || view.art);
  const encounter = Boolean(view.encounter?.length);
  const localEncounter = encounter && view.overlandTerrain &&
    tileArt.querySelector(".local-overland-encounter");
  const visible = illustrated && travelArtEnabled && !picture && !localEncounter;
  if ((!visible || encounter || activeTravel) && travelExpanded) setTravelExpanded(false);
  travelMap.hidden = !visible;
  tileArt.classList.toggle("overland-encounter", visible && encounter);
  // Landmarks take a click only at the game's travel screen, and not while a route is being walked.
  const routes = visible && view.travel && !activeTravel && !animationFrame && state.ready && !state.stopped ? view.travel.routes : {};
  for (const landmark of travelLandmarks) {
    const enabled = Boolean(phlanApproaches.hidden && routes[landmark.dataset.destination]);
    landmark.setAttribute("aria-disabled", String(!enabled));
    landmark.setAttribute("tabindex", enabled ? "0" : "-1");
  }
  for (const button of approachButtons) button.disabled = !routes[button.dataset.approach];
}

function setTravelExpanded(expanded) {
  travelExpanded = expanded;
  if (!expanded) setPhlanApproaches(false);
  travelMap.classList.toggle("expanded", expanded);
  closeTravelMap.hidden = !expanded;
  mapToggle.setAttribute("aria-expanded", String(expanded));
  (expanded ? closeTravelMap : screen).focus({ preventScroll: true });
}

function setPhlanApproaches(open) {
  phlanApproaches.hidden = !open;
  phlanLandmark.setAttribute("aria-expanded", String(open));
}

function closePhlanApproaches() {
  setPhlanApproaches(false);
  renderTravelMap();
  phlanLandmark.focus({ preventScroll: true });
}

function selectTravel(destination, label) {
  if (!state.travel?.routes[destination] || activeTravel || posting || !state.ready || state.stopped) return;
  resumeBlockedAudio();
  activeTravel = { destination, label };
  setTravelExpanded(false);
  renderTravelMap();
  followTravel();
}

for (const landmark of travelLandmarks) {
  const activate = () => {
    if (landmark.getAttribute("aria-disabled") !== "false") return;
    if (landmark === phlanLandmark) {
      setTravelExpanded(true);
      setPhlanApproaches(true);
      renderTravelMap();
      approachButtons.find(button => !button.disabled && button.getClientRects().length)?.focus({ preventScroll: true });
    } else {
      selectTravel(landmark.dataset.destination, landmark.getAttribute("aria-label"));
    }
  };
  landmark.addEventListener("click", activate);
  landmark.addEventListener("keydown", event => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    event.stopPropagation();
    activate();
  });
}
for (const button of approachButtons) {
  button.addEventListener("click", () => selectTravel(button.dataset.approach, button.textContent));
}

function turnToward(facing, direction) {
  return (direction - facing + 8) % 8 === 6 ? -2 : 2;
}

function ferryStep(route) {
  const atHarbor = route.ferry === "quay" && route.atHarbor && route.quayPose === "11,0";
  if (route.ferry === "harbor" || (atHarbor && state.sokalPrompt)) {
    if (state.sokalPrompt === "fare") {
      route.ferry = "payer";
      return "s";
    }
    if (state.sokalPrompt === "directions") {
      route.ferry = "ticket";
      return "enter";
    }
    return;
  }
  if (route.ferry === "landing") return;
  // The native script can begin boarding on the final step or after Enter.
  if (route.quayPose === "15,2" && state.sokalPrompt === "boarding") {
    route.ferry = "landing";
    route.handoffBudget = 3;
    return "enter";
  }
  if (route.ferry === "boarding") return;

  const quay = state.sokalQuay;
  if (!quay || quay.ticket === "other" || (route.ferry !== "quay" && quay.ticket !== "sokal") ||
    route.quayPose !== `${quay.x},${quay.facing}`) return;
  const { x, facing, ticket } = quay;
  const east = ticket === "sokal";
  if (east && x === 15 && facing === 2) {
    route.ferry = "boarding";
    return "enter";
  }
  const direction = east ? 2 : x === 11 ? 0 : 6;
  if (facing !== direction) {
    const turn = turnToward(facing, direction);
    route.quayPose = `${x},${(facing + turn + 8) % 8}`;
    return turn === 2 ? "right" : "left";
  }
  if (!east && x === 11) {
    // Facing the harbor office, a forward input sets up the native interaction.
    if (!route.atHarbor) {
      route.atHarbor = true;
      return "up";
    }
    route.ferry = "harbor";
    return "enter";
  }
  route.quayPose = `${x + (east ? 1 : -1)},${facing}`;
  return "up";
}

const podolWestEntrance = "18,0,4,6";
const roadToStojanow = { entry: podolWestEntrance, waypoints: [[4, 4], [4, 0]], exitFacing: 0 };
const harborEntrance = "0,15,1,6";
const roadFromHarbor = [[11, 1], [11, 2], [10, 2]];
const districtRoads = {
  stojanow: [roadToStojanow],
  valjevo: [roadToStojanow, { entry: "9,4,15,0", waypoints: [[4, 11], [7, 11], [7, 4], [4, 4], [4, 0]], exitFacing: 0 }],
  kutoWell: [{ entry: podolWestEntrance,
    waypoints: [[2, 4], [2, 3], [8, 3], [8, 2], [13, 2], [13, 3], [14, 3], [14, 4], [15, 4]], exitFacing: 2 }],
  slums: [{ entry: harborEntrance, waypoints: [...roadFromHarbor, [10, 3], [3, 3], [3, 4], [0, 4]], exitFacing: 6 }],
  cityHall: [{ entry: harborEntrance, waypoints: [...roadFromHarbor, [10, 3], [4, 3], [4, 4]] }],
  trainingHall: [{ entry: harborEntrance, waypoints: [...roadFromHarbor, [10, 3], [5, 3], [5, 2], [6, 2]] }],
  mendorLibrary: [{ entry: "2,0,4,6", waypoints: [[2, 4], [2, 5], [13, 5], [13, 4], [15, 4]], exitFacing: 2 }],
};

function districtStep(route) {
  if (!state.districtRoad || !state.scenery) return;
  const { mapId, x, y, facing } = state.scenery;
  if (route.roadPose !== `${mapId},${x},${y},${facing}`) return;
  const legs = districtRoads[route.destination];
  const { waypoints, exitFacing } = legs[route.leg];
  const target = waypoints[route.waypoint];
  if (target && target[0] === x && target[1] === y) {
    route.waypoint++;
  }
  if (route.waypoint === waypoints.length && exitFacing === undefined) return;
  const [targetX, targetY] = waypoints[route.waypoint] ?? [x, y];
  const dx = Math.sign(targetX - x), dy = Math.sign(targetY - y);
  const direction = dx ? (dx > 0 ? 2 : 6) : dy ? (dy > 0 ? 4 : 0) : exitFacing;
  if (facing !== direction) {
    const turn = turnToward(facing, direction);
    route.roadPose = `${mapId},${x},${y},${(facing + turn + 8) % 8}`;
    return turn === 2 ? "right" : "left";
  }
  if (route.waypoint === waypoints.length) {
    route.leg++;
    route.roadPose = legs[route.leg]?.entry;
    route.waypoint = 0;
    route.handoffBudget = 3;
  } else {
    route.roadPose = `${mapId},${x + dx},${y + dy},${facing}`;
    if (exitFacing === undefined && route.waypoint === waypoints.length - 1) route.handoffBudget = 3;
  }
  return "up";
}

function overlandStep(route) {
  const { travel } = state;
  const next = travel?.routes[route.destination];
  const here = travel && `${travel.x},${travel.y},${travel.sector}`;
  if (route.arrival && route.arrival.approach === state.phlanArrival) {
    const { key } = route.arrival;
    route.arrival = undefined;
    route.arrivalSent = true;
    route.handoffBudget = 3;
    if (route.destination === "sokal") {
      route.ferry = "quay";
      route.quayPose = "15,6";
    } else if (districtRoads[route.destination]) {
      route.roadPose = districtRoads[route.destination][0].entry;
      route.leg = 0;
      route.waypoint = 0;
    }
    return key;
  }
  if (route.arrivalSent || !next || route.expected && here !== route.expected) return;
  route.expected = `${next.x},${next.y},${next.sector}`;
  route.arrivalSent = next.key === "enter";
  route.arrival = next.arrival;
  route.handoffBudget = next.arrival || next.sector !== travel.sector ? 3 : 0;
  return next.key;
}

function waitingForFerryPayer(route) {
  return route?.ferry === "payer" && state.sokalPrompt === "payer";
}

function travelStep(route) {
  if (state.travelPolling && route.handoffBudget > 0) {
    route.handoffBudget--;
    return ":travel-poll";
  }
  if (route.ferry) return ferryStep(route);
  if (route.roadPose) return districtStep(route);
  return overlandStep(route);
}

function followTravel() {
  const route = activeTravel;
  if (!route || posting || !state.ready || state.sequence === route.sequence || renderingSequence !== undefined || animationFrame) return;
  if (waitingForFerryPayer(route)) return;
  // Story prompts, encounters, and unexpected movement return control to the player.
  const key = enhanced && !state.stopped && !state.animation?.length && travelStep(route);
  if (!key) {
    activeTravel = undefined;
    renderTravelMap();
    return;
  }
  route.sequence = state.sequence;
  void send(key).then(sent => {
    if (sent || activeTravel !== route) return;
    activeTravel = undefined;
    renderTravelMap();
  });
}

function disableStreetPreview(error) {
  streetUnavailable = true;
  if (moveViewport === streetViewport) {
    moveViewport = undefined;
    moveScene = undefined;
  }
  streetViewport?.renderer.dispose();
  streetViewport = undefined;
  console.warn("WebGL exploration is unavailable", error);
}

function rendererModule() {
  return streetModule ??= import("/renderer.js");
}

async function loadStreetAtlas(materialId) {
  const [module, materials] = await Promise.all([
    rendererModule(),
    fetch(`/exploration-materials/${materialId}`).then(response => {
      if (!response.ok) throw new Error("Exploration materials could not be loaded");
      return response.json();
    }),
  ]);
  const {atlas, skyUrl} = await module.createExplorationAtlas(materials, art => `/art/${art.key}`, false, state.textColors);
  const layout = materials.layout ?? (materialId === "phlan" ? "phlan" : "local");
  const wallRows = Object.fromEntries(materials.wallFaces.map(({type, rows = 8}) => [type, rows]));
  return {materialId, module, atlas, skyUrl, walls: materials.walls, layout, wallRows};
}

function makeViewportCanvas(className, width, height) {
  const canvas = document.createElement("canvas");
  canvas.className = className;
  canvas.width = width;
  canvas.height = height;
  canvas.addEventListener("webglcontextlost", () => {
    // Resources in the lost context cannot be reused. Keep the decoded
    // materials and rebuild only the viewport that owned the context.
    if (streetViewport?.canvas === canvas) {
      if (moveViewport === streetViewport) {
        moveViewport = undefined;
        moveScene = undefined;
      }
      streetViewport = undefined;
    }
    else if (overlandViewport?.canvas === canvas) overlandViewport = undefined;
    else return;
    void showScreen();
  }, {once: true});
  return canvas;
}

function ensureStreetViewport(surface) {
  const {materialId, walls: packed} = surface;
  if (failedSurfaces.has(materialId)) return;
  if (materialId === "overland") {
    if (!overlandViewport && !overlandLoading) {
      overlandLoading = rendererModule().then(module => {
        const canvas = makeViewportCanvas("overland-viewport", 352, 352);
        overlandViewport = {canvas, renderer:module.createOverlandViewport(canvas)};
      }).catch(error => {
        failedSurfaces.add(materialId);
        console.warn(error);
      }).finally(() => {
        overlandLoading = undefined;
        void showScreen();
      });
    }
    return overlandViewport;
  }
  if (streetAtlas?.materialId !== materialId) {
    if (!streetLoading) {
      streetLoading = loadStreetAtlas(materialId).then(atlas => {
        streetAtlas = atlas;
      }).catch(error => {
        failedSurfaces.add(materialId);
        console.warn(error);
      }).finally(() => {
        streetLoading = undefined;
        void showScreen();
      });
    }
    return;
  }
  if (streetViewport?.materialId !== materialId || streetViewport.packed !== packed) {
    const canvas = streetViewport?.canvas ?? makeViewportCanvas("street-viewport", 480, 576);
    streetViewport?.renderer.dispose();
    streetViewport = undefined;
    const bytes = packed && atob(packed);
    const walls = bytes ? Array.from({length:256}, (_, i) => {
      const a = bytes.charCodeAt(i), b = bytes.charCodeAt(i+256);
      return [a >> 4, a & 15, b >> 4, b & 15];
    }) : streetAtlas.walls;
    if (!walls) return;
    const renderer = streetAtlas.module.createExplorationViewport(canvas, walls, streetAtlas.atlas, streetAtlas.layout, streetAtlas.wallRows);
    streetViewport = {canvas, renderer, materialId, packed, skyUrl: streetAtlas.skyUrl};
  }
  return streetViewport;
}


// The game still steps one square at a time. The exploration camera and the
// automap party arrow share one tween from the last pose to the new one, and
// discovered squares are painted when that step lands.
const moveDurationMs = 180;
let moveTween;
let moveFrame;
let lastMovePose;
let shownDiscoveredMaps = discoveredMaps;
let moveViewport;
let moveScene;

function shortestFacingDelta(from, to) {
  let delta = (to - from) % 8;
  if (delta > 4) delta -= 8;
  if (delta < -4) delta += 8;
  return delta;
}

function easeMove(t) {
  return t * t * (3 - 2 * t);
}

function interpolateMovePose(from, to, t) {
  const e = easeMove(Math.min(1, Math.max(0, t)));
  return {
    x: from.x + (to.x - from.x) * e,
    y: from.y + (to.y - from.y) * e,
    facing: from.facing + shortestFacingDelta(from.facing, to.facing) * e,
    roofed: to.roofed,
  };
}

function movePose(at = performance.now()) {
  if (!moveTween) return lastMovePose;
  const t = (at - moveTween.started) / moveTween.duration;
  return interpolateMovePose(moveTween.from, moveTween.to, t);
}

function sameMovePose(a, b) {
  return a && b && a.x === b.x && a.y === b.y && a.facing === b.facing && sameMoveSpace(a, b);
}

function sameMoveSpace(a, b) {
  if (a.materialId && b.materialId && a.materialId !== b.materialId) return false;
  if (a.area !== undefined && b.area !== undefined && a.area !== b.area) return false;
  if (a.mapId !== undefined && b.mapId !== undefined && a.mapId !== b.mapId) return false;
  return true;
}

function canTweenMove(from, to) {
  if (!from || !to || !sameMoveSpace(from, to)) return false;
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  const turn = Math.abs(shortestFacingDelta(from.facing, to.facing));
  // A one-square step, a bump back, or a turn. A longer teleport snaps.
  return distance <= 1.01 && (distance > 0.001 || turn > 0.001);
}

function discreteExplorationPose(view = state) {
  const scene = explorationSurface(view);
  if (scene && Number.isFinite(scene.x) && Number.isFinite(scene.y) && Number.isFinite(scene.facing)) {
    return {
      x: scene.x, y: scene.y, facing: scene.facing,
      materialId: scene.materialId, area: scene.area, mapId: scene.mapId,
      roofed: scene.roofed,
    };
  }
  const pose = view.exploration;
  if (!pose || !Number.isFinite(pose.x)) return;
  return { x: pose.x, y: pose.y, facing: pose.facing, area: pose.area, mapId: pose.mapId, roofed: pose.roofed };
}


function setExplorationSky(viewport, roofed) {
  if (!viewport?.canvas) return;
  const sky = viewport.skyUrl && !roofed ? `url("${viewport.skyUrl}")` : "none";
  viewport.canvas.style.setProperty("--sky-texture", sky);
}

function paintMovePose(pose) {
  if (!pose) return;
  if (moveViewport && moveScene) {
    const roofed = Boolean(pose.roofed ?? moveScene.roofed);
    setExplorationSky(moveViewport, roofed);
    moveViewport.renderer.draw({ ...moveScene, x: pose.x, y: pose.y, facing: pose.facing, roofed });
  }
  const marker = automapSvg.querySelector("path.party");
  if (marker) {
    marker.setAttribute("transform", `translate(${pose.x} ${pose.y}) rotate(${pose.facing * 45} .5 .5)`);
  }
  if (typeof window.__onMovePaint === "function") window.__onMovePaint(pose, moveTween);
}

function stopMoveFrame() {
  if (moveFrame !== undefined) {
    cancelAnimationFrame(moveFrame);
    moveFrame = undefined;
  }
}

function finishMove() {
  stopMoveFrame();
  const ended = moveTween;
  moveTween = undefined;
  shownDiscoveredMaps = discoveredMaps;
  if (ended) {
    lastMovePose = ended.to;
    paintMovePose(ended.to);
  }
  if (!automap.hidden) renderAutomap();
}

function tickMove() {
  if (!moveTween) return;
  const t = Math.min(1, (performance.now() - moveTween.started) / moveTween.duration);
  paintMovePose(interpolateMovePose(moveTween.from, moveTween.to, t));
  if (t < 1) moveFrame = requestAnimationFrame(tickMove);
  else finishMove();
}

function startMove(from, to) {
  stopMoveFrame();
  moveTween = { from, to, started: performance.now(), duration: moveDurationMs };
  lastMovePose = to;
  moveFrame = requestAnimationFrame(tickMove);
}

function syncMoveTarget(target) {
  if (!target) {
    if (moveTween) finishMove();
    return;
  }
  if (moveTween && sameMovePose(moveTween.to, target)) return;
  if (sameMovePose(lastMovePose, target) && !moveTween) return;
  if (moveTween) finishMove();
  const from = lastMovePose;
  if (from && canTweenMove(from, target)) startMove(from, target);
  else {
    lastMovePose = target;
    paintMovePose(target);
  }
}

function bindMoveView(viewport, scene) {
  moveViewport = viewport;
  moveScene = scene;
  const pose = movePose();
  if (pose) paintMovePose(pose);
  else {
    setExplorationSky(viewport, scene.roofed);
    viewport.renderer.draw(scene);
  }
}

function discoveredCells(position, maps) {
  const map = maps[position.area];
  const floor = position.mapId === undefined ? map : map?.floors?.[position.mapId];
  return floor ?? { cells: {} };
}

function discoveredLocalMap({ area, mapId }) {
  const map = discoveredMaps[area];
  return mapId === undefined ? map : map?.floors?.[mapId];
}

function renderAutomap() {
  const position = state.exploration;
  if (!position) return;
  const sheets = atlas.filter(sheet => sheet.areas.some(area => sheet.mapId === undefined
    ? area === position.area || discoveredMaps[area]
    : discoveredMaps[area]?.floors?.[sheet.mapId] || (area === position.area && sheet.mapId === position.mapId)));
  atlasMap.hidden = !sheets.length;
  if (mapMode === "atlas" && !sheets.length) mapMode = "local";
  localMap.setAttribute("aria-pressed", String(mapMode === "local"));
  regionMap.setAttribute("aria-pressed", String(mapMode === "region"));
  atlasMap.setAttribute("aria-pressed", String(mapMode === "atlas"));
  atlasView.hidden = mapMode !== "atlas";
  automapSvg.toggleAttribute("hidden", mapMode === "atlas");
  markMap.hidden = mapMode !== "local";
  if (mapMode === "atlas") { renderAtlas(sheets, position); return; }
  if (mapMode === "region") { renderRegionMap(position); return; }
  automapSvg.setAttribute("viewBox", "-0.5 -0.5 17 17");
  automapSvg.setAttribute("aria-label", "Discovered area map");
  if (!moveTween) shownDiscoveredMaps = discoveredMaps;
  const map = discoveredCells(position, moveTween ? shownDiscoveredMaps : discoveredMaps);
  const title = preferredAtlasSheet(sheets, position)?.title;
  automapTitle.textContent = `${title ?? areaNames[position.area] ?? `Area ${position.area}`} — discovered map`;
  const lines = [];
  for (const cell of Object.values(map.cells)) {
    const { x, y, walls } = cell;
    lines.push(`<rect class="floor" x="${x}" y="${y}" width="1" height="1"/>`);
    if (walls[0]) lines.push(`<line class="wall" x1="${x}" y1="${y}" x2="${x + 1}" y2="${y}"/>`);
    if (walls[1]) lines.push(`<line class="wall" x1="${x + 1}" y1="${y}" x2="${x + 1}" y2="${y + 1}"/>`);
    if (walls[2]) lines.push(`<line class="wall" x1="${x}" y1="${y + 1}" x2="${x + 1}" y2="${y + 1}"/>`);
    if (walls[3]) lines.push(`<line class="wall" x1="${x}" y1="${y}" x2="${x}" y2="${y + 1}"/>`);
    if (cell.label) {
      lines.push(`<circle class="landmark" cx="${x + .5}" cy="${y + .5}" r=".18"/>`);
      lines.push(`<text class="landmark-label" x="${x + .75}" y="${y + .37}">${escapeMapText(cell.label)}</text>`);
    }
  }
  const logical = map.position ?? position;
  const p = movePose() ?? logical;
  const angle = p.facing * 45;
  lines.push(`<path class="party" d="M .5 .12 L .82 .82 L .5 .68 L .18 .82 Z" transform="translate(${p.x} ${p.y}) rotate(${angle} .5 .5)"/>`);
  automapSvg.innerHTML = lines.join("");
}

function preferredAtlasSheet(sheets, { area, mapId }) {
  return sheets.find(sheet => sheet.areas.includes(area) && sheet.mapId === mapId &&
    (mapId !== undefined || sheet.areas.length === 1));
}

function renderAtlas(sheets, position) {
  const selection = atlasSheet.value;
  if (atlasSheet.options.length !== sheets.length || sheets.some((sheet, index) =>
    atlasSheet.options[index].value !== sheet.file)) {
    atlasSheet.replaceChildren(...sheets.map(({ title, file }) => new Option(title, file)));
  }
  const sheet = sheets.find(({ file }) => file === selection) ??
    preferredAtlasSheet(sheets, position) ??
    sheets.find(sheet => sheet.areas.includes(position.area) && sheet.mapId === undefined) ?? sheets[0];
  atlasSheet.value = sheet.file;
  automapTitle.textContent = "Illustrated atlas";
  const url = `/atlas/${encodeURIComponent(sheet.file)}`;
  if (atlasImage.getAttribute("src") === url) return;
  atlasError.hidden = true;
  atlasImageLink.hidden = false;
  atlasImageLink.href = url;
  atlasImage.alt = `${sheet.title} illustrated map. Open full-size image in a new tab.`;
  atlasImage.src = url;
}

function renderRegionMap(position) {
  automapTitle.textContent = "The lands surrounding Phlan";
  automapSvg.setAttribute("viewBox", "0 0 100 100");
  automapSvg.setAttribute("aria-label", "Discovered regional map");
  const known = new Set(Object.keys(discoveredMaps).map(Number));
  known.add(position.area);
  const areas = geographyModel.areas ?? [];
  const byId = new Map(areas.map((area) => [area.id, area]));
  const visible = areas.filter((area) => known.has(area.id) && !["travel-window", "interior", "building"].includes(area.role));
  const lines = [
    '<rect class="region-paper" width="100" height="100"/>',
    '<path class="region-coast" d="M0 78 C18 72 31 82 46 76 C62 69 74 78 100 68 L100 100 L0 100Z"/>',
    '<path class="region-land" d="M0 0H100V68 C74 78 62 69 46 76 C31 82 18 72 0 78Z"/>',
    '<path class="region-river" d="M48 -2 C45 13 52 24 47 39 C43 51 51 62 48 76"/>',
    '<path class="region-road" d="M7 30 C22 35 32 43 43 55 C53 60 62 54 77 42"/>',
    '<path class="region-road" d="M48 62 C57 48 62 34 67 26"/>',
    '<path class="region-wall" d="M34 72 L34 49 L46 26 L58 26 L62 49 L62 72Z"/>',
    '<text class="terrain-label" x="5" y="17">Western hills</text>',
    '<text class="terrain-label" x="68" y="16">Northern highlands</text>',
    '<text class="terrain-label" x="73" y="62">Eastern swamp</text>',
    '<text class="terrain-label" x="39" y="94">THE MOONSEA</text>',
    '<text class="terrain-label" x="50" y="20" transform="rotate(78 50 20)">Barren River</text>',
    '<text class="map-compass" x="93" y="9">N</text>',
    '<path class="region-wall" d="M93 11V20 M90 14L93 11L96 14"/>'
  ];
  const routeKeys = new Set();
  for (const area of visible) {
    const targets = [...(area.touches ?? []), ...(area.routes ?? []).map((route) => route.to)];
    for (const target of targets) {
      if (!known.has(target)) continue;
      const other = byId.get(target);
      if (!other || ["travel-window", "interior", "building"].includes(other.role)) continue;
      const key = [area.id, target].sort((a, b) => a - b).join(":");
      if (routeKeys.has(key)) continue;
      routeKeys.add(key);
      const boat = (area.routes ?? []).some((route) => route.to === target && route.mode === "boat");
      lines.push(`<line class="region-route${boat ? " boat" : ""}" x1="${area.position.x}" y1="${area.position.y}" x2="${other.position.x}" y2="${other.position.y}"/>`);
    }
  }
  for (const area of visible) {
    const width = Math.max(3.5, Math.min(9, area.footprint.width * .65));
    const height = Math.max(2.8, Math.min(6.5, area.footprint.height * .55));
    const current = area.id === position.area;
    const x = area.position.x - width / 2, y = area.position.y - height / 2;
    lines.push(`<rect class="region-area ${escapeMapText(area.role)}${current ? " current" : ""}" x="${x}" y="${y}" width="${width}" height="${height}" rx="${area.role === "district" ? 0.8 : 2}"/>`);
    const label = area.label.replace(/, (southern approach|southwest|northwest|northeast\/southeast)$/i, "");
    lines.push(`<text class="region-label" x="${area.position.x}" y="${y - 1.2}">${escapeMapText(label)}</text>`);
  }
  automapSvg.innerHTML = lines.join("");
}

function escapeMapText(text) {
  return String(text).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function markCurrentLocation() {
  const position = state.exploration;
  if (!position) return;
  const current = discoveredLocalMap(position)?.cells?.[`${position.x},${position.y}`];
  const label = window.prompt("Map label", current?.label ?? "");
  if (label === null || !current) return;
  const clean = label.replace(/[^\x20-\x7e]/g, " ").replace(/\s+/g, " ").trim().slice(0, 40);
  // The runner labels the tile and saves it with the slot.
  void send(clean ? `:map-label ${clean}` : ":map-label");
}

function toggleAutomap() {
  if (!travelMap.hidden) {
    setTravelExpanded(!travelExpanded);
    return;
  }
  if (automap.hidden && (!enhanced || !state.exploration)) return;
  automap.hidden = !automap.hidden;
  mapToggle.setAttribute("aria-expanded", String(!automap.hidden));
  if (!automap.hidden) {
    atlasSheet.selectedIndex = -1;
    renderAutomap();
  }
  (automap.hidden ? screen : closeMap).focus({ preventScroll: true });
}

function drawPanelFrame(stamps) {
  const canvas = document.createElement("canvas");
  canvas.className = "panel-frame";
  canvas.width = 1280;
  canvas.height = 800;
  const brush = canvas.getContext("2d");
  const directions = new Map(stamps.map(([x, y, kind]) => [`${x},${y}`, kind]));
  const rectangle = (color, x, y, width, height) => {
    brush.fillStyle = color;
    brush.fillRect(x, y, width, height);
  };
  const horizontal = (x, y, length) => {
    rectangle("#33251e", x, y + 9, length, 14);
    rectangle("#6d5039", x, y + 11, length, 10);
    rectangle("#a77b53", x, y + 12, length, 2);
    rectangle("#4d3627", x, y + 18, length, 2);
  };
  const vertical = (x, y, length) => {
    rectangle("#33251e", x + 9, y, 14, length);
    rectangle("#6d5039", x + 11, y, 10, length);
    rectangle("#a77b53", x + 12, y, 2, length);
    rectangle("#4d3627", x + 18, y, 2, length);
  };
  for (const [x, y, kind] of stamps) {
    const left = x * 4;
    const top = y * 4;
    rectangle("#0f0e12", left, top, 32, 32);
    if (kind === "rail-x") horizontal(left, top, 32);
    if (kind === "rail-y") vertical(left, top, 32);
    if (kind !== "stud") continue;
    if (directions.get(`${x - 8},${y}`) === "rail-x") horizontal(left, top, 16);
    if (directions.get(`${x + 8},${y}`) === "rail-x") horizontal(left + 16, top, 16);
    if (directions.get(`${x},${y - 8}`) === "rail-y") vertical(left, top, 16);
    if (directions.get(`${x},${y + 8}`) === "rail-y") vertical(left, top + 16, 16);
    rectangle("#33251e", left + 5, top + 5, 22, 22);
    rectangle("#bd9369", left + 7, top + 7, 18, 18);
    rectangle("#503626", left + 9, top + 9, 14, 14);
    rectangle("#957051", left + 11, top + 11, 10, 10);
    rectangle("#c9a476", left + 12, top + 12, 7, 2);
    rectangle("#674730", left + 13, top + 18, 7, 2);
  }
  return canvas;
}

const portraitLoopBindings = import("/held-portrait-loops.mjs");

let heldPoseAtInput;
let battleNoticePose;
let retainedMenuPose;

function retainedPittMenuPose(source, target) {
  const transition = /^portrait:area:18:ecl:b240:caller:(ab51|abde):PIC1\.DAX:2:([01]):0$/.exec(source);
  if (!transition) return undefined;
  const [, caller, member] = transition;
  const cursor = caller === "ab51" ? "ab8d" : "ac22";
  const prefix = `portrait:area:18:ecl:${cursor}:PIC1.DAX:2:`;
  if (target === `${prefix}0:0` || target === `${prefix}1:0`) return `${prefix}${member}:0`;
  return undefined;
}

const retainedAuctionMenus = new Map([
  ["a333", "a378"], ["a3dc", "a413"], ["a4d8", "a51e"],
]);

function retainedAuctionMenuPose(source, target) {
  const incoming = /^portrait:area:18:ecl:b240:caller:(a333|a3dc|a4d8):PIC1\.DAX:16:([0-5]):0$/.exec(source);
  if (!incoming) return undefined;
  const [, caller, member] = incoming;
  const prefix = `portrait:area:18:ecl:${retainedAuctionMenus.get(caller)}:PIC1.DAX:16:`;
  return target?.startsWith(prefix) ? `${prefix}${member}:0` : undefined;
}

function retainedCaptivePenMenuPose(source, target) {
  const incoming = /^portrait:area:1:ecl:(b5f7:caller:9f20|9f5d):PIC6\.DAX:42:([0-4]):0$/.exec(source);
  if (!incoming) return undefined;
  const [, cursor, member] = incoming;
  const nextCursor = cursor === "9f5d" ? "a26d" : "9f5d";
  const prefix = `portrait:area:1:ecl:${nextCursor}:PIC6.DAX:42:`;
  return target?.startsWith(prefix) ? `${prefix}${member}:0` : undefined;
}

async function animateHeldPortrait(image, view) {
  const { portrait: id, text } = view;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const { portraitLoopsFor } = await portraitLoopBindings;
  const caption = text.map(([, char]) => String.fromCharCode(char)).join("").replace(/[^a-z]/gi, "");
  const loop = portraitLoopsFor(id).find(({ cue }) => !cue || cue.test(caption));
  if (!loop) return;
  const { phases, phaseTimes } = loop;
  const frames = phases.map(phase => {
    const frame = new Image();
    frame.alt = image.alt;
    frame.className = image.className;
    frame.style.cssText = image.style.cssText;
    frame.dataset.heldPose = phase;
    frame.src = `/art/${phase}`;
    return frame;
  });
  try {
    await Promise.all(frames.map(frame => frame.decode()));
  } catch {
    return;
  }
  let index = loop.entryAliases?.get(id) ?? phases.indexOf(id);
  const hold = () => phaseTimes?.[index] ?? 400;
  let nextPhaseAt = performance.now() + hold();
  function paintPhase(now) {
    if (view !== state || !image.isConnected || tileArt.hidden) return;
    if (now >= nextPhaseAt) {
      if (state.ready && !posting) {
        index = (index + 1) % frames.length;
        // Reuse the decoded element. Assigning src on the displayed image
        // starts another load and can consume an entire short pose.
        const nextImage = frames[index];
        image.replaceWith(nextImage);
        image = nextImage;
        // Keep the guest's cadence when a paint lands between refreshes.
        // After a long stall, give the new pose a full hold.
        nextPhaseAt += hold();
        if (nextPhaseAt <= now) nextPhaseAt = now + hold();
      } else {
        nextPhaseAt = now + hold();
      }
    }
    requestAnimationFrame(paintPhase);
  }
  requestAnimationFrame(paintPhase);
}

async function showScreen() {
  if (!state.frame) return;
  const render = ++screenRender;
  renderingSequence = state.sequence;
  const view = animationFrame ?? state;
  const portraitId = view === state ? battleNoticePose ?? retainedMenuPose ?? view.portrait : view.portrait;
  // The wheel prompt uses a custom DOS font whose glyph codes are not letters.
  const useEnhanced = enhanced && !Number.isInteger(view.codeWheelQuestion) && !failedEnhancedFrames.has(view);
  const frame = useEnhanced ? view.enhancedFrame ?? view.frame : view.frame;
  const sceneArt = useEnhanced && !failedSceneArt.has(view) && view.art;
  const source = sceneArt || `data:image/png;base64,${frame}`;
  const showArt = useEnhanced && !sceneArt;
  const menu = (view.text ?? []).filter(([cell]) => cell >= 960).sort(([a], [b]) => a - b)
    .map(([, character]) => String.fromCharCode(character)).join("");
  const manualAim = /^\(USE\s*CURSOR\s*KEYS\)/i.test(menu);
  const aimMenu = manualAim || /^AIM\s*:/i.test(menu);
  const manualAimOnCell = manualAim && !view.combatArt?.some(([, , , , highlighted]) => highlighted);
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
    if (image.dataset.combatClip) backdrop.style.clipPath = image.dataset.combatClip;
    backdrop.style.backgroundImage = `url("data:image/png;base64,${view.frame}")`;
    backdrop.style.backgroundSize = `${10000 / width}% ${10000 / height}%`;
    backdrop.style.backgroundPosition = `${left * 100 / (100 - width)}% ${top * 100 / (100 - height)}%`;
    return backdrop;
  }
  let layers = [];
  let streetCanvas;
  let overland;
  const streetScene = showArt && !streetUnavailable && explorationSurface(view);
  if (streetScene) {
    let viewport;
    try {
      viewport = ensureStreetViewport(streetScene);
      if (viewport && streetScene.materialId === "overland") {
        moveViewport = undefined;
        moveScene = undefined;
        overland = viewport;
      }
      else if (viewport) {
        syncMoveTarget({
          x: streetScene.x, y: streetScene.y, facing: streetScene.facing,
          materialId: streetScene.materialId, area: streetScene.area, mapId: streetScene.mapId,
          roofed: streetScene.roofed,
        });
        bindMoveView(viewport, streetScene);
        streetCanvas = viewport.canvas;
      } else if (streetScene.materialId === "overland" ? overlandLoading : streetLoading) {
        // The pending viewport will redraw when its assets settle. Keep the
        // complete previous view visible in the meantime.
        return;
      }
    } catch (error) {
      if (viewport?.canvas.getContext("webgl")?.isContextLost()) return;
      disableStreetPreview(error);
    }
  } else {
    moveViewport = undefined;
    moveScene = undefined;
  }
  let overlandTerrain;
  if (overland && view.overlandTerrain && !failedOverlandTerrain.has(view)) {
    try {
      const { slots, center, detailSlots, landmarkSlots } = view.overlandTerrain;
      function loadLayer(name, ids) {
        if (!ids) return;
        const present = new Set(ids);
        return Promise.all(slots.map(slot => present.has(slot) ? overlandImage(`overland-${name}:${slot}`) : undefined));
      }
      const [materials, tiles, details, landmarks] = await Promise.all([
        overlandImage("overland-materials"),
        Promise.all(slots.map(slot => overlandImage(`overland-tile:${slot}`))),
        loadLayer("detail", detailSlots),
        loadLayer("landmark", landmarkSlots),
      ]);
      overlandTerrain = { materials, tiles, details, landmarks, center };
    } catch { failedOverlandTerrain.add(view); }
    if (render !== screenRender) return;
  }
  const selectionArt = (view.combatSelections ?? []).map(([x, y, id]) =>
    [x, y, id, undefined, manualAimOnCell, 24, 24]);
  const placements = [...(view.battleTiles ?? []), ...(view.battleProps ?? []), ...selectionArt, ...(view.combatArt ?? [])];
  if (view.combatEffect) placements.push([...view.combatEffect, undefined, undefined, 24, 24]);
  if (view.characterSheet) {
    const [head, body] = view.characterSheet;
    placements.push([body[0], body[1], body[2], undefined, undefined, body[3], body[4]]);
    // Seat the transparent neck inside the collar rather than cutting the
    // assembled portrait on the original bitmap boundary.
    placements.push([head[0], head[1] + 6, head[2], undefined, undefined, head[3], head[4]]);
  }
  // The treasure screen keeps the native reward text above the illustration.
  const rewardIllustration =
    view.portrait === "scene-illustration:area:8:ecl:9f3f:caller:9a4a:cue:council-victory-award" ||
    view.portrait === "scene-illustration:area:20:ecl:ab42";
  if (view.portrait) {
    const [x, y] = rewardIllustration ? [100, 72] : [8, 8];
    placements.push([x, y, portraitId, undefined, undefined, 120, 120]);
  }
  if (view.encounter) placements.push(view.encounter.slice(0, 3));
  if (showArt) {
    const perspective = view.perspective && !view.portrait;
    const terrain = perspective && !streetCanvas && !overland ? view.tiles ?? [] : [];
    if (streetCanvas || overland) layers.push(streetCanvas ?? overland.canvas);
    else if (perspective || view.classicPortrait) layers.push(pictureBackdrop());
    layers.push(...[...terrain, ...placements].map(([x, y, id, reflected, highlighted, width, height]) => {
      const tile = document.createElement("img");
      tile.alt = "";
      const terrainTile = id.startsWith("tile:");
      if (terrainTile) tile.className = "terrain-tile";
      if (id === portraitId) tile.className = rewardIllustration ? "reward-illustration" : "encounter-portrait";
      if (id.startsWith("character-sheet:")) tile.className = "character-sheet-part";
      if (id === view.encounter?.[2]) {
        tile.className = "encounter-sprite";
        width = view.encounter[3];
        height = view.encounter[4];
      }
      if (id.startsWith("battle-tile:")) tile.className = "battle-tile";
      if (id.startsWith("combat-selection:")) tile.className = "combat-selection";
      if (id.startsWith("combat-effect:")) tile.className = "combat-effect";
      if (id === "combat-effect:COMSPR.DAX:139") tile.style.filter = "brightness(1.35)";
      if (reflected !== undefined) {
        tile.className = "combat-sprite";
        const spriteWidth = width ?? 24;
        const spriteHeight = height ?? 24;
        const topCut = Math.max(0, 8 - y) * 100 / spriteHeight;
        const rightCut = Math.max(0, x + spriteWidth - 176) * 100 / spriteWidth;
        const bottomCut = Math.max(0, y + spriteHeight - 176) * 100 / spriteHeight;
        const leftCut = Math.max(0, 8 - x) * 100 / spriteWidth;
        if (topCut || rightCut || bottomCut || leftCut) {
          tile.dataset.combatClip = `inset(${topCut}% ${rightCut}% ${bottomCut}% ${leftCut}%)`;
          // The CSS transform flips the image after clipping its source bounds.
          tile.style.clipPath = reflected
            ? `inset(${topCut}% ${leftCut}% ${bottomCut}% ${rightCut}%)` : tile.dataset.combatClip;
        }
      }
      if (reflected !== undefined && id.startsWith("combat:party:") && id.includes(":palette:")) {
        tile.dataset.partyPalette = id;
      }
      if (aimMenu && highlighted) tile.classList.add("combat-aimed");
      if ((perspective || overlandTerrain) && (terrainTile || id === view.encounter?.[2])) {
        const scale = 120 / 88;
        if (streetCanvas) y += view.encounter[5] ?? 0;
        x = 8 + (x - 24) * scale;
        y = 8 + (y - 24) * scale;
        width = (width ?? 8) * scale;
        height = (height ?? 8) * scale;
      }
      if (width !== undefined && height !== undefined) {
        tile.style.width = `${width / 3.2}%`;
        tile.style.height = `${height / 2}%`;
      }
      if (reflected || terrainTile && state.reflectedTiles?.includes(id)) tile.style.transform = "scaleX(-1)";
      tile.style.left = `${x / 3.2}%`;
      tile.style.top = `${y / 2}%`;
      tile.src = `/art/${id}`;
      return tile;
    }));
    if (view.panelFrame?.length) {
      const panelFrame = drawPanelFrame(view.panelFrame);
      // The expanded view fills the outer panel, including its native inner frame.
      if ((view.portrait && !rewardIllustration) || view.classicPortrait || perspective || streetCanvas || overlandTerrain) {
        panelFrame.getContext("2d").clearRect(8 * 4, 8 * 4, 120 * 4, 120 * 4);
      }
      layers.push(panelFrame);
    }
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
        if (layer.dataset.partyPalette) {
          const colorized = await recolorPartySprite(layer, layer.dataset.partyPalette);
          if (colorized) {
            layer.src = colorized;
            await layer.decode();
          }
        }
        return layer;
      } catch (error) {
        if (layer.matches(".terrain-tile, .battle-tile, .combat-selection, .reward-illustration")) return null;
        if (layer.matches(".character-sheet-part")) return null;
        if (layer.matches(".combat-effect")) return spriteBackdrop(layer);
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
    if (render !== screenRender) return;
    if (showArt && view.characterSheet) {
      const firstPart = layers.findIndex(layer => layer.matches(".character-sheet-part"));
      const partCount = view.characterSheet.length;
      if (firstPart !== -1 && decodedLayers.slice(firstPart, firstPart + partCount).includes(null)) {
        // The parts share a painted collar. When either fails, replace just
        // the portrait as a unit, leaving the Enhanced sheet and text intact.
        const parts = view.characterSheet;
        const left = Math.min(...parts.map(([x]) => x));
        const top = Math.min(...parts.map(([, y]) => y));
        const right = Math.max(...parts.map(([x, , , width]) => x + width));
        const bottom = Math.max(...parts.map(([, y, , , height]) => y + height));
        const box = layers[firstPart];
        Object.assign(box.style, {
          left: `${left / 3.2}%`, top: `${top / 2}%`,
          width: `${(right - left) / 3.2}%`, height: `${(bottom - top) / 2}%`,
        });
        decodedLayers.splice(firstPart, partCount, state.classicAvailable ? spriteBackdrop(box) : null);
      }
    }
    if (overland) {
      try {
        overland.renderer.draw(nextFrame, overlandTerrain);
        overland.canvas.classList.toggle("local-overland-encounter", Boolean(overlandTerrain));
      } catch (error) {
        if (overland.canvas.getContext("webgl")?.isContextLost()) return;
        if (overlandTerrain) {
          failedOverlandTerrain.add(view);
          void showScreen();
          return;
        }
        failedSurfaces.add("overland");
        decodedLayers.splice(decodedLayers.indexOf(overland.canvas),1);
        console.warn(error);
      }
    }
    layers = [];
    for (const layer of decodedLayers) {
      if (!layer) continue;
      if (layer.matches(".combat-aimed")) {
        const reticle = document.createElement("div");
        reticle.className = "combat-aim-reticle";
        Object.assign(reticle.style, {
          left: layer.style.left, top: layer.style.top,
          width: layer.style.width || "7.5%", height: layer.style.height || "12%",
        });
        const selectionBacking = layer.matches(".combat-selection");
        if (selectionBacking || layers.some(backing => backing.matches(".combat-selection") &&
          backing.style.left === layer.style.left && backing.style.top === layer.style.top)) {
          reticle.classList.add("combat-aim-reticle-backed");
        }
        if (selectionBacking) layers.push(layer);
        layers.push(reticle);
        if (selectionBacking) continue;
      }
      layers.push(layer);
    }
  } catch {
    if (render !== screenRender) return;
    if (sceneArt) failedSceneArt.add(view);
    else if (useEnhanced) failedEnhancedFrames.add(view);
    else {
      renderingSequence = undefined;
      holdAnimationFrame(view);
      return;
    }
    void showScreen();
    return;
  }
  if (render !== screenRender) return;
  screen.src = source;
  document.querySelector("#screen-loading").hidden = true;
  tileArt.replaceChildren(...layers);
  tileArt.hidden = !showArt;
  renderTravelMap(view);
  // With no artwork drawn, the picture window holds the first-person view of the square or a page of
  // runes: named as the narration ledger names them (tools/qa-narration.ts), so the two can be compared.
  const runesInPicture = (view.runes ?? []).some(([cell]) => cell % 40 < 16 && cell < 16 * 40);
  logShownArtwork(sceneArt ? view.scene ?? view.art : showArt ? portraitId ?? view.encounter?.[2] ?? null
    : runesInPicture ? "runes in the picture window" : view.perspective ? "the first-person view" : null);
  if (view === state && view.ready && view.portrait && !battleNoticePose && !view.automaticCombat) {
    const portrait = tileArt.querySelector(".encounter-portrait");
    if (portrait) void animateHeldPortrait(portrait, view);
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
    }), ...gameRunes(view));
  }
  renderingSequence = undefined;
  holdAnimationFrame(view);
}

function renderJournal() {
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

// The Enhanced code wheel.
//
// While the game asks its code-wheel question, Enhanced display shows the whole translation
// wheel and takes the word itself. Classic display shows the game's own prompt, and the game
// takes any word, as the version 1.3 program does.
//
// What Enhanced enforces is what the first release's program does (overlay slice 2): after a
// wrong word it prints "Sorry, that's incorrect." and asks again, drawing a new question with
// Random(13) each time, and on the third wrong word it leaves the program. Version 1.3 has the
// same code with the branch after the comparison replaced by a jump to the routine's exit.
//
// None of this changes the game. The game still holds the one question it drew. A new question
// after a wrong word is drawn here, on the page, and the game is sent a word only once it is right.
//
// The wheel behaves like the cardboard one beside the keyboard. At the question it can be put
// away, which leaves the game's own question screen in view with the question's card on it, and
// brought back. For the rest of the game the Code wheel control, or W at the menus where the
// game does not use that letter, opens it as a tool with nothing to answer: the game shows
// runes to translate more than once (qa/research/code-wheel.md). Open as a tool it takes Left,
// Right, T, W and Escape, and every other key is dropped, as it is while the Journal is open.
const codeWheel = {
  /** src/codewheel/wheel.json. */
  data: undefined,
  /** The question the Enhanced prompt is asking: an entry of `data.questions`. */
  question: undefined,
  /** How many positions the inner disc is turned clockwise, 0 to 35. */
  turn: 0,
  /** While the disc is being dragged, how far it is from `turn`, in positions and fractions. */
  dragged: 0,
  /** Draws the wheel, once its pictures are loaded. */
  paint: undefined,
  word: "",
  tries: 0,
  /** True after the third wrong word. Nothing more reaches the game until the page is reloaded. */
  ended: false,
  /** False only in the check that shows the wrong-word test failing without enforcement. */
  enforce: true,
  /** Characters typed into the game's own input line, which happens in Classic display. */
  forwarded: 0,
  /** True while keys are on their way to the game. */
  busy: false,
  message: "",
  /** At the question: the player has put the wheel away. */
  away: false,
  /** After start-up: the player has the wheel open as a tool. */
  tool: false,
};
const codeWheelTurnKey = "por.codeWheel.turn";
try {
  // The disc stays where the player left it. Without storage it starts at the top.
  const kept = Number(localStorage.getItem(codeWheelTurnKey));
  if (Number.isInteger(kept) && kept >= 0 && kept < 36) codeWheel.turn = kept;
} catch { /* Storage is a convenience. */ }
const codeWheelTries = 3;
const codeWheelLetters = 6;
const wheelSection = document.querySelector("#code-wheel");
const wheel = document.querySelector("#wheel");
const wheelCanvas = document.querySelector("#wheel-canvas");
const wheelToggle = document.querySelector("#wheel-toggle");
// The wheel is drawn by the code the standalone /code-wheel page uses.
void import("/code-wheel-draw.js").then(async ({ loadCodeWheel, wheelPainter }) => {
  const { layout, pictures } = await loadCodeWheel();
  codeWheel.paint = wheelPainter(wheelCanvas, layout, pictures);
  codeWheel.data = layout;
  renderCodeWheel();
}).catch(() => { /* Without the wheel's layout the game's own prompt stays in view. */ });

// The runes the game writes for the player to translate (state.runes) are drawn in Enhanced from
// the wheel's own rune pictures, so the player matches the shapes the wheel shows. The shipped
// game's font has no pixels, so the picture has no runes of its own; with the player's original
// files the game's rune is under the drawing, whose dark outline covers it. Each picture's gold
// stroke is drawn in the game's colour for its cell (the wheel's pictures are gold strokes with a
// dark outline, tools/build-code-wheel-runes.py). The table is tools/rune-glyphs.js
// (npm run verify:rune-glyphs).
let runePictures;
void import("/rune-glyphs.js").then((module) => {
  runePictures = module.runePictures;
  if (state.runes?.length) void showScreen();
}).catch(() => { /* Without the table the runes are what the game's picture holds. */ });
const runeTiles = new Map();
const RUNE_GOLD = [246, 200, 120], RUNE_OUTLINE = [92, 52, 20];

/** A rune picture's pixels, loaded once. */
function runeTile(picture) {
  if (!runeTiles.has(picture)) runeTiles.set(picture, (async () => {
    const image = new Image();
    image.src = `/code-wheel/${picture}.png`;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const brush = canvas.getContext("2d", { willReadFrequently: true });
    brush.drawImage(image, 0, 0);
    return brush.getImageData(0, 0, canvas.width, canvas.height);
  })());
  return runeTiles.get(picture);
}

/** The runes on screen, as elements of the Enhanced text layer. */
function gameRunes(view) {
  if (!runePictures || !view.runes?.length) return [];
  return runePictures(view.runes).map(({ cell, width, picture, part, color }) => {
    const rune = document.createElement("canvas");
    rune.className = "game-rune";
    rune.dataset.picture = picture;
    rune.dataset.part = part;
    Object.assign(rune.style, {
      position: "absolute", left: `${(cell % 40) * 2.5}%`, top: `${Math.floor(cell / 40) * 4}%`,
      width: `${width * 2.5}%`, height: "4%",
    });
    const fill = state.textColors[color];
    void runeTile(picture).then((tile) => {
      // A whole picture, or the eight of its sixteen columns this cell shows.
      const columns = part === "all" ? tile.width : tile.width / 2;
      const from = part === "middle" ? tile.width / 4 : part === "right" ? tile.width / 2 : 0;
      const pixels = new ImageData(columns, tile.height);
      for (let y = 0; y < tile.height; y++) for (let x = 0; x < columns; x++) {
        const at = (y * tile.width + from + x) * 4, to = (y * columns + x) * 4;
        const gold = Math.min(1, Math.max(0, (tile.data[at] - RUNE_OUTLINE[0]) / (RUNE_GOLD[0] - RUNE_OUTLINE[0])));
        for (let channel = 0; channel < 3; channel++) {
          pixels.data[to + channel] = RUNE_OUTLINE[channel] + (fill[channel] - RUNE_OUTLINE[channel]) * gold;
        }
        pixels.data[to + 3] = tile.data[at + 3];
      }
      rune.width = columns;
      rune.height = tile.height;
      rune.getContext("2d").putImageData(pixels, 0, 0);
    }).catch(() => { /* A picture that does not load leaves its cell as the game's picture has it. */ });
    return rune;
  });
}

/** The game is asking its question, and the page takes the word. */
function codeWheelAsking() {
  return Boolean(enhanced && state.codeWheel && codeWheel.data && !state.journal);
}

/**
 * The game has runic writing to translate: runes on screen, or a word the game asks for that the
 * printed Journal gives only in runes (state.codeWheelHint). The moments a player of the original
 * reached for the wheel.
 */
function runesOnScreen() {
  return Boolean(state.runes?.length || Number.isInteger(state.codeWheelHint));
}

/** The wheel is open to translate runes on screen, with nothing to answer. */
function codeWheelTool() {
  return Boolean(enhanced && codeWheel.tool && codeWheel.data && runesOnScreen() && !state.codeWheel && !state.journal);
}

/** The disc is in view. */
function codeWheelShown() {
  return codeWheel.ended || (codeWheelAsking() ? !codeWheel.away : codeWheelTool());
}

/**
 * Put the wheel away or bring it back. The wheel is there only when the game needs it: at the start-up
 * question, and while runes are on screen. It comes up by itself at both; the Code wheel control and
 * Escape put it away and bring it back. At any other time there is no control and no shortcut.
 */
function toggleCodeWheel() {
  if (!enhanced || codeWheel.ended || !codeWheel.data) return;
  if (!state.codeWheel && !runesOnScreen()) return;
  if (state.codeWheel) codeWheel.away = !codeWheel.away;
  else codeWheel.tool = !codeWheel.tool;
  renderCodeWheel();
  screen.focus({ preventScroll: true });
}

/**
 * Turn the inner disc until the two TRANSLATE FROM tabs meet, the position the Cluebook starts
 * translating from. The player turns on from there and reads the wheel: nothing is read out.
 */
function codeWheelTranslate() {
  const { outer, inner } = codeWheel.data;
  turnCodeWheel(outer.runes.indexOf("translate-tab") - inner.runes.indexOf("translate-tab") - codeWheel.turn);
}

function codeWheelStatus() {
  if (codeWheelAsking()) {
    return codeWheel.away ? "Type the code word and press Enter. Esc shows the wheel."
      : "Left and Right turn the inner disc. Type the code word and press Enter. Esc puts the wheel away.";
  }
  return codeWheelTool() ? "Left and Right turn the inner disc. T lines up the tabs. W or Esc puts the wheel away." : undefined;
}

/** The address of the picture for a slot of one disc. Each disc has one slot that is its tab. */
function codeWheelArt(disc, slot) {
  return `/code-wheel/${slot === "translate-tab" ? `${disc}-translate-tab` : slot}.png`;
}

/**
 * The word the wheel gives for a question. With the inner disc turned so the question's Dethek
 * rune sits against its Espruar rune, each window of the path shows one letter of the outer
 * disc; the word is those letters from the innermost ring outward.
 */
function codeWheelWord(question) {
  const { outer, inner, positions } = codeWheel.data;
  const espruar = outer.runes.indexOf(question.espruar), dethek = inner.runes.indexOf(question.dethek);
  const path = inner.paths.find(({ id }) => id === question.path);
  return path.windows.map((window, ring) =>
    outer.rings[ring][(((window - dethek + espruar) % positions) + positions) % positions]).join("");
}

/** Draw the wheel, if it has changed since it was last drawn. */
function paintCodeWheel() {
  const turn = codeWheel.turn + codeWheel.dragged, path = codeWheel.question?.path;
  if (!codeWheel.paint || codeWheel.painted === `${turn} ${path}`) return;
  codeWheel.paint(turn, path);
  codeWheel.painted = `${turn} ${path}`;
}

function turnCodeWheel(positions) {
  const all = codeWheel.data.positions;
  codeWheel.turn = (((codeWheel.turn + positions) % all) + all) % all;
  paintCodeWheel();
  try { localStorage.setItem(codeWheelTurnKey, String(codeWheel.turn)); } catch { /* Storage is a convenience. */ }
}

function renderCodeWheel() {
  if (!state.codeWheel && !codeWheel.ended) {
    // The prompt is over. The next one starts afresh.
    Object.assign(codeWheel, { question: undefined, word: "", tries: 0, forwarded: 0, message: "", away: false });
  } else if (state.codeWheel && !codeWheel.question && codeWheel.data) {
    codeWheel.question = codeWheel.data.questions.find(({ number }) => number === state.codeWheel.number);
  }
  // A word the Journal gives in runes: the card shows those runes and their path.
  if (!state.codeWheel && Number.isInteger(state.codeWheelHint) && codeWheel.data) {
    codeWheel.question = codeWheel.data.questions.find(({ number }) => number === state.codeWheelHint);
  }
  // Runes coming onto the screen bring the wheel up by itself; their leaving closes it.
  const runesNow = runesOnScreen();
  if (runesNow && !codeWheel.runesSeen) codeWheel.tool = true;
  if (!runesNow) codeWheel.tool = false;
  codeWheel.runesSeen = runesNow;
  // Classic has no wheel.
  if (!enhanced) codeWheel.tool = false;
  const mode = codeWheel.ended ? "ended" : codeWheelAsking() ? (codeWheel.away ? "away" : "question")
    : codeWheelTool() ? "tool" : undefined;
  wheelToggle.hidden = !enhanced || !(codeWheelAsking() || runesOnScreen());
  wheelToggle.disabled = codeWheel.ended || !codeWheel.data || Boolean(state.stopped) || Boolean(state.journal);
  wheelToggle.setAttribute("aria-expanded", String(mode === "question" || mode === "tool"));
  wheelSection.hidden = !mode;
  if (!mode) {
    delete wheelSection.dataset.mode;
    return;
  }
  wheelSection.dataset.mode = mode;
  document.querySelector("#wheel-ended").hidden = !codeWheel.ended;
  wheel.hidden = codeWheel.ended;
  document.querySelector("#wheel-panel").hidden = codeWheel.ended;
  if (codeWheel.ended) return;
  paintCodeWheel();
  document.querySelector("#wheel-question").style.display = codeWheel.question ? "" : "none";
  document.querySelector("#wheel-hint").style.display = mode === "tool" && codeWheel.question ? "" : "none";
  if (!codeWheel.question) return;
  const { espruar, dethek, path } = codeWheel.question;
  for (const [id, source] of [["#wheel-espruar", codeWheelArt("espruar", espruar)],
    ["#wheel-dethek", codeWheelArt("dethek", dethek)], ["#wheel-path", `/code-wheel/path-${path}.png`]]) {
    const image = document.querySelector(id);
    if (image.getAttribute("src") === source) continue;
    image.src = source;
  }
  // Put away, the card says whether its runes are the ones on the game's screen above it.
  document.querySelector("#wheel-asked").textContent = codeWheel.tries ? "A new question:" : "The question:";
  document.querySelector("#wheel-word").textContent = codeWheel.word;
  document.querySelector("#wheel-message").textContent = codeWheel.message;
}

/** Give the game one key, once it is waiting for one, and wait until it has taken it. */
async function sendToGameInTurn(key) {
  const deadline = performance.now() + 15_000;
  const wait = () => new Promise(done => setTimeout(done, 40));
  while (performance.now() < deadline && !state.stopped) {
    const sequence = state.sequence;
    if (state.ready && !posting && renderingSequence === undefined && await send(key)) {
      while (state.sequence === sequence && performance.now() < deadline && !state.stopped) await wait();
      return state.sequence !== sequence;
    }
    await wait();
  }
  return false;
}

async function sendKeysToGame(keys) {
  codeWheel.busy = true;
  try {
    for (const key of keys) if (!await sendToGameInTurn(key)) return false;
    return true;
  } finally {
    codeWheel.busy = false;
  }
}

async function submitCodeWord() {
  const typed = codeWheel.word;
  if (!typed) return;
  // Whatever was typed into the game's own input line in Classic display is rubbed out first.
  const rubOut = Array(codeWheel.forwarded).fill("backspace");
  if (!codeWheel.enforce || typed.toUpperCase() === codeWheelWord(codeWheel.question)) {
    codeWheel.message = "";
    renderCodeWheel();
    // The game reads the word as typed keys and then Enter, and goes on.
    await sendKeysToGame([...rubOut, ...[...typed.toLowerCase()].map(letter => letter === "j" ? "key j" : letter), "enter"]);
    return;
  }
  codeWheel.tries++;
  codeWheel.word = "";
  codeWheel.message = "Sorry, that's incorrect.";
  if (codeWheel.tries >= codeWheelTries) {
    codeWheel.ended = true;
  } else {
    // The first release draws a new question for each try.
    const { questions } = codeWheel.data;
    codeWheel.question = questions[Math.floor(Math.random() * questions.length)];
  }
  renderCodeWheel();
  if (rubOut.length && !codeWheel.ended) {
    await sendKeysToGame(rubOut);
    codeWheel.forwarded = 0;
  }
}

/**
 * A key pressed while the wheel is in view, or while the page is taking the code word with the
 * wheel put away. Returns true when the wheel took it.
 */
function codeWheelKey(event) {
  if (event.target instanceof HTMLButtonElement && ["Enter", " "].includes(event.key)) return false;
  // F10 still changes the display.
  if (event.key === "F10") return false;
  const turning = event.key === "ArrowLeft" || event.key === "ArrowRight";
  const letter = /^[a-z0-9]$/i.test(event.key);
  if (!codeWheel.ended && event.key === "Escape") {
    // Escape puts the wheel away. At the question, where every letter belongs to the word, it also brings it back.
    event.preventDefault();
    if (!event.repeat) toggleCodeWheel();
    return true;
  }
  if (!codeWheel.ended && !codeWheelAsking()) {
    // Up beside runes on screen. Left and Right turn the disc; every other key goes to the game, so the
    // player can type the word the runes spell while the wheel is still up.
    if (!turning) return false;
    turnCodeWheel(event.key === "ArrowLeft" ? -1 : 1);
    event.preventDefault();
    return true;
  }
  // No other key reaches the game's input line from here.
  if (!turning && !letter && event.key !== "Backspace" && event.key !== "Enter") return true;
  event.preventDefault();
  if (codeWheel.ended || codeWheel.busy || !codeWheel.question) return true;
  if (turning) turnCodeWheel(event.key === "ArrowLeft" ? -1 : 1);
  else if (event.key === "Backspace") codeWheel.word = codeWheel.word.slice(0, -1);
  else if (event.key === "Enter") { if (!event.repeat) void submitCodeWord(); }
  else if (!event.repeat && codeWheel.word.length < codeWheelLetters) codeWheel.word += event.key.toUpperCase();
  if (!turning) renderCodeWheel();
  return true;
}

for (const control of ["#wheel-toggle", "#wheel-close", "#wheel-open"]) {
  document.querySelector(control).addEventListener("click", toggleCodeWheel);
}
document.querySelector("#wheel-translate").addEventListener("click", () => {
  codeWheelTranslate();
  screen.focus({ preventScroll: true });
});

{
  // Dragging turns the inner disc with the pointer, and it settles on the nearest position.
  let drag;
  const pointerAngle = event => {
    const box = wheel.getBoundingClientRect();
    return Math.atan2(event.clientY - box.top - box.height / 2, event.clientX - box.left - box.width / 2) * 180 / Math.PI;
  };
  wheel.addEventListener("pointerdown", event => {
    if (codeWheel.busy) return;
    drag = { last: pointerAngle(event), turned: 0 };
    wheel.setPointerCapture(event.pointerId);
    wheel.classList.add("turning");
  });
  wheel.addEventListener("pointermove", event => {
    if (!drag) return;
    const now = pointerAngle(event);
    // Add up small steps, so a drag across the left side does not jump a whole turn.
    drag.turned += ((now - drag.last + 540) % 360) - 180;
    drag.last = now;
    codeWheel.dragged = drag.turned / 10;
    paintCodeWheel();
  });
  const release = () => {
    if (!drag) return;
    wheel.classList.remove("turning");
    codeWheel.dragged = 0;
    turnCodeWheel(Math.round(drag.turned / 10));
    drag = undefined;
  };
  wheel.addEventListener("pointerup", release);
  wheel.addEventListener("pointercancel", release);
  wheel.addEventListener("wheel", event => {
    event.preventDefault();
    if (!codeWheel.busy && event.deltaY) turnCodeWheel(Math.sign(event.deltaY));
  }, { passive: false });
}

async function send(key) {
  const endsVoice = keyEndsVoice;
  keyEndsVoice = undefined;
  if (codeWheel.ended) return;
  if (!state.ready || posting || state.stopped) return;
  // Movement can be sent while the last step is still being painted, so the
  // next camera tween can start before the previous paint finishes.
  if (renderingSequence === state.sequence && !repeatingKeys.has(key)) return;
  heldPoseAtInput = !animationFrame && !tileArt.hidden
    ? tileArt.querySelector(".encounter-portrait")?.dataset.heldPose : undefined;
  if (endsVoice && currentVoice) {
    pendingVoiceStop = { voice: currentVoice, reason: endsVoice, frame: state.frame, queued: [...narrationQueue] };
  }
  // An approaching encounter plays out: on DOS the game is busy drawing it and acts on no key (#129).
  if (animationFrame?.approach) return;
  // Asking for more of an animation the game plays by itself leaves the clips playing (#125).
  if (animationFrame && !(key === ":poll" && state.presentationPolling)) {
    finishAnimation();
    showScreen();
  }
  posting = true;
  if (!(key === ":poll" && state.presentationPolling)) selfPlayingBatchAt = performance.now();
  const sequence = state.sequence;
  try {
    // On this branch the page checks the word and shows the wheel over the game picture, so the
    // game's own check and the wheel frame below the picture are never switched on. Their code
    // is kept so the two approaches can be compared.
    const startWheel = false;
    const headers = { "X-POR-Frame": String(sequence), "X-POR-Page": pageId };
    if (startWheel) headers["X-POR-Code-Wheel"] = "enhanced";
    const result = await fetch("/key", {
      method: "POST", headers, body: startWheel ? "backspace" : key,
    });
    if (startWheel && result.ok) wheelStartup = true;
    if (state.sequence === sequence && (result.ok || result.status === 409)) state.ready = false;
    if (result.ok && state.codeWheel) {
      // Keep count of what the game's own input line holds while it asks for the code word.
      if (key === "backspace") codeWheel.forwarded = Math.max(0, codeWheel.forwarded - 1);
      else if (/^(?:key )?[a-z0-9]$/i.test(key)) codeWheel.forwarded++;
    }
    if (!result.ok) {
      pendingVoiceStop = undefined;
      heldPoseAtInput = undefined;
    }
    return result.ok;
  } catch {
    heldPoseAtInput = undefined;
    status.textContent = "Waiting for the local game runner…";
  } finally {
    posting = false;
  }
}

// This window's name for the game server. The newest window to start plays the game; an older one
// is told it has been superseded and stops, so nothing plays twice.
const pageId = Math.random().toString(36).slice(2) + Date.now().toString(36);
let pageClaimed = false;
let superseded = false;
function showSuperseded() {
  if (superseded) return;
  superseded = true;
  stopVoice(true, "superseded by another window");
  stopEffect();
  document.body.innerHTML = '<main style="height:100vh;display:grid;place-items:center;background:#0b0d16;color:#f1dfae;font:1.3rem Georgia,serif;text-align:center">'
    + '<p>Pool of Radiance is open in another window.<br>You can close this one.</p></main>';
}

async function poll() {
  try {
    const response = await fetch(`/state?after=${state.sequence}`, { headers: { "X-POR-Page": pageId, ...(pageClaimed ? {} : { "X-POR-Claim": "1" }) } });
    pageClaimed = true;
    const next = await response.json();
    if (next.superseded) { showSuperseded(); return; }
    if (lastSoundId === null) lastSoundId = next.soundId ?? 0;
    if (lastTextId === null) lastTextId = next.textId ?? 0;
    if (lastNarrationId === null) lastNarrationId = next.narrationId ?? 0;
    const changed = next.sequence !== state.sequence;
    // A frame that follows one of an animation the game plays by itself carries the clips after it.
    const continuesAnimation = changed && Boolean(state.presentationPolling);
    if (changed) {
      // The guest leaves its picture in place for this notice. Keep the pose the player acted on.
      const previousPose = heldPoseAtInput ?? battleNoticePose;
      const samePortrait = next.portrait === state.portrait ||
        (state.portraitAssetKey && next.portraitAssetKey === state.portraitAssetKey);
      const battleNotice = previousPose && samePortrait &&
        /^ABATTLEBEGINS[.!]*$/i.test(next.text?.filter(([cell]) => cell >= 960)
          .map(([, character]) => String.fromCharCode(character)).join("").replace(/\s/g, ""));
      battleNoticePose = battleNotice ? previousPose : undefined;
      const incomingPose = previousPose ?? retainedMenuPose ?? state.portrait;
      retainedMenuPose = next.portrait === state.portrait ? retainedMenuPose :
        retainedPittMenuPose(incomingPose, next.portrait) ?? retainedCaptivePenMenuPose(incomingPose, next.portrait) ??
        retainedAuctionMenuPose(incomingPose, next.portrait);
      heldPoseAtInput = undefined;
      state = next;
    } else Object.assign(state, next);
    settlePresentation();
    syncMoveTarget(discreteExplorationPose(state));
    const showWheel = wheelStartup && Number.isInteger(state.codeWheelQuestion) && !state.stopped;
    if (showWheel) {
      const url = `/code-wheel?challenge=1&question=${state.codeWheelQuestion + 1}`;
      if (bootWheel.getAttribute("src") !== url) bootWheel.src = url;
    }
    const restoreGameFocus = !showWheel && document.activeElement === bootWheel;
    bootWheel.hidden = !showWheel;
    document.documentElement.classList.toggle("code-wheel-open", showWheel);
    if (restoreGameFocus) screen.focus({ preventScroll: true });
    closeJournal.disabled = !state.ready || Boolean(state.presentationPolling) || Boolean(state.stopped);
    autoTrack.disabled = closeJournal.disabled;
    mapToggle.disabled = !state.exploration && !(enhanced && state.travel && travelArtEnabled && travelArtReady);
    journalToggle.disabled = closeJournal.disabled;
    void syncAutomap();
    offerLegacyAutomap();
    renderCodeWheel();
    if (changed && pendingVoiceStop) {
      const { voice, reason, frame, queued } = pendingVoiceStop;
      pendingVoiceStop = undefined;
      if (voice === currentVoice && frame !== state.frame) {
        // The game acted on the key: the line ends, with the lines that were waiting behind it at the
        // key press. A narration the game has sent since then is the new screen's and plays next.
        const since = narrationQueue.filter(line => !queued.includes(line));
        narrationQueue = narrationQueue.filter(line => queued.includes(line));
        stopVoice(true, reason);
        narrationQueue = since;
        playNextNarration();
      }
    }
    if (changed) {
      renderJournal();
      playAnimation(continuesAnimation);
      if (state.automaticCombat || state.battleEntryPolling || state.presentationPolling) {
        quickPollAfter = performance.now() + 160 +
          presentedClips().reduce((total, frame) => total + (frame.durationMs ?? 120), 0);
      }
    }
    // Show the battle notice or automatic turn before asking the game for the next frame. A
    // self-playing animation (#121) can ask immediately, while the current clips play (#125).
    const shown = !animationFrame && performance.now() >= quickPollAfter;
    const battlePoll = (state.automaticCombat || state.battleEntryPolling) && shown;
    if ((battlePoll || state.presentationPolling) && !state.journal && !codeWheelTool() && state.ready) {
      void send(":poll");
    }
    followTravel();
    if (renderingSequence === undefined) renderTravelMap();
    playPendingSounds();
    playTitleCue();
    playPendingVoice();
    playPendingNarration();
    status.textContent = state.stopped ?? state.notice ??
      (codeWheel.ended ? "The game has ended. Reload the page to start again." : undefined) ??
      codeWheelStatus() ??
      (waitingForFerryPayer(activeTravel) ? "Choose who pays 1 platinum for Sokal Keep. Esc to stop travel." : undefined) ??
      (activeTravel && `Traveling toward ${activeTravel.label}… Esc to stop.`) ??
      (!travelMap.hidden && state.ready && state.travel ? "Select a highlighted destination or use the arrow keys." : undefined) ??
      (state.ready && state.developerVictoryAvailable ? "F9 wins the fight (developer mode)." : undefined) ??
      ((state.automaticCombat || state.battleEntryPolling) && !state.journal ? "Combat in progress…"
        : state.ready && !state.presentationPolling ? "Arrows or keypad to move. Enter to confirm." : "Game running…");
  } catch {
    status.textContent = "Waiting for the local game runner…";
  }
  setTimeout(poll, 100);
}

// J and M belong to the game wherever it reads letters: Move, Magic, Mins, a typed name,
// jewelry, Join. The journal and map shortcuts apply only at these original command
// menus, and only for a letter the menu does not use. The buttons work everywhere.
const hostShortcutMenus = new Set([
  "Area Cast View Encamp Search Look",
  "Cast View Encamp Search Look",
  "Camp: Save View Magic Rest Alter Exit",
]);
function hostShortcutFree(letter) {
  const row = Array(40).fill(" ");
  for (const [cell, character] of state.text ?? []) if (cell >= 960) row[cell - 960] = String.fromCharCode(character);
  const menu = row.join("").replace(/\s+/g, " ").trim();
  return hostShortcutMenus.has(menu) &&
    !menu.split(" ").some(word => word[0].toLowerCase() === letter);
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
/** The keys whose repeats reach the game: moving, turning and stepping through a list. */
const repeatingKeys = new Set(["up", "down", "left", "right", "home", "end", "pageup", "pagedown"]);
/**
 * True when a held key's repeat goes to the game: only a movement key, and never into the page's
 * own windows. A held Enter is one press: in Chrome, Enter held on Rolf's first passage also
 * skipped the second the moment it appeared (#77), and the narration of every passage matters.
 */
function repeatsToGame(event) {
  if (event.altKey || !bootWheel.hidden || activeTravel || travelExpanded || state.journal) return false;
  return repeatingKeys.has(keypadDirections[event.code] ?? commands[event.key]);
}
closeJournal.addEventListener("click", () => send("j"));
journalToggle.addEventListener("click", () => {
  void send("j");
  if (journal.hidden) screen.focus({ preventScroll: true });
});
autoTrack.addEventListener("click", () => send("track auto"));
presentation.addEventListener("click", () => {
  togglePresentation();
  if (journal.hidden) screen.focus({ preventScroll: true });
});
mapToggle.addEventListener("click", toggleAutomap);
closeMap.addEventListener("click", toggleAutomap);
closeTravelMap.addEventListener("click", () => setTravelExpanded(false));
document.querySelector("#close-phlan-approaches").addEventListener("click", closePhlanApproaches);
markMap.addEventListener("click", markCurrentLocation);
localMap.addEventListener("click", () => { mapMode = "local"; renderAutomap(); });
regionMap.addEventListener("click", () => { mapMode = "region"; renderAutomap(); });
atlasMap.addEventListener("click", () => { mapMode = "atlas"; renderAutomap(); });
atlasSheet.addEventListener("change", renderAutomap);
window.addEventListener("keydown", (event) => {
  resumeBlockedAudio();
  if (event.key !== "F10" && event.target instanceof HTMLElement && event.target.closest("#settings")) return;
  // On the publisher screen a key goes to the title, and no further: the game is at its title
  // already, and a key sent to it there leaves the title unseen (#127). The browser keeps its own keys.
  if (publisherSplashUp() && event.key !== "F10" && !event.ctrlKey && !event.metaKey) {
    event.preventDefault();
    leavePublisherSplash();
    return;
  }
  const advancingCoveredPrint = currentVoice?.dataset.queuedNarration === "true" && ["Enter", " "].includes(event.key);
  // A key ends the line only when the game acts on it. The key press names the reason; send() notes
  // the screen when the key goes to the game, and poll() ends the voice if the game's next frame
  // differs. A key that is never sent, or that the game ignores, leaves the narration alone.
  keyEndsVoice = currentVoice && event.key !== "F10" && !advancingCoveredPrint ? `key ${event.key}` : undefined;
  queueMicrotask(() => { keyEndsVoice = undefined; });
  // While the Enhanced code wheel is in view it takes the arrows, the word and Enter.
  // A held arrow keeps turning the disc.
  // With runes on screen Escape brings the put-away wheel back.
  if (enhanced && runesOnScreen() && !codeWheelShown() && !codeWheelAsking() && event.key === "Escape" && !event.repeat) {
    event.preventDefault();
    toggleCodeWheel();
    return;
  }
  if ((codeWheelShown() || codeWheelAsking()) && !event.ctrlKey && !event.metaKey && !event.altKey && codeWheelKey(event)) return;
  // Ctrl keys stay with the browser. The original acts on Ctrl-S (sound on and off), which the
  // page's own sound settings offer, and on Ctrl-D and Ctrl-C only when started as STING (#77).
  if (event.ctrlKey || event.metaKey) return;
  // A held movement key repeats, as the BIOS repeats it on DOS. send() drops a press while one is
  // in flight, so holding a key never stacks presses up (#77). Other keys are one press per hold.
  if (event.repeat && !repeatsToGame(event)) return;
  if (!bootWheel.hidden && event.key !== "F10") {
    const key = wheelKey(event.key);
    if (key) {
      event.preventDefault();
      void send(key);
    }
    return;
  }
  if (activeTravel && (event.key === "Escape" || keypadDirections[event.code] || commands[event.key] || /^[a-z0-9]$/i.test(event.key))) {
    if (event.key === "Escape" || !waitingForFerryPayer(activeTravel)) {
      activeTravel = undefined;
      renderTravelMap();
      if (event.key === "Escape") { event.preventDefault(); return; }
    }
  }
  if (event.altKey) {
    if (!event.shiftKey && !state.journal && (event.code === "KeyQ" || event.code === "KeyM")) {
      event.preventDefault();
      void send(event.code === "KeyQ" ? "alt-q" : "alt-m");
    }
    return;
  }
  if (event.key === "F10") {
    event.preventDefault();
    togglePresentation();
    return;
  }
  if (event.key === "F9" && state.developerVictoryAvailable && automap.hidden) {
    event.preventDefault();
    void send(":win-combat");
    return;
  }
  if (enhanced && event.key.toLowerCase() === "m" && !event.shiftKey &&
      (!automap.hidden || travelExpanded || !travelMap.hidden || hostShortcutFree("m"))) {
    event.preventDefault();
    toggleAutomap();
    return;
  }
  if (travelExpanded) {
    if (event.key === "Escape") {
      event.preventDefault();
      if (phlanApproaches.hidden) setTravelExpanded(false);
      else closePhlanApproaches();
    }
    return;
  }
  if (!automap.hidden) {
    if (event.key === "Escape") {
      event.preventDefault();
      toggleAutomap();
      return;
    }
    // Movement still reaches the game so the party arrow can tween while the map is open.
    const move = keypadDirections[event.code] ?? commands[event.key];
    if (repeatingKeys.has(move)) {
      event.preventDefault();
      void send(move);
    }
    return;
  }
  if (event.target instanceof HTMLButtonElement && ["Enter", " "].includes(event.key)) return;
  // In Classic, J reaches the original game like any other key.
  if (event.key.toLowerCase() === "j" && !event.shiftKey && (state.journal || enhanced && hostShortcutFree("j"))) {
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
  void send(key.toLowerCase() === "j" ? `key ${key}` : key);
});
function wheelKey(key) {
  return key === "Enter" ? "enter" : key === "Backspace" ? "backspace" :
    typeof key === "string" && /^[a-z0-9]$/i.test(key) ? `key ${key}` : undefined;
}
window.addEventListener("message", ({ source, origin, data }) => {
  if (bootWheel.hidden || source !== bootWheel.contentWindow || origin !== location.origin) return;
  const key = wheelKey(data?.codeWheelKey);
  if (key) void send(key);
});
void poll();
