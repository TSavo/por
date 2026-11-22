// The runner's first import (tools/boot-translated.ts). The browser server and the port parity check
// hand the runner its artwork keys in a file, POR_ENHANCED_ART_FILE (tools/enhanced-runner.ts), because
// on Linux they do not fit in the environment (#146). This puts them where the runner reads them,
// POR_TILE_ART_KEYS and the rest, before any other module looks.
import { readFileSync } from "node:fs";

const file = process.env.POR_ENHANCED_ART_FILE;
if (file) Object.assign(process.env, JSON.parse(readFileSync(file, "utf8")) as Record<string, string>);
