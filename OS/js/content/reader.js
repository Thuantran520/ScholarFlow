// ---------------------------------------------------------------------------
// ScholarFlow Cyber-Reader Mode (News Reader & Dictation Listening Coach)
// Clean Article View, Text-To-Speech with Natural Voices, and Dictation
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

  // Speech Synthesis & Dictation State
  var readerAudio = {
    sentences: [],
    currentIndex: -1,
    isPlaying: false,
    isDictationMode: false,
    rate: 0.95,
    voice: null,
    activeUtterance: null
  };

  function splitTextIntoSentences(text) {
    if (!text) return [];
    var clean = text.replace(/\s+/g, " ").trim();
    if (!clean) return [];
    // Tokenize by sentence enders while handling contractions & quotes
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

  function findBestEnglishVoice() {
    if (typeof window === "undefined" || !window.speechSynthesis) return null;
    var voices = window.speechSynthesis.getVoices() || [];
    if (voices.length === 0) return null;
    // Prioritize natural / neural voices on Edge and Chrome
    var best = voices.find(function (v) {
      return v.lang && /en[-_]US/i.test(v.lang) && /natural|neural|online/i.test(v.name);
    });
    if (!best) {
      best = voices.find(function (v) {
        return v.lang && /en[-_]US/i.test(v.lang);
      });
    }
    if (!best) {
      best = voices.find(function (v) {
        return v.lang && /en[-_]GB/i.test(v.lang);
      });
    }
    if (!best) {
      best = voices.find(function (v) {
        return v.lang && /^en/i.test(v.lang);
      });
    }
    return best || voices[0] || null;
  }

  function speakReaderSentence(text, rate, onEndCallback) {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      if (typeof onEndCallback === "function") onEndCallback();
      return;
    }
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

      // Keep utterance reference alive to avoid garbage collection drop bug
      readerAudio.activeUtterance = u;

      u.onend = function () {
        readerAudio.activeUtterance = null;
        if (typeof onEndCallback === "function") onEndCallback();
      };
      u.onerror = function () {
        readerAudio.activeUtterance = null;
        if (typeof onEndCallback === "function") onEndCallback();
      };

      window.speechSynthesis.speak(u);
    } catch (e) {
      readerAudio.activeUtterance = null;
      if (typeof onEndCallback === "function") onEndCallback();
    }
  }

  function toggleReaderMode() {
    if (isReaderMode) {
      // Restore
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
      if (document.body) {
        document.body.style.display = originalBodyDisplay;
      }
      isReaderMode = false;
      return;
    }

    isReaderMode = true;
    originalBodyDisplay = (document.body && document.body.style.display) || "";

    // 1. Candidate extraction algorithms
    var EXECUTABLE_TAGS = new Set([
      'script', 'style', 'noscript', 'iframe', 'object', 'embed',
      'link', 'meta', 'form', 'input', 'button', 'textarea', 'select', 'option', 'template', 'svg'
    ]);
    var NOISE_SELECTORS = [
      'header', 'footer', 'nav', 'aside', '.sidebar', '#sidebar',
      '.comments', '#comments', '.ad', '.ads', '.advertisement',
      '.share-buttons', '.social-share', '.nav', '.menu', '.banner',
      'ytd-comments', 'ytd-watch-next-secondary-results-renderer', 'ytd-masthead'
    ];
    var URL_ATTRS = ['href', 'src', 'action', 'formaction', 'xlink:href', 'poster', 'data'];

    function isNoiseElement(el) {
      if (!el || !el.matches) return false;
      try {
        for (var i = 0; i < NOISE_SELECTORS.length; i++) {
          if (el.matches(NOISE_SELECTORS[i])) return true;
        }
      } catch (e) {}
      return false;
    }

    function sanitizeNode(node) {
      if (node.nodeType === Node.TEXT_NODE) return document.createTextNode(node.nodeValue);
      if (node.nodeType !== Node.ELEMENT_NODE) return null;
      var tag = node.tagName.toLowerCase();
      if (EXECUTABLE_TAGS.has(tag)) return null;
      if (isNoiseElement(node)) return null;

      var clean = document.createElement(tag);
      var attrs = Array.from(node.attributes || []);
      for (var i = 0; i < attrs.length; i++) {
        var attr = attrs[i];
        var name = attr.name.toLowerCase();
        if (name.startsWith('on')) continue;
        if (name === 'style') {
          clean.setAttribute('style', attr.value);
          continue;
        }
        if (URL_ATTRS.indexOf(name) !== -1) {
          var v = String(attr.value).trim().toLowerCase();
          if (v.startsWith('javascript:') || v.startsWith('vbscript:') || v.startsWith('data:text/html')) continue;
          clean.setAttribute(name, attr.value);
          continue;
        }
        clean.setAttribute(name, attr.value);
      }
      var children = Array.from(node.childNodes);
      for (var j = 0; j < children.length; j++) {
        var c = sanitizeNode(children[j]);
        if (c) clean.appendChild(c);
      }
      return clean;
    }

    // 2. Select main news container
    var mainContainer = null;
    var candidates = [
      'article', '[itemprop="articleBody"]', '.article-body', '.story-body',
      '.post-content', '.entry-content', '.detail-content', '.content-detail',
      'main', '#main-content', '.main-content'
    ];
    for (var k = 0; k < candidates.length; k++) {
      var candidateEl = document.querySelector(candidates[k]);
      if (candidateEl && candidateEl.textContent.trim().length > 150) {
        mainContainer = candidateEl;
        break;
      }
    }

    var textParagraphs = [];
    if (mainContainer) {
      var paras = Array.from(mainContainer.querySelectorAll('h1, h2, h3, p, li, blockquote'))
        .filter(function (p) {
          return !isNoiseElement(p) && p.textContent.trim().length > 15;
        });
      if (paras.length > 0) {
        paras.forEach(function (p) { textParagraphs.push(p); });
      } else {
        textParagraphs.push(mainContainer);
      }
    } else {
      var allParas = Array.from(document.querySelectorAll('h1, h2, h3, p, li, blockquote'))
        .filter(function (el) {
          if (isNoiseElement(el)) return false;
          var rect = el.getBoundingClientRect();
          return (rect.width > 0 && rect.height > 0) && el.textContent.trim().length > 25;
        });
      allParas.forEach(function (p) { textParagraphs.push(p); });
    }

    // Hide original body, show reader container
    if (document.body) {
      document.body.style.display = "none";
    }

    readerContainer = document.createElement('div');
    readerContainer.id = "sf-cyber-reader";
    readerContainer.style.cssText = `
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: #090d16;
      color: #e2e8f0;
      overflow-y: auto;
      z-index: 2147483647;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 17px;
      line-height: 1.75;
      box-sizing: border-box;
    `;

    // 3. Audio & Learning Header Toolbar
    var topBar = document.createElement('div');
    topBar.id = "sf-reader-topbar";
    topBar.style.cssText = `
      position: sticky;
      top: 0;
      left: 0;
      right: 0;
      background: rgba(15, 23, 42, 0.95);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid rgba(56, 189, 248, 0.25);
      padding: 10px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 10px;
      z-index: 1000;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
    `;

    var barLeft = document.createElement('div');
    barLeft.style.cssText = "display: flex; align-items: center; gap: 8px; flex-wrap: wrap;";

    var brandPill = document.createElement('span');
    brandPill.style.cssText = "font-size: 12px; font-weight: 800; color: #38bdf8; background: rgba(56, 189, 248, 0.12); padding: 4px 8px; border-radius: 6px; border: 1px solid rgba(56, 189, 248, 0.3);";
    brandPill.textContent = "🎧 ScholarFlow News Coach";
    barLeft.appendChild(brandPill);

    // Play / Pause button
    var btnPlay = document.createElement('button');
    btnPlay.type = "button";
    btnPlay.id = "sf-reader-btn-play";
    btnPlay.style.cssText = "background: #0284c7; color: #ffffff; border: none; padding: 6px 14px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 700; display: inline-flex; align-items: center; gap: 5px;";
    btnPlay.textContent = "▶ " + (window.tContent ? window.tContent("reader_listen_play") : "Read Aloud");
    barLeft.appendChild(btnPlay);

    // Rate select
    var speedLabel = document.createElement('span');
    speedLabel.style.cssText = "font-size: 11px; color: #94a3b8; font-weight: 600;";
    speedLabel.textContent = (window.tContent ? window.tContent("reader_listen_speed") : "Speed") + ":";
    barLeft.appendChild(speedLabel);

    var selSpeed = document.createElement('select');
    selSpeed.style.cssText = "background: #1e293b; color: #f8fafc; border: 1px solid #334155; padding: 4px 8px; border-radius: 6px; font-size: 11.5px;";
    var speeds = [
      { v: "0.75", label: "0.75x" },
      { v: "0.9", label: "0.9x" },
      { v: "0.95", label: "1.0x (Normal)" },
      { v: "1.15", label: "1.15x" },
      { v: "1.3", label: "1.3x" }
    ];
    speeds.forEach(function (sp) {
      var opt = document.createElement('option');
      opt.value = sp.v;
      opt.textContent = sp.label;
      if (sp.v === "0.95") opt.selected = true;
      selSpeed.appendChild(opt);
    });
    selSpeed.addEventListener('change', function () {
      readerAudio.rate = parseFloat(selSpeed.value) || 0.95;
      if (readerAudio.isPlaying && readerAudio.currentIndex >= 0) {
        playSentenceAt(readerAudio.currentIndex);
      }
    });
    barLeft.appendChild(selSpeed);

    // Dictation mode toggle button
    var btnDictation = document.createElement('button');
    btnDictation.type = "button";
    btnDictation.id = "sf-reader-btn-dictation";
    btnDictation.style.cssText = "background: rgba(30, 41, 59, 0.8); color: #cbd5e1; border: 1px solid rgba(255, 255, 255, 0.15); padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600; display: inline-flex; align-items: center; gap: 5px;";
    btnDictation.textContent = "✍️ " + (window.tContent ? window.tContent("reader_dictation_mode") : "Dictation");
    barLeft.appendChild(btnDictation);

    topBar.appendChild(barLeft);

    // Close Button
    var closeBtn = document.createElement('button');
    closeBtn.id = "sf-close-reader";
    closeBtn.type = "button";
    closeBtn.style.cssText = "background: #ef4444; color: #fff; border: none; padding: 6px 14px; border-radius: 6px; cursor: pointer; font-family: sans-serif; font-size: 12px; font-weight: 700;";
    closeBtn.textContent = "✕ " + (window.tContent ? window.tContent("reader_mode_close") : "Close");
    closeBtn.onclick = function () { toggleReaderMode(); };
    topBar.appendChild(closeBtn);

    readerContainer.appendChild(topBar);

    // 4. Content Area & Sentence Tokenization
    var contentWrapper = document.createElement('div');
    contentWrapper.style.cssText = "max-width: 820px; margin: 30px auto; padding: 0 20px; font-family: Georgia, serif; font-size: 18.5px; line-height: 1.8;";

    readerAudio.sentences = [];
    var sentenceElements = [];

    function highlightSentence(idx) {
      sentenceElements.forEach(function (el, i) {
        if (i === idx) {
          el.style.background = "rgba(56, 189, 248, 0.25)";
          el.style.borderBottom = "2px solid #38bdf8";
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        } else {
          el.style.background = "transparent";
          el.style.borderBottom = "none";
        }
      });
    }

    function playSentenceAt(idx) {
      if (idx < 0 || idx >= readerAudio.sentences.length) {
        readerAudio.isPlaying = false;
        readerAudio.currentIndex = -1;
        btnPlay.textContent = "▶ " + (window.tContent ? window.tContent("reader_listen_play") : "Read Aloud");
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

    btnPlay.addEventListener('click', function () {
      if (readerAudio.isPlaying) {
        if (window.speechSynthesis) window.speechSynthesis.cancel();
        readerAudio.isPlaying = false;
        btnPlay.textContent = "▶ " + (window.tContent ? window.tContent("reader_listen_play") : "Read Aloud");
      } else {
        var nextIdx = readerAudio.currentIndex >= 0 ? readerAudio.currentIndex : 0;
        playSentenceAt(nextIdx);
      }
    });

    if (textParagraphs.length > 0) {
      textParagraphs.forEach(function (origPara) {
        var pNode = sanitizeNode(origPara);
        if (!pNode) return;

        var rawText = (pNode.textContent || "").trim();
        var sents = splitTextIntoSentences(rawText);

        if (sents.length > 0) {
          var pBlock = document.createElement('p');
          pBlock.style.cssText = "margin-bottom: 22px; color: #cbd5e1;";

          sents.forEach(function (sText) {
            var sIdx = readerAudio.sentences.length;
            readerAudio.sentences.push(sText);

            var sSpan = document.createElement('span');
            sSpan.className = "sf-reader-sentence";
            sSpan.style.cssText = "cursor: pointer; padding: 2px 2px; border-radius: 4px; transition: background 0.2s;";
            sSpan.title = "Click to listen";
            sSpan.textContent = sText + " ";

            sSpan.addEventListener('mouseenter', function () {
              if (readerAudio.currentIndex !== sIdx) sSpan.style.background = "rgba(255, 255, 255, 0.08)";
            });
            sSpan.addEventListener('mouseleave', function () {
              if (readerAudio.currentIndex !== sIdx) sSpan.style.background = "transparent";
            });

            sSpan.addEventListener('click', function () {
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
      });
    } else {
      var empty = document.createElement('p');
      empty.textContent = window.tContent ? window.tContent("reader_mode_empty") : "No readable content found on this page.";
      contentWrapper.appendChild(empty);
    }

    readerContainer.appendChild(contentWrapper);

    // 5. Dictation & Listening Exercise Modal / Drawer
    var dictationBox = null;
    function openDictationBox(sIdx) {
      if (dictationBox) dictationBox.remove();
      var targetSentence = readerAudio.sentences[sIdx];
      if (!targetSentence) return;

      dictationBox = document.createElement('div');
      dictationBox.id = "sf-dictation-drawer";
      dictationBox.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        width: 90%;
        max-width: 720px;
        background: #0f172a;
        border: 1px solid rgba(56, 189, 248, 0.4);
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
        border-radius: 12px;
        padding: 16px 20px;
        z-index: 10001;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      `;

      var dHeader = document.createElement('div');
      dHeader.style.cssText = "display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;";

      var dTitle = document.createElement('span');
      dTitle.style.cssText = "font-size: 13px; font-weight: 700; color: #38bdf8;";
      dTitle.textContent = "🎧 " + (window.tContent ? window.tContent("reader_dictation_mode") : "Dictation Practice") + " (" + (sIdx + 1) + "/" + readerAudio.sentences.length + ")";
      dHeader.appendChild(dTitle);

      var dClose = document.createElement('button');
      dClose.type = "button";
      dClose.style.cssText = "background: none; border: none; color: #94a3b8; font-size: 16px; cursor: pointer;";
      dClose.textContent = "✕";
      dClose.onclick = function () {
        if (dictationBox) { dictationBox.remove(); dictationBox = null; }
        readerAudio.isDictationMode = false;
        btnDictation.style.background = "rgba(30, 41, 59, 0.8)";
        btnDictation.style.color = "#cbd5e1";
        btnDictation.style.borderColor = "rgba(255, 255, 255, 0.15)";
      };
      dHeader.appendChild(dClose);
      dictationBox.appendChild(dHeader);

      var dHint = document.createElement('p');
      dHint.style.cssText = "font-size: 11.5px; color: #94a3b8; margin: 0 0 8px 0;";
      dHint.textContent = window.tContent ? window.tContent("reader_dictation_hint") : "Listen and type what you hear below:";
      dictationBox.appendChild(dHint);

      var dInput = document.createElement('textarea');
      dInput.id = "sf-dictation-input";
      dInput.rows = 3;
      dInput.placeholder = "Type sentence here...";
      dInput.style.cssText = "width: 100%; box-sizing: border-box; background: #1e293b; color: #f8fafc; border: 1px solid #334155; border-radius: 8px; padding: 10px; font-size: 14px; font-family: inherit; resize: vertical; outline: none;";
      dictationBox.appendChild(dInput);

      var dActions = document.createElement('div');
      dActions.style.cssText = "display: flex; justify-content: space-between; align-items: center; margin-top: 10px; flex-wrap: wrap; gap: 8px;";

      var dLeftBtns = document.createElement('div');
      dLeftBtns.style.cssText = "display: flex; gap: 6px; align-items: center;";

      var btnReplay = document.createElement('button');
      btnReplay.type = "button";
      btnReplay.style.cssText = "background: #334155; color: #f8fafc; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600;";
      btnReplay.textContent = "🔊 Replay";
      btnReplay.onclick = function () { speakReaderSentence(targetSentence, readerAudio.rate); };
      dLeftBtns.appendChild(btnReplay);

      var btnSlow = document.createElement('button');
      btnSlow.type = "button";
      btnSlow.style.cssText = "background: #1e293b; color: #94a3b8; border: 1px solid #475569; padding: 6px 10px; border-radius: 6px; cursor: pointer; font-size: 11.5px;";
      btnSlow.textContent = "🐢 0.7x";
      btnSlow.onclick = function () { speakReaderSentence(targetSentence, 0.7); };
      dLeftBtns.appendChild(btnSlow);

      var btnPrev = document.createElement('button');
      btnPrev.type = "button";
      btnPrev.style.cssText = "background: #1e293b; color: #94a3b8; border: 1px solid #475569; padding: 6px 10px; border-radius: 6px; cursor: pointer; font-size: 11.5px;";
      btnPrev.textContent = "◀ Prev";
      btnPrev.disabled = sIdx <= 0;
      btnPrev.onclick = function () {
        if (sIdx > 0) {
          playSentenceAt(sIdx - 1);
          openDictationBox(sIdx - 1);
        }
      };
      dLeftBtns.appendChild(btnPrev);

      var btnNext = document.createElement('button');
      btnNext.type = "button";
      btnNext.style.cssText = "background: #1e293b; color: #94a3b8; border: 1px solid #475569; padding: 6px 10px; border-radius: 6px; cursor: pointer; font-size: 11.5px;";
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

      var dRightBtns = document.createElement('div');
      dRightBtns.style.cssText = "display: flex; gap: 8px;";

      var btnCheck = document.createElement('button');
      btnCheck.type = "button";
      btnCheck.style.cssText = "background:#10b981; color:#fff; border:none; padding:6px 14px; border-radius:6px; cursor:pointer; font-size:12px; font-weight:700;";
      btnCheck.textContent = "✓ " + (window.tContent ? window.tContent("reader_dictation_check") : "Check");

      var btnReveal = document.createElement('button');
      btnReveal.type = "button";
      btnReveal.style.cssText = "background:transparent; color:#94a3b8; border:1px solid #475569; padding:6px 12px; border-radius:6px; cursor:pointer; font-size:12px;";
      btnReveal.textContent = window.tContent ? window.tContent("reader_dictation_reveal") : "Show Answer";

      dRightBtns.appendChild(btnReveal);
      dRightBtns.appendChild(btnCheck);
      dActions.appendChild(dRightBtns);

      dictationBox.appendChild(dActions);

      var dResult = document.createElement('div');
      dResult.style.cssText = "margin-top:10px; font-size:12px; display:none;";
      dictationBox.appendChild(dResult);

      btnCheck.onclick = function () {
        var match = calculateWordMatch(targetSentence, dInput.value);
        dResult.style.display = "block";
        var scoreStr = (window.tContent ? window.tContent("reader_dictation_score", [match.score, match.correct, match.total]) : ("Accuracy: " + match.score + "% (" + match.correct + "/" + match.total + " words correct)"));
        dResult.textContent = (match.score >= 80 ? "🎉 " : "💡 ") + scoreStr;
        dResult.style.color = match.score >= 80 ? "#34d399" : "#fbbf24";
      };

      btnReveal.onclick = function () {
        dResult.style.display = "block";
        dResult.style.color = "#38bdf8";
        dResult.textContent = "📖 Target: " + targetSentence;
      };

      readerContainer.appendChild(dictationBox);
      setTimeout(function () { dInput.focus(); }, 100);
    }

    btnDictation.addEventListener('click', function () {
      readerAudio.isDictationMode = !readerAudio.isDictationMode;
      if (readerAudio.isDictationMode) {
        btnDictation.style.background = "#0284c7";
        btnDictation.style.color = "#ffffff";
        btnDictation.style.borderColor = "#38bdf8";
        openDictationBox(readerAudio.currentIndex >= 0 ? readerAudio.currentIndex : 0);
      } else {
        btnDictation.style.background = "rgba(30, 41, 59, 0.8)";
        btnDictation.style.color = "#cbd5e1";
        btnDictation.style.borderColor = "rgba(255, 255, 255, 0.15)";
        if (dictationBox) { dictationBox.remove(); dictationBox = null; }
      }
    });

    document.documentElement.appendChild(readerContainer);
  }

  window.toggleReaderMode = toggleReaderMode;

  // Register single message listener
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
