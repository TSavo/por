# Classic sounds

The game's 20 sound events as the original program plays them, rendered by the port itself, for
both of the sound hardware choices the game offers:

- `pc-speaker-NN.wav`: the PC speaker. `npm run render-original-sounds -- <directory>` runs the 1.3
  program's own sound driver for each event and writes these from the speaker port writes it makes
  (docs/AUDIO.md, "Classic sound").
- `tandy-NN.wav`: the Tandy 3-voice chip. The same driver's chip writes are recorded as VGM and
  rendered with libvgm's SN76489/SN76496 core (`tools/build-libvgm.sh`,
  `tools/render-tandy-libvgm.sh`).

They ship with the game: the page plays them in Classic display, and in Enhanced when the player
chooses the original hardware's sound. Rendered 2026-11-21 from GOG version 1.3; the port's sound
driver gives identical output for events 1 to 12 in both releases.
