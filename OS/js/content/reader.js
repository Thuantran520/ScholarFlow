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

  // Rebuild the article with the scripting surface stripped. Cloning the nodes
  // keeps the page's own formatting, but every executable vector (script tags,
  // inline handlers, javascript: URLs, embeds) is dropped so reader mode can
  // never re-run page code inside the extension's own container.
  const EXECUTABLE_TAGS = new Set(['script', 'style', 'noscript', 'iframe', 'object', 'embed',
    'link', 'meta', 'form', 'input', 'button', 'textarea', 'select', 'option', 'template']);
  const URL_ATTRS = ['href', 'src', 'action', 'formaction', 'xlink:href', 'poster', 'data'];

  function sanitizeNode(node) {
    if (node.nodeType === Node.TEXT_NODE) return document.createTextNode(node.nodeValue);
    if (node.nodeType !== Node.ELEMENT_NODE) return null;
    const tag = node.tagName.toLowerCase();
    if (EXECUTABLE_TAGS.has(tag)) return null;

    const clean = document.createElement(tag);
    // Copy only inert presentation attributes; drop every on* handler.
    for (const attr of Array.from(node.attributes || [])) {
      const name = attr.name.toLowerCase();
      if (name.startsWith('on')) continue;
      if (name === 'style') {
        clean.setAttribute('style', attr.value);
        continue;
      }
      if (URL_ATTRS.indexOf(name) !== -1) {
        const v = String(attr.value).trim().toLowerCase();
        if (v.startsWith('javascript:') || v.startsWith('vbscript:') || v.startsWith('data:text/html')) continue;
        clean.setAttribute(name, attr.value);
        continue;
      }
      clean.setAttribute(name, attr.value);
    }
    for (const child of Array.from(node.childNodes)) {
      const c = sanitizeNode(child);
      if (c) clean.appendChild(c);
    }
    return clean;
  }

  const contentNodes = [];
  if (textElements.length > 0) {
    const mainArticle = document.querySelector('article') || document.querySelector('main');
    if (mainArticle) {
      const cleanArticle = sanitizeNode(mainArticle);
      if (cleanArticle) contentNodes.push(cleanArticle);
    } else {
      textElements.forEach(el => {
        const c = sanitizeNode(el);
        if (c) {
          contentNodes.push(c);
          contentNodes.push(document.createElement('br'));
        }
      });
    }
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

  const closeBtn = document.createElement('button');
  closeBtn.id = "sf-close-reader";
  closeBtn.style.cssText = "position:fixed; top:20px; right:30px; background:#ef4444; color:#fff; border:none; padding:8px 16px; border-radius:4px; cursor:pointer; font-family:sans-serif; font-weight:bold;";
  closeBtn.textContent = window.tContent ? window.tContent("reader_mode_close") : "Close";
  inner.appendChild(closeBtn);

  if (contentNodes.length > 0) {
    contentNodes.forEach(node => inner.appendChild(node));
  } else {
    const empty = document.createElement('p');
    empty.textContent = window.tContent ? window.tContent("reader_mode_empty") : "No readable content found on this page.";
    inner.appendChild(empty);
  }

  readerContainer.appendChild(inner);
  document.documentElement.appendChild(readerContainer);
  
  closeBtn.onclick = () => {
    toggleReaderMode();
  };
}

chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  if (req.command === "toggleReaderMode") {
    toggleReaderMode();
    sendResponse({ success: true, active: isReaderMode });
  }
});
