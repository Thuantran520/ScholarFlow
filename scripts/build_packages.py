import json
import os
import shutil
import subprocess
import sys
import zipfile

print("Running Privacy Sync Check...")
check_script = os.path.join(os.path.dirname(__file__), "check_privacy_sync.py")
if os.path.exists(check_script):
    res = subprocess.run([sys.executable, check_script])
    if res.returncode != 0:
        print("❌ Dừng đóng gói do lỗi không đồng bộ ngôn ngữ!")
        sys.exit(1)

script_dir = os.path.dirname(os.path.abspath(__file__))
src_dir = os.path.dirname(script_dir)
dist_dir = os.path.join(src_dir, 'dist')
os.makedirs(dist_dir, exist_ok=True)

# Read version dynamically from manifest_firefox.json
manifest_path = os.path.join(src_dir, 'manifest_firefox.json')
version = "2.4.2"
try:
    with open(manifest_path, 'r', encoding='utf-8') as f:
        version = json.load(f).get("version", "2.4.2")
except Exception:
    pass

def add_files_to_zip(zf, source_dir):
    # Add root icons
    for icon in ['icon16.png', 'icon48.png', 'icon128.png', 'icon.png', 'icon.svg']:
        icon_path = os.path.join(source_dir, icon)
        if os.path.exists(icon_path):
            zf.write(icon_path, icon)
    # Recursively add OS folder
    os_dir = os.path.join(source_dir, 'OS')
    for root, _, files in os.walk(os_dir):
        for f in files:
            abs_path = os.path.join(root, f)
            rel_path = os.path.relpath(abs_path, source_dir).replace('\\', '/')
            zf.write(abs_path, rel_path)

# 1. Package Chrome / Edge
chrome_zip_path = os.path.join(dist_dir, f'ScholarFlow_v{version}_Chrome.zip')
with zipfile.ZipFile(chrome_zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
    zf.write(os.path.join(src_dir, 'manifest_chrome.json'), 'manifest.json')
    add_files_to_zip(zf, src_dir)

# Also create unversioned alias
shutil.copyfile(chrome_zip_path, os.path.join(dist_dir, 'ScholarFlow_Chrome.zip'))

# 2. Package Firefox
firefox_zip_path = os.path.join(dist_dir, f'ScholarFlow_v{version}_Firefox.zip')
with zipfile.ZipFile(firefox_zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
    zf.write(os.path.join(src_dir, 'manifest_firefox.json'), 'manifest.json')
    add_files_to_zip(zf, src_dir)

# Also create unversioned alias
shutil.copyfile(firefox_zip_path, os.path.join(dist_dir, 'ScholarFlow_Firefox.zip'))

print("=" * 60)
print(f"  ✓ ĐÓNG GÓI THÀNH CÔNG SCHOLARFLOW v{version}!")
print("=" * 60)
print(f"1. Gói Chrome Web Store:  {chrome_zip_path}")
print(f"2. Gói Mozilla Add-ons:    {firefox_zip_path}")
print("=" * 60)

