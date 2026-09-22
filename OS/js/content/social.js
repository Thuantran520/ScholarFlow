// ---------------------------------------------------------------------------
// ScholarFlow content: OS/js/content/social.js
// Social privacy toolkit (100% local, best-effort DOM heuristics):
//  A. Anti content-script injection — strips (or, in "warn" mode, only counts)
//     1) <script src="chrome-extension://|moz-extension://|..."> injected by
//        other extensions, 2) <script src="data:/blob:"> payloads,
//        3) late inline <script> pairing a sensitive source (cookie /
//        localStorage / clipboard / token) with a network sink (fetch / XHR /
//        WebSocket / sendBeacon) — the classic self-XSS theft paste,
//     4) extension <iframe>s, 5) javascript: URIs on newly added nodes.
//     NOTE: inline scripts run synchronously at insertion, so a MutationObserver
//     can only stop re-execution + report the attempt, not undo the first run.
//  B. Link cleaner — on click, strips tracking params (utm_*, fbclid, gclid,
//     igshid, ...) from <a href> before navigation.
//  C. Shop/ad link remover — unwraps affiliate & marketplace links (Shopee,
//     Lazada, Tiki, Sendo, TikTok Shop, shp.ee, shope.ee...) added in comment
//     feeds into plain text so they cannot be clicked.
// Counters are exposed to the sidebar via SOC_GET_STATS / SOC_RESET_STATS.
// Also answers SOC_SCAN_TRACKERS.
// ---------------------------------------------------------------------------
(function () {
  const SETTINGS_KEY = "sf_social_settings";
  const PLATFORM_HOSTS = {
    facebook: ["facebook.com", "messenger.com"],
    zalo: ["zalo.me", "zaloapp.com"],
    instagram: ["instagram.com"],
    whatsapp: ["web.whatsapp.com"],
    tiktok: ["tiktok.com"],
    discord: ["discord.com"],
    x: ["x.com", "twitter.com"],
    telegram: ["web.telegram.org"]
  };
  const TRACKER_HOSTS = [
    "connect.facebook.net", "facebook.net", "google-analytics.com", "googletagmanager.com",
    "doubleclick.net", "analytics.tiktok.com", "analytics.twitter.com", "bat.bing.com",
    "hotjar.com", "mixpanel.com", "segment.io", "scorecardresearch.com", "ads-twitter.com",
    "snap.licdn.com", "clarity.ms", "criteo.com", "taboola.com", "outbrain.com"
  ];
  const EXT_SRC_RE = /^(chrome-extension|moz-extension|safari-web-extension|safari-resource|chrome-untrusted):/i;
  const OBFUSCATED_SRC_RE = /^(data|blob):/i;
  const SENSITIVE_RE = /(document\.cookie|localStorage|sessionStorage|indexedDB|navigator\.clipboard|document\.getElementById\([^)]*token|window\.token)/i;
  const SINK_RE = /(fetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon|EventSource|\.submit\s*\(|@import)/i;
  const TRACK_PARAMS = [
    "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "utm_id",
    "fbclid", "gclid", "dclid", "gbraid", "wbraid", "msclkid", "yclid", "twclid",
    "igshid", "igsh", "m_st", "mc_cid", "mc_eid", "_hsenc", "_hsmi", "hsa_acc",
    "hsa_cam", "hsa_grp", "hsa_ad", "spm", "scm", "scene", "from_acquirer",
    "share_medium", "share_source", "share_url", "share_user_id", "share_to",
    "tt_medium", "tt_content", "tt_campaign", "ncid", "cmpid", "trk", "trkParam",
    "trkCampaign", "trkId", "trkOrganic", "trkProduct", "vn_trk", "feature",
    "ref_src", "refer", "ref_url", "src_app", "channel", "campaign_id", "ad_id",
    "creative", "placement", "si", "s_kwcid", "ef_id", "gclsrc"
  ];
  const SHOP_HOST_RE = /(^|\.)(shopee\.[a-z]{2,3}|shope\.ee|shp\.ee|s\.shopee|lazada\.[a-z]{2,3}|lzd\.[a-z]{2,3}|tiki\.vn|sendo\.vn|tiktok\.com|tiktokv\.com|douyin\.com|temu\.[a-z]{2,3}|aliexpress\.[a-z]{2,3}|phuhuy|hoangha|fptshop|thegioididong|cellphones|maytinhgiaphat|pnj)\.?/i;
  const AFF_TRACK_RE = /(affiliate|ref=|partner_id|utm|shopeevid|subid|clickid|content_source|fb_content_id|encrypted_payload|channel_type)/i;
  const BRAND_SUB_RE = /(shopee|lazada|tiktok|tiki|sendo|temu|aliexpress)/i;
  // Marketing/ad tracking markers. A non-social destination carrying >=2 of
  // these is an affiliate/ad link even if its domain is not in SHOP_HOST_RE.
  const AFF_MARKERS = ["encrypted_payload", "fb_content_id", "content_source", "channel_type", "partner_id", "affiliate", "subid", "clickid", "shopeevid", "utm_source", "utm_medium", "utm_campaign"];
  const SOCIAL_DEST_RE = /(^|\.)(facebook\.com|fb\.com|fb\.me|instagram\.com|messenger\.com|whatsapp\.com|zalo\.me|zaloapp\.com|discord\.com|discord\.gg|x\.com|twitter\.com|t\.co|telegram\.me|telegram\.org|youtube\.com|youtu\.be|google\.com)$/i;
  function _adMarkerCount(search) {
    let n = 0;
    for (let i = 0; i < AFF_MARKERS.length; i++) {
      if (search.indexOf(AFF_MARKERS[i]) !== -1) n++;
      if (n >= 2) return n;
    }
    return n;
  }
  // Query params that FB/IG/other use to wrap the REAL destination URL (l.php?u=...).
  const WRAP_PARAMS = ["u", "url", "q", "href", "target", "to", "dest"];
  const STATS_CAP = 300;

  const _settings = { inj: true, injMode: "remove", linkClean: true, shopClean: false, trackerBlockAll: false, trackerBlock: [], scamWarn: true };
  let _observer = null;
  let _guardActive = false;
  const _stats = { extScript: 0, obfScript: 0, inlineMal: 0, extIframe: 0, jsUri: 0, linkCleaned: 0, shopLinks: 0, trackerStripped: 0, scamLinks: 0 };

  function _runtime() {
    return (typeof browser !== "undefined" && browser.runtime) ? browser
      : ((typeof chrome !== "undefined" && chrome.runtime) ? chrome : null);
  }
  function _storage() {
    const api = _runtime();
    return (api && api.storage && api.storage.local) ? api.storage.local : null;
  }
  function _detectPlatform() {
    let h = "";
    try { h = (window.location && window.location.hostname) ? window.location.hostname.toLowerCase() : ""; } catch (e) { return null; }
    for (const k in PLATFORM_HOSTS) {
      const list = PLATFORM_HOSTS[k];
      for (let i = 0; i < list.length; i++) {
        if (h === list[i] || h.endsWith("." + list[i])) return k;
      }
    }
    return null;
  }
  function _abs(src) { try { return new URL(src, location.href).href; } catch (e) { return ""; } }
  function _isExtSrc(src) { return EXT_SRC_RE.test(_abs(src)); }
  function _statsTotal() {
    let n = 0;
    for (const k in _stats) n += _stats[k];
    return n;
  }
  function _looksMaliciousInline(text) {
    const code = String(text || "");
    if (!code || code.length > 200000) return false;
    return SENSITIVE_RE.test(code) && SINK_RE.test(code);
  }
  function _trackerHostActive() { return _settings.trackerBlockAll || (_settings.trackerBlock && _settings.trackerBlock.length > 0); }
  function _trackerHostMatch(host) {
    if (!_trackerHostActive()) return false;
    const list = [];
    if (_settings.trackerBlockAll) { for (let i = 0; i < TRACKER_HOSTS.length; i++) list.push(TRACKER_HOSTS[i]); }
    const extra = _settings.trackerBlock || [];
    for (let j = 0; j < extra.length; j++) { if (list.indexOf(extra[j]) === -1) list.push(extra[j]); }
    if (!list.length) return false;
    host = host.toLowerCase();
    for (let k = 0; k < list.length; k++) {
      const t = list[k];
      if (host === t || host.endsWith("." + t)) return true;
    }
    return false;
  }
  // A. injection vectors -------------------------------------------------
  function _hit(key, el, canRemove) {
    _stats[key]++;
    if (canRemove && el && el.remove) el.remove();
  }
  function _stripNode(el) {
    if (!_settings.inj) return;
    try {
      if (!el || el.nodeType !== 1) return;
      const remove = _settings.injMode === "remove";
      const tag = el.tagName;
      if (tag === "SCRIPT") {
        const src = el.getAttribute("src");
        if (src && _isExtSrc(src)) { _hit("extScript", el, remove); return; }
        if (src && OBFUSCATED_SRC_RE.test(_abs(src))) { _hit("obfScript", el, remove); return; }
        if (!src && _guardActive && _looksMaliciousInline(el.textContent)) { _hit("inlineMal", el, remove); return; }
        return;
      }
      if (tag === "IFRAME" && el.getAttribute("src") && _isExtSrc(el.getAttribute("src"))) {
        _hit("extIframe", el, remove); return;
      }
      if ((tag === "SCRIPT" || tag === "IFRAME" || tag === "IMG") && _trackerHostActive()) {
        const tsrc = el.getAttribute("src");
        if (tsrc && /^https?:/i.test(tsrc)) {
          let thost = "";
          try { thost = new URL(tsrc).hostname.toLowerCase(); } catch (e) {}
          if (thost && _trackerHostMatch(thost)) { _hit("trackerStripped", el, remove); return; }
        }
      }
      const href = el.getAttribute && (el.getAttribute("href") || el.getAttribute("src") || "");
      if (href && /^\s*javascript:/i.test(href)) {
        if (el.hasAttribute("data-sf-jsuri")) return;
        el.setAttribute("data-sf-jsuri", "1");
        if (remove) { el.setAttribute("href", "#"); el.removeAttribute("src"); }
        _stats.jsUri++;
      }
    } catch (e) {}
  }
  // B. link cleaner --------------------------------------------------------
  function _stripTrackingParams(iu) {
    const keys = [];
    iu.searchParams.forEach(function (_v, k) {
      const lk = k.toLowerCase();
      if (TRACK_PARAMS.indexOf(lk) !== -1 || lk.indexOf("utm_") === 0) keys.push(k);
    });
    keys.forEach(function (k) { iu.searchParams.delete(k); });
    return keys.length > 0;
  }
  function _cleanHref(el) {
    try {
      const href = el.getAttribute("href") || "";
      if (!/^https?:/i.test(href)) return false;
      let u;
      try { u = new URL(href); } catch (e2) { return false; }
      let changed = _stripTrackingParams(u);
      // Wrapper links (l.php?u=...): clean the NESTED destination too so the
      // fbclid/utm hidden inside the encoded target is gone after redirect.
      for (let i = 0; i < WRAP_PARAMS.length; i++) {
        const key = WRAP_PARAMS[i];
        const val = u.searchParams.get(key);
        if (!val) continue;
        let inner = val;
        try { inner = decodeURIComponent(val); } catch (e2) {}
        if (!/^https?:/i.test(inner)) continue;
        let iu;
        try { iu = new URL(inner); } catch (e2) { continue; }
        if (_stripTrackingParams(iu)) {
          u.searchParams.set(key, iu.href);
          changed = true;
        }
      }
      if (!changed) return false;
      el.setAttribute("href", u.href);
      _stats.linkCleaned++;
      return true;
    } catch (e) { return false; }
  }
  // C. shop/ad link remover -------------------------------------------------
  function _hostIsShop(host, search) {
    if (SHOP_HOST_RE.test(host)) return true;
    if (SOCIAL_DEST_RE.test(host)) return false;
    if (_adMarkerCount(search) >= 2) return true;
    return AFF_TRACK_RE.test(search) && BRAND_SUB_RE.test(host + search);
  }
  function _isShopHref(el) {
    try {
      const href = el.getAttribute("href") || "";
      if (!/^https?:/i.test(href)) return false;
      const u = new URL(href);
      const host = (u.hostname || "").toLowerCase();
      const cur = location.hostname.toLowerCase();
      const sameHost = host === cur || host.endsWith("." + cur);
      // 1) direct host check on the outer URL (skip the platform's own links
      //    unless it is a link-wrapper like l.php)
      if (!sameHost && _hostIsShop(host, u.search)) return true;
      // 2) wrapper decode: l.facebook.com/l.php?u=https%3A%2F%2Fs.shopee.vn%2F...
      //    (also instagram external/, google url redirects, ...)
      for (let i = 0; i < WRAP_PARAMS.length; i++) {
        const val = u.searchParams.get(WRAP_PARAMS[i]);
        if (!val) continue;
        let inner = val;
        try { inner = decodeURIComponent(val); } catch (e2) {}
        if (!/^https?:/i.test(inner)) continue;
        try {
          const iu = new URL(inner);
          if (_hostIsShop((iu.hostname || "").toLowerCase(), iu.search)) return true;
        } catch (e2) {}
      }
      return false;
    } catch (e) { return false; }
  }
  function _hasPreviewImg(node) {
    try {
      const imgs = node.querySelectorAll("img");
      for (let i = 0; i < imgs.length; i++) {
        const h = parseInt(imgs[i].getAttribute("height") || "0", 10) || 0;
        const s = imgs[i].getAttribute("src") || "";
        if (h >= 50 || /usercontent|emg1|\/t13\/|external\./i.test(s)) return true;
      }
    } catch (e) {}
    return false;
  }
  // Walk up from a shop anchor: if a small container holds ONLY shop anchors
  // and a big link-preview image, it is the link-preview card (product
  // preview) — remove the whole card, not just the anchor.
  function _shopCardOf(el) {
    try {
      let node = el.parentNode;
      let hops = 0;
      while (node && node.nodeType === 1 && hops < 8) {
        const anchors = node.querySelectorAll ? node.querySelectorAll("a[href]") : [];
        let shopCount = 0;
        let hasOther = false;
        for (let i = 0; i < anchors.length; i++) {
          if (_isShopHref(anchors[i])) shopCount++; else hasOther = true;
        }
        if (hasOther) break;
        if (shopCount > 0 && _hasPreviewImg(node)) return node;
        node = node.parentNode;
        hops++;
      }
    } catch (e) {}
    return null;
  }
  function _unwrapShopLink(el) {
    try {
      if (!_isShopHref(el)) return;
      if (!el.parentNode || !el.ownerDocument) return;
      const card = _shopCardOf(el);
      if (card) { card.remove(); _stats.shopLinks++; return; }
      const txt = el.ownerDocument.createTextNode(el.textContent || "");
      el.parentNode.replaceChild(txt, el);
      _stats.shopLinks++;
    } catch (e) {}
  }
  function _processAddedNode(root) {
    try {
      _stripNode(root);
      if (_settings.shopClean && root.tagName === "A") _unwrapShopLink(root);
      if (root.querySelectorAll) {
        const nodes = root.querySelectorAll("script,iframe,img,a[href]");
        const cap = Math.min(nodes.length, STATS_CAP);
        for (let i = 0; i < cap; i++) {
          const n = nodes[i];
          _stripNode(n);
          if (_settings.shopClean && n.tagName === "A") _unwrapShopLink(n);
        }
      }
    } catch (e) {}
  }
  function _startObserver() {
    if (_observer || !document.documentElement) return;
    _guardActive = true;
    try {
      document.querySelectorAll("script[src],iframe[src],img[src]").forEach(function (el) { _stripNode(el); });
      _observer = new MutationObserver(function (muts) {
        muts.forEach(function (m) {
          (m.addedNodes || []).forEach(function (n) {
            if (n && n.nodeType === 1) _processAddedNode(n);
          });
        });
      });
      _observer.observe(document.documentElement, { childList: true, subtree: true });
    } catch (e) {}
  }
  function _stopObserver() {
    _guardActive = false;
    try {
      if (_observer) { _observer.disconnect(); _observer = null; }
    } catch (e) {}
  }
  // One-off sweep of anchors that already exist in the DOM (comments rendered
  // before the observer started). Capped to keep big feeds cheap.
  function _sweepExistingShopLinks() {
    try {
      const links = document.querySelectorAll("a[href]");
      const cap = Math.min(links.length, 3000);
      for (let i = cap - 1; i >= 0; i--) {
        if (links[i] && links[i].nodeType === 1) _unwrapShopLink(links[i]);
      }
    } catch (e) {}
  }
  function _refresh() {
    const onSocial = !!_detectPlatform();
    if (onSocial && (_settings.inj || _settings.shopClean)) {
      _startObserver();
      if (_settings.shopClean) _sweepExistingShopLinks();
    } else {
      _stopObserver();
    }
  }
  function _readSettings(cb) {
    const api = _storage();
    if (!api) { cb(); return; }
    try {
      const p = api.get(SETTINGS_KEY);
      const apply = function (r) {
        const s = r && r[SETTINGS_KEY];
        if (s) {
          _settings.inj = s.inj !== false;
          _settings.injMode = s.injMode === "warn" ? "warn" : "remove";
          _settings.linkClean = s.linkClean !== false;
          _settings.shopClean = !!s.shopClean;
          _settings.trackerBlockAll = !!s.trackerBlockAll;
          _settings.trackerBlock = Array.isArray(s.trackerBlock) ? s.trackerBlock.slice(0, 50) : [];
          _settings.scamWarn = s.scamWarn !== false;
        }
        cb();
      };
      if (p && typeof p.then === "function") p.then(apply).catch(function () { cb(); });
      else api.get(SETTINGS_KEY, apply);
    } catch (e) { cb(); }
  }
  function _scanTrackers() {
    const found = [];
    try {
      document.querySelectorAll("script[src],iframe[src],img[src]").forEach(function (el) {
        try {
          const host = new URL(el.src).hostname.toLowerCase();
          for (let i = 0; i < TRACKER_HOSTS.length; i++) {
            const tr = TRACKER_HOSTS[i];
            if ((host === tr || host.endsWith("." + tr)) && found.indexOf(tr) === -1) found.push(tr);
          }
        } catch (e) {}
      });
    } catch (e) {}
    return found;
  }

  // C2. Scam "unlock ảo" heuristic (100% local, best-effort): counts anchors
  // that read like an account-unlock / prize / donation scam and point at a
  // non-social destination (direct contact form, messenger, off-site landing).
  const SCAM_TOKEN_RE = /(mở khóa|mở khoá|bảo hành acc|bảo kê acc|bảo kê tài khoản|hack lại|chiếm lại|lấy lại acc|phá khóa|phá khoá|mở lại account|nhận lại nick|cứu acc|facebook bị khóa|facebook bi khoa|khóa vĩnh viễn|khoa vinh vien|vi phạm tiêu chuẩn cộng đồng|đăng nhập bất thường|tài khoản bị xâm nhập|chấm công bấm vào đây|liên hệ ngay|nhắn tin riêng|ib với tôi|inbox gấp|bấm để nhận|đổi mật khẩu ngay|reset mật khẩu|nhận lại tiền|thu hồi tiền)/i;
  const SCAM_CTX_RE = /(thẻ cào|chuyển khoản|rút về|nạp tiền|nhan tien|quỹ từ thiện|từ thiện|giải cứu|lan tỏa|share để nhận|like để nhận|vay nóng|ca heo|trúng thưởng|trung thuong|quà tặng|mã otp|theo dõi để nhận)/i;
  const SCAM_CONTACT_RE = /^https?:\/\/(m\.me|zalo\.me|zaloapp\.com|t\.me|wa\.me|api\.whatsapp\.com|forms\.gle|docs\.google\.com|bit\.ly|tinyurl|shorturl|v\.gd|chuyenkhoan|vietqr)/i;
  function _scanScamLinks() {
    if (!_detectPlatform()) return { count: 0, samples: [] };
    const hits = [];
    const cap = Math.min(document.querySelectorAll("a[href]").length, 1500);
    const anchors = document.querySelectorAll("a[href]");
    for (let i = 0; i < cap; i++) {
      try {
        const a = anchors[i];
        const text = (a.textContent || "").trim();
        const href = a.getAttribute("href") || "";
        if (!/^https?:/i.test(href)) continue;
        let host = "";
        try { host = new URL(href).hostname.toLowerCase(); } catch (e) { continue; }
        if (SOCIAL_DEST_RE.test(host)) continue;
        const isContact = SCAM_CONTACT_RE.test(href);
        const tok = SCAM_TOKEN_RE.test(text);
        const ctx = SCAM_CTX_RE.test(text);
        if (tok || (isContact && ctx)) {
          if (hits.length < 6) hits.push({ text: text.slice(0, 80), url: href });
        }
      } catch (e) {}
    }
    return { count: hits.length, samples: hits.slice(0, 3) };
  }

  // Click-time link cleaning (capture phase, before navigation resolves).
  try {
    document.addEventListener("click", function (e) {
      if (!_settings.linkClean || e.button !== 0 || !e.isTrusted) return;
      if (!_detectPlatform()) return;
      const t = e.target;
      const a = t && t.closest ? t.closest("a[href]") : null;
      if (a) _cleanHref(a);
    }, true);
  } catch (e) {}

  try { _readSettings(_refresh); } catch (e) {}
  try {
    const api = _storage();
    if (api && api.onChanged) {
      api.onChanged.addListener(function (changes, area) {
        if (area === "local" && changes && changes[SETTINGS_KEY]) _readSettings(_refresh);
      });
    }
  } catch (e) {}
  try {
    const root = _runtime();
    const rt = root && root.runtime;
    if (rt && rt.onMessage && rt.onMessage.addListener) {
      rt.onMessage.addListener(function (msg, sender, sendResponse) {
        if (!msg || !msg.action) return;
        if (msg.action === "SOC_SCAN_SCAM") {
          try {
            const r = _scanScamLinks();
            sendResponse({ ok: true, count: r.count, samples: r.samples });
          } catch (e) { sendResponse({ ok: false }); }
          return;
        }
        if (msg.action === "SOC_SCAN_TRACKERS") {
          try { sendResponse({ ok: true, trackers: _scanTrackers(), platform: _detectPlatform() }); } catch (e) { sendResponse({ ok: false }); }
          return;
        }
        if (msg.action === "SOC_REFRESH") {
          _readSettings(_refresh);
          try { sendResponse({ ok: true, protected: _settings.inj, removed: _statsTotal() }); } catch (e) {}
          return;
        }
        if (msg.action === "SOC_GET_STATS") {
          try {
            sendResponse({
              ok: true, platform: _detectPlatform(), enabled: _settings.inj, mode: _settings.injMode,
              stats: Object.assign({}, _stats), total: _statsTotal()
            });
          } catch (e) { sendResponse({ ok: false }); }
          return;
        }
        if (msg.action === "SOC_RESET_STATS") {
          try {
            for (const k in _stats) _stats[k] = 0;
            sendResponse({ ok: true });
          } catch (e) { sendResponse({ ok: false }); }
          return;
        }
      });
    }
  } catch (e) {}
})();
