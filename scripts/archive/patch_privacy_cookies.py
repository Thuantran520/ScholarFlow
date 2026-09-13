import re

with open("/mnt/c/TakaExtension/OS/js/privacy.js", "r", encoding="utf-8") as f:
    content = f.read()

# The translations to inject
cookie_translations = {
    "vi": {
        "sec1_li4": "<strong>Cookie Phiên Đăng Nhập (Cookie Manager — v2.3.0+):</strong> Tính năng Quản lý Cookie cho phép bạn đọc và ghi cookie của trang web hiện tại <em>theo yêu cầu chủ động từ bạn</em>. Cookie chỉ được xử lý cục bộ trong trình duyệt, <strong>không bao giờ được truyền lên máy chủ của ScholarFlow</strong>. File xuất cookie (.json hoặc chuỗi) được lưu trực tiếp về máy tính của bạn và hoàn toàn nằm trong tầm kiểm soát của bạn.",
        "sec2_li6": "<code>cookies</code>: <strong>Chỉ được dùng cho tính năng Cookie Manager.</strong> Quyền này cho phép tiện ích đọc và ghi cookie của trang web hiện tại <em>theo lệnh trực tiếp của bạn</em>. Tiện ích không tự động đọc, không ghi lại lịch sử và không chia sẻ cookie với bất kỳ bên thứ ba nào.",
        "cookie_note": "⚠️ <strong>Lưu ý Bảo Mật Cookie:</strong> Cookie phiên đăng nhập là thông tin nhạy cảm. Chỉ xuất và chia sẻ file cookie với những người/thiết bị mà bạn tin tưởng tuyệt đối. ScholarFlow không chịu trách nhiệm về hậu quả nếu file cookie bị lộ ra bên ngoài do hành động của người dùng."
    },
    "en": {
        "sec1_li4": "<strong>Session Cookies (Cookie Manager — v2.3.0+):</strong> The Cookie Manager feature allows you to read and write cookies for the current website <em>only upon your explicit request</em>. Cookies are processed entirely locally within your browser and are <strong>never transmitted to any ScholarFlow servers</strong>. Exported cookie files (.json or string) are saved directly to your local machine and remain completely under your control.",
        "sec2_li6": "<code>cookies</code>: <strong>Exclusively used for the Cookie Manager feature.</strong> This permission allows the extension to read and write cookies for the current website <em>only upon your direct command</em>. The extension does not read cookies automatically, does not log history, and does not share cookies with any third parties.",
        "cookie_note": "⚠️ <strong>Cookie Security Warning:</strong> Session cookies contain highly sensitive access tokens. Only export and share cookie files with devices or individuals you completely trust. ScholarFlow cannot be held responsible for any consequences if your cookie files are leaked due to user action."
    },
    "zh": {
        "sec1_li4": "<strong>会话 Cookie (Cookie Manager — v2.3.0+)：</strong> Cookie 管理功能允许您<em>在主动请求时</em>读取和写入当前网站的 Cookie。Cookie 仅在您的浏览器内本地处理，<strong>绝不会传输到 ScholarFlow 的任何服务器</strong>。导出的 Cookie 文件（.json 或字符串）直接保存在您的本地计算机上，完全由您掌控。",
        "sec2_li6": "<code>cookies</code>：<strong>仅用于 Cookie 管理功能。</strong> 此权限允许扩展<em>在您的直接指令下</em>读取和写入当前网站的 Cookie。扩展不会自动读取 Cookie，不会记录历史，也绝不会与任何第三方共享 Cookie。",
        "cookie_note": "⚠️ <strong>Cookie 安全警告：</strong> 会话 Cookie 包含极其敏感的访问凭证。请仅将导出的 Cookie 文件分享给您绝对信任的设备或人员。如果因用户行为导致 Cookie 泄露，ScholarFlow 概不负责。"
    },
    "ru": {
        "sec1_li4": "<strong>Сессионные файлы cookie (Cookie Manager — v2.3.0+):</strong> Функция управления файлами cookie позволяет вам читать и записывать файлы cookie для текущего веб-сайта <em>только по вашему явному запросу</em>. Файлы cookie обрабатываются исключительно локально в вашем браузере и <strong>никогда не передаются на серверы ScholarFlow</strong>. Экспортированные файлы cookie (.json или строка) сохраняются непосредственно на вашем компьютере и находятся под вашим полным контролем.",
        "sec2_li6": "<code>cookies</code>: <strong>Используется исключительно для функции управления файлами cookie.</strong> Это разрешение позволяет расширению читать и записывать файлы cookie текущего веб-сайта <em>только по вашей прямой команде</em>. Расширение не читает файлы cookie автоматически, не записывает историю и не передает файлы cookie третьим лицам.",
        "cookie_note": "⚠️ <strong>Предупреждение о безопасности файлов cookie:</strong> Сессионные файлы cookie содержат конфиденциальные маркеры доступа. Экспортируйте и делитесь файлами cookie только с доверенными устройствами или лицами. ScholarFlow не несет ответственности за любые последствия, если ваши файлы cookie будут скомпрометированы в результате действий пользователя."
    },
    "ja": {
        "sec1_li4": "<strong>セッション Cookie (Cookie Manager — v2.3.0+):</strong> Cookie マネージャー機能は、<em>あなたの明示的な要求があった場合にのみ</em>、現在のウェブサイトの Cookie を読み書きすることを許可します。Cookie はブラウザ内で完全にローカル処理され、<strong>ScholarFlow のサーバーに送信されることは決してありません</strong>。エクスポートされた Cookie ファイル (.json または文字列) はローカルマシンに直接保存され、完全にあなたの管理下に置かれます。",
        "sec2_li6": "<code>cookies</code>: <strong>Cookie マネージャー機能のためにのみ使用されます。</strong> この権限は、<em>あなたの直接の指示があった場合にのみ</em>、拡張機能が現在のウェブサイトの Cookie を読み書きすることを許可します。拡張機能が自動的に Cookie を読み取ったり、履歴を記録したり、サードパーティと Cookie を共有したりすることはありません。",
        "cookie_note": "⚠️ <strong>Cookie のセキュリティ警告:</strong> セッション Cookie には非常に機密性の高いアクセス権が含まれています。エクスポートした Cookie ファイルは、完全に信頼できるデバイスや人物とのみ共有してください。ユーザーの操作によって Cookie ファイルが流出した場合の結果について、ScholarFlow は一切の責任を負いません。"
    }
}

# 1. Inject into the dictionary for each language
for lang, trans in cookie_translations.items():
    # Find where sec1_li3 is for this language
    search_str = f'"{lang}": {{'
    lang_start = content.find(search_str)
    if lang_start == -1: continue
    
    sec1_li3_idx = content.find('"sec1_li3"', lang_start)
    if sec1_li3_idx != -1:
        # Find the end of sec1_li3 line
        end_line_idx = content.find('\n', sec1_li3_idx)
        # insert sec1_li4
        insert_str = f'\n    "sec1_li4": "{trans["sec1_li4"]}",'
        content = content[:end_line_idx] + insert_str + content[end_line_idx:]
    
    sec2_li5_idx = content.find('"sec2_li5"', lang_start)
    if sec2_li5_idx != -1:
        end_line_idx = content.find('\n', sec2_li5_idx)
        insert_str = f'\n    "sec2_li6": "{trans["sec2_li6"]}",\n    "cookie_note": "{trans["cookie_note"]}",'
        content = content[:end_line_idx] + insert_str + content[end_line_idx:]

# 2. Add to setHtml rendering calls at the bottom
if 'setHtml("sec1-li3"' in content and 'setHtml("sec1-li4"' not in content:
    content = content.replace('setHtml("sec1-li3", data.sec1_li3);', 'setHtml("sec1-li3", data.sec1_li3);\n      setHtml("sec1-li4", data.sec1_li4);')
    
if 'setHtml("sec2-li5"' in content and 'setHtml("sec2-li6"' not in content:
    content = content.replace('setHtml("sec2-li5", data.sec2_li5);', 'setHtml("sec2-li5", data.sec2_li5);\n      setHtml("sec2-li6", data.sec2_li6);\n      setHtml("cookie-note", data.cookie_note);')

with open("/mnt/c/TakaExtension/OS/js/privacy.js", "w", encoding="utf-8") as f:
    f.write(content)

print("Updated privacy.js successfully.")
