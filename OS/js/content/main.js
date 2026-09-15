// Helper to send messages to runtime/sidebar (Firefox + Chrome compatible)
  function notifySidebar(msg) {
    const runtimeApi = (typeof browser !== "undefined" && browser.runtime) ? browser.runtime
      : ((typeof chrome !== "undefined" && chrome.runtime) ? chrome.runtime : null);
    if (runtimeApi && runtimeApi.sendMessage) {
      try {
        const p = runtimeApi.sendMessage(msg);
        if (p && typeof p.catch === "function") p.catch(() => {});
      } catch (e) {}
    }
  }
  window.notifySidebar = notifySidebar;

  // Message listener from sidebar / background (Firefox + Chrome compatible)
  // --- YouTube transcript helpers (reads page's own ytInitialPlayerResponse -> timedtext API) ---
  function sfYtExtractBalancedJson(s, i0) {
    let depth = 0, inStr = false, esc = false;
    for (let i = i0; i < s.length; i++) {
      const ch = s[i];
      if (inStr) { if (esc) { esc = false; } else if (ch === "\\") { esc = true; } else if (ch === "\"") { inStr = false; } continue; }
      if (ch === "\"") { inStr = true; continue; }
      if (ch === "{") { depth++; continue; }
      if (ch === "}") { depth--; if (depth === 0) return s.slice(i0, i + 1); }
      if (depth === 0 && i - i0 > 600000) break;
    }
    return "";
  }
  function sfYtFmtTs(totalSec) {
    const s0 = Math.max(0, Math.floor(totalSec) || 0);
    const h = Math.floor(s0 / 3600), m = Math.floor((s0 % 3600) / 60), sec = s0 % 60;
    const p = (n) => String(n).padStart(2, "0");
    return (h ? h + ":" : "") + p(m) + ":" + p(sec);
  }
  function sfYtCaptionToLines(json) {
    let evs = [];
    try { evs = (json && json.events) || []; } catch (e) { evs = []; }
    const out = []; let cur = "", curMs = 0, total = 0;
    for (const ev of evs) {
      const segs = ev.segs || []; let t = "";
      for (const sg of segs) { if (sg && typeof sg.utf8 === "string") t += sg.utf8; }
      if (!t) continue;
      if (/^\s*\n+\s*$/.test(t)) {
        if (cur.trim()) { const line = "[" + sfYtFmtTs(curMs) + "] " + cur.replace(/\s+/g, " ").trim(); out.push(line); total += line.length; cur = ""; }
        if (total > 23000) break;
        continue;
      }
      if (!cur.trim()) curMs = Math.round((ev.tStartMs || 0) / 1000);
      cur += t;
    }
    if (cur.trim() && total <= 23000) out.push("[" + sfYtFmtTs(curMs) + "] " + cur.replace(/\s+/g, " ").trim());
    return out.join("\n").slice(0, 24000);
  }
  function sfYtPickTrack(tracks, lang) {
    if (!Array.isArray(tracks) || !tracks.length) return null;
    const want = String(lang || "vi").toLowerCase();
    const root = want.split("-")[0];
    let t = tracks.find(x => x && x.languageCode === want && x.kind !== "asr");
    if (!t) t = tracks.find(x => x && String(x.languageCode || "").toLowerCase().startsWith(root) && x.kind !== "asr");
    if (!t) t = tracks.find(x => x && String(x.languageCode || "").toLowerCase().startsWith(root));
    if (!t) t = tracks.find(x => x && String(x.languageCode || "").toLowerCase().startsWith("en"));
    if (!t) t = tracks.find(x => x && x.kind !== "asr");
    if (!t) t = tracks[0];
    return t || null;
  }
  function sfYtSafeBaseUrl(u) {
    try {
      const x = new URL(u);
      const h = (x.hostname || "").toLowerCase();
      if (x.protocol !== "https:" && x.protocol !== "http:") return "";
      if (!/(^|\.)(youtube|youtube-nocookie|google|googlevideo|ggpht)\.com$/.test(h)) return "";
      return x.toString();
    } catch (e) { return ""; }
  }
  const _runtimeApi = (typeof browser !== "undefined" && browser.runtime) ? browser.runtime
    : ((typeof chrome !== "undefined" && chrome.runtime) ? chrome.runtime : null);
  if (_runtimeApi && _runtimeApi.onMessage) {
    _runtimeApi.onMessage.addListener((msg, sender, sendResponse) => {
      switch (msg.action) {
        case "SET_LANGUAGE":
          if (msg.lang) {
            currentAppLang = msg.lang;
            if (snipGuidePillEl && isElementCaptureMode) {
              updateSnipGuidePill(snipActiveRect ? false : null);
            }
          }
          sendResponse({ success: true });
          break;
        case "START_INSPECT":
          currentRedactStyle = msg.style || currentRedactStyle;
          currentBlurPx = msg.blurPx || currentBlurPx;
          startInspectMode();
          sendResponse({
            success: true,
            count: redactedElementsList.length,
            list: getRedactedItemsForSidebar()
          });
          break;

        case "STOP_INSPECT":
          stopInspectMode();
          sendResponse({ success: true });
          break;

        case "SET_REDACT_STYLE":
          currentRedactStyle = msg.style || currentRedactStyle;
          currentBlurPx = msg.blurPx || currentBlurPx;
          document.documentElement.style.setProperty("--super-blur-val", `${currentBlurPx}px`);

          redactedElementsList.forEach(item => {
            if (!item.element) return;
            if (item.kind === "region") {
              item.style = currentRedactStyle;
              item.blurPx = currentBlurPx;
              applyRegionStyle(item.element, currentRedactStyle, currentBlurPx);
            } else if (item.element.classList.contains("super-redact-blur")) {
              item.element.style.setProperty("--super-blur-val", `${currentBlurPx}px`);
            }
          });

          if (msg.applyToLast && redactedElementsList.length > 0) {
            const lastItem = redactedElementsList[redactedElementsList.length - 1];
            lastItem.style = currentRedactStyle;
            lastItem.blurPx = currentBlurPx;
            if (lastItem.kind === "region") {
              applyRegionStyle(lastItem.element, currentRedactStyle, currentBlurPx);
            } else {
              updateElementStyle(lastItem.element, currentRedactStyle, currentBlurPx);
            }
            flashRedactedElement(lastItem.element);
          }

          redactPersist();

          sendResponse({
            success: true,
            count: redactedElementsList.length,
            list: getRedactedItemsForSidebar()
          });
          break;

        case "APPLY_STYLE_TO_ALL":
          currentRedactStyle = msg.style || currentRedactStyle;
          currentBlurPx = msg.blurPx || currentBlurPx;
          document.documentElement.style.setProperty("--super-blur-val", `${currentBlurPx}px`);
          redactedElementsList.forEach(item => {
            if (item.element) {
              item.style = currentRedactStyle;
              item.blurPx = currentBlurPx;
              if (item.kind === "region") {
                applyRegionStyle(item.element, currentRedactStyle, currentBlurPx);
              } else {
                updateElementStyle(item.element, currentRedactStyle, currentBlurPx);
              }
            }
          });
          redactPersist();
          sendResponse({
            success: true,
            count: redactedElementsList.length,
            list: getRedactedItemsForSidebar()
          });
          break;

        case "UNDO_REDACT":
          const remaining = undoLastRedaction();
          sendResponse({
            success: true,
            count: remaining,
            list: getRedactedItemsForSidebar()
          });
          break;

        case "REMOVE_REDACTION_BY_ID":
          const remCount = removeRedactionById(msg.id);
          sendResponse({
            success: true,
            count: remCount,
            list: getRedactedItemsForSidebar()
          });
          break;

        case "HIGHLIGHT_REDACTED_ELEMENT":
          highlightRedactedElement(msg.id);
          sendResponse({ success: true });
          break;

        case "UNHIGHLIGHT_REDACTED_ELEMENT":
          unhighlightRedactedElement();
          sendResponse({ success: true });
          break;

        case "CLEAR_ALL_REDACT":
          clearAllRedactions();
          sendResponse({
            success: true,
            count: 0,
            list: []
          });
          break;

        case "TOGGLE_REDACTIONS_PAUSE":
          const isPausedNow = toggleRedactionsPause(msg.paused);
          sendResponse({ success: true, isPaused: isPausedNow });
          break;

        case "GET_REDACT_STATUS":
          const currentList = getRedactedItemsForSidebar();
          sendResponse({
            isInspectMode,
            isRedactionsPaused,
            count: currentList.length,
            list: currentList,
            style: currentRedactStyle,
            blurPx: currentBlurPx
          });
          break;

        case "EXTRACT_PAGE_METADATA":
          sendResponse(extractPageCitationMetadata());
          break;

        case "EXTRACT_PDF_BUFFER":
          (async function() {
            try {
              let pdfUrl = location.href || "";
              const embed = document.querySelector('embed[type="application/pdf"], iframe[type="application/pdf"], iframe[src$=".pdf"], embed[src$=".pdf"], object[type="application/pdf"]');
              
              if (embed) {
                pdfUrl = embed.src || embed.getAttribute('data') || pdfUrl;
              }

              // Xử lý chuẩn hóa đường dẫn tương đối thành tuyệt đối
              if (pdfUrl && !/^https?:\/\//i.test(pdfUrl) && !pdfUrl.startsWith('blob:')) {
                pdfUrl = new URL(pdfUrl, location.href).href;
              }

              // Gửi URL sang background nhờ tải hộ để né CORS
              const runtimeApi = (typeof browser !== "undefined" && browser.runtime) ? browser.runtime : chrome.runtime;
              runtimeApi.sendMessage({
                action: "DOWNLOAD_PDF_IN_BACKGROUND",
                url: pdfUrl
              }, (response) => {
                sendResponse(response);
              });
            } catch (err) {
              console.warn('Lỗi quét URL PDF:', err);
              sendResponse(null);
            }
          })();
          return true; // Bắt buộc return true để giữ cổng kết nối bất đồng bộ

        case "PREPARE_FULLPAGE_SCROLL":
          sendResponse(prepareFullPageScroll());
          break;

        case "HIDE_FIXED_ELEMENTS":
          toggleFixedElements(false);
          sendResponse({ success: true });
          break;

        case "RESTORE_FIXED_ELEMENTS":
          toggleFixedElements(true);
          sendResponse({ success: true });
          break;

        case "START_ELEMENT_CAPTURE":
          try {
            if (typeof startElementCaptureMode === "function") {
              startElementCaptureMode();
            } else if (typeof window !== "undefined" && typeof window.startElementCaptureMode === "function") {
              window.startElementCaptureMode();
            }
            sendResponse({ success: true });
          } catch (err) {
            console.error("Failed to start element capture:", err);
            sendResponse({ success: false, error: err.message });
          }
          break;

        case "STOP_ELEMENT_CAPTURE":
          try {
            if (typeof stopElementCaptureMode === "function") {
              stopElementCaptureMode();
            } else if (typeof window !== "undefined" && typeof window.stopElementCaptureMode === "function") {
              window.stopElementCaptureMode();
            }
            sendResponse({ success: true });
          } catch (err) {
            console.error("Failed to stop element capture:", err);
            sendResponse({ success: false, error: err.message });
          }
          break;

        case "SCROLL_ELEMENT_INTO_VIEW":
          // Clean up any stray flash or highlighter boxes
          document.querySelectorAll('.super-capture-flash').forEach(f => f.remove());
          clearHoverState();

          const targetInView = document.querySelector('[data-super-capture-target="true"]');
          if (targetInView) {
            const rBefore = targetInView.getBoundingClientRect();
            // Only scroll if element is partly or completely outside the visible viewport!
            if (rBefore.top < 0 || rBefore.bottom > window.innerHeight || rBefore.left < 0 || rBefore.right > window.innerWidth) {
              targetInView.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" });
            }
            const r = targetInView.getBoundingClientRect();
            sendResponse({
              success: true,
              rect: {
                left: r.left,
                top: r.top,
                width: r.width,
                height: r.height
              },
              docTop: r.top + window.scrollY,
              docLeft: r.left + window.scrollX,
              scrollWidth: targetInView.scrollWidth,
              scrollHeight: targetInView.scrollHeight,
              clientWidth: targetInView.clientWidth,
              clientHeight: targetInView.clientHeight,
              viewportWidth: window.innerWidth,
              viewportHeight: window.innerHeight,
              dpr: window.devicePixelRatio || 1
            });
          } else {
            sendResponse({ success: false });
          }
          break;

        case "SCROLL_CAPTURE_TARGET":
          const capTarget = document.querySelector('[data-super-capture-target="true"]');
          if (capTarget) {
            if (typeof msg.scrollLeft === "number") capTarget.scrollLeft = msg.scrollLeft;
            if (typeof msg.scrollTop === "number") capTarget.scrollTop = msg.scrollTop;
            if (msg.hideScrollbars) {
              capTarget.style.setProperty("scrollbar-width", "none", "important");
              capTarget.style.setProperty("-ms-overflow-style", "none", "important");
            }
            const r = capTarget.getBoundingClientRect();
            sendResponse({
              success: true,
              actualScrollLeft: capTarget.scrollLeft,
              actualScrollTop: capTarget.scrollTop,
              rect: {
                left: r.left,
                top: r.top,
                width: r.width,
                height: r.height
              }
            });
          } else {
            sendResponse({ success: false });
          }
          break;

        case "RESTORE_CAPTURE_TARGET":
          const capEl = document.querySelector('[data-super-capture-target="true"]');
          if (capEl) {
            if (typeof msg.origScrollLeft === "number") capEl.scrollLeft = msg.origScrollLeft;
            if (typeof msg.origScrollTop === "number") capEl.scrollTop = msg.origScrollTop;
            capEl.style.removeProperty("scrollbar-width");
            capEl.style.removeProperty("-ms-overflow-style");
            capEl.removeAttribute("data-super-capture-target");
          }
          sendResponse({ success: true });
          break;

        case "GET_CAPTURE_TARGET_RECT":
          const capTargetEl = document.querySelector('[data-super-capture-target="true"]');
          if (capTargetEl) {
            const r = capTargetEl.getBoundingClientRect();
            sendResponse({
              success: true,
              rect: {
                left: r.left,
                top: r.top,
                width: r.width,
                height: r.height
              },
              scrollWidth: capTargetEl.scrollWidth,
              scrollHeight: capTargetEl.scrollHeight,
              clientWidth: capTargetEl.clientWidth,
              clientHeight: capTargetEl.clientHeight,
              viewportWidth: window.innerWidth,
              viewportHeight: window.innerHeight,
              dpr: window.devicePixelRatio || 1
            });
          } else {
            sendResponse({ success: false });
          }
          break;

        case "SHOW_PAGE_TOAST":
          showInPageToast(msg.text || "");
          sendResponse({ success: true });
          break;

        case "SHOW_PAGE_COUNTDOWN":
          showPageCountdown(msg.seconds);
          sendResponse({ success: true });
          break;

        case "UPDATE_PAGE_COUNTDOWN":
          updatePageCountdown(msg.value);
          sendResponse({ success: true });
          break;

        case "HIDE_PAGE_COUNTDOWN":
          hidePageCountdown();
          sendResponse({ success: true });
          break;

        case "GET_REDACT_MASKS":
          sendResponse({
            success: true,
            masks: (typeof getRedactedMasksForCapture === "function") ? getRedactedMasksForCapture() : [],
            scrollX: window.scrollX || 0,
            scrollY: window.scrollY || 0,
            viewportWidth: window.innerWidth || 0,
            viewportHeight: window.innerHeight || 0
          });
          break;

        case "AUTO_DETECT_SENSITIVE":
          {
            const n = (typeof detectSensitiveElements === "function")
              ? detectSensitiveElements(msg.style, msg.blurPx) : 0;
            sendResponse({
              success: true,
              count: n,
              list: getRedactedItemsForSidebar()
            });
          }
          break;

        case "MASK_BY_KEYWORD":
          {
            const n = (typeof maskByKeyword === "function")
              ? maskByKeyword(msg.keyword, msg.style, msg.blurPx) : 0;
            sendResponse({
              success: true,
              count: n,
              list: getRedactedItemsForSidebar()
            });
          }
          break;

        case "GET_PAGE_TEXT": {
          let txt2 = "";
          try {
            const rootSel = document.querySelector("article") || document.querySelector("main") || document.querySelector("[role=main]") || document.body;
            const skip = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, NAV: 1, HEADER: 1, FOOTER: 1, ASIDE: 1, IFRAME: 1, FORM: 1, BUTTON: 1, SELECT: 1 };
            const blockish = { P: 1, DIV: 1, LI: 1, UL: 1, OL: 1, TABLE: 1, TR: 1, SECTION: 1, H1: 1, H2: 1, H3: 1, H4: 1, H5: 1, BLOCKQUOTE: 1, PRE: 1, FIGCAPTION: 1 };
            const hidden = (el) => {
              try { const cs = window.getComputedStyle(el); return cs.display === "none" || cs.visibility === "hidden"; } catch (e) { return false; }
            };
            let out = "";
            const imgNotes = [];
            let guardCount = 0;
            const walk = (el) => {
              if (!el || guardCount++ > 12000 || out.length > 30000) return;
              if (skip[el.tagName] || (el !== document.body && hidden(el))) return;
              if (el.tagName === "IMG") {
                const w0 = el.naturalWidth || el.width || 0, h0 = el.naturalHeight || el.height || 0;
                const alt = (el.getAttribute("alt") || "").trim();
                if (w0 >= 80 && h0 >= 80) {
                  imgNotes.push(alt ? "Ảnh: " + alt : "Ảnh minh họa " + w0 + "x" + h0 + " (không có mô tả)");
                  out += "[ảnh" + (alt ? ": " + alt : "") + "] ";
                }
                return;
              }
              if (el.children && el.children.length) {
                for (const c of el.children) walk(c);
                if (blockish[el.tagName]) out += "\n";
                return;
              }
              const t = el.textContent;
              if (t && t.trim()) out += t + " ";
            };
            walk(rootSel);
            txt2 = out.replace(/[ \t]+/g, " ").replace(/\n ?/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
            if (imgNotes.length) txt2 += "\n\n[Danh sách ảnh trên trang]\n" + imgNotes.slice(0, 20).join("\n");
            const max = typeof msg.maxChars === "number" ? Math.min(16000, Math.max(4000, msg.maxChars * 4)) : 12000;
            if (txt2.length > max) txt2 = txt2.slice(0, max);
          } catch (e) { txt2 = ""; }
          sendResponse({ success: true, text: txt2 });
          break;
        }
        case "GET_PAGE_IMAGES": {
          let done = false;
          const respond = (arr) => { if (done) return; done = true; sendResponse({ success: true, images: arr }); };
          try {
            const rootSel = document.querySelector("article") || document.querySelector("main") || document.body;
            const cands = Array.prototype.slice.call(rootSel.querySelectorAll("img")).filter(im => {
              const w0 = im.naturalWidth || im.width || 0, h0 = im.naturalHeight || im.height || 0;
              return w0 >= 120 && h0 >= 120 && im.complete && im.naturalWidth > 0;
            }).slice(0, (typeof msg.max === "number" ? msg.max : 3) + 2);
            if (!cands.length) { respond([]); break; }
            const conv = (im) => new Promise((res) => {
              try {
                const nw = im.naturalWidth || 256, nh = im.naturalHeight || 256;
                const scale = Math.min(1, 1024 / Math.max(nw, nh));
                const cv = document.createElement("canvas");
                cv.width = Math.max(1, Math.round(nw * scale)); cv.height = Math.max(1, Math.round(nh * scale));
                cv.getContext("2d").drawImage(im, 0, 0, cv.width, cv.height);
                const u = cv.toDataURL("image/jpeg", 0.72);
                res(u.length < 700000 ? u : "");
              } catch (e) { res(""); }
            });
            Promise.all(cands.map(conv)).then((list) => {
              respond(list.filter(Boolean).slice(0, (typeof msg.max === "number" ? msg.max : 3)));
            }).catch(() => respond([]));
            setTimeout(() => respond([]), 6000);
          } catch (e) { respond([]); }
          break;
        }
        case "GET_SELECTION_TEXT": {
          let sel = "";
          try { sel = (window.getSelection ? window.getSelection().toString() : "") || ""; } catch (e) {}
          sendResponse({ success: true, text: sel });
          break;
        }
        case "GET_PAGE_SOURCE": {
          let rawText = "";
          let rawScripts = "";
          try {
            rawText = (document.body && document.body.textContent || "").replace(/\s+/g, " ").trim().slice(0, 20000);
          } catch (e) { rawText = ""; }
          try {
            const parts = [];
            const scs = document.querySelectorAll("script:not([src])");
            for (let k = 0; k < scs.length && parts.length < 12; k++) {
              const c = scs[k].textContent || "";
              if (c.length > 20 && c.length < 30000) parts.push(c.replace(/\s+/g, " ").trim());
            }
            rawScripts = parts.join("\n").slice(0, 12000);
          } catch (e) { rawScripts = ""; }
          sendResponse({ success: true, text: rawText, scripts: rawScripts });
          break;
        }
        case "GET_YT_TRANSCRIPT": {
          let ytDone = false;
          const ytRespond = (o) => { if (!ytDone) { ytDone = true; sendResponse(o); } }
          try {
            const host = (location.hostname || "").toLowerCase();
            const isYtHost = host === "youtube.com" || host.endsWith(".youtube.com") || host === "youtu.be";
            const isVideoUrl = /\/watch|\/shorts\/|\/embed\/|youtu\.be\//.test(location.href);
            if (!isYtHost || !isVideoUrl) { ytRespond({ success: true, ok: false, reason: "not_youtube" }); break; }
            let obj = null;
            const scs = document.querySelectorAll("script:not([src])");
            for (let k = 0; k < scs.length; k++) {
              const c = scs[k].textContent || "";
              const idx = c.indexOf("ytInitialPlayerResponse");
              if (idx === -1) continue;
              const b = c.indexOf("{", idx);
              if (b === -1 || b - idx > 200) continue;
              const j = sfYtExtractBalancedJson(c, b);
              if (!j) continue;
              try { obj = JSON.parse(j); } catch (e) { obj = null; }
              if (obj) break;
            }
            const title = (obj && obj.videoDetails && obj.videoDetails.title) || document.title || "";
            const tracks = obj && obj.captions && obj.captions.playerCaptionsTracklistRenderer && obj.captions.playerCaptionsTracklistRenderer.captionTracks;
            if (!Array.isArray(tracks) || !tracks.length) { ytRespond({ success: true, ok: false, reason: "no_captions", title: title }); break; }
            const tr = sfYtPickTrack(tracks, (msg && msg.lang) || "vi");
            const safeUrl = tr && tr.baseUrl ? sfYtSafeBaseUrl(String(tr.baseUrl) + (String(tr.baseUrl).indexOf("?") !== -1 ? "&" : "?") + "fmt=json3") : "";
            if (!safeUrl) { ytRespond({ success: true, ok: false, reason: "no_captions", title: title }); break; }
            fetch(safeUrl, { signal: AbortSignal.timeout(8000) }).then(r => r.ok ? r.text() : "").then(txt => {
              let json = null;
              try { json = JSON.parse(txt); } catch (e) { json = null; }
              const transcript = json ? sfYtCaptionToLines(json) : "";
              ytRespond({ success: true, ok: transcript.length > 0, lang: tr.languageCode || "", kind: tr.kind || "manual", title: title, transcript: transcript });
            }).catch(() => ytRespond({ success: true, ok: false, reason: "fetch_failed", title: title }));
            setTimeout(() => ytRespond({ success: true, ok: false, reason: "timeout", title: title }), 9500);
          } catch (e) { ytRespond({ success: true, ok: false, reason: "error" }); }
          break;
        }
        case "PING":
          sendResponse({ pong: true });
          break;
      }
      return true;
    });
  }
