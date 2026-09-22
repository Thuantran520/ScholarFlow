// ---------------------------------------------------------------------------
// ScholarFlow content: OS/js/content/security.js
// Real-Time Protection (phishing+typo-squat), Anti-Clickjacking (auto-block),
// Unlock Right-Click & Copy (per-site, capture-phase)
// ---------------------------------------------------------------------------
(function () {
  const PHISHING_RULES = [
    "secure-login", "verify-account", "login-secure", "account-verify",
    "paypal-secure", "bank-login", "appleid-verify", "microsoft-verify",
    "faceb00k", "g00gle", "xn--", "login.", "signin.", "update-billing"
  ];
  const PHISHING_HOSTS = new Set([
    "phishing.example.test", "bad-login.test", "secure-update.test"
  ]);
  const POPULAR = ["google.com", "facebook.com", "paypal.com", "apple.com", "microsoft.com", "amazon.com", "youtube.com", "twitter.com", "instagram.com", "linkedin.com", "netflix.com", "appleid.apple.com",
    "shopee.vn", "lazada.vn", "tiki.vn", "momo.vn", "zalopay.vn", "tiktok.com", "discord.com",
    "vietcombank.com.vn", "vietinbank.vn", "bidv.com.vn", "agribank.com.vn", "techcombank.com.vn", "vpbank.com.vn", "tpbank.vn", "mbbank.com.vn", "acb.com.vn"];
  const TRUSTED_OFFICIAL = POPULAR.concat(["messenger.com", "zalo.me", "zaloapp.com", "x.com", "telegram.org", "whatsapp.com", "fb.com", "meta.com"]);

  function _lev(a, b) {
    const m = a.length, n = b.length;
    const dp = Array.from({ length: m + 1 }, function () { return Array(n + 1).fill(0); });
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + 1);
    return dp[m][n];
  }
  function _isTypoSquat(host) {
    const h = host.toLowerCase();
    for (const p of POPULAR) {
      if (h === p) return false;
      const d = _lev(h, p);
      if (d > 0 && d <= 2 && Math.abs(h.length - p.length) <= 2) return p;
      // homograph: contains confusable chars like 0 for o, 1 for l
      const norm = h.replace(/0/g, "o").replace(/1/g, "l").replace(/3/g, "e");
      if (norm !== h && norm === p) return p;
    }
    return null;
  }

  function _isPhishing(url) {
    try {
      const u = new URL(url);
      const h = u.hostname.toLowerCase();
      if (PHISHING_HOSTS.has(h)) return { type: "host", host: h };
      for (const r of PHISHING_RULES) if (h.indexOf(r) !== -1 || u.pathname.toLowerCase().indexOf(r) !== -1) return { type: "rule", host: h, rule: r };
      if (h.indexOf("xn--") !== -1) return { type: "punycode", host: h };
      const typo = _isTypoSquat(h);
      if (typo) return { type: "typo", host: h, typo: typo };
    } catch (e) {}
    return null;
  }

  const TRUST_BRANDS = ["facebook", "instagram", "zalopay", "zalo", "momo", "shopee", "vietcombank", "techcombank", "agribank", "bidv", "vietinbank", "paypal", "apple", "netflix", "discord", "tiktok", "google", "microsoft", "tiki", "lazada", "vpbank", "tpbank", "mbbank", "acb"];
  const URL_SHORTENERS = ["bit.ly", "tinyurl.com", "t.ly", "is.gd", "cutt.ly", "buff.ly", "ow.ly", "shorturl.at", "rb.gy", "rebrand.ly", "s.id"];
  const LOGIN_WORDS = /(login|\u0111\u0103ng nh\u1eadp|dang nhap|sign ?in|verify|x\u00e1c th\u1ef1c|xac thuc|x\u00e1c minh|xac minh|secure|b\u1ea3o m\u1ead?t|bao mat|password|m\u1eadt kh\u1ea9u|mat khau|qu\u1ea3n t\u00e0i kho\u1ea3n|tai khoan)/i;
  function _trustReport() {
    const rep = { ok: true, host: "", official: null, score: 0, reasons: [] };
    let href = "", u = null;
    try { href = window.location.href || ""; u = new URL(href); rep.host = (u.hostname || "").toLowerCase(); } catch (e) {}
    const host = rep.host;
    if (!host) { rep.score = 2; rep.reasons.push({ k: "sec_trust_unknown", p: "" }); return rep; }
    for (let o = 0; o < TRUSTED_OFFICIAL.length; o++) {
      const off = TRUSTED_OFFICIAL[o];
      if (host === off || host.endsWith("." + off)) { rep.official = off; break; }
    }
    const addR = function (k, p) { rep.reasons.push({ k: k, p: p || "" }); };
    if (rep.official) return rep;
    if (u.protocol === "http:") { addR("sec_trust_http"); rep.score += 2; }
    if (host.indexOf("xn--") !== -1 || /[^\x00-\x7f]/.test(host)) { addR("sec_trust_unicode"); rep.score += 3; }
    const ph = _isPhishing(href);
    if (ph) {
      if (ph.type === "typo") { addR("sec_trust_typo", ph.typo || ""); rep.score += 4; }
      else if (ph.type === "punycode") { addR("sec_trust_puny"); rep.score += 3; }
      else if (ph.type === "host") { addR("sec_trust_host"); rep.score += 5; }
      else { addR("sec_trust_rule", ph.rule || ph.host || ""); rep.score += 3; }
    }
    const pathq = (u.pathname + " " + u.search + " " + u.hash).toLowerCase();
    let brandInUrl = "";
    for (let i = 0; i < TRUST_BRANDS.length; i++) { if (pathq.indexOf(TRUST_BRANDS[i]) !== -1) { brandInUrl = TRUST_BRANDS[i]; break; } }
    if (brandInUrl) { addR("sec_trust_brand_path", brandInUrl); rep.score += 2; }
    const toks = host.split(/[.\-_]/);
    let brandHostTok = "";
    for (let i = 0; i < toks.length; i++) { if (TRUST_BRANDS.indexOf(toks[i]) !== -1) { brandHostTok = toks[i]; break; } }
    if (brandHostTok && !ph) { addR("sec_trust_typo", brandHostTok); rep.score += 3; }
    for (let s = 0; s < URL_SHORTENERS.length; s++) {
      const sh = URL_SHORTENERS[s];
      if (host === sh || host.endsWith("." + sh)) { addR("sec_trust_shortener"); rep.score += 2; break; }
    }
    let docText = "";
    try {
      docText = (document.title || "") + " | " + ((document.querySelector("meta[property=\"og:site_name\"]") || {}).content || "") + " | " + ((document.querySelector("meta[name=\"description\"]") || {}).content || "");
    } catch (e) {}
    const dl = docText.toLowerCase();
    let claimedBrand = "";
    for (let i = 0; i < TRUST_BRANDS.length; i++) { if (dl.indexOf(TRUST_BRANDS[i]) !== -1) { claimedBrand = TRUST_BRANDS[i]; break; } }
    let hasPw = false;
    try { hasPw = !!document.querySelector("input[type=\"password\"]"); } catch (e) {}
    if (claimedBrand && (LOGIN_WORDS.test(docText) || LOGIN_WORDS.test(pathq))) { addR("sec_trust_title_mismatch", claimedBrand); rep.score += 3; }
    if (claimedBrand && hasPw) { addR("sec_trust_pwform", claimedBrand); rep.score += 2; }
    try {
      document.querySelectorAll("form[action]").forEach(function (form) {
        try {
          const fh = new URL(form.getAttribute("action"), href).hostname.toLowerCase();
          if (fh && fh !== host && TRUST_BRANDS.some(function (b) { return fh.indexOf(b) !== -1; })) { addR("sec_trust_formaction", fh); rep.score += 3; }
        } catch (e) {}
      });
    } catch (e) {}
    const labels = host.split(".");
    for (let i = 0; i < labels.length; i++) {
      const lb = labels[i];
      if (lb.length >= 10 && !/[aeiou]{2}/.test(lb)) { addR("sec_trust_entropy"); rep.score += 2; break; }
    }
    if ((host.match(/-/g) || []).length >= 3) { addR("sec_trust_hyphens"); rep.score += 1; }
    if (u.username || (u.host.indexOf("@") !== -1)) { addR("sec_trust_at"); rep.score += 2; }
    if (u.port && u.port !== "80" && u.port !== "443") { addR("sec_trust_port", u.port); rep.score += 1; }
    if (rep.score > 10) rep.score = 10;
    return rep;
  }

  let _phishAllowed = {};
  function _phishHost() {
    try { return (window && window.location && window.location.hostname ? window.location.hostname : "").toLowerCase(); } catch (e) { return ""; }
  }
  function _phishAllowHost(host) {
    if (!host) return;
    const h = String(host).toLowerCase();
    _phishAllowed[h] = true;
    try {
      const getS = (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) ? chrome.storage.local
        : (typeof browser !== "undefined" && browser.storage && browser.storage.local) ? browser.storage.local : null;
      if (!getS) return;
      const write = function (res) {
        const arr = Array.isArray(res && res.sf_phish_allow) ? res.sf_phish_allow.slice() : [];
        if (arr.indexOf(h) === -1) arr.push(h);
        try {
          const sp = getS.set({ sf_phish_allow: arr });
          if (sp && typeof sp.then === "function") sp.then(function () {}, function () {});
          else getS.set({ sf_phish_allow: arr }, function () {});
        } catch (e) {}
      };
      const p = getS.get("sf_phish_allow");
      if (p && typeof p.then === "function") p.then(write, function () { write({}); });
      else getS.get("sf_phish_allow", write);
    } catch (e) {}
  }
  function _buildPhishingOverlay(info, onGo) {
    let msg = "";
    if (typeof tContent === "function") {
      if (info.type === "typo") msg = tContent("phish_typo", info.host || "", info.typo || "");
      else if (info.type === "punycode") msg = tContent("phish_puny", info.host || "");
      else msg = tContent("phish_block", info.rule || info.host || "");
    }
    if (!msg) {
      if (info.type === "typo") msg = "ScholarFlow: possible typo-squat '" + info.host + "' looks like '" + info.typo + "' — check URL carefully.";
      else if (info.type === "punycode") msg = "ScholarFlow: punycode host '" + info.host + "' — possible homograph attack.";
      else msg = "ScholarFlow Real-Time Protection: phishing pattern (" + (info.rule || info.host) + ")";
    }
    const ov = document.createElement("div");
    ov.id = "__sf_phishing_banner";
    ov.setAttribute("role", "alertdialog");
    ov.style.cssText = "position:fixed;top:0;left:0;right:0;bottom:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;background:rgba(12,3,3,0.74);backdrop-filter:blur(2px);font-family:system-ui,sans-serif;";
    const card = document.createElement("div");
    card.setAttribute("role", "document");
    card.style.cssText = "max-width:520px;width:92%;background:#fff;color:#1f2937;border-radius:14px;padding:26px 28px;box-shadow:0 12px 44px rgba(0,0,0,0.55);border-top:6px solid #ef4444;text-align:center;";
    const icon = document.createElement("div");
    icon.textContent = "⚠️";
    icon.style.cssText = "font-size:42px;line-height:1;";
    const title = document.createElement("div");
    const titleLabel = typeof tContent === "function" ? tContent("phish_title") : "";
    title.textContent = titleLabel || "Phishing warning";
    title.style.cssText = "font-size:18px;font-weight:800;color:#dc2626;margin-top:12px;text-transform:uppercase;";
    const body = document.createElement("div");
    body.textContent = "⚠️ " + msg;
    body.style.cssText = "font-size:13px;line-height:1.55;color:#374151;margin-top:12px;word-break:break-word;";
    const row = document.createElement("div");
    row.style.cssText = "display:flex;gap:10px;justify-content:center;margin-top:20px;flex-wrap:wrap;";
    const goLabel = (typeof tContent === "function" ? tContent("phish_continue") : "") || "Continue to site";
    const go = document.createElement("button");
    go.textContent = goLabel;
    go.style.cssText = "background:#16a34a;color:#fff;border:0;border-radius:8px;padding:10px 18px;font-size:13px;font-weight:700;cursor:pointer;";
    go.addEventListener("click", function () { try { if (typeof onGo === "function") onGo(); } catch (e) {} ov.remove(); });
    const dismissLabel = (typeof tContent === "function" ? tContent("phish_dismiss") : "") || "Dismiss";
    const x = document.createElement("button");
    x.textContent = dismissLabel;
    x.style.cssText = "background:#f3f4f6;color:#374151;border:1px solid #d1d5db;border-radius:8px;padding:10px 14px;font-size:13px;font-weight:600;cursor:pointer;";
    x.addEventListener("click", function () { ov.remove(); });
    row.appendChild(go);
    row.appendChild(x);
    card.appendChild(icon);
    card.appendChild(title);
    card.appendChild(body);
    card.appendChild(row);
    ov.appendChild(card);
    return ov;
  }
  function _showPhishingBanner(info) {
    const host = _phishHost();
    if (host && _phishAllowed[host]) return;
    if (document.getElementById("__sf_phishing_banner")) return;
    const ov = _buildPhishingOverlay(info, function () { if (host) _phishAllowHost(host); });
    (document.documentElement || document.body).appendChild(ov);
  }
  function _showPhishLinkOverlay(info, onGo) {
    if (document.getElementById("__sf_phishing_banner")) return;
    const ov = _buildPhishingOverlay(info, onGo);
    (document.documentElement || document.body).appendChild(ov);
  }
  let _phishClickHandler = null;
  function _phishFindAnchor(t) {
    let el = t;
    while (el && el.nodeType === 1 && String(el.tagName || "").toUpperCase() !== "A") el = el.parentElement;
    return el && String(el.tagName || "").toUpperCase() === "A" ? el : null;
  }
  function _phishClickCap(e) {
    try {
      const a = _phishFindAnchor(e.target);
      if (!a) return;
      let href = a.getAttribute("href");
      if (!href || /^(javascript:)/i.test(href)) return;
      let abs = "";
      try { abs = a.href ? String(a.href) : ""; } catch (err) { abs = ""; }
      if (!abs) return;
      let info = null;
      try { info = _isPhishing(abs); } catch (err) { info = null; }
      if (!info) return;
      let h = "";
      try { h = new URL(abs).hostname.toLowerCase(); } catch (err) { h = ""; }
      if (h && _phishAllowed[h]) return;
      e.preventDefault();
      try { e.stopPropagation(); } catch (err) {}
      const newTab = e.button === 1 || !!e.ctrlKey || !!e.metaKey || /^_blank$/i.test(a.target || "");
      const url = abs;
      _showPhishLinkOverlay(info, function () {
        if (h) _phishAllowHost(h);
        try { if (newTab) window.open(url, "_blank"); else window.location.href = url; } catch (e2) {}
      });
    } catch (e) {}
  }
  function _enablePhishClickBlock() {
    try {
      if (_phishClickHandler || typeof document === "undefined" || !document.addEventListener) return;
      const handler = function (e) { _phishClickCap(e); };
      document.addEventListener("click", handler, true);
      document.addEventListener("auxclick", handler, true);
      _phishClickHandler = handler;
    } catch (e) {}
  }
  function _disablePhishClickBlock() {
    try {
      if (!_phishClickHandler || typeof document === "undefined" || !document.removeEventListener) return;
      document.removeEventListener("click", _phishClickHandler, true);
      document.removeEventListener("auxclick", _phishClickHandler, true);
      _phishClickHandler = null;
    } catch (e) {}
  }

  function scanPhishing() {
    try {
      if (typeof window === "undefined" || !window || window._document === null || !window.document) return null;
      const href = (window._document !== null && window.location && window.location.href) ? window.location.href : "";
      if (!href) return null;
      const info = _isPhishing(href);
      if (info) {
        const h = _phishHost();
        if (!(h && _phishAllowed[h])) _showPhishingBanner(info);
      }
      return info;
    } catch (e) { return null; }
  }

  function scanClickjacking(autoBlock) {
    try {
      if (typeof window === "undefined" || !window || window._document === null || !window.document || typeof document === "undefined" || !document.querySelectorAll) return 0;
      const iframes = Array.from(document.querySelectorAll("iframe"));
      const offenders = [];
      const vw = window.innerWidth || 0;
      const vh = window.innerHeight || 0;
      iframes.forEach(function (fr) {
        const s = window.getComputedStyle(fr);
        const r = fr.getBoundingClientRect();
        const isOverlay = r.width >= vw * 0.85 && r.height >= vh * 0.5 && r.top <= 80 && r.left <= 80;
        const isHidden = s.opacity === "0" || s.visibility === "hidden" || parseFloat(s.opacity) < 0.1;
        const isHighZ = parseInt(s.zIndex || "0", 10) >= 1000;
        const hasPointer = s.pointerEvents !== "none";
        if ((isOverlay && hasPointer) || (isHidden && isOverlay) || (isHighZ && isOverlay)) offenders.push(fr);
      });
      if (offenders.length) {
        if (autoBlock) {
          offenders.forEach(function (fr) {
            try { fr.style.pointerEvents = "none"; fr.style.opacity = "0.2"; fr.setAttribute("data-sf-blocked", "1"); } catch (e2) {}
          });
        }
        if (!document.getElementById("__sf_clickjack_banner")) {
          const b = document.createElement("div");
          b.id = "__sf_clickjack_banner";
          b.style.cssText = "position:fixed;bottom:12px;right:12px;z-index:2147483647;background:#1e293b;color:#e2e8f0;padding:10px 12px;border:1px solid #38bdf8;border-radius:8px;font-family:system-ui,sans-serif;font-size:12px;font-weight:600;box-shadow:0 4px 16px rgba(0,0,0,0.4);max-width:340px;";
          b.textContent = "⚠️ ScholarFlow Anti-Clickjacking: " + offenders.length + " iframe(s) " + (autoBlock ? "blocked" : "may hijack clicks") + ".";
          const btnBlock = document.createElement("button");
          btnBlock.textContent = autoBlock ? "Unblock" : "Block";
          btnBlock.style.cssText = "margin-left:8px;background:rgba(56,189,248,0.12);border:1px solid rgba(56,189,248,0.25);color:#38bdf8;border-radius:4px;padding:2px 8px;cursor:pointer;font-size:11px;";
          btnBlock.addEventListener("click", function () {
            offenders.forEach(function (fr) {
              try {
                if (autoBlock) { fr.style.pointerEvents = ""; fr.style.opacity = ""; fr.removeAttribute("data-sf-blocked"); }
                else { fr.style.pointerEvents = "none"; fr.style.opacity = "0.2"; }
              } catch (e2) {}
            });
            b.remove();
          });
          const x = document.createElement("button");
          x.textContent = "×";
          x.style.cssText = "margin-left:4px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);color:#94a3b8;border-radius:4px;padding:1px 6px;cursor:pointer;";
          x.addEventListener("click", function () { b.remove(); });
          b.appendChild(btnBlock);
          b.appendChild(x);
          (document.body || document.documentElement).appendChild(b);
          setTimeout(function () { try { b.remove(); } catch (e2) {} }, 9000);
        }
        if (!autoBlock) offenders.forEach(function (fr) { try { fr.style.outline = "3px solid #ef4444"; fr.style.outlineOffset = "2px"; } catch (e2) {} });
      }
      return offenders.length;
    } catch (e) { return 0; }
  }

  let _unlockCaptures = [];
  function unlockPage(perSite) {
    try {
      // remove inline handlers from all elements
      try {
        document.querySelectorAll("*").forEach(function (el) {
          ["oncontextmenu", "onselectstart", "oncopy", "oncut", "onpaste", "ondragstart", "onmousedown", "onmouseup", "onkeydown"].forEach(function (a) {
            try { el.removeAttribute(a); } catch (e2) {}
          });
        });
        ["oncontextmenu", "onselectstart", "oncopy", "oncut", "onpaste", "ondragstart", "onkeydown", "onkeyup", "onkeypress"].forEach(function (a) {
          try { document.documentElement.removeAttribute(a); document.body.removeAttribute(a); document[a] = null; window[a] = null; } catch (e2) {}
        });
      } catch (e2) {}
      // inject style
      if (!document.getElementById("__sf_unlock_style")) {
        const st = document.createElement("style");
        st.id = "__sf_unlock_style";
        st.textContent = "*{user-select:text !important;-webkit-user-select:text !important;-moz-user-select:text !important;-ms-user-select:text !important;} html,body{user-select:text !important;} [style*=\"user-select: none\"]{user-select:text !important;}";
        (document.head || document.documentElement).appendChild(st);
      }
      try { document.body.style.userSelect = "text"; document.body.style.webkitUserSelect = "text"; document.documentElement.style.userSelect = "text"; } catch (e2) {}
      // capture-phase blockers — stop page's preventDefault
      const blocked = ["contextmenu", "selectstart", "copy", "cut", "paste", "dragstart", "mousedown", "mouseup"];
      // remove old captures
      _unlockCaptures.forEach(function (h) { try { document.removeEventListener(h.ev, h.fn, true); window.removeEventListener(h.ev, h.fn, true); } catch (e2) {} });
      _unlockCaptures = [];
      blocked.forEach(function (ev) {
        const fn = function (e) { e.stopImmediatePropagation(); };
        try { document.addEventListener(ev, fn, true); window.addEventListener(ev, fn, true); _unlockCaptures.push({ ev: ev, fn: fn }); } catch (e2) {}
      });
      // allow keyboard shortcuts: Ctrl/Cmd + C/V/X/A/Z/Y
      const keyFn = function (e) {
        const k = (e.key || "").toLowerCase();
        if ((e.ctrlKey || e.metaKey) && ["c", "v", "x", "a", "z", "y", "p", "s"].indexOf(k) !== -1) e.stopImmediatePropagation();
        // also allow F12
        if (e.key === "F12") e.stopImmediatePropagation();
      };
      try { document.addEventListener("keydown", keyFn, true); window.addEventListener("keydown", keyFn, true); _unlockCaptures.push({ ev: "keydown", fn: keyFn }); } catch (e2) {}
      if (perSite) {
        try { document.documentElement.setAttribute("data-sf-unlocked", "1"); } catch (e2) {}
      }
      return true;
    } catch (e) { return false; }
  }
  function lockPage() {
    try {
      _unlockCaptures.forEach(function (h) { try { document.removeEventListener(h.ev, h.fn, true); window.removeEventListener(h.ev, h.fn, true); } catch (e2) {} });
      _unlockCaptures = [];
      const st = document.getElementById("__sf_unlock_style");
      if (st) st.remove();
      try { document.documentElement.removeAttribute("data-sf-unlocked"); } catch (e2) {}
      return true;
    } catch (e) { return false; }
  }

  window.__sfSecurity = { scanPhishing: scanPhishing, scanClickjacking: scanClickjacking, unlockPage: unlockPage, lockPage: lockPage, isPhishing: _isPhishing, isTypoSquat: _isTypoSquat,
    enablePhishClickBlock: _enablePhishClickBlock, disablePhishClickBlock: _disablePhishClickBlock, isPhishClickEnabled: function () { return !!_phishClickHandler; } };

  // auto-run based on storage
  try {
    const get = (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) ? chrome.storage.local : (typeof browser !== "undefined" && browser.storage && browser.storage.local) ? browser.storage.local : null;
    const readStor = function (key, cb) {
      if (!get) return cb({});
      try {
        const p = get.get(key);
        if (p && typeof p.then === "function") p.then(function (r) { cb(r || {}); }).catch(function () { cb({}); });
        else get.get(key, function (r) { cb(r || {}); });
      } catch (e) { cb({}); }
    };
    readStor("sf_phish_allow", function (allowRes) {
      try {
        const arr = (allowRes && allowRes.sf_phish_allow) || [];
        if (Array.isArray(arr)) arr.forEach(function (h) { if (h) _phishAllowed[String(h).toLowerCase()] = true; });
      } catch (e) {}
      readStor("sf_security_settings", function (res) {
        try {
          const s = (res && res.sf_security_settings) || { phishing: true, clickjack: true, autoBlock: true, unlockSites: {} };
          if (s.phishing) scanPhishing();
          if (s.clickBlock !== false) _enablePhishClickBlock();
          if (s.clickjack) {
            setTimeout(function () { try { scanClickjacking(!!s.autoBlock); } catch (e2) {} }, 1200);
            try {
              if (typeof window !== "undefined" && window && window._document !== null && window.document && window.document.documentElement) {
                const obs = new MutationObserver(function () { try { scanClickjacking(!!s.autoBlock); } catch (e2) {} });
                obs.observe(document.documentElement, { childList: true, subtree: true });
                setTimeout(function () { try { obs.disconnect(); } catch (e2) {} }, 15000);
              }
            } catch (e2) {}
          }
          let host = "";
          try { host = (typeof window !== "undefined" && window && window._document !== null && window.location && window.location.hostname ? window.location.hostname : "").toLowerCase(); } catch (e2) { host = ""; }
          if (host && s.unlockSites && s.unlockSites[host]) unlockPage(true);
          else if (s.unlock) unlockPage(false);
        } catch (e2) {}
      });
    });
  } catch (e2) {
    scanPhishing();
    setTimeout(function () { scanClickjacking(true); }, 1200);
  }

  try {
    const rtv = (typeof chrome !== "undefined" && chrome.storage && chrome.storage.onChanged) ? chrome.storage : null;
    if (rtv) chrome.storage.onChanged.addListener(function (ch, area) {
      if (area === "local" && ch && ch.sf_security_settings && ch.sf_security_settings.newValue) {
        try { if (ch.sf_security_settings.newValue.clickBlock === false) _disablePhishClickBlock(); else _enablePhishClickBlock(); } catch (e3) {}
      }
    });
  } catch (e2) {}

  try {
    const rt = (typeof chrome !== "undefined" && chrome.runtime) ? chrome.runtime : (typeof browser !== "undefined" && browser.runtime) ? browser.runtime : null;
    if (rt && rt.onMessage && rt.onMessage.addListener) {
      rt.onMessage.addListener(function (msg, sender, sendResponse) {
        if (!msg || !msg.action) return;
        if (msg.action === "SEC_SCAN_PHISHING") { const info = scanPhishing(); sendResponse({ ok: true, phishing: !!info, info: info }); return true; }
        if (msg.action === "SEC_SCAN_CLICKJACK") { const n = scanClickjacking(!!msg.autoBlock); sendResponse({ ok: true, count: n }); return true; }
        if (msg.action === "SEC_UNLOCK") { const ok = msg.lock ? lockPage() : unlockPage(!!msg.perSite); sendResponse({ ok: ok }); return true; }
        if (msg.action === "SEC_GET_STATUS") { const href2 = (typeof window !== "undefined" && window && window._document !== null && window.location && window.location.href) ? window.location.href : ""; sendResponse({ ok: true, url: href2, phishing: !!_isPhishing(href2) }); return true; }
        if (msg.action === "SEC_BLOCK_IFRAMES") { const n = scanClickjacking(true); sendResponse({ ok: true, count: n }); return true; }
        if (msg.action === "SEC_TRUST_REPORT") { sendResponse(_trustReport()); return true; }

      });
    }
  } catch (e2) {}

  // Paste guard: warn (never block) when pasting phone/CCCD/bank-card patterns.
  (function () {
    const SENSITIVE = [
      /(^|[^\d])0\d{9,10}([^\d]|$)/,
      /\b\+84\d{8,10}\b/,
      /\b\d{12}\b/,
      /\b(?:\d[ -]?){15,18}\d\b/
    ];
    let pasteGuardOn = false;
    try {
      const get = (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) ? chrome.storage.local : null;
      if (get) {
        const p = get.get("sf_security_settings");
        const set = function (r) { const s = r && r.sf_security_settings; pasteGuardOn = !!(s && s.pasteGuard); };
        if (p && typeof p.then === "function") p.then(set).catch(function () {});
        else get.get("sf_security_settings", set);
        if (chrome.storage.onChanged) {chrome.storage.onChanged.addListener(function (c, a) {
          if (a === "local" && c && c.sf_security_settings) pasteGuardOn = !!(c.sf_security_settings.newValue && c.sf_security_settings.newValue.pasteGuard);
        });}
      }
    } catch (e) {}
    function _showPasteWarn() {
      try {
        let w = document.getElementById("__sf_paste_warn");
        if (!w) {
          w = document.createElement("div");
          w.id = "__sf_paste_warn";
          w.setAttribute("role", "alert");
          w.style.cssText = "position:fixed;bottom:14px;right:14px;z-index:2147483647;background:#78350f;color:#fde68a;padding:9px 12px;border-radius:8px;font-family:system-ui,sans-serif;font-size:12px;font-weight:700;box-shadow:0 4px 14px rgba(0,0,0,0.4);border:1px solid #f59e0b;max-width:340px;";
          w.textContent = "ScholarFlow: pasted content looks like phone / ID / bank card number - double-check where you paste.";
          (document.body || document.documentElement).appendChild(w);
          setTimeout(function () { try { w.remove(); } catch (e) {} }, 6000);
        }
      } catch (e) {}
    }
    try {
      document.addEventListener("paste", function (e) {
        if (!pasteGuardOn) return;
        try {
          const txt = (e.clipboardData || window.clipboardData) ? String((e.clipboardData || window.clipboardData).getData("text")) : "";
          if (!txt) return;
          for (let i = 0; i < SENSITIVE.length; i++) { if (SENSITIVE[i].test(txt)) { _showPasteWarn(); return; } }
        } catch (e2) {}
      }, true);
    } catch (e) {}
  })();

})();
