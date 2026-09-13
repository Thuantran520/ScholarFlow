var isInspectMode = typeof window._sf_isInspectMode !== "undefined" ? window._sf_isInspectMode : false;
var isElementCaptureMode = typeof window._sf_isElementCaptureMode !== "undefined" ? window._sf_isElementCaptureMode : false;
var isRedactionsPaused = typeof window._sf_isRedactionsPaused !== "undefined" ? window._sf_isRedactionsPaused : false;
var currentRedactStyle = typeof window._sf_currentRedactStyle !== "undefined" ? window._sf_currentRedactStyle : "blur";
var currentBlurPx = typeof window._sf_currentBlurPx !== "undefined" ? window._sf_currentBlurPx : 12;
var hoveredElement = null;
var redactedElementsList = window._sf_redactedElementsList || [];
window._sf_redactedElementsList = redactedElementsList;

var sfRegionSuppressClick = false;
var sfRegionDrag = null;
var sfRegionPreviewEl = null;
var sfRedactReapplyTimer = null;
var sfRedactReapplyAttempts = 0;

var notifySidebarShim = function(msg) {
  if (typeof window !== "undefined" && typeof window.notifySidebar === "function") {
    return window.notifySidebar(msg);
  }
};

var tContentShim = function(key, ...args) {
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
    notifySidebarShim({ type: "REDACTION_PAUSE_CHANGED", isPaused: isRedactionsPaused });
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
      if (alt) return `${tContentShim("img_prefix")}: "${alt.slice(0, 24)}${alt.length > 24 ? '...' : ''}"`;
      const src = el.getAttribute("src") || "";
      if (src) return `${tContentShim("img_prefix")}: ${src.split('/').pop().split('?')[0].slice(0, 18)}`;
      return tContentShim("img_generic");
    }
    if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
      const val = el.value || el.placeholder || "";
      if (val) return `${tContentShim("input_prefix")}: "${val.slice(0, 22)}${val.length > 22 ? '...' : ''}"`;
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
      kind: item.kind || "element",
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
      id === "super-inpage-toast" ||
      id === "super-region-preview"
    ) {
      return true;
    }
    if (el.classList && (
      el.classList.contains("super-redact-flash") ||
      el.classList.contains("super-remove-flash") ||
      el.classList.contains("super-capture-flash") ||
      el.classList.contains("super-snip-handle") ||
      el.classList.contains("super-redact-region")
    )) {
      return true;
    }
    if (el.closest && el.closest("#super-inspect-highlighter-box, #super-element-tag-badge, #super-snip-box, #super-snip-toolbar, #super-inpage-countdown-hud, #super-inpage-toast, #super-region-preview, .super-redact-flash, .super-remove-flash, .super-capture-flash, .super-redact-region")) {
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
      badge.appendChild(document.createTextNode(tContentShim("badge_secured")));
      const b = document.createElement("b");
      b.textContent = tContentShim("badge_remove_hint");
      badge.appendChild(b);
    } else {
      badge.classList.remove("is-remove-badge", "is-capture-badge", "is-locked-badge");
      let styleLabel = "";
      if (currentRedactStyle === "blur") {
        styleLabel = tContentShim("style_blur", currentBlurPx);
      } else if (currentRedactStyle === "blackout") {
        styleLabel = tContentShim("style_blackout");
      } else if (currentRedactStyle === "pixelate") {
        styleLabel = tContentShim("style_pixelate");
      } else if (currentRedactStyle === "hide") {
        styleLabel = tContentShim("style_hide");
      } else {
        styleLabel = tContentShim("style_blur", currentBlurPx);
      }

      const strong = document.createElement("strong");
      strong.textContent = `<${tag}${id}>`;
      badge.appendChild(strong);
      badge.appendChild(document.createTextNode(tContentShim("badge_click_to")));
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
      if (item.kind === "region" && el.parentNode) {
        el.remove();
      }
    }
    redactedElementsList.splice(idx, 1);
  }

  // 3. Click handler: Apply redaction or un-redact
  function onClick(e) {
    if (!isInspectMode) return;

    // A region drag just ended -> suppress this click so no element gets masked
    if (sfRegionSuppressClick) {
      sfRegionSuppressClick = false;
      return;
    }

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
      showInPageToast(tContentShim("toast_already_redacted"));
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

  function maskElementInternal(el, style, blurPx) {
    if (isRedactionsPaused) {
      toggleRedactionsPause(false);
    }
    if (!el || el.hasAttribute("data-super-redact-id")) return null;

    const redactId = "sr-" + Date.now() + "-" + Math.random().toString(36).substr(2, 4);
    el.setAttribute("data-super-redact-id", redactId);
    el.classList.add("super-is-redacted");

    const item = {
      id: redactId,
      kind: "element",
      element: el,
      tagName: el.tagName.toLowerCase(),
      style: style,
      blurPx: blurPx,
      snippet: getElementSnippet(el),
      prevClasses: [...el.classList].filter(c => !c.startsWith("super-")),
      prevStyle: el.getAttribute("style") || "",
      selector: redactSelectorFor(el)
    };
    redactedElementsList.push(item);
    updateElementStyle(el, style, blurPx);
    return item;
  }

  function applyRedaction(el, style, blurPx) {
    const item = maskElementInternal(el, style, blurPx);
    if (!item) return;

    flashRedactedElement(el);
    redactPersist();
    notifySidebarShim({
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
        if (orphaned.hasAttribute("data-super-redact-region") && orphaned.parentNode) {
          orphaned.remove();
        }
      }
      redactPersist();
      return redactedElementsList.length;
    }

    const item = redactedElementsList[idx];
    const el = item.element;
    const isRegionItem = item.kind === "region";
    let regionRect = null;
    if (el && isRegionItem) {
      try { regionRect = el.getBoundingClientRect(); } catch (e) {}
    }
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
      if (isRegionItem && el.parentNode) {
        el.remove();
      }
      if (isRegionItem) {
        flashRemovedRect(regionRect);
      } else {
        flashRemovedElement(el);
      }
    }
    redactedElementsList.splice(idx, 1);
    redactPersist();
    notifySidebarShim({
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
        if (item.kind === "region" && el.parentNode) {
          el.remove();
        }
      }
    }
    redactedElementsList.length = 0;
    redactPersist();
    toggleRedactionsPause(false);
    clearHoverState();
    notifySidebarShim({
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
      flashRemovedRect(rect);
    } catch (e) {}
  }

  function flashRemovedRect(rect) {
    try {
      if (!rect || typeof rect.width !== "number" || rect.width <= 0) return;
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
      notifySidebarShim({ type: "INSPECT_MODE_CHANGED", active: false });
    }
  }

  // Global Alt + Q shortcut to swap between 2 linked tabs
  window.addEventListener("keydown", (e) => {
    if (e.altKey && (e.key === "q" || e.key === "Q")) {
      e.preventDefault();
      notifySidebarShim({ type: "SWAP_DUAL_TABS_REQUEST" });
    }
  }, true);

  // In-Page Countdown HUD for Video Recording
  function showPageCountdown(seconds) {
    hidePageCountdown();
    const hud = document.createElement("div");
    hud.id = "super-inpage-countdown-hud";

    const title = document.createElement("div");
    title.className = "hud-title";
    title.textContent = tContentShim("snip_video_prep_title");

    const num = document.createElement("div");
    num.className = "hud-number";
    num.id = "super-hud-count-num";
    num.textContent = seconds ? seconds.toString() : "3";

    const sub = document.createElement("div");
    sub.className = "hud-sub";
    sub.textContent = tContentShim("snip_video_prep_sub");

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

  // ════════════════════════════════════════════════════════════════════════
  // REDACTION PERSISTENCE + REGION (precise area/text) MASKS
  // Masks are saved per-origin in chrome.storage.local (`sf_redact_masks`)
  // and re-applied automatically on reload so screenshots stay protected.
  // ════════════════════════════════════════════════════════════════════════
  function redactStorageApi() {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) return chrome.storage.local;
    if (typeof browser !== "undefined" && browser.storage && browser.storage.local) return browser.storage.local;
    return null;
  }

  function redactStoreGet(key) {
    const s = redactStorageApi();
    if (!s || typeof s.get !== "function") return Promise.resolve({});
    return new Promise((resolve) => {
      let done = false;
      const fin = (res) => {
        if (!done) {
          done = true;
          resolve(res && typeof res === "object" ? res : {});
        }
      };
      try {
        const ret = s.get(key, fin);
        if (ret && typeof ret.then === "function") {
          ret.then(fin, () => fin({}));
        }
      } catch (e) {
        fin({});
      }
    });
  }

  function redactStoreSet(obj) {
    const s = redactStorageApi();
    if (!s || typeof s.set !== "function") return;
    try {
      const ret = s.set(obj, () => {});
      if (ret && typeof ret.catch === "function") ret.catch(() => {});
    } catch (e) {}
  }

  function redactOrigin() {
    try {
      return location.origin || (location.protocol + "//" + location.host) || "";
    } catch (e) {
      return "";
    }
  }

  function redactPersist() {
    const originKey = redactOrigin();
    if (!originKey) return;
    pruneDisconnectedRedactions();
    const snapshot = redactedElementsList.map(item => {
      const base = { id: item.id, kind: item.kind || "element", style: item.style, blurPx: item.blurPx, tagName: item.tagName, snippet: item.snippet };
      if (item.kind === "region") {
        base.region = {
          anchorSelector: item.anchorSelector || "",
          dx: item.dx, dy: item.dy, w: item.w, h: item.h,
          absLeft: item.absLeft, absTop: item.absTop, textMatch: item.textMatch || ""
        };
      } else {
        base.selector = item.selector || "";
      }
      return base;
    });
    redactStoreGet("sf_redact_masks").then((res) => {
      const all = (res && res.sf_redact_masks && typeof res.sf_redact_masks === "object") ? res.sf_redact_masks : {};
      all[originKey] = snapshot;
      redactStoreSet({ sf_redact_masks: all });
    });
  }

  function redactEscapeCss(str) {
    return String(str || "").replace(/[^a-zA-Z0-9_\-]/g, function(ch) {
      return "\\" + ch;
    });
  }

  function redactSelectorFor(el) {
    try {
      if (!el || el.nodeType !== 1) return "";
      if (el.id) {
        const s = "#" + redactEscapeCss(el.id);
        if (document.querySelectorAll(s).length === 1) return s;
      }
      const parts = [];
      let node = el;
      while (node && node.nodeType === 1 && node !== document.documentElement && node !== document.body) {
        let part = node.tagName.toLowerCase();
        if (node.id) {
          parts.unshift("#" + redactEscapeCss(node.id));
          break;
        }
        const cls = Array.prototype.filter.call(node.classList || [], c => !c.startsWith("super-")).slice(0, 2).map(c => "." + redactEscapeCss(c)).join("");
        if (cls) part += cls;
        const parent = node.parentElement;
        if (parent) {
          let cmp = node.tagName;
          if (cls) cmp += "." + Array.prototype.filter.call(node.classList || [], c => !c.startsWith("super-")).slice(0, 2).join(".");
          const sameTag = Array.prototype.filter.call(parent.children, ch => {
            if (ch.tagName !== node.tagName) return false;
            if (!cls) return true;
            return cls.split(".").slice(1).every(c => ch.classList.contains(c));
          });
          if (sameTag.length > 1) part += `:nth-of-type(${sameTag.indexOf(node) + 1})`;
        }
        parts.unshift(part);
        node = parent;
      }
      return parts.join(" > ");
    } catch (e) {
      return "";
    }
  }

  function redactFindBySelector(sel) {
    try {
      if (!sel) return null;
      return document.querySelector(sel);
    } catch (e) {
      return null;
    }
  }

  function redactNormText(t) {
    return String(t === undefined || t === null ? "" : t).replace(/\s+/g, " ").trim();
  }

  function redactShortText(el) {
    const text = redactNormText(el && (el.innerText || el.textContent));
    return text ? text.slice(0, 80) : "";
  }

  function redactFindByText(exact) {
    if (!exact) return null;
    const target = redactNormText(exact);
    if (!target) return null;
    try {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
      let n;
      while ((n = walker.nextNode())) {
        if (redactNormText(n.nodeValue) === target) {
          const p = n.parentElement;
          if (p && p.isConnected) return p;
        }
      }
    } catch (e) {}
    return null;
  }

  function applyRegionStyle(el, style, blurPx) {
    if (!el || !el.style) return;
    const px = blurPx || 12;
    style = style || "blur";
    el.style.removeProperty("background-color");
    el.style.removeProperty("backdrop-filter");
    el.style.removeProperty("-webkit-backdrop-filter");
    if (style === "blur") {
      el.style.setProperty("backdrop-filter", `blur(${px}px)`);
      el.style.setProperty("-webkit-backdrop-filter", `blur(${px}px)`);
    } else if (style === "blackout") {
      el.style.setProperty("background-color", "#000000");
    } else if (style === "pixelate") {
      el.style.setProperty("backdrop-filter", "contrast(1.8) blur(6px)");
      el.style.setProperty("-webkit-backdrop-filter", "contrast(1.8) blur(6px)");
    } else {
      el.style.setProperty("background-color", "rgba(148,163,184,0.15)");
    }
  }

  function regionAlreadyAt(left, top, w, h) {
    const els = document.querySelectorAll(".super-redact-region");
    for (const el of els) {
      if (
        Math.round(parseFloat(el.style.left) || 0) === Math.round(left) &&
        Math.round(parseFloat(el.style.top) || 0) === Math.round(top) &&
        Math.round(parseFloat(el.style.width) || 0) === Math.round(w) &&
        Math.round(parseFloat(el.style.height) || 0) === Math.round(h)
      ) {
        return true;
      }
    }
    return false;
  }

  function createRegionMask(docX, docY, w, h, style, blurPx) {
    const id = "sr-" + Date.now() + "-" + Math.random().toString(36).substr(2, 4) + "r";
    const anchorEl = regionAnchorElement(docX + w / 2 - window.scrollX, docY + h / 2 - window.scrollY);
    const anchorRect = anchorEl ? anchorEl.getBoundingClientRect() : null;
    const anchorTop = anchorRect ? anchorRect.top + window.scrollY : docY;
    const anchorLeft = anchorRect ? anchorRect.left + window.scrollX : docX;

    const overlay = document.createElement("div");
    overlay.setAttribute("data-super-redact-region", "1");
    overlay.setAttribute("data-super-redact-id", id);
    overlay.className = "super-redact-region";
    overlay.style.position = "absolute";
    overlay.style.left = `${docX}px`;
    overlay.style.top = `${docY}px`;
    overlay.style.width = `${w}px`;
    overlay.style.height = `${h}px`;
    overlay.style.zIndex = "2147483000";
    overlay.style.boxSizing = "border-box";
    overlay.style.pointerEvents = "none";
    applyRegionStyle(overlay, style, blurPx);
    document.documentElement.appendChild(overlay);

    const anchorElAtCenter = anchorEl;
    const item = {
      id: id,
      kind: "region",
      element: overlay,
      tagName: "region",
      style: style,
      blurPx: blurPx,
      snippet: `Vùng ${Math.round(w)}×${Math.round(h)}px`,
      anchorSelector: anchorElAtCenter ? redactSelectorFor(anchorElAtCenter) : "",
      dx: ((docX - anchorLeft) || 0),
      dy: ((docY - anchorTop) || 0),
      w: w,
      h: h,
      absLeft: docX,
      absTop: docY,
      textMatch: anchorElAtCenter ? redactShortText(anchorElAtCenter) : ""
    };
    redactedElementsList.push(item);
    redactPersist();
    notifySidebarShim({
      type: "REDACTION_UPDATED",
      count: redactedElementsList.length,
      list: getRedactedItemsForSidebar()
    });
    return item;
  }

  function regionAnchorElement(clientX, clientY) {
    try {
      if (!document.elementsFromPoint) return null;
      const els = document.elementsFromPoint(clientX, clientY);
      for (const el of els) {
        if (!el || el.nodeType !== 1 || isExtensionUiElement(el)) continue;
        if (el.hasAttribute("data-super-redact-id")) continue;
        return el;
      }
    } catch (e) {}
    return null;
  }

  function reapplyRegion(saved) {
    const r = saved.region || {};
    const savedStyle = saved.style || "blur";
    const savedBlur = saved.blurPx || 12;
    let anchorEl = r.anchorSelector ? redactFindBySelector(r.anchorSelector) : null;
    if (!anchorEl && r.textMatch) anchorEl = redactFindByText(r.textMatch);
    let left = (typeof r.absLeft === "number") ? r.absLeft : (r.dx || 0);
    let top = (typeof r.absTop === "number") ? r.absTop : (r.dy || 0);
    if (anchorEl && anchorEl.isConnected) {
      const arect = anchorEl.getBoundingClientRect();
      left = arect.left + window.scrollX + (r.dx || 0);
      top = arect.top + window.scrollY + (r.dy || 0);
    }
    const w = r.w || 80;
    const h = r.h || 40;
    if (regionAlreadyAt(left, top, w, h)) return 0;

    const id = "sr-" + Date.now() + "-" + Math.random().toString(36).substr(2, 5) + "r";
    const overlay = document.createElement("div");
    overlay.setAttribute("data-super-redact-region", "1");
    overlay.setAttribute("data-super-redact-id", id);
    overlay.className = "super-redact-region";
    overlay.style.position = "absolute";
    overlay.style.left = `${left}px`;
    overlay.style.top = `${top}px`;
    overlay.style.width = `${w}px`;
    overlay.style.height = `${h}px`;
    overlay.style.zIndex = "2147483000";
    overlay.style.boxSizing = "border-box";
    overlay.style.pointerEvents = "none";
    applyRegionStyle(overlay, savedStyle, savedBlur);
    document.documentElement.appendChild(overlay);

    redactedElementsList.push({
      id: id,
      kind: "region",
      element: overlay,
      tagName: "region",
      style: savedStyle,
      blurPx: savedBlur,
      snippet: saved.snippet || `Vùng ${Math.round(w)}×${Math.round(h)}px`,
      anchorSelector: r.anchorSelector,
      dx: r.dx,
      dy: r.dy,
      w: w,
      h: h,
      absLeft: left,
      absTop: top,
      textMatch: r.textMatch
    });
    return 1;
  }

  var sfSavedCount = 0;

  function loadAndReapplyRedactions() {
    redactStoreGet("sf_redact_masks").then((res) => {
      const all = (res && res.sf_redact_masks && typeof res.sf_redact_masks === "object") ? res.sf_redact_masks : {};
      const list = (Array.isArray(all[redactOrigin()]) ? all[redactOrigin()] : []) || [];
      sfSavedCount = list.length;
      if (list.length === 0) return;
      for (const saved of list) {
        try {
          if (saved && saved.kind === "region") {
            reapplyRegion(saved);
          } else if (saved && saved.selector) {
            const el = redactFindBySelector(saved.selector);
            if (el && el.isConnected && !el.hasAttribute("data-super-redact-id")) {
              const id = "sr-" + Date.now() + "-" + Math.random().toString(36).substr(2, 6) + "e";
              const savedStyle = saved.style || "blur";
              const savedBlur = saved.blurPx || 12;
              el.setAttribute("data-super-redact-id", id);
              el.classList.add("super-is-redacted");
              updateElementStyle(el, savedStyle, savedBlur);
              redactedElementsList.push({
                id: id,
                kind: "element",
                element: el,
                tagName: el.tagName.toLowerCase(),
                style: savedStyle,
                blurPx: savedBlur,
                snippet: saved.snippet || getElementSnippet(el),
                prevClasses: Array.prototype.filter.call(el.classList, c => !c.startsWith("super-")),
                prevStyle: el.getAttribute("style") || "",
                selector: saved.selector
              });
            }
          }
        } catch (e) {}
      }
    });
  }

  function redactScheduleReapply() {
    sfRedactReapplyAttempts = 0;
    if (sfRedactReapplyTimer) clearTimeout(sfRedactReapplyTimer);
    redactReapplyTick();
  }

  function redactReapplyTick() {
    loadAndReapplyRedactions();
    sfRedactReapplyAttempts++;
    if (sfSavedCount <= 0) return;
    if (redactedElementsList.length >= sfSavedCount) return;
    if (sfRedactReapplyAttempts >= 30) return;
    sfRedactReapplyTimer = setTimeout(redactReapplyTick, 1200);
  }

  // ── Precise region drag-mask preview ─────────────────────────────────────
  function ensureRegionPreview() {
    if (!sfRegionPreviewEl) {
      sfRegionPreviewEl = document.getElementById("super-region-preview");
      if (!sfRegionPreviewEl) {
        sfRegionPreviewEl = document.createElement("div");
        sfRegionPreviewEl.id = "super-region-preview";
        document.documentElement.appendChild(sfRegionPreviewEl);
      }
    }
    return sfRegionPreviewEl;
  }

  function updateRegionPreview(docX, docY, w, h) {
    const box = ensureRegionPreview();
    box.style.left = `${docX}px`;
    box.style.top = `${docY}px`;
    box.style.width = `${w}px`;
    box.style.height = `${h}px`;
    box.style.display = "block";
  }

  function hideRegionPreview() {
    if (sfRegionPreviewEl) sfRegionPreviewEl.style.display = "none";
  }

  function cancelRegionDrag() {
    sfRegionDrag = null;
    hideRegionPreview();
  }

  function onRegionPointerDown(e) {
    if (!isInspectMode || isElementCaptureMode) return;
    if (e.button !== 0) return;
    if (isExtensionUiElement(e.target)) return;
    sfRegionDrag = { sx: e.clientX + window.scrollX, sy: e.clientY + window.scrollY, cx: e.clientX, cy: e.clientY };
    if (e.preventDefault) e.preventDefault();
  }

  function onRegionPointerMove(e) {
    if (!isInspectMode || !sfRegionDrag) return;
    sfRegionDrag.cx = e.clientX;
    sfRegionDrag.cy = e.clientY;
    const x0 = Math.round(Math.min(sfRegionDrag.sx, sfRegionDrag.cx + window.scrollX));
    const y0 = Math.round(Math.min(sfRegionDrag.sy, sfRegionDrag.cy + window.scrollY));
    const w = Math.round(Math.abs(sfRegionDrag.cx + window.scrollX - sfRegionDrag.sx));
    const h = Math.round(Math.abs(sfRegionDrag.cy + window.scrollY - sfRegionDrag.sy));
    if (w > 4 || h > 4) {
      updateRegionPreview(x0, y0, w, h);
    }
  }

  function onRegionPointerUp(e) {
    if (!isInspectMode || !sfRegionDrag) return;
    const sx = sfRegionDrag.sx;
    const sy = sfRegionDrag.sy;
    const ex = e.clientX + window.scrollX;
    const ey = e.clientY + window.scrollY;
    const w = Math.round(Math.abs(ex - sx));
    const h = Math.round(Math.abs(ey - sy));
    cancelRegionDrag();
    if (w < 5 || h < 5) return;
    const x0 = Math.round(Math.min(sx, ex));
    const y0 = Math.round(Math.min(sy, ey));
    if (w < 5 || h < 5) return;
    sfRegionSuppressClick = true;
    createRegionMask(x0, y0, w, h, currentRedactStyle, currentBlurPx);
    showInPageToast("📍 Đã che chính xác vùng này!");
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
    document.addEventListener("pointerdown", onRegionPointerDown, true);
    document.addEventListener("pointermove", onRegionPointerMove, true);
    document.addEventListener("pointerup", onRegionPointerUp, true);
    window.addEventListener("scroll", onScrollOrResize, { passive: true, capture: true });
    window.addEventListener("resize", onScrollOrResize, { passive: true });
    window.addEventListener("blur", onWindowBlur);
  }

  function stopInspectMode() {
    isInspectMode = false;
    document.documentElement.classList.remove("super-inspecting-active");
    clearHoverState();
    cancelRegionDrag();
    document.removeEventListener("mousedown", onInspectMouseDown, true);
    document.removeEventListener("pointerdown", onInspectMouseDown, true);
    document.removeEventListener("mousemove", onMouseMove, true);
    document.removeEventListener("click", onClick, true);
    document.removeEventListener("keydown", onKeyDown, true);
    document.removeEventListener("mouseleave", onMouseLeaveDoc, true);
    document.removeEventListener("pointerdown", onRegionPointerDown, true);
    document.removeEventListener("pointermove", onRegionPointerMove, true);
    document.removeEventListener("pointerup", onRegionPointerUp, true);
    window.removeEventListener("scroll", onScrollOrResize, { passive: true, capture: true });
    window.removeEventListener("resize", onScrollOrResize, { passive: true });
    window.removeEventListener("blur", onWindowBlur);
  }

  // ════════════════════════════════════════════════════════════════════════
  // CAPTURE MASKS (Group A): expose redaction geometry so screenshots can be
  // re-masked deterministically on the exported canvas (region overlays use
  // backdrop-filter which some compositors drop from captureVisibleTab).
  // ════════════════════════════════════════════════════════════════════════
  function getRedactedMasksForCapture() {
    pruneDisconnectedRedactions();
    const masks = [];
    for (const item of redactedElementsList) {
      const el = item.element;
      if (!el || !el.isConnected) continue;
      if (item.kind !== "region" && item.style === "hide") continue;

      let left, top, width, height, viewportLeft, viewportTop;

      if (item.kind === "region" && typeof item.absLeft === "number") {
        left = item.absLeft;
        top = item.absTop;
        width = item.w;
        height = item.h;
        viewportLeft = Math.round(left - window.scrollX);
        viewportTop = Math.round(top - window.scrollY);
      } else {
        let rect = null;
        try { rect = el.getBoundingClientRect(); } catch (e) {}
        if (!rect || rect.width < 1 || rect.height < 1) continue;
        left = Math.round(rect.left + window.scrollX);
        top = Math.round(rect.top + window.scrollY);
        width = Math.round(rect.width);
        height = Math.round(rect.height);
        viewportLeft = Math.round(rect.left);
        viewportTop = Math.round(rect.top);
      }

      if (width < 1 || height < 1) continue;
      masks.push({
        left: left,
        top: top,
        width: width,
        height: height,
        viewportLeft: viewportLeft,
        viewportTop: viewportTop,
        style: item.style || "blur",
        blurPx: item.blurPx || 12
      });
    }
    return masks;
  }

  // ════════════════════════════════════════════════════════════════════════
  // AUTO-DETECT SENSITIVE DATA + KEYWORD MASKING (Group B)
  // ════════════════════════════════════════════════════════════════════════
  function redactSensitivePatterns() {
    return [
      { key: "email", label: "Email", re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g },
      { key: "phone", label: "SĐT", re: /(?:\+84|0)[0-9]{9,10}/g },
      { key: "cccd", label: "CCCD", re: /(?:^|[^0-9])([0-9]{12})(?:[^0-9]|$)/g },
      { key: "card", label: "Thẻ", re: /(?:^|[^0-9])([0-9][0-9 -]{14,18}[0-9])(?:[^0-9]|$)/g },
      { key: "ip", label: "IP", re: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g }
    ];
  }

  function redactSensitiveElementFor(node) {
    let el = node.parentElement;
    if (!el || el === document.body || el === document.documentElement) return null;
    // Tighten to the nearest block/inline container that isn't a giant wrapper.
    while (el.parentElement && el.parentElement !== document.body && el.parentElement !== document.documentElement) {
      const rect = el.getBoundingClientRect();
      if (rect.width < window.innerWidth * 0.9 && rect.height < 400) break;
      el = el.parentElement;
    }
    return el;
  }

  function detectSensitiveElements(style, blurPx) {
    style = style || currentRedactStyle;
    blurPx = blurPx || currentBlurPx;
    const patterns = redactSensitivePatterns();
    const toMask = [];
    const seen = new Set();
    try {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
      let n;
      while ((n = walker.nextNode())) {
        const text = n.nodeValue || "";
        if (!text.trim()) continue;
        let matched = false;
        for (const p of patterns) {
          p.re.lastIndex = 0;
          if (p.re.test(text)) { matched = true; break; }
        }
        if (!matched) continue;
        const el = redactSensitiveElementFor(n);
        if (!el || el.hasAttribute("data-super-redact-id") || seen.has(el)) continue;
        seen.add(el);
        toMask.push(el);
      }
    } catch (e) {}

    let count = 0;
    for (const el of toMask) {
      const item = maskElementInternal(el, style, blurPx);
      if (item) count++;
    }
    if (count > 0) {
      redactPersist();
      notifySidebarShim({
        type: "REDACTION_UPDATED",
        count: redactedElementsList.length,
        list: getRedactedItemsForSidebar()
      });
    }
    return count;
  }

  function maskByKeyword(keyword, style, blurPx) {
    keyword = String(keyword || "").trim();
    if (!keyword) return 0;
    style = style || currentRedactStyle;
    blurPx = blurPx || currentBlurPx;
    const lower = keyword.toLowerCase();
    const toMask = [];
    const seen = new Set();
    try {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
      let n;
      while ((n = walker.nextNode())) {
        const text = (n.nodeValue || "").toLowerCase();
        if (!text.includes(lower)) continue;
        const el = redactSensitiveElementFor(n);
        if (!el || el.hasAttribute("data-super-redact-id") || seen.has(el)) continue;
        seen.add(el);
        toMask.push(el);
      }
    } catch (e) {}

    let count = 0;
    for (const el of toMask) {
      const item = maskElementInternal(el, style, blurPx);
      if (item) count++;
    }
    if (count > 0) {
      redactPersist();
      notifySidebarShim({
        type: "REDACTION_UPDATED",
        count: redactedElementsList.length,
        list: getRedactedItemsForSidebar()
      });
    }
    return count;
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
  window.redactPersist = redactPersist;
  window.redactSelectorFor = redactSelectorFor;
  window.createRegionMask = createRegionMask;
  window.loadAndReapplyRedactions = loadAndReapplyRedactions;
  window.applyRegionStyle = applyRegionStyle;
  window.getRedactedMasksForCapture = getRedactedMasksForCapture;
  window.detectSensitiveElements = detectSensitiveElements;
  window.maskByKeyword = maskByKeyword;
  window.redactSensitivePatterns = redactSensitivePatterns;

  // Auto re-apply any persisted redactions for this origin after page load.
  if (document.readyState === "complete" || document.readyState === "interactive") {
    setTimeout(redactScheduleReapply, 200);
  } else {
    window.addEventListener("DOMContentLoaded", () => {
      setTimeout(redactScheduleReapply, 200);
    });
  }
