const fs = require('fs');
const path = require('path');

const viRegex = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđĐ]/i;

function checkHtmlFile(filepath) {
  const content = fs.readFileSync(filepath, 'utf8');
  // Simple tag parser
  const tagRegex = /<(\/)?([a-zA-Z0-9\-]+)([^>]*)>|([^<]+)/g;
  let match;
  let stack = [];
  const unhandled = [];

  while ((match = tagRegex.exec(content)) !== null) {
    const isClosing = match[1];
    const tagName = match[2];
    const attrs = match[3];
    const text = match[4];

    if (tagName) {
      if (isClosing) {
        while (stack.length > 0) {
          const popped = stack.pop();
          if (popped.tag === tagName.toLowerCase()) break;
        }
      } else {
        const isSelfClosing = attrs && (attrs.endsWith('/') || ['img','input','br','hr','meta','link'].includes(tagName.toLowerCase()));
        const hasI18n = attrs && /data-i18n/i.test(attrs);
        const hasPlaceholder = attrs && /placeholder\s*=/i.test(attrs) && !/data-i18n-placeholder/i.test(attrs);
        const hasTitle = attrs && /title\s*=/i.test(attrs) && !/data-i18n-title/i.test(attrs);

        if (hasPlaceholder) {
          const pMatch = /placeholder=["']([^"']+)["']/i.exec(attrs);
          if (pMatch && viRegex.test(pMatch[1])) {
            unhandled.push({ type: 'placeholder', tag: tagName, val: pMatch[1] });
          }
        }
        if (hasTitle) {
          const tMatch = /title=["']([^"']+)["']/i.exec(attrs);
          if (tMatch && viRegex.test(tMatch[1])) {
            unhandled.push({ type: 'title', tag: tagName, val: tMatch[1] });
          }
        }

        if (!isSelfClosing) {
          stack.push({
            tag: tagName.toLowerCase(),
            hasI18n: Boolean(hasI18n || (stack.length > 0 && stack[stack.length - 1].hasI18n))
          });
        }
      }
    } else if (text) {
      const trimmed = text.trim();
      if (trimmed && viRegex.test(trimmed)) {
        const inI18n = stack.some(s => s.hasI18n);
        if (!inI18n) {
          unhandled.push({ type: 'text', val: trimmed, stack: stack.map(s => s.tag).join(' > ') });
        }
      }
    }
  }
  return unhandled;
}

const htmlFiles = [
  'OS/html/sidebar.html',
  'OS/html/popup.html',
  'OS/html/privacy.html',
  'OS/html/prompter.html',
  'OS/html/qr.html',
  'OS/html/permission.html',
  'OS/html/pomo-window.html',
  'OS/html/gamble-block.html',
  'OS/html/userscripts.html'
];

for (const f of htmlFiles) {
  if (fs.existsSync(f)) {
    const res = checkHtmlFile(f);
    if (res.length > 0) {
      console.log('=== FILE:', f, 'has', res.length, 'untranslated elements ===');
      res.forEach(r => console.log('  ', r.type, ':', r.val, r.stack ? '(' + r.stack + ')' : ''));
    } else {
      console.log('FILE:', f, 'is 100% covered by data-i18n');
    }
  }
}

