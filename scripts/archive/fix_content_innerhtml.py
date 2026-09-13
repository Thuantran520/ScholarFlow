with open("/mnt/c/TakaExtension/OS/js/content.js", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace(
    'btnConfirm.innerHTML = `${tContent("snip_btn_capture")} <kbd style="background:rgba(255,255,255,0.2);padding:1px 5px;border-radius:4px;font-size:10px;">Enter</kbd>`;',
    'btnConfirm.replaceChildren(...new DOMParser().parseFromString(`${tContent("snip_btn_capture")} <kbd style="background:rgba(255,255,255,0.2);padding:1px 5px;border-radius:4px;font-size:10px;">Enter</kbd>`, "text/html").body.childNodes);'
)

content = content.replace(
    'btnCancel.innerHTML = `${tContent("snip_btn_cancel")} <kbd style="background:rgba(255,255,255,0.2);padding:1px 5px;border-radius:4px;font-size:10px;">Esc</kbd>`;',
    'btnCancel.replaceChildren(...new DOMParser().parseFromString(`${tContent("snip_btn_cancel")} <kbd style="background:rgba(255,255,255,0.2);padding:1px 5px;border-radius:4px;font-size:10px;">Esc</kbd>`, "text/html").body.childNodes);'
)

# Wait, `content.js` might have other innerHTML?
# Let's check!
import re
if re.search(r'\.innerHTML\s*=', content):
    print("WARNING: More innerHTML found in content.js!")
else:
    print("Fixed content.js innerHTML")

with open("/mnt/c/TakaExtension/OS/js/content.js", "w", encoding="utf-8") as f:
    f.write(content)

