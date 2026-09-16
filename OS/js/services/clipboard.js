/* clipboard.js — Clipboard utilities */
(function() {
  'use strict';

  window.SF_copyToClipboard = function(text, callback) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function() {
        if (callback) callback(true);
      }).catch(function() {
        fallbackCopy(text, callback);
      });
    } else {
      fallbackCopy(text, callback);
    }
  };

  function fallbackCopy(text, callback) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      if (callback) callback(true);
    } catch (e) {
      if (callback) callback(false);
    }
    document.body.removeChild(ta);
  }
})();
