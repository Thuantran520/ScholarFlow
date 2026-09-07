import re

with open('/mnt/c/TakaExtension/sidebar.html', 'r', encoding='utf-8') as f:
    html = f.read()

keys = re.findall(r'data-i18n-title="([^"]+)"', html)

with open('/mnt/c/TakaExtension/patch_i18n_fast.py', 'r', encoding='utf-8') as f:
    script = f.read()

zh_new_match = re.search(r'zh_new = \{(.*?)\}', script, re.DOTALL)
zh_code = zh_new_match.group(1)
zh_keys = re.findall(r'"([^"]+)":', zh_code)

missing = set(keys) - set(zh_keys)
print("Missing keys in zh_new:", missing)
