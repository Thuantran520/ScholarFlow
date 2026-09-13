import re
with open("/mnt/c/TakaExtension/OS/js/sidebar.js", "r", encoding="utf-8") as f:
    js = f.read()

# Extract showToast function
m = re.search(r'function showToast.*?\{.*?\n\}', js, re.DOTALL)
if m:
    print(m.group(0)[:500])
