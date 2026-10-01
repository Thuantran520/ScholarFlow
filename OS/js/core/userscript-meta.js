// OS/js/core/userscript-meta.js
// Single source of truth for UserScript metadata parsing, match-pattern
// evaluation and header serialisation. Loaded as a classic script by every
// extension page that needs it (sidebar, popup, userscripts studio) and by the
// live-log / XHR bridge in content/userscripts_runner.js.
//
// Exposes: globalThis.SF_US_META
(function() {
  'use strict';
  if (typeof globalThis === 'undefined') return;
  if (globalThis.SF_US_META) return;

  // Tags that may legally appear more than once inside ==UserScript==
  var MULTI_TAGS = {
    match: 'matches',
    'exclude-match': 'excludeMatches',
    include: 'includes',
    exclude: 'excludes',
    require: 'requires',
    resource: 'resources',
    grant: 'grants',
    connect: 'connects'
  };

  // Tags whose value is a boolean flag rather than a string.
  var BOOL_TAGS = { noframes: 'noframes' };

  // Order used when the header is regenerated. Multi-value tags are emitted
  // once per value so a round-trip never collapses them into one line.
  var HEADER_ORDER = [
    'name', 'namespace', 'version', 'description', 'author', 'homepage',
    'match', 'include', 'exclude', 'exclude-match',
    'require', 'resource', 'run-at', 'noframes',
    'grant', 'updateURL', 'downloadURL'
  ];

  var RUN_AT_VALUES = ['document_start', 'document_body', 'document_end', 'document_idle'];

  function escapeRegExp(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function escapePath(p) {
    // Only '*' is a wildcard in the path component; everything else is literal.
    return String(p).split('*').map(escapeRegExp).join('.*');
  }

  // Glob (Tampermonkey @include / @exclude) -> RegExp. '*' matches any run of
  // characters, '?' matches exactly one. Everything else is literal.
  function globToRegExp(glob) {
    var g = String(glob == null ? '' : glob);
    var out = '';
    for (var i = 0; i < g.length; i++) {
      var ch = g.charAt(i);
      if (ch === '*') out += '.*';
      else if (ch === '?') out += '.';
      else out += escapeRegExp(ch);
    }
    try { return new RegExp(out); } catch (e) { return null; }
  }

  // Chrome/Firefox match pattern -> RegExp. Returns null when the pattern is
  // malformed so callers can surface a validation error instead of silently
  // never matching.
  function patternToRegExp(pattern) {
    var p = String(pattern == null ? '' : pattern).trim();
    if (!p) return null;
    if (p === '<all_urls>') {
      return /^(?:https?|wss?|ftp|file):\/\/[^\s]*$/;
    }
    var m = /^(\*|https?|wss?|ftp|file):\/\/([^/]*)(\/.*)$/.exec(p);
    if (!m) return null;
    var scheme = (m[1] === '*') ? '(?:https?|wss?|ftp)' : escapeRegExp(m[1]);
    var host = m[2];
    var hostRe;
    if (host === '' || host === '*') {
      hostRe = '[^/]*';
    } else if (host.charAt(0) === '*' && host.charAt(1) === '.') {
      // "*.example.com" also matches the bare "example.com".
      hostRe = '(?:[^/]*\\.)?' + escapeRegExp(host.slice(2));
    } else {
      hostRe = escapeRegExp(host);
    }
    try {
      return new RegExp('^' + scheme + '://' + hostRe + escapePath(m[3]) + '$');
    } catch (e) {
      return null;
    }
  }

  // Parse a ==UserScript== block. Multi-value tags become arrays, single-value
  // tags stay strings. Returns null when there is no metadata block at all.
  function parse(code) {
    var src = String(code == null ? '' : code);
    var block = /==UserScript==([\s\S]*?)==\/UserScript==/.exec(src);
    if (!block) return null;
    var meta = {};
    var lines = block[1].split('\n');
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].replace(/^\s*\/\/\s?/, '');
      var m = /^@([\w-]+)([:\-][\w-]*)?\s*(.*)$/.exec(line);
      if (!m) continue;
      var tag = m[1];
      // "@name:vi", "@description:ja", ... are locale-specific overrides. We
      // ship our own 5 languages and have no per-script locale, so the base tag
      // must win. Without this guard a localized line silently replaces @name
      // with a value like ":zh-TW ..." (and later lines win outright).
      if (m[2]) continue;
      var val = m[3].trim();
      if (Object.prototype.hasOwnProperty.call(MULTI_TAGS, tag)) {
        if (!val) continue;
        var key = MULTI_TAGS[tag];
        if (!Array.isArray(meta[key])) meta[key] = [];
        if (meta[key].indexOf(val) === -1) meta[key].push(val);
      } else {
        meta[tag] = val;
      }
    }
    if (meta['noframes'] !== undefined && meta['noframes'] === '') meta['noframes'] = 'true';
    if (meta['run-at']) meta['runAt'] = meta['run-at'];
    return meta;
  }

  // Normalised view of a stored script record: structured fields always win,
  // the embedded header is used to backfill whatever the record is missing.
  function fieldsOf(script) {
    var s = script || {};
    var meta = parse(s.code) || {};
    function arr(rec, metaKey) {
      if (Array.isArray(rec) && rec.length) return rec.slice();
      if (Array.isArray(meta[metaKey]) && meta[metaKey].length) return meta[metaKey].slice();
      return [];
    }
    var matches = arr(s.matches, 'matches');
    var explicitMatches = matches.slice();
    var includes = arr(s.includes, 'includes');
    var extractedFromIncludes = [];
    includes.forEach(function(inc) {
      var pats = extractMatchPatterns(inc);
      pats.forEach(function(p) {
        if (extractedFromIncludes.indexOf(p) === -1) {
          extractedFromIncludes.push(p);
        }
      });
    });

    // Greasy Fork scripts often use @include globs or regexes instead of @match
    // (e.g. "https://*.youtube.com/*" or "/^https:\/\/([\w-]+\.)?aliexpress\.(ru|us|com)\/*/").
    // registerContentScripts() only accepts match patterns, so without pattern extraction
    // a @include-only script would look like it had no scope at all and never be registered.
    if (!explicitMatches.length) {
      explicitMatches = extractedFromIncludes.slice();
    } else if ((explicitMatches.length === 1 && (explicitMatches[0] === '*://*/*' || explicitMatches[0] === '<all_urls>')) && extractedFromIncludes.length) {
      explicitMatches = extractedFromIncludes.slice();
      if (matches.indexOf('*://*/*') !== -1 && explicitMatches.indexOf('*://*/*') === -1) {
        explicitMatches.push('*://*/*');
      }
    }
    if (!matches.length && explicitMatches.length) matches = explicitMatches.slice();
    if (!matches.length) matches = ['<all_urls>'];
    return {
      name: s.name || meta.name || '',
      namespace: s.namespace || meta.namespace || '',
      version: s.version || meta.version || '',
      description: s.description || meta.description || '',
      author: s.author || meta.author || '',
      homepage: meta.homepage || '',
      code: s.code !== undefined ? s.code : '',
      matches: matches,
      // Raw list, before the <all_urls> display default. The engine must never
      // widen a script with no @match to "every site" behind the user's back.
      explicitMatches: explicitMatches,
      // The editor has always stored exclude *match patterns* in `excludes`,
      // so they feed excludeMatches. Real `@exclude` globs go to `excludes`.
      excludeMatches: arr(s.excludes, 'excludeMatches').concat(
        Array.isArray(meta.excludes) ? meta.excludes.filter(function (x) { return isMatchPattern(x); }) : []
      ).filter(function (v, i, a) { return a.indexOf(v) === i; }),
      includes: includes,
      excludes: (Array.isArray(s.excludes) ? s.excludes.filter(isGlob) : []).concat(
        Array.isArray(meta.excludes) ? meta.excludes.filter(function (x) { return !isMatchPattern(x); }) : []
      ).filter(function (v, i, a) { return a.indexOf(v) === i; }),
      requires: arr(s.requires, 'requires'),
      resources: arr(s.resources, 'resources'),
      grants: arr(s.grants, 'grants'),
      noframes: !!(s.noframes || meta.noframes),
      updateUrl: s.updateUrl || meta.updateURL || meta.downloadURL || '',
      runAt: normalizeRunAt(s.runAt || meta.runAt)
    };
  }

  function extractMatchPatterns(v) {
    var s = String(v == null ? '' : v).trim();
    if (!s) return [];
    if (/^(\*|https?|file|ftp):\/\/([^/]+)(\/.*)$/.test(s)) {
      return [s];
    }
    if (/^(\*|https?|file|ftp):\/\/([^/]+)$/.test(s)) {
      return [s + '/*'];
    }
    if (/^http\*:\/\/([^/]+)(\/.*)?$/.test(s)) {
      var host = RegExp.$1;
      var path = RegExp.$2 || '/*';
      return ['*://' + host + (path.charAt(0) === '/' ? path : ('/' + path))];
    }
    var globMatch = /^(?:\*:\/\/|\*\.|\*)?([a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)(\/.*|\*)?$/.exec(s);
    if (globMatch && !s.startsWith('/') && globMatch[1].indexOf('.') !== -1 && globMatch[1].indexOf('*') === -1) {
      return ['*://*.' + globMatch[1] + '/*'];
    }
    if (s.startsWith('/') && (s.endsWith('/') || s.lastIndexOf('/') > 0)) {
      var lastSlash = s.lastIndexOf('/');
      var body = s.slice(1, lastSlash);
      body = body.replace(/^\^https?:?\\\/\\\/?/i, '').replace(/[\$\/].*$/, '');
      var reGroup = /([a-zA-Z0-9-]+)\\?\.\(([^)]+)\)/.exec(body);
      if (reGroup) {
        var base = reGroup[1];
        var tlds = reGroup[2].split('|').map(function(t) {
          return t.replace(/\\/g, '').trim();
        }).filter(Boolean);
        var res = [];
        tlds.forEach(function(tld) {
          if (/^[a-zA-Z0-9.-]+$/.test(tld)) {
            res.push('*://*.' + base + '.' + tld + '/*');
          }
        });
        if (res.length) return res;
      }
      var reSimple = /([a-zA-Z0-9-]+)\\?\.([a-zA-Z]{2,})/.exec(body);
      if (reSimple && reSimple[1] !== 'w' && reSimple[1] !== 'd') {
        return ['*://*.' + reSimple[1] + '.' + reSimple[2] + '/*'];
      }
    }
    return [];
  }

  function isMatchPattern(v) {
    return !!v && (v.indexOf('*://') === 0 || v.indexOf('http') === 0 || v === '<all_urls>' || v.indexOf('file://') === 0);
  }

  function isGlob(v) {
    return !!v && !isMatchPattern(v);
  }

  // Accept both the userscript header spelling (document-idle) and the value
  // stored by the editor / the registerContentScripts API (document_idle).
  function normalizeRunAt(v) {
    var s = String(v == null ? '' : v).replace(/-/g, '_');
    return RUN_AT_VALUES.indexOf(s) !== -1 ? s : 'document_idle';
  }

  function matchPatternList(matches) {
    return Array.isArray(matches) ? matches.filter(function (m) { return m && m !== '<all_urls>'; }) : [];
  }

  // Does `url` fall inside the script's scope? Honours @exclude-match,
  // @exclude and @include. Returns false when a pattern is malformed so a
  // broken pattern can never widen the script's reach.
  function matchesUrl(script, url) {
    if (!url) return true;
    var f = fieldsOf(script);
    var u = String(url);
    if (f.matches.indexOf('<all_urls>') === -1) {
      var hit = false;
      for (var i = 0; i < f.matches.length; i++) {
        var re = patternToRegExp(f.matches[i]);
        if (re && re.test(u)) { hit = true; break; }
      }
      if (!hit) {
        for (var j = 0; j < f.includes.length; j++) {
          var gre = globToRegExp(f.includes[j]);
          if (gre && gre.test(u)) { hit = true; break; }
        }
      }
      if (!hit) return false;
    }
    for (var k = 0; k < f.excludeMatches.length; k++) {
      var ex = patternToRegExp(f.excludeMatches[k]);
      if (ex && ex.test(u)) return false;
    }
    for (var m = 0; m < f.excludes.length; m++) {
      var gex = globToRegExp(f.excludes[m]);
      if (gex && gex.test(u)) return false;
    }
    return true;
  }

  // Validation for the editor: every pattern must compile, and the record must
  // actually be able to match something.
  function validate(script) {
    var f = fieldsOf(script);
    var errors = [];
    var seen = {};
    var all = []
      .concat(f.matches.map(function (p) { return { p: p, kind: 'match' }; }))
      .concat(f.excludeMatches.map(function (p) { return { p: p, kind: 'exclude-match' }; }));
    for (var i = 0; i < all.length; i++) {
      var item = all[i];
      if (!item.p) continue;
      if (item.p === '<all_urls>') continue;
      if (seen[item.p]) continue;
      seen[item.p] = true;
      if (!patternToRegExp(item.p)) errors.push(item.p);
    }
    return errors;
  }

  function isValidRunAt(v) {
    return RUN_AT_VALUES.indexOf(String(v == null ? '' : v).replace(/-/g, '_')) !== -1;
  }

  // Rebuild a ==UserScript== header from a normalised record. Every multi-value
  // tag gets its own line, so parse(build(x)) === x for these fields.
  // `fields` uses the plural keys produced by fieldsOf(); they are mapped back
  // to their header tags through MULTI_TAGS.
  function buildHeader(f) {
    var lines = ['// ==UserScript=='];
    for (var i = 0; i < HEADER_ORDER.length; i++) {
      var tag = HEADER_ORDER[i];
      if (tag === 'noframes') continue; // boolean flag, emitted once below
      var key = MULTI_TAGS[tag] || tag;
      var val = f[key];
      if (Array.isArray(val)) {
        for (var j = 0; j < val.length; j++) {
          if (val[j] === '' || val[j] == null) continue;
          lines.push('// @' + tag + ' '.repeat(Math.max(1, 12 - tag.length)) + val[j]);
        }
      } else if (val !== undefined && val !== null && val !== '' && val !== false) {
        lines.push('// @' + tag + ' '.repeat(Math.max(1, 12 - tag.length)) + val);
      }
    }
    if (f.noframes) lines.push('// @noframes');
    lines.push('// ==/UserScript==');
    return lines.join('\n');
  }

  // Swap (or insert) the header of a script body, leaving the code untouched.
  // The replacement must be a function: a string replacement would interpret
  // `$&`/`$1` in script names and corrupt the generated header.
  function applyHeader(code, fields) {
    var header = buildHeader(fields);
    var body = String(code == null ? '' : code);
    var block = /==UserScript==[\s\S]*?==\/UserScript==/;
    if (block.test(body)) {
      return body.replace(block, function() { return header; });
    }
    return header + '\n\n' + body.replace(/^\s+/, '');
  }

  // Extract every occurrence of a metadata tag (used by the background worker,
  // which has no access to this file because it runs as a module).
  function extractTag(code, tag) {
    var re = new RegExp('^\\s*(?:\\/\\/\\s*)?@' + tag + '\\s+(.+)$', 'gm');
    var out = [];
    var m;
    while ((m = re.exec(String(code == null ? '' : code))) !== null) {
      var v = m[1].trim();
      if (v && out.indexOf(v) === -1) out.push(v);
    }
    return out;
  }

  function sanitizeUserscriptCode(code) {
    var src = String(code == null ? '' : code);
    var gmApiNames = [
      'GM_getValue', 'GM_setValue', 'GM_deleteValue', 'GM_listValues',
      'GM_addStyle', 'GM_addElement', 'GM_getResourceText', 'GM_getResourceURL',
      'GM_waitForElement', 'GM_xmlhttpRequest', 'GM_addValueChangeListener',
      'GM_removeValueChangeListener', 'GM_setClipboard', 'GM_notification',
      'GM_openInTab', 'GM_registerMenuCommand', 'GM_unregisterMenuCommand',
      'GM_info', 'GM_cookie', 'GM_download', 'GM_log'
    ];

    var gmPattern = gmApiNames.map(escapeRegExp).join('|');

    // 1. Remove top-level const/let/var GM_* = ... declarations (handles multi-line)
    function removeVarDeclarations(s, pattern) {
      var lines = s.split('\n');
      var out = [];
      var i = 0;
      while (i < lines.length) {
        var line = lines[i];
        var m = line.match(new RegExp('^\\s*(?:const|let|var)\\s+(' + pattern + ')\\s*='));
        if (!m) {
          out.push(line);
          i++;
          continue;
        }
        var brace = 0, bracket = 0, paren = 0, inString = false, stringChar = '';
        var found = false;
        for (var j = i; j < lines.length; j++) {
          var l = lines[j];
          for (var k = 0; k < l.length; k++) {
            var ch = l[k];
            var prev = k > 0 ? l[k - 1] : '';
            if (inString) {
              if (ch === stringChar && prev !== '\\') inString = false;
            } else if (ch === '"' || ch === "'" || ch === '`') {
              inString = true; stringChar = ch;
            } else if (ch === '{') brace++;
            else if (ch === '}') brace--;
            else if (ch === '[') bracket++;
            else if (ch === ']') bracket--;
            else if (ch === '(') paren++;
            else if (ch === ')') paren--;
            else if (ch === ';' && brace === 0 && bracket === 0 && paren === 0) {
              found = true; break;
            }
          }
          if (found) { i = j + 1; break; }
        }
        if (!found) { i = lines.length; break; }
      }
      return out.join('\n');
    }

    src = removeVarDeclarations(src, gmPattern);

    // 2. Remove standalone GM_* function declarations: function GM_addStyle() { ... }
    function removeFuncDeclarations(s, pattern) {
      var lines = s.split('\n');
      var out = [];
      var i = 0;
      while (i < lines.length) {
        var line = lines[i];
        var m = line.match(new RegExp('^\\s*function\\s+(' + pattern + ')\\s*\\('));
        if (!m) {
          out.push(line);
          i++;
          continue;
        }
        var brace = 0, found = false;
        for (var j = i; j < lines.length; j++) {
          var l = lines[j];
          for (var k = 0; k < l.length; k++) {
            var ch = l[k];
            if (ch === '{') brace++;
            else if (ch === '}') { brace--; if (brace === 0) { found = true; break; } }
          }
          if (found) { i = j + 1; break; }
        }
        if (!found) { i = lines.length; break; }
      }
      return out.join('\n');
    }

    src = removeFuncDeclarations(src, gmPattern);

    // 3. Replace ALL GM_* references (both bare and function calls) with _sfGM_*
    gmApiNames.forEach(function(name) {
      var safeName = '_sf' + name;
      // Match GM_name as a whole word, including when followed by ( for function calls
      var re = new RegExp('\\b' + escapeRegExp(name) + '\\b', 'g');
      src = src.replace(re, safeName);
    });

    // 4. Handle GM. notation for any remaining GM.* property access
    src = src.replace(/\bGM\.(getValue|setValue|deleteValue|listValues|addStyle|addElement|getResourceText|getResourceURL|waitForElement|xmlhttpRequest|addValueChangeListener|removeValueChangeListener|setClipboard|notification|openInTab|registerMenuCommand|unregisterMenuCommand|info|cookie|download|log)\b/g, function(m, method) {
      return '_sfGM_' + method;
    });

    return src;
  }

  globalThis.SF_US_META = {
    parse: parse,
    fieldsOf: fieldsOf,
    extractMatchPatterns: extractMatchPatterns,
    matchesUrl: matchesUrl,
    patternToRegExp: patternToRegExp,
    globToRegExp: globToRegExp,
    isMatchPattern: isMatchPattern,
    validate: validate,
    isValidRunAt: isValidRunAt,
    normalizeRunAt: normalizeRunAt,
    buildHeader: buildHeader,
    applyHeader: applyHeader,
    extractTag: extractTag,
    matchPatternList: matchPatternList,
    RUN_AT_VALUES: RUN_AT_VALUES,
    escapeRegExp: escapeRegExp,
    sanitizeUserscriptCode: sanitizeUserscriptCode
  };
})();
