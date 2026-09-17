const fs = require('fs');
const filesToReplace = [
  { path: 'package.json', search: '\"version\": \"2.4.5\"', replace: '\"version\": \"2.5.0\"' },
  { path: 'manifest.json', search: '\"version\": \"2.4.5\"', replace: '\"version\": \"2.5.0\"' },
  { path: 'manifest_firefox.json', search: '\"version\": \"2.4.5\"', replace: '\"version\": \"2.5.0\"' },
  { path: 'manifest_chrome.json', search: '\"version\": \"2.4.5\"', replace: '\"version\": \"2.5.0\"' },
  { path: 'OS/html/sidebar.html', search: 'v2.4.5', replace: 'v2.5.0' },
  { path: 'OS/html/popup.html', search: 'v2.4.5', replace: 'v2.5.0' },
  { path: 'OS/html/privacy.html', search: 'v2.4.5', replace: 'v2.5.0' }
];

filesToReplace.forEach(f => {
  let content = fs.readFileSync(f.path, 'utf8');
  content = content.replace(f.search, f.replace);
  fs.writeFileSync(f.path, content, 'utf8');
  console.log('Updated ' + f.path);
});

const locales = ['vi', 'en', 'zh', 'ru', 'ja'];
locales.forEach(l => {
  const p = 'OS/locales/' + l + '.js';
  let content = fs.readFileSync(p, 'utf8');
  content = content.replace(/2\.4\.5/g, '2.5.0');
  fs.writeFileSync(p, content, 'utf8');
  console.log('Updated ' + p);
});

const clPath = 'CHANGELOG.md';
let clContent = fs.readFileSync(clPath, 'utf8');
if (!clContent.includes('## [2.5.0]')) {
  clContent = clContent.replace('# Changelog\n', '# Changelog\n\n## [2.5.0]\n- Version bump 2.5.0: Sync #biblio-modal to monochrome UI, swap emojis for SVG stroke icons.\n');
  fs.writeFileSync(clPath, clContent, 'utf8');
  console.log('Updated CHANGELOG.md');
}
