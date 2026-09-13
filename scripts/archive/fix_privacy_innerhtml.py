import re

with open("/mnt/c/TakaExtension/OS/js/privacy.js", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace(
    "if (el) el.innerHTML = html;",
    'if (el) {\n          const doc = new DOMParser().parseFromString(html, "text/html");\n          el.replaceChildren(...doc.body.childNodes);\n        }'
)

with open("/mnt/c/TakaExtension/OS/js/privacy.js", "w", encoding="utf-8") as f:
    f.write(content)
print("Fixed privacy.js")
