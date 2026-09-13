import json

def restore_telemetry(filepath):
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
        
        if "browser_specific_settings" not in data:
            data["browser_specific_settings"] = {}
        if "gecko" not in data["browser_specific_settings"]:
            data["browser_specific_settings"]["gecko"] = {}
            
        data["browser_specific_settings"]["gecko"]["data_collection_permissions"] = {
            "required": []
        }
        
        # update version to 142.0 to clear warnings
        data["browser_specific_settings"]["gecko"]["strict_min_version"] = "142.0"
                
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"Restored {filepath}")
    except Exception as e:
        print(f"Skipping {filepath}: {e}")

restore_telemetry("/mnt/c/TakaExtension/manifest.json")
restore_telemetry("/mnt/c/TakaExtension/manifest_firefox.json")
# Chrome manifest doesn't need gecko settings generally, but it might be shared.
# I'll just remove gecko entirely from chrome manifest to be safe.
try:
    with open("/mnt/c/TakaExtension/manifest_chrome.json", "r", encoding="utf-8") as f:
        cdata = json.load(f)
    if "browser_specific_settings" in cdata:
        del cdata["browser_specific_settings"]
        with open("/mnt/c/TakaExtension/manifest_chrome.json", "w", encoding="utf-8") as f:
            json.dump(cdata, f, indent=2, ensure_ascii=False)
        print("Cleaned chrome manifest")
except:
    pass

