import re

with open('/mnt/c/TakaExtension/OS/js/i18n.js', 'r', encoding='utf-8') as f:
    code = f.read()

def inject(code, target, new_dict):
    inject_str = target + ',\n'
    for k, v in new_dict.items():
        inject_str += f'    "{k}": "{v}",\n'
    inject_str = inject_str.rstrip(',\n')
    return code.replace(target, inject_str)

vi_new = {
    "tip_download_bib2": "Tải file references.bib cho LaTeX/Overleaf",
    "bib_empty_title": "Chưa có trích dẫn nào được lưu",
    "bib_empty_desc": "Bấm nút ➕ Lưu ở Tab 1 để thêm bài báo hoặc trang web vào danh mục."
}

en_new = {
    "tip_download_bib2": "Download references.bib for LaTeX/Overleaf",
    "bib_empty_title": "No citations saved yet",
    "bib_empty_desc": "Click the ➕ Save button in Tab 1 to add an article or webpage.",
    "tip_lang": "Language",
    "tip_trust_center": "Trust, Security & Standards Center",
    "tip_tab_cite": "Academic Citation & Research",
    "tip_tab_redact": "Information Security & Redaction",
    "tip_tab_capture": "Element Capture & Screen Recording",
    "tip_ieee": "IEEE Standard (IT & Engineering)",
    "tip_apa": "APA 7th Standard (Science & Projects)",
    "tip_harvard": "Harvard Standard (Business & Management)",
    "tip_bibtex": "BibTeX for LaTeX, Overleaf, ACM",
    "tip_mla": "MLA 9th Standard (Humanities & Journalism)",
    "tip_intext": "In-text citations",
    "tip_copy_cite": "Copy current citation to Clipboard",
    "tip_refresh_cite": "Reload and extract latest data from current page",
    "tip_save_biblio": "Save to bibliography [1], [2]...",
    "tip_download_bib": "Download .bib file for LaTeX / Overleaf",
    "tip_upload_pdf": "Load local PDF or drag & drop for auto-extraction",
    "tip_verify_paste": "Quick paste from Clipboard",
    "tip_verify_current": "Get title of current web page",
    "tip_verify_real": "Open official article page (DOI / Publisher Link)",
    "tip_verify_pdf": "Open free full-text PDF",
    "tip_verify_google": "Search on Google to verify article, news or video",
    "tip_verify_scholar": "Search on Google Scholar",
    "tip_verify_crossref": "Verify on Crossref DOI system",
    "tip_verify_apply": "Apply this verified data to the citation editor",
    "tip_enable_redact": "Re-enable blur / blackout effects",
    "tip_disable_redact": "Temporarily disable redactions to view original content",
    "tip_cap_element": "Select element or drag freely, with 8-point resize before capturing!",
    "tip_cap_fullpage": "Auto-scroll and eliminate sticky nav duplication bugs!",
    "tip_copy_all": "Copy entire bibliography in selected format",
    "tip_export_txt": "Download references.txt for Word",
    "tip_trust_version": "Current version",
    "tip_trust_author": "Developed by Minh Thuận",
    "tip_clear_input": "Clear content",
    "tip_swap_tabs": "Instantly swap between 2 web pages (Shortcut: Alt + Q)",
    "tip_pick_tab": "Select another open tab",
    "tip_tab_a": "Current Page (A)",
    "tip_swap_arrow": "Click to swap pages (Alt+Q)",
    "tip_tab_b": "Recent Page / Link (B) - Click to switch"
}

zh_new = {
    "tip_download_bib2": "下载适用于 LaTeX/Overleaf 的 references.bib 文件",
    "bib_empty_title": "暂无已保存的引用",
    "bib_empty_desc": "在选项卡 1 中点击 ➕ 保存按钮，添加文章或网页至目录。",
    "tip_lang": "语言",
    "tip_trust_center": "信任、安全与标准中心",
    "tip_tab_cite": "学术引用与研究",
    "tip_tab_redact": "信息安全与隐去",
    "tip_tab_capture": "元素捕获与屏幕录像",
    "tip_ieee": "IEEE 标准 (IT与工程)",
    "tip_apa": "APA 第7版 (科学与项目)",
    "tip_harvard": "哈佛标准 (商业与管理)",
    "tip_bibtex": "适用于 LaTeX, Overleaf, ACM 的 BibTeX",
    "tip_mla": "MLA 第9版 (人文与新闻)",
    "tip_intext": "文中引用",
    "tip_copy_cite": "将当前引用复制到剪贴板",
    "tip_refresh_cite": "重新加载并提取当前页面的最新数据",
    "tip_save_biblio": "保存至参考文献目录 [1], [2]...",
    "tip_download_bib": "下载适用于 LaTeX / Overleaf 的 .bib 文件",
    "tip_upload_pdf": "加载本地PDF或拖放以自动提取",
    "tip_verify_paste": "从剪贴板快速粘贴",
    "tip_verify_current": "获取当前网页的标题",
    "tip_verify_real": "打开官方文章页面 (DOI / 发布者链接)",
    "tip_verify_pdf": "打开免费的全文 PDF",
    "tip_verify_google": "在 Google 上搜索以验证文章、新闻或视频",
    "tip_verify_scholar": "在 Google Scholar 上搜索",
    "tip_verify_crossref": "在 Crossref DOI 系统上验证",
    "tip_verify_apply": "将此验证后的数据应用到引用编辑器中",
    "tip_enable_redact": "重新启用模糊/黑块效果",
    "tip_disable_redact": "暂时禁用遮蔽以查看原始内容",
    "tip_cap_element": "选择元素或自由拖动，捕获前支持8点调整大小！",
    "tip_cap_fullpage": "自动滚动并消除固定导航栏的重复错误！",
    "tip_copy_all": "以所选格式复制整个参考文献目录",
    "tip_export_txt": "下载适用于 Word 的 references.txt",
    "tip_trust_version": "当前版本",
    "tip_trust_author": "由 Minh Thuận 开发",
    "tip_clear_input": "清除内容",
    "tip_swap_tabs": "在2个网页之间即时切换 (快捷键: Alt + Q)",
    "tip_pick_tab": "选择另一个打开的标签页",
    "tip_tab_a": "当前页面 (A)",
    "tip_swap_arrow": "点击以切换页面 (Alt+Q)",
    "tip_tab_b": "最近的页面/链接 (B) - 点击以切换"
}

ru_new = {
    "tip_download_bib2": "Скачать файл references.bib для LaTeX/Overleaf",
    "bib_empty_title": "Пока нет сохраненных цитат",
    "bib_empty_desc": "Нажмите кнопку ➕ Сохранить на вкладке 1, чтобы добавить статью или веб-страницу.",
    "tip_lang": "Язык",
    "tip_trust_center": "Центр доверия, безопасности и стандартов",
    "tip_tab_cite": "Академическое цитирование и исследования",
    "tip_tab_redact": "Информационная безопасность и редактирование",
    "tip_tab_capture": "Захват элементов и запись экрана",
    "tip_ieee": "Стандарт IEEE (IT и инженерия)",
    "tip_apa": "Стандарт APA 7 (Наука и проекты)",
    "tip_harvard": "Гарвардский стандарт (Бизнес и менеджмент)",
    "tip_bibtex": "BibTeX для LaTeX, Overleaf, ACM",
    "tip_mla": "Стандарт MLA 9 (Гуманитарные науки и журналистика)",
    "tip_intext": "Внутритекстовые ссылки",
    "tip_copy_cite": "Скопировать текущую цитату в буфер обмена",
    "tip_refresh_cite": "Перезагрузить и извлечь последние данные с текущей страницы",
    "tip_save_biblio": "Сохранить в библиографию [1], [2]...",
    "tip_download_bib": "Скачать файл .bib для LaTeX / Overleaf",
    "tip_upload_pdf": "Загрузить локальный PDF или перетащить для авто-извлечения",
    "tip_verify_paste": "Быстрая вставка из буфера обмена",
    "tip_verify_current": "Получить заголовок текущей веб-страницы",
    "tip_verify_real": "Открыть официальную страницу статьи (DOI / Ссылка на издателя)",
    "tip_verify_pdf": "Открыть бесплатный полный текст PDF",
    "tip_verify_google": "Поиск в Google для проверки статьи, новостей или видео",
    "tip_verify_scholar": "Поиск в Google Scholar",
    "tip_verify_crossref": "Проверка в системе Crossref DOI",
    "tip_verify_apply": "Применить эти проверенные данные в редактор цитат",
    "tip_enable_redact": "Включить эффекты размытия / затемнения",
    "tip_disable_redact": "Временно отключить скрытие, чтобы просмотреть исходный контент",
    "tip_cap_element": "Выберите элемент или свободно перетаскивайте, с 8 точками для изменения размера перед захватом!",
    "tip_cap_fullpage": "Авто-прокрутка и устранение ошибок дублирования фиксированной панели навигации!",
    "tip_copy_all": "Скопировать всю библиографию в выбранном формате",
    "tip_export_txt": "Скачать references.txt для Word",
    "tip_trust_version": "Текущая версия",
    "tip_trust_author": "Разработано Minh Thuận",
    "tip_clear_input": "Очистить контент",
    "tip_swap_tabs": "Мгновенное переключение между 2 веб-страницами (Горячая клавиша: Alt + Q)",
    "tip_pick_tab": "Выбрать другую открытую вкладку",
    "tip_tab_a": "Текущая страница (A)",
    "tip_swap_arrow": "Нажмите, чтобы переключить страницы (Alt+Q)",
    "tip_tab_b": "Недавняя страница / Ссылка (B) - Нажмите для переключения"
}

ja_new = {
    "tip_download_bib2": "LaTeX/Overleaf用の references.bib をダウンロード",
    "bib_empty_title": "保存された引用はまだありません",
    "bib_empty_desc": "タブ1の ➕ 保存ボタンをクリックして、記事やウェブページを追加してください。",
    "tip_lang": "言語",
    "tip_trust_center": "トラスト、セキュリティ、標準センター",
    "tip_tab_cite": "学術引用と調査",
    "tip_tab_redact": "情報セキュリティと墨塗り",
    "tip_tab_capture": "要素のキャプチャと画面録画",
    "tip_ieee": "IEEE 標準 (ITとエンジニアリング)",
    "tip_apa": "APA 第7版 (科学とプロジェクト)",
    "tip_harvard": "ハーバード標準 (ビジネスと管理)",
    "tip_bibtex": "LaTeX, Overleaf, ACM 用の BibTeX",
    "tip_mla": "MLA 第9版 (人文とジャーナリズム)",
    "tip_intext": "本文中の引用",
    "tip_copy_cite": "現在の引用をクリップボードにコピー",
    "tip_refresh_cite": "再読み込みして現在のページから最新データを抽出",
    "tip_save_biblio": "参考文献に保存 [1], [2]...",
    "tip_download_bib": "LaTeX / Overleaf 用の .bib ファイルをダウンロード",
    "tip_upload_pdf": "ローカルPDFを読み込むか、ドラッグ＆ドロップで自動抽出",
    "tip_verify_paste": "クリップボードからクイック貼り付け",
    "tip_verify_current": "現在のウェブページのタイトルを取得",
    "tip_verify_real": "公式記事ページを開く (DOI / 発行者リンク)",
    "tip_verify_pdf": "無料のフルテキストPDFを開く",
    "tip_verify_google": "Googleで検索して記事、ニュース、動画を検証",
    "tip_verify_scholar": "Google Scholar で検索",
    "tip_verify_crossref": "Crossref DOI システムで検証",
    "tip_verify_apply": "検証済みデータを引用エディタに適用",
    "tip_enable_redact": "ぼかし / 黒塗り効果を再有効化",
    "tip_disable_redact": "元のコンテンツを表示するために墨塗りを一時的に無効化",
    "tip_cap_element": "要素を選択するか自由にドラッグし、キャプチャ前に8ポイントのサイズ変更が可能！",
    "tip_cap_fullpage": "自動スクロールと固定ナビゲーションの重複エラーを排除！",
    "tip_copy_all": "選択した形式で全体の参考文献をコピー",
    "tip_export_txt": "Word 用の references.txt をダウンロード",
    "tip_trust_version": "現在のバージョン",
    "tip_trust_author": "Minh Thuận によって開発されました",
    "tip_clear_input": "コンテンツをクリア",
    "tip_swap_tabs": "2つのウェブページ間を瞬時に切り替え (ショートカット: Alt + Q)",
    "tip_pick_tab": "別の開いているタブを選択",
    "tip_tab_a": "現在のページ (A)",
    "tip_swap_arrow": "クリックしてページを切り替え (Alt+Q)",
    "tip_tab_b": "最近のページ / リンク (B) - クリックして切り替え"
}

code = inject(code, '"trust_footer_privacy": "Chính sách bảo mật"', vi_new)
code = inject(code, '"trust_footer_privacy": "Privacy Policy"', en_new)
code = inject(code, '"trust_footer_privacy": "隐私权政策"', zh_new)
code = inject(code, '"trust_footer_privacy": "Политика конфиденциальности"', ru_new)
code = inject(code, '"trust_footer_privacy": "プライバシーポリシー"', ja_new)

with open('/mnt/c/TakaExtension/OS/js/i18n.js', 'w', encoding='utf-8') as f:
    f.write(code)

print("Injected translations FAST!")
