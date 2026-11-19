# Battleaxe Fish runtime

The existing `voice-stack-fish-1` service remains the single Fish endpoint on port 8881, but Drama 3 Small replaces Fish S2 Pro.

- Routes remain `/health`, `/load`, `/unload`, and `/tts`; `/drama/*` aliases are also accepted.
- The Drama 3 source is pinned under `/data/persona-voice-envs/drama3_small/src`.
- Its GGUF is stored outside Git at `/data/persona-models/drama3-small/drama3-small-IQ3_XXS.gguf`.
- Full expert offload is required for the 8 GB RTX 3070.

The deployment preserves the HTTP shape while replacing the underlying model.

Drama runs in a spawned worker process rather than the HTTP server process. Cold model loading and synthesis each have a ten-minute deadline. A timeout or worker failure terminates that worker and its CUDA context without taking down Docker, WSL, Persona Studio, or the HTTP supervisor. These deadlines limit wall-clock computation; they do not truncate produced narration. Drama's own normal text chunking remains intact. The 10.4 GB model volume reads at roughly 62 MB/s when cold, so reading the weights alone takes about three minutes after a reboot.
