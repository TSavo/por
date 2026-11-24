# Diagnostic Zhentil escape and council reward

Load slot B from the previous earned Zhentil envoy walk. This diagnostic uses developer victory in five encounters. In a separate ordinary-play attempt the party defeated the initial four guards and died fighting the reinforcements.

The party leaves before dinner, crosses the climbable wall at (1,7), parleys with centaurs, and returns by boat. At the City Hall clerk, key 197 displays the reward speech and key 199 displays 1,821 XP per character. The party shares the treasure. The native slot C written at key 213 records the Zhentil commission turned in and the fugitive Cadorna commission offered.

Replay both sources with the following command, setting POR_GAMEDATA to the original GOG 1.3 files.

    POR_PARITY_ONLY=leg POR_PARITY_LEG=qa/fixtures/walk-zhentil-clerk npm run verify:port-parity

The two Surrender / Attack frames show the far guard from SPRIT6.DAX block 16, member 2, over the courtyard. The far, middle and near poses follow as battle begins. The parity check compares these placements and the scenery beneath each pose across both data sources. The ordinary-play continuation still starts at the earned slot B in walk-zhentil-envoy.
