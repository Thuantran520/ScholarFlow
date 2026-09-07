import re

with open("/mnt/c/TakaExtension/OS/css/sidebar.css", "r", encoding="utf-8") as f:
    css = f.read()

# Find the start of .btn {
# and the end of .btn-warning:hover { ... }
start = css.find('    .btn {')
end = css.find('    .btn-warning:hover {')
# find the closing brace for btn-warning:hover
end = css.find('}', end) + 1

new_css_block = """    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      border: 1px solid transparent;
      border-radius: 8px;
      padding: 8px 12px;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.2px;
      cursor: pointer;
      box-sizing: border-box;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .btn:hover {
      filter: brightness(1.15);
    }
    .btn:active {
      transform: scale(0.97);
      box-shadow: none !important;
    }
    .btn-primary {
      background: #38bdf8;
      color: #0f172a;
      border-color: rgba(56, 189, 248, 0.4);
      box-shadow: 0 0 12px rgba(56, 189, 248, 0.3);
    }
    .btn-primary:hover {
      background: #0ea5e9;
      color: #ffffff;
      box-shadow: 0 0 16px rgba(14, 165, 233, 0.45);
    }
    .btn-secondary {
      background: rgba(30, 41, 59, 0.6);
      color: #f1f5f9;
      border: 1px solid rgba(255, 255, 255, 0.08);
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }
    .btn-secondary:hover {
      background: rgba(30, 41, 59, 0.9);
      border-color: rgba(255, 255, 255, 0.2);
      color: #ffffff;
    }
    .btn-success {
      background: #10b981;
      color: #ffffff;
      border-color: rgba(16, 185, 129, 0.4);
      box-shadow: 0 0 12px rgba(16, 185, 129, 0.3);
    }
    .btn-success:hover {
      background: #059669;
      box-shadow: 0 0 16px rgba(16, 185, 129, 0.45);
    }
    .btn-danger {
      background: #f43f5e;
      color: #ffffff;
      border-color: rgba(244, 63, 94, 0.4);
      box-shadow: 0 0 12px rgba(244, 63, 94, 0.3);
    }
    .btn-danger:hover {
      background: #e11d48;
      box-shadow: 0 0 16px rgba(244, 63, 94, 0.45);
    }
    .btn-warning {
      background: #f59e0b;
      color: #0f172a;
      border-color: rgba(245, 158, 11, 0.5);
      box-shadow: 0 0 12px rgba(245, 158, 11, 0.3);
      font-weight: 700;
    }
    .btn-warning:hover {
      background: #d97706;
      box-shadow: 0 0 16px rgba(245, 158, 11, 0.45);
    }"""

if start != -1 and end != -1:
    css = css[:start] + new_css_block + css[end:]
    with open("/mnt/c/TakaExtension/OS/css/sidebar.css", "w", encoding="utf-8") as f:
        f.write(css)
    print("Replaced .btn blocks successfully.")
else:
    print("Could not find .btn block limits")
