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

`src/audio/voices.json` defines stable dialogue and narration IDs, speakers,
conversation or scene triggers, subtitles, context, timing, casting direction,
pronunciations, recording format, loudness targets, files, and verification
status. Browser playback consumes copies of original display messages but never
changes their execution: voice is Enhanced-only, starts asynchronously, stops on
input or presentation changes, and falls back to the original text whenever a
line or asset is missing. Page reload initializes at the current message cursor
so previously displayed dialogue is not repeated.

The vertical slice includes synthetic casting prototypes for Ferran Martinez and
the title narrator. They verify the full event, subtitle, mixing, interruption,
and fallback path but are explicitly marked for replacement by approved final
performances. `npm run verify` validates their manifests and WAV assets.

Enhanced effects use optional `enhancedFile` entries on that same original event
manifest. The browser selects the replacement only in Enhanced mode; otherwise it
uses the selected Classic hardware WAV. Missing or unavailable Enhanced files
therefore fall back without changing the original trigger. The vertical slice's
event 2 prototype is reproducible with `npm run generate-enhanced-audio`.

## Production pipeline

Tandy traces will be converted to VGM register streams and rendered to canonical
lossless WAV files with a validated SN76489/SN76496 implementation. PC-speaker
traces will be rendered from the original PIT divisors and gate transitions.
Classic mode will play these verified assets according to the original event and
interruption rules. Enhanced mode will replace the same stable event IDs with new
effects. Dialogue and narration are Enhanced-only layers and never change ECL or
campaign state.
