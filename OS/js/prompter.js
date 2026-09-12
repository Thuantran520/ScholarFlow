document.addEventListener("DOMContentLoaded", () => {
  const storLocal = (typeof browser !== "undefined" && browser.storage) ? browser.storage.local : (typeof chrome !== "undefined" ? chrome.storage.local : null);
  
  // Initialize translations
  if (storLocal) {
    storLocal.get("app_language", (res) => {
      if (window.i18n) window.i18n.setLanguage((res && res.app_language) ? res.app_language : "vi");
    });
  } else if (window.i18n) {
    window.i18n.applyTranslations("vi");
  }
  if (!storLocal) {
    document.getElementById("script-content").textContent = "Không hỗ trợ Storage API.";
    return;
  }
  
  let handled = false;
  const handleResult = (res) => {
    if (handled) return;
    handled = true;
    if (res && res.super_video_settings && res.super_video_settings.script) {
      document.getElementById("script-content").textContent = res.super_video_settings.script;
    } else {
      document.getElementById("script-content").textContent = window.i18n ? window.i18n.t("script_prompter_empty") : "Bạn chưa nhập kịch bản nào. Hãy nhập vào ô Kịch bản quay trong tiện ích và mở lại cửa sổ này.";
    }
  };

  try {
    const p = storLocal.get("super_video_settings", handleResult);
    if (p && p.then) {
      p.then(handleResult).catch(console.error);
    }
  } catch (e) {
    console.error(e);
  }
});