# How to run

## First-time setup (once)

1. **Install Python 3.9+** — https://www.python.org/downloads/ (check "Add to PATH")
2. **Install dependencies** — open PowerShell in project folder:
   ```powershell
   pip install -r requirements.txt
   ```
3. **Install ffmpeg**:
   ```powershell
   winget install Gyan.FFmpeg
   ```
   Close and reopen PowerShell after install.

## Run web UI

Double-click **`run-web.bat`**.

Browser opens `http://127.0.0.1:5000`.

1. Paste YouTube URL
2. Pick format: **MP3** or **MP4**
3. Pick quality
4. Click **Stáhnout**
5. File appears in "Stažené soubory" — click **Stáhnout** to save to disk, or grab from `downloads/` folder.

To stop server: close PowerShell window (or Ctrl+C).

## Run CLI

```powershell
python downloader.py "https://www.youtube.com/watch?v=VIDEO_ID" -o "C:\Music" -q 320
```

Flags:
- `-o <folder>` — output folder (default: current dir)
- `-q <quality>` — MP3 kbps: 128 / 192 / 256 / 320

## Run Tkinter GUI

Double-click **`run.bat`**.

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `ModuleNotFoundError: yt_dlp` | `pip install yt-dlp` |
| `ffmpeg not found` | install ffmpeg, restart shell, OR edit `FFMPEG_DIR` in `server.py` |
| Port 5000 busy | change `port = 5000` at bottom of `server.py` |
| Browser does not open | open `http://127.0.0.1:5000` manually |
| Slow / stuck download | YouTube throttling — try again or update yt-dlp: `pip install -U yt-dlp` |

## Update yt-dlp

YouTube changes break yt-dlp regularly. Update:
```powershell
pip install -U yt-dlp
```
