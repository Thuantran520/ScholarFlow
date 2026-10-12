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
  var readerPrefs = {
    theme: (function () { try { return localStorage.getItem("sf_reader_theme") || "dark"; } catch (e) { return "dark"; } })(),
    fontSize: (function () { try { return parseInt(localStorage.getItem("sf_reader_fontsize"), 10) || 19; } catch (e) { return 19; } })(),
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
    activeUtterance: null,
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

  function getAvailableEnglishVoices() {
    if (typeof window === "undefined" || !window.speechSynthesis) return [];
    var allVoices = window.speechSynthesis.getVoices() || [];
    var enVoices = allVoices.filter(function (v) {
      return v.lang && /^en/i.test(v.lang);
    });
    if (enVoices.length === 0) enVoices = allVoices;

    // Prioritize Edge Natural / Online neural voices, then high quality voices
    enVoices.sort(function (a, b) {
      var aNat = /natural|neural|online/i.test(a.name) ? 1 : 0;
      var bNat = /natural|neural|online/i.test(b.name) ? 1 : 0;
      if (aNat !== bNat) return bNat - aNat;

      var aUS = /en[-_]US/i.test(a.lang) ? 1 : 0;
      var bUS = /en[-_]US/i.test(b.lang) ? 1 : 0;
      if (aUS !== bUS) return bUS - aUS;

      return a.name.localeCompare(b.name);
    });

    return enVoices;
  }

  function findBestEnglishVoice() {
    var voices = getAvailableEnglishVoices();
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

    try {
      window.speechSynthesis.cancel();
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      var u = new SpeechSynthesisUtterance(String(text || ""));
      var v = readerAudio.voice || findBestEnglishVoice();
      if (v) u.voice = v;
      u.lang = (v && v.lang) ? v.lang : "en-US";
      u.rate = rate || readerAudio.rate || 0.95;

      readerAudio.activeUtterance = u;

      var hasFinished = false;
      function finishSpeech() {
        if (hasFinished) return;
        hasFinished = true;
        clearSpeechTimers();
        readerAudio.activeUtterance = null;
        if (typeof onEndCallback === "function") onEndCallback();
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
        console.warn("Reader speech watchdog triggered fallback advance after", maxWaitMs, "ms");
        finishSpeech();
      }, maxWaitMs);

      // Microtask delay for cancel cleanup
      setTimeout(function () {
        try { window.speechSynthesis.speak(u); } catch (e) { finishSpeech(); }
      }, 40);

    } catch (e) {
      clearSpeechTimers();
      readerAudio.activeUtterance = null;
      if (typeof onEndCallback === "function") onEndCallback();
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
    '.related', '.related-posts', '.related-news', '.related-articles', '.box-tin-lien-quan',
    '.more-news', '.recommend', '.recommendation', '.suggested', '.trending', '.popular',
    '.tags', '.tag-list', '.article-tags', '.topic-tags',
    '.newsletter', '.subscribe-box', '.subscription', '.signup-box',
    '.breadcrumb', '.breadcrumbs',
    '.author-bio', '.author-box', '.about-author', '.author-info',
    '.modal', '.popup', '.dialog', '.overlay',
    'ytd-comments', 'ytd-watch-next-secondary-results-renderer', 'ytd-masthead', 'ytd-live-chat-frame',
    '[role="complementary"]', '[role="navigation"]', '[role="banner"]', '[role="dialog"]',
    '[aria-hidden="true"]'
  ];

  var JUNK_TEXT_RE = /^(advertisement|sponsored|read more|also read|xem thêm|bài viết liên quan|tin liên quan|ảnh:|photo:|nguồn:|theo\s|theo dõi chúng tôi|follow us|sign up|subscribe|all rights reserved|bản quyền thuộc|chia sẻ qua|đăng ký nhận tin|photo courtesy of|reporting by|editing by|image caption:|getty images|ap photo|reuters\/|afp photo|download the app|listen to this article)/i;

  function isNoiseNode(el) {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return false;
    try {
      for (var i = 0; i < NOISE_SELECTORS.length; i++) {
        if (el.closest(NOISE_SELECTORS[i])) return true;
      }
    } catch (e) {}

    var idClass = ((el.id || "") + " " + (el.className || "")).toLowerCase();
    if (/(comment|sidebar|related|popular|advert|banner|promo|social|share|cookie|popup|modal|sponsor|recommend|newsletter|breadcrumb|tag-list|author-bio|read-more|also-read|inline-ad)/i.test(idClass)) {
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


  function cleanCaptionText(text) {
    if (!text) return "";
    var str = String(text).replace(/\s+/g, " ").trim();

    if (/^[\(\[]?(?:photo|ảnh|image|credit|nguồn|courtesy|source)\s*[:\/\-–\s]/i.test(str)) {
      if (str.length < 50) return "";
    }
    if (/^[\(\[]?(?:afp|reuters|ap|getty\s*images|ttxvn|vna|epa|bloomberg|kyodo|shutterstock)[\)\]]?$/i.test(str)) {
      return "";
    }

    str = str.replace(/\s*[\(\[]\s*(?:photo|ảnh|image|credit|nguồn|courtesy|source)\s*(?:by|:|of|\/|-|–)\s*[^)\]]+[\)\]]\s*$/i, "");
    str = str.replace(/\s*[\(\[]\s*(?:afp|reuters|ap|getty\s*images|ttxvn|vna|epa|bloomberg|ap\s*photo)\s*[^)\]]*[\)\]]\s*$/i, "");
    str = str.replace(/[\s\.\,\;\|\-]+(?:photo|ảnh|image|credit|nguồn|courtesy)\s*(?:by|:|of|\/|-|–)\s*[^.\n]+$/i, "");
    str = str.replace(/[\s\.\,\;\|\-]+(?:photo\s+by\s+[^\n]+)$/i, "");
    str = str.replace(/[\s\.\,\;\|\-]+(?:ảnh\s*:\s*[^\n]+)$/i, "");
    str = str.replace(/[\s\.\,\;\|\-]+(?:photo\s*:\s*[^\n]+)$/i, "");

    return str.trim();
  }

  function cleanParagraphText(text) {
    if (!text) return "";
    var str = String(text).replace(/\s+/g, " ").trim();
    str = str.replace(/\s*[\(\[]\s*(?:photo|ảnh|image|credit|nguồn|courtesy)\s*(?:by|:|of|\/|-|–)\s*[^)\]]+[\)\]]\s*$/i, "");
    str = str.replace(/[\s\.\,\;\|\-]+(?:photo\s+by\s+[^\n]+)$/i, "");
    str = str.replace(/[\s\.\,\;\|\-]+(?:ảnh\s*:\s*[^\n]+)$/i, "");
    str = str.replace(/[\s\.\,\;\|\-]+(?:photo\s*:\s*[^\n]+)$/i, "");
    return str.trim();
  }

  function extractImageInfo(imgEl) {
    if (!imgEl || imgEl.tagName !== "IMG") return null;
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

    if (/avatar|icon|logo|badge|emoji|pixel|tracker|analytics|button|spacer|banner/i.test(src)) {
      return null;
    }

    var rect = imgEl.getBoundingClientRect();
    var w = imgEl.naturalWidth || rect.width || parseInt(imgEl.getAttribute("width") || "0", 10);
    var h = imgEl.naturalHeight || rect.height || parseInt(imgEl.getAttribute("height") || "0", 10);
    if ((w > 0 && w < 120) || (h > 0 && h < 90)) {
      return null;
    }

    if (!/^(https?:|data:image\/)/i.test(src)) {
      return null;
    }

    var caption = "";
    var fig = imgEl.closest("figure, .image-container, .img-container, .photo-box, .media-block, .detail-image");
    if (fig) {
      var figCap = fig.querySelector("figcaption, .caption, .image-caption, .photo-caption, .media-caption, .desc");
      if (figCap) caption = (figCap.textContent || "").trim();
    }
    if (!caption) {
      var nextEl = imgEl.nextElementSibling;
      if (nextEl && /^(p|figcaption|div|span)$/i.test(nextEl.tagName)) {
        var nClass = ((nextEl.className || "") + " " + (nextEl.id || "")).toLowerCase();
        if (/(caption|desc|photo)/i.test(nClass)) {
          caption = (nextEl.textContent || "").trim();
        }
      }
    }
    if (!caption) {
      caption = (imgEl.getAttribute("alt") || imgEl.getAttribute("title") || "").trim();
    }

    return { src: src, caption: caption };
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
        window.speechSynthesis.cancel();
      }
      readerAudio.isPlaying = false;
      readerAudio.currentIndex = -1;
      readerAudio.sentences = [];
      readerAudio.activeUtterance = null;

      if (readerContainer) {
        readerContainer.remove();
        readerContainer = null;
      }
      if (scrollbarStyleEl) {
        scrollbarStyleEl.remove();
        scrollbarStyleEl = null;
      }
      if (document.body) {
        document.body.style.display = originalBodyDisplay;
      }
      isReaderMode = false;
      return;
    }

    isReaderMode = true;
    originalBodyDisplay = (document.body && document.body.style.display) || "";

    var mainContainer = pickBestArticleContainer();

    // Extract Title
    var articleTitle = "";
    var h1Candidate = (mainContainer && mainContainer.querySelector("h1")) || document.querySelector("article h1, h1");
    if (h1Candidate && !isNoiseNode(h1Candidate)) {
      articleTitle = (h1Candidate.textContent || "").trim();
    }
    if (!articleTitle) {
      articleTitle = (document.title || "").split(/[-|–—]/)[0].trim();
    }

    // Extract Article Items in Natural Flow (Headings, Paragraphs, Images)
    var articleItems = [];
    var seenImages = new Set();
    var seenTextHashes = new Set();
    var seenCaptionElements = new Set();
    var knownCaptions = new Set();

    if (mainContainer) {
      // Pre-scan all figure / image containers to mark their caption elements and texts
      var allFigures = mainContainer.querySelectorAll("figure, .image-container, .img-container, .photo-box, .media-block, .detail-image");
      allFigures.forEach(function (fig) {
        var capEls = fig.querySelectorAll("figcaption, .caption, .image-caption, .photo-caption, .media-caption, .desc, p, span, i, em");
        capEls.forEach(function (c) {
          seenCaptionElements.add(c);
          var cTxt = (c.textContent || "").trim();
          if (cTxt) {
            knownCaptions.add(cTxt.toLowerCase());
            var cleaned = cleanCaptionText(cTxt);
            if (cleaned) knownCaptions.add(cleaned.toLowerCase());
          }
        });
      });

      var standaloneCaps = mainContainer.querySelectorAll(".caption, .image-caption, .photo-caption, .media-caption, .fig-caption, [itemprop='caption']");
      standaloneCaps.forEach(function (sc) {
        seenCaptionElements.add(sc);
        var scTxt = (sc.textContent || "").trim();
        if (scTxt) {
          knownCaptions.add(scTxt.toLowerCase());
          var cleaned = cleanCaptionText(scTxt);
          if (cleaned) knownCaptions.add(cleaned.toLowerCase());
        }
      });

      var elements = Array.from(mainContainer.querySelectorAll("h1, h2, h3, h4, p, figure, img, blockquote"));
      elements.forEach(function (el) {
        if (isNoiseNode(el)) return;

        var tag = el.tagName.toLowerCase();

        // Figure or Img
        if (tag === "figure") {
          var img = el.querySelector("img");
          if (img && !seenImages.has(img)) {
            seenImages.add(img);
            var info = extractImageInfo(img);
            if (info) {
              var cleanCap = cleanCaptionText(info.caption);
              if (cleanCap) {
                knownCaptions.add(cleanCap.toLowerCase());
                if (info.caption) knownCaptions.add(info.caption.toLowerCase());
              }
              articleItems.push({ type: "image", src: info.src, caption: cleanCap });
            }
          }
          return;
        }

        if (tag === "img") {
          if (!seenImages.has(el)) {
            seenImages.add(el);
            var imgInfo = extractImageInfo(el);
            if (imgInfo) {
              var cleanCap2 = cleanCaptionText(imgInfo.caption);
              if (cleanCap2) {
                knownCaptions.add(cleanCap2.toLowerCase());
                if (imgInfo.caption) knownCaptions.add(imgInfo.caption.toLowerCase());
              }
              articleItems.push({ type: "image", src: imgInfo.src, caption: cleanCap2 });
            }
          }
          return;
        }

        // Headings
        if (tag === "h1" || tag === "h2" || tag === "h3" || tag === "h4") {
          var hText = (el.textContent || "").trim();
          if (hText.length > 5 && hText !== articleTitle && !JUNK_TEXT_RE.test(hText)) {
            articleItems.push({ type: "heading", level: tag, text: hText });
          }
          return;
        }

        // Paragraphs or Blockquotes
        if (tag === "p" || tag === "blockquote") {
          // Exclude if it is part of a figure or marked as caption
          if (seenCaptionElements.has(el) || el.closest("figure, figcaption")) return;

          var pClass = ((el.className || "") + " " + (el.id || "")).toLowerCase();
          if (/(caption|image-desc|photo-desc|fig-cap|media-credit|pic-caption|art-credit|photocaption)/i.test(pClass)) {
            return;
          }

          var innerImg = el.querySelector("img");
          if (innerImg && !seenImages.has(innerImg)) {
            seenImages.add(innerImg);
            var pImgInfo = extractImageInfo(innerImg);
            if (pImgInfo) {
              var cleanPImgCap = cleanCaptionText(pImgInfo.caption);
              if (cleanPImgCap) knownCaptions.add(cleanPImgCap.toLowerCase());
              articleItems.push({ type: "image", src: pImgInfo.src, caption: cleanPImgCap });
            }
          }

          var rawPText = (el.textContent || "").replace(/\s+/g, " ").trim();
          if (rawPText.length < 20) return;
          if (getLinkDensity(el) > 0.45) return;
          if (JUNK_TEXT_RE.test(rawPText)) return;

          var cleanP = cleanParagraphText(rawPText);
          if (cleanP.length < 15) return;

          // Prevent caption text from appearing as a paragraph
          var lowP = cleanP.toLowerCase();
          var isCapDupe = false;
          knownCaptions.forEach(function (cap) {
            if (!cap || cap.length < 15) return;
            if (lowP === cap || lowP.includes(cap) || cap.includes(lowP)) {
              isCapDupe = true;
            }
          });
          if (isCapDupe) return;

          var hash = cleanP.slice(0, 45);
          if (seenTextHashes.has(hash)) return;
          seenTextHashes.add(hash);

          articleItems.push({ type: "paragraph", text: cleanP, isQuote: tag === "blockquote" });
        }
      });
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

    // Apply scrollbar style
    if (!scrollbarStyleEl) {
      scrollbarStyleEl = document.createElement("style");
      scrollbarStyleEl.id = "sf-reader-scrollbar-style";
      document.head.appendChild(scrollbarStyleEl);
    }
    function updateScrollbarStyle(themeStyle) {
      scrollbarStyleEl.textContent = `
        #sf-cyber-reader::-webkit-scrollbar {
          width: 7px;
          height: 7px;
        }
        #sf-cyber-reader::-webkit-scrollbar-track {
          background: ${themeStyle.scrollTrack};
        }
        #sf-cyber-reader::-webkit-scrollbar-thumb {
          background: ${themeStyle.scrollThumb};
          border-radius: 99px;
        }
        #sf-cyber-reader::-webkit-scrollbar-thumb:hover {
          filter: brightness(1.25);
        }
      `;
    }
    updateScrollbarStyle(currentTheme);

    readerContainer = document.createElement("div");
    readerContainer.id = "sf-cyber-reader";
    readerContainer.style.cssText = `
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: ${currentTheme.bg};
      color: ${currentTheme.text};
      overflow-y: auto;
      z-index: 2147483647;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: ${readerPrefs.fontSize}px;
      line-height: 1.85;
      box-sizing: border-box;
      transition: background 0.25s ease, color 0.25s ease;
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

    // Top Header & Controls Bar (Strict single row flexbox!)
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
      padding: 8px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: nowrap;
      gap: 8px;
      overflow-x: auto;
      z-index: 1000;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.35);
      transition: background 0.25s ease, border-color 0.25s ease;
    `;

    var barLeft = document.createElement("div");
    barLeft.style.cssText = "display: flex; align-items: center; gap: 6px; flex-shrink: 0;";

    var brandPill = document.createElement("span");
    brandPill.style.cssText = `
      font-size: 11.5px;
      font-weight: 800;
      color: ${currentTheme.brandText};
      background: ${currentTheme.brandBg};
      padding: 4px 8px;
      border-radius: 6px;
      border: 1px solid ${currentTheme.brandBorder};
      display: inline-flex;
      align-items: center;
      gap: 4px;
      white-space: nowrap;
    `;
    brandPill.textContent = "🎧 Reader";
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

    // Voice Selection Dropdown with Edge Natural Voices
    var voiceSelect = document.createElement("select");
    voiceSelect.id = "sf-reader-voice-select";
    voiceSelect.title = window.tContent ? window.tContent("reader_listen_voice") : "Voice";
    voiceSelect.style.cssText = `
      background: ${currentTheme.selectBg};
      color: ${currentTheme.selectText};
      border: 1px solid ${currentTheme.selectBorder};
      padding: 5px 6px;
      border-radius: 6px;
      font-size: 11.5px;
      width: 145px;
      max-width: 145px;
      outline: none;
      cursor: pointer;
      white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;
    `;

    function populateVoiceDropdown() {
      while (voiceSelect.firstChild) {
        voiceSelect.removeChild(voiceSelect.firstChild);
      }
      var voices = getAvailableEnglishVoices();
      if (voices.length === 0) {
        var opt = document.createElement("option");
        opt.value = "";
        opt.textContent = "Default Voice";
        voiceSelect.appendChild(opt);
        return;
      }

      var defaultChoice = findBestEnglishVoice();
      voices.forEach(function (v) {
        var opt = document.createElement("option");
        opt.value = v.name;
        var isNat = /natural|neural|online/i.test(v.name);
        var label = v.name.replace(/Microsoft |English \(|Online \(Natural\) - /g, "").replace(/\)/g, "");
        opt.textContent = (isNat ? "✨ " : "🗣️ ") + label + " (" + v.lang + ")";
        if (defaultChoice && v.name === defaultChoice.name) {
          opt.selected = true;
          readerAudio.voice = v;
        }
        voiceSelect.appendChild(opt);
      });
    }

    populateVoiceDropdown();
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = function () {
        populateVoiceDropdown();
      };
    }

    voiceSelect.addEventListener("change", function () {
      var voices = getAvailableEnglishVoices();
      var selected = voices.find(function (v) { return v.name === voiceSelect.value; });
      if (selected) {
        readerAudio.voice = selected;
        readerPrefs.preferredVoice = selected.name;
        try { localStorage.setItem("sf_reader_preferred_voice", selected.name); } catch (e) {}
        if (readerAudio.isPlaying && readerAudio.currentIndex >= 0) {
          playSentenceAt(readerAudio.currentIndex);
        }
      }
    });
    barLeft.appendChild(voiceSelect);

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
      padding: 6px 11px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 11.5px;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      white-space: nowrap;
    `;
    btnDictation.textContent = "✍️ " + (window.tContent ? window.tContent("reader_dictation_mode") : "Dictation");
    barLeft.appendChild(btnDictation);

    topBar.appendChild(barLeft);

    // Right Controls: Font sizing, Theme toggling & Close
    var barRight = document.createElement("div");
    barRight.style.cssText = "display: flex; align-items: center; gap: 5px; flex-shrink: 0;";

    var btnFontDec = document.createElement("button");
    btnFontDec.type = "button";
    btnFontDec.title = "Decrease font size";
    btnFontDec.style.cssText = `
      background: ${currentTheme.btnBg};
      color: ${currentTheme.btnText};
      border: 1px solid ${currentTheme.btnBorder};
      width: 28px;
      height: 28px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 11px;
      font-weight: 700;
    `;
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
    btnFontInc.style.cssText = `
      background: ${currentTheme.btnBg};
      color: ${currentTheme.btnText};
      border: 1px solid ${currentTheme.btnBorder};
      width: 28px;
      height: 28px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 12.5px;
      font-weight: 700;
    `;
    btnFontInc.textContent = "A+";
    btnFontInc.onclick = function () {
      readerPrefs.fontSize = Math.min(27, readerPrefs.fontSize + 1.5);
      readerContainer.style.fontSize = readerPrefs.fontSize + "px";
      try { localStorage.setItem("sf_reader_fontsize", String(readerPrefs.fontSize)); } catch (e) {}
    };
    barRight.appendChild(btnFontInc);

    // Theme Switchers
    var themeBtns = [];
    var themes = [
      { id: "dark", label: "🌙", title: "Dark Theme" },
      { id: "sepia", label: "📜", title: "Sepia (Light) Theme" },
      { id: "oled", label: "🖤", title: "OLED Black Theme" }
    ];

    function applyThemePalette(thId) {
      readerPrefs.theme = thId;
      try { localStorage.setItem("sf_reader_theme", thId); } catch (e) {}
      var s = THEME_STYLES[thId] || THEME_STYLES.dark;
      currentTheme = s;

      readerContainer.style.background = s.bg;
      readerContainer.style.color = s.text;
      topBar.style.background = s.barBg;
      topBar.style.borderBottomColor = s.border;

      brandPill.style.color = s.brandText;
      brandPill.style.background = s.brandBg;
      brandPill.style.borderColor = s.brandBorder;

      btnPlay.style.background = s.playBtnBg;
      btnPlay.style.color = s.playBtnText;

      voiceSelect.style.background = s.selectBg;
      voiceSelect.style.color = s.selectText;
      voiceSelect.style.borderColor = s.selectBorder;

      selSpeed.style.background = s.selectBg;
      selSpeed.style.color = s.selectText;
      selSpeed.style.borderColor = s.selectBorder;

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
      contentWrapper.querySelectorAll("h2, h3, h4").forEach(function (h) {
        h.style.color = s.heading;
      });
      contentWrapper.querySelectorAll("blockquote").forEach(function (bq) {
        bq.style.borderLeftColor = s.quoteBorder;
      });

      contentWrapper.querySelectorAll("figcaption").forEach(function (fc) { fc.style.color = s.captionColor; });
      updateScrollbarStyle(s);

      // If dictation dock is currently open, restyle it
      if (dictationBox) {
        dictationBox.style.background = s.cardBg;
        dictationBox.style.borderColor = s.border;
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
        border-radius: 6px;
        cursor: pointer;
        font-size: 12px;
      `;
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
    closeBtn.style.cssText = "background: #ef4444; color: #fff; border: none; padding: 5px 12px; border-radius: 6px; cursor: pointer; font-family: sans-serif; font-size: 11.5px; font-weight: 700; margin-left: 4px; white-space: nowrap;";
    closeBtn.textContent = "✕ " + (window.tContent ? window.tContent("reader_mode_close") : "Close");
    closeBtn.onclick = function () { toggleReaderMode(); };
    barRight.appendChild(closeBtn);

    topBar.appendChild(barRight);
    readerContainer.appendChild(topBar);

    // Main Article Content Container
    var contentWrapper = document.createElement("div");
    contentWrapper.style.cssText = "max-width: 820px; margin: 34px auto; padding: 0 24px 80px 24px; font-family: Georgia, 'Times New Roman', serif; line-height: 1.85;";

    // Headline
    if (articleTitle) {
      var h1El = document.createElement("h1");
      h1El.style.cssText = "font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 29px; line-height: 1.35; color: " + currentTheme.title + "; font-weight: 800; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid rgba(255,255,255,0.1);";
      h1El.textContent = articleTitle;
      contentWrapper.appendChild(h1El);
    }

    readerAudio.sentences = [];
    var sentenceElements = [];

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
        if (readerAudio.isPlaying) {
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

      var dHeader = document.createElement("div");
      dHeader.style.cssText = "display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;";

      var dTitle = document.createElement("span");
      dTitle.style.cssText = "font-size: 13.5px; font-weight: 700; color: #38bdf8;";
      dTitle.textContent = "🎧 " + (window.tContent ? window.tContent("reader_dictation_mode") : "Dictation Practice") + " (" + (sIdx + 1) + "/" + readerAudio.sentences.length + ")";
      dHeader.appendChild(dTitle);

      var dClose = document.createElement("button");
      dClose.type = "button";
      dClose.style.cssText = "background: none; border: none; color: #94a3b8; font-size: 16px; cursor: pointer;";
      dClose.textContent = "✕";
      dClose.onclick = function () {
        if (dictationBox) { dictationBox.remove(); dictationBox = null; }
        readerAudio.isDictationMode = false;
        btnDictation.style.background = currentTheme.btnBg;
        btnDictation.style.color = currentTheme.btnText;
        btnDictation.style.borderColor = currentTheme.btnBorder;
      };
      dHeader.appendChild(dClose);
      dictationBox.appendChild(dHeader);

      var dHint = document.createElement("p");
      dHint.style.cssText = "font-size: 12px; color: #94a3b8; margin: 0 0 8px 0;";
      dHint.textContent = window.tContent ? window.tContent("reader_dictation_hint") : "Listen and type what you hear below (Press Enter to Check):";
      dictationBox.appendChild(dHint);

      var dInput = document.createElement("textarea");
      dInput.id = "sf-dictation-input";
      dInput.rows = 3;
      dInput.placeholder = "Type sentence here...";
      dInput.style.cssText = `
        width: 100%;
        box-sizing: border-box;
        background: ${currentBoxTheme.selectBg};
        color: ${currentBoxTheme.selectText};
        border: 1px solid ${currentBoxTheme.selectBorder};
        border-radius: 8px;
        padding: 10px 12px;
        font-size: 14.5px;
        font-family: inherit;
        resize: vertical;
        outline: none;
      `;
      dictationBox.appendChild(dInput);

      var dActions = document.createElement("div");
      dActions.style.cssText = "display: flex; justify-content: space-between; align-items: center; margin-top: 10px; flex-wrap: wrap; gap: 8px;";

      var dLeftBtns = document.createElement("div");
      dLeftBtns.style.cssText = "display: flex; gap: 6px; align-items: center;";

      var btnReplay = document.createElement("button");
      btnReplay.type = "button";
      btnReplay.style.cssText = "background: #334155; color: #f8fafc; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600;";
      btnReplay.textContent = "🔊 Replay";
      btnReplay.onclick = function () { speakReaderSentence(targetSentence, readerAudio.rate); };
      dLeftBtns.appendChild(btnReplay);

      var btnSlow = document.createElement("button");
      btnSlow.type = "button";
      btnSlow.style.cssText = "background: rgba(30, 41, 59, 0.9); color: #94a3b8; border: 1px solid #475569; padding: 6px 10px; border-radius: 6px; cursor: pointer; font-size: 11.5px;";
      btnSlow.textContent = "🐢 0.7x";
      btnSlow.onclick = function () { speakReaderSentence(targetSentence, 0.7); };
      dLeftBtns.appendChild(btnSlow);

      var btnPrev = document.createElement("button");
      btnPrev.type = "button";
      btnPrev.style.cssText = "background: rgba(30, 41, 59, 0.9); color: #94a3b8; border: 1px solid #475569; padding: 6px 10px; border-radius: 6px; cursor: pointer; font-size: 11.5px;";
      btnPrev.textContent = "◀ Prev";
      btnPrev.disabled = sIdx <= 0;
      btnPrev.onclick = function () {
        if (sIdx > 0) {
          playSentenceAt(sIdx - 1);
          openDictationBox(sIdx - 1);
        }
      };
      dLeftBtns.appendChild(btnPrev);

      var btnNext = document.createElement("button");
      btnNext.type = "button";
      btnNext.style.cssText = "background: rgba(30, 41, 59, 0.9); color: #94a3b8; border: 1px solid #475569; padding: 6px 10px; border-radius: 6px; cursor: pointer; font-size: 11.5px;";
      btnNext.textContent = "Next ▶";
      btnNext.disabled = sIdx >= readerAudio.sentences.length - 1;
      btnNext.onclick = function () {
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
      btnReveal.style.cssText = "background:transparent; color:#94a3b8; border:1px solid #475569; padding:6px 12px; border-radius:6px; cursor:pointer; font-size:12px;";
      btnReveal.textContent = window.tContent ? window.tContent("reader_dictation_reveal") : "Show Answer";

      dRightBtns.appendChild(btnReveal);
      dRightBtns.appendChild(btnCheck);
      dActions.appendChild(dRightBtns);

      dictationBox.appendChild(dActions);

      var dResult = document.createElement("div");
      dResult.style.cssText = "margin-top:12px; font-size:13px; display:none;";
      dictationBox.appendChild(dResult);

      function doCheck() {
        var match = calculateWordMatch(targetSentence, dInput.value);
        dResult.style.display = "block";
        var scoreStr = (window.tContent ? window.tContent("reader_dictation_score", [match.score, match.correct, match.total]) : ("Accuracy: " + match.score + "% (" + match.correct + "/" + match.total + " words correct)"));
        dResult.textContent = (match.score >= 80 ? "🎉 " : "💡 ") + scoreStr;
        dResult.style.color = match.score >= 80 ? "#34d399" : "#fbbf24";
      }

      btnCheck.onclick = doCheck;

      dInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          doCheck();
        }
      });

      btnReveal.onclick = function () {
        dResult.style.display = "block";
        dResult.style.color = "#38bdf8";
        dResult.textContent = "📖 Target: " + targetSentence;
      };

      readerContainer.appendChild(dictationBox);
      setTimeout(function () { dInput.focus(); }, 100);
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
