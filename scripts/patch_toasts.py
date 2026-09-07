import re

with open("/mnt/c/TakaExtension/OS/js/sidebar.js", "r", encoding="utf-8") as f:
    js = f.read()

# Replace all showToast("Vietnamese text") with dynamic i18n
# But wait, it's easier to just override showToast to translate if there's a match!
# Since there are so many hardcoded showToast calls, we can redefine showToast to map known strings.

