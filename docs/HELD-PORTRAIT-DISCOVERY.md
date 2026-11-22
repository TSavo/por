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

## Native rows

The two resident `PIC` restore branches retain their call sites and list
matching multi-member blocks by possible active bank. The resident
HEAD/BODY reconstruction is recorded separately as `composed-portrait`.
The `FINAL` loader and its own timed loop are recorded as
`outside-held-menu`. Neither of these last two rows contributes to the
native candidate count.

Use [Held portrait timing](REPLAYS.md#held-portrait-timing) to confirm a
candidate. The candidate counts must stay separate from the verified
coverage count on the art worklist.
