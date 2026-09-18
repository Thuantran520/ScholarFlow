const fs = require('fs');
let content = fs.readFileSync('OS/js/init.js', 'utf8');

const injection = `
  // Auto-switch tab based on URL param
  const urlParams = new URLSearchParams(window.location.search);
  const targetTab = urlParams.get('tab');
  if (targetTab) {
    const btn = document.querySelector('.main-nav-btn[data-target="tab-' + targetTab + '"]');
    if (btn) setTimeout(() => btn.click(), 50); // slight delay to let other init run
  }
`;

// Find where to inject
const searchStr = `if (target === "tab-cookie") {`;
content = content.replace(searchStr, injection + '\n      ' + searchStr);

fs.writeFileSync('OS/js/init.js', content);
console.log("Injected URL param tab switcher into init.js");
