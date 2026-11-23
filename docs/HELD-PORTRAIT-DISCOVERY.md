# Static discovery of held portrait candidates

Run from the repository root. The command reads the bundled GOG 1.3 ECL
records and picture metadata under `game/`. It needs neither a GOG install
nor art manifests.

```sh
node --import tsx tools/discover-held-portraits.ts > held-portrait-discovery.json
```

The JSON has `schemaVersion`, `dataVersion`, `counts`, `eclCandidates`, and
`nativeCandidates`. The counts describe static discovery rows. Native
traces establish which prompts actually cycle and measure their member
order and holds. Paired Chrome replays establish playback coverage.

## Script rows

- `scriptArchive`, `scriptBlock`, `address`, `opcode`, and `name` identify
  the producer. Addresses are four-digit authored hex strings using the
  same normalization as presentation traces.
- `pictureArchive`, `block`, and `possiblePictures` identify the PIC
  source. Each picture lists its `file`, `block`, and zero-based
  `members` with the stored DAX selectors. An unresolved `block` is null
  and leaves `possiblePictures` empty. The stored selectors are metadata.
  Use guest timing and visible viewport evidence for the cycle.
- `selector` retains the raw numeric operand `encoding`, `literal`, or
  ECL memory `address`. `possibleWriters` retains same-script writes to
  that slot, including each `GET TABLE` instruction's authored `address`,
  numeric `tableAddress`, and `index` operand. These are writer candidates.
  Reachability, index ranges, shared indices, and external writes still
  need resolution before a dynamic source can be confirmed.
- `approachSelectors` records the sprite and distance operands where
  present. `approachSites` lists later `APPROACH` opcodes that can carry
  those selectors forward. Native state determines which of these paths
  reaches zero distance and installs the portrait.
- `promptCandidates` gives the menu opcode `address`, the `next` address
  after its operands, the enclosing GOSUB return address as `caller`,
  and any literal `labels`. For example the Valjevo Tower menu instruction
  `9a37` finishes decoding at `9a5a`, the cursor observed in native traces.
  For `ENCOUNTER MENU`, labels come from the message operands. Its action
  menu and picture replacement depend on the guest's encounter state.
- `status` is `candidate`. `uncertainties` includes unresolved selectors,
  native viewport conditions, and cases where the local entry graph
  supplied no starting path. The guest may use a selected head with the
  operand as a body selector instead of taking the PIC path.

The local graph starts from the bundled script entry vector and follows
conditional skips, direct and indexed branches, calls, and returns. It
can identify a path from a producer to a menu before a recognized picture
or script boundary. It does not solve the branch predicates, expand
recursive call sites, follow opaque native calls into another script, or
prove that a picture remains visible at the menu. Treat both the presence
and absence of a prompt candidate as leads for native tracing.

For the Valjevo forge patrol, the GOG 1.3 encounter handler at overlay 3
offset `1ef8` returns only 0–3. The `a9e6` hostile menu branches on all four
values at `aa1f`. The disguised acknowledgement at `9b14/aa49` comes from
the `a8fc` approach. Native replays of both branches confirm the split,
and the paired Chrome receipts cover the approach and both captain menus.

## Native rows

The two resident `PIC` restore branches retain their call sites and list
matching multi-member blocks by possible active bank. The resident
HEAD/BODY reconstruction is recorded separately as `composed-portrait`.
The `FINAL` loader and its own timed loop are recorded as
`outside-held-menu`. Neither of these last two rows contributes to the
native candidate count.

Run `npm run verify:held-portraits` for the worklist's site census. Every
script producer and native restore candidate contributes one row. The
report maps a captured prompt to a producer by script block, picture source,
cursor, and caller. Ambiguous matches are listed for investigation.
A site is measured once it has native evidence at one of its prompts. It
passes when the fixed picture source and all listed prompt leads have
paired Chrome evidence for the current art, order, and cadence. Variable
selectors and unresolved prompt leads remain open.

Use [Held portrait timing](REPLAYS.md#held-portrait-timing) to record a
candidate. Multiple measured prompts can belong to the same site. The
number of captured prompts appears separately from the site total.

## Verified census

The November 23 audit visually verified all 230 reachable sites in paired
Chrome replays using GOG 1.3 and bundled data. The evidence covers 385
captured prompts. Four of the 234 candidates have native proofs of
unreachability. The current counts are generated in
[ART-WORKLIST.md](ART-WORKLIST.md).

Run `npm run verify:held-portraits -- --summary` to check for outstanding
sites. The final reachable site, the roofless Lizardman Keep ambush at
`ECL8.DAX:16:a66c`, runs from the tracked Ruins checkpoint with a fixed DOS
clock. The replay checks that the native approach and illustration paint
before combat and that the picture clears for the giant lizard's first
automatic turn.
