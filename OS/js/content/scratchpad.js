// ---------------------------------------------------------------------------
// ScholarFlow - OS/js/content/scratchpad.js
// In-page Floating Scratchpad with live 2-way sync to ScholarFlow Sidebar.
// ---------------------------------------------------------------------------
(function () {
  'use strict';

  var scratchpadEl = null;
  var miniPillEl = null;
  var isDragging = false;
  var startX, startY, initialX, initialY;
  var currentMode = 'page'; // 'page' | 'global'
  var isInternalSync = false;
  var saveDebounce = null;

  function tContentSafe(key, fallback) {
    if (typeof window.tContent === 'function') {
      try {
        var res = window.tContent(key);
        if (res && res !== key) return res;
      } catch (e) {}
    }
    return fallback;
  }

  function getStorageKey() {
    var host = window.location.hostname || 'general';
    return currentMode === 'global' ? 'sf_scratchpad_global' : ('sf_scratchpad_page_' + host);
  }

  function updateWordCount(textarea, counterEl) {
    if (!textarea || !counterEl) return;
    var val = textarea.value || '';
    var chars = val.length;
    var words = val.trim() ? val.trim().split(/\s+/).length : 0;
    counterEl.textContent = words + ' từ • ' + chars + ' ký tự';
  }

  function loadNote(textarea, counterEl) {
    if (!textarea) return;
    var key = getStorageKey();
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get([key], function (res) {
        isInternalSync = true;
        textarea.value = (res && res[key]) ? res[key] : '';
        isInternalSync = false;
        updateWordCount(textarea, counterEl);
      });
    }
  }

  function saveNote(val) {
    clearTimeout(saveDebounce);
    saveDebounce = setTimeout(function () {
      var key = getStorageKey();
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        var obj = {};
        obj[key] = val;
        chrome.storage.local.set(obj);
      }
    }, 300);
  }

  function createMiniPill() {
    if (miniPillEl) return;
    var pill = document.createElement('div');
    pill.id = 'sf-floating-scratchpad-minipill';
    pill.style.cssText = [
      'position: fixed',
      'bottom: 24px',
      'right: 24px',
      'z-index: 2147483646',
      'display: none',
      'align-items: center',
      'gap: 6px',
      'background: rgba(15, 23, 42, 0.92)',
      'border: 1px solid rgba(56, 189, 248, 0.4)',
      'border-radius: 20px',
      'padding: 6px 14px',
      'box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45)',
      'backdrop-filter: blur(8px)',
      'cursor: pointer',
      'font: 600 12px/1.2 system-ui, sans-serif',
      'color: #38bdf8',
      'user-select: none'
    ].join(';');

    pill.textContent = '📝 ' + tContentSafe('scratchpad_title', 'Sổ nháp');
    pill.onclick = function () {
      pill.style.display = 'none';
      if (scratchpadEl) scratchpadEl.style.display = 'flex';
    };
    (document.body || document.documentElement).appendChild(pill);
    miniPillEl = pill;
  }

  function createScratchpad() {
    if (scratchpadEl) return;
    createMiniPill();

    var container = document.createElement('div');
    container.id = 'sf-floating-scratchpad';
    container.style.cssText = [
      'position: fixed',
      'top: 60px',
      'right: 24px',
      'width: 320px',
      'height: 420px',
      'min-width: 260px',
      'min-height: 240px',
      'background: rgba(15, 23, 42, 0.92)',
      'backdrop-filter: blur(12px)',
      'border: 1px solid rgba(56, 189, 248, 0.3)',
      'border-radius: 10px',
      'z-index: 2147483647',
      'display: flex',
      'flex-direction: column',
      'box-shadow: 0 16px 36px rgba(0, 0, 0, 0.55)',
      'color: #f8fafc',
      'font-family: system-ui, -apple-system, sans-serif',
      'overflow: hidden',
      'resize: both'
    ].join(';');

    // Header
    var header = document.createElement('div');
    header.style.cssText = [
      'height: 38px',
      'background: rgba(30, 41, 59, 0.85)',
      'border-bottom: 1px solid rgba(255, 255, 255, 0.08)',
      'display: flex',
      'align-items: center',
      'justify-content: space-between',
      'padding: 0 10px',
      'cursor: grab',
      'user-select: none',
      'gap: 8px'
    ].join(';');

    var leftGroup = document.createElement('div');
    leftGroup.style.cssText = 'display:flex; align-items:center; gap:6px;';

    var iconTitle = document.createElement('span');
    iconTitle.textContent = '📝';
    iconTitle.style.cssText = 'font-size: 13px;';

    // Segmented toggle
    var segWrap = document.createElement('div');
    segWrap.style.cssText = 'display:inline-flex; background:rgba(15,23,42,0.8); border:1px solid rgba(255,255,255,0.1); border-radius:6px; padding:2px; gap:2px;';

    var btnPage = document.createElement('button');
    btnPage.type = 'button';
    btnPage.textContent = tContentSafe('scratchpad_page', 'Trang này');
    btnPage.style.cssText = 'border:none; border-radius:4px; font-size:10.5px; padding:2px 7px; cursor:pointer; font-weight:600; background:#0284c7; color:#fff;';

    var btnGlob = document.createElement('button');
    btnGlob.type = 'button';
    btnGlob.textContent = tContentSafe('scratchpad_global', 'Toàn cục');
    btnGlob.style.cssText = 'border:none; border-radius:4px; font-size:10.5px; padding:2px 7px; cursor:pointer; font-weight:500; background:transparent; color:#94a3b8;';

    segWrap.appendChild(btnPage);
    segWrap.appendChild(btnGlob);
    leftGroup.appendChild(iconTitle);
    leftGroup.appendChild(segWrap);

    var rightGroup = document.createElement('div');
    rightGroup.style.cssText = 'display:flex; align-items:center; gap:4px;';

    var minBtn = document.createElement('button');
    minBtn.type = 'button';
    minBtn.textContent = '−';
    minBtn.title = 'Thu nhỏ';
    minBtn.style.cssText = 'background:transparent; border:none; color:#94a3b8; font-size:16px; cursor:pointer; padding:0 4px; line-height:1; font-weight:bold;';
    minBtn.onclick = function () {
      container.style.display = 'none';
      if (miniPillEl) miniPillEl.style.display = 'inline-flex';
    };

    var closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.textContent = '×';
    closeBtn.title = 'Đóng';
    closeBtn.style.cssText = 'background:transparent; border:none; color:#94a3b8; font-size:18px; cursor:pointer; padding:0 4px; line-height:1;';
    closeBtn.onclick = function () {
      container.style.display = 'none';
      if (miniPillEl) miniPillEl.style.display = 'none';
    };

    rightGroup.appendChild(minBtn);
    rightGroup.appendChild(closeBtn);

    header.appendChild(leftGroup);
    header.appendChild(rightGroup);

    // Textarea editor
    var textarea = document.createElement('textarea');
    textarea.placeholder = 'Ghi chú nhanh, trích dẫn học thuật...';
    textarea.style.cssText = [
      'flex: 1',
      'background: transparent',
      'border: none',
      'color: #f8fafc',
      'padding: 10px 12px',
      'font: 13px/1.6 system-ui, -apple-system, monospace, sans-serif',
      'resize: none',
      'outline: none',
      'box-sizing: border-box'
    ].join(';');

    // Footer with counter
    var footer = document.createElement('div');
    footer.style.cssText = [
      'height: 22px',
      'background: rgba(15, 23, 42, 0.7)',
      'border-top: 1px solid rgba(255, 255, 255, 0.05)',
      'display: flex',
      'align-items: center',
      'justify-content: flex-end',
      'padding: 0 10px',
      'font-size: 10.5px',
      'color: #64748b'
    ].join(';');

    var counter = document.createElement('span');
    counter.textContent = '0 từ • 0 ký tự';
    footer.appendChild(counter);

    // Mode toggles behavior
    btnPage.onclick = function () {
      if (currentMode === 'page') return;
      currentMode = 'page';
      btnPage.style.background = '#0284c7';
      btnPage.style.color = '#fff';
      btnGlob.style.background = 'transparent';
      btnGlob.style.color = '#94a3b8';
      loadNote(textarea, counter);
    };

    btnGlob.onclick = function () {
      if (currentMode === 'global') return;
      currentMode = 'global';
      btnGlob.style.background = '#0284c7';
      btnGlob.style.color = '#fff';
      btnPage.style.background = 'transparent';
      btnPage.style.color = '#94a3b8';
      loadNote(textarea, counter);
    };

    textarea.addEventListener('input', function () {
      if (isInternalSync) return;
      updateWordCount(textarea, counter);
      saveNote(textarea.value);
    });

    container.appendChild(header);
    container.appendChild(textarea);
    container.appendChild(footer);
    (document.body || document.documentElement).appendChild(container);
    scratchpadEl = container;

    // Load initial note
    loadNote(textarea, counter);

    // Listen to storage sync from sidebar/clipper
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener(function (changes, area) {
        if (area !== 'local') return;
        var key = getStorageKey();
        if (changes[key] && !isInternalSync) {
          var newVal = changes[key].newValue || '';
          if (textarea.value !== newVal) {
            isInternalSync = true;
            textarea.value = newVal;
            isInternalSync = false;
            updateWordCount(textarea, counter);
          }
        }
      });
    }

    // Dragging logic
    header.addEventListener('mousedown', function (e) {
      if (e.target.tagName === 'BUTTON') return;
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;

      var rect = container.getBoundingClientRect();
      initialX = rect.left;
      initialY = rect.top;

      function onMouseMove(moveEvt) {
        if (!isDragging) return;
        moveEvt.preventDefault();
        var dx = moveEvt.clientX - startX;
        var dy = moveEvt.clientY - startY;

        var newX = Math.max(0, Math.min(initialX + dx, window.innerWidth - container.offsetWidth));
        var newY = Math.max(0, Math.min(initialY + dy, window.innerHeight - container.offsetHeight));

        container.style.left = newX + 'px';
        container.style.top = newY + 'px';
        container.style.right = 'auto';
      }

      function onMouseUp() {
        isDragging = false;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        header.style.cursor = 'grab';
      }

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
      header.style.cursor = 'grabbing';
    });
  }

  // Runtime listener for toggle
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener(function (req, sender, sendResponse) {
      if (req.command === 'toggleScratchpad') {
        if (!scratchpadEl) {
          createScratchpad();
          sendResponse({ success: true, state: 'opened' });
        } else {
          if (scratchpadEl.style.display === 'none') {
            scratchpadEl.style.display = 'flex';
            if (miniPillEl) miniPillEl.style.display = 'none';
            sendResponse({ success: true, state: 'opened' });
          } else {
            scratchpadEl.style.display = 'none';
            sendResponse({ success: true, state: 'closed' });
          }
        }
      }
    });
  }
})();
