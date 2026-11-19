"""Killable process boundary around Drama 3 model loading and synthesis."""
from __future__ import annotations

import multiprocessing
import importlib
import os
import threading

import numpy as np

SR = 44_100
LOAD_TIMEOUT = float(os.environ.get("DRAMA3_LOAD_TIMEOUT", "600"))
SPEAK_TIMEOUT = float(os.environ.get("DRAMA3_SPEAK_TIMEOUT", "600"))
KILL_GRACE = float(os.environ.get("DRAMA3_KILL_GRACE", "5"))

_process = None
_connection = None
_guard = threading.RLock()


def _stop_locked():
    global _process, _connection
    process, connection = _process, _connection
    _process = _connection = None
    if connection is not None:
        try:
            connection.send({"operation": "stop"})
        except (BrokenPipeError, EOFError, OSError):
            pass
        connection.close()
    if process is not None and process.is_alive():
        process.join(KILL_GRACE)
        if process.is_alive():
            process.terminate()
            process.join(KILL_GRACE)
        if process.is_alive():
            process.kill()
            process.join(KILL_GRACE)


def _receive(timeout, phase):
    if not _connection.poll(timeout):
        _stop_locked()
        raise TimeoutError(f"Drama 3 {phase} exceeded {timeout:.0f} seconds; worker was terminated")
    result = _connection.recv()
    if not result.get("ok"):
        detail = result.get("traceback") or result.get("error") or "unknown worker failure"
        _stop_locked()
        raise RuntimeError(detail)
    return result


def load():
    global _process, _connection
    with _guard:
        if _process is not None and _process.is_alive():
            return
        _stop_locked()
        worker_module = os.environ.get("DRAMA3_WORKER_MODULE", "fish_drama_worker")
        run = importlib.import_module(worker_module).run
        parent, child = multiprocessing.get_context("spawn").Pipe()
        process = multiprocessing.get_context("spawn").Process(target=run, args=(child,), daemon=True)
        process.start()
        child.close()
        _process, _connection = process, parent
        _receive(LOAD_TIMEOUT, "load")


def unload():
    with _guard:
        _stop_locked()


def loaded():
    return _process is not None and _process.is_alive()


def speak(text, ref_path, ref_text, seed=7):
    with _guard:
        if not loaded():
            load()
        _connection.send({"operation": "speak", "text": text, "ref_path": ref_path,
                          "ref_text": ref_text, "seed": int(seed)})
        result = _receive(SPEAK_TIMEOUT, "synthesis")
        return np.frombuffer(result["audio"], dtype=np.dtype(result["dtype"])).copy()
