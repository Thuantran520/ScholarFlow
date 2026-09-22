// ---------------------------------------------------------------------------
// ScholarFlow content: OS/js/content/darkmode.js  (engine v4 — pre-paint)
// Pro dark mode with ZERO white flash: runs at document_start, applies the
// invert filter before first paint when the host's light/dark nature is
// already cached (sf_darkmode.darkKnown), and only defers ~1 frame on the
// very first visit to auto-detect already-dark native pages.
// Settings: { enabled, mode, auto, bright, theme, onSites, offSites,
//   forceSites, siteTune, paper, typo, reader, darkKnown }
// ---------------------------------------------------------------------------
(function () {
  const STYLE_ID = "__sf_dark_mode";
  const PAPER_ID = "__sf_paper_overlay";
  const TYPO_ID = "__sf_typo_style";
  const READER_ID = "__sf_reader_style";
  const IMG_SEL = "img,video,iframe,canvas,picture,embed,object,[style*='background-image'],[class*='logo' i],[id*='logo' i]";
  const PAPER_COLORS = { paper: "#f6ecd9", mint: "#e4f2e7", sky: "#e4edf9", amber: "#f9e6c8", rose: "#fbe9ee" };
  let _s = null;

  function _hexToRgb(h) {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(h || "").trim());
    if (!m) return null;
    const n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function _rgbToHex(a) {
    const h = function (v) { const x = Math.max(0, Math.min(255, Math.round(v))).toString(16); return x.length === 1 ? "0" + x : x; };
    return "#" + h(a[0]) + h(a[1]) + h(a[2]);
  }
  function _mixToBlack(hex, pct) {
    const rgb = _hexToRgb(hex);
    if (!rgb) return hex;
    const k = Math.max(0, Math.min(100, Number(pct) || 0)) / 100;
    return _rgbToHex([rgb[0] * (1 - k), rgb[1] * (1 - k), rgb[2] * (1 - k)]);
  }
  function _safeColor(c, fb) {
    return /^#[0-9a-fA-F]{6}$/.test(String(c || "")) ? c : fb;
  }
  function _rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    let h = 0, s = 0; const l = (mx + mn) / 2;
    if (mx !== mn) {
      const d = mx - mn;
      s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      if (mx === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (mx === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
    }
    return [h, s, l];
  }
  function _hslToRgb(h, s, l) {
    h = ((h % 360) + 360) % 360;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; } else if (h < 120) { r = x; g = c; }
    else if (h < 180) { g = c; b = x; } else if (h < 240) { g = x; b = c; }
    else if (h < 300) { r = x; b = c; } else { r = c; b = x; }
    return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
  }
  // Given the FINAL desired color (what the user should see), compute the source
  // color that survives the page-wide `invert(1) hue-rotate(180deg)` filter.
  function _accentToSource(hex) {
    const rgb = _hexToRgb(hex);
    if (!rgb) return hex;
    const inv = [255 - rgb[0], 255 - rgb[1], 255 - rgb[2]];
    const hsl = _rgbToHsl(inv[0], inv[1], inv[2]);
    const back = _hslToRgb(hsl[0] + 180, hsl[1], hsl[2]);
    return _rgbToHex(back);
  }
  // Tone = extra filters layered AFTER invert: warm cream text + deeper blacks.
  function _toneParts(r) {
    const warm = Math.max(0, Math.min(100, Number(r.warm) || 0)) / 100;
    const dark = Math.max(0, Math.min(60, Number(r.dark) || 0)) / 100;
    let top = "", img = "";
    if (warm > 0) {
      top += " sepia(" + (0.5 * warm).toFixed(3) + ") saturate(" + (1 + 0.9 * warm).toFixed(3) + ") hue-rotate(" + (-14 * warm).toFixed(1) + "deg)";
      img += " saturate(" + (1 / Math.max(0.5, 1 + 0.9 * warm)).toFixed(3) + ")";
    }
    if (dark > 0) {
      const dim = 1 - 0.55 * dark;
      top += " brightness(" + dim.toFixed(3) + ")";
      img += " brightness(" + (1 / dim).toFixed(3) + ")";
    }
    return { top: top, img: img };
  }
  function _readerCss(r, t) {
    const txt = _safeColor((t && t.text) || r.txt, "#e8dcc3");
    const accent = _safeColor(r.accent, "#f0a860");
    const bg = _mixToBlack(_safeColor(r.bg, "#16130e"), r.dark == null ? 35 : r.dark);
    return [
      "html,body{background:" + bg + "!important;color:" + txt + "!important}",
      "*:not(img):not(video):not(iframe):not(canvas):not(picture):not(source):not(embed):not(object):not([style*='background-image']){",
      "  background:transparent!important;color:" + txt + "!important;",
      "  border-color:rgba(255,255,255,0.14)!important;box-shadow:none!important;text-shadow:none!important}",
      "code,pre,kbd,samp{background:rgba(255,255,255,0.08)!important}",
      "a,a *,[role='link'],[role='link'] *{color:" + accent + "!important}",
      "button,[role='button'],input[type='submit'],input[type='button']{color:" + accent + "!important}",
      "input,textarea,select{background:rgba(255,255,255,0.07)!important;color:" + txt + "!important}",
      "::selection{background:" + accent + ";color:" + bg + "!important}",
      "img,video,iframe,canvas{background:transparent!important}"
    ].join("");
  }
  // Flat reader REPLACES the invert engine entirely (opt-in; can flatten pages).
  function _applyFlatReader(s) {
    try {
      const r = s && s.reader;
      let st = document.getElementById(READER_ID);
      if (!r || !r.on || !r.flat) { if (st) st.remove(); return false; }
      if (!st) {
        st = document.createElement("style");
        st.id = READER_ID;
        (document.head || document.documentElement).appendChild(st);
      }
      st.textContent = _readerCss(r, _siteTune(s));
      return true;
    } catch (e) { return false; }
  }

  function _host() {
    try { return (window.location.hostname || "").replace(/^www\./, "").toLowerCase(); } catch (e) { return ""; }
  }
  function _siteTune(s) {
    try {
      const h = _host();
      return (s && s.siteTune && h && s.siteTune[h]) || null;
    } catch (e) { return null; }
  }
  function _lumOf(rgb) {
    const m = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(rgb || "");
    if (!m) return null;
    if (/rgba?\([^,]+,[^,]+,[^,]+,\s*0\)/.test(rgb || "")) return null;
    return (0.2126 * (+m[1]) + 0.7152 * (+m[2]) + 0.0722 * (+m[3])) / 255;
  }
  function _pageIsDark() {
    try {
      const cands = [document.documentElement, document.body];
      let dark = 0, tot = 0;
      try { document.querySelectorAll("main,article,.container,#content,[class*='content' i],[class*='page' i]").forEach(function (e) { if (cands.length < 8) cands.push(e); }); } catch (e) {}
      for (let i = 0; i < cands.length; i++) {
        try {
          const el = cands[i];
          if (!el || typeof getComputedStyle !== "function") continue;
          const l = _lumOf(getComputedStyle(el).backgroundColor);
          if (l === null) continue;
          tot++; if (l < 0.35) dark++;
        } catch (e) {}
      }
      return tot > 0 && dark / tot >= 0.6;
    } catch (e) { return false; }
  }
  function _baseWanted(host, s) {
    if (!s || !s.enabled || !host) return false;
    if (s.offSites && s.offSites[host]) return false;
    if (s.forceSites && s.forceSites[host]) return true;
    return s.mode === "selected" ? !!(s.onSites && s.onSites[host]) : true;
  }
  function _filters(s) {
    const host = _host();
    const t = (s.siteTune && host && s.siteTune[host]) || null;
    const bp = t && t.b ? t.b : (s.bright || 100);
    const b = Math.min(1.4, Math.max(0.6, bp / 100));
    let top = "invert(1) hue-rotate(180deg) brightness(" + b.toFixed(2) + ") contrast(0.95)";
    let img = "invert(1) hue-rotate(180deg) brightness(" + (1 / b).toFixed(2) + ")";
    if (t) {
      const cv = Math.max(0.5, Math.min(1.8, 0.95 * ((t.c || 100) / 100)));
      const sv = Math.max(0.05, Math.min(1.8, (t.s == null ? 100 : t.s) / 100));
      top += " contrast(" + cv.toFixed(2) + ") saturate(" + sv.toFixed(2) + ")";
      img += " contrast(" + (1 / cv).toFixed(2) + ") saturate(" + (1 / sv).toFixed(2) + ")";
    } else if (s.theme === "dim") { top += " brightness(0.86)"; }
    else if (s.theme === "warm") { top += " sepia(0.14) saturate(1.08)"; img += " sepia(0.06)"; }
    else if (s.theme === "contrast") { top += " contrast(1.22) saturate(1.06)"; }
    const r = s.reader;
    if (r && r.on && !r.flat) {
      const tp = _toneParts(r);
      top += tp.top; img += tp.img;
    }
    return { top: top, img: img };
  }
  function _cssFor(s) {
    const r = s.reader;
    const t = _siteTune(s);
    let extra = "::selection{background:#38bdf8;color:#0b1220}";
    try {
      if (r && r.on && !r.flat) {
        const acc = _safeColor(r.accent, "");
        if (acc) extra += "a,a *,[role='link'],[role='link'] *{color:" + _accentToSource(acc) + "!important}";
      }
    } catch (e) {}
    if (t && t.text) {
      const txt = _safeColor(t.text, "");
      if (txt) {
        const invertText = !(r && r.on && s.__toneOnly);
        const col = invertText ? _accentToSource(txt) : txt;
        extra += "body,p,li,td,th,blockquote,figcaption,pre,code,label,strong,em,h1,h2,h3,h4,h5,h6{color:" + col + "!important}";
      }
    }
    if (t && t.size) {
      const sz = Math.min(160, Math.max(75, parseInt(t.size, 10) || 100));
      if (sz !== 100 && !(s.typo && s.typo.on)) extra += "html{font-size:calc(100% * " + (sz / 100).toFixed(3) + ")!important}";
    }
    if (r && r.on && !r.flat && s.__toneOnly) {
      const tp = _toneParts(r);
      return "html{filter:" + tp.top + ";background:#000000!important}" + IMG_SEL + "{filter:" + tp.img + "}" + extra;
    }
    const f = _filters(s);
    return "html{filter:" + f.top + ";background:#ffffff!important}" +
      IMG_SEL + "{filter:" + f.img + "}" + extra;
  }
  function _injectFilter(s) {
    try {
      let st = document.getElementById(STYLE_ID);
      if (!st) {
        st = document.createElement("style");
        st.id = STYLE_ID;
        (document.head || document.documentElement).appendChild(st);
      }
      st.textContent = _cssFor(s);
    } catch (e) {}
  }
  function _removeFilter() {
    try { const st = document.getElementById(STYLE_ID); if (st) st.remove(); } catch (e) {}
  }
  function _remember(host, isDark) {
    try {
      if (!_s) return;
      _s.darkKnown = _s.darkKnown || {};
      if (_s.darkKnown[host] === isDark) return;
      _s.darkKnown[host] = isDark;
      const keys = Object.keys(_s.darkKnown);
      if (keys.length > 400) delete _s.darkKnown[keys[0]];
      const api = (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) ? chrome.storage.local : null;
      if (api) { const p = api.set({ sf_darkmode: _s }); if (p && p.catch) p.catch(function () {}); }
    } catch (e) {}
  }
  function _decide() {
    const host = _host();
    const s = _s;
    if (!s || !host) { _removeFilter(); _applyFlatReader(s); _applyExtras(); return; }
    if (!_baseWanted(host, s)) { _removeFilter(); _applyFlatReader(s); _applyExtras(); return; }
    if (_applyFlatReader(s)) { _removeFilter(); _applyExtras(); return; }
    const toneOn = !!(s.reader && s.reader.on);
    const toneS = Object.assign({}, s, { __toneOnly: true });
    if (s.auto !== false && !(s.forceSites && s.forceSites[host])) {
      const known = (s.darkKnown && host in s.darkKnown) ? s.darkKnown[host] : undefined;
      if (known === true) {
        if (toneOn) _injectFilter(toneS); else _removeFilter();
        _applyExtras(); return;
      }
      if (known === undefined) {
        // first visit: can't measure pre-paint — defer ~1 frame, then cache
        setTimeout(function () {
          const dark = _pageIsDark();
          _remember(host, dark);
          if (dark) { if (toneOn) _injectFilter(toneS); else _removeFilter(); }
          else _injectFilter(s);
          _applyExtras();
        }, 16);
        return;
      }
    }
    _injectFilter(s);
    _applyExtras();
  }
  function _applyExtras() {
    _applyPaper(_s);
    _applyTypo(_s);
  }
  // Paper/ease tint overlay (top frame only). Appended to documentElement so
  // it works at document_start before <body> exists.
  function _applyPaper(s) {
    try {
      if (window.top !== window) return;
      const p = s && s.paper;
      const want = p && p.mode && p.mode !== "none";
      let el = document.getElementById(PAPER_ID);
      if (!want) { if (el) el.remove(); return; }
      const color = p.mode === "custom" ? (p.custom || "#f6ecd9") : (PAPER_COLORS[p.mode] || PAPER_COLORS.paper);
      const alpha = Math.min(60, Math.max(4, p.alpha == null ? 18 : p.alpha)) / 100;
      if (!el) {
        el = document.createElement("div");
        el.id = PAPER_ID;
        el.setAttribute("aria-hidden", "true");
        el.style.cssText = "position:fixed;inset:0;z-index:2147483646;pointer-events:none;mix-blend-mode:multiply;transition:background 0.2s ease";
        (document.body || document.documentElement).appendChild(el);
      }
      el.style.background = color;
      el.style.opacity = String(alpha);
    } catch (e) {}
  }
  function _applyTypo(s) {
    try {
      const t = s && s.typo;
      let st = document.getElementById(TYPO_ID);
      if (!t || !t.on) { if (st) st.remove(); return; }
      const size = Math.min(150, Math.max(75, t.size || 100));
      const line = Math.min(2.4, Math.max(1.1, t.line || 1.6));
      const ls = Math.min(3, Math.max(-1, t.ls || 0));
      const ws = Math.min(1.5, Math.max(-0.5, t.ws || 0));
      let css = "html{font-size:calc(100% * " + (size / 100).toFixed(3) + ")!important}" +
        "body{line-height:" + line.toFixed(2) + "!important;letter-spacing:" + ls.toFixed(2) + "px!important;word-spacing:" + ws.toFixed(2) + "px!important;";
      if (t.family) css += "font-family:" + t.family + "!important;";
      css += "}";
      const w = Math.max(0, Math.min(2000, t.width || 0));
      if (w) css += "main,article,[role='main'],[class*='article' i],[class*='content' i],[class*='post' i]{max-width:" + w + "px!important;margin-left:auto!important;margin-right:auto!important}";
      if (t.justify) css += "p{text-align:justify!important}";
      if (!st) {
        st = document.createElement("style");
        st.id = TYPO_ID;
        (document.head || document.documentElement).appendChild(st);
      }
      st.textContent = css;
    } catch (e) {}
  }
  function _setSettings(s) { _s = s; _decide(); }
  function _read(cb) {
    const api = (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) ? chrome.storage.local : null;
    if (!api) { if (cb) cb(); return; }
    const p = api.get("sf_darkmode");
    if (p && typeof p.then === "function") p.then(function (r) { _setSettings(r && r.sf_darkmode); if (cb) cb(); }).catch(function () { if (cb) cb(); });
    else api.get("sf_darkmode", function (r) { _setSettings(r && r.sf_darkmode); if (cb) cb(); });
  }
  try {
    const proto = window.location && window.location.protocol;
    if (proto === "http:" || proto === "https:") {
      _read();
      // re-verify once after styles/layout settle (cheap, cached after first visit)
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", function () {
          const host = _host();
          if (_s && _baseWanted(host, _s) && _s.auto !== false && !(s_force(host))) {
            const dark = _pageIsDark();
            _remember(host, dark);
            _decide();
          }
        });
      }
    }
    function s_force(host) { try { return !!(_s && _s.forceSites && _s.forceSites[host]); } catch (e) { return false; } }
    const rt = (typeof chrome !== "undefined" && chrome.runtime) ? chrome.runtime : null;
    if (rt && rt.onMessage && rt.onMessage.addListener) {
      rt.onMessage.addListener(function (msg, sender, sendResponse) {
        if (!msg || !msg.action) return;
        if (msg.action === "DM_REFRESH") { _read(); sendResponse({ ok: true, host: _host() }); return true; }
        if (msg.action === "DM_GET_STATE") {
          sendResponse({ ok: true, host: _host(), dark: !!document.getElementById(STYLE_ID), darkPage: _pageIsDark() });
          return true;
        }
      });
    }
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener(function (c, area) {
        if (area === "local" && c && c.sf_darkmode) _setSettings(c.sf_darkmode.newValue);
      });
    }
  } catch (e) {}
})();
