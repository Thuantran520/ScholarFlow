import re

with open('/mnt/c/TakaExtension/OS/js/privacy.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Find the script block
match = re.search(r'<script>([\s\S]*?)</script>', html)
if match:
    js_code = match.group(1)
    with open('/mnt/c/TakaExtension/OS/js/privacy.js', 'w', encoding='utf-8') as f:
        f.write(js_code.strip())
    
    html = html[:match.start()] + '<script src="privacy.js"></script>' + html[match.end():]
    with open('/mnt/c/TakaExtension/OS/js/privacy.html', 'w', encoding='utf-8') as f:
        f.write(html)
    print("Successfully extracted privacy.js")
else:
    print("Could not find inline script")
