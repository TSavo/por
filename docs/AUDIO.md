# Audio

The DOS EGA release supports Tandy sound, PC Beeper sound, and silence. `SETUP.EXE`
offers each sound mode with every video choice. The runtime stores the selected
sound mode at `DS:52d2`, using 0 for Tandy, 1 for PC Beeper, and 2 for silence.
There is no AdLib, Sound Blaster, MIDI, sampled speech, or voice data in this
release.

Original sound requests enter the resident `START.EXE` procedure at image address
`0x27f0`. The procedure receives a numbered event and drives either the PC PIT and
speaker through ports `0x42`, `0x43`, and `0x61`, or the Tandy PSG through port
`0xc0`. Port `0x40` supplies the timer cadence used by the original driver. The
sequences and driver are embedded in `START.EXE`; there are no separate sound files.

## Inventory and traces

Run the static call-site inventory with:

```powershell
npm run sound-inventory -- src/translated out/sound-inventory.json
```

Set `POR_SOUND_TRACE` on any translated replay to record the original sound calls
and audio-port writes with deterministic execution-step timestamps:

```powershell
$env:POR_SOUND_TRACE = "C:\path\to\por-assets\traces\route.json"
npx tsx tools/boot-translated.ts
```

The trace schema records the original event index, selected sound mode, caller,
and hardware writes. Generated traces, VGM intermediates, WAV masters, and other
derived audio belong in `TSavo/por-assets`. Only generators, manifests, tests, and
documentation belong in this repository.

## Original driver format

The resident driver installs its timer interrupt at segment `027f`, offset `21bd`
(START.EXE image offset `49ad`). It reprograms PIT channel 0 with divisor `13b1`,
so its state machine advances at approximately 236.7 Hz and chains to the BIOS
handler every thirteenth interrupt.

There are 20 numbered effects. Each hardware mode has a four-channel entry table.
Entries are offsets inside the resident segment, not file offsets. The streams use
bytes below `fa` for note/duration records and `fa` through `ff` for state, call,
return, channel-selection, loop, and field-assignment commands. Run
`npm run sound-driver-data -- <output.json>` to export the exact tables, frequency
data, duration multipliers, and timing constants from the original START.EXE.

Run `npm run render-original-sounds -- <output-directory>` to execute all 20
events through the decoded driver in both hardware modes. It writes deterministic
port traces, 44.1 kHz lossless PC-speaker WAV files, Tandy VGM 1.50 streams using
the original 3.579545 MHz PSG clock, and a duration/termination summary. Events
13 through 15 are looping sequences and are intentionally reported at the render
limit; all other events must terminate naturally. `npm run verify` exercises every
event and validates representative WAV and VGM headers and hardware output.

Canonical Tandy WAV masters are rendered from those VGM files with upstream
libvgm's `vgm2wav` and its MAME SN76489/SN76496 core. The reproducible Linux/WSL
helpers are `tools/build-libvgm.sh` and `tools/render-tandy-libvgm.sh`; the assets
repository records the exact upstream commit, renderer hash, clock, and arguments.

For independent driver validation, `tools/validate-original-driver-unicorn.py`
executes the original 16-bit resident ISR bytes from START.EXE under Unicorn and
compares its port writes against generated traces. Events 2 through 20 match
exactly in both hardware modes: 38/38 cases, including every tick, port, and byte.
Event 1 is the dispatcher's initialization control rather than a normal numbered
effect and is documented separately. The comparison caught and corrected a
missing final Tandy silence frame; its report lives in por-assets inventory.

The dispatcher controls are `0` (initialize), `1` (a special non-table driver
path), and `255` (stop). Static translated call-site inventory finds gameplay
calls for events 2 through 14 only. Events 13 and 14 are reached only inside
Tandy-mode branches; events 15 through 20 have no call sites.

The original event loader resets only channels whose table entry is nonzero.
Every reachable effect (2 through 12) has four nonzero entries in both hardware
tables, and the reachable score events (13 and 14) have four nonzero Tandy
entries. Consequently every gameplay sound request replaces the complete active
sound on the hardware path that can issue it. The PC entries for scores 13 through
20 preserve channels 1 through 3, but those entries are never requested on the PC
speaker path. This is why browser playback intentionally uses one current Classic
asset and replaces it on a new request; it reproduces reachable interruption and
stopping behavior rather than approximating it with additive mixing.

`src/audio/original-sounds.json` is the stable event manifest consumed by both
presentation modes. It records IDs, original indices, type, loop behavior,
per-hardware durations, replacement/fallback rules, provenance, and verification
state. `npm run audio-coverage -- <report.json>` verifies every manifest entry has
PC WAV, Tandy VGM, and libvgm Tandy WAV assets and reports Enhanced replacement
coverage separately from faithful fallback coverage.

Semantic names are evidence-backed rather than inferred from waveform shape. The
translated call sites were correlated with the byte-for-byte v1.1 source
reconstruction at `talonius/bc-pool-of-radiance` tag `v1.1` (commit `45ce2ab`).
The resulting mapping is: 2 spell cast, 3 damage, 4 status effect, 5 downed,
6 ranged start, 7 impact, 8 lightning, 9 miss, 10 step, 11 fireball/script cue,
12 ranged end, 13 title theme, and 14 battle sting. The inventory generator adds
these stable IDs to every resolved translated call site so later code movement
cannot separate numeric events from their gameplay meaning.

## Enhanced voice layer

`src/audio/voice-review-extraction.json` is a lossless mechanical inventory of
all 2,025 text-producing ECL events. It preserves literal whitespace, dynamic
operands, menus, source addresses, nearby instructions, and control-flow hints,
but deliberately makes no automatic narration joins. The ECL1–ECL8 review
manifests contain the manual, address-by-address editorial pass. A narration
unit records its trigger print and every covered continuation print. Audio is
attached only to the trigger; Enter may advance covered display pages while the
same recording continues.

`src/audio/voice-master-manifest.json` normalizes the complete review. It
currently accounts for all 2,025 extracted events as 1,432 reviewed
narration units plus interface/layout exclusions. Finite runtime strings are
enumerated for 68 dynamic families with 373 distinct prerecorded clips. These
include the Slums and Kuto's Well encounter menus, Podol Plaza patrols, the
Valhingen undead, and the Valjevo giant patrol. Identical passages can share a
recording. Four Kobold Caves passages include their complete journal references.
Ten families still display text alone. Seven use party-member names, two echo a
typed password, and one combines a computed enemy count with a creature name.
Rebuild the finite variants with `npx tsx tools/build-dynamic-voice-resolution.ts`
using the original game data. Rebuild and validate the master with
`npm run voice-master-manifest` and `npm run verify-voice-master`.

The approved narrator is the saved ElevenLabs Voice Design identity recorded in
`src/audio/narrator-voice-design.json`. Production uses `eleven_v4` to create
complete, pre-generated passage recordings with inline performance direction;
there is no live runtime speech synthesis. The narrator performs quoted
characters in audiobook style while character IDs and directions preserve
continuity. The project owner handles any later separate character-voice casting.

The translated ECL runtime emits the exact archive, block, instruction address,
and operand identity observed from the original interpreter state. The browser
resolves that source ID against the master manifest, suppresses covered
continuation events, selects finite variants from the original runtime value,
and queues consecutive narration recordings without altering ECL execution.
Manually reviewed shared triggers use exact pre-instruction VM state, explicit
silent cases, later covered source events, or the literal the original encounter
menu actually draws. They never guess between recordings.
Narration is Enhanced-only. Switching to Classic stops it; missing, ambiguous,
or unresolved assets leave the authoritative original text untouched. Subtitles
use the reviewed narration text, and independent master, effects, dialogue, and
narration controls remain browser preferences rather than campaign-save state.

`npm run verify-narration-runtime` tests real Sokal print and authored-menu
observation, joined continuation suppression, finite dynamic selection, queueing,
interruption, and Classic-mode gating. `npm run verify-narration-generation`
checks every queued MP3/transcript pair, exact text, signatures, duplicates, and
pending generation. Original town dialogue that bypasses the ECL interpreter is
matched from the exact text sent to the guest display and uses the same complete
Eleven v4 narrator recordings; the complete initial Rolf tour is covered by eight passages.
The production inventory currently verifies all 1,733 queued
recordings complete, with zero pending, failed, duplicate, or untracked outputs.
On November 18, 2026, Chrome verified Enhanced activation,
subtitle playback, the independent audio controls, and state-preserving return
to Classic while audio was playing.

Enhanced effects use optional `enhancedFile` entries on that same original event
manifest. The browser selects the replacement only in Enhanced mode; otherwise it
uses the selected Classic hardware WAV. Missing or unavailable Enhanced files
therefore fall back without changing the original trigger.

Replacement effects are generated with ElevenLabs Sound Effects v3, not local
procedural synthesis. `src/audio/enhanced-sounds.json` is the production prompt
sheet for all reachable effect events and records stable IDs, filenames, target
lengths, prompts, model, output format, and prompt influence. Preview the planned
requests with `npm run generate-enhanced-audio`; generation requires both
`ELEVENLABS_API_KEY` and the explicit `--generate` argument because it consumes
ElevenLabs credits. The generator writes canonical WAV files plus a provenance
report containing prompts, model settings, timestamps, response cost headers,
and SHA-256 hashes. Every generated result remains subject to listening review.

## Production pipeline

Tandy traces are converted to VGM register streams and canonical WAV with the
validated libvgm SN76489/SN76496 core. PC-speaker assets are rendered from the
original PIT divisors and gate transitions. Classic plays these verified assets
with PC Beeper, Tandy, and Silent choices according to the original replacement
rules. Enhanced substitutes approved modern effects through the same stable
event IDs. Dialogue and narration remain Enhanced-only layers and never change
ECL or campaign state.
