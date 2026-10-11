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
      chrome.storage.local.get([key, 'sf_scratchpad_notes', 'sf_scratchpad_active_id'], function (res) {
        isInternalSync = true;
        var loaded = '';
        if (res && Array.isArray(res.sf_scratchpad_notes) && res.sf_scratchpad_notes.length > 0) {
          var activeId = res.sf_scratchpad_active_id || res.sf_scratchpad_notes[0].id;
          for (var i = 0; i < res.sf_scratchpad_notes.length; i++) {
            if (res.sf_scratchpad_notes[i].id === activeId) {
              loaded = res.sf_scratchpad_notes[i].content || '';
              break;
            }
          }
        }
        if (!loaded && res && res[key]) {
          loaded = res[key];
        }
        textarea.value = loaded;
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
        chrome.storage.local.get(['sf_scratchpad_notes', 'sf_scratchpad_active_id'], function (res) {
          var obj = {};
          obj[key] = val;
          if (res && Array.isArray(res.sf_scratchpad_notes) && res.sf_scratchpad_notes.length > 0) {
            var activeId = res.sf_scratchpad_active_id || res.sf_scratchpad_notes[0].id;
            var updated = res.sf_scratchpad_notes.map(function (n) {
              if (n.id === activeId) {
                return Object.assign({}, n, { content: val, updatedAt: Date.now() });
              }
              return n;
            });
            obj.sf_scratchpad_notes = updated;
          }
          chrome.storage.local.set(obj);
        });
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
        if (changes.sf_scratchpad_font_family && typeof applyFloatingFont === 'function') {
          applyFloatingFont(changes.sf_scratchpad_font_family.newValue);
        }
        if (!isInternalSync) {
          if (changes.sf_scratchpad_notes) {
            loadNote(textarea, counter);
          } else {
            var key = getStorageKey();
            if (changes[key]) {
              var newVal = changes[key].newValue || '';
              if (textarea.value !== newVal) {
                isInternalSync = true;
                textarea.value = newVal;
                isInternalSync = false;
                updateWordCount(textarea, counter);
              }
            }
          }
        }
      });
    }

    // System Font support
    var FONT_MAP = {
      mono: 'ui-monospace, "Cascadia Code", "Fira Code", "JetBrains Mono", Consolas, "Liberation Mono", Menlo, monospace',
      system: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      serif: 'Charter, "Bitstream Charter", Cambria, Georgia, "Times New Roman", Times, "Sitka Text", serif',
      modern: '"Segoe UI Variable Text", "Segoe UI Variable Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      clean: 'Verdana, Geneva, "Trebuchet MS", "DejaVu Sans", sans-serif',
      hand: '"Segoe Print", "Segoe Script", "Comic Neue", "Comic Sans MS", cursive, sans-serif'
    };

    function applyFloatingFont(fontKey) {
      if (!textarea) return;
      var fontVal = FONT_MAP[fontKey] || FONT_MAP.system;
      textarea.style.fontFamily = fontVal;
    }

    // Persist position and dimensions
    function saveFloatingBounds() {
      if (!container) return;
      var rect = container.getBoundingClientRect();
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({
          sf_floating_scratchpad_pos: {
            left: Math.round(rect.left),
            top: Math.round(rect.top),
            width: Math.round(rect.width),
            height: Math.round(rect.height)
          }
        });
      }
    }

    // Load saved position & dimensions
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['sf_floating_scratchpad_pos', 'sf_scratchpad_font_family'], function (res) {
        if (res && res.sf_floating_scratchpad_pos) {
          var p = res.sf_floating_scratchpad_pos;
          var winW = window.innerWidth;
          var winH = window.innerHeight;
          if (typeof p.width === 'number' && p.width >= 240) {
            container.style.width = Math.min(p.width, winW - 16) + 'px';
          }
          if (typeof p.height === 'number' && p.height >= 180) {
            container.style.height = Math.min(p.height, winH - 16) + 'px';
          }
          if (typeof p.left === 'number' && typeof p.top === 'number') {
            var boxW = container.offsetWidth || 320;
            var boxH = container.offsetHeight || 420;
            var safeL = Math.max(8, Math.min(p.left, winW - boxW - 8));
            var safeT = Math.max(8, Math.min(p.top, winH - boxH - 8));
            container.style.left = safeL + 'px';
            container.style.top = safeT + 'px';
            container.style.right = 'auto';
          }
        }
        if (res && res.sf_scratchpad_font_family) {
          applyFloatingFont(res.sf_scratchpad_font_family);
        }
      });
    }

    // Viewport resize/zoom flexible clamp
    function clampWithinViewport() {
      if (!container || container.style.display === 'none') return;
      var rect = container.getBoundingClientRect();
      var winW = window.innerWidth;
      var winH = window.innerHeight;
      var boxW = rect.width;
      var boxH = rect.height;

      // Adjust size if wider/taller than viewport
      if (boxW > winW - 16) {
        container.style.width = Math.max(260, winW - 16) + 'px';
        boxW = winW - 16;
      }
      if (boxH > winH - 16) {
        container.style.height = Math.max(200, winH - 16) + 'px';
        boxH = winH - 16;
      }

      var maxL = Math.max(8, winW - boxW - 8);
      var maxT = Math.max(8, winH - boxH - 8);
      var curL = rect.left;
      var curT = rect.top;

      var newL = Math.max(8, Math.min(curL, maxL));
      var newT = Math.max(8, Math.min(curT, maxT));

      if (newL !== curL || newT !== curT) {
        container.style.left = newL + 'px';
        container.style.top = newT + 'px';
        container.style.right = 'auto';
      }
    }
    window.addEventListener('resize', clampWithinViewport, { passive: true });

    // Double click header to snap top-right / restore
    var lastSavedPos = null;
    header.addEventListener('dblclick', function (e) {
      if (e.target.tagName === 'BUTTON') return;
      var rect = container.getBoundingClientRect();
      var winW = window.innerWidth;
      var snapRight = winW - rect.width - 16;
      var snapTop = 20;

      if (Math.abs(rect.left - snapRight) < 15 && Math.abs(rect.top - snapTop) < 15) {
        // Restore
        if (lastSavedPos) {
          container.style.left = lastSavedPos.left + 'px';
          container.style.top = lastSavedPos.top + 'px';
        }
      } else {
        lastSavedPos = { left: rect.left, top: rect.top };
        container.style.left = Math.max(8, snapRight) + 'px';
        container.style.top = snapTop + 'px';
      }
      container.style.right = 'auto';
      saveFloatingBounds();
    });

    // High performance butter-smooth dragging using Pointer Events + rAF
    var dragBoxW = 320;
    var dragBoxH = 420;
    var dragWinW = window.innerWidth;
    var dragWinH = window.innerHeight;
    var targetL = 0;
    var targetT = 0;
    var rafPending = false;

    function applyDragPosition() {
      container.style.left = targetL + 'px';
      container.style.top = targetT + 'px';
      container.style.right = 'auto';
      rafPending = false;
    }

    function onPointerDown(e) {
      if (e.target.tagName === 'BUTTON') return;
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;

      var rect = container.getBoundingClientRect();
      initialX = rect.left;
      initialY = rect.top;
      dragBoxW = rect.width;
      dragBoxH = rect.height;
      dragWinW = window.innerWidth;
      dragWinH = window.innerHeight;
      targetL = initialX;
      targetT = initialY;

      try {
        header.setPointerCapture(e.pointerId);
      } catch (err) {}

      container.style.willChange = 'left, top';
      document.body.style.userSelect = 'none';
      header.style.cursor = 'grabbing';
    }

    function onPointerMove(e) {
      if (!isDragging) return;
      var dx = e.clientX - startX;
      var dy = e.clientY - startY;

      var maxL = Math.max(8, dragWinW - dragBoxW - 8);
      var maxT = Math.max(8, dragWinH - dragBoxH - 8);

      targetL = Math.max(8, Math.min(initialX + dx, maxL));
      targetT = Math.max(8, Math.min(initialY + dy, maxT));

      if (!rafPending) {
        rafPending = true;
        requestAnimationFrame(applyDragPosition);
      }
    }

    function onPointerUp(e) {
      if (!isDragging) return;
      isDragging = false;
      try {
        header.releasePointerCapture(e.pointerId);
      } catch (err) {}

      container.style.willChange = 'auto';
      document.body.style.userSelect = '';
      header.style.cursor = 'grab';

      if (rafPending) {
        applyDragPosition();
      }
      saveFloatingBounds();
    }

    header.style.touchAction = 'none';
    header.addEventListener('pointerdown', onPointerDown);
    header.addEventListener('pointermove', onPointerMove);
    header.addEventListener('pointerup', onPointerUp);
    header.addEventListener('pointercancel', onPointerUp);

    // Save size when manually resized via CSS resize handle
    container.addEventListener('mouseup', function () {
      saveFloatingBounds();
    });
  }

  // Runtime listener for toggle (Chrome & Firefox compatible)
  var runtimeApi = (typeof chrome !== 'undefined' && chrome.runtime) ? chrome.runtime :
    ((typeof browser !== 'undefined' && browser.runtime) ? browser.runtime : null);

  if (runtimeApi && runtimeApi.onMessage) {
    runtimeApi.onMessage.addListener(function (req, sender, sendResponse) {
      if (req && req.command === 'toggleScratchpad') {
        var existing = document.getElementById('sf-floating-scratchpad');
        if (!scratchpadEl && existing) {
          scratchpadEl = existing;
          miniPillEl = document.getElementById('sf-floating-scratchpad-minipill');
        }

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
        return true;
      }
    });
  }
})();
