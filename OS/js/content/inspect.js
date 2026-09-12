var isInspectMode = typeof window._sf_isInspectMode !== "undefined" ? window._sf_isInspectMode : false;
var isElementCaptureMode = typeof window._sf_isElementCaptureMode !== "undefined" ? window._sf_isElementCaptureMode : false;
var isRedactionsPaused = typeof window._sf_isRedactionsPaused !== "undefined" ? window._sf_isRedactionsPaused : false;
var currentRedactStyle = typeof window._sf_currentRedactStyle !== "undefined" ? window._sf_currentRedactStyle : "blur";
var currentBlurPx = typeof window._sf_currentBlurPx !== "undefined" ? window._sf_currentBlurPx : 12;
var hoveredElement = null;
var redactedElementsList = window._sf_redactedElementsList || [];
window._sf_redactedElementsList = redactedElementsList;

var notifySidebar = function(msg) {
  if (typeof window !== "undefined" && typeof window.notifySidebar === "function") {
    return window.notifySidebar(msg);
  }
};

var tContent = function(key, ...args) {
  if (typeof window !== "undefined" && typeof window.tContent === "function") {
    return window.tContent(key, ...args);
  }
  return "";
};

  function toggleRedactionsPause(paused) {
    if (typeof paused === "boolean") {
      isRedactionsPaused = paused;
    } else {
      isRedactionsPaused = !isRedactionsPaused;
    }
    if (isRedactionsPaused) {
      document.documentElement.classList.add("super-redactions-paused");
    } else {
      document.documentElement.classList.remove("super-redactions-paused");
    }
    notifySidebar({ type: "REDACTION_PAUSE_CHANGED", isPaused: isRedactionsPaused });
    return isRedactionsPaused;
  }

  // 1. Tooltip Badge & Floating Highlighter Overlay
  let tagBadge = null;
  let highlighterBox = null;

  function ensureTagBadge() {
    if (!tagBadge) {
      tagBadge = document.getElementById("super-element-tag-badge");
      if (!tagBadge) {
        tagBadge = document.createElement("div");
        tagBadge.id = "super-element-tag-badge";
        document.documentElement.appendChild(tagBadge);
      }
    }
    return tagBadge;
  }

  function ensureHighlighterBox() {
    if (!highlighterBox) {
      highlighterBox = document.getElementById("super-inspect-highlighter-box");
      if (!highlighterBox) {
        highlighterBox = document.createElement("div");
        highlighterBox.id = "super-inspect-highlighter-box";
        document.documentElement.appendChild(highlighterBox);
      }
    }
    return highlighterBox;
  }

  function updateHighlighterPosition(el, isAlreadyRedacted, isCapture) {
    if (!el) {
      hideHighlighter();
      return;
    }
    const box = ensureHighlighterBox();
    const rect = el.getBoundingClientRect();

    box.style.left = `${Math.round(rect.left)}px`;
    box.style.top = `${Math.round(rect.top)}px`;
    box.style.width = `${Math.round(rect.width)}px`;
    box.style.height = `${Math.round(rect.height)}px`;
    if (isCapture) {
      box.className = "mode-capture";
    } else {
      box.className = isAlreadyRedacted ? "mode-locked" : "mode-redact";
    }
    box.style.display = "block";
  }

  function hideHighlighter() {
    if (highlighterBox) {
      highlighterBox.style.display = "none";
    }
  }

  function getElementSnippet(el) {
    if (!el) return "";
    if (el.tagName === "IMG") {
      const alt = el.getAttribute("alt") || "";
      if (alt) return `${tContent("img_prefix")}: "${alt.slice(0, 24)}${alt.length > 24 ? '...' : ''}"`;
      const src = el.getAttribute("src") || "";
      if (src) return `${tContent("img_prefix")}: ${src.split('/').pop().split('?')[0].slice(0, 18)}`;
      return tContent("img_generic");
    }
    if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
      const val = el.value || el.placeholder || "";
      if (val) return `${tContent("input_prefix")}: "${val.slice(0, 22)}${val.length > 22 ? '...' : ''}"`;
      return `<${el.tagName.toLowerCase()}>`;
    }
    const text = (el.innerText || el.textContent || "").trim().replace(/\s+/g, " ");
    if (text) {
      return `"${text.slice(0, 28)}${text.length > 28 ? '...' : ''}"`;
    }
    return `<${el.tagName.toLowerCase()}>`;
  }

  function pruneDisconnectedRedactions() {
    for (let i = redactedElementsList.length - 1; i >= 0; i--) {
      const item = redactedElementsList[i];
      if (!item || !item.element || !item.element.isConnected) {
        redactedElementsList.splice(i, 1);
      }
    }
  }

  function getRedactedItemsForSidebar() {
    pruneDisconnectedRedactions();
    return redactedElementsList.map(item => ({
      id: item.id,
      tagName: item.tagName,
      style: item.style,
      blurPx: item.blurPx,
      snippet: item.snippet
    }));
  }

  function resolveCaptureTarget(el) {
    if (!el || el === document.body || el === document.documentElement) return null;
    if (isExtensionUiElement(el)) {
      return null;
    }

    // 1. If user hovers/clicks inside a table (cells, rows, header, footer), select the whole table!
    if (["TD", "TH", "TR", "TBODY", "THEAD", "TFOOT", "CAPTION"].includes(el.tagName)) {
      const table = el.closest("table");
      if (table) {
        const parent = table.parentElement;
        if (parent && parent !== document.body && parent !== document.documentElement) {
          const cs = window.getComputedStyle(parent);
          if ((cs.overflowX === "auto" || cs.overflowX === "scroll") && parent.scrollWidth > parent.clientWidth + 4) {
            return parent;
          }
        }
        return table;
      }
    }

    // 2. If code block
    if (el.tagName === "CODE" && el.closest("pre")) {
      return el.closest("pre");
    }

    // 3. If clicking small inline/text element, expand to containing card/article/figure/section if available
    if (["P", "SPAN", "A", "EM", "STRONG", "I", "B", "SMALL", "H1", "H2", "H3", "H4", "H5", "H6", "LI"].includes(el.tagName)) {
      const container = el.closest("article, figure, section, [class*='card'], [class*='Card'], [class*='post'], [class*='item'], blockquote");
      if (container && container !== document.body && container !== document.documentElement) {
        const cr = container.getBoundingClientRect();
        if (cr.width > 60 && cr.height > 60 && cr.width <= window.innerWidth && cr.height < window.innerHeight * 4) {
          return container;
        }
      }
    }

    return el;
  }

  function isExtensionUiElement(el) {
    if (!el || el === document.body || el === document.documentElement) return false;
    const id = typeof el.id === "string" ? el.id : "";
    if (
      id === "super-inspect-highlighter-box" ||
      id === "super-element-tag-badge" ||
      id === "super-snip-overlay" ||
      id === "super-snip-box" ||
      id === "super-snip-guide" ||
      id === "super-snip-size-badge" ||
      id === "super-snip-toolbar" ||
      id === "super-inpage-countdown-hud" ||
      id === "super-inpage-toast"
    ) {
      return true;
    }
    if (el.classList && (
      el.classList.contains("super-redact-flash") ||
      el.classList.contains("super-remove-flash") ||
      el.classList.contains("super-capture-flash") ||
      el.classList.contains("super-snip-handle")
    )) {
      return true;
    }
    if (el.closest && el.closest("#super-inspect-highlighter-box, #super-element-tag-badge, #super-snip-box, #super-snip-toolbar, #super-inpage-countdown-hud, #super-inpage-toast, .super-redact-flash, .super-remove-flash, .super-capture-flash")) {
      return true;
    }
    return false;
  }

  function clearHoverState() {
    if (hoveredElement) {
      hoveredElement = null;
    }
    hideHighlighter();
    if (tagBadge) {
      tagBadge.style.display = "none";
      tagBadge.classList.remove("is-remove-badge", "is-capture-badge", "is-locked-badge");
    }
  }

  function renderTagBadgeContent(el, isAlreadyRedacted, clientX, clientY) {
    if (!el) return;
    const badge = ensureTagBadge();
    const tag = el.tagName.toLowerCase();
    const id = el.id ? `#${el.id}` : "";

    badge.textContent = "";

    if (isAlreadyRedacted) {
      badge.classList.remove("is-capture-badge", "is-remove-badge");
      badge.classList.add("is-locked-badge");
      const strong = document.createElement("strong");
      strong.textContent = `<${tag}${id}>`;
      badge.appendChild(strong);
      badge.appendChild(document.createTextNode(tContent("badge_secured")));
      const b = document.createElement("b");
      b.textContent = tContent("badge_remove_hint");
      badge.appendChild(b);
    } else {
      badge.classList.remove("is-remove-badge", "is-capture-badge", "is-locked-badge");
      let styleLabel = "";
      if (currentRedactStyle === "blur") {
        styleLabel = tContent("style_blur", currentBlurPx);
      } else if (currentRedactStyle === "blackout") {
        styleLabel = tContent("style_blackout");
      } else if (currentRedactStyle === "pixelate") {
        styleLabel = tContent("style_pixelate");
      } else if (currentRedactStyle === "hide") {
        styleLabel = tContent("style_hide");
      } else {
        styleLabel = tContent("style_blur", currentBlurPx);
      }

      const strong = document.createElement("strong");
      strong.textContent = `<${tag}${id}>`;
      badge.appendChild(strong);
      badge.appendChild(document.createTextNode(tContent("badge_click_to")));
      const b = document.createElement("b");
      b.textContent = styleLabel;
      badge.appendChild(b);
    }

    badge.style.display = "block";
    if (typeof clientX === "number" && typeof clientY === "number") {
      badge.style.left = `${Math.min(clientX + 14, window.innerWidth - 270)}px`;
      badge.style.top = `${Math.min(clientY + 18, window.innerHeight - 45)}px`;
    }
  }

  // 2. Mousemove handler for interactive inspect & redact picking
  function onMouseMove(e) {
    if (!isInspectMode) return;

    // Boundary check: If cursor is within 8px of viewport border (moving to sidebar/scrollbar), clear hover!
    const margin = 8;
    if (
      e.clientX <= margin ||
      e.clientX >= window.innerWidth - margin ||
      e.clientY <= margin ||
      e.clientY >= window.innerHeight - margin
    ) {
      clearHoverState();
      return;
    }

    const target = document.elementFromPoint(e.clientX, e.clientY);
    if (!target || isExtensionUiElement(target) || target === document.body || target === document.documentElement) {
      clearHoverState();
      return;
    }

    const alreadyRedactedEl = target.hasAttribute("data-super-redact-id") ? target : target.closest("[data-super-redact-id]");
    const activeTarget = alreadyRedactedEl || target;
    const isAlreadyRedacted = !!alreadyRedactedEl;

    if (activeTarget === hoveredElement) {
      if (tagBadge && tagBadge.style.display === "block") {
        tagBadge.style.left = `${Math.min(e.clientX + 14, window.innerWidth - 270)}px`;
        tagBadge.style.top = `${Math.min(e.clientY + 18, window.innerHeight - 45)}px`;
      }
      return;
    }

    clearHoverState();
    hoveredElement = activeTarget;

    // Position floating highlighter over target
    updateHighlighterPosition(hoveredElement, isAlreadyRedacted, false);
    renderTagBadgeContent(hoveredElement, isAlreadyRedacted, e.clientX, e.clientY);
  }

  // Mousedown handler to prevent host page link navigation or form action when in inspect mode
  function onInspectMouseDown(e) {
    if (!isInspectMode) return;
    if (isExtensionUiElement(e.target)) return;
    e.stopPropagation();
    const interactive = e.target.closest("a, button, input, select, textarea");
    if (interactive) {
      e.preventDefault();
    }
  }

  function cleanRedactionItemQuietly(id) {
    const idx = redactedElementsList.findIndex(item => item.id === id);
    if (idx === -1) return;
    const item = redactedElementsList[idx];
    const el = item.element;
    if (el) {
      el.classList.remove(
        "super-redact-blur",
        "super-redact-blackout",
        "super-redact-pixelate",
        "super-redact-hide",
        "super-redact-remove",
        "super-is-redacted",
        "super-inspect-hover",
        "super-inspect-hover-remove",
        "super-element-highlight-pulse"
      );
      el.removeAttribute("data-super-redact-id");
      if (item.prevStyle) {
        el.setAttribute("style", item.prevStyle);
      } else {
        el.removeAttribute("style");
      }
    }
    redactedElementsList.splice(idx, 1);
  }

  // 3. Click handler: Apply redaction or un-redact
  function onClick(e) {
    if (!isInspectMode) return;

    if (isExtensionUiElement(e.target)) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    if (typeof e.stopImmediatePropagation === "function") {
      e.stopImmediatePropagation();
    }

    // Determine target element: check e.target, elementFromPoint, then hoveredElement
    let target = e.target;
    if (!target || isExtensionUiElement(target)) {
      target = document.elementFromPoint(e.clientX, e.clientY);
    }
    if (!target || isExtensionUiElement(target)) {
      target = hoveredElement;
    }
    if (!target || target === document.body || target === document.documentElement || isExtensionUiElement(target)) {
      return;
    }

    // Check if clicked target or ANY ancestor is already redacted
    const alreadyRedacted = target.hasAttribute("data-super-redact-id")
      ? target
      : target.closest("[data-super-redact-id]");

    if (alreadyRedacted) {
      // As requested: Do not un-redact or re-redact via click on the page.
      // Already-redacted elements are locked. Un-redaction is handled via the sidebar list.
      showInPageToast(tContent("toast_already_redacted"));
      return;
    }

    // Toggle ON: element is not yet redacted.
    // Clean up any child redactions inside target first to prevent nested list corruption
    const nestedRedacted = target.querySelectorAll("[data-super-redact-id]");
    nestedRedacted.forEach(child => {
      const childId = child.getAttribute("data-super-redact-id");
      if (childId) {
        cleanRedactionItemQuietly(childId);
      }
    });

    applyRedaction(target, currentRedactStyle, currentBlurPx);

    // Keep hoveredElement pointing to target in locked/protected mode
    if (isInspectMode && target.isConnected) {
      hoveredElement = target;
      updateHighlighterPosition(target, true, false);
      renderTagBadgeContent(target, true, e.clientX, e.clientY);
    }
  }

  function applyRedaction(el, style, blurPx) {
    if (isRedactionsPaused) {
      toggleRedactionsPause(false);
    }

    const redactId = "sr-" + Date.now() + "-" + Math.random().toString(36).substr(2, 4);
    el.setAttribute("data-super-redact-id", redactId);
    el.classList.add("super-is-redacted");

    // Save previous state for removal / restore
    const item = {
      id: redactId,
      element: el,
      tagName: el.tagName.toLowerCase(),
      style: style,
      blurPx: blurPx,
      snippet: getElementSnippet(el),
      prevClasses: [...el.classList].filter(c => !c.startsWith("super-")),
      prevStyle: el.getAttribute("style") || ""
    };
    redactedElementsList.push(item);

    // Apply class & style
    updateElementStyle(el, style, blurPx);

    // Green flash confirmation animation
    flashRedactedElement(el);

    // Notify sidebar of updated list & count
    notifySidebar({
      type: "REDACTION_UPDATED",
      count: redactedElementsList.length,
      list: getRedactedItemsForSidebar()
    });
  }

  function removeRedactionById(id) {
    const idx = redactedElementsList.findIndex(item => item.id === id);
    if (idx === -1) {
      const orphaned = document.querySelector(`[data-super-redact-id="${id}"]`);
      if (orphaned) {
        orphaned.classList.remove(
          "super-redact-blur",
          "super-redact-blackout",
          "super-redact-pixelate",
          "super-redact-hide",
          "super-redact-remove",
          "super-is-redacted",
          "super-inspect-hover",
          "super-inspect-hover-remove",
          "super-element-highlight-pulse"
        );
        orphaned.removeAttribute("data-super-redact-id");
      }
      return redactedElementsList.length;
    }

    const item = redactedElementsList[idx];
    const el = item.element;
    if (el) {
      el.classList.remove(
        "super-redact-blur",
        "super-redact-blackout",
        "super-redact-pixelate",
        "super-redact-hide",
        "super-redact-remove",
        "super-is-redacted",
        "super-inspect-hover",
        "super-inspect-hover-remove",
        "super-element-highlight-pulse"
      );
      el.removeAttribute("data-super-redact-id");
      if (item.prevStyle) {
        el.setAttribute("style", item.prevStyle);
      } else {
        el.removeAttribute("style");
      }
      flashRemovedElement(el);
    }
    redactedElementsList.splice(idx, 1);
    notifySidebar({
      type: "REDACTION_UPDATED",
      count: redactedElementsList.length,
      list: getRedactedItemsForSidebar()
    });
    return redactedElementsList.length;
  }

  function undoLastRedaction() {
    pruneDisconnectedRedactions();
    if (redactedElementsList.length === 0) return 0;
    const lastItem = redactedElementsList[redactedElementsList.length - 1];
    return removeRedactionById(lastItem.id);
  }

  function clearAllRedactions() {
    for (const item of [...redactedElementsList]) {
      const el = item.element;
      if (el) {
        el.classList.remove(
          "super-redact-blur",
          "super-redact-blackout",
          "super-redact-pixelate",
          "super-redact-hide",
          "super-redact-remove",
          "super-is-redacted",
          "super-inspect-hover",
          "super-inspect-hover-remove",
          "super-element-highlight-pulse"
        );
        el.removeAttribute("data-super-redact-id");
        if (item.prevStyle) {
          el.setAttribute("style", item.prevStyle);
        } else {
          el.removeAttribute("style");
        }
      }
    }
    redactedElementsList.length = 0;
    toggleRedactionsPause(false);
    clearHoverState();
    notifySidebar({
      type: "REDACTION_UPDATED",
      count: 0,
      list: []
    });
    return 0;
  }

  function highlightRedactedElement(id) {
    unhighlightRedactedElement();
    const item = redactedElementsList.find(x => x.id === id);
    if (item && item.element) {
      item.element.classList.add("super-element-highlight-pulse");
      try {
        item.element.scrollIntoView({ behavior: "smooth", block: "center" });
      } catch (e) {}
    }
  }

  function unhighlightRedactedElement() {
    document.querySelectorAll(".super-element-highlight-pulse").forEach(el => {
      el.classList.remove("super-element-highlight-pulse");
    });
  }

  function updateElementStyle(el, style, blurPx) {
    if (!el) return;
    el.classList.remove(
      "super-redact-blur",
      "super-redact-blackout",
      "super-redact-pixelate",
      "super-redact-hide",
      "super-redact-remove"
    );
    if (style === "blur") {
      el.classList.add("super-redact-blur");
      el.style.setProperty("--super-blur-val", `${blurPx}px`);
    } else if (style === "blackout") {
      el.classList.add("super-redact-blackout");
    } else if (style === "pixelate") {
      el.classList.add("super-redact-pixelate");
    } else if (style === "hide") {
      el.classList.add("super-redact-hide");
    }
  }

  function flashRedactedElement(el) {
    try {
      const rect = el.getBoundingClientRect();
      const flash = document.createElement("div");
      flash.className = "super-redact-flash";
      flash.style.left = `${rect.left + window.scrollX}px`;
      flash.style.top = `${rect.top + window.scrollY}px`;
      flash.style.width = `${rect.width}px`;
      flash.style.height = `${rect.height}px`;
      document.documentElement.appendChild(flash);
      setTimeout(() => flash.remove(), 450);
    } catch (e) {}
  }

  function flashRemovedElement(el) {
    try {
      const rect = el.getBoundingClientRect();
      const flash = document.createElement("div");
      flash.className = "super-remove-flash";
      flash.style.left = `${rect.left + window.scrollX}px`;
      flash.style.top = `${rect.top + window.scrollY}px`;
      flash.style.width = `${rect.width}px`;
      flash.style.height = `${rect.height}px`;
      document.documentElement.appendChild(flash);
      setTimeout(() => flash.remove(), 450);
    } catch (e) {}
  }

  function flashCapturedElement(el) {
    try {
      const rect = el.getBoundingClientRect();
      const flash = document.createElement("div");
      flash.className = "super-capture-flash";
      flash.style.left = `${rect.left + window.scrollX}px`;
      flash.style.top = `${rect.top + window.scrollY}px`;
      flash.style.width = `${rect.width}px`;
      flash.style.height = `${rect.height}px`;
      document.documentElement.appendChild(flash);
      setTimeout(() => flash.remove(), 450);
    } catch (e) {}
  }

  // Keydown to exit inspect with Escape
  function onKeyDown(e) {
    if (isInspectMode && (e.key === "Escape" || e.code === "Escape")) {
      e.preventDefault();
      e.stopPropagation();
      stopInspectMode();
      notifySidebar({ type: "INSPECT_MODE_CHANGED", active: false });
    }
  }

  // Global Alt + Q shortcut to swap between 2 linked tabs
  window.addEventListener("keydown", (e) => {
    if (e.altKey && (e.key === "q" || e.key === "Q")) {
      e.preventDefault();
      notifySidebar({ type: "SWAP_DUAL_TABS_REQUEST" });
    }
  }, true);

  // In-Page Countdown HUD for Video Recording
  function showPageCountdown(seconds) {
    hidePageCountdown();
    const hud = document.createElement("div");
    hud.id = "super-inpage-countdown-hud";

    const title = document.createElement("div");
    title.className = "hud-title";
    title.textContent = tContent("snip_video_prep_title");

    const num = document.createElement("div");
    num.className = "hud-number";
    num.id = "super-hud-count-num";
    num.textContent = seconds ? seconds.toString() : "3";

    const sub = document.createElement("div");
    sub.className = "hud-sub";
    sub.textContent = tContent("snip_video_prep_sub");

    hud.appendChild(title);
    hud.appendChild(num);
    hud.appendChild(sub);
    document.documentElement.appendChild(hud);
  }

  function updatePageCountdown(val) {
    const num = document.getElementById("super-hud-count-num");
    if (num) {
      num.textContent = val.toString();
    }
  }

  function hidePageCountdown() {
    const hud = document.getElementById("super-inpage-countdown-hud");
    if (hud) hud.remove();
  }

  function showInPageToast(text) {
    let t = document.getElementById("super-inpage-toast");
    if (!t) {
      t = document.createElement("div");
      t.id = "super-inpage-toast";
      t.style.cssText = "position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:2147483647;background:rgba(15,23,42,0.95);border:2px solid #38bdf8;color:#ffffff;padding:8px 18px;border-radius:10px;font-size:13px;font-weight:600;font-family:-apple-system,BlinkMacSystemFont,sans-serif;box-shadow:0 6px 24px rgba(0,0,0,0.6);pointer-events:none;transition:opacity 0.25s ease-out;";
      document.documentElement.appendChild(t);
    }
    t.textContent = text;
    t.style.opacity = "1";
    setTimeout(() => {
      if (t) t.style.opacity = "0";
    }, 2400);
  }

  function onMouseLeaveDoc() {
    clearHoverState();
  }

  function onWindowBlur() {
    clearHoverState();
  }

  function onScrollOrResize() {
    if (isInspectMode && hoveredElement) {
      updateHighlighterPosition(hoveredElement, hoveredElement.hasAttribute("data-super-redact-id"), false);
    }
  }

  function startInspectMode() {
    if (isElementCaptureMode) {
      if (typeof stopElementCaptureMode === "function") {
        stopElementCaptureMode();
      } else if (typeof window.stopElementCaptureMode === "function") {
        window.stopElementCaptureMode();
      }
    }
    isInspectMode = true;
    document.documentElement.classList.add("super-inspecting-active");
    document.addEventListener("mousedown", onInspectMouseDown, true);
    document.addEventListener("pointerdown", onInspectMouseDown, true);
    document.addEventListener("mousemove", onMouseMove, true);
    document.addEventListener("click", onClick, true);
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("mouseleave", onMouseLeaveDoc, true);
    window.addEventListener("scroll", onScrollOrResize, { passive: true, capture: true });
    window.addEventListener("resize", onScrollOrResize, { passive: true });
    window.addEventListener("blur", onWindowBlur);
  }

  function stopInspectMode() {
    isInspectMode = false;
    document.documentElement.classList.remove("super-inspecting-active");
    clearHoverState();
    document.removeEventListener("mousedown", onInspectMouseDown, true);
    document.removeEventListener("pointerdown", onInspectMouseDown, true);
    document.removeEventListener("mousemove", onMouseMove, true);
    document.removeEventListener("click", onClick, true);
    document.removeEventListener("keydown", onKeyDown, true);
    document.removeEventListener("mouseleave", onMouseLeaveDoc, true);
    window.removeEventListener("scroll", onScrollOrResize, { passive: true, capture: true });
    window.removeEventListener("resize", onScrollOrResize, { passive: true });
    window.removeEventListener("blur", onWindowBlur);
  }

  window.startInspectMode = startInspectMode;
  window.stopInspectMode = stopInspectMode;
  window.resolveCaptureTarget = resolveCaptureTarget;
  window.clearHoverState = clearHoverState;
  window.getRedactedItemsForSidebar = getRedactedItemsForSidebar;
  window.updateElementStyle = updateElementStyle;
  window.flashRedactedElement = flashRedactedElement;
  window.undoLastRedaction = undoLastRedaction;
  window.removeRedactionById = removeRedactionById;
  window.highlightRedactedElement = highlightRedactedElement;
  window.unhighlightRedactedElement = unhighlightRedactedElement;
  window.clearAllRedactions = clearAllRedactions;
  window.toggleRedactionsPause = toggleRedactionsPause;
