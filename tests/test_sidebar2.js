const fs = require('fs');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const html = fs.readFileSync('OS/html/sidebar.html', 'utf8');
const dom = new JSDOM(html, { runScripts: "dangerously", resources: "usable" });
try {
    const js = fs.readFileSync('OS/js/sidebar.js', 'utf8');
    dom.window.eval("var chrome = {tabs: {}, runtime: {}, storage: {local: {}}}; " + js);
    console.log("Script executed without throwing.");
} catch (e) {
    console.error("ERROR CAUGHT:", e);
}
