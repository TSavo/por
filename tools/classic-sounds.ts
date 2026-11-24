import { fromPortRoot } from "./port-root.js";

/**
 * The Classic sounds: the game's 20 sound events for the PC speaker and the Tandy chip, rendered by
 * the port itself (audio/classic/README.md). They ship with the game. POR_AUDIO_DIR still names
 * another directory of the same files.
 */
export const classicSoundDirectory: string | undefined = fromPortRoot("audio", "classic");

/** Both original sound devices render the same twenty numbered game events. */
export function missingClassicRecordings(verifiedPaths: Set<string>): string[] {
  const missing: string[] = [];
  for (const device of ["pc-speaker", "tandy"]) {
    for (let event = 1; event <= 20; event++) {
      const path = `audio/classic/${device}-${String(event).padStart(2, "0")}.mp3`;
      if (!verifiedPaths.has(path)) missing.push(`Missing committed recording: ${path}`);
    }
  }
  return missing;
}
