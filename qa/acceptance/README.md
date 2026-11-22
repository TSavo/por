# Acceptance scenarios from the walkthroughs

This folder turns the published walkthroughs into a catalogue of acceptance scenarios for the port. Each scenario is a specification: ordered player actions and what the game must show. None of it is test code. A later step implements the scenarios as executable replays (see `docs/REPLAYS.md`).

## Sources

- `qa/research/guides-digest.md`: the digest of Stephen S. Lee's guide v2.00 (tagged [P]), GameBanshee, the-spoiler, the SSI Clue Book and an NES walkthrough. The Lee guide is the spine: files `00` to `23` follow digest sections 3.0 to 3.23 in order.
- The SSI documents shipped with the GOG 1.3 release (`por-assets/gog-1.3/`): `Cluebook.pdf`, cited as "Clue Book p.N" by printed page, and `Adventurers Journal.pdf`, cited by printed page for journal entries, tavern tales and proclamations.
- The game's own on-screen text per script block, from `src/audio/voice-master-manifest.json`, cited as "game text ECLn.DAX block B at 0xADDR".
- `qa/research/version-1.3-differences.md` for behaviour specific to version 1.3, which is the version the port runs and the Lee guide documents.

Not read when the catalogue was written: `Manual.pdf` (no text layer) and `Quick Reference Card.pdf`. Since then the acceptance tests have used the manual's pages 3 to 14 and 17 to 18, read as images (characters, the party menu, viewing a character and the Items commands, the Encamp and Rest menus, combat), and the reference card's key list (`<Space>` resets all characters to manual control). The printed pages of `Adventurers Journal.pdf` have no text layer either. The digest itself did not read the Lee guide's bestiary stat blocks (§10.2) or most of its technical analysis (§12).

## The party the tests play with

A player who follows the guide does not start with the ready-made characters. `qa/research/party.md`
records what the sources say about making a party, and `tools/acceptance/party.mjs` makes that
party through the game's own menus: Create New Character, Add Character to Party, Modify
Character, the arms shop, the inn. `npm run acceptance:guide-party` makes it from nothing and
compares it with the saved game in `qa/fixtures/guide-party-new-phlan/`, from which a suite starts
in seconds (`loadParty` and `innToSlums` in `party.mjs`). The tests of New Phlan and the first four
of the Slums still use the ready-made six; the Slums tests from the goblin armsmaster's proof
onward use the guide's party.

## Files

- `00-new-phlan.json` to `23-inner-tower.json`: one file per area, in the guide's order.
- `90-mechanics.json`: rules from digest section 4 that are not tied to one area.
- `91-quirks.json`: every documented bug, exploit and quirk in digest section 5, one scenario each.
- `92-ending.json`: victory conditions, the ending, and the transfer to Curse of the Azure Bonds (digest section 6).
- `not-in-the-guides.md`: things the game has that the guides omit, grounded in repository files and the SSI documents.

## Schema

```json
{
  "schema": 1,
  "id": "acceptance.slums",
  "title": "Slums",
  "guideSection": "3.1",
  "scripts": ["ECL 20"],
  "commission": "Commission #1",
  "prerequisites": ["what must be true before starting"],
  "scenarios": [
    {
      "id": "acceptance.slums.<slug>",
      "title": "short imperative title",
      "kind": "main | optional | quirk | rule",
      "steps": ["ordered player actions and what the game must show"],
      "expect": ["end conditions: text, reward, XP, items, flags, map state, journal entry"],
      "branches": ["choices the guide describes and what each leads to"],
      "fights": ["fixed encounters with composition where the guide gives it"],
      "data": ["passwords, entry numbers, coordinates, item names as the guide gives them"],
      "sources": ["[P] §3.1", "Clue Book p.5-6", "game text ECL2.DAX block 20 at 0x...."],
      "disagreements": ["where sources disagree, both quoted briefly"],
      "coveredBy": ["function or milestone in tools/verify-fresh-party.mjs, or empty"],
      "notes": "what a test author must know"
    }
  ]
}
```

- `commission` is null where the area has none.
- `kind`: `main` is needed to finish the area or its commission. `optional` is everything else a player can do there. `quirk` is a documented bug or exploit of the original that a faithful port must reproduce. `rule` is a mechanic that can be observed (odds, resting, fleeing squares, parley tables, clear conditions).
- Every scenario has all twelve keys. Scenario ids are unique across the folder and start with the file's id.

## Counts

Measured on 2026-11-21 by parsing every file.

| File | Scenarios | main | optional | quirk | rule |
| --- | ---: | ---: | ---: | ---: | ---: |
| `00-new-phlan.json` | 66 | 36 | 12 | 5 | 13 |
| `01-slums.json` | 34 | 12 | 11 | 3 | 8 |
| `02-sokal-keep.json` | 23 | 9 | 11 | 0 | 3 |
| `03-kutos-well.json` | 13 | 2 | 4 | 1 | 6 |
| `04-kutos-well-catacombs.json` | 13 | 7 | 2 | 1 | 3 |
| `05-mendors-library.json` | 21 | 4 | 12 | 1 | 4 |
| `06-podal-plaza.json` | 34 | 5 | 15 | 3 | 11 |
| `07-cadorna-textile-house.json` | 29 | 8 | 10 | 4 | 7 |
| `08-kovel-mansion.json` | 25 | 6 | 9 | 2 | 8 |
| `09-wealthy-area.json` | 17 | 3 | 8 | 2 | 4 |
| `10-temple-of-bane.json` | 13 | 8 | 3 | 1 | 1 |
| `11-wilderness.json` | 30 | 0 | 8 | 0 | 22 |
| `12-wilderness-lairs.json` | 15 | 0 | 11 | 0 | 4 |
| `13-nomad-camp.json` | 19 | 9 | 5 | 1 | 4 |
| `14-kobold-caves.json` | 29 | 8 | 16 | 0 | 5 |
| `15-yarashs-pyramid.json` | 36 | 16 | 13 | 1 | 6 |
| `16-lizardman-keep.json` | 24 | 9 | 9 | 2 | 4 |
| `17-buccaneer-base.json` | 22 | 8 | 7 | 2 | 5 |
| `18-zhentil-keep-outpost.json` | 21 | 8 | 7 | 2 | 4 |
| `19-valhingen-graveyard.json` | 39 | 10 | 18 | 2 | 9 |
| `20-stojanow-gate.json` | 25 | 10 | 5 | 5 | 5 |
| `21-valjevo-castle.json` | 41 | 7 | 29 | 0 | 5 |
| `22-hedge-maze.json` | 18 | 2 | 10 | 2 | 4 |
| `23-inner-tower.json` | 20 | 7 | 8 | 1 | 4 |
| `90-mechanics.json` | 94 | 0 | 0 | 0 | 94 |
| `91-quirks.json` | 106 | 0 | 0 | 106 | 0 |
| `92-ending.json` | 14 | 5 | 5 | 2 | 2 |
| **Total** | **841** | **199** | **248** | **149** | **245** |

## What could not be made checkable

A replay cannot assert these digest items as the digest states them. Where a scenario exists for one, it records the trigger and what the original does, and no more. The individual scenarios were not re-read against this list after they were written.

- **Steps outside the game.** The transfer to Curse of the Azure Bonds runs `COPYCURS.EXE`, starts another game and hex-edits `*.GUY` files. Only "Remove the characters at a training hall" happens in the port.
- **DOS-level faults.** Real-time midnight rollover breaking timers, the memory leak from quitting character creation, the crash on names with DOS-invalid characters, and the "TIME TO SAVE YOUR GAME" heap message (v1.2 and earlier only). These depend on the host machine, not on what the game shows.
- **Crashes.** Moving south from Wealthy Area (4,15) and fleeing the bugbears at Stojanow Gate location 8 crash the original. The trigger is known; what the port should show in place of a DOS crash is an owner decision.
- **Undefined behaviour.** The Kovel Mansion ambush at 13 to 17 kills (underflow or stale pointer) and an undefined morale value reusing the previous encounter's value have no stated result to assert.
- **Time scales no replay reaches.** No aging until 256 game years, then one year per minute. Round-counter faults from combat round 257.
- **Version 1.0 behaviour.** Commission #3 never resolving, the C64 password 'NOTNOW', and "more likely in v1.0" spell behaviour are recorded as not required in 1.3.
- **Tables the digest only points to.** The full spell lists ([P] §8), weapon and armor tables (§9.2), random magic item generation (§9.4) and the bestiary (§10.2) are not in the digest, so there are scenarios only for the examples it gives.
- **Statements without a location or text.** Several flavour rooms are listed by number only ("4, 10, 11", "19, 21, 22"). Where the game-text file did not settle the text, the scenario says the digest is vague.
- **Strategy advice.** Recommended tactics (for example the troll fight at Slums 20, spell preparation before Tyranthraxus) are in `notes`, not asserted.
- **Tavern tale and journal texts.** The game prints only the number. A scenario can assert only the number; the text itself is in the printed Journal.

## The register of disagreements

Every place where the sources disagree is recorded once in `qa/disagreements.json`, built by
`npm run qa:disagreements` from the `disagreements` notes in these files and from
`qa/disagreements-manual.json`. Each entry names the scenarios that carry it and has a status:
`open` until the game itself has been used to settle it, then `settled`, with what the game does
and how that was established. `npm run qa:disagreements` prints how many are open and how many settled.
