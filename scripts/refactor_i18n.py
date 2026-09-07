import re
import json
import os

i18n_path = '/mnt/c/TakaExtension/OS/js/i18n.js'
locales_dir = '/mnt/c/TakaExtension/OS/locales'

with open(i18n_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find the I18N_DATA block
# We will use regex to find each language block
matches = list(re.finditer(r'\n  "(vi|en|zh|ru|ja)"\s*:\s*\{', content))
lang_data_raw = {}
for i, m in enumerate(matches):
    lang = m.group(1)
    start = m.end()
    end = matches[i+1].start() if i+1 < len(matches) else content.find('};', start)
    lang_data_raw[lang] = content[start:end]

# Function to parse a raw js object string (pseudo-json) into a dictionary, keeping last value for duplicates
def parse_js_obj_to_dict(raw_str):
    # Using regex to find all "key": "value" pairs
    # Note: values might be multiline or contain escaped quotes, this is tricky.
    # Let's extract keys and their literal strings from the file.
    # A robust way is to just find all string assignments.
    pairs = re.findall(r'^\s*"([^"]+)"\s*:\s*"(.*)"\s*,?\s*$', raw_str, flags=re.MULTILINE)
    result = {}
    for k, v in pairs:
        result[k] = v
    return result

lang_dicts = {}
for lang, raw in lang_data_raw.items():
    lang_dicts[lang] = parse_js_obj_to_dict(raw)

# Fix missing keys based on 'vi'
vi_keys = set(lang_dicts['vi'].keys())
for lang, d in lang_dicts.items():
    if lang == 'vi': continue
    for k in vi_keys:
        if k not in d:
            print(f"Adding missing key {k} to {lang} (using VI value as fallback)")
            d[k] = lang_dicts['vi'][k] # Fallback to vi or empty string

# Save to separate files
for lang, d in lang_dicts.items():
    file_path = os.path.join(locales_dir, f"{lang}.js")
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(f"// {lang.upper()} Translation Data\n")
        f.write(f"window.I18N_{lang.upper()} = {{\n")
        for k, v in d.items():
            f.write(f'  "{k}": "{v}",\n')
        f.write("};\n")
    print(f"Created {file_path} with {len(d)} keys.")

