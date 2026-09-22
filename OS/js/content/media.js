// ---------------------------------------------------------------------------
// ScholarFlow content: OS/js/content/media.js
// Local media-watch agent: tracks <audio>/<video> elements so the Tab Manager
// can show a now-playing banner with play/pause + seek across every tab.
// 100% local - no network calls, nothing leaves the tab.
// The sidebar polls this agent via MEDIA_* runtime messages.
// ---------------------------------------------------------------------------
(function () {
  const _runtimeApi = (typeof browser !== "undefined" && browser.runtime) ? browser.runtime
    : ((typeof chrome !== "undefined" && chrome.runtime) ? chrome.runtime : null);

  // The element that most recently played (kept even while paused so the
  // banner can show the last track with play/pause + seek).
  let _lastEl = null;

  function _allMedia() {
    try {
      return Array.prototype.slice.call(document.querySelectorAll("audio, video"));
    } catch (e) {
      return [];
    }
  }

  function _playingMedia() {
    return _allMedia().filter(function (el) {
      try { return !el.paused && !el.ended && el.readyState > 0; } catch (e) { return false; }
    });
  }

  function _getActive() {
    if (_lastEl && _lastEl.isConnected !== false) {
      return _lastEl;
    }
    const cur = _playingMedia();
    if (cur.length) {
      _lastEl = cur[cur.length - 1];
      return _lastEl;
    }
    const list = _allMedia();
    if (list.length) {
      _lastEl = list[0];
      return _lastEl;
    }
    return null;
  }

  function _metaTitle(el) {
    try {
      const ms = navigator && navigator.mediaSession && navigator.mediaSession.metadata;
      if (ms && ms.title) return String(ms.title);
    } catch (e) {}
    try {
      const v = el && el.getAttribute ? (el.getAttribute("title") || el.getAttribute("aria-label")) : "";
      if (v) return String(v);
    } catch (e) {}
    try {
      if (document && document.title) return String(document.title);
    } catch (e) {}
    return "";
  }

  function _metaArtist() {
    try {
      const ms = navigator && navigator.mediaSession && navigator.mediaSession.metadata;
      if (ms && ms.artist) return String(ms.artist);
    } catch (e) {}
    return "";
  }

  function _num(v) {
    const n = Number(v);
    return isFinite(n) && n >= 0 ? n : 0;
  }

  // ---- Best-effort cover-art extraction (100% local, read-only DOM) ----
  function _artFromMediaSession() {
    try {
      const ms = navigator && navigator.mediaSession && navigator.mediaSession.metadata;
      const arr = ms && Array.isArray(ms.artwork) ? ms.artwork : [];
      if (!arr.length) return "";
      let best = null;
      let bestSize = -1;
      let smallest = null;
      for (const a of arr) {
        const sz = Math.max(parseInt(a.sizes, 10) || 0, 0);
        if (sz <= 512 && sz > bestSize) { bestSize = sz; best = a; }
        if (!smallest || sz < Math.max(parseInt(smallest.sizes, 10) || 0, 0)) smallest = a;
      }
      const src = String((best || smallest || {}).src || "");
      if (src && /^(https?:|data:image\/)/.test(src)) return src;
    } catch (e) {}
    return "";
  }

  function _nearbyImg(el) {
    let node = el;
    for (let depth = 0; node && depth < 5; depth++, node = node.parentElement) {
      let imgs = [];
      try { imgs = Array.prototype.slice.call(node.querySelectorAll ? node.querySelectorAll("img") : []); } catch (e) {}
      let best = null;
      let bestW = 0;
      for (const im of imgs) {
        const w = Number(im.width) || 0;
        if (w <= 0 || w > 640) continue;
        if (w > bestW) { bestW = w; best = im; }
      }
      if (best) return best;
    }
    return null;
  }

  function _bgImage(el) {
    const root = (el && el.ownerDocument) || document;
    const view = root.defaultView;
    let node = el;
    for (let depth = 0; node && depth < 4; depth++, node = node.parentElement) {
      try {
        const cs = view && view.getComputedStyle ? view.getComputedStyle(node) : null;
        const bg = cs && cs.backgroundImage;
        const m = bg ? bg.match(/url\(["']?(.+?)["']?\)/) : null;
        if (m && m[1] && /^https?:/.test(m[1])) return m[1];
      } catch (e) {}
    }
    return "";
  }

  function _metaArt(el) {
    const ms = _artFromMediaSession();
    if (ms) return ms;
    try {
      const poster = el && el.tagName === "VIDEO" ? (el.getAttribute("poster") || "") : "";
      if (poster && /^(https?:|data:image\/)/.test(poster)) return poster;
    } catch (e) {}
    try {
      const m = document.querySelector('meta[property="og:image"], meta[name="twitter:image"]');
      if (m && m.content && /^https?:/.test(String(m.content))) return String(m.content);
    } catch (e) {}
    try {
      const near = _nearbyImg(el);
      const src = near ? (near.currentSrc || near.src || "") : "";
      if (src && /^(https?:|data:image\/)/.test(src)) return String(src);
    } catch (e) {}
    return _bgImage(el);
  }

  function getState() {
    const el = _getActive();
    if (!el) return { hasMedia: false, playing: false, title: "", artist: "", artwork: "", currentTime: 0, duration: 0 };
    let playing = false;
    try { playing = !el.paused && !el.ended; } catch (e) {}
    return {
      hasMedia: true,
      playing: playing,
      title: _metaTitle(el),
      artist: _metaArtist(),
      artwork: _metaArt(el),
      currentTime: _num(el.currentTime),
      duration: _num(el.duration)
    };
  }

  function _safePlay(el) {
    try {
      const p = el.play();
      if (p && typeof p.catch === "function") p.catch(function () {});
    } catch (e) {}
  }

  function _toggle() {
    const el = _getActive();
    if (!el) return getState();
    try {
      if (el.paused) _safePlay(el);
      else el.pause();
    } catch (e) {}
    return getState();
  }

  function _play() {
    const el = _getActive();
    if (el) _safePlay(el);
    return getState();
  }

  function _pause() {
    const el = _getActive();
    if (el) { try { el.pause(); } catch (e) {} }
    return getState();
  }

  function _seek(time) {
    const el = _getActive();
    if (!el || !isFinite(Number(time))) return null;
    try {
      const d = _num(el.duration);
      el.currentTime = Math.min(Math.max(0, Number(time)), d > 0 ? d : Number(time));
    } catch (e) {}
    return getState();
  }

  // ---- Track skip: click the site's OWN next/previous control (100% local) ----
  const _SKIP_SELECTORS = [
    { dir: 1, sel: "button[aria-label*='Next']" },
    { dir: 1, sel: "button[title*='Next']" },
    { dir: 1, sel: "yt-icon-button.next-button" },
    { dir: 1, sel: "ytmusic-player-bar yt-icon-button.next-button" },
    { dir: 1, sel: ".ytp-next-button" },
    { dir: 1, sel: ".skipControl__next" },
    { dir: -1, sel: "button[aria-label*='Previous']" },
    { dir: -1, sel: "button[title*='Previous']" },
    { dir: -1, sel: "yt-icon-button.previous-button" },
    { dir: -1, sel: "ytmusic-player-bar yt-icon-button.previous-button" },
    { dir: -1, sel: ".ytp-prev-button" },
    { dir: -1, sel: ".skipControl__previous" }
  ];
  const _SKIP_KW_NEXT = ["下一首", "次の", "tiếp theo", "bài tiếp"];
  const _SKIP_KW_PREV = ["上一首", "前の", "bài trước", "quay lại"];
  const _SKIP_BAD = /\b(seek|fast.?forward|rewind|stop|volume|mute|share|download|playlist|repeat|shuffle|like|dislike|subscribe)\b|10|15|30|60|90/;

  function _skipFind(el, dir) {
    const rootDoc = (el && el.ownerDocument) || document;
    for (const rec of _SKIP_SELECTORS) {
      if (rec.dir !== dir) continue;
      try {
        const n = rootDoc.querySelector(rec.sel);
        if (n) return n;
      } catch (e) {}
    }
    const kws = dir === 1 ? _SKIP_KW_NEXT : _SKIP_KW_PREV;
    let cells = [];
    try {
      let node = el;
      for (let depth = 0; node && depth < 6 && cells.length < 150; depth++, node = node.parentElement) {
        cells = cells.concat(Array.prototype.slice.call(node.querySelectorAll ? node.querySelectorAll("button, [role='button']") : []));
      }
    } catch (e) {}
    if (cells.length === 0) {
      try { cells = Array.prototype.slice.call(rootDoc.querySelectorAll("button, [role='button']")); } catch (e) {}
      if (cells.length > 500) cells = cells.slice(0, 500);
    }
    const seen = {};
    for (const b of cells) {
      if (seen[b]) continue;
      seen[b] = 1;
      let label = "";
      try { label = String((b.getAttribute && (b.getAttribute("aria-label") || b.getAttribute("title") || b.getAttribute("data-tooltip"))) || ""); } catch (e) {}
      if (!label || _SKIP_BAD.test(label)) continue;
      for (const k of kws) if (label.indexOf(k) !== -1) return b;
    }
    return null;
  }

  // YouTube-style previous: if the track is past the restart gate, "previous"
  // restarts the current track; only near the beginning does it go back a track.
  const _PREV_RESTART_SECONDS = 3;

  function _skip(dir) {
    const el = _getActive();
    if (el && dir < 0) {
      const ct = _num(el.currentTime);
      if (ct > _PREV_RESTART_SECONDS) {
        try { el.currentTime = 0; } catch (e) {}
        return getState();
      }
    }
    const btn = el ? _skipFind(el, dir > 0 ? 1 : -1) : null;
    if (btn && typeof btn.click === "function") {
      try { btn.click(); } catch (e) {}
    }
    return getState();
  }

  // Expose a small testable surface (Firefox content DOM, chrome isolated world).
  try {
    window.__sfMedia = {
      getState: getState,
      toggle: _toggle,
      play: _play,
      pause: _pause,
      seek: _seek,
      skip: _skip
    };
  } catch (e) {}

  if (_runtimeApi && _runtimeApi.onMessage) {
    _runtimeApi.onMessage.addListener(function (msg, sender, sendResponse) {
      try {
        if (!msg || typeof msg.action !== "string") return;
        if (msg.action === "MEDIA_GET_STATE") { sendResponse({ ok: getState().hasMedia, state: getState() }); return; }
        if (msg.action === "MEDIA_TOGGLE") { const s = _toggle(); sendResponse({ ok: s.hasMedia, state: s }); return; }
        if (msg.action === "MEDIA_PLAY") { const s = _play(); sendResponse({ ok: s.hasMedia, state: s }); return; }
        if (msg.action === "MEDIA_PAUSE") { const s = _pause(); sendResponse({ ok: s.hasMedia, state: s }); return; }
        if (msg.action === "MEDIA_SEEK") {
          const s = _seek(msg.time);
          if (s) sendResponse({ ok: s.hasMedia, state: s });
          return;
        }
        if (msg.action === "MEDIA_SKIP") {
          const s = _skip(msg.dir);
          if (s) sendResponse({ ok: s.hasMedia, state: s });
          return;
        }
      } catch (e) {}
    });
  }

  // Capture-phase playback events cover media elements added after load.
  function _bind() {
    try {
      document.addEventListener("play", function (e) {
        const t = e && e.target;
        if (t && (t.tagName === "VIDEO" || t.tagName === "AUDIO")) _lastEl = t;
      }, true);
      document.addEventListener("playing", function (e) {
        const t = e && e.target;
        if (t && (t.tagName === "VIDEO" || t.tagName === "AUDIO")) _lastEl = t;
      }, true);
      try {
        document.addEventListener("emptied", function (e) {
          const t = e && e.target;
          if (t && t.isConnected === false && _lastEl === t) _lastEl = null;
        }, true);
      } catch (e) {}
    } catch (e) {}
  }

  _bind();
})();
