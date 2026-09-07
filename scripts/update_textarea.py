import re

with open("/mnt/c/TakaExtension/OS/css/sidebar.css", "r", encoding="utf-8") as f:
    css = f.read()

textarea_focus_old = r'\.cookie-textarea:focus \{[^}]+\}'
textarea_focus_new = r'.cookie-textarea:focus {\n  border-color: rgba(56, 189, 248, 0.6);\n  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2), 0 0 8px rgba(56, 189, 248, 0.3);\n  background: rgba(15, 23, 42, 0.8);\n}'
css = re.sub(textarea_focus_old, textarea_focus_new, css)

with open("/mnt/c/TakaExtension/OS/css/sidebar.css", "w", encoding="utf-8") as f:
    f.write(css)

print("Updated cookie textarea successfully.")
