/* One-off (v2.4.5 part 6): deep site-trust heuristics in content script.
   Replaces the thin SEC_TRUST_REPORT handler with _trustReport(). */
const fs = require("fs");
const f = "OS/js/content/security.js";
let c = fs.readFileSync(f, "utf8");
if (c.includes("function _trustReport")) { console.log("already"); process.exit(0); }

// 1) add brand tokens + helper + _trustReport before _showPhishingBanner
const anchorFn = "  function _showPhishingBanner(info) {";
if (!c.includes(anchorFn)) { console.error("anchor _showPhishingBanner missing"); process.exit(1); }
const fn = `  const TRUST_BRANDS = ["facebook", "instagram", "zalopay", "zalo", "momo", "shopee", "vietcombank", "techcombank", "agribank", "bidv", "vietinbank", "paypal", "apple", "netflix", "discord", "tiktok", "google", "microsoft", "tiki", "lazada", "vpbank", "tpbank", "mbbank", "acb"];
  const URL_SHORTENERS = ["bit.ly", "tinyurl.com", "t.ly", "is.gd", "cutt.ly", "buff.ly", "ow.ly", "shorturl.at", "rb.gy", "rebrand.ly", "s.id"];
  const LOGIN_WORDS = /(login|\\u0111\\u00e2?\\u0301ng nh\\u1ead?p|dang nhap|sign ?in|verify|x\\u00e1c th\\u1ef1c|xac thuc|secure|b\\u1ea3o m\\u1ead?t|bao mat|password|m\\u1eadt kh\\u1ea9u|mat khau|qu\\u1ea3n t\\u00e0i kho\\u1ea3n)/i;
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
    if (host.indexOf("xn--") !== -1 || /[^\\x00-\\x7f]/.test(host)) { addR("sec_trust_unicode"); rep.score += 3; }
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
    const toks = host.split(/[.\\-_]/);
    let brandHostTok = "";
    for (let i = 0; i < toks.length; i++) { if (TRUST_BRANDS.indexOf(toks[i]) !== -1) { brandHostTok = toks[i]; break; } }
    if (brandHostTok && !ph) { addR("sec_trust_typo", brandHostTok); rep.score += 3; }
    for (let s = 0; s < URL_SHORTENERS.length; s++) {
      const sh = URL_SHORTENERS[s];
      if (host === sh || host.endsWith("." + sh)) { addR("sec_trust_shortener"); rep.score += 2; break; }
    }
    let docText = "";
    try {
      docText = (document.title || "") + " | " + ((document.querySelector("meta[property=\\"og:site_name\\"]") || {}).content || "") + " | " + ((document.querySelector("meta[name=\\"description\\"]") || {}).content || "");
    } catch (e) {}
    const dl = docText.toLowerCase();
    let claimedBrand = "";
    for (let i = 0; i < TRUST_BRANDS.length; i++) { if (dl.indexOf(TRUST_BRANDS[i]) !== -1) { claimedBrand = TRUST_BRANDS[i]; break; } }
    let hasPw = false;
    try { hasPw = !!document.querySelector("input[type=\\"password\\"]"); } catch (e) {}
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

`;
c = c.replace(anchorFn, fn + anchorFn);

// 2) replace old inline handler with delegation
const hStart = c.indexOf('        if (msg.action === "SEC_TRUST_REPORT") {');
if (hStart < 0) { console.error("handler start missing"); process.exit(1); }
const hEnd = c.indexOf('return true;\r\n        }', hStart);
const hEnd2 = hEnd < 0 ? c.indexOf('return true;\n        }', hStart) : hEnd;
if (hEnd2 < 0) { console.error("handler end missing"); process.exit(1); }
const eol = hEnd < 0 ? "\n" : "\r\n";
c = c.slice(0, hStart) +
'        if (msg.action === "SEC_TRUST_REPORT") { sendResponse(_trustReport()); return true; }' + eol +
c.slice(hEnd2 + ('return true;' + eol + '        }').length);
fs.writeFileSync(f, c);
console.log("content trust upgraded");
