# Contributing

The core rule of this project is that gameplay does not change. Patches must keep behaviour identical to the original game: the same rules, the same combat, the same encounters, the same story, the same difficulty. The only additions are art, narration, the automap, and the Journal.

## Build and run

You need Node.js 22 or newer.

```bash
npm ci
npm run play
```

That serves the browser build at http://127.0.0.1:43124. The game starts in Enhanced and needs no original files. `npm run play:electron` opens the desktop window. After updating the checkout, save through Encamp and restart `npm run play`; reloading the tab alone keeps the code the running server already loaded.

## Classic mode

Classic mode needs your own copy of the original game files. Version 1.3 is sold on GOG as part of [Forgotten Realms: The Archives - Collection Two](https://www.gog.com/en/game/forgotten_realms_the_archives_collection_two). Version 1.1 is in the [Strategic Simulations (SSI) PC Floppy Disk Image Collection](https://archive.org/details/20220918_20220918_1709) on the Internet Archive. How to point the game at those files is in the [README](README.md#playing-classic-mode).

## Patches

Open an issue or a pull request. Say what you changed and how it stays true to the original.
