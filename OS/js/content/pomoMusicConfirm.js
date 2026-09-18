// ---------------------------------------------------------------------------
// ScholarFlow module: OS/js/content/pomoMusicConfirm.js
// Runs inside a YouTube Music tab opened by the Pomodoro break-music feature.
// Watches the shared sf_pomodoro_music key; when the list of music tabs is
// cleared (manual stop button, or auto-stop at the end of a break) it paints a
// short confirmation toast on this tab so the stop is visible on the music
// side too. The sidebar closes the tab a moment later.
// ---------------------------------------------------------------------------
(function () {
  var SCRIPT_PREFIX = "sf-pomo-music-confirm";

  function showConfirm() {
    try {
      if (document.getElementById(SCRIPT_PREFIX)) return;
      var el = document.createElement("div");
      el.id = SCRIPT_PREFIX;
      el.textContent = "🎵 Nhạc nghỉ đã tắt — đang đóng tab…";
      el.style.cssText =
        "position:fixed;top:18px;right:18px;z-index:999999;padding:12px 18px;" +
        "border-radius:14px;background:rgba(15,23,42,.92);color:#fff;" +
        "font:600 14px/1.4 system-ui,-apple-system,sans-serif;" +
        "box-shadow:0 10px 30px rgba(0,0,0,.4);opacity:1;transition:opacity .4s ease;";
      (document.documentElement || document.body).appendChild(el);
      setTimeout(function () {
        el.style.opacity = "0";
      }, 1000);
      setTimeout(function () {
        if (el.parentNode) el.parentNode.removeChild(el);
      }, 1500);
    } catch (e) {}
  }

  var store = (typeof chrome !== "undefined" && chrome.storage) ? chrome.storage : null;
  if (store && store.onChanged && store.onChanged.addListener) {
    store.onChanged.addListener(function (changes, area) {
      if (area !== "local") return;
      var ch = changes && changes["sf_pomodoro_music"];
      if (!ch) return;
      var prev = ch.oldValue;
      var next = ch.newValue;
      var wasPlaying = Array.isArray(prev) && prev.length > 0;
      var nowStopped = Array.isArray(next) && next.length === 0;
      if (wasPlaying && nowStopped) showConfirm();
    });
  }
})();
