import re

with open("/mnt/c/TakaExtension/OS/js/privacy.js", "r", encoding="utf-8") as f:
    content = f.read()

translations = {
    "vi": "<strong>Cookie hoàn toàn do bạn kiểm soát:</strong> Tiện ích không tự động lưu hay đồng bộ cookie. Mọi thao tác xuất/nhập đều phải do bạn chủ động bấm nút. Bạn có thể xóa cookie bất kỳ lúc nào qua tính năng quản lý cookie của trình duyệt.",
    "en": "<strong>Total Cookie Control:</strong> The extension does not automatically save or sync cookies. All import/export operations must be manually triggered by you. You can clear your cookies at any time via your browser's cookie management settings.",
    "zh": "<strong>Cookie 完全由您控制：</strong> 扩展程序不会自动保存或同步 Cookie。所有导入/导出操作均必须由您主动点击触发。您可以随时通过浏览器的 Cookie 管理功能清除 Cookie。",
    "ru": "<strong>Полный контроль над Cookie:</strong> Расширение не сохраняет и не синхронизирует файлы cookie автоматически. Все операции экспорта/импорта должны запускаться вами вручную. Вы можете удалить файлы cookie в любое время через настройки вашего браузера.",
    "ja": "<strong>Cookie の完全な管理：</strong> 拡張機能が Cookie を自動的に保存または同期することはありません。すべてのインポート/エクスポート操作は、ユーザーの明示的なクリックによってのみ実行されます。ブラウザの Cookie 管理機能を通じて、いつでも Cookie を削除できます。"
}

for lang, text in translations.items():
    search_str = f'"{lang}": {{'
    lang_start = content.find(search_str)
    if lang_start == -1: continue
    
    sec4_li2_idx = content.find('"sec4_li2"', lang_start)
    if sec4_li2_idx != -1:
        end_line_idx = content.find('\n', sec4_li2_idx)
        insert_str = f'\n    "sec4_li3": "{text}",'
        content = content[:end_line_idx] + insert_str + content[end_line_idx:]

if 'setHtml("sec4-li2"' in content and 'setHtml("sec4-li3"' not in content:
    content = content.replace('setHtml("sec4-li2", data.sec4_li2);', 'setHtml("sec4-li2", data.sec4_li2);\n      if (data.sec4_li3) setHtml("sec4-li3", data.sec4_li3);')

with open("/mnt/c/TakaExtension/OS/js/privacy.js", "w", encoding="utf-8") as f:
    f.write(content)

print("Patched sec4_li3 successfully.")
