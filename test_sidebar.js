const fs = require('fs');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const html = fs.readFileSync('OS/html/sidebar.html', 'utf8');
const dom = new JSDOM(html, { runScripts: "dangerously", resources: "usable" });
dom.window.document.addEventListener('DOMContentLoaded', () => {
    try {
        const js = fs.readFileSync('OS/js/sidebar.js', 'utf8');
        const script = dom.window.document.createElement('script');
        script.textContent = "var chrome = {tabs: {}, runtime: {}, storage: {local: {}}}; " + js;
        dom.window.document.body.appendChild(script);
        console.log("Script executed without throwing.");
    } catch (e) {
        console.error("ERROR CAUGHT:", e);
    }
});
