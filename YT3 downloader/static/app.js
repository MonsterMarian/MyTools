const QUALITIES = {
  mp3: [
    { v: "128", t: "128 kbps" },
    { v: "192", t: "192 kbps" },
    { v: "256", t: "256 kbps" },
    { v: "320", t: "320 kbps" },
  ],
  mp4: [
    { v: "360", t: "360p" },
    { v: "480", t: "480p" },
    { v: "720", t: "720p HD" },
    { v: "1080", t: "1080p Full HD" },
    { v: "1440", t: "1440p 2K" },
    { v: "2160", t: "2160p 4K" },
  ],
};

const DEFAULTS = { mp3: "192", mp4: "1080" };

const $ = (s) => document.querySelector(s);

let currentFmt = "mp3";
const activeJobs = new Map();

function fillQuality() {
  const sel = $("#quality");
  sel.innerHTML = "";
  for (const o of QUALITIES[currentFmt]) {
    const op = document.createElement("option");
    op.value = o.v;
    op.textContent = o.t;
    if (o.v === DEFAULTS[currentFmt]) op.selected = true;
    sel.appendChild(op);
  }
}

document.querySelectorAll(".seg-btn").forEach((b) => {
  b.addEventListener("click", () => {
    document.querySelectorAll(".seg-btn").forEach((x) => x.classList.remove("active"));
    b.classList.add("active");
    currentFmt = b.dataset.fmt;
    fillQuality();
  });
});

function fmtBytes(n) {
  if (!n) return "0 B";
  const u = ["B", "KB", "MB", "GB"];
  let i = 0;
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(i ? 1 : 0)} ${u[i]}`;
}

function jobEl(jid) {
  let el = document.getElementById(`job-${jid}`);
  if (el) return el;
  el = document.createElement("div");
  el.className = "job";
  el.id = `job-${jid}`;
  el.innerHTML = `
    <div class="title">…</div>
    <div class="bar"><span></span></div>
    <div class="meta">
      <span class="status">queued</span>
      <span class="rate"></span>
    </div>
  `;
  $("#job-list").appendChild(el);
  $("#jobs").classList.remove("hidden");
  return el;
}

async function pollJob(jid) {
  try {
    const r = await fetch(`/api/status/${jid}`);
    if (!r.ok) return;
    const j = await r.json();
    const el = jobEl(jid);
    el.querySelector(".title").textContent = j.title || j.filename || "Stahuje se…";
    el.querySelector(".bar > span").style.width = `${j.progress || 0}%`;
    const st = el.querySelector(".status");
    st.textContent = j.status === "downloading"
      ? `${(j.progress || 0).toFixed(1)}%`
      : j.status;
    st.classList.toggle("done", j.status === "done");
    st.classList.toggle("error", j.status === "error");
    el.querySelector(".rate").textContent = j.status === "downloading"
      ? `${j.speed || ""} ${j.eta ? "ETA " + j.eta : ""}`
      : (j.error || "");

    if (j.status === "done" || j.status === "error") {
      activeJobs.delete(jid);
      loadFiles();
      setTimeout(() => {
        el.remove();
        if (!$("#job-list").children.length) $("#jobs").classList.add("hidden");
      }, j.status === "done" ? 4000 : 8000);
      return;
    }
  } catch (e) {}
  setTimeout(() => pollJob(jid), 800);
}

$("#go").addEventListener("click", async () => {
  const url = $("#url").value.trim();
  if (!url) { $("#url").focus(); return; }
  const fmt = currentFmt;
  const quality = $("#quality").value;
  const btn = $("#go");
  btn.disabled = true;
  btn.textContent = "Spouštím…";
  try {
    const r = await fetch("/api/download", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, format: fmt, quality }),
    });
    const j = await r.json();
    if (j.error) { alert(j.error); return; }
    activeJobs.set(j.job_id, true);
    jobEl(j.job_id);
    pollJob(j.job_id);
    $("#url").value = "";
  } catch (e) {
    alert("Chyba: " + e.message);
  } finally {
    btn.disabled = false;
    btn.textContent = "Stáhnout";
  }
});

$("#url").addEventListener("keydown", (e) => {
  if (e.key === "Enter") $("#go").click();
});

async function loadFiles() {
  const r = await fetch("/api/list");
  const list = await r.json();
  const wrap = $("#files");
  if (!list.length) {
    wrap.innerHTML = '<div class="empty">Zatím žádné soubory.</div>';
    return;
  }
  wrap.innerHTML = "";
  for (const f of list) {
    const div = document.createElement("div");
    div.className = "file";
    div.innerHTML = `
      <div>
        <div class="name"></div>
        <div class="info">${fmtBytes(f.size)}</div>
      </div>
      <div class="file-actions">
        <a href="/api/file-by-name/${encodeURIComponent(f.name)}" download>Stáhnout</a>
        <button class="del" data-name="${f.name.replace(/"/g,'&quot;')}">Smazat</button>
      </div>
    `;
    div.querySelector(".name").textContent = f.name;
    div.querySelector(".del").addEventListener("click", async () => {
      if (!confirm(`Smazat ${f.name}?`)) return;
      await fetch(`/api/delete/${encodeURIComponent(f.name)}`, { method: "DELETE" });
      loadFiles();
    });
    wrap.appendChild(div);
  }
}

$("#refresh").addEventListener("click", loadFiles);

fillQuality();
loadFiles();
