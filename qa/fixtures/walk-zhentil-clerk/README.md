# Diagnostic Zhentil escape and council reward

Load slot B from the previous earned Zhentil envoy walk. This diagnostic uses developer victory in five encounters. In a separate ordinary-play attempt the party defeated the initial four guards and died fighting the reinforcements.

The party leaves before dinner, crosses the climbable wall at (1,7), parleys with centaurs, and returns by boat. At the City Hall clerk, key 197 displays the reward speech and key 199 displays 1,821 XP per character. The party shares the treasure. The native slot C written at key 213 records the Zhentil commission turned in and the fugitive Cadorna commission offered.

Replay both sources with the following command, setting POR_GAMEDATA to the original GOG 1.3 files.

    POR_PARITY_ONLY=leg POR_PARITY_LEG=qa/fixtures/walk-zhentil-clerk npm run verify:port-parity

All 216 frames match in text. The Enhanced artwork differs on three frames during the guard reinforcements. The ordinary-play continuation still starts at the earned slot B in walk-zhentil-envoy.
