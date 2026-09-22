// ---------------------------------------------------------------------------
// ScholarFlow module: OS/js/core/header-layout.js
// Layout customization: header items (top/bottom position, per-item show/hide,
// side & order) persisted under `sf_header_settings`, plus main-nav tab order
// persisted under `sf_nav_settings`.
// ---------------------------------------------------------------------------
(function () {
  'use strict';

  var HEADER_STORE_KEY = 'sf_header_settings';
  var NAV_STORE_KEY = 'sf_nav_settings';
  var HEADER_ITEMS = ['brand', 'lang', 'trust', 'badge'];
  var HEADER_LABEL_KEYS = {
    brand: 'hdrs_item_brand',
    lang: 'hdrs_item_lang',
    trust: 'hdrs_item_trust',
    badge: 'hdrs_item_badge'
  };
  var DEFAULT_SETTINGS = {
    position: 'top',
    hidden: { brand: false, lang: false, trust: false, badge: false },
    side: { brand: 'left', lang: 'right', trust: 'right', badge: 'right' },
    order: { brand: 0, lang: 0, trust: 1, badge: 2 }
  };
  var DEFAULT_NAV_ORDER = [
    'tab-cite', 'tab-ai', 'tab-flow', 'tab-redact', 'tab-capture', 'tab-cookie',
    'tab-autofill', 'tab-todo', 'tab-pomo', 'tab-cal', 'tab-tabmgr',
    'tab-testhelper', 'tab-security', 'tab-social', 'tab-lingua', 'tab-dm', 'tab-qr'
  ];

  var state = null;
  var navOrder = null;
  var bound = false;

  function cloneDefaults() {
    return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  }

  function mergeSettings(stored) {
    var s = cloneDefaults();
    if (stored && typeof stored === 'object') {
      if (stored.position === 'top' || stored.position === 'bottom') {
        s.position = stored.position;
      }
      HEADER_ITEMS.forEach(function (k) {
        if (stored.hidden && typeof stored.hidden[k] === 'boolean') s.hidden[k] = stored.hidden[k];
        if (stored.side && (stored.side[k] === 'left' || stored.side[k] === 'right')) s.side[k] = stored.side[k];
        if (stored.order && typeof stored.order[k] === 'number') s.order[k] = stored.order[k];
      });
    }
    return s;
  }

  function tr(key) {
    if (window.i18n && typeof window.i18n.t === 'function') return window.i18n.t(key);
    return key;
  }

  function getHeader() {
    return document.getElementById('sf-header') || document.querySelector('.header');
  }

  function saveSettings(cb) {
    var after = cb || function () {};
    if (typeof storSet === 'function') {
      storSet((function (obj) { obj[HEADER_STORE_KEY] = state; return obj; })({}), after);
    } else if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      var p = chrome.storage.local.set((function (obj) { obj[HEADER_STORE_KEY] = state; return obj; })({}));
      if (p && typeof p.then === 'function') p.then(after).catch(function () { after(); });
      else after();
    } else {
      after();
    }
  }

  function applyHeaderSettings() {
    var header = getHeader();
    if (!header || !state) return;
    header.classList.toggle('header-position-bottom', state.position === 'bottom');

    if (state.position === 'bottom') {
      var footer = document.querySelector('.footer-trust-bar');
      if (footer && header.nextElementSibling !== footer) {
        footer.parentNode.insertBefore(header, footer);
      }
    } else {
      var nav = document.querySelector('.main-nav-bar');
      if (nav && header.nextElementSibling !== nav) {
        nav.parentNode.insertBefore(header, nav);
      }
    }

    var items = {};
    HEADER_ITEMS.forEach(function (k) {
      items[k] = header.querySelector('[data-header-item="' + k + '"]');
    });

    var left = [];
    var right = [];
    HEADER_ITEMS.forEach(function (k) {
      var el = items[k];
      if (!el) return;
      el.style.display = state.hidden[k] ? 'none' : '';
      el.style.marginLeft = '';
      (state.side[k] === 'left' ? left : right).push(k);
    });
    left.sort(function (a, b) { return state.order[a] - state.order[b]; });
    right.sort(function (a, b) { return state.order[a] - state.order[b]; });

    left.concat(right).forEach(function (k) {
      if (items[k]) header.appendChild(items[k]);
    });

    var gear = document.getElementById('btn-header-settings');
    // The auto-margin anchor must be the first VISIBLE right-side item:
    // margin-left:auto on a display:none element never pushes the rest right.
    var firstRightKey = null;
    for (var fi = 0; fi < right.length; fi++) {
      if (!state.hidden[right[fi]]) { firstRightKey = right[fi]; break; }
    }
    var firstRight = firstRightKey ? items[firstRightKey] : null;
    if (firstRight) firstRight.style.marginLeft = 'auto';
    if (gear) {
      gear.style.marginLeft = firstRight ? '' : 'auto';
      header.appendChild(gear);
    }
  }

  function sideGroup(k) {
    return HEADER_ITEMS
      .filter(function (i) { return state.side[i] === state.side[k]; })
      .sort(function (a, b) { return state.order[a] - state.order[b]; });
  }

  // Give every item of one side a unique sequential order. Defaults (and side
  // changes) can leave two items sharing the same order value — a positional
  // swap of equal values is a no-op, which used to make ▲/▼ buttons dead.
  function renumberSide(side) {
    HEADER_ITEMS
      .filter(function (i) { return state.side[i] === side; })
      .sort(function (a, b) { return state.order[a] - state.order[b]; })
      .forEach(function (item, i) { state.order[item] = i; });
  }

  function commit() {
    if (!state) return;
    saveSettings();
    applyHeaderSettings();
    renderItemRows();
  }

  function toggleItem(k) {
    if (!state) return;
    state.hidden[k] = !state.hidden[k];
    commit();
  }

  function setSide(k, side) {
    if (!state || (side !== 'left' && side !== 'right')) return;
    state.side[k] = side;
    renumberSide(side);
    commit();
  }

  function moveItem(k, dir) {
    if (!state) return;
    var grp = sideGroup(k);
    var idx = grp.indexOf(k);
    var target = idx + dir;
    if (target < 0 || target >= grp.length) return;
    // Swap positions in the group array, then renumber — swapping raw order
    // values would be a no-op whenever the two neighbours share a value.
    var other = grp[target];
    grp[idx] = other;
    grp[target] = k;
    grp.forEach(function (item, i) { state.order[item] = i; });
    commit();
  }

  function setPosition(pos) {
    if (!state || (pos !== 'top' && pos !== 'bottom')) return;
    state.position = pos;
    commit();
  }

  function resetSettings() {
    if (!state) return;
    state = cloneDefaults();
    commit();
  }

  function renderItemRows() {
    var list = document.getElementById('hdrs-item-list');
    if (!list || !state) return;
    list.textContent = '';

    HEADER_ITEMS.forEach(function (k) {
      var row = document.createElement('div');
      row.className = 'hdrs-item-row' + (state.hidden[k] ? ' is-hidden' : '');
      row.dataset.hdrsItem = k;

      var eye = document.createElement('button');
      eye.type = 'button';
      eye.className = 'hdrs-ico-btn' + (state.hidden[k] ? '' : ' is-on');
      eye.textContent = state.hidden[k] ? '\u25CB' : '\u25C9';
      eye.title = tr(state.hidden[k] ? 'hdrs_show' : 'hdrs_hide');
      eye.addEventListener('click', function () { toggleItem(k); });

      var name = document.createElement('span');
      name.className = 'hdrs-item-name';
      name.textContent = tr(HEADER_LABEL_KEYS[k]);

      var grp = document.createElement('div');
      grp.className = 'hdrs-btn-group';

      var grpItems = sideGroup(k);
      var grpIdx = grpItems.indexOf(k);

      var toLeft = makeBtn('\u25C0', 'hdrs_to_left', state.side[k] === 'left' ? 'is-side-active' : '',
        function () { setSide(k, 'left'); });
      var toRight = makeBtn('\u25B6', 'hdrs_to_right', state.side[k] === 'right' ? 'is-side-active' : '',
        function () { setSide(k, 'right'); });
      var up = makeBtn('\u25B2', 'hdrs_up', '', function () { moveItem(k, -1); });
      var down = makeBtn('\u25BC', 'hdrs_down', '', function () { moveItem(k, 1); });
      up.disabled = grpIdx <= 0;
      down.disabled = grpIdx >= grpItems.length - 1;

      grp.appendChild(toLeft);
      grp.appendChild(toRight);
      grp.appendChild(up);
      grp.appendChild(down);

      row.appendChild(eye);
      row.appendChild(name);
      row.appendChild(grp);
      list.appendChild(row);
    });

    document.querySelectorAll('#hdrs-position-seg .hdrs-seg-btn').forEach(function (b) {
      b.classList.toggle('active', b.dataset.hdrsPos === state.position);
    });
  }

  function makeBtn(glyph, titleKey, extraClass, onclick) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'hdrs-ico-btn' + (extraClass ? ' ' + extraClass : '');
    btn.textContent = glyph;
    btn.title = tr(titleKey);
    btn.addEventListener('click', onclick);
    return btn;
  }

  // ---- Main-nav tab ordering ------------------------------------------------

  function mergeNavOrder(stored) {
    var out = [];
    var pending = {};
    DEFAULT_NAV_ORDER.forEach(function (t) { pending[t] = true; });
    if (Array.isArray(stored)) {
      stored.forEach(function (t) {
        if (pending[t] && out.indexOf(t) === -1) {
          out.push(t);
          pending[t] = false;
        }
      });
    }
    DEFAULT_NAV_ORDER.forEach(function (t) {
      if (pending[t]) out.push(t);
    });
    return out;
  }

  function applyNavOrder() {
    if (!navOrder) return;
    var wrapper = document.getElementById('nav-wrapper');
    if (!wrapper) return;
    var orderIndex = {};
    navOrder.forEach(function (t, i) { orderIndex[t] = i; });
    var btns = Array.prototype.slice.call(wrapper.querySelectorAll('.main-nav-btn'));
    btns.sort(function (a, b) {
      var ia = orderIndex[a.dataset.target];
      var ib = orderIndex[b.dataset.target];
      if (ia === undefined) return 1;
      if (ib === undefined) return -1;
      return ia - ib;
    });
    btns.forEach(function (b) { wrapper.appendChild(b); });
  }

  function getActiveNavTarget() {
    var wrapper = document.getElementById('nav-wrapper');
    var btn = wrapper ? wrapper.querySelector('.main-nav-btn.active') : null;
    return (btn && btn.dataset.target) || (navOrder ? navOrder[0] : null);
  }

  function saveNavWithActive(active) {
    if (!navOrder) return;
    var payload = { order: navOrder.slice(), active: active || getActiveNavTarget() };
    if (typeof storSet === 'function') {
      storSet((function (obj) { obj[NAV_STORE_KEY] = payload; return obj; })({}), function () {});
    } else if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      var p = chrome.storage.local.set((function (obj) { obj[NAV_STORE_KEY] = payload; return obj; })({}));
      if (p && typeof p.then === 'function') p.catch(function () {});
    }
  }

  function saveNav() {
    // Always persist the active tab alongside the order: writing {order} alone
    // wiped `active`, so a reorder reset the sidebar to navOrder[0] on reopen.
    saveNavWithActive();
  }

  function applyNavActive(target) {
    if (!navOrder) return;
    var val = (Array.isArray(navOrder) && navOrder.indexOf(target) !== -1) ? target : navOrder[0];
    document.querySelectorAll('.main-nav-btn').forEach(function (b) {
      b.classList.toggle('active', b.dataset.target === val);
    });
    document.querySelectorAll('.tab-section').forEach(function (s) {
      s.classList.toggle('active', s.id === val);
    });
    var wrapper = document.getElementById('nav-wrapper');
    if (wrapper) {
      var b = wrapper.querySelector('.main-nav-btn[data-target="' + val + '"]');
      if (b) {
        try {
          wrapper.scrollTo({ left: Math.max(0, b.offsetLeft - wrapper.clientWidth / 2 + b.offsetWidth / 2), behavior: 'smooth' });
        } catch (e) {}
      }
    }
  }

  function commitNav() {
    if (!navOrder) return;
    saveNav();
    applyNavOrder();
    renderNavRows();
  }

  function moveNav(target, dir) {
    if (!navOrder) return;
    var idx = navOrder.indexOf(target);
    var to = idx + dir;
    if (idx < 0 || to < 0 || to >= navOrder.length) return;
    var tmp = navOrder[idx];
    navOrder[idx] = navOrder[to];
    navOrder[to] = tmp;
    commitNav();
  }

  function renderNavRows() {
    var list = document.getElementById('hdrs-nav-list');
    if (!list || !navOrder) return;
    list.textContent = '';

    navOrder.forEach(function (target, idx) {
      var row = document.createElement('div');
      row.className = 'hdrs-item-row';
      row.dataset.navTarget = target;

      var name = document.createElement('span');
      name.className = 'hdrs-item-name';
      name.textContent = tr('nav_' + target.slice(4));

      var grp = document.createElement('div');
      grp.className = 'hdrs-btn-group';
      var up = makeBtn('\u25B2', 'hdrs_up', '', function () { moveNav(target, -1); });
      var down = makeBtn('\u25BC', 'hdrs_down', '', function () { moveNav(target, 1); });
      up.disabled = idx <= 0;
      down.disabled = idx >= navOrder.length - 1;

      grp.appendChild(up);
      grp.appendChild(down);
      row.appendChild(name);
      row.appendChild(grp);
      list.appendChild(row);
    });
  }

  function loadNavState() {
    var done = function (res) {
      var stored = res && res.sf_nav_settings;
      navOrder = mergeNavOrder(stored && stored.order);
      applyNavOrder();
      applyNavActive(stored && stored.active);
      renderNavRows();
    };
    if (typeof storGet === 'function') {
      storGet(NAV_STORE_KEY, done);
    } else if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(NAV_STORE_KEY, function (res) { done(res || {}); });
    } else {
      done({});
    }
  }

  function rememberNavActive(target) {
    if (target && navOrder && navOrder.indexOf(target) !== -1) {
      try {
        saveNavWithActive(target);
      } catch (e) {}
      var wrapper = document.getElementById('nav-wrapper');
      if (wrapper) {
        [...wrapper.querySelectorAll('.main-nav-btn')].forEach(function (b) {
          b.classList.toggle('active', b.dataset.target === target);
        });
        document.querySelectorAll('.tab-section').forEach(function (s) {
          s.classList.toggle('active', s.id === target);
        });
      }
    }
  }

  function resetAll() {
    resetSettings();
    if (!navOrder) return;
    navOrder = DEFAULT_NAV_ORDER.slice();
    saveNavWithActive(navOrder[0]);
    applyNavOrder();
    applyNavActive(navOrder[0]);
    renderNavRows();
  }

  // ---- Modal + bindings -----------------------------------------------------

  function openModal() {
    var modal = document.getElementById('header-settings-modal');
    if (!modal) return;
    modal.style.display = 'block';
  }

  function closeModal() {
    var modal = document.getElementById('header-settings-modal');
    if (modal) modal.style.display = 'none';
  }

  function bindUI() {
    if (bound) return;
    bound = true;

    var gear = document.getElementById('btn-header-settings');
    if (gear) gear.addEventListener('click', openModal);

    var btnClose = document.getElementById('btn-close-header-settings');
    if (btnClose) btnClose.addEventListener('click', closeModal);

    var btnReset = document.getElementById('btn-reset-header-settings');
    if (btnReset) btnReset.addEventListener('click', resetAll);

    var modal = document.getElementById('header-settings-modal');
    if (modal) modal.addEventListener('click', function (e) {
      if (e.target === modal) closeModal();
    });

    document.querySelectorAll('#hdrs-position-seg .hdrs-seg-btn').forEach(function (b) {
      b.addEventListener('click', function () { setPosition(b.dataset.hdrsPos); });
    });

    var navWrap = document.getElementById('nav-wrapper');
    if (navWrap) {
      navWrap.addEventListener('click', function (e) {
        var btn = e.target.closest ? e.target.closest('.main-nav-btn') : null;
        if (btn && btn.dataset.target && navOrder && navOrder.indexOf(btn.dataset.target) !== -1) {
          rememberNavActive(btn.dataset.target);
        }
      });
      navWrap.addEventListener('keydown', function (e) {
        if ((e.key === 'Enter' || e.key === ' ') && e.target.classList && e.target.classList.contains('main-nav-btn')) {
          e.preventDefault();
          e.target.click();
        }
      });
    }

    window.addEventListener('app-language-changed', function () { renderItemRows(); renderNavRows(); });
  }

  function loadState() {
    var done = function (res) {
      state = mergeSettings(res && res.sf_header_settings);
      applyHeaderSettings();
      renderItemRows();
    };
    if (typeof storGet === 'function') {
      storGet(HEADER_STORE_KEY, done);
    } else if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(HEADER_STORE_KEY, function (res) { done(res || {}); });
    } else {
      done({});
    }
  }

  function initHeaderLayout() {
    if (!getHeader()) return;
    bindUI();
    loadState();
    loadNavState();
  }

  // Test / debugging hooks
  window.sfGetHeaderSettings = function () {
    return state ? JSON.parse(JSON.stringify(state)) : null;
  };
  window.sfHeaderApply = function (stored) {
    state = mergeSettings(stored);
    applyHeaderSettings();
    renderItemRows();
    saveSettings();
    return window.sfGetHeaderSettings();
  };
  window.sfHeaderReset = function () {
    if (!state) return;
    state = cloneDefaults();
    saveSettings();
    applyHeaderSettings();
    renderItemRows();
    return window.sfGetHeaderSettings();
  };
  window.sfNavGetOrder = function () {
    return navOrder ? navOrder.slice() : null;
  };
  window.sfNavReorder = function (orderArray) {
    if (!Array.isArray(orderArray)) return window.sfNavGetOrder();
    navOrder = mergeNavOrder(orderArray);
    saveNav();
    applyNavOrder();
    renderNavRows();
    return window.sfNavGetOrder();
  };
  window.sfNavReset = function () {
    if (!navOrder) return null;
    navOrder = DEFAULT_NAV_ORDER.slice();
    saveNavWithActive(navOrder[0]);
    applyNavOrder();
    applyNavActive(navOrder[0]);
    renderNavRows();
    return window.sfNavGetOrder();
  };

  if (document.readyState !== 'loading') {
    initHeaderLayout();
  } else {
    document.addEventListener('DOMContentLoaded', initHeaderLayout);
  }
})();