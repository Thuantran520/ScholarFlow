// Firefox 55+ chrome.* compatibility alias
if (typeof chrome === "undefined" && typeof browser !== "undefined") {
  try { window.chrome = browser; } catch (e) {}
}

// ScholarFlow Universal i18n Internationalization Engine
// Supported: Vietnamese (vi), English (en), Chinese (zh), Russian (ru), Japanese (ja)
"use strict";

// Module-scoped current language state to avoid accidental global ReferenceError
let currentAppLanguage = "vi";

const I18N_DATA = {
  "vi": typeof window.I18N_VI !== 'undefined' ? window.I18N_VI : {},
  "en": typeof window.I18N_EN !== 'undefined' ? window.I18N_EN : {},
  "zh": typeof window.I18N_ZH !== 'undefined' ? window.I18N_ZH : {},
  "ru": typeof window.I18N_RU !== 'undefined' ? window.I18N_RU : {},
  "ja": typeof window.I18N_JA !== 'undefined' ? window.I18N_JA : {}
};
try { window.I18N_DATA = I18N_DATA; } catch (e) {}

/**
 * Universal translation getter with fallback:
 * 1. Target lang -> 2. English -> 3. Vietnamese -> 4. Key itself
 */
function t(key, lang = null, params = null) {
  const l = lang || (typeof currentAppLanguage !== 'undefined' ? currentAppLanguage : "vi");
  let text = "";
  if (I18N_DATA[l] && I18N_DATA[l][key] !== undefined) {
    text = I18N_DATA[l][key];
  } else if (I18N_DATA["en"] && I18N_DATA["en"][key] !== undefined) {
    text = I18N_DATA["en"][key];
  } else if (I18N_DATA["vi"] && I18N_DATA["vi"][key] !== undefined) {
    text = I18N_DATA["vi"][key];
  } else {
    text = key;
  }

  if (typeof text === "function") {
    try {
      text = Array.isArray(params) ? text(...params)
        : (params && typeof params === "object" ? text(params) : text());
    } catch (e) { text = key; }
  }

  if (Array.isArray(params)) {
    for (let i = 0; i < params.length; i++) {
      if (params[i] !== undefined && params[i] !== null) {
        text = text.split("{" + i + "}").join(String(params[i]));
      }
    }
  } else if (params && typeof params === "object") {
    for (const [k, v] of Object.entries(params)) {
      text = text.split("{" + k + "}").join(v !== undefined && v !== null ? v : "");
    }
  }
  return text;
}

/**
 * High-performance declarative DOM translator:
 * Automatically scans and translates all [data-i18n], [data-i18n-placeholder],
 * [data-i18n-title], and [data-i18n-aria] in one unified pass!
 */
function applyTranslations(lang) {
  if (!lang) lang = currentAppLanguage || "vi";
  currentAppLanguage = lang;

  // 1. Sync dropdown selection
  const langSelect = document.getElementById("select-app-lang");
  if (langSelect && langSelect.value !== lang) {
    langSelect.value = lang;
  }
  const flagMap = { vi: "🇻🇳", en: "🇬🇧", zh: "🇨🇳", ru: "🇷🇺", ja: "🇯🇵" };
  const codeMap = { vi: "VI", en: "EN", zh: "ZH", ru: "RU", ja: "JA" };
  const flagEl = document.getElementById("lang-active-flag");
  const textEl = document.getElementById("lang-active-text");
  if (flagEl) flagEl.textContent = flagMap[lang] || "🌐";
  if (textEl) textEl.textContent = codeMap[lang] || lang.toUpperCase();

  document.querySelectorAll("#lang-dropdown-menu .custom-dropdown-item").forEach(item => {
    item.classList.toggle("active", item.dataset.lang === lang);
  });

  // 2. Elements with data-i18n (text or html)
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (!key) return;
    const isHtml = el.getAttribute("data-i18n-html") === "true";
    const val = t(key, lang);
    if (val !== undefined && val !== null) {
      if (isHtml) {
        const doc = new DOMParser().parseFromString(val, "text/html");
        el.replaceChildren(...doc.body.childNodes);
      } else {
        el.textContent = val;
      }
    }
  });

  // 3. Elements with data-i18n-placeholder
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (!key) return;
    const val = t(key, lang);
    if (val) el.setAttribute("placeholder", val);
  });

  // 4. Elements with data-i18n-title
  document.querySelectorAll("[data-i18n-title]").forEach((el) => {
    const key = el.getAttribute("data-i18n-title");
    if (!key) return;
    const val = t(key, lang);
    if (val) el.setAttribute("title", val);
  });

  // 5. Elements with data-i18n-aria
  document.querySelectorAll("[data-i18n-aria]").forEach((el) => {
    const key = el.getAttribute("data-i18n-aria");
    if (!key) return;
    const val = t(key, lang);
    if (val) el.setAttribute("aria-label", val);
  });

  // 6. Special dynamic elements
  const blurValText = document.getElementById("blur-val-text");
  const blurSlider = document.getElementById("blur-slider");
  if (blurValText && blurSlider) {
    blurValText.textContent = `${blurSlider.value}px`;
  }
}

/**
 * Change application language and persist to extension storage
 */
function getAppLanguage() { return (typeof currentAppLanguage !== 'undefined' ? currentAppLanguage : 'vi'); }

function setAppLanguage(lang, persist = true) {
  if (!I18N_DATA[lang]) lang = "vi";
  currentAppLanguage = lang;
  applyTranslations(lang);

  if (persist && typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
    chrome.storage.local.set({ app_language: lang }, () => {
      window.dispatchEvent(new CustomEvent("app-language-changed", { detail: { lang } }));
    });
  } else {
    window.dispatchEvent(new CustomEvent("app-language-changed", { detail: { lang } }));
  }
}

/**
 * Extensibility API: Register any new language with zero boilerplate
 * Example: i18n.registerLanguage("ko", "🇰🇷 한국어", { ... });
 */
function registerLanguage(code, name, dictionary) {
  if (!code || !dictionary) return;
  I18N_DATA[code] = { ...(I18N_DATA["en"] || {}), ...dictionary };
  const select = document.getElementById("select-app-lang");
  if (select && !select.querySelector(`option[value="${code}"]`)) {
    const opt = document.createElement("option");
    opt.value = code;
    opt.textContent = name || code.toUpperCase();
    select.appendChild(opt);
  }
}

function onReady(fn) {
  if (document.readyState !== "loading") {
    fn();
  } else {
    document.addEventListener("DOMContentLoaded", fn);
  }
}

// Initialize on DOM ready (with immediate fallback if already loaded).
// Pages that fully control their own language flow (e.g. privacy.html) can set
// window.SCHOLARFLOW_I18N_AUTO = false before DOMContentLoaded to opt out.
onReady(() => {
  if (typeof window !== "undefined" && window.SCHOLARFLOW_I18N_AUTO === false) return;

  if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get("app_language", (res) => {
      const savedLang = (res && res.app_language) || "vi";
      setAppLanguage(savedLang, false);
    });
  } else {
    setAppLanguage("vi", false);
  }

  // Bind change handler for native select
  const select = document.getElementById("select-app-lang");
  if (select) {
    select.addEventListener("change", (e) => {
      const newLang = e.target.value;
      setAppLanguage(newLang, true);
    });
  }

  // Bind custom language dropdown trigger & options
  const langTrigger = document.getElementById("lang-dropdown-trigger");
  const langWrap = document.getElementById("lang-dropdown-wrap");
  if (langTrigger && langWrap) {
    langTrigger.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = langWrap.classList.contains("open");
      document.querySelectorAll(".custom-dropdown-wrap.open, .custom-select-wrap.open").forEach(el => el.classList.remove("open"));
      if (!isOpen) langWrap.classList.add("open");
    });

    document.querySelectorAll("#lang-dropdown-menu .custom-dropdown-item").forEach(item => {
      item.addEventListener("click", (e) => {
        e.stopPropagation();
        const selectedLang = item.dataset.lang;
        if (selectedLang) {
          setAppLanguage(selectedLang, true);
          langWrap.classList.remove("open");
        }
      });
    });
  }
});

// Export globally
window.i18n = {
  getLanguage: getAppLanguage,
  getCurrentLanguage: getAppLanguage,
  setLanguage: setAppLanguage,
  t: t,
  applyTranslations: applyTranslations,
  registerLanguage: registerLanguage,
  DATA: I18N_DATA
};
