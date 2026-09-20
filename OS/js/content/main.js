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
  // --- YouTube meta helpers (page's ytInitialPlayerResponse) ---
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
  function sfYtPad2(n) { n = Number(n) || 0; return (n < 10 ? "0" : "") + n; }
  function sfYtParseUiDate(s) {
    s = String(s || "");
    let m = s.match(/(\d{1,2})\s*thg\.?\s*(\d{1,2})[,\s]+(\d{4})/);
    if (m) return m[3] + "-" + sfYtPad2(m[2]) + "-" + sfYtPad2(m[1]);
    m = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (m) return m[3] + "-" + sfYtPad2(m[2]) + "-" + sfYtPad2(m[1]);
    const MON = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
    m = s.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2}),?\s+(\d{4})/i);
    if (m) return m[3] + "-" + sfYtPad2(MON[m[1].toLowerCase()]) + "-" + sfYtPad2(m[2]);
    return "";
  }
  function sfYtIsVideoPage() {
    const host = (location.hostname || "").toLowerCase();
    return (host === "youtube.com" || host.endsWith(".youtube.com") || host === "youtu.be") && /\/watch|\/shorts\/|\/embed\/|youtu\.be\//.test(location.href);
  }
  function sfYtCurrentVideoId() {
    try { const m = location.href.match(/(?:v=|youtu\.be\/|shorts\/|embed\/)([\w-]{8,12})/); return m ? m[1] : ""; } catch (e) { return ""; }
  }
  let _sfYtPRCache = { vid: "", at: 0, obj: null, missAt: 0 };
  function sfYtReadPlayerResponse() {
    const curVid = sfYtCurrentVideoId();
    if (!curVid) return null;
    const now = Date.now();
    if (_sfYtPRCache.vid === curVid) {
      if (_sfYtPRCache.obj && (now - _sfYtPRCache.at) < 90000) return _sfYtPRCache.obj;
      if (!_sfYtPRCache.obj && (now - _sfYtPRCache.missAt) < 10000) return null;
    }
    let found = null;
    try {
      const scs = document.querySelectorAll("script:not([src])");
      // newest-first: SPA navigation appends a fresh playerResponse script; the FIRST one is stale video data
      for (let k = scs.length - 1; k >= 0; k--) {
        const c = scs[k].textContent || "";
        const idx = c.indexOf("ytInitialPlayerResponse");
        if (idx === -1) continue;
        const b = c.indexOf("{", idx);
        if (b === -1 || b - idx > 200) continue;
        const j = sfYtExtractBalancedJson(c, b);
        if (!j) continue;
        let o = null; try { o = JSON.parse(j); } catch (e) { o = null; }
        if (o && o.videoDetails && String(o.videoDetails.videoId || "") === curVid) { found = o; break; }
      }
    } catch (e) { found = null; }
    if (found) _sfYtPRCache = { vid: curVid, at: now, obj: found, missAt: _sfYtPRCache.missAt || 0 };
    else if (_sfYtPRCache.vid === curVid) _sfYtPRCache.missAt = now;
    else _sfYtPRCache = { vid: curVid, at: 0, obj: null, missAt: now };
    return found;
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
            // 1. Khai thác dữ liệu cấu trúc ẩn JSON-LD (Schema.org Article / NewsArticle / BlogPosting)
            let jsonLdBody = "";
            try {
              const ldScripts = document.querySelectorAll('script[type="application/ld+json"]');
              for (let i = 0; i < ldScripts.length; i++) {
                const raw = (ldScripts[i].textContent || "").trim();
                if (!raw || !raw.includes("articleBody")) continue;
                let parsed = null;
                try { parsed = JSON.parse(raw); } catch (e) { parsed = null; }
                if (!parsed) continue;
                const items = Array.isArray(parsed) ? parsed : (Array.isArray(parsed["@graph"]) ? parsed["@graph"] : [parsed]);
                for (const it of items) {
                  if (it && typeof it.articleBody === "string" && it.articleBody.trim().length > 150) {
                    jsonLdBody = it.articleBody.trim();
                    break;
                  }
                }
                if (jsonLdBody) break;
              }
            } catch (e) {}

            // 2. Thuật toán chấm điểm Heuristic chọn vùng nội dung chính (Readability Container Scoring)
            const pickBestContainer = (doc) => {
              if (!doc || !doc.body) return null;
              const selectors = [
                "article", "main", "[role=main]", "[itemprop='articleBody']",
                ".post-content", ".entry-content", ".article-body", ".article__content",
                ".story-body", ".content-body", ".detail-content", ".fck_detail", ".content_detail",
                "#article-body", "#main-content", "#content"
              ];
              const candidates = [];
              const seen = new Set();
              selectors.forEach(sel => {
                try {
                  doc.querySelectorAll(sel).forEach(el => {
                    if (el && !seen.has(el) && el !== doc.body) {
                      seen.add(el);
                      candidates.push(el);
                    }
                  });
                } catch(e) {}
              });
              if (!candidates.length) return doc.querySelector("article") || doc.querySelector("main") || doc.querySelector("[role=main]") || doc.body;

              let bestEl = null;
              let bestScore = -1;
              const NOISE_RE = /(comment|sidebar|related|popular|widget|advert|banner|promo|social|share|cookie|popup|modal|dialog|footer|nav|header)/i;
              const GOOD_RE = /(article|entry|post|story|body|content|text|paratext)/i;

              for (const el of candidates) {
                let score = 0;
                const tag = el.tagName;
                if (tag === "ARTICLE" || tag === "MAIN") score += 25;
                else if (tag === "DIV" || tag === "SECTION") score += 5;

                const idClass = (el.id || "") + " " + (el.className || "");
                if (GOOD_RE.test(idClass)) score += 25;
                if (NOISE_RE.test(idClass)) score -= 35;

                const paras = el.querySelectorAll("p");
                score += Math.min(50, paras.length * 6);

                const textLen = (el.textContent || "").trim().length;
                if (textLen < 80) score -= 40;
                else score += Math.min(60, Math.floor(textLen / 100));

                const linkTextLen = Array.prototype.slice.call(el.querySelectorAll("a")).reduce((acc, a) => acc + (a.textContent || "").length, 0);
                const linkDensity = textLen > 0 ? (linkTextLen / textLen) : 0;
                if (linkDensity > 0.6) score -= 60;

                if (score > bestScore) {
                  bestScore = score;
                  bestEl = el;
                }
              }
              return (bestScore > 20 && bestEl) ? bestEl : (doc.querySelector("article") || doc.querySelector("main") || doc.querySelector("[role=main]") || doc.body);
            };

            const rootSel = pickBestContainer(document);
            const skip = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, NAV: 1, HEADER: 1, FOOTER: 1, ASIDE: 1, FORM: 1, BUTTON: 1, SELECT: 1 };
            const blockish = { P: 1, DIV: 1, LI: 1, UL: 1, OL: 1, TABLE: 1, TR: 1, SECTION: 1, H1: 1, H2: 1, H3: 1, H4: 1, H5: 1, H6: 1, BLOCKQUOTE: 1, PRE: 1, FIGCAPTION: 1 };
            const hidden = (el) => {
              try { const cs = window.getComputedStyle(el); return cs.display === "none" || cs.visibility === "hidden" || cs.position === "fixed"; } catch (e) { return false; }
            };
            const NOISE_CLASS_RE = /(comment|sidebar|related|popular|widget|advert|banner|promo|social|share|cookie|popup|modal|dialog|sponsor|recommend)/i;
            const GOOD_CLASS_RE = /(article|entry|post|story|body|content|text|paratext)/i;

            let out = "";
            const imgNotes = [];
            let guardCount = 0;
            const walk = (el) => {
              if (!el || guardCount++ > 30000 || out.length > 60000) return;
              if (skip[el.tagName] || (el !== document.body && hidden(el))) return;
              if (el !== rootSel && el !== document.body) {
                const idCls = (el.id || "") + " " + (el.className || "");
                if (NOISE_CLASS_RE.test(idCls) && !GOOD_CLASS_RE.test(idCls)) return;
                // Lọc bỏ các khối danh sách liên kết/menu có mật độ link cao (Link Density > 0.65)
                if ((el.tagName === "DIV" || el.tagName === "UL" || el.tagName === "SECTION" || el.tagName === "ASIDE") && el.children && el.children.length > 1) {
                  const tStr = (el.textContent || "").trim();
                  if (tStr.length > 120) {
                    const lStr = Array.prototype.slice.call(el.querySelectorAll("a")).reduce((acc, a) => acc + (a.textContent || "").length, 0);
                    if ((lStr / tStr.length) > 0.65) return;
                  }
                }
              }
              if (el.tagName === "IFRAME") {
                try {
                  const doc = el.contentDocument || (el.contentWindow && el.contentWindow.document);
                  if (doc && doc.body) walk(doc.body);
                } catch (e) {}
                return;
              }
              if (el.tagName === "IMG") {
                const w0 = el.naturalWidth || el.width || 0, h0 = el.naturalHeight || el.height || 0;
                const alt = (el.getAttribute("alt") || "").trim();
                if (w0 >= 80 && h0 >= 80) {
                  imgNotes.push(alt ? "Ảnh: " + alt : "Ảnh minh họa " + w0 + "x" + h0 + " (không có mô tả)");
                  out += "[ảnh" + (alt ? ": " + alt : "") + "] ";
                }
                return;
              }
              // Traverse Open Shadow DOM (Web Components, Lit, Reddit, YouTube)
              if (el.shadowRoot && el.shadowRoot.children && el.shadowRoot.children.length) {
                for (const sc of el.shadowRoot.children) walk(sc);
              }
              if (el.children && el.children.length) {
                const isHeading = /^H[1-6]$/.test(el.tagName);
                if (isHeading) out += "\n\n" + "#".repeat(Number(el.tagName.charAt(1))) + " ";
                for (const c of el.children) walk(c);
                if (blockish[el.tagName]) out += "\n";
                return;
              }
              const t = el.textContent;
              if (t && t.trim()) out += t + " ";
            };
            let ytPrefix = "";
            if (sfYtIsVideoPage()) {
              try {
                const gm0 = (sel, attr) => { try { const el = document.querySelector(sel); return el ? String(el.getAttribute(attr || "content") || "") : ""; } catch (e) { return ""; } };
                const txt0 = (sel) => { try { const el = document.querySelector(sel); return el ? String(el.textContent || "").replace(/\s+/g, " ").trim() : ""; } catch (e) { return ""; } };
                const curVid = sfYtCurrentVideoId();
                const cleanTitle = (t0) => String(t0 || "").replace(/ - YouTube$/i, "");
                const yTitle = cleanTitle(txt0("#title h1") || txt0("ytd-watch-metadata #title yt-formatted-string") || txt0("h1.ytd-video-primary-info-renderer") || txt0("ytd-watch-metadata h1") || document.title);
                const yAuthor = txt0("ytd-video-owner-renderer #channel-name a") || txt0("#owner #channel-name a") || txt0("ytd-channel-name a") || gm0('link[itemprop="name"]');
                const ySubs = txt0("#owner-sub-count") || txt0("#subscriber-count");
                const yInfo = txt0("ytd-watch-info-text") || txt0("#info-container") || txt0("#view-count");
                const yDesc = txt0("#description-inline-expander") || txt0("#description-inner") || txt0("#description") || gm0('meta[name="description"]');
                const isLiveNow = !!(
                  document.querySelector(".ytp-live-badge:not([hidden])") ||
                  document.querySelector(".badge-style-type-live-now") ||
                  /trực tiếp|live/i.test(yInfo)
                );
                ytPrefix = "[YouTube " + (isLiveNow ? "Livestream Trực Tiếp" : "Video") + "]\n";
                if (curVid) ytPrefix += "Video ID: " + curVid + "\n";
                if (yTitle) ytPrefix += "Tiêu đề: " + yTitle + "\n";
                if (yAuthor) ytPrefix += "Kênh: " + yAuthor + (ySubs ? " (" + ySubs + ")" : "") + "\n";
                if (yInfo) ytPrefix += "Thông tin / Lượt xem: " + yInfo + "\n";
                if (yDesc) ytPrefix += "Mô tả:\n" + yDesc.slice(0, 3000) + "\n";
                ytPrefix += "\n---\n\n";
              } catch (e) {}
            }
            walk(rootSel);
            let combined = out;
            // Nếu có dữ liệu JSON-LD articleBody siêu sạch, ưu tiên kết hợp hoặc bổ sung
            if (jsonLdBody && jsonLdBody.length > 250) {
              if (out.length < 300 || !out.includes(jsonLdBody.slice(0, 80))) {
                combined = "[Nội dung chính bài viết (JSON-LD)]\n" + jsonLdBody + "\n\n" + (out ? "[Chi tiết trang]\n" + out : "");
              }
            }
            txt2 = (ytPrefix + combined).replace(/[ \t]+/g, " ").replace(/\n ?/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
            // Robust fallback to document.body.innerText if custom walk returned sparse text
            if (txt2.length < 150 && document.body && typeof document.body.innerText === "string" && document.body.innerText.trim().length > txt2.length) {
              txt2 = (ytPrefix + document.body.innerText).replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
            }
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
case "GET_YT_META": {
          try {
            if (!sfYtIsVideoPage()) { sendResponse({ success: true, ok: false, reason: "not_youtube" }); break; }
            const gm = (sel, attr) => { try { const el = document.querySelector(sel); return el ? String(el.getAttribute(attr || "content") || "") : ""; } catch (e) { return ""; } };
            const txt = (sel) => { try { const el = document.querySelector(sel); return el ? String(el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 80) : ""; } catch (e) { return ""; } };
            const curVid = sfYtCurrentVideoId();
            const microHref = gm('[itemprop="url"]', "href") || gm('[itemprop="url"]', "content") || "";
            const microVid = (microHref.match(/v=([\w-]{8,12})/) || [])[1] || "";
            const microFresh = !!curVid && microVid === curVid;
            const cleanTitle = (t0) => String(t0 || "").replace(/ - YouTube$/i, "");
            const domTitle = txt("#title h1") || txt("ytd-watch-metadata #title yt-formatted-string") || txt("h1.ytd-video-primary-info-renderer") || txt("ytd-watch-metadata h1") || cleanTitle(document.title);
            const fTitle = (microFresh ? (gm('meta[itemprop="name"]') || "") : "") || domTitle || gm('meta[property="og:title"]');
            const fAuthor = (microFresh ? (gm("[itemprop='author'] [itemprop='name']") || gm("[itemprop='author'] meta[itemprop='name']") || gm("[itemprop='author'] link[itemprop='name']") || gm('link[itemprop="name"]')) : "")
              || txt("ytd-video-owner-renderer #channel-name a") || txt("#owner #channel-name a") || txt("ytd-channel-name a") || txt("ytd-watch-metadata #owner a");
            const fDate = microFresh ? (gm('meta[itemprop="datePublished"]') || gm('meta[itemprop="uploadDate"]') || gm('meta[itemprop="startDate"]')) : "";
            const isLive = !!(
              document.querySelector(".ytp-live-badge:not([hidden])") ||
              document.querySelector(".badge-style-type-live-now") ||
              (function(){ try { var v=document.querySelector("video"); return v && !isFinite(v.duration); }catch(e){ return false; } })() ||
              (function(){ try { var pr=window.ytInitialPlayerResponse; return pr && pr.videoDetails && (pr.videoDetails.isLive || pr.videoDetails.isLiveContent); }catch(e){ return false; } })()
            );
            if (fAuthor && fDate) {
              sendResponse({ success: true, ok: true, fast: true, isLive: isLive, title: fTitle, author: fAuthor, publishDate: fDate, publisher: "YouTube", platform: "YouTube", videoId: curVid, lengthSeconds: (function(){try{var v=document.querySelector("video");var d=v&&v.duration;if(d&&isFinite(d))return String(Math.round(d));var pr=window.ytInitialPlayerResponse;var ls=pr&&pr.videoDetails&&pr.videoDetails.lengthSeconds;return ls?String(ls):"";}catch(e){return "";}})() });
              break;
            }
            const obj = sfYtReadPlayerResponse();
            const isLive2 = isLive || !!(
              (obj && obj.videoDetails && (obj.videoDetails.isLive || obj.videoDetails.isLiveContent)) ||
              (obj && obj.microformat && obj.microformat.playerMicroformatRenderer && (obj.microformat.playerMicroformatRenderer.isLiveBroadcast || obj.microformat.playerMicroformatRenderer.liveBroadcastDetails))
            );
            if (!obj) {
              let uiDate = fDate;
              if (!uiDate) {
                try {
                  const box = document.querySelector("ytd-watch-metadata") || document.querySelector("ytd-video-secondary-info-renderer") || document.querySelector("#meta");
                  if (box) uiDate = sfYtParseUiDate(String(box.textContent || "").slice(0, 3000));
                } catch (e) { uiDate = ""; }
              }
              sendResponse({ success: true, ok: !!(fTitle && fAuthor && uiDate), domOnly: true, isLive: isLive2, title: fTitle, author: fAuthor, publishDate: uiDate, publisher: "YouTube", platform: "YouTube", videoId: curVid, lengthSeconds: (function(){try{var v=document.querySelector("video");var d=v&&v.duration;if(d&&isFinite(d))return String(Math.round(d));var pr=window.ytInitialPlayerResponse;var ls=pr&&pr.videoDetails&&pr.videoDetails.lengthSeconds;return ls?String(ls):"";}catch(e){return "";}})() });
              break;
            }
            const mf = obj && obj.microformat && obj.microformat.playerMicroformatRenderer;
            const title = (obj && obj.videoDetails && obj.videoDetails.title) || fTitle || "";
            const author = (obj && obj.videoDetails && obj.videoDetails.author) || fAuthor || "";
            const publishDate = (mf && mf.publishDate) || (mf && mf.uploadDate) || fDate || "";
            sendResponse({
              success: true, ok: !!(title || author || publishDate),
              isLive: isLive2,
              title: title, author: author, publishDate: publishDate,
              publisher: "YouTube", platform: "YouTube",
              videoId: (obj && obj.videoDetails && obj.videoDetails.videoId) || curVid,
              lengthSeconds: (obj && obj.videoDetails && obj.videoDetails.lengthSeconds) || ""
            });
          } catch (e) { sendResponse({ success: true, ok: false }); }
          break;
        }

        case "YT_SEEK": {
          let seekOk = false;
          try {
            const v = document.querySelector("video");
            if (v) { v.currentTime = Math.max(0, Number(msg.seconds) || 0); seekOk = true; }
          } catch (e) { seekOk = false; }
          sendResponse({ success: seekOk });
          break;
        }
        case "PING":
          sendResponse({ pong: true });
          break;
      }
      return true;
    });
  }

  /* ── Smart Reading Companion (Floating In-line Explainer on selection) ── */
  let _sfCompanionEl = null;
  let _sfCompanionEnabled = true;

  try {
    const stor = (typeof browser !== "undefined" && browser.storage) ? browser.storage : (typeof chrome !== "undefined" ? chrome.storage : null);
    if (stor && stor.local) {
      stor.local.get("reading_companion_enabled", r => {
        if (r && typeof r.reading_companion_enabled === "boolean") _sfCompanionEnabled = r.reading_companion_enabled;
      });
      if (stor.onChanged) {
        stor.onChanged.addListener((ch, area) => {
          if (area === "local" && ch.reading_companion_enabled) {
            _sfCompanionEnabled = ch.reading_companion_enabled.newValue !== false;
            if (!_sfCompanionEnabled && _sfCompanionEl) _sfHideCompanion();
          }
        });
      }
    }
  } catch(e) {}

  function _sfHideCompanion() {
    if (_sfCompanionEl && _sfCompanionEl.parentNode) {
      _sfCompanionEl.parentNode.removeChild(_sfCompanionEl);
    }
    _sfCompanionEl = null;
  }

  function _sfCreateCompanion(selText, rect) {
    if (!_sfCompanionEnabled || !selText || selText.length < 3) return;
    _sfHideCompanion();

    const el = document.createElement("div");
    el.id = "sf-reading-companion";

    const logo = document.createElement("span");
    logo.className = "sf-companion-logo";
    logo.textContent = "✦ AI";
    el.appendChild(logo);

    const actions = [
      { id: "explain", icon: "🧠", label: (typeof tContent === "function" ? tContent("companion_explain") : "Giải thích") },
      { id: "translate", icon: "🌐", label: (typeof tContent === "function" ? tContent("companion_translate") : "Dịch") },
      { id: "summary", icon: "⚡", label: (typeof tContent === "function" ? tContent("companion_summary") : "Tóm tắt") },
      { id: "ask", icon: "💬", label: (typeof tContent === "function" ? tContent("companion_ask") : "Hỏi sâu") }
    ];

    actions.forEach(act => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "sf-companion-btn";
      btn.textContent = act.icon + " " + act.label;
      btn.addEventListener("mousedown", e => { e.preventDefault(); e.stopPropagation(); });
      btn.addEventListener("click", e => {
        e.preventDefault(); e.stopPropagation();
        notifySidebar({
          action: "COMPANION_QUERY",
          mode: act.id,
          text: selText.slice(0, 3000),
          title: document.title || "",
          url: location.href || ""
        });
        _sfHideCompanion();
      });
      el.appendChild(btn);
    });

    const scrollX = window.scrollX || window.pageXOffset || document.documentElement.scrollLeft || 0;
    const scrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;

    let top = rect.top + scrollY - 38;
    if (top < scrollY + 10) top = rect.bottom + scrollY + 8;
    let left = rect.left + scrollX + (rect.width / 2) - 140;
    if (left < 10) left = 10;
    if (left + 300 > window.innerWidth) left = Math.max(10, window.innerWidth - 310);

    el.style.top = Math.round(top) + "px";
    el.style.left = Math.round(left) + "px";

    document.documentElement.appendChild(el);
    _sfCompanionEl = el;
  }

  document.addEventListener("mouseup", e => {
    if (!_sfCompanionEnabled) return;
    if (typeof isInspectMode !== "undefined" && isInspectMode) return;
    if (typeof isElementCaptureMode !== "undefined" && isElementCaptureMode) return;
    if (_sfCompanionEl && _sfCompanionEl.contains(e.target)) return;

    setTimeout(() => {
      try {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed || !sel.rangeCount) {
          _sfHideCompanion();
          return;
        }
        const str = sel.toString().trim();
        if (str.length < 3) {
          _sfHideCompanion();
          return;
        }
        const active = document.activeElement;
        if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.isContentEditable)) {
          _sfHideCompanion();
          return;
        }
        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        if (!rect || (rect.width === 0 && rect.height === 0)) {
          _sfHideCompanion();
          return;
        }
        _sfCreateCompanion(str, rect);
      } catch (err) {
        _sfHideCompanion();
      }
    }, 25);
  });

  document.addEventListener("mousedown", e => {
    if (_sfCompanionEl && !_sfCompanionEl.contains(e.target)) {
      _sfHideCompanion();
    }
  });

