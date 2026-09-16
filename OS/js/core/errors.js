/* errors.js — Centralized error handling and toast notifications */
(function() {
  'use strict';

  window.SF_showToast = function(message, type, duration) {
    type = type || 'info';
    duration = duration || 3000;

    var toast = document.createElement('div');
    toast.className = 'notify notify-' + type;
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(function() {
      toast.classList.add('show');
    });

    setTimeout(function() {
      toast.classList.remove('show');
      setTimeout(function() {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    }, duration);
  };

  window.SF_handleError = function(error, context) {
    console.error('[ScholarFlow]', context || '', error);
    SF_showToast(error.message || String(error), 'error');
  };

  window.SF_logError = function(error, module) {
    console.error('[ScholarFlow:' + (module || 'unknown') + ']', error);
  };
})();
