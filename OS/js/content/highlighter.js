// ---------------------------------------------------------------------------
// ScholarFlow - OS/js/content/highlighter.js
// Smart Academic & Code Web Clipper (Quotes text & extracts code snippets
// directly into the Scratchpad notes library).
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

  function detectCodeSnippet(text, containerEl) {
    if (!text) return null;
    var trimmed = text.trim();
    var isCodeElement = false;
    if (containerEl && containerEl.closest) {
      if (containerEl.closest('pre, code, .code, .monaco-editor, .ace_editor, .CodeMirror, .syntaxhighlighter, [class*="highlight"], [class*="code-"]')) {
        isCodeElement = true;
      }
    }

    var lines = trimmed.split('\n');
    var hasMultipleLines = lines.length >= 2;
    var hasIndentation = lines.some(function (l) { return /^ {2,}|\t/.test(l); });

    var pyKeywords = /\b(def |elif |import |from \w+ import|class \w+:|print\(|self\.)/;
    var jsKeywords = /\b(const |let |var |function |console\.log|=>|import .* from|export default|document\.)/;
    var cppKeywords = /\b(#include|std::|cout|cin|vector<|nullptr|int main)/;
    var javaKeywords = /\b(public static void|System\.out\.print|ArrayList<|private String)/;
    var sqlKeywords = /\b(SELECT .* FROM|INSERT INTO|UPDATE .* SET|DELETE FROM|GROUP BY|ORDER BY)/i;
    var htmlKeywords = /<\/?[a-z][\s\S]*>/i;

    var lang = null;
    if (pyKeywords.test(trimmed)) lang = 'python';
    else if (jsKeywords.test(trimmed)) lang = 'javascript';
    else if (cppKeywords.test(trimmed)) lang = 'cpp';
    else if (javaKeywords.test(trimmed)) lang = 'java';
    else if (sqlKeywords.test(trimmed)) lang = 'sql';
    else if (htmlKeywords.test(trimmed)) lang = 'html';

    if (lang || isCodeElement || (hasMultipleLines && hasIndentation && /[{};()]/.test(trimmed))) {
      return lang || 'code';
    }
    return null;
  }

  function clipSelectedText(text, asNewNote, detectedLang) {
    if (!text || !text.trim()) return;

    var cleanText = text.trim();
    var host = window.location.hostname || 'general';
    var title = document.title || host;
    var url = window.location.href;

    var block = '';
    if (detectedLang) {
      block = '\n\n```' + detectedLang + '\n' + cleanText + '\n```\n— *[' + title + '](' + url + ')*\n';
    } else {
      block = '\n\n> ' + cleanText.replace(/\n+/g, '\n> ') + '\n— *[' + title + '](' + url + ')*\n';
    }

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      var pageKey = 'sf_scratchpad_page_' + host;
      var globKey = 'sf_scratchpad_global';

      chrome.storage.local.get(['sf_scratchpad_notes', 'sf_scratchpad_active_id', pageKey, globKey], function (res) {
        var pageContent = (res && res[pageKey]) ? res[pageKey] : '';
        var globContent = (res && res[globKey]) ? res[globKey] : '';
        var notesList = (res && Array.isArray(res.sf_scratchpad_notes)) ? res.sf_scratchpad_notes : [];
        var activeId = (res && res.sf_scratchpad_active_id) || null;

        var update = {};
        update[pageKey] = pageContent ? (pageContent + block) : block.trimStart();
        update[globKey] = globContent ? (globContent + block) : block.trimStart();

        if (asNewNote || notesList.length === 0) {
          var newNote = {
            id: 'note_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
            title: (detectedLang ? ('Code: ') : ('Clip: ')) + title.substring(0, 40),
            content: block.trimStart(),
            category: detectedLang ? 'leetcode' : 'general',
            pinned: false,
            createdAt: Date.now(),
            updatedAt: Date.now()
          };
          notesList.unshift(newNote);
          update.sf_scratchpad_notes = notesList;
          update.sf_scratchpad_active_id = newNote.id;
        } else {
          // Append to active note
          var targetNote = null;
          for (var i = 0; i < notesList.length; i++) {
            if (notesList[i].id === activeId) {
              targetNote = notesList[i];
              break;
            }
          }
          if (!targetNote) targetNote = notesList[0];
          targetNote.content = targetNote.content ? (targetNote.content + block) : block.trimStart();
          targetNote.updatedAt = Date.now();
          update.sf_scratchpad_notes = notesList;
        }

        chrome.storage.local.set(update, function () {
          var toastKey = detectedLang ? 'clip_code_saved' : 'clip_saved';
          var defaultMsg = detectedLang ? 'Đã lưu đoạn mã vào Sổ nháp!' : 'Đã lưu trích dẫn vào Sổ nháp!';
          showToast(tContentSafe(toastKey, defaultMsg));
        });
      });
    }
  }

  function showPill(rect, selText, containerEl) {
    hidePill();
    if (!isClipperEnabled || !selText || selText.length < 3) return;

    var detectedLang = detectCodeSnippet(selText, containerEl);

    var pill = document.createElement('div');
    pill.id = 'sf-clipper-pill';
    pill.style.cssText = [
      'position: absolute',
      'z-index: 2147483647',
      'display: inline-flex',
      'align-items: center',
      'gap: 6px',
      'background: rgba(15, 23, 42, 0.94)',
      'border: 1px solid rgba(56, 189, 248, 0.45)',
      'border-radius: 20px',
      'padding: 4px 10px',
      'box-shadow: 0 6px 20px rgba(0, 0, 0, 0.5)',
      'backdrop-filter: blur(10px)',
      'user-select: none',
      'font: 600 12px/1.2 system-ui, -apple-system, sans-serif',
      'color: #f8fafc',
      'transition: transform 0.15s ease, background 0.15s ease'
    ].join(';');

    // Primary action button (Append to active note)
    var mainBtn = document.createElement('div');
    mainBtn.style.cssText = 'display:inline-flex; align-items:center; gap:5px; cursor:pointer; padding:2px 4px;';

    var icon = document.createElement('span');
    icon.textContent = detectedLang ? '💻' : '📝';
    icon.style.cssText = 'font-size: 13px; line-height: 1;';

    var label = document.createElement('span');
    var labelKey = detectedLang ? 'clip_btn_code' : 'clip_btn';
    var defaultLabel = detectedLang ? 'Lưu đoạn mã' : 'Trích vào Sổ nháp';
    label.textContent = tContentSafe(labelKey, defaultLabel);
    label.style.cssText = 'color: #38bdf8; letter-spacing: 0.2px;';

    mainBtn.appendChild(icon);
    mainBtn.appendChild(label);

    mainBtn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      clipSelectedText(selText, false, detectedLang);
      hidePill();
      try {
        var sel = window.getSelection();
        if (sel) sel.removeAllRanges();
      } catch (err) {}
    });

    // Secondary action button (Create as new note)
    var divider = document.createElement('span');
    divider.style.cssText = 'width:1px; height:12px; background:rgba(255,255,255,0.2);';

    var newNoteBtn = document.createElement('span');
    newNoteBtn.textContent = '+ ' + tContentSafe('clip_btn_new', 'Mới');
    newNoteBtn.title = tContentSafe('clip_btn_new', 'Tạo ghi chú mới');
    newNoteBtn.style.cssText = 'color:#94a3b8; font-size:11px; cursor:pointer; padding:2px 4px; border-radius:4px;';
    newNoteBtn.addEventListener('mouseenter', function () {
      newNoteBtn.style.color = '#38bdf8';
    });
    newNoteBtn.addEventListener('mouseleave', function () {
      newNoteBtn.style.color = '#94a3b8';
    });
    newNoteBtn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      clipSelectedText(selText, true, detectedLang);
      hidePill();
      try {
        var sel = window.getSelection();
        if (sel) sel.removeAllRanges();
      } catch (err) {}
    });

    pill.appendChild(mainBtn);
    pill.appendChild(divider);
    pill.appendChild(newNoteBtn);

    pill.addEventListener('mousedown', function (e) {
      e.preventDefault();
      e.stopPropagation();
    });

    var scrollX = window.scrollX || window.pageXOffset || document.documentElement.scrollLeft || 0;
    var scrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;

    // Position above selection if possible, otherwise below
    var top = rect.top + scrollY - 36;
    if (top < scrollY + 8) {
      top = rect.bottom + scrollY + 8;
    }
    var left = rect.left + scrollX + (rect.width / 2) - 80;
    if (left < 10) left = 10;
    if (left + 190 > window.innerWidth) left = Math.max(10, window.innerWidth - 200);

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
        var containerEl = range.commonAncestorContainer ?
          (range.commonAncestorContainer.nodeType === 1 ? range.commonAncestorContainer : range.commonAncestorContainer.parentElement) : null;

        showPill(rect, str, containerEl);
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
