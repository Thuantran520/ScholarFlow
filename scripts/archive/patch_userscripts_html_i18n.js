const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'OS', 'html', 'userscripts.html');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  /<title>ScholarFlow - Userscript Studio<\/title>/,
  '<title data-i18n="us_studio_page_title">ScholarFlow - Userscript Studio</title>'
);

content = content.replace(
  /<span>ScholarFlow Userscript Studio<\/span>/,
  '<span data-i18n="us_studio_page_title">ScholarFlow Userscript Studio</span>'
);

content = content.replace(
  /<input type="text" id="st-edit-name" class="studio-title-input" placeholder="Tên kịch bản\.\.\.">/,
  '<input type="text" id="st-edit-name" class="studio-title-input" placeholder="Tên kịch bản..." data-i18n-placeholder="us_name_placeholder">'
);

content = content.replace(
  /<button id="btn-st-test" class="us-btn us-btn-secondary" title="Chạy thử kịch bản \(Ctrl\+Enter\)">([\s\S]*?)<span>Chạy thử<\/span>\s*<\/button>/,
  '<button id="btn-st-test" class="us-btn us-btn-secondary" title="Chạy thử kịch bản (Ctrl+Enter)" data-i18n-title="tip_us_test_run">$1<span data-i18n="us_btn_test_run">Chạy thử</span>\n        </button>'
);

content = content.replace(
  /<button id="btn-st-save" class="us-btn us-btn-primary" title="Lưu kịch bản \(Ctrl\+S\)">([\s\S]*?)<span>Lưu<\/span>\s*<\/button>/,
  '<button id="btn-st-save" class="us-btn us-btn-primary" title="Lưu kịch bản (Ctrl+S)" data-i18n-title="tip_us_save">$1<span data-i18n="us_btn_save">Lưu</span>\n        </button>'
);

content = content.replace(
  /<button id="btn-st-format" class="us-btn us-btn-secondary" title="Định dạng \/ làm đẹp mã nguồn">/,
  '<button id="btn-st-format" class="us-btn us-btn-secondary" title="Định dạng / làm đẹp mã nguồn" data-i18n-title="tip_us_format">'
);

content = content.replace(
  /<button id="btn-st-parse" class="us-btn us-btn-secondary" title="Phân tích header @userscript">/,
  '<button id="btn-st-parse" class="us-btn us-btn-secondary" title="Phân tích header @userscript" data-i18n-title="tip_us_parse_meta">'
);

content = content.replace(
  /<button id="btn-st-export" class="us-btn us-btn-secondary" title="Xuất file \.user\.js">/,
  '<button id="btn-st-export" class="us-btn us-btn-secondary" title="Xuất file .user.js" data-i18n-title="tip_us_export_single">'
);

content = content.replace(
  /<button id="btn-st-find" class="us-btn us-btn-secondary" title="Tìm kiếm và thay thế \(Ctrl\+H\)">([\s\S]*?)<span>Tìm<\/span>\s*<\/button>/,
  '<button id="btn-st-find" class="us-btn us-btn-secondary" title="Tìm kiếm và thay thế (Ctrl+H)" data-i18n-title="tip_us_find">$1<span data-i18n="us_btn_find_label">Tìm</span>\n        </button>'
);

content = content.replace(
  /<button id="btn-st-close" class="us-btn us-btn-secondary us-danger" title="Đóng cửa sổ">([\s\S]*?)<span>Đóng<\/span>\s*<\/button>/,
  '<button id="btn-st-close" class="us-btn us-btn-secondary us-danger" title="Đóng cửa sổ" data-i18n-title="tip_close">$1<span data-i18n="btn_close">Đóng</span>\n        </button>'
);

content = content.replace(
  /<label>URL Áp dụng:<\/label>/,
  '<label data-i18n="us_label_matches">URL Áp dụng:</label>'
);

content = content.replace(
  /<label>URL Loại trừ:<\/label>/,
  '<label data-i18n="us_label_excludes">URL Loại trừ:</label>'
);

content = content.replace(
  /<label>Thời điểm chạy:<\/label>/,
  '<label data-i18n="us_label_runat">Thời điểm chạy:</label>'
);

content = content.replace(
  /<option value="document_start">document_start \(Sớm nhất\)<\/option>/,
  '<option value="document_start" data-i18n="us_runat_start">document_start (Sớm nhất)</option>'
);

content = content.replace(
  /<option value="document_idle" selected>document_idle \(Mặc định\)<\/option>/,
  '<option value="document_idle" selected data-i18n="us_runat_idle">document_idle (Mặc định)</option>'
);

content = content.replace(
  /<option value="document_end">document_end \(Sau DOM\)<\/option>/,
  '<option value="document_end" data-i18n="us_runat_end">document_end (Sau DOM)</option>'
);

content = content.replace(
  /<option value="MAIN" selected>MAIN \(window\)<\/option>/,
  '<option value="MAIN" selected data-i18n="us_world_main">MAIN (window)</option>'
);

content = content.replace(
  /<option value="ISOLATED">ISOLATED \(an toàn\)<\/option>/,
  '<option value="ISOLATED" data-i18n="us_world_isolated">ISOLATED (an toàn)</option>'
);

content = content.replace(
  /<label>URL Tự động cập nhật:<\/label>/,
  '<label data-i18n="us_label_update_url">URL Tự động cập nhật:</label>'
);

content = content.replace(
  /<input id="st-find-input" class="form-control" placeholder="Tìm kiếm trong code\.\.\." style="([^"]*)">/,
  '<input id="st-find-input" class="form-control" placeholder="Tìm kiếm trong code..." style="$1" data-i18n-placeholder="us_find_in_code">'
);

content = content.replace(
  /<input id="st-replace-input" class="form-control" placeholder="Thay thế bằng\.\.\." style="([^"]*)">/,
  '<input id="st-replace-input" class="form-control" placeholder="Thay thế bằng..." style="$1" data-i18n-placeholder="us_replace_placeholder">'
);

content = content.replace(
  /<button id="btn-st-find-prev" class="us-btn us-btn-sm" style="([^"]*)">Trước<\/button>/,
  '<button id="btn-st-find-prev" class="us-btn us-btn-sm" style="$1" data-i18n="us_btn_find_prev">Trước</button>'
);

content = content.replace(
  /<button id="btn-st-find-next" class="us-btn us-btn-sm" style="([^"]*)">Sau<\/button>/,
  '<button id="btn-st-find-next" class="us-btn us-btn-sm" style="$1" data-i18n="us_btn_find_next">Sau</button>'
);

content = content.replace(
  /<button id="btn-st-replace-one" class="us-btn us-btn-sm" style="([^"]*)">Thay 1<\/button>/,
  '<button id="btn-st-replace-one" class="us-btn us-btn-sm" style="$1" data-i18n="us_btn_replace_one">Thay 1</button>'
);

content = content.replace(
  /<button id="btn-st-replace-all" class="us-btn us-btn-sm" style="([^"]*)">Thay tất cả<\/button>/,
  '<button id="btn-st-replace-all" class="us-btn us-btn-sm" style="$1" data-i18n="us_btn_replace_all">Thay tất cả</button>'
);

content = content.replace(
  /<button id="btn-st-find-close" class="us-btn us-btn-icon" style="([^"]*)" title="Đóng">/,
  '<button id="btn-st-find-close" class="us-btn us-btn-icon" style="$1" title="Đóng" data-i18n-title="tip_close">'
);

content = content.replace(
  /<textarea id="st-edit-code" class="studio-code" spellcheck="false" placeholder="\/\/ Viết mã JavaScript của bạn ở đây\.\.\."><\/textarea>/,
  '<textarea id="st-edit-code" class="studio-code" spellcheck="false" placeholder="// Viết mã JavaScript của bạn ở đây..." data-i18n-placeholder="us_editor_js_placeholder"></textarea>'
);

content = content.replace(
  /<button id="btn-st-console-clear" class="us-btn us-btn-sm" style="([^"]*)">Xóa log<\/button>/,
  '<button id="btn-st-console-clear" class="us-btn us-btn-sm" style="$1" data-i18n="us_console_clear_btn">Xóa log</button>'
);

content = content.replace(
  /<button id="btn-st-console-close" class="us-btn us-btn-sm" style="([^"]*)">Thu nhỏ<\/button>/,
  '<button id="btn-st-console-close" class="us-btn us-btn-sm" style="$1" data-i18n="us_console_minimize_btn">Thu nhỏ</button>'
);

content = content.replace(
  /<span id="st-cursor-pos">Dòng 1, Cột 1<\/span>/,
  '<span id="st-cursor-pos" data-i18n="us_cursor_pos_initial">Dòng 1, Cột 1</span>'
);

content = content.replace(
  /<span id="st-line-count">1 dòng<\/span>/,
  '<span id="st-line-count" data-i18n="us_line_count_initial">1 dòng</span>'
);

content = content.replace(
  /<span id="st-char-count">0 ký tự<\/span>/,
  '<span id="st-char-count" data-i18n="us_char_count_initial">0 ký tự</span>'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Updated userscripts.html');

