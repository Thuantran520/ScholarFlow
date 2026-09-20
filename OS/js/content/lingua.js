// ---------------------------------------------------------------------------
// ScholarFlow content: OS/js/content/lingua.js
// Writing assistant on ANY website: when the user finishes typing a decent
// English (Latin-script) text in a comment box / textarea / contenteditable,
// a small "Lingua check" pill appears next to the field. On click, the text
// is sent to the open sidebar (LINGUA_WRITE_CHECK) which runs the AI coach,
// logs categorized errors, and returns corrections rendered in a local
// bubble. User-triggered only — no auto-checking, nothing leaves the page.
// 100% local UI: no direct network calls here.
// ---------------------------------------------------------------------------
(function () {
  const PILL_ID = "__sf_lng_pill";
  const BUB_ID = "__sf_lng_bub";
  const MIN_CHARS = 40;
  let curField = null;
  let hideTimer = null;

  function runtime() {
    if (typeof browser !== "undefined" && browser.runtime) return browser.runtime;
    if (typeof chrome !== "undefined" && chrome.runtime) return chrome.runtime;
    return null;
  }
  function tc(k, args) {
    return (typeof tContent === "function") ? tContent.apply(null, [k].concat(args || [])) : k;
  }
  function isEditable(t) {
    if (!t || !t.tagName) return false;
    if (t.tagName === "TEXTAREA") return true;
    if (t.tagName === "INPUT") return /^(text|search)$/i.test(t.getAttribute("type") || "text");
    return !!t.isContentEditable;
  }
  function textOf(f) {
    try {
      if (typeof f.value === "string") return f.value;
      return f.innerText || f.textContent || "";
    } catch (e) { return ""; }
  }
  function looksLatin(text) {
    const letters = (text.match(/[A-Za-z]/g) || []).length;
    return letters >= Math.max(20, text.length * 0.4);
  }
  function removeEl(id) { try { const el = document.getElementById(id); if (el) el.remove(); } catch (e) {} }
  function clearHide() { if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; } }
  function armHide(delay) {
    clearHide();
    hideTimer = setTimeout(function () { removeEl(PILL_ID); removeEl(BUB_ID); }, delay || 15000);
  }
  function anchorTo(rect, el) {
    el.style.position = "fixed";
    el.style.left = Math.max(4, Math.min(window.innerWidth - el.offsetWidth - 8, rect.right - el.offsetWidth)) + "px";
    if (rect.top > el.offsetHeight + 12) {
      el.style.top = (rect.top - el.offsetHeight - 4) + "px";
    } else {
      el.style.top = Math.min(window.innerHeight - el.offsetHeight - 8, rect.bottom + 4) + "px";
    }
    el.style.zIndex = "2147483646";
  }
  function showPill(field) {
    removeEl(PILL_ID);
    const rect = field.getBoundingClientRect();
    if (rect.width < 40 || rect.bottom < 0 || rect.top > window.innerHeight) return;
    const pill = document.createElement("button");
    pill.type = "button";
    pill.id = PILL_ID;
    pill.textContent = "\u270d\u2753 Lingua?";
    pill.style.cssText = "position:fixed;z-index:2147483646;background:#0f172a;color:#38bdf8;border:1px solid rgba(56,189,248,0.5);border-radius:99px;padding:3px 10px;font:600 11.5px system-ui,sans-serif;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.4);";
    (document.body || document.documentElement).appendChild(pill);
    anchorTo(rect, pill);
    pill.addEventListener("click", function () { runCheck(field, pill); });
    armHide(18000);
  }
  function bubble(text, tone) {
    removeEl(BUB_ID);
    const b = document.createElement("div");
    b.id = BUB_ID;
    b.style.cssText = "position:fixed;z-index:2147483647;max-width:360px;background:#0f172a;color:#e2e8f0;border:1px solid " + (tone === "bad" ? "#ef4444" : "#38bdf8") + ";border-radius:10px;padding:8px 10px;font:11.5px/1.5 system-ui,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.45);";
    if (text) { const first = document.createElement("div"); first.textContent = text; b.appendChild(first); }
    (document.body || document.documentElement).appendChild(b);
    if (curField) { try { anchorTo(curField.getBoundingClientRect(), b); } catch (e) {} }
    const x = document.createElement("button");
    x.type = "button";
    x.textContent = "\u00d7";
    x.style.cssText = "float:right;margin-left:8px;background:none;border:none;color:#64748b;cursor:pointer;font:13px system-ui,sans-serif;";
    x.addEventListener("click", function () { removeEl(BUB_ID); });
    b.insertBefore(x, b.firstChild);
    armHide(45000);
    return b;
  }
  function runCheck(field, pill) {
    const text = textOf(field).trim().slice(0, 2000);
    if (pill) pill.remove();
    const b = bubble(tc("lingua_wait"), "ok");
    const rt = runtime();
    if (!rt || !rt.sendMessage) { b.textContent = ""; bubble(tc("lingua_off"), "bad"); return; }
    let done = false;
    const timeout = setTimeout(function () {
      if (done) return; done = true;
      b.textContent = "";
      bubble(tc("lingua_off"), "bad");
    }, 25000);
    try {
      rt.sendMessage({ action: "LINGUA_WRITE_CHECK", text: text }, function (res) {
        if (done) return; done = true; clearTimeout(timeout);
        const err = (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.lastError);
        b.textContent = "";
        if (err || !res) { bubble(tc("lingua_off"), "bad"); return; }
        if (!res.ok) { bubble(tc(res.reason === "noai" ? "lingua_noai" : "lingua_off"), "bad"); return; }
        if (!res.corrections.length) { bubble(tc("lingua_clean"), "ok"); return; }
        const head = document.createElement("div");
        head.style.cssText = "font-weight:700;color:#fbbf24;margin-bottom:4px;";
        head.textContent = res.corrections.length + " \u26a0";
        b.appendChild(head);
        res.corrections.forEach(function (c) {
          const row = document.createElement("div");
          row.style.cssText = "margin-bottom:4px;";
          const cat = document.createElement("span");
          cat.style.cssText = "color:#64748b;font-weight:700;";
          cat.textContent = "[" + c.c + "] ";
          const w = document.createElement("span"); w.style.color = "#f87171"; w.textContent = c.o;
          const ar = document.createElement("span"); ar.textContent = " \u2192 ";
          const f = document.createElement("span"); f.style.color = "#34d399"; f.style.fontWeight = "700"; f.textContent = c.f;
          row.appendChild(cat); row.appendChild(w); row.appendChild(ar); row.appendChild(f);
          b.appendChild(row);
        });
      });
    } catch (e) {
      if (!done) { done = true; clearTimeout(timeout); b.textContent = ""; bubble(tc("lingua_off"), "bad"); }
    }
  }
  function schedulePill() {
    if (!curField) return;
    const text = textOf(curField).trim();
    if (text.length < MIN_CHARS || !looksLatin(text)) { removeEl(PILL_ID); return; }
    showPill(curField);
  }
  document.addEventListener("focusin", function (e) {
    if (isEditable(e.target)) { curField = e.target; }
    removeEl(PILL_ID); removeEl(BUB_ID);
  }, true);
  document.addEventListener("input", function () { schedulePill(); }, true);
  document.addEventListener("focusout", function () {
    removeEl(PILL_ID);
    // keep the result bubble until the user closes it or the timer fires
  }, true);
})();
