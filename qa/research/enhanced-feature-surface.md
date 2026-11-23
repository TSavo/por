# Enhanced features and host behaviour, from the code

_Research pass on 2026-11-21. Read-only. Line numbers refer to the tree at that time._

# Pool of Radiance port: inventory of Enhanced features and host-side behaviour

Tags: **[V]** means I read it directly in the file at that line. **[I]** means I worked it out from the code; it is not stated anywhere. Line numbers are for the current working tree.

**Three working-tree changes affect QA scope:**
- **Camp-menu Journal entry removed (biggest change).** HEAD rewrote the camp menu string at `cpu.mem[0x791c]` to add "Journal", zeroed the camp prefix length, and wrapped slice 26 proc `0xe4`. The working tree deletes all of this (`git diff tools/boot-translated.ts`). `tools/verify-map-journal.mjs:9` now says "The original Camp menu is unchanged."
- **Automap moved to the runner.** It used to live in browser `localStorage` inside `play.js`. Now the runner records it and stores it in the save slot (`tools/automap.ts`). It records in **both** display modes.
- **Classic now sends J to the game.** Classic sends `key j`, and the Enhanced-only **Journal** button was added (`play.js:1404-1417`, `play.html:176`).

---

## 1. Enhanced features and host behaviours, itemised

### 1.1 Display toggle and base presentation
| Item | Evidence | Details |
|---|---|---|
| Toggle | `play.js:419-438`, `1376-1380`, `1343-1346`; `play.html:179` | Toggled by F10 or the "Enhanced display" button. Not persisted: every reload starts Classic (`play.js:117`) [V]. Leaving Enhanced: cancels travel, hides Map and Journal buttons, closes the automap, stops voice, stops the Enhanced score, re-checks the title cue. |
| Aspect ratio | `play.html:25` vs `160-162` | Classic 8:5, Enhanced 4:3. Enhanced also changes page colours, Georgia headings and the border/shadow (`148-166`). |
| Palette | `live-input.ts:74-79`, `473` | Enhanced frame is the native pixels re-encoded with a 16-colour palette (index 0 = `#0f0e12`). |
| Text re-rendering | `video.ts:105-114`; `live-input.ts:384-388`; `play.js:1199-1209`; `play.html:8,100-103` | Text is captured from overlay 37 glyph writes (ip `0x2aa`/`0x2dd`, characters 33..126). Those 8×8 cells are blanked in the Enhanced frame and redrawn as spans on the 40×25 grid in "Game Web Font" (`/font.woff2` = `upgrades/font.woff2`, Geist Mono). Missing font → `ui-monospace`. Special case: the rune parchment ("THE LAST PART IS EATEN AWAY") keeps its picture-area runes as pixels (`live-input.ts:235-239`). |
| Panel frame redraw | `live-input.ts:54-73`, `505`; `play.js:938-980`, `1112-1119` | Detects 8×8 rail-x/rail-y/stud stamps (needs at least one stud) and repaints them as wooden rails and studs on a 1280×800 canvas. The inner 120×120 area is cleared when a portrait, classic portrait, perspective view or WebGL view is shown. |
| Frame failure fallback | `play.js:1182-1192` | A scene art failure falls back to the Enhanced frame. An Enhanced frame failure (any undecodable layer not in the handled list) falls back to the **Classic** frame for that view. |

### 1.2 Title and publisher scene art
- Scene detection: title slice (index 1), far call `0x18e:0x5c` from ip `0x675` = `scene:publisher`, from `0x6e9` = `scene:title`. Cleared by far call `0x26b:0xf6` at ip `0x7f7` (`boot-translated.ts:300-305`) [V].
- Server sets `art=/art/<scene>` when the key is in the manifest (`browser-play.ts:395`). In Enhanced the whole screen is the 1280×800 PNG and text is hidden (`play.js:989-990`, `1199`).
- Missing or failed image → `failedSceneArt` → Enhanced frame (`1184`).
- While a scene is active the runner suppresses portraits, illustrations, encounters, combat art and panel frames (`live-input.ts:283-286`, `505`, `782`).

### 1.3 Exploration tiles and the WebGL first-person renderer
**Tiles:**
- Keys are `tile:<area>:<sha256 of 64 palette indices>`, 32×32 PNG (`upgrade-art.ts:88`, `160`).
- The runner still computes 2D `tiles[]` (`live-input.ts:369-383`), but **`play.js` never reads `view.tiles`** (grep shows no consumer) [V]. Tile art now reaches the screen only as WebGL textures [I].

**When the WebGL surface is used** (`play.js:440-451`):
- Only when there is no art, portrait, classic portrait, character sheet, combat art or battle tiles, and `perspective` is set.
- Scene data is `view.scenery`, prepared on the server from `nativeScenery`.

**Guest reads:**
- `native-exploration.ts:16-67` reads GEO pointer DS:69ba/69bc, WALLDEF DS:69b6/69b8, x/y/facing DS:6a0b/6a0c/6a0d, mapId from party record +0x18a, glyph banks DS:2736/5d98, plane masks DS:260a, sky/ground colours DS:69be/69c1.
- It is captured on the overlay 36 draw at `0x1eb9` (`boot-translated.ts:82-86`).

**Materials** (`browser-play.ts:89-106`, `exploration-materials.ts:8-80`):
- One material set per sha256 of `[area, harbor, frontSlots, glyphs, sky, ground]`; the cache holds 32 sets.
- Glyphs with no matching art render as their own pixels in the Enhanced palette (`native:` keys).
- Backdrop-composited matches are used only when unambiguous.

**Fallbacks:**
- WebGL exception → `streetUnavailable=true` for the rest of the page session. The view becomes `pictureBackdrop`: the Enhanced frame's 88×88 viewport stretched to 120×120, with **no tile art** (`play.js:688-693`, `1060`) [V].
- Material load failure → `failedSurfaces` for that material set, same backdrop (`749-758`).
- Context lost → that viewport is rebuilt (`718-725`).
- Viewport is rebuilt when walls change (`761-774`).

**New Phlan "phlan" layout:**
- Harbor = area 0 and mapId 0. It gets water and pilings plus `layout:"phlan"` (`browser-play.ts:94-103`).
- `/exploration-materials/phlan` → `buildNewPhlanMaterials`: GEO3 block 0, WALLDEF3 block 0, 8X8D1 block 203, 8X8D3 blocks 101-103. It **throws** on any unresolved wall slot or a missing ground/sky tile, and the server returns 503 (`new-phlan-3d-materials.ts:177`, `190`; `browser-play.ts:299-305`).
- Geometry: water plane at x 13..24, four piers at z=1,3,5,7 with pilings, wall type 14 skipped at x≥12/z<8, gate type 1 at x 0 or 13 with a taller arch, a real cut-out opening, recess and jambs (`renderer.js:106-161`).
- Legacy pose fallback: area 0 camera bytes are used as the "phlan" material (`play.js:446-450`).
- Missing art inside the atlas paints a magenta checker (`renderer.js:254-260`). Under normal flow this should not appear [I].

### 1.4 Overland WebGL view
- Used when `view.overlandMap` is set, which requires the menu text `CASTVIEWENCAMPSEARCHLOOK` (`live-input.ts:316`).
- Draws an 88×88 crop of the Enhanced frame with nearest-neighbour filtering (`renderer.js:313-370`; `play.js:732-745`).
- Seen when Travel art is off, or while travel or animation hides the illustrated map. A failure removes the layer (`play.js:1152-1160`).

### 1.5 Encounter approach sprites
**Keys and distances:**
- Key `encounter:[area:N:[ecl:X:[caller:Y:]]]SPRITn.DAX:block:member:frame` (`encounter-art.ts:7`).
- Anchors come from manifest `encounters` with `area, x, y, width, height`, optional `flatBackground` and `webglYOffset` (`15-26`). PNG must be 4× the anchor size (`upgrade-art.ts:108-114`, `160`).
- The three distances are members 0, 1 and 2 (manifest: 190 / 194 / 101). Legacy area-20 kobold anchors are at `encounter-art.ts:8-12`.

**Matching:**
- Every non-zero source pixel must match the screen, with colour 13 treated as 0.
- Search order: caller-scoped first, then cursor-scoped, then area (`63-64`, `77-90`).

**Background restore, in order:**
1. Previous clean frame in the same area.
2. Captured native draw, if every difference lies under the actor.
3. `flatBackground` row fill.
4. Otherwise no replacement: the original sprite stays (`91-147`).

**Placement:**
- In WebGL the sprite is scaled ×120/88 and shifted by `webglYOffset` (`play.js:1094-1101`).
- Image failure → native-pixel `spriteBackdrop` (`1143-1146`).
- Approach frames are captured at slice 29 ip `0x078a` (`boot-translated.ts:105`), at most 12 (`live-input.ts:681`), and de-duplicated with an unscoped key (`301-306`).

### 1.6 Portraits and scripted scene illustrations
**Portraits** (`portrait-art.ts:317`, `636-...`):
- Key `portrait:[area:N:[ecl:X:[caller:Y:]]](PICn.DAX:b:m:f | HEADn.DAX:id:BODYn.DAX:id)`, 352×352 PNG.
- Matched by the 88×88 signature at (24,24). Lookup order: area+cursor+caller → area+cursor → area → global.
- XOR-delta members: roaming zombie regex (area 10, line 7), river lizardfolk (area 23, line 8), and 305 `verifiedPortraitDeltaKeys` (lines 9-315).
- Drawn at (8,8), 120×120, over the expanded viewport (`play.js:1052-1055`).
- No art → `classicPortrait` (candidate source list) → Enhanced shows the backdrop. Image error also falls back to the backdrop (`1141`).

**Scripted illustrations:**
- `scriptIllustrations` is a Map of 485 entries over 29 areas; 157 carry `:cue:` (`portrait-art.ts:319-805`). It matches the manifest 1:1 [V].
- The context string is `scene-illustration:area:${area}:ecl:${DS:494e cursor}[:caller:${word at far ptr DS:6d36/6d38}]` (`live-input.ts:159-166`, `270`).
- `matchScriptIllustration`: the id must equal the context or start with `context+":cue:"`. The cue string must be contained in the dialogue (text cells 640..959 joined without spaces, uppercase) or the regex must match. The key must be installed. **The first table-order match wins** (`portrait-art.ts:806-812`).
- Illustration takes priority over the dragon-arrival picture, which takes priority over portrait art (`live-input.ts:283-285`).
- `:cue:roofless-ruin` and `:cue:l-shaped-ruin` give way to a matched encounter sprite (`296-299`).
- The council award illustration is drawn at (100,72) with the treasure text kept above it (`play.js:1051-1054`).

### 1.7 Character sheet art
- Detected when pixels (216,0), (312,0), (216,96) and (312,96) are all colour 14.
- Head 88×40 at (224,8) and body 88×48 at (224,48) must **both** match HEAD/BODY DAX signatures (`portrait-art.ts:838-855`). The Enhanced frame zeroes those regions (`live-input.ts:289-294`). The head is drawn 6 px lower (`play.js:1043-1049`).
- **Fallback gap [V]:** `.character-sheet-part` is not in `decodeLayer`'s handled list (`1139-1147`). A failed PNG makes the whole frame fall back to Classic.

### 1.8 Combat
**Sprites and art keys:**
- Monsters `combat:[area:N:]CPICn.DAX:block[:ecl:X]` (scoped matchers per area and per battle cursor, `combat-art.ts:86-121`).
- Party `combat:party:head:body[:palette:16hex]`. Random props `combat:RANDCOM.DAX:1:0:0-5`.
- 96×96 PNGs, or 4× for 48-wide/tall large actors. Both facings are registered (`151-157`).
- Ready vs strike: CPIC/body ids ≥128 are attack keys (`live-input.ts:187-188`).

**Party recolour:**
- `-materials.png` companion masks, 1600 loaded (`upgrade-art.ts:22-39`).
- The matcher infers a palette remap and emits a `:palette:` key (`combat-art.ts:172-203`). `/art` serves the base PNG and `/art-materials` serves the mask (`browser-play.ts:379-390`).
- The browser tints pixels and caches up to 256 results (`play.js:43-88`). A failure falls back to native pixels.

**Clipping, terrain and large actors:**
- Clipped to the battlefield 8..176 (`play.js:1075-1089`). Mirroring uses `scaleX(-1)`.
- Large or partially off-field actors use `clippedPoses` (`combat-art.ts:340-388`). A prop hidden under a unit is restored (`440-448`).

**Battlefield tiles:**
- `battle-tile:<sha>` per 8×8 cell (`live-input.ts:421-457`).
- Terrain under sprites is captured from overlay 33 ip `0x014d` via DS:4980/4982 (`boot-translated.ts:107-111`; `live-input.ts:707-747`).
- Failure → layer dropped.

**Selection frames and aim:**
- Selection frames `combat-selection:COMSPR.DAX:25` (battle) and `:153` (icon editor) (`live-input.ts:393-418`).
- Aim reticle appears for the menu `(USE CURSOR KEYS)` or `AIM:` on the highlighted layer, drawn as a CSS gold corner-bracket div; there is a "backed" variant (`play.js:994-996`, `1164-1179`; `play.html:85-98`). Manual Aim uses empty-cell detection (`live-input.ts:105-132`).

**Effects and projectiles:**
- Keys `combat-effect:COMSPR.DAX:n[:flip-x|:transpose]`.
- Underlay captured at overlay 25 offsets `0x1d27`/`0x1fea`/`0x2169` and overlay 32 `0x0f33`. Timed at the EGA delay `0x512:0x53d3` (`boot-translated.ts:89-103`).
- Impact 110 ms, flight 55 ms. COMSPR 139 is drawn at brightness 1.35 (`play.js:1074`).

**Animation queue:**
- At most 12 frames and at most 6 flight frames. When full, the intermediate point that leaves the smallest gap is removed; hold phases 9/137 are de-duplicated (`live-input.ts:513-518`, `786-835`).
- Durations: attack-report frames 1000 ms (`870`); others default 120 ms (`play.js:416`).
- Any key press first finishes the animation (`1262-1265`).

**Automatic (Quick) combat:**
- Condition: a non-blocking poll at `0x512:0x5423`, battlefield border present, actor pointer DS:5cf0/5cf2 with actor+0x10f ≠ 0, and the menu empty or starting `MOVE/ATTACK,` (`live-input.ts:618-626`).
- The browser sends `:poll` after 160 ms plus the animation time. **This happens in both modes** (`play.js:1300-1307`).

### 1.9 Audio
**Settings:**
- Classic hardware PC Beeper / Tandy / Silent, sliders Master / Effects / Dialogue / Narration (0-1, step 0.05), Mute.
- Stored in `localStorage["por.audio.v1"]` (`play.js:89-98`, `193-196`, `281-292`; `play.html:182-190`).

**Classic:**
- Plays `/audio/<hw>-NN.wav` from `POR_AUDIO_DIR` (default `../por-assets/original`, `browser-play.ts:62`, `372-378`).
- One sound at a time; events 13/14/15 loop. Index 0 or 0xFF stops (`play.js:208-224`).
- **"Silent" also silences Enhanced effects** (`210`) [V].

**Enhanced effects and music:**
- Uses `enhancedFile` from `original-sounds.json` (`/enhanced-audio/`); replacements never loop (`212-221`).
- The original event 13 is suppressed when a replacement exists.
- Title cue plays once in the title/publisher scenes (`226-234`).
- Battle sting: the combat slice at ip `0x1f26` calling `0x198:0x2f` with guest mode DS:52d2 ≠ 0 emits an Enhanced-only event 14 (`boot-translated.ts:296-299`).

**Playback rules:**
- Autoplay blocked → retried on the next key press, Audio button click or travel selection (`244-255`, `279`, `498`, `1357`).
- Hidden tab pauses effect and voice. Showing the tab resumes them; voice resumes only in Enhanced (`347-369`).

### 1.10 Narration
- **ECL-triggered:** `cpu.onEclInstruction` (ovl03 `0x360f` → `0x32df`) feeds `EclNarrationObserver.observe` (`boot-translated.ts:205-213`).
  - Reads DS:52d4 (archive), DS:82a2 (block), DS:494e (address) and the buffer pointer DS:493f, and checks the opcode byte (`ecl-narration-observer.ts:57-132`).
  - Handles static selectors (deferred, command-render, at-trigger) and dynamic variants.
  - The server resolves through `NarrationCatalog`; ambiguous or selector-required cases are logged and stay silent (`browser-play.ts:267-278`; `narration.ts:70-95`).
- **Exact-text town dialogue:** `POR_TEXT` messages that are not from an ECL text opcode and not covered by a `voices.json` match, and that equal exactly one unit with an asset and no variants (`browser-play.ts:45-53`, `253-266`).
- **Legacy `/voice/` path:**
  - 9 `voices.json` lines, matched by substring in the browser; each match stops any current voice and clears the queue (`play.js:371-379`).
  - Served from `POR_VOICE_DIR`. **The mp3 files are sent with `content-type: audio/wav`** (`browser-play.ts:363-367`) [V].
  - The `scene` lines path is dormant: no lines have `scene` [V].
- **Queueing and stop rules** (`play.js:301-345`, `386-393`, `1356-1361`):
  - Narration plays only in Enhanced; events that arrive in Classic are skipped, not stored for later [V].
  - Any key press except F10 stops the voice and clears the queue. Exception: Enter or Space while queued narration plays only advances the screen; the recording keeps going.
  - Keys typed inside the audio panel do not stop it.
- **Dialogue slider has no effect [I]:** every line and every queued clip is type `narration`.

### 1.11 Journal
**Lead sources:**
- (a) Transcript of Pascal strings sent to `0x198:0x39` from overlay 3, plus trainer `0x198:0x5c` from overlay 16 (`adventure-log.ts:56-83`), parsed by `discoveredLeads` (`783-1909`, 302 text triggers).
- (b) `questProgress` reads ECL globals through DS:4933, using `progressAddresses` (16 entries) and 16 other flags (`509-526`, `576-769`).
- (c) Live inventory walk for item types 74 and 75 (`529-567`).
- (d) 20 commissions (`commission-journal.ts`).

**Objective and tracking:**
- Objective: `currentObjective` has 209 nextStep branches (`103-491`).
- Track N / track auto / Resume button (`play.js:1241-1253`, `1342`; `live-input.ts:566-578`).
- Tracking redirects: tracked `bottle` → `bottle-vampire`; `mendor-book-N` → `records` (`adventure-log.ts:497-503`).
- The runner refreshes the journal when the seal-duplication message appears and on Kovel cursor transitions (`boot-translated.ts:280`; `live-input.ts:588-590`).

**Persistence:**
- Leads and tracked id are saved in slot JSON and restored on load (`boot-translated.ts:249-256`).
- An optional `POR_JOURNAL_PROFILE` file stops being written after any slot load (`journal-profile.ts:59-63`).

**J rules:**
- Browser: J without Shift sends `j` in Enhanced or while the journal is open; otherwise it sends `key j` to the game (`play.js:1404-1417`). Escape closes the journal; other keys are ignored while it is open.
- The server accepts only `j` or `track` while the journal is open (`browser-play.ts:418-432`).
- Runner: J opens the journal unless a disk menu is active, or the menu matches `/^APPRAISE:.*JEWELRY/` or contains `JOINTYRANTHRAXUS` (`live-input.ts:648-656`).
- The journal is a blocking host loop; the guest is paused while it is open.

### 1.12 Maps
**Local automap:**
- The runner records the tile the party stands on, taking walls from GEO*.DAX for the area. If an atlas plate names a mapId, it uses the walls the guest drew and keeps that floor separately (`automap.ts:98-125`; `live-input.ts:467-470`, `526-533`).
- Used per floor for mapId 31 (Bane interior) and mapId 32 (Kuto catacombs).
- Positions outside 16×16 and tiles without walls are not recorded.
- Browser fetches `/automap.json` when the revision changes (`play.js:138-151`).
- SVG with walls N/E/S/W, label circles and a party arrow. The title comes from the atlas sheet, then `areaNames`, then "Area N" (`792-830`).

**Labels:**
- Entered through `window.prompt`, sanitised to ASCII and at most 40 characters, sent as `:map-label`, accepted only while `frame.exploration` is set. An empty label removes it (`912-921`; `browser-play.ts:425`; `automap.ts:127-134`).

**Migrating old browser maps:**
- When a slot is loaded, the browser posts `localStorage por.automap.v2.<slot>` once and sets `por.automap.moved.<slot>`. The runner adopts only new tiles (`play.js:154-171`; `automap.ts:141-160`).
- `.unsaved` and `v1` keys are not migrated [I].

**Region map:**
- Areas from `geography-model.json` that are discovered or current, excluding travel-window, interior and building roles.
- Hard-coded SVG terrain, labels and compass; boat routes shown dashed (`857-906`).

**Atlas:**
- 19 plates. Plates are filtered to discovered areas or floors. Auto-selection prefers area + mapId, then a single-area sheet, then an area sheet without mapId, then the first sheet. The selection resets on each open.
- Image error → "Could not load this illustration." Clicking opens the full-size image (`795-806`, `832-855`).

**Input:**
- M (Enhanced, no Shift) toggles the map. **In Enhanced, lowercase M never reaches the game**, including combat and the Encamp menu's Magic; Shift+M does reach it (`1386-1390`) [V].
- While the automap is open, every key except F10 and Escape is swallowed.

### 1.13 Moonsea travel map (Enhanced only)
**Visibility** (`play.js:459-474`):
- Requires Enhanced, overland view, no journal, no portrait or combat art, the plate (`/atlas/phlan-region-concept-v2-geography.png`) loaded, Travel art on, no active travel, no animation, and `travelPosition` set. `travelPosition` requires no dialogue, encounter or scene (`live-input.ts:485-486`).
- Missing plate → never "ready"; the overland view is used instead [I].

**Availability:**
- Breadth-first search over the START.EXE terrain table at DS:35E2, `nativeBarrier`, and per-sector blocked tile types read from ECL6/7/8 (`overland-travel.ts:117-181`).
- Quest flags: nomads (0x4a0f==0); buccaneers (0x4a8c==255 && 0x4aa9==0); zhentil (0x4a98==255 && 0x4ab4<253); riverCleared (0x4ab3≥254) swaps in the cleared-river tile set (`27-29`, `158`, `166`). The wilderness-encounter flag 0x4a9e==255 hides the map (`23`).

**Destinations:**
- 11 hotspots (`play.html:199-222`).
- Phlan chooser: 12 districts plus 5 under "Entrances and ferry docks" (`230-250`). Menu keys per approach are listed in section 3.
- Island route: rowboat at (19,14) with key `y`.

**Route stepping** (`play.js:628-653`): checks the expected position after each step and sends the arrival menu key when the native prompt matches (`overland-travel.ts:59-72`).

**Sokal ferry** (`play.js:533-580`, `655-657`):
- Fare menu → key `s`. Payer menu → waits for the player (status text at `1315`). Free-passage prompt → Enter. Boarding happens at quay (15, facing E).
- Ticket state from 0x4a01/0x4ac4 (`live-input.ts:600-601`).

**District roads:** hard-coded waypoints for 7 destinations (`play.js:582-626`).

**Stop conditions** (`669-686`, `1362-1368`):
- Unexpected position, prompt not recognised, any animation, a `stopped` state, leaving Enhanced, toggling Travel art, a failed send.
- Any arrow, letter, digit or Escape cancels; while waiting for the payer, only Escape cancels.

**Controls:**
- Escape steps back from the approaches panel, then from the expanded map.
- Map/M expands the illustration (`476-483`, `923-927`).
- Handoff polls: up to 3 `:travel-poll` commands (`660-663`).

### 1.14 Save slots and the DOS export tool
**Save slots:**
- Slots A–J saved as JSON under `POR_SAVE_DIR` or `out/saves/<sha16(realpath root)>` (`boot-translated.ts:189-190`).
- Contents: `{version, name, data(SAVGAMx.DAT), leads, tracked, party{CHRDATx1-8.SAV/ITM/SPC}, automap}`; writes use temp file + rename (`save-slots.ts:8-17`, `31-40`, `102-115`).
- `roster.json` overlays `SAVE\CHARLIST.TXT` and `*.CHA/ITM/SPC`; deletions are stored as null (`66-93`).
- Companion character files are mounted on the first read of a slot during a load (`dos.ts:64-76`, `252-255`).
- An invalid slot JSON throws at startup (`57-62`) and stops the runner [I].

**DOS export:** `tools/export-dos-save.ts` writes `out/dos-slot-X-*/SAVE/`.

### 1.15 Keyboard mapping (`play.js:1327-1336`, `1356-1418`; `live-input.ts:20-27`, `81-88`)
- **Keys sent:** arrows, Home, PgUp, End, PgDn, Enter, Escape, Space, Backspace, single letters and digits.
- **Numpad:** mapped by `event.code`, so NumLock state does not matter, and numpad keys can never send digits [I]. Numpad5 sends nothing. The README says "with Num Lock off" (README:29), which does not match.
- **Alt:** Alt+Q sends BIOS word `0x1000` and Alt+M sends `0x3200`, only without Shift and with the journal closed. All other Alt combinations are dropped.
- **Dropped:** Ctrl/Meta combinations and **key auto-repeat**.
- **Tab cannot be sent** from the browser, although the runner maps it.
- **Other drops:** keys typed while a button has focus (Enter/Space) or inside the audio panel are not sent. `send()` drops input while posting or while a frame is rendering (`1261`).

### 1.16 Developer combat and pregen party
**Developer combat:**
- Requires `POR_DEV_COMBAT=1`.
- Available when DS:4954==5, DS:6773>0, and either a battle poll with an empty menu or a menu starting `MOVEVIEWAIM` (`live-input.ts:583-587`; `developer-combat.ts:14-16`).
- F9 works only with the automap hidden, **in both modes** (`play.js:1381-1385`). It sends `:win-combat`, which the server validates (`browser-play.ts:423-424`).

**Pregen party:** `POR_PREGEN_PARTY=1` stages CHRDATA1-6 into `SAVE\<NAME>.CHA/ITM/SPC` and appends them to CHARLIST (`pregen-party.ts`; `boot-translated.ts:40`).

### 1.17 Environment variables
| Group | Variables |
|---|---|
| Runtime and paths | `POR_PLAY_PORT`, `POR_GAMEDATA`, `POR_UPGRADES_DIR`, `POR_AUDIO_DIR`, `POR_VOICE_DIR`, `POR_ASSETS_DIR`, `POR_ENHANCED_AUDIO_DIR`, `POR_SAVE_DIR`, `POR_LIVE_AT` (browser default 24,000,000), `POR_BOOT_STEPS` (browser 100M, otherwise 30M), `POR_BOOT_KEYS`, `POR_BOOT_KEY_FILE`, `POR_RECORD_KEYS`, `POR_JOURNAL_PROFILE`, `POR_ADVENTURE_LOG` |
| Traces | `POR_TILE_TRACE_FILE`, `POR_TRACE_TILES`, `POR_TRACE_BATTLE_TILES`, `POR_TRACE_BATTLE_DRAW` (stderr `POR_BATTLE_DRAW`/`POR_BATTLE_TERRAIN`), `POR_PORTRAIT_TRACE_FILE`, `POR_ENCOUNTER_TRACE_FILE`, `POR_NATIVE_ENCOUNTER_TRACE_DIR`, `POR_SOUND_TRACE`, `POR_TRACE_ART` (`dos.ts:52`) |
| Internal (set by the server, `browser-play.ts:117-128`) | `POR_*_KEYS`, `POR_ENCOUNTER_ART`, `POR_BROWSER_PLAY` |

`POR_NOTICE` has no emitter left (dormant).

### 1.18 Where state lives
| State | Location |
|---|---|
| Presentation mode, Travel art toggle, map tab, narration queue | Browser memory only |
| Audio preferences, legacy automap migration flags | `localStorage` |
| Sounds (last 64), messages (64), narrations (256), automap JSON, latest frame | Server memory |
| Journal transcript, tracked lead, automap | Runner memory, and the save slot |
| Guest RAM | Only the writes listed in section 2 |

---

## 2. Every place the host writes to or alters the guest
| # | File:line | What it changes | Mode |
|---|---|---|---|
| 1 | `gamedata.ts:26-87`, used at `boot-translated.ts:37-39` | **Edits game data on mount:** WALLDEF5.DAX and 8X8D5.DAX get donor records 2 and 4 from WALLDEF2/8X8D2 if missing. If the split condition holds, WALLDEF5 record 24 is rewritten (tiles 50↔111, 51↔112), record 25 is added, 8X8D5 record 241 is rewritten, and a copy of 242 is added as 25 | Both, every run |
| 2 | `pregen-party.ts:4-31`; `boot-translated.ts:40` | Adds 6 roster characters and appends to CHARLIST.TXT | Both (env) |
| 3 | `save-slots.ts:78-85`; `boot-translated.ts:194` | Roster overlay (adds and replaces SAVE files, deletes those stored as null); SAVGAMA-J.DAT mounted from JSON | Both (live) |
| 4 | `dos.ts:64-76`, `252-255`; `boot-translated.ts:197` | Companion CHRDAT files mounted, shadowing existing ones, on the first read of a slot during a load | Both |
| 5 | `boot-translated.ts:191`, `196`, `242-245` | Guest file writes and deletes are copied to host JSON (roster, slots) | Both |
| 6 | `boot-translated.ts:226-274` | **Wraps original procedures** in slice 17 at `0x159d` (load), `0x1ced` (save), `0x2265` (save and exit): original runs, then the host restores or persists journal, tracked lead and automap, and J is suppressed during the disk menu | Both |
| 7 | `developer-combat.ts:37-55` | Calls `ovl25_2266` with 255 damage for each hostile through the roster DS:5cf4 → +0x104, then restores registers; the guest's hostile count becomes 0 | Both (`POR_DEV_COMBAT`) |
| 8 | `live-input.ts:657-669` | After a developer victory, injects key `alt-q` (0x1000) | Both |
| 9 | `live-input.ts:669` | `keys.push` of a BIOS word for each browser command | Both |
| 10 | `play.js:674-685` + `travelStep` | Travel automation sends real keys (arrows, Enter, `g n c s b t y`) | **Enhanced only** |
| 11 | `play.js:1305-1306`; `live-input.ts:633-636` | `:poll` releases a non-blocking poll with no key and sets nextPrompt = steps + 1M | Both |
| 12 | `play.js:660-663`; `live-input.ts:633` | `:travel-poll`, same release | Enhanced (travel) |
| 13 | `live-input.ts:582`; `dos.ts:119-121` | **Auto-Enter:** before `POR_LIVE_AT` (24M steps), and whenever no key is queued, a blocking INT 16h read returns `0x1c0d` (Enter) | Both |
| 14 | `live-input.ts:582`, `674` | nextPrompt gating: for 1M steps after a key, non-blocking polls return "no key". After that every poll **blocks the guest until browser input** [I: departs from DOS timing] | Both |
| 15 | `live-input.ts:559-580` | Journal open: host loop holds the guest inside the key request | Enhanced-initiated |
| 16 | `boot-translated.ts:44-53`, `129` | Scheduled boot keys | Both (env) |
| 17 | `boot-translated.ts:132-137` | SS/SP, DS=0x2000, ES=0x9ff0 (PSP), `write16(ES:2)=0x9ff0` | Both |
| 18 | `overlay.ts:50`, `75` | EXE at paragraph 0; all overlay slices preloaded resident from paragraph 0xC000 | Both |
| 19 | `machine.ts:54-57` | **Clock:** BIOS tick 0040:006C incremented every 16 instructions | Both |
| 20 | `dos.ts:140-157` | **Date fixed** to 1988-06-01 (AL=3); **time** starts 12:00:00.00 and advances 1/100 s per call | Both |
| 21 | `dos.ts:127-222` | DOS version 5, current drive C:, AH=35h returns 0:0, bump heap from 0x5000, cwd writes, read buffers (`257`) | Both |
| 22 | `video.ts:44-46`, `56-63` | BIOS data area (0040:49/4A/63); port 0x3DA retrace derived from the step count | Both |
| 23 | `intr.ts:42-58` | Turbo Pascal Intr register record written back | Both |
| 24 | `boot-translated.ts:319`; `browser-play.ts:130`; `live-input.ts:672` | **Step budget:** 100M in the browser (30M otherwise), raised to steps + 150M after every key. Exceeding it throws and the game stops | Both |
| 25 | `boot-translated.ts:323` | `resetFarBudget(0)`: no far-call limit in the live run | Both |
| 26 | `boot-translated.ts:363`, `374` | Loader budget 2M; not reached in live mode (exits at `355`) | Non-live |
| — | `boot-translated.ts:77-128` (`cpu.tick` wrapper), `205-213` (`onEclInstruction`), `291-306` and `adventure-log.ts:60` (`farCallObservers`), `sound-trace.ts:29-35`, `boot-translated.ts:313` (`onWrite16`) | Observation only, no writes. `farCallObservers` holds one observer per CPU, so ordering matters (`adventure-log` sets it, `boot-translated` wraps it) | Both |
| — | **Removed in working tree:** camp-menu Journal entry (`cpu.mem[0x791c]` rewrite, `write8` of the camp prefix, slice 26 proc 0xe4 wrap) | Present at HEAD only | — |

`tools/trace-computed-area-exits.ts:45-71` also writes guest memory and sets the ECL hook, but it is an offline trace tool, not used in play.

---

## 3. Per-area special cases hard-coded in the presentation layer (~51 code sites plus data tables)
**`live-input.ts` (28):**
1. Rune parchment text filter (L235).
2. Area 18, cursor b240, caller a839: other auction outcomes (L241).
3. Area 28, b624/b317: Zhentil dinner topic → a7c2 (L244).
4. Area 8, 9f21/9a4a: council reward vs finale (L247).
5. Area 25, 9c97: dragonfly cave revisit (L252).
6. Area 27, 9d9c: kobold cave revisit (L253).
7. Area 3, b0f6: Cadorna plea → b110 (L255-256).
8. Area 3, 9bf8: Cadorna aftermath → b15c (L258-259).
9. Area 24, aba7/abbd: Bane treasure ambush → ab06 (L261).
10. Area 7, 995f/a54b: bronze dragon arrival portrait (L266-268).
11. Area 8, 9f3f/9a4a: award text taken from the upper rows (L272).
12. Area 4, 9b63 at (4,2)/(13,12): maze watch / Scriptorium scope (L278-281).
13. Entrance cues roofless-ruin / l-shaped-ruin (L296).
14. Area 1 `RELEASEANIMALSLEAVE` treated as exploration (L325).
15. Area 24 `DESTROYALTARLEAVEIT` treated as exploration (L326).
16. Areas 18↔26 Podal west boundary (L338).
17. Area 26→17 Nomad entrance (L342).
18. Areas 26/27→0 return-ferry pier (L345).
19. Overland arrival areas {0,2,10,14,18,24,31} (L29, L358).
20. Road arrival map {0:[8,11,20,21], 2:[15], 9:[6], 18:[9,29]} (L31, L359).
21. Road areas {0,2,9,18} (L30, L463).
22. Harbor road-sign dialogues (L459-461).
23. Quay x 11..15, y=1 (L464).
24. Harbor ticket flags (L600-601).
25. Area 5 with ECL 3 → 3, Valjevo hedge (L605).
26. Area 0 camera bytes (L614).
27. Area 20 wand pose CPIC2 94→222 at a0b4 (L860-868).
28. Overland ECL 25-27 (L310), plus J-reserved menus (L651).

**`play.js` (12):** `areaNames` (L172-175); area-0 pose fallback (L448); council award placement (L1051-1054, L1115); COMSPR 139 brightness (L1074); ferry quay poses (L547, L559-579); district roads, one site per destination: stojanow, valjevo (2 legs, entry `9,4,15,0`), kutoWell, slums, cityHall, trainingHall, mendorLibrary (entry `2,0,4,6`) (L582-595).

**`overland-travel.ts` (9):**
- Sectors 25/26/27 with offsets, ECL archives and blocked addresses (L8-12).
- Approach cells: northGate (25,26)(26,26), east (26,27), west (24,28), docks (20,29)(35,29), rowboat (19,14) (L34-39).
- Destination→menu keys per approach (L41-57):

  | Destination | North gate | East approach | West approach | Docks | Rowboat |
  |---|---|---|---|---|---|
  | Graveyard | g | | | | |
  | Kovel Mansion | c | n | | | |
  | Temple of Bane | | s | | | |
  | Podol, Stojanow, Kuto's Well, Valjevo | | | n | | |
  | Textile House, Mendor's Library | | | s | | |
  | New Phlan, City Hall, Training Hall, Slums, Sokal | | b | | t | |
  | Island | | | | | y |

- 5 prompt regexes (L59-65).
- Sokal menus and texts (L76-92).
- Landmark cells: diogenes (10,9), buccaneers (12,31), zhentil (3,32), nomads (25,11), kobolds (32,15), lizardmen (37,8), island (19,16) (L95-103).
- Crossroads exemption (L115); barrier tiles (L122-124); cleared river at 0xb036 (L132); quest gates (L166).

**Other files:**
- `play.html:199-222`: 12 hotspot coordinates.
- `browser-play.ts:94`: harbor = area 0 / mapId 0.
- `renderer.js`: dock geometry (L106-129), type-14 skip (L134), gate arch (L141).
- `new-phlan-3d-materials.ts`: block ids (L18-25), districts {0,8,11} (L34), water/pile fingerprints and crops (L185-186).
- `encounter-art.ts:8-12`: area-20 legacy anchors.
- `combat-art.ts`: RANDCOM frame 0 mirror (L254); fallen key (L21).
- `portrait-art.ts`: zombie area 10 (L7), lizardfolk area 23 (L8), 305 delta keys, 485 illustration entries (29 areas; largest are 25:47, 16:41, 9:36, 23:33, 22:32).
- `boot-translated.ts`: scene ips (L302-305), battle-sting ip (L296).
- `adventure-log.ts`: area checks for 0, 2, 13, 14, 18, 27 plus Kovel cursors 9c92/b359 (L569-633).
- Manifest-scoped keys: 706 area/ECL/caller portraits, 522 area/ECL combat keys, 481 area-scoped encounter anchors.

---

## 4. Manifest-driven content counts
| Source | Counts |
|---|---|
| `upgrades/manifest.json` (7,889 assets, 7,010 files, 485 encounter anchors, 2 reflected tiles) | tile 3,817 (28 areas; top 10:419, 29:298, 2:255, 0:231); combat:party 1,600 (+6 palette variants); encounter:area 481 (+4 legacy keys); scene-illustration 485; portrait area+ecl 435 / +caller 204 / area 67 / global 82; combat:area:ecl 383; combat:area 139; global CPIC 29; RANDCOM 6; battle-tile 83; combat-effect 38; combat-selection 2; character-sheet 26; scene:title 1; scene:publisher 1. Anchors with `webglYOffset`: 7; with `flatBackground`: 1 |
| Material masks | 1,600 `*-materials.png` |
| `upgrades/slums/manifest.json` (144 assets) | tile 123 (area 20:87, 0:28, 2:4, 11:4); CPIC 8; area:ecl 2; encounter 6 legacy + 4 area; portrait 1. `upgrades/README.md:53` still says "59 tile replacements" (out of date) |
| Atlas (`src/maps/atlas.json`) | 19 plates, all files present; 2 with mapId (31, 32) |
| Narration (`voice-master-manifest.json` counts) | 2,025 source events (1,688 voiced / 337 unvoiced); 1,432 units (1,363 with an asset); 69 variant families / 377 variant assets (392 variant entries); 43 static selectors (at-trigger 20, defer-until-covered-source 10, during-trigger 5, defer-until-command-render 3, deferred-covered-source 3, during-instruction 2); 1,739 distinct asset files, all present under `audio/` (AUDIO.md says 1,745) |
| Legacy `voices.json` | 9 lines, all present |
| Sounds (`original-sounds.json`) | 20 events; 13 with `enhancedFile` (effects 2-12 as WAV, 13/14 as MP3); events 1 and 15-20 have none |
| Journal leads | 293 distinct `id: "..."` literals (272 in `discoveredLeads`, 12 in `questProgress`). Templated families: `commission-*` (20, of which 1 is already a literal), `mendor-book-*` (5), `river-yarash-paper-*` (5), `mendor-stacks-*` (4). That gives a bounded total of 326, plus open-ended `journal-entry-N` and `proclamation-<numeral>` |
| Commissions | 20 (`commission-journal.ts:14-58`); 16 have reward addresses (`progressAddresses`) |
| Geography | 29 areas (8 districts, 8 destinations, 4 castle quarters, …); one boat route, 0↔21 |

**Stale docs to note:**
- `upgrades/README.md:15-20` describes a `viewport` key family with 448×480 PNGs; the loader rejects it (`upgrade-art.ts:88-92`).
- README.md:29 says the numeric keypad works "with Num Lock off"; the mapping uses `event.code`, so Num Lock does not matter.
