const fs = require('fs');
const html = fs.readFileSync('OS/html/privacy.html', 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
if (scriptMatch) {
    try {
        new Function(scriptMatch[1]);
        console.log("Syntax OK");
    } catch (e) {
        console.error("Syntax Error: ", e);
    }
}
