# The six fighters at Sokal Keep

These native saves belong to Alda, Brin, Cora, Dorn, Enna and Fenn, accompanied by a Theurgist and a Curate. The Nov 20 Windows Chrome campaign recorded the battle from J at (9,11 E) with Bless, Quick and spellcasting enabled. It reached the 648 XP award, journal entry 57 and the save in C at (8,5 W). Both saves match the copies in the original campaign verifier byte for byte. The recorded combat contained only keyboard inputs. On 1.3, after Quick and Alt-M, the same victory takes 1,166 Q inputs. Its recorded prompt schedule is in `qa/replay-schedules/sokal-trained/leg-1.jsonl`.

| Slot | Source | What the player can verify |
| --- | --- | --- |
| J | Nov 20 campaign-earned-courtyard-RNhttN, before the fight | Trained and equipped party with both recruits beyond the patrol. |
| C | The same run, after reading the hobgoblin note | Enna is standing with 12 HP. The party can speak to Ferran and use SAMOSUD. |
| H | Nov 20 campaign-eAiDB7, from C via Ferran and the clerk | Sokal turned in, 7,850 XP award, three pieces of jewelry and 250 platinum taken by Enna. |
| A | GOG 1.3 Chrome replay from C through the temple, inn and Podal | The recovered party has accepted Cadorna’s Textile commission. |
| E | GOG 1.3 Chrome replay of H | At the inn after the temple visit and paid rest. All six original fighters are standing. |

The Temple of Tyr buys Enna's three jewels and the party pools its coins. Raise Dead costs 5,500 gold each for Brin and Fenn. Their sheets before treatment show Dead, with Constitution 12 and 16 respectively. After resting 20 days and reloading E, both sheets show Okay, 9 HP, and Constitution 11 and 15. The Theurgist is still dead.

From the repository root, choose the saved stage to replay.

    npm run verify:campaign -- /usr/bin/google-chrome --from-sokal-trained qa/fixtures/sokal-six-fighters/J.json
    npm run verify:campaign -- /usr/bin/google-chrome --from-sokal-courtyard qa/fixtures/sokal-six-fighters/C.json
    npm run verify:campaign -- /usr/bin/google-chrome --from-sokal-council qa/fixtures/sokal-six-fighters/H.json
    npm run verify:campaign -- /usr/bin/google-chrome --from-sokal-lodging qa/fixtures/sokal-six-fighters/E.json

    npm run verify:campaign -- /usr/bin/google-chrome --from-textile-commission qa/fixtures/sokal-six-fighters/A.json
