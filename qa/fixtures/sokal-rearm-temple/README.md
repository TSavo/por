# Rearming at the Temple of Tyr

Slot G is the six-fighter party at the temple in New Phlan, healed after returning from Sokal Keep. It comes from the normal GOG 1.3 Chrome campaign immediately before leg 30. The party created its characters, completed Ohlo's errand, recovered the Sokal diary, sold a jewel and paid for treatment. All preceding legs ran with developer combat disabled.

    npm run verify:campaign -- /usr/bin/google-chrome --from-temple qa/fixtures/sokal-rearm-temple/G.json

The rearming check buys four long swords and five shields. Each store and inventory selection uses the recorded number of End presses and checks the highlighted item before buying or readying it. The final inventory check covers each fighter.
