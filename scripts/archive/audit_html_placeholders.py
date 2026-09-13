from bs4 import BeautifulSoup

def check_html(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        soup = BeautifulSoup(f.read(), 'html.parser')
    
    # Check all elements with placeholder attribute
    for el in soup.find_all(attrs={"placeholder": True}):
        if not el.has_attr("data-i18n-placeholder"):
            print(f"[{filepath}] Missing data-i18n-placeholder on: {el.get('id', 'no-id')} -> {el['placeholder']}")
            
    # Check all elements with title attribute
    for el in soup.find_all(attrs={"title": True}):
        if not el.has_attr("data-i18n-title"):
            print(f"[{filepath}] Missing data-i18n-title on: {el.get('id', 'no-id')} -> {el['title']}")

check_html("/mnt/c/TakaExtension/OS/html/sidebar.html")
check_html("/mnt/c/TakaExtension/OS/html/popup.html")
