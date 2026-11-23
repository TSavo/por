# Valjevo Records scribe flight

This controlled C-slot save starts at (14,10) east, one step inside the records room. It comes from `qa/fixtures/valjevo-barracks-ground-paper/C.json`. Only the starting coordinates and facing (bytes `0x3201–0x3203 = 14,10,2`) and an existing alarm flag (low byte for ECL variable `4a64`, cleared to zero) were changed.

Use `valjevo-records-scribe-flight` in `tools/verify-slums-presentation.mjs` for both data sources. The route uses fixed clock 4321731 and Up, Yes, Enter, Enter, Enter. The last input shows the fleeing scribe before the alarm and returns to exploration. The original caption is retained in Classic for its native 900 ms pause.
