import re

with open('/mnt/c/TakaExtension/OS/js/sidebar.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Refactor the Raw Cookie Import loop
raw_import_old = """      for (const pair of pairs) {
        const idx = pair.indexOf("=");
        if (idx < 0) continue;
        const name = pair.substring(0, idx).trim();
        const value = pair.substring(idx + 1).trim();
        try {
          await cookiesApi.set({
            url: urlStr,
            name: name,
            value: value,
            domain: domain,
            path: "/"
          });
          successCount++;
        } catch(e) { console.warn("Failed to set raw cookie", name, e); }
      }"""

raw_import_new = """      const setPromises = pairs.map(async (pair) => {
        const idx = pair.indexOf("=");
        if (idx < 0) return false;
        const name = pair.substring(0, idx).trim();
        const value = pair.substring(idx + 1).trim();
        try {
          await cookiesApi.set({
            url: urlStr,
            name: name,
            value: value,
            domain: domain,
            path: "/"
          });
          return true;
        } catch(e) {
          console.warn("Failed to set raw cookie", name, e);
          return false;
        }
      });
      const results = await Promise.all(setPromises);
      successCount = results.filter(r => r).length;"""

js = js.replace(raw_import_old, raw_import_new)

# Refactor the JSON Cookie Import loop
json_import_old = """          let successCount = 0;
          for (const c of cookies) {
            let url = "http" + (c.secure ? "s" : "") + "://" + c.domain.replace(/^\./, "") + c.path;
            try {
              // Override storeId to match current tab's cookie store (handles incognito/private)
              const targetStoreId = (currentTabObj && currentTabObj.cookieStoreId)
                ? currentTabObj.cookieStoreId
                : (c.storeId || undefined);
              const setArgs = {
                url: url,
                name: c.name,
                value: c.value,
                domain: c.domain,
                path: c.path,
                secure: c.secure,
                httpOnly: c.httpOnly,
                sameSite: c.sameSite && ["no_restriction","lax","strict"].includes(c.sameSite.toLowerCase())
                  ? c.sameSite.toLowerCase() : "no_restriction"
              };
              if (targetStoreId) setArgs.storeId = targetStoreId;
              await cookiesApi.set(setArgs);
              successCount++;
            } catch (err) {
              console.warn("Failed to set cookie:", c.name, err);
            }
          }"""

json_import_new = """          let successCount = 0;
          const setPromises = cookies.map(async (c) => {
            let url = "http" + (c.secure ? "s" : "") + "://" + c.domain.replace(/^\\./, "") + c.path;
            try {
              const targetStoreId = (currentTabObj && currentTabObj.cookieStoreId)
                ? currentTabObj.cookieStoreId
                : (c.storeId || undefined);
              const setArgs = {
                url: url,
                name: c.name,
                value: c.value,
                path: c.path,
                secure: c.secure,
                httpOnly: c.httpOnly
              };
              // Fix: Host-only cookies must not specify a domain.
              if (!c.hostOnly && c.domain) {
                setArgs.domain = c.domain;
              }
              // Fix: Preserve exact SameSite status (including unspecified).
              if (c.sameSite && ["no_restriction", "lax", "strict", "unspecified"].includes(c.sameSite.toLowerCase())) {
                setArgs.sameSite = c.sameSite.toLowerCase();
              }
              // Some browsers drop expirationDate if it's in the past or invalid. Optional.
              if (c.expirationDate) {
                 setArgs.expirationDate = c.expirationDate;
              }
              if (targetStoreId) setArgs.storeId = targetStoreId;
              
              await cookiesApi.set(setArgs);
              return true;
            } catch (err) {
              console.warn("Failed to set cookie:", c.name, err);
              return false;
            }
          });
          const results = await Promise.all(setPromises);
          successCount = results.filter(r => r).length;"""

js = js.replace(json_import_old, json_import_new)

with open('/mnt/c/TakaExtension/OS/js/sidebar.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Updated sidebar.js cookie logic successfully.")
