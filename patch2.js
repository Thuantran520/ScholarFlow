const fs = require('fs');
const files = ['OS/html/sidebar.html', 'OS/html/popup.html'];

for (let file of files) {
  let content = fs.readFileSync(file, 'utf8');

  // Replace flow-header
  const headerReplacement = `<div class="flow-header" style="display:flex; justify-content:space-between; align-items:center; width:100%;">
            <div style="display:flex; align-items:center; gap:8px;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
              <div class="flow-title" data-i18n="flow_title">WebRTC Flow P2P</div>
            </div>
            <button id="btn-flow-popout" class="icon-btn" title="Mở rộng ra tab mới" data-i18n-title="flow_popout">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
            </button>
          </div>`;
          
  content = content.replace(/<div class="flow-header">[\s\S]*?<\/div>/, headerReplacement);
  fs.writeFileSync(file, content);
}
console.log("HTML Patched for Pop-out!");
