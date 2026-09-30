// OS/js/core/userscript-sync.js
// Keeps the sidebar tab and the full-page Userscripts Studio in sync.
//
// Problem this solves: both surfaces used to keep a private snapshot of
// `sf_custom_scripts` and write the whole array back, so whichever surface
// saved last silently discarded the other one's edits. This module adds
//
//   1. a per-record revision + editor stamp on every write,
//   2. a storage.onChanged subscription so a save in one surface shows up in
//      the other without a reload,
//   3. a real line diff + confirm/cancel prompt before an overwrite, so the
//      "whoever saves last wins" race is always an explicit user decision.
//
// Exposes: globalThis.SF_US_SYNC
(function() {
  'use strict';
  if (typeof globalThis === 'undefined') return;
  if (globalThis.SF_US_SYNC) return;

  const STORE_KEY = 'sf_custom_scripts';
  const DIFF_CELL_BUDGET = 1500000; // LCS table cells; above this we coarsen
  const SESSION_ID = 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 9);

  function _t(key, fallback) {
    if (typeof globalThis.t === 'function') {
      const v = globalThis.t(key);
      if (v && v !== key) return v;
    }
    return fallback;
  }

  function _toast(message, type) {
    if (typeof globalThis.SF_showToast === 'function') {
      try { globalThis.SF_showToast(message, type || 'info'); return; } catch (e) { /* fall through */ }
    }
  }

  function _runtime() {
    return (typeof browser !== 'undefined' && browser.runtime)
      ? browser.runtime
      : (typeof chrome !== 'undefined' && chrome.runtime ? chrome.runtime : null);
  }

  // -------------------------------------------------------------------------
  // Storage helpers — every write goes through here so rev/editor bookkeeping
  // can never be forgotten.
  // -------------------------------------------------------------------------
  /**
   * Give every record a stable id, once.
   *
   * Records written before ids existed have none, and every lookup in this
   * codebase is by id: `list.find(s => s.id === wanted)` returns the *first*
   * id-less record when `wanted` is undefined, so an edit, delete or toggle
   * aimed at one script lands on a different one. That is indistinguishable
   * from "my new script overwrote the old one". Backfilling is safe, keeps the
   * order, and never touches a record that already has an id.
   */
  function ensureIds(list) {
    const used = Object.create(null);
    (list || []).forEach((s) => { if (s && typeof s.id === 'string' && s.id) used[s.id] = true; });
    let changed = false;
    const out = (list || []).map((s) => {
      if (!s) return s;
      if (typeof s.id === 'string' && s.id) return s;
      let id;
      do { id = 'script_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9); }
      while (used[id]);
      used[id] = true;
      changed = true;
      return Object.assign({}, s, { id: id });
    });
    if (changed) {
      try { console.log('[SF-US-ENSURE] ensureIds: list=' + list.length + ' -> ' + out.length + ' ids=[' + out.map((s) => s && s.id).join('|') + ']'); } catch (_e) { /* ignore */ }
    }
    return { list: out, changed: changed };
  }

  /**
   * Read the list and backfill missing ids in the same call, so a caller can
   * never act on a record that has no id yet.
   */
  async function readAllEnsured(label) {
    const before = (await readAll()).length;
    const fixed = ensureIds(await readAll());
    if (fixed.changed) await writeAll(fixed.list, label);
    const after = fixed.list.length;
    try { console.log('[SF-US-ENSURE] readAllEnsured: before=' + before + ' after=' + after + ' changed=' + fixed.changed + ' ids=[' + fixed.list.map((s) => s && s.id).join('|') + ']'); } catch (_e) { /* ignore */ }
    return fixed.list;
  }

  /**
   * Storage access helper.
   *
   * Firefox exposes `browser.storage` as a sibling of `browser.runtime`,
   * not as `browser.runtime.storage`. The old code reached storage
   * through `_runtime()` which returns `browser.runtime`; on real
   * Firefox `runtime.storage` is undefined, so every read returned
   * `[]` and every write returned false silently - the list was
   * always empty and nothing persisted. This is the root cause of
   * the reported overwrite.
   */
  function _storage() {
    if (typeof browser !== 'undefined' && browser.storage) return browser.storage;
    if (typeof chrome !== 'undefined' && chrome.storage) return chrome.storage;
    return null;
  }

  async function readAll() {
    const st = _storage();
    if (!st || !st.local) return [];
    const res = await st.local.get(STORE_KEY);
    const list = res && Array.isArray(res[STORE_KEY]) ? res[STORE_KEY] : [];
    return list.map((s) => Object.assign({}, s));
  }

  /**
   * Stamp a record with the bookkeeping every write needs. `label` is what the
   * diff dialog shows ("sidebar", "Userscript Studio"); `sessionId` is what the
   * cross-surface watcher filters on, so a surface never reacts to its own
   * write. Defaults to this surface's own session.
   */
  function stamp(record, label, sessionId) {
    const who = label || 'unknown';
    return Object.assign({}, record, {
      rev: (Number(record.rev) || 0) + 1,
      updatedAt: Date.now(),
      updatedBy: who,
      updatedByLabel: who,
      updatedSession: sessionId || SESSION_ID
    });
  }

  async function writeAll(list, editor) {
    const st = _storage();
    if (!st || !st.local) return false;
    await st.local.set({ [STORE_KEY]: list });
    // Read back immediately: Firefox IndexedDB can return stale data
    // from an earlier connection when get() follows set() too quickly,
    // which makes the write appear to succeed but the next read sees
    // nothing. Retry a few times until the value is visible, because
    // an invisible write is indistinguishable from a data loss.
    let got = -1;
    for (let attempt = 0; attempt < 3; attempt++) {
      const probe = await st.local.get(STORE_KEY);
      got = probe && Array.isArray(probe[STORE_KEY]) ? probe[STORE_KEY].length : -1;
      if (got === list.length) break;
      if (attempt < 2) await new Promise((r) => setTimeout(r, 50 + attempt * 50));
    }
    try { console.log('[SF-US-WRITE] wrote ' + list.length + ' read-back=' + got + ' ids=[' + list.map((s) => s && s.id).join('|') + ']'); } catch (_e) { /* ignore */ }
    return true;
  }

  function revOf(record) {
    return record ? (Number(record.rev) || 0) : 0;
  }

  // -------------------------------------------------------------------------
  // Line diff (LCS with common prefix/suffix trimming)
  // -------------------------------------------------------------------------
  function _lcsOps(a, b) {
    const n = a.length;
    const m = b.length;
    const width = m + 1;
    const dp = new Uint32Array((n + 1) * width);
    const at = (i, j) => i * width + j;
    for (let i = n - 1; i >= 0; i--) {
      for (let j = m - 1; j >= 0; j--) {
        dp[at(i, j)] = a[i] === b[j]
          ? dp[at(i + 1, j + 1)] + 1
          : Math.max(dp[at(i + 1, j)], dp[at(i, j + 1)]);
      }
    }
    const ops = [];
    let i = 0;
    let j = 0;
    while (i < n && j < m) {
      if (a[i] === b[j]) {
        ops.push({ type: 'ctx', a: i, b: j });
        i++;
        j++;
      } else if (dp[at(i + 1, j)] >= dp[at(i, j + 1)]) {
        ops.push({ type: 'del', a: i, b: j });
        i++;
      } else {
        ops.push({ type: 'add', a: i, b: j });
        j++;
      }
    }
    while (i < n) { ops.push({ type: 'del', a: i, b: j }); i++; }
    while (j < m) { ops.push({ type: 'add', a: i, b: j }); j++; }
    return ops;
  }

  /**
   * Diff two texts.
   * @param {string} leftText  base/left column (the version already in storage)
   * @param {string} rightText the version being proposed
   * @returns {{rows: Array, added: number, removed: number, coarse: boolean, identical: boolean}}
   */
  function makeDiff(leftText, rightText) {
    const L = String(leftText == null ? '' : leftText).split('\n');
    const R = String(rightText == null ? '' : rightText).split('\n');
    if (leftText === rightText) {
      return { rows: [], added: 0, removed: 0, coarse: false, identical: true };
    }
    let head = 0;
    while (head < L.length && head < R.length && L[head] === R[head]) head++;
    let tailL = L.length;
    let tailR = R.length;
    while (tailL > head && tailR > head && L[tailL - 1] === R[tailR - 1]) { tailL--; tailR--; }

    const midL = L.slice(head, tailL);
    const midR = R.slice(head, tailR);
    const rows = [];
    let added = 0;
    let removed = 0;
    let coarse = false;

    for (let i = 0; i < head; i++) {
      rows.push({ type: 'ctx', leftNo: i + 1, rightNo: i + 1, left: L[i], right: R[i] });
    }

    if ((midL.length + 1) * (midR.length + 1) > DIFF_CELL_BUDGET) {
      // Too big for an exact LCS: report the changed block verbatim instead of
      // freezing the UI. The decision is still fully informed.
      coarse = true;
      for (let i = 0; i < midL.length; i++) {
        rows.push({ type: 'del', leftNo: head + i + 1, rightNo: null, left: midL[i], right: null });
        removed++;
      }
      for (let j = 0; j < midR.length; j++) {
        rows.push({ type: 'add', leftNo: null, rightNo: head + j + 1, left: null, right: midR[j] });
        added++;
      }
    } else {
      const ops = _lcsOps(midL, midR);
      for (const op of ops) {
        if (op.type === 'ctx') {
          rows.push({ type: 'ctx', leftNo: head + op.a + 1, rightNo: head + op.b + 1, left: midL[op.a], right: midR[op.b] });
        } else if (op.type === 'del') {
          rows.push({ type: 'del', leftNo: head + op.a + 1, rightNo: null, left: midL[op.a], right: null });
          removed++;
        } else {
          rows.push({ type: 'add', leftNo: null, rightNo: head + op.b + 1, left: null, right: midR[op.b] });
          added++;
        }
      }
    }

    for (let k = 0; k < L.length - tailL; k++) {
      const li = tailL + k;
      const ri = tailR + k;
      rows.push({ type: 'ctx', leftNo: li + 1, rightNo: ri + 1, left: L[li], right: R[ri] });
    }
    return { rows: rows, added: added, removed: removed, coarse: coarse, identical: false };
  }

  /** Count only, for the "what did the other session do" summary line. */
  function summarise(leftText, rightText) {
    const d = makeDiff(leftText, rightText);
    return { added: d.added, removed: d.removed, identical: d.identical };
  }

  // -------------------------------------------------------------------------
  // Conflict dialog
  // -------------------------------------------------------------------------
  function _el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  /**
   * Show the diff + ask what to do. Resolves with one of:
   *   'overwrite' — keep my buffer (writes mine to storage)
   *   'theirs'    — discard mine, adopt the stored version
   *   'cancel'    — do nothing, keep editing
   *
   * @param {{name?: string, leftLabel?: string, rightLabel?: string,
   *          leftText: string, rightText: string, leftMeta?: string,
   *          rightMeta?: string, onCopy?: Function}} opts
   * @returns {Promise<'overwrite'|'theirs'|'cancel'>}
   */
  function showConflict(opts) {
    const o = opts || {};
    const diff = makeDiff(o.leftText, o.rightText);
    return new Promise((resolve) => {
      const overlay = _el('div', 'sfus-cf-overlay');
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-label', _t('us_conflict_title', 'Script đã bị sửa ở nơi khác'));

      const box = _el('div', 'sfus-cf-box');
      const head = _el('div', 'sfus-cf-head');
      head.appendChild(_el('span', 'sfus-cf-head-title',
        _t('us_conflict_title', 'Script đã bị sửa ở nơi khác')));
      head.appendChild(_el('span', 'sfus-cf-head-sub', o.name || ''));
      box.appendChild(head);

      const body = _el('div', 'sfus-cf-body');

      const stats = _el('div', 'sfus-cf-stats');
      const leftStat = _el('div', 'sfus-cf-stat');
      leftStat.appendChild(_el('span', 'sfus-cf-stat-k', o.leftLabel || _t('us_conflict_theirs', 'Phiên khác (đã lưu)')));
      leftStat.appendChild(_el('span', 'sfus-cf-stat-v', o.leftMeta || ''));
      const rightStat = _el('div', 'sfus-cf-stat');
      rightStat.appendChild(_el('span', 'sfus-cf-stat-k', o.rightLabel || _t('us_conflict_mine', 'Bản của bạn (chưa lưu)')));
      rightStat.appendChild(_el('span', 'sfus-cf-stat-v',
        '+' + diff.added + ' / −' + diff.removed));
      stats.appendChild(leftStat);
      stats.appendChild(rightStat);
      body.appendChild(stats);

      if (diff.coarse) {
        body.appendChild(_el('div', 'sfus-cf-note',
          _t('us_conflict_coarse', 'Nội dung quá lớn để so sánh từng dòng — hiển thị toàn bộ phần thay đổi.')));
      }

      const legend = _el('div', 'sfus-cf-legend');
      legend.appendChild(_el('span', 'sfus-cf-legend-k', _t('us_conflict_hint', 'Bên trái = bản đã lưu · bên phải = bản của bạn. Dòng nền xanh = thêm, đỏ = xoá.')));

      const grid = _el('div', 'sfus-cf-grid');
      const leftCol = _el('div', 'sfus-cf-col');
      const rightCol = _el('div', 'sfus-cf-col');
      leftCol.appendChild(_el('div', 'sfus-cf-col-head', o.leftLabel || _t('us_conflict_theirs', 'Phiên khác (đã lưu)')));
      rightCol.appendChild(_el('div', 'sfus-cf-col-head', o.rightLabel || _t('us_conflict_mine', 'Bản của bạn (chưa lưu)')));

      const leftBody = _el('div', 'sfus-cf-col-body');
      const rightBody = _el('div', 'sfus-cf-col-body');
      for (const row of diff.rows) {
        if (row.type !== 'add') {
          leftBody.appendChild(_line('sfus-cf-line ' + (row.type === 'del' ? 'is-del' : 'is-ctx'), row.leftNo, row.left));
        } else {
          leftBody.appendChild(_line('sfus-cf-line is-void', null, ''));
        }
        if (row.type !== 'del') {
          rightBody.appendChild(_line('sfus-cf-line ' + (row.type === 'add' ? 'is-add' : 'is-ctx'), row.rightNo, row.right));
        } else {
          rightBody.appendChild(_line('sfus-cf-line is-void', null, ''));
        }
      }
      if (!diff.rows.length) {
        leftBody.appendChild(_line('sfus-cf-line is-void', null, ''));
        rightBody.appendChild(_line('sfus-cf-line is-void', null, ''));
      }
      leftCol.appendChild(leftBody);
      rightCol.appendChild(rightBody);
      grid.appendChild(leftCol);
      grid.appendChild(rightCol);
      body.appendChild(legend);
      body.appendChild(grid);
      box.appendChild(body);

      const foot = _el('div', 'sfus-cf-foot');
      const btnCancel = _el('button', 'sfus-cf-btn is-ghost', _t('us_conflict_cancel', 'Hủy'));
      const btnTheirs = _el('button', 'sfus-cf-btn is-warn', _t('us_conflict_take_theirs', 'Dùng bản vừa lưu'));
      const btnMine = _el('button', 'sfus-cf-btn is-primary', _t('us_conflict_overwrite', 'Ghi đè bằng bản của tôi'));
      foot.appendChild(btnCancel);
      foot.appendChild(btnTheirs);
      foot.appendChild(btnMine);
      box.appendChild(foot);
      overlay.appendChild(box);
      document.body.appendChild(overlay);

      const prevKeyHandler = (e) => {
        if (e.key === 'Escape') { e.preventDefault(); finish('cancel'); }
      };
      document.addEventListener('keydown', prevKeyHandler, true);
      overlay.addEventListener('mousedown', (e) => {
        if (e.target === overlay) finish('cancel');
      });

      function finish(choice) {
        document.removeEventListener('keydown', prevKeyHandler, true);
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        resolve(choice);
      }
      btnCancel.addEventListener('click', () => finish('cancel'));
      btnTheirs.addEventListener('click', () => finish('theirs'));
      btnMine.addEventListener('click', () => finish('overwrite'));
      const firstBtn = box.querySelector('.sfus-cf-btn.is-primary');
      if (firstBtn) firstBtn.focus();
    });
  }

  function _line(className, no, text) {
    const row = _el('div', className);
    row.appendChild(_el('span', 'sfus-cf-no', no === null || no === undefined ? '' : String(no)));
    row.appendChild(_el('span', 'sfus-cf-tx', text === null || text === undefined ? '' : String(text)));
    return row;
  }

  // -------------------------------------------------------------------------
  // Install-from-URL: paste links -> review the source -> install
  // -------------------------------------------------------------------------

  /**
   * Ask for one or more script URLs. Nothing is fetched yet, so a typo costs
   * nothing. Resolves with an array of trimmed, de-duplicated URLs, or [] when
   * the user backs out.
   *
   * @returns {Promise<string[]>}
   */
  function showImportPrompt() {
    return new Promise((resolve) => {
      const overlay = _el('div', 'sfus-cf-overlay');
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');

      const box = _el('div', 'sfus-cf-box sfus-imp-box');
      const head = _el('div', 'sfus-cf-head');
      head.appendChild(_el('span', 'sfus-cf-head-title',
        _t('us_import_title', 'Cài từ URL')));
      head.appendChild(_el('span', 'sfus-cf-head-sub',
        _t('us_import_sub', 'Trang Greasy Fork hoặc link .user.js — mỗi dòng một link')));
      box.appendChild(head);

      const body = _el('div', 'sfus-cf-body');
      const input = document.createElement('textarea');
      input.className = 'sfus-imp-input';
      input.rows = 5;
      input.placeholder = 'https://greasyfork.org/en/scripts/...\nhttps://example.com/foo.user.js';
      input.spellcheck = false;
      input.setAttribute('aria-label', _t('us_import_placeholder', 'Dán link script'));
      body.appendChild(input);
      body.appendChild(_el('div', 'sfus-cf-note',
        _t('us_import_privacy', 'ScholarFlow chỉ tải link bạn dán, không gửi đi đâu khác. Bạn sẽ xem mã nguồn ở bước sau trước khi cài.')));
      box.appendChild(body);

      const foot = _el('div', 'sfus-cf-foot');
      const btnCancel = _el('button', 'sfus-cf-btn is-ghost', _t('us_conflict_cancel', 'Hủy'));
      const btnGo = _el('button', 'sfus-cf-btn is-primary', _t('us_import_fetch', 'Tải và xem trước'));
      foot.appendChild(btnCancel);
      foot.appendChild(btnGo);
      box.appendChild(foot);
      overlay.appendChild(box);
      document.body.appendChild(overlay);

      const prevKeyHandler = (e) => {
        if (e.key === 'Escape') { e.preventDefault(); finish([]); }
      };
      document.addEventListener('keydown', prevKeyHandler, true);
      overlay.addEventListener('mousedown', (e) => {
        if (e.target === overlay) finish([]);
      });

      function finish(list) {
        document.removeEventListener('keydown', prevKeyHandler, true);
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        resolve(list);
      }
      btnCancel.addEventListener('click', () => finish([]));
      btnGo.addEventListener('click', () => {
        // Accept one-per-line, or several links separated by spaces/commas -
        // pasting from a browser often carries the trailing comma.
        const seen = [];
        String(input.value || '').split(/[\s,;]+/).forEach((raw) => {
          const v = raw.trim();
          if (v && seen.indexOf(v) === -1) seen.push(v);
        });
        if (!seen.length) return;
        finish(seen);
      });
      setTimeout(() => input.focus(), 0);
    });
  }

  function _kv(label, value) {
    if (!value) return null;
    const row = _el('div', 'sfus-imp-kv');
    row.appendChild(_el('span', 'sfus-imp-k', label));
    row.appendChild(_el('span', 'sfus-imp-v', value));
    return row;
  }

  function _collapse(label, values) {
    const box = _el('details', 'sfus-imp-more');
    box.appendChild(_el('summary', 'sfus-imp-more-s', label + ' (' + values.length + ')'));
    box.appendChild(_el('div', 'sfus-imp-more-v', values.join('\n')));
    return box;
  }

  /**
   * Show what a fetched script will do before it is allowed anywhere near
   * storage: scope, run-at, the permissions it asks for, the hosts it can reach
   * and the full source. Each script has its own checkbox; the user picks.
   *
   * @param {Array} items result of the US_FETCH_SCRIPTS background call
   * @returns {Promise<Array>} the accepted items, in the order shown
   */
  function showScriptReview(items) {
    const good = (items || []).filter((x) => x && x.ok);
    return new Promise((resolve) => {
      const overlay = _el('div', 'sfus-cf-overlay');
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-label', _t('us_review_title', 'Xem trước trước khi cài'));

      const box = _el('div', 'sfus-cf-box sfus-imp-box');
      const head = _el('div', 'sfus-cf-head');
      head.appendChild(_el('span', 'sfus-cf-head-title',
        _t('us_review_title', 'Xem trước trước khi cài')));
      head.appendChild(_el('span', 'sfus-cf-head-sub', _t('us_review_sub', 'Bỏ chọn những script bạn không muốn cài')));
      box.appendChild(head);

      const body = _el('div', 'sfus-cf-body');
      const checks = [];

      for (const item of good) {
        const card = _el('div', 'sfus-imp-card');
        const headRow = _el('label', 'sfus-imp-card-h');
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = true;
        cb.className = 'sfus-imp-cb';
        headRow.appendChild(cb);
        headRow.appendChild(_el('span', 'sfus-imp-name', item.name || item.url));
        headRow.appendChild(_el('span', 'sfus-imp-ver', item.version ? 'v' + item.version : ''));
        card.appendChild(headRow);
        checks.push({ item: item, cb: cb });

        const meta = _el('div', 'sfus-imp-meta');
        const scope = (item.matches || []).concat(
          (item.includes || []).filter((x) => (item.matches || []).indexOf(x) === -1)
        );
        // A broad downloader can declare dozens of @match entries. Rendering
        // all of them inline pushes the install button below the viewport, so
        // keep short scopes visible and collapse long ones on demand.
        const scopeRow = scope.length > 3
          ? _collapse(_t('us_review_scope', 'Chạy trên'), scope)
          : _kv(_t('us_review_scope', 'Chạy trên'), scope.join('\n'));
        [
          scopeRow,
          _kv(_t('us_review_runat', 'Chạy ở'), (item.runAt || 'document_idle') +
            (item.noframes ? ' · ' + _t('us_review_noframes', 'không chạy trong frame') : '')),
          _kv(_t('us_review_author', 'Tác giả'), item.author),
          _kv(_t('us_review_source', 'Tải từ'), item.sourceUrl || item.url)
        ].forEach((n) => { if (n) meta.appendChild(n); });
        if ((item.grants || []).length) {
          meta.appendChild(_collapse(_t('us_review_grants', 'Quyền API được xin'), item.grants));
        }
        if ((item.connects || []).length) {
          meta.appendChild(_collapse(_t('us_review_connects', 'Máy chủ được phép gọi'), item.connects));
        }
        if ((item.requires || []).length) {
          meta.appendChild(_collapse(_t('us_review_requires', 'Script phụ thuộc'), item.requires));
        }
        card.appendChild(meta);

        if (item.warning) {
          card.appendChild(_el('div', 'sfus-imp-warn', item.warning));
        }
        if (item.isUpdateOf) {
          card.appendChild(_el('div', 'sfus-imp-note',
            _t('us_review_update_existing', 'Sẽ cập nhật script đang có: ') + item.isUpdateOf));
        }
        if (item.updateUrl) {
          card.appendChild(_el('div', 'sfus-imp-note',
            _t('us_review_update', 'Script này có @updateURL — ScholarFlow sẽ kiểm tra bản cập nhật từ địa chỉ đó.')));
        }

        const details = _el('details', 'sfus-imp-src');
        details.appendChild(_el('summary', 'sfus-imp-src-s', _t('us_review_code', 'Mã nguồn')));
        details.appendChild(_el('pre', 'sfus-imp-pre', item.code || ''));
        card.appendChild(details);
        body.appendChild(card);
      }

      if (!good.length) {
        body.appendChild(_el('div', 'sfus-imp-warn', _t('us_review_none', 'Không có script nào tải được.')));
      }
      box.appendChild(body);

      const foot = _el('div', 'sfus-cf-foot');
      const btnCancel = _el('button', 'sfus-cf-btn is-ghost', _t('us_conflict_cancel', 'Hủy'));
      const btnOk = _el('button', 'sfus-cf-btn is-primary', _t('us_review_install', 'Cài những script đã chọn'));
      btnOk.disabled = !good.length;
      foot.appendChild(btnCancel);
      foot.appendChild(btnOk);
      box.appendChild(foot);
      overlay.appendChild(box);
      document.body.appendChild(overlay);

      const prevKeyHandler = (e) => {
        if (e.key === 'Escape') { e.preventDefault(); finish([]); }
      };
      document.addEventListener('keydown', prevKeyHandler, true);
      overlay.addEventListener('mousedown', (e) => {
        if (e.target === overlay) finish([]);
      });

      function finish(chosen) {
        document.removeEventListener('keydown', prevKeyHandler, true);
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        resolve(chosen);
      }
      btnCancel.addEventListener('click', () => finish([]));
      btnOk.addEventListener('click', () => {
        const chosen = [];
        for (const c of checks) if (c.cb.checked) chosen.push(c.item);
        finish(chosen);
      });
    });
  }

  /**
   * Split a fetch result into what can be installed and what went wrong, so the
   * caller can report failures instead of silently dropping a pasted link.
   */
  function partitionImport(items) {
    const ok = [];
    const failed = [];
    for (const it of (items || [])) {
      if (it && it.ok) ok.push(it);
      else failed.push({ url: (it && it.url) || '', error: (it && it.error) || 'unknown' });
    }
    return { ok: ok, failed: failed };
  }

  // -------------------------------------------------------------------------
  // Cross-surface change feed
  // -------------------------------------------------------------------------
  /**
   * Subscribe to writes made by *other* surfaces (sidebar <-> studio) and to
   * background-driven updates.
   * @param {(info: {scripts: Array, changedIds: Array, reason: string}) => void} onRemote
   * @returns {() => void} unsubscribe
   */
  function watch(onRemote) {
    const storage = (typeof browser !== 'undefined' && browser.storage)
      ? browser.storage
      : (typeof chrome !== 'undefined' && chrome.storage ? chrome.storage : null);
    if (!storage || !storage.onChanged) return function() {};

    const handler = (changes, area) => {
      if (area !== 'local' || !changes || !changes[STORE_KEY]) return;
      const incoming = Array.isArray(changes[STORE_KEY].newValue) ? changes[STORE_KEY].newValue : [];
      const changed = incoming.filter((rec) => rec && rec.updatedSession && rec.updatedSession !== SESSION_ID);
      if (!changed.length) return;
      onRemote({
        scripts: incoming,
        changedIds: changed.map((rec) => rec.id),
        reason: changed[0].updatedBy || 'remote'
      });
    };
    storage.onChanged.addListener(handler);
    return () => {
      try { storage.onChanged.removeListener(handler); } catch (e) { /* ignore */ }
    };
  }

  function describeEditor(record) {
    if (!record) return '';
    const label = record.updatedByLabel && record.updatedByLabel !== 'unknown'
      ? record.updatedByLabel
      : (record.updatedBy || '');
    if (!label) return '';
    const when = record.updatedAt ? new Date(record.updatedAt).toLocaleTimeString() : '';
    return label + (when ? ' · ' + when : '');
  }

  // Decide what a surface must do when the other side changed a script.
  //
  // This is the single rule both the sidebar and the Studio follow, kept here
  // because the two implementations drifted apart once — the sidebar advanced
  // its baseline on a dirty editor, which made the next save compare the fresh
  // revision against itself, skip the diff prompt and silently overwrite.
  //
  // The baseline (the revision the editor was opened at) must only ever move
  // forward when we are certain the unsaved buffer does not depend on it.
  //
  // @param {object} opts
  // @param {object|null} opts.incoming  the other side's record (null = deleted)
  // @param {boolean} opts.editorOpen    is this script open in our editor?
  // @param {boolean} opts.dirty         does the buffer differ from the baseline?
  // @returns {{action: 'adopt'|'warn'|'forget', reason: string}}
  function planRemoteChange(opts) {
    var incoming = opts.incoming || null;
    if (!incoming) {
      // Deleted elsewhere. An open editor must keep its baseline so the next
      // save surfaces the deletion instead of quietly re-creating the script.
      return { action: opts.editorOpen ? 'warn' : 'forget', reason: 'deleted' };
    }
    if (opts.editorOpen && opts.dirty) {
      return { action: 'warn', reason: 'concurrent-edit' };
    }
    if (opts.editorOpen) return { action: 'adopt', reason: 'untouched-editor' };
    return { action: 'forget', reason: 'not-open' };
  }

  globalThis.SF_US_SYNC = {
    SESSION_ID: SESSION_ID,
    ensureIds: ensureIds,
    readAllEnsured: readAllEnsured,
    STORE_KEY: STORE_KEY,
    readAll: readAll,
    writeAll: writeAll,
    stamp: stamp,
    revOf: revOf,
    makeDiff: makeDiff,
    summarise: summarise,
    showConflict: showConflict,
    showImportPrompt: showImportPrompt,
    showScriptReview: showScriptReview,
    partitionImport: partitionImport,
    watch: watch,
    planRemoteChange: planRemoteChange,
    describeEditor: describeEditor,
    toast: _toast
  };
})();
