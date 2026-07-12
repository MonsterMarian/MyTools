import os
import sys
import uuid
import threading
import webbrowser
from pathlib import Path
from flask import Flask, request, jsonify, send_from_directory, send_file, render_template

import yt_dlp

BASE = Path(__file__).parent
DOWNLOADS = BASE / "downloads"
DOWNLOADS.mkdir(exist_ok=True)

FFMPEG_DIR = r"C:\Users\Marian\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.1.1-full_build\bin"
if os.path.isdir(FFMPEG_DIR):
    os.environ["PATH"] = FFMPEG_DIR + os.pathsep + os.environ.get("PATH", "")

app = Flask(__name__, static_folder="static", template_folder="templates")

JOBS = {}
LOCK = threading.Lock()


def new_job():
    jid = uuid.uuid4().hex[:12]
    with LOCK:
        JOBS[jid] = {
            "status": "queued",
            "progress": 0.0,
            "speed": "",
            "eta": "",
            "title": "",
            "filename": "",
            "error": "",
            "log": [],
        }
    return jid


def update(jid, **kw):
    with LOCK:
        if jid in JOBS:
            JOBS[jid].update(kw)


def log(jid, msg):
    with LOCK:
        if jid in JOBS:
            JOBS[jid]["log"].append(msg)
            if len(JOBS[jid]["log"]) > 200:
                JOBS[jid]["log"] = JOBS[jid]["log"][-200:]


def make_hook(jid):
    def hook(d):
        st = d.get("status")
        if st == "downloading":
            total = d.get("total_bytes") or d.get("total_bytes_estimate") or 0
            done = d.get("downloaded_bytes") or 0
            pct = (done / total * 100) if total else 0
            update(
                jid,
                status="downloading",
                progress=round(pct, 2),
                speed=d.get("_speed_str", "").strip(),
                eta=d.get("_eta_str", "").strip(),
            )
        elif st == "finished":
            update(jid, status="processing", progress=100.0)
            log(jid, "Postprocess...")
    return hook


def run_job(jid, url, fmt, quality):
    try:
        update(jid, status="starting")
        log(jid, f"URL: {url}")
        log(jid, f"Format: {fmt} {quality}")

        outtmpl = str(DOWNLOADS / "%(title).200B [%(id)s].%(ext)s")
        opts = {
            "outtmpl": outtmpl,
            "progress_hooks": [make_hook(jid)],
            "noplaylist": True,
            "quiet": True,
            "no_warnings": True,
        }

        if fmt == "mp3":
            opts["format"] = "bestaudio/best"
            opts["postprocessors"] = [{
                "key": "FFmpegExtractAudio",
                "preferredcodec": "mp3",
                "preferredquality": quality,
            }]
            ext = "mp3"
        else:
            res = quality if quality in ("360", "480", "720", "1080", "1440", "2160") else "1080"
            opts["format"] = f"bestvideo[height<={res}][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<={res}]+bestaudio/best[height<={res}]"
            opts["merge_output_format"] = "mp4"
            opts["postprocessors"] = [{
                "key": "FFmpegVideoConvertor",
                "preferedformat": "mp4",
            }]
            ext = "mp4"

        with yt_dlp.YoutubeDL(opts) as ydl:
            info = ydl.extract_info(url, download=True)
            title = info.get("title", "video")
            vid = info.get("id", "")
            base_name = f"{title} [{vid}]"
            safe = "".join(c if c not in '<>:"/\\|?*' else "_" for c in base_name)
            target = None
            for p in DOWNLOADS.iterdir():
                if p.stem.endswith(f"[{vid}]") and p.suffix.lower() == f".{ext}":
                    target = p
                    break
            if not target:
                guess = DOWNLOADS / f"{safe}.{ext}"
                if guess.exists():
                    target = guess
            if target:
                update(jid, status="done", filename=target.name, title=title, progress=100.0)
                log(jid, f"Saved: {target.name}")
            else:
                update(jid, status="error", error="Output file not found")
    except Exception as e:
        update(jid, status="error", error=str(e))
        log(jid, f"ERROR: {e}")


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/download", methods=["POST"])
def api_download():
    data = request.get_json(force=True)
    url = (data.get("url") or "").strip()
    fmt = data.get("format", "mp3")
    quality = str(data.get("quality", "192"))
    if not url:
        return jsonify({"error": "Missing url"}), 400
    if fmt not in ("mp3", "mp4"):
        return jsonify({"error": "Bad format"}), 400
    jid = new_job()
    threading.Thread(target=run_job, args=(jid, url, fmt, quality), daemon=True).start()
    return jsonify({"job_id": jid})


@app.route("/api/status/<jid>")
def api_status(jid):
    with LOCK:
        j = JOBS.get(jid)
        if not j:
            return jsonify({"error": "Unknown job"}), 404
        return jsonify(j)


@app.route("/api/file/<jid>")
def api_file(jid):
    with LOCK:
        j = JOBS.get(jid)
    if not j or j["status"] != "done":
        return jsonify({"error": "Not ready"}), 404
    return send_from_directory(DOWNLOADS, j["filename"], as_attachment=True)


@app.route("/api/list")
def api_list():
    files = []
    for p in sorted(DOWNLOADS.iterdir(), key=lambda x: x.stat().st_mtime, reverse=True):
        if p.is_file():
            files.append({
                "name": p.name,
                "size": p.stat().st_size,
                "mtime": p.stat().st_mtime,
            })
    return jsonify(files)


@app.route("/api/file-by-name/<path:name>")
def api_file_by_name(name):
    return send_from_directory(DOWNLOADS, name, as_attachment=True)


@app.route("/api/delete/<path:name>", methods=["DELETE"])
def api_delete(name):
    p = DOWNLOADS / name
    if p.is_file() and p.parent == DOWNLOADS:
        p.unlink()
        return jsonify({"ok": True})
    return jsonify({"error": "Not found"}), 404


if __name__ == "__main__":
    port = 5000
    if "--no-browser" not in sys.argv:
        threading.Timer(1.2, lambda: webbrowser.open(f"http://127.0.0.1:{port}")).start()
    app.run(host="127.0.0.1", port=port, debug=False)
