import re
import os

locales_dir = "/mnt/c/TakaExtension/OS/locales"

updates = {
    "vi": {
        "biblio_empty_search_title": "Không tìm thấy tài liệu phù hợp",
        "biblio_empty_title": "Chưa có trích dẫn nào được lưu",
        "biblio_empty_search_sub": "Hãy thử tìm kiếm với từ khóa khác.",
        "biblio_empty_sub": "Bấm nút ➕ Lưu ở Tab 1 để thêm bài báo hoặc trang web vào danh mục.",
        "biblio_btn_copy": "📋 Copy",
        "biblio_btn_edit": "✏️ Nạp form",
        "biblio_btn_del": "🗑️ Xóa",
        "btn_copied": "✓ Đã sao chép!",
        "toast_settings_saved": "✓ Đã lưu cài đặt!",
        "toast_autosave": "💾 Tự động lưu"
    },
    "en": {
        "biblio_empty_search_title": "No matching documents found",
        "biblio_empty_title": "No citations saved yet",
        "biblio_empty_search_sub": "Try searching with a different keyword.",
        "biblio_empty_sub": "Click the ➕ Save button in Tab 1 to add an article or website to your list.",
        "biblio_btn_copy": "📋 Copy",
        "biblio_btn_edit": "✏️ Load",
        "biblio_btn_del": "🗑️ Delete",
        "btn_copied": "✓ Copied!",
        "toast_settings_saved": "✓ Settings saved!",
        "toast_autosave": "💾 Auto-saved"
    },
    "zh": {
        "biblio_empty_search_title": "未找到匹配的文献",
        "biblio_empty_title": "尚未保存任何引用",
        "biblio_empty_search_sub": "请尝试使用其他关键字搜索。",
        "biblio_empty_sub": "点击选项卡 1 中的 ➕ 保存按钮，将文章或网站添加到列表中。",
        "biblio_btn_copy": "📋 复制",
        "biblio_btn_edit": "✏️ 载入",
        "biblio_btn_del": "🗑️ 删除",
        "btn_copied": "✓ 已复制！",
        "toast_settings_saved": "✓ 设置已保存！",
        "toast_autosave": "💾 自动保存"
    },
    "ru": {
        "biblio_empty_search_title": "Соответствующие документы не найдены",
        "biblio_empty_title": "Цитаты еще не сохранены",
        "biblio_empty_search_sub": "Попробуйте поискать с другим ключевым словом.",
        "biblio_empty_sub": "Нажмите кнопку ➕ Сохранить на Вкладке 1, чтобы добавить статью или веб-сайт в свой список.",
        "biblio_btn_copy": "📋 Копировать",
        "biblio_btn_edit": "✏️ Загрузить",
        "biblio_btn_del": "🗑️ Удалить",
        "btn_copied": "✓ Скопировано!",
        "toast_settings_saved": "✓ Настройки сохранены!",
        "toast_autosave": "💾 Автосохранение"
    },
    "ja": {
        "biblio_empty_search_title": "一致する文献は見つかりませんでした",
        "biblio_empty_title": "引用はまだ保存されていません",
        "biblio_empty_search_sub": "別のキーワードで検索してみてください。",
        "biblio_empty_sub": "タブ1の ➕ 保存ボタンをクリックして、記事やウェブサイトをリストに追加します。",
        "biblio_btn_copy": "📋 コピー",
        "biblio_btn_edit": "✏️ ロード",
        "biblio_btn_del": "🗑️ 削除",
        "btn_copied": "✓ コピーしました！",
        "toast_settings_saved": "✓ 設定を保存しました！",
        "toast_autosave": "💾 自動保存"
    }
}

for lang, items in updates.items():
    lf = os.path.join(locales_dir, f"{lang}.js")
    if not os.path.exists(lf): continue
    
    with open(lf, "r", encoding="utf-8") as f:
        content = f.read()
        
    for key, val in items.items():
        if f'"{key}"' not in content:
            content = re.sub(r'\n};', f',\n  "{key}": "{val}"\n}};', content)
            
    with open(lf, "w", encoding="utf-8") as f:
        f.write(content)

print("JS Locales updated successfully.")
