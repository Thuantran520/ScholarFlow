// ---------------------------------------------------------------------------
// tests/autofill.test.js
//
// Tests for the live source-search autofill (OS/js/citation/autofill.js):
//   * helper type mapping
//   * applying a suggestion fills every citation form field
//   * the suggestion dropdown is created in the DOM
//   * the module exports the expected globals
//
// Run with: node tests/autofill.test.js
// ---------------------------------------------------------------------------

const { loadPage, check, finish } = require("./helpers");

const META_BRIDGE = "window.__sfMeta = function(){ return currentMeta; };";

async function main() {
  const { window: w, errors } = await loadPage("sidebar.html", {
    storeInit: { app_language: "en" },
    extraChunks: [META_BRIDGE]
  });
  check(errors.length === 0, "sidebar loads with no uncaught errors" + (errors.length ? ` -> ${errors.slice(0, 3).join(" | ")}` : ""));

  // --- Exported globals -----------------------------------------------------
  console.log("Autofill module surface:");
  for (const fn of ["initTitleAutocomplete", "applySuggestionToForm", "searchScholarSuggestions", "citeAutofillType", "citeAutofillI18n"]) {
    check(w.eval(`typeof ${fn}`) === "function", `global ${fn} is a function`);
  }

  // --- Type mapping ---------------------------------------------------------
  console.log("Source-type mapping:");
  const type = (t) => w.eval(`citeAutofillType(${JSON.stringify(t)})`);
  check(type("conference-proceeding") === "conference", "conference-proceeding -> conference");
  check(type("journal-article") === "academic", "journal-article -> academic");
  check(type("book") === "book", "book -> book");
  check(type("book-chapter") === "book", "book-chapter -> book");
  check(type("dissertation") === "book", "dissertation -> book");
  check(type("dataset") === "software", "dataset -> software");
  check(type("") === "academic", "empty -> academic");

  // --- Dropdown is created --------------------------------------------------
  console.log("Dropdown DOM:");
  check(w.document.querySelectorAll(".sf-autofill-dd").length === 1, "exactly one .sf-autofill-dd created");
  const dd = w.document.querySelector(".sf-autofill-dd");
  check(dd && dd.style.display === "none", "dropdown starts hidden");
  const titleInput = w.document.getElementById("f-title");
  check(!!titleInput, "#f-title exists");
  check(titleInput.getAttribute("autocomplete") === "off", "f-title autocomplete=off");
  check(titleInput.getAttribute("role") === "combobox", "f-title role=combobox");

  // --- Editing is disabled by replaying the exact SAMPLE --------------------
  console.log("Applying a suggestion to the form:");
  const SAMPLE = {
    title: "Attention Is All You Need",
    authors: "Ashish Vaswani, Noam Shazeer",
    year: "2017",
    venue: "Advances in Neural Information Processing Systems",
    doi: "10.48550/arXiv.1706.03762",
    url: "https://doi.org/10.48550/arXiv.1706.03762",
    pages: "",
    sourceType: "academic",
    source: "OpenAlex"
  };
  const before = w.document.getElementById("f-title").value;
  w.eval(`applySuggestionToForm(${JSON.stringify(SAMPLE)})`);
  const read = (id) => w.document.getElementById(id).value;
  check(read("f-title") === SAMPLE.title, "f-title filled");
  check(read("f-authors") === SAMPLE.authors, "f-authors filled");
  check(read("f-date") === SAMPLE.year, "f-date filled with year");
  check(read("f-container") === SAMPLE.venue, "f-container filled");
  check(read("f-doi") === SAMPLE.doi, "f-doi filled");
  check(read("f-url") === SAMPLE.url, "f-url filled");
  check(read("f-source-type") === "academic", "f-source-type set to academic");
  const meta = w.__sfMeta();
  check(meta.title === SAMPLE.title, "currentMeta.title synced");
  check(meta.doi === SAMPLE.doi, "currentMeta.doi synced");

  check(before !== w.document.getElementById("f-title").value, "the title value actually changed");

  finish("autofill.test.js");
}

main().catch((e) => {
  console.error("FATAL:", (e && e.stack) || e);
  process.exit(1);
});
