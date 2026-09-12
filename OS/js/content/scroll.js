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

  window.prepareFullPageScroll = prepareFullPageScroll;
  window.toggleFixedElements = toggleFixedElements;

  // --------------------------------------------------------------------------
