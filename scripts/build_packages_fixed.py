with open("/mnt/c/TakaExtension/scripts/build_packages.py", "r") as f:
    content = f.read()

content = content.replace("ScholarFlow_Firefox.zip", "ScholarFlow_Firefox_v2.zip")
content = content.replace("ScholarFlow_Chrome.zip", "ScholarFlow_Chrome_v2.zip")

with open("/mnt/c/TakaExtension/scripts/build_packages.py", "w") as f:
    f.write(content)
