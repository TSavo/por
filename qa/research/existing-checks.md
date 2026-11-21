# Existing verification surface

_Research pass on 2026-11-21. Read-only. Line numbers refer to the tree at that time._

Nothing in the repo today shows that the translated game's frames or state match the real DOS executable. Every replay compares against expectations the port wrote itself, against the original data files, or against its own earlier recording. The one check that executes original code (the Unicorn script) covers only the sound driver's interrupt handler.

I did not run any verifier, because they create temp files or launch processes. All durations are inferred from the code. Tags: **[code]** = read in source, **[doc]** = stated in docs, **[inf]** = my inference.

**The working tree changed while I worked.** At 07:47 commit `69a6f159` ("Keep the journal out of Classic and save the map with the slot") took in all the local changes you listed: automap.ts, verify-automap.ts, verify-map-journal.mjs, live-input.ts, play.js, browser-play.ts and the rest. `git status` now shows only an untracked `/Users/tsavo/por/tools/qa-inventory.ts` (07:48, 87 lines). It reads `qa/checks.json` and `qa/inventory/*.json`, neither of which exists. Its header documents an `npm run qa:inventory` script that is not in package.json. I did not create it.

---

## 1. Verifier entry points

**Inside `npm run verify`** (`/Users/tsavo/por/package.json:39`; a chain of six, stops at the first failure):

| Entry | Needs | Time [inf] | What it asserts |
|---|---|---|---|
| `/Users/tsavo/por/tools/verify-translation-coverage.ts` | START.EXE and GAME.OVR (throws without them) | seconds–tens of s (imports all translated modules) | Every `55 89 E5` / `55 8B EC` prologue in resident code and in each overlay slice has a translated procedure. Structural only. |
| `/Users/tsavo/por/tools/verify-translation.ts` | Game data (several checks silently skip without it), `typescript` dev dependency, `upgrades/` PNGs and manifests, `src/maps/atlas.json` | tens of s–minutes (loads ~8k art mappings) | See §2. |
| `/Users/tsavo/por/tools/verify-automap.ts` | GEO3.DAX; writes and deletes a temp directory | seconds | Map tiles take GEO3 walls; floors (mapId) kept separate; off-map and no-wall tiles not recorded; labels trimmed and cut to 40 characters; save-slot round trip; `adopt` never overwrites; malformed records dropped (L14–104). |
| `/Users/tsavo/por/tools/verify-original-audio.ts` | START.EXE only | seconds | Every reachable event has 4 nonzero channel entries. Event 2: PC 242 ticks; Tandy 194 ticks, 2,134 writes, all to port 0xC0, 11 on the last tick. WAV/VGM headers valid. All 20 events × 2 modes produce writes and terminate (13–15 exempt). The expected numbers come from the port's own decoder, so this is a regression check, not ground truth [inf]. |
| `/Users/tsavo/por/tools/verify-enhanced-audio.ts` | `audio/enhanced/*` (tracked) | seconds | Plan metadata; one entry per reachable effect; WAV is 44.1 kHz mono 16-bit with the exact duration and the approved sha256; scores 13 and 14 are MP3s with approved hashes. |
| `/Users/tsavo/por/tools/verify-voice.ts` | `audio/voices/*`, `src/audio/*.json` | seconds | JSON cross-consistency (manifest, inventory, plan, prompts, dispositions); every line's file exists with a WAV/MP3 signature. Also asserts static hardware facts recorded in fish-runtime.json (L129–137). |

**Other npm scripts:**

| Entry | Needs | Asserts |
|---|---|---|
| `verify:translation-reproducible` (`python tools/tp_translate.py --check`) | Interpreter named `python`, capstone, START.EXE and GAME.OVR under `POR_GAMEDATA` or `./gamedata` (plus one subdirectory level, tp_translate.py:911–918) | Regenerates into a temp directory and diffs against `src/translated` (L866–905). Proves the generator is deterministic, not that the translation is correct. |
| `verify:campaign`, `verify:campaign-opening` | See §3 | |
| `verify:map-journal` (`/Users/tsavo/por/tools/verify-map-journal.mjs <chrome> <campaign-opening dir>`) | Chrome, game data, and the slot C output of `verify:campaign-opening` | Two Chrome legs. An older slot knows 1 tile; walking adds tiles; `:map-label` is stored; the original Camp menu has no "Journal"; J opens and closes the journal in Enhanced; the label is saved in E.json; Classic hides the journal toggle and J does not open it; reloading E restores the label (L38–80). |
| `verify-narration-runtime` (`/Users/tsavo/por/tools/verify-narration-runtime.ts`) | Nothing external; synthetic CPU memory | Narration catalog and queue logic, plus real-manifest selectors (Sokal a972, menu operands, continuation, dynamic ORCS, the 27 encounter-menu variants, typed confirmations). Never runs the game. |
| `verify-narration-generation` | `audio/voices/narration` MP3 and TXT files | Every queued item has an MP3 with a valid signature and an exact transcript; no duplicate ids, outputs or content. Files touched within 15 s count as "in progress", not failures. |
| `verify-voice-master` (verify-master-voice-manifest.ts) | JSON only | Extraction ↔ master manifest consistency. |
| `audio-coverage`, `audio-system-coverage` | Default `POR_AUDIO_DIR=../por-assets/original`, outside the repo | Exit 1 if any PC WAV, Tandy VGM or Tandy WAV is missing; system coverage also fails on missing Enhanced or narration files. They fail from a clean checkout without por-assets. |
| `voice-coverage` | — | Report only; writes `out/voice-coverage.json`; no failure condition. |
| `selftest` (`/Users/tsavo/por/tools/cli.ts:39–82`) | — | RLE, picture decode, ECL "HELLO", disassembler, PNG signature. |
| `typecheck` | — | `tsc --noEmit`. |

**Not wired to npm:**
- `/Users/tsavo/por/tools/verify-fresh-party.mjs`: see §3.
- `/Users/tsavo/por/tools/verify-slums-presentation.mjs`: see §4.
- `/Users/tsavo/por/tools/validate-original-driver-unicorn.py`: needs Python, `unicorn==2.1.4` (`tools/requirements-audio-validation.txt`), START.EXE, and generated trace JSONs from `npm run render-original-sounds`. See §5.
- `/Users/tsavo/por/tools/validate-static-narration-selectors-ecl1-3.mjs`: JSON consistency only.
- `/Users/tsavo/por/tools/route-art-coverage.ts`: report generator from a tile trace plus a manifest. It throws only on malformed input and prints matched/pattern counts.

---

## 2. `/Users/tsavo/por/tools/verify-translation.ts`: each check

Run order: L447, 473, 518–519, 546, 566, 607, 642, 1531–1546.

| Log line (line) | Backing code | What it really tests |
|---|---|---|
| "verified Turbo Pascal Val sign handling" (444) | `checkVal`, L424–445 | Translated `exe_06a35` parses `200`, `+200`, `-200`, `$C8`; the stack is balanced. |
| "verified original sound calls and audio-port writes are recorded deterministically" (470) | L449–471 | The recorder captures a far call to 27f:0 (index, mode, caller) and writes to ports 0x43 and 0x42, but not 0x3c4. |
| "verified sys5bb_16b5 FillChar" (491) | L475–492 | FillChar writes 4×0x7e. |
| "verified ovl07_0000 ECL operand fetch" (515) | L494–516 | Code and low bytes are read with offset wrap; 0x494e advances to 0x9902. |
| "verified ADC and SBB carry, borrow, and signed overflow" (543) | L521–544 | Exhaustive 8-bit and sampled 16-bit flag math on the Cpu helpers, not on translated code. |
| "verified original Crt retrace wait and text write" (563) | L548–564 | `exe_056c0` writes 0x0741 to B800:2 after at least 100 steps. |
| "verified DOS party files switch with the selected save slot" (604) | L568–605 | Party-file naming; the DOS layer mounts a slot's companion files on first read; slot B does not reuse A's. |
| "verified Sokal journal progression against the translated ECL setter" (639) | L609–640 | Translated `ovl07_0c93` writes 254/255 to 0x4aa7, giving journal statuses ready-to-report and turned-in. |
| "verified Turbo Pascal long division…" (1541) | L1531–1540 | `exe_05e44` on 50552, 200000, −50552 ÷ 1000. |
| "verified 20 journal definitions against original ECL dialogue and 16 progress flags…" (1528), or "campaign dialogue checks skipped" (647) without game data | `checkCampaignJournal`, L644–1529 | Disassembles all ECL*.DAX. For each commission, the offer, accepted, alternate and report triggers exist in the ECL text and give the expected status (L684–723). The council ON GOSUB at 0x9d63 pairs each flag with its report text, and the setter's 254/255 move the status. The Slums 25-encounter counter is at 0xb6ad (L670–683). Then about 60 per-quest scenarios (L724–1527): Mendor, auction, Stojanow Gate, Grishnak/Textile, Cadorna, graveyard/bottle/vampire, Zhentil, river/pumping, temple dispatch, Kovel, kobolds, rescue, swamp, council assignment, Sokal routes, Ohlo, Nomads, library entries, Valjevo disguise, castle completion and ending. |
| "verified Valjevo wall pixels for grouped and standalone loads" (384) | `checkValjevoWallMount`, L358–385 | The mounted WALLDEF5/8X8D5 resolve to the same tile pixels as the original grouped set. Returns silently if there is no game data or the data already has record 25. |
| (no log line) | `checkExplorationGlyphMask`, L397–422 | On synthetic memory, the exploration capture keeps see-through, black and white distinct. |
| "verified N illustrated atlas plates" (48) | L35–48 | The PNG parser rejects truncated or CRC-corrupt files; every `src/maps/atlas.json` plate is a valid PNG. Runs without game data. |
| "verified 8 distinct reward cues at the shared council pause" (354) and "verified N browser art mappings against the game data, PNG dimensions, and chunk checksums" (355) | L49–353 | Needs game data (returns at L68 otherwise). Manifests have no duplicate keys; Phlan overland route; combat material masks; 19+8 COMSPR effect matches with a 1-pixel negative; zombie (PIC4 #35) and Bane rampart portrait scoping; every declared mapping loads (the loader validates the source frame against DAX data and the PNG header, `/Users/tsavo/por/tools/upgrade-art.ts:69–140`); ogre approach anchor; Al-Hyam strike scope; RANDCOM props; giant lizard aim and clipping; ready poses; Pitt duelist; Yarash mutant pixel negatives; council cue illustrations. |
| "translation checks passed" (1546) | — | Printed at the end. |

---

## 3. `/Users/tsavo/por/tools/verify-fresh-party.mjs`

**How it replays** [code]:
- `replay()` (L34–97). Campaign modes drive Chrome through `/Users/tsavo/por/tools/chrome-campaign-replay.mjs`: browser-play.ts plus headless Chrome, Enhanced forced, `:poll` suppressed (L121–126). Each frame is reduced to `{sequence, text, journal}` (L130–135), so campaign assertions see screen text and journal only, never art.
- Each Chrome leg keeps `boot.json`, `commands.jsonl`, `keys.txt`, `runner.log`, the input saves, and an `end-frame.json` written at L46.
- Every other mode spawns `tools/boot-translated.ts` headless, with no browser and no Enhanced rendering, and a 90-second kill timer per leg (L66).
- Boot sequences: fresh start is `31000000:1c0d,45000000:2e63` with live input at 50M steps. Loading slot X is `31000000:1c0d,45000000:266c,52000000:<slot word>` with live input at 85M (L149–151, L3053+). `POR_PREGEN_PARTY=0` throughout.

**Campaign modes** (argv `--campaign`/`--campaign-opening`, then `<chrome>`, then option; validated at L20–23):

| Mode | Start | Route | Developer victory | Clean checkout + files + Chrome? |
|---|---|---|---|---|
| `--campaign-opening` | Empty save dir | Create 6 dwarf fighters, add them, Rolf's tour, save A → reload into the Slums → arms shop, hand axe and chain mail ×6, save B → reload and check gear, save C at the gate → kobold fight with 13×Quick, 5 XP, save D → reload D (Alda: 11 copper, 5 XP) (L3076–3144) | No | Yes |
| `--campaign` (no option) | Empty | Opening, then Ohlo (accept → Rope Guild → potion → 691 XP, turned-in, L3290–3397) → council (hears Sokal) and boat → Sokal reeds and parchment, patrol (SHESTNI), frog fight 81×q, old armory, hidden armory loot and readied gear (L3445–3550) → barracks diary, temple healing, evoker hire, evoker return past the patrol, courtyard staging and Brin's first combat turn (L1444–1515), then exit (L3553–3556) | No | Yes |
| `--full` | Empty | Below | **Yes ×3:** courtyard L3191, bronze dragon guard L2874, Tyranthraxus L2887 | Yes |
| `--from-slums <D>` / `--finish-from-slums <D>` | Slot D | D reload, then the `--campaign` remainder / the `--full` remainder (L3137, 3281) | No / Yes | D comes from campaign-opening |
| `--finish-from-sokal <F>` | F (L3282) | Castle approach, tower, ending | Yes (2) | F comes from `--full` leg 7 |
| `--finish-from-tower <H>` | H (L2962–2965) | Continuous ending | Yes (2) | H from `--full` |
| `--from-sokal <A>` | A | Arrival reload, Sokal Keep, next chapter (L1627–1633) | No | A from `--campaign` |
| `--from-sokal-armory <F>`, `--from-temple <G>`, `--from-evoker <H>`, `--from-sokal-patrol <J>` | F / G / H / J | Tail segments of the `--campaign` route (L1635–1658) | No | Produced by `--campaign` [inf] |
| `--from-sokal-trained <J>` / `--from-sokal-courtyard <C>` | J / C | Trained courtyard win with original Quick + Alt-M (648 XP) → Ferran → boat → council (7,850 XP, turned-in) → healing, two raises, lodging → Podal auction → Textile commission (L1660–1668) | No | Trained J is produced by no mode in this file [inf] |
| `--from-sokal-council <H>`, `--from-sokal-lodging <E>` | H / E | Recovery; Podal → council → Textile accepted (L1670–1680) | No | Chained from the previous |
| `--from-textile-commission <A>` | A | West ferry, Textile House, scorpions and hobgoblins via original Quick, drum silenced (L1689–1726) | No | Checkpoint |
| `--from-bane-preparation <A>` | A | East gate, parley with the orc patrol, Temple of Bane, trapdoor cache (Dust of Disappearance) (L1728–1772) | No | Checkpoint |
| `--from-castle-ending <B>` | B | Original Tyranthraxus fight (32×q, 917 XP), City Hall 67,500 XP, journal ready → pending → turned-in, track and reload twice (L2861–2959) | No | Checkpoint |
| `--from-castle-guards <B>` | B | Same, with both fights won by developer victory | Yes | Checkpoint |
| `--replay-leg <dir>` | That leg's saves | Replays `commands.jsonl` with `boot.json`, then deep-equals the final `{sequence,text,journal}` against `end-frame.json` (L119–133) | As recorded | Needs a recorded leg |

**Headless modes** (argv[2]; no Chrome; never developer victory, since `fromCastleGuards` is campaign-only at L2961):
- **Fresh start, no checkpoint needed:**
  - Default (no argument): opening, Ohlo, Sokal, temple, courtyard defeat, evoker, two recruits, north courtyard defeat, then a mixed party with a magic-user casting Sleep (L3558–3769).
  - `--fresh-armored-slums` / `--fresh-sokal-reinforced` (L3399–3413).
  - `--startup-scenes` (L2987, asserts publisher → title → none).
  - `--character-sheet` (L2998, head/body art keys).
  - `--character-icon-editor` (L3019, 18 editor frames with no perspective view or tiles).
- **Checkpoint required.** Each copies `argv[3]` into the named slot; line numbers are where each block starts:
  - `--slums-armored-patrols` B (1009)
  - `--sokal-equip-recruits` J (1041)
  - `--sokal-reinforce-from-slums` D [`--fight-to-end`] (1098)
  - `--slums-goblin-sale` C (1131)
  - `--slums-goblin` A (1167)
  - `--ohlo-armor` J (1193)
  - `--slums-orcs` C (1200)
  - `--sokal-patrol-victory` J/A [`--reject-word`, `--equipped`] (1276)
  - `--sokal-restored-council` G (1893)
  - `--sokal-patrol-word` F (1909)
  - `--sokal-tracked-ambush` J [`--replenish-curate`] (2023)
  - `--sokal-armory-reinforcement` E [`--equipped`, `--return-to-courtyard`] (2031)
  - `--sokal-recovered-courtyard` G [`--warrior-and-theurgist`, `--evoker-fight-to-end`] (2046)
  - `--sokal-armory` D (2114)
  - `--sokal-smithy` D (2122)
  - `--sokal-funded-training` F (2128)
  - `--sokal-restored-arena` G (2160)
  - `--fighter-training-journal` A (2193)
  - `--mage-training` B (2200)
  - `--valjevo-forge` B (2250)
  - `--genheeris-deal` B (2272)
  - `--restal-seal` C (2296)
  - `--restal-route` C (2319)
  - `--slums-fortune <ckpt> warning|power|riddle` B (2350)
  - `--kovel-files` A (2374)
  - `--zhentil-tour` A (2398)
  - `--bane-entry53` A (2424)
  - `--textile-diary` B (2453)
  - `--textile-prison-alternates` E (2487)
  - `--textile-prison-key` E [`--through-ogre`] (2531). This one edits the save; see §7.
  - `--textile-grishnak` I [`--healed-sleep`] (2541)
  - `--textile-courtyard` F (2581)
  - `--sokal-ferran` / `--sokal-altar` F/G [`--continue-to-auction`, `--through-textile-prison`] (2588)
  - `--textile-sealed-return` D / `--textile-opened-return` E [`--train-after-reward`] (2741)
  - `--castle-ending` B [`--save-at-west-gate`] (2967)
  - `--podal` H [`--auction-only`, `--through-textile-prison`] (2977)

  Each asserts the screen-text regexes and journal ids printed in its `console.log` lines.

**What `--full` actually plays** (L3076–3139, 3171–3288, 2861–2944; 11 Chrome legs):
1. Six legs of the opening, as in `--campaign-opening`.
2. Load D (developer victory on): passenger dock, boat to Sokal, parchment, patrols with SHESTNI, courtyard orcs via `:win-combat`, journal entry 57, parley with Ferran ("lux" → SAMOSUD), patrols out, boat back, City Hall reward. Asserts `commission-sokal` turned-in (L3212); save F.
3. Load F: west ferry, Podal Plaza (disguise prompt only, auction not attended), rest until the trader's hour, "grab his wagon" prompt answered with "c" (no developer victory in this leg), pay the gate guard, Stojanow Gate opens, Valjevo; save G.
4. Load G: hedge maze, password RHODIA, cut the thorn hedge, secret door, tower stairs; save H.
5. Load H: bronze dragon guard and Tyranthraxus via `:win-combat`; west gate; City Hall "your quest is over"; asserts `commission-castle` turned-in (L2909); save I.
6. Reload I: "Phlan is free" and the victory lead; slot I's bytes unchanged (L2921–2944).

**Commissions in `--full`:**
- **Asserted (2 of 20):** sokal, castle.
- **Area visited, commission never asserted:** slums (one kobold fight; the council is never visited first), gate (passed by paying the guard), auction (Podal Plaza traversed, auction not attended). Up to 15 Enter presses at L3211 may show further council dialogue, but nothing is checked [inf].
- **Never touched:** records, textile, bane, kovel, nomads, kobolds, river, lizardmen, rescue, zhentil, graveyard, cadorna, ohlo, bottle, bottle-vampire.

**Across all verifiers:** fresh-party asserts sokal, ohlo, auction, textile, slums (L1840–1859), kovel (L2382) and castle. The presentation verifier adds bane, bottle, bottle-vampire, kobolds, lizardmen, nomads, records, rescue, river and zhentil. **No replay asserts the status of commission-graveyard, commission-gate or commission-cadorna**; only the static ECL check in verify-translation covers them.

---

## 4. `/Users/tsavo/por/tools/verify-slums-presentation.mjs <checkpoint> <chrome> <route> [option]`

**How it runs** [code]:
- It copies the checkpoint to the route's slot (slot rules at L5381 and L5390–5395), boots browser-play with `POR_TRACE_TILES=1` on a fixed port 43212 (L5409; set `POR_PLAY_PORT` to run in parallel), and opens headless Chrome with `--disable-gpu`.
- **Only `new-phlan-rolf-approach` runs from a fresh game** (L5188, 5407, 5448; pass `-`). Every other route needs a slot JSON.
- `sokal-floorboard-diary-reload` reads its slot letter from the checkpoint's `name` field (L5386–5389).
- `sokal-courtyard-note` turns on `POR_DEV_COMBAT` and uses `:win-combat` (L5449, L7730).

**Shared assertions** [code]:
- `switchBothWays` (L5628–5652, 284 call sites): Classic hides the overlays and shows the guest frame at 8:5; Enhanced is 4:3; `/state` is deep-equal before and after; the save file is byte-identical.
- `verifyTiledView` (L5684–5703, 57 sites): 121 guest-derived tiles each placed as a `tile:<area>:` replacement, plus WebGL camera data.
- `verifyPortraitPanel` (L5614–5626, 135 sites).
- 66 asserts that the save is unchanged, 5 that it changed.

**Route tables: 1,045 unique names, each table matching one Enhanced feature:**

| Table (lines, count) | Feature | Slots required |
|---|---|---|
| `encounterRoutes` (43–667, 79) | Encounter sprites: source frame, screen anchor, 4× size; 13 also require WebGL; dialogue portrait; battle start; accepted commission | A44 B28 C2 I4 J1 |
| `illustrationRoutes` (674–2962, 283) | Portraits and scene illustrations (352×352 in the panel); many also check journal leads; several write the "native saves" that `-reload` routes then consume | A135 B112 C11 D1 E2 F7 I16 J5 |
| `combatPoseRoutes` (2984–4137, 197) | Combat art: ready and strike poses at 96×96, reflection, palette recolor, party icons | A58 B111 C4 I6 J4 |
| `ferryRoutes` (4139–4148, 2) | Ferry animation and New Phlan landing views | A1 B1 |
| `outskirtsRoutes` (4150–4157, 3) | Outskirts terrain; `--map-travel` / `--map-destination` | — |
| `environmentRoutes` (4160–5187, 249) | WebGL exploration and tile art (view and pattern counts) | A148 B72 C1 D3 H3 I5 J17 |
| `atlasRoutes` (5214–5217, 2) | Atlas and automap: automatic plate selection, Local party marker, Classic isolation (L5907–5925) | J, A |
| `districtTravel` (5222–5249, 26) plus `moonsea-*` | Moonsea fast travel: the host sends only original keys and stops at native prompts or combat; the Lizardman route also forces a WebGL context loss (L5705–5906) | Checkpoint |
| Explicit list (5189–5279, 204) | Mixed: effects, projectiles and manual aim; reload/journal checks; quest flows | Computed at L5381 |

Options (L5352–5375): `--terrain-only`, `--manual-party`, `--repeat-stampede`, `--classic-portrait`, `--approach-only`, `--council-finale`, `--webgl`, `--map-travel`, `--map-destination`, `--decline` (8 routes), `--fight`, `--refuse-to-leave`.

**Coverage by Enhanced feature:**
- **Narration and audio: no route asserts narration or sound playback.** The only audio check is the volume slider UI (L6094–6100, inside `new-phlan-building-exit`).
- **Display switching:** almost every route, via `switchBothWays`.
- **Save/reload:** 45 `*-reload` / `*-save` routes.
- **Default `kobolds` route:** WebGL plus tiles, encounter sprite, portrait, layout at 430 and 1100 px, web font, journal focus kept across a switch, kobold facings, original menu colors, missing-sprite fallback, Alt+Q (L12802–12948).

**Routes by area** (name-prefix counts): valjevo 134, new-phlan 71, valhingen 55, tyrmor 46, stojanow 46, kobold 46, slums 42, bane 42, mendor 39, sokal 35, podal 35, moonsea 33, wild-cave 32, buccaneer 32, zhentil 31, textile 30, swamp 29, kuto 27, party-* icons 33, old-phlan 24, pyramid 21, nomad 20, graveyard 18, kovel 12, river 11, lizard-wilds 11, lizardfolk 10, diogenes 8, yarash 7, wilderness 7, north-gate 6, phlan-* 20, misc 15.

**Complete name lists:**
- Explicit: armorer assault-briefing bane-altar bane-cell-inscription-reload bane-gate bane-goblins bane-hidden-treasure bane-reward bane-symbol bivant-reward bivant-reward-reload braccio-dirten-briefing buccaneer-approach buccaneer-arrow-down buccaneer-bivant-escort-combat buccaneer-bivant-punch buccaneer-bivant-purchase buccaneer-bivant-purchase-reload buccaneer-empty-manual-aim buccaneer-oil-flask buccaneer-pen-defeat-effect buccaneer-sling-shot cadorna-envoy-briefing castle-dragon castle-ending castle-halls diogenes-advice diogenes-cave diogenes-upper-ledge-fireball-reload fighter-trainer goblins graveyard-mystic graveyard-vampire graveyard-wolves kobold-cave kobold-cave-efreeti-dialogue kobold-cave-escort kobold-cave-guide kobold-cave-wyvern-dialogue kobold-escort-arrival-reload kobold-king-door kobold-king-door-reload kobold-king-fall kobold-king-fall-reload kobold-king-leave-caves kobold-king-return-council kobold-king-return-council-reload kobold-king-return-council-save-pier kobold-king-return-throne kobold-king-reward kobold-princess-fatima kobold-princess-fatima-reload kobold-royal-ballista kobolds kovel-castle-map-ne kovel-castle-map-ne-reload kovel-castle-map-nw kovel-castle-map-nw-reload kovel-chase kovel-chase-attack kovel-chase-decline kovel-chase-east kovel-chase-east-reload kovel-chase-no kovel-guild-files kovel-jail-enemy-turn kuto-bandit-cache-reload kuto-norris-surrender kuto-norris-surrender-reload kuto-well-waterline-reload kuto-wide-manual-aim lizardfolk-battle-wall mendor-library-stacks mendor-records-reward mendor-records-reward-reload moonsea-lizardman-travel moonsea-quest-locked moonsea-sokal-decline moonsea-sokal-fare moonsea-sokal-free moonsea-valjevo-arrival moonsea-valjevo-gate-warning new-phlan-arena-manual-report new-phlan-arena-quick new-phlan-building-exit new-phlan-council-magic-effects new-phlan-council-reflected-effects new-phlan-council-reward-reload new-phlan-rolf-approach nomad-camp-approach nomad-camp-sentries nomad-feast-decline nomad-headman nomad-headman-decline-reload nomad-headman-raid nomad-headman-rest-portrait nomad-headman-rest-reload nomad-headman-stay nomad-reward old-phlan-seer old-phlan-seer-reload orcs phlan-harbor-routes phlan-harbor-sokal phlan-priest-tempus phlan-priest-tyr phlan-priestess-joy podal-infirmary podal-infirmary-heal podal-plaza podal-shrine podal-shrine-return pyramid-lizardfolk-vats river-approach river-exit river-fountain river-passage river-passage-reload river-pumping river-pumping-hostile river-pumping-reload river-return river-return-reload river-reward slums-fortune slums-mage-wand slums-potion-booth slums-potion-booth-reload sokal-armory sokal-courtyard sokal-courtyard-note sokal-elven-scout sokal-elven-scout-search sokal-floorboard-diary-reload sokal-landing sokal-patrol-combat sokal-smithy stojanow-briefing stojanow-bugbears stojanow-trader stojanow-wagon-handover-reload stojanow-wall-warning stojanow-wall-warning-reload swamp-approach swamp-approach-reload swamp-elder swamp-elder-decline swamp-return swamp-reward swamp-reward-reload textile-altar textile-ogre textile-reflected-arrow textile-restal textile-return-art textile-stinking-cloud tyrmor-journal-reload valhingen-crypt-scroll valhingen-crypt-scroll-reload valhingen-first-arrival-reload valhingen-mummy-sarcophagi valhingen-zombie-roam-animation valjevo-al-hyam valjevo-al-hyam-release valjevo-al-hyam-release-reload valjevo-al-hyam-reload valjevo-bane-chaplain valjevo-cadorna-alarm valjevo-cadorna-alarm-reload valjevo-cadorna-captive valjevo-cadorna-hedge valjevo-cadorna-killed valjevo-cadorna-reload valjevo-dungeon-kitchen valjevo-dungeon-reload valjevo-dungeon-save valjevo-dungeon-sentry valjevo-false-throne valjevo-forge-authorization valjevo-forge-authorization-reload valjevo-forge-smith valjevo-genheeris-bargain valjevo-genheeris-orders valjevo-giant-patrol valjevo-maze-watch valjevo-party-defeat-effect valjevo-records valjevo-records-decline valjevo-records-reload valjevo-records-revisit valjevo-records-scribe valjevo-scriptorium-authority valjevo-scriptorium-password valjevo-scriptorium-reports valjevo-scriptorium-reports-reload valjevo-tower-reload valjevo-tower-save yarash-combat yarash-desk-papers-reload zhentil-envoy zhentil-escape zhentil-return zhentil-reward zhentil-trespass
- districtTravel: moonsea-stojanow -kuto-well -slums -city-hall -city-hall-locked -training-hall -mendor-library -new-phlan-east -new-phlan-dock -new-phlan-east-dock -kovel-east -kovel-north -textile -graveyard-from-phlan -north-approach -east-approach -west-approach -docks -nearest-approach -pyramid -diogenes -buccaneers -zhentil -nomads -kobolds -combat-handoff
- Atlas: kuto-catacombs-atlas bane-interior-atlas · Ferry: phlan-ferry-east phlan-ferry-river · Outskirts: phlan-outskirts-north/-east/-west
- Encounter (79): valjevo-barracks-waking-giants bane-temple-exit-retaliation lizard-wilds-drider-approach lizard-wilds-merchant-approach kuto-sickly-kobold-scouts buccaneer-pen-guard-gate textile-skullcrusher-approach textile-poison-frog-approach valjevo-bucket-trap-giant swamp-drythh-followers swamp-ruin-defenders kobold-net-trap kobold-roof-collapse kobold-kings-quarters kobold-throne-ballista podal-pitt-monster-patrons wild-cave-rearing-snake-approach phlan-ruins-scorpion-approach podal-plaza-wandering-goblin podal-recruit-assembly podal-shrine-recruiter-approach slums-orc-clash slums-goblin-lesson-approach swamp-giant-lizard-approach wild-cave-wyvern-approach slums-hobgoblin-ringleader-approach slums-hobgoblin-gold-room-approach sokal-courtyard-hobgoblin-approach textile-ogre-war-chief-approach slums-ohlo-study-approach yarash-study new-phlan-city-watch-approach new-phlan-arena-master-approach bane-captive-goblin-approach valjevo-bane-chaplain-approach valhingen-mummy-approach kuto-norris-approach mendor-fighter-approach pyramid-vats-lizard-approach stojanow-patrol-fighter-approach wild-grove-pool-lizard-approach wild-grove-captive-kobold-approach wild-cave-giant-lizard-approach wild-cave-lizard-charge wild-cave-gnoll-approach wild-cave-thri-kreen-approach wild-cave-thri-kreen-two-guards wild-cave-thri-kreen-three-warriors wild-cave-boar-approach wild-cave-boar-sow lizard-wilds-displacer-approach lizard-wilds-stirge-approach old-phlan-lizard-patrol-approach bane-ogre-approach valhingen-zombie-approach valhingen-zombie-roam-dialogue valhingen-ghoul-approach kobold-cave-approach valjevo-medusa-approach valjevo-fire-giant-approach wild-cave-ankheg-approach textile-hobgoblin-approach sokal-poison-frog-approach valhingen-wight-approach valhingen-wight-tower-approach valhingen-conjurer-skeleton valhingen-conjurer-zombie valhingen-conjurer-wight valhingen-spectre-approach-near valhingen-spectre-approach valjevo-giant-snake-approach mendor-basilisk-approach kobold-cave-efreeti-approach old-phlan-sword-thief-approach valhingen-vampire-return-approach stojanow-bugbear-approach bane-orc-guardroom-approach kobold-cave-wyvern-approach valjevo-troll-approach
- Environment (249), illustration (283) and combat-pose (197): every `^  ["<name>", {` key in the line ranges above (813 map keys in total). Reproduce with: `awk 'NR>=43&&NR<=5187&&/^  \["[a-z0-9-]+", /' /Users/tsavo/por/tools/verify-slums-presentation.mjs`. Examples: environment `new-phlan-landmark-inn`, `slums-courtyard-east`, `valjevo-tower-halls`, `wilderness-waystone-ridge`; illustration `sokal-pale-form-arrival`, `tyranthraxus-join-vote`, `podal-auction-*-phases`; combat `party-*-icon-combat`, `valjevo-tyranthraxus-strike`, `graveyard-mystic-combat`.

**Do the checkpoints exist? No.**
- There is no `[A-J].json`, `roster.json`, `SAVGAM*`, `commands.jsonl` or `end-frame.json` anywhere in the repo.
- `/Users/tsavo/por/out` holds only adventure-journal.json/png, adventure-log.txt, por-boot.png and voice-coverage.json.
- The sibling `/Users/tsavo/por-assets` (a separate repo, not part of the release) has `pool/SAVGAMA.DAT` (the DOS release's own save) and `pool/SAVE/{CHARLIST.TXT,EGG.CHA,EGG.SPC}`, but no browser slot JSONs.
- Docs refer only to `PATH_TO_SLOT_X`, "local checkpoints" (`/Users/tsavo/por/docs/MAP-CONCEPTS.md:65`), "controlled saves" (`/Users/tsavo/por/ROADMAP.md:30,51,144`; `/Users/tsavo/por/docs/COVERAGE.md:542,1114,1664,2990`) and "local test fixtures" (COVERAGE.md:3720,3824).
- **[inf]** Some slots could be regenerated from verify-fresh-party output directories, but no code maps a route to the command that produces its checkpoint.

---

## 5. What compares Classic against the original?

| Item | What it compares | Proves translated = DOS? |
|---|---|---|
| `/Users/tsavo/por/tools/validate-original-driver-unicorn.py` | Runs the original resident sound ISR bytes (START.EXE 0x49AD, exits 0x49E4/0x49F2) under Unicorn tick by tick and compares port writes with trace JSONs made by the hand-decoded `/Users/tsavo/por/src/audio/original-driver.ts`. It seeds the channel records itself (L52–59) instead of running the original event loader. Report `/Users/tsavo/por-assets/inventory/original-isr-validation.json`: 38/38 exact. Not in `npm run verify`. | No. It validates the audio decoder, not the translated game. |
| `tp_translate.py --check` | Generator vs checked-in output | No (determinism only) |
| verify-translation-coverage | Prologue scan of the original binaries | No (structural) |
| Art and journal checks in verify-translation | Original DAX pixels and ECL text; translated setter `ovl07_0c93` | Data fidelity only, not runtime |
| talonius/bc-pool-of-radiance v1.1 | Used once, by hand, to name sound events (`/Users/tsavo/por/docs/AUDIO.md:106–113`; `src/audio/original-sounds.json` provenance). No tool references it. | No |
| Curse of the Azure Bonds / coab | Documentation cross-checks of formats and opcodes only (`/Users/tsavo/por/docs/ecl.md:5`, `docs/dax.md:3`, `src/lib/dax.ts:8`) | No |
| `/Users/tsavo/por/tools/export-dos-save.ts` | Writes one slot's DOS files to `out/dos-slot-X-*/SAVE`. COVERAGE.md:746–751: "verified all 23 files byte-for-byte… A matching run in the original executable is still pending." ROADMAP.md:142 lists it as open. | No |
| Golden frames / tapes / `end-frame.json` | `end-frame.json` and `keys.txt` are the port's own recordings. `/Users/tsavo/por-assets/traces/startup-menu-pc.json` is "generated … from the translated original runtime". | No (self-referential) |
| DOSBox or any full-system emulator | No references anywhere | — |

---

## 6. Determinism and replay machinery

- **Tape format:** `[step:]hexword`, separated by commas or whitespace. `POR_BOOT_KEY_FILE` contents come first, then `POR_BOOT_KEYS`, sorted by step (`/Users/tsavo/por/tools/boot-translated.ts:44–53`).
- **When a key is delivered:** at the first int 16h read where `cpu.steps >= step` (`/Users/tsavo/por/src/runtime/dos.ts:107–108`).
- **Blocking reads with no due key return Enter (0x1c0d)** (dos.ts:119–121). Before `POR_LIVE_AT`, every unscheduled blocking read is therefore an automatic Enter. This is not noted in any comment.
- **`POR_LIVE_AT`:** the first eligible keyboard call at or after that step blocks for a command (`/Users/tsavo/por/tools/live-input.ts:581–582`). Non-blocking polls prompt every 1M steps (L634, 674).
- **`POR_BOOT_STEPS`:** instruction budget (default 30M in boot-translated, 100M via browser-play, 450M in the verifiers). Each live key raises it by 150M (live-input.ts:28, 672).
- **`POR_RECORD_KEYS`:** must be a new file. It records the scheduled prefix, then `${cpu.steps}:${key}` per live key (boot-translated.ts:179–183; live-input.ts:668). Journal, track, `:map-label` and `:poll` stay on the host and are not recorded. A `:win-combat` is recorded only as the Alt-Q key, while its memory change (`winDeveloperCombat`) is not. So **replaying `keys.txt` alone diverges after a developer victory**. `--replay-leg` replays `commands.jsonl` with `developerCombat` instead.
- **`/state`** (`/Users/tsavo/por/tools/browser-play.ts:391–401`; fields L136–172) exposes the frame PNGs (classic and Enhanced), text cells and colors, scene, portrait, perspective, exploration position and walls, encounter, tiles, combat art, effects, battle tiles, animation, tile inventories, journal, travel, automatic-combat and developer-victory flags, plus sounds, messages and narrations (with step numbers), automap revision, sequence, ready, save-slot event, stopped and notice. **It does not expose CPU registers, guest memory, RandSeed or character records.**
- **Randomness in the guest:**
  - Turbo Pascal `Randomize` (`exe_068cb`, 5bb:0d1b) calls int 21h function 2Ch and stores CX:DX into RandSeed at DS:0x438a (`/Users/tsavo/por/src/translated/exe.ts:37138–37177`). Its only call is `ovl11.ts:5026–5030`, inside `ovl11_002d`. `Random` reads that seed (exe.ts:36979).
  - `exe_050e2` (504:00a2, called once from `ovl37`) also reads the clock's hundredths.
- **The host clock is synthetic:**
  - Get Time is a counter that starts at 12:00:00.00 and advances one hundredth per call (dos.ts:85, 147–157).
  - Get Date is fixed at 1988-06-01 (L140–146).
  - The BIOS tick byte at 0040:006C increments every 16 instructions, low byte only (`/Users/tsavo/por/src/cpu/machine.ts:51–57`).
  - The EGA status port 0x3DA/0x3BA is computed from the step count (`/Users/tsavo/por/src/runtime/video.ts:56–62`).
  - No `Math.random`, `Date.now` or `performance.now` in `src/` or the runner. The only `performance.now` is play.js's Quick-combat poll pacing (`/Users/tsavo/por/tools/play.js:1301–1306`); the guest is paused while it waits, so this should not affect results [inf]. The harnesses suppress `:poll` anyway (chrome-campaign-replay.mjs:121–126; verify-slums L5533–5542; COVERAGE.md:3280 "to keep the replay deterministic").
- **Is a replay deterministic run to run?** [inf] Yes, by construction, given the same files, saves, tape and command stream. The RNG seed is therefore a fixed function of boot timing, unlike DOS where it comes from the wall clock, so combat rolls never vary. Nothing checked in demonstrates a passing `--replay-leg`, and no leg artifacts exist under `out/`.

---

## 7. Known deviations from the original

1. **`CRT_DELAY_DEC_DX`** (image 0x53D8): the `dec dx` in Crt.Delay is emitted without flags, so every delay ends after one pass. `/Users/tsavo/por/tools/tp_translate.py:72–73, 772–778`; `/Users/tsavo/por/docs/COVERAGE.md:37–42, 701–715`; `/Users/tsavo/por/ROADMAP.md:119–122`.
2. **ECL hook inserted by the generator:** `onEclInstruction` calls are added around 0x360f in `ovl03_35db` (tp_translate.py:767–771). It observes only.
3. **`mountValjevoWallPieces`:** rewrites WALLDEF5/8X8D5 as served to the guest. It adds records 2 and 4 from the WALLDEF2/8X8D2 donors, swaps tiles 50↔111 and 51↔112, and adds a standalone record 25 (`/Users/tsavo/por/tools/gamedata.ts:25–87`). Applied on every boot (boot-translated.ts:37); checked by verify-translation L358–385.
4. **Pregen party staging:** with `POR_PREGEN_PARTY=1`, adds `SAVE\<NAME>.CHA/.ITM/.SPC` and appends to CHARLIST.TXT in the virtual DOS file system (`/Users/tsavo/por/tools/pregen-party.ts`). COVERAGE.md:505–508 says "in guest memory"; the code stages files. All verifiers set it to 0.
5. **Developer combat:** calls the original `ovl25_2266` with 255 damage on every active hostile, writing guest memory (`/Users/tsavo/por/tools/developer-combat.ts:18–56`). Gated by `POR_DEV_COMBAT=1` (live-input.ts:172, 584–587, 657–667; F9 at play.js:1381–1384). Used in `--full` ×3, `--finish-*`, `--from-castle-guards` and `sokal-courtyard-note`.
6. **Save edited by a verifier:** verify-fresh-party.mjs:818–832 appends the Brass Key record to `SAVE\CHRDATE2.ITM` in a copy of slot E. The docs also describe hand-edited controlled saves (COVERAGE.md:542–552 seeded the auction commission and "redirected one saved movement event"; :3720 and :3824 fixtures "select the … roll deterministically").
7. **Answers in `/Users/tsavo/por/src/runtime/dos.ts` that differ from real DOS:**
   - Synthetic time and fixed date (above).
   - DOS version reported as 5 (L127–131); current drive is C (L158–161).
   - Interrupt vectors: set is a no-op, get returns 0000:0000 (L132–139). No hardware interrupts are delivered, so the sound timer ISR never runs in the guest.
   - Memory: bump allocator; free and resize always succeed (L167–177). IOCTL returns 0 (L202–207).
   - Ctrl-Break and critical-error interrupts (int 23h/24h/1Bh) are ignored; Exit (function 4Ch) throws.
   - int 16h: blocking read with nothing due returns Enter; shift flags are 0.
   - Unhandled ports read 0xFF (machine.ts:175–176).
8. **Turbo Pascal `Intr` is hand-written,** not translated (`/Users/tsavo/por/src/runtime/intr.ts`, registered at 504:000b).
9. **Classic sound is not produced by the guest:** the browser plays pre-rendered WAVs and replaces the current sound on each request (`/Users/tsavo/por/docs/AUDIO.md:85–96`). The ISR and driver tables are untranslated (COVERAGE.md:30–34).
10. **Saves go to JSON slots, not DOS files:** the runner wraps the original save overlay's load/save procedures at 0x159d, 0x1ced and 0x2265 (boot-translated.ts:226–274). Companion files are mounted on the first read of a slot (dos.ts:252–255).
11. **Host-intercepted keys in Enhanced:**
    - J opens the journal, except in the Appraise and Join Tyranthraxus menus (live-input.ts:648–656; play.js:1398–1403). This is documented.
    - **Unshifted M toggles the map and never reaches the game** (play.js:1386–1390). It even consumes the key when nothing is shown (toggleAutomap returns early at L928). Gold Box uses M for Move and Magic. Not documented. No verifier sends a real keypress; they all call `send("m")` directly, so no check would catch this [inf].
    - Empty input becomes Enter (live-input.ts:658).
12. **Earlier deviations now removed** [doc]: the Quick rollback and turn skipping removed in `4fcc70e` (COVERAGE.md:3–7), and the Camp-menu "Journal" rewrite removed in `69a6f159`.
