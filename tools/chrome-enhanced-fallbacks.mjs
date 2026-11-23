// Installed only by Chrome QA. Observe the screen and artwork layers after the page has committed
// them, so a discarded decode or a redraw of the same guest view is not another fallback frame.
export function observeEnhancedFallbacks() {
  const seen = new WeakMap();
  const frames = [];
  let presented = 0;
  window.porEnhancedFallbacks = () => ({ observer: 2, data: state.classicAvailable ? "original" : "port", presented, frames });

  function inspect() {
    if (!enhanced || document.querySelector("#screen-loading").hidden === false) return;
    const view = animationFrame ?? state;
    const layers = tileArt.hidden ? [] : [...tileArt.children];
    const isScene = !screen.src.startsWith("data:");
    const draws = selector => layers.some(layer => layer.matches(selector));
    const isWheel = Number.isInteger(view.codeWheelQuestion);
    let record = seen.get(view);
    if (!record) {
      record = { sequence: state.sequence, animation: Boolean(animationFrame), keys: [] };
      seen.set(view, record);
      presented++;
    }
    if (isScene || isWheel) return;

    const missing = new Set();
    const scene = view.scene ?? view.art;
    const pose = view.exploration ?? view.scenery;
    const area = view.classicPortraitArea ?? pose?.area;
    const cursor = view.classicPortraitCursor?.toString(16);
    const caller = view.classicPortraitCaller?.toString(16);
    const scope = (area === undefined ? "" : `:area:${area}`) +
      (cursor === undefined ? "" : `:ecl:${cursor}`) + (caller === undefined ? "" : `:caller:${caller}`);
    if (scene) missing.add(scene);
    if (!scene && view.classicPortrait && !draws(".encounter-portrait")) {
      const sources = view.classicPortraitSources ?? [];
      if (sources.length) for (const source of sources) missing.add(source.replace(/^portrait:/, `portrait${scope}:`));
      else missing.add(`portrait${scope}:unidentified`);
    }
    if (view.portrait && !draws(".encounter-portrait, .reward-illustration")) missing.add(view.portrait);
    if (view.encounter && !draws(".encounter-sprite")) missing.add(view.encounter[2]);
    for (const [, , key] of view.characterSheet ?? []) {
      if (!layers.some(layer => layer.matches(".character-sheet-part") &&
          layer.getAttribute("src") === `/art/${key}`)) missing.add(key);
    }
    // Combat layer failures use a crop of the native frame with the failed image's exact box.
    // The image's key can be recovered from the guest placements even if several share that box.
    if (draws(".sprite-fallback") || !view.enhancedFrame) {
      const painted = new Set(layers.flatMap(layer => {
        const src = layer.getAttribute("src");
        return src?.startsWith("/art/") ? [src.slice(5)] : layer.dataset.partyPalette ? [layer.dataset.partyPalette] : [];
      }));
      const combat = [...(view.combatArt ?? []), ...(view.combatEffect ? [view.combatEffect] : [])];
      for (const [, , key] of combat) if (!painted.has(key)) missing.add(key);
    }
    const surfaceVisible = !travelMap.hidden || draws("canvas.street-viewport, canvas.overland-viewport");
    const picture = view.portrait || view.classicPortrait || view.characterSheet || view.combatArt?.length || view.battleTiles?.length;
    if (!scene && !picture && !surfaceVisible && (view.overlandMap || view.perspective)) {
      if (view.overlandMap || view.encounter && !view.scenery && !view.nativeScenery && pose?.area >= 25 && pose.area <= 27) {
        missing.add("surface:overland");
      } else {
        const tiles = view.tiles ?? [];
        const painted = layers.filter(layer => layer.matches(".terrain-tile"));
        const paintedCounts = new Map();
        for (const layer of painted) {
          const path = layer.getAttribute("src");
          paintedCounts.set(path, (paintedCounts.get(path) ?? 0) + 1);
        }
        for (const [, , key] of tiles) {
          const path = `/art/${key}`;
          const count = paintedCounts.get(path) ?? 0;
          if (count) paintedCounts.set(path, count - 1);
          else missing.add(key);
        }

        // The first-person panel covers 11 by 11 native cells. A partial
        // tile list can paint every requested asset and still expose the
        // original framebuffer behind it. Area maps have their own layout.
        const paintedCells = new Set(painted.map(({ style }) => `${style.left},${style.top}`)).size;
        if ((!painted.length && !tiles.length) || (!view.areaView && paintedCells < 11 * 11)) {
          missing.add(`surface${scope}:first-person`);
        }
      }
    }
    if (!missing.size && screen.getAttribute("src") === `data:image/png;base64,${view.frame}` &&
        (!view.enhancedFrame || failedEnhancedFrames.has(view))) missing.add(`frame${scope}:unidentified`);
    const fresh = [...missing].filter(key => !record.keys.includes(key));
    if (fresh.length) {
      if (!record.keys.length) frames.push(record);
      record.keys.push(...fresh);
      record.keys.sort();
    }
  }

  const observer = new MutationObserver(inspect);
  observer.observe(screen, { attributes: true, attributeFilter: ["src"] });
  observer.observe(tileArt, { childList: true });
  inspect();
}
