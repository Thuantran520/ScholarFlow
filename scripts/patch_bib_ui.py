import re

for file in ['/mnt/c/TakaExtension/OS/html/sidebar.html', '/mnt/c/TakaExtension/OS/html/popup.html']:
    with open(file, 'r', encoding='utf-8') as f:
        code = f.read()

    # Fix IEEE button text
    code = code.replace('>IEEE ([1], [2]...)<', '>IEEE<')
    
    # Add data-i18n to empty state
    code = code.replace(
        'Chưa có trích dẫn nào được lưu',
        '<span data-i18n="bib_empty_title">Chưa có trích dẫn nào được lưu</span>'
    )
    code = code.replace(
        'Bấm nút ➕ Lưu ở Tab 1 để thêm bài báo hoặc trang web vào danh mục.',
        '<span data-i18n="bib_empty_desc">Bấm nút ➕ Lưu ở Tab 1 để thêm bài báo hoặc trang web vào danh mục.</span>'
    )
    
    with open(file, 'w', encoding='utf-8') as f:
        f.write(code)

print("Patched HTML bib UI")
