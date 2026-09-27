// OS/js/content/userscripts_runner.js
(function() {
  const browserApi = (typeof browser !== 'undefined' && browser) ? browser : chrome;
  
  if (!browserApi || !browserApi.storage) return;

  const GM_SHIM = `
const GM_getValue = function(key, def) { try { return JSON.parse(localStorage.getItem('GM_' + key)) ?? def; } catch(e) { return localStorage.getItem('GM_' + key) || def; } };
const GM_setValue = function(key, val) { localStorage.setItem('GM_' + key, JSON.stringify(val)); };
const GM_deleteValue = function(key) { localStorage.removeItem('GM_' + key); };
const GM_listValues = function() { const r=[]; for(let i=0;i<localStorage.length;i++){ const k=localStorage.key(i); if(k && k.startsWith('GM_')) r.push(k.slice(3)); } return r; };
const GM_addStyle = function(css) { const style = document.createElement('style'); style.textContent = css; (document.head || document.documentElement).appendChild(style); return style; };
const GM = {
  getValue: async function(key, def) { return GM_getValue(key, def); },
  setValue: async function(key, val) { return GM_setValue(key, val); },
  deleteValue: async function(key) { return GM_deleteValue(key); },
  listValues: async function() { return GM_listValues(); },
  addStyle: function(css) { return GM_addStyle(css); }
};
`;

  // Relay live Userscript console logs to extension popup/sidebar/studio
  document.addEventListener('__SF_US_LOG__', (e) => {
    if (!e || !e.detail) return;
    try {
      if (browserApi.runtime && browserApi.runtime.sendMessage) {
        browserApi.runtime.sendMessage({
          action: 'SF_US_LIVE_LOG',
          log: e.detail
        }).catch(() => {});
      }
    } catch (_err) {}
  });

  function runScripts() {
    browserApi.storage.local.get("sf_custom_scripts", (res) => {
      const scripts = res.sf_custom_scripts || [];
      const currentUrl = window.location.href;
      
      scripts.forEach(s => {
        if (!s.active || !s.code) return;
        
        let matched = false;
        for (const m of (s.matches || [])) {
          if (m === "<all_urls>") { 
            matched = true; 
            break; 
          }
          // Convert match pattern to regex
          // e.g. *://*.youtube.com/* -> ^.*:\/\/.*\.youtube\.com\/.*$
          let regexStr = '^' + m.replace(/\./g, '\\.')
                                .replace(/\*/g, '.*')
                                .replace(/\//g, '\\/') + '$';
          if (new RegExp(regexStr).test(currentUrl)) { 
            matched = true; 
            break; 
          }
        }
        
        if (!matched) return;
        
        // Inject script tag with GM shim and console interceptor
        try {
          const scriptEl = document.createElement('script');
          const scriptName = s.name || s.id;
          scriptEl.textContent = `(function() {
  function _relay(level, args) {
    try {
      const text = args.map(a => {
        try { return (typeof a === 'object' && a !== null) ? JSON.stringify(a) : String(a); }
        catch(e) { return String(a); }
      }).join(' ');
      document.dispatchEvent(new CustomEvent('__SF_US_LOG__', {
        detail: { level: level, text: text, scriptId: ${JSON.stringify(s.id)}, name: ${JSON.stringify(scriptName)}, time: Date.now() }
      }));
    } catch(e) {}
  }
  const _origLog = console.log, _origWarn = console.warn, _origError = console.error, _origInfo = console.info;
  console.log = function(...a) { _relay('log', a); _origLog.apply(console, a); };
  console.warn = function(...a) { _relay('warn', a); _origWarn.apply(console, a); };
  console.error = function(...a) { _relay('error', a); _origError.apply(console, a); };
  console.info = function(...a) { _relay('info', a); _origInfo.apply(console, a); };

  try {
    ${GM_SHIM}
    ${s.code}
  } catch(err) {
    _relay('error', ['[Lỗi Userscript]', err.stack || err.message || String(err)]);
  }
})();`;
          scriptEl.dataset.sfScriptId = s.id;
          
          // Steal nonce to bypass strict CSP (e.g., YouTube)
          const nonceTag = document.querySelector('script[nonce]');
          if (nonceTag) {
            scriptEl.setAttribute('nonce', nonceTag.getAttribute('nonce'));
          }

          (document.documentElement).appendChild(scriptEl);
          console.log("[ScholarFlow] Injected userscript: " + scriptName);
        } catch (e) {
          console.error("[ScholarFlow] Failed to inject userscript: " + s.name, e);
        }
      });
    });
  }

  // Run immediately for document_idle/start
  runScripts();

})();
