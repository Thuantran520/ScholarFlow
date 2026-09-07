import os
import json
import re

locales_dir = '/mnt/c/TakaExtension/OS/locales'
err_009_translations = {
    'vi': '❌ Lỗi sao chép ảnh hoặc tải file! [ERR_009]',
    'en': '❌ Error copying image or downloading file! [ERR_009]',
    'zh': '❌ 复制图像或下载文件时出错！[ERR_009]',
    'ru': '❌ Ошибка копирования изображения или загрузки файла! [ERR_009]',
    'ja': '❌ 画像のコピーまたはファイルのダウンロード中にエラーが発生しました！ [ERR_009]'
}

for lang, translation in err_009_translations.items():
    file_path = os.path.join(locales_dir, f"{lang}.js")
    if os.path.exists(file_path):
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Inject right before the last closing brace
        if 'err_009' not in content:
            # Find last };
            idx = content.rfind('};')
            if idx != -1:
                new_content = content[:idx] + f'  "err_009": "{translation}",\n' + content[idx:]
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"Added err_009 to {lang}.js")

