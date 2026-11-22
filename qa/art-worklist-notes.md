# Notes on the artwork worklist

For the artwork agent. When something in `docs/ART-WORKLIST.md` is wrong, add one line here and commit it:
the key, what you saw, and where (area, square, facing, or the replay). Two kinds of thing belong here:

- an item listed to do that cannot occur in play;
- art of yours under a key the worklist neither lists as needed nor accounts for
  (`areas[].unaccountedKeys` in `qa/art-worklist.json` already lists the ones the tool knows it cannot account for).

Whoever maintains `tools/art-worklist.ts` reads this file and fixes the tool. Do not fix the worklist files by hand.

## Notes

- `tile:20:e3186849c39595898dc81456768972ec3ccb4e6dfd818445b630fc0799fea169` was observed at screen cell (40, 64) in the Enhanced `castle-halls` replay from the controlled `castle-hall-approach-B.json` fixture. That view draws the Valjevo threshold while the save still reports area 20. The same fingerprint is installed in area 7 for `valjevo-hall-threshold`. Keep the area-20 alias for that controlled replay pending verification of the natural transition.
- The Kuto audit paired 56 bundled and GOG 1.3 native frames across reloads, both directions on the ladder, shaft turns and Norrisâ€™s release. ECL29 loads map 29 with `3,20,1` at `9c5b`, `9f8c` and `a26a`. It loads map 32 with `18,17,1` at `9c6a` and `aeaf`. The `EXIT` at `9c69` separates the two reload branches. The surface uses sky `0`, `11` or `12`, ground `6` and horizon `0.7`. The catacombs use sky `0` or `11`, horizon `0.8` and ground `6`, with ground `1` confined to the shaft at `(7,7)`. The Norris release retains the dry catacomb view until the next draw. Sweeping 3,492 camera and palette combinations excludes 313 previously listed cells that depended on different banks or backdrops.
- `tile:29:d20d585641c6d76d5fdd15d21d1f0fe0f6663d6aded22bc96508569ac0bd84f7` appears on the westbound arrival into Podol, while the game still reports Kutoâ€™s area. The Podol arrival supplies horizon `0.15.7.6`. The worklist keeps the existing arrival binding alongside the audited Kuto surface and catacomb palettes.


- The Lizardman Keep audit paired GOG and bundled native views on both floors. ECL16's descent tables at `9e9d`, `9ea4` and `9eab` enter the 119 roofed squares on map 30 using wall banks `9,17,23`. All later relocation coordinates at `ac25` and `ac30` and the fixed relocation to `(8,12)` stay inside that component. The surface has 253 reachable squares with sky 0 or 11. The lower map always has sky 0. Both use horizon line 15, band 7 and ground 6. These limits exclude 13 lower daylight entries and nine entries visible only from disconnected squares. Seven existing fallback bindings are accounted for separately as unreachable views.

- The Mendor Library audit paired native captures from bundled data and GOG 1.3. On map 15 the palette setter at `99c8`–`99e2` runs before the load at `9ba0`. It gives exterior sky 0 or 11 and covered sky 15. All use horizon line 15, band 7 and ground 6. The scripted relocations from tables at `993c`, `9940` and `9944` stay within the 251 reachable squares. Five squares are sealed by nonpassable walls, including `(3,7)`. A sweep of the 1,540 reachable camera and palette combinations accounts for 49 previous candidates visible only under impossible palettes or from sealed squares. The existing Textile House arrival remains accounted for.

- Eight paired Podol Plaza captures match all 968 visible bundled and GOG 1.3 cell hashes. The southwest arcade and the lane to the healer both draw covered sky 12. This profile accounts for the five previously unmapped scope 18 artwork keys, including three from the actual healer route. It also adds a composed canopy fingerprint to the bundled catalogue.

- The Valjevo archive and chapel use covered sky 15 and open sky 11 before hour 14, then sky 0. ECL5 block 4 sets these at `9a5f`–`9a78`; block 6 sets them at `9b19`–`9b32`. Paired native captures confirm the three palettes and horizon line 15, band 7, ground 6. For map 6, the recorded party save at `(14,4)` connects to 239 squares. Of 24 previous map 6 candidates, 23 require a covered sky in open views and one requires daylight in a covered view or a disconnected void. The map 4 artwork spans the open and covered poses. Its isolated boundary routes are still tracked through the existing reachability evidence.

- The middle wilderness does not set its own open sky. Sky 14 comes from Valhingen's storm at `9c27` and vampire approach at `b1ec`, the only native script that writes that open palette. Both paths reset it, and the only Valhingen exit to the middle wilderness sets open sky 0 at `9914` before its transfer at `9944`. The woodland worklist therefore excludes inherited sky 14 from ordinary map 26. Daylight from other districts is still a valid inherited state.

- Podol's follow-up verified the same horizon line 15 and band 7 in paired night captures and after the Kuto and Textile approaches. Podol does not write `c05f`. The line-0 candidate `tile:18:86e0dc45d7f030b3cfa99416dd87b45d0f990b58a930c177a57ca5f41eabcdc9` resolves to the existing line-15 binding at `(15,10,S)` in both source and bundle. Existing roof variants 0, 11 and 12 remain covered by the catalogue, with the roof 0 state replayed on foot from Textile House.

- Native Valjevo captures show the Slums wall bank `2,4,1` from archive 2 mounted over physical archive 5 maps. The scope 3 outer castle maps this bank on GEO5 map 3, while the regular dungeon transition also shows map 5. Scope 7 uses the inherited bank on its natural Pool room arrival and in the covered room and exterior. The worklist accounts for 15 prior scope 3 keys and 58 prior scope 7 keys via this mounted bank. Paired natural replays also observe the Pool exit arriving at map 3, square `(13,15)`, while scope 7 still reports. Other bank and handoff combinations remain in the inventory pending route verification.

- Under scope 5, paired live dungeon routes show the inherited archive 2 bank on physical maps 3, 4, 5, 6 and 7. The scope 5 stair landing on physical map 7 also occurs with the local archive 5 bank. Both older merchant aliases are genuine active wall materials on the borrowed landing. Their foregrounds are symbols 162 and 168 in wall face 6. The geometry audit accounts for all 62 previously untracked scope 5 bindings.
