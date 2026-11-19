import os
import pathlib
import sys
import time

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
os.environ["DRAMA3_WORKER_MODULE"] = "test_worker_stub"
os.environ["DRAMA3_LOAD_TIMEOUT"] = "5"
os.environ["DRAMA3_SPEAK_TIMEOUT"] = "0.25"
os.environ["DRAMA3_KILL_GRACE"] = "0.25"

import fish_supervisor as supervisor


def main():
    supervisor.load()
    assert supervisor.loaded()
    started = time.monotonic()
    try:
        supervisor.speak("test", "unused.wav", "test", 7)
    except TimeoutError:
        pass
    else:
        raise AssertionError("expected synthesis timeout")
    elapsed = time.monotonic() - started
    assert elapsed < 2, elapsed
    assert not supervisor.loaded()
    print(f"timeout containment passed in {elapsed:.2f}s")


if __name__ == "__main__":
    main()
