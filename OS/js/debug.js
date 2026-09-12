/*
 * ScholarFlow debug bridge (dev tool, safe to ship - no-op by default).
 * Enable one of:
 *   1) open the page with ?debug=1 or #debug (URL flag),
 *   2) set a storage flag once: window.sfDebug.set(true),
 *   3) set window.SCHOLARFLOW_DEBUG = true.
 * While active it logs chrome.storage.onChanged + chrome.runtime.onMessage and
 * exposes window.sfDebug.{set, dumpState, watch}. Loaded LAST in sidebar.html
 * and popup.html. Note: debug.js is a separate classic script, so it can only
 * reflect bindings reachable from window (e.g. window.i18n, chrome.storage) -
 * it intentionally does NOT use eval/new Function.
 */
(function () {
  'use strict';

  const PREFIX = '[ScholarFlow:debug]';
  const FLAG = 'sf_debug';

  function hasStorage() {
    return typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;
  }

  function urlActive() {
    try {
      return (
        new URLSearchParams(window.location.search).get('debug') === '1' ||
        window.location.hash === '#debug' ||
        window.SCHOLARFLOW_DEBUG === true
      );
    } catch (_) {
      return false;
    }
  }

  // Read a "window.a.b.c" path without eval. Own-property traversal only so
  // __proto__ / constructor / prototype walks are refused.
  function grab(name) {
    if (typeof name !== 'string') return null;
    if (/^window\.[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*$/.test(name)) {
      try {
        let v = window;
        for (const p of name.split('.').slice(1)) {
          if (p === '__proto__' || p === 'constructor' || p === 'prototype' ||
            !Object.prototype.hasOwnProperty.call(Object(v), p)) {
            return undefined;
          }
          v = v[p];
        }
        return v === undefined || v === null ? null : JSON.parse(JSON.stringify(v));
      } catch (_) {
        return '<unserializable>';
      }
    }
    return '<window.* only>';
  }

  function log() {
    if (urlActive()) {
      console.log(PREFIX, ...arguments);
    }
  }

  window.sfDebug = {
    enabled: urlActive,

    set(flag) {
      if (!hasStorage()) {
        console.warn(PREFIX, 'chrome.storage.local unavailable');
        return Promise.resolve(false);
      }
      return chrome.storage.local.set({ [FLAG]: !!flag }).then(function () {
        console.log(PREFIX, flag ? 'enabled (storage flag)' : 'disabled (storage flag cleared)');
        return true;
      });
    },

    dumpState() {
      const state = {
        url: window.location.href,
        title: document.title,
        language: window.i18n && typeof window.i18n.getLanguage === 'function'
          ? window.i18n.getLanguage()
          : null,
      };
      if (hasStorage()) {
        chrome.storage.local.get(null).then(function (all) {
          state.storage = all;
          console.log(PREFIX, 'state', state);
        });
      } else {
        console.log(PREFIX, 'state', state);
      }
      return state;
    },

    watch() {
      if (hasStorage() && chrome.storage.onChanged) {
        chrome.storage.onChanged.addListener(function (changes, area) {
          if (!urlActive()) return;
          console.log(PREFIX, 'storage.onChanged [' + area + ']', changes);
        });
      }
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
        chrome.runtime.onMessage.addListener(function (msg, sender) {
          if (!urlActive()) return;
          const src = sender && sender.tab ? ('tab:' + (sender.tab.url || '?')) : 'extension';
          console.log(PREFIX, 'runtime.onMessage \u2190 ' + src + ':', msg);
        });
      }
    },
  };

  if (urlActive()) {
    console.log(PREFIX, 'enabled via URL flag');
  }
  if (hasStorage() && urlActive()) {
    chrome.storage.local.get(FLAG).then(function (r) {
      if (r[FLAG]) console.log(PREFIX, 'enabled via storage flag');
    });
  }
})();