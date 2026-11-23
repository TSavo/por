# Genheeris portrait replays

Slot B starts outside Genheeris's room in Valjevo Castle with the party in
disguise. Replay `valjevo-genheeris-orders` (Nice parlay) or
`valjevo-genheeris-bargain` (Haughty parlay) with
`tools/verify-slums-presentation.mjs`. Use both `POR_GAME_SOURCE=original`
and `POR_GAME_SOURCE=port`. Set `POR_HELD_PORTRAIT_CHROME_TRACE`
to capture the initial audience, orders, offer, and decision portraits.

The full-party fixture adds the Theurgist and Curate from an eight-member
Textile House save. It keeps slot B's castle state and changes the two saved
party counts, the two roster entries, and those characters' files. Replay
`valjevo-genheeris-full-party` to take the offer while all eight slots are
occupied. Genheeris leaves to notify his allies.
