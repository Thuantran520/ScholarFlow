import re
import os

js_path = "/mnt/c/TakaExtension/OS/js/sidebar.js"

with open(js_path, "r", encoding="utf-8") as f:
    js_content = f.read()

# Replace biblio empty strings
js_content = re.sub(
    r'title\.textContent = query \? "Không tìm thấy tài liệu phù hợp" : "Chưa có trích dẫn nào được lưu";',
    r'title.textContent = query ? (window.i18n ? window.i18n.t("biblio_empty_search_title") : "Không tìm thấy tài liệu phù hợp") : (window.i18n ? window.i18n.t("biblio_empty_title") : "Chưa có trích dẫn nào được lưu");',
    js_content
)

js_content = re.sub(
    r'sub\.textContent = query \? "Hãy thử tìm kiếm với từ khóa khác." : "Bấm nút ➕ Lưu ở Tab 1 để thêm bài báo hoặc trang web vào danh mục.";',
    r'sub.textContent = query ? (window.i18n ? window.i18n.t("biblio_empty_search_sub") : "Hãy thử tìm kiếm với từ khóa khác.") : (window.i18n ? window.i18n.t("biblio_empty_sub") : "Bấm nút ➕ Lưu ở Tab 1 để thêm bài báo hoặc trang web vào danh mục.");',
    js_content
)

js_content = re.sub(
    r'btnCopy\.textContent = "📋 Copy";',
    r'btnCopy.textContent = window.i18n ? window.i18n.t("biblio_btn_copy") : "📋 Copy";',
    js_content
)

js_content = re.sub(
    r'btnEdit\.textContent = "✏️ Nạp form";',
    r'btnEdit.textContent = window.i18n ? window.i18n.t("biblio_btn_edit") : "✏️ Nạp form";',
    js_content
)

js_content = re.sub(
    r'btnDel\.textContent = "🗑️ Xóa";',
    r'btnDel.textContent = window.i18n ? window.i18n.t("biblio_btn_del") : "🗑️ Xóa";',
    js_content
)

js_content = re.sub(
    r'btn\.textContent = "✓ Đã sao chép!";',
    r'btn.textContent = window.i18n ? window.i18n.t("btn_copied") : "✓ Đã sao chép!";',
    js_content
)

js_content = re.sub(
    r'statusEl\.textContent = "✓ Đã lưu cài đặt!";',
    r'statusEl.textContent = window.i18n ? window.i18n.t("toast_settings_saved") : "✓ Đã lưu cài đặt!";',
    js_content
)

js_content = re.sub(
    r'statusEl\.textContent = "💾 Tự động lưu";',
    r'statusEl.textContent = window.i18n ? window.i18n.t("toast_autosave") : "💾 Tự động lưu";',
    js_content
)

with open(js_path, "w", encoding="utf-8") as f:
    f.write(js_content)

print("Updated sidebar.js dynamically.")
