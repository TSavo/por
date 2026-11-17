import fs from "node:fs";
import path from "node:path";
import { parseDax, decodeRuns } from "../src/lib/dax.js";
import { EclMachine, disassemble, scriptFromBlock } from "../src/lib/ecl.js";
import { Frame } from "../src/lib/ega.js";
import { loadGame, interestingView, type ByteSource } from "../src/lib/files.js";
import { decodePicture } from "../src/lib/picture.js";
import { composeScreen, renderViewport } from "../src/lib/world.js";
import { findOverlayStubs, formatExeReport, inspectMz, overlayMagic } from "./exe.js";
import { findGameRoot, listGameFiles, readGameFile } from "./gamedata.js";
import { encodePng } from "./png.js";

function sourceFor(root: string): ByteSource {
  return {
    async list() {
      return listGameFiles(root);
    },
    async read(name: string) {
      return readGameFile(root, name);
    },
  };
}

function writePng(file: string, frame: Frame): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, encodePng(frame));
}

function sheet(picture: { width: number; height: number; itemCount: number; pixels: Uint8Array }, limit: number): Frame {
  const count = Math.min(picture.itemCount, limit);
  const frame = new Frame(picture.width * count, picture.height, 0);
  const n = picture.width * picture.height;
  for (let i = 0; i < count; i++) {
    frame.blit(picture.pixels.subarray(i * n, (i + 1) * n), picture.width, picture.height, i * picture.width, 0);
  }
  return frame;
}

function selftest(): void {
  const raw = Uint8Array.from([1, 2, 3, 3, 3, 4]);
  const comp = Uint8Array.from([1, 1, 2, -3 & 0xff, 3, 0, 4]);
  const decoded = decodeRuns(comp, raw.length);
  if ([...decoded].join() !== [...raw].join()) {
    throw new Error(`RLE mismatch ${decoded} vs ${raw}`);
  }
  const header = new Uint8Array(17 + 4);
  const view = new DataView(header.buffer);
  view.setInt16(0, 1, true);
  view.setInt16(2, 1, true);
  header[8] = 1;
  header[17] = 0x10;
  header[18] = 0x32;
  header[19] = 0x54;
  header[20] = 0x76;
  const picture = decodePicture(header, null);
  if (picture.width !== 8 || picture.height !== 1 || picture.pixels[0] !== 1 || picture.pixels[7] !== 6) {
    throw new Error("picture decode failed");
  }
  const scriptBytes = new Uint8Array(20 + 3 + 4);
  for (let i = 0; i < 5; i++) {
    scriptBytes[i * 4] = 0x00;
    scriptBytes[i * 4 + 1] = 0x02;
    scriptBytes[i * 4 + 2] = i === 4 ? 0x14 : 0x00;
    scriptBytes[i * 4 + 3] = 0x80;
  }
  scriptBytes[20] = 0x11;
  scriptBytes[21] = 0x80;
  scriptBytes[22] = 4;
  scriptBytes.set([0x20, 0x53, 0x0c, 0x3c], 23);
  const block = new Uint8Array(2 + scriptBytes.length);
  block.set(scriptBytes, 2);
  const script = scriptFromBlock(block);
  const machine = new EclMachine(script);
  machine.init();
  const step = machine.step();
  if (step.printed !== "HELLO") throw new Error(`expected HELLO, got ${step.printed}`);
  const dump = disassemble(script);
  if (dump.instructions.length < 2) throw new Error("disassembly produced nothing");
  const png = encodePng(new Frame(2, 2, 14));
  if (png[0] !== 137 || png[1] !== 80) throw new Error("png signature");
  console.log("selftest ok");
}

async function requireRoot(): Promise<string> {
  const root = findGameRoot(process.argv[3]);
  if (!root) {
    throw new Error(
      "No game files. Point POR_GAMEDATA at the Pool of Radiance directory, or place it in ./gamedata. Do not commit those files.",
    );
  }
  console.log(`game data: ${root}`);
  return root;
}

async function extract(root: string, outDir: string): Promise<void> {
  for (const name of listGameFiles(root).filter((file) => /\.dax$/i.test(file))) {
    const dax = parseDax(name, readGameFile(root, name));
    for (const entry of dax.entries) {
      const file = path.join(outDir, "dax", name, `${entry.id}.bin`);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, entry.data);
    }
    console.log(`${name}: ${dax.entries.length} blocks`);
  }
}

async function disasm(root: string, outDir: string): Promise<void> {
  fs.mkdirSync(outDir, { recursive: true });
  const parts: string[] = [];
  for (const name of listGameFiles(root).filter((file) => /^ecl.*\.dax$/i.test(file))) {
    const dax = parseDax(name, readGameFile(root, name));
    for (const entry of dax.entries) {
      let text = `; ${name} block ${entry.id} raw ${entry.rawSize}\n`;
      try {
        const script = scriptFromBlock(entry.data);
        const machine = new EclMachine(script);
        const vector = machine.init();
        text += `; init vector ${vector.map((word) => word.toString(16)).join(" ")}\n`;
        const dump = disassemble(script);
        text += dump.lines.join("\n") + "\n";
        console.log(`${name}#${entry.id}: ${dump.instructions.length} instructions${dump.stop ? " (stopped)" : ""}`);
      } catch (error) {
        text += `; failed: ${error instanceof Error ? error.message : String(error)}\n`;
        console.log(`${name}#${entry.id}: ${error instanceof Error ? error.message : error}`);
      }
      parts.push(text);
    }
  }
  const file = path.join(outDir, "ecl.txt");
  fs.writeFileSync(file, parts.join("\n"));
  console.log(`wrote ${file}`);
}

async function images(root: string, outDir: string): Promise<string[]> {
  const game = await loadGame(sourceFor(root));
  fs.mkdirSync(outDir, { recursive: true });
  const written: string[] = [];
  const save = (name: string, frame: Frame) => {
    const file = path.join(outDir, name);
    writePng(file, frame);
    written.push(file);
    console.log(`${name} ${frame.width}x${frame.height}`);
  };
  if (game.title) save("title.png", blitPicture(game.title));
  game.titlePages.slice(1, 3).forEach((page, index) => save(`title-${index + 2}.png`, blitPicture(page)));
  const head = await firstMatchingPicture(root, /^head\d*\.dax$/i, false);
  const body = await firstMatchingPicture(root, /^body\d*\.dax$/i, false);
  const sprit = await firstMatchingPicture(root, /^(sprit|comspr)\d*\.dax$/i, true);
  if (head) save("portrait.png", blitPicture(head));
  if (body) save("body.png", blitPicture(body));
  if (sprit) save("combat-icons.png", sheet(sprit, 8));
  else if (game.combat[0]) save("combat-icons.png", sheet(game.combat[0].picture, 8));
  if (game.area) {
    const start = interestingView(game.area.assets.map);
    const view = renderViewport(game.area.assets, start.x, start.y, start.dir);
    save("viewport.png", view);
    save("screen.png", composeScreen(view));
    console.log(`view at ${start.x},${start.y} dir ${start.dir} area ${game.area.area}`);
  }
  for (const note of game.notes) console.log(`note: ${note}`);
  return written;
}

async function firstMatchingPicture(
  root: string,
  pattern: RegExp,
  masked: boolean,
): Promise<{ width: number; height: number; itemCount: number; pixels: Uint8Array } | null> {
  let best: { width: number; height: number; itemCount: number; pixels: Uint8Array } | null = null;
  for (const name of listGameFiles(root).filter((file) => pattern.test(file))) {
    const dax = parseDax(name, readGameFile(root, name));
    for (const entry of dax.entries) {
      try {
        const picture = decodePicture(entry.data, masked ? 13 : null);
        const area = picture.width * picture.height;
        if (!best || area > best.width * best.height) best = picture;
      } catch {
        // not a picture block
      }
    }
  }
  return best;
}

function blitPicture(picture: { width: number; height: number; pixels: Uint8Array }): Frame {
  const frame = new Frame(picture.width, picture.height, 0);
  frame.blit(picture.pixels, picture.width, picture.height, 0, 0);
  return frame;
}

function scanExe(root: string): void {
  const names = listGameFiles(root).filter((name) => /\.(exe|ex_|ovr)$/i.test(name));
  if (names.length === 0) {
    console.log("no EXE/OVR in the game directory");
    return;
  }
  const ovrName = names.find((name) => /^game\.ovr$/i.test(name));
  const ovr = ovrName ? readGameFile(root, ovrName) : undefined;
  if (ovr) {
    const magic = overlayMagic(ovr);
    console.log(`\n== ${ovrName} (${ovr.length} bytes)`);
    console.log(magic ? `magic ${magic}, payload starts at byte 4` : "no TPOV magic");
  }
  for (const name of names) {
    if (/\.ovr$/i.test(name)) continue;
    const bytes = readGameFile(root, name);
    console.log(`\n== ${name} (${bytes.length} bytes)`);
    try {
      const info = inspectMz(bytes);
      const stubs = info.packed ? [] : findOverlayStubs(bytes, ovr?.length);
      console.log(formatExeReport(info, stubs));
      if (ovr && stubs.length > 0) {
        const covered = stubs.reduce((sum, stub) => sum + stub.codeSize + stub.relocSize, 0);
        console.log(`stub slices cover ${covered} of ${ovr.length} overlay bytes`);
      }
    } catch (error) {
      console.log(error instanceof Error ? error.message : error);
    }
  }
}

async function main(): Promise<void> {
  const command = process.argv[2] ?? "help";
  if (command === "selftest") {
    selftest();
    return;
  }
  if (command === "help") {
    console.log("usage: tsx tools/cli.ts selftest|list|extract|disasm|images|shots|exe [gamedata]");
    return;
  }
  const root = await requireRoot();
  const outDir = path.resolve("out");
  if (command === "list") {
    for (const name of listGameFiles(root)) console.log(name);
    return;
  }
  if (command === "extract") {
    await extract(root, outDir);
    return;
  }
  if (command === "disasm") {
    await disasm(root, outDir);
    return;
  }
  if (command === "images" || command === "shots") {
    const written = await images(root, path.join(outDir, "images"));
    if (command === "shots") {
      const artifactDir = fs.existsSync("/opt/cursor/artifacts") ? "/opt/cursor/artifacts" : null;
      if (artifactDir) {
        for (const file of written) {
          fs.copyFileSync(file, path.join(artifactDir, path.basename(file)));
        }
        console.log(`copied ${written.length} images to ${artifactDir}`);
      }
    }
    return;
  }
  if (command === "exe") {
    scanExe(root);
    return;
  }
  throw new Error(`unknown command ${command}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
