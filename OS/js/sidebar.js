// Web Super Assistant - Sidebar Controller
// Controls: Citation Generator, Element Redactor & Blur, Smart Screenshot Engine

// Universal browser/chrome compatibility layer (Firefox 55+ & Chrome/Edge)
// Firefox 55+ supports chrome.* as alias for browser.* in callback style
// This is the official MDN-recommended approach for cross-browser extensions
if (typeof chrome === "undefined" && typeof browser !== "undefined") {
  // On very old Firefox (pre-55) - provide chrome alias
  try { window.chrome = browser; } catch (e) {}
}
const _storLocal = (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local)
  ? chrome.storage.local
  : ((typeof browser !== "undefined" && browser.storage && browser.storage.local)
    ? browser.storage.local : null);

// Universal storage helpers (handles both Promise-style Firefox and callback-style Chrome)
function storGet(key, cb) {
  if (!_storLocal) { if (cb) cb({}); return; }
  try {
    let callbackFired = false;
    const p = _storLocal.get(key, (res) => {
      callbackFired = true;
      if (!p || typeof p.then !== "function") {
        if (cb) cb(res || {});
      }
    });
    if (p && typeof p.then === "function") {
      p.then(res => { if (!callbackFired && cb) cb(res || {}); }).catch(() => { if (!callbackFired && cb) cb({}); });
    }
  } catch (e) {
    try { _storLocal.get(key, (res) => { if (cb) cb(res || {}); }); } catch(err) { if (cb) cb({}); }
  }
}
function storSet(obj, cb) {
  if (!_storLocal) { if (cb) cb(); return; }
  try {
    let callbackFired = false;
    const p = _storLocal.set(obj, () => {
      callbackFired = true;
      if (!p || typeof p.then !== "function") {
        if (cb) cb();
      }
    });
    if (p && typeof p.then === "function") {
      p.then(() => { if (!callbackFired && cb) cb(); }).catch(() => { if (!callbackFired && cb) cb(); });
    }
  } catch (e) {
    try { _storLocal.set(obj, () => { if (cb) cb(); }); } catch(err) { if (cb) cb(); }
  }
}
function storRemove(key, cb) {
  if (!_storLocal) { if (cb) cb(); return; }
  try {
    let callbackFired = false;
    const p = _storLocal.remove(key, () => {
      callbackFired = true;
      if (!p || typeof p.then !== "function") {
        if (cb) cb();
      }
    });
    if (p && typeof p.then === "function") {
      p.then(() => { if (!callbackFired && cb) cb(); }).catch(() => { if (!callbackFired && cb) cb(); });
    }
  } catch (e) {
    try { _storLocal.remove(key, () => { if (cb) cb(); }); } catch(err) { if (cb) cb(); }
  }
}

const getI18nText = (key, params = null) => (window.i18n ? window.i18n.t(key, null, params) : key);

const MONTHS_IEEE = ["", "Jan.", "Feb.", "Mar.", "Apr.", "May", "June", "July", "Aug.", "Sept.", "Oct.", "Nov.", "Dec."];
const MONTHS_FULL = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const ORG_NAMES = new Set([
  "google", "microsoft", "openai", "meta", "apple", "amazon", "ibm", "intel",
  "the hacker news", "reuters", "bbc", "bbc news", "cnn", "associated press",
  "bloomberg", "techcrunch", "the verge", "wired", "ars technica", "zdnet",
  "vnexpress", "tuổi trẻ", "dân trí", "genk", "bleepingcomputer", "sansec",
  "mozilla", "github", "cloudflare", "ieee", "acm", "nist", "iso", "w3c"
]);
const ORG_KEYWORDS = ["news", "team", "foundation", "institute", "corp", "inc", "llc", "labs", "group", "agency", "editorial"];

function isOrganization(name) {
  if (!name) return false;
  const low = name.trim().toLowerCase();
  if (ORG_NAMES.has(low)) return true;
  return ORG_KEYWORDS.some(k => low === k || low.includes(` ${k}`) || low.includes(`${k} `));
}

function cleanAuthorName(name) {
  if (!name) return "";
  if (typeof name !== "string") {
    if (Array.isArray(name)) name = name.join(", ");
    else name = String(name);
  }
  let s = name.trim();
  if (s.startsWith("http://") || s.startsWith("https://")) return "";
  s = s.replace(/^(by|written by|posted by|author|tác giả|theo|ảnh)\s*[:\-–]?\s*/i, "");
  s = s.replace(/@\w+/g, "");
  s = s.replace(/\s*[-–|]\s*(the hacker news|techcrunch|the verge|reuters|bbc|vnexpress).*$/i, "");
  s = s.replace(/,\s*(phóng viên|biên tập viên|reporter|editor|contributor).*$/i, "");
  s = s.replace(/^[,;\s&]+|[,;\s&]+$/g, "");
  return s.trim();
}

let activeTabId = null;
let currentTabUrl = "";
let originalExtractedMeta = null;

let currentMeta = {
  sourceType: "webpage",
  authors: "",
  title: "",
  date: "",
  container: "",
  pages: "",
  doi: "",
  url: "",
  accessed: getTodayIeee()
};

let currentCitationTab = "ieee";
let isInspectMode = false;
let isRedactionsPaused = false;
let currentRedactedList = [];
let currentRedactStyle = "blur";
let currentBlurPx = 12;
let lastCapturedDataUrl = "";

function removeVietnameseDiacritics(str) {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

// Citation Management & Customization State
let savedBibliographies = [];
let citationSettings = {
  accessedDate: true,
  authorStyle: "standard", // standard | last-first | uppercase-last | uppercase-all | original
  removeDiacritics: false,
  dateStyle: "auto",
  autoCopy: false
};
let currentModalTab = "ieee";
let currentModalFilter = "";
let isElementCapturePicking = false;

function getTodayIeee() {
  const d = new Date();
  return `${MONTHS_IEEE[d.getMonth() + 1] || ""} ${d.getDate()}, ${d.getFullYear()}`;
}

function getTodayApa() {
  const d = new Date();
  return `${MONTHS_FULL[d.getMonth() + 1] || ""} ${d.getDate()}, ${d.getFullYear()}`;
}

// // ----------------------------------------------------------------------------
// Citation Formatters & Multi-Author Parsing (IEEE, APA 7th, Harvard, MLA 9th, BibTeX)
// ----------------------------------------------------------------------------
function makeInitials(first) {
  if (!first) return "";
  first = first.trim();
  if (/^[A-Z]\.(\s*[A-Z]\.)*$/i.test(first)) {
    return first.split(/\s+/).join(" ");
  }
  const parts = first.split(/\s+/).filter(Boolean);
  return parts.map(p => {
    if (p.length <= 2 && p.endsWith(".")) return p.toUpperCase();
    const ch = p[0];
    return ch ? ch.toUpperCase() + "." : "";
  }).filter(Boolean).join(" ");
}

function parseAuthorParts(name) {
  name = cleanAuthorName(name);
  if (!name) return null;
  if (isOrganization(name)) {
    return { raw: name, first: "", last: name, initials: "", isOrg: true };
  }
  if (name.includes(",")) {
    const p = name.split(",");
    const last = p[0].trim();
    const first = p.slice(1).join(",").trim();
    const initials = makeInitials(first);
    return { raw: name, first, last, initials, isOrg: false };
  }
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length <= 1) {
    return { raw: name, first: "", last: words[0] || "", initials: "", isOrg: false };
  }
  const last = words[words.length - 1];
  const first = words.slice(0, words.length - 1).join(" ");
  const initials = makeInitials(first);
  return { raw: name, first, last, initials, isOrg: false };
}

function parseAuthorsList(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    raw = raw.filter(Boolean).map(x => typeof x === "string" ? x : (x?.name || "")).join(", ");
  }
  if (typeof raw !== "string") {
    raw = String(raw || "");
  }
  raw = raw.trim();
  if (!raw) return [];
  if (isOrganization(raw)) {
    return [{ raw, first: "", last: raw, initials: "", isOrg: true }];
  }
  let rawList = [];
  raw = raw.replace(/\s+and\s+/gi, ", ").replace(/\s+và\s+/gi, ", ").replace(/\s*&amp;\s*/gi, ", ").replace(/\s+&\s+/g, ", ");

  if (raw.includes(";")) {
    rawList = raw.split(";");
  } else if (raw.includes("\n")) {
    rawList = raw.split("\n");
  } else if (raw.includes(",")) {
    const commaParts = raw.split(",").map(s => s.trim()).filter(Boolean);
    let looksLikePairs = commaParts.length >= 4 && commaParts.length % 2 === 0;
    if (looksLikePairs) {
      for (let i = 1; i < commaParts.length; i += 2) {
        if (!/^[A-Z](\.|\b)/i.test(commaParts[i])) {
          looksLikePairs = false;
          break;
        }
      }
    }
    if (looksLikePairs) {
      for (let i = 0; i < commaParts.length; i += 2) {
        rawList.push(`${commaParts[i]}, ${commaParts[i + 1]}`);
      }
    } else {
      rawList = commaParts;
    }
  } else {
    rawList = [raw];
  }
  return rawList
    .map(s => cleanAuthorName(s))
    .filter(Boolean)
    .map(parseAuthorParts)
    .filter(Boolean);
}

function formatSingleAuthor(author, style, formatType) {
  if (!author) return "";
  if (author.isOrg) return author.last;

  let raw = author.raw;
  let first = author.first;
  let last = author.last;
  let initials = author.initials || author.first || "";

  if (citationSettings.removeDiacritics) {
    raw = removeVietnameseDiacritics(raw);
    first = removeVietnameseDiacritics(first);
    last = removeVietnameseDiacritics(last);
    initials = removeVietnameseDiacritics(initials);
  }

  if (citationSettings.authorStyle === "original") return raw;
  if (citationSettings.authorStyle === "uppercase-all") return removeVietnameseDiacritics(raw).toUpperCase();

  const isUpperLast = citationSettings.authorStyle === "uppercase-last";
  const isLastFirst = citationSettings.authorStyle === "last-first";
  const finalLast = isUpperLast ? last.toUpperCase() : last;

  if (isLastFirst || isUpperLast) {
    return initials ? `${finalLast}, ${initials}` : finalLast;
  }

  if (formatType === "ieee") {
    return initials ? `${initials} ${finalLast}` : finalLast;
  } else if (formatType === "apa") {
    return initials ? `${finalLast}, ${initials}` : finalLast;
  } else if (formatType === "harvard") {
    const hInitials = initials.replace(/\s+/g, "");
    return hInitials ? `${finalLast}, ${hInitials}` : finalLast;
  } else if (formatType === "mla") {
    const fullFirst = first || initials;
    return fullFirst ? `${finalLast}, ${fullFirst}` : finalLast;
  } else if (formatType === "bibtex") {
    const fullFirst = first || initials;
    return fullFirst ? `${finalLast}, ${fullFirst}` : finalLast;
  }
  return initials ? `${initials} ${finalLast}` : finalLast;
}

function formatIeeeAuthors(raw) {
  const authors = parseAuthorsList(raw);
  if (authors.length === 0) return "";
  if (authors.length === 1) return formatSingleAuthor(authors[0], citationSettings.authorStyle, "ieee");
  if (authors.length === 2) {
    return `${formatSingleAuthor(authors[0], citationSettings.authorStyle, "ieee")} and ${formatSingleAuthor(authors[1], citationSettings.authorStyle, "ieee")}`;
  }
  if (authors.length <= 6) {
    const list = authors.map(a => formatSingleAuthor(a, citationSettings.authorStyle, "ieee"));
    return `${list.slice(0, -1).join(", ")}, and ${list[list.length - 1]}`;
  }
  return `${formatSingleAuthor(authors[0], citationSettings.authorStyle, "ieee")} et al.`;
}

function formatApaAuthors(raw) {
  const authors = parseAuthorsList(raw);
  if (authors.length === 0) return "";
  if (authors.length === 1) return formatSingleAuthor(authors[0], citationSettings.authorStyle, "apa");
  if (authors.length === 2) {
    return `${formatSingleAuthor(authors[0], citationSettings.authorStyle, "apa")} & ${formatSingleAuthor(authors[1], citationSettings.authorStyle, "apa")}`;
  }
  if (authors.length <= 20) {
    const list = authors.map(a => formatSingleAuthor(a, citationSettings.authorStyle, "apa"));
    return `${list.slice(0, -1).join(", ")}, & ${list[list.length - 1]}`;
  }
  const first19 = authors.slice(0, 19).map(a => formatSingleAuthor(a, citationSettings.authorStyle, "apa"));
  const lastAuthor = formatSingleAuthor(authors[authors.length - 1], citationSettings.authorStyle, "apa");
  return `${first19.join(", ")}, ... ${lastAuthor}`;
}

function formatHarvardAuthors(raw) {
  const authors = parseAuthorsList(raw);
  if (authors.length === 0) return "";
  if (authors.length === 1) return formatSingleAuthor(authors[0], citationSettings.authorStyle, "harvard");
  if (authors.length === 2) {
    return `${formatSingleAuthor(authors[0], citationSettings.authorStyle, "harvard")} and ${formatSingleAuthor(authors[1], citationSettings.authorStyle, "harvard")}`;
  }
  if (authors.length === 3) {
    const list = authors.map(a => formatSingleAuthor(a, citationSettings.authorStyle, "harvard"));
    return `${list[0]}, ${list[1]} and ${list[2]}`;
  }
  return `${formatSingleAuthor(authors[0], citationSettings.authorStyle, "harvard")} et al.`;
}

function formatMlaAuthors(raw) {
  const authors = parseAuthorsList(raw);
  if (authors.length === 0) return "";
  if (authors.length === 1) return formatSingleAuthor(authors[0], citationSettings.authorStyle, "mla");
  if (authors.length === 2) {
    const a1 = formatSingleAuthor(authors[0], citationSettings.authorStyle, "mla");
    const a2 = authors[1].isOrg ? authors[1].last : `${authors[1].first || authors[1].initials} ${authors[1].last}`.trim();
    return `${a1}, and ${a2}`;
  }
  return `${formatSingleAuthor(authors[0], citationSettings.authorStyle, "mla")}, et al.`;
}

function formatBibtexAuthors(raw) {
  const authors = parseAuthorsList(raw);
  if (authors.length === 0) return "";
  return authors.map(a => {
    if (a.isOrg) return `{${a.last}}`;
    return formatSingleAuthor(a, "standard", "bibtex");
  }).join(" and ");
}

function parseComprehensiveDate(raw) {
  if (!raw) return "";
  let s = raw.toString().trim();
  if (!s) return "";

  // Check if string contains multiple dates with explicit "published" vs "updated" labels
  const pubSectionMatch = s.match(/(?:ngày\s*đăng|đăng\s*(?:ngày|lúc)?|xuất\s*bản|công\s*bố|published\s*(?:on|at)?|posted\s*(?:on|at)?)\s*[:\-–,]?\s*([^|\n–—]+?)(?=(?:\s*[-–—|•]\s*(?:cập\s*nhật|updated|modified|last\s*modified|last\s*updated))|\s*$)/i);
  if (pubSectionMatch) {
    s = pubSectionMatch[1].trim();
  }

  // 0. Full ISO timestamp (e.g. "2009-10-24T23:57:33-07:00", "2005-04-23T20:31:52-07:00" or "2026-09-05T22:57:50Z")
  // Extract the official publisher calendar date (YYYY-MM-DD) directly before 'T' without timezone date drift
  const isoYmdMatch = s.match(/\b(19\d\d|20\d\d)-(\d{2})-(\d{2})(?:T|\s|$)/i);
  if (isoYmdMatch) {
    return `${isoYmdMatch[1]}-${isoYmdMatch[2]}-${isoYmdMatch[3]}`;
  }

  // 1. Remove prefixes like "Updated on:", "Published:", "Đăng lúc:", "Thứ...", "Đã công chiếu vào...", etc.
  s = s.replace(/^(?:updated\s*(?:on|at)?|published\s*(?:on|at)?|posted\s*(?:on|at)?|modified\s*(?:on|at)?|uploaded\s*on|streamed\s*live\s*(?:on)?|streamed\s*(?:on)?|premiered\s*(?:on)?|đã\s*công\s*chiếu\s*(?:vào)?|đã\s*phát\s*trực\s*tiếp\s*(?:vào)?|công\s*chiếu\s*(?:vào)?|phát\s*trực\s*tiếp\s*(?:vào)?|đã\s*tải\s*lên\s*(?:vào)?|xuất bản|ngày đăng|đăng lúc|cập nhật|thứ\s+[a-z0-9]+|chủ nhật)\s*[:\-–,]?\s*/i, "").trim();

  // 2. Relative dates: "X giờ trước", "X phút trước", "X ngày trước", "X tuần trước", "X tháng trước", "X năm trước", etc.
  const now = new Date();
  if (/(\d+)\s*(?:giờ|phút|giây|hours?|mins?|minutes?|secs?|seconds?)\s*(?:trước|ago)/i.test(s) || /vừa xong|just now/i.test(s)) {
    return now.toISOString().split("T")[0];
  }
  const relDayMatch = s.match(/(\d+)\s*(?:ngày|days?)\s*(?:trước|ago)/i);
  if (relDayMatch) {
    const d = new Date(now.getTime() - parseInt(relDayMatch[1], 10) * 86400000);
    return d.toISOString().split("T")[0];
  }
  const relWeekMatch = s.match(/(\d+)\s*(?:tuần|weeks?)\s*(?:trước|ago)/i);
  if (relWeekMatch) {
    const d = new Date(now.getTime() - parseInt(relWeekMatch[1], 10) * 7 * 86400000);
    return d.toISOString().split("T")[0];
  }
  const relMonthMatch = s.match(/(\d+)\s*(?:tháng|months?)\s*(?:trước|ago)/i);
  if (relMonthMatch) {
    const d = new Date(now.getFullYear(), now.getMonth() - parseInt(relMonthMatch[1], 10), now.getDate());
    return d.toISOString().split("T")[0];
  }
  const relYearMatch = s.match(/(\d+)\s*(?:năm|years?)\s*(?:trước|ago)/i);
  if (relYearMatch) {
    const yr = now.getFullYear() - parseInt(relYearMatch[1], 10);
    return `${yr}`;
  }
  if (/hôm qua|yesterday/i.test(s)) {
    const d = new Date(now.getTime() - 86400000);
    return d.toISOString().split("T")[0];
  }

  // 3. ISO or YYYY-MM-DD (or with T or space)
  const isoMatch = s.match(/\b(19\d\d|20\d\d)[-/.](\d{1,2})[-/.](\d{1,2})(?:T|\s|$|[^\d])/);
  if (isoMatch) {
    const y = isoMatch[1];
    const m = isoMatch[2].padStart(2, "0");
    const d = isoMatch[3].padStart(2, "0");
    if (parseInt(m, 10) >= 1 && parseInt(m, 10) <= 12 && parseInt(d, 10) >= 1 && parseInt(d, 10) <= 31) {
      return `${y}-${m}-${d}`;
    }
  }

  // 4. Vietnamese phrase: "ngày 06 tháng 09 năm 2026", "16 thg 8, 2026", "tháng ba, 2024"
  const vnWordMonths = {
    "một": "01", "giêng": "01", "hai": "02", "ba": "03", "bốn": "04", "tư": "04",
    "năm": "05", "sáu": "06", "bảy": "07", "tám": "08", "chín": "09",
    "mười": "10", "mười một": "11", "mười hai": "12", "chạp": "12"
  };
  const vnPhraseMatch = s.match(/(?:ngày\s+)?(\d{1,2})\s+(?:tháng|thg)\s+(\d{1,2}|một|giêng|hai|ba|bốn|tư|năm|sáu|bảy|tám|chín|mười|mười\s+một|mười\s+hai)(?:,?\s+năm|\s*,)?\s+(19\d\d|20\d\d)/i);
  if (vnPhraseMatch) {
    const d = vnPhraseMatch[1].padStart(2, "0");
    const rawM = vnPhraseMatch[2].toLowerCase().trim();
    const m = vnWordMonths[rawM] || rawM.padStart(2, "0");
    const y = vnPhraseMatch[3];
    return `${y}-${m}-${d}`;
  }
  const vnMonthYear = s.match(/(?:tháng|thg)\s+(\d{1,2}|một|giêng|hai|ba|bốn|tư|năm|sáu|bảy|tám|chín|mười|mười\s+một|mười\s+hai)(?:,?\s+năm|\s*,)?\s+(19\d\d|20\d\d)/i);
  if (vnMonthYear) {
    const rawM = vnMonthYear[1].toLowerCase().trim();
    const m = vnWordMonths[rawM] || rawM.padStart(2, "0");
    const y = vnMonthYear[2];
    return `${y}-${m}`;
  }

  // 5. English Month names
  const months = {
    jan: "01", january: "01", feb: "02", february: "02", mar: "03", march: "03", apr: "04", april: "04",
    may: "05", jun: "06", june: "06", jul: "07", july: "07", aug: "08", august: "08", sep: "09", sept: "09",
    september: "09", oct: "10", october: "10", nov: "11", november: "11", dec: "12", december: "12"
  };
  const monthNamesRegex = "jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?";

  // "September 6, 2026" or "September 6th, 2026"
  const enMatch1 = s.match(new RegExp(`\\b(${monthNamesRegex})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(19\\d\\d|20\\d\\d)\\b`, "i"));
  if (enMatch1) {
    const m = months[enMatch1[1].toLowerCase().replace(".", "")];
    const d = enMatch1[2].padStart(2, "0");
    const y = enMatch1[3];
    if (m) return `${y}-${m}-${d}`;
  }

  // "6 September 2026" or "6th Sept 2026"
  const enMatch2 = s.match(new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${monthNamesRegex})\\.?\\s*,?\\s+(19\\d\\d|20\\d\\d)\\b`, "i"));
  if (enMatch2) {
    const d = enMatch2[1].padStart(2, "0");
    const m = months[enMatch2[2].toLowerCase().replace(".", "")];
    const y = enMatch2[3];
    if (m) return `${y}-${m}-${d}`;
  }

  // Month + Year: "September 2026"
  const enMatch3 = s.match(new RegExp(`\\b(${monthNamesRegex})\\.?\\s*,?\\s+(19\\d\\d|20\\d\\d)\\b`, "i"));
  if (enMatch3) {
    const m = months[enMatch3[1].toLowerCase().replace(".", "")];
    const y = enMatch3[2];
    if (m) return `${y}-${m}`;
  }

  // 6. Day-Month-Year: "06/09/2026", "6.9.2026", "06-09-2026"
  const dmyMatch = s.match(/\b(\d{1,2})[./-](\d{1,2})[./-](19\d\d|20\d\d)\b/);
  if (dmyMatch) {
    const d = dmyMatch[1].padStart(2, "0");
    const m = dmyMatch[2].padStart(2, "0");
    const y = dmyMatch[3];
    if (parseInt(m, 10) >= 1 && parseInt(m, 10) <= 12 && parseInt(d, 10) >= 1 && parseInt(d, 10) <= 31) {
      return `${y}-${m}-${d}`;
    }
  }

  // 7. Year only
  const yMatch = s.match(/\b(19\d\d|20\d\d)\b/);
  if (yMatch) return yMatch[1];

  return s.slice(0, 30);
}

function formatCitationDate(rawDate, style = "ieee") {
  if (!rawDate) return "";
  if (citationSettings.dateStyle === "year") {
    const yM = rawDate.match(/\b(19\d\d|20\d\d)\b/);
    return yM ? yM[1] : rawDate;
  }
  let effectiveStyle = style;
  if (citationSettings.dateStyle === "full") {
    effectiveStyle = style; // we handle "full" below by avoiding month-year truncation
  }
  const parsed = parseComprehensiveDate(rawDate);
  const s = parsed || rawDate.trim();

  // Try matching YYYY-MM-DD
  const mYmd = s.match(/^(19\d\d|20\d\d)-(\d{1,2})-(\d{1,2})$/);
  if (mYmd) {
    const y = mYmd[1];
    const m = parseInt(mYmd[2], 10);
    const d = parseInt(mYmd[3], 10);
    if (m >= 1 && m <= 12) {
      if (style === "ieee") return `${MONTHS_IEEE[m]} ${d}, ${y}`;
      if (style === "apa") return `${y}, ${MONTHS_FULL[m]} ${d}`;
      if (style === "mla") return `${d} ${MONTHS_IEEE[m]} ${y}`;
      if (style === "year") return y;
    }
  }

  // Try matching YYYY-MM
  const mYm = s.match(/^(19\d\d|20\d\d)-(\d{1,2})$/);
  if (mYm) {
    const y = mYm[1];
    const m = parseInt(mYm[2], 10);
    if (m >= 1 && m <= 12) {
      if (style === "ieee") return `${MONTHS_IEEE[m]} ${y}`;
      if (style === "apa") return `${y}, ${MONTHS_FULL[m]}`;
      if (style === "mla") return `${MONTHS_IEEE[m]} ${y}`;
      if (style === "year") return y;
    }
  }

  // Fallback if 4-digit year exists
  const mY = s.match(/\b(19\d\d|20\d\d)\b/);
  if (style === "year" && mY) return mY[0];
  return s;
}

// ----------------------------------------------------------------------------
// PDF Document & Technical Report Metadata Extractor
// ----------------------------------------------------------------------------
function isPdfUrl(url) {
  if (!url) return false;
  return /\.pdf(\?.*)?$/i.test(url) ||
         /\/pdf\b/i.test(url) ||
         /\/article\/download\/\d+/i.test(url) ||
         /^file:\/\/.*\.pdf$/i.test(url);
}

function decodePdfString(raw) {
  if (!raw) return "";
  let s = raw.trim();
  if (s.startsWith("<") && s.endsWith(">")) s = s.slice(1, -1).trim();
  if (/^[0-9a-fA-F\s]+$/.test(s)) {
    s = s.replace(/\s+/g, "");
    if (s.toLowerCase().startsWith("feff")) {
      let decoded = "";
      for (let i = 4; i < s.length; i += 4) {
        decoded += String.fromCharCode(parseInt(s.substr(i, 4), 16));
      }
      return decoded.trim();
    }
    let decoded = "";
    for (let i = 0; i < s.length; i += 2) {
      decoded += String.fromCharCode(parseInt(s.substr(i, 2), 16));
    }
    return decoded.trim();
  }
  s = s.replace(/\\([0-7]{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)));
  s = s.replace(/\\([()\\])/g, "$1");
  if (s.charCodeAt(0) === 0xFEFF || (s.charCodeAt(0) === 0xFE && s.charCodeAt(1) === 0xFF)) {
    let decoded = "";
    for (let i = 2; i < s.length; i += 2) {
      decoded += String.fromCharCode((s.charCodeAt(i) << 8) | s.charCodeAt(i + 1));
    }
    return decoded.trim();
  }
  return s.trim();
}

function cleanPdfFilenameToTitle(url, rawTitle = "") {
  let clean = "";
  if (url) {
    try {
      const u = new URL(url);
      const pathname = u.pathname;
      const parts = pathname.split("/").filter(Boolean);
      if (parts.length > 0) {
        let last = decodeURIComponent(parts[parts.length - 1]);
        last = last.replace(/\.pdf$/i, "");
        if (!/^[\da-f]{16,}$/i.test(last) && !/^\d+$/.test(last)) {
          clean = last.replace(/[-_+]/g, " ").replace(/\s+/g, " ").trim();
          // Only capitalize if not already mixed case or contains diacriticals
          // Check if text has significant capitalization already
          const hasUpperCase = /[A-ZÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴ]/.test(clean);
          const hasLowerCase = /[a-zàáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵ]/.test(clean);
          // If title already has mixed case, don't force uppercase first letter
          if (hasUpperCase && hasLowerCase) {
            // Already has capitalization, keep as-is
          } else {
            // Safe to capitalize: capitalize first letter and word boundaries (Latin only)
            clean = clean.replace(/\b([a-z])/g, c => c.toUpperCase());
          }
        }
      }
    } catch (e) {}
  }

  if (!clean && rawTitle) {
    clean = rawTitle.replace(/\.pdf$/i, "").replace(/[-_+]/g, " ").trim();
    const hasUpperCase = /[A-ZÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴ]/.test(clean);
    const hasLowerCase = /[a-zàáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵ]/.test(clean);
    if (!(hasUpperCase && hasLowerCase)) {
      clean = clean.replace(/\b([a-z])/g, c => c.toUpperCase());
    }
  }
  return clean || "Tài liệu PDF / Báo cáo kỹ thuật";
}

function inferPublisherFromUrl(url) {
  if (!url) return "";
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    const map = {
      "who.int": "World Health Organization (WHO)",
      "worldbank.org": "World Bank",
      "openai.com": "OpenAI",
      "anthropic.com": "Anthropic",
      "w3.org": "World Wide Web Consortium (W3C)",
      "ietf.org": "Internet Engineering Task Force (IETF)",
      "iso.org": "International Organization for Standardization (ISO)",
      "nist.gov": "National Institute of Standards and Technology (NIST)",
      "un.org": "United Nations",
      "arxiv.org": "arXiv preprint",
      "jst-ud.vn": "Tạp chí Khoa học và Công nghệ Đại học Đà Nẵng",
      "researchgate.net": "ResearchGate",
      "biorxiv.org": "bioRxiv",
      "medrxiv.org": "medRxiv"
    };
    return map[host] || host;
  } catch (e) {
    return "";
  }
}

function parsePdfText(text, filename = "", url = "") {
  let title = "";
  let authors = "";
  let date = "";
  let container = "";

  // 1. XMP Metadata
  const xmpTitle = text.match(/<dc:title[^>]*>[\s\S]*?<rdf:li[^>]*>([^<]+)<\/rdf:li>/i);
  if (xmpTitle) title = xmpTitle[1].trim();

  const xmpCreator = text.match(/<dc:creator[^>]*>[\s\S]*?<rdf:Seq[^>]*>([\s\S]*?)<\/rdf:Seq>/i) ||
                     text.match(/<dc:creator[^>]*>[\s\S]*?<rdf:Bag[^>]*>([\s\S]*?)<\/rdf:Bag>/i) ||
                     text.match(/<dc:creator[^>]*>[\s\S]*?<rdf:li[^>]*>([^<]+)<\/rdf:li>/i);
  if (xmpCreator) {
    if (xmpCreator[1].includes("<rdf:li")) {
      const lis = Array.from(xmpCreator[1].matchAll(/<rdf:li[^>]*>([^<]+)<\/rdf:li>/gi)).map(m => m[1].trim());
      if (lis.length > 0) authors = lis.join(", ");
    } else {
      authors = xmpCreator[1].trim();
    }
  }

  const xmpDate = text.match(/<dc:date[^>]*>[\s\S]*?<rdf:li[^>]*>([^<]+)<\/rdf:li>/i) ||
                  text.match(/<xmp:CreateDate[^>]*>([^<]+)<\/xmp:CreateDate>/i);
  if (xmpDate) {
    const ym = xmpDate[1].match(/\b(19\d\d|20\d\d)(?:[-/](\d{1,2}))?(?:[-/](\d{1,2}))?/);
    if (ym) date = ym[1] + (ym[2] ? "-" + ym[2].padStart(2, "0") : "") + (ym[3] ? "-" + ym[3].padStart(2, "0") : "");
  }

  // 2. Info Dictionary
  if (!title) {
    const mTitle = text.match(/\/Title\s*(?:\(([^)\\]*(?:\\.[^)\\]*)*)\)|<([0-9a-fA-F\s]+)>)/);
    if (mTitle) {
      const raw = mTitle[2] ? "<" + mTitle[2] + ">" : mTitle[1];
      title = decodePdfString(raw);
    }
  }

  // 2b. Fallback to /Subject if /Title is missing or too generic
  if (!title || /^(?:untitled|document|\.pdf|unnamed|new document)$/i.test(title)) {
    const mSubject = text.match(/\/Subject\s*(?:\(([^)\\]*(?:\\.[^)\\]*)*)\)|<([0-9a-fA-F\s]+)>)/);
    if (mSubject) {
      const raw = mSubject[2] ? "<" + mSubject[2] + ">" : mSubject[1];
      const subject = decodePdfString(raw);
      if (subject && subject.length > 3) {
        title = subject;
      }
    }
  }
  if (!authors) {
    const mAuthor = text.match(/\/Author\s*(?:\(([^)\\]*(?:\\.[^)\\]*)*)\)|<([0-9a-fA-F\s]+)>)/);
    if (mAuthor) {
      const raw = mAuthor[2] ? "<" + mAuthor[2] + ">" : mAuthor[1];
      authors = decodePdfString(raw);
    }
  }
  if (!date) {
    const mDate = text.match(/\/CreationDate\s*\((?:D:)?(\d{4})(\d{2})?(\d{2})?/i);
    if (mDate) {
      date = mDate[1] + (mDate[2] ? "-" + mDate[2] : "") + (mDate[3] ? "-" + mDate[3] : "");
    }
  }

  // Fallback to /ModDate if /CreationDate not found
  if (!date) {
    const mModDate = text.match(/\/ModDate\s*\((?:D:)?(\d{4})(\d{2})?(\d{2})?/i);
    if (mModDate) {
      date = mModDate[1] + (mModDate[2] ? "-" + mModDate[2] : "") + (mModDate[3] ? "-" + mModDate[3] : "");
    }
  }

  // Check /Producer for potential publisher
  const mProducer = text.match(/\/Producer\s*(?:\(([^)\\]*(?:\\.[^)\\]*)*)\)|<([0-9a-fA-F\s]+)>)/);
  if (mProducer) {
    const pStr = decodePdfString(mProducer[2] ? "<" + mProducer[2] + ">" : mProducer[1]);
    if (pStr && !/adobe|latex|pdftex|word|quartz|mac os|skia|chromium|microsoft|prince/i.test(pStr)) {
      container = pStr;
    }
  }

  title = title.replace(/^microsoft word\s*-\s*/i, "").trim();

  // Smart fallback: if extracted title is too short or too generic, depend on filename
  const isTitleGeneric = !title || 
                         /^(?:untitled|document|\.pdf|unnamed|new document|page)$/i.test(title) ||
                         title.length < 5;

  if (isTitleGeneric) {
    const filenameTitle = cleanPdfFilenameToTitle(url, filename);
    if (filenameTitle && filenameTitle.length > title.length) {
      title = filenameTitle;
    }
  }

  if (!container && url) {
    container = inferPublisherFromUrl(url);
  }

  if (!date && (title || url)) {
    const yMatch = (title + " " + url).match(/\b(19\d\d|20\d\d)\b/);
    if (yMatch) date = yMatch[1];
  }

  // Extract keywords (optional - can be used for tagging)
  let keywords = "";
  const mKeywords = text.match(/\/Keywords\s*(?:\(([^)\\]*(?:\\.[^)\\]*)*)\)|<([0-9a-fA-F\s]+)>)/);
  if (mKeywords) {
    const raw = mKeywords[2] ? "<" + mKeywords[2] + ">" : mKeywords[1];
    keywords = decodePdfString(raw);
  }

  return {
    sourceType: "pdf",
    title,
    authors,
    date,
    container,
    pages: "",
    url: url || "",
    doi: "",
    keywords: keywords  // Added for future tagging features
  };
}

function parsePdfBuffer(buf, filename = "") {
  // Increase buffer to 256KB to capture more metadata (PDF metadata is typically at start)
  const slice = buf.slice(0, Math.min(buf.byteLength, 262144));
  const bytes = new Uint8Array(slice);
  let text = "";
  for (let i = 0; i < bytes.length; i++) {
    text += String.fromCharCode(bytes[i]);
  }
  return parsePdfText(text, filename, "");
}

async function extractPdfMetadataFromUrl(url, pageTitle = "") {
  if (!url) return null;

  // 1. arXiv Papers
  const arxivMatch = url.match(/arxiv\.org\/(?:pdf|abs)\/(\d{4}\.\d{4,5}(?:v\d+)?)/i);
  if (arxivMatch) {
    const aid = arxivMatch[1];
    try {
      const axRes = await fetch(`https://export.arxiv.org/api/query?id_list=${encodeURIComponent(aid)}`);
      if (axRes.ok) {
        const xmlText = await axRes.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, "text/xml");
        const entry = xmlDoc.querySelector("entry");
        if (entry) {
          const title = entry.querySelector("title")?.textContent?.replace(/\s+/g, " ").trim() || "";
          const authors = Array.from(entry.querySelectorAll("author name")).map(n => n.textContent.trim()).join(", ");
          const published = entry.querySelector("published")?.textContent || "";
          const date = published.slice(0, 10);
          return {
            sourceType: "academic",
            title,
            authors,
            date,
            container: "arXiv preprint",
            pages: `Rep. arXiv:${aid}`,
            doi: `arXiv:${aid}`,
            url: `https://arxiv.org/abs/${aid}`
          };
        }
      }
    } catch (e) {
      console.warn("arXiv fetch failed:", e);
    }
  }

  // 2. Embedded DOI (Nature, Springer, Wiley, PLOS, etc.)
  const doiMatch = url.match(/\b(10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+)\b/i);
  if (doiMatch) {
    const doiClean = doiMatch[1].replace(/[.,;)]+$/, "");
    try {
      const doiRes = await fetch(`https://doi.org/${encodeURIComponent(doiClean)}`, {
        headers: { "Accept": "application/vnd.citationstyles.csl+json" }
      });
      if (doiRes.ok) {
        const data = await doiRes.json();
        const title = data.title || cleanPdfFilenameToTitle(url, pageTitle);
        const authors = (data.author || []).map(a => `${a.given ? a.given + " " : ""}${a.family || a.name || ""}`).filter(Boolean).join(", ");
        const year = data.issued?.["date-parts"]?.[0]?.[0] || "";
        const month = data.issued?.["date-parts"]?.[0]?.[1] || "";
        const day = data.issued?.["date-parts"]?.[0]?.[2] || "";
        let date = year ? String(year) : "";
        if (year && month) date += `-${String(month).padStart(2, "0")}` + (day ? `-${String(day).padStart(2, "0")}` : "");
        const container = data["container-title"] || data.publisher || inferPublisherFromUrl(url);
        const pages = data.page ? `pp. ${data.page}` : "";
        return {
          sourceType: "academic",
          title,
          authors,
          date,
          container,
          pages,
          doi: doiClean,
          url: data.URL || url
        };
      }
    } catch (e) {
      console.warn("DOI PDF fetch failed:", e);
    }
  }

  // 3. Open Journal Systems (OJS) Article Download URL
  const ojsMatch = url.match(/\/article\/download\/(\d+)(?:\/\d+)?/i);
  if (ojsMatch) {
    const parentUrl = url.replace(/\/article\/download\/\d+(?:\/\d+)?.*$/i, `/article/view/${ojsMatch[1]}`);
    try {
      const ojsRes = await fetch(parentUrl);
      if (ojsRes.ok) {
        const html = await ojsRes.text();
        const doc = new DOMParser().parseFromString(html, "text/html");
        const getMeta = (...names) => {
          for (const n of names) {
            const el = doc.querySelector(`meta[name="${n}" i], meta[property="${n}" i]`);
            if (el && el.getAttribute("content")) return el.getAttribute("content").trim();
          }
          return "";
        };
        const title = getMeta("citation_title", "DC.Title") || cleanPdfFilenameToTitle(url, pageTitle);
        const authors = Array.from(doc.querySelectorAll('meta[name="citation_author" i], meta[name="DC.Creator.PersonalName" i]'))
          .map(el => el.getAttribute("content")?.trim()).filter(Boolean).join(", ");
        const container = getMeta("citation_journal_title", "DC.Source") || inferPublisherFromUrl(url);
        const date = getMeta("citation_date", "DC.Date.issued");
        const p1 = getMeta("citation_firstpage");
        const p2 = getMeta("citation_lastpage");
        const pageNum = getMeta("DC.Identifier.pageNumber");
        const pages = (p1 && p2) ? `pp. ${p1}-${p2}` : (pageNum ? `pp. ${pageNum}` : "");
        return {
          sourceType: "academic",
          title,
          authors,
          date: date ? date.replace(/\//g, "-") : "",
          container,
          pages,
          doi: getMeta("citation_doi", "DC.Identifier.DOI"),
          url: parentUrl
        };
      }
    } catch (e) {
      console.warn("OJS fetch failed:", e);
    }
  }

  // 4. Direct Online Web PDF or Local file:// PDF (Fetch Range bytes=0-65535 or local buffer)
  if (/^(?:https?|file):\/\//i.test(url)) {
    try {
      const fetchOpts = url.startsWith("file://") ? {} : { headers: { Range: "bytes=0-65535" } };
      const pdfRes = await fetch(url, fetchOpts);
      if (pdfRes.ok || pdfRes.status === 206 || (pdfRes.status === 0 && url.startsWith("file://"))) {
        const bufText = await pdfRes.text();
        const meta = parsePdfText(bufText, pageTitle, url);
        if (meta.title && meta.title.length > 3) {
          if (url.startsWith("file://")) {
            const localLabel = `${window.i18n.t('i18n_local_pdf')} / ${window.i18n.t('i18n_pdf')}`;
            meta.container = meta.container || localLabel;
          }
          return meta;
        }
      }
    } catch (e) {
      console.warn("PDF stream/file fetch failed:", e);
    }

    // Fallback: try to request full PDF bytes from content script (useful for file:// or in-browser PDF viewers)
    try {
      const tabPdf = await sendTabMessage({ action: "EXTRACT_PDF_BUFFER" });
      if (tabPdf && tabPdf.base64) {
        const bstr = atob(tabPdf.base64);
        const len = bstr.length;
        const u8 = new Uint8Array(len);
        for (let i = 0; i < len; i++) u8[i] = bstr.charCodeAt(i);
        const meta2 = parsePdfBuffer(u8.buffer, tabPdf.filename || pageTitle || url);
        if (meta2 && meta2.title && meta2.title.length > 3) {
          if (url.startsWith("file://")) {
            const localLabel = `${window.i18n.t('i18n_local_pdf')} / ${window.i18n.t('i18n_pdf')}`;
            meta2.container = meta2.container || localLabel;
          }
          return meta2;
        }
      }
    } catch (ex) {
      console.warn("PDF buffer extraction via content script failed:", ex);
    }
  }

  // 5. Fallback from Filename & URL
  const isLocalFile = url.startsWith("file://");
  const localLabel = isLocalFile ? `${window.i18n.t('i18n_local_pdf')} / ${window.i18n.t('i18n_pdf')}` : null;
  return {
    sourceType: "pdf",
    title: cleanPdfFilenameToTitle(url, pageTitle),
    authors: "",
    date: (url.match(/\b(19\d\d|20\d\d)\b/) || [""])[0],
    container: localLabel || (inferPublisherFromUrl(url) || window.i18n.t('i18n_technical_report')),
    pages: "",
    url: url,
    doi: ""
  };
}

function extractYear(raw) {
  if (!raw) return "";
  const parsed = parseComprehensiveDate(raw);
  const m = (parsed || raw || "").match(/\b(19\d\d|20\d\d)\b/);
  return m ? m[0] : "";
}

function generateBibtexKey(authors, date, title) {
  const a = (authors.split(/[,;\s]/)[0] || "ref").toLowerCase().replace(/[^a-z0-9]/g, "");
  const y = extractYear(date) || new Date().getFullYear().toString();
  const w = title.toLowerCase().split(/[^a-z0-9]+/).filter(x => x.length > 2 && !["the", "and", "for"].includes(x))[0] || "article";
  return `${a}${y}${w}`;
}

function buildIeeeCitation(meta) {
  const a = formatIeeeAuthors(meta.authors);
  const cleanTitle = (meta.title || "Untitled").trim().replace(/[,\.]+$/, "");
  const y = extractYear(meta.date) || (meta.date ? meta.date.trim() : "n.d.");
  const dateIeee = meta.date ? formatCitationDate(meta.date, "ieee") : y;
  const dateIeeeMonthYear = citationSettings.dateStyle === "full" ? dateIeee : dateIeee.replace(/\s\d{1,2},/, "");
  const prefix = a ? `${a}, ` : "";

  switch (meta.sourceType) {
    case "academic":
      let resAcad = `${prefix}"${cleanTitle}," `;
      if (meta.container) resAcad += `*${meta.container.trim()}*, `;
      if (meta.pages) resAcad += `${meta.pages.trim()}, `;
      resAcad += `${dateIeeeMonthYear}.`;
      if (meta.doi) {
        resAcad += ` doi: ${meta.doi.trim().replace(/^https?:\/\/doi\.org\//, "")}.`;
      } else if (meta.url) {
        resAcad += ` [Online]. Available: ${meta.url}.`;
        if (citationSettings.accessedDate) resAcad += ` [${t('i18n_accessed')}: ${meta.accessed || getTodayIeee()}].`;
      }
      return resAcad;

    case "conference":
      let resConf = `${prefix}"${cleanTitle}," in *${meta.container ? meta.container.trim() : "Proc. Conference"}*, ${dateIeeeMonthYear}`;
      if (meta.pages) resConf += `, ${meta.pages.trim()}`;
      resConf += `.`;
      if (meta.doi) {
        resConf += ` doi: ${meta.doi.trim().replace(/^https?:\/\/doi\.org\//, "")}.`;
      } else if (meta.url) {
        resConf += ` [Online]. Available: ${meta.url}.`;
        if (citationSettings.accessedDate) resConf += ` [${t('i18n_accessed')}: ${meta.accessed || getTodayIeee()}].`;
      }
      return resConf;

    case "book":
      let resBook = `${prefix}*${cleanTitle}*`;
      if (meta.pages && meta.pages.toLowerCase().includes("ed")) resBook += `, ${meta.pages.trim()}`;
      if (meta.container) resBook += `. ${meta.container.trim()}`;
      resBook += `, ${dateIeee}.`;
      if (meta.doi) resBook += ` doi: ${meta.doi.trim().replace(/^https?:\/\/doi\.org\//, "")}.`;
      return resBook;

    case "pdf":
      let repLabel = "Tech. Rep.";
      if (meta.pages) {
        const pTrim = meta.pages.trim();
        if (/^(?:rep|tr|no|báo cáo|report)\b/i.test(pTrim)) {
          repLabel = pTrim;
        } else if (/^\d+[-\d]*$/.test(pTrim) || /^pp\./i.test(pTrim)) {
          repLabel = `Tech. Rep., ${pTrim.startsWith("pp.") ? pTrim : "pp. " + pTrim}`;
        } else {
          repLabel = `Rep. ${pTrim}`;
        }
      }
      let resRep = `${prefix}"${cleanTitle}," ${meta.container ? meta.container.trim() + ", " : ""}${repLabel}, ${dateIeee}.`;
      if (meta.doi) {
        resRep += ` doi: ${meta.doi.trim().replace(/^https?:\/\/doi\.org\//, "")}.`;
      } else if (meta.url && !meta.url.startsWith("file://")) {
        resRep += ` [Online]. Available: ${meta.url}.`;
        if (citationSettings.accessedDate) {
          resRep += ` [Accessed: ${meta.accessed || getTodayIeee()}].`;
        }
      } else if (meta.url && meta.url.startsWith("file://")) {
        // Local PDF - don't add extra note since container is already included
      }
      return resRep;

    case "software":
      let ver = meta.pages ? `version ${meta.pages.trim()}, ` : "";
      let resSoft = `${prefix}*${cleanTitle}*, ${ver}${meta.container ? meta.container.trim() + ", " : ""}${dateIeee}. [Online]. Available: ${meta.url}`;
      if (citationSettings.accessedDate) resSoft += ` [Accessed: ${meta.accessed || getTodayIeee()}].`;
      return resSoft;

    case "video":
      const vDateIeee = meta.date ? formatCitationDate(meta.date, "ieee") : y;
      let resVid = `${prefix}"${cleanTitle}," *${meta.container || "YouTube"}*, ${vDateIeee}. [Online Video]. Available: ${meta.url}`;
      if (citationSettings.accessedDate) resVid += ` [Accessed: ${meta.accessed || getTodayIeee()}].`;
      return resVid;

    default:
      let resWeb = `${prefix}"${cleanTitle}," `;
      if (meta.container) resWeb += `*${meta.container.trim()}*, `;
      const wDateIeee = meta.date ? formatCitationDate(meta.date, "ieee") : y;
      resWeb += `${wDateIeee}. [Online]. Available: ${meta.url}.`;
      if (citationSettings.accessedDate) {
        resWeb += ` [Accessed: ${meta.accessed || getTodayIeee()}].`;
      }
      return resWeb;
  }
}

function buildApaCitation(meta) {
  const a = formatApaAuthors(meta.authors) || meta.container || "Author";
  const y = extractYear(meta.date) || "n.d.";
  const isWebOrMedia = ["webpage", "video", "software"].includes(meta.sourceType);
  const formattedDate = isWebOrMedia && meta.date ? formatCitationDate(meta.date, "apa") : y;
  const d = `(${formattedDate || y})`;
  const cleanTitle = (meta.title || "Untitled").trim().replace(/[,\.]+$/, "");

  let out = `${a} ${d}. `;

  switch (meta.sourceType) {
    case "academic":
      out += `${cleanTitle}. `;
      if (meta.container) out += `*${meta.container.trim()}*`;
      if (meta.pages) out += `, ${meta.pages.trim()}`;
      out += `. `;
      if (meta.doi) out += `https://doi.org/${meta.doi.trim().replace(/^https?:\/\/doi\.org\//, "")}`;
      else if (meta.url) out += meta.url;
      break;

    case "conference":
      out += `${cleanTitle}. In *${meta.container || "Conference Proceedings"}*`;
      if (meta.pages) out += ` (${meta.pages.trim()})`;
      out += `. `;
      if (meta.doi) out += `https://doi.org/${meta.doi.trim().replace(/^https?:\/\/doi\.org\//, "")}`;
      else if (meta.url) out += meta.url;
      break;

    case "book":
      out += `*${cleanTitle}*`;
      if (meta.pages && meta.pages.toLowerCase().includes("ed")) out += ` (${meta.pages.trim()})`;
      out += `. `;
      if (meta.container) out += `${meta.container.trim()}. `;
      if (meta.doi) out += `https://doi.org/${meta.doi.trim().replace(/^https?:\/\/doi\.org\//, "")}`;
      else if (meta.url) out += meta.url;
      break;

    case "pdf":
      out += `*${cleanTitle}*`;
      if (meta.pages) {
        const pTrim = meta.pages.trim();
        out += ` (${/^(?:report|rep|no|white\s*paper)\b/i.test(pTrim) ? pTrim : "Report No. " + pTrim})`;
      } else {
        out += ` [PDF]`;
      }
      out += `. `;
      if (meta.container) out += `${meta.container.trim()}. `;
      if (meta.doi) {
        out += `https://doi.org/${meta.doi.trim().replace(/^https?:\/\/doi\.org\//, "")}`;
      } else if (meta.url && !meta.url.startsWith("file://")) {
        out += meta.url;
        if (citationSettings.accessedDate) {
          out += ` (Retrieved ${meta.accessed || getTodayApa()}, from ${meta.url})`;
        }
      }
      break;

    case "software":
      out += `*${cleanTitle}*`;
      if (meta.pages) out += ` (${meta.pages.trim()})`;
      out += ` [Computer software]. `;
      if (meta.container) out += `${meta.container.trim()}. `;
      if (meta.url) out += meta.url;
      break;

    case "video":
      out += `*${cleanTitle}* [Video]. `;
      if (meta.container) out += `${meta.container.trim()}. `;
      if (meta.url) out += meta.url;
      break;

    default:
      out += `*${cleanTitle}*. `;
      if (meta.container) out += `${meta.container.trim()}. `;
      out += meta.url;
      if (citationSettings.accessedDate) {
        out += ` (Retrieved ${meta.accessed || getTodayApa()}, from ${meta.url})`;
      }
      break;
  }
  return out.trim();
}

function buildHarvardCitation(meta) {
  const a = formatHarvardAuthors(meta.authors) || meta.container || "Author";
  const y = extractYear(meta.date) || "n.d.";
  const cleanTitle = (meta.title || "Untitled").trim().replace(/[,\.]+$/, "");

  let out = `${a} (${y}) `;

  switch (meta.sourceType) {
    case "academic":
      out += `'${cleanTitle}', *${meta.container || "Journal"}*`;
      if (meta.pages) out += `, ${meta.pages.trim()}`;
      out += `.`;
      if (meta.doi) out += ` Available at: https://doi.org/${meta.doi.trim().replace(/^https?:\/\/doi\.org\//, "")}.`;
      break;

    case "conference":
      out += `'${cleanTitle}', in *${meta.container || "Conference Proceedings"}*`;
      if (meta.pages) out += `, pp. ${meta.pages.trim()}`;
      out += `.`;
      break;

    case "book":
      out += `*${cleanTitle}*. `;
      if (meta.container) out += `${meta.container.trim()}.`;
      break;

    case "pdf":
      out += `*${cleanTitle}*`;
      if (meta.pages) out += ` (${meta.pages.trim()})`;
      out += ` [PDF]. `;
      if (meta.container) out += `${meta.container.trim()}. `;
      if (meta.doi) {
        out += `Available at: https://doi.org/${meta.doi.trim().replace(/^https?:\/\/doi\.org\//, "")}.`;
      } else if (meta.url && !meta.url.startsWith("file://")) {
        out += `Available at: ${meta.url}`;
        if (citationSettings.accessedDate) out += ` (Accessed: ${meta.accessed || getTodayIeee()})`;
        out += `.`;
      }
      break;

    case "software":
      out += `*${cleanTitle}* [Computer program]. Available at: ${meta.url}`;
      if (citationSettings.accessedDate) out += ` (Accessed: ${meta.accessed || getTodayIeee()})`;
      out += `.`;
      break;

    case "video":
      out += `'${cleanTitle}' [Online video]. Available at: ${meta.url}`;
      if (citationSettings.accessedDate) out += ` (Accessed: ${meta.accessed || getTodayIeee()})`;
      out += `.`;
      break;

    default:
      out += `*${cleanTitle}*, ${meta.container || "Website"}. Available at: ${meta.url}`;
      if (citationSettings.accessedDate) out += ` (Accessed: ${meta.accessed || getTodayIeee()})`;
      out += `.`;
      break;
  }
  return out.trim();
}

function buildMlaCitation(meta) {
  const a = formatMlaAuthors(meta.authors);
  const cleanTitle = (meta.title || "Untitled").trim().replace(/[,\.]+$/, "");
  const y = extractYear(meta.date);

  let out = a ? (a.endsWith(".") ? `${a} ` : `${a}. `) : "";

  switch (meta.sourceType) {
    case "academic":
      out += `"${cleanTitle}." `;
      if (meta.container) out += `*${meta.container.trim()}*, `;
      if (meta.pages) out += `${meta.pages.trim()}, `;
      out += `${y}. `;
      if (meta.doi) out += `doi:${meta.doi.trim().replace(/^https?:\/\/doi\.org\//, "")}.`;
      else if (meta.url) out += `${meta.url}.`;
      break;

    case "conference":
      out += `"${cleanTitle}." *${meta.container || "Conference Proceedings"}*, ${y}`;
      if (meta.pages) out += `, pp. ${meta.pages.trim()}`;
      out += `.`;
      break;

    case "book":
      out += `*${cleanTitle}*. `;
      if (meta.container) out += `${meta.container.trim()}, `;
      out += `${y}.`;
      break;

    case "pdf":
      out += `*${cleanTitle}*. `;
      if (meta.pages) out += `${meta.pages.trim()}, `;
      if (meta.container) out += `${meta.container.trim()}, `;
      out += `${y}, `;
      if (meta.doi) {
        out += `doi:${meta.doi.trim().replace(/^https?:\/\/doi\.org\//, "")}.`;
      } else if (meta.url && !meta.url.startsWith("file://")) {
        out += `${meta.url}.`;
        if (citationSettings.accessedDate) {
          out += ` Accessed ${meta.accessed || getTodayIeee()}.`;
        }
      } else {
        out = out.replace(/,\s*$/, ".");
      }
      break;

    case "video":
      const vDateMla = meta.date ? formatCitationDate(meta.date, "mla") : y;
      return `${out}"${cleanTitle}." *${meta.container || "YouTube"}*, ${vDateMla}, ${meta.url}.`;

    default:
      out += `"${cleanTitle}." `;
      if (meta.container) out += `*${meta.container.trim()}*, `;
      const wDateMla = meta.date ? formatCitationDate(meta.date, "mla") : y;
      out += `${wDateMla}, `;
      out += `${meta.url}.`;
      if (citationSettings.accessedDate) {
        out += ` Accessed ${meta.accessed || getTodayIeee()}.`;
      }
      break;
  }
  return out.trim();
}

function buildBibtexCitation(meta) {
  const key = generateBibtexKey(meta.authors, meta.date, meta.title);
  const y = extractYear(meta.date);
  const authorField = formatBibtexAuthors(meta.authors);

  let type = "misc";
  switch (meta.sourceType) {
    case "academic": type = "article"; break;
    case "conference": type = "inproceedings"; break;
    case "book": type = "book"; break;
    case "pdf": type = "techreport"; break;
    case "software": type = "software"; break;
    default: type = "misc"; break;
  }

  let lines = [`@${type}{${key},`];
  if (authorField) {
    lines.push(`  author = {${authorField}},`);
  }
  lines.push(`  title = {{${meta.title || "Untitled"}}},`);

  if (type === "article") {
    if (meta.container) lines.push(`  journal = {${meta.container}},`);
    if (meta.pages) lines.push(`  pages = {${meta.pages}},`);
  } else if (type === "inproceedings") {
    if (meta.container) lines.push(`  booktitle = {${meta.container}},`);
    if (meta.pages) lines.push(`  pages = {${meta.pages}},`);
  } else if (type === "book") {
    if (meta.container) lines.push(`  publisher = {${meta.container}},`);
  } else if (type === "techreport") {
    if (meta.container) lines.push(`  institution = {${meta.container}},`);
    if (meta.pages) lines.push(`  number = {${meta.pages}},`);
    lines.push(`  type = {Technical Report},`);
  } else if (type === "software") {
    if (meta.pages) lines.push(`  version = {${meta.pages}},`);
  } else {
    if (meta.container) lines.push(`  howpublished = {${meta.container}},`);
  }

  const parsedDate = parseComprehensiveDate(meta.date);
  const mYmd = (parsedDate || meta.date || "").match(/^(?:19\d\d|20\d\d)-(\d{1,2})/);
  if (mYmd) {
    const bibMonths = ["", "jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
    const mIdx = parseInt(mYmd[1], 10);
    if (mIdx >= 1 && mIdx <= 12) {
      lines.push(`  month = {${bibMonths[mIdx]}},`);
    }
  }

  lines.push(`  year = {${y}},`);
  if (meta.doi) lines.push(`  doi = {${meta.doi.trim().replace(/^https?:\/\/doi\.org\//, "")}},`);
  if (meta.url && !meta.url.startsWith("file://")) {
    lines.push(`  url = {${meta.url}}`);
  }
  // Note: container is already included as 'institution' for local files via line 1251
  lines.push(`}`);
  return lines.join("\n");
}

function buildIntextCitation(meta) {
  const authors = parseAuthorsList(meta.authors);
  const y = extractYear(meta.date);

  let ieeeAuthorInText = "";
  let apaParenthetical = "";
  let apaNarrative = "";

  if (authors.length === 0) {
    const site = meta.container || "Tác giả";
    ieeeAuthorInText = site;
    apaParenthetical = `(${site}, ${y})`;
    apaNarrative = `${site} (${y})`;
  } else if (authors.length === 1) {
    const a1 = authors[0].isOrg ? authors[0].last : authors[0].last;
    ieeeAuthorInText = a1;
    apaParenthetical = `(${a1}, ${y})`;
    apaNarrative = `${a1} (${y})`;
  } else if (authors.length === 2) {
    const a1 = authors[0].last;
    const a2 = authors[1].last;
    ieeeAuthorInText = `${a1} and ${a2}`;
    apaParenthetical = `(${a1} & ${a2}, ${y})`;
    apaNarrative = `${a1} và ${a2} (${y})`;
  } else {
    const a1 = authors[0].last;
    ieeeAuthorInText = `${a1} et al.`;
    apaParenthetical = `(${a1} et al., ${y})`;
    apaNarrative = `${a1} et al. (${y})`;
  }

  const lang = window.i18n ? window.i18n.getLanguage() : "vi";
  if (lang === "en") {
    return `IEEE STANDARD (Numbered [1]):
• Direct Citation: "...as previously reported in [1]."
• Narrative Citation: "According to ${ieeeAuthorInText} [1], this approach..."
• Multiple Sources: "...consistent findings were documented in [1], [2], [4]–[6]."

───────────────────────────────────
APA 7th EDITION (Author-Date):
• Parenthetical: "...demonstrating the viability of the approach ${apaParenthetical}."
• Narrative: "${apaNarrative} demonstrated that the algorithm achieves high accuracy."

───────────────────────────────────
Multiple Authors Rule:
• 1 author: (${a1}, ${y})
• 2 authors: (${a1} & ${authors[1]?.last || "Author"}, ${y})
• ≥ 3 authors: (${a1} et al., ${y}) used from the very first citation.`;
  } else if (lang === "zh") {
    return `IEEE 国际标准（序号引用 [1]）：
• 句末直接引用：“...正如文献 [1] 中所阐明的那样。”
• 叙述性文内引用：“根据 ${ieeeAuthorInText} [1] 的研究，该模型表现优异...”
• 多个连续文献引用：“...在文献 [1], [2], [4]–[6] 中均得出了类似结论。”

───────────────────────────────────
APA 第 7 版标准（著者-出版年）：
• 括号内引用（Parenthetical）：“...证明了该算法的有效性 ${apaParenthetical}。”
• 叙述性引用（Narrative）：“${apaNarrative} 指出该深度神经网络达到了极高的识别精度。”

───────────────────────────────────
多著者引用规范：
• 1 位作者：(${a1}, ${y})
• 2 位作者：(${a1} & ${authors[1]?.last || "李四"}, ${y})
• ≥ 3 位作者：(${a1} et al., ${y}) 首次提及即可直接使用。`;
  } else if (lang === "ru") {
    return `СТАНДАРТ IEEE (Нумерация [1]):
• Прямая ссылка: «...как было показано в исследовании [1].»
• В повествовании: «Согласно исследованию ${ieeeAuthorInText} [1], данная модель...»
• Несколько источников: «...аналогичные результаты приведены в [1], [2], [4]–[6].»

───────────────────────────────────
СТАНДАРТ APA 7-е издание (Автор-Год):
• В скобках (Parenthetical): «...что подтверждает эффективность предложенного метода ${apaParenthetical}.»
• В повествовании (Narrative): «${apaNarrative} установили высокую точность алгоритма.»

───────────────────────────────────
Правила для нескольких авторов:
• 1 автор: (${a1}, ${y})
• 2 автора: (${a1} & ${authors[1]?.last || "Иванов"}, ${y})
• ≥ 3 авторов: (${a1} et al., ${y}) используется с первого упоминания.`;
  } else if (lang === "ja") {
    return `IEEE 国際標準 (番号順 [1]):
• 文末直接引用: 「...文献 [1] で報告されているように。」
• 本文記述 (Narrative): 「${ieeeAuthorInText} [1] の研究によれば、この手法は...」
• 複数文献の連続引用: 「...同様の結果が [1], [2], [4]–[6] でも報告されている。」

───────────────────────────────────
APA 第7版標準 (著者-刊行年):
• 括弧内引用 (Parenthetical): 「...本手法の有効性が示された ${apaParenthetical}。」
• 本文記述 (Narrative): 「${apaNarrative} は、提案アルゴリズムが高い精度を達成することを実証した。」

───────────────────────────────────
複数著者の表記規則:
• 著者1名: (${a1}, ${y})
• 著者2名: (${a1} & ${authors[1]?.last || "佐藤"}, ${y})
• 著者3名以上: (${a1} et al., ${y}) 初回言及時から即座に使用。`;
  }

  return `CHUẨN IEEE (Số thứ tự [1]):
• Cuối câu (Trực tiếp): "...như đã được công bố trong tài liệu [1]."
• Mạch văn (Narrative): "Theo nghiên cứu của ${ieeeAuthorInText} [1], mô hình này..."
• Nhiều nguồn liên tiếp: "...các kết quả tương tự cũng được tìm thấy trong [1], [2], [4]–[6]."

───────────────────────────────────
CHUẨN APA 7th (Tác giả - Năm):
• Trong ngoặc (Parenthetical): "...đã chứng minh được tính khả thi của giải pháp ${apaParenthetical}."
• Tường thuật (Narrative): "${apaNarrative} đã chỉ ra rằng thuật toán đạt độ chính xác cao."

───────────────────────────────────
Quy tắc nhiều tác giả:
• 1 tác giả: (${a1}, ${y})
• 2 tác giả: (${a1} & ${authors[1]?.last || "Trần"}, ${y})
• ≥ 3 tác giả: (${a1} et al., ${y}) dùng ngay từ lần trích đầu tiên.`;
}

// ----------------------------------------------------------------------------
// UI Updates
// ----------------------------------------------------------------------------
function updateCitationDisplay() {
  const box = document.getElementById("citation-text");
  const labelEl = document.getElementById("citation-box-style-label");
  if (!box) return;

  box.classList.remove("bibtex-code");

  const lang = window.i18n ? window.i18n.getLanguage() : "vi";
  const localizedStyleLabels = {
    vi: {
      ieee: "Định dạng: IEEE (Kỹ thuật & CNTT)",
      apa: "Định dạng: APA 7th (Khoa học & Đồ án)",
      harvard: "Định dạng: Harvard (Kinh tế & Quản trị)",
      bibtex: "Định dạng: BibTeX (LaTeX / Overleaf)",
      mla: "Định dạng: MLA 9th (Ngôn ngữ & Nhân văn)",
      intext: "Định dạng: Trích dẫn trong bài"
    },
    en: {
      ieee: "Format: IEEE (Engineering & CS)",
      apa: "Format: APA 7th (Science & Thesis)",
      harvard: "Format: Harvard (Economics & Business)",
      bibtex: "Format: BibTeX (LaTeX / Overleaf)",
      mla: "Format: MLA 9th (Humanities & Arts)",
      intext: "Format: In-Text Citation"
    },
    zh: {
      ieee: "格式：IEEE (工程与计算机)",
      apa: "格式：APA 第7版 (学术论文)",
      harvard: "格式：Harvard (经管学术)",
      bibtex: "格式：BibTeX (LaTeX / Overleaf)",
      mla: "格式：MLA 第9版 (人文社科)",
      intext: "格式：正文内引用"
    },
    ru: {
      ieee: "Формат: IEEE (Техника и IT)",
      apa: "Формат: APA 7-е изд. (Наука и статьи)",
      harvard: "Формат: Harvard (Экономика и бизнес)",
      bibtex: "Формат: BibTeX (LaTeX / Overleaf)",
      mla: "Формат: MLA 9-е изд. (Гуманитарные науки)",
      intext: "Формат: Внутритекстовая ссылка"
    },
    ja: {
      ieee: "形式: IEEE (工学・情報科学)",
      apa: "形式: APA 第7版 (心理学・社会科学)",
      harvard: "形式: Harvard (経済・ビジネス)",
      bibtex: "形式: BibTeX (LaTeX / Overleaf)",
      mla: "形式: MLA 第9版 (人文学・文学)",
      intext: "形式: 本文内引用"
    }
  };
  const activeStyleDict = localizedStyleLabels[lang] || localizedStyleLabels.en;
  if (labelEl) {
    labelEl.textContent = activeStyleDict[currentCitationTab] || activeStyleDict.ieee;
  }

  switch (currentCitationTab) {
    case "ieee":
      box.textContent = buildIeeeCitation(currentMeta);
      break;
    case "apa":
      box.textContent = buildApaCitation(currentMeta);
      break;
    case "harvard":
      box.textContent = buildHarvardCitation(currentMeta);
      break;
    case "mla":
      box.textContent = buildMlaCitation(currentMeta);
      break;
    case "bibtex":
      box.classList.add("bibtex-code");
      box.textContent = buildBibtexCitation(currentMeta);
      break;
    case "intext":
      box.textContent = buildIntextCitation(currentMeta);
      break;
    default:
      box.textContent = buildIeeeCitation(currentMeta);
      break;
  }
}

function getSourceBadgeLabel(sourceType, container) {
  const lang = window.i18n ? window.i18n.getLanguage() : "vi";
  const dict = {
    vi: {
      webpage: "Trang Web",
      web: "Trang Web",
      academic: "Học thuật",
      conference: "Hội thảo",
      pdf: "Tài liệu PDF",
      software: "Phần mềm",
      video: "Video",
      youtube: "YouTube",
      book: "Sách / Luận văn",
      news: "Báo chí"
    },
    en: {
      webpage: "Web Page",
      web: "Web Page",
      academic: "Academic",
      conference: "Conference",
      pdf: "PDF / Report",
      software: "Software",
      video: "Video",
      youtube: "YouTube",
      book: "Book / Thesis",
      news: "News"
    },
    zh: {
      webpage: "网页",
      web: "网页",
      academic: "学术论文",
      conference: "学术会议",
      pdf: "PDF 文档",
      software: "开源软件",
      video: "在线视频",
      youtube: "YouTube",
      book: "图书/论文",
      news: "新闻报道"
    },
    ru: {
      webpage: "Веб-страница",
      web: "Веб-страница",
      academic: "Научная статья",
      conference: "Конференция",
      pdf: "PDF / Отчёт",
      software: "ПО / Код",
      video: "Онлайн-видео",
      youtube: "YouTube",
      book: "Книга / Дис.",
      news: "Новости"
    },
    ja: {
      webpage: "Webページ",
      web: "Webページ",
      academic: "学術論文",
      conference: "学会・会議",
      pdf: "PDF / 報告書",
      software: "ソフトウェア",
      video: "オンライン動画",
      youtube: "YouTube",
      book: "書籍・論文",
      news: "ニュース"
    }
  };
  const lDict = dict[lang] || dict.en;
  let key = (sourceType || "webpage").toLowerCase();
  if (key.includes("web")) key = "webpage";
  else if (key.includes("acad") || key.includes("journal")) key = "academic";
  else if (key.includes("conf")) key = "conference";
  else if (key.includes("pdf")) key = "pdf";
  else if (key.includes("soft") || key.includes("git")) key = "software";
  else if (key.includes("youtu")) key = "youtube";
  else if (key.includes("vid")) key = "video";
  else if (key.includes("book") || key.includes("thesis")) key = "book";
  else if (key.includes("news")) key = "news";
  return lDict[key] || lDict.webpage || "Web";
}

function updateSourceBadges(type, container) {
  const label = getSourceBadgeLabel(type, container);
  const headerBadge = document.getElementById("source-badge");
  if (headerBadge) {
    headerBadge.textContent = label;
    headerBadge.title = `Source: ${container || type || "Web"}`;
  }
  const boxBadge = document.getElementById("citation-box-source-badge");
  if (boxBadge) {
    boxBadge.textContent = label;
    boxBadge.title = `Source: ${container || type || "Web"}`;
  }
}

function syncInputs() {
  const elSourceType = document.getElementById("f-source-type");
  const elAuthors = document.getElementById("f-authors");
  const elTitle = document.getElementById("f-title");
  const elDate = document.getElementById("f-date");
  const elContainer = document.getElementById("f-container");
  const elDoi = document.getElementById("f-doi");
  const elPages = document.getElementById("f-pages");
  const elUrl = document.getElementById("f-url");

  if (elSourceType) elSourceType.value = currentMeta.sourceType || "webpage";
  if (elAuthors) elAuthors.value = currentMeta.authors || "";
  if (elTitle) elTitle.value = currentMeta.title || "";
  if (elDate) elDate.value = currentMeta.date || "";
  if (elContainer) elContainer.value = currentMeta.container || "";
  if (elDoi) elDoi.value = currentMeta.doi || "";
  if (elPages) elPages.value = currentMeta.pages || "";
  if (elUrl) elUrl.value = currentMeta.url || "";

  updateSourceBadges(currentMeta.sourceType, currentMeta.container);

  // Contextual placeholders based on source type
  if (currentMeta.sourceType === "pdf") {
    if (elContainer) elContainer.placeholder = "Tổ chức / Viện nghiên cứu (Vd: OpenAI, WHO, Viện Hàn lâm, Bộ TT&TT...)";
    if (elPages) elPages.placeholder = "Mã báo cáo / Số trang (Vd: Tech. Rep. 102, hoặc pp. 1-45)";
  } else if (currentMeta.sourceType === "academic") {
    if (elContainer) elContainer.placeholder = "Tên tạp chí (Vd: Tạp chí KH&CN ĐH Đà Nẵng, IEEE, Nature...)";
    if (elPages) elPages.placeholder = "Trang (Vd: pp. 127-131), Tập / Số";
  } else if (currentMeta.sourceType === "software") {
    if (elContainer) elContainer.placeholder = "Kho lưu trữ (Vd: GitHub, GitLab)";
    if (elPages) elPages.placeholder = "Phiên bản (Vd: v1.0.0)";
  } else if (currentMeta.sourceType === "video") {
    if (elContainer) elContainer.placeholder = "Kênh / Nền tảng (Vd: YouTube, TED Talks)";
    if (elPages) elPages.placeholder = "Thời lượng hoặc Timestamp (Vd: 14:20)";
  } else {
    if (elContainer) elContainer.placeholder = "Tên website / Nhà xuất bản...";
    if (elPages) elPages.placeholder = "Trang (pp.) / Số báo / Phiên bản";
  }
}

function syncMetaFromInputs() {
  currentMeta.sourceType = document.getElementById("f-source-type").value;
  currentMeta.authors = document.getElementById("f-authors").value;
  currentMeta.title = document.getElementById("f-title").value;
  const rawDate = document.getElementById("f-date").value;
  currentMeta.date = parseComprehensiveDate(rawDate) || rawDate;
  currentMeta.container = document.getElementById("f-container").value;
  currentMeta.doi = document.getElementById("f-doi").value;
  currentMeta.pages = document.getElementById("f-pages").value;
  currentMeta.url = document.getElementById("f-url").value;

  updateSourceBadges(currentMeta.sourceType, currentMeta.container);

  const elContainer = document.getElementById("f-container");
  const elPages = document.getElementById("f-pages");
  if (currentMeta.sourceType === "pdf") {
    if (elContainer) elContainer.placeholder = "Tổ chức / Viện nghiên cứu (Vd: OpenAI, WHO, Viện Hàn lâm, Bộ TT&TT...)";
    if (elPages) elPages.placeholder = "Mã báo cáo / Số trang (Vd: Tech. Rep. 102, hoặc pp. 1-45)";
  }

  updateCitationDisplay();
  saveDraft();
}

function showToast(msgKey, type = 'success', variables = []) {
  const t = document.getElementById('notify');
  if (!t) return;
  
  // Reset classes
  t.className = 'notify';
  if (type) t.classList.add('notify-' + type);
  
  // Get translation from i18n
  const currentLanguage = (window.i18n && typeof window.i18n.getCurrentLanguage === "function") ? window.i18n.getCurrentLanguage() : "vi";
  let msg = (typeof I18N_DATA !== "undefined" && I18N_DATA && I18N_DATA[currentLanguage] && I18N_DATA[currentLanguage][msgKey]) ? I18N_DATA[currentLanguage][msgKey] : msgKey;
  
  // Replace variables like {0}, {1} if any
  variables.forEach((val, i) => {
    msg = msg.replace('{' + i + '}', val);
  });
  
  t.textContent = msg;
  t.classList.add('show');
  
  setTimeout(() => {
    t.classList.remove('show');
  }, 3000);
}


// ----------------------------------------------------------------------------
// Draft Auto-Save per URL (Never lose edits!)
// ----------------------------------------------------------------------------
function getDraftKey() {
  if (!currentTabUrl) return "super_draft_empty";
  try {
    const u = new URL(currentTabUrl);
    if (u.hostname.includes("youtube.com") || u.hostname.includes("youtu.be")) {
      const v = u.searchParams.get("v");
      if (v) return `super_draft_yt_${v}`;
    }
  } catch (e) {}
  return "super_draft_" + (currentTabUrl || "").split("#")[0];
}

function saveDraft() {
  if (!currentTabUrl) return;
  if (currentTabObj && currentTabObj.incognito) return; // Mozilla AMO Policy 6.3: Private Browsing sessions must not be stored
  storSet({ [getDraftKey()]: currentMeta });
}

function checkDraft(fresh) {
  if (!currentTabUrl) return;
  // Clean up any old obsolete global key for youtube
  storRemove("super_draft_https://www.youtube.com/watch");
  
  const key = getDraftKey();
  storGet(key, (res) => {
    const d = res && res[key];
    if (d && d.title && (d.authors !== fresh.authors || d.title !== fresh.title || d.date !== fresh.date)) {
      currentMeta = { ...d };
      document.getElementById("draft-banner").style.display = "flex";
      syncInputs();
      updateCitationDisplay();
    }
  });
}

// ----------------------------------------------------------------------------
// Citation Customization Settings & Bibliography Manager
// ----------------------------------------------------------------------------
// ----------------------------------------------------------------------------
// Custom Select Dropdown Synchronization (Author Style & Default Citation Style)
// ----------------------------------------------------------------------------
function syncCustomSelects() {
  // 1. Author Style dropdown sync
  const authorSel = document.getElementById("cite-pref-author-style");
  const authorLabel = document.getElementById("label-author-style");
  const authorMenu = document.getElementById("menu-author-style");
  if (authorSel && authorLabel && authorMenu) {
    const val = authorSel.value || "standard";
    const activeItem = authorMenu.querySelector(`.custom-select-item[data-value="${val}"]`);
    if (activeItem) {
      authorLabel.textContent = activeItem.textContent;
      authorMenu.querySelectorAll(".custom-select-item").forEach(it => it.classList.toggle("selected", it === activeItem));
    }
  }

  // 2. Date Style dropdown sync
  const dateSyncSel = document.getElementById("cite-pref-date-style");
  const dateSyncLabel = document.getElementById("label-date-style");
  const dateSyncMenu = document.getElementById("menu-date-style");
  if (dateSyncSel && dateSyncLabel && dateSyncMenu) {
    const val = dateSyncSel.value || "auto";
    const activeItem = dateSyncMenu.querySelector(`.custom-select-item[data-value="${val}"]`);
    if (activeItem) {
      dateSyncLabel.textContent = activeItem.textContent;
      dateSyncMenu.querySelectorAll(".custom-select-item").forEach(it => it.classList.toggle("selected", it === activeItem));
    }
  }
}

function initCustomSelects() {
  const binds = [
    { wrapId: "wrap-author-style", triggerId: "btn-author-style", menuId: "menu-author-style", selectId: "cite-pref-author-style", labelId: "label-author-style" },
    { wrapId: "wrap-date-style", triggerId: "btn-date-style", menuId: "menu-date-style", selectId: "cite-pref-date-style", labelId: "label-date-style" }
  ];

  binds.forEach(({ wrapId, triggerId, menuId, selectId, labelId }) => {
    const wrap = document.getElementById(wrapId);
    const trigger = document.getElementById(triggerId);
    const menu = document.getElementById(menuId);
    const select = document.getElementById(selectId);
    const label = document.getElementById(labelId);
    if (!wrap || !trigger || !menu || !select || !label) return;

    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = wrap.classList.contains("open");
      document.querySelectorAll(".custom-dropdown-wrap.open, .custom-select-wrap.open").forEach(el => el.classList.remove("open"));
      if (!isOpen) wrap.classList.add("open");
    });

    menu.querySelectorAll(".custom-select-item").forEach(item => {
      item.addEventListener("click", (e) => {
        e.stopPropagation();
        const val = item.dataset.value;
        if (val) {
          select.value = val;
          label.textContent = item.textContent;
          menu.querySelectorAll(".custom-select-item").forEach(it => it.classList.toggle("selected", it === item));
          wrap.classList.remove("open");
          select.dispatchEvent(new Event("change", { bubbles: true }));
        }
      });
    });
  });

  // Global close listener for all custom dropdowns & custom selects
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".custom-dropdown-wrap") && !e.target.closest(".custom-select-wrap")) {
      document.querySelectorAll(".custom-dropdown-wrap.open, .custom-select-wrap.open").forEach(el => el.classList.remove("open"));
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      document.querySelectorAll(".custom-dropdown-wrap.open, .custom-select-wrap.open").forEach(el => el.classList.remove("open"));
    }
  });

  syncCustomSelects();
}

function loadCitationSettings() {
  storGet("super_citation_settings", (res) => {
    if (res && res.super_citation_settings) {
      citationSettings = { ...citationSettings, ...res.super_citation_settings };
    }
    const accCheck = document.getElementById("cite-pref-accessed");
    const noDiacriticsCheck = document.getElementById("cite-pref-remove-diacritics");
    const authorSel = document.getElementById("cite-pref-author-style");
    const dateSel = document.getElementById("cite-pref-date-style");
    const autoCopyCheck = document.getElementById("cite-pref-autocopy");

    if (accCheck) accCheck.checked = !!citationSettings.accessedDate;
    if (noDiacriticsCheck) noDiacriticsCheck.checked = !!citationSettings.removeDiacritics;
    if (authorSel) authorSel.value = citationSettings.authorStyle || "standard";
    if (dateSel) dateSel.value = citationSettings.dateStyle || "auto";
    if (autoCopyCheck) autoCopyCheck.checked = !!citationSettings.autoCopy;
    syncCustomSelects();


    updateCitationDisplay();
  });
}

function saveCitationSettings() {
  const accCheck = document.getElementById("cite-pref-accessed");
  const noDiacriticsCheck = document.getElementById("cite-pref-remove-diacritics");
  const authorSel = document.getElementById("cite-pref-author-style");
  const dateSel = document.getElementById("cite-pref-date-style");
  const autoCopyCheck = document.getElementById("cite-pref-autocopy");

  citationSettings.accessedDate = accCheck ? accCheck.checked : true;
  citationSettings.removeDiacritics = noDiacriticsCheck ? noDiacriticsCheck.checked : false;
  citationSettings.authorStyle = authorSel ? authorSel.value : "standard";
  citationSettings.dateStyle = dateSel ? dateSel.value : "auto";
  citationSettings.autoCopy = autoCopyCheck ? autoCopyCheck.checked : false;

  storSet({ super_citation_settings: citationSettings }, () => {
    const statusEl = document.getElementById("cite-settings-status");
    if (statusEl) {
      statusEl.textContent = getI18nText("pref_saved") || "✓ Đã lưu!";
      statusEl.style.color = "#38bdf8";
      setTimeout(() => {
        statusEl.textContent = getI18nText("pref_autosave") || "💾 Tự động lưu";
        statusEl.style.color = "#10b981";
      }, 1500);
    }
    updateCitationDisplay();
  });
}

function loadSavedBibliographies() {
  storGet("saved_bibliographies", (res) => {
    if (res && Array.isArray(res.saved_bibliographies)) {
      savedBibliographies = res.saved_bibliographies;
    } else {
      savedBibliographies = [];
    }
    updateBiblioBadges();
  });
}

function updateBiblioBadges() {
  const count = savedBibliographies.length;
  const badge1 = document.getElementById("biblio-count");
  const badge2 = document.getElementById("modal-biblio-count");
  if (badge1) badge1.textContent = count;
  if (badge2) badge2.textContent = count;
}

function saveCurrentToBiblio() {
  const tagVal = (document.getElementById("f-tag")?.value || "").trim();
  const notesVal = (document.getElementById("f-notes")?.value || "").trim();

  // Check if current URL or title is already saved
  const existingIdx = savedBibliographies.findIndex(x => (x.meta?.url && x.meta?.url === currentMeta.url) || (x.meta?.title && x.meta?.title === currentMeta.title));

  const newItem = {
    id: "bib_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
    meta: { ...currentMeta },
    tag: tagVal,
    notes: notesVal,
    savedAt: Date.now()
  };

  if (existingIdx !== -1) {
    savedBibliographies[existingIdx] = newItem;
    showToast("✓ Đã cập nhật mục trích dẫn trong danh mục!");
  } else {
    savedBibliographies.unshift(newItem);
    showToast(`✓ Đã lưu trích dẫn! ([${savedBibliographies.length}] mục)`);
  }

  storSet({ saved_bibliographies: savedBibliographies }, () => {
    updateBiblioBadges();
  });
}

function getFormattedCitationByStyle(meta, style, index) {
  switch (style) {
    case "ieee":
      return `[${index || 1}] ${buildIeeeCitation(meta)}`;
    case "apa":
      return buildApaCitation(meta);
    case "harvard":
      return buildHarvardCitation(meta);
    case "bibtex":
      return buildBibtexCitation(meta);
    case "mla":
      return buildMlaCitation(meta);
    case "intext":
      return buildIntextCitation(meta);
    default:
      return buildIeeeCitation(meta);
  }
}

function renderBiblioModalList() {
  const container = document.getElementById("biblio-items");
  if (!container) return;
  container.textContent = "";

  const query = (currentModalFilter || "").toLowerCase().trim();
  const filtered = savedBibliographies.filter(item => {
    if (!query) return true;
    const m = item.meta || {};
    const t = (m.title || "").toLowerCase();
    const a = (m.authors || "").toLowerCase();
    const c = (m.container || "").toLowerCase();
    const tg = (item.tag || "").toLowerCase();
    const n = (item.notes || "").toLowerCase();
    const y = (m.date || "").toLowerCase();
    return t.includes(query) || a.includes(query) || c.includes(query) || tg.includes(query) || n.includes(query) || y.includes(query);
  });

  if (filtered.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-list-box";
    const icon = document.createElement("div");
    icon.className = "empty-list-icon";
    icon.textContent = "📚";
    const title = document.createElement("div");
    title.className = "empty-list-title";
    title.textContent = query ? (window.i18n ? window.i18n.t("biblio_empty_search_title") : "Không tìm thấy tài liệu phù hợp") : (window.i18n ? window.i18n.t("biblio_empty_title") : "Chưa có trích dẫn nào được lưu");
    const sub = document.createElement("div");
    sub.className = "empty-list-sub";
    sub.textContent = query ? (window.i18n ? window.i18n.t("biblio_empty_search_sub") : "Hãy thử tìm kiếm với từ khóa khác.") : (window.i18n ? window.i18n.t("biblio_empty_sub") : "Bấm nút ➕ Lưu ở Tab 1 để thêm bài báo hoặc trang web vào danh mục.");
    empty.appendChild(icon);
    empty.appendChild(title);
    empty.appendChild(sub);
    container.appendChild(empty);
    return;
  }

  filtered.forEach((item, index) => {
    const card = document.createElement("div");
    card.className = "biblio-card";

    // Top row
    const top = document.createElement("div");
    top.className = "biblio-card-top";

    const left = document.createElement("div");
    left.style.display = "flex";
    left.style.alignItems = "center";

    const idxPill = document.createElement("span");
    idxPill.className = "biblio-index-pill";
    idxPill.textContent = `[${index + 1}]`;
    left.appendChild(idxPill);

    if (item.tag) {
      const tagPill = document.createElement("span");
      tagPill.className = "biblio-tag-pill";
      tagPill.textContent = `#${item.tag}`;
      left.appendChild(tagPill);
    }

    const typePill = document.createElement("span");
    typePill.style.fontSize = "9.5px";
    typePill.style.color = "#94a3b8";
    typePill.style.marginLeft = "6px";
    typePill.textContent = item.meta?.sourceType ? `(${item.meta.sourceType})` : "";
    left.appendChild(typePill);

    top.appendChild(left);
    card.appendChild(top);

    // Citation formatted text
    const citeTextEl = document.createElement("div");
    citeTextEl.className = "biblio-card-text";
    if (currentModalTab === "bibtex") {
      citeTextEl.className += " bibtex-code";
      citeTextEl.style.fontFamily = "ui-monospace, monospace";
      citeTextEl.style.whiteSpace = "pre-wrap";
      citeTextEl.style.color = "#a5f3fc";
    }
    const formattedCite = getFormattedCitationByStyle(item.meta, currentModalTab, index + 1);
    citeTextEl.textContent = formattedCite;
    card.appendChild(citeTextEl);

    // Notes if available
    if (item.notes) {
      const notesEl = document.createElement("div");
      notesEl.className = "biblio-card-notes";
      notesEl.textContent = `Ghi chú: ${item.notes}`;
      card.appendChild(notesEl);
    }

    // Action buttons row
    const actions = document.createElement("div");
    actions.className = "biblio-card-actions";

    const btnCopy = document.createElement("button");
    btnCopy.className = "btn btn-primary biblio-card-btn";
    btnCopy.textContent = window.i18n ? window.i18n.t("biblio_btn_copy") : "📋 Copy";
    btnCopy.addEventListener("click", () => {
      navigator.clipboard.writeText(formattedCite).then(() => {
        showToast(`✔ Đã sao chép trích dẫn [${index + 1}]!`);
      });
    });

    const btnEdit = document.createElement("button");
    btnEdit.className = "btn btn-secondary biblio-card-btn";
    btnEdit.textContent = window.i18n ? window.i18n.t("biblio_btn_edit") : "✏️ Nạp form";
    btnEdit.addEventListener("click", () => {
      currentMeta = { ...item.meta };
      const tagInput = document.getElementById("f-tag");
      const notesInput = document.getElementById("f-notes");
      if (tagInput) tagInput.value = item.tag || "";
      if (notesInput) notesInput.value = item.notes || "";
      syncInputs();
      updateCitationDisplay();
      document.getElementById("biblio-modal").style.display = "none";
      showToast("✓ Đã nạp thông tin tài liệu vào form!");
    });

    const btnDel = document.createElement("button");
    btnDel.className = "btn btn-danger biblio-card-btn";
    btnDel.textContent = window.i18n ? window.i18n.t("biblio_btn_del") : "🗑️ Xóa";
    btnDel.addEventListener("click", () => {
      const realIdx = savedBibliographies.findIndex(x => x.id === item.id);
      if (realIdx !== -1) {
        savedBibliographies.splice(realIdx, 1);
        storSet({ saved_bibliographies: savedBibliographies }, () => {
          updateBiblioBadges();
          renderBiblioModalList();
          showToast("✓ Đã xóa mục trích dẫn!");
        });
      }
    });

    actions.appendChild(btnCopy);
    actions.appendChild(btnEdit);
    actions.appendChild(btnDel);
    card.appendChild(actions);

    container.appendChild(card);
  });
}

function copyAllBiblio() {
  if (savedBibliographies.length === 0) {
    return showToast("err_001", "warning");
  }
  const allFormatted = savedBibliographies.map((item, i) => getFormattedCitationByStyle(item.meta, currentModalTab, i + 1)).join("\n\n");
  navigator.clipboard.writeText(allFormatted).then(() => {
    showToast(`✔ Đã sao chép toàn bộ (${savedBibliographies.length}) tài liệu!`);
  });
}

function exportBibAll() {
  if (savedBibliographies.length === 0) {
    return showToast("err_001", "warning");
  }
  const allBib = savedBibliographies.map(item => buildBibtexCitation(item.meta)).join("\n\n");
  const blob = new Blob([allBib], { type: "text/plain;charset=utf-8" });
  const u = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = u;
  a.download = `references_${Date.now()}.bib`;
  a.click();
  URL.revokeObjectURL(u);
  showToast("📥 Đã tải file references.bib!");
}

function exportTxtAll() {
  if (savedBibliographies.length === 0) {
    return showToast("err_001", "warning");
  }
  const allTxt = savedBibliographies.map((item, i) => getFormattedCitationByStyle(item.meta, currentModalTab, i + 1)).join("\n\n");
  const blob = new Blob([allTxt], { type: "text/plain;charset=utf-8" });
  const u = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = u;
  a.download = `references_${currentModalTab}_${Date.now()}.txt`;
  a.click();
  URL.revokeObjectURL(u);
  showToast("📄 Đã tải file references.txt!");
}

function clearAllBiblio() {
  if (savedBibliographies.length === 0) {
    return showToast("⚠️ Danh mục đã trống sẵn!");
  }
  if (confirm(`Bạn có chắc chắn muốn xóa sạch toàn bộ ${savedBibliographies.length} tài liệu trong danh mục đã lưu?`)) {
    savedBibliographies = [];
    storSet({ saved_bibliographies: [] }, () => {
      updateBiblioBadges();
      renderBiblioModalList();
      showToast("✓ Đã xóa sạch danh mục!");
    });
  }
}

// ----------------------------------------------------------------------------
// Academic Source Verifier & AI Hallucination Detector (Anti-Hallucination)
// ----------------------------------------------------------------------------
let verifiedResultData = null;

function computeStringSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  const normalize = (s) => s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, "").split(/\s+/).filter(w => w.length > 2);
  const words1 = new Set(normalize(str1));
  const words2 = new Set(normalize(str2));
  if (words1.size === 0 || words2.size === 0) return 0;

  let intersection = 0;
  words1.forEach(w => {
    if (words2.has(w)) intersection++;
  });

  const union = new Set([...words1, ...words2]).size;
  const jaccard = intersection / union;
  const dice = (2 * intersection) / (words1.size + words2.size);
  return (jaccard + dice) / 2;
}

function getVerifyI18n(key, fallback = "", params = null) {
  if (window.i18n && typeof window.i18n.t === "function") {
    const val = window.i18n.t(key, null, params);
    if (val && val !== key) return val;
  }
  let str = fallback || key;
  if (params && typeof params === "object") {
    for (const [k, v] of Object.entries(params)) {
      str = str.split("{" + k + "}").join(v !== undefined && v !== null ? v : "");
    }
  }
  return str;
}

async function verifyAcademicSource(rawText, tabMeta = null) {
  // 1. Extract potential DOI (e.g. 10.1145/... or 10.1038/...)
  const doiRegex = /\b(10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+)\b/i;
  const doiMatch = rawText.match(doiRegex);
  const detectedDoi = doiMatch ? doiMatch[1].replace(/[.,;)]+$/, "") : null;

  // 2. Extract potential arXiv ID (e.g. arXiv:1706.03762 or arxiv.org/abs/1706.03762)
  const arxivRegex = /\b(?:arxiv:\s*|arxiv\.org\/(?:abs|pdf)\/)(\d{4}\.\d{4,5}(?:v\d+)?)\b/i;
  const arxivMatch = rawText.match(arxivRegex);
  const detectedArxiv = arxivMatch ? arxivMatch[1] : null;

  // 3. Extract clean search title from citation string
  let queryTitle = rawText.trim();
  const quoteMatch = rawText.match(/["“]([^"”]{6,180})["”]/);
  if (quoteMatch) {
    queryTitle = quoteMatch[1];
  } else {
    // Strip leading [1], (1), etc.
    queryTitle = queryTitle.replace(/^\[\d+\]\s*/, "").replace(/^\(\d+\)\s*/, "");
    if (detectedDoi) queryTitle = queryTitle.replace(detectedDoi, "");
    queryTitle = queryTitle.replace(/https?:\/\/\S+/g, "");
    // If APA/Harvard format: Author (Year). Title...
    const apaMatch = queryTitle.match(/\((?:19|20)\d{2}[a-z]?\)\.\s*([^.]{8,180})/i);
    if (apaMatch) {
      queryTitle = apaMatch[1];
    } else {
      const parts = queryTitle.split(/[.;\n]/).map(p => p.trim()).filter(p => p.length > 5);
      if (parts.length > 1) {
        queryTitle = parts.reduce((a, b) => b.length > a.length ? b : a, parts[0]);
      }
      if (queryTitle.length < 5 && rawText.length >= 5) {
        queryTitle = rawText.slice(0, 120).trim();
      }
    }
  }
  // Sanitize queryTitle for API: remove special chars, collapse whitespace, limit length
  const sanitizedQuery = queryTitle.replace(/[<>"'{}|\\^`\[\]]/g, " ").replace(/\s+/g, " ").trim().slice(0, 100);

  // --- STRATEGY 0: Live Web / Video / Academic Portal Direct Verification ---
  const urlRegex = /\bhttps?:\/\/[^\s"'<>\)]+/i;
  const urlMatch = rawText.match(urlRegex);
  const detectedUrl = urlMatch ? urlMatch[0].replace(/[.,;)]+$/, "") : null;

  // --- STRATEGY 0X: Fast-path when called from "Dùng trang hiện tại" button ---
  // If tabMeta is passed, we already have the live page data; no CORS fetch needed.
  if (tabMeta && tabMeta.url) {
    const liveUrl = tabMeta.url || "";
    const liveTitle = tabMeta.title || queryTitle;
    const liveAuthors = typeof tabMeta.authors === "string" ? tabMeta.authors : (Array.isArray(tabMeta.authors) ? tabMeta.authors.join(", ") : "");
    const liveDate = tabMeta.date || "";
    const liveContainer = tabMeta.container || "";
    const liveDoi = tabMeta.doi || "";

    // 0X-A: YouTube via oEmbed (always most accurate for YT videos)
    if (liveUrl.includes("youtube.com") || liveUrl.includes("youtu.be")) {
      try {
        const ytRes = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(liveUrl)}&format=json`, { signal: AbortSignal.timeout(7000) });
        if (ytRes.ok) {
          const ytData = await ytRes.json();
          return {
            status: "VERIFIED",
            confidence: 100,
            isReal: true,
            title: ytData.title || liveTitle,
            authors: ytData.author_name || liveAuthors || getVerifyI18n("verify_author_yt_channel", "Kênh YouTube"),
            year: liveDate ? liveDate.slice(0, 4) : "",
            venue: "YouTube",
            doi: liveUrl,
            realUrl: liveUrl,
            pdfUrl: null,
            reasonKey: "verify_reason_yt_api",
            reasonParams: { channel: ytData.author_name || "YouTube" },
            reason: getVerifyI18n("verify_reason_yt_api", `Video YouTube có thật, xác thực thành công qua API chính thức YouTube. Kênh: ${ytData.author_name || "YouTube"}.`, { channel: ytData.author_name || "YouTube" })
          };
        }
      } catch (e) {
        console.warn("YouTube oEmbed fast-path error:", e);
      }
      // Fallback: use existing meta
      return {
        status: "VERIFIED",
        confidence: 95,
        isReal: true,
        title: liveTitle,
        authors: liveAuthors || "Kênh YouTube",
        year: liveDate ? liveDate.slice(0, 4) : "",
        venue: "YouTube",
        doi: liveUrl,
        realUrl: liveUrl,
        pdfUrl: null,
        reasonKey: "verify_reason_yt_live",
        reasonParams: { url: liveUrl },
        reason: getVerifyI18n("verify_reason_yt_live", `Video YouTube đang mở trực tiếp trên trình duyệt của bạn tại: ${liveUrl}`, { url: liveUrl })
      };
    }

    // 0X-B: DOI-registered academic paper
    if (liveDoi) {
      try {
        const doiRes = await fetch(`https://doi.org/${encodeURIComponent(liveDoi)}`, {
          headers: { "Accept": "application/vnd.citationstyles.csl+json" },
          signal: AbortSignal.timeout(7000)
        });
        if (doiRes.ok) {
          const data = await doiRes.json();
          const verifiedTitle = data.title || liveTitle;
          const authors = (data.author || []).map(a => `${a.given ? a.given + " " : ""}${a.family || a.name || ""}`).filter(Boolean).join(", ");
          const year = data.issued?.["date-parts"]?.[0]?.[0] || data.created?.["date-parts"]?.[0]?.[0] || "";
          const venue = data["container-title"] || data.publisher || liveContainer;
          const realUrl = data.URL || `https://doi.org/${liveDoi}`;
          return {
            status: "VERIFIED",
            confidence: 100,
            isReal: true,
            title: verifiedTitle,
            authors: authors || liveAuthors || getVerifyI18n("verify_author_multiple", "Nhiều tác giả"),
            year: year ? String(year) : "",
            venue: venue || null, // Will be translated at render time
            doi: liveDoi,
            realUrl,
            pdfUrl: null,
            reasonKey: "verify_reason_doi_fast",
            reasonParams: {},
            reason: getVerifyI18n("verify_reason_doi_fast", "Mã DOI đã được đăng ký chính thức trên International DOI Foundation. Bài báo học thuật có thật 100%.")
          };
        }
      } catch (e) {
        console.warn("DOI fast-path error:", e);
      }
    }

    // 0X-C: For news/blog/general websites — instant verify from live tab (no CORS fetch)
    let domainName = "";
    try { domainName = new URL(liveUrl).hostname.replace(/^www\./, ""); } catch (_) { domainName = liveUrl; }

    const year = liveDate ? (liveDate.match(/\b(19\d\d|20\d\d)\b/) || [""])[0] : "";
    return {
      status: "VERIFIED",
      confidence: 96,
      isReal: true,
      title: liveTitle,
      authors: liveAuthors || domainName,
      year,
      venue: liveContainer || domainName,
      doi: "",
      realUrl: liveUrl,
      pdfUrl: null,
      reasonKey: "verify_reason_web",
      reasonParams: { domain: domainName },
      reason: getVerifyI18n("verify_reason_web", `Nguồn này đang được mở trực tiếp trên trình duyệt của bạn và được xác thực là có thật (tên miền: ${domainName}). Đây là trang web/báo chí — không có trong CSDL học thuật Crossref/OpenAlex vì không phải ấn phẩm khoa học.`, { domain: domainName })
    };
  }

  // Strategy 0A: Official YouTube oEmbed Verification (from manual URL input)
  if (detectedUrl && (detectedUrl.includes("youtube.com") || detectedUrl.includes("youtu.be"))) {
    try {
      const ytRes = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(detectedUrl)}&format=json`, { signal: AbortSignal.timeout(7000) });
      if (ytRes.ok) {
        const ytData = await ytRes.json();
        return {
          status: "VERIFIED",
          confidence: 100,
          isReal: true,
          title: ytData.title || queryTitle,
          authors: ytData.author_name || getVerifyI18n("verify_author_yt_channel", "Kênh YouTube"),
          year: "",
          venue: "YouTube",
          doi: detectedUrl,
          realUrl: detectedUrl,
          pdfUrl: null,
          reasonKey: "verify_reason_yt_manual",
          reasonParams: { channel: ytData.author_name || "YouTube" },
          reason: getVerifyI18n("verify_reason_yt_manual", `Nguồn video YouTube có thật 100%! Đã xác thực thành công từ máy chủ YouTube (Kênh chính thức: ${ytData.author_name || "YouTube"}).`, { channel: ytData.author_name || "YouTube" })
        };
      }
    } catch (e) {
      console.warn("YouTube oEmbed verification error:", e);
    }
  }

  if (detectedUrl) {
    try {
      const pageRes = await fetch(detectedUrl, { mode: "cors", signal: AbortSignal.timeout(6000) });
      if (pageRes.ok) {
        const html = await pageRes.text();
        const doc = new DOMParser().parseFromString(html, "text/html");

        const getMeta = (...names) => {
          for (const n of names) {
            const el = doc.querySelector(`meta[name="${n}" i], meta[property="${n}" i]`);
            if (el && el.getAttribute("content")) return el.getAttribute("content").trim();
          }
          return "";
        };

        const pageTitleMeta = getMeta(
          "citation_title",
          "DC.Title",
          "DC.title",
          "og:title",
          "twitter:title"
        ) || (doc.title ? doc.title.replace(/\s*[|\-–—].*$/, "").trim() : "");

        const pageAuthors = Array.from(doc.querySelectorAll('meta[name="citation_author" i], meta[name="DC.Creator.PersonalName" i], meta[name="DC.Creator" i]'))
          .map(el => el.getAttribute("content")?.trim())
          .filter(Boolean)
          .join(", ") || getMeta("author");

        const pageJournal = getMeta(
          "citation_journal_title",
          "DC.Source",
          "citation_publisher",
          "DC.Publisher",
          "og:site_name"
        );

        const pageDate = getMeta(
          "citation_date",
          "DC.Date.issued",
          "DC.Date.created",
          "article:published_time"
        );

        let pageYear = "";
        if (pageDate) {
          const ym = pageDate.match(/\b(19\d\d|20\d\d)\b/);
          if (ym) pageYear = ym[1];
        }

        const pagePdf = getMeta("citation_pdf_url") || "";
        const pageDoi = getMeta("citation_doi", "DC.Identifier.DOI");
        let domainName = "";
        try { domainName = new URL(detectedUrl).hostname; } catch (e) { domainName = detectedUrl; }

        if (pageTitleMeta && pageTitleMeta.length >= 5) {
          const sim = computeStringSimilarity(queryTitle, pageTitleMeta);
          const isAcademicMeta = !!(getMeta("citation_title") || getMeta("DC.Source") || getMeta("citation_journal_title") || pagePdf);

          if (sim >= 0.40 || isAcademicMeta || queryTitle.length < 10) {
            return {
              status: "VERIFIED",
              confidence: sim >= 0.6 || isAcademicMeta ? 100 : 92,
              isReal: true,
              title: pageTitleMeta,
              authors: pageAuthors || getVerifyI18n("verify_author_source", "Tác giả công bố tại nguồn"),
              year: pageYear || "",
              venue: pageJournal || domainName,
              doi: pageDoi || detectedUrl,
              realUrl: detectedUrl,
              pdfUrl: pagePdf || null,
              reasonKey: "verify_reason_direct_url",
              reasonParams: { domain: domainName },
              reason: getVerifyI18n("verify_reason_direct_url", `Nguồn có thật 100%! Đã truy cập thành công và xác thực dữ liệu bài báo từ máy chủ (${domainName}).`, { domain: domainName })
            };
          }
        }
      }
    } catch (e) {
      console.warn("Direct URL verification error:", e);
    }
  }

  // --- STRATEGY 1: Verified by DOI ---
  if (detectedDoi) {
    try {
      const doiRes = await fetch(`https://doi.org/${encodeURIComponent(detectedDoi)}`, {
        headers: { "Accept": "application/vnd.citationstyles.csl+json" }
      });
      if (doiRes.ok) {
        const data = await doiRes.json();
        const verifiedTitle = data.title || queryTitle;
        const authors = (data.author || []).map(a => `${a.given ? a.given + " " : ""}${a.family || a.name || ""}`).filter(Boolean).join(", ");
        const year = data.issued?.["date-parts"]?.[0]?.[0] || data.created?.["date-parts"]?.[0]?.[0] || "";
        const venue = data["container-title"] || data.publisher || "";
        const realUrl = data.URL || `https://doi.org/${detectedDoi}`;

        return {
          status: "VERIFIED",
          confidence: 100,
          isReal: true,
          title: verifiedTitle,
          authors: authors || getVerifyI18n("verify_author_multiple", "Nhiều tác giả"),
          year: year ? String(year) : "",
          venue: venue || null, // Will be translated at render time
          doi: detectedDoi,
          realUrl,
          pdfUrl: null,
          reasonKey: "verify_reason_doi",
          reasonParams: {},
          reason: getVerifyI18n("verify_reason_doi", "Mã DOI này đã được cấp phép và đăng ký chính thức trên cơ sở dữ liệu học thuật quốc tế (International DOI Foundation).")
        };
      }
    } catch (e) {
      console.warn("DOI lookup error:", e);
    }
  }

  // --- STRATEGY 2: Verified by arXiv ---
  if (detectedArxiv) {
    try {
      const axRes = await fetch(`https://export.arxiv.org/api/query?id_list=${encodeURIComponent(detectedArxiv)}`);
      if (axRes.ok) {
        const xmlText = await axRes.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, "text/xml");
        const entry = xmlDoc.querySelector("entry");
        if (entry) {
          const entryTitle = entry.querySelector("title")?.textContent?.replace(/\s+/g, " ").trim() || "";
          const entryAuthors = Array.from(entry.querySelectorAll("author name")).map(n => n.textContent.trim()).join(", ");
          const published = entry.querySelector("published")?.textContent || "";
          const year = published.slice(0, 4);
          const pdfLink = `https://arxiv.org/pdf/${detectedArxiv}.pdf`;
          const realUrl = `https://arxiv.org/abs/${detectedArxiv}`;

          return {
            status: "VERIFIED",
            confidence: 98,
            isReal: true,
            title: entryTitle,
            authors: entryAuthors || "Nhiều tác giả",
            year,
            venue: `arXiv (${detectedArxiv})`,
            doi: `arXiv:${detectedArxiv}`,
            realUrl,
            pdfUrl: pdfLink,
            reasonKey: "verify_reason_arxiv",
            reasonParams: {},
            reason: getVerifyI18n("verify_reason_arxiv", "Bài báo này đã được kiểm chứng và lưu trữ chính thức trên kho học thuật mở toàn cầu arXiv.")
          };
        }
      }
    } catch (e) {
      console.warn("arXiv lookup error:", e);
    }
  }

  // --- STRATEGY 3: OpenAlex Global Registry (250M+ works) ---
  if (sanitizedQuery && sanitizedQuery.length >= 6) {
    try {
      const oaRes = await fetch(`https://api.openalex.org/works?filter=title.search:${encodeURIComponent(sanitizedQuery)}&per-page=3`, { signal: AbortSignal.timeout(5000) });
      if (oaRes.ok) {
        const oaData = await oaRes.json();
        const results = oaData.results || [];
        if (results.length > 0) {
          const best = results[0];
          const bestTitle = best.title || "";
          const similarity = computeStringSimilarity(queryTitle, bestTitle);

          if (similarity >= 0.70) {
            const authors = (best.authorships || []).map(a => a.author?.display_name).filter(Boolean).join(", ");
            const year = best.publication_year ? String(best.publication_year) : "";
            const venue = best.primary_location?.source?.display_name || "";
            const doi = best.doi ? best.doi.replace("https://doi.org/", "") : "";
            const realUrl = best.doi || best.primary_location?.landing_page_url || (doi ? `https://doi.org/${doi}` : "");
            const pdfUrl = best.open_access?.oa_url || null;
            const citedCount = typeof best.cited_by_count === "number" ? best.cited_by_count : 0;
            const isOa = !!best.open_access?.is_oa;
            const typeKey = best.type === "journal-article" ? "verify_type_journal" : (best.type === "proceedings-article" ? "verify_type_proceedings" : (best.type === "book-chapter" ? "verify_type_book_chapter" : (best.type === "dissertation" ? "verify_type_dissertation" : "verify_type_academic")));
            const typeStr = getVerifyI18n(typeKey, "Ấn phẩm học thuật");

            let reasonDetail = "";
            let reasonKey = "";
            let reasonParams = {};
            if (similarity >= 0.82) {
              reasonKey = "verify_reason_openalex_exact";
              reasonParams = { type: typeStr };
              const details = [];
              details.push(getVerifyI18n("verify_reason_openalex_exact", `Xác thực thành công trên mạng lưới học thuật toàn cầu OpenAlex (${typeStr}).`, { type: typeStr }));
              if (venue) {
                details.push(getVerifyI18n("verify_detail_venue", `Xuất bản tại: ${venue}${year ? ` (${year})` : ""}.`, { venue: `${venue}${year ? ` (${year})` : ""}` }));
              } else if (year) {
                details.push(getVerifyI18n("verify_detail_year", `Năm công bố: ${year}.`, { year }));
              }
              if (citedCount > 0) {
                details.push(getVerifyI18n("verify_detail_citations", `Đã có ${citedCount.toLocaleString()} lượt trích dẫn khoa học.`, { count: citedCount.toLocaleString() }));
              }
              if (isOa) {
                details.push(getVerifyI18n("verify_detail_oa", "Tài liệu mở tự do (Open Access)."));
              }
              reasonDetail = details.join(" ");
            } else {
              reasonKey = "verify_reason_openalex_partial";
              reasonParams = { percent: Math.round(similarity * 100), venue: venue ? ` (${venue})` : "" };
              reasonDetail = getVerifyI18n("verify_reason_openalex_partial", `Tìm thấy bài báo có tiêu đề tương tự (${Math.round(similarity * 100)}% trùng khớp)${venue ? ` tại ${venue}` : ""}. Vui lòng đối soát lại tên tác giả hoặc năm công bố để đảm bảo chuẩn xác.`, reasonParams);
            }

            return {
              status: similarity >= 0.82 ? "VERIFIED" : "PARTIAL",
              confidence: Math.round(similarity * 100),
              isReal: true,
              title: bestTitle,
              authors: authors || getVerifyI18n("verify_author_unknown", "Không rõ tác giả"),
              year,
              venue: venue || getVerifyI18n("verify_venue_journal_conf", "Tạp chí / Hội nghị học thuật"),
              doi,
              realUrl,
              pdfUrl,
              citedCount,
              isOa,
              typeKey,
              reasonKey,
              reasonParams,
              reason: reasonDetail
            };
          }
        }
      }
    } catch (e) {
      console.warn("OpenAlex lookup error:", e);
    }

    // --- STRATEGY 4: Crossref Bibliographic Database (150M+ works) ---
    try {
      const crRes = await fetch(`https://api.crossref.org/works?query.bibliographic=${encodeURIComponent(sanitizedQuery)}&rows=3`, { signal: AbortSignal.timeout(5000) });
      if (crRes.ok) {
        const crData = await crRes.json();
        const items = crData.message?.items || [];
        if (items.length > 0) {
          const best = items[0];
          const bestTitle = (best.title && best.title[0]) ? best.title[0] : "";
          const similarity = computeStringSimilarity(queryTitle, bestTitle);

          if (similarity >= 0.65) {
            const authors = (best.author || []).map(a => `${a.given ? a.given + " " : ""}${a.family || a.name || ""}`).filter(Boolean).join(", ");
            const year = best.issued?.["date-parts"]?.[0]?.[0] || best.created?.["date-parts"]?.[0]?.[0] || "";
            const venue = (best["container-title"] && best["container-title"][0]) ? best["container-title"][0] : best.publisher || "";
            const doi = best.DOI || "";
            const realUrl = best.URL || (doi ? `https://doi.org/${doi}` : "");
            const citedCount = typeof best["is-referenced-by-count"] === "number" ? best["is-referenced-by-count"] : 0;
            const typeKey = best.type === "journal-article" ? "verify_type_journal" : (best.type === "proceedings-article" ? "verify_type_proceedings" : (best.type === "book-chapter" ? "verify_type_book_chapter" : "verify_type_intl"));
            const typeStr = getVerifyI18n(typeKey, "Ấn phẩm quốc tế");

            let reasonDetail = "";
            let reasonKey = "";
            let reasonParams = {};
            if (similarity >= 0.80) {
              reasonKey = "verify_reason_crossref_exact";
              reasonParams = { type: typeStr };
              const details = [];
              details.push(getVerifyI18n("verify_reason_crossref_exact", `Xác thực thành công trong cơ sở dữ liệu xuất bản quốc tế Crossref (${typeStr}).`, { type: typeStr }));
              if (venue) {
                details.push(getVerifyI18n("verify_detail_venue", `Nhà xuất bản / Tạp chí: ${venue}${year ? ` (${year})` : ""}.`, { venue: `${venue}${year ? ` (${year})` : ""}` }));
              } else if (year) {
                details.push(getVerifyI18n("verify_detail_year", `Năm công bố: ${year}.`, { year }));
              }
              if (citedCount > 0) {
                details.push(getVerifyI18n("verify_detail_citations", `Đã có ${citedCount.toLocaleString()} lượt trích dẫn ghi nhận.`, { count: citedCount.toLocaleString() }));
              }
              reasonDetail = details.join(" ");
            } else {
              reasonKey = "verify_reason_crossref_partial";
              reasonParams = { percent: Math.round(similarity * 100), venue: venue || "Crossref" };
              reasonDetail = getVerifyI18n("verify_reason_crossref_partial", `Tìm thấy tài liệu có tiêu đề tương tự (${Math.round(similarity * 100)}% trùng khớp) tại ${venue || "Crossref"}. Cần đối chiếu lại thông tin tác giả và năm xuất bản.`, reasonParams);
            }

            return {
              status: similarity >= 0.80 ? "VERIFIED" : "PARTIAL",
              confidence: Math.round(similarity * 100),
              isReal: true,
              title: bestTitle,
              authors: authors || getVerifyI18n("verify_author_unknown", "Không rõ tác giả"),
              year: year ? String(year) : "",
              venue: venue || getVerifyI18n("verify_venue_conf_publisher", "Hội thảo / Nhà xuất bản học thuật"),
              doi,
              realUrl,
              pdfUrl: null,
              citedCount,
              typeKey,
              reasonKey,
              reasonParams,
              reason: reasonDetail
            };
          }
        }
      }
    } catch (e) {
      console.warn("Crossref lookup error:", e);
    }
  }

  // --- STRATEGY 5: Not Found in International Repositories ---
  return {
    status: "NOT_FOUND",
    confidence: 20,
    isReal: false,
    title: queryTitle,
    authors: "",
    year: "",
    venue: "",
    doi: "",
    realUrl: "",
    pdfUrl: null,
    reasonKey: "verify_reason_not_found",
    reasonParams: {},
    reason: getVerifyI18n("verify_reason_not_found", "Chưa tìm thấy bản ghi trùng khớp trên cơ sở dữ liệu quốc tế (Crossref & OpenAlex). Đây có thể là tài liệu nội bộ, kỷ yếu chưa cấp chỉ số DOI quốc tế, hoặc trích dẫn nhân tạo do mô hình AI tự sinh. Bạn có thể bấm 'Google Scholar' bên dưới để đối soát thực tế.")
  };
}

async function handleVerifySource(forcedText = null, tabMeta = null) {
  const inputEl = document.getElementById("verify-input");
  const text = (typeof forcedText === "string" ? forcedText : (inputEl ? inputEl.value : "")).trim();
  if (!text) {
    showToast(getVerifyI18n("verify_toast_empty", "Vui lòng dán trích dẫn, tên bài báo hoặc mã DOI cần đối soát!"));
    return;
  }
  if (inputEl && typeof forcedText === "string") {
    inputEl.value = forcedText;
  }

  const resultBox = document.getElementById("verify-result-box");
  const statusTitle = document.getElementById("verify-status-title");
  const confBadge = document.getElementById("verify-confidence-badge");
  const statusDesc = document.getElementById("verify-status-desc");
  const detailsBox = document.getElementById("verify-matched-details");
  const btnReal = document.getElementById("btn-open-real-source");
  const btnPdf = document.getElementById("btn-open-oa-pdf");
  const btnApply = document.getElementById("btn-apply-verified-to-form");

  if (resultBox) resultBox.style.display = "block";
  if (detailsBox) detailsBox.style.display = "none";
  if (btnReal) btnReal.style.display = "none";
  if (btnPdf) btnPdf.style.display = "none";
  if (btnApply) btnApply.style.display = "none";

  if (statusTitle) {
    statusTitle.textContent = getVerifyI18n("verify_loading_title", "Đang tra cứu trên mạng lưới học thuật quốc tế...");
    statusTitle.style.color = "#38bdf8";
  }
  if (confBadge) {
    confBadge.textContent = getVerifyI18n("verify_loading_badge", "Đang đối soát");
    confBadge.style.color = "#38bdf8";
    confBadge.style.borderColor = "rgba(56, 189, 248, 0.4)";
    confBadge.style.background = "rgba(56, 189, 248, 0.1)";
  }
  if (statusDesc) {
    statusDesc.textContent = getVerifyI18n("verify_loading_desc", "Đang đối soát thông tin qua Crossref (150M+ tài liệu), DOI Foundation và OpenAlex...");
  }

  try {
    const res = await verifyAcademicSource(text, tabMeta);
    renderVerifyResult(res, text);
  } catch (err) {
    console.error("verifyAcademicSource error:", err); showToast("err_003", "error");
    if (statusTitle) {
      statusTitle.textContent = getVerifyI18n("verify_err_title", "Lỗi khi kết nối mạng lưới học thuật");
      statusTitle.style.color = "#f59e0b";
    }
    if (statusDesc) {
      statusDesc.textContent = getVerifyI18n("verify_err_desc", "Không thể kết nối máy chủ xác minh. Hãy kiểm tra kết nối mạng hoặc thử lại với tên bài báo ngắn gọn hơn.");
    }
    if (confBadge) confBadge.textContent = getVerifyI18n("verify_err_badge", "Lỗi mạng");
  }
}

function renderVerifyResult(result, originalQuery) {
  verifiedResultData = result;

  const resultBox = document.getElementById("verify-result-box");
  const statusTitle = document.getElementById("verify-status-title");
  const confBadge = document.getElementById("verify-confidence-badge");
  const statusDesc = document.getElementById("verify-status-desc");
  const detailsBox = document.getElementById("verify-matched-details");

  const matchedTitle = document.getElementById("verify-matched-title");
  const matchedAuthors = document.getElementById("verify-matched-authors");
  const matchedVenue = document.getElementById("verify-matched-venue");
  const matchedDoi = document.getElementById("verify-matched-doi");

  const btnReal = document.getElementById("btn-open-real-source");
  const btnPdf = document.getElementById("btn-open-oa-pdf");
  const btnScholar = document.getElementById("btn-open-scholar");
  const btnCrossref = document.getElementById("btn-open-crossref");
  const btnApply = document.getElementById("btn-apply-verified-to-form");

  if (!resultBox) return;
  resultBox.style.display = "block";

  // Dynamic translated reason calculation
  let dynamicReason = result.reason || "";
  if (result.reasonKey === "verify_reason_openalex_exact" || result.reasonKey === "verify_reason_crossref_exact") {
    const typeStr = getVerifyI18n(result.typeKey || "verify_type_academic", "Ấn phẩm học thuật");
    const details = [];
    details.push(getVerifyI18n(result.reasonKey, "", { type: typeStr }));
    if (result.venue) {
      details.push(getVerifyI18n("verify_detail_venue", "", { venue: `${result.venue}${result.year ? ` (${result.year})` : ""}` }));
    } else if (result.year) {
      details.push(getVerifyI18n("verify_detail_year", "", { year: result.year }));
    }
    if (result.citedCount > 0) {
      details.push(getVerifyI18n("verify_detail_citations", "", { count: result.citedCount.toLocaleString() }));
    }
    if (result.isOa) {
      details.push(getVerifyI18n("verify_detail_oa", ""));
    }
    dynamicReason = details.filter(Boolean).join(" ");
  } else if (result.reasonKey) {
    dynamicReason = getVerifyI18n(result.reasonKey, result.reason, result.reasonParams || {});
  }

  if (result.status === "VERIFIED") {
    if (statusTitle) {
      statusTitle.textContent = getVerifyI18n("verify_badge_exact", "✓ Đã xác thực – Nguồn học thuật có thật");
      statusTitle.style.color = "#10b981";
    }
    if (confBadge) {
      confBadge.textContent = `${result.confidence}% (100%)`;
      confBadge.style.color = "#10b981";
      confBadge.style.borderColor = "rgba(16, 185, 129, 0.45)";
      confBadge.style.background = "rgba(16, 185, 129, 0.12)";
    }
    if (statusDesc) statusDesc.textContent = dynamicReason;
  } else if (result.status === "PARTIAL") {
    if (statusTitle) {
      statusTitle.textContent = getVerifyI18n("verify_badge_partial", "Trùng khớp một phần – Cần kiểm tra chi tiết");
      statusTitle.style.color = "#f59e0b";
    }
    if (confBadge) {
      confBadge.textContent = `${result.confidence}%`;
      confBadge.style.color = "#f59e0b";
      confBadge.style.borderColor = "rgba(245, 158, 11, 0.45)";
      confBadge.style.background = "rgba(245, 158, 11, 0.12)";
    }
    if (statusDesc) statusDesc.textContent = dynamicReason;
  } else {
    if (statusTitle) {
      statusTitle.textContent = getVerifyI18n("verify_badge_notfound", "Chưa tìm thấy trong CSDL quốc tế");
      statusTitle.style.color = "#ef4444";
    }
    if (confBadge) {
      confBadge.textContent = getVerifyI18n("verify_status_idle", "Chưa xác minh");
      confBadge.style.color = "#ef4444";
      confBadge.style.borderColor = "rgba(239, 68, 68, 0.45)";
      confBadge.style.background = "rgba(239, 68, 68, 0.12)";
    }
    if (statusDesc) statusDesc.textContent = dynamicReason;
  }

  // Show details box if real paper was found
  if (result.isReal && result.title && detailsBox) {
    detailsBox.style.display = "block";
    if (matchedTitle) matchedTitle.textContent = result.title;
    
    const authorPrefix = getVerifyI18n("verify_label_author", "Tác giả: ");
    const venuePrefix = getVerifyI18n("verify_label_venue", "Nơi XB: ");
    const unknownAuthor = getVerifyI18n("verify_author_unknown", "Không rõ");
    const intlVenue = getVerifyI18n("verify_venue_intl", "Ấn phẩm học thuật");
    const citeSuffix = getVerifyI18n("verify_label_citations_suffix", "lượt trích dẫn");
    const inDb = getVerifyI18n("verify_doi_in_db", "Có trong cơ sở dữ liệu");

    if (matchedAuthors) matchedAuthors.textContent = `${authorPrefix}${result.authors || unknownAuthor}`;
    if (matchedVenue) {
      let vText = `${venuePrefix}${(result.venue && result.venue !== "null") ? result.venue : intlVenue} ${result.year ? "(" + result.year + ")" : ""}`;
      if (result.citedCount) {
        vText += ` • ${result.citedCount.toLocaleString()} ${citeSuffix}`;
      }
      if (result.isOa) {
        vText += ` • Open Access`;
      }
      matchedVenue.textContent = vText;
    }
    if (matchedDoi) matchedDoi.textContent = `DOI / ID: ${result.doi || result.realUrl || inDb}`;
  } else if (detailsBox) {
    detailsBox.style.display = "none";
  }

  // 1. Direct Real Source Button
  if (result.isReal && result.realUrl && btnReal) {
    btnReal.style.display = "block";
    btnReal.onclick = () => {
      const tabsApi = (typeof browser !== "undefined" && browser.tabs) ? browser.tabs : (typeof chrome !== "undefined" ? chrome.tabs : null);
      if (tabsApi?.create) tabsApi.create({ url: result.realUrl });
      else window.open(result.realUrl, "_blank");
    };
  } else if (btnReal) {
    btnReal.style.display = "none";
  }

  // 2. Open Access PDF Button
  if (result.pdfUrl && btnPdf) {
    btnPdf.style.display = "block";
    btnPdf.onclick = () => {
      const tabsApi = (typeof browser !== "undefined" && browser.tabs) ? browser.tabs : (typeof chrome !== "undefined" ? chrome.tabs : null);
      if (tabsApi?.create) tabsApi.create({ url: result.pdfUrl });
      else window.open(result.pdfUrl, "_blank");
    };
  } else if (btnPdf) {
    btnPdf.style.display = "none";
  }

  // 3. Search Fallback Buttons
  const searchQuery = (result.isReal && result.title) ? result.title : originalQuery;
  const btnGoogle = document.getElementById("btn-open-google");
  if (btnGoogle) {
    btnGoogle.onclick = () => {
      const gUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
      const tabsApi = (typeof browser !== "undefined" && browser.tabs) ? browser.tabs : (typeof chrome !== "undefined" ? chrome.tabs : null);
      if (tabsApi?.create) tabsApi.create({ url: gUrl });
      else window.open(gUrl, "_blank");
    };
  }
  if (btnScholar) {
    btnScholar.onclick = () => {
      const sUrl = `https://scholar.google.com/scholar?q=${encodeURIComponent(searchQuery)}`;
      const tabsApi = (typeof browser !== "undefined" && browser.tabs) ? browser.tabs : (typeof chrome !== "undefined" ? chrome.tabs : null);
      if (tabsApi?.create) tabsApi.create({ url: sUrl });
      else window.open(sUrl, "_blank");
    };
  }
  if (btnCrossref) {
    btnCrossref.onclick = () => {
      const crUrl = `https://search.crossref.org/?q=${encodeURIComponent(searchQuery)}`;
      const tabsApi = (typeof browser !== "undefined" && browser.tabs) ? browser.tabs : (typeof chrome !== "undefined" ? chrome.tabs : null);
      if (tabsApi?.create) tabsApi.create({ url: crUrl });
      else window.open(crUrl, "_blank");
    };
  }

  // 4. Apply to Citation form
  if (result.isReal && result.title && btnApply) {
    btnApply.style.display = "block";
    btnApply.onclick = () => {
      if (result.title) document.getElementById("f-title").value = result.title;
      if (result.authors) document.getElementById("f-authors").value = result.authors;
      if (result.year) document.getElementById("f-date").value = result.year;
      if (result.venue) document.getElementById("f-container").value = result.venue;
      if (result.doi) document.getElementById("f-doi").value = result.doi;
      if (result.realUrl) document.getElementById("f-url").value = result.realUrl;
      document.getElementById("f-source-type").value = "academic";
      syncMetaFromInputs();
      showToast(getVerifyI18n("verify_toast_applied", "✔ Đã áp dụng thông tin bài báo chuẩn xác vào tiện ích!"));
    };
  } else if (btnApply) {
    btnApply.style.display = "none";
  }
}

function initSourceVerifier() {
  const verifyInput = document.getElementById("verify-input");
  const clearBtn = document.getElementById("btn-clear-verify-input");
  const pasteBtn = document.getElementById("btn-paste-verify");
  const currPageBtn = document.getElementById("btn-use-current-page-verify");
  const runBtn = document.getElementById("btn-run-verify");

  if (verifyInput && clearBtn) {
    verifyInput.addEventListener("input", () => {
      clearBtn.style.display = verifyInput.value ? "block" : "none";
    });
    clearBtn.addEventListener("click", () => {
      verifyInput.value = "";
      clearBtn.style.display = "none";
      const resBox = document.getElementById("verify-result-box");
      if (resBox) resBox.style.display = "none";
    });
    verifyInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleVerifySource();
      }
    });
  }

  pasteBtn?.addEventListener("click", async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim()) {
        if (verifyInput) {
          verifyInput.value = text.trim();
          if (clearBtn) clearBtn.style.display = "block";
        }
        handleVerifySource(text.trim());
      } else {
        showToast("📋 Bộ nhớ tạm (Clipboard) đang trống!");
      }
    } catch (e) {
      showToast("💡 Hãy bấm phím Ctrl+V vào ô để dán!");
    }
  });

  currPageBtn?.addEventListener("click", () => {
    // Prefer URL first (oEmbed/DOI/direct verify), fallback to title
    const text = currentMeta.doi
      ? currentMeta.doi
      : (currentMeta.url && !currentMeta.url.startsWith("file://")
          ? currentMeta.url
          : (currentMeta.title || ""));
    if (text && text.trim()) {
      if (verifyInput) {
        verifyInput.value = text.trim();
        if (clearBtn) clearBtn.style.display = "block";
      }
      handleVerifySource(text.trim(), currentMeta);
    } else {
      showToast("Chưa nhận diện được tiêu đề hoặc URL trang hiện tại!");
    }
  });

  runBtn?.addEventListener("click", () => {
    handleVerifySource();
  });
}

// ----------------------------------------------------------------------------
// Tab 2: Element Redact & Blur Controller
// ----------------------------------------------------------------------------
function updateInspectButtonsUI() {
  const btnStart = document.getElementById("btn-start-inspect");
  const btnStop = document.getElementById("btn-stop-inspect");
  if (!btnStart || !btnStop) return;

  const tStart = window.i18n ? window.i18n.t("btn_start_inspect") : "Bật chọn che";
  const tStop = window.i18n ? window.i18n.t("btn_stop_inspect") : "Dừng chọn";

  if (isInspectMode) {
    btnStart.textContent = `🎯 ${tStart}...`;
    btnStart.className = "btn btn-danger";
    btnStart.style.opacity = "1";

    btnStop.className = "btn btn-primary";
    btnStop.style.opacity = "1";
    btnStop.style.cursor = "pointer";
    btnStop.textContent = tStop;
  } else {
    btnStart.textContent = `🎯 ${tStart}`;
    btnStart.className = "btn btn-primary";
    btnStart.style.opacity = "1";

    btnStop.className = "btn btn-secondary";
    btnStop.style.opacity = "0.65";
    btnStop.textContent = tStop;
  }
}

function updateRedactionVisibilityUI() {
  const btnEnable = document.getElementById("btn-enable-redactions");
  const btnDisable = document.getElementById("btn-disable-redactions");
  if (!btnEnable || !btnDisable) return;

  const tEnable = window.i18n ? window.i18n.t("btn_enable_redact") : "Bật che";
  const tDisable = window.i18n ? window.i18n.t("btn_disable_redact") : "Xem bản gốc";

  if (isRedactionsPaused) {
    btnEnable.className = "btn btn-secondary";
    btnEnable.style.opacity = "0.75";
    btnEnable.style.boxShadow = "none";
    btnEnable.textContent = `🙈 ${tEnable}`;

    btnDisable.className = "btn btn-warning";
    btnDisable.style.opacity = "1";
    btnDisable.style.boxShadow = "0 0 10px rgba(245, 158, 11, 0.4)";
    btnDisable.textContent = `👁️ ${tDisable} ✓`;
  } else {
    btnEnable.className = "btn btn-success";
    btnEnable.style.opacity = "1";
    btnEnable.style.boxShadow = "0 0 10px rgba(16, 185, 129, 0.4)";
    btnEnable.textContent = `🙈 ${tEnable} ✓`;

    btnDisable.className = "btn btn-secondary";
    btnDisable.style.opacity = "0.75";
    btnDisable.style.boxShadow = "none";
    btnDisable.textContent = `👁️ ${tDisable}`;
  }
}

function escapeHtml(str) {
  return (str || "").replace(/[&<>"']/g, (m) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[m]));
}

function renderRedactedList(list) {
  currentRedactedList = list || [];
  const container = document.getElementById("redacted-items-list");
  if (!container) return;

  container.textContent = "";

  if (!list || list.length === 0) {
    const emptyBox = document.createElement("div");
    emptyBox.className = "empty-list-box";

    const emptyIcon = document.createElement("div");
    emptyIcon.className = "empty-list-icon";
    emptyIcon.textContent = "🛡️";

    const emptyTitle = document.createElement("div");
    emptyTitle.className = "empty-list-title";
    emptyTitle.textContent = window.i18n ? window.i18n.t("lbl_no_redacted") : "Chưa có phần tử nào được che";

    const emptySub = document.createElement("div");
    emptySub.className = "empty-list-sub";
    emptySub.textContent = window.i18n ? window.i18n.t("lbl_no_redacted_sub") : "Bấm \"Bật chọn che\" rồi nhấp vào đối tượng trên trang để bảo mật.";

    emptyBox.appendChild(emptyIcon);
    emptyBox.appendChild(emptyTitle);
    emptyBox.appendChild(emptySub);
    container.appendChild(emptyBox);
    return;
  }

  const styleMap = {
    blur: (px) => `🌫️ Mờ ${px || 12}px`,
    blackout: () => "⬛ Hộp đen",
    pixelate: () => "▦ Điểm ảnh",
    hide: () => "👻 Ẩn"
  };

  list.forEach((item, index) => {
    const card = document.createElement("div");
    card.className = "redacted-item-card";
    card.dataset.id = item.id;
    card.title = window.i18n ? window.i18n.t("Rê chuột để soi vị trí trên trang web, click để cuộn tới") : "Rê chuột để soi vị trí trên trang web, click để cuộn tới";

    const left = document.createElement("div");
    left.className = "redacted-item-left";

    const indexBadge = document.createElement("span");
    indexBadge.className = "redacted-index-badge";
    indexBadge.textContent = `#${index + 1}`;

    const tagPill = document.createElement("span");
    tagPill.className = "redacted-tag-pill";
    tagPill.textContent = `<${item.tagName}>`;

    const stylePill = document.createElement("span");
    stylePill.className = "redacted-style-pill";
    const getStyleLabel = styleMap[item.style] || (() => "Che");
    stylePill.textContent = getStyleLabel(item.blurPx);

    const snippet = document.createElement("span");
    snippet.className = "redacted-snippet-text";
    snippet.textContent = item.snippet || "Phần tử trang";

    left.appendChild(indexBadge);
    left.appendChild(tagPill);
    left.appendChild(stylePill);
    left.appendChild(snippet);

    const btnRemove = document.createElement("button");
    btnRemove.className = "btn-remove-item";
    btnRemove.dataset.id = item.id;
    btnRemove.title = window.i18n ? window.i18n.t("Gỡ bỏ che phần tử này") : "Gỡ bỏ che phần tử này";
    btnRemove.textContent = "✕";

    card.appendChild(left);
    card.appendChild(btnRemove);
    container.appendChild(card);

    // Hover card to pulse highlight element on webpage
    card.addEventListener("mouseenter", () => {
      sendTabMessage({ action: "HIGHLIGHT_REDACTED_ELEMENT", id: item.id });
    });
    card.addEventListener("mouseleave", () => {
      sendTabMessage({ action: "UNHIGHLIGHT_REDACTED_ELEMENT" });
    });
    card.addEventListener("click", () => {
      sendTabMessage({ action: "HIGHLIGHT_REDACTED_ELEMENT", id: item.id });
    });

    // Delete single redaction
    btnRemove.addEventListener("click", (e) => {
      e.stopPropagation();
      sendTabMessage({ action: "REMOVE_REDACTION_BY_ID", id: item.id }, (res) => {
        if (res) {
          const rc = document.getElementById("redact-count");
        if (rc) rc.textContent = res.count || 0;
          renderRedactedList(res.list || []);
          showToast("✓ Đã gỡ bỏ che phần tử!");
        }
      });
    });
  });
}

async function ensureActiveTab() {
  try {
    const queryTabs = async (queryObj) => {
      if (typeof browser !== "undefined" && browser.tabs && browser.tabs.query) {
        try {
          const res = await browser.tabs.query(queryObj);
          return res || [];
        } catch (e) {
          return [];
        }
      }
      if (typeof chrome !== "undefined" && chrome.tabs && chrome.tabs.query) {
        return await new Promise((resolve) => {
          chrome.tabs.query(queryObj, (tabs) => {
            if (chrome.runtime?.lastError) resolve([]);
            else resolve(tabs || []);
          });
        });
      }
      return [];
    };

    const isWebTab = (t) => {
      if (!t || !t.id) return false;
      const u = t.url || "";
      if (u.startsWith("moz-extension://") || u.startsWith("chrome-extension://") || u.startsWith("about:") || u.startsWith("chrome:")) {
        return false;
      }
      return true;
    };

    // 1. Try active tab in current window
    let tabs = await queryTabs({ active: true, currentWindow: true });
    let validTabs = tabs.filter(isWebTab);

    // 2. Try active tab in last focused window (needed when sidebar has focus)
    if (validTabs.length === 0) {
      tabs = await queryTabs({ active: true, lastFocusedWindow: true });
      validTabs = tabs.filter(isWebTab);
    }

    // 3. Fallback: any active tab in any window
    if (validTabs.length === 0) {
      tabs = await queryTabs({ active: true });
      validTabs = tabs.filter(isWebTab);
    }

    const targetTab = validTabs[0] || tabs[0];
    if (targetTab && targetTab.id) {
      activeTabId = targetTab.id;
      return targetTab;
    }
    return null;
  } catch (e) {
    console.warn("ensureActiveTab exception:", e);
  }
  return null;
}

// ----------------------------------------------------------------------------
// Dual-Web Quick Switcher (2-Page Linked Tabs Controller)
// ----------------------------------------------------------------------------
let currentTabObj = null; // Tab A
let linkedTabObj = null;  // Tab B
let isDualTabDropdownOpen = false;

function updateDualTabsUI() {
  const tabATitle = document.getElementById("tab-a-title");
  const tabBTitle = document.getElementById("tab-b-title");
  const pillB = document.getElementById("pill-tab-b");

  if (tabATitle) {
    const titleA = (currentTabObj && currentTabObj.title) ? currentTabObj.title : (window.i18n ? window.i18n.t("tab_a_title") : "Trang hiện tại");
    tabATitle.textContent = titleA;
    tabATitle.title = titleA;
  }

  if (tabBTitle) {
    if (linkedTabObj && linkedTabObj.title) {
      tabBTitle.textContent = linkedTabObj.title;
      if (pillB) {
        const tipTemplate = window.i18n ? window.i18n.t("switch_to_tab") : "Chuyển sang: {title} (Phím tắt: Alt + Q)";
        pillB.title = tipTemplate.replace("{title}", linkedTabObj.title);
      }
    } else {
      const emptyLabel = window.i18n ? window.i18n.t("tab_b_empty") : "Chưa có trang phụ";
      tabBTitle.textContent = `${emptyLabel} (Alt+Q)`;
      if (pillB) {
        pillB.title = window.i18n ? window.i18n.t("tab_b_empty_tip") : "Bấm ▼ để chọn trang liên kết hoặc mở tab mới";
      }
    }
  }
}

async function swapDualTabs() {
  const tabsApi = (typeof browser !== "undefined" && browser.tabs) ? browser.tabs : (typeof chrome !== "undefined" ? chrome.tabs : null);
  if (!tabsApi) return;

  if (linkedTabObj && linkedTabObj.id && currentTabObj && linkedTabObj.id !== currentTabObj.id) {
    try {
      const targetTab = await tabsApi.get(linkedTabObj.id);
      if (targetTab) {
        await tabsApi.update(targetTab.id, { active: true });
        const switchedTemplate = window.i18n ? window.i18n.t("switched_to_tab") : "Đã chuyển sang: {title}...";
        showToast(`⇄ ${switchedTemplate.replace("{title}", (targetTab.title || "Tab liên kết").slice(0, 24))}`);
        return;
      }
    } catch (e) {
      linkedTabObj = null;
    }
  }

  // If no linked tab yet, try finding another open tab in current window
  try {
    const allTabs = await tabsApi.query({ currentWindow: true });
    const candidateTabs = (allTabs || []).filter(t => t.id !== activeTabId && !t.url?.startsWith("chrome://") && !t.url?.startsWith("about:"));
    if (candidateTabs.length > 0) {
      const nextTab = candidateTabs[0];
      linkedTabObj = currentTabObj;
      await tabsApi.update(nextTab.id, { active: true });
      const switchedTemplate = window.i18n ? window.i18n.t("switched_to_tab") : "Đã chuyển sang: {title}...";
      showToast(`⇄ ${switchedTemplate.replace("{title}", (nextTab.title || "Tab mới").slice(0, 24))}`);
    } else {
      showToast(window.i18n ? window.i18n.t("open_another_tab_hint") : "💡 Hãy mở thêm 1 tab trang web khác để chuyển đổi qua lại!");
    }
  } catch (err) {
    console.warn("swapDualTabs failed:", err);
  }
}

async function populateDualTabDropdown() {
  const tabsApi = (typeof browser !== "undefined" && browser.tabs) ? browser.tabs : (typeof chrome !== "undefined" ? chrome.tabs : null);
  const select = document.getElementById("select-linked-tab");
  if (!tabsApi || !select) return;

  while (select.firstChild) {
    select.removeChild(select.firstChild);
  }

  const defaultOpt = document.createElement("option");
  defaultOpt.value = "";
  defaultOpt.textContent = window.i18n ? window.i18n.t("select_linked_tab_opt") : "-- Chọn trang web để liên kết qua lại --";
  select.appendChild(defaultOpt);

  try {
    const allTabs = await tabsApi.query({ currentWindow: true });
    (allTabs || []).forEach(t => {
      if (t.id !== activeTabId && !t.url?.startsWith("chrome://") && !t.url?.startsWith("about:")) {
        const opt = document.createElement("option");
        opt.value = t.id.toString();
        opt.textContent = (t.title || t.url || "Tab").slice(0, 48);
        if (linkedTabObj && linkedTabObj.id === t.id) {
          opt.selected = true;
        }
        select.appendChild(opt);
      }
    });
  } catch (e) {
    console.warn("Could not query tabs for dropdown:", e);
  }
}

function toggleDualTabDropdown() {
  const dropdownBox = document.getElementById("dual-tab-dropdown-box");
  if (!dropdownBox) return;
  isDualTabDropdownOpen = !isDualTabDropdownOpen;
  dropdownBox.style.display = isDualTabDropdownOpen ? "block" : "none";
  if (isDualTabDropdownOpen) {
    populateDualTabDropdown();
  }
}

async function safeSendTabMessage(tabId, message) {
  if (!tabId) return null;
  try {
    if (typeof browser !== "undefined" && browser.tabs && browser.tabs.sendMessage) {
      return await browser.tabs.sendMessage(tabId, message).catch(() => null);
    }
    if (typeof chrome !== "undefined" && chrome.tabs && chrome.tabs.sendMessage) {
      return await new Promise((resolve) => {
        let responded = false;
        try {
          chrome.tabs.sendMessage(tabId, message, (res) => {
            responded = true;
            if (chrome.runtime?.lastError) {
              resolve(null);
            } else {
              resolve(res || null);
            }
          });
        } catch (e) {
          resolve(null);
        }
        setTimeout(() => {
          if (!responded) resolve(null);
        }, 800);
      });
    }
  } catch (err) {
    return null;
  }
  return null;
}

// Lazy on-demand injection fallback for already open tabs
async function ensureContentScriptInjected(tabId) {
  if (!tabId) return false;

  // 1. Quick PING with timeout
  const ping = await Promise.race([
    safeSendTabMessage(tabId, { action: "PING" }),
    new Promise(r => setTimeout(() => r(null), 200))
  ]);
  if (ping && ping.pong) {
    return true;
  }

  // 2. Inject content.css and content.js as fallback
  try {
    const scriptingApi = (typeof chrome !== "undefined" && chrome.scripting) 
      ? chrome.scripting 
      : ((typeof browser !== "undefined" && browser.scripting) ? browser.scripting : null);

    if (scriptingApi && scriptingApi.executeScript) {
      await scriptingApi.insertCSS({
        target: { tabId },
        files: ["content.css"]
      }).catch(() => {});

      await scriptingApi.executeScript({
        target: { tabId },
        files: ["content.js"]
      }).catch(() => {});

      await new Promise(r => setTimeout(r, 60));
      return true;
    }
  } catch (injectErr) {
    console.warn("Script injection fallback error:", injectErr);
  }
  return false;
}

async function sendTabMessage(msg, cb) {
  const tab = await ensureActiveTab();
  if (!tab || !tab.id) {
    if (cb) cb(null);
    return null;
  }

  const restrictedProtocols = ["about:", "chrome:", "edge:", "moz-extension:", "chrome-extension:"];
  if (tab.url && restrictedProtocols.some(p => tab.url.startsWith(p))) {
    if (cb) cb(null);
    return null;
  }

  await ensureContentScriptInjected(tab.id);

  const res = await Promise.race([
    safeSendTabMessage(tab.id, msg),
    new Promise(r => setTimeout(() => r(null), 1200))
  ]);

  if (cb) cb(res);
  return res;
}

// ----------------------------------------------------------------------------
// Tab 3: Smart Screenshot Controller (Fixes Duplicate Sticky Headers)
// ----------------------------------------------------------------------------
let screenshotSettings = {
  autoCopy: true,
  format: "png",
  delay: 0
};

function loadScreenshotSettings() {
  storGet("super_screenshot_settings", (res) => {
    if (res && res.super_screenshot_settings) {
      screenshotSettings = { ...screenshotSettings, ...res.super_screenshot_settings };
    }
    const autoCopyCheck = document.getElementById("cap-pref-autocopy");
    const formatSelect = document.getElementById("cap-pref-format");
    const delaySelect = document.getElementById("cap-pref-delay");
    if (autoCopyCheck) autoCopyCheck.checked = screenshotSettings.autoCopy !== false;
    if (formatSelect) formatSelect.value = screenshotSettings.format || "png";
    if (delaySelect) delaySelect.value = (screenshotSettings.delay || 0).toString();
  });
}

function saveScreenshotSettings() {
  const autoCopyCheck = document.getElementById("cap-pref-autocopy");
  const formatSelect = document.getElementById("cap-pref-format");
  const delaySelect = document.getElementById("cap-pref-delay");

  screenshotSettings.autoCopy = autoCopyCheck ? autoCopyCheck.checked : true;
  screenshotSettings.format = formatSelect ? formatSelect.value : "png";
  screenshotSettings.delay = delaySelect ? parseInt(delaySelect.value, 10) || 0 : 0;

  storSet({ super_screenshot_settings: screenshotSettings }, () => {
    const statusEl = document.getElementById("cap-settings-status");
    if (statusEl) {
      statusEl.textContent = window.i18n ? window.i18n.t("toast_settings_saved") : "✓ Đã lưu cài đặt!";
      statusEl.style.color = "#38bdf8";
      setTimeout(() => {
        statusEl.textContent = window.i18n ? window.i18n.t("toast_autosave") : "💾 Tự động lưu";
        statusEl.style.color = "#10b981";
      }, 1500);
    }
  });
}

function getVisibleTabDataUrl(windowId = null) {
  return new Promise((resolve) => {
    const tabsApi = (typeof browser !== "undefined" && browser.tabs) ? browser.tabs : ((typeof chrome !== "undefined" && chrome.tabs) ? chrome.tabs : null);
    const runtimeApi = (typeof browser !== "undefined" && browser.runtime) ? browser.runtime : ((typeof chrome !== "undefined" && chrome.runtime) ? chrome.runtime : null);

    const fallbackToBackground = () => {
      if (!runtimeApi || typeof runtimeApi.sendMessage !== "function") {
        return resolve(null);
      }
      const sendCb = (res) => resolve(res?.dataUrl || null);
      try {
        if (runtimeApi.sendMessage.length >= 2) {
          runtimeApi.sendMessage({ action: "CAPTURE_VISIBLE_TAB", windowId }, sendCb);
        } else {
          Promise.resolve(runtimeApi.sendMessage({ action: "CAPTURE_VISIBLE_TAB", windowId })).then(sendCb).catch(() => resolve(null));
        }
      } catch (e) {
        resolve(null);
      }
    };

    if (tabsApi && typeof tabsApi.captureVisibleTab === "function") {
      try {
        const captureResult = tabsApi.captureVisibleTab(windowId || null, { format: "png" });
        if (captureResult && typeof captureResult.then === "function") {
          captureResult.then((dataUrl) => resolve(dataUrl || null)).catch(() => fallbackToBackground());
          return;
        }

        if (typeof tabsApi.captureVisibleTab === "function") {
          tabsApi.captureVisibleTab(windowId || null, { format: "png" }, (dataUrl) => {
            if (dataUrl) return resolve(dataUrl);
            fallbackToBackground();
          });
          return;
        }
      } catch (e) {
        // Fall through to background fallback
      }
    }

    fallbackToBackground();
  });
}

async function captureVisibleScreen() {
  const delaySec = screenshotSettings.delay || 0;
  if (delaySec > 0) {
    showToast(`⏳ Hẹn giờ: Chụp sau ${delaySec}s...`);
    await new Promise(r => setTimeout(r, delaySec * 1000));
  }
  const dataUrl = await getVisibleTabDataUrl();
  if (dataUrl) {
    if (screenshotSettings.format === "jpeg") {
      const img = await loadImage(dataUrl);
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      const jpegUrl = canvas.toDataURL("image/jpeg", 0.9);
      displayScreenshotResult(jpegUrl);
    } else {
      displayScreenshotResult(dataUrl);
    }
    if (!screenshotSettings.autoCopy) {
      showToast("✓ Đã chụp ảnh màn hình!");
    }
  } else {
    showToast("err_004", "error");
  }
}

async function scrollTabTo(targetY, durationMs = 120) {
  try {
    const scriptingApi = (typeof browser !== "undefined" && browser.scripting)
      ? browser.scripting
      : ((typeof chrome !== "undefined" && chrome.scripting) ? chrome.scripting : null);
    if (!scriptingApi || !scriptingApi.executeScript) return null;
    const res = await scriptingApi.executeScript({
      target: { tabId: activeTabId },
      func: (targetY, duration) => {
        return new Promise((resolve) => {
          const doc = document.documentElement;
          const body = document.body;
          const getMaxScroll = () => {
            const totalH = Math.max(
              body?.scrollHeight || 0, doc?.scrollHeight || 0,
              body?.offsetHeight || 0, doc?.offsetHeight || 0,
              body?.clientHeight || 0, doc?.clientHeight || 0
            );
            return Math.max(0, totalH - window.innerHeight);
          };

          const startY = window.scrollY || window.pageYOffset || 0;
          const maxScroll = getMaxScroll();
          const clampedTarget = Math.max(0, Math.min(targetY, maxScroll));
          const distance = clampedTarget - startY;

          if (Math.abs(distance) < 2 || duration <= 0) {
            window.scrollTo({ top: clampedTarget, left: 0, behavior: "instant" });
            return resolve({
              scrollY: Math.round(window.scrollY || window.pageYOffset || 0),
              maxScrollY: maxScroll
            });
          }

          const startTime = performance.now();
          function step(now) {
            const elapsed = now - startTime;
            const progress = Math.min(1, elapsed / duration);
            // Cubic ease-out for silky smooth visual movement
            const ease = 1 - Math.pow(1 - progress, 3);
            window.scrollTo({ top: Math.round(startY + distance * ease), left: 0, behavior: "instant" });

            if (progress < 1) {
              requestAnimationFrame(step);
            } else {
              window.scrollTo({ top: clampedTarget, left: 0, behavior: "instant" });
              requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                  setTimeout(() => {
                    resolve({
                      scrollY: Math.round(window.scrollY || window.pageYOffset || 0),
                      maxScrollY: getMaxScroll()
                    });
                  }, 50);
                });
              });
            }
          }
          requestAnimationFrame(step);
        });
      },
      args: [targetY, durationMs]
    });
    return (res && res[0] && res[0].result) ? res[0].result : { scrollY: targetY, maxScrollY: targetY };
  } catch (e) {
    return { scrollY: targetY, maxScrollY: targetY };
  }
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function captureFullPageSmart() {
  const delaySec = screenshotSettings.delay || 0;
  if (delaySec > 0) {
    showToast(`⏳ Hẹn giờ: Chụp toàn trang sau ${delaySec}s...`);
    await new Promise(r => setTimeout(r, delaySec * 1000));
  }
  showToast("⏳ Đang chuẩn bị chụp toàn trang...");
  sendTabMessage({ action: "PREPARE_FULLPAGE_SCROLL" }, async (info) => {
    if (!info) {
      return captureVisibleScreen(); // Fallback
    }

    const { totalHeight, viewportHeight, viewportWidth } = info;

    // Step 0: Ensure scrolled to top (instant)
    await scrollTabTo(0, 0);
    await new Promise(r => setTimeout(r, 140));

    // Capture slice 0 (includes top header/branding naturally)
    const firstDataUrl = await getVisibleTabDataUrl();
    if (!firstDataUrl) {
      return showToast("err_004", "error");
    }

    const firstImg = await loadImage(firstDataUrl);
    const scaleX = firstImg.width / viewportWidth;
    const scaleY = firstImg.height / viewportHeight;

    const canvasW = firstImg.width;
    const initialCanvasH = Math.max(firstImg.height, Math.round(totalHeight * scaleY));

    let currentCanvas = document.createElement("canvas");
    currentCanvas.width = canvasW;
    currentCanvas.height = initialCanvasH;
    let currentCtx = currentCanvas.getContext("2d");

    // Draw slice 0
    currentCtx.drawImage(firstImg, 0, 0);

    let lastDrawnDocY = viewportHeight; // in logical document pixels

    // Hide sticky and fixed elements for all subsequent slices so they never duplicate
    await new Promise(r => sendTabMessage({ action: "HIDE_FIXED_ELEMENTS" }, r));

    let sliceIndex = 1;
    const maxSlices = 60;

    while (lastDrawnDocY < totalHeight && sliceIndex < maxSlices) {
      // Scroll so that lastDrawnDocY is positioned at the top of the viewport
      const scrollResult = await scrollTabTo(Math.round(lastDrawnDocY), 120);
      const actualScrollY = typeof scrollResult.scrollY === "number" ? scrollResult.scrollY : Math.round(lastDrawnDocY);
      const maxScrollY = typeof scrollResult.maxScrollY === "number" ? scrollResult.maxScrollY : totalHeight;

      // Small pause for GPU compositor to settle
      await new Promise(r => setTimeout(r, 70));

      const sliceDataUrl = await getVisibleTabDataUrl();
      if (!sliceDataUrl) break;

      const sliceImg = await loadImage(sliceDataUrl);

      // Where does our unpainted content start in this sliceImg?
      // In sliceImg, y=0 is at document actualScrollY.
      // We need content starting at lastDrawnDocY.
      const srcDocY = Math.max(0, lastDrawnDocY - actualScrollY);
      const srcY = Math.round(srcDocY * scaleY);

      if (srcY >= sliceImg.height) {
        // Reached end of document or no new content revealed
        break;
      }

      const srcH = sliceImg.height - srcY;
      const destY = Math.round(lastDrawnDocY * scaleY);

      // Expand canvas if page grew dynamically during scroll
      if (destY + srcH > currentCanvas.height) {
        const expanded = document.createElement("canvas");
        expanded.width = currentCanvas.width;
        expanded.height = destY + srcH + Math.round(viewportHeight * scaleY);
        const expCtx = expanded.getContext("2d");
        expCtx.drawImage(currentCanvas, 0, 0);
        currentCanvas = expanded;
        currentCtx = expCtx;
      }

      currentCtx.drawImage(
        sliceImg,
        0, srcY, sliceImg.width, srcH,
        0, destY, sliceImg.width, srcH
      );

      lastDrawnDocY += (srcH / scaleY);
      sliceIndex++;

      // If we reached max possible scroll, bottom is reached
      if (actualScrollY >= Math.floor(maxScrollY) - 1) {
        break;
      }
    }

    // Restore fixed elements & smooth scroll back to top
    await new Promise(r => sendTabMessage({ action: "RESTORE_FIXED_ELEMENTS" }, r));
    await scrollTabTo(0, 180);

    // Crop canvas to exact drawn height to eliminate any trailing blank space
    const finalHeight = Math.max(1, Math.round(lastDrawnDocY * scaleY));
    const finalCanvas = document.createElement("canvas");
    finalCanvas.width = currentCanvas.width;
    finalCanvas.height = finalHeight;
    const fctx = finalCanvas.getContext("2d");
    fctx.drawImage(
      currentCanvas,
      0, 0, currentCanvas.width, finalHeight,
      0, 0, currentCanvas.width, finalHeight
    );

    const isJpeg = screenshotSettings.format === "jpeg";
    const fullDataUrl = finalCanvas.toDataURL(isJpeg ? "image/jpeg" : "image/png", 0.92);
    displayScreenshotResult(fullDataUrl);
    if (!screenshotSettings.autoCopy) {
      showToast("✔ Chụp toàn bộ trang hoàn tất, không bị chồng chữ!");
    }
  });
}

function displayScreenshotResult(dataUrl) {
  lastCapturedDataUrl = dataUrl;
  const box = document.getElementById("screenshot-preview-box");
  const img = document.getElementById("screenshot-img");
  if (img) img.src = dataUrl;
  if (box) {
    box.style.display = "block";
    box.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  // Notify webpage of success
  sendTabMessage({ action: "SHOW_PAGE_TOAST", text: "✔ Đã chụp đối tượng thành công!" });

  // Auto-copy to clipboard if enabled
  if (screenshotSettings.autoCopy && dataUrl) {
    try {
      fetch(dataUrl)
        .then(res => res.blob())
        .then(blob => {
          navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]).then(() => {
            showToast("✔ Đã chụp & tự động chép vào Clipboard!");
          }).catch(() => {});
        }).catch(() => {});
    } catch (e) {}
  }
}

// ----------------------------------------------------------------------------
// Element & Table Capture Engine (Scrollable Containers & Tall Tables)
// ----------------------------------------------------------------------------
async function captureChosenElement(info) {
  if (!info) return;

  try {
    const tab = await ensureActiveTab();
    if (!tab || !tab.id) {
      showToast("❌ Không tìm thấy tab hoạt động!");
      return;
    }

    // Delay countdown if user set in screenshot settings
    const delaySec = parseInt(screenshotSettings.delay, 10) || 0;
    if (delaySec > 0) {
      for (let i = delaySec; i > 0; i--) {
        showToast(`⏳ Bắt đầu chụp sau ${i}s...`);
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    showToast("📸 Đang tối ưu và chụp thẻ đối tượng...");

    // 1. Gently ensure element is visible in viewport and retrieve fresh dimensions
    const viewRes = await new Promise(r => sendTabMessage({ action: "SCROLL_ELEMENT_INTO_VIEW" }, r));
    await new Promise(r => setTimeout(r, 100));

    const rect = viewRes?.rect || { left: info.left, top: info.top, width: info.width, height: info.height };
    const vpW = viewRes?.viewportWidth || info.viewportWidth || window.innerWidth;
    const vpH = viewRes?.viewportHeight || info.viewportHeight || window.innerHeight;

    // Case A: Container has internal scrollbars (e.g. table with overflow: auto/scroll)
    // Only enter Case A if element has genuine internal scrollbars and is not the entire viewport/page!
    const hasGenuineScrollX = (info.hasScrollX || viewRes?.hasScrollX) && (info.scrollWidth > info.clientWidth + 15) && (info.clientWidth < vpW * 0.98);
    const hasGenuineScrollY = (info.hasScrollY || viewRes?.hasScrollY) && (info.scrollHeight > info.clientHeight + 15) && (info.clientHeight < vpH * 0.95);

    if (hasGenuineScrollX || hasGenuineScrollY) {
      const totalW = info.scrollWidth;
      const totalH = info.scrollHeight;
      const clientW = info.clientWidth;
      const clientH = info.clientHeight;

      const firstDataUrl = await getVisibleTabDataUrl(tab.windowId);
      if (!firstDataUrl) throw new Error("Không thể chụp khung nhìn trình duyệt");
      const firstImg = await loadImage(firstDataUrl);

      const scaleX = firstImg.width / vpW;
      const scaleY = firstImg.height / vpH;

      const masterCanvas = document.createElement("canvas");
      masterCanvas.width = Math.max(1, Math.round(totalW * scaleX));
      masterCanvas.height = Math.max(1, Math.round(totalH * scaleY));
      const mctx = masterCanvas.getContext("2d");

      const stepX = Math.max(60, clientW - 24);
      const stepY = Math.max(60, clientH - 24);

      for (let curY = 0; curY < totalH; curY += stepY) {
        for (let curX = 0; curX < totalW; curX += stepX) {
          const scrollRes = await new Promise(r => sendTabMessage({
            action: "SCROLL_CAPTURE_TARGET",
            scrollLeft: curX,
            scrollTop: curY,
            hideScrollbars: true
          }, r));

          await new Promise(r => setTimeout(r, 60));

          const sliceDataUrl = await getVisibleTabDataUrl(tab.windowId);
          if (!sliceDataUrl) continue;
          const sliceImg = await loadImage(sliceDataUrl);

          const curRect = scrollRes?.rect || rect;
          const actualX = scrollRes?.actualScrollLeft ?? curX;
          const actualY = scrollRes?.actualScrollTop ?? curY;

          const sliceW = Math.min(clientW, totalW - actualX);
          const sliceH = Math.min(clientH, totalH - actualY);

          // Clamped safe source bounds
          const srcX = Math.max(0, Math.min(sliceImg.width - 1, Math.round(curRect.left * scaleX)));
          const srcY = Math.max(0, Math.min(sliceImg.height - 1, Math.round(curRect.top * scaleY)));
          const srcW = Math.max(1, Math.min(sliceImg.width - srcX, Math.round(sliceW * scaleX)));
          const srcH = Math.max(1, Math.min(sliceImg.height - srcY, Math.round(sliceH * scaleY)));

          const destX = Math.round(actualX * scaleX);
          const destY = Math.round(actualY * scaleY);

          mctx.drawImage(sliceImg, srcX, srcY, srcW, srcH, destX, destY, srcW, srcH);

          if (actualX + clientW >= totalW) break;
        }
        if (curY + clientH >= totalH) break;
      }

      await new Promise(r => sendTabMessage({
        action: "RESTORE_CAPTURE_TARGET",
        origScrollLeft: info.origScrollLeft,
        origScrollTop: info.origScrollTop
      }, r));

      const isJpeg = screenshotSettings.format === "jpeg";
      const dataUrl = masterCanvas.toDataURL(isJpeg ? "image/jpeg" : "image/png", 0.92);
      displayScreenshotResult(dataUrl);
      if (!screenshotSettings.autoCopy) {
        showToast("✔ Đã chụp hoàn chỉnh bảng có thanh cuộn!");
      }
      return;
    }

    // Case B: Tall element spanning beyond viewport on the webpage (e.g. table > 1.2x viewport height)
    if (info.height > vpH * 1.2 && info.height > 600) {
      await new Promise(r => sendTabMessage({ action: "HIDE_FIXED_ELEMENTS" }, r));

      const firstDataUrl = await getVisibleTabDataUrl(tab.windowId);
      if (!firstDataUrl) throw new Error("Không thể chụp khung nhìn trình duyệt");
      const firstImg = await loadImage(firstDataUrl);

      const scaleX = firstImg.width / vpW;
      const scaleY = firstImg.height / vpH;

      const totalH = info.height;
      const masterCanvas = document.createElement("canvas");
      masterCanvas.width = Math.max(1, Math.round(rect.width * scaleX));
      masterCanvas.height = Math.max(1, Math.round(totalH * scaleY));
      const mctx = masterCanvas.getContext("2d");

      let drawnH = 0;
      const stepY = Math.round(vpH * 0.7);
      const baseDocTop = typeof viewRes?.docTop === "number" ? viewRes.docTop : (typeof info.docTop === "number" ? info.docTop : ((rect.top || 0) + (info.origScrollTop || 0)));

      while (drawnH < totalH) {
        await scrollTabTo(baseDocTop + drawnH, 150);
        await new Promise(r => setTimeout(r, 70));

        const sliceDataUrl = await getVisibleTabDataUrl(tab.windowId);
        if (!sliceDataUrl) break;
        const sliceImg = await loadImage(sliceDataUrl);

        const curRectRes = await new Promise(r => sendTabMessage({ action: "GET_CAPTURE_TARGET_RECT" }, r));
        const curRect = curRectRes?.rect || rect;

        const visibleTop = Math.max(0, curRect.top);
        const visibleBottom = Math.min(vpH, curRect.top + curRect.height);
        const visibleH = Math.max(0, visibleBottom - visibleTop);

        if (visibleH > 0) {
          const srcX = Math.max(0, Math.min(sliceImg.width - 1, Math.round(curRect.left * scaleX)));
          const srcY = Math.max(0, Math.min(sliceImg.height - 1, Math.round(visibleTop * scaleY)));
          const srcW = Math.max(1, Math.min(sliceImg.width - srcX, Math.round(curRect.width * scaleX)));
          const srcH = Math.max(1, Math.min(sliceImg.height - srcY, Math.round(visibleH * scaleY)));
          const destY = Math.round(drawnH * scaleY);

          mctx.drawImage(sliceImg, srcX, srcY, srcW, srcH, 0, destY, srcW, srcH);
          drawnH += visibleH;
        } else {
          break;
        }

        if (drawnH >= totalH) break;
      }

      await new Promise(r => sendTabMessage({ action: "RESTORE_FIXED_ELEMENTS" }, r));
      await new Promise(r => sendTabMessage({ action: "RESTORE_CAPTURE_TARGET" }, r));

      const isJpeg = screenshotSettings.format === "jpeg";
      const dataUrl = masterCanvas.toDataURL(isJpeg ? "image/jpeg" : "image/png", 0.92);
      displayScreenshotResult(dataUrl);
      if (!screenshotSettings.autoCopy) {
        showToast("✔ Đã chụp hoàn chỉnh bảng dài vượt trang!");
      }
      return;
    }

    // Case C: Standard element (fits or visible inside viewport) - Clamped safe crop
    const captureDataUrl = await getVisibleTabDataUrl(tab.windowId);
    if (!captureDataUrl) {
      showToast("❌ Không thể chụp hình ảnh màn hình!");
      return;
    }

    const baseImg = await loadImage(captureDataUrl);
    const scaleX = baseImg.width / vpW;
    const scaleY = baseImg.height / vpH;

    // Guaranteed safe bounds within source image
    const sx = Math.max(0, Math.min(baseImg.width - 1, Math.round(rect.left * scaleX)));
    const sy = Math.max(0, Math.min(baseImg.height - 1, Math.round(rect.top * scaleY)));
    const sw = Math.max(1, Math.min(baseImg.width - sx, Math.round(rect.width * scaleX)));
    const sh = Math.max(1, Math.min(baseImg.height - sy, Math.round(rect.height * scaleY)));

    const cropCanvas = document.createElement("canvas");
    cropCanvas.width = sw;
    cropCanvas.height = sh;
    const cctx = cropCanvas.getContext("2d");

    cctx.drawImage(baseImg, sx, sy, sw, sh, 0, 0, sw, sh);

    await new Promise(r => sendTabMessage({ action: "RESTORE_CAPTURE_TARGET" }, r));

    const isJpeg = screenshotSettings.format === "jpeg";
    const finalDataUrl = cropCanvas.toDataURL(isJpeg ? "image/jpeg" : "image/png", 0.92);
    displayScreenshotResult(finalDataUrl);
    if (!screenshotSettings.autoCopy) {
      showToast("✔ Đã chụp thành công đối tượng!");
    }
  } catch (err) {
    console.error("captureChosenElement error:", err); showToast("err_004", "error");
    showToast("❌ Lỗi khi chụp đối tượng: " + (err.message || "Vui lòng thử lại!"));
  }
}

// ----------------------------------------------------------------------------
// Interactive 2-in-1 Snip & Element Marquee Capture
// ----------------------------------------------------------------------------
async function captureSnipRect(msg) {
  if (!msg || !msg.rect) return;

  try {
    const tab = await ensureActiveTab();
    if (!tab || !tab.id) {
      showToast("❌ Không tìm thấy tab hoạt động!");
      return;
    }

    // Delay countdown if user set in screenshot settings
    const delaySec = parseInt(screenshotSettings.delay, 10) || 0;
    if (delaySec > 0) {
      for (let i = delaySec; i > 0; i--) {
        showToast(`⏳ Bắt đầu chụp sau ${i}s...`);
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    showToast("📸 Đang tối ưu và xuất ảnh vùng chọn...");
    await new Promise(r => setTimeout(r, 60));
    const dataUrl = await getVisibleTabDataUrl(tab.windowId);
    if (!dataUrl) throw new Error("Không thể chụp khung nhìn trình duyệt!");

    const baseImg = await loadImage(dataUrl);
    const vpW = msg.viewportWidth || window.innerWidth;
    const vpH = msg.viewportHeight || window.innerHeight;
    const scaleX = baseImg.width / vpW;
    const scaleY = baseImg.height / vpH;

    const sx = Math.max(0, Math.min(baseImg.width - 1, Math.round(msg.rect.left * scaleX)));
    const sy = Math.max(0, Math.min(baseImg.height - 1, Math.round(msg.rect.top * scaleY)));
    const sw = Math.max(1, Math.min(baseImg.width - sx, Math.round(msg.rect.width * scaleX)));
    const sh = Math.max(1, Math.min(baseImg.height - sy, Math.round(msg.rect.height * scaleY)));

    const canvas = document.createElement("canvas");
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(baseImg, sx, sy, sw, sh, 0, 0, sw, sh);

    const isJpeg = screenshotSettings.format === "jpeg";
    const finalDataUrl = canvas.toDataURL(isJpeg ? "image/jpeg" : "image/png", 0.92);
    displayScreenshotResult(finalDataUrl);

    if (!screenshotSettings.autoCopy) {
      showToast("✔ Đã chụp thành công vùng chọn!");
    }
  } catch (err) {
    console.error("captureSnipRect error:", err); showToast("err_004", "error");
    showToast("❌ Lỗi chụp vùng chọn: " + (err.message || "Vui lòng thử lại!"));
  }
}

// ----------------------------------------------------------------------------
// Tab 3: Screen & Tab Video Recording Engine (WebM)
// ----------------------------------------------------------------------------
let mediaRecorder = null;
let recordedChunks = [];
let recordStream = null;
let recordTimerInterval = null;
let recordStartTime = 0;
let lastRecordedVideoBlob = null;
let lastRecordedVideoUrl = null;
let isFinishingRecording = false;

let videoSettings = {
  audio: false,
  autoDownload: false,
  resolution: "1080",
  fps: "30",
  countdown: "3"
};

let audioCtx = null;
function playBeep(freq = 520, duration = 140) {
  try {
    const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtxClass) return;
    if (!audioCtx) {
      audioCtx = new AudioCtxClass();
    }
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.18, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + (duration / 1000));
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + (duration / 1000));
  } catch (e) {}
}

let isVideoCountdownActive = false;
let isVideoCountdownCancelled = false;

function cleanUpCountdown() {
  isVideoCountdownActive = false;
  const countdownOverlay = document.getElementById("video-countdown-overlay");
  if (countdownOverlay) countdownOverlay.style.display = "none";
  sendTabMessage({ action: "HIDE_PAGE_COUNTDOWN" });
}

function cancelVideoCountdown() {
  if (!isVideoCountdownActive) return;
  isVideoCountdownCancelled = true;
  cleanUpCountdown();
  if (recordStream) {
    try {
      recordStream.getTracks().forEach(track => track.stop());
    } catch (e) {}
    recordStream = null;
  }
  showToast("✕ Đã hủy quay video!");
}

function loadVideoSettings() {
  storGet("super_video_settings", (res) => {
    if (res && res.super_video_settings) {
      videoSettings = { ...videoSettings, ...res.super_video_settings };
    }
    const audioCheck = document.getElementById("video-pref-audio");
    const autoDlCheck = document.getElementById("video-pref-autodownload");
    const resSelect = document.getElementById("video-pref-resolution");
    const fpsSelect = document.getElementById("video-pref-fps");
    const cdSelect = document.getElementById("video-pref-countdown");

    if (audioCheck) audioCheck.checked = !!videoSettings.audio;
    if (autoDlCheck) autoDlCheck.checked = !!videoSettings.autoDownload;
    if (resSelect) resSelect.value = videoSettings.resolution || "1080";
    if (fpsSelect) fpsSelect.value = videoSettings.fps || "30";
    if (cdSelect) cdSelect.value = (videoSettings.countdown !== undefined ? videoSettings.countdown : "3").toString();
  });
}

function saveVideoSettings() {
  const audioCheck = document.getElementById("video-pref-audio");
  const autoDlCheck = document.getElementById("video-pref-autodownload");
  const resSelect = document.getElementById("video-pref-resolution");
  const fpsSelect = document.getElementById("video-pref-fps");
  const cdSelect = document.getElementById("video-pref-countdown");

  videoSettings.audio = audioCheck ? audioCheck.checked : false;
  videoSettings.autoDownload = autoDlCheck ? autoDlCheck.checked : false;
  videoSettings.resolution = resSelect ? resSelect.value : "1080";
  videoSettings.fps = fpsSelect ? fpsSelect.value : "30";
  videoSettings.countdown = cdSelect ? cdSelect.value : "3";

  storSet({ super_video_settings: videoSettings }, () => {
    const statusEl = document.getElementById("video-settings-status");
    if (statusEl) {
      statusEl.textContent = window.i18n ? window.i18n.t("toast_settings_saved") : "✓ Đã lưu cài đặt!";
      statusEl.style.color = "#38bdf8";
      setTimeout(() => {
        statusEl.textContent = window.i18n ? window.i18n.t("toast_autosave") : "💾 Tự động lưu";
        statusEl.style.color = "#10b981";
      }, 1500);
    }
  });
}

function formatRecordDuration(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

async function startVideoRecording() {
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      showToast("❌ Trình duyệt không hỗ trợ getDisplayMedia!");
      return;
    }

    // Build constraints based on user settings
    const videoConstraints = {};
    if (videoSettings.fps) {
      const fpsNum = parseInt(videoSettings.fps, 10) || 30;
      videoConstraints.frameRate = { ideal: fpsNum, max: fpsNum };
    }
    if (videoSettings.resolution === "1080") {
      videoConstraints.width = { ideal: 1920 };
      videoConstraints.height = { ideal: 1080 };
    } else if (videoSettings.resolution === "720") {
      videoConstraints.width = { ideal: 1280 };
      videoConstraints.height = { ideal: 720 };
    }

    const displayMediaOptions = {
      video: Object.keys(videoConstraints).length > 0 ? videoConstraints : true
    };

    // Only request audio track if explicitly enabled by user
    if (videoSettings.audio) {
      displayMediaOptions.audio = true;
    }

    const stream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);

    recordStream = stream;
    recordedChunks = [];
    isFinishingRecording = false;

    // Detect supported mimeType
    let mimeType = "video/webm";
    if (typeof MediaRecorder !== "undefined") {
      if (videoSettings.audio) {
        if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")) {
          mimeType = "video/webm;codecs=vp9,opus";
        } else if (MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")) {
          mimeType = "video/webm;codecs=vp8,opus";
        }
      } else {
        if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9")) {
          mimeType = "video/webm;codecs=vp9";
        } else if (MediaRecorder.isTypeSupported("video/webm;codecs=vp8")) {
          mimeType = "video/webm;codecs=vp8";
        }
      }
    }

    mediaRecorder = new MediaRecorder(stream, { mimeType });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        recordedChunks.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      finishRecording();
    };

    // When browser bar "Stop sharing" is clicked, stop immediately
    stream.getTracks().forEach(track => {
      track.addEventListener("ended", () => {
        stopVideoRecording();
      });
    });

    // Countdown check if user set countdown (e.g. 3s or 5s)
    const countdownSec = parseInt(videoSettings.countdown, 10) || 0;
    if (countdownSec > 0) {
      isVideoCountdownActive = true;
      isVideoCountdownCancelled = false;

      const countdownOverlay = document.getElementById("video-countdown-overlay");
      const countdownNumber = document.getElementById("sidebar-countdown-number");
      if (countdownOverlay) countdownOverlay.style.display = "flex";
      if (countdownNumber) countdownNumber.textContent = countdownSec.toString();

      // Show countdown HUD in the active webpage
      sendTabMessage({ action: "SHOW_PAGE_COUNTDOWN", seconds: countdownSec });

      for (let i = countdownSec; i >= 1; i--) {
        if (isVideoCountdownCancelled) {
          cleanUpCountdown();
          return;
        }
        if (countdownNumber) countdownNumber.textContent = i.toString();
        sendTabMessage({ action: "UPDATE_PAGE_COUNTDOWN", value: i });
        playBeep(520, 140);
        await new Promise(r => setTimeout(r, 1000));
      }

      if (isVideoCountdownCancelled) {
        cleanUpCountdown();
        return;
      }

      // Finish countdown cue: High chime
      playBeep(880, 260);
      if (countdownNumber) countdownNumber.textContent = "GO!";
      sendTabMessage({ action: "UPDATE_PAGE_COUNTDOWN", value: "GO!" });
      await new Promise(r => setTimeout(r, 350));

      cleanUpCountdown();
    }

    mediaRecorder.start(500); // 500ms data slices

    // Update UI
    const startBtn = document.getElementById("btn-start-record");
    const activeBar = document.getElementById("recording-active-bar");
    const previewBox = document.getElementById("video-preview-box");
    const audioStatus = document.getElementById("record-audio-status");

    if (startBtn) startBtn.style.display = "none";
    if (activeBar) activeBar.style.display = "block";
    if (previewBox) previewBox.style.display = "none";
    if (audioStatus) {
      audioStatus.textContent = videoSettings.audio ? "(Có âm thanh tab)" : "(Không lưu âm thanh)";
      audioStatus.style.color = videoSettings.audio ? "#a7f3d0" : "#cbd5e1";
    }

    recordStartTime = Date.now();
    const timerText = document.getElementById("record-timer");
    if (timerText) timerText.textContent = "00:00";
    recordTimerInterval = setInterval(() => {
      const elapsedSec = Math.floor((Date.now() - recordStartTime) / 1000);
      if (timerText) timerText.textContent = formatRecordDuration(elapsedSec);
    }, 500);

    showToast(videoSettings.audio ? "🎥 Đang quay video (Kèm âm thanh)..." : "🎥 Đang quay video (Không âm thanh)...");
  } catch (err) {
    if (err && err.name !== "NotAllowedError") {
      console.error("Recording error:", err); showToast("err_004", "error");
      showToast("err_004", "error");
    }
  }
}

// Resilient stop recording: halts tracks first so MediaRecorder closes instantly without hanging
function stopVideoRecording() {
  if (recordStream) {
    try {
      recordStream.getTracks().forEach(track => track.stop());
    } catch (e) {}
  }

  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    try {
      mediaRecorder.requestData();
    } catch (e) {}
    try {
      mediaRecorder.stop();
    } catch (e) {}
  }

  // Safety timer in case onstop event doesn't fire promptly
  setTimeout(() => {
    if (document.getElementById("recording-active-bar")?.style.display !== "none") {
      finishRecording();
    }
  }, 200);
}

function finishRecording() {
  if (isFinishingRecording) return;
  isFinishingRecording = true;

  clearInterval(recordTimerInterval);
  const activeBar = document.getElementById("recording-active-bar");
  const startBtn = document.getElementById("btn-start-record");
  if (activeBar) activeBar.style.display = "none";
  if (startBtn) startBtn.style.display = "inline-flex";

  if (recordStream) {
    try {
      recordStream.getTracks().forEach(t => t.stop());
    } catch (e) {}
    recordStream = null;
  }

  if (recordedChunks.length > 0) {
    if (lastRecordedVideoUrl) {
      URL.revokeObjectURL(lastRecordedVideoUrl);
    }
    lastRecordedVideoBlob = new Blob(recordedChunks, { type: "video/webm" });
    lastRecordedVideoUrl = URL.createObjectURL(lastRecordedVideoBlob);

    const videoPlayer = document.getElementById("video-player");
    if (videoPlayer) {
      videoPlayer.src = lastRecordedVideoUrl;
    }
    const previewBox = document.getElementById("video-preview-box");
    if (previewBox) {
      previewBox.style.display = "block";
    }

    const elapsedSec = Math.max(1, Math.floor((Date.now() - recordStartTime) / 1000));
    const sizeMb = (lastRecordedVideoBlob.size / (1024 * 1024)).toFixed(2);
    const infoText = document.getElementById("video-info-text");
    if (infoText) {
      infoText.textContent = `⏱️ ${formatRecordDuration(elapsedSec)} • 📦 ${sizeMb} MB • WebM`;
    }

    showToast("✔ Đã hoàn tất và lưu video!");

    // Auto-download video if enabled
    if (videoSettings.autoDownload) {
      setTimeout(() => {
        downloadRecordedVideo();
      }, 300);
    }
  } else {
    showToast("⚠️ Chưa có dữ liệu video được ghi.");
  }

  setTimeout(() => {
    isFinishingRecording = false;
  }, 400);
}

function cancelVideoRecording() {
  clearInterval(recordTimerInterval);
  isFinishingRecording = false;
  if (mediaRecorder) {
    try {
      mediaRecorder.ondataavailable = null;
      mediaRecorder.onstop = null;
      if (mediaRecorder.state !== "inactive") {
        mediaRecorder.stop();
      }
    } catch (e) {}
  }
  if (recordStream) {
    try {
      recordStream.getTracks().forEach(t => t.stop());
    } catch (e) {}
    recordStream = null;
  }
  recordedChunks = [];
  const activeBar = document.getElementById("recording-active-bar");
  const startBtn = document.getElementById("btn-start-record");
  if (activeBar) activeBar.style.display = "none";
  if (startBtn) startBtn.style.display = "inline-flex";
  showToast("✕ Đã hủy quay video!");
}

function discardRecordedVideo() {
  if (lastRecordedVideoUrl) {
    URL.revokeObjectURL(lastRecordedVideoUrl);
    lastRecordedVideoUrl = null;
  }
  lastRecordedVideoBlob = null;
  recordedChunks = [];
  const previewBox = document.getElementById("video-preview-box");
  if (previewBox) previewBox.style.display = "none";
  const videoPlayer = document.getElementById("video-player");
  if (videoPlayer) videoPlayer.src = "";
  showToast("🗑️ Đã xóa bản quay video!");
}

function downloadRecordedVideo() {
  if (!lastRecordedVideoUrl) return;
  const cleanTitle = (currentMeta.title || "web_video")
    .replace(/[^\w\s\u00C0-\u024F\u1E00-\u1EFF]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .slice(0, 32);
  const a = document.createElement("a");
  a.href = lastRecordedVideoUrl;
  a.download = `video_${cleanTitle || "capture"}_${Date.now()}.webm`;
  a.click();
}

// ----------------------------------------------------------------------------
// Initialization
// ----------------------------------------------------------------------------
function onReady(fn) {
  if (document.readyState !== "loading") {
    fn();
  } else {
    document.addEventListener("DOMContentLoaded", fn);
  }
}

onReady(() => {
  // Main Tabs navigation
  document.querySelectorAll(".main-nav-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".main-nav-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-section").forEach(s => s.classList.remove("active"));
      btn.classList.add("active");
      const sec = document.getElementById(btn.dataset.target);
      if (sec) sec.classList.add("active");
    });
  });

  // Citation Sub-Tabs (Tab 1 only)
  document.querySelectorAll("#tab-cite .sub-tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#tab-cite .sub-tab-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentCitationTab = btn.dataset.tab;
      updateCitationDisplay();
      if (citationSettings.autoCopy) {
        const txt = document.getElementById("citation-text")?.textContent || "";
        if (navigator.clipboard?.writeText) {
          navigator.clipboard.writeText(txt).then(() => showToast("✓ Đã tự động sao chép!")).catch(() => {});
        }
      }
    });
  });

  // Live input sync
  ["f-source-type", "f-authors", "f-title", "f-date", "f-container", "f-doi", "f-pages", "f-url", "f-tag", "f-notes"].forEach(id => {
    document.getElementById(id)?.addEventListener("input", syncMetaFromInputs);
  });

  // Copy citation with instant visual button feedback
  document.getElementById("btn-copy-cite")?.addEventListener("click", () => {
    const txt = document.getElementById("citation-text")?.textContent || "";
    const btn = document.getElementById("btn-copy-cite");
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(txt).then(() => {
        if (btn) {
          const origText = btn.textContent;
          btn.textContent = window.i18n ? window.i18n.t("btn_copied") : "✓ Đã sao chép!";
          btn.style.background = "linear-gradient(135deg, #10b981 0%, #059669 100%)";
          setTimeout(() => {
            btn.textContent = origText;
            btn.style.background = "";
          }, 1400);
        }
        showToast(`✓ Đã sao chép (${(currentCitationTab || "").toUpperCase()})!`);
      }).catch(() => {
        showToast("⚠️ Không thể sao chép vào bộ nhớ tạm");
      });
    }
  });

  // Re-read current page metadata (clean reload)
  document.getElementById("btn-refresh-cite")?.addEventListener("click", async () => {
    const btnRefresh = document.getElementById("btn-refresh-cite");
    if (btnRefresh) {
      btnRefresh.querySelector("svg").style.transition = "transform 0.5s ease";
      btnRefresh.querySelector("svg").style.transform = "rotate(360deg)";
      setTimeout(() => { btnRefresh.querySelector("svg").style.transform = ""; }, 500);
    }
    showToast(typeof getI18nText === "function" ? getI18nText("toast_syncing") : "Đang tải lại thông tin...");

    // Discard any draft from storage for this URL so live page data is cleanly restored
    const dKey = getDraftKey();
    if (dKey) {
      storRemove(dKey);
    }
    const draftBanner = document.getElementById("draft-banner");
    if (draftBanner) draftBanner.style.display = "none";

    await syncActiveTabData(true, true);
    showToast(typeof getI18nText === "function" ? getI18nText("toast_sync_done") : "✓ Đã cập nhật trích dẫn mới!");
  });

  // Local PDF Upload & Drag-and-drop
  const inputPdf = document.getElementById("input-local-pdf-file");
  const btnUploadPdf = document.getElementById("btn-upload-local-pdf");
  if (btnUploadPdf && inputPdf) {
    btnUploadPdf.addEventListener("click", () => {
      inputPdf.click();
    });
    inputPdf.addEventListener("change", (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      showToast(`⏳ Đang đọc tệp PDF: ${file.name}...`);
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const buf = evt.target.result;
          const meta = parsePdfBuffer(buf, file.name);
          currentMeta = {
            ...currentMeta,
            sourceType: "pdf",
            title: meta.title || cleanPdfFilenameToTitle("", file.name),
            authors: meta.authors || "",
            date: meta.date || "",
            container: meta.container || "Tài liệu cục bộ (PDF)",
            pages: "",
            url: file.name,
            doi: ""
          };
          originalExtractedMeta = { ...currentMeta };
          syncInputs();
          updateCitationDisplay();
          showToast(`✓ Đã nạp thông tin từ file ${file.name}!`);
        } catch (err) {
          console.error("Local PDF parsing error:", err); showToast("err_005", "error");
          showToast("⚠️ Không thể trích xuất metadata từ tệp PDF này.");
        }
      };
      reader.readAsArrayBuffer(file);
    });
  }

  // Drag & drop PDF files directly into citation box
  const citeBox = document.getElementById("citation-text");
  if (citeBox) {
    citeBox.addEventListener("dragover", (e) => {
      e.preventDefault();
      citeBox.style.borderColor = "#38bdf8";
      citeBox.style.background = "rgba(56, 189, 248, 0.08)";
    });
    citeBox.addEventListener("dragleave", () => {
      citeBox.style.borderColor = "";
      citeBox.style.background = "";
    });
    citeBox.addEventListener("drop", (e) => {
      e.preventDefault();
      citeBox.style.borderColor = "";
      citeBox.style.background = "";
      const file = e.dataTransfer.files?.[0];
      if (file && (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"))) {
        showToast(`⏳ Đang đọc tệp PDF: ${file.name}...`);
        const reader = new FileReader();
        reader.onload = (evt) => {
          try {
            const buf = evt.target.result;
            const meta = parsePdfBuffer(buf, file.name);
            currentMeta = {
              ...currentMeta,
              sourceType: "pdf",
              title: meta.title || cleanPdfFilenameToTitle("", file.name),
              authors: meta.authors || "",
              date: meta.date || "",
              container: meta.container || "Tài liệu cục bộ (PDF)",
              pages: "",
              url: file.name,
              doi: ""
            };
            originalExtractedMeta = { ...currentMeta };
            syncInputs();
            updateCitationDisplay();
            showToast(`✓ Đã nạp thông tin từ file ${file.name}!`);
          } catch (err) {
            console.error("Local PDF drag parsing error:", err); showToast("err_005", "error");
            showToast("⚠️ Không thể trích xuất metadata từ tệp PDF này.");
          }
        };
        reader.readAsArrayBuffer(file);
      }
    });
  }

  // Author Rules Guide Modal
  document.getElementById("btn-show-author-rules")?.addEventListener("click", () => {
    const m = document.getElementById("author-rules-modal");
    if (m) m.style.display = "block";
  });
  document.getElementById("btn-close-author-rules")?.addEventListener("click", () => {
    const m = document.getElementById("author-rules-modal");
    if (m) m.style.display = "none";
  });

  // Trust, Standards & Privacy Modal
  const trustModal = document.getElementById("trust-modal");
  document.getElementById("btn-open-trust")?.addEventListener("click", () => {
    if (trustModal) trustModal.style.display = "block";
  });
  document.getElementById("btn-close-trust")?.addEventListener("click", () => {
    if (trustModal) trustModal.style.display = "none";
  });
  trustModal?.addEventListener("click", (e) => {
    if (e.target === trustModal) trustModal.style.display = "none";
  });
  // -----------------------------------------
  // Cookie Manager: Raw String (Copy / Import)
  // -----------------------------------------
  document.getElementById("btn-copy-raw-cookie")?.addEventListener("click", async () => {
    if (!currentTabUrl) return showToast("toast_cookie_export_no_url", "warning");
    try {
      const cookiesApi = (typeof browser !== "undefined" && browser.cookies) ? browser.cookies : (typeof chrome !== "undefined" ? chrome.cookies : null);
      if (!cookiesApi) return showToast("toast_cookie_export_no_api", "error");
      
      const cookies = await cookiesApi.getAll({ url: currentTabUrl });
      if (!cookies || cookies.length === 0) return showToast("toast_cookie_export_empty", "warning");
      
      const rawString = cookies.map(c => `${c.name}=${c.value}`).join("; ");
      const textarea = document.getElementById("cookie-raw-text");
      if (textarea) textarea.value = rawString;
      
      await navigator.clipboard.writeText(rawString);
      showToast(`✓ Đã Copy ${cookies.length} cookie dưới dạng chuỗi!`);
    } catch (e) {
      console.error(e);
      showToast("toast_cookie_export_error", "error");
    }
  });

  document.getElementById("btn-import-raw-cookie")?.addEventListener("click", async () => {
    if (!currentTabUrl) return showToast("toast_cookie_export_no_url", "warning");
    const rawString = document.getElementById("cookie-raw-text")?.value.trim();
    if (!rawString) return showToast("⚠️ Vui lòng dán chuỗi cookie (key=value;...) vào khung trước!", "warning");
    
    try {
      const cookiesApi = (typeof browser !== "undefined" && browser.cookies) ? browser.cookies : (typeof chrome !== "undefined" ? chrome.cookies : null);
      if (!cookiesApi) return showToast("toast_cookie_export_no_api", "error");
      
      const pairs = rawString.split(";").map(s => s.trim()).filter(s => s.length > 0);
      let successCount = 0;
      const urlObj = new URL(currentTabUrl);
      const domain = urlObj.hostname;
      const urlStr = urlObj.origin + "/";
      
      const setPromises = pairs.map(async (pair) => {
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
      successCount = results.filter(r => r).length;
      showToast(`✓ Đã nhập thành công ${successCount} cookie từ chuỗi!`);
      const tabsApi = (typeof browser !== "undefined" && browser.tabs) ? browser.tabs : (typeof chrome !== "undefined" ? chrome.tabs : null);
      if (tabsApi && currentTabObj?.id) tabsApi.reload(currentTabObj.id);
    } catch (e) {
      console.error(e);
      showToast("toast_cookie_import_error", "error");
    }
  });

  // -----------------------------------------
  // Cookie Manager: Import & Export JSON
  // -----------------------------------------
  document.getElementById("btn-export-cookie")?.addEventListener("click", async () => {
    if (!currentTabUrl) return showToast("toast_cookie_export_no_url", "warning");
    try {
      const cookiesApi = (typeof browser !== "undefined" && browser.cookies) ? browser.cookies : (typeof chrome !== "undefined" ? chrome.cookies : null);
      if (!cookiesApi) return showToast("toast_cookie_export_no_api", "error");
      
      const cookies = await cookiesApi.getAll({ url: currentTabUrl });
      if (!cookies || cookies.length === 0) return showToast("toast_cookie_export_empty", "warning");
      
      const blob = new Blob([JSON.stringify(cookies, null, 2)], { type: "application/json;charset=utf-8" });
      const u = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = u;
      const domain = new URL(currentTabUrl).hostname;
      a.download = `cookies_${domain}_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(u);
      showToast("toast_cookie_export_success", "success", [cookies.length]);
    } catch (e) {
      console.error(e);
      showToast("toast_cookie_export_error", "error");
    }
  });

  const btnImportCookie = document.getElementById("btn-import-cookie");
  if (btnImportCookie) {
    let cookieInput = document.getElementById("input-cookie-file");
    if (!cookieInput) {
      cookieInput = document.createElement("input");
      cookieInput.type = "file";
      cookieInput.accept = ".json,application/json";
      cookieInput.style.display = "none";
      document.body.appendChild(cookieInput);
    }
    
    btnImportCookie.addEventListener("click", () => cookieInput.click());
    cookieInput.addEventListener("change", (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const cookiesApi = (typeof browser !== "undefined" && browser.cookies) ? browser.cookies : (typeof chrome !== "undefined" ? chrome.cookies : null);
          if (!cookiesApi) throw new Error("No API");
          
          const cookies = JSON.parse(evt.target.result);
          if (!Array.isArray(cookies)) throw new Error("Invalid format");
          
          let successCount = 0;
          const setPromises = cookies.map(async (c) => {
            let url = "http" + (c.secure ? "s" : "") + "://" + c.domain.replace(/^\./, "") + c.path;
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
          successCount = results.filter(r => r).length;
          showToast("toast_cookie_import_success", "success", [successCount, cookies.length]);
          
          // Optionally reload the tab to apply cookies
          const tabsApi = (typeof browser !== "undefined" && browser.tabs) ? browser.tabs : (typeof chrome !== "undefined" ? chrome.tabs : null);
          if (tabsApi && currentTabObj?.id) {
            tabsApi.reload(currentTabObj.id);
          }
        } catch (err) {
          console.error(err);
          showToast("toast_cookie_import_error", "error");
        }
        cookieInput.value = ""; // Reset
      };
      reader.readAsText(file);
    });
  }



  // Open Sidebar / Side Panel from Popup
  document.getElementById("btn-open-sidebar")?.addEventListener("click", () => {
    try {
      if (typeof chrome !== "undefined" && chrome.runtime) {
        chrome.runtime.sendMessage({ action: "OPEN_IN_PAGE_SIDEBAR" });
      } else if (typeof browser !== "undefined" && browser.runtime) {
        browser.runtime.sendMessage({ action: "OPEN_IN_PAGE_SIDEBAR" });
      }
    } catch (e) {}
    if (document.body.classList.contains("is-popup")) {
      setTimeout(() => window.close(), 100);
    }
  });

  // Privacy Policy Link
  document.getElementById("link-privacy-policy")?.addEventListener("click", (e) => {
    e.preventDefault();
    const curLang = (window.i18n && window.i18n.getCurrentLanguage) ? window.i18n.getCurrentLanguage() : "vi";
    const tabsApi = (typeof browser !== "undefined" && browser.tabs) ? browser.tabs : (typeof chrome !== "undefined" ? chrome.tabs : null);
    const runtimeApi = (typeof browser !== "undefined" && browser.runtime) ? browser.runtime : (typeof chrome !== "undefined" ? chrome.runtime : null);
    if (tabsApi && runtimeApi) {
      tabsApi.create({ url: runtimeApi.getURL(`OS/html/privacy.html?lang=${curLang}`) });
    } else {
      window.open(`privacy.html?lang=${curLang}`, "_blank");
    }
  });

  // Save current citation to bibliography
  document.getElementById("btn-save-biblio")?.addEventListener("click", saveCurrentToBiblio);

  // Open & Close Bibliography Modal
  document.getElementById("btn-open-biblio")?.addEventListener("click", () => {
    const bm = document.getElementById("biblio-modal");
    if (bm) bm.style.display = "block";
    renderBiblioModalList();
  });
  document.getElementById("btn-close-biblio")?.addEventListener("click", () => {
    const bm = document.getElementById("biblio-modal");
    if (bm) bm.style.display = "none";
  });

  // Search filter inside modal
  document.getElementById("biblio-search-input")?.addEventListener("input", (e) => {
    currentModalFilter = e.target.value;
    renderBiblioModalList();
  });

  // Modal Style Selector Tabs
  ["ieee", "apa", "harvard", "bibtex", "mla"].forEach(tabKey => {
    document.getElementById(`modal-tab-${tabKey}`)?.addEventListener("click", () => {
      ["ieee", "apa", "harvard", "bibtex", "mla"].forEach(k => {
        document.getElementById(`modal-tab-${k}`)?.classList.toggle("active", k === tabKey);
      });
      currentModalTab = tabKey;
      renderBiblioModalList();
    });
  });

  // Modal Bulk Action Buttons
  document.getElementById("btn-copy-all-biblio")?.addEventListener("click", copyAllBiblio);
  document.getElementById("btn-export-bib-all")?.addEventListener("click", exportBibAll);
  document.getElementById("btn-export-txt-all")?.addEventListener("click", exportTxtAll);
  document.getElementById("btn-clear-all-biblio")?.addEventListener("click", clearAllBiblio);

  // Citation Customization Settings Auto-Save
  document.getElementById("cite-pref-accessed")?.addEventListener("change", saveCitationSettings);
  document.getElementById("cite-pref-remove-diacritics")?.addEventListener("change", saveCitationSettings);
  document.getElementById("cite-pref-author-style")?.addEventListener("change", saveCitationSettings);
  document.getElementById("cite-pref-date-style")?.addEventListener("change", saveCitationSettings);
  document.getElementById("cite-pref-autocopy")?.addEventListener("change", saveCitationSettings);

  // Quick action author buttons (Bỏ dấu & In hoa)
  document.getElementById("btn-quick-nodiacritics")?.addEventListener("click", () => {
    const el = document.getElementById("f-authors");
    if (el && el.value) {
      el.value = removeVietnameseDiacritics(el.value);
      currentMeta.authors = el.value;
      updateCitationDisplay();
      saveDraft();
      showToast("✓ Đã chuyển sang không dấu!");
    }
  });

  document.getElementById("btn-quick-uppercase")?.addEventListener("click", () => {
    const el = document.getElementById("f-authors");
    if (el && el.value) {
      el.value = removeVietnameseDiacritics(el.value).toUpperCase();
      currentMeta.authors = el.value;
      updateCitationDisplay();
      saveDraft();
      showToast("✓ Đã in hoa toàn bộ!");
    }
  });

  // Download .bib
  document.getElementById("btn-download-bib")?.addEventListener("click", () => {
    const bib = buildBibtexCitation(currentMeta);
    const blob = new Blob([bib], { type: "text/plain;charset=utf-8" });
    const u = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = u;
    a.download = `${generateBibtexKey(currentMeta.authors, currentMeta.date, currentMeta.title)}.bib`;
    a.click();
    URL.revokeObjectURL(u);
  });

  // Reset draft
  document.getElementById("btn-reset-draft")?.addEventListener("click", () => {
    storRemove(getDraftKey(), () => {
      if (originalExtractedMeta) {
        currentMeta = { ...originalExtractedMeta };
        syncInputs();
        updateCitationDisplay();
      }
      const db = document.getElementById("draft-banner");
      if (db) db.style.display = "none";
      showToast("✓ Đã đặt lại từ trang gốc!");
    });
  });

  // Tab 2: Redaction Controls - Separate Buttons
  document.getElementById("btn-start-inspect")?.addEventListener("click", () => {
    isInspectMode = true;
    updateInspectButtonsUI();
    // If redactions were paused, unpause so newly picked redactions are immediately visible
    if (isRedactionsPaused) {
      isRedactionsPaused = false;
      updateRedactionVisibilityUI();
      sendTabMessage({ action: "TOGGLE_REDACTIONS_PAUSE", paused: false });
    }
    sendTabMessage({
      action: "START_INSPECT",
      style: currentRedactStyle,
      blurPx: currentBlurPx
    }, (res) => {
      if (res && Array.isArray(res.list)) {
        const rc = document.getElementById("redact-count");
        if (rc) rc.textContent = res.count || 0;
        renderRedactedList(res.list);
      }
      showToast("🎯 Đã bật chế độ chọn che đối tượng!");
    });
  });

  document.getElementById("btn-stop-inspect")?.addEventListener("click", () => {
    isInspectMode = false;
    updateInspectButtonsUI();
    sendTabMessage({ action: "STOP_INSPECT" }, () => {
      showToast("⏹️ Đã tắt chọn đối tượng!");
    });
  });

  document.getElementById("btn-enable-redactions")?.addEventListener("click", () => {
    if (!isRedactionsPaused) {
      showToast("🙈 Che đối tượng đang bật rồi!");
      return;
    }
    isRedactionsPaused = false;
    updateRedactionVisibilityUI();
    sendTabMessage({ action: "TOGGLE_REDACTIONS_PAUSE", paused: false }, () => {
      showToast("🙈 Đã bật lại che đối tượng!");
    });
  });

  document.getElementById("btn-disable-redactions")?.addEventListener("click", () => {
    if (isRedactionsPaused) {
      showToast("👁️ Đang ở chế độ xem trang gốc rồi!");
      return;
    }
    isRedactionsPaused = true;
    updateRedactionVisibilityUI();
    sendTabMessage({ action: "TOGGLE_REDACTIONS_PAUSE", paused: true }, () => {
      showToast("👁️ Đã tắt che (Đang xem trang gốc)");
    });
  });

  document.querySelectorAll('input[name="redact-style"]').forEach(r => {
    r.addEventListener("change", (e) => {
      currentRedactStyle = e.target.value;
      const sliderBox = document.getElementById("blur-slider-box");
      sliderBox.style.display = currentRedactStyle === "blur" ? "block" : "none";
      sendTabMessage({
        action: "SET_REDACT_STYLE",
        style: currentRedactStyle,
        blurPx: currentBlurPx,
        applyToLast: true
      });
    });
  });

  const blurSlider = document.getElementById("blur-slider");
  blurSlider?.addEventListener("input", (e) => {
    currentBlurPx = parseInt(e.target.value, 10);
    const bvt = document.getElementById("blur-val-text");
    if (bvt) bvt.textContent = `${currentBlurPx}px`;
    sendTabMessage({
      action: "SET_REDACT_STYLE",
      style: currentRedactStyle,
      blurPx: currentBlurPx
    });
  });

  document.getElementById("btn-apply-all-style")?.addEventListener("click", () => {
    sendTabMessage({
      action: "APPLY_STYLE_TO_ALL",
      style: currentRedactStyle,
      blurPx: currentBlurPx
    }, (res) => {
      if (res && res.list) renderRedactedList(res.list);
      showToast("✓ Đã đổi tất cả phần tử sang kiểu mới!");
    });
  });

  document.getElementById("btn-undo-redact")?.addEventListener("click", () => {
    sendTabMessage({ action: "UNDO_REDACT" }, (res) => {
      if (res) {
        const rc = document.getElementById("redact-count");
        if (rc) rc.textContent = res.count || 0;
        renderRedactedList(res.list || []);
      }
    });
  });

  document.getElementById("btn-clear-redact")?.addEventListener("click", () => {
    if (confirm("Khôi phục lại trang gốc và xóa tất cả phần tử đang che?")) {
      sendTabMessage({ action: "CLEAR_ALL_REDACT" }, () => {
        const rc = document.getElementById("redact-count");
        if (rc) rc.textContent = 0;
        isRedactionsPaused = false;
        updateRedactionVisibilityUI();
        renderRedactedList([]);
        showToast("✓ Đã khôi phục trang gốc!");
      });
    }
  });

  // ESC key to cancel inspect mode or element capture when focused in sidebar
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (isInspectMode) {
        isInspectMode = false;
        updateInspectButtonsUI();
        sendTabMessage({ action: "STOP_INSPECT" });
        showToast("⏹️ Đã tắt chế độ chọn che!");
      }
      if (isElementCapturePicking) {
        isElementCapturePicking = false;
        const banner = document.getElementById("element-cap-active-banner");
        if (banner) banner.style.display = "none";
        sendTabMessage({ action: "STOP_ELEMENT_CAPTURE" });
        showToast("⏹️ Đã hủy chọn chụp bảng!");
      }
      const modal = document.getElementById("biblio-modal");
      if (modal && modal.style.display === "block") {
        modal.style.display = "none";
      }
      const trustM = document.getElementById("trust-modal");
      if (trustM && trustM.style.display === "block") {
        trustM.style.display = "none";
      }
      const authorM = document.getElementById("author-rules-modal");
      if (authorM && authorM.style.display === "block") {
        authorM.style.display = "none";
      }
    }
  });

  // Tab 3: Element Capture Controls
  document.getElementById("btn-cap-element")?.addEventListener("click", async () => {
    const tab = await ensureActiveTab();
    if (!tab || !tab.id) return showToast("❌ Không tìm thấy tab hoạt động!");
    await ensureContentScriptInjected(tab.id);
    isElementCapturePicking = true;
    const banner = document.getElementById("element-cap-active-banner");
    if (banner) banner.style.display = "block";
    sendTabMessage({ action: "START_ELEMENT_CAPTURE" }, () => {
      showToast("🎯 Hãy rê chuột và click vào bảng hoặc thẻ cần chụp!");
    });
  });

  document.getElementById("btn-cancel-cap-element")?.addEventListener("click", () => {
    isElementCapturePicking = false;
    const banner = document.getElementById("element-cap-active-banner");
    if (banner) banner.style.display = "none";
    sendTabMessage({ action: "STOP_ELEMENT_CAPTURE" });
    showToast("⏹️ Đã hủy chọn đối tượng!");
  });

  // Tab 3: Standard Screenshot Controls
  document.getElementById("btn-cap-visible")?.addEventListener("click", captureVisibleScreen);
  document.getElementById("btn-cap-fullpage")?.addEventListener("click", captureFullPageSmart);

  document.getElementById("btn-copy-screenshot")?.addEventListener("click", async () => {
    if (!lastCapturedDataUrl) return;
    try {
      const res = await fetch(lastCapturedDataUrl);
      const blob = await res.blob();
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      showToast("✔ Đã copy ảnh vào Clipboard!");
    } catch (e) {
      showToast("err_009", "error");
    }
  });

  document.getElementById("btn-download-screenshot")?.addEventListener("click", () => {
    if (!lastCapturedDataUrl) return;
    const isJpeg = screenshotSettings.format === "jpeg";
    const ext = isJpeg ? "jpg" : "png";
    const cleanTitle = (currentMeta.title || "screenshot")
      .replace(/[^\w\s\u00C0-\u024F\u1E00-\u1EFF]/g, "")
      .trim()
      .replace(/\s+/g, "_")
      .slice(0, 32);
    const a = document.createElement("a");
    a.href = lastCapturedDataUrl;
    a.download = `screenshot_${cleanTitle || "capture"}_${Date.now()}.${ext}`;
    a.click();
  });

  // Tab 3: Screenshot Settings Auto-Save
  document.getElementById("cap-pref-autocopy")?.addEventListener("change", saveScreenshotSettings);
  document.getElementById("cap-pref-format")?.addEventListener("change", saveScreenshotSettings);
  document.getElementById("cap-pref-delay")?.addEventListener("change", saveScreenshotSettings);

  // Tab 3: Screen & Tab Video Recording Controls
  document.getElementById("btn-start-record")?.addEventListener("click", startVideoRecording);
  document.getElementById("btn-stop-record")?.addEventListener("click", stopVideoRecording);
  document.getElementById("btn-cancel-record")?.addEventListener("click", cancelVideoRecording);
  document.getElementById("btn-download-video")?.addEventListener("click", downloadRecordedVideo);
  document.getElementById("btn-discard-video")?.addEventListener("click", discardRecordedVideo);

  // Video Settings Auto-Save
  document.getElementById("video-pref-audio")?.addEventListener("change", saveVideoSettings);
  document.getElementById("video-pref-autodownload")?.addEventListener("change", saveVideoSettings);
  document.getElementById("video-pref-resolution")?.addEventListener("change", saveVideoSettings);
  document.getElementById("video-pref-fps")?.addEventListener("change", saveVideoSettings);
  document.getElementById("video-pref-countdown")?.addEventListener("change", saveVideoSettings);

  document.getElementById("btn-cancel-countdown")?.addEventListener("click", cancelVideoCountdown);

  // Dual-Web Linked Tabs Controls & Shortcut
  document.getElementById("btn-quick-swap-tabs")?.addEventListener("click", swapDualTabs);
  document.getElementById("btn-swap-arrow")?.addEventListener("click", swapDualTabs);
  document.getElementById("pill-tab-b")?.addEventListener("click", swapDualTabs);
  document.getElementById("btn-toggle-tab-picker")?.addEventListener("click", toggleDualTabDropdown);
  document.getElementById("select-linked-tab")?.addEventListener("change", async (e) => {
    const selectedTabId = parseInt(e.target.value, 10);
    if (!selectedTabId) return;
    const tabsApi = (typeof browser !== "undefined" && browser.tabs) ? browser.tabs : (typeof chrome !== "undefined" ? chrome.tabs : null);
    if (tabsApi) {
      try {
        const tab = await tabsApi.get(selectedTabId);
        if (tab) {
          linkedTabObj = tab;
          updateDualTabsUI();
          toggleDualTabDropdown();
          showToast(`✓ Đã liên kết với: ${(tab.title || "Tab").slice(0, 24)}... (Alt+Q)`);
        }
      } catch (err) {}
    }
  });

  // Global Alt+Q inside sidebar
  window.addEventListener("keydown", (e) => {
    if (e.altKey && (e.key === "q" || e.key === "Q")) {
      e.preventDefault();
      swapDualTabs();
    }
  });

  // Listen for updates from content script (Firefox + Chrome compatible)
  const _sidebarRuntimeApi = (typeof browser !== "undefined" && browser.runtime) ? browser.runtime
    : ((typeof chrome !== "undefined" && chrome.runtime) ? chrome.runtime : null);
  if (_sidebarRuntimeApi && _sidebarRuntimeApi.onMessage) {
    _sidebarRuntimeApi.onMessage.addListener((msg) => {
    if (msg.type === "REDACTION_UPDATED") {
      const rc = document.getElementById("redact-count");
      if (rc) rc.textContent = msg.count || 0;
      if (Array.isArray(msg.list)) renderRedactedList(msg.list);
    } else if (msg.type === "INSPECT_MODE_CHANGED") {
      isInspectMode = msg.active;
      updateInspectButtonsUI();
    } else if (msg.type === "REDACTION_PAUSE_CHANGED") {
      isRedactionsPaused = msg.isPaused;
      updateRedactionVisibilityUI();
    } else if (msg.type === "ELEMENT_CAPTURE_CHOSEN") {
      isElementCapturePicking = false;
      const banner = document.getElementById("element-cap-active-banner");
      if (banner) banner.style.display = "none";
      captureChosenElement(msg.info);
    } else if (msg.type === "SNIP_RECT_CHOSEN") {
      isElementCapturePicking = false;
      const banner = document.getElementById("element-cap-active-banner");
      if (banner) banner.style.display = "none";
      captureSnipRect(msg);
    } else if (msg.type === "ELEMENT_CAPTURE_CANCELLED") {
      isElementCapturePicking = false;
      const banner = document.getElementById("element-cap-active-banner");
      if (banner) banner.style.display = "none";
      showToast("Đã dừng chọn đối tượng!");
    } else if (msg.type === "SPA_URL_CHANGED" || msg.type === "PAGE_NAVIGATED") {
      clearTimeout(tabUpdateTimer);
      tabUpdateTimer = setTimeout(() => {
        syncActiveTabData(true);
      }, 350);
    } else if (msg.type === "SWAP_DUAL_TABS_REQUEST") {
      swapDualTabs();
    }
  });
  }

  // Function to sync metadata and redactions for currently active tab
  async function syncActiveTabData(forceReset = false, ignoreDraft = false) {
    const tab = await ensureActiveTab();
    if (!tab || !tab.id) return;

    // Dual-Web Switcher: Track tab transition
    if (currentTabObj && currentTabObj.id !== tab.id) {
      linkedTabObj = currentTabObj;
    }
    currentTabObj = tab;
    updateDualTabsUI();

    const isDifferentUrl = currentTabUrl !== (tab.url || "");
    const wasEmpty = !currentTabUrl || !currentMeta.title;
    currentTabUrl = tab.url || "";

    if (forceReset || isDifferentUrl || wasEmpty) {
      currentMeta = {
        title: tab.title && tab.title !== "Untitled" ? tab.title : "",
        authors: "",
        year: "",
        date: "",
        journal: "",
        volume: "",
        issue: "",
        pages: "",
        doi: "",
        url: currentTabUrl,
        container: "",
        sourceType: "webpage"
      };
      originalExtractedMeta = { ...currentMeta };
      syncInputs();
      updateCitationDisplay();
    }

    if (isPdfUrl(currentTabUrl)) {
      const pdfMeta = await extractPdfMetadataFromUrl(currentTabUrl, tab.title);
      if (pdfMeta) {
        currentMeta = { ...currentMeta, ...pdfMeta };
        originalExtractedMeta = { ...currentMeta };
        if (!ignoreDraft) {
          checkDraft(originalExtractedMeta || currentMeta);
        }
        syncInputs();
        updateCitationDisplay();
      }
    } else {
      const extracted = await sendTabMessage({ action: "EXTRACT_PAGE_METADATA" });
      if (extracted && (extracted.title || extracted.authors || extracted.date || extracted.container || extracted.doi)) {
        currentMeta = { ...currentMeta, ...extracted };
        if (Array.isArray(currentMeta.authors)) {
          currentMeta.authors = currentMeta.authors.filter(Boolean).join(", ");
        }
        if (!currentMeta.title && tab.title) {
          currentMeta.title = tab.title;
        }
        originalExtractedMeta = { ...currentMeta };
      } else if (!currentMeta.title && tab.title) {
        currentMeta.title = tab.title;
        currentMeta.url = tab.url || currentTabUrl;
        originalExtractedMeta = { ...currentMeta };
      }

      // Secondary fallback for YouTube: SPA navigation leaves stale DOM. Fetch HTML directly for accurate date/author.
      if (currentTabUrl && (currentTabUrl.includes("youtube.com/watch") || currentTabUrl.includes("youtu.be/"))) {
        try {
          const ytHtmlRes = await fetch(currentTabUrl);
          if (ytHtmlRes.ok) {
            const htmlText = await ytHtmlRes.text();
            
            // Extract Date
            const mDate = htmlText.match(/meta itemprop="startDate" content="([^"]+)"/) || htmlText.match(/meta itemprop="datePublished" content="([^"]+)"/) || htmlText.match(/meta itemprop="uploadDate" content="([^"]+)"/);
            if (mDate && mDate[1]) {
              let rawDate = mDate[1];
              let parsedDate = "";
              if (rawDate.includes("T")) {
                const d = new Date(rawDate);
                if (!isNaN(d.getTime())) {
                  parsedDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
                }
              }
              if (!parsedDate || parsedDate.length < 4) {
                const p = rawDate.split("T")[0];
                if (p.length >= 4) parsedDate = p;
              }
              if (parsedDate) currentMeta.date = parsedDate; // FORCE OVERWRITE
            }
            
            // Extract Author
            const mAuth = htmlText.match(/<link itemprop="name" content="([^"]+)">/) || htmlText.match(/"author"\s*:\s*"([^"]+)"/);
            if (mAuth && mAuth[1]) {
              currentMeta.authors = mAuth[1]; // FORCE OVERWRITE
            }

            // Extract Title
            const mTitle = htmlText.match(/meta name="title" content="([^"]+)"/);
            if (mTitle && mTitle[1]) {
              currentMeta.title = mTitle[1]; // FORCE OVERWRITE
            }
            
            originalExtractedMeta = { ...currentMeta };
          }
        } catch (e) {
          console.warn("YouTube direct fetch fallback failed:", e);
        }
      }

      if (!ignoreDraft) {
        checkDraft(originalExtractedMeta || currentMeta);
      }
      syncInputs();
      updateCitationDisplay();
    }

    const status = await sendTabMessage({ action: "GET_REDACT_STATUS" });
    if (status) {
      const rCount = document.getElementById("redact-count");
      if (rCount) rCount.textContent = status.count || 0;
      isInspectMode = status.isInspectMode || false;
      isRedactionsPaused = status.isRedactionsPaused || false;
      updateInspectButtonsUI();
      updateRedactionVisibilityUI();
      renderRedactedList(status.list || []);
    }
  }

  // Auto-sync when switching tabs or refreshing page (critical for persistent Firefox sidebar & YouTube SPA navigation)
  let tabUpdateTimer = null;
  const tabsApi = (typeof browser !== "undefined" && browser.tabs) ? browser.tabs : (typeof chrome !== "undefined" ? chrome.tabs : null);
  if (tabsApi?.onActivated) {
    tabsApi.onActivated.addListener((activeInfo) => {
      activeTabId = activeInfo.tabId;
      syncActiveTabData(true);
    });
  }
  if (tabsApi?.onUpdated) {
    tabsApi.onUpdated.addListener((tabId, changeInfo) => {
      if (tabId === activeTabId && (changeInfo.status === "complete" || changeInfo.url || changeInfo.title)) {
        clearTimeout(tabUpdateTimer);
        tabUpdateTimer = setTimeout(() => {
          syncActiveTabData(true);
        }, 400);
      }
    });
  }
  const windowsApi = (typeof browser !== "undefined" && browser.windows) ? browser.windows : (typeof chrome !== "undefined" ? chrome.windows : null);
  if (windowsApi?.onFocusChanged) {
    windowsApi.onFocusChanged.addListener((windowId) => {
      if (windowId !== windowsApi.WINDOW_ID_NONE) {
        clearTimeout(tabUpdateTimer);
        tabUpdateTimer = setTimeout(() => {
          syncActiveTabData(true);
        }, 300);
      }
    });
  }

  // Detect if running inside a Popup window
  if (window.location.pathname.endsWith("popup.html") || window.location.search.includes("view=popup")) {
    document.body.classList.add("is-popup");
  }

  // Listen for language switch event
  window.addEventListener("app-language-changed", (e) => {
    syncCustomSelects();
    updateCitationDisplay();
    if (currentMeta) {
      updateSourceBadges(currentMeta.sourceType, currentMeta.container);
    }
    if (verifiedResultData) {
      renderVerifyResult(verifiedResultData, document.getElementById("verify-input")?.value || "");
    }
    updateInspectButtonsUI();
    updateRedactionVisibilityUI();
    renderBiblioModalList();
    updateDualTabsUI();
    populateDualTabDropdown();

    // Notify active content script about the language update
    const tabsApi = (typeof browser !== "undefined" && browser.tabs) ? browser.tabs : (typeof chrome !== "undefined" ? chrome.tabs : null);
    if (tabsApi && activeTabId) {
      try {
        const p = tabsApi.sendMessage(activeTabId, { action: "SET_LANGUAGE", lang: e.detail?.lang });
        if (p && typeof p.catch === "function") {
          p.catch(() => {});
        }
      } catch (err) {}
    }

    const toastMsg = window.i18n ? window.i18n.t("toast_lang_changed") : null;
    if (toastMsg) {
      showToast(toastMsg);
    }
  });

  
  const verEl = document.getElementById("app-version-display");
  if (verEl && typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.getManifest) {
    const m = chrome.runtime.getManifest();
    if (m && m.version) verEl.textContent = "v" + m.version;
  }
  // Initial Sync
  try { updateInspectButtonsUI(); } catch (e) { console.warn(e); }
  try { updateRedactionVisibilityUI(); } catch (e) { console.warn(e); }
  try { initCustomSelects(); } catch (e) { console.warn(e); }
  try { loadCitationSettings(); } catch (e) { console.warn(e); }
  try { initSourceVerifier(); } catch (e) { console.warn(e); }
  try { loadSavedBibliographies(); } catch (e) { console.warn(e); }
  try { loadScreenshotSettings(); } catch (e) { console.warn(e); }
  try { loadVideoSettings(); } catch (e) { console.warn(e); }
  try { syncActiveTabData(true); } catch (e) { console.warn(e); }
});
