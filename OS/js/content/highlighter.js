// ---------------------------------------------------------------------------
// ScholarFlow - OS/js/content/highlighter.js
// Academic Web Clipper & Quick Quote (Replaces destructive neon highlighter
// with a sleek, non-destructive quote clipper directly to the Scratchpad).
// ---------------------------------------------------------------------------
(function () {
  'use strict';

  var clipperPill = null;
  var isClipperEnabled = true;

  function tContentSafe(key, fallback) {
    if (typeof window.tContent === 'function') {
      try {
        var res = window.tContent(key);
        if (res && res !== key) return res;
      } catch (e) {}
    }
    return fallback;
  }

  // Load clipper preference
  try {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['sf_scratchpad_clipper_enabled'], function (res) {
        if (res && typeof res.sf_scratchpad_clipper_enabled === 'boolean') {
          isClipperEnabled = res.sf_scratchpad_clipper_enabled;
        }
      });
      if (chrome.storage.onChanged) {
        chrome.storage.onChanged.addListener(function (changes, area) {
          if (area === 'local' && changes.sf_scratchpad_clipper_enabled) {
            isClipperEnabled = changes.sf_scratchpad_clipper_enabled.newValue !== false;
            if (!isClipperEnabled) hidePill();
          }
        });
      }
    }
  } catch (e) {}

  function hidePill() {
    if (clipperPill && clipperPill.parentNode) {
      clipperPill.parentNode.removeChild(clipperPill);
    }
    clipperPill = null;
  }

  function showToast(msg) {
    var toastId = '__sf_clip_toast';
    var old = document.getElementById(toastId);
    if (old && old.parentNode) old.parentNode.removeChild(old);

    var toast = document.createElement('div');
    toast.id = toastId;
    toast.style.cssText = [
      'position: fixed',
      'bottom: 24px',
      'right: 24px',
      'z-index: 2147483647',
      'background: rgba(15, 23, 42, 0.95)',
      'color: #38bdf8',
      'border: 1px solid rgba(56, 189, 248, 0.4)',
      'border-radius: 8px',
      'padding: 8px 14px',
      'font: 600 12px/1.4 system-ui, -apple-system, sans-serif',
      'box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5)',
      'backdrop-filter: blur(8px)',
      'display: flex',
      'align-items: center',
      'gap: 8px',
      'pointer-events: none',
      'transition: opacity 0.25s ease, transform 0.25s ease',
      'opacity: 0',
      'transform: translateY(8px)'
    ].join(';');

    var icon = document.createElement('span');
    icon.textContent = '📝';
    var textNode = document.createElement('span');
    textNode.textContent = msg;

    toast.appendChild(icon);
    toast.appendChild(textNode);
    (document.body || document.documentElement).appendChild(toast);

    requestAnimationFrame(function () {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
    });

    setTimeout(function () {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(8px)';
      setTimeout(function () {
        if (toast && toast.parentNode) toast.parentNode.removeChild(toast);
      }, 250);
    }, 2400);
  }

  function clipSelectedText(text) {
    if (!text || !text.trim()) return;

    var cleanText = text.trim();
    var host = window.location.hostname || 'general';
    var title = document.title || host;
    var url = window.location.href;

    var quoteBlock = '\n\n> ' + cleanText.replace(/\n+/g, '\n> ') + '\n— *[' + title + '](' + url + ')*\n';

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      var pageKey = 'sf_scratchpad_page_' + host;
      var globKey = 'sf_scratchpad_global';

      chrome.storage.local.get([pageKey, globKey], function (res) {
        var pageContent = (res && res[pageKey]) ? res[pageKey] : '';
        var globContent = (res && res[globKey]) ? res[globKey] : '';

        var update = {};
        update[pageKey] = pageContent ? (pageContent + quoteBlock) : quoteBlock.trimStart();
        update[globKey] = globContent ? (globContent + quoteBlock) : quoteBlock.trimStart();

        chrome.storage.local.set(update, function () {
          showToast(tContentSafe('clip_saved', 'Đã lưu trích dẫn vào Sổ nháp!'));
        });
      });
    }
  }

  function showPill(rect, selText) {
    hidePill();
    if (!isClipperEnabled || !selText || selText.length < 3) return;

    var pill = document.createElement('div');
    pill.id = 'sf-clipper-pill';
    pill.style.cssText = [
      'position: absolute',
      'z-index: 2147483647',
      'display: inline-flex',
      'align-items: center',
      'gap: 6px',
      'background: rgba(15, 23, 42, 0.92)',
      'border: 1px solid rgba(56, 189, 248, 0.45)',
      'border-radius: 20px',
      'padding: 5px 12px',
      'box-shadow: 0 6px 18px rgba(0, 0, 0, 0.45)',
      'backdrop-filter: blur(10px)',
      'cursor: pointer',
      'user-select: none',
      'font: 600 12px/1.2 system-ui, -apple-system, sans-serif',
      'color: #f8fafc',
      'transition: transform 0.15s ease, background 0.15s ease'
    ].join(';');

    var icon = document.createElement('span');
    icon.textContent = '📝';
    icon.style.cssText = 'font-size: 13px; line-height: 1;';

    var label = document.createElement('span');
    label.textContent = tContentSafe('clip_btn', 'Trích vào Sổ nháp');
    label.style.cssText = 'color: #38bdf8; letter-spacing: 0.2px;';

    pill.appendChild(icon);
    pill.appendChild(label);

    pill.addEventListener('mouseenter', function () {
      pill.style.background = 'rgba(30, 41, 59, 0.98)';
      pill.style.transform = 'scale(1.03)';
    });
    pill.addEventListener('mouseleave', function () {
      pill.style.background = 'rgba(15, 23, 42, 0.92)';
      pill.style.transform = 'scale(1)';
    });

    pill.addEventListener('mousedown', function (e) {
      e.preventDefault();
      e.stopPropagation();
    });

    pill.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      clipSelectedText(selText);
      hidePill();
      try {
        var sel = window.getSelection();
        if (sel) sel.removeAllRanges();
      } catch (err) {}
    });

    var scrollX = window.scrollX || window.pageXOffset || document.documentElement.scrollLeft || 0;
    var scrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;

    // Position above selection if possible, otherwise below
    var top = rect.top + scrollY - 36;
    if (top < scrollY + 8) {
      top = rect.bottom + scrollY + 8;
    }
    var left = rect.left + scrollX + (rect.width / 2) - 65;
    if (left < 10) left = 10;
    if (left + 150 > window.innerWidth) left = Math.max(10, window.innerWidth - 160);

    pill.style.top = Math.round(top) + 'px';
    pill.style.left = Math.round(left) + 'px';

    (document.body || document.documentElement).appendChild(pill);
    clipperPill = pill;
  }

  document.addEventListener('mouseup', function (e) {
    if (!isClipperEnabled) return;
    if (clipperPill && clipperPill.contains(e.target)) return;

    // Don't interfere with modal, inspection, snip, or companion
    if (e.target && e.target.closest && (
      e.target.closest('#sf-reading-companion') ||
      e.target.closest('#sf-floating-scratchpad') ||
      e.target.closest('#__sf_lng_bub')
    )) {
      return;
    }

    setTimeout(function () {
      try {
        var sel = window.getSelection();
        if (!sel || sel.isCollapsed || !sel.rangeCount) {
          hidePill();
          return;
        }
        var str = sel.toString().trim();
        if (str.length < 3) {
          hidePill();
          return;
        }
        var active = document.activeElement;
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) {
          hidePill();
          return;
        }
        var range = sel.getRangeAt(0);
        var rect = range.getBoundingClientRect();
        if (!rect || (rect.width === 0 && rect.height === 0)) {
          hidePill();
          return;
        }
        showPill(rect, str);
      } catch (err) {
        hidePill();
      }
    }, 30);
  });

  document.addEventListener('mousedown', function (e) {
    if (clipperPill && !clipperPill.contains(e.target)) {
      hidePill();
    }
  });

  // Backward compatibility listener for messages
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener(function (req, sender, sendResponse) {
      if (req.command === 'toggleHighlighter' || req.command === 'toggleClipper') {
        isClipperEnabled = (typeof req.active === 'boolean') ? req.active : !isClipperEnabled;
        if (!isClipperEnabled) hidePill();
        sendResponse({ success: true, active: isClipperEnabled });
      }
    });
  }
})();
