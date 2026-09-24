let scratchpadEl = null;
let isDragging = false;
let startX, startY, initialX, initialY;

function createScratchpad() {
  if (scratchpadEl) return;
  
  scratchpadEl = document.createElement("div");
  scratchpadEl.id = "sf-floating-scratchpad";
  scratchpadEl.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    width: 300px;
    height: 400px;
    background: rgba(15, 23, 42, 0.85);
    backdrop-filter: blur(10px);
    border: 1px solid #334155;
    border-radius: 8px;
    z-index: 2147483647;
    display: flex;
    flex-direction: column;
    box-shadow: 0 10px 25px rgba(0,0,0,0.5);
    color: #f8fafc;
    font-family: system-ui, sans-serif;
    overflow: hidden;
  `;
  
  // Header (Drag handle)
  const header = document.createElement("div");
  header.style.cssText = `
    height: 32px;
    background: rgba(30, 41, 59, 0.9);
    border-bottom: 1px solid #334155;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 12px;
    cursor: grab;
    user-select: none;
  `;
  
  const title = document.createElement("span");
  title.textContent = "Sổ nháp bay";
  title.style.cssText = "font-size: 13px; font-weight: 600; color: #94a3b8;";
  
  const closeBtn = document.createElement("button");
  closeBtn.textContent = "×";
  closeBtn.style.cssText = `
    background: transparent;
    border: none;
    color: #94a3b8;
    font-size: 18px;
    cursor: pointer;
    line-height: 1;
    padding: 0 4px;
  `;
  closeBtn.onclick = () => {
    scratchpadEl.style.display = "none";
  };
  
  header.appendChild(title);
  header.appendChild(closeBtn);
  
  // Text area
  const textarea = document.createElement("textarea");
  textarea.placeholder = "Ghi chú nhanh ở đây...";
  textarea.style.cssText = `
    flex: 1;
    background: transparent;
    border: none;
    color: #f8fafc;
    padding: 12px;
    font-size: 14px;
    resize: none;
    outline: none;
    line-height: 1.5;
  `;
  
  // Load saved note
  const host = window.location.hostname;
  chrome.storage.local.get([`sf_note_${host}`], (res) => {
    if (res[`sf_note_${host}`]) {
      textarea.value = res[`sf_note_${host}`];
    }
  });
  
  // Save note on input
  textarea.addEventListener("input", () => {
    chrome.storage.local.set({ [`sf_note_${host}`]: textarea.value });
  });
  
  scratchpadEl.appendChild(header);
  scratchpadEl.appendChild(textarea);
  document.body.appendChild(scratchpadEl);
  
  // Dragging logic
  header.addEventListener("mousedown", dragStart);
}

function dragStart(e) {
  if (e.target.tagName === "BUTTON") return;
  isDragging = true;
  startX = e.clientX;
  startY = e.clientY;
  
  const rect = scratchpadEl.getBoundingClientRect();
  initialX = rect.left;
  initialY = rect.top;
  
  document.addEventListener("mousemove", drag);
  document.addEventListener("mouseup", dragEnd);
  scratchpadEl.children[0].style.cursor = "grabbing";
}

function drag(e) {
  if (!isDragging) return;
  e.preventDefault();
  const dx = e.clientX - startX;
  const dy = e.clientY - startY;
  
  // Prevent dragging outside viewport
  let newX = initialX + dx;
  let newY = initialY + dy;
  
  newX = Math.max(0, Math.min(newX, window.innerWidth - scratchpadEl.offsetWidth));
  newY = Math.max(0, Math.min(newY, window.innerHeight - scratchpadEl.offsetHeight));
  
  scratchpadEl.style.left = `${newX}px`;
  scratchpadEl.style.top = `${newY}px`;
  scratchpadEl.style.right = 'auto'; // Disable initial right positioning
}

function dragEnd() {
  isDragging = false;
  document.removeEventListener("mousemove", drag);
  document.removeEventListener("mouseup", dragEnd);
  if (scratchpadEl) scratchpadEl.children[0].style.cursor = "grab";
}

chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  if (req.command === "toggleScratchpad") {
    if (!scratchpadEl) {
      createScratchpad();
      sendResponse({ success: true, state: "opened" });
    } else {
      if (scratchpadEl.style.display === "none") {
        scratchpadEl.style.display = "flex";
        sendResponse({ success: true, state: "opened" });
      } else {
        scratchpadEl.style.display = "none";
        sendResponse({ success: true, state: "closed" });
      }
    }
  }
});
