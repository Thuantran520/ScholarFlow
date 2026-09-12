const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const OPEN = '<!-- @@NAV@@ -->';
const CLOSE = '<!-- @@NAV-END@@ -->';
const partialPath = path.join(root, 'OS', 'html', 'partials', 'main-nav.html');
const pages = ['sidebar.html', 'popup.html'];

const partialRaw = fs
  .readFileSync(partialPath, 'utf8')
  .replace(/\r\n/g, '\n')
  .replace(/^\n+/, '')
  .replace(/\n+$/, '');
if (partialRaw.includes(OPEN) || partialRaw.includes(CLOSE)) {
  throw new Error('partial must not contain nav markers itself');
}
const partialLines = partialRaw.split('\n');

for (const page of pages) {
  const filePath = path.join(root, 'OS', 'html', page);
  const html = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');
  const lines = html.split('\n');
  const openIdx = lines.findIndex((l) => l.trim() === OPEN);
  const closeIdx = lines.findIndex((l) => l.trim() === CLOSE);
  if (openIdx < 0 || closeIdx < 0 || closeIdx <= openIdx) {
    throw new Error(`${page}: nav markers not found or out of order (expected ${OPEN} and ${CLOSE})`);
  }
  const around = lines.join('\n').split(OPEN).length - 1;
  if (around !== 1) {
    throw new Error(`${page}: expected exactly one ${OPEN}, found ${around}`);
  }
  const updated = [
    ...lines.slice(0, openIdx),
    `  ${OPEN}`,
    ...partialLines,
    `  ${CLOSE}`,
    ...lines.slice(closeIdx + 1),
  ].join('\n');
  if (updated !== html) {
    fs.writeFileSync(filePath, updated, 'utf8');
    console.log(`${page}: nav synced from partial (lines ${openIdx + 1}..${closeIdx + 1})`);
  } else {
    console.log(`${page}: already in sync`);
  }
}

console.log('OK');