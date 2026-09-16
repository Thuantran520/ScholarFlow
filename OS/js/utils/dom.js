/* dom.js — DOM utilities */
(function() {
  'use strict';

  window.SF_dom = {
    qs: function(selector, parent) {
      return (parent || document).querySelector(selector);
    },

    qsa: function(selector, parent) {
      return Array.prototype.slice.call((parent || document).querySelectorAll(selector));
    },

    show: function(el) {
      if (el) el.style.display = '';
    },

    hide: function(el) {
      if (el) el.style.display = 'none';
    },

    toggle: function(el, visible) {
      if (el) el.style.display = visible ? '' : 'none';
    },

    addClass: function(el, cls) {
      if (el) el.classList.add(cls);
    },

    removeClass: function(el, cls) {
      if (el) el.classList.remove(cls);
    },

    toggleClass: function(el, cls, force) {
      if (el) el.classList.toggle(cls, force);
    },

    on: function(el, event, handler, options) {
      if (el) el.addEventListener(event, handler, options);
    },

    off: function(el, event, handler, options) {
      if (el) el.removeEventListener(event, handler, options);
    },

    createElement: function(tag, attrs, text) {
      var el = document.createElement(tag);
      if (attrs) {
        Object.keys(attrs).forEach(function(key) {
          if (key === 'className') {
            el.className = attrs[key];
          } else {
            el.setAttribute(key, attrs[key]);
          }
        });
      }
      if (text) el.textContent = text;
      return el;
    }
  };
})();
