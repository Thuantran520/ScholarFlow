const fs = require('fs');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const html = fs.readFileSync('OS/html/sidebar.html', 'utf8');
const dom = new JSDOM(html, { runScripts: "dangerously", resources: "usable" });
try {
    const js_i18n = fs.readFileSync('OS/js/i18n.js', 'utf8');
    dom.window.eval(js_i18n);
    
    const js = fs.readFileSync('OS/js/sidebar.js', 'utf8');
    dom.window.eval("var chrome = {tabs: {}, runtime: {}, storage: {local: {}}}; " + js);
    
    const btnSave = dom.window.document.getElementById("btn-save-biblio");
    if (btnSave) {
        console.log("Clicking save...");
        btnSave.click();
        console.log("Save clicked successfully.");
    } else {
        console.log("btn-save-biblio not found");
    }
} catch (e) {
    console.error("ERROR CAUGHT:", e);
}
