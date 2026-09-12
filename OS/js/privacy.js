const PRIVACY_I18N = {
  "vi": {
    "title": "Chính Sách Quyền Riêng Tư – ScholarFlow",
    "lang_vi": "🇻🇳 Tiếng Việt",
    "lang_en": "🇬🇧 Tiếng Anh",
    "lang_zh": "🇨🇳 Tiếng Trung",
    "lang_ru": "🇷🇺 Tiếng Nga",
    "lang_ja": "🇯🇵 Tiếng Nhật",
    "doc_title": "ScholarFlow – Chính Sách Quyền Riêng Tư & Bảo Mật",
    "last_updated": "Cập nhật lần cuối: Tháng 09/2026 | Phiên bản 2.4.1_beta",
    "compliance_badge": "Tuân thủ Chrome Web Store & Mozilla Add-ons Policies",
    "verified_badge": "Cam kết 100% Cục Bộ – Tuyệt Đối Không Thu Thập Dữ Liệu Cá Nhân",
    "summary_title": "Tuyên Bố Cốt Lõi (Privacy by Design):",
    "summary_desc": "ScholarFlow được phát triển theo tiêu chuẩn <strong>Privacy by Design (Bảo mật theo thiết kế)</strong>. Mọi tác vụ trích dẫn, chụp cuộn màn hình, quay video và che mờ thông tin nhạy cảm đều diễn ra <strong>100% cục bộ trên bộ nhớ máy tính của bạn</strong>. Tiện ích hoàn toàn KHÔNG có máy chủ theo dõi, KHÔNG cài đặt telemetry/analytics, và KHÔNG BAO GIỜ thu thập, lưu trữ hay bán dữ liệu người dùng.",
    "sec1_title": "1. Các Loại Dữ Liệu Được Tiện Ích Xử Lý",
    "sec1_p": "ScholarFlow chỉ kích hoạt khi bạn chủ động thao tác trên trang web:",
    "sec1_li1": "<strong>Dữ liệu trích dẫn thư mục:</strong> Tiêu đề bài viết, tên tác giả, ngày công bố, tạp chí, số DOI và đường dẫn URL. Dữ liệu này chỉ dùng để định dạng theo chuẩn IEEE, APA 7, Harvard, MLA 9 hoặc BibTeX và lưu vào bộ nhớ cục bộ <code>chrome.storage.local</code> của trình duyệt bạn khi bạn bấm 'Lưu danh mục'.",
    "sec1_li2": "<strong>Ảnh chụp màn hình & Video ghi lại:</strong> Toàn bộ khung hình chụp cuộn và luồng video quay lại màn hình được mã hóa trực tiếp trong bộ nhớ RAM trình duyệt và cho phép bạn tải về máy cá nhân (PNG/WebM). Tiện ích không truyền bất kỳ hình ảnh hay âm thanh nào ra môi trường mạng.",
    "sec1_li3": "<strong>Che mờ bảo mật phần tử (Redaction):</strong> Hiệu ứng làm mờ (blur) hoặc che đen (blackout) được áp dụng trực tiếp lên cây DOM tại trình duyệt cá nhân nhằm hỗ trợ chụp ảnh/chia sẻ an toàn mà không lộ thông tin cá nhân. Khi đóng tab hoặc làm mới, các lớp che mờ sẽ tự giải phóng.",
    "sec1_li4": "<strong>Cookie Phiên Đăng Nhập (Cookie Manager — v2.3.0+):</strong> Tính năng Quản lý Cookie cho phép bạn đọc và ghi cookie của trang web hiện tại <em>theo yêu cầu chủ động từ bạn</em>. Cookie chỉ được xử lý cục bộ trong trình duyệt, <strong>không bao giờ được truyền lên máy chủ của ScholarFlow</strong>. File xuất cookie (.json hoặc chuỗi) được lưu trực tiếp về máy tính của bạn và hoàn toàn nằm trong tầm kiểm soát của bạn.",
    "sec2_title": "2. Minh Bạch Quyền Hạn Trình Duyệt (Browser Permissions)",
    "sec2_p": "Tuân thủ chính sách sử dụng quyền hạn tối thiểu (Principle of Least Privilege) của Google và Mozilla:",
    "sec2_li1": "<code>activeTab</code>: Đọc metadata bài báo và chụp màn hình tab đang mở duy nhất khi bạn bấm kích hoạt tiện ích.",
    "sec2_li2": "<code>scripting</code>: Cho phép hiển thị khung chọn vùng chụp và bộ công cụ che mờ đối tượng theo lệnh của bạn.",
    "sec2_li3": "<code>storage</code>: Lưu trữ danh mục trích dẫn đã lưu và các tùy chọn cá nhân hóa (kiểu trích dẫn, ngôn ngữ ưa thích) hoàn toàn cục bộ trên máy của bạn.",
    "sec2_li4": "<code>clipboardWrite</code>: Cho phép sao chép nhanh trích dẫn chuẩn hoặc ảnh chụp vào khay nhớ tạm clipboard.",
    "sec2_li5": "<code>sidePanel</code>: Hiển thị giao diện thanh bên tiện lợi khi nghiên cứu tài liệu song song trên Chrome/Edge.",
    "sec2_li6": "<code>cookies</code>: <strong>Chỉ được dùng cho tính năng Cookie Manager.</strong> Quyền này cho phép tiện ích đọc và ghi cookie của trang web hiện tại <em>theo lệnh trực tiếp của bạn</em>. Tiện ích không tự động đọc, không ghi lại lịch sử và không chia sẻ cookie với bất kỳ bên thứ ba nào.",
    "cookie_note": "⚠️ <strong>Lưu ý Bảo Mật Cookie:</strong> Cookie phiên đăng nhập là thông tin nhạy cảm. Chỉ xuất và chia sẻ file cookie với những người/thiết bị mà bạn tin tưởng tuyệt đối. ScholarFlow không chịu trách nhiệm về hậu quả nếu file cookie bị lộ ra bên ngoài do hành động của người dùng.",
    "sec3_title": "3. Kết Nối Mạng Xác Minh Học Thuật Bên Thứ Ba",
    "sec3_p": "Để kiểm tra độ uy tín và đối soát định danh bài báo, tiện ích chỉ gửi các truy vấn GET công khai tới các cơ sở dữ liệu mở quốc tế:",
    "sec3_li1": "<strong>Crossref API & doi.org:</strong> Đối soát mã định danh số đối tượng DOI chính thức.",
    "sec3_li2": "<strong>OpenAlex API (api.openalex.org):</strong> Tra cứu thông tin bài báo trong kho dữ liệu mở 250M+ công trình toàn cầu.",
    "sec3_li3": "<strong>arXiv API (export.arxiv.org):</strong> Truy xuất tác giả và năm công bố tài liệu toán học, máy tính.",
    "sec3_li4": "<strong>YouTube oEmbed:</strong> Nhận diện tiêu đề và kênh chính thức khi bạn trích dẫn video giáo dục.",
    "sec3_note": "Mọi yêu cầu mạng trên đều là các truy vấn công khai, ẩn danh, <strong>không gửi kèm cookie, không gửi ID người dùng và không gửi lịch sử duyệt web</strong>.",
    "sec4_title": "4. Quyền Kiểm Soát & Xóa Dữ Liệu (GDPR & CCPA)",
    "sec4_p": "Bạn nắm toàn quyền kiểm soát dữ liệu của mình:",
    "sec4_li1": "<strong>Quyền xóa bỏ (Right to Erasure):</strong> Bạn có thể xóa từng mục hoặc xóa toàn bộ danh mục trích dẫn bất kỳ lúc nào bằng nút <em>'Xóa toàn bộ'</em> trong ứng dụng.",
    "sec4_li2": "<strong>Xuất dữ liệu:</strong> Bạn có thể xuất toàn bộ trích dẫn đã lưu ra file <code>.bib</code> tiêu chuẩn để lưu trữ độc lập.",
    "sec4_li3": "<strong>Cookie hoàn toàn do bạn kiểm soát:</strong> Tiện ích không tự động lưu hay đồng bộ cookie. Mọi thao tác xuất/nhập đều phải do bạn chủ động bấm nút. Bạn có thể xóa cookie bất kỳ lúc nào qua tính năng quản lý cookie của trình duyệt.",
    "sec5_title": "5. Mã Nguồn Mở & Giấy Phép",
    "sec5_p": "ScholarFlow là phần mềm mã nguồn mở được phát hành theo giấy phép <strong>MIT License</strong>. Bất kỳ ai cũng có thể kiểm tra toàn bộ mã nguồn của tiện ích để xác nhận rằng không hề có mã theo dõi hay hành vi độc hại nào.",
    "footer_text": "© 2026 ScholarFlow. Giấy phép MIT. Được phát triển vì cộng đồng nghiên cứu khoa học toàn cầu.",
    "btn_close": "Đóng trang này"
  },
  "en": {
    "title": "Privacy Policy – ScholarFlow",
    "lang_vi": "🇻🇳 Vietnamese",
    "lang_en": "🇬🇧 English",
    "lang_zh": "🇨🇳 Chinese",
    "lang_ru": "🇷🇺 Russian",
    "lang_ja": "🇯🇵 Japanese",
    "doc_title": "ScholarFlow – Privacy Policy & Security Commitment",
    "last_updated": "Last updated: September 2026 | Version 2.4.1_beta",
    "compliance_badge": "Compliant with Chrome Web Store & Mozilla Add-ons Developer Policies",
    "verified_badge": "100% Local Processing – Zero Personal Data Collection Guarantee",
    "summary_title": "Core Commitment (Privacy by Design):",
    "summary_desc": "ScholarFlow is engineered with strict <strong>Privacy by Design</strong> principles. All bibliographic citation generation, full-page scrolling screenshots, screen video recordings, and on-page element redactions are processed and stored <strong>100% locally in your browser memory and storage</strong>. The extension does NOT operate tracking servers, contains ZERO telemetry/analytics code, and NEVER collects, stores, or sells user data.",
    "sec1_title": "1. Data Handled by ScholarFlow",
    "sec1_p": "ScholarFlow only executes when explicitly triggered by your direct actions:",
    "sec1_li1": "<strong>Bibliographic Citation Metadata:</strong> Article titles, author names, publication dates, journal venues, DOIs, and page URLs. This data is solely used to format citations into IEEE, APA 7th, Harvard, MLA 9th, or BibTeX standards, and stored strictly locally in your browser's <code>chrome.storage.local</code> if you choose to save it.",
    "sec1_li2": "<strong>Screenshots & Screen Recordings:</strong> Captured screenshot frames and video streams are encoded directly in your device's memory (RAM) and saved directly to your local file system as PNG or WebM files. No media stream is ever transmitted across the internet.",
    "sec1_li3": "<strong>Privacy Element Redaction:</strong> Blur and blackout layers are applied directly to the client-side Document Object Model (DOM) of your browser to enable safe document sharing without exposing private data. Redactions are discarded when the tab is closed unless explicitly saved.",
    "sec1_li4": "<strong>Session Cookies (Cookie Manager — v2.3.0+):</strong> The Cookie Manager feature allows you to read and write cookies for the current website <em>only upon your explicit request</em>. Cookies are processed entirely locally within your browser and are <strong>never transmitted to any ScholarFlow servers</strong>. Exported cookie files (.json or string) are saved directly to your local machine and remain completely under your control.",
    "sec2_title": "2. Transparent Browser Permissions Disclosure",
    "sec2_p": "In compliance with the Principle of Least Privilege established by Google Chrome Web Store and Mozilla Add-ons (AMO):",
    "sec2_li1": "<code>activeTab</code>: Grants temporary read access to the currently active research tab to extract citations and take screenshots only upon user interaction.",
    "sec2_li2": "<code>scripting</code>: Allows injection of the interactive element-picker and redaction masks on the user's command.",
    "sec2_li3": "<code>storage</code>: Stores your saved bibliography list, citation styling preferences, and language selections locally on your computer.",
    "sec2_li4": "<code>clipboardWrite</code>: Enables convenient one-click copying of formatted citations and captured screenshots to your system clipboard.",
    "sec2_li5": "<code>sidePanel</code>: Enables the persistent side panel view on Chromium browsers (Chrome, Edge, Brave) for side-by-side research.",
    "sec2_li6": "<code>cookies</code>: <strong>Exclusively used for the Cookie Manager feature.</strong> This permission allows the extension to read and write cookies for the current website <em>only upon your direct command</em>. The extension does not read cookies automatically, does not log history, and does not share cookies with any third parties.",
    "cookie_note": "⚠️ <strong>Cookie Security Warning:</strong> Session cookies contain highly sensitive access tokens. Only export and share cookie files with devices or individuals you completely trust. ScholarFlow cannot be held responsible for any consequences if your cookie files are leaked due to user action.",
    "sec3_title": "3. Third-Party Academic Verification Services",
    "sec3_p": "To provide citation accuracy verification and DOI cross-checking, the extension sends public, anonymous GET requests solely to recognized open academic repositories:",
    "sec3_li1": "<strong>Crossref Registry & doi.org:</strong> Official validation of Digital Object Identifiers (DOIs).",
    "sec3_li2": "<strong>OpenAlex API (api.openalex.org):</strong> Querying bibliographic metadata from an index of 250M+ scholarly works.",
    "sec3_li3": "<strong>arXiv API (export.arxiv.org):</strong> Resolving computer science and physics preprints.",
    "sec3_li4": "<strong>YouTube oEmbed:</strong> Extracting video titles and educational creator names.",
    "sec3_note": "All network requests are standard public API lookups. <strong>No cookies, user tokens, browsing history, or personal identifiers are ever transmitted.</strong>",
    "sec4_title": "4. User Control & Data Erasure Rights (GDPR & CCPA)",
    "sec4_p": "You maintain complete ownership and control over your research data:",
    "sec4_li1": "<strong>Right to Erasure:</strong> You can selectively delete entries or completely purge all saved citations at any time using the <em>'Clear All'</em> button.",
    "sec4_li2": "<strong>Data Portability:</strong> You can export your saved bibliography into standard <code>.bib</code> (BibTeX) files for independent storage.",
    "sec4_li3": "<strong>Total Cookie Control:</strong> The extension does not automatically save or sync cookies. All import/export operations must be manually triggered by you. You can clear your cookies at any time via your browser's cookie management settings.",
    "sec5_title": "5. Open Source & License",
    "sec5_p": "ScholarFlow is free, open-source software released under the <strong>MIT License</strong>. The entire source code is fully auditable to verify our strict privacy and security commitments.",
    "footer_text": "© 2026 ScholarFlow. Released under MIT License. Dedicated to the global scientific research community.",
    "btn_close": "Close this page"
  },
  "zh": {
    "title": "隐私权政策 – ScholarFlow",
    "lang_vi": "🇻🇳 越南语",
    "lang_en": "🇬🇧 英语",
    "lang_zh": "🇨🇳 中文",
    "lang_ru": "🇷🇺 俄语",
    "lang_ja": "🇯🇵 日语",
    "doc_title": "ScholarFlow – 隐私保护政策与安全承诺",
    "last_updated": "最近更新：2026年9月 | 版本 2.4.1_beta",
    "compliance_badge": "严格遵循 Chrome Web Store 及 Mozilla Add-ons 开发者规范",
    "verified_badge": "100% 本地运算处理 – 绝对不收集任何个人隐私数据",
    "summary_title": "核心承诺 (Privacy by Design)：",
    "summary_desc": "ScholarFlow 遵循<strong>从设计之初即注重隐私 (Privacy by Design)</strong>的最高标准。所有文献引用生成、长网页滚动截屏、屏幕录像以及页面隐私遮蔽处理均<strong>100% 在您的本地浏览器中完成</strong>。本扩展不设任何远程收集服务器，不含任何数据统计分析代码（Zero Telemetry），绝不收集、存储或出售用户隐私信息。",
    "sec1_title": "1. 扩展所处理的数据类型",
    "sec1_p": "ScholarFlow 仅在您主动点击或操作时处理必要的数据：",
    "sec1_li1": "<strong>学术引用文献元数据：</strong> 论文标题、作者姓名、发表日期、出版期刊、DOI 及网页网址。这些数据仅用于排版生成 IEEE、APA 第7版、Harvard、MLA 第9版或 BibTeX 格式，并在您保存时存入浏览器的 <code>chrome.storage.local</code> 本地存储空间中。",
    "sec1_li2": "<strong>屏幕截屏与录屏视频：</strong> 截取的图像帧与视频流直接在设备内存中完成编码，并保存到您的本地磁盘（PNG/WebM）。绝对不会将任何媒体流上传至网络。",
    "sec1_li3": "<strong>页面元素隐私遮蔽 (Redaction)：</strong> 模糊与黑块遮蔽效果直接作用于您本地浏览器的 DOM 树上，帮助您在共享网页或录屏时隐藏敏感信息。关闭标签页后自动清除。",
    "sec1_li4": "<strong>会话 Cookie (Cookie Manager — v2.3.0+)：</strong> Cookie 管理功能允许您<em>在主动请求时</em>读取和写入当前网站的 Cookie。Cookie 仅在您的浏览器内本地处理，<strong>绝不会传输到 ScholarFlow 的任何服务器</strong>。导出的 Cookie 文件（.json 或字符串）直接保存在您的本地计算机上，完全由您掌控。",
    "sec2_title": "2. 浏览器权限透明声明",
    "sec2_p": "依据 Google Chrome 与 Mozilla 开发者平台的最小权限原则 (Least Privilege)：",
    "sec2_li1": "<code>activeTab</code>：仅在您点击扩展时读取当前文献标签页的元数据并执行屏幕截图。",
    "sec2_li2": "<code>scripting</code>：允许注入交互式元素选择器与遮蔽层。",
    "sec2_li3": "<code>storage</code>：将您保存的文献库和自定义偏好设置安全保存在本地存储中。",
    "sec2_li4": "<code>clipboardWrite</code>：支持一键将格式化引用或截屏图像复制到系统剪贴板。",
    "sec2_li5": "<code>sidePanel</code>：在 Chromium 浏览器上提供侧边栏常驻显示，方便并排查阅文献。",
    "sec2_li6": "<code>cookies</code>：<strong>仅用于 Cookie 管理功能。</strong> 此权限允许扩展<em>在您的直接指令下</em>读取和写入当前网站的 Cookie。扩展不会自动读取 Cookie，不会记录历史，也绝不会与任何第三方共享 Cookie。",
    "cookie_note": "⚠️ <strong>Cookie 安全警告：</strong> 会话 Cookie 包含极其敏感的访问凭证。请仅将导出的 Cookie 文件分享给您绝对信任的设备或人员。如果因用户行为导致 Cookie 泄露，ScholarFlow 概不负责。",
    "sec3_title": "3. 第三方开放学术网络接口",
    "sec3_p": "为了验证引用权威性与 DOI 准确性，扩展仅向以下开放学术数据库发起公开匿名 GET 请求：",
    "sec3_li1": "<strong>Crossref API 与 doi.org：</strong> 官方数字对象标识符 (DOI) 校验。",
    "sec3_li2": "<strong>OpenAlex API (api.openalex.org)：</strong> 检索全球 2.5 亿+ 开放学术研究成果。",
    "sec3_li3": "<strong>arXiv API (export.arxiv.org)：</strong> 解析计算机科学与物理学预印本文献。",
    "sec3_li4": "<strong>YouTube oEmbed：</strong> 解析学术与教育视频的官方频道及标题。",
    "sec3_note": "上述所有网络请求皆为公开匿名查询，<strong>绝不携带任何 Cookie、用户凭证、浏览历史或个人身份识别信息</strong>。",
    "sec4_title": "4. 数据控制权与彻底清除 (GDPR & CCPA)",
    "sec4_p": "您对自己的研究数据拥有绝对的控制权：",
    "sec4_li1": "<strong>被遗忘权与清除权：</strong> 您可以随时使用<em>“清空全部”</em>按钮彻底销毁本地保存的所有文献记录。",
    "sec4_li2": "<strong>数据可移植性：</strong> 支持一键将所有引用文献导出为标准 <code>.bib</code> 文件，实现跨平台独立备份。",
    "sec4_li3": "<strong>Cookie 完全由您控制：</strong> 扩展程序不会自动保存或同步 Cookie。所有导入/导出操作均必须由您主动点击触发。您可以随时通过浏览器的 Cookie 管理功能清除 Cookie。",
    "sec5_title": "5. 开源软件与授权许可",
    "sec5_p": "ScholarFlow 是一款采用 <strong>MIT License</strong> 发布的免费开源软件。完整源代码公开透明，供全球开发者与研究人员随时审计验证。",
    "footer_text": "© 2026 ScholarFlow. 基于 MIT 开源协议发布。为全球科研学术工作者竭诚服务。",
    "btn_close": "关闭此页面"
  },
  "ru": {
    "title": "Политика конфиденциальности – ScholarFlow",
    "lang_vi": "🇻🇳 Вьетнамский",
    "lang_en": "🇬🇧 Английский",
    "lang_zh": "🇨🇳 Китайский",
    "lang_ru": "🇷🇺 Русский",
    "lang_ja": "🇯🇵 Японский",
    "doc_title": "ScholarFlow – Политика конфиденциальности и безопасности",
    "last_updated": "Последнее обновление: Сентябрь 2026 | Версия 2.4.1_beta",
    "compliance_badge": "Соответствует требованиям Chrome Web Store и Mozilla Add-ons",
    "verified_badge": "100% Локальная обработка – Гарантия отсутствия сбора данных",
    "summary_title": "Главное обязательство (Privacy by Design):",
    "summary_desc": "ScholarFlow разработан в строгом соответствии с принципами <strong>Privacy by Design (Конфиденциальность по умолчанию)</strong>. Генерация академических цитирований, создание длинных скриншотов со скроллингом, запись видео с экрана и скрытие чувствительных элементов выполняются <strong>на 100% локально в вашем браузере</strong>. Расширение не имеет серверов сбора данных, не содержит телеметрии/аналитики и НИКОГДА не продаёт данные пользователей.",
    "sec1_title": "1. Обрабатываемые данные",
    "sec1_p": "ScholarFlow активируется только при вашем непосредственном взаимодействии:",
    "sec1_li1": "<strong>Библиографические метаданные:</strong> Заголовок статьи, авторы, дата публикации, журнал, DOI и URL страницы. Эти данные используются только для форматирования по стандартам IEEE, APA 7, Harvard, MLA 9 или BibTeX и сохраняются локально в <code>chrome.storage.local</code> по вашему запросу.",
    "sec1_li2": "<strong>Скриншоты и видеозаписи:</strong> Снимки экрана и видеопотоки кодируются непосредственно в оперативной памяти (RAM) устройства и сохраняются на диск (PNG/WebM). Данные не передаются в интернет.",
    "sec1_li3": "<strong>Сокрытие конфиденциальных элементов (Redaction):</strong> Эффекты размытия или затемнения применяются исключительно к DOM-дереву в вашем браузере для безопасной демонстрации экрана. Сбрасываются при закрытии вкладки.",
    "sec1_li4": "<strong>Сессионные файлы cookie (Cookie Manager — v2.3.0+):</strong> Функция управления файлами cookie позволяет вам читать и записывать файлы cookie для текущего веб-сайта <em>только по вашему явному запросу</em>. Файлы cookie обрабатываются исключительно локально в вашем браузере и <strong>никогда не передаются на серверы ScholarFlow</strong>. Экспортированные файлы cookie (.json или строка) сохраняются непосредственно на вашем компьютере и находятся под вашим полным контролем.",
    "sec2_title": "2. Разрешения браузера (Browser Permissions)",
    "sec2_p": "В соответствии с принципом наименьших привилегий Google и Mozilla:",
    "sec2_li1": "<code>activeTab</code>: Чтение метаданных и создание скриншотов только на активной вкладке по вашей команде.",
    "sec2_li2": "<code>scripting</code>: Внедрение интерактивного выбора элементов и масок сокрытия данных.",
    "sec2_li3": "<code>storage</code>: Локальное хранение сохраненной библиографии и настроек языка/формата.",
    "sec2_li4": "<code>clipboardWrite</code>: Быстрое копирование цитирований и изображений в буфер обмена.",
    "sec2_li5": "<code>sidePanel</code>: Поддержка удобной боковой панели на Chromium-браузерах.",
    "sec2_li6": "<code>cookies</code>: <strong>Используется исключительно для функции управления файлами cookie.</strong> Это разрешение позволяет расширению читать и записывать файлы cookie текущего веб-сайта <em>только по вашей прямой команде</em>. Расширение не читает файлы cookie автоматически, не записывает историю и не передает файлы cookie третьим лицам.",
    "cookie_note": "⚠️ <strong>Предупреждение о безопасности файлов cookie:</strong> Сессионные файлы cookie содержат конфиденциальные маркеры доступа. Экспортируйте и делитесь файлами cookie только с доверенными устройствами или лицами. ScholarFlow не несет ответственности за любые последствия, если ваши файлы cookie будут скомпрометированы в результате действий пользователя.",
    "sec3_title": "3. Сторонние академические сервисы",
    "sec3_p": "Для проверки подлинности источников и сверки DOI расширение выполняет публичные анонимные GET-запросы исключительно к открытым базам:",
    "sec3_li1": "<strong>Crossref API и doi.org:</strong> Официальная верификация цифровых идентификаторов DOI.",
    "sec3_li2": "<strong>OpenAlex API (api.openalex.org):</strong> Поиск по 250+ млн открытых научных публикаций.",
    "sec3_li3": "<strong>arXiv API (export.arxiv.org):</strong> Доступ к препринтам по математике и CS.",
    "sec3_li4": "<strong>YouTube oEmbed:</strong> Определение названий и каналов образовательных видео.",
    "sec3_note": "Запросы являются полностью публичными и анонимными. <strong>Никакие файлы cookie, токены пользователя или история посещений не передаются.</strong>",
    "sec4_title": "4. Контроль и удаление данных (GDPR & CCPA)",
    "sec4_p": "Вы сохраняете полный контроль над своей информацией:",
    "sec4_li1": "<strong>Право на удаление:</strong> Вы можете полностью стереть сохраненные данные в любой момент с помощью кнопки <em>'Очистить всё'</em>.",
    "sec4_li2": "<strong>Экспорт данных:</strong> Поддерживается экспорт всех цитирований в стандартный файл <code>.bib</code> (BibTeX).",
    "sec4_li3": "<strong>Полный контроль над Cookie:</strong> Расширение не сохраняет и не синхронизирует файлы cookie автоматически. Все операции экспорта/импорта должны запускаться вами вручную. Вы можете удалить файлы cookie в любое время через настройки вашего браузера.",
    "sec5_title": "5. Авторское право и владение",
    "sec5_p": "ScholarFlow — это бесплатное программное обеспечение с открытым исходным кодом под лицензией <strong>MIT License</strong>. Исходный код доступен для независимого аудита.",
    "footer_text": "© 2026 ScholarFlow. Лицензия MIT. Разработано для исследователей и научного сообщества.",
    "btn_close": "Закрыть страницу"
  },
  "ja": {
    "title": "プライバシーポリシー – ScholarFlow",
    "lang_vi": "🇻🇳 ベトナム語",
    "lang_en": "🇬🇧 英語",
    "lang_zh": "🇨🇳 中国語",
    "lang_ru": "🇷🇺 ロシア語",
    "lang_ja": "🇯🇵 日本語",
    "doc_title": "ScholarFlow – プライバシーポリシー及びセキュリティ規約",
    "last_updated": "最終更新日：2026年9月 | バージョン 2.4.1_beta",
    "compliance_badge": "Chrome Web Store および Mozilla Add-ons 開発者ポリシー準拠",
    "verified_badge": "100% ローカル処理 – 個人データの収集は一切行いません",
    "summary_title": "基本理念 (Privacy by Design)：",
    "summary_desc": "ScholarFlow は、徹底した<strong>プライバシー・バイ・デザイン（設計段階からのプライバシー保護）</strong>の原則に基づいて開発されています。学術引用の生成、長文ページのスクロールキャプチャ、画面録画、機密情報のマスキング（ぼかし処理）はすべて<strong>お使いのブラウザ内部（ローカル環境）で100%処理されます</strong>。外部収集サーバーは存在せず、アクセス解析コード（Telemetry/Analytics）も含まれず、ユーザーのデータを収集、保管、販売することは絶対にありません。",
    "sec1_title": "1. 拡張機能が取り扱うデータについて",
    "sec1_p": "ScholarFlow は、ユーザーが明示的に操作した場合にのみ動作します：",
    "sec1_li1": "<strong>文献引用メタデータ：</strong> 論文のタイトル、著者名、発行日、掲載誌、DOI、URLなど。これらのデータは IEEE、APA 第7版、Harvard、MLA 第9版、BibTeX 形式への整形にのみ使用され、保存を選択した場合にのみブラウザの <code>chrome.storage.local</code> にローカル保存されます。",
    "sec1_li2": "<strong>スクリーンショット及び画面録画：</strong> 撮影された画像やビデオストリームはお使いのデバイスのメモリ上で直接エンコードされ、ローカルディスクに PNG または WebM として保存されます。外部ネットワークへ送信されることは一切ありません。",
    "sec1_li3": "<strong>要素のマスキング・ぼかし（Redaction）：</strong> 画面共有時や画像保存時のプライバシー保護のため、ブラウザの DOM 上に直接ぼかしやブラックアウトを適用します。タブを閉じるかリロードすると自動的に破棄されます。",
    "sec1_li4": "<strong>セッション Cookie (Cookie Manager — v2.3.0+):</strong> Cookie マネージャー機能は、<em>あなたの明示的な要求があった場合にのみ</em>、現在のウェブサイトの Cookie を読み書きすることを許可します。Cookie はブラウザ内で完全にローカル処理され、<strong>ScholarFlow のサーバーに送信されることは決してありません</strong>。エクスポートされた Cookie ファイル (.json または文字列) はローカルマシンに直接保存され、完全にあなたの管理下に置かれます。",
    "sec2_title": "2. ブラウザ権限の透明性に関する開示",
    "sec2_p": "Google および Mozilla の最小権限の原則 (Principle of Least Privilege) に基づき、必要最小限の権限のみを要求します：",
    "sec2_li1": "<code>activeTab</code>：ユーザーが拡張機能を操作した際にのみ、現在開いている学術タブから引用情報を取得し、スクリーンショットを撮影します。",
    "sec2_li2": "<code>scripting</code>：ユーザーの指示に応じて要素選択ツールやマスキングフィルターを画面に挿入します。",
    "sec2_li3": "<code>storage</code>：保存した引用文献リストやお好みの設定（引用形式、言語設定など）をローカルに安全に保持します。",
    "sec2_li4": "<code>clipboardWrite</code>：整形された引用文やキャプチャ画像をクリップボードにワンクリックでコピーできます。",
    "sec2_li5": "<code>sidePanel</code>：Chromium系ブラウザでドキュメントと並行して作業できるサイドバー機能を提供します。",
    "sec2_li6": "<code>cookies</code>: <strong>Cookie マネージャー機能のためにのみ使用されます。</strong> この権限は、<em>あなたの直接の指示があった場合にのみ</em>、拡張機能が現在のウェブサイトの Cookie を読み書きすることを許可します。拡張機能が自動的に Cookie を読み取ったり、履歴を記録したり、サードパーティと Cookie を共有したりすることはありません。",
    "cookie_note": "⚠️ <strong>Cookie のセキュリティ警告:</strong> セッション Cookie には非常に機密性の高いアクセス権が含まれています。エクスポートした Cookie ファイルは、完全に信頼できるデバイスや人物とのみ共有してください。ユーザーの操作によって Cookie ファイルが流出した場合の結果について、ScholarFlow は一切の責任を負いません。",
    "sec3_title": "3. 第三者学術機関への照会について",
    "sec3_p": "文献の信頼性検証および DOI 照合のため、以下の国際的なオープン学術データベースに対して公開匿名 GET リクエストのみを送信します：",
    "sec3_li1": "<strong>Crossref API & doi.org：</strong> 公式な電子オブジェクト識別子 (DOI) の照合・確認。",
    "sec3_li2": "<strong>OpenAlex API (api.openalex.org)：</strong> 全世界2.5億件以上のオープン学術論文データの検索。",
    "sec3_li3": "<strong>arXiv API (export.arxiv.org)：</strong> 計算機科学・物理学等のプレプリント情報の取得。",
    "sec3_li4": "<strong>YouTube oEmbed：</strong> 学術・教育系動画の公式タイトルおよびチャンネル名の取得。",
    "sec3_note": "上記のリクエストはすべて公開された匿名検索です。<strong>クッキー、ユーザー識別子、閲覧履歴などの個人情報は一切送信されません。</strong>",
    "sec4_title": "4. データの管理権と削除（GDPR・CCPA対応）",
    "sec4_p": "ユーザーは自身の研究データに対して完全な権利を有します：",
    "sec4_li1": "<strong>データの消去権：</strong> 保存された引用データは、拡張機能内の<em>「すべて消去」</em>ボタンからいつでも完全に削除できます。",
    "sec4_li2": "<strong>データのエクスポート：</strong> 保存した全文献を標準の <code>.bib</code> (BibTeX) 形式で一括書き出し・保存が可能です。",
    "sec4_li3": "<strong>Cookie の完全な管理：</strong> 拡張機能が Cookie を自動的に保存または同期することはありません。すべてのインポート/エクスポート操作は、ユーザーの明示的なクリックによってのみ実行されます。ブラウザの Cookie 管理機能を通じて、いつでも Cookie を削除できます。",
    "sec5_title": "5. 著作権と所有権",
    "sec5_p": "ScholarFlow は <strong>Minh Thuận</strong> によって独自に開発されたプロプライエタリソフトウェアです。すべてのコードは100%ローカルで実行され、個人データを収集しないことが厳格に保証されています。",
    "footer_text": "© 2026 ScholarFlow. 著作権所有 Minh Thuận。高度な学術研究ユーティリティ。",
    "btn_close": "このページを閉じる"
  }
};

    function applyPrivacyLanguage(lang) {
      const data = PRIVACY_I18N[lang] || PRIVACY_I18N["vi"];
      document.documentElement.lang = lang;
      document.title = data.title;
      
      const setText = (id, txt) => {
        const el = document.getElementById(id);
        if (el) el.textContent = txt;
      };
      const setHtml = (id, html) => {
        const el = document.getElementById(id);
        if (el) {
          const doc = new DOMParser().parseFromString(html, "text/html");
          el.replaceChildren(...doc.body.childNodes);
        }
      };

      setText("doc-title", data.doc_title);
      setText("last-updated", data.last_updated);
      setText("compliance-badge-text", data.compliance_badge);
      setText("verified-badge-text", data.verified_badge);
      setHtml("summary-title", data.summary_title);
      setHtml("summary-desc", data.summary_desc);
      setText("sec1-title", data.sec1_title);
      setText("sec1-p", data.sec1_p);
      setHtml("sec1-li1", data.sec1_li1);
      setHtml("sec1-li2", data.sec1_li2);
      setHtml("sec1-li3", data.sec1_li3);
      setHtml("sec1-li4", data.sec1_li4);
      setText("sec2-title", data.sec2_title);
      setText("sec2-p", data.sec2_p);
      setHtml("sec2-li1", data.sec2_li1);
      setHtml("sec2-li2", data.sec2_li2);
      setHtml("sec2-li3", data.sec2_li3);
      setHtml("sec2-li4", data.sec2_li4);
      setHtml("sec2-li5", data.sec2_li5);
      setHtml("sec2-li6", data.sec2_li6);
      setHtml("cookie-note", data.cookie_note);
      setText("sec3-title", data.sec3_title);
      setText("sec3-p", data.sec3_p);
      setHtml("sec3-li1", data.sec3_li1);
      setHtml("sec3-li2", data.sec3_li2);
      setHtml("sec3-li3", data.sec3_li3);
      setHtml("sec3-li4", data.sec3_li4);
      setHtml("sec3-note", data.sec3_note);
      setText("sec4-title", data.sec4_title);
      setText("sec4-p", data.sec4_p);
      setHtml("sec4-li1", data.sec4_li1);
      setHtml("sec4-li2", data.sec4_li2);
      if (data.sec4_li3) setHtml("sec4-li3", data.sec4_li3);
      setText("sec5-title", data.sec5_title);
      setHtml("sec5-p", data.sec5_p);
      setText("footer-text", data.footer_text);
      setText("btn-close-page", data.btn_close);
      
      // Update language names in dropdown based on current language
      if (data.lang_vi) setText("opt-vi", data.lang_vi);
      if (data.lang_en) setText("opt-en", data.lang_en);
      if (data.lang_zh) setText("opt-zh", data.lang_zh);
      if (data.lang_ru) setText("opt-ru", data.lang_ru);
      if (data.lang_ja) setText("opt-ja", data.lang_ja);

      const sel = document.getElementById("select-privacy-lang");
      if (sel && sel.value !== lang) sel.value = lang;
    }
    function onReady(fn) {
      if (document.readyState !== "loading") {
        fn();
      } else {
        document.addEventListener("DOMContentLoaded", fn);
      }
    }

    onReady(() => {
      const sel = document.getElementById("select-privacy-lang");
      
      // 1. Detect language from storage or url or navigator
      const urlParams = new URLSearchParams(window.location.search);
      const urlLang = urlParams.get("lang");

      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get("app_language", (res) => {
          const savedLang = urlLang || (res && res.app_language) || "vi";
          applyPrivacyLanguage(savedLang);
        });
      } else {
        applyPrivacyLanguage(urlLang || "vi");
      }

      // 2. Language switcher event
      if (sel) {
        sel.addEventListener("change", (e) => {
          const newLang = e.target.value;
          applyPrivacyLanguage(newLang);
          if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
            chrome.storage.local.set({ app_language: newLang });
          }
        });
      }

      // 3. Close button
      document.getElementById("btn-close-page")?.addEventListener("click", () => {
        window.close();
      });
    });