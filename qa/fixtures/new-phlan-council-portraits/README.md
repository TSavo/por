# City Hall portrait replays

All three fixtures retain the party and maps from `qa/fixtures/campaign-castle-approach-leg/F.json`. They are controlled saves for GOG 1.3 and the shipped data. Save bytes `0x3201` to `0x3203` hold X, Y and facing. Each quest variable's low byte is at `1 + 2 * (address - 0x4900)`.

| Save | Starting square | Controlled quest variables | Replay inputs |
| --- | --- | --- | --- |
| `cadorna-F.json` | (6,6) west | `4a98 = 254` authorizes the envoy briefing. | Up, Enter to hear the sealed packet instructions, Enter to leave. |
| `guard-F.json` | (4,5) south | The existing restricted-door flag is zero. | Up, Yes to leave. |
| `escort-F.json` | (4,5) east | Reset the clerk's current visit and offer count (`4a05`, `4a06`). Mark prior commissions completed (`4abb`, `4aa7`, `4ac2`, `4ab0`, `4a97`, `4abd`, `4ab2`, `4ab7`, `4ab6`, `4ab3`, `4ab5`, `4a98` to 255, `4aa9` to 1). Set Stojanow Gate completion (`4ab9 = 255`) and keep the castle summons unclaimed (`4a9a` and `4aba` zero). | Up, Enter through repeat offers, Enter through the special summons, Enter to follow the captain. |

Run `node tools/verify-slums-presentation.mjs qa/fixtures/new-phlan-council-portraits/<save> <chrome> <route>` for both `POR_GAME_SOURCE=original` and `POR_GAME_SOURCE=port`. The corresponding routes are `new-phlan-cadorna-envoy-holds`, `new-phlan-council-guard-hold` and `new-phlan-council-escort-hold`. Set `POR_HELD_PORTRAIT_CHROME_TRACE` to save the receipts. Each route samples its picture while the guest is waiting and verifies the exit.
