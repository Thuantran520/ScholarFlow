/* crossref.js — Crossref API service */
(function() {
  'use strict';

  var BASE_URL = 'https://api.crossref.org/works';

  window.SF_crossref = {
    search: function(query, rows) {
      rows = rows || 5;
      var url = BASE_URL + '?query=' + encodeURIComponent(query) + '&rows=' + rows;
      return fetch(url)
        .then(function(resp) {
          if (!resp.ok) throw new Error('Crossref API error: ' + resp.status);
          return resp.json();
        })
        .then(function(data) {
          return (data.message && data.message.items) || [];
        });
    },

    getByDOI: function(doi) {
      if (!doi) return Promise.resolve(null);
      var url = BASE_URL + '/' + encodeURIComponent(doi);
      return fetch(url)
        .then(function(resp) {
          if (!resp.ok) throw new Error('Crossref API error: ' + resp.status);
          return resp.json();
        })
        .then(function(data) {
          return data.message || null;
        });
    }
  };
})();
