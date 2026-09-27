// OS/js/tabs/userscripts.js
(function() {
  const browserApi = (typeof browser !== "undefined" && browser) ? browser : chrome;

  let _scripts = [];
  let _searchQuery = '';
  let _searchStatus = '';

  const SCRIPT_TEMPLATES = [
    {
      name: "Dark Mode — Tất cả trang",
      matches: ["*://*/*"],
      excludes: [],
      runAt: "document_idle",
      code: `// Dark Mode Universal\n(function() {\n  const style = document.createElement('style');\n  style.id = 'sf-dark-mode';\n  style.textContent = \`\n    html { filter: invert(1) hue-rotate(180deg) !important; }\n    img, video, canvas, svg { filter: invert(1) hue-rotate(180deg) !important; }\n  \`;\n  document.documentElement.appendChild(style);\n})();`
    },
    {
      name: "Ẩn Quảng cáo YouTube",
      matches: ["*://*.youtube.com/*"],
      excludes: [],
      runAt: "document_idle",
      code: `// Hide YouTube ads\n(function() {\n  const style = document.createElement('style');\n  style.textContent = \`\n    .video-ads, .ytp-ad-module, #masthead-ad, ytd-banner-promo-renderer,\n    ytd-statement-banner-renderer, ytd-ad-slot-renderer, .ytd-promoted-sparkles-web-renderer { display: none !important; }\n  \`;\n  document.head.appendChild(style);\n\n  const skipBtn = () => {\n    const btn = document.querySelector('.ytp-ad-skip-button, .ytp-skip-ad-button');\n    if (btn) btn.click();\n    const adVideo = document.querySelector('video.html5-main-video');\n    if (adVideo && document.querySelector('.ytp-ad-module')) {\n      adVideo.currentTime = adVideo.duration;\n    }\n  };\n  setInterval(skipBtn, 300);\n})();`
    },
    {
      name: "Return YouTube Dislike (GM_xmlhttpRequest)",
      matches: ["*://*.youtube.com/*"],
      excludes: [],
      runAt: "document_idle",
      updateUrl: "https://update.greasyfork.org/scripts/436115/Return%20YouTube%20Dislike.user.js",
      code: `// ==UserScript==\n// @name         Return YouTube Dislike\n// @namespace    scholarflow\n// @version      1.0\n// @description  Hiển thị số lượng Dislike trên YouTube qua API thực\n// @match        *://*.youtube.com/*\n// @grant        GM_xmlhttpRequest\n// ==/UserScript==\n\n(function() {\n  function getDislikes() {\n    const videoId = new URLSearchParams(window.location.search).get('v');\n    if (!videoId) return;\n    GM_xmlhttpRequest({\n      method: 'GET',\n      url: 'https://returnyoutubedislikeapi.com/votes?videoId=' + videoId,\n      onload: function(res) {\n        try {\n          const data = JSON.parse(res.responseText);\n          const dislikes = data.dislikes;\n          const dislikeBtn = document.querySelector('dislike-button-view-model button, #segmented-dislike-button button');\n          if (dislikeBtn) {\n            let label = dislikeBtn.querySelector('#sf-dislike-count');\n            if (!label) {\n              label = document.createElement('span');\n              label.id = 'sf-dislike-count';\n              label.style.marginLeft = '6px';\n              dislikeBtn.appendChild(label);\n            }\n            label.textContent = Intl.NumberFormat('en', { notation: 'compact' }).format(dislikes);\n          }\n        } catch(e) {}\n      }\n    });\n  }\n  window.addEventListener('yt-navigate-finish', getDislikes);\n  setTimeout(getDislikes, 1500);\n})();`
    },
    {
      name: "Dịch văn bản đã chọn (Mini Translator)",
      matches: ["*://*/*"],
      excludes: [],
      runAt: "document_idle",
      code: `// ==UserScript==\n// @name         Dịch văn bản chọn\n// @namespace    scholarflow\n// @version      1.0\n// @description  Bôi đen văn bản để dịch nhanh sang tiếng Việt qua GM_xmlhttpRequest\n// @match        *://*/*\n// @grant        GM_xmlhttpRequest\n// ==/UserScript==\n\n(function() {\n  let tip;\n  document.addEventListener('mouseup', function(e) {\n    const text = window.getSelection().toString().trim();\n    if (!text || text.length < 2 || text.length > 300) {\n      if (tip) tip.remove();\n      return;\n    }\n    const url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=vi&dt=t&q=' + encodeURIComponent(text);\n    GM_xmlhttpRequest({\n      method: 'GET',\n      url: url,\n      onload: function(res) {\n        try {\n          const json = JSON.parse(res.responseText);\n          const translated = json[0].map(item => item[0]).join('');\n          if (!tip) {\n            tip = document.createElement('div');\n            tip.style.cssText = 'position:fixed;z-index:999999;background:#1e1e2e;color:#f1f5f9;padding:6px 10px;border-radius:6px;font-size:12px;box-shadow:0 8px 24px rgba(0,0,0,0.5);border:1px solid #444;max-width:320px;line-height:1.4;';\n            document.body.appendChild(tip);\n          }\n          tip.textContent = '🇻🇳 ' + translated;\n          tip.style.left = Math.min(e.clientX + 10, window.innerWidth - 330) + 'px';\n          tip.style.top = (e.clientY + 15) + 'px';\n        } catch(err) {}\n      }\n    });\n  });\n  document.addEventListener('mousedown', function(e) {\n    if (tip && !tip.contains(e.target)) tip.remove();\n  });\n})();`
    },
    {
      name: "Bỏ qua trang đệm chuyển hướng",
      matches: ["*://*/*"],
      excludes: [],
      runAt: "document_idle",
      code: `// Bypass redirect intermediate links\n(function() {\n  document.querySelectorAll('a[href*=\"google.com/url?\"], a[href*=\"facebook.com/l.php?\"], a[href*=\"youtube.com/redirect?\"]').forEach(a => {\n    try {\n      const u = new URL(a.href);\n      const target = u.searchParams.get('url') || u.searchParams.get('q') || u.searchParams.get('u');\n      if (target) a.href = decodeURIComponent(target);\n    } catch(e) {}\n  });\n})();`
    },
    {
      name: "Mở khóa Copy & Chuột phải",
      matches: ["*://*/*"],
      excludes: [],
      runAt: "document_start",
      code: `// Unlock copy & right click\n(function() {\n  ['copy', 'cut', 'contextmenu', 'selectstart', 'mousedown', 'mouseup', 'keydown'].forEach(evt => {\n    document.addEventListener(evt, e => e.stopImmediatePropagation(), true);\n  });\n  const s = document.createElement('style');\n  s.textContent = '* { -webkit-user-select: text !important; user-select: text !important; }';\n  document.documentElement.appendChild(s);\n})();`
    },
    {
      name: "Cuộn trang mượt hơn",
      matches: ["*://*/*"],
      excludes: [],
      runAt: "document_start",
      code: `// Smooth scroll\ndocument.documentElement.style.scrollBehavior = 'smooth';`
    },
    {
      name: "Hiện mật khẩu đã nhập",
      matches: ["*://*/*"],
      excludes: [],
      runAt: "document_idle",
      code: `// Show password toggle\n(function() {\n  document.querySelectorAll('input[type=\"password\"]').forEach(inp => {\n    const btn = document.createElement('button');\n    btn.textContent = '👁';\n    btn.style.cssText = 'margin-left:4px;cursor:pointer;border:1px solid #ccc;background:#f9f9f9;padding:2px 6px;border-radius:4px;';\n    btn.type = 'button';\n    btn.onclick = () => { inp.type = inp.type === 'password' ? 'text' : 'password'; };\n    inp.parentNode.insertBefore(btn, inp.nextSibling);\n  });\n})();`
    },
    {
      name: "Tự động bấm nút 'Đồng ý Cookie'",
      matches: ["*://*/*"],
      excludes: [],
      runAt: "document_idle",
      code: `// Auto-click cookie consent\n(function() {\n  const keywords = ['accept', 'agree', 'got it', 'ok', 'consent', 'allow', 'chấp nhận', 'đồng ý'];\n  const tryClick = () => {\n    document.querySelectorAll('button, a[role=\"button\"]').forEach(btn => {\n      const text = btn.textContent.toLowerCase().trim();\n      if (keywords.some(k => text.includes(k)) && btn.offsetParent !== null) {\n        btn.click();\n      }\n    });\n  };\n  setTimeout(tryClick, 1000);\n  setTimeout(tryClick, 3000);\n})();`
    }
  ];

  const dom = {
    list: document.getElementById('us-list'),
    btnAdd: document.getElementById('btn-us-add'),
    btnImport: document.getElementById('btn-us-import'),
    btnImportUrl: document.getElementById('btn-us-import-url'),
    btnExport: document.getElementById('btn-us-export'),
    editor: document.getElementById('us-editor-container'),
    listContainer: document.getElementById('us-list-container'),
    editId: document.getElementById('us-edit-id'),
    editName: document.getElementById('us-edit-name'),
    editMatches: document.getElementById('us-edit-matches'),
    editExcludes: document.getElementById('us-edit-excludes'),
    editRunAt: document.getElementById('us-edit-runat'),
    editUpdateUrl: document.getElementById('us-edit-update-url'),
    editCode: document.getElementById('us-edit-code'),
    btnSave: document.getElementById('btn-us-save'),
    btnCancel: document.getElementById('btn-us-cancel'),
    ffPermBox: document.getElementById('us-ff-perm-box'),
    btnReqPerm: document.getElementById('btn-us-req-perm')
  };

  async function _checkPermissions() {
    // Only Firefox has browser.permissions.contains that checks optional permissions for userScripts
    if (typeof browserApi.permissions !== "undefined" && typeof browserApi.permissions.contains === "function") {
      try {
        const hasPerm = await browserApi.permissions.contains({ permissions: ["userScripts"] });
        if (!hasPerm) {
          if (dom.ffPermBox) dom.ffPermBox.style.display = 'block';
        } else {
          if (dom.ffPermBox) dom.ffPermBox.style.display = 'none';
        }
      } catch (e) {
        console.warn("Permission check failed", e);
      }
    }
  }

  let _currentTabUrl = '';
  async function _updateCurrentTabUrl() {
    try {
      const tabs = await browserApi.tabs.query({ active: true, currentWindow: true });
      if (tabs && tabs[0] && tabs[0].url) {
        _currentTabUrl = tabs[0].url;
      }
    } catch (e) {}
  }

  function _scriptMatchesUrl(script, url) {
    if (!url) return true;
    if (!script.matches || script.matches.length === 0) return true;
    return script.matches.some(pattern => {
      if (pattern === '<all_urls>' || pattern === '*://*/*') return true;
      try {
        const regexStr = '^' + pattern
          .replace(/[-[\]{}()+?.,\\^$|#\s]/g, '\\$&')
          .replace(/\\\*/g, '.*');
        return new RegExp(regexStr).test(url);
      } catch (e) {
        return false;
      }
    });
  }

  function _load() {
    _updateCurrentTabUrl().finally(() => {
      browserApi.storage.local.get("sf_custom_scripts", (res) => {
        _scripts = res.sf_custom_scripts || [];
        _render();
      });
    });
  }

  function _save() {
    browserApi.storage.local.set({ sf_custom_scripts: _scripts }, () => {
      _render();
      // Notify background to reload scripts
      if (browserApi.runtime && browserApi.runtime.sendMessage) {
        browserApi.runtime.sendMessage({ action: "RELOAD_USERSCRIPTS" }).catch(()=>{});
      }
    });
  }

  function _render() {
    if (!dom.list) return;
    dom.list.innerHTML = '';

    // Filter by search + status
    const q = _searchQuery.toLowerCase();
    const filtered = _scripts.filter(s => {
      const matchText = !q || (s.name || '').toLowerCase().includes(q) ||
                        (s.matches || []).some(m => m.includes(q));
      let matchStatus = true;
      if (_searchStatus === 'active') {
        matchStatus = s.active !== false;
      } else if (_searchStatus === 'inactive') {
        matchStatus = s.active === false;
      } else if (_searchStatus === 'current_page') {
        matchStatus = _scriptMatchesUrl(s, _currentTabUrl);
      }
      return matchText && matchStatus;
    });
    
    if (filtered.length === 0) {
      const empty = document.createElement('li');
      empty.style.cssText = 'font-size:11px;color:var(--text-muted);text-align:center;padding:12px 10px;';
      if (_searchStatus === 'current_page') {
        empty.textContent = 'Không có script nào áp dụng cho trang này';
      } else if (_scripts.length === 0) {
        empty.textContent = 'Chưa có script nào';
      } else {
        empty.textContent = 'Không tìm thấy script nào';
      }
      dom.list.appendChild(empty);
      return;
    }

    filtered.forEach((script) => {
      const li = document.createElement('li');
      li.className = 'us-item-card';

      // --- Top Row ---
      const topRow = document.createElement('div');
      topRow.className = 'us-item-top';

      const infoWrap = document.createElement('div');
      infoWrap.className = 'us-item-info';

      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.className = 'us-checkbox';
      cb.checked = script.active !== false;
      cb.title = script.active !== false ? 'Đang bật - Nhấn để tắt' : 'Đang tắt - Nhấn để bật';
      cb.onchange = () => {
        script.active = cb.checked;
        _save();
      };

      const title = document.createElement('span');
      title.className = 'us-item-title';
      title.textContent = script.name || "Không tên";
      title.title = 'Nhấn để chỉnh sửa: ' + (script.name || 'Script');
      title.onclick = () => _edit(script.id);

      infoWrap.appendChild(cb);
      infoWrap.appendChild(title);

      // Active / Inactive Badge
      const statusBadge = document.createElement('span');
      if (script.active !== false) {
        statusBadge.className = 'us-badge us-badge-active';
        statusBadge.textContent = 'BẬT';
      } else {
        statusBadge.className = 'us-badge us-badge-inactive';
        statusBadge.textContent = 'TẮT';
      }
      infoWrap.appendChild(statusBadge);

      // Sync indicator badge
      if (script.updateUrl) {
        const syncBadge = document.createElement('span');
        syncBadge.className = 'us-badge us-badge-sync';
        syncBadge.title = 'Tự động cập nhật: ' + script.updateUrl;
        syncBadge.innerHTML = '<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg> SYNC';
        infoWrap.appendChild(syncBadge);
      }

      // Run count badge
      if (script.runCount > 0) {
        const countBadge = document.createElement('span');
        countBadge.className = 'us-badge us-badge-count';
        countBadge.title = 'Đã chạy ' + script.runCount + ' lần' + (script.lastRun ? ' • Gần nhất: ' + new Date(script.lastRun).toLocaleTimeString() : '');
        countBadge.textContent = '×' + script.runCount;
        infoWrap.appendChild(countBadge);
      }

      topRow.appendChild(infoWrap);

      // --- Right Action Button Group ---
      const btnGroup = document.createElement('div');
      btnGroup.className = 'us-btn-group';

      const scriptIdx = _scripts.indexOf(script);

      // Move Up
      const btnUp = document.createElement('button');
      btnUp.type = 'button';
      btnUp.className = 'us-btn us-btn-icon';
      btnUp.title = 'Di chuyển lên';
      btnUp.disabled = scriptIdx === 0;
      btnUp.innerHTML = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>';
      btnUp.onclick = () => {
        if (scriptIdx > 0) {
          [_scripts[scriptIdx - 1], _scripts[scriptIdx]] = [_scripts[scriptIdx], _scripts[scriptIdx - 1]];
          _save();
        }
      };

      // Move Down
      const btnDown = document.createElement('button');
      btnDown.type = 'button';
      btnDown.className = 'us-btn us-btn-icon';
      btnDown.title = 'Di chuyển xuống';
      btnDown.disabled = scriptIdx === _scripts.length - 1;
      btnDown.innerHTML = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>';
      btnDown.onclick = () => {
        if (scriptIdx < _scripts.length - 1) {
          [_scripts[scriptIdx], _scripts[scriptIdx + 1]] = [_scripts[scriptIdx + 1], _scripts[scriptIdx]];
          _save();
        }
      };

      // Apply / Run
      const btnRun = document.createElement('button');
      btnRun.type = 'button';
      btnRun.className = 'us-btn us-btn-icon us-success';
      btnRun.title = 'Áp dụng ngay lên trang web đang mở';
      btnRun.innerHTML = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 21"></polygon></svg>';
      btnRun.onclick = async () => {
        try {
          const tabs = await browserApi.tabs.query({active: true, currentWindow: true});
          if (!tabs || !tabs[0]) return alert("Không tìm thấy trang để áp dụng!");
          
          if (!script.active) {
            browserApi.tabs.reload(tabs[0].id);
            btnRun.title = 'Đã tải lại trang!';
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
          await browserApi.scripting.executeScript({
            target: { tabId: tabs[0].id },
            func: (codeStr) => {
              const s = document.createElement('script');
              s.textContent = codeStr;
              const nonce = document.querySelector('script[nonce]')?.getAttribute('nonce');
              if (nonce) s.setAttribute('nonce', nonce);
              (document.documentElement || document.head).appendChild(s);
            },
            args: [gmShim + '\n' + script.code]
          });
          btnRun.title = 'Đã áp dụng thành công!';
        } catch (e) {
          alert("Lỗi khi áp dụng: " + e.message);
        }
      };

      // Edit
      const btnEdit = document.createElement('button');
      btnEdit.type = 'button';
      btnEdit.className = 'us-btn us-btn-icon';
      btnEdit.title = 'Chỉnh sửa script';
      btnEdit.innerHTML = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>';
      btnEdit.onclick = () => _edit(script.id);

      // Open Web Studio
      const btnOpenWeb = document.createElement('button');
      btnOpenWeb.type = 'button';
      btnOpenWeb.className = 'us-btn us-btn-icon';
      btnOpenWeb.title = 'Mở trong Userscript Studio (tab toàn màn hình)';
      btnOpenWeb.innerHTML = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>';
      btnOpenWeb.onclick = () => {
        const url = browserApi.runtime.getURL('OS/html/userscripts.html?id=' + encodeURIComponent(script.id));
        browserApi.tabs.create({ url });
      };

      // Duplicate
      const btnDupe = document.createElement('button');
      btnDupe.type = 'button';
      btnDupe.className = 'us-btn us-btn-icon';
      btnDupe.title = 'Nhân bản (sao chép) script';
      btnDupe.innerHTML = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
      btnDupe.onclick = () => {
        const clone = Object.assign({}, script, {
          id: 'script_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
          name: script.name + ' (bản sao)',
          runCount: 0,
          lastRun: null
        });
        _scripts.push(clone);
        _save();
      };

      // Delete
      const btnDel = document.createElement('button');
      btnDel.type = 'button';
      btnDel.className = 'us-btn us-btn-icon us-danger';
      btnDel.title = 'Xóa script này';
      btnDel.innerHTML = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>';
      btnDel.onclick = () => {
        if (confirm("Xóa script \"" + script.name + "\"?")) {
          _scripts = _scripts.filter(s => s.id !== script.id);
          _save();
        }
      };

      btnGroup.appendChild(btnUp);
      btnGroup.appendChild(btnDown);
      btnGroup.appendChild(btnRun);
      btnGroup.appendChild(btnEdit);
      btnGroup.appendChild(btnOpenWeb);
      btnGroup.appendChild(btnDupe);
      btnGroup.appendChild(btnDel);

      topRow.appendChild(btnGroup);
      li.appendChild(topRow);

      // --- Bottom Row (Detailed context pills) ---
      const bottomRow = document.createElement('div');
      bottomRow.className = 'us-item-bottom';

      // 1. Matches pattern pill
      const matchPill = document.createElement('span');
      matchPill.className = 'us-pill';
      const matchText = (script.matches && script.matches.length) ? script.matches[0] : '<all_urls>';
      const extraMatches = (script.matches && script.matches.length > 1) ? ` +${script.matches.length - 1}` : '';
      matchPill.textContent = matchText + extraMatches;
      matchPill.title = 'URL Áp dụng: ' + ((script.matches || []).join(', ') || '<all_urls>');
      bottomRow.appendChild(matchPill);

      // 2. RunAt & World pill
      const runWorldPill = document.createElement('span');
      runWorldPill.className = 'us-pill';
      runWorldPill.textContent = (script.runAt || 'document_idle') + ' • ' + (script.world || 'MAIN');
      runWorldPill.title = 'Thời điểm chạy: ' + (script.runAt || 'document_idle') + ' | Execution World: ' + (script.world || 'MAIN');
      bottomRow.appendChild(runWorldPill);

      // 3. Lines & Size pill
      const codeStr = script.code || '';
      const lineCount = (codeStr.match(/\n/g) || []).length + 1;
      const byteSize = codeStr.length < 1024 ? (codeStr.length + ' B') : ((codeStr.length / 1024).toFixed(1) + ' KB');
      const sizePill = document.createElement('span');
      sizePill.className = 'us-pill';
      sizePill.textContent = lineCount + ' dòng • ' + byteSize;
      bottomRow.appendChild(sizePill);

      li.appendChild(bottomRow);
      dom.list.appendChild(li);
    });
  }



  function _updateLineNumbers() {
    const editCode = document.getElementById('us-edit-code');
    const lineNumbers = document.getElementById('us-line-numbers');
    const charCount = document.getElementById('us-char-count');
    if (!editCode || !lineNumbers) return;
    const lines = (editCode.value.match(/\n/g) || []).length + 1;
    lineNumbers.textContent = Array.from({length: lines}, (_, i) => i + 1).join('\n');
    lineNumbers.scrollTop = editCode.scrollTop;
    if (charCount) charCount.textContent = editCode.value.length + ' ký tự';
  }

  function _updateCursorPos() {
    const editCode = document.getElementById('us-edit-code');
    const posEl = document.getElementById('us-cursor-pos');
    if (!editCode || !posEl) return;
    const text = editCode.value.substring(0, editCode.selectionStart);
    const lines = text.split('\n');
    posEl.textContent = 'Dòng ' + lines.length + ', Cột ' + lines[lines.length - 1].length;
  }

  function _parseGMMetadata(code) {
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

  function _showMetaBar(meta) {
    const bar = document.getElementById('us-meta-bar');
    const metaName = document.getElementById('us-meta-name');
    const metaVer = document.getElementById('us-meta-version');
    const metaAuthor = document.getElementById('us-meta-author');
    const metaDesc = document.getElementById('us-meta-desc');
    if (!bar) return;
    if (!meta) { bar.style.display = 'none'; return; }
    bar.style.display = 'block';
    if (metaName) metaName.textContent = meta.name || '';
    if (metaVer) metaVer.textContent = meta.version ? 'v' + meta.version : '';
    if (metaAuthor) {
      metaAuthor.textContent = meta.author ? ('Tác giả: ' + meta.author) : '';
      metaAuthor.style.display = meta.author ? 'inline-flex' : 'none';
    }
    const metaMatch = document.getElementById('us-meta-match');
    if (metaMatch) {
      metaMatch.textContent = meta.match ? ('Match: ' + meta.match) : '';
      metaMatch.style.display = meta.match ? 'inline-flex' : 'none';
    }
    if (metaDesc) metaDesc.textContent = meta.description || '';
  }

  function _edit(id) {
    dom.listContainer.style.display = 'none';
    dom.editor.style.display = 'block';

    // Hide console panel when opening editor
    const cp = document.getElementById('us-console-panel');
    if (cp) cp.style.display = 'none';
    const co = document.getElementById('us-console-output');
    if (co) co.textContent = '';

    // Re-query editor elements fresh each time
    const editId       = document.getElementById('us-edit-id');
    const editName     = document.getElementById('us-edit-name');
    const editMatches  = document.getElementById('us-edit-matches');
    const editExcludes = document.getElementById('us-edit-excludes');
    const editRunAt    = document.getElementById('us-edit-runat');
    const editWorld    = document.getElementById('us-edit-world');
    const editUpdateUrl = document.getElementById('us-edit-update-url');
    const editCode     = document.getElementById('us-edit-code');

    if (id) {
      const script = _scripts.find(s => s.id === id);
      if (!script) return;
      if (editId) editId.value = script.id;
      if (editName) editName.value = script.name || "";
      if (editMatches) editMatches.value = (script.matches || []).join('\n');
      if (editExcludes) editExcludes.value = (script.excludes || []).join('\n');
      if (editRunAt) editRunAt.value = script.runAt || "document_idle";
      if (editWorld) editWorld.value = script.world || "MAIN";
      if (editUpdateUrl) editUpdateUrl.value = script.updateUrl || "";
      if (editCode) {
        editCode.value = script.code || "";
        _showMetaBar(_parseGMMetadata(script.code || ''));
      }
    } else {
      if (editId) editId.value = "";
      if (editName) editName.value = "";
      if (editMatches) editMatches.value = "*://*/*";
      if (editExcludes) editExcludes.value = "";
      if (editRunAt) editRunAt.value = "document_idle";
      if (editWorld) editWorld.value = "MAIN";
      if (editUpdateUrl) editUpdateUrl.value = "";
      if (editCode) editCode.value = "// Your code here...\nconsole.log('Hello');";
      _showMetaBar(null);
    }

    setTimeout(_updateLineNumbers, 10);
    setTimeout(_updateCursorPos, 10);
  }

  function _closeEditor() {
    dom.listContainer.style.display = 'block';
    dom.editor.style.display = 'none';
    const findBar = document.getElementById('us-find-bar');
    if (findBar) findBar.style.display = 'none';
  }


  function _init() {
    if (!dom.list) return;

    _checkPermissions();
    _load();

    if (dom.btnReqPerm) {
      dom.btnReqPerm.onclick = async () => {
        if (browserApi.permissions && browserApi.permissions.request) {
          const granted = await browserApi.permissions.request({ permissions: ["userScripts"] });
          if (granted) {
            dom.ffPermBox.style.display = 'none';
            alert("Đã cấp quyền thành công!");
          }
        }
      };
    }

    dom.btnAdd.onclick = () => _edit();
    
    if (dom.btnImport) {
      dom.btnImport.onclick = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.js,.txt';
        input.onchange = (e) => {
          const file = e.target.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = (e) => {
            const code = e.target.result;
            // Basic parsing of Greasemonkey header
            let name = file.name;
            const nameMatch = code.match(/@name\s+(.+)/);
            if (nameMatch) name = nameMatch[1].trim();
            
            let matches = [];
            const matchRe = /@match\s+(.+)/g;
            let m;
            while ((m = matchRe.exec(code)) !== null) {
              matches.push(m[1].trim());
            }
            if (matches.length === 0) matches = ["*://*/*"];
            
            let excludes = [];
            const excludeRe = /@exclude\s+(.+)/g;
            while ((m = excludeRe.exec(code)) !== null) {
              excludes.push(m[1].trim());
            }
            
            const scriptData = {
              id: 'script_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
              name,
              matches,
              excludes,
              code,
              active: true,
              runAt: "document_idle"
            };
            
            _scripts.push(scriptData);
            _save();
            alert("Đã nhập script thành công!");
          };
          reader.readAsText(file);
        };
        input.click();
      };
    }
    
    if (dom.btnImportUrl) {
      dom.btnImportUrl.onclick = async () => {
        const url = prompt("Nhập URL của script (VD: https://update.greasyfork.org/...):");
        if (!url) return;
        const label = dom.btnImportUrl.querySelector('span');
        try {
          if (label) label.textContent = "Đang tải...";
          
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000);
          const response = await fetch(url, { signal: controller.signal });
          clearTimeout(timeoutId);
          
          if (!response.ok) throw new Error("HTTP " + response.status);
          const code = await response.text();
          
          let name = url.split('/').pop().split('?')[0];
          const nameMatch = code.match(/@name\s+(.+)/);
          if (nameMatch) name = nameMatch[1].trim();
          
          let matches = [];
          const matchRe = /@match\s+(.+)/g;
          let m;
          while ((m = matchRe.exec(code)) !== null) {
            matches.push(m[1].trim());
          }
          if (matches.length === 0) matches = ["*://*/*"];
          
          let excludes = [];
          const excludeRe = /@exclude\s+(.+)/g;
          while ((m = excludeRe.exec(code)) !== null) {
            excludes.push(m[1].trim());
          }
          
          const scriptData = {
            id: 'script_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
            name,
            matches,
            excludes,
            code,
            active: true,
            runAt: "document_idle",
            updateUrl: url
          };
          
          _scripts.push(scriptData);
          _save();
          if (label) label.textContent = "Tải URL";
          alert("Đã tải và nhập script thành công!");
        } catch (e) {
          if (label) label.textContent = "Tải URL";
          alert("Lỗi tải script: " + e.message);
        }
      };
    }
    
    if (dom.btnExport) {
      dom.btnExport.onclick = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(_scripts, null, 2));
        const dlAnchorElem = document.createElement('a');
        dlAnchorElem.setAttribute("href", dataStr);
        dlAnchorElem.setAttribute("download", "scholarflow_userscripts_backup.json");
        dlAnchorElem.click();
      };
    }

    dom.btnCancel.onclick = () => _closeEditor();
    

    const btnTest = document.getElementById('btn-us-test');
    if (btnTest) {
      btnTest.onclick = async () => {
        try {
          const tabs = await browserApi.tabs.query({active: true, currentWindow: true});
          let targetTab = tabs && tabs[0];
          if (!targetTab || !targetTab.url || targetTab.url.startsWith('chrome') || targetTab.url.startsWith('edge') || targetTab.url.startsWith('about') || targetTab.url.includes(location.host)) {
            const allTabs = await browserApi.tabs.query({});
            targetTab = allTabs.find(t => t.url && (t.url.startsWith('http://') || t.url.startsWith('https://')));
          }
          if (!targetTab) return alert("Không tìm thấy trang web (http/https) nào đang mở để chạy thử!");

          // Show console panel immediately
          const cp = document.getElementById('us-console-panel');
          if (cp) cp.style.display = 'block';

          const editName = document.getElementById('us-edit-name');
          const scriptName = (editName && editName.value.trim()) || 'Kịch bản';
          if (window._usLogToConsole) {
            window._usLogToConsole('info', ['--- Bắt đầu chạy thử: ' + scriptName + ' trên ' + (targetTab.title || targetTab.url) + ' ---']);
          }

          const gmShim = `
const GM_getValue = function(key, def) { try { return JSON.parse(localStorage.getItem('GM_' + key)) ?? def; } catch(e) { return localStorage.getItem('GM_' + key) || def; } };
const GM_setValue = function(key, val) { localStorage.setItem('GM_' + key, JSON.stringify(val)); };
const GM_deleteValue = function(key) { localStorage.removeItem('GM_' + key); };
const GM_listValues = function() { const r=[]; for(let i=0;i<localStorage.length;i++){ const k=localStorage.key(i); if(k && k.startsWith('GM_')) r.push(k.slice(3)); } return r; };
const GM_addStyle = function(css) { const style = document.createElement('style'); style.textContent = css; (document.head || document.documentElement).appendChild(style); return style; };
const GM = {
  getValue: async function(key, def) { return GM_getValue(key, def); },
  setValue: async function(key, val) { return GM_setValue(key, val); },
  deleteValue: async function(key) { return GM_deleteValue(key); },
  listValues: async function() { return GM_listValues(); },
  addStyle: function(css) { return GM_addStyle(css); }
};
const GM_addStyle = GM.addStyle;
`;
          const codeToRun = (document.getElementById('us-edit-code') || dom.editCode || {value: ''}).value;

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

          // Inject and capture logs via synchronous DOM event dispatch
          const results = await browserApi.scripting.executeScript({
            target: { tabId: targetTab.id },
            func: (wrappedCode) => {
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
              } catch (err) {
                logs.push({ level: 'error', text: 'Lỗi inject: ' + err.message });
              }
              document.removeEventListener('__SF_US_LOG__', onLog);
              return logs;
            },
            args: [runnerWrapper]
          });

          // Display captured logs
          let countLogged = 0;
          if (results && results[0] && results[0].result) {
            results[0].result.forEach(entry => {
              if (window._usLogToConsole) {
                window._usLogToConsole(entry.level, [entry.text]);
                countLogged++;
              }
            });
          }

          if (countLogged === 0 && window._usLogToConsole) {
            window._usLogToConsole('info', ['✓ Script đã được nạp vào trang thành công. (Không có console.log đồng bộ)']);
          }

          const label = btnTest.querySelector('span');
          if (label) label.textContent = 'Đã chạy!';
          btnTest.style.borderColor = '#10b981';
          btnTest.style.color = '#34d399';
          setTimeout(() => {
            if (label) label.textContent = 'Chạy thử';
            btnTest.style.borderColor = '';
            btnTest.style.color = '';
          }, 1500);

        } catch (e) {
          if (window._usLogToConsole) {
            window._usLogToConsole('error', ['Lỗi khi chạy thử: ' + e.message]);
          } else {
            alert("Lỗi chạy thử: " + e.message);
          }
        }
      };
    }
    
    dom.btnSave.onclick = () => {
      const editId = document.getElementById('us-edit-id');
      const editName = document.getElementById('us-edit-name');
      const editMatches = document.getElementById('us-edit-matches');
      const editExcludes = document.getElementById('us-edit-excludes');
      const editRunAt = document.getElementById('us-edit-runat');
      const editWorld = document.getElementById('us-edit-world');
      const editUpdateUrl = document.getElementById('us-edit-update-url');
      const editCode = document.getElementById('us-edit-code');

      const id = (editId && editId.value) || 'script_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
      const name = editName ? editName.value.trim() : "";
      
      let matches = editMatches ? editMatches.value.split('\n').map(s => s.trim()).filter(s => s) : [];
      if (matches.length === 0) matches = ["<all_urls>"];
      
      let excludes = editExcludes ? editExcludes.value.split('\n').map(s => s.trim()).filter(s => s) : [];
      const runAt = (editRunAt && editRunAt.value) || "document_idle";
      const world = (editWorld && editWorld.value) || "MAIN";
      const updateUrl = editUpdateUrl ? editUpdateUrl.value.trim() : "";
      const code = editCode ? editCode.value : "";

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

      _save();
      _closeEditor();
    };

    // ── Keyboard shortcuts in editor ──────────────────────────
    const editorContainer = document.getElementById('us-editor-container');
    if (editorContainer) {
      editorContainer.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 's') {
          e.preventDefault();
          if (dom.btnSave) dom.btnSave.click();
        }
        if (e.ctrlKey && e.key === 'Enter') {
          e.preventDefault();
          const btnTest = document.getElementById('btn-us-test');
          if (btnTest) btnTest.click();
        }
        if (e.ctrlKey && e.key === 'h') {
          e.preventDefault();
          const findBar = document.getElementById('us-find-bar');
          if (findBar) {
            findBar.style.display = findBar.style.display === 'none' ? 'block' : 'none';
            if (findBar.style.display === 'block') {
              const fi = document.getElementById('us-find-input');
              if (fi) fi.focus();
            }
          }
        }
        // Tab key → insert 2 spaces
        if (e.key === 'Tab') {
          e.preventDefault();
          const ta = e.target;
          if (ta.tagName === 'TEXTAREA') {
            const start = ta.selectionStart;
            const end = ta.selectionEnd;
            ta.value = ta.value.substring(0, start) + '  ' + ta.value.substring(end);
            ta.selectionStart = ta.selectionEnd = start + 2;
            _updateLineNumbers();
          }
        }
      });

      // Live line numbers & cursor pos for code textarea
      const codeArea = document.getElementById('us-edit-code');
      if (codeArea) {
        codeArea.addEventListener('input', () => {
          _updateLineNumbers();
          _showMetaBar(_parseGMMetadata(codeArea.value));
        });
        codeArea.addEventListener('keyup', _updateCursorPos);
        codeArea.addEventListener('click', _updateCursorPos);
        codeArea.addEventListener('scroll', () => {
          const ln = document.getElementById('us-line-numbers');
          if (ln) ln.scrollTop = codeArea.scrollTop;
        });
      }
    }

    // ── Find & Replace handlers ────────────────────────────────
    let _findMatches = [];
    let _findIdx = 0;

    const btnFindPrev = document.getElementById('btn-us-find-prev');
    const btnFindNext = document.getElementById('btn-us-find-next');
    const btnReplaceOne = document.getElementById('btn-us-replace-one');
    const btnReplaceAll = document.getElementById('btn-us-replace-all');
    const findCountEl = document.getElementById('us-find-count');

    function _findInCode() {
      const ta = document.getElementById('us-edit-code');
      const q = (document.getElementById('us-find-input') || {}).value || '';
      if (!ta || !q) { _findMatches = []; if (findCountEl) findCountEl.textContent = ''; return; }
      _findMatches = [];
      let idx = 0;
      while ((idx = ta.value.indexOf(q, idx)) !== -1) {
        _findMatches.push(idx);
        idx += q.length;
      }
      if (findCountEl) findCountEl.textContent = _findMatches.length + ' kết quả';
    }

    function _selectMatch(i) {
      const ta = document.getElementById('us-edit-code');
      const q = (document.getElementById('us-find-input') || {}).value || '';
      if (!ta || !_findMatches.length) return;
      _findIdx = ((i % _findMatches.length) + _findMatches.length) % _findMatches.length;
      ta.focus();
      ta.setSelectionRange(_findMatches[_findIdx], _findMatches[_findIdx] + q.length);
      ta.scrollTop = Math.max(0, (ta.value.substring(0, _findMatches[_findIdx]).split('\n').length - 3) * 16);
      if (findCountEl) findCountEl.textContent = (_findIdx + 1) + '/' + _findMatches.length;
    }

    const findInput = document.getElementById('us-find-input');
    if (findInput) findInput.addEventListener('input', () => { _findInCode(); _selectMatch(0); });
    if (btnFindNext) btnFindNext.onclick = () => { _findInCode(); _selectMatch(_findIdx + 1); };
    if (btnFindPrev) btnFindPrev.onclick = () => { _findInCode(); _selectMatch(_findIdx - 1); };
    if (btnReplaceOne) btnReplaceOne.onclick = () => {
      const ta = document.getElementById('us-edit-code');
      const q = (document.getElementById('us-find-input') || {}).value || '';
      const r = (document.getElementById('us-replace-input') || {}).value || '';
      if (!ta || !q || !_findMatches.length) return;
      const pos = _findMatches[_findIdx];
      ta.value = ta.value.substring(0, pos) + r + ta.value.substring(pos + q.length);
      _updateLineNumbers();
      _findInCode();
      _selectMatch(_findIdx);
    };
    if (btnReplaceAll) btnReplaceAll.onclick = () => {
      const ta = document.getElementById('us-edit-code');
      const q = (document.getElementById('us-find-input') || {}).value || '';
      const r = (document.getElementById('us-replace-input') || {}).value || '';
      if (!ta || !q) return;
      const count = (ta.value.split(q).length - 1);
      ta.value = ta.value.split(q).join(r);
      _updateLineNumbers();
      _findInCode();
      if (findCountEl) findCountEl.textContent = 'Đã thay ' + count + ' lần';
    };

    // ── Parse Header button ────────────────────────────────────
    const btnParseMeta = document.getElementById('btn-us-parse-meta');
    if (btnParseMeta) {
      btnParseMeta.onclick = () => {
        const ta = document.getElementById('us-edit-code');
        if (!ta) return;
        const meta = _parseGMMetadata(ta.value);
        if (!meta) { alert('Không tìm thấy ==UserScript== header trong code.'); return; }
        _showMetaBar(meta);
        // Auto-fill name if empty
        const editName = document.getElementById('us-edit-name');
        if (editName && !editName.value && meta.name) editName.value = meta.name;
        // Auto-fill matches
        if (meta.match) {
          const editMatches = document.getElementById('us-edit-matches');
          if (editMatches) editMatches.value = meta.match;
        }
      };
    }

    // ── Format / Beautify button ────────────────────────────────
    const btnFormat = document.getElementById('btn-us-format');
    if (btnFormat) {
      btnFormat.onclick = () => {
        const ta = document.getElementById('us-edit-code');
        if (!ta) return;
        try {
          // Basic indent fixer: normalize line endings, trim trailing spaces
          let code = ta.value;
          code = code.replace(/\r\n/g, '\n').replace(/\t/g, '  ');
          const lines = code.split('\n').map(l => l.trimEnd());
          // Remove excessive blank lines (max 2 consecutive)
          const cleaned = [];
          let blankCount = 0;
          for (const l of lines) {
            if (l.trim() === '') { blankCount++; if (blankCount <= 2) cleaned.push(l); }
            else { blankCount = 0; cleaned.push(l); }
          }
          ta.value = cleaned.join('\n').trim() + '\n';
          _updateLineNumbers();
          const label = btnFormat.querySelector('span');
          if (label) label.textContent = 'Đã format!';
          setTimeout(() => { if (label) label.textContent = 'Format'; }, 1500);
        } catch (e) {
          alert('Format error: ' + e.message);
        }
      };
    }

    // ── Open in standalone full tab ───────────────────────────
    const btnOpenTab = document.getElementById('btn-us-open-tab');
    if (btnOpenTab) {
      btnOpenTab.onclick = () => {
        const editId = document.getElementById('us-edit-id');
        const id = editId ? editId.value : '';
        if (dom.btnSave) dom.btnSave.click();
        const url = browserApi.runtime.getURL('OS/html/userscripts.html' + (id ? '?id=' + encodeURIComponent(id) : ''));
        browserApi.tabs.create({ url });
      };
    }

    // ── Export single script as .user.js ──────────────────────
    const btnExportSingle = document.getElementById('btn-us-export-single');
    if (btnExportSingle) {
      btnExportSingle.onclick = () => {
        const ta = document.getElementById('us-edit-code');
        const editName = document.getElementById('us-edit-name');
        const editMatches = document.getElementById('us-edit-matches');
        const editUpdateUrl = document.getElementById('us-edit-update-url');
        if (!ta) return;
        const code = ta.value;
        const name = editName ? editName.value.trim() : 'MyScript';
        const matches = editMatches ? editMatches.value.split('\n').map(s => s.trim()).filter(s => s) : ['*://*/*'];
        const updateUrl = editUpdateUrl ? editUpdateUrl.value.trim() : '';
        
        // Check if already has GM header
        let finalCode = code;
        if (!code.includes('==UserScript==')) {
          const header = [
            '// ==UserScript==',
            '// @name         ' + name,
            '// @version      1.0',
            '// @description  Exported from ScholarFlow',
            '// @author       ScholarFlow User',
            ...matches.map(m => '// @match        ' + m),
            updateUrl ? '// @updateURL    ' + updateUrl : '',
            updateUrl ? '// @downloadURL  ' + updateUrl : '',
            '// @grant        GM_getValue',
            '// @grant        GM_setValue',
            '// ==/UserScript==',
            ''
          ].filter(l => l !== '').join('\n');
          finalCode = header + '\n' + code;
        }
        
        const blob = new Blob([finalCode], { type: 'application/javascript' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = name.replace(/[^a-z0-9]/gi, '_') + '.user.js';
        a.click();
        URL.revokeObjectURL(url);
      };
    }

    // ── Enable All / Disable All buttons in list ───────────────
    const btnEnableAll = document.getElementById('btn-us-enable-all');
    const btnDisableAll = document.getElementById('btn-us-disable-all');
    if (btnEnableAll) {
      btnEnableAll.onclick = () => {
        _scripts.forEach(s => { s.active = true; });
        _save();
      };
    }
    if (btnDisableAll) {
      btnDisableAll.onclick = () => {
        _scripts.forEach(s => { s.active = false; });
        _save();
      };
    }

    // ── Check Updates Button ────────────────────────────────────
    const btnCheckUpdates = document.getElementById('btn-us-check-updates');
    if (btnCheckUpdates) {
      btnCheckUpdates.onclick = async () => {
        const label = btnCheckUpdates.querySelector('span');
        const origText = label ? label.textContent : 'Cập nhật';
        btnCheckUpdates.disabled = true;
        if (label) label.textContent = 'Đang kiểm tra...';
        try {
          const res = await browserApi.runtime.sendMessage({ action: "CHECK_USERSCRIPT_UPDATES" });
          if (res && res.updatedCount > 0) {
            alert(`Đã cập nhật thành công ${res.updatedCount} kịch bản!`);
            _load();
          } else if (res && res.error) {
            alert("Lỗi khi kiểm tra cập nhật: " + res.error);
          } else {
            alert("Tất cả các kịch bản đều đang ở phiên bản mới nhất.");
          }
        } catch (e) {
          alert("Lỗi kiểm tra cập nhật: " + e.message);
        } finally {
          btnCheckUpdates.disabled = false;
          if (label) label.textContent = origText;
        }
      };
    }

    // ── GM Storage Viewer & Editor ─────────────────────────────
    const storagePanel = document.getElementById('us-storage-panel');
    const storageOutput = document.getElementById('us-storage-output');
    const btnStorageToggle = document.getElementById('btn-us-storage-toggle');
    const btnCloseStorage = document.getElementById('btn-us-close-storage');
    const btnRefreshStorage = document.getElementById('btn-us-refresh-storage');
    const btnAddKeyToggle = document.getElementById('btn-us-add-key-toggle');
    const storageAddBox = document.getElementById('us-storage-add-box');
    const btnSaveGmKey = document.getElementById('btn-us-save-gm-key');
    const btnClearStorage = document.getElementById('btn-us-clear-storage');

    const _loadGMStorage = async () => {
      if (!storagePanel || !storageOutput) return;
      storagePanel.style.display = 'block';
      storageOutput.textContent = 'Đang tải dữ liệu GM Storage...';
      try {
        const tabs = await browserApi.tabs.query({ active: true, currentWindow: true });
        if (!tabs || !tabs[0] || !tabs[0].id) {
          storageOutput.textContent = 'Không tìm thấy trang web đang mở.';
          return;
        }
        if (tabs[0].url && (tabs[0].url.startsWith('chrome://') || tabs[0].url.startsWith('about:') || tabs[0].url.startsWith('edge://'))) {
          storageOutput.textContent = 'Trang hệ thống trình duyệt không hỗ trợ GM Storage.';
          return;
        }

        const results = await browserApi.scripting.executeScript({
          target: { tabId: tabs[0].id },
          func: () => {
            const gmKeys = [];
            for (let i = 0; i < localStorage.length; i++) {
              const k = localStorage.key(i);
              if (k && k.startsWith('GM_')) {
                gmKeys.push({ key: k.slice(3), value: localStorage.getItem(k) });
              }
            }
            return gmKeys;
          }
        });

        const items = results && results[0] && results[0].result || [];
        storageOutput.innerHTML = '';
        if (items.length === 0) {
          const empty = document.createElement('div');
          empty.style.cssText = 'color:var(--text-muted);font-style:italic;padding:8px;font-size:10px;text-align:center;';
          empty.textContent = '(Không có dữ liệu GM_* nào trên trang này)';
          storageOutput.appendChild(empty);
          return;
        }

        items.forEach(item => {
          const row = document.createElement('div');
          row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:6px;padding:3px 6px;border-bottom:1px solid rgba(255,255,255,0.06);font-size:10px;';

          const left = document.createElement('div');
          left.style.cssText = 'display:flex;align-items:center;gap:6px;overflow:hidden;flex:1;min-width:0;';

          const k = document.createElement('span');
          k.style.cssText = 'color:#818cf8;font-weight:600;font-family:monospace;white-space:nowrap;flex-shrink:0;';
          k.textContent = item.key;

          const eq = document.createElement('span');
          eq.style.cssText = 'color:rgba(255,255,255,0.3);flex-shrink:0;';
          eq.textContent = '=';

          const v = document.createElement('span');
          v.style.cssText = 'color:#10b981;font-family:monospace;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
          v.textContent = item.value;
          v.title = item.value;

          left.appendChild(k);
          left.appendChild(eq);
          left.appendChild(v);

          const actions = document.createElement('div');
          actions.style.cssText = 'display:flex;gap:3px;flex-shrink:0;';

          const editBtn = document.createElement('button');
          editBtn.type = 'button';
          editBtn.className = 'us-btn us-btn-icon';
          editBtn.style.cssText = 'width:18px;height:18px;padding:2px;';
          editBtn.title = 'Chỉnh sửa giá trị';
          editBtn.innerHTML = '<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>';
          editBtn.onclick = async () => {
            const newVal = prompt(`Sửa giá trị cho key "${item.key}":`, item.value);
            if (newVal === null) return;
            try {
              const activeTabs = await browserApi.tabs.query({ active: true, currentWindow: true });
              if (!activeTabs || !activeTabs[0]) return;
              await browserApi.scripting.executeScript({
                target: { tabId: activeTabs[0].id },
                func: (kName, val) => { localStorage.setItem('GM_' + kName, val); },
                args: [item.key, newVal]
              });
              _loadGMStorage();
            } catch (err) {
              alert("Lỗi cập nhật: " + err.message);
            }
          };

          const delBtn = document.createElement('button');
          delBtn.type = 'button';
          delBtn.className = 'us-btn us-btn-icon us-danger';
          delBtn.style.cssText = 'width:18px;height:18px;padding:2px;';
          delBtn.title = 'Xóa key này';
          delBtn.innerHTML = '<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>';
          delBtn.onclick = async () => {
            if (!confirm(`Xóa key "${item.key}" khỏi trang này?`)) return;
            try {
              const activeTabs = await browserApi.tabs.query({ active: true, currentWindow: true });
              if (!activeTabs || !activeTabs[0]) return;
              await browserApi.scripting.executeScript({
                target: { tabId: activeTabs[0].id },
                func: (kName) => { localStorage.removeItem('GM_' + kName); },
                args: [item.key]
              });
              _loadGMStorage();
            } catch (err) {
              alert("Lỗi xóa: " + err.message);
            }
          };

          actions.appendChild(editBtn);
          actions.appendChild(delBtn);

          row.appendChild(left);
          row.appendChild(actions);
          storageOutput.appendChild(row);
        });
      } catch (e) {
        storageOutput.textContent = 'Lỗi: ' + e.message;
      }
    };

    if (btnStorageToggle) {
      btnStorageToggle.onclick = () => {
        if (!storagePanel) return;
        const isHidden = storagePanel.style.display === 'none' || !storagePanel.style.display;
        if (isHidden) {
          _loadGMStorage();
        } else {
          storagePanel.style.display = 'none';
        }
      };
    }
    if (btnCloseStorage && storagePanel) {
      btnCloseStorage.onclick = () => { storagePanel.style.display = 'none'; };
    }
    if (btnRefreshStorage) {
      btnRefreshStorage.onclick = _loadGMStorage;
    }
    if (btnAddKeyToggle && storageAddBox) {
      btnAddKeyToggle.onclick = () => {
        const isHidden = storageAddBox.style.display === 'none' || !storageAddBox.style.display;
        storageAddBox.style.display = isHidden ? 'flex' : 'none';
        if (isHidden) {
          const kInp = document.getElementById('us-new-gm-key');
          if (kInp) kInp.focus();
        }
      };
    }
    if (btnSaveGmKey) {
      btnSaveGmKey.onclick = async () => {
        const keyInp = document.getElementById('us-new-gm-key');
        const valInp = document.getElementById('us-new-gm-val');
        const k = (keyInp ? keyInp.value : '').trim();
        const v = valInp ? valInp.value : '';
        if (!k) return alert("Vui lòng nhập tên Key!");
        try {
          const tabs = await browserApi.tabs.query({ active: true, currentWindow: true });
          if (!tabs || !tabs[0]) return alert("Không tìm thấy trang đang mở!");
          await browserApi.scripting.executeScript({
            target: { tabId: tabs[0].id },
            func: (kName, val) => { localStorage.setItem('GM_' + kName, val); },
            args: [k, v]
          });
          if (keyInp) keyInp.value = '';
          if (valInp) valInp.value = '';
          if (storageAddBox) storageAddBox.style.display = 'none';
          _loadGMStorage();
        } catch (err) {
          alert("Lỗi lưu storage: " + err.message);
        }
      };
    }
    if (btnClearStorage) {
      btnClearStorage.onclick = async () => {
        if (!confirm("Bạn có chắc chắn muốn xóa toàn bộ GM Storage của trang này không?")) return;
        try {
          const tabs = await browserApi.tabs.query({ active: true, currentWindow: true });
          if (!tabs || !tabs[0]) return;
          await browserApi.scripting.executeScript({
            target: { tabId: tabs[0].id },
            func: () => {
              const toRemove = [];
              for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k && k.startsWith('GM_')) toRemove.push(k);
              }
              toRemove.forEach(k => localStorage.removeItem(k));
            }
          });
          _loadGMStorage();
        } catch (err) {
          alert("Lỗi xóa: " + err.message);
        }
      };
    }

    // ── Search / Filter ─────────────────────────────────────
    const searchInput = document.getElementById('us-search');
    const filterEl = document.getElementById('us-filter-status');
    const doSearch = () => {
      _searchQuery = searchInput ? searchInput.value : '';
      _searchStatus = filterEl ? filterEl.value : '';
      if (_searchStatus === 'current_page' && !_currentTabUrl) {
        _updateCurrentTabUrl().then(() => _render());
      } else {
        _render();
      }
    };
    if (searchInput) searchInput.addEventListener('input', doSearch);
    if (filterEl) filterEl.addEventListener('change', doSearch);

    window._usSearch = (q) => {
      _searchQuery = q;
      _searchStatus = filterEl ? filterEl.value : '';
      if (_searchStatus === 'current_page' && !_currentTabUrl) {
        _updateCurrentTabUrl().then(() => _render());
      } else {
        _render();
      }
    };

    // ── Template picker ──────────────────────────────────────
    const btnTemplate = document.getElementById('btn-us-template');
    if (btnTemplate) {
      btnTemplate.onclick = () => {
        let modal = document.getElementById('us-template-modal');
        if (modal) { modal.remove(); return; }
        modal = document.createElement('div');
        modal.id = 'us-template-modal';
        modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.65);z-index:9999;display:flex;align-items:center;justify-content:center;';
        const box = document.createElement('div');
        box.style.cssText = 'background:var(--bg-secondary,#1e1e2e);border:1px solid var(--border-color,#444);border-radius:8px;padding:16px;width:320px;max-height:80vh;overflow-y:auto;box-shadow:0 12px 36px rgba(0,0,0,0.85);';
        const titleEl = document.createElement('div');
        titleEl.style.cssText = 'font-size:13px;font-weight:700;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;';
        titleEl.innerHTML = '<span style="display:flex;align-items:center;gap:6px;"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg> Chọn Mẫu Script</span>';
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
        closeBtn.style.cssText = 'background:none;border:none;color:var(--text-muted);cursor:pointer;display:flex;align-items:center;padding:2px;';
        closeBtn.onclick = () => modal.remove();
        titleEl.appendChild(closeBtn);
        box.appendChild(titleEl);
        SCRIPT_TEMPLATES.forEach(tpl => {
          const row = document.createElement('div');
          row.style.cssText = 'padding:8px;border:1px solid var(--border-color,#444);border-radius:6px;margin-bottom:6px;cursor:pointer;';
          row.onmouseover = () => { row.style.background = 'rgba(255,255,255,0.05)'; };
          row.onmouseout = () => { row.style.background = ''; };
          const rowName = document.createElement('div');
          rowName.style.cssText = 'font-size:12px;font-weight:600;';
          rowName.textContent = tpl.name;
          const rowMeta = document.createElement('div');
          rowMeta.style.cssText = 'font-size:10px;color:var(--text-muted);margin-top:2px;';
          rowMeta.textContent = (tpl.matches || []).join(', ');
          row.appendChild(rowName);
          row.appendChild(rowMeta);
          row.onclick = () => {
            _edit();
            setTimeout(() => {
              const eN = document.getElementById('us-edit-name');
              const eM = document.getElementById('us-edit-matches');
              const eX = document.getElementById('us-edit-excludes');
              const eR = document.getElementById('us-edit-runat');
              const eU = document.getElementById('us-edit-update-url');
              const eC = document.getElementById('us-edit-code');
              if (eN) eN.value = tpl.name;
              if (eM) eM.value = (tpl.matches || []).join('\n');
              if (eX) eX.value = (tpl.excludes || []).join('\n');
              if (eR) eR.value = tpl.runAt || 'document_idle';
              if (eU) eU.value = tpl.updateUrl || '';
              if (eC) { eC.value = tpl.code || ''; _updateLineNumbers(); }
            }, 50);
            modal.remove();
          };
          box.appendChild(row);
        });
        modal.appendChild(box);
        modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
        document.body.appendChild(modal);
      };
    }

    // ── Console Panel ──────────────────────────────────────────
    const consolePanel = document.getElementById('us-console-panel');
    const consoleOutput = document.getElementById('us-console-output');
    const clearConsoleBtn = document.getElementById('btn-us-clear-console');
    const btnCopyConsole = document.getElementById('btn-us-copy-console');
    const consoleCount = document.getElementById('us-console-count');
    let _consoleLineCount = 0;

    if (consolePanel) {
      const drawerHeader = consolePanel.querySelector('.us-drawer-header');
      if (drawerHeader) {
        drawerHeader.style.cursor = 'pointer';
        drawerHeader.title = 'Nhấn để thu gọn / mở rộng Console';
        drawerHeader.onclick = (e) => {
          if (e.target.closest('button') || e.target.closest('.us-btn-group')) return;
          if (consoleOutput) {
            consoleOutput.style.display = consoleOutput.style.display === 'none' ? 'block' : 'none';
          }
        };
      }
    }

    if (clearConsoleBtn && consoleOutput) {
      clearConsoleBtn.onclick = (e) => {
        e.stopPropagation();
        consoleOutput.textContent = '';
        _consoleLineCount = 0;
        if (consoleCount) consoleCount.textContent = '0 dòng';
        const line = document.createElement('div');
        line.style.cssText = 'color:#64748b; font-style:italic; padding:2px 0; font-size:9.5px;';
        line.textContent = '(Logs đã được xóa)';
        consoleOutput.appendChild(line);
      };
    }

    if (btnCopyConsole) {
      btnCopyConsole.onclick = (e) => {
        e.stopPropagation();
        const co = document.getElementById('us-console-output');
        if (!co) return;
        navigator.clipboard.writeText(co.textContent).then(() => {
          btnCopyConsole.title = 'Đã sao chép output!';
          btnCopyConsole.innerHTML = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
          setTimeout(() => {
            btnCopyConsole.title = 'Sao chép output';
            btnCopyConsole.innerHTML = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
          }, 1500);
        }).catch(() => {});
      };
    }

    window._usLogToConsole = (level, args) => {
      const co = document.getElementById('us-console-output');
      const cp = document.getElementById('us-console-panel');
      const cc = document.getElementById('us-console-count');
      if (!co || !cp) return;
      cp.style.display = 'block';
      co.style.display = 'block';
      _consoleLineCount++;
      if (cc) cc.textContent = _consoleLineCount + ' dòng';
      const line = document.createElement('div');
      line.className = 'us-log-entry';
      const colors = { log: '#10b981', warn: '#f59e0b', error: '#ef4444', info: '#38bdf8' };
      line.style.cssText = 'color:' + (colors[level] || '#10b981') + ';border-bottom:1px solid rgba(255,255,255,0.05);padding:2px 0;word-break:break-all;font-family:"JetBrains Mono", Consolas, monospace;font-size:10px;line-height:1.4;';
      const tag = document.createElement('span');
      tag.className = 'us-log-level';
      tag.style.cssText = 'opacity:0.6;margin-right:5px;font-size:9px;font-weight:700;';
      tag.textContent = '[' + (level || 'LOG').toUpperCase() + ']';
      line.appendChild(tag);
      line.appendChild(document.createTextNode(args.map(a => {
        try { return typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a); }
        catch (_e) { return String(a); }
      }).join(' ')));
      co.appendChild(line);
      co.scrollTop = co.scrollHeight;
    };

    // Listen to live userscript logs relayed from content script
    if (browserApi.runtime && browserApi.runtime.onMessage) {
      browserApi.runtime.onMessage.addListener((msg) => {
        if (msg && msg.action === 'SF_US_LIVE_LOG' && msg.log) {
          if (window._usLogToConsole) {
            window._usLogToConsole(msg.log.level, [msg.log.text]);
          }
        }
      });
    }
  }

  // Bind to nav events if needed, but since it's hardcoded tabs we just init on load
  document.addEventListener('DOMContentLoaded', _init);
  // Also init immediately if already loaded
  if (document.readyState === "complete" || document.readyState === "interactive") {
    _init();
  }

})();
