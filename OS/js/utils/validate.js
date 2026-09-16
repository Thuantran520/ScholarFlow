/* validate.js — Validation utilities */
(function() {
  'use strict';

  window.SF_validate = {
    isUrl: function(str) {
      if (!str) return false;
      try {
        var url = new URL(str);
        return url.protocol === 'http:' || url.protocol === 'https:';
      } catch (e) {
        return false;
      }
    },

    isDOI: function(str) {
      if (!str) return false;
      return /^10\.\d{4,9}\/[-._;()\/:A-Z0-9]+$/i.test(str.trim());
    },

    isEmail: function(str) {
      if (!str) return false;
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str.trim());
    },

    isEmpty: function(str) {
      return !str || str.trim().length === 0;
    }
  };
})();
