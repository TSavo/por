# Installed Mac verification: Settings Escape and startup layout

Package commit `1214d2508ba2a315f3e118c2522fd26e3e64548e`, includes Settings fix `9f227401b` and startup layout fix `8b34105e3`. Intel macOS26.3.1(a). Local mac-x64 package checks passed; DMG SHA256 `bacacb86402f3e632c34a3c7ccfd333f63b55053e54affd869a134505a7aabdc`. Separate app APFS-cloned from sealed staging output and deep/strict signature verified. Isolated profile, bundled game data, tracked visit-training-hall A save imported. Owner installation untouched.

## #359: two native Escape trials pass

Opened Settings through native Game menu. Escape with game/document focus closed it; reopened and used Tab twice to focus the Master slider, then Escape also closed it. Both before/after guest sequence values are4; complete native text and exploration snapshot remained identical. This directly follows the failing installed499a56b4b reproduction where Escape left Settings open and advanced sequence4→5. Evidence: escape-result.json. No synthetic key dispatch was used for these trials. App closed afterward.

## #354: first captured renderer layout passes

Captured26 startup renderer frames; all24 completed asynchronous state snapshots show hidden header and screen rectangle [0,0,1280,960]. The first captured PNG is already full-window black without web header/border. Unlike prior a3f6aba8 and499a56b4b captures, no800px-to960px layout transition was observed. First frame receipt was38.384s after launch; this includes first-start delay and is not an exact paint timestamp. These are earliest captured renderer frames, not guaranteed first WindowServer pixels. Async state snapshots can lag screenshots. The prior evidence and red reproduction remain in qa/mac-startup-a3f6aba8 and qa/mac-installed-499a56b.
