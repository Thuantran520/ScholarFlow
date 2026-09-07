import re

with open("/mnt/c/TakaExtension/OS/js/i18n.js", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace(
    "el.innerHTML = val;",
    'const doc = new DOMParser().parseFromString(val, "text/html");\n        el.replaceChildren(...doc.body.childNodes);'
)

with open("/mnt/c/TakaExtension/OS/js/i18n.js", "w", encoding="utf-8") as f:
    f.write(content)
print("Fixed i18n.js")
