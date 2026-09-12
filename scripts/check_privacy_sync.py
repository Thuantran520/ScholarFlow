import os
import re
import sys

base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
html_path = os.path.join(base_dir, "OS", "html", "privacy.html")
js_path = os.path.join(base_dir, "OS", "js", "privacy.js")

with open(html_path, "r", encoding="utf-8") as f:
    html_content = f.read()

with open(js_path, "r", encoding="utf-8") as f:
    js_content = f.read()

# Extract IDs from HTML
ids_in_html = re.findall(r'id="(sec[0-9]+-[a-z0-9]+|cookie-note|doc-title|last-updated|compliance-badge-text|verified-badge-text|summary-[a-z]+)"', html_content)

keys_in_html = set()
for html_id in ids_in_html:
    if html_id == "compliance-badge-text":
        keys_in_html.add("compliance_badge")
    elif html_id == "verified-badge-text":
        keys_in_html.add("verified_badge")
    else:
        keys_in_html.add(html_id.replace('-', '_'))

vi_block_match = re.search(r'"vi": \{(.*?)\n  \},', js_content, re.DOTALL)
if not vi_block_match:
    print("Error: Could not find 'vi' language block in privacy.js!")
    sys.exit(1)

vi_block = vi_block_match.group(1)
keys_in_js = set(re.findall(r'"([a-zA-Z0-9_]+)":', vi_block))

missing_in_js = keys_in_html - keys_in_js

error = False
if missing_in_js:
    print("❌ LỖI ĐỒNG BỘ PRIVACY: Các ID sau có trong HTML nhưng chưa có trong privacy.js (bị thiếu dịch thuật):")
    for k in missing_in_js:
        print(f"  - {k}")
    error = True

if error:
    print("\n=> Vui lòng bổ sung vào thư viện ngôn ngữ trong privacy.js trước khi build!")
    sys.exit(1)

print("✅ Đã kiểm tra đồng bộ HTML/JS nội dung Privacy.")
sys.exit(0)
