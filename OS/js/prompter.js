document.addEventListener("DOMContentLoaded", () => {
  const storLocal = (typeof browser !== "undefined" && browser.storage)
    ? browser.storage.local
    : (typeof chrome !== "undefined" ? chrome.storage.local : null);

  const tr = (key) => (window.i18n && window.i18n.t) ? window.i18n.t(key) : key;

  const safeScrollIntoView = (el) => {
    if (el && typeof el.scrollIntoView === "function") {
      try { el.scrollIntoView({ block: "nearest", behavior: "auto" }); } catch (e) { /* not supported */ }
    }
  };

  const stage = document.getElementById("prompter-stage");
  const track = document.getElementById("prompter-track");
  const nowBar = document.getElementById("prompter-now");
  const notesPanel = document.getElementById("prompter-notes");
  const notesList = document.getElementById("prompter-notes-list");
  const toggleBtn = document.getElementById("prompter-toggle");
  const resetBtn = document.getElementById("prompter-reset");
  const notesBtn = document.getElementById("prompter-notes-toggle");
  const speedSlider = document.getElementById("prompter-speed");
  const speedVal = document.getElementById("prompter-speed-val");
  const fontSlider = document.getElementById("prompter-font");
  const fontVal = document.getElementById("prompter-font-val");

  if (!storLocal || !stage || !track) {
    if (track && !storLocal) track.textContent = "Không hỗ trợ Storage API.";
    return;
  }

  let paras = [];
  let playing = false;
  let rafId = 0;
  let lastTs = 0;
  let suppressNoteScroll = false;

  const pxPerSec = () => parseFloat(speedSlider.value) * 56;

  function measure() {
    for (const p of paras) {
      p.top = p.el.offsetTop;
      p.height = p.el.offsetHeight;
    }
  }

  function updateHighlight() {
    if (!paras.length) return;
    const probe = stage.scrollTop + stage.clientHeight * 0.35;
    let idx = -1;
    for (let i = 0; i < paras.length; i++) {
      if (probe < paras[i].top + paras[i].height * 0.5) { idx = i; break; }
    }
    if (idx < 0) idx = paras.length - 1;
    paras.forEach((p, i) => {
      p.el.classList.toggle("active", i === idx);
      if (p.note) p.note.classList.toggle("active", i === idx);
    });
    if (idx >= 0 && paras[idx].note && !suppressNoteScroll) {
      safeScrollIntoView(paras[idx].note);
    }
    if (idx >= 0 && nowBar) {
      const t = (paras[idx].el.textContent || "").replace(/\s+/g, " ").trim();
      nowBar.textContent = tr("prompter_now") + ": " + t.slice(0, 160);
    }
  }

  function tick(ts) {
    rafId = requestAnimationFrame(tick);
    if (!playing) return;
    const dt = lastTs ? (ts - lastTs) / 1000 : 0;
    lastTs = ts;
    stage.scrollTop += pxPerSec() * dt;
    const max = stage.scrollHeight - stage.clientHeight;
    if (stage.scrollTop >= max - 1) {
      stage.scrollTop = max;
      playing = false;
      toggleBtn.textContent = tr("prompter_play");
      updateHighlight();
    } else {
      updateHighlight();
    }
  }

  function play() {
    playing = true;
    lastTs = 0;
    toggleBtn.textContent = tr("prompter_pause");
    toggleBtn.classList.add("playing");
  }

  function pause() {
    playing = false;
    toggleBtn.textContent = tr("prompter_play");
    toggleBtn.classList.remove("playing");
  }

  function togglePlay() { (playing ? pause() : play()); }

  function renderScript(text) {
    track.textContent = "";
    notesList.textContent = "";
    paras = [];
    const loading = document.getElementById("prompter-loading");
    if (loading) loading.remove();
    if (!text || !String(text).trim()) {
      const empty = document.createElement("div");
      empty.id = "prompter-empty";
      empty.textContent = tr("script_prompter_empty");
      track.appendChild(empty);
      return;
    }
    const chunks = String(text).replace(/\r\n/g, "\n").split(/\n\s*\n+/).map(c => c.trim()).filter(Boolean);
    chunks.forEach((chunk) => {
      const p = document.createElement("div");
      p.className = "prompter-para";
      p.textContent = chunk;
      p.addEventListener("click", () => {
        if (paras.length) {
          const idx = paras.findIndex(x => x.el === p);
          if (idx >= 0) {
            stage.scrollTop = Math.max(0, paras[idx].top - stage.clientHeight * 0.15);
            updateHighlight();
          }
        }
      });
      track.appendChild(p);
      const note = document.createElement("div");
      note.className = "prompter-note";
      note.textContent = chunk.slice(0, 220);
      note.addEventListener("click", () => {
        if (paras.length) {
          const idx = paras.findIndex(x => x.note === note);
          if (idx >= 0) {
            stage.scrollTop = Math.max(0, paras[idx].top - stage.clientHeight * 0.15);
            updateHighlight();
          }
        }
      });
      notesList.appendChild(note);
      paras.push({ el: p, note: note, top: 0, height: 0 });
    });
    measure();
    stage.scrollTop = 0;
    pause();
    updateHighlight();
  }

  function persistPrefs() {
    try {
      storLocal.get("super_video_settings", (res) => {
        const s = (res && res.super_video_settings && typeof res.super_video_settings === "object")
          ? res.super_video_settings : {};
        s.prompter_speed = parseFloat(speedSlider.value);
        s.prompter_font = parseInt(fontSlider.value, 10);
        storLocal.set({ super_video_settings: s });
      });
    } catch (e) { /* storage unavailable */ }
  }

  function setSpeedUI() {
    const v = parseFloat(speedSlider.value);
    speedVal.textContent = v.toFixed(1) + "x";
    document.documentElement.style.setProperty("--prompter-speed", String(v));
  }

  function setFontUI() {
    const v = parseInt(fontSlider.value, 10);
    fontVal.textContent = String(v);
    document.documentElement.style.setProperty("--prompter-font", v + "px");
  }

  toggleBtn.addEventListener("click", togglePlay);
  resetBtn.addEventListener("click", () => {
    stage.scrollTop = 0;
    updateHighlight();
  });
  notesBtn.addEventListener("click", () => {
    notesPanel.classList.toggle("open");
    notesBtn.textContent = tr("prompter_notes");
  });
  speedSlider.addEventListener("input", () => { setSpeedUI(); persistPrefs(); });
  fontSlider.addEventListener("input", () => {
    setFontUI();
    measure();
    updateHighlight();
    persistPrefs();
  });

  stage.addEventListener("wheel", () => pause(), { passive: true });
  stage.addEventListener("touchmove", () => pause(), { passive: true });
  stage.addEventListener("scroll", () => updateHighlight(), { passive: true });

  let noteWheelTimer = 0;
  notesList.addEventListener("wheel", () => {
    suppressNoteScroll = true;
    clearTimeout(noteWheelTimer);
    noteWheelTimer = setTimeout(() => { suppressNoteScroll = false; }, 1200);
  }, { passive: true });

  document.addEventListener("keydown", (e) => {
    if (e.key === " " || e.code === "Space") {
      e.preventDefault();
      togglePlay();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      pause();
      stage.scrollTop = Math.min(stage.scrollTop + 48, stage.scrollHeight - stage.clientHeight);
      updateHighlight();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      pause();
      stage.scrollTop = Math.max(0, stage.scrollTop - 48);
      updateHighlight();
    }
  });

  window.addEventListener("resize", () => { measure(); updateHighlight(); });

  setSpeedUI();
  setFontUI();

  const handleResult = (res) => {
    try {
      const sub = res && res.super_video_settings ? res.super_video_settings : {};
      if (typeof sub.prompter_speed === "number") {
        speedSlider.value = Math.min(3, Math.max(0.3, sub.prompter_speed));
      }
      if (typeof sub.prompter_font === "number") {
        fontSlider.value = Math.min(44, Math.max(12, sub.prompter_font));
      }
      setSpeedUI();
      setFontUI();
      const script = sub && sub.script ? sub.script : "";
      if (!script) {
        renderScript("");
        return;
      }
      renderScript(script);
      if (nowBar) nowBar.textContent = "";
    } catch (err) {
      console.error(err);
    }
  };

  try {
    const p = storLocal.get("super_video_settings", handleResult);
    if (p && p.then) p.then(handleResult).catch(console.error);
  } catch (e) {
    console.error(e);
    renderScript("");
  }

  rafId = requestAnimationFrame(tick);
});