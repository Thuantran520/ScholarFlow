import re
from bs4 import BeautifulSoup

with open('/mnt/c/TakaExtension/OS/html/sidebar.html', 'r', encoding='utf-8') as f:
    soup = BeautifulSoup(f.read(), 'html.parser')

untranslated = []
for tag in soup.find_all(string=True):
    if tag.parent.name in ['script', 'style']:
        continue
    text = tag.strip()
    if text:
        has_i18n = False
        for parent in tag.parents:
            if parent.name == '[document]':
                break
            if parent.has_attr('data-i18n') or parent.has_attr('data-i18n-title'):
                has_i18n = True
                break
        
        if not has_i18n:
            # Check if it has any Vietnamese chars
            if re.search(r'[áàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵđ]', text.lower()):
                untranslated.append((tag.parent.name, text, str(tag.parent)))

for u in set(untranslated):
    print(u)
