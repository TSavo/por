"""Non-CUDA worker used to prove supervisor timeout containment."""
import time


def run(connection):
    connection.send({"ok": True, "event": "loaded", "sample_rate": 44_100})
    while True:
        request = connection.recv()
        if request.get("operation") == "stop":
            return
        time.sleep(60)
