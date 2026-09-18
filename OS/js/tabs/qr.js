// ---------------------------------------------------------------------------
// ScholarFlow module: OS/js/tabs/qr.js
// Dedicated Apple Clip / Tree Rings & QR Code Generator Tab
// ---------------------------------------------------------------------------

function initQrTab() {
  const elInput = document.getElementById("qr-input");
  const elCanvas = document.getElementById("qr-canvas");
  const btnCurrentUrl = document.getElementById("btn-qr-current-url");
  const btnDownload = document.getElementById("btn-qr-download");
  const btnCopyImg = document.getElementById("btn-qr-copy-img");
  const btnCopyText = document.getElementById("btn-qr-copy-text");
  const btnClear = document.getElementById("btn-qr-clear");
  const btnPopout = document.getElementById("btn-qr-popout");
  const elHint = document.getElementById("qr-char-count");
  const elCard = document.getElementById("qr-3d-card");
  const elGlare = document.getElementById("qr-card-glare");
  const elThemeSelect = document.getElementById("qr-theme-select");
  const elLogoInput = document.getElementById("qr-logo-input");
  const elLogoPreview = document.getElementById("qr-logo-preview");
  const elLogoRemove = document.getElementById("qr-logo-remove");
  const modeButtons = document.querySelectorAll("#qr-mode-picker .qr-seg-btn");
  const elIconInput = document.getElementById("qr-custom-icon-input");

  if (!elCanvas) return;

  // State
  let currentMode = "artistic"; // "artistic", "tree", "standard", "moji", "dot", "rounded", "color", "geometric"
  let currentTheme = "apple"; // "apple", "nature", "gold"
  let currentIcon = elIconInput ? elIconInput.value.trim() : "";
  let customLogoImg = null;   // HTMLImageElement | null — center badge logo
  let customBgImg = null;     // HTMLImageElement | null — full background image
  let rafId = null;
  let qrInstance = null;
  let extractedMatrix = null;

  // Animation rotation offsets for 5 rings (tree mode only)
  // Set to 0 to make rings static (no radar-like rotation)
  const ringAngles = [0, 0, 0, 0, 0];
  const ringSpeeds = [0, 0, 0, 0, 0]; // Disabled rotation for non-radar effect

  // DPI scale for high-res output
  const DPR = window.devicePixelRatio || 1;

  // Mulberry32 seeded pseudo-random number generator
  function createPrng(seed) {
    let s = seed >>> 0;
    return function() {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // FNV-1a hash function for strings
  function hashString(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h;
  }

  // High-resolution canvas size based on DPR
  function getCanvasSize(baseSize) {
    return Math.round(baseSize * DPR);
  }

  // FNV-1a hash function for strings
  function hashString(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h;
  }

  // Draw vector icon in center badge
  function drawCenterIcon(ctx, iconType, cx, cy, color) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (iconType === "camera") {
      // Camera body
      const w = 22;
      const h = 16;
      const r = 3;
      const x = cx - w / 2;
      const y = cy - h / 2 + 1.5;

      ctx.beginPath();
      ctx.moveTo(x + r, y);
      // Top lens bump / viewfinder
      ctx.lineTo(x + 5, y);
      ctx.lineTo(x + 7, y - 3);
      ctx.lineTo(x + 15, y - 3);
      ctx.lineTo(x + 17, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.fill();

      // Camera lens center circle (cutout)
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(cx, cy + 2, 4.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(cx, cy + 2, 2.2, 0, Math.PI * 2);
      ctx.fill();

      // Little flash dot
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(x + 17, y + 3.5, 1.2, 0, Math.PI * 2);
      ctx.fill();
    } else if (iconType === "leaf") {
      // Botanical Leaf
      ctx.beginPath();
      ctx.moveTo(cx - 10, cy + 10);
      ctx.quadraticCurveTo(cx - 10, cy - 8, cx + 10, cy - 10);
      ctx.quadraticCurveTo(cx + 8, cy + 8, cx - 10, cy + 10);
      ctx.fill();

      // Leaf central rib
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(cx - 8, cy + 8);
      ctx.quadraticCurveTo(cx - 1, cy + 1, cx + 8, cy - 8);
      ctx.stroke();
    } else if (iconType === "apple") {
      // Apple silhouette
      ctx.beginPath();
      ctx.arc(cx - 4, cy + 2, 8, 0, Math.PI * 2);
      ctx.arc(cx + 4, cy + 2, 8, 0, Math.PI * 2);
      ctx.fill();

      // Leaf at top
      ctx.beginPath();
      ctx.ellipse(cx + 2, cy - 8, 4, 2, Math.PI / 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (iconType === "link") {
      // Chain link icon
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(cx - 4, cy, 5, Math.PI * 0.75, Math.PI * 1.75);
      ctx.lineTo(cx - 1, cy - 3.5);
      ctx.arc(cx + 4, cy, 5, Math.PI * 1.75, Math.PI * 0.75);
      ctx.stroke();
    } else {
      // Custom typed emoji, symbol, or text
      const str = String(iconType || "").trim();
      if (!str) {
        ctx.restore();
        return;
      }
      const glyphCount = Array.from(str).length;
      let fontSize = 17;
      if (glyphCount === 1) fontSize = 18;
      else if (glyphCount === 2) fontSize = 13;
      else if (glyphCount === 3) fontSize = 11;
      else fontSize = 9.5;

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = color;
      ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
      ctx.fillText(str, cx, cy + 0.5);
    }

    ctx.restore();
  }

  // Render Apple App Clip / Tree Rings Concentric Code
  function drawTreeRings(val, width, height, angles) {
    const ctx = elCanvas.getContext("2d");
    if (!ctx) return;

    // Crisp high-DPI scaling
    const dpr = window.devicePixelRatio || 1;
    if (elCanvas.width !== width * dpr || elCanvas.height !== height * dpr) {
      elCanvas.width = width * dpr;
      elCanvas.height = height * dpr;
      elCanvas.style.width = width + "px";
      elCanvas.style.height = height + "px";
    }

    ctx.save();
    ctx.scale(dpr, dpr);

    const cx = width / 2;
    const cy = height / 2;

    // Color palettes
    let bgColors = ["#0a0e17", "#05080f"];
    let ringPalettes = [
      ["#ffffff", "#cbd5e1", "#64748b"], // Apple monochrome
      ["#34d399", "#10b981", "#059669"], // Botanical green
      ["#fde047", "#f59e0b", "#b45309"]  // Golden oak
    ];

    let activeColors = ringPalettes[0];
    let badgeFill = "#ffffff";
    let iconFill = "#0f172a";

    if (currentTheme === "nature") {
      bgColors = ["#041a12", "#020d09"];
      activeColors = ringPalettes[1];
      badgeFill = "#ffffff";
      iconFill = "#065f46";
    } else if (currentTheme === "gold") {
      bgColors = ["#1a1205", "#0d0902"];
      activeColors = ringPalettes[2];
      badgeFill = "#ffffff";
      iconFill = "#92400e";
    }

    // Background radial gradient
    const bgGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, cx);
    bgGrad.addColorStop(0, bgColors[0]);
    bgGrad.addColorStop(1, bgColors[1]);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // PRNG seeded by the input string
    const seed = hashString(val);
    const rng = createPrng(seed);

    // Ring configuration matching Apple App Clip / Tree rings
    const ringRadii = [48, 64, 80, 96, 112];
    const ringSlots = [18, 24, 30, 36, 42];
    const ringWidths = [5.5, 6, 6.2, 6.5, 6.5];

    for (let rIdx = 0; rIdx < ringRadii.length; rIdx++) {
      const radius = ringRadii[rIdx];
      const slots = ringSlots[rIdx];
      const strokeW = ringWidths[rIdx];
      const rot = angles[rIdx];
      const slotAngle = (Math.PI * 2) / slots;

      ctx.lineWidth = strokeW;
      ctx.lineCap = "round";

      let i = 0;
      while (i < slots) {
        const rand = rng();
        // Skip empty gap
        if (rand < 0.28) {
          i++;
          continue;
        }

        // Determine dash span length (1 to 3 slots)
        let span = 1;
        if (rand > 0.72) span = 3;
        else if (rand > 0.45) span = 2;

        if (i + span > slots) {
          span = slots - i;
        }

        // Color variation (bright white vs gray tones like the user image)
        const colRand = rng();
        if (colRand > 0.55) {
          ctx.strokeStyle = activeColors[0]; // Bright primary
        } else if (colRand > 0.25) {
          ctx.strokeStyle = activeColors[1]; // Secondary
        } else {
          ctx.strokeStyle = activeColors[2]; // Deep accent
        }

        const startA = rot + i * slotAngle + 0.08;
        const endA = rot + (i + span) * slotAngle - 0.08;

        if (endA > startA) {
          ctx.beginPath();
          ctx.arc(cx, cy, radius, startA, endA);
          ctx.stroke();
        }

        i += span + 1; // leave at least 1 slot gap
      }
    }

    // Center Badge Circle
    const badgeR = 28;
    ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 3;

    ctx.fillStyle = badgeFill;
    ctx.beginPath();
    ctx.arc(cx, cy, badgeR, 0, Math.PI * 2);
    ctx.fill();

    // Reset shadow
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // Outer ring border on badge
    ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, badgeR + 3.5, 0, Math.PI * 2);
    ctx.stroke();

    // Draw center icon
    drawCenterIcon(ctx, currentIcon, cx, cy, iconFill);

    ctx.restore();
  }

  // Setup hook to intercept QRious matrix generation
  function setupQrHook() {
    if (typeof QRious === "undefined") return;
    try {
      const dummy = new QRious({ value: "test", level: "H", size: 1 });
      const proto = Object.getPrototypeOf(dummy._canvasRenderer);
      if (proto && !proto.__sf_hooked) {
        const origDraw = proto.draw;
        proto.draw = function(t) {
          if (t && t.width && t.buffer && t.buffer.length > 0) {
            extractedMatrix = { width: t.width, buffer: t.buffer };
          }
          return origDraw.call(this, t);
        };
        proto.__sf_hooked = true;
      }
    } catch (e) {
      console.warn("QR hook warning:", e);
    }
  }

  function getQrMatrix(val) {
    extractedMatrix = null;
    setupQrHook();
    if (typeof QRious === "undefined") return null;
    try {
      new QRious({
        value: val,
        level: "H",
        size: 1
      });
    } catch (e) {
      console.warn("QRious matrix extraction failed:", e);
    }
    return extractedMatrix;
  }

  // Draw rounded squircle / smooth rectangle
  function drawSquircle(ctx, x, y, w, h, r) {
    if (typeof ctx.roundRect === "function") {
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, r);
    } else {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    }
  }

  // Render 100% Scannable Artistic QR Code with Apple Squircles & Organic Dots
  function drawArtisticQR(val, width, height) {
    const ctx = elCanvas.getContext("2d");
    if (!ctx) return;

    // Crisp high-DPI scaling
    const dpr = window.devicePixelRatio || 1;
    if (elCanvas.width !== width * dpr || elCanvas.height !== height * dpr) {
      elCanvas.width = width * dpr;
      elCanvas.height = height * dpr;
      elCanvas.style.width = width + "px";
      elCanvas.style.height = height + "px";
    }

    ctx.save();
    ctx.scale(dpr, dpr);

    // Get true QR matrix
    const matrix = getQrMatrix(val);
    if (!matrix || !matrix.width || !matrix.buffer) {
      drawStandardQR(val, width);
      ctx.restore();
      return;
    }

    const grid = matrix.width;
    const padding = 16;
    const drawArea = width - padding * 2;
    const modSize = drawArea / grid;

    // Color palettes
    let dotColor = "#0f172a";
    let eyeColor = "#0f172a";
    let bgColor = "#ffffff";
    let badgeBg = "#ffffff";
    let iconColor = "#0f172a";

    if (currentTheme === "nature") {
      dotColor = "#059669";
      eyeColor = "#064e3b";
      iconColor = "#059669";
    } else if (currentTheme === "gold") {
      dotColor = "#d97706";
      eyeColor = "#78350f";
      iconColor = "#d97706";
    }

    // 1. Crisp white rounded card background (optically pure for 100% phone camera scanning)
    ctx.fillStyle = bgColor;
    drawSquircle(ctx, 0, 0, width, height, 16);
    ctx.fill();

    // Optional: Photo QR background image (drawn inside card with white wash overlay)
    if (customBgImg && customBgImg.complete && customBgImg.naturalWidth > 0) {
      ctx.save();
      // Clip to card rounded rect so image doesn't overflow
      drawSquircle(ctx, 0, 0, width, height, 16);
      ctx.clip();

      // Draw image cover-fit (object-fit: cover)
      const imgW = customBgImg.naturalWidth;
      const imgH = customBgImg.naturalHeight;
      const scale = Math.max(width / imgW, height / imgH);
      const drawW = imgW * scale;
      const drawH = imgH * scale;
      const drawX = (width - drawW) / 2;
      const drawY = (height - drawH) / 2;
      ctx.drawImage(customBgImg, drawX, drawY, drawW, drawH);

      // White semi-transparent wash so QR dots remain high-contrast (scannable)
      ctx.fillStyle = "rgba(255, 255, 255, 0.72)";
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }

    // Subtle card border
    ctx.strokeStyle = "rgba(0, 0, 0, 0.06)";
    ctx.lineWidth = 1;
    drawSquircle(ctx, 0.5, 0.5, width - 1, height - 1, 16);
    ctx.stroke();

    // Helper: check if cell (r, c) belongs to any 8x8 finder pattern & separator zone
    function isFinderZone(r, c) {
      if (r < 8 && c < 8) return true; // Top-left
      if (r < 8 && c >= grid - 8) return true; // Top-right
      if (r >= grid - 8 && c < 8) return true; // Bottom-left
      return false;
    }

    // Helper: draw an Apple squircle finder eye at (cornerC, cornerR)
    function drawFinderEye(cornerC, cornerR) {
      const px = padding + cornerC * modSize;
      const py = padding + cornerR * modSize;

      // Clean white backing behind finder eye & separator zone to guarantee 100% scan
      if (customBgImg) {
        ctx.fillStyle = "#ffffff";
        drawSquircle(ctx, px - modSize * 0.4, py - modSize * 0.4, 7.8 * modSize, 7.8 * modSize, modSize * 1.9);
        ctx.fill();
      }

      // Outer 7x7 squircle
      ctx.fillStyle = eyeColor;
      drawSquircle(ctx, px, py, 7 * modSize, 7 * modSize, modSize * 1.8);
      ctx.fill();

      // Inner 5x5 cutout
      ctx.fillStyle = bgColor;
      drawSquircle(ctx, px + modSize, py + modSize, 5 * modSize, 5 * modSize, modSize * 1.25);
      ctx.fill();

      // Center 3x3 eye
      ctx.fillStyle = eyeColor;
      drawSquircle(ctx, px + 2 * modSize, py + 2 * modSize, 3 * modSize, 3 * modSize, modSize * 0.9);
      ctx.fill();
    }

    // Draw the 3 Apple squircle finder eyes
    drawFinderEye(0, 0);
    drawFinderEye(grid - 7, 0);
    drawFinderEye(0, grid - 7);

    // Center Badge geometry (only active if logo uploaded or icon entered)
    const hasCenterBadge = Boolean(
      (customLogoImg && customLogoImg.complete && customLogoImg.naturalWidth > 0) ||
      (currentIcon && String(currentIcon).trim().length > 0)
    );
    const centerMod = grid / 2;
    const badgeCx = padding + centerMod * modSize;
    const badgeCy = padding + centerMod * modSize;
    const badgeR = modSize * 2.7;

    // 2. Draw Data Modules as Organic Botanical Rounded Dots
    ctx.fillStyle = dotColor;
    for (let r = 0; r < grid; r++) {
      for (let c = 0; c < grid; c++) {
        if (isFinderZone(r, c)) continue;

        const cx = padding + (c + 0.5) * modSize;
        const cy = padding + (r + 0.5) * modSize;

        // Skip if inside center badge (only when badge is active)
        if (hasCenterBadge) {
          const dist = Math.hypot(cx - badgeCx, cy - badgeCy);
          if (dist < badgeR + modSize * 0.3) continue;
        }

        if (matrix.buffer[r * grid + c] === 1) {
          ctx.beginPath();
          ctx.arc(cx, cy, modSize * 0.44, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // 3. Draw Center Badge Circle with custom logo or icon (only when active)
    if (hasCenterBadge) {
      ctx.save();
      ctx.shadowColor = "rgba(0, 0, 0, 0.16)";
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 2;

      ctx.fillStyle = badgeBg;
      ctx.beginPath();
      ctx.arc(badgeCx, badgeCy, badgeR, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Outer border on center badge
      ctx.strokeStyle = eyeColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(badgeCx, badgeCy, badgeR, 0, Math.PI * 2);
      ctx.stroke();

      // Draw logo image or icon inside badge
      if (customLogoImg && customLogoImg.complete && customLogoImg.naturalWidth > 0) {
        // Custom logo: clip to circle and draw centered
        ctx.save();
        ctx.beginPath();
        ctx.arc(badgeCx, badgeCy, badgeR - 2, 0, Math.PI * 2);
        ctx.clip();
        const logoSize = (badgeR - 2) * 2;
        ctx.drawImage(customLogoImg, badgeCx - badgeR + 2, badgeCy - badgeR + 2, logoSize, logoSize);
        ctx.restore();
      } else {
        drawCenterIcon(ctx, currentIcon, badgeCx, badgeCy, iconColor);
      }
    }

    ctx.restore();
  }

  // Draw Standard QR Code using QRious with active theme
  function drawStandardQR(val, size) {
    if (typeof QRious === "undefined") return;
    const ctx = elCanvas.getContext("2d");
    if (!ctx) return;

    let fgColor = "#0f172a";
    let bgColor = "#ffffff";

    if (currentTheme === "nature") {
      fgColor = "#065f46";
      bgColor = "#ecfdf5";
    } else if (currentTheme === "gold") {
      fgColor = "#92400e";
      bgColor = "#fefce8";
    }

    try {
      qrInstance = new QRious({
        element: elCanvas,
        value: val,
        size: size,
        level: "H",
        background: bgColor,
        foreground: fgColor,
        padding: 12
      });
    } catch (e) {
      console.warn("QR render failed:", e);
    }
  }

  // Draw Moji QR (emoji-style QR code)
  function drawMojiQR(val, width, height) {
    const ctx = elCanvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    if (elCanvas.width !== width * dpr || elCanvas.height !== height * dpr) {
      elCanvas.width = width * dpr;
      elCanvas.height = height * dpr;
      elCanvas.style.width = width + "px";
      elCanvas.style.height = height + "px";
    }

    ctx.save();
    ctx.scale(dpr, dpr);

    // Get QR matrix using QRious
    const matrix = getQrMatrix(val);
    if (!matrix || !matrix.width) {
      drawStandardQR(val, width);
      ctx.restore();
      return;
    }

    const grid = matrix.width;
    const modSize = Math.min(width, height) / (grid + 4);
    const padding = 2 * modSize;

    // Color palettes based on theme
    let fgColor = "#0f172a";
    let bgColor = "#ffffff";

    if (currentTheme === "nature") {
      fgColor = "#059669";
    } else if (currentTheme === "gold") {
      fgColor = "#d97706";
    }

    // Background
    ctx.fillStyle = bgColor;
    ctx.fillRect(padding, padding, width - padding * 2, height - padding * 2);

    // Draw modules with emojis or symbols
    const emojis = ["😀", "😎", "🤔", "😍", "👍", "❤️", "🔥", "🌟"];
    let emojiIdx = 0;

    for (let r = 0; r < grid; r++) {
      for (let c = 0; c < grid; c++) {
        if (matrix.buffer[r * grid + c] !== 1) continue;

        const cx = padding + (c + 0.5) * modSize;
        const cy = padding + (r + 0.5) * modSize;

        // Use emoji or colored circle
        const emoji = emojis[emojiIdx % emojis.length];
        emojiIdx++;

        // Draw emoji - scale to fit module
        ctx.fillStyle = fgColor;
        ctx.font = `${Math.round(modSize * 0.6)}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(emoji, cx, cy);
      }
    }

    ctx.restore();
  }

  // Draw Dot QR (circular dots instead of square modules)
  function drawDotQR(val, width, height) {
    const ctx = elCanvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    if (elCanvas.width !== width * dpr || elCanvas.height !== height * dpr) {
      elCanvas.width = width * dpr;
      elCanvas.height = height * dpr;
      elCanvas.style.width = width + "px";
      elCanvas.style.height = height + "px";
    }

    ctx.save();
    ctx.scale(dpr, dpr);

    // Get QR matrix using QRious
    const matrix = getQrMatrix(val);
    if (!matrix || !matrix.width) {
      drawStandardQR(val, width);
      ctx.restore();
      return;
    }

    const grid = matrix.width;
    const modSize = Math.min(width, height) / grid;

    // Color palettes based on theme
    let dotColor = "#0f172a";
    let bgColor = "#ffffff";

    if (currentTheme === "nature") {
      dotColor = "#059669";
    } else if (currentTheme === "gold") {
      dotColor = "#d97706";
    }

    // Background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);

    // Draw circular dots for data modules
    for (let r = 0; r < grid; r++) {
      for (let c = 0; c < grid; c++) {
        if (matrix.buffer[r * grid + c] !== 1) continue;
        if (isFinderZone(r, c)) continue; // Skip finder patterns

        const cx = padding + (c + 0.5) * modSize;
        const cy = padding + (r + 0.5) * modSize;

        // Draw circle dot
        ctx.beginPath();
        ctx.arc(cx, cy, modSize * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = dotColor;
        ctx.fill();
      }
    }

    // Draw finder eyes as circles too
    function drawFinderEye(cornerC, cornerR) {
      const px = padding + cornerC * modSize + 3.5 * modSize;
      const py = padding + cornerR * modSize + 3.5 * modSize;
      const eyeSize = 5.5 * modSize;

      ctx.beginPath();
      ctx.arc(px, py, eyeSize * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = "#0f172a";
      ctx.fill();

      // Inner circle
      ctx.beginPath();
      ctx.arc(px, py, eyeSize * 0.18, 0, Math.PI * 2);
      ctx.fillStyle = bgColor;
      ctx.fill();
    }

    drawFinderEye(0, 0);
    drawFinderEye(grid - 7, 0);
    drawFinderEye(0, grid - 7);

    ctx.restore();
  }

  // Check if cell belongs to finder pattern
  function isFinderZone(r, c) {
    const grid = 21; // default, will be overwritten
    if (r < 8 && c < 8) return true;
    if (r < 8 && c >= grid - 8) return true;
    if (r >= grid - 8 && c < 8) return true;
    return false;
  }

  // Draw rounded/bo tròn bo viền QR code
  function drawRoundedQR(val, width, height) {
    const ctx = elCanvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    if (elCanvas.width !== width * dpr || elCanvas.height !== height * dpr) {
      elCanvas.width = width * dpr;
      elCanvas.height = height * dpr;
      elCanvas.style.width = width + "px";
      elCanvas.style.height = height + "px";
    }

    ctx.save();
    ctx.scale(dpr, dpr);

    // Get QR matrix using QRious
    const matrix = getQrMatrix(val);
    if (!matrix || !matrix.width) {
      drawStandardQR(val, width);
      ctx.restore();
      return;
    }

    const grid = matrix.width;
    const modSize = Math.min(width, height) / grid;

    // Color palettes based on theme
    let fgColor = "#0f172a";
    let bgColor = "#ffffff";

    if (currentTheme === "nature") {
      fgColor = "#059669";
    } else if (currentTheme === "gold") {
      fgColor = "#d97706";
    }

    // Background with rounded rect
    ctx.fillStyle = bgColor;
    ctx.beginPath();
    const radius = modSize * 2;
    ctx.roundRect
      ? ctx.roundRect(0, 0, width, height, radius)
      : ctx.fillRect(0, 0, width, height);
    ctx.fill();

    // Draw modules with rounded corners
    for (let r = 0; r < grid; r++) {
      for (let c = 0; c < grid; c++) {
        if (matrix.buffer[r * grid + c] !== 1) continue;
        if (isFinderZone(r, c)) continue;

        const cx = padding + (c + 0.5) * modSize;
        const cy = padding + (r + 0.5) * modSize;

        // Draw rounded square/rectangle
        ctx.beginPath();
        ctx.roundRect
          ? ctx.roundRect(
              cx - modSize * 0.4,
              cy - modSize * 0.4,
              modSize * 0.8,
              modSize * 0.8,
              modSize * 0.15
            )
          : ctx.fillRect(
              cx - modSize * 0.4,
              cy - modSize * 0.4,
              modSize * 0.8,
              modSize * 0.8
            );
        ctx.fillStyle = fgColor;
        ctx.fill();
      }
    }

    // Draw finder eyes as squircle
    function drawFinderEye(cornerC, cornerR) {
      const px = padding + cornerC * modSize + modSize;
      const py = padding + cornerR * modSize + modSize;
      const eyeSize = 6 * modSize;

      ctx.fillStyle = fgColor;
      drawSquircle(ctx, px - eyeSize * 1.5, py - eyeSize * 1.5, eyeSize * 3, eyeSize * 3, eyeSize * 0.4);
      ctx.fill();

      // Inner cutout
      ctx.fillStyle = bgColor;
      drawSquircle(ctx, px - eyeSize * 0.5, py - eyeSize * 0.5, eyeSize, eyeSize, eyeSize * 0.2);
      ctx.fill();
    }

    drawFinderEye(0, 0);
    drawFinderEye(grid - 7, 0);
    drawFinderEye(0, grid - 7);

    ctx.restore();
  }

  // Draw Color QR (màu sắc)
  function drawColorQR(val, width, height) {
    const ctx = elCanvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    if (elCanvas.width !== width * dpr || elCanvas.height !== height * dpr) {
      elCanvas.width = width * dpr;
      elCanvas.height = height * dpr;
      elCanvas.style.width = width + "px";
      elCanvas.style.height = height + "px";
    }

    ctx.save();
    ctx.scale(dpr, dpr);

    // Get QR matrix using QRious
    const matrix = getQrMatrix(val);
    if (!matrix || !matrix.width) {
      drawStandardQR(val, width);
      ctx.restore();
      return;
    }

    const grid = matrix.width;
    const modSize = Math.min(width, height) / grid;

    // Color palettes based on theme
    let moduleColors = ["#0f172a"]; // default dark

    if (currentTheme === "nature") {
      moduleColors = ["#059669", "#10b981", "#065f46"]; // greens
    } else if (currentTheme === "gold") {
      moduleColors = ["#d97706", "#f59e0b", "#b45309"]; // golds
    } else if (currentTheme === "apple") {
      moduleColors = ["#0f172a", "#64748b", "#2d3748"]; // apple tones
    }

    // Background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    // Draw modules with colors
    for (let r = 0; r < grid; r++) {
      for (let c = 0; c < grid; c++) {
        if (matrix.buffer[r * grid + c] !== 1) continue;
        if (isFinderZone(r, c)) continue;

        const cx = padding + (c + 0.5) * modSize;
        const cy = padding + (r + 0.5) * modSize;

        // Use rotating colors based on position
        const colorIdx = (r * grid + c) % moduleColors.length;
        ctx.fillStyle = moduleColors[colorIdx];

        // Draw square module
        ctx.fillRect(cx - modSize * 0.4, cy - modSize * 0.4, modSize * 0.8, modSize * 0.8);
      }
    }

    // Draw finder eyes - darker color
    ctx.fillStyle = "#0f172a";
    const eyeSize = modSize * 4.5;
    for (const corner of [[0, 0], [grid - 7, 0], [0, grid - 7]]) {
      const px = padding + corner[0] * modSize + modSize;
      const py = padding + corner[1] * modSize + modSize;
      drawSquircle(ctx, px - eyeSize, py - eyeSize, eyeSize * 2, eyeSize * 2, modSize * 0.9);
      ctx.fill();
    }

    ctx.restore();
  }

  // Draw Geometric QR (hình học - hexagonal modules)
  function drawGeometricQR(val, width, height) {
    const ctx = elCanvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    if (elCanvas.width !== width * dpr || elCanvas.height !== height * dpr) {
      elCanvas.width = width * dpr;
      elCanvas.height = height * dpr;
      elCanvas.style.width = width + "px";
      elCanvas.style.height = height + "px";
    }

    ctx.save();
    ctx.scale(dpr, dpr);

    // Get QR matrix using QRious
    const matrix = getQrMatrix(val);
    if (!matrix || !matrix.width) {
      drawStandardQR(val, width);
      ctx.restore();
      return;
    }

    const grid = matrix.width;
    const baseSize = Math.min(width, height) / (grid + 2);
    const padding = baseSize;

    // Color palettes based on theme
    let moduleColors = ["#0f172a"];

    if (currentTheme === "nature") {
      moduleColors = ["#059669", "#10b981"];
    } else if (currentTheme === "gold") {
      moduleColors = ["#d97706", "#f59e0b"];
    } else if (currentTheme === "apple") {
      moduleColors = ["#0f172a", "#64748b"];
    }

    // Background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    // Draw hexagonal modules
    function drawHexagon(cx, cy, size) {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 6;
        ctx.lineTo(cx + Math.cos(angle) * size, cy + Math.sin(angle) * size);
      }
      ctx.closePath();
    }

    for (let r = 0; r < grid; r++) {
      for (let c = 0; c < grid; c++) {
        if (matrix.buffer[r * grid + c] !== 1) continue;
        if (isFinderZone(r, c)) continue;

        const cx = padding + (c * 1.5 + r * 0.75 + 1) * baseSize;
        const cy = padding + (r * 0.75 + 0.5) * baseSize * 2 + baseSize;

        // Alternate rows for hex grid
        const offset = r % 2 === 1 ? baseSize * 0.75 : 0;
        const moduleX = cx + offset;
        const moduleY = cy;

        ctx.fillStyle = moduleColors[0];
        const hexSize = baseSize * 0.4;
        drawHexagon(moduleX, moduleY, hexSize);
        ctx.fill();
      }
    }

    // Draw finder eyes as hexagons
    ctx.fillStyle = "#0f172a";
    for (const corner of [[0, 0], [grid - 5, 0], [0, grid - 5]]) {
      const startC = corner[0];
      const startR = corner[1];
      const eyeC = padding + (startC + 2) * baseSize * 1.5 + baseSize * 0.75;
      const eyeR = padding + (startR + 2) * baseSize * 0.75 + baseSize;
      drawHexagon(eyeC, eyeR, baseSize * 0.8);
      ctx.fill();
    }

    ctx.restore();
  }

  // Update scannable status badge
  function updateBadgeText() {
    const elBadge = document.getElementById("qr-scan-badge");
    if (!elBadge) return;
    if (currentMode === "tree") {
      elBadge.classList.add("qr-badge-clip");
      elBadge.textContent = (typeof t === "function" ? t("qr_clip_badge") : "") || "ℹ️ Mã Vòng Cây nghệ thuật (Apple App Clip Style)";
    } else {
      elBadge.classList.remove("qr-badge-clip");
      elBadge.textContent = (typeof t === "function" ? t("qr_scannable_badge") : "") || "✅ 100% Quét được bằng Camera, Zalo, Google Lens";
    }
  }

  // Master Render Loop
  function updateView() {
    const val = (elInput ? elInput.value.trim() : "") || "ScholarFlow";
    if (elHint) {
      elHint.textContent = val.length + " ký tự";
    }
    updateBadgeText();

    const gridSize = 240;
    const padding = 16;

    switch (currentMode) {
      case "tree":
        drawTreeRings(val, gridSize, gridSize, ringAngles);
        break;
      case "artistic":
        drawArtisticQR(val, gridSize, gridSize);
        break;
      case "standard":
        drawStandardQR(val, gridSize);
        break;
      case "moji":
        drawMojiQR(val, gridSize, gridSize);
        break;
      case "dot":
        drawDotQR(val, gridSize, gridSize);
        break;
      case "rounded":
        drawRoundedQR(val, gridSize, gridSize);
        break;
      case "color":
        drawColorQR(val, gridSize, gridSize);
        break;
      case "geometric":
        drawGeometricQR(val, gridSize, gridSize);
        break;
    }
  }

  // Animation frame loop (tree mode only - static rings, no rotation)
  function loop() {
    // Rings are now static - no angle updates needed
    const val = (elInput ? elInput.value.trim() : "") || "ScholarFlow";
    drawTreeRings(val, 240, 240, ringAngles);
    // Don't request next frame for static display
    // rafId = requestAnimationFrame(loop);
  }

  function startAnimation() {
    if (elCard) {
      elCard.classList.add("qr-anim-active");
    }
  }

  function stopAnimation() {
    if (elCard) {
      elCard.classList.remove("qr-anim-active");
    }
  }

  // Input listeners
  if (elInput) {
    elInput.addEventListener("input", updateView);
    elInput.addEventListener("paste", () => {
      setTimeout(updateView, 50);
    });
  }

  // Mode segmented picker
  modeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      modeButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentMode = btn.dataset.mode || "artistic";

      // Show icon picker for artistic, tree, and moji modes; hide for standard, dot, rounded, color, geometric
      const iconWrap = document.getElementById("qr-icon-selector-wrap");
      if (iconWrap) {
        iconWrap.style.display = ["artistic", "tree", "moji"].includes(currentMode) ? "flex" : "none";
      }

      // Logo row shows for artistic, tree, and moji modes (have center badge)
      // Hide for standard, dot, rounded, color, geometric (standard QR has no center badge)
      const logoRow = document.getElementById("qr-logo-row");
      if (logoRow) {
        logoRow.style.display = currentMode === "standard" ? "none" : "grid";
      }

      // Badge text updates based on mode
      updateBadgeText();

      // Draw the QR code based on current mode
      updateView();
    });
  });

  // Theme select
  if (elThemeSelect) {
    elThemeSelect.addEventListener("change", (e) => {
      currentTheme = e.target.value || "apple";
      updateView();
    });
  }

  // Custom Icon / Emoji Input (allows user to type any emoji or text)
  if (elIconInput) {
    elIconInput.addEventListener("input", (e) => {
      currentIcon = e.target.value.trim();
      // If typing icon, clear custom logo so icon shows
      if (customLogoImg) {
        customLogoImg = null;
        if (elLogoPreview) { elLogoPreview.classList.remove("visible"); elLogoPreview.src = ""; }
        if (elLogoRemove) elLogoRemove.classList.remove("visible");
      }
      updateView();
    });
  }

  // Logo upload
  if (elLogoInput) {
    elLogoInput.addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          customLogoImg = img;
          if (elLogoPreview) {
            elLogoPreview.src = ev.target.result;
            elLogoPreview.classList.add("visible");
          }
          if (elLogoRemove) elLogoRemove.classList.add("visible");
          updateView();
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
      // Reset input so same file can be re-selected
      e.target.value = "";
    });
  }

  // Logo remove
  if (elLogoRemove) {
    elLogoRemove.addEventListener("click", () => {
      customLogoImg = null;
      if (elLogoPreview) { elLogoPreview.classList.remove("visible"); elLogoPreview.src = ""; }
      elLogoRemove.classList.remove("visible");
      currentIcon = elIconInput ? elIconInput.value.trim() : "";
      updateView();
    });
  }

  // Background image upload
  const elBgInput = document.getElementById("qr-bg-input");
  const elBgPreview = document.getElementById("qr-bg-preview");
  const elBgRemove = document.getElementById("qr-bg-remove");

  if (elBgInput) {
    elBgInput.addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          customBgImg = img;
          if (elBgPreview) {
            elBgPreview.src = ev.target.result;
            elBgPreview.classList.add("visible");
          }
          if (elBgRemove) elBgRemove.classList.add("visible");
          updateView();
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
      e.target.value = "";
    });
  }

  if (elBgRemove) {
    elBgRemove.addEventListener("click", () => {
      customBgImg = null;
      if (elBgPreview) { elBgPreview.classList.remove("visible"); elBgPreview.src = ""; }
      elBgRemove.classList.remove("visible");
      updateView();
    });
  }

  // 3D Card Tilt Physics
  if (elCard) {
    elCard.addEventListener("mousemove", (e) => {
      const rect = elCard.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;

      const rotX = -y * 18;
      const rotY = x * 18;

      elCard.style.transform = `perspective(900px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale3d(1.03, 1.03, 1.03)`;

      if (elGlare) {
        const glareX = (x + 0.5) * 100;
        const glareY = (y + 0.5) * 100;
        elGlare.style.background = `radial-gradient(circle 140px at ${glareX}% ${glareY}%, rgba(255, 255, 255, 0.18), transparent 75%)`;
      }
    });

    elCard.addEventListener("mouseleave", () => {
      elCard.style.transform = "perspective(900px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)";
    });
  }

  // Get current active tab URL
  if (btnCurrentUrl) {
    btnCurrentUrl.addEventListener("click", () => {
      if (typeof chrome !== "undefined" && chrome.tabs && chrome.tabs.query) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs && tabs[0] && tabs[0].url) {
            if (elInput) {
              elInput.value = tabs[0].url;
              updateView();
            }
          }
        });
      }
    });
  }

  // Download high-resolution PNG
  if (btnDownload) {
    btnDownload.addEventListener("click", () => {
      if (!elCanvas) return;
      try {
        const url = elCanvas.toDataURL("image/png");
        const a = document.createElement("a");
        a.href = url;
        const modeNames = {
          artistic: "QR_NgheThuat",
          tree: "TreeRings",
          standard: "QR_Chuan",
          moji: "Moji_QR",
          dot: "Dot_QR",
          rounded: "Rounded_QR",
          color: "Color_QR",
          geometric: "Geometric_QR"
        };
        a.download = `ScholarFlow_${modeNames[currentMode] || "QRCode"}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } catch (e) {
        console.error("Failed to download QR/Ring code:", e);
      }
    });
  }

  // Copy Image to Clipboard
  if (btnCopyImg) {
    btnCopyImg.addEventListener("click", () => {
      if (!elCanvas) return;
      try {
        elCanvas.toBlob((blob) => {
          if (!blob) return;
          if (navigator.clipboard && typeof ClipboardItem !== "undefined") {
            navigator.clipboard.write([
              new ClipboardItem({ "image/png": blob })
            ]).then(() => {
              const orig = btnCopyImg.textContent;
              btnCopyImg.textContent = "Đã sao chép ảnh ✔";
              setTimeout(() => { btnCopyImg.textContent = orig; }, 1500);
            }).catch((err) => {
              console.warn("Clipboard write failed:", err);
            });
          }
        });
      } catch (e) {
        console.error("Copy image failed:", e);
      }
    });
  }

  // Copy text/link
  if (btnCopyText) {
    btnCopyText.addEventListener("click", () => {
      const val = elInput ? elInput.value.trim() : "";
      if (val && navigator.clipboard) {
        navigator.clipboard.writeText(val).then(() => {
          const orig = btnCopyText.textContent;
          btnCopyText.textContent = "Đã chép link ✔";
          setTimeout(() => { btnCopyText.textContent = orig; }, 1500);
        });
      }
    });
  }

  // Clear input
  if (btnClear) {
    btnClear.addEventListener("click", () => {
      if (elInput) {
        elInput.value = "";
        updateView();
      }
    });
  }

  // Popout standalone page
  if (btnPopout) {
    btnPopout.addEventListener("click", () => {
      if (typeof chrome !== "undefined" && chrome.tabs && chrome.runtime) {
        chrome.tabs.create({ url: chrome.runtime.getURL("OS/html/qr.html") });
      }
    });
  }

  // No initial animation - all modes static
}

// Auto-init
if (typeof window.initQrTab === "undefined") {
  window.initQrTab = initQrTab;
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initQrTab);
} else {
  initQrTab();
}
