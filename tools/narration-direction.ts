import { readFileSync } from "node:fs";

// What the voice model is sent as a line's performance direction.
//
// The generator sends "[direction] text". A direction that is a few words of manner ("measured
// dramatic fantasy narration") is performed. A direction written as an instruction ("perform Ohlo
// consistently: controlled, superior, and calculating; keep narrator identity for attribution") is
// partly read as script: the take repeats a phrase or speaks the direction aloud. Measured over the
// library on 2026-11-21: 72% of takes whose direction began "perform" were wrong, against 2.5% of
// the rest; in a direct test twelve takes of twelve were wrong as sentences and none as manner alone.
//
// So only a plain manner is ever sent. A direction that is not one must have a hand-written manner
// in src/audio/direction-tags.json; the direction itself stays in the queues as the intent.

const table = JSON.parse(readFileSync(new URL("../src/audio/direction-tags.json", import.meta.url), "utf8")) as { tags: Record<string, string> };

/** Why a direction cannot be sent as it stands, or undefined if it is a plain manner. */
export function notPlainManner(direction: string): string | undefined {
  if (/[:;]/.test(direction)) return "it has a colon or semicolon, so it reads as clauses of instruction";
  if (/\bperforms?\b/i.test(direction)) return "it tells the model to perform, so it reads as an instruction";
  if (direction.trim().split(/\s+/).length > 14) return "it is longer than 14 words";
  return undefined;
}

/** The manner to send for a direction. Throws if the direction is an instruction with no manner written for it. */
export function sentDirection(direction: string): string {
  const manner = table.tags[direction];
  const reason = notPlainManner(direction);
  // A direction that passes the rule can still have a manner written for it: one that describes an
  // action as a sentence ("Cadorna gives a formal diplomatic order ...") was read as script too.
  if (!reason && !manner) return direction;
  if (!manner) throw new Error(`This direction cannot be sent (${reason ?? ""}) and src/audio/direction-tags.json has no manner for it: ${direction}`);
  const mannerReason = notPlainManner(manner) ?? (manner.trim().split(/\s+/).length > 10 ? "it is longer than 10 words" : undefined);
  if (mannerReason) throw new Error(`The manner written for a direction is not plain (${mannerReason}): ${manner}`);
  return manner;
}

/** Every direction-to-manner entry, for the check. */
export const directionTags = table.tags;
