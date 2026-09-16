/* partial-loader.js — Load shared HTML partials into the shell */
(function() {
  'use strict';

  var SHARED_PARTIALS = {
    header:  '../html/partials/_header.html',
    nav:     '../html/partials/_nav.html',
    footer:  '../html/partials/_footer.html',
    scripts: '../html/partials/_scripts.html'
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

  function loadShared() {
    var keys = Object.keys(SHARED_PARTIALS);
    var chain = Promise.resolve();

    keys.forEach(function(key) {
      chain = chain.then(function() {
        var el = document.getElementById('partial-' + key);
        if (!el) return;
        return fetch(SHARED_PARTIALS[key])
          .then(function(resp) { return resp.text(); })
          .then(function(html) { injectHTML(el, html); });
      });
    });

    chain.then(function() {
      document.dispatchEvent(new CustomEvent('shared-loaded'));
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadShared);
  } else {
    loadShared();
  }
})();
