// How many replay steps still press a key again until the screen changes (#76).
//
//   npm run qa:repeat-presses
//
// Such a step hides a key the game swallows: the screen does not change, so the replay presses
// again and passes. Every key in a replay is one input, and the replay checks the screen it should
// produce. This reads the replays and the acceptance tests and lists every step of these shapes:
//
//   repeat step   ["q", /continue battle/, 60] in a replay's action list: press until the
//                 screen matches. Write presses(key, count, until) (tools/verify-fresh-party.mjs).
//   repeat fill   Array(30).fill((text) => ...): a key chosen from the screen, as often as it
//                 takes. Say how many keys the walk takes and check it (acceptSokalPatrol).
//   raw loop      a loop that writes keys to the runner while the screen does not show something.
//                 Press each key once and check its screen (tools/verify-input.mjs).
//   no count      presses(key, count, until), acceptSokalPatrol(..., keys) or chosenWalk(name, keys, ...) whose count can be
//                 undefined in some mode (`continuous ? 7 : undefined`): that mode fails at the step
//                 until its count is measured with POR_REPLAY_RECOUNT=1 and written (#151).
//
// The acceptance harness's own loops press through game.press, which fails on a swallowed key,
// so they are not counted. It prints R, the number of such steps, and exits 1 while R > 0.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";

// The checkout to read, the current directory by default.
const root = process.argv[2] ?? ".";
const files = ["tools", "tools/acceptance"].flatMap((directory) => readdirSync(join(root, directory))
  .filter((name) => name.endsWith(".mjs") && name !== "qa-repeat-presses.mjs").map((name) => join(root, directory, name)));

const isUntil = (node) => node && (ts.isRegularExpressionLiteral(node) || ts.isArrowFunction(node) || ts.isFunctionExpression(node));
const isFunction = (node) => node && (ts.isArrowFunction(node) || ts.isFunctionExpression(node));
const isCount = (node) => node && (ts.isNumericLiteral(node) || ts.isIdentifier(node));

function findings(file) {
  const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const found = [];
  const line = (node) => source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
  const writesToRunner = (node) => {
    let writes = false;
    const visit = (child) => {
      if (ts.isCallExpression(child) && ts.isPropertyAccessExpression(child.expression)) {
        const name = child.expression.name.text;
        const target = child.expression.expression.getText(source);
        if (name === "write" && /stdin$/.test(target)) writes = true;
      }
      if (!writes) ts.forEachChild(child, visit);
    };
    visit(node);
    return writes;
  };
  const visit = (node) => {
    // ["key", until, limit]
    if (ts.isArrayLiteralExpression(node) && node.elements.length === 3 && ts.isStringLiteral(node.elements[0]) &&
      isUntil(node.elements[1]) && isCount(node.elements[2])) {
      found.push({ line: line(node), shape: "repeat step", text: node.getText(source).replace(/\s+/g, " ").slice(0, 100) });
    }
    // Array(30).fill(fn)
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === "fill" &&
      ts.isCallExpression(node.expression.expression) && node.expression.expression.expression.getText(source) === "Array" &&
      ts.isNumericLiteral(node.expression.expression.arguments[0] ?? node) && isFunction(node.arguments[0])) {
      found.push({ line: line(node), shape: "repeat fill", text: node.getText(source).replace(/\s+/g, " ").slice(0, 100) });
    }
    // presses(key, undefined or a count that can be undefined, until), and acceptSokalPatrol's key count
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && ["presses", "acceptSokalPatrol", "chosenWalk"].includes(node.expression.text)) {
      const count = node.arguments[node.expression.text === "acceptSokalPatrol" ? 2 : 1];
      const mentionsUndefined = (child) => child && ((ts.isIdentifier(child) && child.text === "undefined") ||
        ts.forEachChild(child, mentionsUndefined) === true);
      if (!count || mentionsUndefined(count)) {
        found.push({ line: line(node), shape: "no count", text: node.getText(source).replace(/\s+/g, " ").slice(0, 100) });
      }
    }
    // for (...; !pattern.test(screen); ...) { runner.stdin.write(...) } and while loops alike
    const condition = ts.isForStatement(node) ? node.condition
      : ts.isWhileStatement(node) || ts.isDoStatement(node) ? node.expression : undefined;
    if (condition && /\.test\(/.test(condition.getText(source)) && writesToRunner(node.statement)) {
      found.push({ line: line(node), shape: "raw loop", text: condition.getText(source).replace(/\s+/g, " ").slice(0, 100) });
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}

let total = 0;
for (const file of files) {
  const found = findings(file);
  total += found.length;
  if (!found.length) continue;
  console.log(`${file}: ${found.length}`);
  for (const { line, shape, text } of found) console.log(`  ${line}  ${shape}  ${text}`);
}
console.log(`R = ${total} replay steps press a key again until the screen changes, or have no count in some mode, in ${files.length} files read.`);
process.exit(total ? 1 : 0);
