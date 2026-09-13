import re
import os

html_files = ["/mnt/c/TakaExtension/OS/html/popup.html", "/mnt/c/TakaExtension/OS/html/sidebar.html"]
locales_dir = "/mnt/c/TakaExtension/OS/locales"

# 1. Update HTML files
for hf in html_files:
    with open(hf, "r", encoding="utf-8") as f:
        html = f.read()
    
    # Add data-i18n-placeholder to f-doi
    html = re.sub(r'(id="f-doi"\s+placeholder="[^"]+")(?!\s*data-i18n-placeholder)', 
                  r'\1 data-i18n-placeholder="placeholder_doi"', html)
                  
    # Add data-i18n-placeholder to f-pages
    html = re.sub(r'(id="f-pages"\s+placeholder="[^"]+")(?!\s*data-i18n-placeholder)', 
                  r'\1 data-i18n-placeholder="placeholder_pages"', html)
                  
    # Add data-i18n-placeholder to f-url
    html = re.sub(r'(id="f-url"\s+placeholder="[^"]+")(?!\s*data-i18n-placeholder)', 
                  r'\1 data-i18n-placeholder="placeholder_url"', html)
                  
    # Fix notify in popup.html (sidebar already has it, but might as well ensure both)
    html = re.sub(r'<div\s+id="notify"\s+class="notify">', 
                  r'<div id="notify" class="notify" data-i18n="notify_success">', html)
                  
    with open(hf, "w", encoding="utf-8") as f:
        f.write(html)

# 2. Update locales
updates = {
    "vi": {
        "placeholder_doi": "Vd: 10.xxxx/yyyy",
        "placeholder_pages": "Vd: vol. 1, pp. 1-10",
        "placeholder_url": "https://...",
        "notify_success": "✓ Thành công!"
    },
    "en": {
        "placeholder_doi": "e.g., 10.xxxx/yyyy",
        "placeholder_pages": "e.g., vol. 1, pp. 1-10",
        "placeholder_url": "https://...",
        "notify_success": "✓ Success!"
    },
    "zh": {
        "placeholder_doi": "例如：10.xxxx/yyyy",
        "placeholder_pages": "例如：vol. 1, pp. 1-10",
        "placeholder_url": "https://...",
        "notify_success": "✓ 成功！"
    },
    "ru": {
        "placeholder_doi": "Напр.: 10.xxxx/yyyy",
        "placeholder_pages": "Напр.: vol. 1, pp. 1-10",
        "placeholder_url": "https://...",
        "notify_success": "✓ Успешно!"
    },
    "ja": {
        "placeholder_doi": "例: 10.xxxx/yyyy",
        "placeholder_pages": "例: vol. 1, pp. 1-10",
        "placeholder_url": "https://...",
        "notify_success": "✓ 成功！"
    }
}

for lang, items in updates.items():
    lf = os.path.join(locales_dir, f"{lang}.js")
    if not os.path.exists(lf): continue
    
    with open(lf, "r", encoding="utf-8") as f:
        content = f.read()
        
    # Inject at the end of the dictionary
    for key, val in items.items():
        if f'"{key}"' not in content:
            # find the last comma and brace
            content = re.sub(r'\n};', f',\n  "{key}": "{val}"\n}};', content)
            
    with open(lf, "w", encoding="utf-8") as f:
        f.write(content)

print("HTML and Locales updated successfully.")
