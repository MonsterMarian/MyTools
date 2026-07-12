# YT3 Downloader

YouTube → MP3 / MP4 downloader. Web UI (HTML/CSS/JS), Flask backend, yt-dlp + ffmpeg.

## Features

- **MP3**: 128 / 192 / 256 / 320 kbps
- **MP4**: 360p / 480p / 720p / 1080p / 1440p / 2160p
- Web UI with live progress, speed, ETA
- Parallel jobs
- Downloaded-files list with download / delete
- CLI + Tkinter GUI fallback (`downloader.py`)

## Requirements

- Python 3.9+
- `yt-dlp`, `flask`
- `ffmpeg` on `PATH` (or set `FFMPEG_DIR` in `server.py`)

## Install

```powershell
pip install -r requirements.txt
winget install Gyan.FFmpeg
```

Restart shell after ffmpeg install (PATH refresh).

## Run

### Web UI (recommended)

```powershell
.\run-web.bat
```

Opens `http://127.0.0.1:5000` in browser. Files saved to `downloads/`.

### CLI

```powershell
python downloader.py "<url>" -o "C:\Music" -q 320
```

### Tkinter GUI

```powershell
.\run.bat
```

## API

| Method | Path | Body / Notes |
|--------|------|--------------|
| POST   | `/api/download` | `{url, format: "mp3"\|"mp4", quality}` → `{job_id}` |
| GET    | `/api/status/<jid>` | progress, status, error, filename |
| GET    | `/api/list` | array of files in `downloads/` |
| GET    | `/api/file-by-name/<name>` | download file |
| DELETE | `/api/delete/<name>` | remove file |

## Project layout

```
YT3 downloader/
├── server.py            Flask backend
├── downloader.py        CLI + Tkinter
├── templates/index.html
├── static/style.css
├── static/app.js
├── run-web.bat
├── run.bat
├── requirements.txt
└── downloads/           output
```

## Config

`server.py` top — `FFMPEG_DIR` constant. Edit if ffmpeg installed elsewhere. If on PATH, value ignored.

Port: change `port = 5000` at bottom of `server.py`.

## Notes

- Server binds `127.0.0.1` only (local).
- `--no-browser` flag skips auto-open.
- Playlists: web UI uses `noplaylist=True` (single video). CLI follows playlists.
- Video filenames: `Title [video_id].ext`.

## License

Personal use. Respect YouTube ToS and copyright.
