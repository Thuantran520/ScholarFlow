/* openalex.js — OpenAlex API service */
(function() {
  'use strict';

  var BASE_URL = 'https://api.openalex.org';

  window.SF_openalex = {
    search: function(query, perPage) {
      perPage = perPage || 5;
      var url = BASE_URL + '/works?search=' + encodeURIComponent(query) + '&per_page=' + perPage;
      return fetch(url)
        .then(function(resp) {
          if (!resp.ok) throw new Error('OpenAlex API error: ' + resp.status);
          return resp.json();
        })
        .then(function(data) {
          return data.results || [];
        });
    },

    getByDOI: function(doi) {
      if (!doi) return Promise.resolve(null);
      var url = BASE_URL + '/works/https://doi.org/' + encodeURIComponent(doi);
      return fetch(url)
        .then(function(resp) {
          if (!resp.ok) throw new Error('OpenAlex API error: ' + resp.status);
          return resp.json();
        });
    }
  };
})();
