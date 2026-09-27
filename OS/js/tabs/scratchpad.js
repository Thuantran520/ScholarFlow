// ---------------------------------------------------------------------------
// ScholarFlow - OS/js/tabs/scratchpad.js
// Research Scratchpad tab controller (Per-page & Global notes, Markdown toolbar,
// auto-save, live sync with web clipper and floating scratchpad).
// ---------------------------------------------------------------------------
(function () {
  'use strict';

  var currentMode = 'page'; // 'page' | 'global'
  var currentHost = '';
  var currentUrl = '';
  var saveTimer = null;
  var isInternalChange = false;

  function tText(k) {
    if (typeof window.t === 'function') return window.t(k);
    if (typeof window.getI18nText === 'function') return window.getI18nText(k);
    return k;
  }

  function getStorageKey() {
    if (currentMode === 'global') return 'sf_scratchpad_global';
    return 'sf_scratchpad_page_' + (currentHost || 'general');
  }

  function updateStatus(state) {
    var dot = document.getElementById('scratchpad-status-dot');
    var text = document.getElementById('scratchpad-status-text');
    if (!dot || !text) return;

    if (state === 'saving') {
      dot.className = 'scratchpad-status-dot saving';
      text.textContent = '...';
    } else {
      dot.className = 'scratchpad-status-dot';
      text.textContent = tText('scratchpad_saved');
    }
  }

  function updateCounters() {
    var editor = document.getElementById('scratchpad-editor');
    var counter = document.getElementById('scratchpad-counter');
    if (!editor || !counter) return;

    var val = editor.value || '';
    var chars = val.length;
    var words = val.trim() ? val.trim().split(/\s+/).length : 0;
    var template = tText('scratchpad_words_counter') || '{0} từ • {1} ký tự';
    counter.textContent = template.replace('{0}', String(words)).replace('{1}', String(chars));
  }

  function loadNote() {
    var editor = document.getElementById('scratchpad-editor');
    if (!editor) return;

    var key = getStorageKey();
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get([key], function (res) {
        isInternalChange = true;
        editor.value = (res && res[key]) ? res[key] : '';
        isInternalChange = false;
        updateCounters();
        updateStatus('saved');
      });
    }
  }

  function saveNote() {
    var editor = document.getElementById('scratchpad-editor');
    if (!editor) return;

    updateStatus('saving');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      var key = getStorageKey();
      var val = editor.value;
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        var obj = {};
        obj[key] = val;
        chrome.storage.local.set(obj, function () {
          updateStatus('saved');
        });
      }
    }, 300);
  }

  function wrapSelection(before, after, defaultText) {
    var editor = document.getElementById('scratchpad-editor');
    if (!editor) return;

    var start = editor.selectionStart;
    var end = editor.selectionEnd;
    var val = editor.value;
    var selected = val.substring(start, end);

    if (selected.length > 0) {
      editor.value = val.substring(0, start) + before + selected + after + val.substring(end);
      editor.selectionStart = start + before.length;
      editor.selectionEnd = end + before.length;
    } else {
      var insert = defaultText || '';
      editor.value = val.substring(0, start) + before + insert + after + val.substring(end);
      editor.selectionStart = start + before.length;
      editor.selectionEnd = start + before.length + insert.length;
    }

    editor.focus();
    updateCounters();
    saveNote();
  }

  function insertLinePrefix(prefix) {
    var editor = document.getElementById('scratchpad-editor');
    if (!editor) return;

    var start = editor.selectionStart;
    var val = editor.value;
    var lineStart = val.lastIndexOf('\n', start - 1) + 1;

    editor.value = val.substring(0, lineStart) + prefix + val.substring(lineStart);
    editor.selectionStart = start + prefix.length;
    editor.selectionEnd = start + prefix.length;
    editor.focus();
    updateCounters();
    saveNote();
  }

  function initHostContext(callback) {
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (tabs && tabs[0] && tabs[0].url) {
          try {
            var parsed = new URL(tabs[0].url);
            currentHost = parsed.hostname;
            currentUrl = tabs[0].url;
          } catch (e) {
            currentHost = 'general';
          }
        } else {
          currentHost = 'general';
        }
        if (typeof callback === 'function') callback();
      });
    } else {
      currentHost = 'general';
      if (typeof callback === 'function') callback();
    }
  }

  function initScratchpad() {
    var editor = document.getElementById('scratchpad-editor');
    var btnModePage = document.getElementById('scratchpad-mode-page');
    var btnModeGlobal = document.getElementById('scratchpad-mode-global');
    var chkClipper = document.getElementById('chk-scratchpad-clipper');

    if (!editor) return;

    // Load active mode and clipper settings
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['sf_scratchpad_active_mode', 'sf_scratchpad_clipper_enabled'], function (res) {
        if (res && res.sf_scratchpad_active_mode) {
          currentMode = res.sf_scratchpad_active_mode;
          if (btnModePage && btnModeGlobal) {
            btnModePage.classList.toggle('active', currentMode === 'page');
            btnModeGlobal.classList.toggle('active', currentMode === 'global');
          }
        }
        if (chkClipper && res && typeof res.sf_scratchpad_clipper_enabled === 'boolean') {
          chkClipper.checked = res.sf_scratchpad_clipper_enabled;
        }
        initHostContext(loadNote);
      });
    } else {
      initHostContext(loadNote);
    }

    // Switch mode: Page
    if (btnModePage) {
      btnModePage.addEventListener('click', function () {
        if (currentMode === 'page') return;
        currentMode = 'page';
        btnModePage.classList.add('active');
        if (btnModeGlobal) btnModeGlobal.classList.remove('active');
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.set({ sf_scratchpad_active_mode: 'page' });
        }
        loadNote();
      });
    }

    // Switch mode: Global
    if (btnModeGlobal) {
      btnModeGlobal.addEventListener('click', function () {
        if (currentMode === 'global') return;
        currentMode = 'global';
        btnModeGlobal.classList.add('active');
        if (btnModePage) btnModePage.classList.remove('active');
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.set({ sf_scratchpad_active_mode: 'global' });
        }
        loadNote();
      });
    }

    // Editor typing
    editor.addEventListener('input', function () {
      if (isInternalChange) return;
      updateCounters();
      saveNote();
    });

    // Keyboard shortcuts
    editor.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        wrapSelection('**', '**', 'bold');
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        wrapSelection('*', '*', 'italic');
      } else if (e.key === 'Tab') {
        e.preventDefault();
        var start = editor.selectionStart;
        var end = editor.selectionEnd;
        editor.value = editor.value.substring(0, start) + '  ' + editor.value.substring(end);
        editor.selectionStart = editor.selectionEnd = start + 2;
        updateCounters();
        saveNote();
      }
    });

    // Toolbar formatting
    var btnBold = document.getElementById('scratchpad-btn-bold');
    if (btnBold) btnBold.addEventListener('click', function () { wrapSelection('**', '**', 'bold'); });

    var btnItalic = document.getElementById('scratchpad-btn-italic');
    if (btnItalic) btnItalic.addEventListener('click', function () { wrapSelection('*', '*', 'italic'); });

    var btnHeading = document.getElementById('scratchpad-btn-heading');
    if (btnHeading) btnHeading.addEventListener('click', function () { insertLinePrefix('### '); });

    var btnQuote = document.getElementById('scratchpad-btn-quote');
    if (btnQuote) btnQuote.addEventListener('click', function () { insertLinePrefix('> '); });

    var btnList = document.getElementById('scratchpad-btn-list');
    if (btnList) btnList.addEventListener('click', function () { insertLinePrefix('- '); });

    var btnTask = document.getElementById('scratchpad-btn-task');
    if (btnTask) btnTask.addEventListener('click', function () { insertLinePrefix('- [ ] '); });

    // Insert current citation
    var btnCite = document.getElementById('scratchpad-btn-cite');
    if (btnCite) {
      btnCite.addEventListener('click', function () {
        if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
          chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            var title = (tabs && tabs[0] && tabs[0].title) ? tabs[0].title : document.title;
            var url = (tabs && tabs[0] && tabs[0].url) ? tabs[0].url : location.href;
            var now = new Date().toLocaleDateString();
            var block = '\n\n### 📖 Trích dẫn: ' + title + '\n- **URL:** ' + url + '\n- **Ngày:** ' + now + '\n';

            var start = editor.selectionStart;
            editor.value = editor.value.substring(0, start) + block + editor.value.substring(start);
            editor.selectionStart = editor.selectionEnd = start + block.length;
            editor.focus();
            updateCounters();
            saveNote();

            if (typeof window.showToast === 'function') {
              window.showToast(tText('scratchpad_cite_inserted_toast') || 'Đã chèn trích dẫn!');
            }
          });
        }
      });
    }

    // Copy all
    var btnCopy = document.getElementById('scratchpad-btn-copy');
    if (btnCopy) {
      btnCopy.addEventListener('click', function () {
        if (!editor.value) return;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(editor.value).then(function () {
            if (typeof window.showToast === 'function') {
              window.showToast(tText('scratchpad_copied_toast') || 'Đã sao chép vào Clipboard!');
            }
          }).catch(function () {});
        }
      });
    }

    // Clear all
    var btnClear = document.getElementById('scratchpad-btn-clear');
    if (btnClear) {
      btnClear.addEventListener('click', function () {
        if (!editor.value) return;
        var msg = tText('scratchpad_confirm_clear') || 'Bạn có chắc muốn xóa toàn bộ ghi chú này không?';
        if (window.confirm(msg)) {
          editor.value = '';
          updateCounters();
          saveNote();
        }
      });
    }

    // Toggle floating scratchpad window on page
    var btnToggle = document.getElementById('btn-toggle-scratchpad');
    if (btnToggle) {
      btnToggle.addEventListener('click', function () {
        if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
          chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            if (tabs && tabs[0] && tabs[0].id) {
              chrome.tabs.sendMessage(tabs[0].id, { command: 'toggleScratchpad' }, function (res) {
                if (chrome.runtime.lastError) {
                  console.warn('Scratchpad: could not reach active tab content script', chrome.runtime.lastError.message);
                }
              });
            }
          });
        }
      });
    }

    // Clipper toggle setting
    if (chkClipper) {
      chkClipper.addEventListener('change', function () {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.set({ sf_scratchpad_clipper_enabled: chkClipper.checked });
        }
      });
    }

    // Live storage sync
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener(function (changes, area) {
        if (area !== 'local') return;
        var key = getStorageKey();
        if (changes[key] && !isInternalChange) {
          var newVal = changes[key].newValue || '';
          if (editor.value !== newVal) {
            isInternalChange = true;
            editor.value = newVal;
            isInternalChange = false;
            updateCounters();
            updateStatus('saved');
          }
        }
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initScratchpad);
  } else {
    initScratchpad();
  }
})();
