"""Lazy Drama 3 Small adapter for the shared Battleaxe Fish service."""
from __future__ import annotations

import os
import pathlib
import wave

import numpy as np

SRC = pathlib.Path(os.environ.get("DRAMA3_SRC", "/envs/drama3_small/src"))
GGUF = pathlib.Path(os.environ.get("DRAMA3_GGUF", "/models/drama3-small/drama3-small-IQ3_XXS.gguf"))
SR = 44_100

_tts = None


def load():
    global _tts
    if _tts is not None:
        return
    if not GGUF.is_file():
        raise FileNotFoundError(f"Drama 3 weights not found: {GGUF}")
    import sys
    if str(SRC) not in sys.path:
        sys.path.insert(0, str(SRC))
    from drama3_torch.generate import Drama3TTS
    _tts = Drama3TTS(GGUF, "cuda", expert_offload=1.0)


def unload():
    global _tts
    _tts = None
    import gc
    import torch
    gc.collect()
    torch.cuda.empty_cache()


def _read_wav(path: str):
    import torch
    with wave.open(path, "rb") as source:
        channels = source.getnchannels()
        width = source.getsampwidth()
        rate = source.getframerate()
        frames = source.readframes(source.getnframes())
    if width != 2:
        raise ValueError("Drama 3 reference must be a 16-bit PCM WAV")
    audio = np.frombuffer(frames, dtype="<i2").astype(np.float32) / 32768.0
    if channels > 1:
        audio = audio.reshape(-1, channels).mean(axis=1)
    return torch.from_numpy(audio), rate


def speak(text: str, ref_path: str, ref_text: str, seed: int = 7):
    load()
    from drama3_torch.generate import Sampling
    from drama3_torch.text import Take
    audio, rate = _read_wav(ref_path)
    audio = audio[: 30 * rate]
    codes = _tts.encode_reference(audio, rate)
    sampling = Sampling(seed=seed, temperature=0.7, top_p=0.7, top_k=30,
                        max_frames=45 * 21, max_pause_frames=round(0.45 * 21))
    result = _tts.generate(text, [Take(ref_text, codes)], sampling=sampling, streaming=True)
    return result.audio.detach().float().cpu().numpy()
