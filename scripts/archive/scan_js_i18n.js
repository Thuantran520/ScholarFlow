const fs = require('fs');
const path = require('path');

const viRegex = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđĐ]/i;

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat && stat.isDirectory()) results = results.concat(walk(full));
    else results.push(full);
  });
  return results;
}

const jsFiles = walk('OS/js');
const findings = [];

for (const f of jsFiles) {
  if (!f.endsWith('.js') || f.includes('content\\i18n.js') || f.includes('content/i18n.js')) continue;
  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (viRegex.test(line)) {
      // Ignore comment-only lines
      const trimmed = line.trim();
      if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) return;
      // Check if it's an alert, confirm, toast, innerHTML, textContent, or string literal
      findings.push({ file: f, line: idx + 1, code: trimmed });
    }
  });
}

console.log('Total JS lines with Vietnamese text outside comments:', findings.length);
findings.slice(0, 40).forEach(x => console.log(x.file + ':' + x.line, x.code));

