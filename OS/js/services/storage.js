/* storage.js — Chrome storage wrapper */
(function() {
  'use strict';

  var api = chrome && chrome.storage ? chrome.storage.local : null;

  window.SF_storage = {
    get: function(keys, callback) {
      if (!api) { callback({}); return; }
      api.get(keys, callback);
    },
    set: function(data, callback) {
      if (!api) { if (callback) callback(); return; }
      api.set(data, callback);
    },
    remove: function(keys, callback) {
      if (!api) { if (callback) callback(); return; }
      api.remove(keys, callback);
    }
  };
})();
