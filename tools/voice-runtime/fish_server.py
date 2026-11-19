"""Lazy Drama 3 Small HTTP service for Battleaxe's RTX 3070."""
import gc, io, json, os, pathlib, threading, time, wave
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import numpy as np

APP = pathlib.Path(os.environ.get("STUDIO_APP", "/app"))
PORT = int(os.environ.get("FISH_PORT", "8881"))
NEED_GB = float(os.environ.get("FISH_NEED_GB", "4.6"))
IDLE_UNLOAD = float(os.environ.get("FISH_IDLE_UNLOAD", "900"))
import fish_supervisor as engine
lock = threading.Lock()
state = {"loaded": False, "last": time.time()}

def gpu():
    import torch
    free, total = torch.cuda.mem_get_info()
    return round(free / 2 ** 30, 2), round(total / 2 ** 30, 2)

def peak():
    import torch
    return round(torch.cuda.max_memory_allocated() / 2 ** 30, 2)

def load():
    if state["loaded"] and engine.loaded(): return
    free, total = gpu()
    if free < NEED_GB: raise MemoryError(f"only {free} of {total} GB free; Drama 3 Small needs about {NEED_GB} GB")
    import torch
    torch.cuda.reset_peak_memory_stats()
    engine.load()
    state["loaded"] = engine.loaded()

def unload():
    engine.unload(); gc.collect(); state["loaded"] = False

def ref_file(rel):
    p = (APP / str(rel or "")).resolve()
    if not str(rel or "").startswith("personas/") or APP.resolve() / "personas" not in p.parents or not p.is_file():
        raise ValueError(f"ref_path {rel!r} is not a file under personas/")
    return str(p)

def wav_bytes(samples):
    buf = io.BytesIO()
    with wave.open(buf, "wb") as out:
        out.setnchannels(1); out.setsampwidth(2); out.setframerate(engine.SR)
        out.writeframes((np.clip(samples, -1, 1) * 32767).astype("<i2").tobytes())
    return buf.getvalue()

class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args): pass
    def send(self, code, body, content_type="application/json"):
        if not isinstance(body, bytes): body = json.dumps(body).encode()
        self.send_response(code); self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body))); self.end_headers(); self.wfile.write(body)
    def do_GET(self):
        if self.path != "/health": return self.send(404, {"error": "not found"})
        free, total = gpu()
        state["loaded"] = engine.loaded()
        self.send(200, {"model": "drama3-small", "loaded": state["loaded"], "sr": engine.SR,
                        "free_gb": free, "total_gb": total, "peak_gb": peak()})
    def do_POST(self):
        try:
            body = json.loads(self.rfile.read(int(self.headers.get("Content-Length") or 0)) or b"{}")
            state["last"] = time.time()
            with lock:
                if self.path in ("/load", "/drama/load"):
                    load(); return self.send(200, {"loaded": True, "model": "drama3-small"})
                if self.path in ("/unload", "/drama/unload"):
                    unload(); return self.send(200, {"loaded": False, "model": "drama3-small"})
                if self.path in ("/tts", "/drama/tts"):
                    text, ref_text = str(body.get("text") or "").strip(), str(body.get("ref_text") or "").strip()
                    if not text or not ref_text: return self.send(400, {"error": "text and ref_text are required"})
                    reference = ref_file(body.get("ref_path")); load(); started = time.time()
                    samples = engine.speak(text, reference, ref_text, int(body.get("seed") or 7))
                    print(f"[{time.strftime('%H:%M:%S')}] {len(samples)/engine.SR:.1f}s in {time.time()-started:.0f}s: {text[:60]!r}", flush=True)
                    return self.send(200, wav_bytes(samples), "audio/wav")
                self.send(404, {"error": "not found"})
        except MemoryError as error: self.send(409, {"error": str(error)})
        except ValueError as error: self.send(400, {"error": str(error)})
        except Exception as error: self.send(500, {"error": f"{type(error).__name__}: {error}"})
        finally: state["last"] = time.time()

def idle():
    while True:
        time.sleep(30)
        if state["loaded"] and time.time()-state["last"] > IDLE_UNLOAD and lock.acquire(blocking=False):
            try: unload()
            finally: lock.release()

if __name__ == "__main__":
    threading.Thread(target=idle, daemon=True).start()
    print(f"Drama 3 Small server on :{PORT}", flush=True)
    ThreadingHTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
