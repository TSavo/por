# Installed Intel Mac checks, 499a56b4b

Package commit `499a56b4bb74000ad5a0fdb332f412c3838471fb`; macOS 26.3.1(a), x64. Local package checks passed; DMG SHA256 `56ebf9992d6657644e1dbea5a0baf5798fdf975b29164c46fbe3850372fe87db`. Separate QA application APFS-cloned from the sealed staging app, deep/strict signature verified. Isolated profiles; owner installation untouched.

## Native menus

Used native Mac UI for File load/restart, Game Settings/Map, Atlas dropdown, and Return to game. Loaded the tracked visit-training-hall A save in New Phlan. Settings toggled on/off through Game preserves sequence, text, and exploration exactly. **Escape fails to dismiss Settings and forwards input to the engine (#359)**; sequence advanced 4 to 5 with unchanged party/location/text. The successful menu-toggle test was repeated independently after this trial.

Map covers the entire 1280×960 viewport. Atlas controls are visible and within the window; New Phlan and Phlan illustrations both decode at width1536. Return to game preserves sequence/text/exploration. Separate profile loaded middle-wilderness-patrols A: overland picker covers1280×960 on load and after native Game Map reopening, with expanded class present. This is a scoped check of these states, not every possible destination/viewport.

## Startup

33 renderer frames captured after a full app relaunch into a fresh QA profile. Frame00 still shows web chrome before Electron layout (#354). Frame07 shows SSI fading over opaque black, frame15 full SSI, frame23 harbor and title after SSI. The incoming fade no longer reveals harbor. No precise full-opacity hold duration claimed from these samples. Initial first-launch capture failed to attach to an active page; corrected capture selected the navigated game page and succeeded on relaunch.

Receipt times are not exact paint timestamps. State snapshots are asynchronous and can lag images; these are earliest captured renderer frames, not guaranteed first native WindowServer pixels. See startup-frames.json. No separate unexplained horizontal mark confirmed beyond the observed initial layout/border. App closed after tests.
