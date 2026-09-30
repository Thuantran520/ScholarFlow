// OS/js/tabs/userscripts-studio.js
// Standalone Full-Page Userscript Editor for ScholarFlow

(function() {
  'use strict';

  const browserApi = (typeof chrome !== 'undefined' && chrome.storage) ? chrome : browser;
  const urlParams = new URLSearchParams(window.location.search);
  const scriptId = urlParams.get('id') || '';

  let _scripts = [];
  let _currentScript = null;
  // Revision of the record as it was when the editor was populated. Any save
  // whose stored revision differs from this is a concurrent edit by the
  // sidebar (or by another Studio tab) and must be reconciled, not clobbered.
  let _baseRev = 0;
  let _baseCode = '';
  let _saving = false;
  const SYNC = globalThis.SF_US_SYNC || null;
  const EDITOR_LABEL = 'Userscript Studio';

  function _notify(message, type) {
    if (SYNC && typeof SYNC.toast === 'function') SYNC.toast(message, type);
  }

  function _editorLabel() {
    try { return t('us_editor_studio'); } catch (e) { return EDITOR_LABEL; }
  }

  // DOM elements
  const el = {
    id: document.getElementById('st-edit-id'),
    name: document.getElementById('st-edit-name'),
    matches: document.getElementById('st-edit-matches'),
    excludes: document.getElementById('st-edit-excludes'),
    runAt: document.getElementById('st-edit-runat'),
    world: document.getElementById('st-edit-world'),
    updateUrl: document.getElementById('st-edit-update-url'),
    code: document.getElementById('st-edit-code'),
    lineNumbers: document.getElementById('st-line-numbers'),
    cursorPos: document.getElementById('st-cursor-pos'),
    lineCount: document.getElementById('st-line-count'),
    charCount: document.getElementById('st-char-count'),
    findBar: document.getElementById('st-find-bar'),
    findInput: document.getElementById('st-find-input'),
    replaceInput: document.getElementById('st-replace-input'),
    findCount: document.getElementById('st-find-count'),
    consoleDrawer: document.getElementById('st-console-drawer'),
    consoleLogs: document.getElementById('st-console-logs'),
    btnSave: document.getElementById('btn-st-save'),
    btnTest: document.getElementById('btn-st-test'),
    btnFormat: document.getElementById('btn-st-format'),
    btnParse: document.getElementById('btn-st-parse'),
    btnExport: document.getElementById('btn-st-export'),
    btnFind: document.getElementById('btn-st-find'),
    btnClose: document.getElementById('btn-st-close'),
    btnFindPrev: document.getElementById('btn-st-find-prev'),
    btnFindNext: document.getElementById('btn-st-find-next'),
    btnReplaceOne: document.getElementById('btn-st-replace-one'),
    btnReplaceAll: document.getElementById('btn-st-replace-all'),
    btnFindClose: document.getElementById('btn-st-find-close'),
    btnConsoleClear: document.getElementById('btn-st-console-clear'),
    btnConsoleClose: document.getElementById('btn-st-console-close'),
    btnToggleConsole: document.getElementById('btn-st-toggle-console')
  };

  function updateLineNumbers() {
    if (!el.code || !el.lineNumbers) return;
    const lines = (el.code.value.match(/\n/g) || []).length + 1;
    el.lineNumbers.textContent = Array.from({ length: lines }, (_, i) => i + 1).join('\n');
    el.lineNumbers.scrollTop = el.code.scrollTop;
    if (el.lineCount) el.lineCount.textContent = lines + ' dòng';
    if (el.charCount) el.charCount.textContent = el.code.value.length + ' ký tự';
  }

  function updateCursorPos() {
    if (!el.code || !el.cursorPos) return;
    const text = el.code.value.substring(0, el.code.selectionStart);
    const lines = text.split('\n');
    el.cursorPos.textContent = 'Dòng ' + lines.length + ', Cột ' + lines[lines.length - 1].length;
  }

  function logToConsole(level, args) {
    if (!el.consoleDrawer || !el.consoleLogs) return;
    el.consoleDrawer.style.display = 'flex';
    const row = document.createElement('div');
    const colors = { log: '#10b981', warn: '#f59e0b', error: '#ef4444', info: '#38bdf8' };
    row.style.cssText = 'color:' + (colors[level] || '#10b981') + '; padding: 2px 0; border-bottom: 1px solid rgba(255,255,255,0.05);';
    const tag = document.createElement('span');
    tag.style.cssText = 'opacity: 0.5; margin-right: 6px; font-size: 10px;';
    tag.textContent = '[' + level.toUpperCase() + ']';
    row.appendChild(tag);
    row.appendChild(document.createTextNode(args.map(a => {
      try { return typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a); }
      catch (_e) { return String(a); }
    }).join(' ')));
    el.consoleLogs.appendChild(row);
    el.consoleLogs.scrollTop = el.consoleLogs.scrollHeight;
  }

  function parseGMMetadata(code) {
    const meta = {};
    const block = code.match(/==UserScript==([\s\S]*?)==\/UserScript==/);
    if (!block) return null;
    const lines = block[1].split('\n');
    for (const line of lines) {
      const m = line.match(/@(\w+)\s+(.*)/);
      if (m) meta[m[1]] = m[2].trim();
    }
    return meta;
  }

  function fillForm(script) {
    _currentScript = script || null;
    _baseRev = script ? (Number(script.rev) || 0) : 0;
    _baseCode = script ? String(script.code || '') : '';
    if (el.id) el.id.value = script ? script.id : 'script_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    if (el.name) el.name.value = script ? (script.name || '') : 'Kịch bản mới';
    if (el.matches) el.matches.value = script ? ((script.matches || []).join(', ')) : '*://*/*';
    if (el.excludes) el.excludes.value = script ? ((script.excludes || []).join(', ')) : '';
    if (el.runAt) el.runAt.value = (script && script.runAt) || 'document_idle';
    if (el.world) el.world.value = (script && script.world) || 'MAIN';
    if (el.updateUrl) el.updateUrl.value = (script && script.updateUrl) || '';
    if (el.code) el.code.value = script ? String(script.code || '') : '// ==UserScript==\n// @name         Kịch bản mới\n// @match        *://*/*\n// @grant        GM_getValue\n// @grant        GM_setValue\n// ==/UserScript==\n\nconsole.log("ScholarFlow Userscript loaded!");\n';
    document.title = (script ? (script.name || 'Script') : 'Kịch bản mới') + ' - ScholarFlow Studio';
    setTimeout(updateLineNumbers, 20);
    setTimeout(updateCursorPos, 20);
  }

  async function loadData() {
    if (SYNC) {
      _scripts = typeof SYNC.readAllEnsured === 'function'
        ? await SYNC.readAllEnsured(_editorLabel())
        : await SYNC.readAll();
    } else {
      _scripts = await browserApi.storage.local.get('sf_custom_scripts')
        .then((res) => res.sf_custom_scripts || []);
    }
    fillForm(_scripts.find((s) => s.id === scriptId) || null);
  }

  /** Ask before overwriting a version another surface saved in the meantime. */
  async function resolveConflict(stored) {
    const mine = (el.code && el.code.value) || '';
    const theirs = String((stored && stored.code) || '');
    if (!SYNC) return 'overwrite';
    const choice = await SYNC.showConflict({
      name: (el.name && el.name.value) || (stored && stored.name) || '',
      leftText: theirs,
      rightText: mine,
      leftMeta: SYNC.describeEditor(stored)
    });
    if (choice === 'theirs') {
      fillForm(stored);
      _notify(t('us_conflict_took_theirs'), 'info');
    }
    return choice;
  }

  async function saveScript() {
    if (_saving) return;
    _saving = true;
    try {
      const id = (el.id && el.id.value) ||
        ('script_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9));
      const name = (el.name && el.name.value.trim()) || 'Không tên';
      let matches = el.matches ? el.matches.value.split(/[,\n]/).map((s) => s.trim()).filter((s) => s) : [];
      if (matches.length === 0) matches = ['<all_urls>'];
      const excludes = el.excludes ? el.excludes.value.split(/[,\n]/).map((s) => s.trim()).filter((s) => s) : [];
      const runAt = (el.runAt && el.runAt.value) || 'document_idle';
      const world = (el.world && el.world.value) || 'MAIN';
      const updateUrl = (el.updateUrl && el.updateUrl.value.trim()) || '';
      const code = (el.code && el.code.value) || '';

      // Always re-read right before writing: the sidebar may have saved between
      // our own read and this click. readAllEnsured() also backfills ids, so a
      // record from an older version can never be matched by accident.
      const fresh = SYNC
        ? (typeof SYNC.readAllEnsured === 'function' ? await SYNC.readAllEnsured(_editorLabel()) : await SYNC.readAll())
        : await browserApi.storage.local
          .get('sf_custom_scripts').then((r) => (r && r.sf_custom_scripts) || []);
      _scripts = fresh;
      const idx = fresh.findIndex((s) => s.id === id);
      const existing = idx > -1 ? fresh[idx] : {};

      if (idx > -1 && SYNC && SYNC.revOf(existing) !== _baseRev) {
        const storedCode = String(existing.code || '');
        const codeChanged = storedCode !== _baseCode;
        if (codeChanged) {
          const choice = await resolveConflict(existing);
          if (choice !== 'overwrite') return;
        } else {
          // Only metadata drifted (e.g. toggled on/off) — merge, don't prompt.
          _notify(t('us_conflict_merged_meta'), 'info');
        }
      }

      const merged = idx > -1 ? fresh[idx] : {};
      const payload = Object.assign({}, merged, {
        id, name, matches, excludes, code,
        active: merged.active !== false,
        runAt, world, updateUrl
      });
      const stamped = SYNC
        ? SYNC.stamp(payload, _editorLabel(), SYNC.SESSION_ID)
        : Object.assign(payload, { rev: (Number(payload.rev) || 0) + 1, updatedAt: Date.now() });

      const next = fresh.slice();
      if (idx > -1) next[idx] = stamped; else next.push(stamped);

      // The Studio keeps no id of its own, so a save opened for a script that
      // another surface removed - or a re-save after an import - would land on a
      // brand new id and duplicate it. Carry over every record this write does
      // not mention, exactly like the sidebar does; only a deliberate delete
      // (allowDelete) is allowed to drop one.
      const keptIds = new Set(next.map((r) => r && r.id).filter(Boolean));
      const survivors = fresh.filter((r) => r && r.id && !keptIds.has(r.id));
      const merged2 = survivors.length ? survivors.concat(next) : next;

      if (SYNC) await SYNC.writeAll(merged2); else await browserApi.storage.local.set({ sf_custom_scripts: merged2 });
      _scripts = merged2;
      _baseRev = SYNC ? SYNC.revOf(stamped) : (Number(stamped.rev) || 0);
      _baseCode = code;
      _currentScript = stamped;

      if (browserApi.runtime && browserApi.runtime.sendMessage) {
        browserApi.runtime.sendMessage({ action: 'US_RELOAD' }).catch(() => {});
      }
      _flashSaved();
    } catch (e) {
      _notify(t('us_save_failed') + ': ' + ((e && e.message) || e), 'error');
    } finally {
      _saving = false;
    }
  }

  function _flashSaved() {
    if (!el.btnSave) return;
    const label = el.btnSave.querySelector('span');
    if (label) label.textContent = t('us_saved');
    el.btnSave.style.borderColor = '#10b981';
    el.btnSave.style.color = '#34d399';
    setTimeout(() => {
      if (label) label.textContent = t('us_save');
      el.btnSave.style.borderColor = '';
      el.btnSave.style.color = '';
    }, 1500);
  }

  /**
   * The sidebar (or another Studio tab) saved something while this editor was
   * open. Adopt it silently when the buffer is untouched, otherwise leave the
   * buffer alone and let the next save raise the diff prompt.
   */
  function _watchRemote(info) {
    _scripts = info.scripts;
    if (!scriptId || info.changedIds.indexOf(scriptId) === -1) return;
    const incoming = info.scripts.find((s) => s.id === scriptId);
    const buffer = (el.code && el.code.value) || '';
    const dirty = buffer !== _baseCode;
    const plan = SYNC
      ? SYNC.planRemoteChange({ incoming: incoming, editorOpen: true, dirty: dirty })
      : { action: dirty ? 'warn' : 'adopt' };

    if (plan.action === 'adopt') {
      fillForm(incoming);
      _notify(t('us_synced_from_other'), 'success');
      return;
    }
    // 'warn' keeps _baseRev/_baseCode pinned to what the editor was opened at,
    // so saveScript() still sees the stale revision and raises the diff prompt.
    _notify(t('us_conflict_pending'), 'warn');
  }


  async function testScript() {
    if (!el.code) return;
    try {
      const tabs = await browserApi.tabs.query({ active: true, currentWindow: true });
      let targetTab = tabs && tabs[0];
      if (!targetTab || !targetTab.url || targetTab.url.startsWith('chrome') || targetTab.url.startsWith('about') || targetTab.url.startsWith('edge') || targetTab.url.includes(location.host)) {
        // Look for any regular web tab
        const allTabs = await browserApi.tabs.query({});
        targetTab = allTabs.find(t => t.url && (t.url.startsWith('http://') || t.url.startsWith('https://')));
      }
      if (!targetTab) {
        alert('Không tìm thấy tab trang web nào đang mở để chạy thử!');
        return;
      }

      const rawCode = el.code.value || '';
      const meta = (typeof window !== 'undefined' && window.SF_US_META) || (typeof globalThis !== 'undefined' && globalThis.SF_US_META);
      let codeToRun = rawCode;
      if (meta && typeof meta.sanitizeUserscriptCode === 'function') {
        codeToRun = meta.sanitizeUserscriptCode(codeToRun);
      }
      const gmShim = (typeof window !== 'undefined' && window.SF_GM_SHIM) || (typeof globalThis !== 'undefined' && globalThis.SF_FULL_GM_SHIM) || '';

      const runnerWrapper = `(function() {
  function _relay(level, args) {
    try {
      const text = args.map(a => {
        try { return (typeof a === 'object' && a !== null) ? JSON.stringify(a) : String(a); }
        catch(e) { return String(a); }
      }).join(' ');
      document.dispatchEvent(new CustomEvent('__SF_US_LOG__', {
        detail: { level: level, text: text, time: Date.now() }
      }));
    } catch(e) {}
  }
  const _origLog = console.log, _origWarn = console.warn, _origError = console.error, _origInfo = console.info;
  console.log = function(...a) { _relay('log', a); _origLog.apply(console, a); };
  console.warn = function(...a) { _relay('warn', a); _origWarn.apply(console, a); };
  console.error = function(...a) { _relay('error', a); _origError.apply(console, a); };
  console.info = function(...a) { _relay('info', a); _origInfo.apply(console, a); };

  window.addEventListener('error', function(e) {
    if (e && e.message) {
      _relay('error', ['[Lỗi Uncaught]', e.message, e.filename ? '(' + e.filename + ':' + e.lineno + ')' : '']);
    }
  });

  try {
    ${gmShim}
    ${codeToRun}
  } catch(err) {
    _relay('error', ['[Lỗi runtime]', err.stack || err.message || String(err)]);
  }
})();`;

      const results = await browserApi.scripting.executeScript({
        target: { tabId: targetTab.id },
        func: function(wrappedCode) {
          const logs = [];
          const onLog = (e) => {
            if (e.detail) logs.push(e.detail);
          };
          document.addEventListener('__SF_US_LOG__', onLog);
          try {
            const s = document.createElement('script');
            s.textContent = wrappedCode;
            const nonce = document.querySelector('script[nonce]')?.getAttribute('nonce');
            if (nonce) s.setAttribute('nonce', nonce);
            (document.documentElement || document.head).appendChild(s);
            s.remove();
          } catch (e) {
            logs.push({ level: 'error', text: 'Inject error: ' + e.message });
          }
          document.removeEventListener('__SF_US_LOG__', onLog);
          return logs;
        },
        args: [runnerWrapper]
      });

      let countLogged = 0;
      if (results && results[0] && results[0].result) {
        results[0].result.forEach(r => {
          logToConsole(r.level, [r.text]);
          countLogged++;
        });
      }
      if (countLogged === 0) {
        logToConsole('info', ['✓ Kịch bản đã được nạp vào trang thành công. (Không có console.log đồng bộ)']);
      }

      if (el.btnTest) {
        const label = el.btnTest.querySelector('span');
        if (label) label.textContent = 'Đã chạy!';
        el.btnTest.style.borderColor = '#10b981';
        el.btnTest.style.color = '#34d399';
        setTimeout(() => {
          if (label) label.textContent = 'Chạy thử';
          el.btnTest.style.borderColor = '';
          el.btnTest.style.color = '';
        }, 1500);
      }
    } catch (e) {
      logToConsole('error', ['Lỗi chạy thử:', e.message]);
    }
  }

  // ── Find & Replace logic ───────────────────────────────────
  let _findMatches = [];
  let _findIdx = 0;

  function doFind() {
    if (!el.code || !el.findInput) return;
    const q = el.findInput.value || '';
    if (!q) { _findMatches = []; if (el.findCount) el.findCount.textContent = ''; return; }
    _findMatches = [];
    let idx = 0;
    while ((idx = el.code.value.indexOf(q, idx)) !== -1) {
      _findMatches.push(idx);
      idx += q.length;
    }
    if (el.findCount) el.findCount.textContent = _findMatches.length + ' kết quả';
  }

  function selectMatch(i) {
    if (!el.code || !el.findInput || !_findMatches.length) return;
    const q = el.findInput.value || '';
    _findIdx = ((i % _findMatches.length) + _findMatches.length) % _findMatches.length;
    el.code.focus();
    el.code.setSelectionRange(_findMatches[_findIdx], _findMatches[_findIdx] + q.length);
    el.code.scrollTop = Math.max(0, (el.code.value.substring(0, _findMatches[_findIdx]).split('\n').length - 5) * 19);
    if (el.findCount) el.findCount.textContent = (_findIdx + 1) + '/' + _findMatches.length;
  }

  function setupEvents() {
    if (el.code) {
      el.code.addEventListener('input', () => { updateLineNumbers(); });
      el.code.addEventListener('keyup', updateCursorPos);
      el.code.addEventListener('click', updateCursorPos);
      el.code.addEventListener('scroll', () => {
        if (el.lineNumbers) el.lineNumbers.scrollTop = el.code.scrollTop;
      });
      el.code.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 's') { e.preventDefault(); saveScript(); }
        if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); testScript(); }
        if (e.ctrlKey && e.key === 'h') {
          e.preventDefault();
          if (el.findBar) {
            el.findBar.style.display = el.findBar.style.display === 'none' ? 'flex' : 'none';
            if (el.findBar.style.display === 'flex' && el.findInput) el.findInput.focus();
          }
        }
        if (e.key === 'Tab') {
          e.preventDefault();
          const start = el.code.selectionStart;
          const end = el.code.selectionEnd;
          el.code.value = el.code.value.substring(0, start) + '  ' + el.code.value.substring(end);
          el.code.selectionStart = el.code.selectionEnd = start + 2;
          updateLineNumbers();
        }
      });
    }

    if (el.btnSave) el.btnSave.onclick = saveScript;
    if (el.btnTest) el.btnTest.onclick = testScript;
    if (el.btnClose) el.btnClose.onclick = () => window.close();

    if (el.btnFormat) {
      el.btnFormat.onclick = () => {
        if (!el.code) return;
        let c = el.code.value.replace(/\r\n/g, '\n').replace(/\t/g, '  ');
        const lines = c.split('\n').map(l => l.trimEnd());
        const cleaned = [];
        let blank = 0;
        for (const l of lines) {
          if (l.trim() === '') { blank++; if (blank <= 2) cleaned.push(l); }
          else { blank = 0; cleaned.push(l); }
        }
        el.code.value = cleaned.join('\n').trim() + '\n';
        updateLineNumbers();
      };
    }

    if (el.btnParse) {
      el.btnParse.onclick = () => {
        if (!el.code) return;
        const metaApi = (typeof window !== 'undefined' && window.SF_US_META) || (typeof globalThis !== 'undefined' && globalThis.SF_US_META);
        const meta = metaApi ? metaApi.parse(el.code.value) : parseGMMetadata(el.code.value);
        if (!meta) { alert('Không tìm thấy header ==UserScript== trong mã!'); return; }
        if (el.name && meta.name) el.name.value = meta.name;
        
        const fields = metaApi ? metaApi.fieldsOf({ code: el.code.value }) : null;
        if (el.matches) {
          if (fields && fields.matches && fields.matches.length) {
            el.matches.value = fields.matches.join('\n');
          } else if (meta.match) {
            el.matches.value = Array.isArray(meta.matches) ? meta.matches.join('\n') : meta.match;
          }
        }
        if (el.excludes && fields) {
          const exList = (fields.excludeMatches || []).concat(fields.excludes || []).filter(Boolean);
          if (exList.length) el.excludes.value = exList.join('\n');
        }
        if (el.runAt && fields && fields.runAt) el.runAt.value = fields.runAt;
        if (el.updateUrl && fields && fields.updateUrl) el.updateUrl.value = fields.updateUrl;
        alert('Đã đồng bộ thông tin từ header: ' + (meta.name || ''));
      };
    }

    if (el.btnExport) {
      el.btnExport.onclick = () => {
        if (!el.code) return;
        const name = (el.name && el.name.value.trim()) || 'script';
        const blob = new Blob([el.code.value], { type: 'application/javascript' });
        const u = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = u;
        a.download = name.replace(/[^a-z0-9]/gi, '_') + '.user.js';
        a.click();
        URL.revokeObjectURL(u);
      };
    }

    if (el.btnFind) {
      el.btnFind.onclick = () => {
        if (!el.findBar) return;
        el.findBar.style.display = el.findBar.style.display === 'none' ? 'flex' : 'none';
        if (el.findBar.style.display === 'flex' && el.findInput) el.findInput.focus();
      };
    }

    if (el.btnFindClose) el.btnFindClose.onclick = () => { if (el.findBar) el.findBar.style.display = 'none'; };
    if (el.findInput) el.findInput.addEventListener('input', () => { doFind(); selectMatch(0); });
    if (el.btnFindNext) el.btnFindNext.onclick = () => { doFind(); selectMatch(_findIdx + 1); };
    if (el.btnFindPrev) el.btnFindPrev.onclick = () => { doFind(); selectMatch(_findIdx - 1); };
    if (el.btnReplaceOne) {
      el.btnReplaceOne.onclick = () => {
        if (!el.code || !el.findInput || !el.replaceInput || !_findMatches.length) return;
        const q = el.findInput.value || '';
        const r = el.replaceInput.value || '';
        const pos = _findMatches[_findIdx];
        el.code.value = el.code.value.substring(0, pos) + r + el.code.value.substring(pos + q.length);
        updateLineNumbers();
        doFind();
        selectMatch(_findIdx);
      };
    }
    if (el.btnReplaceAll) {
      el.btnReplaceAll.onclick = () => {
        if (!el.code || !el.findInput || !el.replaceInput) return;
        const q = el.findInput.value || '';
        const r = el.replaceInput.value || '';
        if (!q) return;
        const count = el.code.value.split(q).length - 1;
        el.code.value = el.code.value.split(q).join(r);
        updateLineNumbers();
        doFind();
        if (el.findCount) el.findCount.textContent = 'Đã thay thế ' + count + ' vị trí';
      };
    }

    if (el.btnToggleConsole) {
      el.btnToggleConsole.onclick = () => {
        if (!el.consoleDrawer) return;
        el.consoleDrawer.style.display = el.consoleDrawer.style.display === 'none' ? 'flex' : 'none';
      };
    }
    if (el.btnConsoleClose) {
      el.btnConsoleClose.onclick = () => {
        if (el.consoleDrawer) el.consoleDrawer.style.display = 'none';
      };
    }
    if (el.btnConsoleClear) {
      el.btnConsoleClear.onclick = () => {
        if (el.consoleLogs) el.consoleLogs.textContent = '';
      };
    }

    if (browserApi.runtime && browserApi.runtime.onMessage) {
      browserApi.runtime.onMessage.addListener((msg) => {
        if (msg && msg.action === 'SF_US_LIVE_LOG' && msg.log) {
          logToConsole(msg.log.level, [msg.log.text]);
        }
      });
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    setupEvents();
    loadData();
    // Keep this tab in step with the sidebar: a save there shows up here
    // without a reload, and a concurrent edit is flagged instead of lost.
    if (SYNC && typeof SYNC.watch === 'function') SYNC.watch(_watchRemote);
  });
})();
