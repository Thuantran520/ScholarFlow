import re
import json

with open('/mnt/c/TakaExtension/OS/js/i18n.js', 'r', encoding='utf-8') as f:
    code = f.read()

# I will write a regex to replace the entire chunk of tips for each language
# But wait, it's safer to just load it, regex replace the old tips, and insert the new ones.
# Or just find the "trust_footer_privacy": "..." and insert the new keys AFTER it.
# Wait, the old keys are ALREADY in there! So I must REPLACE the old keys!

# Let's just find "tip_lang" to "tip_tab_b" and remove them?
# It's easier to just do a smart regex replacement for each language block.
