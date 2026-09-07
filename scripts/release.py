import os
import sys
import re
import zipfile
import shutil

if len(sys.argv) < 2:
    print("Usage: python release.py <version> (e.g., 2.1.6)")
    sys.exit(1)

new_version = sys.argv[1].replace('v', '')
script_dir = os.path.dirname(os.path.abspath(__file__))
src_dir = os.path.dirname(script_dir)

print(f"Bumping everything to v{new_version}...")

# 1. Update manifest_chrome.json and manifest_firefox.json
for m in ['manifest_chrome.json', 'manifest_firefox.json', 'manifest.json']:
    path = os.path.join(src_dir, m)
    if not os.path.exists(path): continue
    with open(path, 'r', encoding='utf-8') as f:
        code = f.read()
    code = re.sub(r'"version":\s*"[^"]+"', f'"version": "{new_version}"', code)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(code)

# 2. Update privacy.html
privacy_path = os.path.join(src_dir, 'OS', 'html', 'privacy.html')
if os.path.exists(privacy_path):
    with open(privacy_path, 'r', encoding='utf-8') as f:
        code_priv = f.read()
    code_priv = re.sub(r'(Phiên bản|Version|版本|Версия|バージョン) \d+\.\d+\.\d+', rf'\1 {new_version}', code_priv)
    with open(privacy_path, 'w', encoding='utf-8') as f:
        f.write(code_priv)

# 3. Update sidebar.html and popup.html hardcoded fallback
for m in ['sidebar.html', 'popup.html']:
    path = os.path.join(src_dir, 'OS', 'html', m)
    if not os.path.exists(path): continue
    with open(path, 'r', encoding='utf-8') as f:
        code_html = f.read()
    code_html = re.sub(r'<span id="app-version-display">v\d+\.\d+\.\d+</span>', f'<span id="app-version-display">v{new_version}</span>', code_html)
    code_html = re.sub(r'ScholarFlow v\d+\.\d+\.\d+', f'ScholarFlow v{new_version}', code_html)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(code_html)

# 4. Update i18n.js version strings
i18n_path = os.path.join(src_dir, 'OS', 'js', 'i18n.js')
if os.path.exists(i18n_path):
    with open(i18n_path, 'r', encoding='utf-8') as f:
        code_i18n = f.read()
    code_i18n = re.sub(r'ScholarFlow v\d+\.\d+\.\d+', f'ScholarFlow v{new_version}', code_i18n)
    with open(i18n_path, 'w', encoding='utf-8') as f:
        f.write(code_i18n)

# 5. Build ZIPs
dist_dir = os.path.join(src_dir, 'dist')
os.makedirs(dist_dir, exist_ok=True)


def add_files_to_zip(zf, source_dir):
    for icon in ['icon16.png', 'icon48.png', 'icon128.png', 'icon.png', 'icon.svg']:
        icon_path = os.path.join(source_dir, icon)
        if os.path.exists(icon_path): zf.write(icon_path, icon)
    os_dir = os.path.join(source_dir, 'OS')
    for root, _, files in os.walk(os_dir):
        for f in files:
            abs_path = os.path.join(root, f)
            zf.write(abs_path, os.path.relpath(abs_path, source_dir))

chrome_zip_path = os.path.join(dist_dir, f'ScholarFlow_Chrome_v{new_version}.zip')
with zipfile.ZipFile(chrome_zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
    zf.write(os.path.join(src_dir, 'manifest_chrome.json'), 'manifest.json')
    add_files_to_zip(zf, src_dir)

firefox_zip_path = os.path.join(dist_dir, f'ScholarFlow_Firefox_v{new_version}.zip')
with zipfile.ZipFile(firefox_zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
    zf.write(os.path.join(src_dir, 'manifest_firefox.json'), 'manifest.json')
    add_files_to_zip(zf, src_dir)


print("=" * 60)
print(f"  ✓ ĐÃ ĐỒNG BỘ MỌI THỨ LÊN v{new_version} & ĐÓNG GÓI THÀNH CÔNG!")
print("=" * 60)
print(f"1. Gói Chrome Web Store:  {chrome_zip_path}")
print(f"2. Gói Mozilla Add-ons:    {firefox_zip_path}")
print("=" * 60)
