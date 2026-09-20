// ---------------------------------------------------------------------------
// ScholarFlow content: OS/js/content/gamble-fp.js
// Pure gambling-page fingerprint scorer (no DOM access) so the heuristics are
// golden-testable. Exposed as window.GMBL_FP for the scanner + tests.
// Language-first: gambling pages are caught by WHAT THEY SAY even when the
// domain is brand new; the host-shape + risky-TLD gate keeps it cheap and
// suppresses false positives (news sites talking about gambling etc. fail the
// host gate, so the body is never even sampled).
// ---------------------------------------------------------------------------
(function () {
  const RISKY_TLDS = ["vip", "top", "club", "cyou", "bet", "win", "live", "fun", "link", "app",
    "xyz", "cam", "site", "online", "store", "tech", "network", "zone", "plus", "page", "me", "co"];
  const SAFE_ROOTS = [
    "facebook.com", "fb.com", "messenger.com", "instagram.com", "zalo.me", "zaloapp.com",
    "whatsapp.com", "discord.com", "discord.gg", "x.com", "twitter.com", "t.co",
    "telegram.org", "telegram.me", "tiktok.com", "youtube.com", "youtu.be", "google.com",
    "microsoft.com", "apple.com", "mozilla.org", "github.com", "wikipedia.org",
    "shopee.vn", "lazada.vn", "tiki.vn", "sendo.vn", "fptshop.com.vn", "thegioididong.com",
    "vietlott.vn"
  ];
  const TITLE_KWS = [
    "nhà cái", "casino", "bắn cá", "tai xiu", "tài xỉu", "xóc đĩa", "soc dia", "soi cầu",
    "kèo nhà cái", "no hu", "nổ hũ", "cược", "game bai", "game bài", "doi thuong", "đổi thưởng",
    "sportsbook", "betting", "bookmaker", "jackpot", "slot", "da ga", "đá gà", "live casino",
    "ty le", "tỷ lệ kèo", "keo bong da", "kèo bóng đá", "xo so", "xổ số online", "ban ca", "bayvip", "club game bai"
  ];
  const BODY_KWS = [
    "nạp tiền", "nap tien", "rút tiền", "rut tien", "bảo trì", "bao tri", "đại lý", "dai ly",
    "khuyến mãi", "khuyen mai", "nạp rút", "c1", "cskh", "tải app", "tai app", "tài xỉu", "xiên",
    "kubet", "soi cầu", "cầu bạch thủ", "bạch thủ", "lô đề", "lo de", "đề khung", "cược miễn phí"
  ];

  function _rootOf(host) {
    const parts = String(host || "").toLowerCase().split(".").filter(Boolean);
    return parts.length >= 2 ? parts.slice(-2).join(".") : parts[0] || "";
  }
  function _norm(s) {
    return String(s || "").toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d");
  }
  function gmblHostSpinny(host) {
    const first = String(host || "").toLowerCase().split(".")[0] || "";
    if (!first || first.length > 14) return false;
    return /\d/.test(first) && /^[a-z0-9]+$/.test(first) ? true : (/\d{2,}/.test(first));
  }
  function gmblRiskyTld(host) {
    const parts = String(host || "").toLowerCase().split(".");
    return parts.length >= 2 && RISKY_TLDS.indexOf(parts[parts.length - 1]) !== -1;
  }
  function gmblSafeHost(host) {
    const root = _rootOf(host);
    const h = String(host || "").toLowerCase();
    for (let i = 0; i < SAFE_ROOTS.length; i++) {
      const s = SAFE_ROOTS[i];
      if (h === s || h.endsWith("." + s)) return true;
    }
    // vn corporate/state ccTLD structures (.com.vn etc.) are 2-label-rooted already handled by exact roots above plus:
    if (/\.(gov|edu|com|net|org)\.vn$/i.test(h)) return true;
    return false;
  }
  // score: { titleHits, bodyHits, risky, spin, total, decided }
  function gmblScore(host, title, bodySample) {
    host = String(host || "").toLowerCase();
    const t = _norm(title), b = _norm(bodySample || "").slice(0, 24000);
    let titleHits = 0, bodyHits = 0;
    for (let i = 0; i < TITLE_KWS.length; i++) {
      if (t.indexOf(_norm(TITLE_KWS[i])) !== -1) titleHits++;
    }
    if (b) {
      const seen = {};
      for (let i = 0; i < BODY_KWS.length; i++) {
        const k = _norm(BODY_KWS[i]);
        if (k && !seen[k] && b.indexOf(k) !== -1) { seen[k] = 1; bodyHits++; }
      }
    }
    const risky = gmblRiskyTld(host);
    const spin = gmblHostSpinny(host);
    const total = titleHits * 3 + bodyHits + (risky ? 2 : 0) + (spin ? 2 : 0);
    // Decision: language fingerprint is mandatory; host shape strengthens it.
    // A strong-enough textual signature (3 title + 8 body markers) also blocks
    // even on "clean" TLDs (.com bookmakers with fresh brand names).
    const decided = !gmblSafeHost(host) &&
      ((risky && spin && (titleHits >= 2 || (titleHits >= 1 && bodyHits >= 4) || bodyHits >= 7)) ||
        (titleHits >= 3 && bodyHits >= 8));
    return { titleHits: titleHits, bodyHits: bodyHits, risky: risky, spin: spin, total: total, block: !!decided };
  }

  window.GMBL_FP = {
    score: gmblScore,
    hostSpinny: gmblHostSpinny,
    riskyTld: gmblRiskyTld,
    safeHost: gmblSafeHost,
    rootOf: _rootOf,
    RISKY_TLDS: RISKY_TLDS
  };
})();
