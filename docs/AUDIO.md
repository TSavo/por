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

## Production pipeline

Tandy traces will be converted to VGM register streams and rendered to canonical
lossless WAV files with a validated SN76489/SN76496 implementation. PC-speaker
traces will be rendered from the original PIT divisors and gate transitions.
Classic mode will play these verified assets according to the original event and
interruption rules. Enhanced mode will replace the same stable event IDs with new
effects. Dialogue and narration are Enhanced-only layers and never change ECL or
campaign state.
