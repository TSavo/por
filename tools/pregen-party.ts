import type { DosFile } from "../src/runtime/dos.js";

/** Stage SSI's six supplied character records in the guest's Add Character menu. */
export function stagePregenParty(files: DosFile[]): DosFile[] {
  const staged = new Map(files.map((file) => [file.name.replaceAll("/", "\\").toUpperCase(), file]));
  const names: string[] = [];
  for (let i = 1; i <= 6; i++) {
    const source = `CHRDATA${i}`;
    const character = staged.get(`${source}.SAV`);
    if (!character || character.data.length !== 285) throw new Error(`Invalid supplied character record ${source}.SAV`);
    const name = new TextDecoder().decode(character.data.subarray(1, Math.min(1 + character.data[0]!, 16)));
    const stem = name.split(" ")[0]!.slice(0, 8).toUpperCase();
    if (!/^[A-Z0-9]{1,8}$/.test(stem) || names.includes(stem)) throw new Error(`Invalid supplied character name in ${source}.SAV`);
    names.push(stem);
    for (const [ext, guestExt] of [["SAV", "CHA"], ["ITM", "ITM"], ["SPC", "SPC"]] as const) {
      const file = staged.get(`${source}.${ext}`);
      if (!file) continue;
      const path = `SAVE\\${stem}.${guestExt}`;
      if (staged.has(path)) throw new Error(`Supplied character conflicts with ${path}`);
      staged.set(path, { name: path, data: file.data });
    }
  }
  const path = "SAVE\\CHARLIST.TXT";
  const list = staged.get(path)?.data ?? new Uint8Array();
  const text = names.join("\r\n") + "\r\n";
  const added = new TextEncoder().encode((list.length ? "\r\n" : "") + text);
  const data = new Uint8Array(list.length + added.length);
  data.set(list);
  data.set(added, list.length);
  staged.set(path, { name: path, data });
  return [...staged.values()];
}
