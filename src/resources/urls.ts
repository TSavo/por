import { resourceKind, type ResourceId } from "./provider.js";

/**
 * The URL the game's local server answers for an id (tools/browser-play.ts, tools/web/serve.ts), the
 * same paths the page has always fetched: `/art/<key>`, `/atlas/<file>`, `/audio/<file>`, ...
 */
export function serverUrl(id: ResourceId): string | undefined {
  const parsed = resourceKind(id);
  if (!parsed) return;
  const { kind, name } = parsed;
  switch (kind) {
    case "art": return `/art/${name}`;
    case "art-materials": return `/art-materials/${name}`;
    case "atlas": return `/atlas/${name}`;
    case "codewheel": return `/code-wheel/${name}`;
    case "font": return "/font.woff2";
    case "index": return "/resource-index.json";
    case "audio":
      if (name.startsWith("classic:")) return `/audio/${name.slice(8)}`;
      if (name.startsWith("enhanced:")) return `/enhanced-audio/${name.slice(9)}`;
      return;
    case "voice": return `/voice/${name}`;
    case "narration": return `/narration/${encodeURIComponent(name)}`;
    case "map":
      if (name === "atlas.json") return "/atlas.json";
      if (name === "geography-model.json") return "/geography-model.json";
      return;
    case "manifest":
      if (name === "src/audio/voices.json") return "/voice-manifest.json";
      if (name === "src/codewheel/wheel.json") return "/code-wheel/layout";
      return `/manifest/${name}`;
    case "game": return `/game/${name}`;
    case "upgrades": return `/upgrades/${name}`;
    default: return;
  }
}

/** The id a server URL names, the inverse of `serverUrl`; undefined for any other path. */
export function serverId(path: string): ResourceId | undefined {
  const after = (prefix: string) => path.startsWith(prefix) ? path.slice(prefix.length) : undefined;
  let rest: string | undefined;
  if ((rest = after("/art-materials/")) !== undefined) return `art-materials:${rest}`;
  if ((rest = after("/art/")) !== undefined) return `art:${rest}`;
  if ((rest = after("/atlas/")) !== undefined) return `atlas:${rest}`;
  if (path === "/code-wheel/layout") return "manifest:src/codewheel/wheel.json";
  if ((rest = after("/code-wheel/")) !== undefined) return `codewheel:${rest}`;
  if (path === "/font.woff2") return "font";
  if (path === "/resource-index.json") return "index";
  if ((rest = after("/audio/")) !== undefined) return `audio:classic:${rest}`;
  if ((rest = after("/enhanced-audio/")) !== undefined) return `audio:enhanced:${rest}`;
  if ((rest = after("/voice/")) !== undefined) return `voice:${rest}`;
  if ((rest = after("/narration/")) !== undefined) {
    try { return `narration:${decodeURIComponent(rest)}`; } catch { return; }
  }
  if (path === "/atlas.json") return "map:atlas.json";
  if (path === "/geography-model.json") return "map:geography-model.json";
  if (path === "/voice-manifest.json") return "manifest:src/audio/voices.json";
  if ((rest = after("/manifest/")) !== undefined) return `manifest:${rest}`;
  if ((rest = after("/game/")) !== undefined) return `game:${rest}`;
  if ((rest = after("/upgrades/")) !== undefined) return `upgrades:${rest}`;
  return;
}
