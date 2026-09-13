import re

with open("/mnt/c/TakaExtension/OS/css/sidebar.css", "r", encoding="utf-8") as f:
    css = f.read()

# Replace .feature-card block
css = re.sub(
    r'\.feature-card \{[^}]+\}',
    r'.feature-card {\n  background: rgba(255, 255, 255, 0.015);\n  border: 1px solid rgba(255, 255, 255, 0.04);\n  border-radius: 12px;\n  padding: 14px 12px;\n  margin-bottom: 16px;\n}',
    css
)

# Replace .radio-card block
css = re.sub(
    r'\.radio-card \{[^}]+\}',
    r'.radio-card {\n  background: rgba(15, 23, 42, 0.3);\n  border: 1px solid rgba(255, 255, 255, 0.06);\n  padding: 10px;\n  border-radius: 8px;\n  cursor: pointer;\n  font-size: 11.5px;\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  transition: all 0.2s ease;\n}',
    css
)

# Add a hover to radio-card if it doesn't exist
if '.radio-card:hover' not in css:
    css = css.replace('.radio-card {', '.radio-card:hover { background: rgba(255, 255, 255, 0.04); border-color: rgba(56, 189, 248, 0.2); }\n.radio-card {')

with open("/mnt/c/TakaExtension/OS/css/sidebar.css", "w", encoding="utf-8") as f:
    f.write(css)

print("Updated cards successfully.")
