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
  const POPULAR = ["google.com", "facebook.com", "paypal.com", "apple.com", "microsoft.com", "amazon.com", "youtube.com", "twitter.com", "instagram.com", "linkedin.com", "netflix.com", "appleid.apple.com"];

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

  function _showPhishingBanner(info) {
    if (document.getElementById("__sf_phishing_banner")) return;
    const b = document.createElement("div");
    b.id = "__sf_phishing_banner";
    b.setAttribute("role", "alert");
    b.style.cssText = "position:fixed;top:0;left:0;right:0;z-index:2147483647;background:#7f1d1d;color:#fff;padding:10px 14px;font-family:system-ui,sans-serif;font-size:13px;font-weight:700;display:flex;align-items:center;justify-content:space-between;gap:12px;box-shadow:0 2px 12px rgba(0,0,0,0.4);border-bottom:2px solid #ef4444;";
    const t = document.createElement("span");
    let msg = "ScholarFlow Real-Time Protection: phishing pattern (" + (info.rule || info.host) + ")";
    if (info.type === "typo") msg = "ScholarFlow: possible typo-squat '" + info.host + "' looks like '" + info.typo + "' — check URL carefully.";
    if (info.type === "punycode") msg = "ScholarFlow: punycode host '" + info.host + "' — possible homograph attack.";
    t.textContent = "⚠️ " + msg;
    const c = document.createElement("button");
    c.textContent = "×";
    c.style.cssText = "background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.3);color:#fff;border-radius:6px;padding:2px 8px;cursor:pointer;font-size:14px;";
    c.addEventListener("click", function () { b.remove(); });
    b.appendChild(t);
    b.appendChild(c);
    (document.documentElement || document.body).appendChild(b);
  }

  function scanPhishing() {
    try {
      if (typeof window === "undefined" || !window || window._document === null || !window.document) return null;
      const href = (window._document !== null && window.location && window.location.href) ? window.location.href : "";
      if (!href) return null;
      const info = _isPhishing(href);
      if (info) _showPhishingBanner(info);
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

  window.__sfSecurity = { scanPhishing: scanPhishing, scanClickjacking: scanClickjacking, unlockPage: unlockPage, lockPage: lockPage, isPhishing: _isPhishing, isTypoSquat: _isTypoSquat };

  // auto-run based on storage
  try {
    const key = "sf_security_settings";
    const get = (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) ? chrome.storage.local : (typeof browser !== "undefined" && browser.storage && browser.storage.local) ? browser.storage.local : null;
    const read = function (cb) {
      if (!get) return cb({});
      try {
        const p = get.get(key);
        if (p && typeof p.then === "function") p.then(cb).catch(function () { cb({}); });
        else get.get(key, cb);
      } catch (e) { cb({}); }
    };
    read(function (res) {
      try {
        const s = (res && res[key]) || { phishing: true, clickjack: true, autoBlock: true, unlockSites: {} };
        if (s.phishing) scanPhishing();
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
  } catch (e2) {
    scanPhishing();
    setTimeout(function () { scanClickjacking(true); }, 1200);
  }

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
      });
    }
  } catch (e2) {}
})();
