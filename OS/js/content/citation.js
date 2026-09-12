// 4-Tier Academic Citation Extractor Engine
  // --------------------------------------------------------------------------
  function extractPageCitationMetadata() {
    const doc = document;
    const url = window.location.href;
    const hostname = window.location.hostname;

    let sourceType = "webpage";
    let title = "";
    let authors = [];
    let date = "";
    let fallbackModifiedDate = "";
    let container = "";
    let doi = "";
    let pages = "";

    const cleanStr = (s) => (s || "")
          .replace(/[\r\n\t]+/g, " ") // Tiêu diệt triệt để ký tự xuống dòng và tab
          .replace(/\s+/g, " ") // Thu gọn khoảng trắng thừa
          .replace(/^(by|written by|posted by|author|tác giả|theo|ảnh)\s*[:\-–]?\s*/i, "")
          .replace(/\s*[-–|]\s*(the hacker news|techcrunch|the verge|reuters|bbc|vnexpress|dân trí|tuổi trẻ).*$/i, "")
          .trim();

    const VIETNAMESE_SURNAMES = new Set([
      "nguyễn", "nguyen", "trần", "tran", "lê", "le", "phạm", "pham", "hoàng", "hoang",
      "huỳnh", "huynh", "phan", "vũ", "vu", "võ", "vo", "đặng", "dang", "bùi", "bui",
      "đỗ", "do", "hồ", "ho", "ngô", "ngo", "dương", "duong", "lý", "ly", "đào", "dao",
      "đoàn", "doan", "vương", "vuong", "trịnh", "trinh", "đinh", "dinh", "lâm", "lam",
      "phùng", "phung", "mai", "tô", "to", "hà", "ha", "tạ", "ta", "trương", "truong",
      "quách", "quach", "thân", "than", "tăng", "tang", "la", "lưu", "luu"
    ]);

    const normalizeAuthorDisplayName = (name) => {
      if (!name || typeof name !== "string") return "";
      let s = cleanStr(name);
      if (!s) return "";
      s = s.replace(/,\s*(jr\.?|sr\.?|iii|ii|iv)(?=\s*,|\s*$)/gi, " $1");
      if (s.includes(",")) {
        const p = s.split(",");
        if (p.length === 2) {
          const last = p[0].trim();
          const first = p[1].trim();
          if (last && first) {
            const lastClean = last.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();
            const isVn = VIETNAMESE_SURNAMES.has(last.toLowerCase()) || VIETNAMESE_SURNAMES.has(lastClean);
            return isVn ? `${last} ${first}`.trim() : `${first} ${last}`.trim();
          }
        }
      }
      return s;
    };

    const cleanDateStr = (raw) => {
      if (!raw) return "";
      let s = raw.toString().trim();
      if (!s) return "";

      // 0. Unix timestamp (seconds: 10 digits, or millis: 13 digits)
      if (/^\d{10}$/.test(s)) {
        const d = new Date(parseInt(s, 10) * 1000);
        if (!isNaN(d.getTime()) && d.getFullYear() >= 1990 && d.getFullYear() <= 2035) {
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        }
      }
      if (/^\d{13}$/.test(s)) {
        const d = new Date(parseInt(s, 10));
        if (!isNaN(d.getTime()) && d.getFullYear() >= 1990 && d.getFullYear() <= 2035) {
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        }
      }

      // Check if string contains multiple dates with explicit "published" vs "updated" labels
      const pubSectionMatch = s.match(/(?:ngày\s*đăng|đăng\s*(?:ngày|lúc)?|xuất\s*bản|công\s*bố|published\s*(?:on|at)?|posted\s*(?:on|at)?|дата\s*публикации|опубликовано|发布时间|发布于|公開日|更新日|release\s*date)\s*[:\-–,]?\s*([^|\n–—]+?)(?=(?:\s*[-–—|•]\s*(?:cập\s*nhật|updated|modified|last\s*modified|last\s*updated))|\s*$)/i);
      if (pubSectionMatch) {
        s = pubSectionMatch[1].trim();
      }

      // 1. Full ISO timestamp (e.g. "2009-10-24T23:57:33-07:00" or "2026-09-05T22:57:50Z" or "2024/05/18")
      const isoYmdMatch = s.match(/\b(19\d\d|20\d\d)[-/.](\d{1,2})[-/.](\d{1,2})(?:T|\s|$|[^\d])/);
      if (isoYmdMatch) {
        const y = isoYmdMatch[1];
        const m = isoYmdMatch[2].padStart(2, "0");
        const d = isoYmdMatch[3].padStart(2, "0");
        if (parseInt(m, 10) >= 1 && parseInt(m, 10) <= 12 && parseInt(d, 10) >= 1 && parseInt(d, 10) <= 31) {
          return `${y}-${m}-${d}`;
        }
      }

      // 2. Remove prefixes in Vietnamese, English, French, Spanish, Russian, Chinese, Japanese
      s = s.replace(/^(?:updated\s*(?:on|at)?|published\s*(?:on|at)?|posted\s*(?:on|at)?|modified\s*(?:on|at)?|uploaded\s*on|streamed\s*live\s*(?:on)?|streamed\s*(?:on)?|premiered\s*(?:on)?|đã\s*công\s*chiếu\s*(?:vào)?|đã\s*phát\s*trực\s*tiếp\s*(?:vào)?|công\s*chiếu\s*(?:vào)?|phát\s*trực\s*tiếp\s*(?:vào)?|đã\s*tải\s*lên\s*(?:vào)?|xuất bản|ngày đăng|đăng lúc|cập nhật|thứ\s+[a-z0-9]+|chủ nhật|monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun|опубликовано|дата\s*публикации|发布时间|发布于|公開日)\s*[:\-–,]?\s*/i, "").trim();

      // 3. Relative dates
      const now = new Date();
      if (/(\d+)\s*(?:giờ|phút|giây|hours?|mins?|minutes?|secs?|seconds?|часов?|минут?|小时|分钟|分前|時間前)\s*(?:trước|ago|назад|前)/i.test(s) || /vừa xong|just now|только что|刚刚/i.test(s)) {
        return now.toISOString().split("T")[0];
      }
      const relDayMatch = s.match(/(\d+)\s*(?:ngày\s*trước|days?\s*ago|дней\s*назад|дня\s*назад|день\s*назад|天前|日前)/i);
      if (relDayMatch) {
        const d = new Date(now.getTime() - parseInt(relDayMatch[1], 10) * 86400000);
        return d.toISOString().split("T")[0];
      }
      const relWeekMatch = s.match(/(\d+)\s*(?:tuần\s*trước|weeks?\s*ago|недел[ьия]\s*назад|周前|週間前)/i);
      if (relWeekMatch) {
        const d = new Date(now.getTime() - parseInt(relWeekMatch[1], 10) * 7 * 86400000);
        return d.toISOString().split("T")[0];
      }
      const relMonthMatch = s.match(/(\d+)\s*(?:tháng\s*trước|months?\s*ago|месяц(?:ев|а)?\s*назад|个月前|ヶ月前)/i);
      if (relMonthMatch) {
        const d = new Date(now.getFullYear(), now.getMonth() - parseInt(relMonthMatch[1], 10), now.getDate());
        return d.toISOString().split("T")[0];
      }
      const relYearMatch = s.match(/(\d+)\s*(?:năm\s*trước|years?\s*ago|лет\s*назад|года?\s*назад|年前)/i);
      if (relYearMatch) {
        const yr = now.getFullYear() - parseInt(relYearMatch[1], 10);
        return `${yr}`;
      }
      if (/hôm qua|yesterday|вчера|昨天|昨日/i.test(s)) {
        const d = new Date(now.getTime() - 86400000);
        return d.toISOString().split("T")[0];
      }

      // 4. Chinese & Japanese: 2024年5月18日 or 2024年05月
      const cjMatch = s.match(/\b(19\d\d|20\d\d)\s*年\s*(\d{1,2})\s*月(?:\s*(\d{1,2})\s*日)?/);
      if (cjMatch) {
        const y = cjMatch[1];
        const m = cjMatch[2].padStart(2, "0");
        if (cjMatch[3]) {
          const d = cjMatch[3].padStart(2, "0");
          return `${y}-${m}-${d}`;
        }
        return `${y}-${m}`;
      }

      // 5. Vietnamese phrase: "ngày 06 tháng 09 năm 2026", "16 thg 8, 2026", "tháng ba, 2024"
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

      // 6. Multi-language Month Names (English, Russian, French, German, Spanish/Portuguese)
      const allMonths = {
        jan: "01", january: "01", feb: "02", february: "02", mar: "03", march: "03", apr: "04", april: "04",
        may: "05", jun: "06", june: "06", jul: "07", july: "07", aug: "08", august: "08", sep: "09", sept: "09",
        september: "09", oct: "10", october: "10", nov: "11", november: "11", dec: "12", december: "12",
        "января": "01", "январь": "01", "янв": "01",
        "февраля": "02", "февраль": "02", "фев": "02",
        "марта": "03", "март": "03", "мар": "03",
        "апреля": "04", "апрель": "04", "апр": "04",
        "мая": "05", "май": "05",
        "июня": "06", "июнь": "06", "июн": "06",
        "июля": "07", "июль": "07", "июл": "07",
        "августа": "08", "август": "08", "авг": "08",
        "сентября": "09", "сентябрь": "09", "сен": "09", "сент": "09",
        "октября": "10", "октябрь": "10", "окт": "10",
        "ноября": "11", "ноябрь": "11", "ноя": "11",
        "декабря": "12", "декабрь": "12", "дек": "12",
        "janvier": "01", "enero": "01", "janeiro": "01", "januar": "01",
        "février": "02", "febrero": "02", "fevereiro": "02", "februar": "02",
        "mars": "03", "marzo": "03", "março": "03", "märz": "03",
        "avril": "04", "abril": "04",
        "mai": "05", "mayo": "05", "maio": "05",
        "juin": "06", "junio": "06", "junho": "06", "juni": "06",
        "juillet": "07", "julio": "07", "julho": "07", "juli": "07",
        "août": "08", "agosto": "08",
        "septembre": "09", "setiembre": "09", "setembro": "09",
        "octobre": "10", "octubre": "10", "outubro": "10", "oktober": "10",
        "novembre": "11", "noviembre": "11", "novembro": "11",
        "décembre": "12", "diciembre": "12", "dezembro": "12", "dezember": "12"
      };

      const monthKeysRegex = Object.keys(allMonths).sort((a, b) => b.length - a.length).join("|");

      // Format: "Month DD, YYYY" (e.g. September 12, 2026)
      const mMatch1 = s.match(new RegExp(`\\b(${monthKeysRegex})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(19\\d\\d|20\\d\\d)\\b`, "i"));
      if (mMatch1) {
        const m = allMonths[mMatch1[1].toLowerCase().replace(".", "")];
        const d = mMatch1[2].padStart(2, "0");
        const y = mMatch1[3];
        if (m) return `${y}-${m}-${d}`;
      }

      // Format: "DD Month YYYY" or "DD de Month de YYYY" or "15. April 2023"
      const mMatch2 = s.match(new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th|\\.)?\\s*(?:de|d[\x27\x60])?\\s*(${monthKeysRegex})\\.?\\s*(?:de|,)?\\s+(19\\d\\d|20\\d\\d)\\b`, "i"));
      if (mMatch2) {
        const d = mMatch2[1].padStart(2, "0");
        const m = allMonths[mMatch2[2].toLowerCase().replace(".", "")];
        const y = mMatch2[3];
        if (m) return `${y}-${m}-${d}`;
      }

      // Format: "YYYY, Month DD" or "YYYY Month DD"
      const mMatchYmd = s.match(new RegExp(`\\b(19\\d\\d|20\\d\\d),?\\s+(${monthKeysRegex})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b`, "i"));
      if (mMatchYmd) {
        const y = mMatchYmd[1];
        const m = allMonths[mMatchYmd[2].toLowerCase().replace(".", "")];
        const d = mMatchYmd[3].padStart(2, "0");
        if (m) return `${y}-${m}-${d}`;
      }

      // Format: Month + Year: "September 2026" or "мая 2024"
      const mMatch3 = s.match(new RegExp(`\\b(${monthKeysRegex})\\.?\\s*,?\\s+(19\\d\\d|20\\d\\d)\\b`, "i"));
      if (mMatch3) {
        const m = allMonths[mMatch3[1].toLowerCase().replace(".", "")];
        const y = mMatch3[2];
        if (m) return `${y}-${m}`;
      }

      // 7. Day-Month-Year: "06/09/2026", "6.9.2026", "06-09-2026"
      const dmyMatch = s.match(/\b(\d{1,2})[./-](\d{1,2})[./-](19\d\d|20\d\d)\b/);
      if (dmyMatch) {
        const d = dmyMatch[1].padStart(2, "0");
        const m = dmyMatch[2].padStart(2, "0");
        const y = dmyMatch[3];
        if (parseInt(m, 10) >= 1 && parseInt(m, 10) <= 12 && parseInt(d, 10) >= 1 && parseInt(d, 10) <= 31) {
          return `${y}-${m}-${d}`;
        }
      }

      // 8. Year-Month: "2024-05", "2024/05", "2024.05"
      const ymMatch = s.match(/\b(19\d\d|20\d\d)[-/.](\d{1,2})\b/);
      if (ymMatch) {
        const y = ymMatch[1];
        const m = ymMatch[2].padStart(2, "0");
        if (parseInt(m, 10) >= 1 && parseInt(m, 10) <= 12) {
          return `${y}-${m}`;
        }
      }

      // 9. Year only fallback
      const yMatch = s.match(/\b(19\d\d|20\d\d)\b/);
      if (yMatch) return yMatch[1];

      return "";
    };

    // 0. Special extractor for arXiv
    if (hostname.includes("arxiv.org")) {
      const arxivAuthors = Array.from(doc.querySelectorAll(".authors a"))
        .map(el => cleanStr(el.innerText || el.textContent))
        .filter(Boolean);
      if (arxivAuthors.length > 0) {
        authors = arxivAuthors;
      }
    }

    // 1. Highwire Press & Dublin Core Tags
    doc.querySelectorAll('meta[name="citation_author"], meta[name="DC.creator"], meta[name="dc.creator"]').forEach(n => {
      const c = n.getAttribute("content");
      if (c && !c.startsWith("http")) {
        const norm = normalizeAuthorDisplayName(cleanStr(c));
        if (norm && !authors.includes(norm)) authors.push(norm);
      }
    });

    // 1. Ưu tiên quét thẻ h1 hiển thị trực tiếp trên giao diện để xuyên qua Paywall
    const visibleH1 = doc.querySelector("h1.title, h1.article-title, h1.post-title, main h1, article h1, h1");
    if (visibleH1) {
      const h1Text = visibleH1.innerText.trim();
      // Chặn nội dung rác nếu thẻ h1 bị thay bằng thông báo hệ thống
      if (h1Text.length > 5 && !/đăng nhập|login|sign in|subscribe|vui lòng/i.test(h1Text)) {
        title = h1Text;
      }
    }

    // 2. Fallback về thuật toán quét thẻ meta cũ của bạn nếu chưa bắt được
    if (!title) {
      const titleCandidates = doc.querySelectorAll('meta[name="citation_title" i], meta[name="DC.Title" i]');
      for (const tag of titleCandidates) {
        const c = (tag.getAttribute("content") || "").trim();
        // Nâng cấp: Đưa thêm bộ lọc chặn từ khóa rác vào logic gốc của bạn
        if (c.length > 2 && !/đăng nhập|login|sign in|subscribe/i.test(c)) {
          if (!title) title = c;
          if (doc.title && (doc.title.toLowerCase().includes(c.toLowerCase()) || c.toLowerCase().includes(doc.title.toLowerCase()))) {
            title = c;
            break;
          }
        }
      }
    }

    const tagDate = doc.querySelector([
      'meta[name="citation_publication_date" i]',
      'meta[name="citation_date" i]',
      'meta[name="citation_online_date" i]',
      'meta[name="citation_cover_date" i]',
      'meta[name="citation_year" i]',
      'meta[property="citation_publication_date" i]',
      'meta[property="citation_date" i]',
      'meta[property="citation_year" i]',
      'meta[name="prism.publicationDate" i]',
      'meta[name="prism.coverDate" i]',
      'meta[name="prism.creationDate" i]',
      'meta[name="DC.date" i]',
      'meta[name="dc.date" i]',
      'meta[name="DC.date.issued" i]',
      'meta[name="dc.date.issued" i]',
      'meta[name="DC.Date.created" i]',
      'meta[name="dc.date.created" i]',
      'meta[name="dcterms.issued" i]',
      'meta[name="dcterms.date" i]',
      'meta[name="dcterms.created" i]',
      'meta[property="article:published_time" i]',
      'meta[name="article:published_time" i]',
      'meta[property="og:published_time" i]',
      'meta[name="pubdate" i]',
      'meta[name="publishdate" i]',
      'meta[name="publish_date" i]',
      'meta[name="publication_date" i]',
      'meta[name="sailthru.date" i]',
      'meta[name="parsely-pub-date" i]',
      'meta[name="parsely-date" i]',
      'meta[name="rnews:datePublished" i]',
      'meta[name="cXenseParse:recs:publishtime" i]',
      'meta[itemprop="datePublished" i]',
      'meta[itemprop="dateCreated" i]',
      'meta[name="date" i]'
    ].join(', '));
    if (tagDate) date = cleanDateStr(tagDate.getAttribute("content") || tagDate.getAttribute("value") || "");

    const tagJournal = doc.querySelector('meta[name="citation_journal_title"], meta[name="citation_conference_title"], meta[name="citation_publisher"], meta[name="citation_series_title"], meta[name="DC.Source"], meta[name="dc.source"], meta[name="DC.Publisher"], meta[name="dc.publisher"]');
    if (tagJournal) container = (tagJournal.getAttribute("content") || "").trim();

    const tagDoi = doc.querySelector('meta[name="citation_doi"], meta[name="DC.identifier"]');
    if (tagDoi) {
      const val = tagDoi.getAttribute("content") || "";
      if (val.includes("10.") || val.startsWith("10.")) doi = val.replace(/^doi:/i, "").trim();
    }

    const tagFirstPage = doc.querySelector('meta[name="citation_firstpage"]');
    const tagLastPage = doc.querySelector('meta[name="citation_lastpage"]');
    const tagVol = doc.querySelector('meta[name="citation_volume"]');
    const tagIssue = doc.querySelector('meta[name="citation_issue"]');
    if (tagVol || tagIssue || tagFirstPage) {
      let pList = [];
      if (tagVol) pList.push(`vol. ${tagVol.getAttribute("content")}`);
      if (tagIssue) pList.push(`no. ${tagIssue.getAttribute("content")}`);
      if (tagFirstPage) {
        if (tagLastPage) pList.push(`pp. ${tagFirstPage.getAttribute("content")}-${tagLastPage.getAttribute("content")}`);
        else pList.push(`p. ${tagFirstPage.getAttribute("content")}`);
      }
      pages = pList.join(", ");
    }

    // 2. Schema.org JSON-LD (Search all nodes in graph & deep nested trees)
    doc.querySelectorAll('script[type="application/ld+json"]').forEach(s => {
      try {
        const raw = JSON.parse(s.innerText || s.textContent || "");
        
        // Deep collector for all objects inside JSON-LD
        const collectObjects = (node, acc = []) => {
          if (!node || typeof node !== "object") return acc;
          if (Array.isArray(node)) {
            node.forEach(n => collectObjects(n, acc));
            return acc;
          }
          acc.push(node);
          if (node["@graph"]) collectObjects(node["@graph"], acc);
          if (node.mainEntity) collectObjects(node.mainEntity, acc);
          if (node.about) collectObjects(node.about, acc);
          if (node.article) collectObjects(node.article, acc);
          if (node.hasPart) collectObjects(node.hasPart, acc);
          return acc;
        };

        const items = collectObjects(raw);
        items.sort((a, b) => {
          const aType = (a?.["@type"] || "").toString().toLowerCase();
          const bType = (b?.["@type"] || "").toString().toLowerCase();
          const aIsArt = aType.includes("article") || aType.includes("news") || aType.includes("post") || aType.includes("report");
          const bIsArt = bType.includes("article") || bType.includes("news") || bType.includes("post") || bType.includes("report");
          return (bIsArt ? 1 : 0) - (aIsArt ? 1 : 0);
        });

        for (const item of items) {
          if (!item || typeof item !== "object") continue;
          const type = (item["@type"] || "").toString();
          if (type.includes("Article") || type.includes("News") || type.includes("Post") || type.includes("Report") || type.includes("Paper") || type.includes("WebPage") || type.includes("Blog") || item.datePublished || item.headline) {
            if (authors.length === 0 && item.author) {
              const list = Array.isArray(item.author) ? item.author : [item.author];
              for (const a of list) {
                const aName = typeof a === "string" ? a : (a && a.name ? a.name : "");
                const c = normalizeAuthorDisplayName(cleanStr(aName));
                if (c && !c.startsWith("http") && !authors.includes(c)) authors.push(c);
              }
            }
            if (!title && (item.headline || item.name)) title = (item.headline || item.name).trim();
            if (!date) {
              const dRaw = item.datePublished || item.publishedAt || item.publishDate || item.publicationDate || item.dateCreated || item.uploadDate || item.releaseDate;
              const dVal = typeof dRaw === "object" && dRaw !== null ? (dRaw["@value"] || dRaw.text || "") : dRaw;
              if (dVal) {
                const parsedD = cleanDateStr(dVal);
                if (parsedD) date = parsedD;
              } else if (item.copyrightYear && !date) {
                date = `${item.copyrightYear}`;
              } else if (item.dateModified && !fallbackModifiedDate) {
                fallbackModifiedDate = cleanDateStr(item.dateModified);
              }
            }
            if (!container) {
              const p = item.isPartOf?.name || (typeof item.publisher === "string" ? item.publisher : item.publisher?.name) || item.publication?.name;
              if (p) container = p.trim();
            }
          }
        }
      } catch (e) {}
    });

    // 3. Platform Detection
    if (hostname.includes("thehackernews.com")) {
      const thnDateEl = Array.from(doc.querySelectorAll(".postmeta .author")).find(el => /^[A-Z][a-z]{2}\s+\d{1,2},\s+\d{4}$/.test(el.innerText));
      if (thnDateEl) {
        const d = new Date(thnDateEl.innerText);
        if (!isNaN(d.getTime())) {
          date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        }
      }
    }

    if (hostname.includes("youtube.com") || hostname.includes("youtu.be")) {
      sourceType = "video";
      container = "YouTube";

      // A. Extract Title
      const ytTitle = doc.querySelector(
        "h1.ytd-watch-metadata yt-formatted-string, #title h1 yt-formatted-string, h1.title.style-scope.ytd-video-primary-info-renderer, meta[property='og:title'], meta[name='title']"
      );
      if (ytTitle) {
        title = (ytTitle.innerText || ytTitle.getAttribute("content") || "").trim();
      }
      if (!title) {
        const metaName = doc.querySelector("meta[itemprop='name']");
        if (metaName) title = (metaName.getAttribute("content") || "").trim();
      }
      if (!title) {
        title = document.title.replace(/\s*-\s*YouTube$/i, "").trim();
      }

      const ytScripts = doc.querySelectorAll("script");

      // B. Extract Channel Name / Author (Strictly avoid setting video title as author)
      let channelName = "";

      // Check 1: Channel DOM elements in player/watch header
      const ytChannelEl = doc.querySelector(
        "ytd-video-owner-renderer #channel-name a, #owner #channel-name a, #upload-info #channel-name a, #channel-name yt-formatted-string a, ytd-channel-name yt-formatted-string a, ytd-channel-name #text a, ytd-channel-name a, [itemprop='author'] [itemprop='name'], [itemprop='author'] meta[itemprop='name'], [itemprop='author'] link[itemprop='name']"
      );
      if (ytChannelEl) {
        const ch = cleanStr(ytChannelEl.innerText || ytChannelEl.getAttribute("content") || ytChannelEl.textContent || "");
        if (ch && (!title || ch.toLowerCase() !== title.toLowerCase())) {
          channelName = ch;
        }
      }

      // Check 2: YouTube script data (ytInitialPlayerResponse / ytInitialData)
      if (!channelName) {
        for (const s of ytScripts) {
          const txt = s.textContent || "";
          if (txt.includes('"author"') || txt.includes('"ownerChannelName"')) {
            const mAuth = txt.match(/"(?:author|ownerChannelName)"\s*:\s*"([^"]+)"/);
            if (mAuth && mAuth[1]) {
              let rawAuth = mAuth[1].replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
              const ch = cleanStr(rawAuth);
              if (ch && (!title || ch.toLowerCase() !== title.toLowerCase())) {
                channelName = ch;
                break;
              }
            }
          }
        }
      }

      // Check 3: Schema.org author metadata inside itemprop="author"
      if (!channelName) {
        const authMeta = doc.querySelector("[itemprop='author'] link[itemprop='name'], [itemprop='author'] meta[itemprop='name']");
        if (authMeta) {
          let rawAuth = authMeta.getAttribute("content") || authMeta.textContent || "";
          const ch = cleanStr(rawAuth);
          if (ch && (!title || ch.toLowerCase() !== title.toLowerCase())) {
            channelName = ch;
          }
        }
      }

      if (channelName) {
        authors = [channelName];
      }

      // C. Extract Publication / Stream Date
      // Priority 0: Official live broadcast / premiere start date (Always reflects the actual broadcast date, e.g. 2026-09-06)
      // Livestreams have datePublished = when scheduled in advance, but startDate = when broadcast actually aired
      const ytStartDateMeta = doc.querySelector("meta[itemprop='startDate']");
      if (ytStartDateMeta && ytStartDateMeta.getAttribute("content")) {
        const rawDate = ytStartDateMeta.getAttribute("content");
        // For YouTube livestreams, the startDate is in UTC (e.g., 2026-09-05T18:00:00+00:00)
        // We MUST parse it into a local Date object to match the YouTube UI which displays local time
        if (rawDate.includes("T")) {
          const d = new Date(rawDate);
          if (!isNaN(d.getTime())) {
            date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
          }
        }
        if (!date) {
          const parsedStart = cleanDateStr(rawDate);
          if (parsedStart && parsedStart.length >= 4) {
            date = parsedStart;
          }
        }
      }

      // Priority 1: startTimestamp from liveBroadcastDetails in player scripts
      if (!date) {
        for (const s of ytScripts) {
          const txt = s.textContent || "";
          if (txt.includes("startTimestamp")) {
            const mStart = txt.match(/(?:\x22|")?startTimestamp(?:\x22|")?\s*:\s*(?:\x22|")([0-9]{4}-[0-9]{2}-[0-9]{2}[^\x22"\\]*)/);
            if (mStart && mStart[1]) {
              const p = cleanDateStr(mStart[1]);
              if (p && p.length >= 4) { date = p; break; }
            }
          }
        }
      }

      // Priority 2: If live broadcast is currently ongoing, use today's local date
      const isLiveNow = doc.querySelector("meta[itemprop='isLiveBroadcast'][content='True' i], meta[itemprop='isLiveBroadcast'][content='true' i]") ||
        Array.from(ytScripts).some(s => {
          const t = s.textContent || "";
          return t.includes('"isLive":true') || t.includes('"isLiveBroadcast":true') || t.includes('"isLiveNow":true');
        });
      if (isLiveNow && !date) {
        const now = new Date();
        date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      }

      // Priority 3: Official canonical meta tags for standard uploads (datePublished, uploadDate)
      if (!date) {
        const ytDateMeta = doc.querySelector("meta[itemprop='datePublished'], meta[itemprop='uploadDate'], meta[name='date']");
        if (ytDateMeta) {
          date = cleanDateStr(ytDateMeta.getAttribute("content") || "");
        }
      }

      // Priority 4: Precise publishDate / uploadDate / dateText in page scripts
      if (!date) {
        for (const s of ytScripts) {
          const txt = s.textContent || "";
          if (txt.includes("publishDate") || txt.includes("uploadDate") || txt.includes("dateText")) {
            // Check simpleText first (e.g. "24 thg 10, 2009" or "Oct 24, 2009")
            const mSimple = txt.match(/(?:\x22|")?(?:dateText|publishDate)(?:\x22|")?\s*:\s*\{\s*(?:\x22|")?simpleText(?:\x22|")?\s*:\s*(?:\x22|")([^"\x22\\]+)/);
            if (mSimple && mSimple[1]) {
              const p = cleanDateStr(mSimple[1]);
              if (p && p.length >= 4) { date = p; break; }
            }
            // Check ISO date (e.g. "2009-10-24T23:57:33-07:00")
            const mIso = txt.match(/(?:\x22|")?(?:publishDate|uploadDate)(?:\x22|")?\s*:\s*(?:\x22|")([0-9]{4}-[0-9]{2}-[0-9]{2}[^\x22"\\]*)/);
            if (mIso && mIso[1]) {
              const p = cleanDateStr(mIso[1]);
              if (p && p.length >= 4) { date = p; break; }
            }
          }
        }
      }

            // Priority 3: Clean visible localized DOM date text (modern YouTube watch-metadata & Shorts)
      if (!date) {
        const ytDomDate = doc.querySelector([
          "#info-strings yt-formatted-string",
          "#info-strings",
          "ytd-watch-metadata #description-inner #info-container span:last-child",
          "ytd-watch-metadata #info-container span:last-child",
          "ytd-watch-metadata #info-container span",
          "#description-inner #info-container span",
          "#info-container span",
          "ytd-watch-info-text yt-formatted-string",
          "#date yt-formatted-string",
          "#info yt-formatted-string",
          "ytd-video-primary-info-renderer #date yt-formatted-string",
          "#description-inline-expander span.yt-formatted-string"
        ].join(', '));
        if (ytDomDate) {
          date = cleanDateStr(ytDomDate.innerText || ytDomDate.textContent || "");
        }
      }
    } else if (hostname.includes("ieeexplore.ieee.org")) {
      sourceType = "academic";
      
      const scripts = doc.querySelectorAll('script');
      for (const s of scripts) {
        const text = s.textContent || "";
        // IEEE nhúng toàn bộ metadata chuẩn vào biến global xplore.document.metadata
        if (text.includes('xplore.document.metadata=')) {
          try {
            const match = text.match(/xplore\.document\.metadata=\s*(\{.*?\});/);
            if (match && match[1]) {
              const ieeeData = JSON.parse(match[1]);
              
              if (ieeeData.title) title = ieeeData.title;
              if (ieeeData.authors && ieeeData.authors.length > 0) {
                // Lấy mảng tên tác giả chuẩn
                authors = ieeeData.authors.map(a => normalizeAuthorDisplayName(a.name)); 
              }
              if (ieeeData.publicationTitle) container = ieeeData.publicationTitle;
              if (ieeeData.publicationYear) date = ieeeData.publicationYear;
              if (ieeeData.doi) doi = ieeeData.doi;
              if (ieeeData.startPage && ieeeData.endPage) {
                pages = `pp. ${ieeeData.startPage}-${ieeeData.endPage}`;
              }
            }
          } catch (e) {
            console.warn("Lỗi parse IEEE JSON", e);
          }
          break; // Lấy xong dữ liệu thì thoát vòng lặp ngay
        }
      }
     } else if (hostname.includes("github.com")) {
      sourceType = "software";
      container = "GitHub";
      const parts = window.location.pathname.split("/").filter(Boolean);
      if (parts.length >= 2) {
        authors = [parts[0]];
        title = `${parts[0]}/${parts[1]}`;
      }
    }
    

// CHỈ CHẠY FALLBACK NẾU CHƯA PHẢI LÀ IEEE HOẶC CHƯA CÓ TITLE
    if (!hostname.includes("ieeexplore.ieee.org") || (!title && authors.length === 0)) {
        
        // 4. Microdata & Byline classes 
        if (authors.length === 0) {
          // Fallback chung cho các trang khác (Đã xóa quét DOM dư thừa của IEEE)
          const authorNodes = doc.querySelectorAll([
            '[itemprop="author"] [itemprop="name"]',
            '[itemprop="author"] meta[itemprop="name"]',
            '[itemprop="author"]', 'a[rel="author"]',
            '.byline-author', '.c-byline__author', '.author-name',
            '.post-author', '.author', '.article-author',
            '.detail-author', '.byline'
          ].join(', '));
          authorNodes.forEach(node => {
            const val = normalizeAuthorDisplayName(cleanStr(node.getAttribute("content") || node.innerText || ""));
            if (val && !val.startsWith("http") && val.length < 50 && !authors.includes(val)) {
              authors.push(val);
            }
          });
        }

        // 5. Fallback Meta Tags
        if (authors.length === 0) {
          const authorCandidates = doc.querySelectorAll('meta[name="author"], meta[property="article:author"], meta[name="byl"], meta[name="dable:author"]');
          for (const node of authorCandidates) {
            const val = normalizeAuthorDisplayName(cleanStr(node.getAttribute("content") || ""));
            if (val && !val.startsWith("http") && val.length < 50 && !authors.includes(val)) {
              authors.push(val);
            }
          }
        }

        if (!title) {
          const ogTitle = doc.querySelector('meta[property="og:title"]');
          if (ogTitle) title = ogTitle.getAttribute("content") || "";
          else title = doc.title || "";
          title = title.replace(/\s*[-–|]\s*(YouTube|GitHub|Wikipedia|Medium|IEEE Xplore|The Hacker News|The Verge|TechCrunch|VnExpress).*$/i, "").trim();
        }

        // Comprehensive Fallback Dates:
        if (!date) {
          const calendarAdjacent = doc.querySelector([
            '.postmeta [class*="calendar"] + span',
            '.postmeta [class*="calendar"] + *',
            '.postmeta [class*="calendar"] ~ span',
            '[class*="postmeta"] [class*="calendar"] + *',
            '[class*="post-meta"] [class*="calendar"] + *',
            '.entry-meta [class*="calendar"] + *',
            '.article-meta [class*="calendar"] + *'
          ].join(', '));
          if (calendarAdjacent && calendarAdjacent.innerText) {
            const parsed = cleanDateStr(calendarAdjacent.innerText);
            if (parsed) date = parsed;
          }
        }

        if (!date) {
          const dedicatedPublishedEl = doc.querySelector([
            'time.published',
            'time.entry-date.published',
            'time[itemprop="datePublished"]',
            'time[itemprop="uploadDate"]',
            '[itemprop="datePublished"]:not(meta)',
            '[data-role="publishdate"]',
            '.the-article-publish',
            '.article-publish-date',
            '.published-date',
            '.pdate',
            '.bread-crumb-detail__time',
            '.author-time',
            'time.author-time',
            '.detail__time',
            '.news-date',
            '.c-article__date',
            '.article__date',
            '.article-date',
            '.publish-date',
            '.date-posted',
            '.op-published',
            '[data-testid="storyPublishDate"]',
            '[data-testid*="publish" i]',
            '[data-testid*="post-date" i]',
            '[data-testid*="timestamp" i]',
            '[data-qa*="date" i]',
            '[data-qa*="timestamp" i]',
            '.posted-on time.published',
            '.entry-date.published'
          ].join(', '));
          if (dedicatedPublishedEl) {
            const val = dedicatedPublishedEl.getAttribute("datetime") || dedicatedPublishedEl.getAttribute("content") || dedicatedPublishedEl.innerText || "";
            if (val) date = cleanDateStr(val);
          }
        }

        if (!date) {
          const ogPublished = doc.querySelector([
            'meta[property="article:published_time"]',
            'meta[name="article:published_time"]',
            'meta[property="og:published_time"]',
            'meta[name="pubdate"]',
            'meta[name="publishdate"]',
            'meta[name="publish_date"]',
            'meta[name="publication_date"]',
            'meta[name="sailthru.date"]',
            'meta[name="parsely-pub-date"]',
            'meta[name="date"]',
            'meta[name="dc.date"]',
            'meta[name="DC.date"]',
            'meta[name="DC.date.issued"]',
            'meta[name="rnews:datePublished"]',
            'meta[name="cXenseParse:recs:publishtime"]',
            'meta[itemprop="datePublished"]',
            'meta[itemprop="dateCreated"]',
            'meta[name="its_publication"]'
          ].join(', '));
          if (ogPublished) {
            const val = ogPublished.getAttribute("content") || ogPublished.getAttribute("value") || "";
            if (val) date = cleanDateStr(val);
          }
        }

        if (!date) {
          const nextData = doc.getElementById("__NEXT_DATA__");
          if (nextData && nextData.textContent) {
            const mDate = nextData.textContent.match(/"(?:datePublished|publishedAt|publishDate|publicationDate)"\s*:\s*"([^"]+)"/i);
            if (mDate) date = cleanDateStr(mDate[1]);
          }
        }

        if (!date) {
          const genericTimeEl = doc.querySelector([
            'article time:not(.updated):not(.modified)',
            '.article-header time:not(.updated):not(.modified)',
            'main time:not(.updated):not(.modified)',
            'time[datetime]:not(.updated):not(.modified)',
            '.post-time',
            '.detail-time',
            '.date-time',
            '[data-testid="timestamp"]',
            '.wp-block-post-date',
            '.entry-date',
            'time'
          ].join(', '));
          if (genericTimeEl) {
            const val = genericTimeEl.getAttribute("datetime") || genericTimeEl.getAttribute("content") || genericTimeEl.innerText || "";
            if (val) date = cleanDateStr(val);
          }
        }

        if (!date) {
          const metaEls = doc.querySelectorAll('.postmeta, .post-meta, .byline, .author-date, .post-info, .entry-meta, .article-header, header, .author, .detail-author, .cz-news-byline');
          for (const parent of metaEls) {
            if (!parent) continue;
            const txt = (parent.innerText || "").slice(0, 350);
            const parsed = cleanDateStr(txt);
            if (parsed) {
              date = parsed;
              break;
            }
          }
        }

        if (!date && url) {
          const urlYmd = url.match(/\/(\d{4})[/-](\d{1,2})[/-](\d{1,2})\b/);
          if (urlYmd) {
            date = `${urlYmd[1]}-${urlYmd[2].padStart(2, "0")}-${urlYmd[3].padStart(2, "0")}`;
          } else {
            const urlYm = url.match(/\/(\d{4})\/(\d{2})\//);
            if (urlYm) {
              date = `${urlYm[1]}-${urlYm[2]}`;
            } else {
              const urlCompact = url.match(/[/-](\d{4})(\d{2})(\d{2})[/-]/);
              if (urlCompact) {
                date = `${urlCompact[1]}-${urlCompact[2]}-${urlCompact[3]}`;
              } else {
                const urlYear = url.match(/\/(19\d\d|20\d\d)\//);
                if (urlYear) {
                  date = urlYear[1];
                }
              }
            }
          }
        }

        if (!doi && url) {
          const urlDoiMatch = url.match(/\b(10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+)\b/);
          if (urlDoiMatch) {
            doi = urlDoiMatch[1].replace(/[\/#?]+$/, "");
          }
        }

        if (!date) {
          if (fallbackModifiedDate) {
            date = fallbackModifiedDate;
          } else {
            const ogModified = doc.querySelector([
              'meta[property="article:modified_time"]',
              'meta[name="article:modified_time"]',
              'meta[property="og:updated_time"]',
              'meta[itemprop="dateModified"]',
              'time.updated',
              'time.modified'
            ].join(', '));
            if (ogModified) {
              const val = ogModified.getAttribute("content") || ogModified.getAttribute("datetime") || ogModified.innerText || "";
              if (val) date = cleanDateStr(val);
            }
          }
        }

        if (!container) {
          const ogSite = doc.querySelector('meta[property="og:site_name"], meta[name="application-name"], meta[name="publisher"], meta[name="copyright"]');
          if (ogSite) container = ogSite.getAttribute("content") || "";
          else container = hostname.replace(/^www\./, "");
        }
        if (container) {
          container = container.replace(/\s*[-–|]\s*(trang chủ|tin tức|báo điện tử|tin tức 24h|kênh thông tin|official site).*$/i, "").trim();
        }
    }

    let cleanUrl = window.location.href.split("#")[0];
    if (hostname.includes("youtube.com") || hostname.includes("youtu.be")) {
      const vMatch = window.location.href.match(/[?&]v=([a-zA-Z0-9_-]+)/);
      if (vMatch) {
        cleanUrl = `https://www.youtube.com/watch?v=${vMatch[1]}`;
      }
    } else {
      try {
        const u = new URL(cleanUrl);
        const paramsToRemove = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid', 'ref', 'ref_src'];
        paramsToRemove.forEach(p => u.searchParams.delete(p));
        cleanUrl = u.toString();
      } catch (e) {}
    }

    // Làm sạch khoảng trắng thừa và rác UI trước khi xuất
    if (title) {
      title = title.replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ")
        .replace(/^(?:Frontiers|Nature|Science|Springer|Elsevier|Wiley|PLOS|ACM|IEEE)\s*\|\s*/i, "")
        .trim();
    }
    
    if (container) {
      container = container
        .replace(/[\r\n\t]+/g, " ")
        .replace(/\s+/g, " ")
        // Cắt bỏ thanh điều hướng rác của ResearchGate và IEEE
        .replace(/\s*or\s+Discover by subject area.*/i, "") 
        .replace(/(,\s*)?(IEEE\.org|IEEE Xplore|IEEE SA|IEEE Spectrum).*$/i, "") 
        .replace(/,\s*$/, "") // Xóa dấu phẩy thừa ở cuối nếu có
        .trim();
    }
    
    if (authors.length > 0) {
      authors = authors.map(a => {
        const cleaned = a.replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim();
        return normalizeAuthorDisplayName(cleaned);
      }).filter(Boolean);
    }

    if (doi || tagJournal || tagDoi || (container && pages)) {
      if (sourceType === "webpage") sourceType = "academic";
    }

    return {
      sourceType,
      authors: authors.join(", "),
      title,
      date,
      container,
      doi,
      pages,
      url: cleanUrl
    };

  }

  // SPA Navigation listener (YouTube, Twitter, GitHub, etc.)
  let lastObservedUrl = window.location.href;
  function handleSpaNavigation() {
    if (window.location.href !== lastObservedUrl) {
      lastObservedUrl = window.location.href;
      try {
        const _rApi = (typeof browser !== "undefined" && browser.runtime) ? browser.runtime
          : ((typeof chrome !== "undefined" && chrome.runtime) ? chrome.runtime : null);
        if (_rApi && _rApi.sendMessage) {
          const _p = _rApi.sendMessage({
            type: "SPA_URL_CHANGED",
            url: window.location.href,
            title: document.title
          });
          if (_p && typeof _p.catch === "function") _p.catch(() => {});
        }
      } catch (e) {}
    }
  }

  window.extractPageCitationMetadata = extractPageCitationMetadata;

  window.addEventListener("yt-navigate-finish", () => {
    setTimeout(handleSpaNavigation, 400);
  });
  window.addEventListener("popstate", () => {
    setTimeout(handleSpaNavigation, 250);
  });
  setInterval(handleSpaNavigation, 1000);

  // Listener for EXTRACT_PAGE_METADATA & PING
  const _cRuntime = (typeof browser !== "undefined" && browser.runtime) 
    ? browser.runtime 
    : ((typeof chrome !== "undefined" && chrome.runtime) ? chrome.runtime : null);

  if (_cRuntime && _cRuntime.onMessage) {
    _cRuntime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === "PING") {
        sendResponse({ pong: true });
        return false;
      }
      if (request.action === "EXTRACT_PAGE_METADATA" || request.action === "EXTRACT_CITATION") {
        try {
          const meta = extractPageCitationMetadata();
          sendResponse(meta);
        } catch (err) {
          sendResponse({ error: err.message });
        }
        return false;
      }
    });
  }