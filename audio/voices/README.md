# Enhanced narration

Recordings for the Enhanced-only narration layer. Classic mode never loads
them.

- `narration/` holds the production MP3 recordings, each with its exact
  transcript and generation record. The files are keyed by
  `src/audio/voice-master-manifest.json` and the generation queues beside it.
- `narrator-anchor.*` is the approved narrator identity recorded in
  `src/audio/narrator-voice-design.json`.
- `candidates/` keeps the narrator design reviews and model tests.

See [docs/AUDIO.md](../../docs/AUDIO.md) for the pipeline and its checks.
