import re
import os
import sys

html_files = [
    "/mnt/c/TakaExtension/OS/html/sidebar.html",
    "/mnt/c/TakaExtension/OS/html/popup.html",
    "/mnt/c/TakaExtension/OS/html/privacy.html"
]

locale_vi_path = "/mnt/c/TakaExtension/OS/locales/vi.js"

# 1. Extract all keys from HTML
attr_keys = set()
for hf in html_files:
    if not os.path.exists(hf): continue
    with open(hf, "r", encoding="utf-8") as f:
        content = f.read()
        # find data-i18n-placeholder="key"
        placeholders = re.findall(r'data-i18n-placeholder="([^"]+)"', content)
        # find data-i18n-title="key"
        titles = re.findall(r'data-i18n-title="([^"]+)"', content)
        # find data-i18n="key"
        texts = re.findall(r'data-i18n="([^"]+)"', content)
        
        attr_keys.update(placeholders)
        attr_keys.update(titles)
        attr_keys.update(texts)

# 2. Extract keys from vi.js
with open(locale_vi_path, "r", encoding="utf-8") as f:
    js_content = f.read()

# Match standard key format in the dictionary: "key": "value", or key: "value"
js_keys = set(re.findall(r'["\']?([a-zA-Z0-9_]+)["\']?\s*:\s*["\'`]', js_content))

missing_in_js = attr_keys - js_keys

if missing_in_js:
    print("❌ MISSING KEYS IN vi.js:")
    for k in sorted(missing_in_js):
        print(f"  - {k}")
else:
    print("✅ All data-i18n, data-i18n-placeholder, and data-i18n-title keys are present in vi.js!")
