let isHighlighterActive = false;
let highlightPalette = null;

function createPalette() {
  if (highlightPalette) return;
  highlightPalette = document.createElement("div");
  highlightPalette.id = "sf-highlighter-palette";
  highlightPalette.style.cssText = "position:absolute; z-index:2147483647; display:none; background:#1e293b; border:1px solid #38bdf8; border-radius:8px; padding:6px; box-shadow:0 4px 12px rgba(0,0,0,0.5); gap:6px; flex-direction:row;";
  
  const colors = ["#f472b6", "#38bdf8", "#facc15", "#4ade80"];
  colors.forEach(c => {
    const btn = document.createElement("button");
    btn.style.cssText = `width:20px; height:20px; border-radius:50%; border:2px solid #0f172a; background:${c}; cursor:pointer;`;
    btn.onmousedown = (e) => {
      e.preventDefault(); // Keep selection active
      applyHighlight(c);
      highlightPalette.style.display = "none";
    };
    highlightPalette.appendChild(btn);
  });
  
  // Close button
  const closeBtn = document.createElement("button");
  closeBtn.textContent = "x";
  closeBtn.style.cssText = "background:transparent; color:#94a3b8; border:none; cursor:pointer; font-weight:bold; margin-left:4px;";
  closeBtn.onmousedown = (e) => {
    e.preventDefault();
    highlightPalette.style.display = "none";
    window.getSelection().removeAllRanges();
  };
  highlightPalette.appendChild(closeBtn);
  
  document.body.appendChild(highlightPalette);
}

function showPalette(x, y) {
  if (!highlightPalette) createPalette();
  highlightPalette.style.left = `${x}px`;
  highlightPalette.style.top = `${y + 10}px`;
  highlightPalette.style.display = "flex";
}

function applyHighlight(color) {
  const sel = window.getSelection();
  if (!sel.rangeCount) return;
  const range = sel.getRangeAt(0);
  
  try {
    const span = document.createElement("mark");
    span.className = "sf-highlighted-text";
    span.style.backgroundColor = color;
    span.style.color = "#000";
    span.style.borderRadius = "3px";
    span.style.padding = "0 2px";
    
    // Extract contents and wrap
    const contents = range.extractContents();
    span.appendChild(contents);
    range.insertNode(span);
    
    sel.removeAllRanges();
    saveHighlights();
  } catch(e) {
    console.error("ScholarFlow: Highlight span wrap failed", e);
  }
}

function saveHighlights() {
  // Simple save: Just save the innerHTML of the body? NO, that breaks dynamic sites.
  // We will just do ephemeral highlighting for now, or text-based matching later.
  // For V1, we'll store the text and color, then try to find and highlight it on load.
  const marks = document.querySelectorAll("mark.sf-highlighted-text");
  const data = Array.from(marks).map(m => ({
    text: m.textContent,
    color: m.style.backgroundColor
  }));
  
  const key = `sf_hl_${window.location.hostname}${window.location.pathname}`;
  chrome.storage.local.set({ [key]: data });
}

function loadHighlights() {
  const key = `sf_hl_${window.location.hostname}${window.location.pathname}`;
  chrome.storage.local.get([key], (res) => {
    if (res[key] && res[key].length > 0) {
      // Restore logic will go here.
      // (This requires finding the exact text node and wrapping it, which is complex.
      // We will implement basic text replacement for now).
      console.log("ScholarFlow: Loaded highlights", res[key].length);
    }
  });
}

document.addEventListener("mouseup", (e) => {
  if (!isHighlighterActive) return;
  
  // Don't show palette if clicking inside palette
  if (e.target.closest("#sf-highlighter-palette")) return;

  const sel = window.getSelection();
  if (sel && sel.toString().trim().length > 0) {
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    showPalette(rect.left + window.scrollX, rect.bottom + window.scrollY);
  } else {
    if (highlightPalette) highlightPalette.style.display = "none";
  }
});

chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  if (req.command === "toggleHighlighter") {
    isHighlighterActive = req.active;
    if (isHighlighterActive) {
      document.body.style.cursor = "text";
      loadHighlights();
    } else {
      document.body.style.cursor = "default";
      if (highlightPalette) highlightPalette.style.display = "none";
    }
    sendResponse({ success: true, active: isHighlighterActive });
  }
});
