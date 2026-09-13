with open("/mnt/c/TakaExtension/scripts/build_packages.py", "r") as f:
    lines = f.readlines()

# Swap import os with the block
import_os_idx = -1
for i, l in enumerate(lines):
    if l.startswith("import os"):
        import_os_idx = i
        break

if import_os_idx > 0:
    # move import os to the top
    os_line = lines.pop(import_os_idx)
    lines.insert(0, os_line)

with open("/mnt/c/TakaExtension/scripts/build_packages.py", "w") as f:
    f.writelines(lines)
