# The guide party finds the prisoner and seeks Grishnak

The party earned this slot through four recorded walks. Each boot names
the preceding walk's native save. Developer combat is disabled.

| Walk | Start | Result |
| --- | --- | --- |
| [Inn](../walk-grishnak-inn) | Cadorna's chambers, commission accepted | The party pays at the New Phlan inn, rests fifteen days and saves H. |
| [Textile House approach](../walk-grishnak-approach) | Inn slot H | Five party members have Sleep in memory. The party takes the west ferry, enters the Textile House, wins the drum courtyard and roaming hobgoblin battles, bashes the locked doors and saves just south of Grishnak. |
| Prisoner | Approach slot I | At (2,15), Free and Unlock produce the missing-key message. The party returns north and saves I at (2,13 N). Brennan still knows Sleep. |
| [Temple healing](../walk-grishnak-healing) | Prisoner slot I | Elspeth uses two memorized cures. Brennan goes from 10 to 13 HP and Elspeth from 14 to 19. She saves I again. |

From the repository root, run `node tools/verify-fresh-party.mjs --textile-grishnak-checkpoint`
to verify the journal before and after Grishnak identifies herself, her
24 HP and AC 5, and the native Quick defeat. Add `--healed-sleep` to
replay the cures and have Brennan target her manually with Sleep.
Grishnak retains her 24 HP and takes a movement turn, then the party loses.

These routes cover the two defeat branches. The journal lead for a
Grishnak victory and the brass key are still absent at the altar.
