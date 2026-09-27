// OS/js/tabs/userscripts-studio.js
// Standalone Full-Page Userscript Editor for ScholarFlow

(function() {
  'use strict';

  const browserApi = (typeof chrome !== 'undefined' && chrome.storage) ? chrome : browser;
  const urlParams = new URLSearchParams(window.location.search);
  const scriptId = urlParams.get('id') || '';

  let _scripts = [];
  let _currentScript = null;

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

  function loadData() {
    browserApi.storage.local.get('sf_custom_scripts', (res) => {
      _scripts = res.sf_custom_scripts || [];
      if (scriptId) {
        _currentScript = _scripts.find(s => s.id === scriptId);
      }
      if (_currentScript) {
        if (el.id) el.id.value = _currentScript.id;
        if (el.name) el.name.value = _currentScript.name || '';
        if (el.matches) el.matches.value = (_currentScript.matches || []).join(', ');
        if (el.excludes) el.excludes.value = (_currentScript.excludes || []).join(', ');
        if (el.runAt) el.runAt.value = _currentScript.runAt || 'document_idle';
        if (el.world) el.world.value = _currentScript.world || 'MAIN';
        if (el.updateUrl) el.updateUrl.value = _currentScript.updateUrl || '';
        if (el.code) el.code.value = _currentScript.code || '';
        document.title = (_currentScript.name || 'Script') + ' - ScholarFlow Studio';
      } else {
        if (el.id) el.id.value = 'script_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
        if (el.name) el.name.value = 'Kịch bản mới';
        if (el.matches) el.matches.value = '*://*/*';
        if (el.excludes) el.excludes.value = '';
        if (el.runAt) el.runAt.value = 'document_idle';
        if (el.world) el.world.value = 'MAIN';
        if (el.updateUrl) el.updateUrl.value = '';
        if (el.code) el.code.value = '// ==UserScript==\n// @name         Kịch bản mới\n// @match        *://*/*\n// @grant        GM_getValue\n// @grant        GM_setValue\n// ==/UserScript==\n\nconsole.log("ScholarFlow Userscript loaded!");\n';
      }
      setTimeout(updateLineNumbers, 20);
      setTimeout(updateCursorPos, 20);
    });
  }

  function saveScript() {
    const id = (el.id && el.id.value) || ('script_' + Date.now());
    const name = (el.name && el.name.value.trim()) || 'Không tên';
    let matches = el.matches ? el.matches.value.split(/[,\n]/).map(s => s.trim()).filter(s => s) : [];
    if (matches.length === 0) matches = ['<all_urls>'];
    let excludes = el.excludes ? el.excludes.value.split(/[,\n]/).map(s => s.trim()).filter(s => s) : [];
    const runAt = (el.runAt && el.runAt.value) || 'document_idle';
    const world = (el.world && el.world.value) || 'MAIN';
    const updateUrl = (el.updateUrl && el.updateUrl.value.trim()) || '';
    const code = (el.code && el.code.value) || '';

    const idx = _scripts.findIndex(s => s.id === id);
    const existing = idx > -1 ? _scripts[idx] : {};
    const scriptData = Object.assign({}, existing, {
      id, name, matches, excludes, code, active: existing.active !== false,
      runAt, world, updateUrl
    });

    if (idx > -1) {
      _scripts[idx] = scriptData;
    } else {
      _scripts.push(scriptData);
    }

    browserApi.storage.local.set({ sf_custom_scripts: _scripts }, () => {
      if (browserApi.runtime && browserApi.runtime.sendMessage) {
        browserApi.runtime.sendMessage({ action: 'RELOAD_USERSCRIPTS' }).catch(() => {});
      }
      if (el.btnSave) {
        const label = el.btnSave.querySelector('span');
        if (label) label.textContent = 'Đã lưu!';
        el.btnSave.style.borderColor = '#10b981';
        el.btnSave.style.color = '#34d399';
        setTimeout(() => {
          if (label) label.textContent = 'Lưu';
          el.btnSave.style.borderColor = '';
          el.btnSave.style.color = '';
        }, 1500);
      }
    });
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

      const gmShim = `
const GM_getValue = function(key, def) { try { return JSON.parse(localStorage.getItem('GM_' + key)) ?? def; } catch(e) { return localStorage.getItem('GM_' + key) || def; } };
const GM_setValue = function(key, val) { localStorage.setItem('GM_' + key, JSON.stringify(val)); };
const GM_deleteValue = function(key) { localStorage.removeItem('GM_' + key); };
const GM = {
  getValue: async function(key, def) { return GM_getValue(key, def); },
  setValue: async function(key, val) { return GM_setValue(key, val); },
  deleteValue: async function(key) { return GM_deleteValue(key); },
  addStyle: function(css) { const style = document.createElement('style'); style.textContent = css; (document.head || document.documentElement).appendChild(style); }
};
const GM_addStyle = GM.addStyle;
`;
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
    ${el.code.value}
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
        const meta = parseGMMetadata(el.code.value);
        if (!meta) { alert('Không tìm thấy header ==UserScript== trong mã!'); return; }
        if (el.name && meta.name) el.name.value = meta.name;
        if (el.matches && meta.match) el.matches.value = meta.match;
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
  });
})();
