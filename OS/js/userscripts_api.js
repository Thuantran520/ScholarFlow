// OS/js/userscripts_api.js
// Firefox requires an API script to run userScripts.
if (typeof browser !== 'undefined' && browser.userScripts && browser.userScripts.onBeforeScript) {
  browser.userScripts.onBeforeScript.addListener(function(script) {
    // Provide a basic userscript global environment if needed
    script.defineGlobals({
      window: window,
      document: window.document,
      console: console,
      fetch: window.fetch,
      setTimeout: window.setTimeout,
      setInterval: window.setInterval,
      clearTimeout: window.clearTimeout,
      clearInterval: window.clearInterval,
      URL: window.URL
    });
  });
}
