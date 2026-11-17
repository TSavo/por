import fs from "node:fs";
import path from "node:path";
import { defineConfig, type Plugin } from "vite";
import { findGameRoot } from "./tools/gamedata.js";

function gameDataPlugin(): Plugin {
  return {
    name: "por-gamedata",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url ?? "";
        if (url.startsWith("/api/files")) {
          const root = findGameRoot();
          const files = root
            ? fs.readdirSync(root).filter((name) => fs.statSync(path.join(root, name)).isFile())
            : [];
          res.setHeader("content-type", "application/json");
          res.end(
            JSON.stringify({
              root,
              files,
              error: root
                ? undefined
                : "No game directory. Set POR_GAMEDATA to your Pool of Radiance folder, or copy it to ./gamedata (gitignored).",
            }),
          );
          return;
        }
        if (url.startsWith("/api/file/")) {
          const root = findGameRoot();
          const name = decodeURIComponent(url.slice("/api/file/".length).split("?")[0] ?? "");
          if (!root || !name || name !== path.basename(name) || name.includes("..")) {
            res.statusCode = 404;
            res.end("missing");
            return;
          }
          const file = path.join(root, name);
          if (!fs.existsSync(file)) {
            res.statusCode = 404;
            res.end("missing");
            return;
          }
          res.setHeader("content-type", "application/octet-stream");
          fs.createReadStream(file).pipe(res);
          return;
        }
        if (url.startsWith("/api/overrides")) {
          const manifestPath = path.resolve("upgrades/manifest.json");
          const raw = fs.existsSync(manifestPath)
            ? fs.readFileSync(manifestPath, "utf8")
            : JSON.stringify({ version: 1, assets: {} });
          res.setHeader("content-type", "application/json");
          res.end(raw);
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [gameDataPlugin()],
  server: {
    host: "0.0.0.0",
    port: 43123,
    strictPort: true,
  },
});
