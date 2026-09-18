// ---------------------------------------------------------------------------
// ScholarFlow module: OS/js/citation/autofill.js
// Live source search & autofill for the citation form.
// Type a paper title / author in #f-title -> suggestions from OpenAlex +
// Crossref -> click / Enter to auto-fill the whole citation entry.
//
// Hand-written module (NOT extracted by scripts/split). 100% local logic,
// network calls are user-triggered only (debounced typing / clicking).
// ---------------------------------------------------------------------------

function citeAutofillI18n(key, fallback) {
  try {
    if (window.i18n && typeof window.i18n.t === "function") {
      const v = window.i18n.t(key);
      if (v && v !== key) return v;
    }
  } catch (e) {}
  return fallback;
}

function citeAutofillType(type) {
  if (!type) return "academic";
  const t = String(type).toLowerCase();
  if (t.includes("conference") || t.includes("proceeding")) return "conference";
  if (t.includes("book") || t.includes("chapter") || t.includes("thesis") || t.includes("dissertation")) return "book";
  if (t.includes("dataset") || t.includes("software") || t.includes("repo")) return "software";
  return "academic";
}

async function searchScholarSuggestions(query, limit) {
  const q = (query || "").trim().slice(0, 120);
  if (q.length < 3) return [];
  const max = Math.min(limit || 6, 8);

  const items = [];
  const seen = new Set();
  const dedupeKey = (it) => ((it.doi || "").toLowerCase() || (it.title || "").toLowerCase());
  const push = (it) => {
    if (!it || !it.title) return;
    const k = dedupeKey(it);
    if (seen.has(k)) return;
    seen.add(k);
    items.push(it);
  };

  const openAlexTask = (async () => {
    try {
      const res = await fetch(
        "https://api.openalex.org/works?search=" + encodeURIComponent(q) +
        "&per-page=" + max +
        "&select=id,doi,title,publication_year,authorships,primary_location,type",
        { signal: AbortSignal.timeout(6000) }
      );
      if (!res.ok) return;
      const data = await res.json();
      ((data && data.results) || []).forEach((w) => {
        if (!w || !w.title) return;
        const authors = (w.authorships || [])
          .map((a) => a.author && a.author.display_name)
          .filter(Boolean)
          .join(", ");
        const venue = (w.primary_location && w.primary_location.source && w.primary_location.source.display_name) || "";
        const doi = (w.doi || "").replace("https://doi.org/", "");
        push({
          title: w.title,
          authors: authors,
          year: w.publication_year ? String(w.publication_year) : "",
          venue: venue,
          doi: doi,
          url: w.doi || (doi ? "https://doi.org/" + doi : ""),
          pages: "",
          sourceType: citeAutofillType(w.type),
          source: "OpenAlex"
        });
      });
    } catch (e) {
      console.warn("OpenAlex suggest error:", e);
    }
  })();

  const crossrefTask = (async () => {
    try {
      const res = await fetch(
        "https://api.crossref.org/works?query.bibliographic=" + encodeURIComponent(q) +
        "&rows=" + max +
        "&select=DOI,title,author,issued,container-title,type,URL,page",
        { signal: AbortSignal.timeout(6000) }
      );
      if (!res.ok) return;
      const data = await res.json();
      ((data && data.message && data.message.items) || []).forEach((it) => {
        if (!it || !it.title || !it.title[0]) return;
        const authors = (it.author || [])
          .map((a) => a.name || ([a.given, a.family].filter(Boolean).join(" ")))
          .filter(Boolean)
          .join(", ");
        let year = "";
        if (it.issued && it.issued["date-parts"] && it.issued["date-parts"][0]) year = it.issued["date-parts"][0][0];
        if (!year && it["published-print"] && it["published-print"]["date-parts"] && it["published-print"]["date-parts"][0]) year = it["published-print"]["date-parts"][0][0];
        if (!year && it["published-online"] && it["published-online"]["date-parts"] && it["published-online"]["date-parts"][0]) year = it["published-online"]["date-parts"][0][0];
        const venue = (it["container-title"] && it["container-title"][0]) || it.publisher || "";
        const doi = it.DOI || "";
        push({
          title: it.title[0],
          authors: authors,
          year: year ? String(year) : "",
          venue: venue,
          doi: doi,
          url: it.URL || (doi ? "https://doi.org/" + doi : ""),
          pages: it.page || "",
          sourceType: citeAutofillType(it.type),
          source: "Crossref"
        });
      });
    } catch (e) {
      console.warn("Crossref suggest error:", e);
    }
  })();

  await Promise.all([openAlexTask, crossrefTask]);
  return items.slice(0, max);
}

function applySuggestionToForm(item) {
  if (!item || !item.title) return;
  const set = (id, val) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (val !== undefined && val !== null && String(val).trim() !== "") el.value = String(val);
  };
  set("f-title", item.title);
  set("f-authors", item.authors);
  set("f-date", item.year ? String(item.year) : "");
  set("f-container", item.venue);
  set("f-doi", item.doi);
  set("f-url", item.url);
  set("f-pages", item.pages);
  const srcType = document.getElementById("f-source-type");
  if (srcType && item.sourceType) srcType.value = item.sourceType;

  try {
    if (typeof syncMetaFromInputs === "function") {
      syncMetaFromInputs();
    } else if (typeof syncInputs === "function") {
      syncInputs();
      if (typeof updateCitationDisplay === "function") updateCitationDisplay();
    }
  } catch (e) {
    console.warn("applySuggestionToForm sync error:", e);
  }
  try {
    if (typeof saveDraft === "function") saveDraft();
  } catch (e) {}

  if (typeof showToast === "function") {
    showToast("cite_autofill_applied", "success", [{ source: item.source === "Crossref" ? "Crossref" : "OpenAlex" }]);
  }
}

function initTitleAutocomplete() {
  const input = document.getElementById("f-title");
  if (!input) return;

  const container = input.closest(".form-group") || input.parentElement;
  if (container) container.style.position = "relative";

  const dd = document.createElement("div");
  dd.className = "sf-autofill-dd";
  dd.style.display = "none";
  dd.setAttribute("role", "listbox");
  input.insertAdjacentElement("afterend", dd);

  let currentItems = [];
  let activeIndex = -1;
  let debounceTimer = null;
  let seq = 0;

  function hideDropdown() {
    dd.style.display = "none";
    dd.textContent = "";
    currentItems = [];
    activeIndex = -1;
    input.setAttribute("aria-expanded", "false");
  }

  function renderState(messageHtml, messageText) {
    dd.textContent = "";
    if (messageText) {
      const p = document.createElement("div");
      p.className = messageHtml || "sf-autofill-empty";
      p.textContent = messageText;
      dd.appendChild(p);
      dd.style.display = "block";
    } else {
      dd.style.display = "none";
    }
  }

  function syncActiveClass() {
    const rows = dd.querySelectorAll(".sf-autofill-item");
    rows.forEach((row, idx) => {
      row.classList.toggle("active", idx === activeIndex);
      row.setAttribute("aria-selected", idx === activeIndex ? "true" : "false");
    });
  }

  function renderItems() {
    renderState("", "");
    if (currentItems.length === 0) {
      renderState("sf-autofill-empty", citeAutofillI18n("cite_autofill_empty", "Không tìm thấy kết quả. Thử từ khóa ngắn hơn."));
      return;
    }
    currentItems.forEach((it, idx) => {
      const row = document.createElement("div");
      row.className = "sf-autofill-item";
      row.setAttribute("role", "option");
      row.setAttribute("aria-selected", "false");

      const title = document.createElement("div");
      title.className = "sf-autofill-item-title";
      title.textContent = it.title || "";

      const meta = document.createElement("div");
      meta.className = "sf-autofill-item-meta";
      const parts = [];
      if (it.authors && it.authors.trim()) parts.push(it.authors);
      if (it.year) parts.push(it.year);
      if (it.venue) parts.push(it.venue);
      meta.textContent = parts.join(" • ") || "\u00A0";

      const src = document.createElement("span");
      src.className = "sf-autofill-item-src";
      src.textContent = it.source === "Crossref" ? "Crossref" : "OpenAlex";

      row.appendChild(title);
      row.appendChild(meta);
      row.appendChild(src);

      row.addEventListener("mousedown", (ev) => {
        ev.preventDefault();
        applySuggestionToForm(it);
        hideDropdown();
      });
      row.addEventListener("mouseenter", () => {
        activeIndex = idx;
        syncActiveClass();
      });

      dd.appendChild(row);
    });
    activeIndex = -1;
    syncActiveClass();
    dd.style.display = "block";
  }

  async function runSearch(q) {
    const mySeq = ++seq;
    renderState("sf-autofill-loading", citeAutofillI18n("cite_autofill_loading", "Đang tìm trên CSDL học thuật..."));
    try {
      const items = await searchScholarSuggestions(q, 6);
      if (mySeq !== seq) return;
      currentItems = items;
      renderItems();
    } catch (e) {
      if (mySeq !== seq) return;
      console.warn("Autofill search error:", e);
      renderState("sf-autofill-error", citeAutofillI18n("cite_autofill_error", "Lỗi tìm kiếm. Vui lòng thử lại."));
    }
  }

  input.setAttribute("autocomplete", "off");
  input.setAttribute("role", "combobox");
  input.setAttribute("aria-expanded", "false");
  input.setAttribute("aria-autocomplete", "list");

  input.addEventListener("input", () => {
    clearTimeout(debounceTimer);
    const q = input.value.trim();
    if (q.length < 3) {
      hideDropdown();
      return;
    }
    debounceTimer = setTimeout(() => runSearch(q), 320);
  });

  input.addEventListener("focus", () => {
    const q = input.value.trim();
    if (q.length >= 3 && dd.style.display === "none") {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => runSearch(q), 220);
    }
  });

  input.addEventListener("keydown", (e) => {
    if (dd.style.display === "none" || currentItems.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      activeIndex = activeIndex < currentItems.length - 1 ? activeIndex + 1 : currentItems.length - 1;
      syncActiveClass();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      activeIndex = activeIndex > 0 ? activeIndex - 1 : 0;
      syncActiveClass();
    } else if (e.key === "Enter") {
      if (activeIndex >= 0 && currentItems[activeIndex]) {
        e.preventDefault();
        applySuggestionToForm(currentItems[activeIndex]);
        hideDropdown();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      hideDropdown();
    }
  });

  document.addEventListener("mousedown", (e) => {
    if (dd !== e.target && !dd.contains(e.target) && e.target !== input) {
      hideDropdown();
    }
  });

  window.addEventListener("scroll", () => hideDropdown(), true);
}
