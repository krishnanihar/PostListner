"""HTDemucs sidecar — accepts an mp3 upload, returns a 4-stem zip.

POST /separate
  multipart: file=<mp3>
  → 200: application/zip with vocals.mp3, drums.mp3, bass.mp3, other.mp3

GET /healthz → 200 ok

The Next.js compose route forwards the just-generated track here, then proxies
the stems back to the client via /api/stems. CPU separation at htdemucs takes
~25–60s per minute of audio; for a 6-min track expect 2–6 minutes wall time.
GPU optional. Memory ~3GB peak.
"""

import io
import os
import shutil
import subprocess
import tempfile
import zipfile
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import Response

app = FastAPI()

@app.get("/healthz")
def healthz():
    return {"ok": True}

@app.post("/separate")
async def separate(file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith((".mp3", ".wav")):
        raise HTTPException(400, "expected .mp3 or .wav")
    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)
        in_path = tmp_path / "input.mp3"
        with in_path.open("wb") as f:
            shutil.copyfileobj(file.file, f)
        out_root = tmp_path / "out"
        out_root.mkdir()
        # demucs writes to <out_root>/htdemucs/<input-stem>/{vocals,drums,bass,other}.mp3
        cmd = [
            "demucs",
            "-n", "htdemucs",
            "--mp3",
            "--two-stems", "vocals",  # remove this line for full 4-stem; left here as a switch
            "-o", str(out_root),
            str(in_path),
        ]
        # remove --two-stems to get full 4-stem separation
        cmd = [c for c in cmd if not c.startswith("--two-stems") and c != "vocals"]
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            raise HTTPException(500, f"demucs failed: {result.stderr[-500:]}")
        stems_dir = out_root / "htdemucs" / "input"
        if not stems_dir.exists():
            raise HTTPException(500, "demucs produced no output")
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
            for stem in ("vocals", "drums", "bass", "other"):
                p = stems_dir / f"{stem}.mp3"
                if not p.exists():
                    raise HTTPException(500, f"missing stem: {stem}")
                zf.write(p, f"{stem}.mp3")
        return Response(buf.getvalue(), media_type="application/zip")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", "8001")))
