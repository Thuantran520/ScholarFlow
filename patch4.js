const fs = require('fs');
let content = fs.readFileSync('OS/js/init.js', 'utf8');

// Remove the incorrect injection
content = content.replace(`
  // Auto-switch tab based on URL param
  const urlParams = new URLSearchParams(window.location.search);
  const targetTab = urlParams.get('tab');
  if (targetTab) {
    const btn = document.querySelector('.main-nav-btn[data-target="tab-' + targetTab + '"]');
    if (btn) setTimeout(() => btn.click(), 50); // slight delay to let other init run
  }
`, '');

// Add it to the end of the file, outside of the click handler but inside onReady if possible.
// Actually, I can just append it to the end of init.js since it's deferred anyway.
content += `\n
window.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const targetTab = urlParams.get('tab');
  if (targetTab) {
    const btn = document.querySelector('.main-nav-btn[data-target="tab-' + targetTab + '"]');
    if (btn) setTimeout(() => btn.click(), 100);
  }
});
`;

fs.writeFileSync('OS/js/init.js', content);
console.log("Fixed URL param tab switcher in init.js");
