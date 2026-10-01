const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'OS', 'html', 'qr.html');
let content = fs.readFileSync(filePath, 'utf8');

// Title
content = content.replace(
  /<title>ScholarFlow - Apple Clip & QR Generator<\/title>/,
  '<title data-i18n="qr_page_title">ScholarFlow - Apple Clip & QR Generator</title>'
);

// Subtitle
content = content.replace(
  /<div class="qr-subtitle">Tạo mã Vòng cây \(Apple Clip\) &amp; QR Code tức thì \(100% Offline\)<\/div>/,
  '<div class="qr-subtitle" data-i18n="qr_header_title">Tạo mã Vòng cây (Apple Clip) &amp; QR Code tức thì (100% Offline)</div>'
);

// Clear button
content = content.replace(
  /<button id="btn-qr-clear" class="flow-action-btn danger-hover" title="Xóa nội dung">/,
  '<button id="btn-qr-clear" class="flow-action-btn danger-hover" title="Xóa nội dung" data-i18n-title="tip_qr_clear">'
);

// Label & char count
content = content.replace(
  /<span>Đường link \(URL\) hoặc nội dung:<\/span>/,
  '<span data-i18n="qr_content_label">Đường link (URL) hoặc nội dung:</span>'
);
content = content.replace(
  /<span id="qr-char-count" style="font-size: 11px; color: #94a3b8;">0 ký tự<\/span>/,
  '<span id="qr-char-count" style="font-size: 11px; color: #94a3b8;" data-i18n="qr_char_count_initial">0 ký tự</span>'
);

// Textarea placeholder
content = content.replace(
  /<textarea id="qr-input" class="qr-input-field" rows="2" placeholder="Dán liên kết \(https:\/\/\.\.\.\) hoặc nhập văn bản\.\.\."><\/textarea>/,
  '<textarea id="qr-input" class="qr-input-field" rows="2" placeholder="Dán liên kết (https://...) hoặc nhập văn bản..." data-i18n-placeholder="qr_content_placeholder"></textarea>'
);

// Segmented picker
content = content.replace(
  /<button type="button" class="qr-seg-btn active" data-mode="artistic">QR Nghệ Thuật ✨<\/button>/,
  '<button type="button" class="qr-seg-btn active" data-mode="artistic" data-i18n="qr_btn_style_art">QR Nghệ Thuật ✨</button>'
);
content = content.replace(
  /<button type="button" class="qr-seg-btn" data-mode="tree">Vòng Cây 🌿<\/button>/,
  '<button type="button" class="qr-seg-btn" data-mode="tree" data-i18n="qr_btn_style_ring">Vòng Cây 🌿</button>'
);
content = content.replace(
  /<button type="button" class="qr-seg-btn" data-mode="standard">QR Chuẩn<\/button>/,
  '<button type="button" class="qr-seg-btn" data-mode="standard" data-i18n="qr_btn_style_std">QR Chuẩn</button>'
);
content = content.replace(
  /<button type="button" class="qr-seg-btn" data-mode="dot">Điểm Nguyên Trái<\/button>/,
  '<button type="button" class="qr-seg-btn" data-mode="dot" data-i18n="qr_btn_dot_circle">Điểm Nguyên Trái</button>'
);
content = content.replace(
  /<button type="button" class="qr-seg-btn" data-mode="rounded">Vuông Bo<\/button>/,
  '<button type="button" class="qr-seg-btn" data-mode="rounded" data-i18n="qr_btn_dot_rounded">Vuông Bo</button>'
);
content = content.replace(
  /<button type="button" class="qr-seg-btn" data-mode="color">Màu Sắc<\/button>/,
  '<button type="button" class="qr-seg-btn" data-mode="color" data-i18n="qr_btn_tab_color">Màu Sắc</button>'
);
content = content.replace(
  /<button type="button" class="qr-seg-btn" data-mode="geometric">Hình Học<\/button>/,
  '<button type="button" class="qr-seg-btn" data-mode="geometric" data-i18n="qr_btn_tab_geom">Hình Học</button>'
);

// Color select
content = content.replace(
  /<option value="apple">Đen Trắng<\/option>/,
  '<option value="apple" data-i18n="qr_color_bw">Đen Trắng</option>'
);
content = content.replace(
  /<option value="nature">Gỗ Xanh 🍃<\/option>/,
  '<option value="nature" data-i18n="qr_color_green">Gỗ Xanh 🍃</option>'
);
content = content.replace(
  /<option value="gold">Hoàng Kim ✨<\/option>/,
  '<option value="gold" data-i18n="qr_color_gold">Hoàng Kim ✨</option>'
);

// Logo & bg labels
content = content.replace(
  /<label class="qr-upload-btn" for="qr-logo-input">([\s\S]*?)Tải ảnh làm logo\s*<\/label>/,
  '<label class="qr-upload-btn" for="qr-logo-input">$1<span data-i18n="qr_label_logo">Tải ảnh làm logo</span></label>'
);
content = content.replace(
  /<button type="button" id="qr-logo-remove" class="qr-thumb-remove-btn" title="Xóa logo">✕<\/button>/,
  '<button type="button" id="qr-logo-remove" class="qr-thumb-remove-btn" title="Xóa logo" data-i18n-title="tip_qr_remove_logo">✕</button>'
);
content = content.replace(
  /<label class="qr-upload-btn" for="qr-bg-input">([\s\S]*?)Ảnh nền mã QR 🖼️\s*<\/label>/,
  '<label class="qr-upload-btn" for="qr-bg-input">$1<span data-i18n="qr_label_bg">Ảnh nền mã QR 🖼️</span></label>'
);
content = content.replace(
  /<button type="button" id="qr-bg-remove" class="qr-thumb-remove-btn" title="Xóa nền">✕<\/button>/,
  '<button type="button" id="qr-bg-remove" class="qr-thumb-remove-btn" title="Xóa nền" data-i18n-title="tip_qr_remove_bg">✕</button>'
);

// Tilt hint
content = content.replace(
  /<span style="font-size:11px; color:#64748b;">Rê chuột để nghiêng 3D<\/span>/,
  '<span style="font-size:11px; color:#64748b;" data-i18n="qr_tilt_hint">Rê chuột để nghiêng 3D</span>'
);

// Badge
content = content.replace(
  /<div class="qr-scan-badge" id="qr-scan-badge">✅ 100% Quét được bằng Camera, Zalo, Google Lens<\/div>/,
  '<div class="qr-scan-badge" id="qr-scan-badge" data-i18n="qr_scan_verified">✅ 100% Quét được bằng Camera, Zalo, Google Lens</div>'
);

// Buttons
content = content.replace(
  /<span>Tải ảnh PNG<\/span>/,
  '<span data-i18n="qr_btn_dl_png">Tải ảnh PNG</span>'
);
content = content.replace(
  /<span>Chép ảnh<\/span>/,
  '<span data-i18n="qr_btn_copy_img">Chép ảnh</span>'
);
content = content.replace(
  /<span>Chép link<\/span>/,
  '<span data-i18n="qr_btn_copy_link">Chép link</span>'
);

// Scripts: Add locales and i18n.js
content = content.replace(
  /<script src="\.\.\/js\/libs\/qrious\.min\.js"><\/script>/,
  '<script src="../locales/vi.js"></script>\n  <script src="../locales/en.js"></script>\n  <script src="../locales/zh.js"></script>\n  <script src="../locales/ru.js"></script>\n  <script src="../locales/ja.js"></script>\n  <script src="../js/i18n.js"></script>\n  <script src="../js/libs/qrious.min.js"></script>'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Updated qr.html');

