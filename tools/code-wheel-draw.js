// The translation wheel's drawing, shared by the standalone /code-wheel page and the game page.

/** The picture for a slot of one disc. Each disc has one slot that is its "TRANSLATE FROM" tab. */
export const wheelSlot = (disc, id) => id === "translate-tab" ? `${disc}-translate-tab` : id;

/**
 * Fetch the wheel's layout and every picture it needs. A picture that cannot be loaded is
 * named in `missing` and left out of `pictures`; the painter leaves its place empty.
 */
export async function loadCodeWheel() {
  const response = await fetch("/code-wheel/layout");
  if (!response.ok) throw new Error("The code-wheel layout is unavailable.");
  const layout = await response.json();
  const ids = ["background", "outer-disc", "inner-disc",
    ...layout.outer.runes.map(id => wheelSlot("espruar", id)), ...layout.inner.runes.map(id => wheelSlot("dethek", id)),
    ...layout.inner.paths.map(({ id }) => `path-${id}`)];
  const pictures = new Map();
  const missing = [];
  await Promise.all(ids.map(async id => {
    const picture = new Image();
    picture.src = `/code-wheel/${id}.png`;
    try {
      await picture.decode();
      pictures.set(id, picture);
    } catch {
      missing.push(id);
    }
  }));
  return { layout, pictures, missing };
}

/**
 * Returns a function that draws the wheel on `canvas` with the inner disc turned clockwise by
 * `turn` positions. `turn` may be a fraction while the disc is being dragged. The path named
 * by `activePath`, if any, is drawn brighter.
 */
export function wheelPainter(canvas, layout, pictures) {
  const context = canvas.getContext("2d");
  const overlay = document.createElement("canvas");
  overlay.width = canvas.width;
  overlay.height = canvas.height;
  const inner = overlay.getContext("2d");
  const centre = canvas.width / 2;
  const radius = centre - 22;
  const size = radius * 2;
  const outerSlots = layout.outer.runes.map(id => wheelSlot("espruar", id));
  const innerSlots = layout.inner.runes.map(id => wheelSlot("dethek", id));
  const paths = layout.inner.paths;
  const radians = slot => slot * Math.PI * 2 / layout.positions;
  const point = (fraction, slot) => {
    const angle = radians(slot);
    return [centre + radius * fraction * Math.sin(angle), centre - radius * fraction * Math.cos(angle)];
  };
  const whole = (target, id, ...box) => { if (pictures.has(id)) target.drawImage(pictures.get(id), ...box); };

  function drawRim(slots, radiusFraction, rotation, width) {
    slots.forEach((id, index) => {
      const picture = pictures.get(id);
      if (!picture) return;
      const slot = index + rotation;
      const [x, y] = point(radiusFraction, slot);
      const height = width * picture.naturalHeight / picture.naturalWidth;
      context.save();
      context.translate(x, y);
      context.rotate(radians(slot));
      context.drawImage(picture, -width / 2, -height / 2, width, height);
      context.restore();
    });
  }

  return function draw(turn, activePath) {
    whole(context, "background", 0, 0, canvas.width, canvas.height);
    whole(context, "outer-disc", centre - radius, centre - radius, size, size);
    context.font = "bold 18px monospace";
    context.fillStyle = "#fff0c7";
    context.textAlign = "center";
    context.textBaseline = "middle";
    layout.outer.rings.forEach((letters, ring) => {
      [...letters].forEach((letter, slot) => {
        context.fillText(letter, ...point(.36 + ring * .065, slot));
      });
    });
    inner.clearRect(0, 0, overlay.width, overlay.height);
    whole(inner, "inner-disc", centre - radius, centre - radius, size, size);
    paths.forEach(({ id, windows }, index) => {
      const spiral = windows.map((slot, ring) => point(.36 + ring * .065, slot + turn));
      inner.strokeStyle = id === activePath ? "#eac87c" : "#a08c71";
      inner.lineWidth = 2;
      inner.setLineDash([[7, 7], [7, 4, 1, 4, 1, 4], [1, 6]][index]);
      inner.beginPath();
      spiral.forEach(([x, y], ring) => ring ? inner.lineTo(x, y) : inner.moveTo(x, y));
      inner.stroke();
      // The path's mark sits beside its innermost window, toward the centre.
      const mark = pictures.get(`path-${id}`);
      if (mark) {
        const width = radius * .3, height = width * mark.naturalHeight / mark.naturalWidth;
        inner.save();
        inner.translate(...point(.26, windows[0] + turn));
        inner.rotate(radians(windows[0] + turn));
        inner.drawImage(mark, -width / 2, -height / 2, width, height);
        inner.restore();
      }
      inner.globalCompositeOperation = "destination-out";
      spiral.forEach(([x, y]) => inner.clearRect(x - 11, y - 12, 22, 24));
      inner.globalCompositeOperation = "source-over";
    });
    context.drawImage(overlay, 0, 0);
    drawRim(outerSlots, .935, 0, 47);
    drawRim(innerSlots, .798, turn, 40);
  };
}
