import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fromPortRoot } from "./port-root.js";

/** Check the unchanged translated routines behind the original 1.3 surprise and encounter-menu proof. */
export function matchesSurpriseRoutines(translatedRoutines: Record<string, string>) {
  const digest = (routine: string) => createHash("sha256").update(routine).digest("hex");
  const source = readFileSync(fromPortRoot("src", "translated-1.3", "ovl03.ts"), "utf8").replace(/\r\n/g, "\n");
  for (const offset of ["0e5e", "1629", "16c9", "18f8", "1ef8", "2f2d"]) {
    const routine = source.split("export function ovl03_" + offset + "(")[1]?.split("\n}\n")[0];
    if (!routine || digest(routine) !== translatedRoutines[offset]) return false;
  }
  return true;
}
