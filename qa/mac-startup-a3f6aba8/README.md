# Installed Intel Mac startup capture

Package commit: `a3f6aba8e6cb039174149f3e4c308b36f80d16d4`. macOS 26.3.1(a), isolated profile. Captured 2026-11-24, before startup fix 5698ce325.

CDP screencast captured 34 renderer frames, viewport 1280 × 960. Selected PNGs preserve initial web header (00), letterboxed loading area (02), full-window blank background (03), SSI fading over harbor (15), SSI card (20), and final title (30). Initial screen element height was 800; later 960. No distinct PoR logo before SSI was confirmed in inspected frames.

These are the earliest captured renderer frames, not guaranteed first WindowServer pixels. `atSeconds` is receipt time after launch, not exact paint time; screencast metadata timestamps are also retained. State snapshots were queried asynchronously and can disagree with the corresponding frame during transitions. Do not use them as exact frame-state synchronization.
