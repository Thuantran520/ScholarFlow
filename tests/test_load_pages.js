const fs = require('fs');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

const chromeStub = "var chrome = { runtime: { onMessage: { addListener: function(){} }, getManifest: function(){ return { version: '9.9.9' }; }, getURL: function(p){ return p; }, sendMessage: function(){ return Promise.resolve(); }, lastError: null }, tabs: {}, windows: {}, scripting: { executeScript: function(){ return Promise.resolve([]); } }, storage: { local: { get: function(keys, cb){ cb({}); }, set: function(obj, cb){ cb && cb(); } } }, cookies: {}, contextMenus: {} };";

for (const htmlFile of ["OS/html/popup.html", "OS/html/sidebar.html"]) {
  const html = fs.readFileSync(htmlFile, 'utf8');
  const dom = new JSDOM(html, { runScripts: "dangerously", url: "https://example.com/" });
  const w = dom.window;
  const stub = w.document.createElement('script');
  stub.textContent = chromeStub;
  w.document.body.appendChild(stub);
  for (const f of ['vi.js','en.js','zh.js','ru.js','ja.js']) {
    const s = w.document.createElement('script');
    s.textContent = fs.readFileSync('OS/locales/' + f, 'utf8');
    w.document.body.appendChild(s);
  }
  const i18n = w.document.createElement('script');
  i18n.textContent = fs.readFileSync('OS/js/i18n.js', 'utf8');
  w.document.body.appendChild(i18n);
  const side = w.document.createElement('script');
  side.textContent = fs.readFileSync('OS/js/sidebar.js', 'utf8');
  w.document.body.appendChild(side);
  // sync: no error thrown means load ok
  console.log("LOAD OK: " + htmlFile);

  // popup/sidebar notes toolbar handling should not error
  const fNotes = w.document.getElementById("f-notes");
  if (fNotes) {
    fNotes.value = "**chào** *bạn*";
    const ev = new w.Event("input", { bubbles: true });
    fNotes.dispatchEvent(ev);
    console.log("  notes input event OK (value=" + fNotes.value + ")");
  }
  const calElems = ["cal-grid", "cal-list", "cal-month-label", "cal-view-switch", "cal-feed-list", "cal-day-events"];
  const found = calElems.filter(id => !!w.document.getElementById(id));
  console.log("  calendar elements present: " + found.length + "/" + calElems.length + " -> " + found.join(","));
}
console.log("DONE");