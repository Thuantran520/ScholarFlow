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
  var isMonoFont = true;
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

  function updateLineNumbers() {
    var editor = document.getElementById('scratchpad-editor');
    var gutter = document.getElementById('scratchpad-line-numbers');
    var linesBadge = document.getElementById('scratchpad-lines-badge');
    if (!editor || !gutter) return;

    var val = editor.value || '';
    var linesCount = val.split('\n').length;
    var lineNums = [];
    for (var i = 1; i <= linesCount; i++) {
      lineNums.push(i);
    }
    gutter.textContent = lineNums.join('\n');
    gutter.scrollTop = editor.scrollTop;

    if (linesBadge) {
      var template = tText('scratchpad_lines_counter') || '{0} dòng';
      linesBadge.textContent = template.replace('{0}', String(linesCount));
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

    updateLineNumbers();
    if (currentViewMode === 'preview' || currentViewMode === 'split') {
      renderMarkdownPreview();
    }
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
    if (catSelect) catSelect.value = active.category || 'general';
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
    var INLINE_REGEX = /(`[^`\n]+`|\$[^\$\n]+\$|\*\*\*[^*\n]+\*\*\*|\*\*[^*\n]+\*\*|\*(?:(?!\*)[^*\n])+\*|~~[^~\n]+~~|\[[^\]\n]+\]\(https?:\/\/[^\s\)]+\))/g;
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
      em.style.color = '#64748b';
      em.style.fontStyle = 'italic';
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

      tableRows.forEach(function (r, idx) {
        if (r.trim().match(/^\|?[-:\s|]+\|?$/)) return;
        var tr = document.createElement('tr');
        var cells = r.split('|').filter(function (_, cIdx, arr) {
          return cIdx > 0 && cIdx < arr.length - 1;
        });
        cells.forEach(function (cellText) {
          var cell = document.createElement(idx === 0 ? 'th' : 'td');
          renderInlineFormatted(cellText.trim(), cell);
          tr.appendChild(cell);
        });
        if (idx === 0) thead.appendChild(tr);
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
      var copyText = tText('scratchpad_copy_code') || 'Sao chép mã';
      copyBtn.textContent = '📋 ' + copyText;

      var fullCodeStr = codeLines.join('\n');
      copyBtn.addEventListener('click', (function (codeToCopy, btn, baseText) {
        return function (e) {
          e.stopPropagation();
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(codeToCopy).then(function () {
              btn.textContent = '✓ ' + (tText('scratchpad_copied') || 'Đã chép!');
              btn.classList.add('copied');
              setTimeout(function () {
                btn.textContent = '📋 ' + baseText;
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

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];

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
        hr.style.borderColor = 'rgba(255, 255, 255, 0.1)';
        hr.style.margin = '10px 0';
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
        renderInlineFormatted(headingMatch[2], hEl);
        preview.appendChild(hEl);
      } else if (line.startsWith('> ')) {
        flushLists();
        var bq = document.createElement('blockquote');
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

  function toggleFont() {
    var editor = document.getElementById('scratchpad-editor');
    var btnFont = document.getElementById('scratchpad-btn-font');
    if (!editor) return;

    isMonoFont = !isMonoFont;
    editor.classList.toggle('font-sans', !isMonoFont);
    if (btnFont) btnFont.classList.toggle('active', !isMonoFont);
  }

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

  function exportActiveNote(format) {
    var active = getActiveNote();
    if (!active) return;

    var safeTitle = (active.title || 'untitled').replace(/[^a-zA-Z0-9_\-\u00C0-\u024F\u1EA0-\u1EF9]/g, '_');
    if (format === 'md') {
      var mdContent = '# ' + (active.title || 'Untitled') + '\n\n' + (active.content || '');
      downloadFile(mdContent, safeTitle + '.md', 'text/markdown;charset=utf-8');
    } else if (format === 'txt') {
      downloadFile(active.content || '', safeTitle + '.txt', 'text/plain;charset=utf-8');
    } else if (format === 'html') {
      var htmlContent = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' +
        (active.title || 'ScholarFlow Note') +
        '</title><style>body{font-family:system-ui,sans-serif;max-width:800px;margin:40px auto;padding:0 20px;line-height:1.6;}pre{background:#f1f5f9;padding:12px;border-radius:6px;}</style></head><body><h1>' +
        (active.title || 'Untitled') + '</h1><pre>' + (active.content || '') + '</pre></body></html>';
      downloadFile(htmlContent, safeTitle + '.html', 'text/html;charset=utf-8');
    } else if (format === 'json') {
      var backupData = {
        app: 'ScholarFlow',
        version: '2.5.6',
        exportedAt: new Date().toISOString(),
        notes: notes
      };
      downloadFile(JSON.stringify(backupData, null, 2), 'scholarflow_notes_backup.json', 'application/json;charset=utf-8');
    }
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
      var gutter = document.getElementById('scratchpad-line-numbers');
      if (gutter) {
        gutter.scrollTop = editor.scrollTop;
      }
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

    var btnHeading = document.getElementById('scratchpad-btn-heading');
    if (btnHeading) btnHeading.addEventListener('click', function () { insertLinePrefix('### '); });

    var btnQuote = document.getElementById('scratchpad-btn-quote');
    if (btnQuote) btnQuote.addEventListener('click', function () { insertLinePrefix('> '); });

    var btnList = document.getElementById('scratchpad-btn-list');
    if (btnList) btnList.addEventListener('click', function () { insertLinePrefix('- '); });

    var btnTask = document.getElementById('scratchpad-btn-task');
    if (btnTask) btnTask.addEventListener('click', function () { insertLinePrefix('- [ ] '); });

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

    // Markdown Table Inserter
    var btnTable = document.getElementById('scratchpad-btn-table');
    if (btnTable) {
      btnTable.addEventListener('click', function () {
        var tblBlock = '\n| Input / Param | Expected Output | Complexity |\n|:---|:---|:---|\n| Case 1 | Output 1 | $O(N)$ |\n| Case 2 | Output 2 | $O(1)$ |\n';
        wrapSelection('', '', tblBlock);
      });
    }

    // LeetCode / Problem Template Inserter
    var btnTemplate = document.getElementById('scratchpad-btn-template');
    if (btnTemplate) {
      btnTemplate.addEventListener('click', function () {
        var tmpl = '\n### 💡 ' + (noteTitleInput ? noteTitleInput.value : 'Problem Solution') + '\n' +
          '- **Time Complexity:** $O(N)$\n' +
          '- **Space Complexity:** $O(1)$\n' +
          '- **Approach:**\n' +
          '  1. Step 1: Initialize pointers / data structure\n' +
          '  2. Step 2: Iterate and process constraints\n' +
          '  3. Step 3: Return result\n\n' +
          '```python\nclass Solution:\n    def solve(self, nums):\n        # Implementation here\n        pass\n```\n';
        wrapSelection('', '', tmpl);
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

    // Font Switcher
    var btnFont = document.getElementById('scratchpad-btn-font');
    if (btnFont) {
      btnFont.addEventListener('click', toggleFont);
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

    // Export Button
    var btnExport = document.getElementById('scratchpad-btn-export');
    if (btnExport) {
      btnExport.addEventListener('click', function () {
        // Quick popup prompt format: md (default), txt, html, json
        var choice = window.prompt('Nhập định dạng xuất ghi chú (md, txt, html, json):', 'md');
        if (choice) {
          choice = choice.trim().toLowerCase();
          if (['md', 'txt', 'html', 'json'].indexOf(choice) !== -1) {
            exportActiveNote(choice);
          } else {
            exportActiveNote('md');
          }
        }
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

    // Toggle floating scratchpad window on page
    var btnToggle = document.getElementById('btn-toggle-scratchpad');
    if (btnToggle) {
      btnToggle.addEventListener('click', function () {
        if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
          chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            if (tabs && tabs[0] && tabs[0].id) {
              chrome.tabs.sendMessage(tabs[0].id, { command: 'toggleScratchpad' }, function () {
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
