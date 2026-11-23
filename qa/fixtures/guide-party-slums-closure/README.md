# Clear the Slums and collect the Council reward

Slot H is an earned save from the GOG 1.3 guide party, at (13,10) in Ohlo's
room. The party from `guide-party-slums-eight-set-fights/D.json` accepted and
completed Ohlo's errand, beat fifteen random encounters, and won the kobold
fight that interrupted its rest at (14,10). That fight raised the clear
counter `4abb` from 24 to 254 and the random encounter counter `4a80` from
15 to 17. All six party members survived. The party recovered in Ohlo's
room and used the normal Save command to write slot H.

Both data modes loaded H and walked to New Phlan. The party paid 1 platinum
for a seven-hour wait at the inn, returned to the west gate at 04:17, and
entered City Hall. The clerk said, "YOUR CLEARING OF THE SLUM AREAS PERMITS
US TO EXPAND." The party earned 450 experience points per character before
class splits and shared 1 jewelry, 50 platinum, and 250 gold. It closed the
reward and saved slot I at the clerk. The native paid flag `4abb` is 255 and
the reward tally `4ac1` is 1. Both traces record `commission-slums` entering
`reward-pending` and then `turned-in`. The final slot I is byte-identical.

Each `*-keys.txt` file records all 285 BIOS key presses with that mode's
instruction timings, including load and save. The codes and the shared
`prompts.jsonl` match. For the ordinary route from H:

1. Walk east twice out of Ohlo's room, then
   `NNWWWWWWNNNNNENEEESSSSSENNNE` to (15,4). East enters New Phlan.
   The recorded route briefly returns west to verify the cleared Slums
   have no entrance alarm, then steps east to the gate again.
2. From the west gate, follow the reverse of the inn-to-gate walk
   `NEEENNNNNNNNWWNWWWSSWW` to the inn (4,12). Pay with Aelar, use Rest
   for seven hours and exit camp. Follow the inn-to-gate walk back.
3. Walk east three times, read through the entrance text, and walk
   `ESE` to the clerk at (5,5). Read through to the treasure screen.
   Take opens the coin list directly. Exit that list, Share the money,
   Exit the reward, and read through the new offers. Save into slot I.

The fixture contains game saves and trace data.
