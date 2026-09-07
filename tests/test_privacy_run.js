const fs = require('fs');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

const html = fs.readFileSync('OS/html/privacy.html', 'utf8');

const dom = new JSDOM(html, { runScripts: "dangerously" });

setTimeout(() => {
    try {
        const doc = dom.window.document;
        console.log("Current title:", doc.getElementById("doc-title").textContent);
        
        // Simulate changing language to EN
        const sel = doc.getElementById("select-privacy-lang");
        sel.value = "en";
        sel.dispatchEvent(new dom.window.Event("change"));
        
        console.log("Title after EN change:", doc.getElementById("doc-title").textContent);
    } catch (e) {
        console.error(e);
    }
}, 500);
