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

  function _mediaArea(el) {
    try {
      const r = el.getBoundingClientRect();
      if (r && r.width && r.height) return r.width * r.height;
    } catch (e) {}
    let w = 0;
    let h = 0;
    try { w = el.clientWidth || el.offsetWidth || 0; } catch (e) {}
    try { h = el.clientHeight || el.offsetHeight || 0; } catch (e) {}
    return w * h;
  }

  // Among several players (auto-playing teasers, ambient layers, ad slots on
  // the same page) the MAIN player is the biggest on screen — e.g. the YouTube
  // livestream, not a tiny preview. Ties keep the later (most recently added)
  // element so single-player pages behave exactly as before.
  function _biggest(list) {
    if (!list || !list.length) return null;
    let best = list[0];
    let bestArea = _mediaArea(best);
    for (let i = 1; i < list.length; i++) {
      const a = _mediaArea(list[i]);
      if (a > bestArea) { best = list[i]; bestArea = a; }
    }
    return best;
  }

  function _getActive() {
    if (_lastEl && _lastEl.isConnected !== false) {
      return _lastEl;
    }
    const cur = _playingMedia();
    if (cur.length) {
      _lastEl = _biggest(cur);
      return _lastEl;
    }
    const list = _allMedia();
    if (list.length) {
      _lastEl = _biggest(list);
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

  // Is a node ACTUALLY painted on screen? Content-script getComputedStyle resolves
  // the PAGE's CSS, so a .ytp-live-badge that YouTube hides on VOD via display:none
  // reports display "none" here, while the red LIVE chip on a real 24/7 stream
  // reports a rendered display. We only treat an explicit none/hidden/opacity-0 as
  // not-visible; an empty/unknown value counts as visible (so the unit-test DOM,
  // which has no stylesheet, still exercises the visible path).
  function _chipRendered(node) {
    if (!node) return false;
    try { if (node.hasAttribute && node.hasAttribute("hidden")) return false; } catch (e) {}
    try {
      const view = node.ownerDocument && node.ownerDocument.defaultView;
      const cs = view && view.getComputedStyle ? view.getComputedStyle(node) : null;
      if (cs) {
        const disp = (cs.display || "").toLowerCase();
        const vis = (cs.visibility || "").toLowerCase();
        if (disp === "none" || vis === "hidden" || vis === "collapse") return false;
        if (cs.opacity !== "" && cs.opacity != null && Number(cs.opacity) === 0) return false;
      }
    } catch (e) {}
    return true;
  }

  // Page-level livestream markers (100% local DOM read, no network). Two YouTube
  // signals that are TRUE only while on air: (a) the HTML5 player root carries the
  // class .ytp-live, or (b) the red LIVE chip (.ytp-live-badge) is ACTUALLY PAINTED
  // (rendered, not CSS display:none). We read (a) at document level and (b) across
  // the page, because a 24/7 stream (e.g. lofi radio) may be sampled from an
  // ambient <video> outside the main player, may report a finite ~14h DVR duration,
  // and may not even set the .ytp-live class — but the LIVE chip it shows on screen
  // is what the user perceives, and its computed display distinguishes it from a
  // VOD (where the same badge node exists yet is hidden via CSS). Merely PRESENT
  // badges are ignored; only a RENDERED one counts.
  function _pageSaysLive(el) {
    const doc = (el && el.ownerDocument) || document;
    try {
      const u = String((doc && doc.location && doc.location.href) || location.href || "");
      if (/^https?:\/\/([a-z0-9-]+\.)*(youtube\.com\/live\/|youtube\.com\/watch.*[?&]is_live=1)/i.test(u)) return true;
    } catch (e) {}
    try {
      if (doc.querySelector && doc.querySelector(".html5-video-player.ytp-live")) return true;
    } catch (e) {}
    try {
      if (el && typeof el.closest === "function") {
        const sh = el.closest(".html5-video-player");
        if (sh && sh.classList && sh.classList.contains("ytp-live")) return true;
      }
    } catch (e) {}
    try {
      if (doc.querySelectorAll) {
        const chips = doc.querySelectorAll(".ytp-live-badge");
        for (let i = 0; i < chips.length; i++) { if (_chipRendered(chips[i])) return true; }
      }
    } catch (e) {}
    return false;
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
    if (!el) return { hasMedia: false, playing: false, title: "", artist: "", artwork: "", currentTime: 0, duration: 0, isLive: false, liveStart: 0, isVideo: false, pip: false, pipSupported: false };
    let playing = false;
    try { playing = !el.paused && !el.ended; } catch (e) {}
    // Live detection: once metadata is loaded (readyState > 0), a live stream
    // reports a duration that is NOT a positive finite number — HTML5 native
    // live is Infinity (flattened to 0 by _num), but MSE/HLS live players often
    // report a plain 0 while playing. Treating any such duration as live catches
    // both cases; a normal track always has a finite positive duration here.
    let isLive = false;
    // YouTube players are quirky: a page can hold stray/ambient <video> elements
    // (preloaders, the mini-player, Shorts layer) whose duration reports as
    // Infinity/NaN even for ordinary videos, so the generic "duration is not a
    // finite positive number => live" heuristic false-fires and paints every
    // video red-LIVE. YouTube already tags the REAL live player itself
    // (.html5-video-player.ytp-live / an enabled .ytp-live-badge), so for
    // YouTube-like contexts we IGNORE the duration shape entirely and trust only
    // that DOM flag (checked right below). Non-YouTube HTML5/MSE players keep the
    // heuristic, which is the only live signal they expose.
    let ytLike = false;
    try {
      const host = String((el.ownerDocument && el.ownerDocument.location && el.ownerDocument.location.hostname) || location.hostname || "");
      if (/(^|\.)(youtube\.com|youtu\.be|youtube-nocookie\.com)$/i.test(host)) ytLike = true;
    } catch (e) {}
    try { if (!ytLike && typeof el.closest === "function" && el.closest(".html5-video-player")) ytLike = true; } catch (e) {}
    if (!ytLike) {
      try {
        const d = Number(el.duration);
        // Unbounded = live: a NON-finite/zero duration (native live Infinity,
        // MSE/HLS live plain 0) OR an absurdly huge finite cap — some MSE players
        // clamp the "duration" of a never-ending feed at Number.MAX_VALUE while
        // they are technically finite. >1e10 s ≈ 300+ years on air, so only a
        // live feed qualifies; normal media is far below that.
        isLive = el.readyState > 0 && (!(isFinite(d) && d > 0) || d > 1e10);
        // Some MSE/HLS live players advertise a finite-looking duration but keep an
        // unbounded seekable range; a non-finite seekable end is another reliable
        // live signal that survives those players.
        if (!isLive) {
          const s = el.seekable;
          if (s && typeof s.length === "number" && s.length > 0) {
            const end = s.end(s.length - 1);
            if (!isFinite(end)) isLive = true;
          }
        }
      } catch (e) {}
    }
    // YouTube (and any player that self-declares live) is decided here: only a
    // marker on THIS video's own .html5-video-player shell — .ytp-live or an
    // ENABLED (not [disabled]/[hidden]) .ytp-live-badge — or the /live/ URL.
    if (el.tagName === "VIDEO" && _pageSaysLive(el)) {
      isLive = true;
    }
    // Elapsed-clock source ONLY: a live stream's getStartDate() is the broadcast
    // start used to render ● mm:ss. We deliberately NEVER let getStartDate() DECIDE
    // live-ness — MSE VOD players (YouTube included) return a real timestamp for
    // ordinary videos too, and that assumption flagged every YouTube video as a
    // livestream. It only fills liveStart once isLive is ALREADY true.
    let liveStart = 0;
    if (isLive) {
      try {
        if (typeof el.getStartDate === "function") {
          const sd = el.getStartDate();
          const t = sd && typeof sd.getTime === "function" ? sd.getTime() : 0;
          if (t > 1000) liveStart = t;
        }
      } catch (e) {}
    }
    // Video sources can open a floating popup (Picture-in-Picture), audio cannot.
    let isVideo = false;
    try { isVideo = el.tagName === "VIDEO"; } catch (e) {}
    let pipActive = false;
    try { pipActive = isVideo && document.pictureInPictureElement === el; } catch (e) {}
    let pipSupported = false;
    try { pipSupported = isVideo && typeof el.requestPictureInPicture === "function" && !!(document.pictureInPictureEnabled); } catch (e) {}
    return {
      hasMedia: true,
      playing: playing,
      title: _metaTitle(el),
      artist: _metaArtist(),
      artwork: _metaArt(el),
      currentTime: _num(el.currentTime),
      duration: _num(el.duration),
      isLive: isLive,
      liveStart: liveStart,
      isVideo: isVideo,
      pip: pipActive,
      pipSupported: pipSupported
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

  // YouTube-style previous would restart the current track; only used as a FALLBACK
  // when the page exposes no native previous control (see _skip below).
  const _PREV_RESTART_SECONDS = 3;

  // YouTube has NO "previous" control in its player chrome; stepping back a video
  // means clicking the PREVIOUS item in the on-screen queue/playlist ("Now
  // playing" side panel or the .ytp-playlist-menu). 100% local: that queue lives
  // in the page DOM (ytd-playlist-panel-video-renderer / .ytp-playlist-menu-item)
  // and the currently-playing row is marked with a selected/current class.
  function _ytPreviousItem(rootDoc) {
    try {
      const items = rootDoc.querySelectorAll(".ytp-playlist-menu-item, ytd-playlist-panel-video-renderer");
      let selIdx = -1;
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        let cur = false;
        try {
          cur = it.classList.contains("selected") || it.classList.contains("currently-playing");
          if (!cur && it.hasAttribute) cur = it.hasAttribute("selected") || it.getAttribute("aria-current") === "true";
        } catch (e) {}
        if (cur) { selIdx = i; break; }
      }
      if (selIdx > 0 && items[selIdx - 1]) return items[selIdx - 1];
    } catch (e) {}
    return null;
  }

  function _skip(dir) {
    const el = _getActive();
    const rootDoc = (el && el.ownerDocument) || document;
    // A control YouTube keeps RENDERED but DISABLED (e.g. .ytp-prev-button on a
    // video with no previous) is a no-op when clicked, yet _skipFind still finds
    // it — clicking it and returning is exactly what made "previous" look dead
    // until the tab was re-focused. Treat a disabled control as absent so we fall
    // through to the queue/restart path.
    const _enabled = function (n) {
      if (!n) return false;
      try { if (n.disabled === true) return false; } catch (e) {}
      try { if (n.getAttribute && (n.getAttribute("aria-disabled") === "true" || n.hasAttribute("disabled"))) return false; } catch (e) {}
      try { if (n.classList && (n.classList.contains("disabled") || n.classList.contains("ytp-button-disabled"))) return false; } catch (e) {}
      return true;
    };
    // Prefer the site's OWN previous/next control: on any page that exposes one,
    // "Previous" truly steps back to the previous video/track instead of just
    // restarting the current one (the site itself applies any restart-gate). Only
    // when no such control exists do we fall back to a local restart-to-start.
    const btn = el ? _skipFind(el, dir > 0 ? 1 : -1) : null;
    if (btn && _enabled(btn) && typeof btn.click === "function") {
      try { btn.click(); } catch (e) {}
      return getState();
    }
    // YouTube-specific: no (enabled) prev control in the player, so click the
    // previous item in the visible queue/playlist (if one exists) — a real
    // "previous video".
    if (el && dir < 0) {
      const yp = _ytPreviousItem(rootDoc);
      if (yp && typeof yp.click === "function") {
        try { yp.click(); } catch (e) {}
        return getState();
      }
    }
    if (el && dir < 0) {
      const ct = _num(el.currentTime);
      if (ct > _PREV_RESTART_SECONDS) {
        try { el.currentTime = 0; } catch (e) {}
      }
    }
    return getState();
  }

  // Picture-in-Picture toggle: opens/closes the web-native floating "popup"
  // window for the currently watched video. 100% local — the browser renders
  // it, the extension just flips the flag; audio sources have nothing to pop.
  function _pip() {
    const el = _getActive();
    const state = getState();
    if (!el || el.tagName !== "VIDEO") return state;
    const entering = document.pictureInPictureElement !== el;
    try {
      if (!entering) {
        // Exit needs NO user gesture, the direct call always works.
        const p = document.exitPictureInPicture();
        if (p && typeof p.catch === "function") p.catch(function () {});
      } else if (typeof el.requestPictureInPicture === "function") {
        const p = el.requestPictureInPicture();
        if (p && typeof p.then === "function") {
          p.then(function () { try { _pipRefresh(); } catch (e) {} }).catch(function () {
            // NotAllowedError: Chrome requires a fresh trusted user gesture on the
            // video page to ENTER Picture-in-Picture, and a sidebar-initiated
            // request arrives with a stale activation token. Surface the in-page
            // PiP button instead — one real tap on it (a genuine gesture) opens
            // the window.
            _pipAcquire();
            _pipPulse();
            try { _pipRefresh(); } catch (e) {}
          });
        } else if (p && typeof p.catch === "function") {
          p.catch(function () { _pipAcquire(); _pipPulse(); });
        }
      }
    } catch (e) {
      _pipAcquire();
      _pipPulse();
    }
    return getState();
  }

  // Asynchronous PiP request for the SIDEBAR path. It tries the native API
  // directly on whichever tab the video lives in WITHOUT switching to it: on
  // browsers that don't demand a fresh user gesture to open (e.g. Edge) the
  // window pops out immediately; on Chrome/Firefox the open is usually refused
  // for lack of a gesture and we report "needs-gesture" so the caller can decide
  // whether to bring the tab forward (where the pulsing in-page button is one
  // real tap). Resolves { state, outcome } with outcome ∈
  //   "opened" | "closed" | "needs-gesture" | "unsupported".
  function _pipRequest() {
    const el = _getActive();
    if (!el || el.tagName !== "VIDEO") {
      return Promise.resolve({ state: getState(), outcome: "unsupported" });
    }
    const entering = document.pictureInPictureElement !== el;
    if (!entering) {
      let p = null;
      try { p = document.exitPictureInPicture(); } catch (e) { p = null; }
      const done = function () { try { _pipRefresh(); } catch (e) {} return { state: getState(), outcome: "closed" }; };
      if (p && typeof p.then === "function") return p.then(done, done);
      return Promise.resolve(done());
    }
    if (typeof el.requestPictureInPicture !== "function") {
      return Promise.resolve({ state: getState(), outcome: "unsupported" });
    }
    const onOk = function () { try { _pipRefresh(); } catch (e) {} return { state: getState(), outcome: "opened" }; };
    const onFail = function () {
      _pipAcquire(); _pipPulse(); try { _pipRefresh(); } catch (e) {}
      return { state: getState(), outcome: "needs-gesture" };
    };
    try {
      const p = el.requestPictureInPicture();
      if (p && typeof p.then === "function") return p.then(onOk, onFail);
    } catch (e) { return Promise.resolve(onFail()); }
    return Promise.resolve({ state: getState(), outcome: "unsupported" });
  }

  // ---- In-page PiP button (the trusted-gesture path) ----
  // A real click on this button carries a valid activation token, so "open
  // popout" from here is never blocked by Chrome's gesture policy. The button is
  // only ever shown next to a <video> that actually supports the native API
  // (Firefox / disabled APIs never grow one), it is created lazily on first
  // play, and it disappears as soon as the element is gone.
  let _pipBtn = null;
  let _pipStyle = null;
  let _pipTimer = null;
  let _pipUiOwned = false;

  function _pipText(kind) {
    try {
      const k = kind === "close" ? "content_media_popout_close" : "content_media_popout_open";
      const tr = window.tContent;
      if (typeof tr === "function") {
        const v = tr(k);
        if (v && v !== k) return String(v);
      }
    } catch (e) {}
    return kind === "close" ? "Đóng cửa sổ nổi" : "Mở cửa sổ nổi";
  }

  function _pipCss() {
    return "__sf-media-pip{position:fixed;z-index:2147483000;width:44px;height:44px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;background:rgba(10,15,25,.78);border:1px solid rgba(255,255,255,.28);box-shadow:0 4px 14px rgba(0,0,0,.55);color:#fff;padding:0;opacity:0;visibility:hidden;pointer-events:none;transition:opacity .18s ease,transform .18s ease;font:14px/1 system-ui,Segoe UI,Arial,sans-serif}" +
      "__sf-media-pip.is-visible{opacity:1;visibility:visible;pointer-events:auto}" +
      "__sf-media-pip.is-pip{background:rgba(220,38,38,.92);border-color:rgba(255,255,255,.5);box-shadow:0 0 0 4px rgba(220,38,38,.28)}" +
      "__sf-media-pip.is-pulse{animation:sfPipPulse .7s ease 2}" +
      "@keyframes sfPipPulse{0%{transform:scale(1)}50%{transform:scale(1.22)}100%{transform:scale(1)}}" +
      "__sf-media-pip svg{width:22px;height:22px}";
  }

  function _pipEnsureUi() {
    const root = document.body || document.documentElement;
    if (!root) return null;
    if (_pipUiOwned && _pipBtn) return _pipBtn;
    if (!_pipStyle) {
      _pipStyle = document.createElement("style");
      _pipStyle.textContent = _pipCss();
      (document.head || root).appendChild(_pipStyle);
    }
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "__sf-media-pip";
    btn.setAttribute("aria-hidden", "true");
    const svgNS = "http" + "://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    const frame = document.createElementNS(svgNS, "rect");
    frame.setAttribute("x", "3"); frame.setAttribute("y", "5"); frame.setAttribute("width", "18"); frame.setAttribute("height", "14"); frame.setAttribute("rx", "2");
    svg.appendChild(frame);
    const mini = document.createElementNS(svgNS, "rect");
    mini.setAttribute("x", "12"); mini.setAttribute("y", "10"); mini.setAttribute("width", "7"); mini.setAttribute("height", "7"); mini.setAttribute("rx", "1");
    svg.appendChild(mini);
    btn.appendChild(svg);
    btn.addEventListener("click", function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      _pip();
    });
    root.appendChild(btn);
    _pipBtn = btn;
    _pipUiOwned = true;
    if (!_pipTimer) {
      _pipTimer = setInterval(function () { try { _pipRefresh(); } catch (e) {} }, 1400);
      document.addEventListener("scroll", _pipRefresh, true);
      try { window.addEventListener("resize", _pipRefresh); } catch (e) {}
      try { document.addEventListener("pictureinpicturechange", _pipRefresh); } catch (e) {}
    }
    return btn;
  }

  function _pipSupportedVideo() {
    try {
      const inPip = document.pictureInPictureElement;
      if (inPip) return inPip;
    } catch (e) {}
    const el = _getActive();
    if (el && el.tagName === "VIDEO" && typeof el.requestPictureInPicture === "function") return el;
    return null;
  }

  function _pipRefresh() {
    const btn = _pipUiOwned && _pipBtn ? _pipBtn : null;
    if (!btn || !document.body) { if (btn) _pipHide(); return; }
    const el = _pipSupportedVideo();
    let pipOn = false;
    let r = null;
    if (el) {
      try { pipOn = document.pictureInPictureElement === el; } catch (e) {}
      try { r = el.getBoundingClientRect(); } catch (e) {}
    }
    if (!el || !r || (!r.width && !r.height)) return _pipHide();
    const winW = window.innerWidth || 0;
    const winH = window.innerHeight || 0;
    if (!winW || !winH) return _pipHide();
    btn.style.left = Math.max(8, Math.min((r.right || 0) - 50, winW - 52)) + "px";
    btn.style.top = Math.max(8, Math.min((r.top || 0) + 8, winH - 52)) + "px";
    btn.classList.add("is-visible");
    btn.classList.toggle("is-pip", pipOn);
    const label = _pipText(pipOn ? "close" : "open");
    btn.title = label;
    btn.setAttribute("aria-label", label);
  }

  function _pipHide() {
    if (_pipBtn) { _pipBtn.classList.remove("is-visible", "is-pip"); }
  }

  function _pipPulse() {
    const b = _pipUiOwned ? _pipBtn : null;
    if (!b) return;
    b.classList.remove("is-pulse");
    try { void b.offsetWidth; } catch (e) {}
    b.classList.add("is-pulse");
  }

  function _pipAcquire() {
    try {
      const el = _getActive();
      if (!el || el.tagName !== "VIDEO") return;
      if (typeof el.requestPictureInPicture !== "function") return;
      if (!(document.pictureInPictureEnabled)) return;
      _pipEnsureUi();
      _pipRefresh();
    } catch (e) {}
  }

  // Expose a small testable surface (Firefox content DOM, chrome isolated world).
  try {
    window.__sfMedia = {
      getState: getState,
      toggle: _toggle,
      play: _play,
      pause: _pause,
      seek: _seek,
      skip: _skip,
      pip: _pip,
      pipRequest: _pipRequest
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
        if (msg.action === "MEDIA_PIP") {
          const pr = _pipRequest();
          if (pr && typeof pr.then === "function") {
            pr.then(function (r) {
              try { sendResponse({ ok: r.state.hasMedia, state: r.state, pipOutcome: r.outcome }); } catch (e) {}
            });
            return true; // hold the message channel open for the async reply
          }
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
        if (t && (t.tagName === "VIDEO" || t.tagName === "AUDIO")) { _lastEl = t; _pipAcquire(); }
      }, true);
      document.addEventListener("playing", function (e) {
        const t = e && e.target;
        if (t && (t.tagName === "VIDEO" || t.tagName === "AUDIO")) { _lastEl = t; _pipAcquire(); }
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
