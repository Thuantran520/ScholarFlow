const fs = require('fs');
const path = require('path');

function updateHtmlFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Weather refresh button
  content = content.replace(
    /id="btn-cal-weather-refresh" class="btn btn-secondary" style="([^"]*)" title="Làm mới thời tiết"/g,
    'id="btn-cal-weather-refresh" class="btn btn-secondary" style="$1" title="Làm mới thời tiết" data-i18n-title="tip_weather_refresh"'
  );

  // Cookie current domain
  content = content.replace(
    /<span id="cookie-current-domain" style="([^"]*)">Đang xác định\.\.\.<\/span>/g,
    '<span id="cookie-current-domain" style="$1" data-i18n="cookie_domain_detecting">Đang xác định...</span>'
  );

  // Calendar day head
  content = content.replace(
    /<div id="cal-day-head" style="([^"]*)">Chọn ngày để xem lịch học<\/div>/g,
    '<div id="cal-day-head" style="$1" data-i18n="cal_select_date_hint">Chọn ngày để xem lịch học</div>'
  );

  // Social inject stats & protect note
  content = content.replace(
    /<span id="soc-inj-stats" style="([^"]*)">Chưa phát hiện lần chèn mã nào trên tab này\.<\/span>/g,
    '<span id="soc-inj-stats" style="$1" data-i18n="soc_inj_stats_none">Chưa phát hiện lần chèn mã nào trên tab này.</span>'
  );
  content = content.replace(
    /<div id="soc-protect-note" style="([^"]*)">Đang theo dõi bảo vễ &amp; thống kê tracker\.\.\.<\/div>/g,
    '<div id="soc-protect-note" style="$1" data-i18n="soc_protect_note_tracking">Đang theo dõi bảo vệ &amp; thống kê tracker...</div>'
  );

  // QR char count in sidebar/popup tab
  content = content.replace(
    /<span id="qr-char-count" style="([^"]*)">0 ký tự<\/span>/g,
    '<span id="qr-char-count" style="$1" data-i18n="qr_char_count_initial">0 ký tự</span>'
  );

  // Scratchpad counter
  content = content.replace(
    /<span class="scratchpad-counter" id="scratchpad-counter">0 từ • 0 ký tự<\/span>/g,
    '<span class="scratchpad-counter" id="scratchpad-counter" data-i18n="scratchpad_counter_initial">0 từ • 0 ký tự</span>'
  );

  // Userscripts search
  content = content.replace(
    /<input id="us-search" type="text" class="form-control" style="([^"]*)" placeholder="Tìm kiếm script\.\.\.">/g,
    '<input id="us-search" type="text" class="form-control" style="$1" placeholder="Tìm kiếm script..." data-i18n-placeholder="us_search_placeholder">'
  );

  // Filter options
  content = content.replace(
    /<option value="">Tất cả<\/option>\s*<option value="current_page">Trang này<\/option>\s*<option value="active">Đang bật<\/option>\s*<option value="inactive">Đang tắt<\/option>/g,
    '<option value="" data-i18n="us_filter_all">Tất cả</option>\n              <option value="current_page" data-i18n="us_filter_current_page">Trang này</option>\n              <option value="active" data-i18n="us_filter_active">Đang bật</option>\n              <option value="inactive" data-i18n="us_filter_inactive">Đang tắt</option>'
  );

  // Template button
  content = content.replace(
    /<button id="btn-us-template" class="us-btn" style="height: 30px;" title="Chọn mẫu script có sẵn">([\s\S]*?)<span>Mẫu code<\/span>\s*<\/button>/g,
    '<button id="btn-us-template" class="us-btn" style="height: 30px;" title="Chọn mẫu script có sẵn" data-i18n-title="tip_us_template">$1<span data-i18n="us_btn_template">Mẫu code</span>\n            </button>'
  );

  // Import button title
  content = content.replace(
    /<button id="btn-us-import" class="us-btn us-btn-sm" style="flex: 1;" title="Nhập script từ file máy tính">/g,
    '<button id="btn-us-import" class="us-btn us-btn-sm" style="flex: 1;" title="Nhập script từ file máy tính" data-i18n-title="tip_us_import_file">'
  );

  // Import URL button title
  content = content.replace(
    /<button id="btn-us-import-url" class="us-btn us-btn-sm" style="flex: 1;" title="Tải script từ liên kết GreasyFork \/ GitHub">/g,
    '<button id="btn-us-import-url" class="us-btn us-btn-sm" style="flex: 1;" title="Tải script từ liên kết GreasyFork / GitHub" data-i18n-title="tip_us_import_url">'
  );

  // Check updates button
  content = content.replace(
    /<button id="btn-us-check-updates" class="us-btn us-btn-sm" style="flex: 1;" title="Kiểm tra phiên bản mới cho các script">([\s\S]*?)<span>Cập nhật<\/span>\s*<\/button>/g,
    '<button id="btn-us-check-updates" class="us-btn us-btn-sm" style="flex: 1;" title="Kiểm tra phiên bản mới cho các script" data-i18n-title="tip_us_check_updates">$1<span data-i18n="us_btn_check_updates">Cập nhật</span>\n            </button>'
  );

  // Export all button title
  content = content.replace(
    /<button id="btn-us-export" class="us-btn us-btn-sm" style="flex: 1;" title="Sao lưu toàn bộ script ra file JSON">/g,
    '<button id="btn-us-export" class="us-btn us-btn-sm" style="flex: 1;" title="Sao lưu toàn bộ script ra file JSON" data-i18n-title="tip_us_export_all">'
  );

  // Quick action strip
  content = content.replace(
    /<span style="font-size: 10px; color: var\(--text-muted\);">Thao tác nhanh:<\/span>/g,
    '<span style="font-size: 10px; color: var(--text-muted);" data-i18n="us_batch_actions_label">Thao tác nhanh:</span>'
  );

  content = content.replace(
    /<button id="btn-us-enable-all" class="us-btn us-btn-sm" style="height: 22px; font-size: 10px;" title="Bật tất cả script">([\s\S]*?)<span>Bật hết<\/span>\s*<\/button>/g,
    '<button id="btn-us-enable-all" class="us-btn us-btn-sm" style="height: 22px; font-size: 10px;" title="Bật tất cả script" data-i18n-title="tip_us_enable_all">$1<span data-i18n="us_btn_enable_all">Bật hết</span>\n              </button>'
  );

  content = content.replace(
    /<button id="btn-us-disable-all" class="us-btn us-btn-sm" style="height: 22px; font-size: 10px;" title="Tắt tất cả script">([\s\S]*?)<span>Tắt hết<\/span>\s*<\/button>/g,
    '<button id="btn-us-disable-all" class="us-btn us-btn-sm" style="height: 22px; font-size: 10px;" title="Tắt tất cả script" data-i18n-title="tip_us_disable_all">$1<span data-i18n="us_btn_disable_all">Tắt hết</span>\n              </button>'
  );

  // Shortcuts in editor
  content = content.replace(
    /<span><kbd style="([^"]*)">Ctrl\+S<\/kbd> Lưu<\/span>/g,
    '<span><kbd style="$1">Ctrl+S</kbd> <span data-i18n="us_hint_save">Lưu</span></span>'
  );
  content = content.replace(
    /<span><kbd style="([^"]*)">Ctrl\+Enter<\/kbd> Chạy thử<\/span>/g,
    '<span><kbd style="$1">Ctrl+Enter</kbd> <span data-i18n="us_hint_run">Chạy thử</span></span>'
  );
  content = content.replace(
    /<span><kbd style="([^"]*)">Ctrl\+H<\/kbd> Tìm &amp; Thay<\/span>/g,
    '<span><kbd style="$1">Ctrl+H</kbd> <span data-i18n="us_hint_find">Tìm &amp; Thay</span></span>'
  );

  // Find & Replace inputs & buttons
  content = content.replace(
    /<input id="us-find-input" class="form-control" placeholder="Tìm\.\.\." style="([^"]*)">/g,
    '<input id="us-find-input" class="form-control" placeholder="Tìm..." style="$1" data-i18n-placeholder="us_find_placeholder">'
  );
  content = content.replace(
    /<input id="us-replace-input" class="form-control" placeholder="Thay bằng\.\.\." style="([^"]*)">/g,
    '<input id="us-replace-input" class="form-control" placeholder="Thay bằng..." style="$1" data-i18n-placeholder="us_replace_placeholder">'
  );
  content = content.replace(
    /<button id="btn-us-find-prev" class="us-btn us-btn-sm" style="([^"]*)">Trước<\/button>/g,
    '<button id="btn-us-find-prev" class="us-btn us-btn-sm" style="$1" data-i18n="us_btn_find_prev">Trước</button>'
  );
  content = content.replace(
    /<button id="btn-us-find-next" class="us-btn us-btn-sm" style="([^"]*)">Sau<\/button>/g,
    '<button id="btn-us-find-next" class="us-btn us-btn-sm" style="$1" data-i18n="us_btn_find_next">Sau</button>'
  );
  content = content.replace(
    /<button id="btn-us-replace-one" class="us-btn us-btn-sm" style="([^"]*)">Thay 1<\/button>/g,
    '<button id="btn-us-replace-one" class="us-btn us-btn-sm" style="$1" data-i18n="us_btn_replace_one">Thay 1</button>'
  );
  content = content.replace(
    /<button id="btn-us-replace-all" class="us-btn us-btn-sm" style="([^"]*)">Thay hết<\/button>/g,
    '<button id="btn-us-replace-all" class="us-btn us-btn-sm" style="$1" data-i18n="us_btn_replace_all">Thay hết</button>'
  );

  // Script name placeholder
  content = content.replace(
    /<input type="text" id="us-edit-name" class="form-control" style="([^"]*)" placeholder="VD: Bỏ qua quảng cáo YT">/g,
    '<input type="text" id="us-edit-name" class="form-control" style="$1" placeholder="VD: Bỏ qua quảng cáo YT" data-i18n-placeholder="us_name_placeholder">'
  );

  // Advanced settings summary
  content = content.replace(
    /<span>Cài đặt nâng cao ▸<\/span>/g,
    '<span data-i18n="us_advanced_toggle">Cài đặt nâng cao ▸</span>'
  );

  // Run at options
  content = content.replace(
    /<option value="document_start">document_start \(Sớm nhất\)<\/option>/g,
    '<option value="document_start" data-i18n="us_runat_start">document_start (Sớm nhất)</option>'
  );
  content = content.replace(
    /<option value="document_idle" selected>document_idle \(Mặc định\)<\/option>/g,
    '<option value="document_idle" selected data-i18n="us_runat_idle">document_idle (Mặc định)</option>'
  );
  content = content.replace(
    /<option value="document_end">document_end \(Sau DOM\)<\/option>/g,
    '<option value="document_end" data-i18n="us_runat_end">document_end (Sau DOM)</option>'
  );

  // Execution world
  content = content.replace(
    /<label style="([^"]*)" title="MAIN: chạy trong ngữ cảnh trang web \(truy cập biến window\)\. ISOLATED: an toàn hơn, không chia sẻ scope với trang\.">Execution World <span style="color:var\(--text-muted\);">\(\?\)<\/span><\/label>/g,
    '<label style="$1" title="MAIN: chạy trong ngữ cảnh trang web (truy cập biến window). ISOLATED: an toàn hơn, không chia sẻ scope với trang." data-i18n-title="tip_us_execution_world">Execution World <span style="color:var(--text-muted);">(?)</span></label>'
  );
  content = content.replace(
    /<option value="MAIN" selected>MAIN \(truy cập window\)<\/option>/g,
    '<option value="MAIN" selected data-i18n="us_world_main">MAIN (truy cập window)</option>'
  );
  content = content.replace(
    /<option value="ISOLATED">ISOLATED \(an toàn hơn\)<\/option>/g,
    '<option value="ISOLATED" data-i18n="us_world_isolated">ISOLATED (an toàn hơn)</option>'
  );

  // Code label
  content = content.replace(
    /<span>Mã JavaScript<\/span>/g,
    '<span data-i18n="us_code_label">Mã JavaScript</span>'
  );

  // Editor toolbar buttons
  content = content.replace(
    /<button id="btn-us-open-tab" class="us-btn us-btn-sm" title="Mở trình soạn thảo toàn màn hình trong tab mới">([\s\S]*?)<span>Mở tab<\/span>\s*<\/button>/g,
    '<button id="btn-us-open-tab" class="us-btn us-btn-sm" title="Mở trình soạn thảo toàn màn hình trong tab mới" data-i18n-title="tip_us_open_tab">$1<span data-i18n="us_btn_open_tab">Mở tab</span>\n                </button>'
  );
  content = content.replace(
    /<button id="btn-us-snippets" class="us-btn us-btn-sm" title="Thư viện code mẫu GM_\*">([\s\S]*?)<span>Mẫu GM_\*<\/span>\s*<\/button>/g,
    '<button id="btn-us-snippets" class="us-btn us-btn-sm" title="Thư viện code mẫu GM_*" data-i18n-title="tip_us_snippets">$1<span data-i18n="us_btn_snippets">Mẫu GM_*</span>\n                </button>'
  );
  content = content.replace(
    /<button id="btn-us-storage-toggle" class="us-btn us-btn-sm" title="Quản lý GM Storage của trang web hiện tại">/g,
    '<button id="btn-us-storage-toggle" class="us-btn us-btn-sm" title="Quản lý GM Storage của trang web hiện tại" data-i18n-title="tip_us_storage_toggle">'
  );
  content = content.replace(
    /<button id="btn-us-parse-meta" class="us-btn us-btn-sm" title="Phân tích header @userscript">/g,
    '<button id="btn-us-parse-meta" class="us-btn us-btn-sm" title="Phân tích header @userscript" data-i18n-title="tip_us_parse_meta">'
  );
  content = content.replace(
    /<button id="btn-us-format" class="us-btn us-btn-sm" title="Định dạng \/ làm đẹp code">/g,
    '<button id="btn-us-format" class="us-btn us-btn-sm" title="Định dạng / làm đẹp code" data-i18n-title="tip_us_format">'
  );
  content = content.replace(
    /<button id="btn-us-export-single" class="us-btn us-btn-sm" title="Xuất file \.user\.js">/g,
    '<button id="btn-us-export-single" class="us-btn us-btn-sm" title="Xuất file .user.js" data-i18n-title="tip_us_export_single">'
  );

  // Statusbar
  content = content.replace(
    /<span id="us-cursor-pos">Dòng 1, Cột 1<\/span>/g,
    '<span id="us-cursor-pos" data-i18n="us_cursor_pos_initial">Dòng 1, Cột 1</span>'
  );
  content = content.replace(
    /<span id="us-char-count">0 ký tự<\/span>/g,
    '<span id="us-char-count" data-i18n="us_char_count_initial">0 ký tự</span>'
  );

  // Test button span
  content = content.replace(
    /<button id="btn-us-test" class="us-btn us-btn-secondary" style="([^"]*)">([\s\S]*?)<span>Chạy thử<\/span>\s*<\/button>/g,
    '<button id="btn-us-test" class="us-btn us-btn-secondary" style="$1">$2<span data-i18n="us_btn_test_run">Chạy thử</span>\n            </button>'
  );

  // Console buttons
  content = content.replace(
    /<button id="btn-us-copy-console" class="us-btn us-btn-icon" style="([^"]*)" title="Sao chép output">/g,
    '<button id="btn-us-copy-console" class="us-btn us-btn-icon" style="$1" title="Sao chép output" data-i18n-title="tip_us_copy_console">'
  );
  content = content.replace(
    /<button id="btn-us-clear-console" class="us-btn us-btn-icon" style="([^"]*)" title="Xóa logs">/g,
    '<button id="btn-us-clear-console" class="us-btn us-btn-icon" style="$1" title="Xóa logs" data-i18n-title="tip_us_clear_console">'
  );

  // Storage drawer buttons
  content = content.replace(
    /<button id="btn-us-add-key-toggle" class="us-btn us-btn-icon" style="([^"]*)" title="Thêm key mới">/g,
    '<button id="btn-us-add-key-toggle" class="us-btn us-btn-icon" style="$1" title="Thêm key mới" data-i18n-title="tip_us_add_key">'
  );
  content = content.replace(
    /<button id="btn-us-refresh-storage" class="us-btn us-btn-icon" style="([^"]*)" title="Làm mới">/g,
    '<button id="btn-us-refresh-storage" class="us-btn us-btn-icon" style="$1" title="Làm mới" data-i18n-title="tip_us_refresh_storage">'
  );
  content = content.replace(
    /<button id="btn-us-clear-storage" class="us-btn us-btn-icon us-danger" style="([^"]*)" title="Xóa toàn bộ GM Storage trang này">/g,
    '<button id="btn-us-clear-storage" class="us-btn us-btn-icon us-danger" style="$1" title="Xóa toàn bộ GM Storage trang này" data-i18n-title="tip_us_clear_storage">'
  );
  content = content.replace(
    /<button id="btn-us-close-storage" class="us-btn us-btn-icon" style="([^"]*)" title="Đóng panel GM Storage">/g,
    '<button id="btn-us-close-storage" class="us-btn us-btn-icon" style="$1" title="Đóng panel GM Storage" data-i18n-title="tip_us_close_storage">'
  );
  content = content.replace(
    /<button id="btn-us-save-gm-key" class="us-btn us-btn-primary us-btn-sm" style="([^"]*)">Lưu<\/button>/g,
    '<button id="btn-us-save-gm-key" class="us-btn us-btn-primary us-btn-sm" style="$1" data-i18n="us_btn_save_key">Lưu</button>'
  );

  // Snippets modal
  content = content.replace(
    /<span style="font-size:12px; font-weight:700; color:#f1f5f9;">Thư viện Mẫu GM_\*<\/span>/g,
    '<span style="font-size:12px; font-weight:700; color:#f1f5f9;" data-i18n="us_snippets_modal_title">Thư viện Mẫu GM_*</span>'
  );
  content = content.replace(
    /<button id="btn-us-close-snippets" class="us-btn us-btn-icon" style="([^"]*)" title="Đóng">/g,
    '<button id="btn-us-close-snippets" class="us-btn us-btn-icon" style="$1" title="Đóng" data-i18n-title="tip_close">'
  );

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Updated', filePath);
}

updateHtmlFile(path.join(__dirname, '..', 'OS', 'html', 'sidebar.html'));
updateHtmlFile(path.join(__dirname, '..', 'OS', 'html', 'popup.html'));

