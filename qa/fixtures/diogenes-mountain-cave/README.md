# Cave of Diogenes portrait replays

Use `A.json` with `tools/verify-slums-presentation.mjs` in GOG 1.3 and bundled mode. The replays enter the cave at (10,9) facing north and select an intent from the dragon's menu.

| Intent | Route suffixes |
| --- | --- |
| Advice | `directions` |
| Pledge | `pledge-intro`, `pledge-orders` |
| Offer Gift | `gift-intro`, `gift-refusal`, `gift-orders` |
| Challenge, then Apologize | `challenge-intro`, `challenge-choice`, `apology`, `apology-orders` |
| Challenge, then Slay and Follow | `flight`, `follow-choice`, `upper-ledge` |

Each route is named `diogenes-silver-<suffix>-loop`. The native held picture is PIC6.DAX block 117. It displays members 0 through 6 for 1610, 510, 410, 1210, 1010, 1410, and 1510 milliseconds. Members 5 and 6 repeat the pixels of 0 and 2. Enhanced keeps the wide gift, flight, and ledge compositions while displaying the same sequence and holds.
