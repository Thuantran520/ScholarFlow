/* tab-loader.js — Load tab partials on demand */
(function() {
  'use strict';

  var TAB_PARTIALS = {
    cite:        '../html/partials/tabs/cite.html',
    ai:          '../html/partials/tabs/ai.html',
    redact:      '../html/partials/tabs/redact.html',
    capture:     '../html/partials/tabs/capture.html',
    cookie:      '../html/partials/tabs/cookie.html',
    autofill:    '../html/partials/tabs/autofill.html',
    todo:        '../html/partials/tabs/todo.html',
    pomodoro:    '../html/partials/tabs/pomodoro.html',
    calendar:    '../html/partials/tabs/calendar.html',
    'tab-manager': '../html/partials/tabs/tab-manager.html',
    'test-helper': '../html/partials/tabs/test-helper.html',
    security:    '../html/partials/tabs/security.html'
  };

  var loadedTabs = {};

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

  window.SF_loadTab = function(tabName, callback) {
    if (loadedTabs[tabName]) {
      if (callback) callback();
      return Promise.resolve();
    }

    var url = TAB_PARTIALS[tabName];
    if (!url) return Promise.resolve();

    return fetch(url)
      .then(function(resp) { return resp.text(); })
      .then(function(html) {
        var container = document.getElementById('tab-container');
        var section = document.createElement('div');
        section.id = 'tab-' + tabName;
        section.className = 'tab-section';
        injectHTML(section, html);
        container.appendChild(section);
        loadedTabs[tabName] = true;
        section.dispatchEvent(new CustomEvent('tab-loaded', { detail: tabName }));
        if (callback) callback();
      });
  };

  window.SF_isTabLoaded = function(tabName) {
    return !!loadedTabs[tabName];
  };
})();
