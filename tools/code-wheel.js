const canvas = document.querySelector("#wheel");
const context = canvas.getContext("2d");
const overlay = document.createElement("canvas");
overlay.width = canvas.width;
overlay.height = canvas.height;
const inner = overlay.getContext("2d");
const question = document.querySelector("#question");
const status = document.querySelector("#status");
const turnLabel = document.querySelector("#turn");
const centre = canvas.width / 2;
const radius = centre - 22;
const size = radius * 2;

const image = (id) => {
  const rune = new Image();
  rune.src = `/code-wheel/${id}.png`;
  return rune;
};

async function start() {
  const response = await fetch("/code-wheel/layout");
  if (!response.ok) throw new Error("The code-wheel layout is unavailable.");
  const layout = await response.json();
  const outerSlots = layout.outer.runes.map(id => id === "translate-tab" ? "espruar-translate-tab" : id);
  const innerSlots = layout.inner.runes.map(id => id === "translate-tab" ? "dethek-translate-tab" : id);
  const paths = layout.inner.paths;
  const ids = ["background", "outer-disc", "inner-disc", ...outerSlots, ...innerSlots, ...paths.map(({ id }) => `path-${id}`)];
  const pictures = new Map(ids.map(id => [id, image(id)]));
  await Promise.all([...pictures].map(async ([id, picture]) => {
    try { await picture.decode(); }
    catch { throw new Error(`Cannot load ${id}. Supply the original rune files using POR_CODEWHEEL_REFERENCE.`); }
  }));
  const labels = new Map([
    ["espruar", "Espruar rune"], ["dethek", "Dethek rune"], ["path", ""],
  ]);
  const radians = slot => slot * Math.PI * 2 / layout.positions;
  const point = (fraction, slot) => {
    const angle = radians(slot);
    return [centre + radius * fraction * Math.sin(angle), centre - radius * fraction * Math.cos(angle)];
  };
  let turn = 0;
  let active;

  function drawRim(slots, radiusFraction, rotation, width) {
    slots.forEach((id, index) => {
      const slot = index + rotation;
      const [x, y] = point(radiusFraction, slot);
      const picture = pictures.get(id);
      const height = width * picture.naturalHeight / picture.naturalWidth;
      context.save();
      context.translate(x, y);
      context.rotate(radians(slot));
      if (!id.endsWith("-tab")) context.globalCompositeOperation = "screen";
      context.drawImage(picture, -width / 2, -height / 2, width, height);
      context.restore();
    });
  }

  function draw() {
    context.drawImage(pictures.get("background"), 0, 0, canvas.width, canvas.height);
    context.drawImage(pictures.get("outer-disc"), centre - radius, centre - radius, size, size);
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
    inner.drawImage(pictures.get("inner-disc"), centre - radius, centre - radius, size, size);
    paths.forEach(({ id, windows }, index) => {
      const spiral = windows.map((slot, ring) => point(.36 + ring * .065, slot + turn));
      inner.strokeStyle = id === active.path ? "#eac87c" : "#a08c71";
      inner.lineWidth = 2;
      inner.setLineDash([[7, 7], [7, 4, 1, 4, 1, 4], [1, 6]][index]);
      inner.beginPath();
      spiral.forEach(([x, y], ring) => ring ? inner.lineTo(x, y) : inner.moveTo(x, y));
      inner.stroke();
      inner.globalCompositeOperation = "destination-out";
      spiral.forEach(([x, y]) => inner.clearRect(x - 11, y - 12, 22, 24));
      inner.globalCompositeOperation = "source-over";
    });
    context.drawImage(overlay, 0, 0);
    drawRim(outerSlots, .935, 0, 47);
    drawRim(innerSlots, .798, turn, 40);
    turnLabel.textContent = `${turn} / ${layout.positions}`;
  }

  function selectQuestion() {
    active = layout.questions[Number(question.value)];
    for (const [key, label] of labels) {
      const clue = document.querySelector(`#${key}`);
      const id = key === "path" ? `path-${active.path}` : active[key];
      const picture = pictures.get(id).cloneNode();
      picture.alt = label || active.path;
      clue.querySelector("img")?.remove();
      clue.append(picture);
    }
    draw();
  }

  const rotate = (direction) => {
    turn = (turn + direction + layout.positions) % layout.positions;
    draw();
  };
  layout.questions.forEach(({ number }) => question.add(new Option(String(number + 1), number)));
  const initial = Number(new URLSearchParams(location.search).get("question"));
  if (Number.isInteger(initial) && initial >= 1 && initial <= layout.questions.length) question.value = initial - 1;
  question.addEventListener("change", selectQuestion);
  document.querySelector("#left").addEventListener("click", () => rotate(-1));
  document.querySelector("#right").addEventListener("click", () => rotate(1));
  window.addEventListener("keydown", event => {
    if (event.target === question || !["ArrowLeft", "ArrowRight"].includes(event.key)) return;
    event.preventDefault();
    rotate(event.key === "ArrowLeft" ? -1 : 1);
  });
  selectQuestion();
  document.querySelector("#clues").hidden = false;
  status.hidden = true;
}

start().catch(error => { status.textContent = error.message; });
