"""Child process that owns all Drama 3 CUDA state."""
from __future__ import annotations

import traceback


def run(connection):
    try:
        import fish_drama3 as engine
        engine.load()
        connection.send({"ok": True, "event": "loaded", "sample_rate": engine.SR})
        while True:
            request = connection.recv()
            operation = request.get("operation")
            if operation == "stop":
                return
            if operation != "speak":
                connection.send({"ok": False, "error": f"unknown operation: {operation}"})
                continue
            audio = engine.speak(request["text"], request["ref_path"], request["ref_text"], request["seed"])
            connection.send({"ok": True, "event": "audio", "audio": audio.tobytes(), "dtype": str(audio.dtype)})
    except EOFError:
        return
    except BaseException as error:
        try:
            connection.send({"ok": False, "error": f"{type(error).__name__}: {error}",
                             "traceback": traceback.format_exc()})
        except BaseException:
            pass
    finally:
        connection.close()
