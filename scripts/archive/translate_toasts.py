import re
import os

locales_dir = "/mnt/c/TakaExtension/OS/locales"

# These are the hardcoded Vietnamese strings found in sidebar.js that need translation
toast_dict = {
    "📋 Bộ nhớ tạm (Clipboard) đang trống!": {
        "en": "📋 Clipboard is empty!",
        "zh": "📋 剪贴板为空！",
        "ru": "📋 Буфер обмена пуст!",
        "ja": "📋 クリップボードは空です！"
    },
    "💡 Hãy bấm phím Ctrl+V vào ô để dán!": {
        "en": "💡 Press Ctrl+V in the box to paste!",
        "zh": "💡 请在框内按 Ctrl+V 粘贴！",
        "ru": "💡 Нажмите Ctrl+V в поле для вставки!",
        "ja": "💡 ボックス内で Ctrl+V を押して貼り付けてください！"
    },
    "Chưa nhận diện được tiêu đề hoặc URL trang hiện tại!": {
        "en": "Could not identify title or URL of current page!",
        "zh": "无法识别当前页面的标题或 URL！",
        "ru": "Не удалось определить заголовок или URL текущей страницы!",
        "ja": "現在のページのタイトルまたは URL を識別できませんでした！"
    },
    "Bật chọn che": {
        "en": "Select Redact",
        "zh": "选择脱敏",
        "ru": "Скрыть элементы",
        "ja": "要素を隠す"
    },
    "Dừng chọn": {
        "en": "Stop selection",
        "zh": "停止选择",
        "ru": "Остановить выбор",
        "ja": "選択を停止"
    },
    "Bật che": {
        "en": "Enable Redact",
        "zh": "启用脱敏",
        "ru": "Включить сокрытие",
        "ja": "非表示を有効化"
    },
    "Xem bản gốc": {
        "en": "View Original",
        "zh": "查看原网页",
        "ru": "Оригинал",
        "ja": "オリジナルを表示"
    },
    "Chưa có phần tử nào được che": {
        "en": "No redacted elements yet",
        "zh": "暂无脱敏元素",
        "ru": "Нет скрытых элементов",
        "ja": "隠された要素はありません"
    },
    "Bấm \"Bật chọn che\" rồi nhấp vào đối tượng trên trang để bảo mật.": {
        "en": "Click 'Select Redact' then click objects on the page to secure.",
        "zh": "点击“选择脱敏”，然后点击页面上的对象进行保护。",
        "ru": "Нажмите 'Скрыть элементы', затем выберите объекты на странице.",
        "ja": "「要素を隠す」をクリックし、ページ上のオブジェクトをクリックして保護します。"
    }
}

for lang in ["en", "zh", "ru", "ja"]:
    lf = os.path.join(locales_dir, f"{lang}.js")
    if not os.path.exists(lf): continue
    
    with open(lf, "r", encoding="utf-8") as f:
        content = f.read()
        
    for vi_key, trans_dict in toast_dict.items():
        val = trans_dict[lang]
        # check if key already exists
        if f'"{vi_key}"' not in content:
            # properly escape quotes in key and val
            escaped_key = vi_key.replace('"', '\\"')
            escaped_val = val.replace('"', '\\"')
            content = re.sub(r'\n};', f',\n  "{escaped_key}": "{escaped_val}"\n}};', content)
            
    with open(lf, "w", encoding="utf-8") as f:
        f.write(content)

print("Toasts added to locales.")
import re, os
locales_dir = "/mnt/c/TakaExtension/OS/locales"
toast_dict = {
    "Rê chuột để soi vị trí trên trang web, click để cuộn tới": {
        "en": "Hover to locate on page, click to scroll to",
        "zh": "悬停以在页面上定位，点击以滚动到",
        "ru": "Наведите, чтобы найти на странице, кликните для перехода",
        "ja": "ホバーしてページ上の位置を確認、クリックしてスクロール"
    },
    "Gỡ bỏ che phần tử này": {
        "en": "Remove redaction for this element",
        "zh": "移除此元素的脱敏",
        "ru": "Удалить скрытие этого элемента",
        "ja": "この要素の非表示を解除"
    },
    "Trang hiện tại": {
        "en": "Current Page", "zh": "当前页面", "ru": "Текущая страница", "ja": "現在のページ"
    },
    "Chưa có trang phụ": {
        "en": "No linked page", "zh": "无关联页面", "ru": "Нет связанной страницы", "ja": "リンクされたページなし"
    }
}
for lang in ["en", "zh", "ru", "ja"]:
    lf = os.path.join(locales_dir, f"{lang}.js")
    with open(lf, "r", encoding="utf-8") as f: content = f.read()
    for vi_key, trans_dict in toast_dict.items():
        if f'"{vi_key}"' not in content:
            content = re.sub(r'\n};', f',\n  "{vi_key}": "{trans_dict[lang]}"\n}};', content)
    with open(lf, "w", encoding="utf-8") as f: f.write(content)
print("More toasts added.")
