import os
import subprocess
import sys
print("Running Privacy Sync Check...")
res = subprocess.run([sys.executable, os.path.join(os.path.dirname(__file__), "check_privacy_sync.py")])
if res.returncode != 0:
    print("❌ Dừng đóng gói do lỗi không đồng bộ ngôn ngữ!")
    sys.exit(1)

import zipfile

script_dir = os.path.dirname(os.path.abspath(__file__))
src_dir = os.path.dirname(script_dir)
dist_dir = os.path.join(src_dir, 'dist')
os.makedirs(dist_dir, exist_ok=True)

def add_files_to_zip(zf, source_dir):
    # Add manifest
    pass # handled separately
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
            rel_path = os.path.relpath(abs_path, source_dir)
            zf.write(abs_path, rel_path)

# 1. Package Chrome / Edge
chrome_zip_path = os.path.join(dist_dir, 'ScholarFlow_Chrome_v3.zip')
with zipfile.ZipFile(chrome_zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
    zf.write(os.path.join(src_dir, 'manifest_chrome.json'), 'manifest.json')
    add_files_to_zip(zf, src_dir)

# 2. Package Firefox
firefox_zip_path = os.path.join(dist_dir, 'ScholarFlow_Firefox_v3.zip')
with zipfile.ZipFile(firefox_zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
    zf.write(os.path.join(src_dir, 'manifest_firefox.json'), 'manifest.json')
    add_files_to_zip(zf, src_dir)

print("=" * 60)
print("  ✓ ĐÓNG GÓI THÀNH CÔNG SẴN SÀNG NỘP STORE!")
print("=" * 60)
print(f"1. Gói Chrome Web Store:  {chrome_zip_path}")
print(f"2. Gói Mozilla Add-ons:    {firefox_zip_path}")
print("=" * 60)
