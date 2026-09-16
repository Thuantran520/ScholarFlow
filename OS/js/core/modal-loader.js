/* modal-loader.js — Load modal partials on demand */
(function() {
  'use strict';

  var MODAL_PARTIALS = {
    'ai-settings':  '../html/partials/modals/ai-settings.html',
    'ai-sessions':  '../html/partials/modals/ai-sessions.html',
    'bibliography': '../html/partials/modals/bibliography.html',
    'author-rules': '../html/partials/modals/author-rules.html',
    'trust':        '../html/partials/modals/trust.html'
  };

  function injectHTML(el, html) {
    var parser = new DOMParser();
    var doc = parser.parseFromString(html, 'text/html');
    var fragment = document.createDocumentFragment();
    var children = Array.prototype.slice.call(doc.body.childNodes);
    children.forEach(function(child) {
      fragment.appendChild(document.importNode(child, true));
    });
    el.appendChild(fragment);
  }

  window.SF_loadModal = function(modalName, callback) {
    var container = document.getElementById('modal-container');
    if (!container) return Promise.resolve();

    // Already loaded?
    if (container.querySelector('#' + modalName + '-modal')) {
      if (callback) callback();
      return Promise.resolve();
    }

    var url = MODAL_PARTIALS[modalName];
    if (!url) return Promise.resolve();

    return fetch(url)
      .then(function(resp) { return resp.text(); })
      .then(function(html) {
        injectHTML(container, html);
        container.dispatchEvent(new CustomEvent('modal-loaded', { detail: modalName }));
        if (callback) callback();
      });
  };
})();
