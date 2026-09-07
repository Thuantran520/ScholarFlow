import re

with open("/mnt/c/TakaExtension/OS/css/sidebar.css", "r", encoding="utf-8") as f:
    css = f.read()

switch_row_old = r'\.switch-row \{[^}]+\}'
switch_row_new = r'.switch-row {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 10px;\n  cursor: pointer;\n  user-select: none;\n  background: rgba(15, 23, 42, 0.3);\n  border: 1px solid rgba(255, 255, 255, 0.05);\n  padding: 10px;\n  border-radius: 8px;\n  margin-bottom: 8px;\n  transition: all 0.2s ease;\n}'
css = re.sub(switch_row_old, switch_row_new, css)

switch_row_hover_old = r'\.switch-row:hover \{[^}]+\}'
switch_row_hover_new = r'.switch-row:hover {\n  background: rgba(255, 255, 255, 0.03);\n  border-color: rgba(56, 189, 248, 0.2);\n}'
css = re.sub(switch_row_hover_old, switch_row_hover_new, css)

switch_checked_old = r'\.custom-switch input:checked \+ \.switch-slider \{[^}]+\}'
switch_checked_new = r'.custom-switch input:checked + .switch-slider {\n  background: #38bdf8;\n  border-color: rgba(56, 189, 248, 0.8);\n  box-shadow: 0 0 10px rgba(56, 189, 248, 0.35);\n}'
css = re.sub(switch_checked_old, switch_checked_new, css)

with open("/mnt/c/TakaExtension/OS/css/sidebar.css", "w", encoding="utf-8") as f:
    f.write(css)

print("Updated switches successfully.")
