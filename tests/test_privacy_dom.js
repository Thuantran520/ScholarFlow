const fs = require('fs');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const html = fs.readFileSync('OS/html/privacy.html', 'utf8');
const dom = new JSDOM(html, { runScripts: "dangerously" });
setTimeout(() => {
    const sel = dom.window.document.getElementById("select-privacy-lang");
    sel.value = "en";
    try {
        sel.dispatchEvent(new dom.window.Event("change"));
        console.log("Success! document.title=", dom.window.document.title);
        // Check if ANY element failed to update or threw an error
    } catch(e) {
        console.error("Caught error:", e);
    }
}, 500);
// To catch unhandled errors from the page script
dom.window.addEventListener("error", (event) => {
    console.error("Page Error:", event.error);
});
