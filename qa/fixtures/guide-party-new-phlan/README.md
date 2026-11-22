# The guide's party, saved in New Phlan

A saved game of GOG version 1.3 (`A.json` is slot A, `roster.json` the characters on the save
disk), written by the game's own Save command. It holds a saved game and nothing else: no file of
the original game is in this folder.

## What it holds

The party Stephen S. Lee's guide (v2.00, §3.2) calls the best one, made through the game's menus:

| Order | Name | Character | STR | INT | WIS | DEX | CON | CHA | HP | AC | Carries (all ready) | In memory |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | AELAR | male elf fighter/magic-user, lawful good | 18(75) | 18 | 18 | 19 | 18 | 18 | 9 | -1 | long sword, shield, banded mail | Sleep |
| 2 | BRENNAN | male elf fighter/magic-user, lawful good | 18(75) | 18 | 18 | 19 | 18 | 18 | 9 | -1 | long sword, shield, banded mail | Sleep |
| 3 | CAELUM | male elf fighter/magic-user, lawful good | 18(75) | 18 | 18 | 19 | 18 | 18 | 9 | -1 | long sword, shield, banded mail | Sleep |
| 4 | ELSPETH | female human cleric, lawful good | 18 | 18 | 18 | 18 | 18 | 18 | 10 | 1 | flail, shield, scale mail | Cure Light Wounds x3 |
| 5 | DORIAN | male half-elf cleric/fighter/magic-user, lawful good | 18(90) | 18 | 18 | 18 | 18 | 18 | 9 | 3 | long sword, shield, leather armor | Cure Light Wounds x3, Sleep |
| 6 | FINN | male elf fighter/magic-user/thief, neutral good | 18(75) | 18 | 18 | 19 | 18 | 18 | 8 | 4 | long sword, leather armor | Sleep |

All are level 1 with no experience. AELAR carries the party's money, 3 gold pieces. The party
stands in New Phlan in the inn at (4,12), facing south, at 05:24 of the first day: Rolf's tour is
over, nothing else has been done.

## How it was produced

By `tools/acceptance/party.mjs`, pressing the keys a player presses and reading each screen; no
developer command, no memory edit, no edited save. From a new game with no characters:

1. Create New Character six times: race, sex, class, alignment, the roll kept as it fell, the name,
   the portrait and the combat icon as offered.
2. Add Character to Party, in the order above (the guide's marching order, §5.1).
3. Modify Character for each: all six ability scores and the hit points raised until the game
   raises them no further (the guide §3.1; the rule book p.7). Those are the numbers in the table.
4. BEGIN Adventuring and Rolf's tour to the gate at (0,4).
5. The arms shop at (8,11): Pool, then the guide's opening purchases (§4.1.1) as far as the 486
   gold pieces the six were rolled with reach: five long swords and a flail, leather armor for the
   thief, five shields, three suits of banded mail, scale mail and leather armor for the two the
   banded mail did not reach (478 gold pieces). Everything bought is made ready. AELAR takes what
   is left of the pool, 1 platinum and 3 gold.
6. The inn at (4,12): the platinum piece is paid, every cleric place memorises Cure Light Wounds
   and every magic-user place Sleep (§5.2), and the party rests the 5 hours the game sets.
7. Camp, Save, slot A.

`qa/research/party.md` quotes the sources for each choice.

## How it is regenerated and checked

    npm run acceptance:guide-party -- --write    make the party from nothing and replace this folder
    npm run acceptance:guide-party               make it from nothing and compare it with this folder

Environment: `POR_GAMEDATA=/Users/tsavo/por-assets/gog-1.3/POOLRAD`,
`POR_AUDIO_DIR=/Users/tsavo/por-assets/original` (the harness's defaults) and `POR_CLOCK=fixed`
(the harness sets it).

The check loads both saved games with Load Saved Game and reads every sheet with View. The fields
Create and Modify fix (name, race, sex, classes, alignment, the six scores, the hit points, level,
experience) never depend on the dice and must be equal. The fields the dice reach (age; the
starting gold, and through it what the shop sold, the armor class, damage and movement; the items;
the spells in memory) are compared too, because a replay's dice are fixed.

## How to start from it

    import { innToSlums, loadParty } from "../../tools/acceptance/party.mjs";
    const game = await loadParty();   // a copy of this folder, slot A loaded: the party in the inn
    await innToSlums(game);           // to the gate at (0,4) and one step west into the Slums
