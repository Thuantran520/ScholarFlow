/* format.js — Formatting utilities */
(function() {
  'use strict';

  window.SF_format = {
    date: function(dateStr) {
      if (!dateStr) return '';
      var d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('vi-VN', { year: 'numeric', month: '2-digit', day: '2-digit' });
    },

    datetime: function(dateStr) {
      if (!dateStr) return '';
      var d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('vi-VN', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit'
      });
    },

    truncate: function(str, maxLen) {
      if (!str) return '';
      maxLen = maxLen || 100;
      if (str.length <= maxLen) return str;
      return str.substring(0, maxLen - 3) + '...';
    },

    escapeHtml: function(str) {
      if (!str) return '';
      var div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    }
  };
})();
