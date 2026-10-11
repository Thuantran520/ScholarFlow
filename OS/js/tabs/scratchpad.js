// ---------------------------------------------------------------------------
// ScholarFlow - OS/js/tabs/scratchpad.js
// Advanced Research & Coding Scratchpad tab controller:
// Multi-notes library, LeetCode/Exam categories, Tab indent/outdent,
// Line numbers gutter, Markdown preview, Import/Export, and Web Clipper sync.
// ---------------------------------------------------------------------------
(function () {
  'use strict';

  var notes = [];
  var activeNoteId = null;
  var currentMode = 'page'; // 'page' | 'global'
  var currentHost = '';
  var currentFilter = 'all';
  var searchQuery = '';
  var currentViewMode = 'edit'; // 'edit' | 'preview' | 'split'
  var saveTimer = null;
  var isInternalChange = false;

  function tText(k) {
    if (typeof window.t === 'function') return window.t(k);
    if (typeof window.getI18nText === 'function') return window.getI18nText(k);
    return k;
  }

  function getActiveNote() {
    if (!notes.length) return null;
    for (var i = 0; i < notes.length; i++) {
      if (notes[i].id === activeNoteId) return notes[i];
    }
    return notes[0];
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

  var LINE_HEIGHT = 20;
  var isGutterScheduled = false;
  var lastGutterLineCount = -1;
  var lastGutterTop = -1;
  var previewDebounceTimer = null;
  var counterRafId = null;

  function countLines(str) {
    if (!str) return 1;
    var count = 1;
    for (var i = 0; i < str.length; i++) {
      if (str.charCodeAt(i) === 10) count++;
    }
    return count;
  }

  function updateLineNumbers(force) {
    var editor = document.getElementById('scratchpad-editor');
    var gutter = document.getElementById('scratchpad-line-numbers');
    var linesBadge = document.getElementById('scratchpad-lines-badge');
    if (!editor || !gutter) return;

    var val = editor.value || '';
    var linesCount = countLines(val);
    var scrollTop = editor.scrollTop;

    // Avoid redundant gutter DOM reflows if line count and scroll bucket did not change
    if (!force && linesCount === lastGutterLineCount && Math.abs(scrollTop - lastGutterTop) < 10) {
      return;
    }
    lastGutterLineCount = linesCount;
    lastGutterTop = scrollTop;

    // 1. Dynamic Gutter Width: cleanly scales for 1 digit up to 100,000+ lines
    var digits = Math.max(2, String(linesCount).length);
    var targetWidth = Math.max(30, digits * 8 + 14);
    gutter.style.width = targetWidth + 'px';
    gutter.style.minWidth = targetWidth + 'px';

    // 2. High-performance rendering: Virtualized window for massive line counts (> 1,000 lines)
    if (linesCount <= 1000) {
      gutter.style.paddingTop = '10px';
      gutter.style.paddingBottom = '10px';
      var lineNums = [];
      for (var i = 1; i <= linesCount; i++) {
        lineNums.push(i);
      }
      gutter.textContent = lineNums.join('\n');
    } else {
      // Virtual window: only renders visible lines in the viewport with buffer
      var clientH = editor.clientHeight || 300;
      var firstLine = Math.max(1, Math.floor(scrollTop / LINE_HEIGHT) - 8);
      var lastLine = Math.min(linesCount, Math.ceil((scrollTop + clientH) / LINE_HEIGHT) + 12);

      var nums = [];
      for (var j = firstLine; j <= lastLine; j++) {
        nums.push(j);
      }
      gutter.style.paddingTop = (10 + (firstLine - 1) * LINE_HEIGHT) + 'px';
      gutter.style.paddingBottom = (10 + (linesCount - lastLine) * LINE_HEIGHT) + 'px';
      gutter.textContent = nums.join('\n');
    }

    gutter.scrollTop = scrollTop;

    if (linesBadge) {
      var template = tText('scratchpad_lines_counter') || '{0} dòng';
      linesBadge.textContent = template.replace('{0}', linesCount.toLocaleString());
    }
  }

  function syncEditorScroll() {
    var editor = document.getElementById('scratchpad-editor');
    var gutter = document.getElementById('scratchpad-line-numbers');
    if (!editor || !gutter) return;

    gutter.scrollTop = editor.scrollTop;

    if (!isGutterScheduled) {
      isGutterScheduled = true;
      requestAnimationFrame(function () {
        isGutterScheduled = false;
        updateLineNumbers(false);
      });
    }
  }

  function updateCountersImmediate() {
    var editor = document.getElementById('scratchpad-editor');
    var counter = document.getElementById('scratchpad-counter');
    if (!editor || !counter) return;

    var val = editor.value || '';
    var chars = val.length;
    var words = val.trim() ? val.trim().split(/\s+/).length : 0;
    var template = tText('scratchpad_words_counter') || '{0} từ • {1} ký tự';
    counter.textContent = template.replace('{0}', String(words)).replace('{1}', String(chars));

    updateLineNumbers(false);

    if (currentViewMode === 'preview' || currentViewMode === 'split') {
      clearTimeout(previewDebounceTimer);
      previewDebounceTimer = setTimeout(function () {
        renderMarkdownPreview();
      }, 120);
    }
  }

  function updateCounters() {
    if (counterRafId) cancelAnimationFrame(counterRafId);
    counterRafId = requestAnimationFrame(function () {
      counterRafId = null;
      updateCountersImmediate();
    });
  }

  function getLegacyStorageKey() {
    if (currentMode === 'global') return 'sf_scratchpad_global';
    return 'sf_scratchpad_page_' + (currentHost || 'general');
  }

  function saveToStorage() {
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) return;

    var active = getActiveNote();
    var obj = {
      sf_scratchpad_notes: notes,
      sf_scratchpad_active_id: activeNoteId
    };

    // Keep backwards compatibility with floating scratchpad & clipper
    if (active) {
      var legacyKey = getLegacyStorageKey();
      obj[legacyKey] = active.content;
    }

    chrome.storage.local.set(obj, function () {
      updateStatus('saved');
    });
  }

  function scheduleSave() {
    updateStatus('saving');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      saveToStorage();
    }, 280);
  }

  function populateEditorFromActiveNote() {
    var active = getActiveNote();
    var editor = document.getElementById('scratchpad-editor');
    var titleInput = document.getElementById('scratchpad-note-title');
    var catSelect = document.getElementById('scratchpad-select-category');
    var pinBtn = document.getElementById('scratchpad-btn-pin');

    if (!active) {
      if (editor) editor.value = '';
      if (titleInput) titleInput.value = '';
      if (pinBtn) pinBtn.classList.remove('pinned');
      updateCounters();
      return;
    }

    isInternalChange = true;
    if (editor) editor.value = active.content || '';
    if (titleInput) titleInput.value = active.title || '';
    var diffSelect = document.getElementById('scratchpad-select-difficulty');
    if (catSelect) catSelect.value = active.category || 'general';
    if (diffSelect) diffSelect.value = active.difficulty || '';
    if (pinBtn) {
      pinBtn.classList.toggle('pinned', !!active.pinned);
    }
    isInternalChange = false;

    updateCounters();
    if (currentViewMode === 'preview' || currentViewMode === 'split') renderMarkdownPreview();
  }

  function updateNotesCountBadge() {
    var countEl = document.getElementById('scratchpad-notes-count');
    if (countEl) {
      countEl.textContent = String(notes.length);
    }
  }

  function renderNotesList() {
    var container = document.getElementById('scratchpad-notes-items');
    if (!container) return;

    updateNotesCountBadge();

    var filtered = notes.filter(function (n) {
      if (currentFilter === 'pinned' && !n.pinned) return false;
      if (currentFilter !== 'all' && currentFilter !== 'pinned' && n.category !== currentFilter) return false;
      if (searchQuery) {
        var q = searchQuery.toLowerCase();
        var matchTitle = (n.title || '').toLowerCase().indexOf(q) !== -1;
        var matchContent = (n.content || '').toLowerCase().indexOf(q) !== -1;
        var matchCat = (n.category || '').toLowerCase().indexOf(q) !== -1;
        if (!matchTitle && !matchContent && !matchCat) return false;
      }
      return true;
    });

    // Sort: Pinned first, then newest updated
    filtered.sort(function (a, b) {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return (b.updatedAt || 0) - (a.updatedAt || 0);
    });

    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    if (filtered.length === 0) {
      var emptyDiv = document.createElement('div');
      emptyDiv.className = 'scratchpad-notes-empty';
      emptyDiv.textContent = tText('scratchpad_empty_list') || 'Chưa có ghi chú nào.';
      container.appendChild(emptyDiv);
      return;
    }

    filtered.forEach(function (n) {
      var card = document.createElement('div');
      card.className = 'scratchpad-note-card' + (n.id === activeNoteId ? ' active' : '');

      var header = document.createElement('div');
      header.className = 'scratchpad-note-card-header';

      var titleEl = document.createElement('span');
      titleEl.className = 'scratchpad-note-card-title';
      titleEl.textContent = (n.pinned ? '📌 ' : '') + (n.title || tText('scratchpad_untitled'));

      var badge = document.createElement('span');
      badge.className = 'scratchpad-note-card-badge cat-' + (n.category || 'general');
      badge.textContent = n.category === 'leetcode' ? 'LeetCode' :
                          n.category === 'exam' ? 'Thi/Ôn' :
                          n.category === 'dev' ? 'Dev' : 'Chung';

      header.appendChild(titleEl);
      header.appendChild(badge);

      var snippet = document.createElement('div');
      snippet.className = 'scratchpad-note-card-snippet';
      var cleanSnippet = (n.content || '').replace(/[#*`>_-]/g, ' ').replace(/\s+/g, ' ').trim();
      snippet.textContent = cleanSnippet || '...';

      var footer = document.createElement('div');
      footer.className = 'scratchpad-note-card-footer';

      var timeEl = document.createElement('span');
      var dateObj = new Date(n.updatedAt || Date.now());
      timeEl.textContent = dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      var actions = document.createElement('div');
      actions.className = 'scratchpad-note-card-actions';

      // Pin button
      var pinBtn = document.createElement('button');
      pinBtn.type = 'button';
      pinBtn.className = 'scratchpad-card-action-btn';
      pinBtn.title = n.pinned ? tText('scratchpad_unpin_note') : tText('scratchpad_pin_note');
      pinBtn.textContent = n.pinned ? '★' : '☆';
      pinBtn.onclick = function (e) {
        e.stopPropagation();
        togglePinNote(n.id);
      };

      // Duplicate button
      var dupBtn = document.createElement('button');
      dupBtn.type = 'button';
      dupBtn.className = 'scratchpad-card-action-btn';
      dupBtn.title = tText('scratchpad_duplicate_note');
      dupBtn.textContent = '⎘';
      dupBtn.onclick = function (e) {
        e.stopPropagation();
        duplicateNote(n.id);
      };

      // Export button for this note
      var expBtn = document.createElement('button');
      expBtn.type = 'button';
      expBtn.className = 'scratchpad-card-action-btn btn-export';
      expBtn.title = tText('scratchpad_tip_export');
      expBtn.textContent = '↗';
      expBtn.onclick = function (e) {
        e.stopPropagation();
        openExportMenu(expBtn, n);
      };

      // Delete button
      var delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'scratchpad-card-action-btn btn-delete';
      delBtn.title = tText('scratchpad_delete_note');
      delBtn.textContent = '🗑';
      delBtn.onclick = function (e) {
        e.stopPropagation();
        deleteNote(n.id);
      };

      actions.appendChild(pinBtn);
      actions.appendChild(dupBtn);
      actions.appendChild(expBtn);
      actions.appendChild(delBtn);

      footer.appendChild(timeEl);
      footer.appendChild(actions);

      card.appendChild(header);
      card.appendChild(snippet);
      card.appendChild(footer);

      card.onclick = function () {
        switchNote(n.id);
        toggleNotesDrawer(false);
      };

      container.appendChild(card);
    });
  }

  function toggleNotesDrawer(forceOpen) {
    var drawer = document.getElementById('scratchpad-notes-drawer');
    if (!drawer) return;

    var isOpen = drawer.style.display !== 'none';
    var shouldOpen = (typeof forceOpen === 'boolean') ? forceOpen : !isOpen;

    drawer.style.display = shouldOpen ? 'flex' : 'none';
    if (shouldOpen) {
      renderNotesList();
      var searchInput = document.getElementById('scratchpad-search-input');
      if (searchInput) searchInput.focus();
    }
  }

  function createNewNote(opts) {
    opts = opts || {};
    var newId = 'note_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    var newNote = {
      id: newId,
      title: opts.title || (tText('scratchpad_untitled') || 'Ghi chú mới'),
      content: opts.content || '',
      category: opts.category || 'general',
      pinned: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    notes.unshift(newNote);
    activeNoteId = newId;

    populateEditorFromActiveNote();
    renderNotesList();
    scheduleSave();

    if (typeof window.showToast === 'function') {
      window.showToast(tText('scratchpad_note_created') || 'Đã tạo ghi chú mới!');
    }
  }

  function switchNote(id) {
    if (activeNoteId === id) return;
    activeNoteId = id;
    populateEditorFromActiveNote();
    renderNotesList();
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ sf_scratchpad_active_id: id });
    }
  }

  function deleteNote(id) {
    var target = null;
    for (var i = 0; i < notes.length; i++) {
      if (notes[i].id === id) { target = notes[i]; break; }
    }
    if (!target) return;

    var confirmMsg = (tText('scratchpad_confirm_delete') || 'Bạn có chắc muốn xóa ghi chú "{0}" không?')
      .replace('{0}', target.title || tText('scratchpad_untitled'));

    if (window.confirm(confirmMsg)) {
      notes = notes.filter(function (n) { return n.id !== id; });
      if (activeNoteId === id) {
        if (notes.length > 0) {
          activeNoteId = notes[0].id;
        } else {
          createNewNote();
          return;
        }
      }
      populateEditorFromActiveNote();
      renderNotesList();
      scheduleSave();
    }
  }

  function duplicateNote(id) {
    var target = null;
    for (var i = 0; i < notes.length; i++) {
      if (notes[i].id === id) { target = notes[i]; break; }
    }
    if (!target) return;

    createNewNote({
      title: target.title + ' (Copy)',
      content: target.content,
      category: target.category
    });
  }

  function togglePinNote(id) {
    for (var i = 0; i < notes.length; i++) {
      if (notes[i].id === id) {
        notes[i].pinned = !notes[i].pinned;
        notes[i].updatedAt = Date.now();
        break;
      }
    }
    var active = getActiveNote();
    var pinBtn = document.getElementById('scratchpad-btn-pin');
    if (pinBtn && active) {
      pinBtn.classList.toggle('pinned', !!active.pinned);
    }
    renderNotesList();
    scheduleSave();
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

    var active = getActiveNote();
    if (active) {
      active.content = editor.value;
      active.updatedAt = Date.now();
      scheduleSave();
    }
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

    var active = getActiveNote();
    if (active) {
      active.content = editor.value;
      active.updatedAt = Date.now();
      scheduleSave();
    }
  }

  // Helper: Tokenize inline formatting safely without dynamic innerHTML
  function renderInlineFormatted(text, parentElement) {
    if (!text) return;
    var INLINE_REGEX = /(`[^`\n]+`|==[^=\n]+==|\$[^\$\n]+\$|\*\*\*[^*\n]+\*\*\*|\*\*[^*\n]+\*\*|\*(?:(?!\*)[^*\n])+\*|~~[^~\n]+~~|\[[^\]\n]+\]\(https?:\/\/[^\s\)]+\))/g;
    var lastIndex = 0;
    var match;

    while ((match = INLINE_REGEX.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parentElement.appendChild(document.createTextNode(text.substring(lastIndex, match.index)));
      }
      var token = match[0];
      if (token.startsWith('`') && token.endsWith('`')) {
        var code = document.createElement('code');
        code.textContent = token.slice(1, -1);
        parentElement.appendChild(code);
      } else if (token.startsWith('==') && token.endsWith('==')) {
        var mark = document.createElement('mark');
        mark.className = 'scratchpad-mark';
        mark.textContent = token.slice(2, -2);
        parentElement.appendChild(mark);
      } else if (token.startsWith('$') && token.endsWith('$')) {
        var mathBadge = document.createElement('span');
        mathBadge.className = 'scratchpad-math-badge';
        var mathSym = document.createElement('span');
        mathSym.className = 'math-sym';
        mathSym.textContent = 'ƒ';
        var mathBody = document.createElement('span');
        mathBody.className = 'math-body';
        mathBody.textContent = token.slice(1, -1);
        mathBadge.appendChild(mathSym);
        mathBadge.appendChild(mathBody);
        parentElement.appendChild(mathBadge);
      } else if (token.startsWith('***') && token.endsWith('***')) {
        var strong = document.createElement('strong');
        var em = document.createElement('em');
        em.textContent = token.slice(3, -3);
        strong.appendChild(em);
        parentElement.appendChild(strong);
      } else if (token.startsWith('**') && token.endsWith('**')) {
        var strong2 = document.createElement('strong');
        strong2.textContent = token.slice(2, -2);
        parentElement.appendChild(strong2);
      } else if (token.startsWith('*') && token.endsWith('*')) {
        var em2 = document.createElement('em');
        em2.textContent = token.slice(1, -1);
        parentElement.appendChild(em2);
      } else if (token.startsWith('~~') && token.endsWith('~~')) {
        var del = document.createElement('del');
        del.textContent = token.slice(2, -2);
        parentElement.appendChild(del);
      } else if (token.startsWith('[')) {
        var linkM = token.match(/^\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)$/);
        if (linkM) {
          var a = document.createElement('a');
          a.href = linkM[2];
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          a.textContent = linkM[1];
          parentElement.appendChild(a);
        } else {
          parentElement.appendChild(document.createTextNode(token));
        }
      }
      lastIndex = INLINE_REGEX.lastIndex;
    }

    if (lastIndex < text.length) {
      parentElement.appendChild(document.createTextNode(text.substring(lastIndex)));
    }
  }

  // Helper: Code syntax highlighting without external libraries
  function highlightCodeTokens(codeText, lang, codeElement) {
    if (!codeText) return;
    var CODE_TOKEN_RE = /(\/\/[^\n]*|#[^\n]*|\/\*[\s\S]*?\*\/|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`|\b\d+(?:\.\d+)?\b|\b(?:def|class|return|if|elif|else|for|while|in|import|from|as|try|except|catch|finally|with|lambda|yield|pass|raise|throw|async|await|const|let|var|function|new|this|typeof|instanceof|switch|case|break|continue|default|public|private|protected|static|final|struct|void|bool|boolean|int|float|double|char|string|nullptr|null|nil|true|false|True|False|None|self|SELECT|FROM|WHERE|INSERT|INTO|UPDATE|DELETE|JOIN|ORDER|BY|GROUP|LIMIT|fn|pub|mut|impl|trait)\b|\b(?:console|print|len|range|str|list|dict|set|vector|map|std|Array|Object|String|Number|Boolean|Promise|Math|JSON|document|window)\b)/g;

    var keywords = new Set([
      'def','class','return','if','elif','else','for','while','in','import','from','as',
      'try','except','catch','finally','with','lambda','yield','pass','raise','throw',
      'async','await','const','let','var','function','new','this','typeof','instanceof',
      'switch','case','break','continue','default','public','private','protected','static',
      'final','struct','void','bool','boolean','int','float','double','char','string',
      'nullptr','null','nil','true','false','True','False','None','self',
      'SELECT','FROM','WHERE','INSERT','INTO','UPDATE','DELETE','JOIN','ORDER','BY','GROUP','LIMIT',
      'fn','pub','mut','impl','trait'
    ]);

    var builtins = new Set([
      'console','print','len','range','str','list','dict','set','vector','map','std',
      'Array','Object','String','Number','Boolean','Promise','Math','JSON','document','window'
    ]);

    var lastIndex = 0;
    var match;

    while ((match = CODE_TOKEN_RE.exec(codeText)) !== null) {
      if (match.index > lastIndex) {
        codeElement.appendChild(document.createTextNode(codeText.substring(lastIndex, match.index)));
      }
      var tok = match[0];
      var span = document.createElement('span');

      if (tok.startsWith('//') || tok.startsWith('#') || tok.startsWith('/*')) {
        span.className = 'sf-code-comment';
      } else if (tok.startsWith('"') || tok.startsWith("'") || tok.startsWith('`')) {
        span.className = 'sf-code-string';
      } else if (/^\d/.test(tok)) {
        span.className = 'sf-code-number';
      } else if (keywords.has(tok)) {
        span.className = 'sf-code-keyword';
      } else if (builtins.has(tok)) {
        span.className = 'sf-code-builtin';
      } else {
        span = null;
      }

      if (span) {
        span.textContent = tok;
        codeElement.appendChild(span);
      } else {
        codeElement.appendChild(document.createTextNode(tok));
      }
      lastIndex = CODE_TOKEN_RE.lastIndex;
    }

    if (lastIndex < codeText.length) {
      codeElement.appendChild(document.createTextNode(codeText.substring(lastIndex)));
    }
  }

  // Safe Markdown Preview Renderer (No eval, strict sanitization)
  function renderMarkdownPreview() {
    var editor = document.getElementById('scratchpad-editor');
    var preview = document.getElementById('scratchpad-preview-pane');
    if (!editor || !preview) return;

    var raw = editor.value || '';

    // Clear preview
    while (preview.firstChild) {
      preview.removeChild(preview.firstChild);
    }

    if (!raw.trim()) {
      var em = document.createElement('p');
      em.className = 'scratchpad-preview-em';
      em.textContent = tText('scratchpad_placeholder') || 'Chưa có nội dung để xem trước.';
      preview.appendChild(em);
      return;
    }

    var lines = raw.split('\n');
    var inCodeBlock = false;
    var codeLang = '';
    var codeLines = [];
    var inTable = false;
    var tableRows = [];
    var currentUl = null;
    var currentOl = null;

    function flushTable() {
      if (!tableRows.length) return;
      var tbl = document.createElement('table');
      var thead = document.createElement('thead');
      var tbody = document.createElement('tbody');
      var colAligns = [];

      // Determine column alignments from delimiter row (e.g., |:---|:---:|---:|)
      tableRows.forEach(function (r) {
        if (r.trim().match(/^\|?[-:\s|]+\|?$/)) {
          var parts = r.split('|').filter(function (_, cIdx, arr) {
            return cIdx > 0 && cIdx < arr.length - 1;
          });
          colAligns = parts.map(function (p) {
            var t = p.trim();
            var leftColon = t.startsWith(':');
            var rightColon = t.endsWith(':');
            if (leftColon && rightColon) return 'center';
            if (rightColon) return 'right';
            return 'left';
          });
        }
      });

      var isHeader = true;
      tableRows.forEach(function (r) {
        if (r.trim().match(/^\|?[-:\s|]+\|?$/)) {
          isHeader = false;
          return;
        }
        var tr = document.createElement('tr');
        var cells = r.split('|').filter(function (_, cIdx, arr) {
          return cIdx > 0 && cIdx < arr.length - 1;
        });
        cells.forEach(function (cellText, cIdx) {
          var cell = document.createElement(isHeader ? 'th' : 'td');
          var align = colAligns[cIdx] || 'left';
          cell.className = 'align-' + align;
          cell.style.textAlign = align;
          renderInlineFormatted(cellText.trim(), cell);
          tr.appendChild(cell);
        });
        if (isHeader) thead.appendChild(tr);
        else tbody.appendChild(tr);
      });

      tbl.appendChild(thead);
      tbl.appendChild(tbody);
      preview.appendChild(tbl);
      tableRows = [];
      inTable = false;
    }

    function flushLists() {
      currentUl = null;
      currentOl = null;
    }

    function flushCodeBlock() {
      if (!codeLines.length && !inCodeBlock) return;
      var container = document.createElement('div');
      container.className = 'scratchpad-code-container';

      var header = document.createElement('div');
      header.className = 'scratchpad-code-header';

      var headerLeft = document.createElement('div');
      headerLeft.className = 'scratchpad-code-header-left';

      var dRed = document.createElement('span'); dRed.className = 'scratchpad-code-dot red';
      var dYel = document.createElement('span'); dYel.className = 'scratchpad-code-dot yellow';
      var dGrn = document.createElement('span'); dGrn.className = 'scratchpad-code-dot green';
      headerLeft.appendChild(dRed);
      headerLeft.appendChild(dYel);
      headerLeft.appendChild(dGrn);

      var langBadge = document.createElement('span');
      langBadge.className = 'scratchpad-lang-badge';
      langBadge.textContent = (codeLang || 'CODE').toUpperCase();
      headerLeft.appendChild(langBadge);

      var copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.className = 'scratchpad-copy-code-btn';
      var copyText = tText('scratchpad_copy_code') || 'Sao chép';
      copyBtn.textContent = copyText;

      var fullCodeStr = codeLines.join('\n');
      copyBtn.addEventListener('click', (function (codeToCopy, btn, baseText) {
        return function (e) {
          e.stopPropagation();
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(codeToCopy).then(function () {
              btn.textContent = '✓ ' + (tText('scratchpad_copied') || 'Đã chép');
              btn.classList.add('copied');
              setTimeout(function () {
                btn.textContent = baseText;
                btn.classList.remove('copied');
              }, 1500);
            });
          }
        };
      })(fullCodeStr, copyBtn, copyText));

      header.appendChild(headerLeft);
      header.appendChild(copyBtn);

      var pre = document.createElement('pre');
      pre.className = 'scratchpad-code-pre';
      var code = document.createElement('code');
      highlightCodeTokens(fullCodeStr, codeLang, code);
      pre.appendChild(code);

      container.appendChild(header);
      container.appendChild(pre);
      preview.appendChild(container);

      codeLines = [];
      codeLang = '';
      inCodeBlock = false;
    }

    var currentBlockAlign = null;

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];

      // Block alignment tags <div align="..."> and </div>
      var alignStartM = line.trim().match(/^<div\s+align=["'](left|center|right|justify)["']\s*>/i);
      if (alignStartM) {
        flushLists();
        currentBlockAlign = alignStartM[1].toLowerCase();
        continue;
      } else if (line.trim().toLowerCase() === '</div>') {
        flushLists();
        currentBlockAlign = null;
        continue;
      }

      // Code block start/end
      if (line.trim().startsWith('```')) {
        if (inTable) flushTable();
        flushLists();
        if (inCodeBlock) {
          flushCodeBlock();
        } else {
          inCodeBlock = true;
          codeLang = line.trim().substring(3).trim();
          codeLines = [];
        }
        continue;
      }

      if (inCodeBlock) {
        codeLines.push(line);
        continue;
      }

      // Markdown Tables
      if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
        flushLists();
        inTable = true;
        tableRows.push(line);
        continue;
      } else if (inTable) {
        flushTable();
      }

      // Horizontal Rule
      if (/^(\*{3,}|-{3,}|_{3,})$/.test(line.trim())) {
        flushLists();
        var hr = document.createElement('hr');
        hr.className = 'scratchpad-preview-hr';
        preview.appendChild(hr);
        continue;
      }

      // Headings (supports '# Heading' or '#Heading')
      var headingMatch = line.match(/^(#{1,4})\s*(.*)$/);
      if (headingMatch && headingMatch[2].trim()) {
        flushLists();
        var level = headingMatch[1].length;
        var hTag = 'h' + level;
        var hEl = document.createElement(hTag);
        if (currentBlockAlign) {
          hEl.className = 'scratchpad-align-' + currentBlockAlign;
          hEl.style.textAlign = currentBlockAlign;
        }
        renderInlineFormatted(headingMatch[2], hEl);
        preview.appendChild(hEl);
      } else if (line.startsWith('> ')) {
        flushLists();
        var bq = document.createElement('blockquote');
        if (currentBlockAlign) {
          bq.className = 'scratchpad-align-' + currentBlockAlign;
          bq.style.textAlign = currentBlockAlign;
        }
        renderInlineFormatted(line.substring(2), bq);
        preview.appendChild(bq);
      } else if (/^[-*]\s+\[[ xX]\]\s+/.test(line.trim())) {
        // Interactive Checklist
        flushLists();
        var isChecked = /^[-*]\s+\[[xX]\]\s+/.test(line.trim());
        var taskItem = document.createElement('div');
        taskItem.className = 'scratchpad-task-item';

        var chk = document.createElement('input');
        chk.type = 'checkbox';
        chk.className = 'scratchpad-task-checkbox';
        chk.checked = isChecked;

        var taskLabel = document.createElement('span');
        taskLabel.className = 'scratchpad-task-label' + (isChecked ? ' checked' : '');
        var taskContent = line.trim().replace(/^[-*]\s+\[[ xX]\]\s+/, '');
        renderInlineFormatted(taskContent, taskLabel);

        (function (lineIdx, checkbox, label) {
          checkbox.addEventListener('change', function (e) {
            e.stopPropagation();
            var checked = checkbox.checked;
            label.classList.toggle('checked', checked);
            var ed = document.getElementById('scratchpad-editor');
            if (!ed) return;
            var curLines = ed.value.split('\n');
            if (lineIdx < curLines.length) {
              if (checked) {
                curLines[lineIdx] = curLines[lineIdx].replace(/^([-*]\s+\[)[ xX](\]\s+)/, '$1x$2');
              } else {
                curLines[lineIdx] = curLines[lineIdx].replace(/^([-*]\s+\[)[ xX](\]\s+)/, '$1 $2');
              }
              ed.value = curLines.join('\n');
              var act = getActiveNote();
              if (act) {
                act.content = ed.value;
                act.updatedAt = Date.now();
                scheduleSave();
              }
              updateCounters();
            }
          });
        })(i, chk, taskLabel);

        taskItem.appendChild(chk);
        taskItem.appendChild(taskLabel);
        preview.appendChild(taskItem);
      } else if (/^\s*(\d+)\.\s+(.*)$/.test(line)) {
        // Ordered List
        currentUl = null;
        if (!currentOl) {
          currentOl = document.createElement('ol');
          preview.appendChild(currentOl);
        }
        var mOl = line.match(/^\s*(\d+)\.\s+(.*)$/);
        var liOl = document.createElement('li');
        renderInlineFormatted(mOl[2], liOl);
        currentOl.appendChild(liOl);
      } else if (/^\s*[-*+]\s+(.*)$/.test(line)) {
        // Unordered List
        currentOl = null;
        if (!currentUl) {
          currentUl = document.createElement('ul');
          preview.appendChild(currentUl);
        }
        var mUl = line.match(/^\s*[-*+]\s+(.*)$/);
        var liUl = document.createElement('li');
        renderInlineFormatted(mUl[1], liUl);
        currentUl.appendChild(liUl);
      } else if (line.trim()) {
        flushLists();
        var p = document.createElement('p');
        if (currentBlockAlign) {
          p.className = 'scratchpad-align-' + currentBlockAlign;
          p.style.textAlign = currentBlockAlign;
        }
        renderInlineFormatted(line, p);
        preview.appendChild(p);
      } else {
        flushLists();
        var emptyLine = document.createElement('div');
        emptyLine.className = 'scratchpad-preview-empty-line';
        preview.appendChild(emptyLine);
      }
    }

    if (inCodeBlock) flushCodeBlock();
    if (inTable) flushTable();
  }

  function setViewMode(mode) {
    currentViewMode = mode;
    var editorWrap = document.getElementById('scratchpad-editor-wrap');
    var editorContainer = document.getElementById('scratchpad-editor-container');
    var previewPane = document.getElementById('scratchpad-preview-pane');
    var tabEdit = document.getElementById('scratchpad-tab-edit');
    var tabPreview = document.getElementById('scratchpad-tab-preview');
    var tabSplit = document.getElementById('scratchpad-tab-split');
    var btnPreview = document.getElementById('scratchpad-btn-preview');

    if (!editorWrap || !editorContainer || !previewPane) return;

    if (tabEdit) tabEdit.classList.toggle('active', mode === 'edit');
    if (tabPreview) tabPreview.classList.toggle('active', mode === 'preview');
    if (tabSplit) tabSplit.classList.toggle('active', mode === 'split');
    if (btnPreview) btnPreview.classList.toggle('active', mode === 'preview' || mode === 'split');

    if (mode === 'edit') {
      editorWrap.classList.remove('split-view');
      editorContainer.style.display = 'flex';
      previewPane.style.display = 'none';
    } else if (mode === 'preview') {
      editorWrap.classList.remove('split-view');
      editorContainer.style.display = 'none';
      previewPane.style.display = 'block';
      renderMarkdownPreview();
    } else if (mode === 'split') {
      editorWrap.classList.add('split-view');
      editorContainer.style.display = 'flex';
      previewPane.style.display = 'block';
      renderMarkdownPreview();
    }
  }

  function togglePreview() {
    if (currentViewMode === 'edit') {
      setViewMode('preview');
    } else {
      setViewMode('edit');
    }
  }

  var currentFontFamily = 'mono';
  var currentFontSize = '12px';

  function applyFontSettings(familyKey, sizeVal) {
    if (familyKey) currentFontFamily = familyKey;
    if (sizeVal) currentFontSize = sizeVal;

    var editor = document.getElementById('scratchpad-editor');
    var preview = document.getElementById('scratchpad-preview-pane');
    var fontClasses = ['font-mono', 'font-system', 'font-serif', 'font-modern', 'font-clean', 'font-hand', 'font-sans'];

    [editor, preview].forEach(function (el) {
      if (!el) return;
      fontClasses.forEach(function (cls) { el.classList.remove(cls); });
      el.classList.add('font-' + (currentFontFamily || 'mono'));
      if (currentFontSize) el.style.fontSize = currentFontSize;
    });

    var btnFont = document.getElementById('scratchpad-btn-font');
    if (btnFont) {
      btnFont.classList.toggle('active', currentFontFamily !== 'mono');
    }

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({
        sf_scratchpad_font_family: currentFontFamily,
        sf_scratchpad_font_size: currentFontSize
      });
    }
  }

  function toggleFont() {
    var nextFont = currentFontFamily === 'mono' ? 'system' : 'mono';
    applyFontSettings(nextFont, null);
  }
  window.sfToggleScratchpadFont = toggleFont;

  // Export functions
  function downloadFile(content, fileName, mimeType) {
    var blob = new Blob([content], { type: mimeType });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 150);
  }

  function exportSingleNote(targetNote, format) {
    var noteObj = targetNote || getActiveNote();
    if (!noteObj) return;

    var safeTitle = (noteObj.title || 'untitled').replace(/[^a-zA-Z0-9_\-\u00C0-\u024F\u1EA0-\u1EF9]/g, '_');
    if (format === 'md') {
      var mdMeta = '# ' + (noteObj.title || 'Untitled') + '\n' +
        (noteObj.category ? '> Thể loại: ' + noteObj.category + '\n' : '') +
        (noteObj.difficulty ? '> Độ khó: ' + noteObj.difficulty + '\n' : '') +
        '> Ngày cập nhật: ' + new Date(noteObj.updatedAt || Date.now()).toLocaleString() + '\n\n';
      downloadFile(mdMeta + (noteObj.content || ''), safeTitle + '.md', 'text/markdown;charset=utf-8');
    } else if (format === 'txt') {
      downloadFile(noteObj.content || '', safeTitle + '.txt', 'text/plain;charset=utf-8');
    } else if (format === 'html') {
      var htmlContent = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' +
        (noteObj.title || 'ScholarFlow Note') +
        '</title><style>body{font-family:system-ui,-apple-system,sans-serif;max-width:840px;margin:30px auto;padding:0 24px;line-height:1.65;color:#1e293b;background:#f8fafc;}h1,h2,h3{color:#0f172a;}pre{background:#090d16;color:#e2e8f0;padding:12px;border-radius:6px;overflow-x:auto;}code{font-family:monospace;background:rgba(0,0,0,0.06);padding:2px 4px;border-radius:3px;}table{border-collapse:collapse;width:100%;margin:15px 0;}th,td{border:1px solid #cbd5e1;padding:8px;text-align:left;}th{background:#e2e8f0;}</style></head><body><h1>' +
        (noteObj.title || 'Untitled') + '</h1><p style="color:#64748b;font-size:12px;">Ngày: ' + new Date(noteObj.updatedAt || Date.now()).toLocaleString() + '</p><pre style="white-space:pre-wrap;font-family:inherit;background:#ffffff;color:#334155;border:1px solid #e2e8f0;padding:16px;">' + (noteObj.content || '') + '</pre></body></html>';
      downloadFile(htmlContent, safeTitle + '.html', 'text/html;charset=utf-8');
    } else if (format === 'json') {
      var singleJson = {
        app: 'ScholarFlow',
        version: '2.5.7',
        exportedAt: new Date().toISOString(),
        note: noteObj
      };
      downloadFile(JSON.stringify(singleJson, null, 2), safeTitle + '.json', 'application/json;charset=utf-8');
    }

    if (typeof window.showToast === 'function') {
      var msg = (tText('scratchpad_export_toast') || '✓ Đã xuất ghi chú "{0}" ({1})!')
        .replace('{0}', noteObj.title || 'Untitled')
        .replace('{1}', format.toUpperCase());
      window.showToast(msg);
    }
  }

  function exportAllNotes(format) {
    if (!notes.length) return;
    if (format === 'md') {
      var combinedMd = notes.map(function (n) {
        return '# ' + (n.title || 'Untitled') + '\n' +
          (n.category ? '> Thể loại: ' + n.category + '\n' : '') +
          (n.difficulty ? '> Độ khó: ' + n.difficulty + '\n' : '') +
          '> Ngày: ' + new Date(n.updatedAt || Date.now()).toLocaleString() + '\n\n' +
          (n.content || '') + '\n\n---\n';
      }).join('\n');
      downloadFile(combinedMd, 'scholarflow_all_notes.md', 'text/markdown;charset=utf-8');
    } else if (format === 'json') {
      var backupData = {
        app: 'ScholarFlow',
        version: '2.5.7',
        exportedAt: new Date().toISOString(),
        total: notes.length,
        notes: notes
      };
      downloadFile(JSON.stringify(backupData, null, 2), 'scholarflow_notes_backup.json', 'application/json;charset=utf-8');
    }

    if (typeof window.showToast === 'function') {
      var msgAll = (tText('scratchpad_export_all_toast') || '✓ Đã xuất tất cả {0} ghi chú ({1})!')
        .replace('{0}', String(notes.length))
        .replace('{1}', format.toUpperCase());
      window.showToast(msgAll);
    }
  }

  function printNoteAsPdf(targetNote) {
    var noteObj = targetNote || getActiveNote();
    if (!noteObj) return;
    var printWin = window.open('', '_blank');
    if (!printWin) return;
    printWin.document.title = noteObj.title || 'ScholarFlow Note';
    var doc = printWin.document;
    var style = doc.createElement('style');
    style.textContent = 'body{font-family:system-ui,-apple-system,sans-serif;max-width:800px;margin:20px auto;padding:0 20px;line-height:1.6;color:#111827;}h1{border-bottom:2px solid #e5e7eb;padding-bottom:8px;}pre{background:#f3f4f6;padding:12px;border-radius:6px;white-space:pre-wrap;font-family:inherit;}table{border-collapse:collapse;width:100%;margin:12px 0;}th,td{border:1px solid #d1d5db;padding:6px 10px;text-align:left;}th{background:#f9fafb;}';
    doc.head.appendChild(style);
    var h1 = doc.createElement('h1');
    h1.textContent = noteObj.title || 'Untitled';
    doc.body.appendChild(h1);
    var p = doc.createElement('p');
    p.className = 'scratchpad-menu-desc';
    p.textContent = (tText('scratchpad_export_pdf_print') || 'Print') + ' • ' + new Date().toLocaleString();
    doc.body.appendChild(p);
    var pre = doc.createElement('pre');
    pre.textContent = noteObj.content || '';
    doc.body.appendChild(pre);
    printWin.focus();
    setTimeout(function () {
      printWin.print();
    }, 250);
  }
  function openExportMenu(anchorBtn, specificNote) {
    closeFloatingMenu();
    var menu = document.createElement('div');
    menu.className = 'scratchpad-floating-menu';

    var head = document.createElement('div');
    head.className = 'scratchpad-menu-header';
    head.textContent = tText('scratchpad_export_menu_title') || 'TÙY CHỌN XUẤT GHI CHÚ';
    menu.appendChild(head);

    var target = specificNote || getActiveNote();
    if (target) {
      var subHead1 = document.createElement('div');
      subHead1.className = 'scratchpad-menu-subhead';
      subHead1.textContent = (tText('scratchpad_export_active_title') || 'GHI CHÚ HIỆN TẠI') + ': ' + (target.title || 'Untitled');
      menu.appendChild(subHead1);

      var options = [
        { name: tText('scratchpad_export_md') || 'Xuất Markdown (.md)', ext: 'md', badge: '.md' },
        { name: tText('scratchpad_export_txt') || 'Xuất văn bản thô (.txt)', ext: 'txt', badge: '.txt' },
        { name: tText('scratchpad_export_html') || 'Xuất trang HTML (.html)', ext: 'html', badge: '.html' },
        { name: tText('scratchpad_export_pdf_print') || 'In / Lưu PDF (.pdf)', ext: 'pdf', badge: 'PDF 🖨' }
      ];

      options.forEach(function (opt) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'scratchpad-menu-item';
        var lbl = document.createElement('span');
        lbl.textContent = opt.name;
        var bdg = document.createElement('span');
        bdg.className = 'menu-badge';
        bdg.textContent = opt.badge;
        b.appendChild(lbl);
        b.appendChild(bdg);
        b.addEventListener('click', function () {
          closeFloatingMenu();
          if (opt.ext === 'pdf') printNoteAsPdf(target);
          else exportSingleNote(target, opt.ext);
        });
        menu.appendChild(b);
      });
    }

    // Section: All notes
    var subHead2 = document.createElement('div');
    subHead2.className = 'scratchpad-menu-header scratchpad-menu-subhead-spaced';
    subHead2.textContent = tText('scratchpad_export_all_title') || 'TOÀN BỘ GHI CHÚ';
    menu.appendChild(subHead2);

    var allMdBtn = document.createElement('button');
    allMdBtn.type = 'button';
    allMdBtn.className = 'scratchpad-menu-item action-accent';
    var allMdLbl = document.createElement('span');
    allMdLbl.textContent = (tText('scratchpad_btn_export_all') || 'Xuất tất cả') + ' (.md)';
    var allMdBdg = document.createElement('span');
    allMdBdg.className = 'menu-badge';
    allMdBdg.textContent = notes.length + ' notes';
    allMdBtn.appendChild(allMdLbl);
    allMdBtn.appendChild(allMdBdg);
    allMdBtn.addEventListener('click', function () {
      closeFloatingMenu();
      exportAllNotes('md');
    });
    menu.appendChild(allMdBtn);

    var backupBtn = document.createElement('button');
    backupBtn.type = 'button';
    backupBtn.className = 'scratchpad-menu-item action-accent';
    var backupLbl = document.createElement('span');
    backupLbl.textContent = tText('scratchpad_export_backup') || 'Sao lưu toàn bộ (JSON)';
    var backupBdg = document.createElement('span');
    backupBdg.className = 'menu-badge';
    backupBdg.textContent = '.json';
    backupBtn.appendChild(backupLbl);
    backupBtn.appendChild(backupBdg);
    backupBtn.addEventListener('click', function () {
      closeFloatingMenu();
      exportAllNotes('json');
    });
    menu.appendChild(backupBtn);

    positionMenu(menu, anchorBtn);
    document.body.appendChild(menu);
    activeFloatingMenu = menu;
  }

  function handleImportFile(file) {
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function (e) {
      var content = e.target.result;
      if (file.name.endsWith('.json')) {
        try {
          var parsed = JSON.parse(content);
          var incomingNotes = Array.isArray(parsed) ? parsed : (parsed.notes || []);
          if (Array.isArray(incomingNotes) && incomingNotes.length > 0) {
            incomingNotes.forEach(function (inNote) {
              notes.unshift({
                id: 'note_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
                title: inNote.title || file.name.replace('.json', ''),
                content: inNote.content || '',
                category: inNote.category || 'general',
                pinned: !!inNote.pinned,
                createdAt: inNote.createdAt || Date.now(),
                updatedAt: Date.now()
              });
            });
            activeNoteId = notes[0].id;
            populateEditorFromActiveNote();
            renderNotesList();
            scheduleSave();
            var successMsg = (tText('scratchpad_import_success') || 'Đã nhập thành công {0} ghi chú!')
              .replace('{0}', String(incomingNotes.length));
            if (typeof window.showToast === 'function') window.showToast(successMsg);
          }
        } catch (err) {
          if (typeof window.showToast === 'function') {
            window.showToast(tText('scratchpad_import_error') || 'Tệp không đúng định dạng!');
          }
        }
      } else {
        // .md or .txt
        var title = file.name.replace(/\.[^/.]+$/, '');
        createNewNote({
          title: title,
          content: content,
          category: 'general'
        });
      }
    };
    reader.readAsText(file);
  }

  function initHostContext(callback) {
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (tabs && tabs[0] && tabs[0].url) {
          try {
            var parsed = new URL(tabs[0].url);
            currentHost = parsed.hostname;
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

  function initNotesAndStorage() {
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
      createNewNote({ title: 'Ghi chú ban đầu', content: '' });
      return;
    }

    var keys = ['sf_scratchpad_notes', 'sf_scratchpad_active_id', 'sf_scratchpad_global'];
    var pageKey = 'sf_scratchpad_page_' + (currentHost || 'general');
    keys.push(pageKey);

    chrome.storage.local.get(keys, function (res) {
      if (res && Array.isArray(res.sf_scratchpad_notes) && res.sf_scratchpad_notes.length > 0) {
        notes = res.sf_scratchpad_notes;
        activeNoteId = res.sf_scratchpad_active_id || notes[0].id;
      } else {
        // Auto-migration from legacy single-note storage
        notes = [];
        var globVal = res && res.sf_scratchpad_global;
        var pageVal = res && res[pageKey];

        if (globVal && globVal.trim()) {
          notes.push({
            id: 'legacy_global',
            title: tText('scratchpad_mode_global') || 'Toàn cục',
            content: globVal,
            category: 'general',
            pinned: true,
            createdAt: Date.now(),
            updatedAt: Date.now()
          });
        }
        if (pageVal && pageVal.trim() && pageVal !== globVal) {
          notes.push({
            id: 'legacy_page',
            title: (tText('scratchpad_mode_page') || 'Trang này') + ' (' + currentHost + ')',
            content: pageVal,
            category: 'general',
            pinned: false,
            createdAt: Date.now(),
            updatedAt: Date.now()
          });
        }
        if (notes.length === 0) {
          notes.push({
            id: 'note_init_1',
            title: tText('scratchpad_untitled') || 'Ghi chú mới',
            content: '',
            category: 'general',
            pinned: false,
            createdAt: Date.now(),
            updatedAt: Date.now()
          });
        }
        activeNoteId = notes[0].id;
        scheduleSave();
      }

      populateEditorFromActiveNote();
      renderNotesList();
    });
  }


  // ── Advanced DSA Templates & Big-O Complexity Menus ─────────────────
  var activeFloatingMenu = null;

  function closeFloatingMenu() {
    if (activeFloatingMenu && activeFloatingMenu.parentNode) {
      activeFloatingMenu.parentNode.removeChild(activeFloatingMenu);
    }
    activeFloatingMenu = null;
  }

  document.addEventListener('click', function (e) {
    if (activeFloatingMenu && !activeFloatingMenu.contains(e.target)) {
      closeFloatingMenu();
    }
  });

  function positionMenu(menu, anchorBtn) {
    var rect = anchorBtn.getBoundingClientRect();
    menu.style.top = (rect.bottom + window.scrollY + 4) + 'px';
    menu.style.left = Math.max(10, Math.min(window.innerWidth - 290, rect.left + window.scrollX)) + 'px';
  }

  function openDsaTemplateMenu(anchorBtn) {
    closeFloatingMenu();
    var menu = document.createElement('div');
    menu.className = 'scratchpad-floating-menu';

    var head = document.createElement('div');
    head.className = 'scratchpad-menu-header';
    head.textContent = tText('scratchpad_dsa_menu_title') || 'MẪU GIẢI THUẬT & CẤU TRÚC DỮ LIỆU';
    menu.appendChild(head);

    var templates = [{"nameKey":"scratchpad_dsa_tmpl_two_pointers","tag":"O(N)/O(1)","snippet":"\n### Two Pointers (Hai con trỏ)\n- **Đề bài & Ca kiểm thử:** Mảng đã sắp xếp, tìm cặp số có tổng bằng Target.\n- **Độ phức tạp:** Thời gian $O(N)$ • Không gian $O(1)$\n- **Chiến lược:** $L = 0, R = N - 1$, di chuyển thu hẹp phạm vi dựa trên tổng hiện tại.\n\n```javascript\nfunction twoSumSorted(arr, target) {\n  let left = 0, right = arr.length - 1;\n  while (left < right) {\n    const sum = arr[left] + arr[right];\n    if (sum === target) return [left, right];\n    if (sum < target) left++;\n    else right--;\n  }\n  return [-1, -1];\n}\n```\n"},{"nameKey":"scratchpad_dsa_tmpl_sliding_window","tag":"O(N)/O(K)","snippet":"\n### Sliding Window (Cửa sổ trượt)\n- **Ứng dụng:** Chuỗi/mảng con dài nhất không lặp ký tự, tổng mảng con cố định size $K$.\n- **Độ phức tạp:** Thời gian $O(N)$ • Không gian $O(K)$\n\n```javascript\nfunction maxSubArraySum(arr, k) {\n  let maxSum = 0, windowSum = 0;\n  for (let i = 0; i < k; i++) windowSum += arr[i];\n  maxSum = windowSum;\n  for (let i = k; i < arr.length; i++) {\n    windowSum += arr[i] - arr[i - k];\n    maxSum = Math.max(maxSum, windowSum);\n  }\n  return maxSum;\n}\n```\n"},{"nameKey":"scratchpad_dsa_tmpl_binary_search","tag":"O(log N)","snippet":"\n### Binary Search (Tìm kiếm nhị phân)\n- **Điều kiện:** Không gian tìm kiếm đơn điệu hoặc mảng tăng dần.\n- **Độ phức tạp:** Thời gian $O(\\log N)$ • Không gian $O(1)$\n\n```javascript\nfunction binarySearch(nums, target) {\n  let left = 0, right = nums.length - 1;\n  while (left <= right) {\n    const mid = left + Math.floor((right - left) / 2);\n    if (nums[mid] === target) return mid;\n    if (nums[mid] < target) left = mid + 1;\n    else right = mid - 1;\n  }\n  return -1;\n}\n```\n"},{"nameKey":"scratchpad_dsa_tmpl_tree_dfs","tag":"Tree","snippet":"\n### Binary Tree DFS (Duyệt cây nhị phân)\n- **Cấu trúc:**\n```\n       1\n      / \\\n     2   3\n    / \\\n   4   5\n```\n- **Độ phức tạp:** Thời gian $O(N)$ • Không gian $O(H)$ (chiều cao cây)\n\n```javascript\nfunction TreeNode(val, left, right) {\n  this.val = (val===undefined ? 0 : val);\n  this.left = (left===undefined ? null : left);\n  this.right = (right===undefined ? null : right);\n}\n\nfunction maxDepth(root) {\n  if (!root) return 0;\n  return 1 + Math.max(maxDepth(root.left), maxDepth(root.right));\n}\n```\n"},{"nameKey":"scratchpad_dsa_tmpl_graph_bfs","tag":"Graph","snippet":"\n### BFS Graph Traversal (Duyệt đồ thị)\n- **Độ phức tạp:** Thời gian $O(V + E)$ • Không gian $O(V)$\n\n```javascript\nfunction shortestPathBFS(graph, start, target) {\n  const queue = [[start, 0]];\n  const visited = new Set([start]);\n  while (queue.length > 0) {\n    const [node, dist] = queue.shift();\n    if (node === target) return dist;\n    for (const neighbor of (graph[node] || [])) {\n      if (!visited.has(neighbor)) {\n        visited.add(neighbor);\n        queue.push([neighbor, dist + 1]);\n      }\n    }\n  }\n  return -1;\n}\n```\n"},{"nameKey":"scratchpad_dsa_tmpl_dp_memo","tag":"DP","snippet":"\n### Dynamic Programming & Memoization (Quy hoạch động)\n- **Hàm mục tiêu / Công thức truy hồi:** $dp[i] = \\min / \\max(dp[i-1], dp[i-2]) + cost[i]$\n- **Bài toán cơ sở (Base Case):** $dp[0] = 0, dp[1] = 1$\n- **Độ phức tạp:** Thời gian $O(N)$ • Không gian $O(N) \\rightarrow O(1)$\n\n```javascript\nfunction climbStairs(n) {\n  if (n <= 2) return n;\n  let prev2 = 1, prev1 = 2;\n  for (let i = 3; i <= n; i++) {\n    const curr = prev1 + prev2;\n    prev2 = prev1;\n    prev1 = curr;\n  }\n  return prev1;\n}\n```\n"},{"nameKey":"scratchpad_dsa_tmpl_monotonic_stack","tag":"Stack","snippet":"\n### Monotonic Stack (Ngăn xếp đơn điệu)\n- **Đặc điểm:** Duy trì các phần tử tăng/giảm đơn điệu để tìm phần tử lớn hơn gần nhất.\n- **Độ phức tạp:** Thời gian $O(N)$ • Không gian $O(N)$\n\n```javascript\nfunction nextGreaterElements(nums) {\n  const res = new Array(nums.length).fill(-1);\n  const stack = [];\n  for (let i = 0; i < nums.length; i++) {\n    while (stack.length > 0 && nums[i] > nums[stack[stack.length - 1]]) {\n      const idx = stack.pop();\n      res[idx] = nums[i];\n    }\n    stack.push(i);\n  }\n  return res;\n}\n```\n"},{"nameKey":"scratchpad_dsa_tmpl_full_review","tag":"Template","snippet":"\n# [Thuật toán]: Tiêu đề bài toán\n- **Nền tảng:** LeetCode / Codeforces / HackerRank\n- **Độ khó:** Dễ / Trung bình / Khó\n- **Chủ đề:** `Array`, `Two Pointers`, `Hash Map`\n\n### 1. Phân tích đề bài & Ca biên (Edge Cases)\n- Mảng rỗng hoặc chỉ có 1 phần tử?\n- Tràn số nguyên ($> 2^{31} - 1$)?\n- Giá trị âm hoặc trùng lặp?\n\n### 2. Bảng Dry-Run kiểm thử từng bước\n| Bước | Con trỏ $L$ | Con trỏ $R$ | Giá trị xét | Điều kiện | Trạng thái | Kết quả |\n|:---|:---|:---|:---|:---|:---|:---|\n| Init | 0 | 4 | arr[0]=2, arr[4]=9 | sum=11 > target | R-- | Đang tìm |\n| Step 1 | 0 | 3 | arr[0]=2, arr[3]=7 | sum=9 == target | Khớp! | [0, 3] |\n\n### 3. Cài đặt thuật toán tối ưu\n- **Thời gian:** $O(N)$\n- **Không gian:** $O(1)$\n\n```javascript\nfunction solve(nums, target) {\n  // Cài đặt giải thuật tại đây\n  return nums.length;\n}\n```\n"}];

    templates.forEach(function (t) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'scratchpad-menu-item';

      var lbl = document.createElement('span');
      lbl.textContent = tText(t.nameKey) || t.nameKey;

      var bdg = document.createElement('span');
      bdg.className = 'menu-badge';
      bdg.textContent = t.tag;

      btn.appendChild(lbl);
      btn.appendChild(bdg);

      btn.addEventListener('click', function () {
        closeFloatingMenu();
        wrapSelection('', '', t.snippet);
      });
      menu.appendChild(btn);
    });

    positionMenu(menu, anchorBtn);
    document.body.appendChild(menu);
    activeFloatingMenu = menu;
  }

  function openComplexityMenu(anchorBtn) {
    closeFloatingMenu();
    var menu = document.createElement('div');
    menu.className = 'scratchpad-floating-menu';

    var head = document.createElement('div');
    head.className = 'scratchpad-menu-header';
    head.textContent = tText('scratchpad_complexity_menu_title') || 'ĐỘ PHỨC TẠP BIG-O THƯỜNG GẶP';
    menu.appendChild(head);

    var complexities = [{"tag":"$O(1)$","desc":"Hằng số (Hash Map, Array Index)"},{"tag":"$O(\\log N)$","desc":"Logarit (Binary Search, Heap)"},{"tag":"$O(N)$","desc":"Tuyến tính (Loop, Two Pointers)"},{"tag":"$O(N \\log N)$","desc":"Tuyến tính log (MergeSort, QuickSort)"},{"tag":"$O(N^2)$","desc":"Bậc hai (Nested Loops)"},{"tag":"$O(2^N)$","desc":"Hàm mũ (Recursion, Subsets)"},{"tag":"$O(N!)$","desc":"Giai thừa (Permutations)"}];

    complexities.forEach(function (c) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'scratchpad-menu-item';

      var lbl = document.createElement('span');
      lbl.className = 'scratchpad-menu-item-lbl';
      lbl.textContent = c.tag;

      var bdg = document.createElement('span');
      bdg.className = 'menu-badge';
      bdg.textContent = c.desc;

      btn.appendChild(lbl);
      btn.appendChild(bdg);

      btn.addEventListener('click', function () {
        closeFloatingMenu();
        wrapSelection('', '', c.tag);
      });
      menu.appendChild(btn);
    });

    positionMenu(menu, anchorBtn);
    document.body.appendChild(menu);
    activeFloatingMenu = menu;
  }

  function openTableMenu(anchorBtn) {
    closeFloatingMenu();
    var menu = document.createElement('div');
    menu.className = 'scratchpad-floating-menu';

    var head = document.createElement('div');
    head.className = 'scratchpad-menu-header';
    head.textContent = tText('scratchpad_table_menu_title') || 'CHÈN BẢNG MARKDOWN CĂN LỀ';
    menu.appendChild(head);

    var tables = [
      {
        name: tText('scratchpad_table_left') || 'Bảng căn lề trái (:---)',
        desc: 'Mặc định, thích hợp văn bản & tham số',
        badge: ':---',
        content: '\n| Đầu vào / Tham số | Kết quả kỳ vọng | Ghi chú |\n|:---|:---|:---|\n| Trường hợp 1 | Kết quả A | Hợp lệ |\n| Trường hợp 2 | Kết quả B | Biên |\n'
      },
      {
        name: tText('scratchpad_table_center') || 'Bảng căn lề giữa (:---:)',
        desc: 'Căn giữa các ô, thích hợp trạng thái & mã hiệu',
        badge: ':---:',
        content: '\n| STT | Trạng thái | Đánh giá | Tiến độ |\n|:---:|:---:|:---:|:---:|\n| 01 | Hoàn thành | Đạt | 100% |\n| 02 | Đang chạy | Tốt | 75% |\n'
      },
      {
        name: tText('scratchpad_table_right') || 'Bảng căn lề phải (---:)',
        desc: 'Căn phải các ô, thích hợp số liệu & tài chính & Big-O',
        badge: '---:',
        content: '\n| Chỉ số | Số lượng | Đơn giá | Tổng cộng |\n|---:|---:|---:|---:|\n| Mục A | 10 | 25.5 | 255.0 |\n| Mục B | 4 | 50.0 | 200.0 |\n'
      },
      {
        name: tText('scratchpad_table_multi') || 'Bảng đa căn lề (Trái - Giữa - Phải)',
        desc: 'Chuẩn học thuật: Tiêu đề trái, Trạng thái giữa, Số liệu phải',
        badge: 'Mix',
        content: '\n| Thuật toán | Cấu trúc dữ liệu | Đánh giá | Thời gian (ms) |\n|:---|:---:|:---|---:|\n| QuickSort | Mảng | Tối ưu | 12.4 |\n| BinarySearch | Mảng sắp xếp | Nhanh | 0.8 |\n| BFS Graph | Hàng đợi | Chuẩn | 45.1 |\n'
      }
    ];

    tables.forEach(function (tbl) {
      var item = document.createElement('div');
      item.className = 'scratchpad-menu-item';

      var topRow = document.createElement('div');
      topRow.className = 'scratchpad-menu-item-top';
      var title = document.createElement('span');
      title.className = 'scratchpad-menu-item-title';
      title.textContent = tbl.name;
      var badge = document.createElement('span');
      badge.className = 'scratchpad-menu-badge';
      badge.textContent = tbl.badge;
      topRow.appendChild(title);
      topRow.appendChild(badge);

      var desc = document.createElement('div');
      desc.className = 'scratchpad-menu-desc';
      desc.textContent = tbl.desc;

      item.appendChild(topRow);
      item.appendChild(desc);

      item.addEventListener('click', function () {
        wrapSelection('', '', tbl.content);
        closeFloatingMenu();
      });

      menu.appendChild(item);
    });

    positionMenu(menu, anchorBtn);
    document.body.appendChild(menu);
    activeFloatingMenu = menu;
  }

  function openFontMenu(anchorBtn) {
    closeFloatingMenu();
    var menu = document.createElement('div');
    menu.className = 'scratchpad-floating-menu';

    var head = document.createElement('div');
    head.className = 'scratchpad-menu-header';
    head.textContent = tText('scratchpad_font_menu_title') || 'KIỂU CHỮ & CỠ CHỮ HỆ THỐNG';
    menu.appendChild(head);

    var fonts = [
      { key: 'mono', icon: '💻', name: tText('scratchpad_font_mono') || 'Mã lập trình (Cascadia / Consolas / Mono)', desc: 'ui-monospace, Consolas, Fira Code, Courier' },
      { key: 'system', icon: '🖥️', name: tText('scratchpad_font_system') || 'Giao diện hệ thống (Segoe UI / SF Pro)', desc: 'system-ui, Segoe UI, Roboto, Helvetica' },
      { key: 'serif', icon: '📖', name: tText('scratchpad_font_serif') || 'Học thuật & Báo chí (Georgia / Times)', desc: 'Georgia, Times New Roman, Cambria, Serif' },
      { key: 'modern', icon: '✍️', name: tText('scratchpad_font_modern') || 'Hiện đại & Tròn trịa (Segoe Variable)', desc: 'Segoe UI Variable Text, Rounded Sans' },
      { key: 'clean', icon: '🎯', name: tText('scratchpad_font_clean') || 'Rõ ràng & Dễ đọc (Verdana / Clean)', desc: 'Verdana, Trebuchet MS, DéjàVu Sans' },
      { key: 'hand', icon: '📝', name: tText('scratchpad_font_hand') || 'Bút máy & Viết tay (Segoe Print / Casual)', desc: 'Segoe Print, Comic Neue, Cursive' }
    ];

    fonts.forEach(function (f) {
      var item = document.createElement('div');
      item.className = 'scratchpad-menu-item' + (currentFontFamily === f.key ? ' active-font' : '');

      var topRow = document.createElement('div');
      topRow.className = 'scratchpad-menu-item-top';
      var title = document.createElement('span');
      title.className = 'scratchpad-menu-item-title';
      title.textContent = f.icon + ' ' + f.name;

      if (currentFontFamily === f.key) {
        var badge = document.createElement('span');
        badge.className = 'scratchpad-menu-badge';
        badge.textContent = '✓ Đang chọn';
        topRow.appendChild(title);
        topRow.appendChild(badge);
      } else {
        topRow.appendChild(title);
      }

      var desc = document.createElement('div');
      desc.className = 'scratchpad-menu-desc';
      desc.textContent = f.desc;

      item.appendChild(topRow);
      item.appendChild(desc);

      item.addEventListener('click', function () {
        applyFontSettings(f.key, null);
        closeFloatingMenu();
      });

      menu.appendChild(item);
    });

    // Font size selector row
    var sizeRow = document.createElement('div');
    sizeRow.style.cssText = 'padding: 8px 10px; border-top: 1px solid rgba(255,255,255,0.08); display: flex; align-items: center; justify-content: space-between; gap: 6px;';
    var sizeLabel = document.createElement('span');
    sizeLabel.style.cssText = 'font-size: 11px; color: #94a3b8; font-weight: 600;';
    sizeLabel.textContent = (tText('scratchpad_font_size_label') || 'Cỡ chữ') + ':';
    sizeRow.appendChild(sizeLabel);

    var sizesWrap = document.createElement('div');
    sizesWrap.style.cssText = 'display: flex; gap: 4px;';
    var sizes = ['11px', '12px', '13px', '14px', '16px'];
    sizes.forEach(function (sz) {
      var sBtn = document.createElement('button');
      sBtn.type = 'button';
      sBtn.textContent = sz;
      var isCurSize = currentFontSize === sz;
      sBtn.style.cssText = 'border: 1px solid ' + (isCurSize ? '#38bdf8' : 'rgba(255,255,255,0.12)') + '; background: ' + (isCurSize ? 'rgba(56,189,248,0.25)' : 'rgba(255,255,255,0.05)') + '; color: ' + (isCurSize ? '#38bdf8' : '#cbd5e1') + '; border-radius: 4px; font-size: 10.5px; padding: 2px 6px; cursor: pointer; font-weight: 600;';
      sBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        applyFontSettings(null, sz);
        closeFloatingMenu();
      });
      sizesWrap.appendChild(sBtn);
    });
    sizeRow.appendChild(sizesWrap);
    menu.appendChild(sizeRow);

    positionMenu(menu, anchorBtn);
    document.body.appendChild(menu);
    activeFloatingMenu = menu;
  }

  function initScratchpad() {
    var editor = document.getElementById('scratchpad-editor');
    var btnModePage = document.getElementById('scratchpad-mode-page');
    var btnModeGlobal = document.getElementById('scratchpad-mode-global');
    var chkClipper = document.getElementById('chk-scratchpad-clipper');

    if (!editor) return;

    // Load active mode and clipper settings
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get([
        'sf_scratchpad_active_mode',
        'sf_scratchpad_clipper_enabled',
        'sf_scratchpad_font_family',
        'sf_scratchpad_font_size',
        'sf_scratchpad_editor_height'
      ], function (res) {
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
        if (res && (res.sf_scratchpad_font_family || res.sf_scratchpad_font_size)) {
          applyFontSettings(res.sf_scratchpad_font_family || 'mono', res.sf_scratchpad_font_size || '12px');
        }
        if (res && typeof res.sf_scratchpad_editor_height === 'number') {
          var wrap = document.getElementById('scratchpad-editor-wrap');
          if (wrap && res.sf_scratchpad_editor_height >= 220) {
            wrap.style.height = Math.min(res.sf_scratchpad_editor_height, window.innerHeight - 150) + 'px';
          }
        }
        initHostContext(initNotesAndStorage);
      });
    } else {
      initHostContext(initNotesAndStorage);
    }

    // Switch mode buttons
    if (btnModePage) {
      btnModePage.addEventListener('click', function () {
        if (currentMode === 'page') return;
        currentMode = 'page';
        btnModePage.classList.add('active');
        if (btnModeGlobal) btnModeGlobal.classList.remove('active');
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.set({ sf_scratchpad_active_mode: 'page' });
        }
      });
    }

    if (btnModeGlobal) {
      btnModeGlobal.addEventListener('click', function () {
        if (currentMode === 'global') return;
        currentMode = 'global';
        btnModeGlobal.classList.add('active');
        if (btnModePage) btnModePage.classList.remove('active');
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.set({ sf_scratchpad_active_mode: 'global' });
        }
      });
    }

    // Notes List Drawer Toggle & New Note Button
    var btnNotesList = document.getElementById('scratchpad-btn-notes-list');
    if (btnNotesList) {
      btnNotesList.addEventListener('click', function () {
        toggleNotesDrawer();
      });
    }

    var btnDrawerClose = document.getElementById('scratchpad-drawer-close');
    if (btnDrawerClose) {
      btnDrawerClose.addEventListener('click', function () {
        toggleNotesDrawer(false);
      });
    }

    var btnNewNote = document.getElementById('scratchpad-btn-new-note');
    if (btnNewNote) {
      btnNewNote.addEventListener('click', function () {
        createNewNote();
        toggleNotesDrawer(false);
      });
    }

    // Note Title Input
    var noteTitleInput = document.getElementById('scratchpad-note-title');
    if (noteTitleInput) {
      noteTitleInput.addEventListener('input', function () {
        var active = getActiveNote();
        if (active) {
          active.title = noteTitleInput.value;
          active.updatedAt = Date.now();
          scheduleSave();
        }
      });
    }

    // Note Category Select
    var catSelect = document.getElementById('scratchpad-select-category');
    if (catSelect) {
      catSelect.addEventListener('change', function () {
        var active = getActiveNote();
        if (active) {
          active.category = catSelect.value;
          active.updatedAt = Date.now();
          scheduleSave();
        }
      });
    }

    // Note Difficulty Select
    var diffSelect = document.getElementById('scratchpad-select-difficulty');
    if (diffSelect) {
      diffSelect.addEventListener('change', function () {
        var active = getActiveNote();
        if (active) {
          active.difficulty = diffSelect.value;
          active.updatedAt = Date.now();
          scheduleSave();
        }
      });
    }

    // Pin Button in meta row
    var pinBtn = document.getElementById('scratchpad-btn-pin');
    if (pinBtn) {
      pinBtn.addEventListener('click', function () {
        var active = getActiveNote();
        if (active) {
          togglePinNote(active.id);
        }
      });
    }

    // Search Input in Drawer
    var searchInput = document.getElementById('scratchpad-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', function () {
        searchQuery = searchInput.value || '';
        renderNotesList();
      });
    }

    // Filter Chips in Drawer
    var filterChips = document.querySelectorAll('.scratchpad-filter-chip');
    filterChips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        filterChips.forEach(function (c) { c.classList.remove('active'); });
        chip.classList.add('active');
        currentFilter = chip.getAttribute('data-filter') || 'all';
        renderNotesList();
      });
    });

    // Editor Typing & Scroll Sync for Line Numbers
    editor.addEventListener('input', function () {
      if (isInternalChange) return;
      var active = getActiveNote();
      if (active) {
        active.content = editor.value;
        active.updatedAt = Date.now();
      }
      updateCounters();
      scheduleSave();
    });

    editor.addEventListener('scroll', function () {
      syncEditorScroll();
    });

    // Keyboard shortcuts & Code Indentation (Tab / Shift+Tab)
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
        var val = editor.value;

        if (e.shiftKey) {
          // Outdent line(s)
          var lineStart = val.lastIndexOf('\n', start - 1) + 1;
          var lineEnd = val.indexOf('\n', end);
          if (lineEnd === -1) lineEnd = val.length;

          var block = val.substring(lineStart, lineEnd);
          var outdented = block.split('\n').map(function (l) {
            return l.replace(/^ {1,2}/, '');
          }).join('\n');

          editor.value = val.substring(0, lineStart) + outdented + val.substring(lineEnd);
          editor.selectionStart = start;
          editor.selectionEnd = lineStart + outdented.length;
        } else {
          if (start !== end) {
            // Indent selected lines
            var selLineStart = val.lastIndexOf('\n', start - 1) + 1;
            var selLineEnd = val.indexOf('\n', end);
            if (selLineEnd === -1) selLineEnd = val.length;

            var selBlock = val.substring(selLineStart, selLineEnd);
            var indented = selBlock.split('\n').map(function (l) {
              return '  ' + l;
            }).join('\n');

            editor.value = val.substring(0, selLineStart) + indented + val.substring(selLineEnd);
            editor.selectionStart = start + 2;
            editor.selectionEnd = selLineStart + indented.length;
          } else {
            // Insert 2 spaces
            editor.value = val.substring(0, start) + '  ' + val.substring(end);
            editor.selectionStart = editor.selectionEnd = start + 2;
          }
        }
        updateCounters();
        var actNote = getActiveNote();
        if (actNote) {
          actNote.content = editor.value;
          actNote.updatedAt = Date.now();
          scheduleSave();
        }
      } else if (e.key === 'Enter') {
        // Auto-preserve indentation on newline
        var cursorPos = editor.selectionStart;
        var textBefore = editor.value.substring(0, cursorPos);
        var curLineStart = textBefore.lastIndexOf('\n') + 1;
        var curLine = textBefore.substring(curLineStart);
        var indentMatch = curLine.match(/^(\s+)/);

        if (indentMatch && indentMatch[1]) {
          e.preventDefault();
          var indent = indentMatch[1];
          editor.value = textBefore + '\n' + indent + editor.value.substring(cursorPos);
          editor.selectionStart = editor.selectionEnd = cursorPos + 1 + indent.length;
          updateCounters();
          var activeN = getActiveNote();
          if (activeN) {
            activeN.content = editor.value;
            activeN.updatedAt = Date.now();
            scheduleSave();
          }
        }
      }
    });

    // Formatting Toolbar Buttons
    var btnBold = document.getElementById('scratchpad-btn-bold');
    if (btnBold) btnBold.addEventListener('click', function () { wrapSelection('**', '**', 'bold'); });

    var btnItalic = document.getElementById('scratchpad-btn-italic');
    if (btnItalic) btnItalic.addEventListener('click', function () { wrapSelection('*', '*', 'italic'); });

    var btnStrike = document.getElementById('scratchpad-btn-strike');
    if (btnStrike) btnStrike.addEventListener('click', function () { wrapSelection('~~', '~~', 'strikethrough'); });

    var btnHighlight = document.getElementById('scratchpad-btn-highlight');
    if (btnHighlight) btnHighlight.addEventListener('click', function () { wrapSelection('==', '==', 'highlight'); });

    var btnHeading = document.getElementById('scratchpad-btn-heading');
    if (btnHeading) btnHeading.addEventListener('click', function () { insertLinePrefix('### '); });

    var btnQuote = document.getElementById('scratchpad-btn-quote');
    if (btnQuote) btnQuote.addEventListener('click', function () { insertLinePrefix('> '); });

    var btnList = document.getElementById('scratchpad-btn-list');
    if (btnList) btnList.addEventListener('click', function () { insertLinePrefix('- '); });

    var btnTask = document.getElementById('scratchpad-btn-task');
    if (btnTask) btnTask.addEventListener('click', function () { insertLinePrefix('- [ ] '); });

    var btnCodeInline = document.getElementById('scratchpad-btn-code-inline');
    if (btnCodeInline) btnCodeInline.addEventListener('click', function () { wrapSelection('`', '`', 'code'); });

    // Code Block Inserter
    var btnCode = document.getElementById('scratchpad-btn-code-block');
    if (btnCode) {
      btnCode.addEventListener('click', function () {
        wrapSelection('\n```javascript\n', '\n```\n', '// write code here');
      });
    }

    // Math / Big-O Inserter
    var btnMath = document.getElementById('scratchpad-btn-math');
    if (btnMath) {
      btnMath.addEventListener('click', function () {
        wrapSelection('$', '$', 'O(N \\log N)');
      });
    }

    // Link Inserter
    var btnLink = document.getElementById('scratchpad-btn-link');
    if (btnLink) {
      btnLink.addEventListener('click', function () {
        wrapSelection('[', '](https://example.com)', 'Tiêu đề liên kết');
      });
    }

    // Horizontal Rule Inserter
    var btnHr = document.getElementById('scratchpad-btn-hr');
    if (btnHr) {
      btnHr.addEventListener('click', function () {
        wrapSelection('\n---\n', '', '');
      });
    }

    // Markdown Table Dropdown Menu (4 Alignments)
    var btnTable = document.getElementById('scratchpad-btn-table');
    if (btnTable) {
      btnTable.addEventListener('click', function (e) {
        e.stopPropagation();
        openTableMenu(btnTable);
      });
    }

    // 4 Alignment Buttons (Left / Center / Right / Justify)
    var btnAlignL = document.getElementById('scratchpad-btn-align-left');
    if (btnAlignL) {
      btnAlignL.addEventListener('click', function () {
        wrapSelection('<div align="left">\n', '\n</div>\n', 'Văn bản căn trái');
      });
    }

    var btnAlignC = document.getElementById('scratchpad-btn-align-center');
    if (btnAlignC) {
      btnAlignC.addEventListener('click', function () {
        wrapSelection('<div align="center">\n', '\n</div>\n', 'Văn bản căn giữa');
      });
    }

    var btnAlignR = document.getElementById('scratchpad-btn-align-right');
    if (btnAlignR) {
      btnAlignR.addEventListener('click', function () {
        wrapSelection('<div align="right">\n', '\n</div>\n', 'Văn bản căn phải');
      });
    }

    var btnAlignJ = document.getElementById('scratchpad-btn-align-justify');
    if (btnAlignJ) {
      btnAlignJ.addEventListener('click', function () {
        wrapSelection('<div align="justify">\n', '\n</div>\n', 'Văn bản căn đều hai bên');
      });
    }

    // DSA Templates Dropdown Menu
    var btnDsaMenu = document.getElementById('scratchpad-btn-dsa-menu');
    if (btnDsaMenu) {
      btnDsaMenu.addEventListener('click', function (e) {
        e.stopPropagation();
        openDsaTemplateMenu(btnDsaMenu);
      });
    }

    // Big-O Complexity Dropdown Menu
    var btnComplexity = document.getElementById('scratchpad-btn-complexity');
    if (btnComplexity) {
      btnComplexity.addEventListener('click', function (e) {
        e.stopPropagation();
        openComplexityMenu(btnComplexity);
      });
    }

    // Dry-Run Trace Table Inserter
    var btnTraceTable = document.getElementById('scratchpad-btn-trace-table');
    if (btnTraceTable) {
      btnTraceTable.addEventListener('click', function () {
        var traceBlock = '\n### Bảng Trace (Dry-Run)\n' +
          '| Bước | Con trỏ L | Con trỏ R | Giá trị xét | Điều kiện | Trạng thái | Kết quả |\n' +
          '|:---|:---|:---|:---|:---|:---|:---|\n' +
          '| Init | 0 | 4 | arr[0]=2, arr[4]=9 | sum=11 > target | R-- | Đang tìm |\n' +
          '| Step 1 | 0 | 3 | arr[0]=2, arr[3]=7 | sum=9 == target | Khớp! | [0, 3] |\n\n';
        wrapSelection('', '', traceBlock);
      });
    }

    // Fallback template button if present
    var btnTemplate = document.getElementById('scratchpad-btn-template');
    if (btnTemplate) {
      btnTemplate.addEventListener('click', function (e) {
        e.stopPropagation();
        openDsaTemplateMenu(btnTemplate);
      });
    }

    // Timestamp Inserter
    var btnTimestamp = document.getElementById('scratchpad-btn-timestamp');
    if (btnTimestamp) {
      btnTimestamp.addEventListener('click', function () {
        var d = new Date();
        var ts = '[' + d.getFullYear() + '-' +
          String(d.getMonth() + 1).padStart(2, '0') + '-' +
          String(d.getDate()).padStart(2, '0') + ' ' +
          String(d.getHours()).padStart(2, '0') + ':' +
          String(d.getMinutes()).padStart(2, '0') + '] ';
        wrapSelection('', '', ts);
      });
    }

    // View Switcher Tabs (Edit / Preview / Split)
    var tabEdit = document.getElementById('scratchpad-tab-edit');
    var tabPreview = document.getElementById('scratchpad-tab-preview');
    var tabSplit = document.getElementById('scratchpad-tab-split');
    if (tabEdit) {
      tabEdit.addEventListener('click', function () { setViewMode('edit'); });
    }
    if (tabPreview) {
      tabPreview.addEventListener('click', function () { setViewMode('preview'); });
    }
    if (tabSplit) {
      tabSplit.addEventListener('click', function () { setViewMode('split'); });
    }

    // Preview Toggle
    var btnPreview = document.getElementById('scratchpad-btn-preview');
    if (btnPreview) {
      btnPreview.addEventListener('click', togglePreview);
    }

    // System Font Picker Menu (Aa)
    var btnFont = document.getElementById('scratchpad-btn-font');
    if (btnFont) {
      btnFont.addEventListener('click', function (e) {
        e.stopPropagation();
        openFontMenu(btnFont);
      });
    }

    // Remember manually resized editor wrap height
    var editorWrapEl = document.getElementById('scratchpad-editor-wrap');
    if (editorWrapEl) {
      editorWrapEl.addEventListener('mouseup', function () {
        var h = editorWrapEl.offsetHeight;
        if (h >= 200 && typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.set({ sf_scratchpad_editor_height: h });
        }
      });
    }

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

            wrapSelection('', '', block);

            if (typeof window.showToast === 'function') {
              window.showToast(tText('scratchpad_cite_inserted_toast') || 'Đã chèn trích dẫn!');
            }
          });
        }
      });
    }

    // Export Button (Rich Dropdown Menu)
    var btnExport = document.getElementById('scratchpad-btn-export');
    if (btnExport) {
      btnExport.addEventListener('click', function (e) {
        e.stopPropagation();
        openExportMenu(btnExport);
      });
    }

    // Import Button & Hidden File Input
    var btnImport = document.getElementById('scratchpad-btn-import');
    var fileInput = document.getElementById('scratchpad-file-import');
    if (btnImport && fileInput) {
      btnImport.addEventListener('click', function () {
        fileInput.value = '';
        fileInput.click();
      });

      fileInput.addEventListener('change', function () {
        if (fileInput.files && fileInput.files[0]) {
          handleImportFile(fileInput.files[0]);
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
          var active = getActiveNote();
          if (active) {
            active.content = '';
            active.updatedAt = Date.now();
            scheduleSave();
          }
        }
      });
    }

    // Helper: Detect browser-internal or restricted URLs where content scripts cannot execute
    function isRestrictedTabUrl(url) {
      if (!url) return true;
      var u = url.toLowerCase();
      return u.startsWith('chrome://') ||
        u.startsWith('edge://') ||
        u.startsWith('about:') ||
        u.startsWith('chrome-extension://') ||
        u.startsWith('moz-extension://') ||
        u.startsWith('devtools://') ||
        u.startsWith('view-source:') ||
        u.indexOf('chromewebstore.google.com') !== -1 ||
        u.indexOf('microsoftedge.microsoft.com/addons') !== -1;
    }

    // Toggle floating scratchpad window on page
    var btnToggle = document.getElementById('btn-toggle-scratchpad');
    if (btnToggle) {
      btnToggle.addEventListener('click', function () {
        var browserApi = (typeof chrome !== 'undefined' && chrome.tabs) ? chrome :
          ((typeof browser !== 'undefined' && browser.tabs) ? browser : null);
        if (!browserApi || !browserApi.tabs || !browserApi.tabs.query) return;

        browserApi.tabs.query({ active: true, currentWindow: true }, function (tabs) {
          if (!tabs || !tabs[0] || !tabs[0].id) return;
          var activeTab = tabs[0];
          var tabUrl = activeTab.url || '';

          if (isRestrictedTabUrl(tabUrl)) {
            if (typeof window.showToast === 'function') {
              window.showToast(tText('scratchpad_tab_restricted') || 'Không thể mở cửa sổ nổi trên trang hệ thống. Vui lòng chuyển sang một tab web bình thường!');
            }
            return;
          }

          function sendToggleMsg(isRetry) {
            browserApi.tabs.sendMessage(activeTab.id, { command: 'toggleScratchpad' }, function (res) {
              var lastErr = browserApi.runtime && browserApi.runtime.lastError;
              if (lastErr) {
                if (!isRetry && browserApi.scripting && browserApi.scripting.executeScript) {
                  // Content script was not yet injected into this tab (e.g. tab opened before extension load/reload)
                  browserApi.scripting.executeScript({
                    target: { tabId: activeTab.id },
                    files: ['OS/js/content/i18n.js', 'OS/js/content/scratchpad.js']
                  }).then(function () {
                    setTimeout(function () {
                      sendToggleMsg(true);
                    }, 80);
                  }).catch(function () {
                    if (typeof window.showToast === 'function') {
                      window.showToast(tText('scratchpad_reload_page_toast') || 'Vui lòng F5 tải lại trang web để kết nối cửa sổ nổi!');
                    }
                  });
                } else {
                  if (typeof window.showToast === 'function') {
                    window.showToast(tText('scratchpad_reload_page_toast') || 'Vui lòng F5 tải lại trang web để kết nối cửa sổ nổi!');
                  }
                }
              } else if (typeof window.showToast === 'function') {
                var isClosed = (res && res.state === 'closed');
                var msg = isClosed ?
                  (tText('scratchpad_floating_closed') || 'Đã ẩn cửa sổ nổi trên trang') :
                  (tText('scratchpad_floating_opened') || 'Đã mở cửa sổ ghi chú nổi trên trang!');
                window.showToast(msg);
              }
            });
          }

          sendToggleMsg(false);
        });
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

    // Live storage sync across tabs & in-page floating window
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener(function (changes, area) {
        if (area !== 'local') return;

        if (changes.sf_scratchpad_notes && !isInternalChange) {
          var incomingNotes = changes.sf_scratchpad_notes.newValue;
          if (Array.isArray(incomingNotes)) {
            notes = incomingNotes;
            populateEditorFromActiveNote();
            renderNotesList();
          }
        }

        var legacyKey = getLegacyStorageKey();
        if (changes[legacyKey] && !isInternalChange) {
          var newVal = changes[legacyKey].newValue || '';
          var active = getActiveNote();
          if (active && active.content !== newVal) {
            active.content = newVal;
            populateEditorFromActiveNote();
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
