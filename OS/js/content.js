// Web Super Assistant - In-Page Content Script
// Handles: Interactive Element Redactor / Blur / Blackout, Citation Extraction, Sticky Header Stabilizer for Full-Page Screenshots

(function() {
  let currentAppLang = "vi";
  try {
    const storageApi = (typeof browser !== "undefined" && browser.storage) ? browser.storage : chrome.storage;
    if (storageApi && storageApi.local) {
      storageApi.local.get("app_language", (res) => {
        if (res && res.app_language) {
          currentAppLang = res.app_language;
        }
      });
      if (storageApi.onChanged) {
        storageApi.onChanged.addListener((changes, area) => {
          if (area === "local" && changes.app_language) {
            currentAppLang = changes.app_language.newValue || "vi";
          }
        });
      }
    }
  } catch (e) {}

  const CONTENT_I18N = {
    vi: {
      img_prefix: "Ảnh",
      img_generic: "Hình ảnh (img)",
      input_prefix: "Nhập",
      badge_secured: " • ĐÃ BẢO MẬT • ",
      badge_remove_hint: "Gỡ bỏ tại danh sách thanh bên",
      badge_click_to: " • Bấm để ",
      style_blur: (px) => `Làm mờ (${px}px)`,
      style_blackout: () => "Hộp đen",
      style_pixelate: () => "Điểm ảnh",
      style_hide: () => "Ẩn phần tử",
      toast_already_redacted: "🛡️ Đối tượng này đã được che. Dùng danh sách ở thanh bên để gỡ bỏ.",
      snip_video_prep_title: "🎥 CHUẨN BỊ QUAY VIDEO",
      snip_video_prep_sub: "Đã chọn trang web! Sẵn sàng thao tác...",
      snip_selected_tag: "✔ Đã chọn thẻ ",
      snip_selected_box: "✔ Đã chọn vùng!",
      snip_click_tag: "Click thẻ",
      snip_or: " hoặc ",
      snip_drag_mouse: "kéo chuột",
      snip_to_select: " để chọn vùng",
      snip_drag_corners: "Kéo 8 góc để tinh chỉnh",
      snip_enter_capture: "[Enter] Chụp ngay",
      snip_esc_cancel: "[Esc] Hủy",
      snip_click_to_pick: "🎯 Click để chọn thẻ",
      snip_btn_capture: "📸 Chụp ngay",
      snip_btn_cancel: "✕ Hủy"
    },
    en: {
      img_prefix: "Image",
      img_generic: "Image (img)",
      input_prefix: "Input",
      badge_secured: " • SECURED • ",
      badge_remove_hint: "Remove via sidebar list",
      badge_click_to: " • Click to ",
      style_blur: (px) => `Blur (${px}px)`,
      style_blackout: () => "Blackout",
      style_pixelate: () => "Pixelate",
      style_hide: () => "Hide Element",
      toast_already_redacted: "🛡️ This element is already redacted. Remove it via the sidebar list.",
      snip_video_prep_title: "🎥 PREPARING VIDEO RECORDING",
      snip_video_prep_sub: "Web page selected! Ready to operate...",
      snip_selected_tag: "✔ Selected element ",
      snip_selected_box: "✔ Area selected!",
      snip_click_tag: "Click element",
      snip_or: " or ",
      snip_drag_mouse: "drag mouse",
      snip_to_select: " to select area",
      snip_drag_corners: "Drag 8 corners to adjust",
      snip_enter_capture: "[Enter] Capture Now",
      snip_esc_cancel: "[Esc] Cancel",
      snip_click_to_pick: "🎯 Click to select element",
      snip_btn_capture: "📸 Capture Now",
      snip_btn_cancel: "✕ Cancel"
    },
    zh: {
      img_prefix: "图片",
      img_generic: "图片 (img)",
      input_prefix: "输入",
      badge_secured: " • 已脱敏保护 • ",
      badge_remove_hint: "在侧边栏列表中移除",
      badge_click_to: " • 点击以 ",
      style_blur: (px) => `模糊 (${px}px)`,
      style_blackout: () => "黑框遮盖",
      style_pixelate: () => "马赛克",
      style_hide: () => "隐藏元素",
      toast_already_redacted: "🛡️ 该元素已被遮盖。可在侧边栏中移除。",
      snip_video_prep_title: "🎥 准备录屏",
      snip_video_prep_sub: "已选择网页！准备就绪...",
      snip_selected_tag: "✔ 已选择元素 ",
      snip_selected_box: "✔ 区域已选定！",
      snip_click_tag: "点击元素",
      snip_or: " 或 ",
      snip_drag_mouse: "拖动鼠标",
      snip_to_select: " 框选区域",
      snip_drag_corners: "拖动 8 个控制点微调",
      snip_enter_capture: "[Enter] 立即截图",
      snip_esc_cancel: "[Esc] 取消",
      snip_click_to_pick: "🎯 点击选择此元素",
      snip_btn_capture: "📸 立即截图",
      snip_btn_cancel: "✕ 取消"
    },
    ru: {
      img_prefix: "Изображение",
      img_generic: "Изображение (img)",
      input_prefix: "Ввод",
      badge_secured: " • СКРЫТО • ",
      badge_remove_hint: "Удалить в боковой панели",
      badge_click_to: " • Нажмите: ",
      style_blur: (px) => `Размытие (${px}px)`,
      style_blackout: () => "Черный блок",
      style_pixelate: () => "Пикселизация",
      style_hide: () => "Скрыть элемент",
      toast_already_redacted: "🛡️ Этот элемент уже скрыт. Удалите его через боковую панель.",
      snip_video_prep_title: "🎥 ПОДГОТОВКА К ЗАПИСИ",
      snip_video_prep_sub: "Страница выбрана! Готово к работе...",
      snip_selected_tag: "✔ Выбран элемент ",
      snip_selected_box: "✔ Область выбрана!",
      snip_click_tag: "Клик по элементу",
      snip_or: " или ",
      snip_drag_mouse: "выделите курсором",
      snip_to_select: " для выбора области",
      snip_drag_corners: "Потяните за 8 углов для настройки",
      snip_enter_capture: "[Enter] Сделать снимок",
      snip_esc_cancel: "[Esc] Отмена",
      snip_click_to_pick: "🎯 Кликните для выбора элемента",
      snip_btn_capture: "📸 Сделать снимок",
      snip_btn_cancel: "✕ Отмена"
    },
    ja: {
      img_prefix: "画像",
      img_generic: "画像 (img)",
      input_prefix: "入力",
      badge_secured: " • 保護済み • ",
      badge_remove_hint: "サイドバーリストから解除",
      badge_click_to: " • クリックして ",
      style_blur: (px) => `ぼかし (${px}px)`,
      style_blackout: () => "ブラックアウト",
      style_pixelate: () => "モザイク",
      style_hide: () => "要素を非表示",
      toast_already_redacted: "🛡️ この要素は既に保護されています。サイドバーから解除できます。",
      snip_video_prep_title: "🎥 録画の準備完了",
      snip_video_prep_sub: "ページを選択しました！操作可能...",
      snip_selected_tag: "✔ 要素を選択しました ",
      snip_selected_box: "✔ 範囲を選択しました！",
      snip_click_tag: "要素をクリック",
      snip_or: " または ",
      snip_drag_mouse: "マウスをドラッグ",
      snip_to_select: " して範囲選択",
      snip_drag_corners: "8つの角をドラッグして微調整",
      snip_enter_capture: "[Enter] キャプチャ",
      snip_esc_cancel: "[Esc] キャンセル",
      snip_click_to_pick: "🎯 クリックして要素を選択",
      snip_btn_capture: "📸 キャプチャ",
      snip_btn_cancel: "✕ キャンセル"
    }
  };

  function tContent(key, ...args) {
    const dict = CONTENT_I18N[currentAppLang] || CONTENT_I18N.vi;
    const val = dict[key] || CONTENT_I18N.vi[key] || "";
    if (typeof val === "function") return val(...args);
    return val;
  }
  let isInspectMode = false;
  let isElementCaptureMode = false;
  let isRedactionsPaused = false;
  let currentRedactStyle = "blur"; // blur | blackout | pixelate | hide
  let currentBlurPx = 12;
  let hoveredElement = null;
  const redactedElementsList = []; // Each item: { id, element, tagName, style, blurPx, snippet, prevClasses, prevStyle }

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
    if (isElementCaptureMode) stopElementCaptureMode();
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

  // ---------------------------------------------------------------------------
  // Interactive Element Snapper & Snipper (with 8-Point Fine-Tuning Handles)
  // ---------------------------------------------------------------------------
  let snipOverlayEl = null;
  let snipHoverBoxEl = null;
  let snipTagBadgeEl = null;
  let snipBoxEl = null;
  let snipGuidePillEl = null;
  let snipSizeBadgeEl = null;
  let snipToolbarEl = null;

  let snipDragState = null; // null | 'drawing_maybe' | 'box_click_maybe_move' | 'drawing' | 'moving' | 'resizing'
  let snipStartPos = { x: 0, y: 0 };
  let snipInitialRect = { left: 0, top: 0, width: 0, height: 0 };
  let snipActiveRect = { left: 0, top: 0, width: 0, height: 0 };
  let snipActiveHandle = null;
  let snipHoveredTarget = null;
  let snipTargetAtDown = null;

  function cleanupSnipElements() {
    if (snipOverlayEl) { snipOverlayEl.remove(); snipOverlayEl = null; }
    if (snipHoverBoxEl) { snipHoverBoxEl.remove(); snipHoverBoxEl = null; }
    if (snipTagBadgeEl) { snipTagBadgeEl.remove(); snipTagBadgeEl = null; }
    if (snipBoxEl) { snipBoxEl.remove(); snipBoxEl = null; }
    if (snipGuidePillEl) { snipGuidePillEl.remove(); snipGuidePillEl = null; }
    snipSizeBadgeEl = null;
    snipToolbarEl = null;
    snipDragState = null;
    snipHoveredTarget = null;
    snipTargetAtDown = null;
    snipActiveRect = { left: 0, top: 0, width: 0, height: 0 };
  }

  function updateSnipGuidePill(targetTag) {
    if (!snipGuidePillEl) return;
    snipGuidePillEl.textContent = "";

    const s1 = document.createElement("span");
    if (targetTag) {
      s1.appendChild(document.createTextNode(tContent("snip_selected_tag")));
      const b = document.createElement("b");
      b.textContent = `<${targetTag}>`;
      s1.appendChild(b);
      s1.appendChild(document.createTextNode("!"));
    } else if (targetTag === false) {
      s1.textContent = tContent("snip_selected_box");
    } else {
      s1.appendChild(document.createTextNode("🎯 "));
      const b1 = document.createElement("b");
      b1.textContent = tContent("snip_click_tag");
      s1.appendChild(b1);
      s1.appendChild(document.createTextNode(tContent("snip_or")));
      const b2 = document.createElement("b");
      b2.textContent = tContent("snip_drag_mouse");
      s1.appendChild(b2);
      s1.appendChild(document.createTextNode(tContent("snip_to_select")));
    }
    snipGuidePillEl.appendChild(s1);

    const div1 = document.createElement("span");
    div1.style.opacity = "0.6";
    div1.textContent = "|";
    snipGuidePillEl.appendChild(div1);

    const s2 = document.createElement("span");
    s2.textContent = tContent("snip_drag_corners");
    snipGuidePillEl.appendChild(s2);

    const div2 = document.createElement("span");
    div2.style.opacity = "0.6";
    div2.textContent = "|";
    snipGuidePillEl.appendChild(div2);

    const s3 = document.createElement("span");
    s3.style.color = "#38bdf8";
    s3.style.fontWeight = "700";
    s3.textContent = tContent("snip_enter_capture");
    snipGuidePillEl.appendChild(s3);

    const s4 = document.createElement("span");
    s4.style.color = "#f87171";
    s4.textContent = tContent("snip_esc_cancel");
    snipGuidePillEl.appendChild(s4);
  }

  function setSnipBoxRect(rect) {
    snipActiveRect = {
      left: Math.round(rect.left),
      top: Math.round(rect.top),
      width: Math.round(rect.width),
      height: Math.round(rect.height)
    };
    if (snipBoxEl) {
      snipBoxEl.style.left = `${snipActiveRect.left}px`;
      snipBoxEl.style.top = `${snipActiveRect.top}px`;
      snipBoxEl.style.width = `${snipActiveRect.width}px`;
      snipBoxEl.style.height = `${snipActiveRect.height}px`;
    }
    if (snipSizeBadgeEl) {
      snipSizeBadgeEl.textContent = `${snipActiveRect.width} × ${snipActiveRect.height} px`;
    }
    if (snipToolbarEl) {
      if (snipActiveRect.top + snipActiveRect.height + 54 > window.innerHeight) {
        snipToolbarEl.classList.add("toolbar-top");
      } else {
        snipToolbarEl.classList.remove("toolbar-top");
      }
    }
  }

  function confirmSnipCapture() {
    if (!snipActiveRect || snipActiveRect.width < 10 || snipActiveRect.height < 10) {
      return;
    }

    const chosenRect = { ...snipActiveRect };

    // 1. COMPLETELY DESTROY ALL OVERLAYS AND BADGES FROM DOM IMMEDIATELY
    stopElementCaptureMode();
    document.querySelectorAll(
      '#super-snip-overlay, #super-snip-box, #super-snip-hover-box, #super-snip-guide-pill, #super-snip-tag-badge, #super-inpage-toast, #super-inpage-countdown-hud, #super-inspect-highlighter-box, #super-element-tag-badge'
    ).forEach(el => el.remove());

    // Force style recalculation & layout
    void document.documentElement.offsetHeight;

    // 2. Double requestAnimationFrame + safety delay guarantees browser compositor
    // has painted the pristine web page before taking screenshot!
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setTimeout(() => {
          notifySidebar({
            type: "SNIP_RECT_CHOSEN",
            rect: chosenRect,
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight,
            dpr: window.devicePixelRatio || 1
          });
        }, 120);
      });
    });
  }

  function cancelSnipCapture() {
    stopElementCaptureMode();
    notifySidebar({ type: "ELEMENT_CAPTURE_CANCELLED" });
  }

  function onSnipMouseMove(e) {
    if (!isElementCaptureMode) return;

    if (snipDragState === "drawing_maybe") {
      if (Math.hypot(e.clientX - snipStartPos.x, e.clientY - snipStartPos.y) > 8) {
        snipDragState = "drawing";
        if (snipHoverBoxEl) snipHoverBoxEl.style.display = "none";
        if (snipTagBadgeEl) snipTagBadgeEl.style.display = "none";
        if (snipBoxEl) snipBoxEl.style.display = "block";
      }
    }

    if (snipDragState === "box_click_maybe_move") {
      if (Math.hypot(e.clientX - snipStartPos.x, e.clientY - snipStartPos.y) > 8) {
        snipDragState = "moving";
        if (snipHoverBoxEl) snipHoverBoxEl.style.display = "none";
        if (snipTagBadgeEl) snipTagBadgeEl.style.display = "none";
      }
    }

    if (snipDragState === "drawing") {
      const x1 = Math.min(snipStartPos.x, e.clientX);
      const y1 = Math.min(snipStartPos.y, e.clientY);
      const x2 = Math.max(snipStartPos.x, e.clientX);
      const y2 = Math.max(snipStartPos.y, e.clientY);
      setSnipBoxRect({
        left: Math.max(0, x1),
        top: Math.max(0, y1),
        width: Math.min(window.innerWidth - x1, x2 - x1),
        height: Math.min(window.innerHeight - y1, y2 - y1)
      });
      return;
    }

    if (snipDragState === "moving") {
      const dx = e.clientX - snipStartPos.x;
      const dy = e.clientY - snipStartPos.y;
      let newLeft = snipInitialRect.left + dx;
      let newTop = snipInitialRect.top + dy;
      newLeft = Math.max(0, Math.min(window.innerWidth - snipInitialRect.width, newLeft));
      newTop = Math.max(0, Math.min(window.innerHeight - snipInitialRect.height, newTop));
      setSnipBoxRect({
        left: newLeft,
        top: newTop,
        width: snipInitialRect.width,
        height: snipInitialRect.height
      });
      return;
    }

    if (snipDragState === "resizing") {
      let { left, top, width, height } = snipInitialRect;
      const dx = e.clientX - snipStartPos.x;
      const dy = e.clientY - snipStartPos.y;
      const minSize = 20;

      if (snipActiveHandle.includes("w")) {
        const newLeft = Math.min(snipInitialRect.left + snipInitialRect.width - minSize, snipInitialRect.left + dx);
        width = snipInitialRect.left + snipInitialRect.width - newLeft;
        left = newLeft;
      }
      if (snipActiveHandle.includes("e")) {
        width = Math.max(minSize, snipInitialRect.width + dx);
      }
      if (snipActiveHandle.includes("n")) {
        const newTop = Math.min(snipInitialRect.top + snipInitialRect.height - minSize, snipInitialRect.top + dy);
        height = snipInitialRect.top + snipInitialRect.height - newTop;
        top = newTop;
      }
      if (snipActiveHandle.includes("s")) {
        height = Math.max(minSize, snipInitialRect.height + dy);
      }

      left = Math.max(0, left);
      top = Math.max(0, top);
      if (left + width > window.innerWidth) width = window.innerWidth - left;
      if (top + height > window.innerHeight) height = window.innerHeight - top;

      setSnipBoxRect({ left, top, width, height });
      return;
    }

    // Hover tracking when not dragging
    if (snipDragState === null) {
      if (snipOverlayEl) snipOverlayEl.style.pointerEvents = "none";
      if (snipBoxEl) snipBoxEl.style.pointerEvents = "none";
      const elUnder = document.elementFromPoint(e.clientX, e.clientY);
      if (snipOverlayEl) snipOverlayEl.style.pointerEvents = "auto";
      if (snipBoxEl) snipBoxEl.style.pointerEvents = "auto";

      if (!elUnder || elUnder === document.body || elUnder === document.documentElement || elUnder.id?.startsWith("super-") || elUnder.closest("#super-snip-toolbar")) {
        if (snipHoverBoxEl) snipHoverBoxEl.style.display = "none";
        if (snipTagBadgeEl) snipTagBadgeEl.style.display = "none";
        snipHoveredTarget = null;
        return;
      }

      const resolved = resolveCaptureTarget(elUnder);
      if (!resolved || resolved === document.body || resolved === document.documentElement) {
        if (snipHoverBoxEl) snipHoverBoxEl.style.display = "none";
        if (snipTagBadgeEl) snipTagBadgeEl.style.display = "none";
        snipHoveredTarget = null;
        return;
      }

      snipHoveredTarget = resolved;
      const r = resolved.getBoundingClientRect();
      const hLeft = Math.max(0, r.left);
      const hTop = Math.max(0, r.top);
      const hWidth = Math.min(window.innerWidth - hLeft, r.width);
      const hHeight = Math.min(window.innerHeight - hTop, r.height);

      if (hWidth > 10 && hHeight > 10) {
        if (snipHoverBoxEl) {
          snipHoverBoxEl.style.display = "block";
          snipHoverBoxEl.style.left = `${Math.round(hLeft)}px`;
          snipHoverBoxEl.style.top = `${Math.round(hTop)}px`;
          snipHoverBoxEl.style.width = `${Math.round(hWidth)}px`;
          snipHoverBoxEl.style.height = `${Math.round(hHeight)}px`;
        }
        if (snipTagBadgeEl) {
          const tag = resolved.tagName.toLowerCase();
          const id = resolved.id ? `#${resolved.id}` : "";
          snipTagBadgeEl.textContent = `<${tag}${id}> (${Math.round(hWidth)}×${Math.round(hHeight)}px) • ${tContent("snip_click_to_pick")}`;
          snipTagBadgeEl.style.display = "block";
          snipTagBadgeEl.style.left = `${Math.min(e.clientX + 14, window.innerWidth - 270)}px`;
          snipTagBadgeEl.style.top = `${Math.min(e.clientY + 18, window.innerHeight - 40)}px`;
        }
      } else {
        if (snipHoverBoxEl) snipHoverBoxEl.style.display = "none";
        if (snipTagBadgeEl) snipTagBadgeEl.style.display = "none";
      }
    }
  }

  function onSnipMouseDown(e) {
    if (!isElementCaptureMode) return;
    if (e.target && (e.target.closest("#super-snip-toolbar") || e.target.id === "super-snip-toolbar")) {
      return; // allow buttons to click
    }

    e.preventDefault();
    e.stopPropagation();

    if (e.target && e.target.classList.contains("super-snip-handle")) {
      snipDragState = "resizing";
      snipActiveHandle = e.target.dataset.handle;
      snipStartPos = { x: e.clientX, y: e.clientY };
      snipInitialRect = { ...snipActiveRect };
      return;
    }

    snipStartPos = { x: e.clientX, y: e.clientY };
    snipInitialRect = { ...snipActiveRect };
    snipTargetAtDown = snipHoveredTarget;

    // Check if clicked inside active snip box
    if (
      snipBoxEl &&
      snipBoxEl.style.display !== "none" &&
      e.clientX >= snipActiveRect.left &&
      e.clientX <= snipActiveRect.left + snipActiveRect.width &&
      e.clientY >= snipActiveRect.top &&
      e.clientY <= snipActiveRect.top + snipActiveRect.height
    ) {
      snipDragState = "box_click_maybe_move";
      return;
    }

    snipDragState = "drawing_maybe";
  }

  function onSnipMouseUp(e) {
    if (!isElementCaptureMode) return;

    if (snipDragState === "drawing_maybe" || snipDragState === "box_click_maybe_move") {
      // Click without drag: Snap immediately to target!
      const targetToSnap = snipTargetAtDown || snipHoveredTarget;
      if (targetToSnap) {
        const r = targetToSnap.getBoundingClientRect();
        const left = Math.max(0, r.left);
        const top = Math.max(0, r.top);
        const width = Math.min(window.innerWidth - left, r.width);
        const height = Math.min(window.innerHeight - top, r.height);
        if (width > 10 && height > 10) {
          if (snipHoverBoxEl) snipHoverBoxEl.style.display = "none";
          if (snipTagBadgeEl) snipTagBadgeEl.style.display = "none";
          if (snipBoxEl) {
            snipBoxEl.style.display = "block";
            setSnipBoxRect({ left, top, width, height });
          }
          updateSnipGuidePill(targetToSnap.tagName.toLowerCase());
        }
      }
      snipDragState = null;
      return;
    }

    if (snipDragState === "drawing") {
      if (snipActiveRect.width < 15 || snipActiveRect.height < 15) {
        if (snipBoxEl) snipBoxEl.style.display = "none";
      } else {
        if (snipBoxEl) snipBoxEl.style.display = "block";
        updateSnipGuidePill(false);
      }
      snipDragState = null;
      return;
    }

    if (snipDragState === "resizing" || snipDragState === "moving") {
      snipDragState = null;
      return;
    }
  }

  function onSnipKeyDown(e) {
    if (!isElementCaptureMode) return;
    if (e.key === "Escape" || e.code === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      cancelSnipCapture();
    } else if (e.key === "Enter" || e.code === "Enter") {
      if (snipBoxEl && snipBoxEl.style.display !== "none" && snipActiveRect.width >= 10) {
        e.preventDefault();
        e.stopPropagation();
        confirmSnipCapture();
      }
    }
  }

  function onSnipResize() {
    if (!isElementCaptureMode) return;
    if (snipBoxEl && snipBoxEl.style.display !== "none") {
      let { left, top, width, height } = snipActiveRect;
      if (left + width > window.innerWidth) width = Math.max(20, window.innerWidth - left);
      if (top + height > window.innerHeight) height = Math.max(20, window.innerHeight - top);
      setSnipBoxRect({ left, top, width, height });
    }
  }

  function startElementCaptureMode() {
    if (isInspectMode) stopInspectMode();
    isElementCaptureMode = true;

    cleanupSnipElements();

    snipOverlayEl = document.createElement("div");
    snipOverlayEl.id = "super-snip-overlay";

    snipHoverBoxEl = document.createElement("div");
    snipHoverBoxEl.id = "super-snip-hover-box";

    snipTagBadgeEl = document.createElement("div");
    snipTagBadgeEl.id = "super-snip-tag-badge";

    snipGuidePillEl = document.createElement("div");
    snipGuidePillEl.id = "super-snip-guide-pill";
    updateSnipGuidePill(null);

    snipBoxEl = document.createElement("div");
    snipBoxEl.id = "super-snip-box";
    snipBoxEl.style.display = "none";

    const handles = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
    handles.forEach(pos => {
      const h = document.createElement("div");
      h.className = `super-snip-handle ${pos}`;
      h.dataset.handle = pos;
      snipBoxEl.appendChild(h);
    });

    snipToolbarEl = document.createElement("div");
    snipToolbarEl.id = "super-snip-toolbar";

    snipSizeBadgeEl = document.createElement("span");
    snipSizeBadgeEl.className = "super-snip-size-badge";
    snipSizeBadgeEl.textContent = "0 × 0 px";
    snipToolbarEl.appendChild(snipSizeBadgeEl);

    const btnConfirm = document.createElement("button");
    btnConfirm.className = "super-snip-btn super-snip-btn-confirm";
    btnConfirm.replaceChildren(...new DOMParser().parseFromString(`${tContent("snip_btn_capture")} <kbd style="background:rgba(255,255,255,0.2);padding:1px 5px;border-radius:4px;font-size:10px;">Enter</kbd>`, "text/html").body.childNodes);
    btnConfirm.addEventListener("click", (e) => {
      e.stopPropagation();
      confirmSnipCapture();
    });
    snipToolbarEl.appendChild(btnConfirm);

    const btnCancel = document.createElement("button");
    btnCancel.className = "super-snip-btn super-snip-btn-cancel";
    btnCancel.replaceChildren(...new DOMParser().parseFromString(`${tContent("snip_btn_cancel")} <kbd style="background:rgba(255,255,255,0.2);padding:1px 5px;border-radius:4px;font-size:10px;">Esc</kbd>`, "text/html").body.childNodes);
    btnCancel.addEventListener("click", (e) => {
      e.stopPropagation();
      cancelSnipCapture();
    });
    snipToolbarEl.appendChild(btnCancel);

    snipBoxEl.appendChild(snipToolbarEl);

    document.documentElement.appendChild(snipOverlayEl);
    document.documentElement.appendChild(snipHoverBoxEl);
    document.documentElement.appendChild(snipTagBadgeEl);
    document.documentElement.appendChild(snipBoxEl);
    document.documentElement.appendChild(snipGuidePillEl);

    window.addEventListener("mousemove", onSnipMouseMove, true);
    window.addEventListener("mousedown", onSnipMouseDown, true);
    window.addEventListener("mouseup", onSnipMouseUp, true);
    window.addEventListener("keydown", onSnipKeyDown, true);
    window.addEventListener("resize", onSnipResize, true);
  }

  function stopElementCaptureMode() {
    isElementCaptureMode = false;
    window.removeEventListener("mousemove", onSnipMouseMove, true);
    window.removeEventListener("mousedown", onSnipMouseDown, true);
    window.removeEventListener("mouseup", onSnipMouseUp, true);
    window.removeEventListener("keydown", onSnipKeyDown, true);
    window.removeEventListener("resize", onSnipResize, true);
    cleanupSnipElements();
  }

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
          startElementCaptureMode();
          sendResponse({ success: true });
          break;

        case "STOP_ELEMENT_CAPTURE":
          stopElementCaptureMode();
          sendResponse({ success: true });
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

  // --------------------------------------------------------------------------
  // Full-Page Screenshot Sticky Header Stabilizer (Fixes Duplicate Headers)
  // --------------------------------------------------------------------------
  let temporarilyHiddenSticky = [];

  function prepareFullPageScroll() {
    // 1. Hide scrollbars so no scrollbar thumb or track is captured in screenshot
    let hideScrollStyle = document.getElementById("super-hide-scrollbars");
    if (!hideScrollStyle) {
      hideScrollStyle = document.createElement("style");
      hideScrollStyle.id = "super-hide-scrollbars";
      hideScrollStyle.textContent = `
        html, body {
          scrollbar-width: none !important;
          -ms-overflow-style: none !important;
        }
        html::-webkit-scrollbar, body::-webkit-scrollbar, *::-webkit-scrollbar {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
        }
        html, body, * {
          scroll-behavior: auto !important;
        }
      `;
      document.documentElement.appendChild(hideScrollStyle);
    }

    const doc = document.documentElement;
    const body = document.body;

    const totalHeight = Math.max(
      body.scrollHeight, doc.scrollHeight,
      body.offsetHeight, doc.offsetHeight,
      body.clientHeight, doc.clientHeight
    );
    const viewportHeight = window.innerHeight;
    const viewportWidth = doc.clientWidth || window.innerWidth;

    // Detect all sticky/fixed elements
    temporarilyHiddenSticky = [];
    document.querySelectorAll("*").forEach(el => {
      if (el.id?.startsWith("super-")) return;
      const pos = window.getComputedStyle(el).position;
      if (pos === "fixed" || pos === "sticky") {
        temporarilyHiddenSticky.push(el);
      }
    });

    return {
      totalHeight: Math.min(totalHeight, 16000), // Cap at 16k px to prevent canvas memory crash
      viewportHeight,
      viewportWidth,
      devicePixelRatio: window.devicePixelRatio || 1
    };
  }

  function toggleFixedElements(visible) {
    if (!visible) {
      // Dynamically query all elements in the DOM to catch any sticky/fixed element (headers, sidebars, footers)
      document.querySelectorAll("*").forEach(el => {
        if (el.id?.startsWith("super-")) return;
        const cs = window.getComputedStyle(el);
        const pos = cs.position;
        if (pos === "fixed" || pos === "sticky") {
          if (!el.hasAttribute("data-super-orig-vis")) {
            el.setAttribute("data-super-orig-vis", el.style.visibility || "");
            el.setAttribute("data-super-orig-opac", el.style.opacity || "");
            temporarilyHiddenSticky.push(el);
          }
          el.style.setProperty("visibility", "hidden", "important");
          el.style.setProperty("opacity", "0", "important");
        }
      });
    } else {
      temporarilyHiddenSticky.forEach(el => {
        const origVis = el.getAttribute("data-super-orig-vis");
        const origOpac = el.getAttribute("data-super-orig-opac");
        if (origVis !== null) {
          if (origVis) el.style.setProperty("visibility", origVis);
          else el.style.removeProperty("visibility");
          el.removeAttribute("data-super-orig-vis");
        }
        if (origOpac !== null) {
          if (origOpac) el.style.setProperty("opacity", origOpac);
          else el.style.removeProperty("opacity");
          el.removeAttribute("data-super-orig-opac");
        }
      });
      temporarilyHiddenSticky = [];

      // Restore scrollbars
      const hideScrollStyle = document.getElementById("super-hide-scrollbars");
      if (hideScrollStyle) {
        hideScrollStyle.remove();
      }
    }
  }

  // --------------------------------------------------------------------------
  // 4-Tier Academic Citation Extractor Engine
  // --------------------------------------------------------------------------
  function extractPageCitationMetadata() {
    const doc = document;
    const url = window.location.href;
    const hostname = window.location.hostname;

    let sourceType = "webpage";
    let title = "";
    let authors = [];
    let date = "";
    let fallbackModifiedDate = "";
    let container = "";
    let doi = "";
    let pages = "";

    const cleanStr = (s) => (s || "")
      .replace(/^(by|written by|posted by|author|tác giả|theo|ảnh)\s*[:\-–]?\s*/i, "")
      .replace(/\s*[-–|]\s*(the hacker news|techcrunch|the verge|reuters|bbc|vnexpress|dân trí|tuổi trẻ).*$/i, "")
      .trim();

    const cleanDateStr = (raw) => {
      if (!raw) return "";
      let s = raw.toString().trim();
      if (!s) return "";

      // Check if string contains multiple dates with explicit "published" vs "updated" labels
      const pubSectionMatch = s.match(/(?:ngày\s*đăng|đăng\s*(?:ngày|lúc)?|xuất\s*bản|công\s*bố|published\s*(?:on|at)?|posted\s*(?:on|at)?)\s*[:\-–,]?\s*([^|\n–—]+?)(?=(?:\s*[-–—|•]\s*(?:cập\s*nhật|updated|modified|last\s*modified|last\s*updated))|\s*$)/i);
      if (pubSectionMatch) {
        s = pubSectionMatch[1].trim();
      }

      // 0. Full ISO timestamp (e.g. "2009-10-24T23:57:33-07:00", "2005-04-23T20:31:52-07:00" or "2026-09-05T22:57:50Z")
      // Extract the official publisher calendar date (YYYY-MM-DD) directly before 'T' without timezone date drift
      const isoYmdMatch = s.match(/\b(19\d\d|20\d\d)-(\d{2})-(\d{2})(?:T|\s|$)/i);
      if (isoYmdMatch) {
        return `${isoYmdMatch[1]}-${isoYmdMatch[2]}-${isoYmdMatch[3]}`;
      }

      // 1. Remove prefixes like "Updated on:", "Published:", "Đăng lúc:", "Thứ...", "Đã công chiếu vào...", etc.
      s = s.replace(/^(?:updated\s*(?:on|at)?|published\s*(?:on|at)?|posted\s*(?:on|at)?|modified\s*(?:on|at)?|uploaded\s*on|streamed\s*live\s*(?:on)?|streamed\s*(?:on)?|premiered\s*(?:on)?|đã\s*công\s*chiếu\s*(?:vào)?|đã\s*phát\s*trực\s*tiếp\s*(?:vào)?|công\s*chiếu\s*(?:vào)?|phát\s*trực\s*tiếp\s*(?:vào)?|đã\s*tải\s*lên\s*(?:vào)?|xuất bản|ngày đăng|đăng lúc|cập nhật|thứ\s+[a-z0-9]+|chủ nhật)\s*[:\-–,]?\s*/i, "").trim();

      // 2. Relative dates: "X giờ trước", "X phút trước", "X ngày trước", "X tuần trước", "X tháng trước", "X năm trước", etc.
      const now = new Date();
      if (/(\d+)\s*(?:giờ|phút|giây|hours?|mins?|minutes?|secs?|seconds?)\s*(?:trước|ago)/i.test(s) || /vừa xong|just now/i.test(s)) {
        return now.toISOString().split("T")[0];
      }
      const relDayMatch = s.match(/(\d+)\s*(?:ngày|days?)\s*(?:trước|ago)/i);
      if (relDayMatch) {
        const d = new Date(now.getTime() - parseInt(relDayMatch[1], 10) * 86400000);
        return d.toISOString().split("T")[0];
      }
      const relWeekMatch = s.match(/(\d+)\s*(?:tuần|weeks?)\s*(?:trước|ago)/i);
      if (relWeekMatch) {
        const d = new Date(now.getTime() - parseInt(relWeekMatch[1], 10) * 7 * 86400000);
        return d.toISOString().split("T")[0];
      }
      const relMonthMatch = s.match(/(\d+)\s*(?:tháng|months?)\s*(?:trước|ago)/i);
      if (relMonthMatch) {
        const d = new Date(now.getFullYear(), now.getMonth() - parseInt(relMonthMatch[1], 10), now.getDate());
        return d.toISOString().split("T")[0];
      }
      const relYearMatch = s.match(/(\d+)\s*(?:năm|years?)\s*(?:trước|ago)/i);
      if (relYearMatch) {
        const yr = now.getFullYear() - parseInt(relYearMatch[1], 10);
        return `${yr}`;
      }
      if (/hôm qua|yesterday/i.test(s)) {
        const d = new Date(now.getTime() - 86400000);
        return d.toISOString().split("T")[0];
      }

      // 3. ISO or YYYY-MM-DD (or with T or space)
      const isoMatch = s.match(/\b(19\d\d|20\d\d)[-/.](\d{1,2})[-/.](\d{1,2})(?:T|\s|$|[^\d])/);
      if (isoMatch) {
        const y = isoMatch[1];
        const m = isoMatch[2].padStart(2, "0");
        const d = isoMatch[3].padStart(2, "0");
        if (parseInt(m, 10) >= 1 && parseInt(m, 10) <= 12 && parseInt(d, 10) >= 1 && parseInt(d, 10) <= 31) {
          return `${y}-${m}-${d}`;
        }
      }

      // 4. Vietnamese phrase: "ngày 06 tháng 09 năm 2026", "16 thg 8, 2026", "tháng ba, 2024"
      const vnWordMonths = {
        "một": "01", "giêng": "01", "hai": "02", "ba": "03", "bốn": "04", "tư": "04",
        "năm": "05", "sáu": "06", "bảy": "07", "tám": "08", "chín": "09",
        "mười": "10", "mười một": "11", "mười hai": "12", "chạp": "12"
      };
      const vnPhraseMatch = s.match(/(?:ngày\s+)?(\d{1,2})\s+(?:tháng|thg)\s+(\d{1,2}|một|giêng|hai|ba|bốn|tư|năm|sáu|bảy|tám|chín|mười|mười\s+một|mười\s+hai)(?:,?\s+năm|\s*,)?\s+(19\d\d|20\d\d)/i);
      if (vnPhraseMatch) {
        const d = vnPhraseMatch[1].padStart(2, "0");
        const rawM = vnPhraseMatch[2].toLowerCase().trim();
        const m = vnWordMonths[rawM] || rawM.padStart(2, "0");
        const y = vnPhraseMatch[3];
        return `${y}-${m}-${d}`;
      }
      const vnMonthYear = s.match(/(?:tháng|thg)\s+(\d{1,2}|một|giêng|hai|ba|bốn|tư|năm|sáu|bảy|tám|chín|mười|mười\s+một|mười\s+hai)(?:,?\s+năm|\s*,)?\s+(19\d\d|20\d\d)/i);
      if (vnMonthYear) {
        const rawM = vnMonthYear[1].toLowerCase().trim();
        const m = vnWordMonths[rawM] || rawM.padStart(2, "0");
        const y = vnMonthYear[2];
        return `${y}-${m}`;
      }

      // 5. English Month names
      const months = {
        jan: "01", january: "01", feb: "02", february: "02", mar: "03", march: "03", apr: "04", april: "04",
        may: "05", jun: "06", june: "06", jul: "07", july: "07", aug: "08", august: "08", sep: "09", sept: "09",
        september: "09", oct: "10", october: "10", nov: "11", november: "11", dec: "12", december: "12"
      };
      const monthNamesRegex = "jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?";

      // "September 6, 2026" or "September 6th, 2026"
      const enMatch1 = s.match(new RegExp(`\\b(${monthNamesRegex})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(19\\d\\d|20\\d\\d)\\b`, "i"));
      if (enMatch1) {
        const m = months[enMatch1[1].toLowerCase().replace(".", "")];
        const d = enMatch1[2].padStart(2, "0");
        const y = enMatch1[3];
        if (m) return `${y}-${m}-${d}`;
      }

      // "6 September 2026" or "6th Sept 2026"
      const enMatch2 = s.match(new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${monthNamesRegex})\\.?\\s*,?\\s+(19\\d\\d|20\\d\\d)\\b`, "i"));
      if (enMatch2) {
        const d = enMatch2[1].padStart(2, "0");
        const m = months[enMatch2[2].toLowerCase().replace(".", "")];
        const y = enMatch2[3];
        if (m) return `${y}-${m}-${d}`;
      }

      // Month + Year: "September 2026"
      const enMatch3 = s.match(new RegExp(`\\b(${monthNamesRegex})\\.?\\s*,?\\s+(19\\d\\d|20\\d\\d)\\b`, "i"));
      if (enMatch3) {
        const m = months[enMatch3[1].toLowerCase().replace(".", "")];
        const y = enMatch3[2];
        if (m) return `${y}-${m}`;
      }

      // 6. Day-Month-Year: "06/09/2026", "6.9.2026", "06-09-2026"
      const dmyMatch = s.match(/\b(\d{1,2})[./-](\d{1,2})[./-](19\d\d|20\d\d)\b/);
      if (dmyMatch) {
        const d = dmyMatch[1].padStart(2, "0");
        const m = dmyMatch[2].padStart(2, "0");
        const y = dmyMatch[3];
        if (parseInt(m, 10) >= 1 && parseInt(m, 10) <= 12 && parseInt(d, 10) >= 1 && parseInt(d, 10) <= 31) {
          return `${y}-${m}-${d}`;
        }
      }

      // 7. Year only
      const yMatch = s.match(/\b(19\d\d|20\d\d)\b/);
      if (yMatch) return yMatch[1];

      return s.slice(0, 30);
    };

    // 1. Highwire Press & Dublin Core Tags
    doc.querySelectorAll('meta[name="citation_author"], meta[name="DC.creator"], meta[name="dc.creator"]').forEach(n => {
      const c = n.getAttribute("content");
      if (c && !c.startsWith("http") && !authors.includes(c.trim())) authors.push(cleanStr(c));
    });

    const titleCandidates = doc.querySelectorAll('meta[name="citation_title" i], meta[name="DC.Title" i]');
    for (const tag of titleCandidates) {
      const c = (tag.getAttribute("content") || "").trim();
      if (c.length > 2) {
        if (!title) title = c;
        if (doc.title && (doc.title.toLowerCase().includes(c.toLowerCase()) || c.toLowerCase().includes(doc.title.toLowerCase()))) {
          title = c;
          break;
        }
      }
    }

    const tagDate = doc.querySelector('meta[name="citation_publication_date"], meta[name="citation_date"], meta[name="citation_online_date"], meta[name="citation_cover_date"], meta[name="DC.date"], meta[name="DC.date.issued"], meta[name="DC.Date.created"]');
    if (tagDate) date = cleanDateStr(tagDate.getAttribute("content") || "");

    const tagJournal = doc.querySelector('meta[name="citation_journal_title"], meta[name="citation_conference_title"], meta[name="citation_publisher"], meta[name="citation_series_title"], meta[name="DC.Source"], meta[name="dc.source"], meta[name="DC.Publisher"], meta[name="dc.publisher"]');
    if (tagJournal) container = (tagJournal.getAttribute("content") || "").trim();

    const tagDoi = doc.querySelector('meta[name="citation_doi"], meta[name="DC.identifier"]');
    if (tagDoi) {
      const val = tagDoi.getAttribute("content") || "";
      if (val.includes("10.") || val.startsWith("10.")) doi = val.replace(/^doi:/i, "").trim();
    }

    const tagFirstPage = doc.querySelector('meta[name="citation_firstpage"]');
    const tagLastPage = doc.querySelector('meta[name="citation_lastpage"]');
    const tagVol = doc.querySelector('meta[name="citation_volume"]');
    const tagIssue = doc.querySelector('meta[name="citation_issue"]');
    if (tagVol || tagIssue || tagFirstPage) {
      let pList = [];
      if (tagVol) pList.push(`vol. ${tagVol.getAttribute("content")}`);
      if (tagIssue) pList.push(`no. ${tagIssue.getAttribute("content")}`);
      if (tagFirstPage) {
        if (tagLastPage) pList.push(`pp. ${tagFirstPage.getAttribute("content")}-${tagLastPage.getAttribute("content")}`);
        else pList.push(`p. ${tagFirstPage.getAttribute("content")}`);
      }
      pages = pList.join(", ");
    }

    // 2. Schema.org JSON-LD (Search all nodes in graph)
    doc.querySelectorAll('script[type="application/ld+json"]').forEach(s => {
      try {
        const raw = JSON.parse(s.innerText || s.textContent || "");
        const rawItems = Array.isArray(raw) ? raw : (raw["@graph"] || [raw]);
        // Prioritize specific Article/NewsArticle/Report nodes over generic WebPage nodes
        const items = [...rawItems].sort((a, b) => {
          const aType = (a?.["@type"] || "").toString().toLowerCase();
          const bType = (b?.["@type"] || "").toString().toLowerCase();
          const aIsArt = aType.includes("article") || aType.includes("news") || aType.includes("post") || aType.includes("report");
          const bIsArt = bType.includes("article") || bType.includes("news") || bType.includes("post") || bType.includes("report");
          return (bIsArt ? 1 : 0) - (aIsArt ? 1 : 0);
        });
        for (const item of items) {
          if (!item || typeof item !== "object") continue;
          const type = (item["@type"] || "").toString();
          if (type.includes("Article") || type.includes("News") || type.includes("Post") || type.includes("Report") || type.includes("Paper") || type.includes("WebPage") || type.includes("Blog")) {
            if (authors.length === 0 && item.author) {
              const list = Array.isArray(item.author) ? item.author : [item.author];
              for (const a of list) {
                const aName = typeof a === "string" ? a : (a && a.name ? a.name : "");
                const c = cleanStr(aName);
                if (c && !c.startsWith("http") && !authors.includes(c)) authors.push(c);
              }
            }
            if (!title && (item.headline || item.name)) title = (item.headline || item.name).trim();
            if (!date) {
              const dVal = item.datePublished || item.dateCreated || item.uploadDate || item.releaseDate;
              if (dVal) {
                date = cleanDateStr(dVal);
              } else if (item.dateModified && !fallbackModifiedDate) {
                fallbackModifiedDate = cleanDateStr(item.dateModified);
              }
            }
            if (!container) {
              const p = item.isPartOf?.name || (typeof item.publisher === "string" ? item.publisher : item.publisher?.name) || item.publication?.name;
              if (p) container = p.trim();
            }
          }
        }
      } catch (e) {}
    });

    // 3. Platform Detection
    if (hostname.includes("thehackernews.com")) {
      const thnDateEl = Array.from(doc.querySelectorAll(".postmeta .author")).find(el => /^[A-Z][a-z]{2}\s+\d{1,2},\s+\d{4}$/.test(el.innerText));
      if (thnDateEl) {
        const d = new Date(thnDateEl.innerText);
        if (!isNaN(d.getTime())) {
          date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        }
      }
    }

    if (hostname.includes("youtube.com") || hostname.includes("youtu.be")) {
      sourceType = "video";
      container = "YouTube";

      // A. Extract Title
      const ytTitle = doc.querySelector(
        "h1.ytd-watch-metadata yt-formatted-string, #title h1 yt-formatted-string, h1.title.style-scope.ytd-video-primary-info-renderer, meta[property='og:title'], meta[name='title']"
      );
      if (ytTitle) {
        title = (ytTitle.innerText || ytTitle.getAttribute("content") || "").trim();
      }
      if (!title) {
        const metaName = doc.querySelector("meta[itemprop='name']");
        if (metaName) title = (metaName.getAttribute("content") || "").trim();
      }
      if (!title) {
        title = document.title.replace(/\s*-\s*YouTube$/i, "").trim();
      }

      const ytScripts = doc.querySelectorAll("script");

      // B. Extract Channel Name / Author (Strictly avoid setting video title as author)
      let channelName = "";

      // Check 1: Channel DOM elements in player/watch header
      const ytChannelEl = doc.querySelector(
        "ytd-video-owner-renderer #channel-name a, #owner #channel-name a, #upload-info #channel-name a, #channel-name yt-formatted-string a, ytd-channel-name yt-formatted-string a, ytd-channel-name #text a, ytd-channel-name a, [itemprop='author'] [itemprop='name'], [itemprop='author'] meta[itemprop='name'], [itemprop='author'] link[itemprop='name']"
      );
      if (ytChannelEl) {
        const ch = cleanStr(ytChannelEl.innerText || ytChannelEl.getAttribute("content") || ytChannelEl.textContent || "");
        if (ch && (!title || ch.toLowerCase() !== title.toLowerCase())) {
          channelName = ch;
        }
      }

      // Check 2: YouTube script data (ytInitialPlayerResponse / ytInitialData)
      if (!channelName) {
        for (const s of ytScripts) {
          const txt = s.textContent || "";
          if (txt.includes('"author"') || txt.includes('"ownerChannelName"')) {
            const mAuth = txt.match(/"(?:author|ownerChannelName)"\s*:\s*"([^"]+)"/);
            if (mAuth && mAuth[1]) {
              let rawAuth = mAuth[1].replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
              const ch = cleanStr(rawAuth);
              if (ch && (!title || ch.toLowerCase() !== title.toLowerCase())) {
                channelName = ch;
                break;
              }
            }
          }
        }
      }

      // Check 3: Schema.org author metadata inside itemprop="author"
      if (!channelName) {
        const authMeta = doc.querySelector("[itemprop='author'] link[itemprop='name'], [itemprop='author'] meta[itemprop='name']");
        if (authMeta) {
          let rawAuth = authMeta.getAttribute("content") || authMeta.textContent || "";
          const ch = cleanStr(rawAuth);
          if (ch && (!title || ch.toLowerCase() !== title.toLowerCase())) {
            channelName = ch;
          }
        }
      }

      if (channelName) {
        authors = [channelName];
      }

      // C. Extract Publication / Stream Date
      // Priority 0: Official live broadcast / premiere start date (Always reflects the actual broadcast date, e.g. 2026-09-06)
      // Livestreams have datePublished = when scheduled in advance, but startDate = when broadcast actually aired
      const ytStartDateMeta = doc.querySelector("meta[itemprop='startDate']");
      if (ytStartDateMeta && ytStartDateMeta.getAttribute("content")) {
        const rawDate = ytStartDateMeta.getAttribute("content");
        // For YouTube livestreams, the startDate is in UTC (e.g., 2026-09-05T18:00:00+00:00)
        // We MUST parse it into a local Date object to match the YouTube UI which displays local time
        if (rawDate.includes("T")) {
          const d = new Date(rawDate);
          if (!isNaN(d.getTime())) {
            date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
          }
        }
        if (!date) {
          const parsedStart = cleanDateStr(rawDate);
          if (parsedStart && parsedStart.length >= 4) {
            date = parsedStart;
          }
        }
      }

      // Priority 1: startTimestamp from liveBroadcastDetails in player scripts
      if (!date) {
        for (const s of ytScripts) {
          const txt = s.textContent || "";
          if (txt.includes("startTimestamp")) {
            const mStart = txt.match(/(?:\x22|")?startTimestamp(?:\x22|")?\s*:\s*(?:\x22|")([0-9]{4}-[0-9]{2}-[0-9]{2}[^\x22"\\]*)/);
            if (mStart && mStart[1]) {
              const p = cleanDateStr(mStart[1]);
              if (p && p.length >= 4) { date = p; break; }
            }
          }
        }
      }

      // Priority 2: If live broadcast is currently ongoing, use today's local date
      const isLiveNow = doc.querySelector("meta[itemprop='isLiveBroadcast'][content='True' i], meta[itemprop='isLiveBroadcast'][content='true' i]") ||
        Array.from(ytScripts).some(s => {
          const t = s.textContent || "";
          return t.includes('"isLive":true') || t.includes('"isLiveBroadcast":true') || t.includes('"isLiveNow":true');
        });
      if (isLiveNow && !date) {
        const now = new Date();
        date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      }

      // Priority 3: Official canonical meta tags for standard uploads (datePublished, uploadDate)
      if (!date) {
        const ytDateMeta = doc.querySelector("meta[itemprop='datePublished'], meta[itemprop='uploadDate'], meta[name='date']");
        if (ytDateMeta) {
          date = cleanDateStr(ytDateMeta.getAttribute("content") || "");
        }
      }

      // Priority 4: Precise publishDate / uploadDate / dateText in page scripts
      if (!date) {
        for (const s of ytScripts) {
          const txt = s.textContent || "";
          if (txt.includes("publishDate") || txt.includes("uploadDate") || txt.includes("dateText")) {
            // Check simpleText first (e.g. "24 thg 10, 2009" or "Oct 24, 2009")
            const mSimple = txt.match(/(?:\x22|")?(?:dateText|publishDate)(?:\x22|")?\s*:\s*\{\s*(?:\x22|")?simpleText(?:\x22|")?\s*:\s*(?:\x22|")([^"\x22\\]+)/);
            if (mSimple && mSimple[1]) {
              const p = cleanDateStr(mSimple[1]);
              if (p && p.length >= 4) { date = p; break; }
            }
            // Check ISO date (e.g. "2009-10-24T23:57:33-07:00")
            const mIso = txt.match(/(?:\x22|")?(?:publishDate|uploadDate)(?:\x22|")?\s*:\s*(?:\x22|")([0-9]{4}-[0-9]{2}-[0-9]{2}[^\x22"\\]*)/);
            if (mIso && mIso[1]) {
              const p = cleanDateStr(mIso[1]);
              if (p && p.length >= 4) { date = p; break; }
            }
          }
        }
      }

            // Priority 3: Clean visible localized DOM date text (modern YouTube watch-metadata & Shorts)
      if (!date) {
        const ytDomDate = doc.querySelector([
          "#info-strings yt-formatted-string",
          "#info-strings",
          "ytd-watch-metadata #description-inner #info-container span:last-child",
          "ytd-watch-metadata #info-container span:last-child",
          "ytd-watch-metadata #info-container span",
          "#description-inner #info-container span",
          "#info-container span",
          "ytd-watch-info-text yt-formatted-string",
          "#date yt-formatted-string",
          "#info yt-formatted-string",
          "ytd-video-primary-info-renderer #date yt-formatted-string",
          "#description-inline-expander span.yt-formatted-string"
        ].join(', '));
        if (ytDomDate) {
          date = cleanDateStr(ytDomDate.innerText || ytDomDate.textContent || "");
        }
      }
    } else if (hostname.includes("github.com")) {
      sourceType = "software";
      container = "GitHub";
      const parts = window.location.pathname.split("/").filter(Boolean);
      if (parts.length >= 2) {
        authors = [parts[0]];
        title = `${parts[0]}/${parts[1]}`;
      }
    } else if (hostname.includes("arxiv.org")) {
      sourceType = "academic";
      container = "arXiv preprint";
    } else if (tagJournal || doi || hostname.includes("ieeexplore") || hostname.includes("sciencedirect") || hostname.includes("acm.org") || hostname.includes("springer")) {
      sourceType = "academic";
      if (hostname.includes("ieeexplore") && !container) container = "IEEE";
    }

    // 4. Microdata & Byline classes
    if (authors.length === 0) {
      const itemAuthor = doc.querySelector([
        '[itemprop="author"] [itemprop="name"]',
        '[itemprop="author"] meta[itemprop="name"]',
        '[itemprop="author"]',
        'a[rel="author"]',
        '.byline-author',
        '.c-byline__author',
        '.author-name',
        '.post-author',
        '.author',
        '.article-author',
        '.the-article-author',
        '.author-info',
        '[data-role="author"]',
        '.detail-author',
        '.fck_detail p.author_mail strong',
        '.byline'
      ].join(', '));
      if (itemAuthor) {
        const val = cleanStr(itemAuthor.getAttribute("content") || itemAuthor.innerText || "");
        if (val && !val.startsWith("http") && val.length < 50) authors = [val];
      }
    }

    // 5. Fallback Meta Tags
    if (authors.length === 0) {
      const authorCandidates = doc.querySelectorAll('meta[name="author"], meta[property="article:author"], meta[name="byl"], meta[name="dable:author"]');
      for (const node of authorCandidates) {
        const val = cleanStr(node.getAttribute("content") || "");
        if (val && !val.startsWith("http://") && val.length < 50) {
          authors = [val];
          break;
        }
      }
    }

    if (!title) {
      const ogTitle = doc.querySelector('meta[property="og:title"]');
      if (ogTitle) title = ogTitle.getAttribute("content") || "";
      else title = doc.title || "";
      title = title.replace(/\s*[-–|]\s*(YouTube|GitHub|Wikipedia|Medium|IEEE Xplore|The Hacker News|The Verge|TechCrunch|VnExpress).*$/i, "").trim();
    }

    // Comprehensive Fallback Dates:
    // A. High-Priority Visible Editorial Byline Elements (What human readers & editors see)
    if (!date) {
      // 1. The Hacker News and blogs with calendar icon in postmeta
      const calendarAdjacent = doc.querySelector([
        '.postmeta [class*="calendar"] + span',
        '.postmeta [class*="calendar"] + *',
        '.postmeta [class*="calendar"] ~ span',
        '[class*="postmeta"] [class*="calendar"] + *',
        '[class*="post-meta"] [class*="calendar"] + *',
        '.entry-meta [class*="calendar"] + *',
        '.article-meta [class*="calendar"] + *'
      ].join(', '));
      if (calendarAdjacent && calendarAdjacent.innerText) {
        const parsed = cleanDateStr(calendarAdjacent.innerText);
        if (parsed) date = parsed;
      }
    }

    if (!date) {
      // 2. High-confidence published date DOM elements (excluding updated/modified)
      const dedicatedPublishedEl = doc.querySelector([
        'time.published',
        'time.entry-date.published',
        'time[itemprop="datePublished"]',
        '[itemprop="datePublished"]:not(meta)',
        '[data-role="publishdate"]',
        '.the-article-publish',
        '.article-publish-date',
        '.published-date',
        '.pdate',
        '.bread-crumb-detail__time',
        '.author-time',
        'time.author-time',
        '.detail__time',
        '.news-date',
        '[data-testid="storyPublishDate"]',
        '.posted-on time.published',
        '.entry-date.published'
      ].join(', '));
      if (dedicatedPublishedEl) {
        const val = dedicatedPublishedEl.getAttribute("datetime") || dedicatedPublishedEl.getAttribute("content") || dedicatedPublishedEl.innerText || "";
        if (val) date = cleanDateStr(val);
      }
    }

    // B. OpenGraph & Standard PUBLISHED Meta tags (strictly published dates, NOT modified)
    if (!date) {
      const ogPublished = doc.querySelector([
        'meta[property="article:published_time"]',
        'meta[name="article:published_time"]',
        'meta[property="og:published_time"]',
        'meta[name="pubdate"]',
        'meta[name="publishdate"]',
        'meta[name="publish_date"]',
        'meta[name="publication_date"]',
        'meta[name="sailthru.date"]',
        'meta[name="parsely-pub-date"]',
        'meta[name="date"]',
        'meta[name="dc.date"]',
        'meta[name="DC.date"]',
        'meta[name="DC.date.issued"]',
        'meta[name="rnews:datePublished"]',
        'meta[name="cXenseParse:recs:publishtime"]',
        'meta[itemprop="datePublished"]',
        'meta[itemprop="dateCreated"]',
        'meta[name="its_publication"]'
      ].join(', '));
      if (ogPublished) {
        const val = ogPublished.getAttribute("content") || ogPublished.getAttribute("value") || "";
        if (val) date = cleanDateStr(val);
      }
    }

    // C. Next.js hydration data script (__NEXT_DATA__)
    if (!date) {
      const nextData = doc.getElementById("__NEXT_DATA__");
      if (nextData && nextData.textContent) {
        const mDate = nextData.textContent.match(/"(?:datePublished|publishedAt|publishDate|publicationDate)"\s*:\s*"([^"]+)"/i);
        if (mDate) date = cleanDateStr(mDate[1]);
      }
    }

    // D. Generic HTML5 <time> elements (excluding explicit updated/modified times)
    if (!date) {
      const genericTimeEl = doc.querySelector([
        'article time:not(.updated):not(.modified)',
        '.article-header time:not(.updated):not(.modified)',
        'main time:not(.updated):not(.modified)',
        'time[datetime]:not(.updated):not(.modified)',
        '.post-time',
        '.detail-time',
        '.date-time',
        '[data-testid="timestamp"]',
        '.wp-block-post-date',
        '.entry-date',
        'time'
      ].join(', '));
      if (genericTimeEl) {
        const val = genericTimeEl.getAttribute("datetime") || genericTimeEl.getAttribute("content") || genericTimeEl.innerText || "";
        if (val) date = cleanDateStr(val);
      }
    }

    // E. DOM Byline Regex Scan
    if (!date) {
      const metaEls = doc.querySelectorAll('.postmeta, .post-meta, .byline, .author-date, .post-info, .entry-meta, .article-header, header, .author, .detail-author, .cz-news-byline');
      for (const parent of metaEls) {
        if (!parent) continue;
        const txt = (parent.innerText || "").slice(0, 350);
        const parsed = cleanDateStr(txt);
        if (parsed) {
          date = parsed;
          break;
        }
      }
    }

    // F. URL Path Date Fallback (e.g. /2026/09/05/ or /2026-09-05/ or /2026/09/)
    if (!date && url) {
      const urlYmd = url.match(/\/(\d{4})[/-](\d{1,2})[/-](\d{1,2})\b/);
      if (urlYmd) {
        date = `${urlYmd[1]}-${urlYmd[2].padStart(2, "0")}-${urlYmd[3].padStart(2, "0")}`;
      } else {
        const urlYm = url.match(/\/(\d{4})\/(\d{2})\//);
        if (urlYm) {
          date = `${urlYm[1]}-${urlYm[2]}`;
        }
      }
    }

    // G. Fallback to Modified / Updated Date ONLY if Published Date could not be found anywhere
    if (!date) {
      if (fallbackModifiedDate) {
        date = fallbackModifiedDate;
      } else {
        const ogModified = doc.querySelector([
          'meta[property="article:modified_time"]',
          'meta[name="article:modified_time"]',
          'meta[property="og:updated_time"]',
          'meta[itemprop="dateModified"]',
          'time.updated',
          'time.modified'
        ].join(', '));
        if (ogModified) {
          const val = ogModified.getAttribute("content") || ogModified.getAttribute("datetime") || ogModified.innerText || "";
          if (val) date = cleanDateStr(val);
        }
      }
    }

    if (!container) {
      const ogSite = doc.querySelector('meta[property="og:site_name"], meta[name="application-name"], meta[name="publisher"], meta[name="copyright"]');
      if (ogSite) container = ogSite.getAttribute("content") || "";
      else container = hostname.replace(/^www\./, "");
    }
    if (container) {
      container = container.replace(/\s*[-–|]\s*(trang chủ|tin tức|báo điện tử|tin tức 24h|kênh thông tin|official site).*$/i, "").trim();
    }

    let cleanUrl = window.location.href.split("#")[0];
    if (hostname.includes("youtube.com") || hostname.includes("youtu.be")) {
      const vMatch = window.location.href.match(/[?&]v=([a-zA-Z0-9_-]+)/);
      if (vMatch) {
        cleanUrl = `https://www.youtube.com/watch?v=${vMatch[1]}`;
      }
    } else {
      try {
        const u = new URL(cleanUrl);
        const paramsToRemove = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid', 'ref', 'ref_src'];
        paramsToRemove.forEach(p => u.searchParams.delete(p));
        cleanUrl = u.toString();
      } catch (e) {}
    }

    return {
      sourceType,
      authors: authors.join(", "),
      title,
      date,
      container,
      doi,
      pages,
      url: cleanUrl
    };
  }

  // SPA Navigation listener (YouTube, Twitter, GitHub, etc.)
  let lastObservedUrl = window.location.href;
  function handleSpaNavigation() {
    if (window.location.href !== lastObservedUrl) {
      lastObservedUrl = window.location.href;
      try {
        const _rApi = (typeof browser !== "undefined" && browser.runtime) ? browser.runtime
          : ((typeof chrome !== "undefined" && chrome.runtime) ? chrome.runtime : null);
        if (_rApi && _rApi.sendMessage) {
          const _p = _rApi.sendMessage({
            type: "SPA_URL_CHANGED",
            url: window.location.href,
            title: document.title
          });
          if (_p && typeof _p.catch === "function") _p.catch(() => {});
        }
      } catch (e) {}
    }
  }

  window.addEventListener("yt-navigate-finish", () => {
    setTimeout(handleSpaNavigation, 400);
  });
  window.addEventListener("popstate", () => {
    setTimeout(handleSpaNavigation, 250);
  });
  setInterval(handleSpaNavigation, 1000);
})();
