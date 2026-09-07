import json

def remove_telemetry_key(filepath):
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
        
        if "browser_specific_settings" in data and "gecko" in data["browser_specific_settings"]:
            if "data_collection_permissions" in data["browser_specific_settings"]["gecko"]:
                del data["browser_specific_settings"]["gecko"]["data_collection_permissions"]
                
                with open(filepath, "w", encoding="utf-8") as f:
                    json.dump(data, f, indent=2, ensure_ascii=False)
                print(f"Fixed {filepath}")
    except Exception as e:
        print(f"Skipping {filepath}: {e}")

remove_telemetry_key("/mnt/c/TakaExtension/manifest.json")
remove_telemetry_key("/mnt/c/TakaExtension/manifest_firefox.json")
remove_telemetry_key("/mnt/c/TakaExtension/manifest_chrome.json")
