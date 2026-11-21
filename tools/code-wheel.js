import { loadCodeWheel, wheelPainter } from "/code-wheel-draw.js";

const canvas = document.querySelector("#wheel");
const question = document.querySelector("#question");
const status = document.querySelector("#status");
const turnLabel = document.querySelector("#turn");

async function start() {
  const { layout, pictures, missing } = await loadCodeWheel();
  if (missing.length) throw new Error(`Cannot load the code-wheel image for ${missing[0]}.`);
  const paint = wheelPainter(canvas, layout, pictures);
  const labels = new Map([
    ["espruar", "Espruar rune"], ["dethek", "Dethek rune"], ["path", ""],
  ]);
  let turn = 0;
  let active;

  function draw() {
    paint(turn, active.path);
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
  const query = new URLSearchParams(location.search);
  const challenge = query.get("challenge") === "1" && window.parent !== window;
  const initial = Number(query.get("question"));
  if (Number.isInteger(initial) && initial >= 1 && initial <= layout.questions.length) question.value = initial - 1;
  if (challenge) {
    document.body.classList.add("boot-challenge");
    document.querySelector("#return").hidden = true;
    document.querySelector("#question-label").hidden = true;
    question.hidden = true;
    document.querySelector("#answer-instructions").hidden = false;
  }
  question.addEventListener("change", selectQuestion);
  document.querySelector("#left").addEventListener("click", () => rotate(-1));
  document.querySelector("#right").addEventListener("click", () => rotate(1));
  window.addEventListener("keydown", event => {
    if (event.target === question || event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
    if (["ArrowLeft", "ArrowRight"].includes(event.key)) {
      event.preventDefault();
      rotate(event.key === "ArrowLeft" ? -1 : 1);
    } else if (challenge && (["Enter", "Backspace"].includes(event.key) || /^[a-z0-9]$/i.test(event.key))) {
      if (event.key === "Enter" && event.target instanceof HTMLButtonElement) return;
      event.preventDefault();
      window.parent.postMessage({ codeWheelKey: event.key }, location.origin);
    }
  });
  selectQuestion();
  document.querySelector("#clues").hidden = false;
  status.hidden = true;
}

start().catch(error => { status.textContent = error.message; });
