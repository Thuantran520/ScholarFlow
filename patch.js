const fs = require('fs');
const files = ['OS/html/sidebar.html', 'OS/html/popup.html'];

for (let file of files) {
  let content = fs.readFileSync(file, 'utf8');

  // Replace copy button and add refresh button
  content = content.replace(
    /<button id="btn-flow-copy" title="Copy ID" data-i18n-title="tip_copy">.*?<\/button>/,
    `<button id="btn-flow-copy" class="icon-btn" title="Copy ID" data-i18n-title="tip_copy">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            </button>
            <button id="btn-flow-refresh" class="icon-btn" title="New ID" data-i18n-title="flow_refresh_id">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
            </button>`
  );

  // Replace flow-chat-header
  const headerReplacement = `<div class="flow-chat-header">
            <div><span data-i18n="flow_connected_to">Dang ket noi voi:</span> <strong id="flow-remote-id">...</strong></div>
            <div style="display:flex; gap:6px;">
              <button id="btn-flow-call-audio" class="icon-btn" title="Audio Call" data-i18n-title="flow_call_audio">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
              </button>
              <button id="btn-flow-call-video" class="icon-btn" title="Video Call" data-i18n-title="flow_call_video">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
              </button>
              <button id="btn-flow-disconnect" class="modern-btn small danger" data-i18n="flow_disconnect">Ngat</button>
            </div>
          </div>`;
          
  content = content.replace(/<div class="flow-chat-header">[\s\S]*?<\/button>\s*<\/div>/, headerReplacement);

  // Inject active call container right before flow-messages
  const callContainer = `
          <!-- Call UI (Audio/Video) -->
          <div id="flow-call-ui" class="flow-call-ui" style="display:none;">
            <video id="flow-remote-video" autoplay playsinline style="width:100%; max-height:200px; background:#000; border-radius:6px; margin-bottom:8px;"></video>
            <div style="display:flex; justify-content:center; gap:12px; margin-bottom:12px;">
              <button id="btn-flow-mute" class="icon-btn call-action" data-i18n-title="flow_mute">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
              </button>
              <button id="btn-flow-video-toggle" class="icon-btn call-action" data-i18n-title="flow_video_off">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
              </button>
              <button id="btn-flow-end-call" class="icon-btn call-action danger-call" data-i18n-title="flow_end_call" style="background:#ef4444; color:white; border-radius:50%; width:40px; height:40px; display:flex; align-items:center; justify-content:center; border:none; cursor:pointer;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"></path><line x1="23" y1="1" x2="1" y2="23"></line></svg>
              </button>
            </div>
          </div>
          
          <div id="flow-messages" class="flow-messages">`;
  content = content.replace(/<div id="flow-messages" class="flow-messages">/, callContainer);

  fs.writeFileSync(file, content);
}
console.log("HTML Patched!");
