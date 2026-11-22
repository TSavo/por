import { fromPortRoot } from "./port-root.js";

/**
 * The Classic sounds: the game's 20 sound events for the PC speaker and the Tandy chip, rendered by
 * the port itself (audio/classic/README.md). They ship with the game. POR_AUDIO_DIR still names
 * another directory of the same files.
 */
export const classicSoundDirectory: string | undefined = fromPortRoot("audio", "classic");
