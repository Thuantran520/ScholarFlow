import re

for file in ['/mnt/c/TakaExtension/OS/html/sidebar.html', '/mnt/c/TakaExtension/OS/html/popup.html']:
    with open(file, 'r', encoding='utf-8') as f:
        code = f.read()

    code = code.replace('ScholarFlow v2.0.0 (Store Release Candidate)', 'ScholarFlow v2.2.0 (Stable Release)')
    code = code.replace('Mã nguồn mở chuẩn MIT License', 'Bản quyền phần mềm thuộc về Minh Thuận')
    
    with open(file, 'w', encoding='utf-8') as f:
        f.write(code)

with open('/mnt/c/TakaExtension/OS/html/i18n.js', 'r', encoding='utf-8') as f:
    code = f.read()

# Replace version and license for all languages
code = code.replace('ScholarFlow v2.0.0 (Store Release Candidate)', 'ScholarFlow v2.2.0 (Stable Release)')
code = code.replace('Mã nguồn mở chuẩn MIT License', 'Bản quyền phần mềm thuộc về Minh Thuận')

code = code.replace('ScholarFlow v2.0.0 (Store Release Candidate)', 'ScholarFlow v2.2.0 (Stable Release)')
code = code.replace('Open Source under MIT License', 'Proprietary software owned by Minh Thuận')

code = code.replace('ScholarFlow v2.0.0（官方商店候选发布版）', 'ScholarFlow v2.2.0（正式发布版）')
code = code.replace('MIT License 开源协议', '专有软件，版权归 Minh Thuận 所有')

code = code.replace('ScholarFlow v2.0.0 (Релиз для Store)', 'ScholarFlow v2.2.0 (Стабильный релиз)')
code = code.replace('Open Source под лицензией MIT', 'Проприетарное ПО, права принадлежат Minh Thuận')

code = code.replace('ScholarFlow v2.0.0（ストア公開候補版）', 'ScholarFlow v2.2.0（安定版リリース）')
code = code.replace('MIT オープンソースライセンス', 'Minh Thuận が所有するプロプライエタリ ソフトウェア')

with open('/mnt/c/TakaExtension/OS/html/i18n.js', 'w', encoding='utf-8') as f:
    f.write(code)

print("Patched trust modal")
