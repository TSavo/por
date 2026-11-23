# Tyrmor Prison roaming portraits

These controlled slot B checkpoints start in a prison corridor in area 22. The roaming progress flags leave the selected group available. The game reads its own selector, chooses the encounter distance, and plays the original menu and combat notice.

| Checkpoint | Presentation replay | Native portrait |
| --- | --- | --- |
| north/B.json | tyrmor-prison-human-fighters-north-dialogue | HEAD7 57, BODY7 6 |
| south/B.json | tyrmor-prison-human-fighters-dialogue | HEAD7 54, BODY7 6 |
| dwarf/B.json | tyrmor-prison-dwarves-dialogue | HEAD7 13, BODY7 6 |
| thieves/B.json | tyrmor-prison-thieves-dialogue | HEAD7 6, BODY7 8 |
| elf/B.json | tyrmor-prison-elf-dialogue | HEAD7 11, BODY7 2 |

Run the corresponding route with the checkpoint file and Chrome executable.

```sh
node tools/verify-slums-presentation.mjs qa/fixtures/tyrmor-prison-roamers/north/B.json /path/to/chrome tyrmor-prison-human-fighters-north-dialogue
```

Each route reaches the close encounter line “They smile at you.” Combat takes one C and retains the selected portrait for the battle notice.
