# Fish Audio Drama 3 prompt authoring

**Status: superseded for production.** The shipped narration is produced directly with ElevenLabs `eleven_v4` from the saved Voice Design identity in `src/audio/narrator-voice-design.json` (see [AUDIO.md](AUDIO.md)); no Fish Audio Drama 3 recording is used. This page records the earlier Fish prompt-authoring design and the annotation rules, which `tools/compile-fish-prompts.ts` and `src/audio/fish-prompts.json` still implement.

Enhanced narration was first planned for Fish Audio Drama 3. The original ECL text remains immutable source material. Editorial annotations describe how the text should be performed and compile reproducibly into Fish prompts; they never replace or paraphrase the source.

Official references:

- [Fish Audio Drama 3 overview](https://speech.fish.audio/) identifies Drama 3 as the current flagship for long-form and multi-character scenes, with natural-language performance control.
- [Fish Speech inference documentation](https://github.com/fishaudio/fish-speech/blob/main/docs/en/inference.md) defines `<|speaker:0|>` through `<|speaker:15|>`, Drama 3 long-text chunking, and the default sampling controls.
- [Fish Audio API documentation](https://github.com/fishaudio/docs/blob/main/.mintlify/skills/fish-audio-api/SKILL.md) documents `drama-3`, multi-speaker tags, and bracketed natural-language expression directions.

## Project delivery model

Most Pool of Radiance prose uses one audiobook narrator. The narrator reads descriptive prose and performs quoted character speech without changing speaker identity. A quote is therefore not automatically a separate character voice.

Example source:

```text
THE SHAPE SPEAKS, 'I AM THE LIFE FORM OF FERRAN MARTINEZ...'
```

Compiled prompt shape:

```text
<|speaker:0|>[measured historical fantasy narration] THE SHAPE SPEAKS,
[in a weary, honorable spirit's voice, solemn and restrained] 'I AM THE LIFE FORM OF FERRAN MARTINEZ...'
```

Use another `<|speaker:N|>` only when the project owner explicitly authors a truly separate character voice. Do not infer speaker changes from quotation marks alone.

## Narrator identity

The narrator timbre is designed once with ElevenLabs Voice Design and approved by the project owner. In the original Fish plan that saved voice produced a neutral anchor passage on which every Drama 3 request conditioned `<|speaker:0|>`. Production dropped the Fish stage: ElevenLabs `eleven_v4` narrates directly from the saved voice.

`narrator-voice-design.json` contains the reviewed voice description, preview text, design parameters, selected generated voice ID, and the anchor provenance.

## Annotation rules

1. `voice-inventory.json` preserves every source string and its ECL location.
2. `voice-plan.json` selects passages and divides their exact text into directed spans.
3. Concatenating every span must reproduce the original selected text byte-for-byte.
4. Directions use restrained bracketed natural language. Directions must not contain spoken rewrites.
5. `compile-fish-prompts.ts` inserts the speaker tag and directions to produce `fish-prompts.json`.
6. Verification hashes the spoken source text and rejects annotations that omit, duplicate, reorder, or alter it.
7. Prompt authoring is performed in this repository. Final synthesis and voice choices remain with the project owner.

Drama 3 may split long input around sentence boundaries at roughly 300 UTF-8 bytes. Keep a direction with the span it controls, avoid unnecessary speaker changes, and review long passages at the generated chunk boundaries.
