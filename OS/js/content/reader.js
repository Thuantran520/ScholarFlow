let isReaderMode = false;
let originalBodyDisplay = "";
let originalBodyHtml = "";
let readerContainer = null;

function toggleReaderMode() {
  if (isReaderMode) {
    // Restore
    if (readerContainer) {
      readerContainer.remove();
      readerContainer = null;
    }
    document.body.style.display = originalBodyDisplay;
    isReaderMode = false;
    return;
  }
  
  isReaderMode = true;
  originalBodyDisplay = document.body.style.display;
  
  // Very basic Readability algorithm: Find paragraph tags, headers
  const textElements = Array.from(document.querySelectorAll('h1, h2, h3, p, li, article'))
    .filter(el => {
      // Basic visibility and content check
      const rect = el.getBoundingClientRect();
      return (rect.width > 0 && rect.height > 0) && el.textContent.trim().length > 20;
    });

  let contentHtml = "";
  if (textElements.length > 0) {
    const mainArticle = document.querySelector('article') || document.querySelector('main');
    if (mainArticle) {
       contentHtml = mainArticle.innerHTML;
    } else {
       textElements.forEach(el => {
          contentHtml += el.outerHTML + "<br/>";
       });
    }
  } else {
    contentHtml = `<p>${window.tContent ? window.tContent("reader_mode_empty") : "No readable content found on this page."}</p>`;
  }
  
  // Hide original body, show reader container
  document.body.style.display = "none";
  
  readerContainer = document.createElement('div');
  readerContainer.id = "sf-cyber-reader";
  readerContainer.style.cssText = `
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: #0f172a;
    color: #e2e8f0;
    overflow-y: auto;
    z-index: 2147483647;
    padding: 40px 20px;
    font-family: Georgia, serif;
    font-size: 18px;
    line-height: 1.6;
  `;
  
  const inner = document.createElement('div');
  inner.style.cssText = "max-width: 800px; margin: 0 auto;";
  inner.innerHTML = `
    <button id="sf-close-reader" style="position:fixed; top:20px; right:30px; background:#ef4444; color:#fff; border:none; padding:8px 16px; border-radius:4px; cursor:pointer; font-family:sans-serif; font-weight:bold;">${window.tContent ? window.tContent("reader_mode_close") : "Close"}</button>
    ${contentHtml}
  `;
  
  readerContainer.appendChild(inner);
  document.documentElement.appendChild(readerContainer);
  
  document.getElementById("sf-close-reader").onclick = () => {
    toggleReaderMode();
  };
}

chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  if (req.command === "toggleReaderMode") {
    toggleReaderMode();
    sendResponse({ success: true, active: isReaderMode });
  }
});
