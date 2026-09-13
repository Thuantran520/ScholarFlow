import re
i18n_path = '/mnt/c/TakaExtension/OS/js/i18n.js'
with open(i18n_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the entire const I18N_DATA = { ... }; with dynamic loading
# Find where const I18N_DATA starts and ends
start_idx = content.find('const I18N_DATA = {')
if start_idx != -1:
    # Need to find the end of this statement
    # It ends with }; right before "function t(key"
    end_idx = content.find('function t(key,', start_idx)
    # the end is a little before function t
    # let's just use regex to replace from const I18N_DATA = { to };
    
    new_data_str = """const I18N_DATA = {
  "vi": typeof window.I18N_VI !== 'undefined' ? window.I18N_VI : {},
  "en": typeof window.I18N_EN !== 'undefined' ? window.I18N_EN : {},
  "zh": typeof window.I18N_ZH !== 'undefined' ? window.I18N_ZH : {},
  "ru": typeof window.I18N_RU !== 'undefined' ? window.I18N_RU : {},
  "ja": typeof window.I18N_JA !== 'undefined' ? window.I18N_JA : {}
};

"""
    
    # Let's find the exact end of I18N_DATA block.
    # It's right before the block comment for function t(key, lang = null, params = null)
    comment_idx = content.find('/**', start_idx)
    
    new_content = content[:start_idx] + new_data_str + content[comment_idx:]
    
    with open(i18n_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Updated i18n.js")
else:
    print("Could not find const I18N_DATA")
