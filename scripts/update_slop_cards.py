import re

with open("/mnt/c/TakaExtension/OS/css/sidebar.css", "r", encoding="utf-8") as f:
    css = f.read()

# Fix redacted-item-card
redact_old = r'\.redacted-item-card \{[^}]+\}'
redact_new = r'.redacted-item-card {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  padding: 8px 10px;\n  background: rgba(15, 23, 42, 0.3);\n  border: 1px solid rgba(255, 255, 255, 0.05);\n  border-radius: 8px;\n  font-size: 11.5px;\n  transition: all 0.2s ease;\n  cursor: pointer;\n}'
css = re.sub(redact_old, redact_new, css)

redact_hover_old = r'\.redacted-item-card:hover \{[^}]+\}'
redact_hover_new = r'.redacted-item-card:hover {\n  background: rgba(255, 255, 255, 0.04);\n  border-color: rgba(56, 189, 248, 0.3);\n  box-shadow: 0 0 8px rgba(56, 189, 248, 0.15);\n}'
css = re.sub(redact_hover_old, redact_hover_new, css)

# Fix biblio-card
biblio_old = r'\.biblio-card \{[^}]+\}'
biblio_new = r'.biblio-card {\n  background: rgba(15, 23, 42, 0.4);\n  border: 1px solid rgba(255, 255, 255, 0.08);\n  border-radius: 10px;\n  padding: 10px;\n  margin-bottom: 8px;\n  position: relative;\n  transition: all 0.2s ease;\n}'
css = re.sub(biblio_old, biblio_new, css)

# Fix dual-tabs-bar
dual_old = r'\.dual-tabs-bar \{[^}]+\}'
dual_new = r'.dual-tabs-bar {\n  background: rgba(15, 23, 42, 0.4);\n  border: 1px solid rgba(56, 189, 248, 0.2);\n  border-radius: 12px;\n  padding: 10px 12px;\n  margin-bottom: 12px;\n  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);\n}'
css = re.sub(dual_old, dual_new, css)

with open("/mnt/c/TakaExtension/OS/css/sidebar.css", "w", encoding="utf-8") as f:
    f.write(css)

print("Updated slop cards successfully.")
