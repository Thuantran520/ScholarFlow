// ---------------------------------------------------------------------------
// Interactive Element Snapper & Snipper (with 8-Point Fine-Tuning Handles)
// ---------------------------------------------------------------------------
var isElementCaptureMode = typeof window._sf_isElementCaptureMode !== "undefined" ? window._sf_isElementCaptureMode : false;
var snipOverlayEl = null;
var snipHoverBoxEl = null;
var snipTagBadgeEl = null;
var snipBoxEl = null;
var snipGuidePillEl = null;
var snipSizeBadgeEl = null;
var snipToolbarEl = null;

var snipDragState = null; // null | 'drawing_maybe' | 'box_click_maybe_move' | 'drawing' | 'moving' | 'resizing'
var snipStartPos = { x: 0, y: 0 };
var snipInitialRect = { left: 0, top: 0, width: 0, height: 0 };
var snipActiveRect = { left: 0, top: 0, width: 0, height: 0 };
var snipActiveHandle = null;
var snipHoveredTarget = null;
var snipTargetAtDown = null;
var snipLockedTarget = null;

var tContent = function(key, ...args) {
  if (typeof window !== "undefined" && typeof window.tContent === "function") {
    return window.tContent(key, ...args);
  }
  return "";
};

var notifySidebar = function(msg) {
  if (typeof window !== "undefined" && typeof window.notifySidebar === "function") {
    return window.notifySidebar(msg);
  }
};

function cleanupSnipElements() {
  document.documentElement.classList.remove("super-snip-active", "super-snip-has-box");
  document.documentElement.style.removeProperty("cursor");
  if (document.body) {
    document.body.style.removeProperty("cursor");
  }
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
  snipLockedTarget = null;
  snipActiveRect = { left: 0, top: 0, width: 0, height: 0 };
}

function onBoxEstablished() {
  document.documentElement.classList.add("super-snip-has-box");
  document.documentElement.style.removeProperty("cursor");
  if (document.body) {
    document.body.style.removeProperty("cursor");
  }
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
    let capturedBorderRadius = "0px";
    if (snipLockedTarget) {
      const r = snipLockedTarget.getBoundingClientRect();
      if (Math.abs(chosenRect.left - Math.max(0, r.left)) < 2 && Math.abs(chosenRect.top - Math.max(0, r.top)) < 2) {
        capturedBorderRadius = window.getComputedStyle(snipLockedTarget).borderRadius;
      }
    }

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
              borderRadius: capturedBorderRadius,
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
      if (Math.hypot(e.clientX - snipStartPos.x, e.clientY - snipStartPos.y) > 5) {
        snipDragState = "drawing";
        document.documentElement.classList.remove("super-snip-has-box");
        document.documentElement.style.setProperty("cursor", "crosshair", "important");
        if (document.body) document.body.style.setProperty("cursor", "crosshair", "important");
        if (snipHoverBoxEl) snipHoverBoxEl.style.display = "none";
        if (snipTagBadgeEl) snipTagBadgeEl.style.display = "none";
        if (snipBoxEl) {
          snipBoxEl.classList.add("is-drawing");
          snipBoxEl.style.display = "block";
        }
      }
    }

    if (snipDragState === "box_click_maybe_move") {
      if (Math.hypot(e.clientX - snipStartPos.x, e.clientY - snipStartPos.y) > 5) {
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
      if (snipOverlayEl) snipOverlayEl.style.setProperty("pointer-events", "none", "important");
      if (snipBoxEl) snipBoxEl.style.setProperty("pointer-events", "none", "important");
      const elUnder = document.elementFromPoint(e.clientX, e.clientY);
      if (snipOverlayEl) snipOverlayEl.style.removeProperty("pointer-events");
      if (snipBoxEl) snipBoxEl.style.removeProperty("pointer-events");

      if (!elUnder || elUnder === document.body || elUnder === document.documentElement || elUnder.id?.startsWith("super-") || elUnder.closest("#super-snip-toolbar") || elUnder.closest("#super-snip-guide-pill")) {
        if (snipHoverBoxEl) snipHoverBoxEl.style.display = "none";
        if (snipTagBadgeEl) snipTagBadgeEl.style.display = "none";
        snipHoveredTarget = null;
        return;
      }

      const resolved = typeof resolveCaptureTarget === "function" 
        ? resolveCaptureTarget(elUnder) 
        : (typeof window !== "undefined" && typeof window.resolveCaptureTarget === "function" ? window.resolveCaptureTarget(elUnder) : elUnder);
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

    if (snipBoxEl) {
      snipBoxEl.classList.remove("is-drawing");
    }

    if (snipDragState === "drawing_maybe" || snipDragState === "box_click_maybe_move") {
      // Click without drag: Snap immediately to target!
      const targetToSnap = snipTargetAtDown || snipHoveredTarget;
      if (targetToSnap) {
        snipLockedTarget = targetToSnap;
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
          onBoxEstablished();
          updateSnipGuidePill(targetToSnap.tagName.toLowerCase());
        }
      } else {
        // Deselect cleanly if clicked empty space
        if (snipBoxEl) snipBoxEl.style.display = "none";
        document.documentElement.classList.remove("super-snip-has-box");
        document.documentElement.style.setProperty("cursor", "crosshair", "important");
        if (document.body) document.body.style.setProperty("cursor", "crosshair", "important");
        snipActiveRect = { left: 0, top: 0, width: 0, height: 0 };
        snipLockedTarget = null;
        updateSnipGuidePill(null);
      }
      snipDragState = null;
      return;
    }

    if (snipDragState === "drawing") {
      snipLockedTarget = null;
      if (snipActiveRect.width < 15 || snipActiveRect.height < 15) {
        if (snipBoxEl) snipBoxEl.style.display = "none";
        document.documentElement.classList.remove("super-snip-has-box");
        document.documentElement.style.setProperty("cursor", "crosshair", "important");
        if (document.body) document.body.style.setProperty("cursor", "crosshair", "important");
      } else {
        if (snipBoxEl) snipBoxEl.style.display = "block";
        onBoxEstablished();
        updateSnipGuidePill(false);
      }
      snipDragState = null;
      return;
    }

    if (snipDragState === "resizing" || snipDragState === "moving") {
      snipLockedTarget = null;
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
    if (typeof stopInspectMode === "function") {
      stopInspectMode();
    } else if (typeof window !== "undefined" && typeof window.stopInspectMode === "function") {
      window.stopInspectMode();
    }
    isElementCaptureMode = true;

    cleanupSnipElements();

    document.documentElement.classList.add("super-snip-active");
    document.documentElement.style.setProperty("cursor", "crosshair", "important");
    if (document.body) document.body.style.setProperty("cursor", "crosshair", "important");

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

    window._sf_isElementCaptureMode = isElementCaptureMode = true;

    window.addEventListener("mousemove", onSnipMouseMove, true);
    window.addEventListener("mousedown", onSnipMouseDown, true);
    window.addEventListener("mouseup", onSnipMouseUp, true);
    document.addEventListener("mousemove", onSnipMouseMove, true);
    document.addEventListener("mousedown", onSnipMouseDown, true);
    document.addEventListener("mouseup", onSnipMouseUp, true);
    window.addEventListener("keydown", onSnipKeyDown, true);
    window.addEventListener("resize", onSnipResize, true);
  }

  function stopElementCaptureMode() {
    window._sf_isElementCaptureMode = isElementCaptureMode = false;
    window.removeEventListener("mousemove", onSnipMouseMove, true);
    window.removeEventListener("mousedown", onSnipMouseDown, true);
    window.removeEventListener("mouseup", onSnipMouseUp, true);
    document.removeEventListener("mousemove", onSnipMouseMove, true);
    document.removeEventListener("mousedown", onSnipMouseDown, true);
    document.removeEventListener("mouseup", onSnipMouseUp, true);
    window.removeEventListener("keydown", onSnipKeyDown, true);
    window.removeEventListener("resize", onSnipResize, true);
    cleanupSnipElements();
  }

  window.startElementCaptureMode = startElementCaptureMode;
  window.stopElementCaptureMode = stopElementCaptureMode;
  window.cleanupSnipElements = cleanupSnipElements;

