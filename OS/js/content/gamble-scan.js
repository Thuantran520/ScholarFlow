// ---------------------------------------------------------------------------
// ScholarFlow content: OS/js/content/gamble-scan.js
// Gambling fingerprint scanner (runs AFTER gamble-fp.js in the same world).
// Catches brand-new betting domains the static list cannot know about:
//   1. cheap gate on host shape (risky TLD / numeric "spinny" label) +
//      <title> markers before ever sampling visible text;
//   2. if the language fingerprint decides "gambling", redirect the top frame
//      to the localized block page and teach the background a DNR rule for
//      this exact host, so the NEXT visit is blocked at the network layer.
// Fully local. Respects sf_social_settings { gamble:false, gambleAllow }.
// ---------------------------------------------------------------------------
(function () {
  const SETTINGS_KEY = "sf_social_settings";
  const LEARN_MSG = "GMBL_LEARN";

  function _runtime() {
    return (typeof browser !== "undefined" && browser.runtime) ? browser
      : ((typeof chrome !== "undefined" && chrome.runtime) ? chrome : null);
  }
  function _storage() {
    const api = _runtime();
    return (api && api.storage && api.storage.local) ? api.storage.local : null;
  }
  function _runtimeId() {
    try {
      const rt = _runtime();
      return rt && rt.getURL ? rt.getURL("OS/html/gamble-block.html") : "";
    } catch (e) { return ""; }
  }
  function _blockRedirect(host) {
    try {
      const url = _runtimeId();
      if (!url) return;
      window.stop();
      window.location.replace(url + "?h=" + encodeURIComponent(host));
    } catch (e) {}
  }
  function _teach(host) {
    try {
      const rt = _runtime();
      if (!rt || !rt.sendMessage) return;
      const p = rt.sendMessage({ action: LEARN_MSG, host: host });
      if (p && p.catch) p.catch(function () {});
    } catch (e) {}
  }
  function _run() {
    const FP = window.GMBL_FP;
    try {
      if (!FP) return;
      if (window.top !== window) return;
      const host = (window.location.hostname || "").toLowerCase();
      if (!host || host === "localhost") return;
      if (/^(www\.)?(facebook|instagram|messenger|zalo|x|twitter|t\.co|discord|telegram|whatsapp|tiktok|youtube)\./i.test(host)) return;
      const api = _storage();
      if (!api) return;
      const apply = function (res) {
        const s = (res && res[SETTINGS_KEY]) || {};
        if (s.gamble === false) return;
        const root = FP.rootOf(host);
        const allow = s.gambleAllow || {};
        if (allow[root] || allow[host] || FP.safeHost(host)) return;
        let title = "";
        try { title = document.title || ""; } catch (e) {}
        let gate = FP.score(host, title, "");
        if (gate.block) { _blockRedirect(host); _teach(host); return; }
        // Only spend body-sampling when the title/host already hints gambling.
        const needBody = gate.titleHits >= 1 || (gate.risky && gate.spin);
        if (!needBody) return;
        let body = "";
        try {
          body = (document.body && (document.body.innerText || document.body.textContent)) || "";
          body = body.slice(0, 24000);
        } catch (e) { return; }
        const full = FP.score(host, title, body);
        if (full.block) { _blockRedirect(host); _teach(host); }
      };
      try {
        const p = api.get(SETTINGS_KEY);
        if (p && typeof p.then === "function") p.then(apply, function () {});
        else api.get(SETTINGS_KEY, apply);
      } catch (e) {}
    } catch (e) {}
  }
  try {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", _run);
    else _run();
  } catch (e) {}
})();
