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
            if (item.element && item.element.classList.contains("super-redact-blur")) {
              item.element.style.setProperty("--super-blur-val", `${currentBlurPx}px`);
            }
          });

          if (msg.applyToLast && redactedElementsList.length > 0) {
            const lastItem = redactedElementsList[redactedElementsList.length - 1];
            lastItem.style = currentRedactStyle;
            lastItem.blurPx = currentBlurPx;
            updateElementStyle(lastItem.element, currentRedactStyle, currentBlurPx);
            flashRedactedElement(lastItem.element);
          }

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
              updateElementStyle(item.element, currentRedactStyle, currentBlurPx);
            }
          });
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

        case "PING":
          sendResponse({ pong: true });
          break;
      }
      return true;
    });
  }
