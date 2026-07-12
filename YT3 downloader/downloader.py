import os
import sys
import threading
import tkinter as tk
from tkinter import ttk, filedialog, messagebox

try:
    import yt_dlp
except ImportError:
    print("yt-dlp missing. Install: pip install yt-dlp")
    sys.exit(1)


def download_mp3(url, out_dir, quality, progress_cb, done_cb):
    class Logger:
        def debug(self, msg): pass
        def warning(self, msg): progress_cb(msg)
        def error(self, msg): progress_cb(msg)

    def hook(d):
        if d["status"] == "downloading":
            pct = d.get("_percent_str", "").strip()
            speed = d.get("_speed_str", "").strip()
            progress_cb(f"Download {pct} @ {speed}")
        elif d["status"] == "finished":
            progress_cb("Convert to MP3...")

    opts = {
        "format": "bestaudio/best",
        "outtmpl": os.path.join(out_dir, "%(title)s.%(ext)s"),
        "postprocessors": [{
            "key": "FFmpegExtractAudio",
            "preferredcodec": "mp3",
            "preferredquality": quality,
        }],
        "progress_hooks": [hook],
        "logger": Logger(),
        "noplaylist": False,
        "ignoreerrors": True,
    }

    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            ydl.download([url])
        done_cb(True, "Done.")
    except Exception as e:
        done_cb(False, str(e))


class App(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("YT3 Downloader")
        self.geometry("560x340")
        self.resizable(False, False)

        pad = {"padx": 10, "pady": 6}

        ttk.Label(self, text="YouTube URL:").grid(row=0, column=0, sticky="w", **pad)
        self.url_var = tk.StringVar()
        ttk.Entry(self, textvariable=self.url_var, width=60).grid(row=0, column=1, columnspan=2, **pad)

        ttk.Label(self, text="Output folder:").grid(row=1, column=0, sticky="w", **pad)
        self.dir_var = tk.StringVar(value=os.path.join(os.path.expanduser("~"), "Music"))
        ttk.Entry(self, textvariable=self.dir_var, width=48).grid(row=1, column=1, **pad)
        ttk.Button(self, text="Browse", command=self.pick_dir).grid(row=1, column=2, **pad)

        ttk.Label(self, text="Quality (kbps):").grid(row=2, column=0, sticky="w", **pad)
        self.q_var = tk.StringVar(value="192")
        ttk.Combobox(self, textvariable=self.q_var, values=["128", "192", "256", "320"],
                     width=10, state="readonly").grid(row=2, column=1, sticky="w", **pad)

        self.btn = ttk.Button(self, text="Download MP3", command=self.start)
        self.btn.grid(row=3, column=0, columnspan=3, pady=12)

        self.status = tk.StringVar(value="Idle.")
        ttk.Label(self, textvariable=self.status, foreground="blue").grid(
            row=4, column=0, columnspan=3, sticky="w", **pad)

        self.log = tk.Text(self, height=8, width=66, state="disabled")
        self.log.grid(row=5, column=0, columnspan=3, padx=10, pady=4)

    def pick_dir(self):
        d = filedialog.askdirectory(initialdir=self.dir_var.get())
        if d:
            self.dir_var.set(d)

    def log_msg(self, msg):
        self.status.set(msg)
        self.log.config(state="normal")
        self.log.insert("end", msg + "\n")
        self.log.see("end")
        self.log.config(state="disabled")

    def start(self):
        url = self.url_var.get().strip()
        out = self.dir_var.get().strip()
        if not url:
            messagebox.showerror("Error", "Enter URL.")
            return
        if not os.path.isdir(out):
            try:
                os.makedirs(out, exist_ok=True)
            except Exception as e:
                messagebox.showerror("Error", f"Bad folder: {e}")
                return

        self.btn.config(state="disabled")
        self.log_msg(f"Start: {url}")

        def prog(m): self.after(0, self.log_msg, m)

        def done(ok, msg):
            def finish():
                self.log_msg(("OK: " if ok else "FAIL: ") + msg)
                self.btn.config(state="normal")
                if ok:
                    messagebox.showinfo("Done", "MP3 saved.")
                else:
                    messagebox.showerror("Failed", msg)
            self.after(0, finish)

        threading.Thread(
            target=download_mp3,
            args=(url, out, self.q_var.get(), prog, done),
            daemon=True,
        ).start()


def cli():
    import argparse
    p = argparse.ArgumentParser(description="YouTube to MP3")
    p.add_argument("url")
    p.add_argument("-o", "--out", default=".")
    p.add_argument("-q", "--quality", default="192", choices=["128", "192", "256", "320"])
    a = p.parse_args()
    download_mp3(a.url, a.out, a.quality, print, lambda ok, m: print(("OK: " if ok else "FAIL: ") + m))


if __name__ == "__main__":
    if len(sys.argv) > 1:
        cli()
    else:
        App().mainloop()
