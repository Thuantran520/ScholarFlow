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
  const editor = document.getElementById("prompter-editor");
  const nowBar = document.getElementById("prompter-now");
  const notesPanel = document.getElementById("prompter-notes");
  const notesList = document.getElementById("prompter-notes-list");
  const toggleBtn = document.getElementById("prompter-toggle");
  const resetBtn = document.getElementById("prompter-reset");
  const editBtn = document.getElementById("prompter-edit-toggle");
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
  let _rafId = 0;
  let lastTs = 0;
  let currentScrollY = 0;
  let suppressNoteScroll = false;
  let isEditing = false;
  let currentScriptText = "";

  const pxPerSec = () => parseFloat(speedSlider.value) * 56;

  function measure() {
    if (!stage || !track) return;
    const stageRect = stage.getBoundingClientRect();
    for (const p of paras) {
      if (p.el) {
        const r = p.el.getBoundingClientRect();
        p.top = r.top - stageRect.top + stage.scrollTop;
        p.height = r.height || p.el.offsetHeight;
      }
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
    _rafId = requestAnimationFrame(tick);
    if (!playing || isEditing) return;
    const dt = lastTs ? (ts - lastTs) / 1000 : 0;
    lastTs = ts;
    currentScrollY += pxPerSec() * dt;
    const max = stage.scrollHeight - stage.clientHeight;
    if (currentScrollY >= max - 1) {
      currentScrollY = max;
      stage.scrollTop = max;
      playing = false;
      toggleBtn.textContent = tr("prompter_play");
      toggleBtn.classList.remove("playing");
      updateHighlight();
    } else {
      stage.scrollTop = currentScrollY;
      updateHighlight();
    }
  }

  function play() {
    if (isEditing) return;
    playing = true;
    lastTs = 0;
    currentScrollY = stage.scrollTop;
    toggleBtn.textContent = tr("prompter_pause");
    toggleBtn.classList.add("playing");
  }

  function pause() {
    playing = false;
    currentScrollY = stage.scrollTop;
    toggleBtn.textContent = tr("prompter_play");
    toggleBtn.classList.remove("playing");
  }

  function togglePlay() {
    if (playing) pause();
    else play();
  }

  function toggleEditMode() {
    if (!editor) return;
    if (!isEditing) {
      isEditing = true;
      pause();
      track.style.display = "none";
      editor.value = currentScriptText || "";
      editor.classList.add("open");
      editor.focus();
      if (editBtn) {
        editBtn.textContent = tr("prompter_save");
        editBtn.classList.add("is-editing");
      }
    } else {
      isEditing = false;
      currentScriptText = editor.value;
      editor.classList.remove("open");
      track.style.display = "block";
      if (editBtn) {
        editBtn.textContent = tr("prompter_edit");
        editBtn.classList.remove("is-editing");
      }
      // Persist script change to super_video_settings
      try {
        storLocal.get("super_video_settings", (res) => {
          const s = (res && res.super_video_settings && typeof res.super_video_settings === "object")
            ? res.super_video_settings : {};
          s.script = currentScriptText;
          storLocal.set({ super_video_settings: s });
        });
      } catch (e) { /* storage error */ }
      renderScript(currentScriptText);
    }
  }

  function renderScript(text) {
    currentScriptText = text || "";
    track.textContent = "";
    if (notesList) notesList.textContent = "";
    paras = [];
    const loading = document.getElementById("prompter-loading");
    if (loading) loading.remove();
    if (!text || !String(text).trim()) {
      const empty = document.createElement("div");
      empty.id = "prompter-empty";

      const iconWrap = document.createElement("div");
      iconWrap.className = "empty-icon-wrap";
      const iconSpan = document.createElement("span");
      iconSpan.textContent = "📜";
      iconSpan.style.fontSize = "26px";
      iconWrap.appendChild(iconSpan);
      empty.appendChild(iconWrap);

      const title = document.createElement("div");
      title.className = "empty-title";
      title.textContent = tr("script_prompter_empty");
      empty.appendChild(title);

      const editPromptBtn = document.createElement("button");
      editPromptBtn.className = "empty-btn";
      editPromptBtn.textContent = "✏️ " + tr("prompter_edit");
      editPromptBtn.addEventListener("click", () => toggleEditMode());
      empty.appendChild(editPromptBtn);

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
            currentScrollY = stage.scrollTop;
            updateHighlight();
          }
        }
      });
      track.appendChild(p);

      if (notesList) {
        const note = document.createElement("div");
        note.className = "prompter-note";
        note.textContent = chunk.slice(0, 220);
        note.addEventListener("click", () => {
          if (paras.length) {
            const idx = paras.findIndex(x => x.note === note);
            if (idx >= 0) {
              stage.scrollTop = Math.max(0, paras[idx].top - stage.clientHeight * 0.15);
              currentScrollY = stage.scrollTop;
              updateHighlight();
            }
          }
        });
        notesList.appendChild(note);
        paras.push({ el: p, note: note, top: 0, height: 0 });
      } else {
        paras.push({ el: p, note: null, top: 0, height: 0 });
      }
    });

    requestAnimationFrame(() => {
      measure();
      stage.scrollTop = 0;
      currentScrollY = 0;
      pause();
      updateHighlight();
    });
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
    const min = parseFloat(speedSlider.min) || 0.3;
    const max = parseFloat(speedSlider.max) || 3;
    const pct = Math.max(0, Math.min(100, ((v - min) / (max - min)) * 100));
    speedSlider.style.setProperty("--range-pct", pct.toFixed(1) + "%");
  }

  function setFontUI() {
    const v = parseInt(fontSlider.value, 10);
    fontVal.textContent = String(v);
    document.documentElement.style.setProperty("--prompter-font", v + "px");
    const min = parseFloat(fontSlider.min) || 12;
    const max = parseFloat(fontSlider.max) || 44;
    const pct = Math.max(0, Math.min(100, ((v - min) / (max - min)) * 100));
    fontSlider.style.setProperty("--range-pct", pct.toFixed(1) + "%");
  }

  toggleBtn.addEventListener("click", togglePlay);
  resetBtn.addEventListener("click", () => {
    stage.scrollTop = 0;
    currentScrollY = 0;
    pause();
    updateHighlight();
  });
  if (editBtn) {
    editBtn.addEventListener("click", toggleEditMode);
  }
  notesBtn.addEventListener("click", () => {
    notesPanel.classList.toggle("open");
    notesBtn.classList.toggle("notes-active", notesPanel.classList.contains("open"));
    notesBtn.textContent = tr("prompter_notes");
  });
  speedSlider.addEventListener("input", () => { setSpeedUI(); persistPrefs(); });
  fontSlider.addEventListener("input", () => {
    setFontUI();
    measure();
    updateHighlight();
    persistPrefs();
  });

  stage.addEventListener("wheel", () => {
    pause();
    currentScrollY = stage.scrollTop;
  }, { passive: true });
  stage.addEventListener("touchmove", () => {
    pause();
    currentScrollY = stage.scrollTop;
  }, { passive: true });
  stage.addEventListener("scroll", () => {
    if (!playing) currentScrollY = stage.scrollTop;
    updateHighlight();
  }, { passive: true });

  let noteWheelTimer = 0;
  if (notesList) {
    notesList.addEventListener("wheel", () => {
      suppressNoteScroll = true;
      clearTimeout(noteWheelTimer);
      noteWheelTimer = setTimeout(() => { suppressNoteScroll = false; }, 1200);
    }, { passive: true });
  }

  document.addEventListener("keydown", (e) => {
    if (isEditing) {
      if (e.key === "Escape") {
        e.preventDefault();
        toggleEditMode();
      }
      return;
    }
    if (e.key === " " || e.code === "Space") {
      e.preventDefault();
      togglePlay();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      pause();
      stage.scrollTop = Math.min(stage.scrollTop + 48, stage.scrollHeight - stage.clientHeight);
      currentScrollY = stage.scrollTop;
      updateHighlight();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      pause();
      stage.scrollTop = Math.max(0, stage.scrollTop - 48);
      currentScrollY = stage.scrollTop;
      updateHighlight();
    } else if (e.key === "Home") {
      e.preventDefault();
      stage.scrollTop = 0;
      currentScrollY = 0;
      pause();
      updateHighlight();
    } else if (e.key === "Escape") {
      window.close();
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
      currentScriptText = script;
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

  // Real-time synchronization when script or settings change in sidebar
  if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === "local" && changes.super_video_settings) {
        const newVal = changes.super_video_settings.newValue;
        if (newVal && typeof newVal.script === "string" && newVal.script !== currentScriptText) {
          if (!isEditing) {
            currentScriptText = newVal.script;
            renderScript(currentScriptText);
          }
        }
      }
    });
  }

  try {
    storLocal.get("super_video_settings", (res) => {
      handleResult(res);
    });
  } catch (e) {
    console.error(e);
    renderScript("");
  }

  // ---------------------------------------------------------------------------
  // Floating Studio 16:9 Recording Engine
  // ---------------------------------------------------------------------------
  let studioRecorder = null;
  let studioRecordStream = null;
  let studioRecordedChunks = [];
  let studioTimerInterval = null;
  let studioRecordStartTime = 0;
  let studioIsPaused = false;
  let studioMicEnabled = true;

  const btnStudioRec = document.getElementById("studio-btn-record");
  const btnStudioPause = document.getElementById("studio-btn-pause");
  const btnStudioStop = document.getElementById("studio-btn-stop");
  const btnStudioMic = document.getElementById("studio-btn-mic");
  const btnStudioTogglePrompter = document.getElementById("studio-btn-toggle-prompter");
  const studioTimer = document.getElementById("studio-timer");
  const studioDot = document.getElementById("studio-pulse-dot");
  const studioPauseText = document.getElementById("studio-pause-text");

  function formatDuration(sec) {
    const m = Math.floor(sec / 60).toString().padStart(2, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  async function startStudioRecording() {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        alert(tr("toast_video_no_media") || "Browser does not support screen recording!");
        return;
      }

      const displayMediaOptions = {
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 60, max: 60 }
        },
        audio: true
      };

      const stream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);
      studioRecordStream = stream;
      studioRecordedChunks = [];
      studioIsPaused = false;

      // Track ended callback
      stream.getTracks().forEach(track => {
        track.addEventListener("ended", () => {
          stopStudioRecording();
        });
      });

      // MimeType detection
      let mimeType = "video/webm";
      if (typeof MediaRecorder !== "undefined") {
        if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")) {
          mimeType = "video/webm;codecs=vp9,opus";
        } else if (MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")) {
          mimeType = "video/webm;codecs=vp8,opus";
        }
      }

      studioRecorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 6000000,
        audioBitsPerSecond: 256000
      });

      studioRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          studioRecordedChunks.push(event.data);
        }
      };

      studioRecorder.onstop = () => {
        finishStudioRecording();
      };

      studioRecorder.start(500);

      // UI update
      if (btnStudioRec) btnStudioRec.style.display = "none";
      if (btnStudioPause) btnStudioPause.style.display = "inline-flex";
      if (btnStudioStop) btnStudioStop.style.display = "inline-flex";
      if (studioDot) studioDot.classList.add("is-recording");

      studioRecordStartTime = Date.now();
      if (studioTimer) studioTimer.textContent = "00:00";
      clearInterval(studioTimerInterval);
      studioTimerInterval = setInterval(() => {
        if (!studioIsPaused) {
          const sec = Math.floor((Date.now() - studioRecordStartTime) / 1000);
          if (studioTimer) studioTimer.textContent = formatDuration(sec);
        }
      }, 500);

      // Auto start prompter if there is content
      if (paras && paras.length > 0 && !playing && !isEditing) {
        play();
      }
    } catch (err) {
      if (err && err.name !== "NotAllowedError") {
        console.error("Studio recording error:", err);
      }
    }
  }

  function toggleStudioPause() {
    if (!studioRecorder) return;
    if (!studioIsPaused) {
      if (studioRecorder.state === "recording") studioRecorder.pause();
      studioIsPaused = true;
      if (studioPauseText) studioPauseText.textContent = tr("rec_studio_resume") || "Tiếp tục";
      if (btnStudioPause) btnStudioPause.style.background = "#0284c7";
      if (playing) pause();
    } else {
      if (studioRecorder.state === "paused") studioRecorder.resume();
      studioIsPaused = false;
      if (studioPauseText) studioPauseText.textContent = tr("rec_studio_pause") || "Tạm dừng";
      if (btnStudioPause) btnStudioPause.style.background = "";
      if (!playing && !isEditing) play();
    }
  }

  function stopStudioRecording() {
    if (studioRecordStream) {
      try {
        studioRecordStream.getTracks().forEach(t => t.stop());
      } catch (e) {}
    }
    if (studioRecorder && studioRecorder.state !== "inactive") {
      try { studioRecorder.requestData(); } catch (e) {}
      try { studioRecorder.stop(); } catch (e) {}
    } else {
      finishStudioRecording();
    }
  }

  function finishStudioRecording() {
    clearInterval(studioTimerInterval);
    if (studioDot) studioDot.classList.remove("is-recording");
    if (btnStudioRec) btnStudioRec.style.display = "inline-flex";
    if (btnStudioPause) btnStudioPause.style.display = "none";
    if (btnStudioStop) btnStudioStop.style.display = "none";
    if (studioTimer) studioTimer.textContent = "00:00";

    if (playing) pause();

    if (studioRecordedChunks.length > 0) {
      const blob = new Blob(studioRecordedChunks, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      const now = new Date();
      const pad = (n) => String(n).padStart(2, "0");
      const filename = `ScholarFlow_16x9_${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.webm`;

      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        a.remove();
        URL.revokeObjectURL(url);
      }, 1000);
      studioRecordedChunks = [];
    }
  }

  function toggleStudioMic() {
    studioMicEnabled = !studioMicEnabled;
    if (btnStudioMic) {
      btnStudioMic.textContent = studioMicEnabled ? "🎙️" : "🔇";
      btnStudioMic.title = studioMicEnabled ? (tr("rec_studio_mic_on") || "Mic: Bật") : (tr("rec_studio_mic_off") || "Mic: Tắt");
      btnStudioMic.style.opacity = studioMicEnabled ? "1" : "0.5";
    }
    if (studioRecordStream) {
      studioRecordStream.getAudioTracks().forEach(t => {
        t.enabled = studioMicEnabled;
      });
    }
  }

  function toggleStudioPrompterView() {
    document.body.classList.toggle("prompter-collapsed");
  }

  btnStudioRec?.addEventListener("click", startStudioRecording);
  btnStudioPause?.addEventListener("click", toggleStudioPause);
  btnStudioStop?.addEventListener("click", stopStudioRecording);
  btnStudioMic?.addEventListener("click", toggleStudioMic);
  btnStudioTogglePrompter?.addEventListener("click", toggleStudioPrompterView);

  // Global hotkeys inside Studio window
  window.addEventListener("keydown", (e) => {
    if (e.altKey && !e.ctrlKey && !e.metaKey) {
      const k = (e.key || "").toLowerCase();
      if (k === "s") {
        e.preventDefault();
        stopStudioRecording();
      } else if (k === "p") {
        e.preventDefault();
        toggleStudioPause();
      } else if (k === "m") {
        e.preventDefault();
        toggleStudioMic();
      }
    }
  });

  _rafId = requestAnimationFrame(tick);
});
