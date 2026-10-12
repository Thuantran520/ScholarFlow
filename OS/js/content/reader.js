// ---------------------------------------------------------------------------
// ScholarFlow Cyber-Reader Mode (News Reader & Dictation Listening Coach)
// Clean Article View with Images, Anti-hang Text-To-Speech with Edge Natural Voices,
// Single-Row Topbar, Theme Contrast Optimization & Custom Scrollbar
// 100% Local processing - Secure DOM APIs only (No dynamic innerHTML)
// ---------------------------------------------------------------------------

(function () {
  if (window._sf_reader_injected) {
    return;
  }
  window._sf_reader_injected = true;

  var isReaderMode = false;
  var originalBodyDisplay = "";
  var readerContainer = null;
  var scrollbarStyleEl = null;

  // Reading Preferences State (persisted)
  
  var CHIBI_READER_GIF = (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.getURL)
    ? chrome.runtime.getURL("OS/assest/doctintuc.gif")
    : ((typeof browser !== "undefined" && browser.runtime && browser.runtime.getURL) ? browser.runtime.getURL("OS/assest/doctintuc.gif") : "");

  var MC_NAM_ICON = (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.getURL)
    ? chrome.runtime.getURL("OS/assest/chibinews/Panadolce/MCnam.png")
    : ((typeof browser !== "undefined" && browser.runtime && browser.runtime.getURL) ? browser.runtime.getURL("OS/assest/chibinews/Panadolce/MCnam.png") : "");

  var MC_NU_ICON = (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.getURL)
    ? chrome.runtime.getURL("OS/assest/chibinews/Panadolce/MCnu.png")
    : ((typeof browser !== "undefined" && browser.runtime && browser.runtime.getURL) ? browser.runtime.getURL("OS/assest/chibinews/Panadolce/MCnu.png") : "");

  var WRITING_ICON = (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.getURL)
    ? chrome.runtime.getURL("OS/assest/writting.png")
    : ((typeof browser !== "undefined" && browser.runtime && browser.runtime.getURL) ? browser.runtime.getURL("OS/assest/writting.png") : "");

  var FONT_FAMILIES = {
    serif: "Georgia, 'Times New Roman', Cambria, serif",
    times: "'Times New Roman', Times, serif",
    garamond: "'Garamond', 'EB Garamond', 'Baskerville', serif",
    merriweather: "'Merriweather', 'Georgia', serif",
    sans: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    inter: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    arial: "Arial, Helvetica, sans-serif",
    bookish: "'Palatino Linotype', 'Book Antiqua', Palatino, serif",
    charter: "'Charter', 'Bitstream Charter', 'Cambria', serif",
    verdana: "Verdana, Geneva, sans-serif",
    helvetica: "'Helvetica Neue', Helvetica, Arial, sans-serif",
    mono: "'Consolas', 'Courier New', Courier, monospace"
  };

  var readerPrefs = {
    theme: (function () { try { return localStorage.getItem("sf_reader_theme") || "dark"; } catch (e) { return "dark"; } })(),
    fontSize: (function () { try { return parseInt(localStorage.getItem("sf_reader_fontsize"), 10) || 19; } catch (e) { return 19; } })(),
    fontFamily: (function () { try { return localStorage.getItem("sf_reader_font_family") || "serif"; } catch (e) { return "serif"; } })(),
    preferredVoice: (function () { try { return localStorage.getItem("sf_reader_preferred_voice") || ""; } catch (e) { return ""; } })()
  };

  // Speech Synthesis & Dictation State
  var readerAudio = {
    sentences: [],
    currentIndex: -1,
    isPlaying: false,
    isDictationMode: false,
    rate: 0.95,
    voice: null,
    articleLang: "en",
    activeUtterance: null,
    speechSeq: 0,
    isSwitchingVoice: false,
    keepAliveTimer: null,
    watchdogTimer: null
  };

  function clearSpeechTimers() {
    if (readerAudio.keepAliveTimer) {
      clearInterval(readerAudio.keepAliveTimer);
      readerAudio.keepAliveTimer = null;
    }
    if (readerAudio.watchdogTimer) {
      clearTimeout(readerAudio.watchdogTimer);
      readerAudio.watchdogTimer = null;
    }
  }

  function splitTextIntoSentences(text) {
    if (!text) return [];
    var clean = text.replace(/\s+/g, " ").trim();
    if (!clean) return [];
    var parts = clean.split(/(?<=[.!?])\s+(?=[A-Z0-9"“'‘])/);
    var res = [];
    for (var i = 0; i < parts.length; i++) {
      var s = parts[i].trim();
      if (s.length > 0) res.push(s);
    }
    return res.length > 0 ? res : [clean];
  }

  function normalizeWords(str) {
    return String(str || "")
      .toLowerCase()
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201c\u201d]/g, '"')
      .replace(/[^\w\s']/g, "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
  }

  function calculateWordMatch(targetSentence, typedSentence) {
    var targetWords = normalizeWords(targetSentence);
    var typedWords = normalizeWords(typedSentence);
    if (targetWords.length === 0) return { score: 100, correct: 0, total: 0 };

    var matched = 0;
    var usedIndices = new Set();
    for (var i = 0; i < typedWords.length; i++) {
      var w = typedWords[i];
      for (var j = 0; j < targetWords.length; j++) {
        if (!usedIndices.has(j) && targetWords[j] === w) {
          matched++;
          usedIndices.add(j);
          break;
        }
      }
    }

    var score = Math.min(100, Math.round((matched / targetWords.length) * 100));
    return { score: score, correct: matched, total: targetWords.length };
  }

  function generateClozeExercise(sentence, difficulty) {
    if (!sentence) return { tokens: [], clozeCount: 0 };
    difficulty = difficulty || "medium";
    var cleanSentence = cleanVietnameseAccents ? cleanVietnameseAccents(sentence) : String(sentence);
    var rawTokens = cleanSentence.match(/[\p{L}\p{N}]+|[^\p{L}\p{N}\s]+|\s+/gu) || [];
    var stopWords = new Set([
      "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with",
      "is", "are", "was", "were", "be", "been", "being", "it", "its", "he", "she", "they",
      "his", "her", "their", "that", "this", "these", "those", "from", "as", "by", "into",
      "had", "has", "have", "do", "does", "did", "not", "so", "up", "out", "if", "than", "too",
      // Vietnamese common stop words
      "và", "của", "là", "các", "những", "được", "có", "cho", "với", "trong", "đã", "sẽ", "khi",
      "tại", "như", "đến", "từ", "về", "người", "để", "ra", "lại", "này", "đó", "theo"
    ]);

    var candidates = [];
    var wordOrdinal = 0;
    for (var i = 0; i < rawTokens.length; i++) {
      var tok = rawTokens[i];
      if (!/^[\p{L}\p{N}]+$/u.test(tok)) continue;
      var w = wordOrdinal++;
      if (/^\p{N}+$/u.test(tok)) continue; // numbers are not listening practice
      if (!/^\p{L}{2,}$/u.test(tok)) continue;
      if (stopWords.has(tok.toLowerCase())) continue;
      // In hard mode allow capitalized words (except at the very start of the sentence) for compound proper/title terms
      if (/^\p{Lu}/u.test(tok) && (difficulty !== "hard" || w === 0)) continue;
      candidates.push({ idx: i, word: w, text: tok, clean: tok.toLowerCase() });
    }

    if (candidates.length === 0) {
      wordOrdinal = 0;
      for (var j = 0; j < rawTokens.length; j++) {
        if (!/^[\p{L}\p{N}]+$/u.test(rawTokens[j])) continue;
        var wj = wordOrdinal++;
        if (/^\p{L}{2,}$/u.test(rawTokens[j])) {
          candidates.push({ idx: j, word: wj, text: rawTokens[j], clean: rawTokens[j].toLowerCase() });
        }
      }
    }

    var targetCount;
    if (difficulty === "easy") {
      targetCount = Math.max(1, Math.min(3, Math.round(candidates.length * 0.22)));
    } else if (difficulty === "hard") {
      targetCount = Math.max(2, Math.min(10, Math.round(candidates.length * 0.55)));
    } else {
      targetCount = Math.max(1, Math.min(5, Math.round(candidates.length * 0.35)));
    }

    var chosenIndices = new Set();
    var chosenWords = new Set();
    function pick(c) {
      chosenIndices.add(c.idx);
      chosenWords.add(c.word);
    }

    function areConsecutive(c1, c2) {
      if (!c1 || !c2) return false;
      if (c2.word !== c1.word + 1) return false;
      for (var t = c1.idx + 1; t < c2.idx; t++) {
        if (!/^\s+$/.test(rawTokens[t])) return false;
      }
      return true;
    }

    if (difficulty === "hard") {
      // Advanced Hard mode: blank more words and group by phrases / compound words
      var phrasePairs = [];
      for (var p = 0; p < candidates.length - 1; p++) {
        if (areConsecutive(candidates[p], candidates[p + 1])) {
          phrasePairs.push([candidates[p], candidates[p + 1]]);
        }
      }

      // Select phrase pairs first across the sentence
      var desiredPairs = Math.min(phrasePairs.length, Math.floor(targetCount / 2));
      if (desiredPairs > 0) {
        var pairStep = phrasePairs.length / desiredPairs;
        for (var pi = 0; pi < desiredPairs; pi++) {
          var pPos = Math.min(phrasePairs.length - 1, Math.floor(pi * pairStep));
          var candidatePair = phrasePairs[pPos];
          if (!chosenWords.has(candidatePair[0].word) && !chosenWords.has(candidatePair[1].word)) {
            pick(candidatePair[0]);
            pick(candidatePair[1]);
          }
        }
      }

      // Fill remaining target count with additional single candidates
      for (var hi = 0; hi < candidates.length && chosenIndices.size < targetCount; hi++) {
        var hc = candidates[hi];
        if (!chosenWords.has(hc.word)) {
          pick(hc);
        }
      }
    } else if (difficulty === "easy") {
      // Easy mode: fewer blanks, wider spacing between blanks (distance >= 2 words)
      function canPickEasy(c) {
        return !chosenWords.has(c.word - 2) && !chosenWords.has(c.word - 1) &&
               !chosenWords.has(c.word) &&
               !chosenWords.has(c.word + 1) && !chosenWords.has(c.word + 2);
      }
      for (var ke = 0; ke < targetCount && candidates.length; ke++) {
        var posE = Math.min(candidates.length - 1, Math.floor((ke + 0.5) * candidates.length / targetCount));
        if (canPickEasy(candidates[posE])) { pick(candidates[posE]); continue; }
        for (var de = 1; de < candidates.length; de++) {
          var ae = candidates[posE + de], be = candidates[posE - de];
          if (ae && canPickEasy(ae)) { pick(ae); break; }
          if (be && canPickEasy(be)) { pick(be); break; }
        }
      }
      if (chosenIndices.size < targetCount) {
        function canPickNorm(c) {
          return !chosenWords.has(c.word - 1) && !chosenWords.has(c.word + 1) && !chosenWords.has(c.word);
        }
        for (var kf = 0; kf < candidates.length && chosenIndices.size < targetCount; kf++) {
          if (canPickNorm(candidates[kf])) pick(candidates[kf]);
        }
      }
    } else {
      // Medium mode (default): isolated blanks spaced evenly
      function canPickMed(c) {
        return !chosenWords.has(c.word - 1) && !chosenWords.has(c.word + 1) && !chosenWords.has(c.word);
      }
      for (var km = 0; km < targetCount && candidates.length; km++) {
        var posM = Math.min(candidates.length - 1, Math.floor((km + 0.5) * candidates.length / targetCount));
        if (canPickMed(candidates[posM])) { pick(candidates[posM]); continue; }
        for (var dm = 1; dm < candidates.length; dm++) {
          var am = candidates[posM + dm], bm = candidates[posM - dm];
          if (am && canPickMed(am)) { pick(am); break; }
          if (bm && canPickMed(bm)) { pick(bm); break; }
        }
      }
    }

    if (chosenIndices.size === 0 && candidates.length) pick(candidates[0]);

    var tokens = [];
    var cIdx = 0;
    for (var n = 0; n < rawTokens.length; n++) {
      var t = rawTokens[n];
      if (chosenIndices.has(n)) {
        tokens.push({
          isCloze: true,
          clozeIdx: cIdx++,
          answer: t,
          cleanAnswer: t.replace(/[.,;:!?'"()[\]{}–—]/g, "").trim().toLowerCase()
        });
      } else {
        tokens.push({ isCloze: false, text: t });
      }
    }

    return { tokens: tokens, clozeCount: cIdx };
  }

  function syncLinguaError(wrongWord, correctWord) {
    if (!wrongWord || !correctWord) return;
    try {
      var api = (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) ? chrome.storage.local : null;
      if (!api) return;
      var errKey = "sf_lingua_errors_en";
      api.get(errKey, function (res) {
        var errs = (res && res[errKey]) || { counts: {}, samples: [] };
        if (!errs.counts) errs.counts = {};
        if (!Array.isArray(errs.samples)) errs.samples = [];
        var cat = "spelling";
        errs.counts[cat] = (errs.counts[cat] || 0) + 1;
        var d = new Date();
        var dateStr = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
        if (errs.samples.length < 200) {
          errs.samples.push({ cat: cat, o: wrongWord, f: correctWord, n: "reader_dictation", d: dateStr });
        }
        var saveObj = {};
        saveObj[errKey] = errs;
        api.set(saveObj, function () {});
      });
    } catch (e) {}
  }

  function detectArticleLanguage(title, sampleContent) {
    var rawSample = String((title || "") + " " + (sampleContent || "")).slice(0, 1500);
    var fullSample = (rawSample && rawSample.normalize) ? rawSample.normalize("NFC") : rawSample;

    // 1. Vietnamese detection (precomposed diacritics + combining diacritical marks)
    if (/[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ\u0300\u0301\u0303\u0309\u0323]/i.test(fullSample)) {
      return "vi";
    }

    // 2. Chinese (CJK characters without Kana)
    if (/[\u4e00-\u9fa5]/.test(fullSample) && !/[\u3040-\u30ff]/.test(fullSample)) {
      return "zh";
    }

    // 3. Japanese (Hiragana/Katakana)
    if (/[\u3040-\u30ff]/.test(fullSample)) {
      return "ja";
    }

    // 4. Russian / Cyrillic
    if (/[\u0400-\u04ff]/.test(fullSample)) {
      return "ru";
    }

    // 5. Korean (Hangul)
    if (/[\uac00-\ud7af]/.test(fullSample)) {
      return "ko";
    }

    // 6. Check document lang attribute
    var docLang = "";
    try {
      docLang = (document.documentElement.lang || (document.body && document.body.getAttribute("lang")) || "").toLowerCase().slice(0, 2);
    } catch (e) {}

    if (docLang && ["vi", "en", "zh", "ja", "ru", "fr", "de", "es", "ko", "it"].includes(docLang)) {
      return docLang;
    }

    return "en";
  }

  // Language-name hints used only when a voice reports no usable `lang`.
  var VOICE_LANG_NAME_HINTS = {
    vi: /\b(vietnamese|vietnam|tiếng việt)\b/i,
    en: /\benglish\b/i,
    zh: /\b(chinese|mandarin|cantonese)\b/i,
    ja: /\bjapanese\b/i,
    ru: /\brussian\b/i,
    fr: /\bfrench\b/i,
    de: /\bgerman\b/i,
    es: /\bspanish\b/i,
    ko: /\bkorean\b/i
  };

  function voiceMatchesLang(v, targetLang) {
    if (!v) return false;
    var vl = String(v.lang || "").toLowerCase().replace("_", "-");
    var primary = vl.split("-")[0];
    if (primary === "cmn" || primary === "yue" || primary === "zho") primary = "zh";
    if (primary === "vie") primary = "vi";
    if (primary === "eng") primary = "en";
    if (primary === "jpn") primary = "ja";
    if (primary === "rus") primary = "ru";
    if (primary === "fra") primary = "fr";
    if (primary === "deu") primary = "de";
    if (primary === "spa") primary = "es";
    if (primary === "kor") primary = "ko";

    if (targetLang === "vi") {
      if (primary === "vi") return true;
      if (/vi[-_]vn/i.test(vl)) return true;
      var vName = String(v.name || "").toLowerCase();
      if (/\b(vietnamese|tiếng việt|tieng viet)\b/i.test(vName)) return true;
      if (/\b(hoaimy|namminh)\b/i.test(vName.replace(/\s+/g, ""))) return true;
      return false;
    }

    if (primary) return primary === targetLang;
    // No lang tag: fall back to an explicit language name in the voice name.
    var hint = VOICE_LANG_NAME_HINTS[targetLang];
    return !!(hint && hint.test(v.name || ""));
  }

  function getVoicesForArticle(targetLang, searchQuery, strict) {
    if (typeof window === "undefined" || !window.speechSynthesis) return [];
    var allVoices = window.speechSynthesis.getVoices() || [];
    if (!targetLang) targetLang = readerAudio.articleLang || "all";
    targetLang = targetLang.toLowerCase();

    var matched = allVoices;

    if (targetLang !== "all") {
      matched = allVoices.filter(function (v) {
        return voiceMatchesLang(v, targetLang);
      });

      // Only the speech engine may fall back to any voice; the filtered
      // dropdown must never leak voices from other languages.
      if (matched.length === 0 && !strict) {
        matched = allVoices;
      }
    }

    if (searchQuery) {
      var q = String(searchQuery).trim().toLowerCase();
      if (q) {
        matched = matched.filter(function (v) {
          var name = (v.name || "").toLowerCase();
          var lang = (v.lang || "").toLowerCase();
          return name.includes(q) || lang.includes(q);
        });
      }
    }

    // Sort: Natural/Neural/Online voices first, then regional priority
    matched.sort(function (a, b) {
      var aNat = /natural|neural|online/i.test(a.name) ? 1 : 0;
      var bNat = /natural|neural|online/i.test(b.name) ? 1 : 0;
      if (aNat !== bNat) return bNat - aNat;

      if (targetLang === "vi" || (/^vi/i.test(a.lang) && !/^vi/i.test(b.lang))) {
        var aVi = /^vi/i.test(a.lang) ? 1 : 0;
        var bVi = /^vi/i.test(b.lang) ? 1 : 0;
        if (aVi !== bVi) return bVi - aVi;
      }

      if (targetLang === "en") {
        var aUS = /en[-_]US/i.test(a.lang) ? 1 : 0;
        var bUS = /en[-_]US/i.test(b.lang) ? 1 : 0;
        if (aUS !== bUS) return bUS - aUS;
      }

      return a.name.localeCompare(b.name);
    });

    return matched;
  }

  function findBestVoiceForArticle(targetLang) {
    var voices = getVoicesForArticle(targetLang);
    if (voices.length === 0) return null;

    if (readerPrefs.preferredVoice) {
      var match = voices.find(function (v) { return v.name === readerPrefs.preferredVoice; });
      if (match) return match;
    }

    var natural = voices.find(function (v) { return /natural|neural|online/i.test(v.name); });
    return natural || voices[0] || null;
  }

  // Anti-hang speak sentence implementation
  function speakReaderSentence(text, rate, onEndCallback) {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      if (typeof onEndCallback === "function") onEndCallback();
      return;
    }

    clearSpeechTimers();
    var currentSeq = ++readerAudio.speechSeq;

    try {
      window.speechSynthesis.cancel();
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      var u = new SpeechSynthesisUtterance(String(text || ""));
      var v = readerAudio.voice || findBestVoiceForArticle(readerAudio.articleLang);
      if (v) u.voice = v;
      u.lang = (v && v.lang) ? v.lang : "en-US";
      u.rate = rate || readerAudio.rate || 0.95;

      readerAudio.activeUtterance = u;

      var hasFinished = false;
      function finishSpeech() {
        if (hasFinished) return;
        hasFinished = true;
        clearSpeechTimers();
        if (readerAudio.activeUtterance === u) {
          readerAudio.activeUtterance = null;
        }
        // Only trigger onEnd if this utterance belongs to the active speech sequence
        if (readerAudio.speechSeq === currentSeq && !readerAudio.isSwitchingVoice) {
          if (typeof onEndCallback === "function") onEndCallback();
        }
      }

      u.onend = function () {
        finishSpeech();
      };
      u.onerror = function () {
        finishSpeech();
      };

      // Keep-alive interval for Chromium/Edge: pause/resume every 9s prevents browser sleep
      readerAudio.keepAliveTimer = setInterval(function () {
        if (window.speechSynthesis && window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
          window.speechSynthesis.pause();
          window.speechSynthesis.resume();
        }
      }, 9000);

      // Watchdog timer: if engine fails to trigger onend, automatically advance
      var wordsCount = (text || "").trim().split(/\s+/).length;
      var maxWaitMs = Math.max(4500, Math.round(((wordsCount * 700) / (rate || 0.95)) + 4000));
      readerAudio.watchdogTimer = setTimeout(function () {
        if (readerAudio.speechSeq === currentSeq) {
          console.warn("Reader speech watchdog triggered fallback advance after", maxWaitMs, "ms");
          finishSpeech();
        }
      }, maxWaitMs);

      // Microtask delay for cancel cleanup
      setTimeout(function () {
        if (readerAudio.speechSeq === currentSeq && !readerAudio.isSwitchingVoice) {
          try { window.speechSynthesis.speak(u); } catch (e) { finishSpeech(); }
        }
      }, 40);

    } catch (e) {
      clearSpeechTimers();
      readerAudio.activeUtterance = null;
      if (readerAudio.speechSeq === currentSeq && typeof onEndCallback === "function") {
        onEndCallback();
      }
    }
  }

  // --- Noise & Content Classification Selectors ---
  var NOISE_SELECTORS = [
    'header', 'footer', 'nav', 'aside',
    '.sidebar', '#sidebar', '.aside',
    '.comments', '#comments', '.comment-section', '#disqus_thread',
    '.ad', '.ads', '.advert', '.advertisement', '.advertising', '.ad-box', '.ad-wrapper',
    '.banner', '.banner-ad', '.sponsor', '.sponsored',
    '.share', '.sharing', '.social-share', '.share-bar', '.share-buttons', '.social-links',
    // Related & News List Selectors
    '.related', '.related-posts', '.related-news', '.related-articles', '.related-stories', '.related-links', '.related-content', '.related-topics', '.related-box', '.related-items', '.related-stream', '.related-section',
    '.box-tin-lien-quan', '.tin-lien-quan', '.tin-cung-chuyen-muc', '.tin-khac', '.bai-lien-quan', '.cung-chuyen-muc', '.box-category', '.tin-noi-bat', '.tin-moi-nhat',
    '.item-news', '.item-news-common', '.box-tinlienquan', '.relative_new', '.box-category-related', '.list-news-related', '.list_sub_xemnhieu', '.box-item-news', '.box_category', '.list-sub-feature', '.inner-article', '.news-relative', '.related-card', '.card-news', '.story-card', '.thumb-art', '.title-news',
    '.more-news', '.more-stories', '.more-articles', '.more-from', '.more-posts', '.more-content', '.more-top-stories',
    '.read-next', '.read-more-box', '.read-more-list', '.next-stories', '.next-up', '.up-next', '.read-next-container',
    '.latest-news', '.latest-stories', '.latest-articles', '.latest-posts', '.latest-updates',
    '.top-stories', '.top-news', '.trending-news', '.trending-articles', '.trending-stories', '.most-read', '.popular-posts', '.popular-news',
    '.recommend', '.recommendation', '.recommendations', '.suggested', '.suggested-stories', '.suggested-articles', '.recommended', '.recommended-stories', '.recommend-box',
    '.news-list', '.article-list', '.story-list', '.post-list', '.listing-news', '.list-news', '.news-stream', '.river-news', '.box-listing', '.feed-grid',
    '.tags', '.tag-list', '.article-tags', '.topic-tags', '.tags-container', '.keywords',
    '.newsletter', '.subscribe-box', '.subscription', '.signup-box',
    '.breadcrumb', '.breadcrumbs', '.parent_cate', '.cate-header', '.category-header', '.detail-cate', '.chuyen-muc', '.topic-header',
    '.date', '.format_time', '.author-time', '.time-header', '.detail-time', '.author-date',
    '.site-header', '.header-logo', '.navbar', '.nav-bar', '.main-nav', '.site-nav', '.navigation',
    '.author-bio', '.author-box', '.about-author', '.author-info',
    '.modal', '.popup', '.dialog', '.overlay',
    // Outbrain, Taboola, Recommender widgets
    '.outbrain', '.taboola', '.mgid', '.zemanta', '.content-recommender', '.sponsored-stories',
    'ytd-comments', 'ytd-watch-next-secondary-results-renderer', 'ytd-masthead', 'ytd-live-chat-frame',
    '[role="complementary"]', '[role="navigation"]', '[role="banner"]', '[role="dialog"]',
    '[data-component="related"]', '[data-component="recommendations"]', '[data-component="top-stories"]',
    '[data-testid="related-topics"]', '[data-testid="latest-news"]', '[data-testid="most-read"]', '[data-testid="read-next"]',
    '[aria-label*="related" i]', '[aria-label*="recommend" i]', '[aria-label*="more stories" i]',
    '[aria-hidden="true"]'
  ];

  var RELATED_SECTION_RE = /^(related\s*(stories|articles|news|topics|content|links|posts|coverage)?|more\s*(stories|from|news|articles|posts|content|on\s*this)?|read\s*next|up\s*next|next\s*stories|recommended\s*(for\s*you|stories|articles|reading)?|top\s*stories|most\s*(popular|read|viewed)|latest\s*(news|stories|articles|updates)|don't\s*miss|around\s*the\s*web|trending\s*(now|stories|news)?|you\s*may\s*(also\s*)?like|what\s*to\s*read\s*next|tin\s*(liên\s*quan|cùng\s*chuyên\s*mục|khác|mới\s*nhất|nổi\s*bật|tương\s*tự)|bài\s*(viết\s*)?(liên\s*quan|cùng\s*chủ\s*đề)|xem\s*thêm|đọc\s*(thêm|tiếp)|cùng\s*chuyên\s*mục|có\s*thể\s*bạn\s*quan\s*tâm|tiêu\s*điểm|đáng\s*chú\s*ý|bài\s*cùng\s*tác\s*giả|tin\s*vắn|相关(新闻|文章|推荐)|推荐阅读|最新(资讯|新闻)|猜你喜欢|热门推荐|関連記事|おすすめ記事|最新ニュース|こちらもおすすめ|関連トピック|похожие\s*статьи|читайте\s*также|другие\s*новости|новости\s*по\s*теме)[\s:–—\-]*$/i;

  var JUNK_TEXT_RE = /^(advertisement|sponsored|read more|also read|xem thêm|bài viết liên quan|tin liên quan|ảnh:|photo:|nguồn:|theo\s|theo dõi chúng tôi|follow us|sign up|subscribe|all rights reserved|bản quyền thuộc|chia sẻ qua|đăng ký nhận tin|photo courtesy of|reporting by|editing by|image caption:|getty images|ap photo|reuters\/|afp photo|download the app|listen to this article)/i;

  function isNoiseNode(el) {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return false;
    if (el.tagName === "NAV" || el.closest("nav")) return true;
    try {
      for (var i = 0; i < NOISE_SELECTORS.length; i++) {
        if (el.closest(NOISE_SELECTORS[i])) return true;
      }
    } catch (e) {}

    var idClass = ((el.id || "") + " " + (el.className || "")).toLowerCase();
    if (/(comment|sidebar|related|popular|advert|banner|promo|social|share|cookie|popup|modal|sponsor|recommend|suggested|newsletter|breadcrumb|tag-list|author-bio|read-more|also-read|inline-ad|more-news|more-stories|read-next|latest-news|top-stories|most-read|outbrain|taboola|mgid|news-list|story-list|box-category|item-news|tinlienquan|box-tin|thumb-art|title-news|cate-header|category-header|chuyen-muc|parent_cate|format_time|author-time|publish-date|site-header|header-logo|main-nav|site-nav|navbar)/i.test(idClass)) {
      return true;
    }
    return false;
  }

  function getLinkDensity(el) {
    var textLen = (el.textContent || "").trim().length;
    if (textLen === 0) return 0;
    var linkElements = el.querySelectorAll("a");
    var linkLen = 0;
    for (var i = 0; i < linkElements.length; i++) {
      linkLen += (linkElements[i].textContent || "").trim().length;
    }
    return linkLen / textLen;
  }


  function normalizeTextForComparison(str) {
    if (!str) return "";
    return String(str)
      .toLowerCase()
      .replace(/[\s\r\n\t\.,;:!?'"`\-—_()[\]{}|/\\]+/g, "");
  }

  function cleanCaptionText(text) {
    if (!text) return "";
    var str = String(text).replace(/\s+/g, " ").trim();

    if (/^[\(\[]?(?:photo|ảnh|image|credit|nguồn|courtesy|source)\s*[:\/\-–\s]/i.test(str)) {
      if (str.length < 80) return "";
    }
    if (/^[\(\[]?(?:afp|reuters|ap|getty\s*images|ttxvn|vna|epa|bloomberg|kyodo|shutterstock)[\)\]]?$/i.test(str)) {
      return "";
    }

    str = str.replace(/\s*[\(\[]\s*(?:photo|ảnh|image|credit|nguồn|courtesy|source)\s*(?:by|:|of|from|via|\/|-|–)\s*[^)\]]+[\)\]]\s*$/i, "");
    str = str.replace(/\s*[\(\[]\s*(?:afp|reuters|ap|getty\s*images|ttxvn|vna|epa|bloomberg|ap\s*photo)\s*[^)\]]*[\)\]]\s*$/i, "");
    str = str.replace(/[\s\.\,\;\|\-]+(?:photo|ảnh|image|credit|nguồn|courtesy|source)\s*(?:by|:|of|from|via|\/|-|–)\s*[^\n]+$/i, "");
    str = str.replace(/[\s\.\,\;\|\-]+(?:photo\s+(?:by|from|via)\s+[^\n]+)$/i, "");
    str = str.replace(/[\s\.\,\;\|\-]+(?:ảnh\s*(?::|chụp\s*từ|do)\s*[^\n]+)$/i, "");
    str = str.replace(/[\s\.\,\;\|\-]+(?:photo\s*:\s*[^\n]+)$/i, "");
    str = str.replace(/[\s\.\,\;\|\-]+(?:photo\s+from\s+[^\n]+)$/i, "");
    str = str.replace(/[\s\.\,\;\|\-]+(?:photo\s+by\s+[^\n]+)$/i, "");
    str = str.replace(/[\s\.\,\;\|\-]+$/, "");

    return str.trim();
  }

  // Standalone (spacing) tone glyphs that broken fonts/copy-paste emit instead
  // of real combining marks, mapped to their combining equivalents.
  var SPACING_TONE_TO_COMBINING = {
    "\u00B4": "\u0301", "\u02CA": "\u0301", // acute  -> sắc
    "\u0060": "\u0300", "\u02CB": "\u0300", // grave  -> huyền
    "\u02DC": "\u0303"                      // tilde  -> ngã
  };
  var VI_VOWELS = "aăâeêioôơuưyAĂÂEÊIOÔƠUƯY";

  function nfc(s) {
    return (s && s.normalize) ? s.normalize("NFC") : s;
  }

  function cleanVietnameseAccents(str) {
    if (!str) return "";
    // 1) NFC merges decomposed ("tổ hợp") Vietnamese into precomposed letters
    //    without losing any tone mark.
    var s = nfc(String(str));
    if (!/[\u00B4\u02CA\u0060\u02CB\u02DC]/.test(s)) {
      return s.replace(/\s+/g, " ").trim();
    }
    // 2) Repair spacing tone glyphs glued after a vowel, e.g. "phâ` n" -> "phần".
    //    The following fragment is re-joined only if it is a valid syllable final.
    var re = new RegExp(
      "([" + VI_VOWELS + "])([\\u00B4\\u02CA\\u0060\\u02CB\\u02DC])(?:\\s(?=(?:ng|nh|ch|[nmtcp]|[iouy])(?![\\p{L}])))?",
      "gu"
    );
    s = s.replace(re, function (m, vowel, tone) {
      return nfc(vowel + SPACING_TONE_TO_COMBINING[tone]);
    });
    return nfc(s).replace(/\s+/g, " ").trim();
  }

  function cleanParagraphText(text) {
    if (!text) return "";
    var str = cleanVietnameseAccents(String(text).replace(/\s+/g, " ").trim());
    str = str.replace(/\s*[\(\[]\s*(?:photo|ảnh|image|credit|nguồn|courtesy|source)\s*(?:by|:|of|from|via|\/|-|–)\s*[^)\]]+[\)\]]\s*$/i, "");
    str = str.replace(/[\s\.\,\;\|\-]+(?:photo|ảnh|image|credit|nguồn|courtesy|source)\s*(?:by|:|of|from|via|\/|-|–)\s*[^\n]+$/i, "");
    str = str.replace(/[\s\.\,\;\|\-]+(?:photo\s+(?:by|from|via)\s+[^\n]+)$/i, "");
    str = str.replace(/[\s\.\,\;\|\-]+(?:ảnh\s*(?::|chụp\s*từ|do)\s*[^\n]+)$/i, "");
    str = str.replace(/[\s\.\,\;\|\-]+(?:photo\s*:\s*[^\n]+)$/i, "");
    str = str.replace(/[\s\.\,\;\|\-]+(?:photo\s+from\s+[^\n]+)$/i, "");
    str = str.replace(/[\s\.\,\;\|\-]+(?:photo\s+by\s+[^\n]+)$/i, "");
    str = str.replace(/[\s\.\,\;\|\-]+$/, "");
    return str.trim();
  }

  function extractImageInfo(imgEl) {
    if (!imgEl || imgEl.tagName !== "IMG") return null;

    if (isNoiseNode(imgEl)) return null;

    // Reject thumbnails and related news cards
    var linkParent = imgEl.closest("a");
    if (linkParent) {
      var href = linkParent.getAttribute("href") || "";
      if (href && !/\.(jpe?g|png|webp|avif|gif)(\?.*)?$/i.test(href)) {
        return null;
      }
    }
    if (imgEl.closest(".thumb, .thumb-art, .thumbnail, .thumb-news, .news-thumb, .item-news, .inner-article, .story-card, .related-card, .card-news, .box-tinlienquan, .relative_new, .box-category-related, .list-news-related")) {
      return null;
    }

    var src = imgEl.getAttribute("data-src") ||
              imgEl.getAttribute("data-original") ||
              imgEl.getAttribute("data-lazy-src") ||
              imgEl.getAttribute("data-actualsrc") ||
              imgEl.getAttribute("data-full") ||
              imgEl.currentSrc ||
              imgEl.getAttribute("src") || "";

    if (!src && imgEl.getAttribute("srcset")) {
      var parts = imgEl.getAttribute("srcset").split(",");
      if (parts.length > 0) {
        src = parts[parts.length - 1].trim().split(" ")[0];
      }
    }

    if (!src || src.startsWith("data:image/svg") || (src.startsWith("data:image/gif") && src.length < 250)) {
      return null;
    }

    if (/avatar|icon|logo|badge|emoji|pixel|tracker|analytics|button|spacer|banner|thumb/i.test(src)) {
      return null;
    }

    var rect = imgEl.getBoundingClientRect();
    var w = imgEl.naturalWidth || rect.width || parseInt(imgEl.getAttribute("width") || "0", 10);
    var h = imgEl.naturalHeight || rect.height || parseInt(imgEl.getAttribute("height") || "0", 10);
    if ((w > 0 && w < 160) || (h > 0 && h < 110)) {
      return null;
    }

    if (!/^(https?:|data:image\/)/i.test(src)) {
      return null;
    }

    var caption = "";
    var fig = imgEl.closest("figure, table.tplCaption, .tplCaption, .image-container, .img-container, .photo-box, .media-block, .detail-image, .fig-picture");
    if (fig) {
      var figCap = fig.querySelector("figcaption, .caption, .image-caption, .photo-caption, .media-caption, .desc, .desc_cation, p.Image, p.desc_cation, .fig-caption");
      if (figCap) caption = (figCap.textContent || "").trim();
    }
    if (!caption) {
      var nextEl = imgEl.nextElementSibling;
      if (nextEl && /^(p|figcaption|div|span)$/i.test(nextEl.tagName)) {
        var nClass = ((nextEl.className || "") + " " + (nextEl.id || "")).toLowerCase();
        if (/(caption|desc|photo|image)/i.test(nClass)) {
          caption = (nextEl.textContent || "").trim();
        }
      }
    }
    if (!caption) {
      caption = (imgEl.getAttribute("alt") || imgEl.getAttribute("title") || "").trim();
    }

    return { src: src, caption: caption };
  }

  function extractVideoInfo(el) {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return null;
    var tag = el.tagName ? el.tagName.toLowerCase() : "";

    // 1. Direct <video> tag
    if (tag === "video") {
      var vSrc = el.getAttribute("src") || (el.querySelector("source") ? el.querySelector("source").getAttribute("src") : "") || el.currentSrc || "";
      if (vSrc && !vSrc.startsWith("blob:")) {
        var poster = el.getAttribute("poster") || "";
        return { type: "video", src: vSrc, poster: poster };
      }
    }

    // 2. Direct <iframe> tag
    if (tag === "iframe") {
      var iSrc = el.getAttribute("src") || el.getAttribute("data-src") || "";
      if (iSrc && /youtube|vimeo|dailymotion|embed|player|video|stream|bbc\.co|cnn\.com|vnexpress|tuoitre|vtv/i.test(iSrc)) {
        return { type: "iframe", src: iSrc };
      }
    }

    // 3. Container holding video or iframe
    var innerVideo = el.querySelector("video");
    if (innerVideo) {
      var ivSrc = innerVideo.getAttribute("src") || (innerVideo.querySelector("source") ? innerVideo.querySelector("source").getAttribute("src") : "") || innerVideo.currentSrc || "";
      if (ivSrc && !ivSrc.startsWith("blob:")) {
        return { type: "video", src: ivSrc, poster: innerVideo.getAttribute("poster") || "" };
      }
    }

    var innerIframe = el.querySelector("iframe");
    if (innerIframe) {
      var iiSrc = innerIframe.getAttribute("src") || innerIframe.getAttribute("data-src") || "";
      if (iiSrc && /youtube|vimeo|dailymotion|embed|player|video|stream|bbc\.co|cnn\.com|vnexpress|tuoitre|vtv/i.test(iiSrc)) {
        return { type: "iframe", src: iiSrc };
      }
    }

    // 4. Data-attribute video source (e.g. data-video-src, data-src ending in .mp4 or containing video player)
    var dataSrc = el.getAttribute("data-video-src") || el.getAttribute("data-src") || el.getAttribute("data-url") || "";
    if (dataSrc && /\.(mp4|webm|m4v)(\?.*)?$/i.test(dataSrc)) {
      return { type: "video", src: dataSrc, poster: el.getAttribute("data-poster") || "" };
    }
    if (dataSrc && /youtube|vimeo|dailymotion|embed|player|video/i.test(dataSrc)) {
      return { type: "iframe", src: dataSrc };
    }

    return null;
  }

  function pickBestArticleContainer() {
    var selectors = [
      "article", "[itemprop='articleBody']", "[itemprop='article']",
      ".article-body", ".article__body", ".story-body", ".post-content",
      ".entry-content", ".content-detail", ".detail-content", ".fck_detail",
      ".content_detail", "#article-body", "main", "[role='main']",
      "#main-content", ".main-content"
    ];

    var candidates = [];
    var seen = new Set();
    selectors.forEach(function (sel) {
      try {
        var els = document.querySelectorAll(sel);
        for (var i = 0; i < els.length; i++) {
          var el = els[i];
          if (el && !seen.has(el) && el !== document.body && el !== document.documentElement) {
            seen.add(el);
            candidates.push(el);
          }
        }
      } catch (e) {}
    });

    if (candidates.length === 0) {
      return document.querySelector("article") || document.querySelector("main") || document.querySelector("[role='main']") || document.body;
    }

    var bestEl = null;
    var bestScore = -100;
    var GOOD_RE = /(article|entry|post|story|body|content|text|paratext)/i;
    var NOISE_RE = /(comment|sidebar|related|popular|widget|advert|banner|promo|social|share|cookie|popup|modal|dialog|footer|nav|header)/i;

    for (var j = 0; j < candidates.length; j++) {
      var candidate = candidates[j];
      var score = 0;
      var tag = candidate.tagName;
      if (tag === "ARTICLE") score += 35;
      else if (tag === "MAIN") score += 25;
      else if (tag === "SECTION" || tag === "DIV") score += 10;

      var idClass = (candidate.id || "") + " " + (candidate.className || "");
      if (GOOD_RE.test(idClass)) score += 30;
      if (NOISE_RE.test(idClass)) score -= 45;

      var pElements = candidate.querySelectorAll("p");
      score += Math.min(60, pElements.length * 6);

      var imgElements = candidate.querySelectorAll("img, figure");
      score += Math.min(25, imgElements.length * 5);

      var textLength = (candidate.textContent || "").trim().length;
      if (textLength < 100) score -= 50;
      else score += Math.min(60, Math.floor(textLength / 120));

      var density = getLinkDensity(candidate);
      if (density > 0.5) score -= 70;

      if (score > bestScore) {
        bestScore = score;
        bestEl = candidate;
      }
    }

    return (bestScore > 15 && bestEl) ? bestEl : (document.querySelector("article") || document.querySelector("main") || document.body);
  }

  function toggleReaderMode() {
    if (isReaderMode) {
      clearSpeechTimers();
      if (typeof window !== "undefined" && window.speechSynthesis) {
        try { window.speechSynthesis.cancel(); } catch (e) {}
      }
      readerAudio.isPlaying = false;
      readerAudio.isDictationMode = false;
      readerAudio.currentIndex = -1;
      readerAudio.sentences = [];
      readerAudio.activeUtterance = null;

      // Cleanly remove any existing dictation drawers or modals
      var existingDrawer = document.getElementById("sf-dictation-drawer");
      if (existingDrawer) existingDrawer.remove();

      if (readerContainer) {
        readerContainer.remove();
        readerContainer = null;
      }
      if (scrollbarStyleEl) {
        scrollbarStyleEl.remove();
        scrollbarStyleEl = null;
      }

      // Restore original document.body display cleanly
      if (document.body) {
        if (originalBodyDisplay && originalBodyDisplay !== "none") {
          document.body.style.display = originalBodyDisplay;
        } else {
          document.body.style.removeProperty("display");
        }
      }

      isReaderMode = false;
      return;
    }

    isReaderMode = true;
    originalBodyDisplay = (document.body && document.body.style && document.body.style.display !== "none")
      ? document.body.style.display
      : "";

    var mainContainer = pickBestArticleContainer();

    // Extract Title (prefer specific article title selectors, avoid site logo/header h1)
    var articleTitle = "";
    var h1Candidate = (mainContainer && (mainContainer.querySelector("h1.title-detail, h1.title-news, h1.article-title, h1.singular-title, h1.detail-title, h1:not(.logo):not(.site-logo)") || mainContainer.querySelector("h1"))) || document.querySelector("article h1, h1.title-detail, h1.title-news, h1.article-title, h1:not(.logo):not(.site-logo), h1");
    if (h1Candidate && !isNoiseNode(h1Candidate)) {
      articleTitle = (h1Candidate.textContent || "").trim();
    }
    if (!articleTitle) {
      articleTitle = (document.title || "").split(/[-|–—]/)[0].trim();
    }

    // Detect language of the article (Vietnamese, English, Chinese, Japanese, Russian, etc.)
    readerAudio.articleLang = detectArticleLanguage(articleTitle, mainContainer ? mainContainer.textContent : "");

    // Extract Article Items in Natural Flow (Headings, Paragraphs, Images)
    var articleItems = [];
    var seenImages = new Set();
    var seenVideos = new Set();
    var seenTextHashes = new Set();
    var seenCaptionElements = new Set();
    var knownCaptions = new Set();

    if (mainContainer) {
      function registerCaption(txt) {
        if (!txt) return;
        var raw = String(txt).trim();
        if (raw) {
          knownCaptions.add(raw.toLowerCase());
          var norm = normalizeTextForComparison(raw);
          if (norm) knownCaptions.add(norm);
          var cleaned = cleanCaptionText(raw);
          if (cleaned) {
            knownCaptions.add(cleaned.toLowerCase());
            var normClean = normalizeTextForComparison(cleaned);
            if (normClean) knownCaptions.add(normClean);
          }
        }
      }

      // Pre-scan all figure / image containers to mark their caption elements and texts
      var allFigures = mainContainer.querySelectorAll("figure, table.tplCaption, .tplCaption, .image-container, .img-container, .photo-box, .media-block, .detail-image, .fig-picture");
      allFigures.forEach(function (fig) {
        var capEls = fig.querySelectorAll("figcaption, .caption, .image-caption, .photo-caption, .media-caption, .desc, .desc_cation, p.Image, p.desc_cation, .fig-caption, p, span, i, em, td");
        capEls.forEach(function (c) {
          seenCaptionElements.add(c);
          var cTxt = (c.textContent || "").trim();
          registerCaption(cTxt);
        });
      });

      var standaloneCaps = mainContainer.querySelectorAll(".caption, .image-caption, .photo-caption, .media-caption, .fig-caption, .desc_cation, p.Image, p.desc_cation, [itemprop='caption']");
      standaloneCaps.forEach(function (sc) {
        seenCaptionElements.add(sc);
        registerCaption(sc.textContent);
      });

      var elements = Array.from(mainContainer.querySelectorAll("h1, h2, h3, h4, h5, p, figure, img, blockquote, video, iframe, [data-component='video-block'], [data-e2e='media-player'], .media-player, .video-container, .box_embed_video, [data-video-src]"));
      var paragraphCount = 0;

      for (var i = 0; i < elements.length; i++) {
        var el = elements[i];
        if (isNoiseNode(el)) continue;

        var tag = el.tagName.toLowerCase();

        // 1. Check for end-of-article boundary (Related / More News / Read Next section)
        if (tag === "h1" || tag === "h2" || tag === "h3" || tag === "h4" || tag === "h5") {
          // If the heading is inside a related news card or container
          if (el.closest(".item-news, .box-tinlienquan, .relative_new, .box-category-related, .list-news-related, .list_sub_xemnhieu, .box-item-news, .list-sub-feature, .inner-article, .news-relative, .related-card, .card-news, .story-card, .thumb-art, .title-news")) {
            if (paragraphCount >= 2) break;
            continue;
          }

          // If the heading contains an <a> tag linking to another article, it is NOT an article section heading
          var headingLink = el.querySelector("a[href]") || el.closest("a[href]");
          if (headingLink) {
            var href = headingLink.getAttribute("href") || "";
            if (href && !href.startsWith("#")) {
              if (paragraphCount >= 2) break; // We reached the related articles block!
              continue;
            }
          }

          var hText = (el.textContent || "").trim();
          if (paragraphCount >= 2 && RELATED_SECTION_RE.test(hText)) {
            // Once the main article content is read and a 'Related Stories' / 'More News' header is reached, STOP!
            break;
          }
          // Filter out section/category navigation names (e.g. Thời sự, Kinh doanh, v.v.)
          if (/^(thời sự|góc nhìn|thế giới|kinh doanh|bất động sản|khoa học|giải trí|thể thao|pháp luật|giáo dục|sức khỏe|đời sống|du lịch|số hóa|xe|ý kiến|tâm sự|thư giãn|trang chủ|chính trị|văn hóa|quân sự|tin tức)$/i.test(hText.toLowerCase())) {
            continue;
          }
          if (hText.length > 5 && hText !== articleTitle && !JUNK_TEXT_RE.test(hText)) {
            articleItems.push({ type: "heading", level: tag, text: hText });
          }
          continue;
        }

        // If after 2+ paragraphs we enter a related/recommendations container, STOP!
        if (paragraphCount >= 2 && el.closest(".related, .related-posts, .related-news, .related-articles, .related-stories, .more-news, .more-stories, .read-next, .read-next-container, .box-tin-lien-quan, .tin-lien-quan, .box-category, .outbrain, .taboola, .content-recommender, .item-news, .item-news-common, .box-tinlienquan, .relative_new, .box-category-related, .list-news-related, .list_sub_xemnhieu, .box-item-news, .list-sub-feature, .inner-article, .news-relative, .related-card, .card-news, .story-card, .box_category")) {
          break;
        }

        // 2. Figure (check for video first, then image)
        if (tag === "figure") {
          var figVidInfo = extractVideoInfo(el);
          var figCapEl = el.querySelector("figcaption, .caption, .desc, .desc_cation");
          var figCapText = figCapEl ? cleanCaptionText(figCapEl.textContent || "") : "";

          if (figVidInfo && !seenVideos.has(figVidInfo.src)) {
            seenVideos.add(figVidInfo.src);
            figVidInfo.caption = figCapText;
            if (figCapText) registerCaption(figCapText);
            articleItems.push(figVidInfo);
            continue;
          }

          var img = el.querySelector("img");
          if (img && !seenImages.has(img)) {
            seenImages.add(img);
            var info = extractImageInfo(img);
            if (info) {
              var cleanCap = cleanCaptionText(info.caption || figCapText);
              registerCaption(info.caption);
              registerCaption(cleanCap);
              articleItems.push({ type: "image", src: info.src, caption: cleanCap });
            }
          }
          continue;
        }

        // 3. Embedded Video / Iframe / Video wrappers
        var directVidInfo = extractVideoInfo(el);
        if (directVidInfo && !seenVideos.has(directVidInfo.src)) {
          seenVideos.add(directVidInfo.src);
          articleItems.push(directVidInfo);
          continue;
        }

        // 4. Standalone Image
        if (tag === "img") {
          if (!seenImages.has(el)) {
            seenImages.add(el);
            var imgInfo = extractImageInfo(el);
            if (imgInfo) {
              var cleanCap2 = cleanCaptionText(imgInfo.caption);
              registerCaption(imgInfo.caption);
              registerCaption(cleanCap2);
              articleItems.push({ type: "image", src: imgInfo.src, caption: cleanCap2 });
            }
          }
          continue;
        }

        // 4. Paragraphs or Blockquotes
        if (tag === "p" || tag === "blockquote") {
          // Exclude if it is part of a figure or marked as caption
          if (seenCaptionElements.has(el) || el.closest("figure, figcaption, table.tplCaption, .tplCaption, .fig-picture, .desc_cation, .image-container, .img-container, .photo-box")) continue;

          // Exclude if inside list containers (navigation or article listings)
          if (el.closest("ul, ol, nav, aside, .news-list, .article-list, .story-list, .box-listing, .listing-news, .item-news, .box-tinlienquan, .relative_new, .box-category-related, .list-news-related, .thumb-art, .title-news")) continue;

          var pClass = ((el.className || "") + " " + (el.id || "")).toLowerCase();
          if (/(caption|image-desc|photo-desc|fig-cap|media-credit|pic-caption|art-credit|photocaption|desc_cation|\bimage\b)/i.test(pClass)) {
            continue;
          }

          var innerImg = el.querySelector("img");
          if (innerImg && !seenImages.has(innerImg)) {
            seenImages.add(innerImg);
            var pImgInfo = extractImageInfo(innerImg);
            if (pImgInfo) {
              var cleanPImgCap = cleanCaptionText(pImgInfo.caption);
              registerCaption(pImgInfo.caption);
              registerCaption(cleanPImgCap);
              articleItems.push({ type: "image", src: pImgInfo.src, caption: cleanPImgCap });
            }
          }

          var rawPText = (el.textContent || "").replace(/\s+/g, " ").trim();
          if (rawPText.length < 20) continue;

          // Check if paragraph is just a promotional link or related article recommendation
          var linkElements = el.querySelectorAll("a");
          if (linkElements.length > 0) {
            var totalLinkLen = 0;
            for (var li = 0; li < linkElements.length; li++) {
              totalLinkLen += (linkElements[li].textContent || "").trim().length;
            }
            var density = rawPText.length > 0 ? (totalLinkLen / rawPText.length) : 0;
            var nonLinkLen = rawPText.length - totalLinkLen;

            // If the paragraph is virtually 100% link (>88% of text is in <a>), it's a stand-alone article link
            if (density > 0.88) {
              continue;
            }
            // If link density is high (>68%) AND there's very little surrounding context (<22 chars),
            // it's a prompt link like ">> Click here to read full story" or "Read also: Article Title"
            if (density > 0.68 && nonLinkLen < 22) {
              continue;
            }
          }

          if (JUNK_TEXT_RE.test(rawPText)) continue;

          // Filter date, time, and byline lines common in Vietnamese news
          if (/^(thứ\s+(hai|ba|tư|năm|sáu|bảy)|chủ\s*nhật|\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4}|\d{1,2}:\d{2}|gmt[\+\-]\d)/i.test(rawPText)) {
            continue;
          }
          if (/^(trang\s*chủ|home)\s*[>\/|–—]/i.test(rawPText) || /^[a-zà-ỹ\s]+[>\/][a-zà-ỹ\s]+$/i.test(rawPText.trim())) {
            continue;
          }
          if (/^(thời sự|góc nhìn|thế giới|kinh doanh|bất động sản|khoa học|giải trí|thể thao|pháp luật|giáo dục|sức khỏe|đời sống|du lịch|số hóa|xe|ý kiến|tâm sự|thư giãn)$/i.test(rawPText.trim().toLowerCase())) {
            continue;
          }

          // Prompt phrase filter (e.g., 'Xem thêm:', 'Read also:')
          if (/^(xem thêm|đọc thêm|bài viết liên quan|tin liên quan|cùng chủ đề|read also|see also|related|also read|read more|more on this|continue reading)[\s:–—\-]/i.test(rawPText)) {
            continue;
          }

          var cleanP = cleanParagraphText(rawPText);
          if (cleanP.length < 15) continue;

          // Prevent caption text from appearing as a paragraph
          var lowP = cleanP.toLowerCase();
          var normP = normalizeTextForComparison(cleanP);
          var isCapDupe = false;
          knownCaptions.forEach(function (cap) {
            if (!cap || cap.length < 15) return;
            if (lowP === cap || lowP.includes(cap) || cap.includes(lowP)) {
              isCapDupe = true;
            }
            if (normP && (normP === cap || normP.includes(cap) || cap.includes(normP))) {
              isCapDupe = true;
            }
          });
          if (isCapDupe) continue;

          var hash = cleanP.slice(0, 45);
          if (seenTextHashes.has(hash)) continue;
          seenTextHashes.add(hash);

          paragraphCount++;
          articleItems.push({ type: "paragraph", text: cleanP, isQuote: tag === "blockquote" });
        }
      }
    }

    // Hide original body, show reader container
    if (document.body) {
      document.body.style.display = "none";
    }

    // Themes Color Palette (Optimized contrast for light/sepia theme)
    var THEME_STYLES = {
      dark: {
        bg: "#090d16",
        barBg: "rgba(15, 23, 42, 0.96)",
        text: "#cbd5e1",
        title: "#f8fafc",
        heading: "#38bdf8",
        border: "rgba(56, 189, 248, 0.25)",
        cardBg: "#0f172a",
        navText: "#f8fafc",
        btnBg: "rgba(30, 41, 59, 0.85)",
        btnText: "#f8fafc",
        btnBorder: "rgba(255, 255, 255, 0.18)",
        playBtnBg: "linear-gradient(135deg, #0284c7, #0369a1)",
        playBtnText: "#ffffff",
        dictBtnActiveBg: "#0284c7",
        dictBtnActiveText: "#ffffff",
        brandBg: "rgba(56, 189, 248, 0.12)",
        brandText: "#38bdf8",
        brandBorder: "rgba(56, 189, 248, 0.3)",
        selectBg: "#1e293b",
        selectText: "#f8fafc",
        selectBorder: "rgba(255, 255, 255, 0.2)",
        quoteBorder: "#38bdf8",
        scrollThumb: "#38bdf8",
        scrollTrack: "#090d16",
        captionColor: "#94a3b8"
      },
      sepia: {
        bg: "#f7f1e3",
        barBg: "rgba(235, 224, 201, 0.98)",
        text: "#292524", // High contrast dark-brown text
        title: "#1c1917", // Bold dark title
        heading: "#9a3412", // Earthy orange heading
        border: "rgba(120, 80, 40, 0.25)",
        cardBg: "#ede1c7",
        navText: "#1c1917", // Sharp dark nav text (fixes light-on-light bug!)
        btnBg: "rgba(220, 206, 180, 0.95)",
        btnText: "#1c1917", // Sharp dark button text
        btnBorder: "rgba(120, 80, 40, 0.35)",
        playBtnBg: "linear-gradient(135deg, #b45309, #78350f)",
        playBtnText: "#ffffff",
        dictBtnActiveBg: "#b45309",
        dictBtnActiveText: "#ffffff",
        brandBg: "rgba(180, 83, 9, 0.12)",
        brandText: "#9a3412",
        brandBorder: "rgba(180, 83, 9, 0.35)",
        selectBg: "#dfd3ba",
        selectText: "#1c1917",
        selectBorder: "rgba(120, 80, 40, 0.35)",
        quoteBorder: "#b45309",
        scrollThumb: "#a88a68",
        scrollTrack: "#f2ebd9",
        captionColor: "#6b5d52"
      },
      oled: {
        bg: "#000000",
        barBg: "rgba(10, 10, 10, 0.98)",
        text: "#e4e4e7",
        title: "#ffffff",
        heading: "#0ea5e9",
        border: "rgba(255, 255, 255, 0.2)",
        cardBg: "#121212",
        navText: "#ffffff",
        btnBg: "rgba(39, 39, 42, 0.9)",
        btnText: "#ffffff",
        btnBorder: "rgba(255, 255, 255, 0.2)",
        playBtnBg: "linear-gradient(135deg, #0284c7, #0369a1)",
        playBtnText: "#ffffff",
        dictBtnActiveBg: "#0284c7",
        dictBtnActiveText: "#ffffff",
        brandBg: "rgba(56, 189, 248, 0.12)",
        brandText: "#38bdf8",
        brandBorder: "rgba(56, 189, 248, 0.3)",
        selectBg: "#27272a",
        selectText: "#ffffff",
        selectBorder: "rgba(255, 255, 255, 0.2)",
        quoteBorder: "#0ea5e9",
        scrollThumb: "#52525b",
        scrollTrack: "#000000",
        captionColor: "#a1a1aa"
      }
    };

    var currentTheme = THEME_STYLES[readerPrefs.theme] || THEME_STYLES.dark;

    // Apply master theme CSS variables & custom scrollbar styles
    if (!scrollbarStyleEl) {
      scrollbarStyleEl = document.createElement("style");
      scrollbarStyleEl.id = "sf-reader-master-styles";
      document.head.appendChild(scrollbarStyleEl);
    }
    scrollbarStyleEl.textContent = `
      #sf-cyber-reader {
        --sf-bg: #090d16;
        --sf-bar-bg: rgba(15, 23, 42, 0.96);
        --sf-text: #cbd5e1;
        --sf-title: #f8fafc;
        --sf-heading: #38bdf8;
        --sf-border: rgba(56, 189, 248, 0.25);
        --sf-card-bg: #0f172a;
        --sf-btn-bg: rgba(30, 41, 59, 0.85);
        --sf-btn-text: #f8fafc;
        --sf-btn-border: rgba(255, 255, 255, 0.18);
        --sf-play-bg: linear-gradient(135deg, #0284c7, #0369a1);
        --sf-play-text: #ffffff;
        --sf-dict-active-bg: #0284c7;
        --sf-dict-active-text: #ffffff;
        --sf-brand-bg: rgba(56, 189, 248, 0.12);
        --sf-brand-text: #38bdf8;
        --sf-brand-border: rgba(56, 189, 248, 0.3);
        --sf-select-bg: #1e293b;
        --sf-select-text: #f8fafc;
        --sf-select-border: rgba(255, 255, 255, 0.2);
        --sf-quote-border: #38bdf8;
        --sf-scroll-thumb: #38bdf8;
        --sf-scroll-track: #090d16;
        --sf-caption: #94a3b8;
      }

      #sf-cyber-reader[data-theme="sepia"] {
        --sf-bg: #f7f1e3;
        --sf-bar-bg: rgba(235, 224, 201, 0.98);
        --sf-text: #292524;
        --sf-title: #1c1917;
        --sf-heading: #9a3412;
        --sf-border: rgba(120, 80, 40, 0.25);
        --sf-card-bg: #ede1c7;
        --sf-btn-bg: rgba(220, 206, 180, 0.95);
        --sf-btn-text: #1c1917;
        --sf-btn-border: rgba(120, 80, 40, 0.35);
        --sf-play-bg: linear-gradient(135deg, #b45309, #78350f);
        --sf-play-text: #ffffff;
        --sf-dict-active-bg: #b45309;
        --sf-dict-active-text: #ffffff;
        --sf-brand-bg: rgba(180, 83, 9, 0.12);
        --sf-brand-text: #9a3412;
        --sf-brand-border: rgba(180, 83, 9, 0.35);
        --sf-select-bg: #dfd3ba;
        --sf-select-text: #1c1917;
        --sf-select-border: rgba(120, 80, 40, 0.35);
        --sf-quote-border: #b45309;
        --sf-scroll-thumb: #a88a68;
        --sf-scroll-track: #f2ebd9;
        --sf-caption: #6b5d52;
      }

      #sf-cyber-reader[data-theme="oled"] {
        --sf-bg: #000000;
        --sf-bar-bg: rgba(10, 10, 10, 0.98);
        --sf-text: #e4e4e7;
        --sf-title: #ffffff;
        --sf-heading: #0ea5e9;
        --sf-border: rgba(255, 255, 255, 0.2);
        --sf-card-bg: #121212;
        --sf-btn-bg: rgba(39, 39, 42, 0.9);
        --sf-btn-text: #ffffff;
        --sf-btn-border: rgba(255, 255, 255, 0.2);
        --sf-play-bg: linear-gradient(135deg, #0284c7, #0369a1);
        --sf-play-text: #ffffff;
        --sf-dict-active-bg: #0284c7;
        --sf-dict-active-text: #ffffff;
        --sf-brand-bg: rgba(56, 189, 248, 0.12);
        --sf-brand-text: #38bdf8;
        --sf-brand-border: rgba(56, 189, 248, 0.3);
        --sf-select-bg: #27272a;
        --sf-select-text: #ffffff;
        --sf-select-border: rgba(255, 255, 255, 0.2);
        --sf-quote-border: #0ea5e9;
        --sf-scroll-thumb: #52525b;
        --sf-scroll-track: #000000;
        --sf-caption: #a1a1aa;
      }

      /* Isolation & Theme rules with !important */
      #sf-cyber-reader {
        background: var(--sf-bg) !important;
        color: var(--sf-text) !important;
      }
      #sf-cyber-reader #sf-reader-topbar {
        background: var(--sf-bar-bg) !important;
        border-bottom-color: var(--sf-border) !important;
      }
      #sf-cyber-reader h1 {
        color: var(--sf-title) !important;
      }
      #sf-cyber-reader h2, #sf-cyber-reader h3, #sf-cyber-reader h4, #sf-cyber-reader h5 {
        color: var(--sf-heading) !important;
      }
      #sf-cyber-reader p, #sf-cyber-reader .sf-reader-sentence {
        color: var(--sf-text) !important;
      }
      #sf-cyber-reader blockquote {
        border-left-color: var(--sf-quote-border) !important;
        color: var(--sf-caption) !important;
      }
      #sf-cyber-reader figcaption {
        color: var(--sf-caption) !important;
      }
      #sf-cyber-reader .sf-theme-btn,
      #sf-cyber-reader .sf-font-btn {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 28px !important;
        height: 28px !important;
        min-width: 28px !important;
        min-height: 28px !important;
        padding: 0 !important;
        line-height: 1 !important;
        text-align: center !important;
        vertical-align: middle !important;
        box-sizing: border-box !important;
        border-radius: 6px !important;
        background: var(--sf-btn-bg) !important;
        color: var(--sf-btn-text) !important;
        border: 1px solid var(--sf-btn-border) !important;
        cursor: pointer !important;
      }
      #sf-cyber-reader .sf-theme-btn {
        font-size: 13.5px !important;
      }
      #sf-cyber-reader #sf-close-reader {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        height: 28px !important;
        min-height: 28px !important;
        padding: 0 12px !important;
        border-radius: 6px !important;
        background: #ef4444 !important;
        color: #ffffff !important;
        border: none !important;
        cursor: pointer !important;
        font-size: 11.5px !important;
        font-weight: 700 !important;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
        text-transform: none !important;
        letter-spacing: normal !important;
        line-height: 1 !important;
        box-sizing: border-box !important;
        white-space: nowrap !important;
        box-shadow: 0 2px 6px rgba(239, 68, 68, 0.35) !important;
        transition: background 0.15s ease, transform 0.15s ease !important;
      }
      #sf-cyber-reader #sf-close-reader:hover {
        background: #dc2626 !important;
        transform: translateY(-1px) !important;
      }
      #sf-cyber-reader #sf-reader-font-select {
        height: 28px !important;
        min-height: 28px !important;
        box-sizing: border-box !important;
        vertical-align: middle !important;
      }
      #sf-cyber-reader #sf-reader-brand-pill {
        background: var(--sf-brand-bg) !important;
        color: var(--sf-brand-text) !important;
        border-color: var(--sf-brand-border) !important;
      }
      #sf-cyber-reader #sf-reader-btn-play {
        background: var(--sf-play-bg) !important;
        color: var(--sf-play-text) !important;
      }
      #sf-cyber-reader select {
        background: var(--sf-select-bg) !important;
        color: var(--sf-select-text) !important;
        border-color: var(--sf-select-border) !important;
      }
      #sf-cyber-reader textarea#sf-dictation-input {
        background: var(--sf-bg) !important;
        color: var(--sf-text) !important;
        border-color: var(--sf-select-border) !important;
        transition: border-color 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease;
        scrollbar-width: thin;
        scrollbar-color: var(--sf-scroll-thumb) var(--sf-scroll-track);
      }
      #sf-cyber-reader textarea#sf-dictation-input::-webkit-scrollbar {
        width: 6px;
        height: 6px;
      }
      #sf-cyber-reader textarea#sf-dictation-input::-webkit-scrollbar-track {
        background: var(--sf-scroll-track);
        border-radius: 6px;
      }
      #sf-cyber-reader textarea#sf-dictation-input::-webkit-scrollbar-thumb {
        background: var(--sf-scroll-thumb);
        border-radius: 6px;
      }
      #sf-cyber-reader textarea#sf-dictation-input::-webkit-scrollbar-thumb:hover {
        filter: brightness(1.25);
      }
      #sf-cyber-reader textarea#sf-dictation-input:focus {
        border-color: var(--sf-heading) !important;
        box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.25) !important;
      }
      #sf-cyber-reader textarea#sf-dictation-input.is-correct {
        border-color: #10b981 !important;
        background: rgba(16, 185, 129, 0.12) !important;
        box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.28) !important;
      }
      #sf-cyber-reader textarea#sf-dictation-input.is-wrong {
        border-color: #ef4444 !important;
        background: rgba(239, 68, 68, 0.12) !important;
        box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.28) !important;
      }

      /* Container custom scrollbar */
      #sf-cyber-reader::-webkit-scrollbar {
        width: 7px;
        height: 7px;
      }
      #sf-cyber-reader::-webkit-scrollbar-track {
        background: var(--sf-scroll-track);
      }
      #sf-cyber-reader::-webkit-scrollbar-thumb {
        background: var(--sf-scroll-thumb);
        border-radius: 99px;
      }
      #sf-cyber-reader::-webkit-scrollbar-thumb:hover {
        filter: brightness(1.25);
      }

      /* Voice select styled scrollbar */
      #sf-reader-voice-select {
        scrollbar-width: thin;
        scrollbar-color: var(--sf-scroll-thumb) var(--sf-scroll-track);
      }
      #sf-reader-voice-select::-webkit-scrollbar {
        width: 6px;
        height: 6px;
      }
      #sf-reader-voice-select::-webkit-scrollbar-track {
        background: var(--sf-scroll-track);
        border-radius: 6px;
      }
      #sf-reader-voice-select::-webkit-scrollbar-thumb {
        background: var(--sf-scroll-thumb);
        border-radius: 6px;
      }
      #sf-reader-voice-select::-webkit-scrollbar-thumb:hover {
        filter: brightness(1.25);
      }
      #sf-reader-voice-select option {
        background: var(--sf-card-bg);
        color: var(--sf-text);
        padding: 6px 10px;
      }
    `;

    readerContainer = document.createElement("div");
    readerContainer.id = "sf-cyber-reader";
    readerContainer.dataset.theme = readerPrefs.theme || "dark";
    readerContainer.style.cssText = `
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      overflow-y: auto;
      z-index: 2147483647;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: ${readerPrefs.fontSize}px;
      line-height: 1.85;
      box-sizing: border-box;
      transition: background 0.15s ease, color 0.15s ease;
    `;

    // Reading Progress Indicator Bar
    var progressBar = document.createElement("div");
    progressBar.id = "sf-reader-progress-bar";
    progressBar.style.cssText = "position: fixed; top: 0; left: 0; width: 0%; height: 3px; background: linear-gradient(90deg, #38bdf8, #0284c7); z-index: 2000; transition: width 0.1s ease-out;";
    readerContainer.appendChild(progressBar);

    readerContainer.addEventListener("scroll", function () {
      var st = readerContainer.scrollTop;
      var sh = readerContainer.scrollHeight - readerContainer.clientHeight;
      var pct = sh > 0 ? Math.min(100, Math.round((st / sh) * 100)) : 0;
      progressBar.style.width = pct + "%";
    });

    // Top Header & Controls Bar (Responsive flexbox!)
    var topBar = document.createElement("div");
    topBar.id = "sf-reader-topbar";
    topBar.style.cssText = `
      position: sticky;
      top: 0;
      left: 0;
      right: 0;
      background: ${currentTheme.barBg};
      backdrop-filter: blur(14px);
      border-bottom: 1px solid ${currentTheme.border};
      padding: 6px 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 6px 10px;
      z-index: 1000;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.35);
      transition: background 0.25s ease, border-color 0.25s ease;
    `;

    var barLeft = document.createElement("div");
    barLeft.style.cssText = "display: flex; align-items: center; gap: 6px; flex-wrap: wrap;";

    var brandPill = document.createElement("span");
    brandPill.style.cssText = `
      font-size: 11.5px;
      font-weight: 800;
      color: ${currentTheme.brandText};
      background: ${currentTheme.brandBg};
      padding: 3px 8px 3px 4px;
      border-radius: 99px;
      border: 1px solid ${currentTheme.brandBorder};
      display: inline-flex;
      align-items: center;
      gap: 6px;
      white-space: nowrap;
      user-select: none;
    `;
    if (CHIBI_READER_GIF) {
      var topChibi = document.createElement("img");
      topChibi.src = CHIBI_READER_GIF;
      topChibi.alt = "Reading Chibi";
      topChibi.style.cssText = "width: 22px; height: 22px; border-radius: 50%; object-fit: cover; vertical-align: middle; flex-shrink: 0; box-shadow: 0 1px 4px rgba(0,0,0,0.25);";
      brandPill.appendChild(topChibi);
    }
    var brandTextSpan = document.createElement("span");
    brandTextSpan.textContent = "Cyber-Reader";
    brandPill.appendChild(brandTextSpan);
    barLeft.appendChild(brandPill);

    var btnPlay = document.createElement("button");
    btnPlay.type = "button";
    btnPlay.id = "sf-reader-btn-play";
    btnPlay.style.cssText = `
      background: ${currentTheme.playBtnBg};
      color: ${currentTheme.playBtnText};
      border: none;
      padding: 6px 12px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      white-space: nowrap;
      box-shadow: 0 2px 8px rgba(2, 132, 199, 0.35);
    `;
    btnPlay.textContent = "▶ " + (window.tContent ? window.tContent("reader_listen_play") : "Read");
    barLeft.appendChild(btnPlay);

    // Voice Selection Dropdown with Edge Natural Voices & MC Avatar
    var voiceWrapper = document.createElement("div");
    voiceWrapper.style.cssText = "display: inline-flex; align-items: center; gap: 6px; flex-shrink: 0;";

    var mcAvatar = document.createElement("img");
    mcAvatar.id = "sf-reader-mc-avatar";
    mcAvatar.alt = "MC Voice";
    mcAvatar.style.cssText = `
      width: 22px;
      height: 22px;
      border-radius: 50%;
      object-fit: cover;
      flex-shrink: 0;
      border: 1.5px solid ${currentTheme.brandBorder};
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
      transition: transform 0.2s ease, border-color 0.25s ease;
      display: inline-block;
      vertical-align: middle;
    `;

    function updateMcAvatar(voiceName) {
      var g = detectVoiceGender(voiceName || "");
      if (g === "male" && MC_NAM_ICON) {
        mcAvatar.src = MC_NAM_ICON;
        mcAvatar.title = "MC Nam - Voice";
        mcAvatar.style.display = "inline-block";
      } else if (g === "female" && MC_NU_ICON) {
        mcAvatar.src = MC_NU_ICON;
        mcAvatar.title = "MC Nữ - Voice";
        mcAvatar.style.display = "inline-block";
      } else if (MC_NU_ICON || MC_NAM_ICON) {
        mcAvatar.src = MC_NU_ICON || MC_NAM_ICON;
        mcAvatar.title = "MC - Voice";
        mcAvatar.style.display = "inline-block";
      } else {
        mcAvatar.style.display = "none";
      }
    }

    // Language/Region Filter Dropdown (Tất cả, VN, US, UK, CN, JP...)
    var voiceLangFilter = document.createElement("select");
    voiceLangFilter.id = "sf-reader-voice-lang-filter";
    voiceLangFilter.title = "Lọc vùng ngôn ngữ";
    voiceLangFilter.style.cssText = `
      background: ${currentTheme.selectBg};
      color: ${currentTheme.selectText};
      border: 1px solid ${currentTheme.selectBorder};
      padding: 4px 6px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      width: 62px;
      outline: none;
      cursor: pointer;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
    `;
    var langFilterOptions = [
      { id: "all", label: "Tất cả" },
      { id: "vi", label: "VN" },
      { id: "en", label: "EN" },
      { id: "zh", label: "CN" },
      { id: "ja", label: "JP" },
      { id: "ru", label: "RU" },
      { id: "fr", label: "FR" },
      { id: "de", label: "DE" },
      { id: "ko", label: "KR" }
    ];
    langFilterOptions.forEach(function (optItem) {
      var opt = document.createElement("option");
      opt.value = optItem.id;
      opt.textContent = optItem.label;
      if (optItem.id === readerAudio.articleLang) {
        opt.selected = true;
      }
      voiceLangFilter.appendChild(opt);
    });

    // Voice Search Input (Quick filter by name/region)
    var voiceSearchInput = document.createElement("input");
    voiceSearchInput.type = "text";
    voiceSearchInput.id = "sf-reader-voice-search";
    voiceSearchInput.placeholder = "🔍 Tìm giọng...";
    voiceSearchInput.style.cssText = `
      background: ${currentTheme.selectBg};
      color: ${currentTheme.selectText};
      border: 1px solid ${currentTheme.selectBorder};
      padding: 4px 7px;
      border-radius: 6px;
      font-size: 11px;
      width: 78px;
      outline: none;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
      transition: width 0.2s ease, border-color 0.2s ease;
    `;
    voiceSearchInput.addEventListener("focus", function () {
      voiceSearchInput.style.width = "105px";
    });
    voiceSearchInput.addEventListener("blur", function () {
      if (!voiceSearchInput.value) {
        voiceSearchInput.style.width = "78px";
      }
    });

    var voiceSelect = document.createElement("select");
    voiceSelect.id = "sf-reader-voice-select";
    voiceSelect.title = window.tContent ? window.tContent("reader_listen_voice") : "Voice";
    voiceSelect.style.cssText = `
      background: ${currentTheme.selectBg};
      color: ${currentTheme.selectText};
      border: 1px solid ${currentTheme.selectBorder};
      padding: 4px 6px;
      border-radius: 6px;
      font-size: 11.5px;
      font-weight: 500;
      width: 140px;
      max-width: 150px;
      outline: none;
      cursor: pointer;
      white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    `;

    function detectVoiceGender(voiceName) {
      if (/\b(female|woman|nu|nữ)\b/i.test(voiceName)) return "female";
      if (/\b(male|man|nam)\b/i.test(voiceName)) return "male";
      var maleNames = /\b(guy|christopher|eric|ryan|william|liam|prabhat|steffan|david|mark|george|alex|fred|daniel|rishi|tom|thomas|james|oliver|arthur|charles|john|brian|tony|steve|kevin|namminh|trung|minh|duc|duy|tuan|hoang|long|huy|khoa|viet)\b/i;
      var femaleNames = /\b(jenny|aria|sonia|natasha|clara|neerja|libby|michelle|ana|zira|samantha|victoria|karen|ava|emma|sophia|olivia|charlotte|mia|hazel|susan|catherine|mary|lisa|sarah|emily|hoaimy|lan|linh|huong|mai|hoa|thao|ngoc|phuong|trang|an)\b/i;
      if (maleNames.test(voiceName)) return "male";
      if (femaleNames.test(voiceName)) return "female";
      return "";
    }

    function formatVoiceLabel(v) {
      var rawName = v.name || "";
      var isNat = /natural|neural|online/i.test(rawName);

      var cleanName = rawName
        .replace(/^Microsoft\s+/i, "")
        .replace(/^Google\s+/i, "Google ")
        .replace(/Online\s*\(Natural\)\s*-\s*/i, "")
        .replace(/\s*\(Natural\)/i, "")
        .replace(/English\s*\([^)]+\)/i, "")
        .replace(/\s*-\s*English.*$/i, "")
        .replace(/Vietnamese\s*\([^)]+\)/i, "")
        .replace(/\s*-\s*Vietnamese.*$/i, "")
        .replace(/\s+(Female|Male)$/i, "")
        .trim();

      var region = "";
      if (/VN|Vietnam|Vietnamese/i.test(v.lang) || /Vietnam/i.test(rawName)) region = "VN";
      else if (/US|United States/i.test(v.lang) || /United States/i.test(rawName)) region = "US";
      else if (/GB|UK|United Kingdom/i.test(v.lang) || /United Kingdom/i.test(rawName)) region = "UK";
      else if (/AU|Australia/i.test(v.lang) || /Australia/i.test(rawName)) region = "AU";
      else if (/CA|Canada/i.test(v.lang) || /Canada/i.test(rawName)) region = "CA";
      else if (/IN|India/i.test(v.lang) || /India/i.test(rawName)) region = "IN";
      else if (v.lang) region = v.lang.split("-")[0].toUpperCase();

      var natLabel = (region === "VN") ? "Tự nhiên" : "Natural";
      var tag = region ? (isNat ? region + " - " + natLabel : region) : (isNat ? natLabel : "");

      var parts = [];
      if (cleanName) parts.push(cleanName);
      if (tag) parts.push("(" + tag + ")");

      return parts.join(" ") || rawName;
    }

    function populateVoiceDropdown() {
      while (voiceSelect.firstChild) {
        voiceSelect.removeChild(voiceSelect.firstChild);
      }
      var filterLang = voiceLangFilter ? voiceLangFilter.value : readerAudio.articleLang;
      var q = voiceSearchInput ? voiceSearchInput.value : "";
      var voices = getVoicesForArticle(filterLang, q, true);
      if (voices.length === 0) {
        var opt = document.createElement("option");
        opt.value = "";
        opt.textContent = q ? "Không tìm thấy giọng" : "Không có giọng cho ngôn ngữ này";
        voiceSelect.appendChild(opt);
        updateMcAvatar("");
        return;
      }

      var defaultChoice = findBestVoiceForArticle(filterLang);
      var hasSelected = false;
      voices.forEach(function (v) {
        var opt = document.createElement("option");
        opt.value = v.name;
        opt.textContent = formatVoiceLabel(v);
        if (readerPrefs.preferredVoice && v.name === readerPrefs.preferredVoice) {
          opt.selected = true;
          readerAudio.voice = v;
          hasSelected = true;
        } else if (!hasSelected && defaultChoice && v.name === defaultChoice.name) {
          opt.selected = true;
          readerAudio.voice = v;
          hasSelected = true;
        }
        voiceSelect.appendChild(opt);
      });
      if (!hasSelected && voices.length > 0) {
        voiceSelect.children[0].selected = true;
        readerAudio.voice = voices[0];
      }
      if (readerAudio.voice) {
        updateMcAvatar(readerAudio.voice.name);
      }
    }

    voiceLangFilter.addEventListener("change", function () {
      populateVoiceDropdown();
    });

    voiceSearchInput.addEventListener("input", function () {
      populateVoiceDropdown();
    });

    populateVoiceDropdown();
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = function () {
        populateVoiceDropdown();
      };
    }

    voiceSelect.addEventListener("change", function () {
      var filterLang = voiceLangFilter ? voiceLangFilter.value : readerAudio.articleLang;
      var q = voiceSearchInput ? voiceSearchInput.value : "";
      var voices = getVoicesForArticle(filterLang, q, true);
      var selected = voices.find(function (v) { return v.name === voiceSelect.value; });
      if (selected) {
        readerAudio.voice = selected;
        readerPrefs.preferredVoice = selected.name;
        try { localStorage.setItem("sf_reader_preferred_voice", selected.name); } catch (e) {}
        updateMcAvatar(selected.name);

        if (readerAudio.isPlaying && readerAudio.currentIndex >= 0) {
          var targetSentenceIdx = readerAudio.currentIndex;
          // Invalidate previous speech generation and cancel speech synthesis
          readerAudio.speechSeq++;
          readerAudio.isSwitchingVoice = true;
          clearSpeechTimers();
          if (window.speechSynthesis) {
            try { window.speechSynthesis.cancel(); } catch (e) {}
          }
          // Smooth transition: resume speaking at current sentence without skipping index
          setTimeout(function () {
            readerAudio.isSwitchingVoice = false;
            if (readerAudio.isPlaying && readerAudio.currentIndex === targetSentenceIdx) {
              playSentenceAt(targetSentenceIdx);
            }
          }, 80);
        }
      }
    });

    voiceWrapper.appendChild(mcAvatar);
    voiceWrapper.appendChild(voiceLangFilter);
    voiceWrapper.appendChild(voiceSearchInput);
    voiceWrapper.appendChild(voiceSelect);
    barLeft.appendChild(voiceWrapper);

    // Rate select (fixed compact width: 72px)
    var selSpeed = document.createElement("select");
    selSpeed.title = window.tContent ? window.tContent("reader_listen_speed") : "Speed";
    selSpeed.style.cssText = `
      background: ${currentTheme.selectBg};
      color: ${currentTheme.selectText};
      border: 1px solid ${currentTheme.selectBorder};
      padding: 5px 6px;
      border-radius: 6px;
      font-size: 11.5px;
      width: 72px;
      min-width: 72px;
      max-width: 72px;
      outline: none;
      cursor: pointer;
    `;
    var speeds = [
      { v: "0.75", label: "0.75x" },
      { v: "0.9", label: "0.9x" },
      { v: "0.95", label: "1.0x" },
      { v: "1.15", label: "1.15x" },
      { v: "1.3", label: "1.3x" }
    ];
    speeds.forEach(function (sp) {
      var opt = document.createElement("option");
      opt.value = sp.v;
      opt.textContent = sp.label;
      if (sp.v === "0.95") opt.selected = true;
      selSpeed.appendChild(opt);
    });
    selSpeed.addEventListener("change", function () {
      readerAudio.rate = parseFloat(selSpeed.value) || 0.95;
      if (readerAudio.isPlaying && readerAudio.currentIndex >= 0) {
        playSentenceAt(readerAudio.currentIndex);
      }
    });
    barLeft.appendChild(selSpeed);

    // Dictation mode toggle button
    var btnDictation = document.createElement("button");
    btnDictation.type = "button";
    btnDictation.id = "sf-reader-btn-dictation";
    btnDictation.style.cssText = `
      background: ${currentTheme.btnBg};
      color: ${currentTheme.btnText};
      border: 1px solid ${currentTheme.btnBorder};
      padding: 5px 10px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 11.5px;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      white-space: nowrap;
    `;
    if (WRITING_ICON) {
      var btnDictIcon = document.createElement("img");
      btnDictIcon.src = WRITING_ICON;
      btnDictIcon.alt = "Dictation";
      btnDictIcon.style.cssText = "width: 15px; height: 15px; object-fit: contain; vertical-align: middle;";
      btnDictation.appendChild(btnDictIcon);
    } else {
      var btnDictEmoji = document.createElement("span");
      btnDictEmoji.textContent = "✍️";
      btnDictation.appendChild(btnDictEmoji);
    }
    var btnDictText = document.createElement("span");
    btnDictText.textContent = window.tContent ? window.tContent("reader_dictation_mode") : "Dictation";
    btnDictation.appendChild(btnDictText);
    barLeft.appendChild(btnDictation);

    topBar.appendChild(barLeft);

    // Right Controls: Font sizing, Theme toggling & Close
    var barRight = document.createElement("div");
    barRight.style.cssText = "display: flex; align-items: center; gap: 5px; flex-shrink: 0; margin-left: auto;";

    var btnFontDec = document.createElement("button");
    btnFontDec.type = "button";
    btnFontDec.title = "Decrease font size";
    btnFontDec.style.cssText = `
      background: ${currentTheme.btnBg};
      color: ${currentTheme.btnText};
      border: 1px solid ${currentTheme.btnBorder};
      width: 28px;
      height: 28px;
      min-width: 28px;
      min-height: 28px;
      padding: 0;
      border-radius: 6px;
      cursor: pointer;
      font-size: 11px;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
      box-sizing: border-box;
    `;
    btnFontDec.className = "sf-font-btn";
    btnFontDec.textContent = "A-";
    btnFontDec.onclick = function () {
      readerPrefs.fontSize = Math.max(15, readerPrefs.fontSize - 1.5);
      readerContainer.style.fontSize = readerPrefs.fontSize + "px";
      try { localStorage.setItem("sf_reader_fontsize", String(readerPrefs.fontSize)); } catch (e) {}
    };
    barRight.appendChild(btnFontDec);

    var btnFontInc = document.createElement("button");
    btnFontInc.type = "button";
    btnFontInc.title = "Increase font size";
    btnFontInc.className = "sf-font-btn";
    btnFontInc.style.cssText = `
      background: ${currentTheme.btnBg};
      color: ${currentTheme.btnText};
      border: 1px solid ${currentTheme.btnBorder};
      width: 28px;
      height: 28px;
      min-width: 28px;
      min-height: 28px;
      padding: 0;
      border-radius: 6px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
      box-sizing: border-box;
    `;
    btnFontInc.textContent = "A+";
    btnFontInc.onclick = function () {
      readerPrefs.fontSize = Math.min(27, readerPrefs.fontSize + 1.5);
      readerContainer.style.fontSize = readerPrefs.fontSize + "px";
      try { localStorage.setItem("sf_reader_fontsize", String(readerPrefs.fontSize)); } catch (e) {}
    };
    barRight.appendChild(btnFontInc);

    // Font Family Selector Dropdown
    var fontSelect = document.createElement("select");
    fontSelect.id = "sf-reader-font-select";
    fontSelect.title = "Font Family";
    fontSelect.style.cssText = `
      background: ${currentTheme.selectBg};
      color: ${currentTheme.selectText};
      border: 1px solid ${currentTheme.selectBorder};
      padding: 4px 6px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      outline: none;
      cursor: pointer;
      width: 105px;
      height: 28px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
    `;

    var fontOptions = [
      { id: "serif", label: "Georgia" },
      { id: "times", label: "Times New Roman" },
      { id: "garamond", label: "Garamond" },
      { id: "merriweather", label: "Merriweather" },
      { id: "bookish", label: "Palatino" },
      { id: "charter", label: "Charter" },
      { id: "sans", label: "System Sans" },
      { id: "inter", label: "Inter" },
      { id: "arial", label: "Arial" },
      { id: "helvetica", label: "Helvetica" },
      { id: "verdana", label: "Verdana" },
      { id: "mono", label: "Monospace" }
    ];

    fontOptions.forEach(function (fo) {
      var opt = document.createElement("option");
      opt.value = fo.id;
      opt.textContent = fo.label;
      if (readerPrefs.fontFamily === fo.id) {
        opt.selected = true;
      }
      fontSelect.appendChild(opt);
    });

    fontSelect.addEventListener("change", function () {
      var chosenFontKey = fontSelect.value;
      if (FONT_FAMILIES[chosenFontKey]) {
        readerPrefs.fontFamily = chosenFontKey;
        try { localStorage.setItem("sf_reader_font_family", chosenFontKey); } catch (e) {}
        if (contentWrapper) {
          contentWrapper.style.fontFamily = FONT_FAMILIES[chosenFontKey];
        }
      }
    });

    barRight.appendChild(fontSelect);

    // Theme Switchers
    var themeBtns = [];
    var themes = [
      { id: "dark", label: "🌙", title: "Dark Theme" },
      { id: "sepia", label: "📜", title: "Sepia (Light) Theme" },
      { id: "oled", label: "🖤", title: "OLED Black Theme" }
    ];

    var themeSwitchRaf = null;
    function applyThemePalette(thId) {
      if (!THEME_STYLES[thId]) thId = "dark";
      readerPrefs.theme = thId;
      try { localStorage.setItem("sf_reader_theme", thId); } catch (e) {}
      var s = THEME_STYLES[thId];
      currentTheme = s;

      // Instant zero-lag CSS Variable switch via dataset
      readerContainer.dataset.theme = thId;

      // Explicit inline styles for rock-solid cross-browser sync
      readerContainer.style.background = s.bg;
      readerContainer.style.color = s.text;
      topBar.style.background = s.barBg;
      topBar.style.borderBottomColor = s.border;

      brandPill.style.color = s.brandText;
      brandPill.style.background = s.brandBg;
      brandPill.style.borderColor = s.brandBorder;

      btnPlay.style.background = s.playBtnBg;
      btnPlay.style.color = s.playBtnText;

      mcAvatar.style.borderColor = s.brandBorder;

      voiceSelect.style.background = s.selectBg;
      voiceSelect.style.color = s.selectText;
      voiceSelect.style.borderColor = s.selectBorder;

      voiceLangFilter.style.background = s.selectBg;
      voiceLangFilter.style.color = s.selectText;
      voiceLangFilter.style.borderColor = s.selectBorder;

      voiceSearchInput.style.background = s.selectBg;
      voiceSearchInput.style.color = s.selectText;
      voiceSearchInput.style.borderColor = s.selectBorder;

      selSpeed.style.background = s.selectBg;
      selSpeed.style.color = s.selectText;
      selSpeed.style.borderColor = s.selectBorder;

      fontSelect.style.background = s.selectBg;
      fontSelect.style.color = s.selectText;
      fontSelect.style.borderColor = s.selectBorder;

      if (!readerAudio.isDictationMode) {
        btnDictation.style.background = s.btnBg;
        btnDictation.style.color = s.btnText;
        btnDictation.style.borderColor = s.btnBorder;
      } else {
        btnDictation.style.background = s.dictBtnActiveBg;
        btnDictation.style.color = s.dictBtnActiveText;
      }

      btnFontDec.style.background = s.btnBg;
      btnFontDec.style.color = s.btnText;
      btnFontDec.style.borderColor = s.btnBorder;

      btnFontInc.style.background = s.btnBg;
      btnFontInc.style.color = s.btnText;
      btnFontInc.style.borderColor = s.btnBorder;

      themeBtns.forEach(function (tb) {
        tb.style.background = s.btnBg;
        tb.style.color = s.btnText;
        tb.style.borderColor = s.btnBorder;
      });

      // Update heading & title if present
      var h1El = contentWrapper.querySelector("h1");
      if (h1El) h1El.style.color = s.title;

      var heroCard = contentWrapper.querySelector("#sf-reader-hero-chibi");
      if (heroCard) {
        heroCard.style.background = s.cardBg;
        heroCard.style.borderColor = s.border;
        var hImg = heroCard.querySelector("img");
        if (hImg) hImg.style.borderColor = s.heading;
        var hTitle = heroCard.querySelector("span:first-child");
        if (hTitle) hTitle.style.color = s.heading;
        var hSub = heroCard.querySelector("span:last-child");
        if (hSub) hSub.style.color = s.captionColor;
      }

      // Debounced dictation drawer update to ensure smooth rapid clicking
      if (dictationBox && readerAudio.isDictationMode) {
        if (themeSwitchRaf) cancelAnimationFrame(themeSwitchRaf);
        themeSwitchRaf = requestAnimationFrame(function () {
          themeSwitchRaf = null;
          var activeIdx = readerAudio.currentIndex >= 0 ? readerAudio.currentIndex : 0;
          openDictationBox(activeIdx);
        });
      }
    }

    themes.forEach(function (th) {
      var tBtn = document.createElement("button");
      tBtn.type = "button";
      tBtn.title = th.title;
      tBtn.style.cssText = `
        background: ${currentTheme.btnBg};
        color: ${currentTheme.btnText};
        border: 1px solid ${currentTheme.btnBorder};
        width: 28px;
        height: 28px;
        min-width: 28px;
        min-height: 28px;
        padding: 0;
        border-radius: 6px;
        cursor: pointer;
        font-size: 13.5px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        line-height: 1;
        box-sizing: border-box;
      `;
      tBtn.className = "sf-theme-btn";
      tBtn.textContent = th.label;
      tBtn.onclick = function () {
        applyThemePalette(th.id);
      };
      themeBtns.push(tBtn);
      barRight.appendChild(tBtn);
    });

    var closeBtn = document.createElement("button");
    closeBtn.id = "sf-close-reader";
    closeBtn.type = "button";
    closeBtn.style.cssText = `
      background: #ef4444;
      color: #fff;
      border: none;
      height: 28px;
      min-height: 28px;
      padding: 0 12px;
      border-radius: 6px;
      cursor: pointer;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 11.5px;
      font-weight: 700;
      margin-left: 4px;
      white-space: nowrap;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
      box-sizing: border-box;
      text-transform: none;
      letter-spacing: normal;
      box-shadow: 0 2px 6px rgba(239, 68, 68, 0.35);
      transition: background 0.15s ease, transform 0.15s ease;
    `;
    closeBtn.textContent = "✕ " + (window.tContent ? window.tContent("reader_mode_close") : "Close");
    closeBtn.onclick = function () { toggleReaderMode(); };
    barRight.appendChild(closeBtn);

    topBar.appendChild(barRight);
    readerContainer.appendChild(topBar);

    // Main Article Content Container
    var currentFontFamily = FONT_FAMILIES[readerPrefs.fontFamily] || FONT_FAMILIES.serif;
    var contentWrapper = document.createElement("div");
    contentWrapper.style.cssText = `max-width: 820px; margin: 34px auto; padding: 0 24px 80px 24px; font-family: ${currentFontFamily}; line-height: 1.85;`;

    // Reading Assistant Chibi Hero Badge
    if (CHIBI_READER_GIF) {
      var heroChibiCard = document.createElement("div");
      heroChibiCard.id = "sf-reader-hero-chibi";
      heroChibiCard.style.cssText = `
        display: inline-flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 20px;
        padding: 6px 16px 6px 8px;
        background: ${currentTheme.cardBg};
        border: 1px solid ${currentTheme.border};
        border-radius: 99px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.12);
        transition: background 0.25s ease, border-color 0.25s ease;
      `;

      var heroChibiImg = document.createElement("img");
      heroChibiImg.src = CHIBI_READER_GIF;
      heroChibiImg.alt = "ScholarFlow Reading Buddy";
      heroChibiImg.style.cssText = "width: 44px; height: 44px; border-radius: 50%; object-fit: cover; box-shadow: 0 3px 10px rgba(0,0,0,0.25); flex-shrink: 0; border: 2px solid " + currentTheme.heading + ";";

      var heroChibiMeta = document.createElement("div");
      heroChibiMeta.style.cssText = "display: flex; flex-direction: column; text-align: left;";

      var heroChibiTitle = document.createElement("span");
      heroChibiTitle.style.cssText = "font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; font-weight: 800; color: " + currentTheme.heading + "; line-height: 1.25;";
      heroChibiTitle.textContent = "ScholarFlow Reading Buddy ✨";

      var heroChibiSub = document.createElement("span");
      heroChibiSub.style.cssText = "font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; color: " + currentTheme.captionColor + "; line-height: 1.3;";
      heroChibiSub.textContent = window.tContent ? window.tContent("reader_mode_active") : "Trợ lý luyện nghe & đọc báo tiếng Anh";

      heroChibiMeta.appendChild(heroChibiTitle);
      heroChibiMeta.appendChild(heroChibiSub);
      heroChibiCard.appendChild(heroChibiImg);
      heroChibiCard.appendChild(heroChibiMeta);
      contentWrapper.appendChild(heroChibiCard);
    }

    readerAudio.sentences = [];
    var sentenceElements = [];

    // Headline (Clickable & playable sentence #0)
    if (articleTitle) {
      var h1Idx = readerAudio.sentences.length;
      readerAudio.sentences.push(articleTitle);

      var h1El = document.createElement("h1");
      h1El.className = "sf-reader-sentence";
      h1El.style.cssText = "font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 29px; line-height: 1.35; color: " + currentTheme.title + "; font-weight: 800; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid rgba(255,255,255,0.1); cursor: pointer; border-radius: 6px; transition: background 0.2s;";
      h1El.title = "Click to listen";
      h1El.textContent = articleTitle;

      h1El.addEventListener("mouseenter", function () {
        if (readerAudio.currentIndex !== h1Idx) h1El.style.background = "rgba(56, 189, 248, 0.12)";
      });
      h1El.addEventListener("mouseleave", function () {
        if (readerAudio.currentIndex !== h1Idx) h1El.style.background = "transparent";
      });
      h1El.addEventListener("click", function () {
        playSentenceAt(h1Idx);
        if (readerAudio.isDictationMode) {
          openDictationBox(h1Idx);
        }
      });

      sentenceElements.push(h1El);
      contentWrapper.appendChild(h1El);
    }

    function highlightSentence(idx) {
      sentenceElements.forEach(function (el, i) {
        if (i === idx) {
          el.style.background = "rgba(56, 189, 248, 0.28)";
          el.style.borderBottom = "2.5px solid #38bdf8";
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        } else {
          el.style.background = "transparent";
          el.style.borderBottom = "none";
        }
      });
    }

    function playSentenceAt(idx) {
      if (idx < 0 || idx >= readerAudio.sentences.length) {
        clearSpeechTimers();
        readerAudio.isPlaying = false;
        readerAudio.currentIndex = -1;
        btnPlay.textContent = "▶ " + (window.tContent ? window.tContent("reader_listen_play") : "Read");
        highlightSentence(-1);
        return;
      }
      readerAudio.currentIndex = idx;
      readerAudio.isPlaying = true;
      btnPlay.textContent = "⏸ " + (window.tContent ? window.tContent("reader_listen_pause") : "Pause");
      highlightSentence(idx);

      var textToSpeak = readerAudio.sentences[idx];
      speakReaderSentence(textToSpeak, readerAudio.rate, function () {
        if (readerAudio.isDictationMode) {
          // In dictation mode, only play the selected sentence for listening practice, do NOT autoplay forward!
          readerAudio.isPlaying = false;
          btnPlay.textContent = "▶ " + (window.tContent ? window.tContent("reader_listen_play") : "Read");
        } else if (readerAudio.isPlaying) {
          playSentenceAt(idx + 1);
        }
      });
    }

    btnPlay.addEventListener("click", function () {
      if (readerAudio.isPlaying) {
        clearSpeechTimers();
        if (window.speechSynthesis) window.speechSynthesis.cancel();
        readerAudio.isPlaying = false;
        btnPlay.textContent = "▶ " + (window.tContent ? window.tContent("reader_listen_play") : "Read");
      } else {
        var nextIdx = readerAudio.currentIndex >= 0 ? readerAudio.currentIndex : 0;
        playSentenceAt(nextIdx);
      }
    });

    if (articleItems.length > 0) {
      articleItems.forEach(function (item) {
        if (item.type === "image") {
          var figure = document.createElement("figure");
          figure.style.cssText = "margin: 30px auto; max-width: 100%; text-align: center;";

          var img = document.createElement("img");
          img.setAttribute("src", item.src);
          img.setAttribute("alt", item.caption || "Article image");
          img.setAttribute("loading", "lazy");
          img.setAttribute("referrerpolicy", "no-referrer");
          img.style.cssText = "max-width: 100%; height: auto; border-radius: 12px; box-shadow: 0 8px 25px rgba(0, 0, 0, 0.4); border: 1px solid rgba(255, 255, 255, 0.08); display: block; margin: 0 auto; object-fit: contain;";
          figure.appendChild(img);

          if (item.caption) {
            var figCap = document.createElement("figcaption");
            figCap.style.cssText = "font-size: 13.5px; color: " + currentTheme.captionColor + "; font-style: italic; margin-top: 10px; line-height: 1.5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 92%; margin-left: auto; margin-right: auto;";
            figCap.textContent = item.caption;
            figure.appendChild(figCap);
          }
          contentWrapper.appendChild(figure);
          return;
        }

        if (item.type === "video") {
          var vBox = document.createElement("div");
          vBox.style.cssText = "margin: 28px auto; max-width: 100%; text-align: center;";
          var vEl = document.createElement("video");
          vEl.setAttribute("src", item.src);
          if (item.poster) vEl.setAttribute("poster", item.poster);
          vEl.setAttribute("controls", "true");
          vEl.setAttribute("preload", "metadata");
          vEl.style.cssText = "max-width: 100%; width: 100%; border-radius: 12px; box-shadow: 0 8px 25px rgba(0, 0, 0, 0.35); border: 1px solid var(--sf-border); display: block; margin: 0 auto;";
          vBox.appendChild(vEl);
          if (item.caption) {
            var vCap = document.createElement("figcaption");
            vCap.style.cssText = "font-size: 13.5px; color: var(--sf-caption); font-style: italic; margin-top: 10px; line-height: 1.5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 92%; margin-left: auto; margin-right: auto;";
            vCap.textContent = item.caption;
            vBox.appendChild(vCap);
          }
          contentWrapper.appendChild(vBox);
          return;
        }

        if (item.type === "iframe") {
          var ifBox = document.createElement("div");
          ifBox.style.cssText = "margin: 28px auto; max-width: 100%; text-align: center;";
          var ifWrap = document.createElement("div");
          ifWrap.style.cssText = "position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 12px; box-shadow: 0 8px 25px rgba(0, 0, 0, 0.35); border: 1px solid var(--sf-border);";
          var ifEl = document.createElement("iframe");
          ifEl.setAttribute("src", item.src);
          ifEl.setAttribute("frameborder", "0");
          ifEl.setAttribute("allowfullscreen", "true");
          ifEl.setAttribute("allow", "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture");
          ifEl.style.cssText = "position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;";
          ifWrap.appendChild(ifEl);
          ifBox.appendChild(ifWrap);
          if (item.caption) {
            var ifCap = document.createElement("figcaption");
            ifCap.style.cssText = "font-size: 13.5px; color: var(--sf-caption); font-style: italic; margin-top: 10px; line-height: 1.5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 92%; margin-left: auto; margin-right: auto;";
            ifCap.textContent = item.caption;
            ifBox.appendChild(ifCap);
          }
          contentWrapper.appendChild(ifBox);
          return;
        }

        if (item.type === "heading") {
          var hEl = document.createElement(item.level || "h2");
          hEl.style.cssText = "font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: " + currentTheme.heading + "; font-size: 22px; font-weight: 700; margin: 32px 0 14px 0;";
          hEl.textContent = item.text;
          contentWrapper.appendChild(hEl);
          return;
        }

        if (item.type === "paragraph") {
          var sents = splitTextIntoSentences(item.text);
          if (sents.length > 0) {
            var pBlock = document.createElement("p");
            pBlock.style.cssText = item.isQuote
              ? "margin-bottom: 24px; color: #94a3b8; font-style: italic; border-left: 3.5px solid " + currentTheme.quoteBorder + "; padding-left: 16px;"
              : "margin-bottom: 24px;";

            sents.forEach(function (sText) {
              var sIdx = readerAudio.sentences.length;
              readerAudio.sentences.push(sText);

              var sSpan = document.createElement("span");
              sSpan.className = "sf-reader-sentence";
              sSpan.style.cssText = "cursor: pointer; padding: 2px 2px; border-radius: 4px; transition: background 0.2s;";
              sSpan.title = "Click to listen";
              sSpan.textContent = sText + " ";

              sSpan.addEventListener("mouseenter", function () {
                if (readerAudio.currentIndex !== sIdx) sSpan.style.background = "rgba(56, 189, 248, 0.15)";
              });
              sSpan.addEventListener("mouseleave", function () {
                if (readerAudio.currentIndex !== sIdx) sSpan.style.background = "transparent";
              });

              sSpan.addEventListener("click", function () {
                playSentenceAt(sIdx);
                if (readerAudio.isDictationMode) {
                  openDictationBox(sIdx);
                }
              });

              sentenceElements.push(sSpan);
              pBlock.appendChild(sSpan);
            });

            contentWrapper.appendChild(pBlock);
          }
        }
      });
    } else {
      var empty = document.createElement("p");
      empty.textContent = window.tContent ? window.tContent("reader_mode_empty") : "No readable content found on this page.";
      contentWrapper.appendChild(empty);
    }

    readerContainer.appendChild(contentWrapper);

    // Dictation Modal / Drawer Dock
    var dictationBox = null;
    function openDictationBox(sIdx) {
      if (dictationBox) dictationBox.remove();
      var targetSentence = readerAudio.sentences[sIdx];
      if (!targetSentence) return;

      var currentBoxTheme = currentTheme;

      dictationBox = document.createElement("div");
      dictationBox.id = "sf-dictation-drawer";
      dictationBox.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        width: 92%;
        max-width: 740px;
        background: ${currentBoxTheme.cardBg};
        color: ${currentBoxTheme.text};
        border: 1px solid ${currentBoxTheme.border};
        box-shadow: 0 12px 35px rgba(0, 0, 0, 0.65);
        border-radius: 14px;
        padding: 16px 22px;
        z-index: 10001;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      `;

      // Sync current sentence to recent sentences storage for Lingua tab practice
      try {
        var recents = JSON.parse(localStorage.getItem("sf_reader_recent_sentences") || "[]");
        if (!Array.isArray(recents)) recents = [];
        if (!recents.includes(targetSentence)) {
          recents.unshift(targetSentence);
          if (recents.length > 30) recents.pop();
          localStorage.setItem("sf_reader_recent_sentences", JSON.stringify(recents));
        }
      } catch (e) {}

      var dHeader = document.createElement("div");
      dHeader.style.cssText = "display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;";

      var dTitle = document.createElement("span");
      dTitle.style.cssText = `font-size: 13.5px; font-weight: 700; color: ${currentBoxTheme.heading}; display: inline-flex; align-items: center; gap: 6px;`;
      if (WRITING_ICON) {
        var dWritingImg = document.createElement("img");
        dWritingImg.src = WRITING_ICON;
        dWritingImg.alt = "Dictation Practice";
        dWritingImg.style.cssText = "width: 20px; height: 20px; object-fit: contain; vertical-align: middle;";
        dTitle.appendChild(dWritingImg);
      } else if (CHIBI_READER_GIF) {
        var dChibi = document.createElement("img");
        dChibi.src = CHIBI_READER_GIF;
        dChibi.alt = "Dictation Buddy";
        dChibi.style.cssText = "width: 22px; height: 22px; border-radius: 50%; object-fit: cover; vertical-align: middle;";
        dTitle.appendChild(dChibi);
      }
      var dTitleText = document.createElement("span");
      dTitleText.textContent = (window.tContent ? window.tContent("reader_dictation_mode") : "Dictation Practice") + " (" + (sIdx + 1) + "/" + readerAudio.sentences.length + ")";
      dTitle.appendChild(dTitleText);
      dHeader.appendChild(dTitle);

      var dClose = document.createElement("button");
      dClose.type = "button";
      dClose.style.cssText = `background: none; border: none; color: ${currentBoxTheme.captionColor}; font-size: 16px; cursor: pointer; padding: 2px 6px; line-height: 1;`;
      dClose.textContent = "✕";
      dClose.onclick = function () {
        if (autoNextTimer) { clearTimeout(autoNextTimer); autoNextTimer = null; }
        if (dictationBox) { dictationBox.remove(); dictationBox = null; }
        readerAudio.isDictationMode = false;
        btnDictation.style.background = currentTheme.btnBg;
        btnDictation.style.color = currentTheme.btnText;
        btnDictation.style.borderColor = currentTheme.btnBorder;
      };
      dHeader.appendChild(dClose);
      dictationBox.appendChild(dHeader);

      var autoNextTimer = null;
      var isClozeComplete = false;
      var isFullComplete = false;

      var readerDictMode = "cloze";
      try { readerDictMode = localStorage.getItem("sf_reader_dict_mode") || "cloze"; } catch (e) {}

      var readerDictDifficulty = "medium";
      try { readerDictDifficulty = localStorage.getItem("sf_reader_dict_difficulty") || "medium"; } catch (e) {}

      // Top Toolbar: Mode Selector + Difficulty Selector
      var dToolbarsRow = document.createElement("div");
      dToolbarsRow.style.cssText = "display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; flex-wrap: wrap; gap: 8px;";

      // Mode Selector Bar (Harmonized with current theme)
      var dModeBar = document.createElement("div");
      dModeBar.style.cssText = `display: flex; gap: 4px; background: ${currentBoxTheme.brandBg}; padding: 3px; border-radius: 7px; border: 1px solid ${currentBoxTheme.brandBorder}; width: fit-content;`;

      var btnModeCloze = document.createElement("button");
      btnModeCloze.type = "button";
      btnModeCloze.style.cssText = `padding: 3px 10px; font-size: 11px; font-weight: 600; border: none; border-radius: 5px; cursor: pointer; transition: all 0.15s ease; color: ${readerDictMode === "cloze" ? (currentBoxTheme.playBtnText || "#ffffff") : currentBoxTheme.captionColor}; background: ${readerDictMode === "cloze" ? currentBoxTheme.dictBtnActiveBg : "transparent"};`;
      btnModeCloze.textContent = "✏️ " + (window.tContent ? window.tContent("reader_dictation_mode_cloze") : "Đục lỗ");

      var btnModeFull = document.createElement("button");
      btnModeFull.type = "button";
      btnModeFull.style.cssText = `padding: 3px 10px; font-size: 11px; font-weight: 600; border: none; border-radius: 5px; cursor: pointer; transition: all 0.15s ease; color: ${readerDictMode === "full" ? (currentBoxTheme.playBtnText || "#ffffff") : currentBoxTheme.captionColor}; background: ${readerDictMode === "full" ? currentBoxTheme.dictBtnActiveBg : "transparent"};`;
      btnModeFull.textContent = "📝 " + (window.tContent ? window.tContent("reader_dictation_mode_full") : "Toàn câu");

      dModeBar.appendChild(btnModeCloze);
      dModeBar.appendChild(btnModeFull);
      dToolbarsRow.appendChild(dModeBar);

      // Difficulty Selector Bar
      var dDiffBar = document.createElement("div");
      dDiffBar.style.cssText = `display: ${readerDictMode === "cloze" ? "flex" : "none"}; gap: 3px; align-items: center; background: ${currentBoxTheme.brandBg}; padding: 3px; border-radius: 7px; border: 1px solid ${currentBoxTheme.brandBorder}; width: fit-content;`;

      var btnDiffEasy = document.createElement("button");
      btnDiffEasy.type = "button";
      btnDiffEasy.style.cssText = `padding: 3px 9px; font-size: 11px; font-weight: 600; border: none; border-radius: 5px; cursor: pointer; transition: all 0.15s ease;`;
      btnDiffEasy.textContent = "🟢 " + (window.tContent ? window.tContent("reader_dictation_diff_easy") : "Dễ");

      var btnDiffMedium = document.createElement("button");
      btnDiffMedium.type = "button";
      btnDiffMedium.style.cssText = `padding: 3px 9px; font-size: 11px; font-weight: 600; border: none; border-radius: 5px; cursor: pointer; transition: all 0.15s ease;`;
      btnDiffMedium.textContent = "🟡 " + (window.tContent ? window.tContent("reader_dictation_diff_medium") : "Vừa");

      var btnDiffHard = document.createElement("button");
      btnDiffHard.type = "button";
      btnDiffHard.style.cssText = `padding: 3px 9px; font-size: 11px; font-weight: 600; border: none; border-radius: 5px; cursor: pointer; transition: all 0.15s ease;`;
      btnDiffHard.textContent = "🔴 " + (window.tContent ? window.tContent("reader_dictation_diff_hard") : "Khó");

      function updateDiffButtons() {
        var diffList = [
          { btn: btnDiffEasy, val: "easy" },
          { btn: btnDiffMedium, val: "medium" },
          { btn: btnDiffHard, val: "hard" }
        ];
        diffList.forEach(function (item) {
          var isAct = (readerDictDifficulty === item.val);
          item.btn.style.color = isAct ? (currentBoxTheme.playBtnText || "#ffffff") : currentBoxTheme.captionColor;
          item.btn.style.background = isAct ? currentBoxTheme.dictBtnActiveBg : "transparent";
        });
      }
      updateDiffButtons();

      btnDiffEasy.onclick = function () {
        if (readerDictDifficulty === "easy") return;
        readerDictDifficulty = "easy";
        try { localStorage.setItem("sf_reader_dict_difficulty", "easy"); } catch (e) {}
        updateDiffButtons();
        renderDockExercise();
      };
      btnDiffMedium.onclick = function () {
        if (readerDictDifficulty === "medium") return;
        readerDictDifficulty = "medium";
        try { localStorage.setItem("sf_reader_dict_difficulty", "medium"); } catch (e) {}
        updateDiffButtons();
        renderDockExercise();
      };
      btnDiffHard.onclick = function () {
        if (readerDictDifficulty === "hard") return;
        readerDictDifficulty = "hard";
        try { localStorage.setItem("sf_reader_dict_difficulty", "hard"); } catch (e) {}
        updateDiffButtons();
        renderDockExercise();
      };

      dDiffBar.appendChild(btnDiffEasy);
      dDiffBar.appendChild(btnDiffMedium);
      dDiffBar.appendChild(btnDiffHard);
      dToolbarsRow.appendChild(dDiffBar);

      dictationBox.appendChild(dToolbarsRow);

      var dExerciseArea = document.createElement("div");
      dictationBox.appendChild(dExerciseArea);

      var dActions = document.createElement("div");
      dActions.style.cssText = "display: flex; justify-content: space-between; align-items: center; margin-top: 10px; flex-wrap: wrap; gap: 8px;";

      var dLeftBtns = document.createElement("div");
      dLeftBtns.style.cssText = "display: flex; gap: 6px; align-items: center;";

      var btnReplay = document.createElement("button");
      btnReplay.type = "button";
      btnReplay.style.cssText = `background: ${currentBoxTheme.playBtnBg}; color: ${currentBoxTheme.playBtnText}; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600;`;
      btnReplay.textContent = "🔊 Replay";
      btnReplay.onclick = function () { speakReaderSentence(targetSentence, readerAudio.rate); };
      dLeftBtns.appendChild(btnReplay);

      var btnSlow = document.createElement("button");
      btnSlow.type = "button";
      btnSlow.style.cssText = `background: ${currentBoxTheme.btnBg}; color: ${currentBoxTheme.btnText}; border: 1px solid ${currentBoxTheme.btnBorder}; padding: 6px 10px; border-radius: 6px; cursor: pointer; font-size: 11.5px;`;
      btnSlow.textContent = "🐢 0.7x";
      btnSlow.onclick = function () { speakReaderSentence(targetSentence, 0.7); };
      dLeftBtns.appendChild(btnSlow);

      var btnPrev = document.createElement("button");
      btnPrev.type = "button";
      btnPrev.style.cssText = `background: ${currentBoxTheme.btnBg}; color: ${currentBoxTheme.btnText}; border: 1px solid ${currentBoxTheme.btnBorder}; padding: 6px 10px; border-radius: 6px; cursor: pointer; font-size: 11.5px;`;
      btnPrev.textContent = "◀ Prev";
      btnPrev.disabled = sIdx <= 0;
      btnPrev.onclick = function () {
        if (autoNextTimer) { clearTimeout(autoNextTimer); autoNextTimer = null; }
        if (sIdx > 0) {
          playSentenceAt(sIdx - 1);
          openDictationBox(sIdx - 1);
        }
      };
      dLeftBtns.appendChild(btnPrev);

      var btnNext = document.createElement("button");
      btnNext.type = "button";
      btnNext.style.cssText = `background: ${currentBoxTheme.btnBg}; color: ${currentBoxTheme.btnText}; border: 1px solid ${currentBoxTheme.btnBorder}; padding: 6px 10px; border-radius: 6px; cursor: pointer; font-size: 11.5px;`;
      btnNext.textContent = "Next ▶";
      btnNext.disabled = sIdx >= readerAudio.sentences.length - 1;
      btnNext.onclick = function () {
        if (autoNextTimer) { clearTimeout(autoNextTimer); autoNextTimer = null; }
        if (sIdx < readerAudio.sentences.length - 1) {
          playSentenceAt(sIdx + 1);
          openDictationBox(sIdx + 1);
        }
      };
      dLeftBtns.appendChild(btnNext);
      dActions.appendChild(dLeftBtns);

      var dRightBtns = document.createElement("div");
      dRightBtns.style.cssText = "display: flex; gap: 8px;";

      var btnCheck = document.createElement("button");
      btnCheck.type = "button";
      btnCheck.style.cssText = "background:#10b981; color:#fff; border:none; padding:6px 16px; border-radius:6px; cursor:pointer; font-size:12px; font-weight:700;";
      btnCheck.textContent = "✓ " + (window.tContent ? window.tContent("reader_dictation_check") : "Check");

      var btnReveal = document.createElement("button");
      btnReveal.type = "button";
      btnReveal.style.cssText = `background: ${currentBoxTheme.btnBg}; color: ${currentBoxTheme.btnText}; border: 1px solid ${currentBoxTheme.btnBorder}; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px;`;
      btnReveal.textContent = window.tContent ? window.tContent("reader_dictation_reveal") : "Show Answer";

      dRightBtns.appendChild(btnReveal);
      dRightBtns.appendChild(btnCheck);
      dActions.appendChild(dRightBtns);
      dictationBox.appendChild(dActions);

      var dResult = document.createElement("div");
      dResult.style.cssText = "margin-top:12px; font-size:13px; display:none;";
      dictationBox.appendChild(dResult);

      function renderDockExercise() {
        if (autoNextTimer) { clearTimeout(autoNextTimer); autoNextTimer = null; }
        isClozeComplete = false;
        isFullComplete = false;
        dExerciseArea.textContent = "";
        dResult.style.display = "none";

        if (readerDictMode === "cloze") {
          var dHint = document.createElement("p");
          dHint.style.cssText = `font-size: 12px; color: ${currentBoxTheme.captionColor}; margin: 0 0 8px 0;`;
          dHint.textContent = window.tContent ? window.tContent("reader_dictation_cloze_hint") : "Listen and fill in the missing words below:";
          dExerciseArea.appendChild(dHint);

          var clozeData = generateClozeExercise(targetSentence, readerDictDifficulty);
          var important = function (css) {
            return css.split(";").map(function (d) { return d.trim(); }).filter(Boolean)
              .map(function (d) { return d + " !important"; }).join("; ") + ";";
          };
          var box = document.createElement("div");
          box.style.cssText = important(`
            display: block;
            float: none;
            text-align: left;
            white-space: normal;
            background: ${currentBoxTheme.selectBg};
            color: ${currentBoxTheme.selectText};
            border: 1px solid ${currentBoxTheme.selectBorder};
            border-radius: 8px;
            padding: 12px 14px;
            font-size: 14.5px;
            line-height: 2.2;
            box-shadow: inset 0 1px 3px rgba(0,0,0,0.15)
          `);

          var clozeInputs = [];
          clozeData.tokens.forEach(function (tok) {
            if (tok.isCloze) {
              var cInp = document.createElement("input");
              cInp.type = "text";
              cInp.dataset.answer = tok.answer;
              cInp.dataset.cleanAnswer = tok.cleanAnswer;
              cInp.placeholder = "___";
              cInp.autocomplete = "off";
              cInp.spellcheck = false;
              cInp.style.cssText = important(`
                all: unset;
                box-sizing: border-box;
                display: inline-block;
                float: none;
                position: static;
                background: ${currentBoxTheme.bg};
                color: ${currentBoxTheme.text};
                border: 1.5px solid ${currentBoxTheme.heading};
                border-radius: 5px;
                padding: 1px 6px;
                margin: 0 3px;
                height: 1.75em;
                min-height: 0;
                max-width: none;
                font-size: 14px;
                font-family: inherit;
                font-weight: 600;
                line-height: 1.4;
                text-align: center;
                vertical-align: baseline;
                width: ${Math.max(48, Array.from(tok.answer).length * 10 + 16)}px;
                transition: border-color 0.2s, background-color 0.2s, box-shadow 0.2s
              `);

              var currIdx = clozeInputs.length;
              clozeInputs.push(cInp);

              cInp.addEventListener("input", function () {
                isClozeComplete = false;
                if (autoNextTimer) { clearTimeout(autoNextTimer); autoNextTimer = null; }
                cInp.style.removeProperty("border-color");
                cInp.style.removeProperty("background");
                cInp.style.removeProperty("color");
                var corr = cInp.nextElementSibling;
                if (corr && corr.classList.contains("sf-cloze-corr")) {
                  corr.remove();
                }
                // Distribute multi-word input (e.g. phrases) into subsequent blanks
                var val = cInp.value;
                if (val.includes(" ") && currIdx < clozeInputs.length - 1) {
                  var parts = val.trim().split(/\s+/);
                  if (parts.length > 1) {
                    cInp.value = parts[0];
                    var remaining = parts.slice(1);
                    var remIdx = 0;
                    for (var r = currIdx + 1; r < clozeInputs.length && remIdx < remaining.length; r++) {
                      if (!clozeInputs[r].disabled) {
                        clozeInputs[r].value = remaining[remIdx++];
                      }
                    }
                    if (currIdx + 1 < clozeInputs.length) {
                      clozeInputs[currIdx + 1].focus();
                    }
                  }
                }
              });

              cInp.addEventListener("keydown", function (e) {
                if (e.key === "Enter") {
                  if (isClozeComplete) {
                    e.preventDefault();
                    if (autoNextTimer) { clearTimeout(autoNextTimer); autoNextTimer = null; }
                    if (!btnNext.disabled) btnNext.click();
                    return;
                  }
                  var allFilled = clozeInputs.every(function (i) { return i.disabled || i.value.trim().length > 0; });
                  if (allFilled || currIdx === clozeInputs.length - 1) {
                    e.preventDefault();
                    doCheckCloze();
                  } else {
                    e.preventDefault();
                    var nextInp = clozeInputs.slice(currIdx + 1).find(function (inp) { return !inp.disabled; });
                    if (nextInp) nextInp.focus();
                    else doCheckCloze();
                  }
                } else if (e.key === "Tab") {
                  if (currIdx < clozeInputs.length - 1) {
                    var nextInpTab = clozeInputs.slice(currIdx + 1).find(function (inp) { return !inp.disabled; });
                    if (nextInpTab) {
                      e.preventDefault();
                      nextInpTab.focus();
                    }
                  }
                } else if (e.key === " " || e.code === "Space") {
                  if (cInp.value.trim().length > 0 && currIdx < clozeInputs.length - 1) {
                    e.preventDefault();
                    var nextBlank = clozeInputs.slice(currIdx + 1).find(function (inp) { return !inp.disabled; });
                    if (nextBlank) nextBlank.focus();
                  }
                }
              });

              box.appendChild(cInp);
            } else {
              var sSpan = document.createElement("span");
              sSpan.style.cssText = important("display: inline; float: none; position: static; margin: 0; padding: 0; white-space: pre-wrap");
              sSpan.textContent = tok.text;
              box.appendChild(sSpan);
            }
          });

          dExerciseArea.appendChild(box);

          function doCheckCloze() {
            if (autoNextTimer) { clearTimeout(autoNextTimer); autoNextTimer = null; }
            var correctCount = 0;
            var total = clozeInputs.length;
            clozeInputs.forEach(function (inp) {
              var userVal = nfc(inp.value).trim().toLowerCase().replace(/[.,;:!?'"()[\]{}–—]/g, "");
              var cleanAns = nfc(inp.dataset.cleanAnswer || "");
              var origAns = inp.dataset.answer;

              if (userVal === cleanAns && cleanAns.length > 0) {
                correctCount++;
                inp.style.setProperty("border-color", "#10b981", "important");
                inp.style.setProperty("background", "rgba(16, 185, 129, 0.15)", "important");
                inp.style.setProperty("color", "#10b981", "important");
                inp.disabled = true;
                var existingCorr = inp.nextElementSibling;
                if (existingCorr && existingCorr.classList.contains("sf-cloze-corr")) {
                  existingCorr.remove();
                }
              } else {
                inp.style.setProperty("border-color", "#ef4444", "important");
                inp.style.setProperty("background", "rgba(239, 68, 68, 0.15)", "important");
                inp.style.setProperty("color", "#ef4444", "important");

                var corr = inp.nextElementSibling;
                if (!corr || !corr.classList.contains("sf-cloze-corr")) {
                  corr = document.createElement("span");
                  corr.className = "sf-cloze-corr";
                  corr.style.cssText = `font-size:11px; color:${currentBoxTheme.heading}; font-weight:700; margin:0 3px;`;
                  inp.parentNode.insertBefore(corr, inp.nextSibling);
                }
                corr.textContent = "→ " + origAns;
                syncLinguaError(inp.value.trim() || "Ø", origAns);
              }
            });

            var score = total ? Math.round((correctCount / total) * 100) : 0;
            dResult.style.display = "block";
            var scoreStr = (window.tContent ? window.tContent("reader_dictation_score", [score, correctCount, total]) : ("Accuracy: " + score + "% (" + correctCount + "/" + total + " words correct)"));
            dResult.textContent = (score >= 80 ? "🎉 " : "💡 ") + scoreStr;
            dResult.style.color = score >= 80 ? "#10b981" : "#f59e0b";

            if (total > 0 && correctCount === total) {
              isClozeComplete = true;
              if (!btnNext.disabled) {
                autoNextTimer = setTimeout(function () {
                  btnNext.click();
                }, 800);
              } else {
                dResult.textContent = "🎉 " + scoreStr + " — " + (window.tContent ? window.tContent("reader_dictation_completed_all") : "Đã hoàn thành tất cả các câu!");
              }
            } else {
              isClozeComplete = false;
              speakReaderSentence(targetSentence, 0.85);
            }
          }

          btnCheck.onclick = doCheckCloze;

          btnReveal.onclick = function () {
            if (autoNextTimer) { clearTimeout(autoNextTimer); autoNextTimer = null; }
            clozeInputs.forEach(function (inp) {
              inp.value = inp.dataset.answer;
              inp.style.setProperty("color", currentBoxTheme.heading, "important");
              inp.style.setProperty("border-color", currentBoxTheme.heading, "important");
            });
          };

          setTimeout(function () {
            if (clozeInputs[0]) clozeInputs[0].focus();
          }, 100);

        } else {
          // Full sentence mode
          var dHintFull = document.createElement("p");
          dHintFull.style.cssText = `font-size: 12px; color: ${currentBoxTheme.captionColor}; margin: 0 0 8px 0;`;
          dHintFull.textContent = window.tContent ? window.tContent("reader_dictation_hint") : "Listen and type what you hear below (Press Enter to Check):";
          dExerciseArea.appendChild(dHintFull);

          var dInput = document.createElement("textarea");
          dInput.id = "sf-dictation-input";
          dInput.rows = 4;
          dInput.placeholder = "Type sentence here...";
          dInput.style.cssText = `
            width: 100%;
            box-sizing: border-box;
            background: ${currentBoxTheme.bg};
            color: ${currentBoxTheme.text};
            border: 1.5px solid ${currentBoxTheme.selectBorder};
            border-radius: 9px;
            padding: 12px 14px;
            font-size: 15px;
            line-height: 1.6;
            min-height: 96px;
            font-family: inherit;
            resize: vertical;
            outline: none;
            box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.15);
          `;
          dExerciseArea.appendChild(dInput);

          function doCheckFull() {
            if (autoNextTimer) { clearTimeout(autoNextTimer); autoNextTimer = null; }
            var match = calculateWordMatch(targetSentence, dInput.value);
            dResult.style.display = "block";
            var scoreStr = (window.tContent ? window.tContent("reader_dictation_score", [match.score, match.correct, match.total]) : ("Accuracy: " + match.score + "% (" + match.correct + "/" + match.total + " words correct)"));
            dResult.textContent = (match.score >= 80 ? "🎉 " : "💡 ") + scoreStr;
            dResult.style.color = match.score >= 80 ? "#10b981" : "#f59e0b";
            if (match.score >= 80) {
              dInput.classList.remove("is-wrong");
              dInput.classList.add("is-correct");
            } else {
              dInput.classList.remove("is-correct");
              dInput.classList.add("is-wrong");
            }

            if (match.score === 100 || (match.total > 0 && match.correct === match.total)) {
              isFullComplete = true;
              if (!btnNext.disabled) {
                autoNextTimer = setTimeout(function () {
                  btnNext.click();
                }, 800);
              } else {
                dResult.textContent = "🎉 " + scoreStr + " — " + (window.tContent ? window.tContent("reader_dictation_completed_all") : "Đã hoàn thành tất cả các câu!");
              }
            } else {
              isFullComplete = false;
              speakReaderSentence(targetSentence, 0.85);
            }
          }

          btnCheck.onclick = doCheckFull;

          dInput.addEventListener("input", function () {
            isFullComplete = false;
            if (autoNextTimer) { clearTimeout(autoNextTimer); autoNextTimer = null; }
            dInput.classList.remove("is-correct");
            dInput.classList.remove("is-wrong");
          });

          dInput.addEventListener("keydown", function (e) {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (isFullComplete) {
                if (autoNextTimer) { clearTimeout(autoNextTimer); autoNextTimer = null; }
                if (!btnNext.disabled) btnNext.click();
              } else {
                doCheckFull();
              }
            }
          });

          btnReveal.onclick = function () {
            if (autoNextTimer) { clearTimeout(autoNextTimer); autoNextTimer = null; }
            dResult.style.display = "block";
            dResult.style.color = currentBoxTheme.heading;
            dResult.textContent = "📖 Target: " + targetSentence;
            dInput.value = targetSentence;
            dInput.classList.remove("is-wrong");
            dInput.classList.add("is-correct");
          };

          setTimeout(function () { dInput.focus(); }, 100);
        }
      }

      btnModeCloze.onclick = function () {
        if (readerDictMode === "cloze") return;
        readerDictMode = "cloze";
        try { localStorage.setItem("sf_reader_dict_mode", "cloze"); } catch (e) {}
        btnModeCloze.style.color = currentBoxTheme.playBtnText || "#ffffff";
        btnModeCloze.style.background = currentBoxTheme.dictBtnActiveBg;
        btnModeFull.style.color = currentBoxTheme.captionColor;
        btnModeFull.style.background = "transparent";
        dDiffBar.style.display = "flex";
        renderDockExercise();
      };

      btnModeFull.onclick = function () {
        if (readerDictMode === "full") return;
        readerDictMode = "full";
        try { localStorage.setItem("sf_reader_dict_mode", "full"); } catch (e) {}
        btnModeFull.style.color = currentBoxTheme.playBtnText || "#ffffff";
        btnModeFull.style.background = currentBoxTheme.dictBtnActiveBg;
        btnModeCloze.style.color = currentBoxTheme.captionColor;
        btnModeCloze.style.background = "transparent";
        dDiffBar.style.display = "none";
        renderDockExercise();
      };

      renderDockExercise();

      // Keyboard shortcuts for seamless dictation workflow
      dictationBox.addEventListener("keydown", function (e) {
        // Enter when completed: immediately advance to next sentence
        if (e.key === "Enter" && !e.shiftKey && (isClozeComplete || isFullComplete)) {
          e.preventDefault();
          e.stopPropagation();
          if (autoNextTimer) { clearTimeout(autoNextTimer); autoNextTimer = null; }
          if (!btnNext.disabled) btnNext.click();
          return;
        }
        // Ctrl+Space or Alt+R: Replay sentence
        if ((e.ctrlKey && (e.code === "Space" || e.key === " ")) || (e.altKey && (e.key === "r" || e.key === "R"))) {
          e.preventDefault();
          e.stopPropagation();
          speakReaderSentence(targetSentence, 0.85);
          return;
        }
        // Ctrl+Enter: Check answer
        if (e.ctrlKey && e.key === "Enter") {
          e.preventDefault();
          e.stopPropagation();
          btnCheck.click();
          return;
        }
        // Alt+ArrowRight or Alt+N: Next sentence
        if ((e.altKey && e.key === "ArrowRight") || (e.altKey && (e.key === "n" || e.key === "N"))) {
          e.preventDefault();
          e.stopPropagation();
          if (!btnNext.disabled) btnNext.click();
          return;
        }
        // Alt+ArrowLeft or Alt+P: Prev sentence
        if ((e.altKey && e.key === "ArrowLeft") || (e.altKey && (e.key === "p" || e.key === "P"))) {
          e.preventDefault();
          e.stopPropagation();
          if (!btnPrev.disabled) btnPrev.click();
          return;
        }
        // Alt+S or Alt+A: Show answer
        if (e.altKey && (e.key === "s" || e.key === "S" || e.key === "a" || e.key === "A")) {
          e.preventDefault();
          e.stopPropagation();
          btnReveal.click();
          return;
        }
        // Alt+M: Toggle Cloze vs Full sentence mode
        if (e.altKey && (e.key === "m" || e.key === "M")) {
          e.preventDefault();
          e.stopPropagation();
          if (readerDictMode === "cloze") {
            btnModeFull.click();
          } else {
            btnModeCloze.click();
          }
          return;
        }
        // Alt+1 / Alt+2 / Alt+3: Switch Difficulty
        if (e.altKey && (e.key === "1" || e.code === "Digit1")) {
          e.preventDefault();
          e.stopPropagation();
          btnDiffEasy.click();
          return;
        }
        if (e.altKey && (e.key === "2" || e.code === "Digit2")) {
          e.preventDefault();
          e.stopPropagation();
          btnDiffMedium.click();
          return;
        }
        if (e.altKey && (e.key === "3" || e.code === "Digit3")) {
          e.preventDefault();
          e.stopPropagation();
          btnDiffHard.click();
          return;
        }
        // Escape: Close drawer
        if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          if (autoNextTimer) { clearTimeout(autoNextTimer); autoNextTimer = null; }
          dictationBox.remove();
          dictationBox = null;
          return;
        }
      });

      // Hotkey hint toolbar at the bottom of the drawer
      var dHotkeys = document.createElement("div");
      dHotkeys.style.cssText = `
        margin-top: 10px;
        padding-top: 8px;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        justify-content: center;
        align-items: center;
        font-size: 11px;
        color: ${currentBoxTheme.captionColor};
        opacity: 0.85;
        user-select: none;
      `;
      var hotkeyShortcuts = [
        { k: "Ctrl+Space", label: "Nghe lại" },
        { k: "Enter", label: "Kiểm tra / Tiếp" },
        { k: "Alt+1..3", label: "Độ khó" },
        { k: "Alt+→", label: "Câu tiếp" },
        { k: "Alt+←", label: "Câu trước" },
        { k: "Alt+S", label: "Đáp án" },
        { k: "Alt+M", label: "Đổi mode" },
        { k: "Esc", label: "Đóng" }
      ];
      hotkeyShortcuts.forEach(function (hk) {
        var span = document.createElement("span");
        var kbd = document.createElement("kbd");
        kbd.textContent = hk.k;
        kbd.style.cssText = `
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.22);
          border-radius: 4px;
          padding: 1px 5px;
          font-size: 10px;
          font-family: inherit;
          font-weight: 700;
          color: ${currentBoxTheme.text};
          margin-right: 3px;
        `;
        span.appendChild(kbd);
        span.appendChild(document.createTextNode(hk.label));
        dHotkeys.appendChild(span);
      });
      dictationBox.appendChild(dHotkeys);

      readerContainer.appendChild(dictationBox);
    }

    btnDictation.addEventListener("click", function () {
      readerAudio.isDictationMode = !readerAudio.isDictationMode;
      if (readerAudio.isDictationMode) {
        btnDictation.style.background = currentTheme.dictBtnActiveBg;
        btnDictation.style.color = currentTheme.dictBtnActiveText;
        btnDictation.style.borderColor = currentTheme.border;
        openDictationBox(readerAudio.currentIndex >= 0 ? readerAudio.currentIndex : 0);
      } else {
        btnDictation.style.background = currentTheme.btnBg;
        btnDictation.style.color = currentTheme.btnText;
        btnDictation.style.borderColor = currentTheme.btnBorder;
        if (dictationBox) { dictationBox.remove(); dictationBox = null; }
      }
    });

    document.documentElement.appendChild(readerContainer);
  }

  window.toggleReaderMode = toggleReaderMode;

  // Register message listener
  if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener(function (req, sender, sendResponse) {
      if (req && req.command === "toggleReaderMode") {
        toggleReaderMode();
        sendResponse({ success: true, active: isReaderMode });
        return true;
      }
    });
  }
})();
