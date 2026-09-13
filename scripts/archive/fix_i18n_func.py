import re
with open('/mnt/c/TakaExtension/OS/js/i18n.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Add getAppLanguage before setAppLanguage
if 'function getAppLanguage' not in content:
    idx = content.find('function setAppLanguage(')
    if idx != -1:
        new_content = content[:idx] + "function getAppLanguage() { return (typeof currentAppLanguage !== 'undefined' ? currentAppLanguage : 'vi'); }\n\n" + content[idx:]
        with open('/mnt/c/TakaExtension/OS/js/i18n.js', 'w', encoding='utf-8') as f:
            f.write(new_content)
        print("Fixed i18n.js")
