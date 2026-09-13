// ---------------------------------------------------------------------------
// tests/citation.test.js
//
// Golden-value tests for the citation pipeline: author parsing/formatting,
// date parsing/formatting, and the full IEEE/APA/Harvard/MLA/BibTeX/in-text
// builders.
//
// We load sidebar.html once and reach into the module scope through the
// CS_CHUNK bridge (window.__cs) because citationSettings and the helper
// functions live in one shared global lexical environment that window.eval()
// cannot re-enter.
//
// Run with: node tests/citation.test.js
// ---------------------------------------------------------------------------

const { loadPage, CS_CHUNK, check, finish } = require("./helpers");

// Deterministic baseline: authorStyle "initials" + dateStyle "full" make the
// IEEE builder emit the full day (June 12, 2017) instead of month-year.
const BASE = `window.__cs({ authorStyle: "initials", dateStyle: "full", removeDiacritics: false, accessedDate: false, appLanguage: "en" });`;

const META = {
  authors: "Ashish Vaswani and Noam Shazeer",
  title: "Attention Is All You Need",
  date: "2017-06-12",
  container: "Advances in Neural Information Processing Systems",
  pages: "6000–6010",
  doi: "10.48550/arXiv.1706.03762",
  sourceType: "academic",
  url: ""
};

async function main() {
  const { window: w, errors } = await loadPage("sidebar.html", {
    storeInit: { app_language: "en" },
    extraChunks: [CS_CHUNK, BASE]
  });
  check(errors.length === 0, "no uncaught errors at load" + (errors.length ? ` -> ${errors.slice(0, 3).join(" | ")}` : ""));

  const cs = w.__cs;
  const run = (fn, arg) => w.eval(`(function(){ return ${fn}(${JSON.stringify(arg)}); })()`);
  const run2 = (fn, a, b) => w.eval(`(function(){ return ${fn}(${JSON.stringify(a)}, ${JSON.stringify(b)}); })()`);
  const build = (fn) => w.eval(`(function(){ return ${fn}(${JSON.stringify(META)}); })()`);
  const code = (expr) => w.eval(`(function(){ ${BASE}; return ${expr}; })()`);
  const code2 = (fn) => w.eval(`(function(){ return ${fn}(${JSON.stringify(META)}); })()`);

  // --- Author parsing / formatting -----------------------------------------
  console.log("Author parsing & formatting:");

  check(w.eval(`removeVietnameseDiacritics("Nguyễn Văn A")`) === "Nguyen Van A",
    "removeVietnameseDiacritics('Nguyễn Văn A') -> 'Nguyen Van A'");
  check(w.eval(`removeVietnameseDiacritics("Đặng Thùy Trâm Đại Học")`) === "Dang Thuy Tram Dai Hoc",
    "removeVietnameseDiacritics('Đặng Thùy Trâm Đại Học') -> 'Dang Thuy Tram Dai Hoc'");

  check(w.eval(`normalizeAuthorsString("Nguyễn Văn A and Trần Thị B")`) === "Nguyễn Văn A, Trần Thị B",
    "normalizeAuthorsString VN 'and' -> comma list");
  check(w.eval(`normalizeAuthorsString("Vaswani, Ashish and Shazeer, Noam")`) === "Ashish Vaswani, Noam Shazeer",
    "normalizeAuthorsString 'Last, First and ...' -> 'First Last, ...'");

  const a0 = w.eval(`parseAuthorsList("Nguyễn Văn A and Trần Thị B")[0]`);
  check(a0 && a0.isVietnamese === true && a0.initials === "V. A.",
    `parseAuthorsList VN -> isVietnamese + initials 'V. A.' (got ${a0 && a0.isVietnamese}/${a0 && a0.initials})`);

  check(w.eval(`formatIeeeAuthors("Ashish Vaswani")`) === "A. Vaswani", `IEEE 1 author -> 'A. Vaswani'`);
  check(w.eval(`formatIeeeAuthors("Nguyễn Văn A and Trần Thị B")`) === "V. A. Nguyễn and T. B. Trần",
    "IEEE 2 VN -> 'V. A. Nguyễn and T. B. Trần'");
  const seven = "Ashish Vaswani and Noam Shazeer and Jakob Uszkoreit and Llion Jones and Aidan Gomez and Lukasz Kaiser and Illia Polosukhin";
  check(w.eval(`formatIeeeAuthors(${JSON.stringify(seven)})`) === "A. Vaswani et al.",
    "IEEE 7 authors -> 'A. Vaswani et al.'");

  check(w.eval(`formatApaAuthors("Nguyễn Văn A and Trần Thị B")`) === "Nguyễn, V. A. & Trần, T. B.",
    "APA 2 VN -> 'Nguyễn, V. A. & Trần, T. B.'");
  check(w.eval(`formatHarvardAuthors("Nguyễn Văn A and Trần Thị B")`) === "Nguyễn, V.A. and Trần, T.B.",
    "Harvard 2 VN -> 'Nguyễn, V.A. and Trần, T.B.'");
  check(w.eval(`formatMlaAuthors("Nguyễn Văn A and Trần Thị B")`) === "Nguyễn, Văn A, and Thị B Trần",
    "MLA 2 VN -> 'Nguyễn, Văn A, and Thị B Trần'");
  check(w.eval(`formatBibtexAuthors("Nguyễn Văn A and Vaswani, Ashish")`) === "Nguyễn, Văn A and Vaswani, Ashish",
    "BibTeX mixed VN+LVF -> 'Nguyễn, Văn A and Vaswani, Ashish'");

  // --- Date parsing / formatting -------------------------------------------
  console.log("Date parsing & formatting:");
  const dateCases = [
    ["2009-10-24T23:57:33-07:00", "2009-10-24"],
    ["06/09/2026", "2026-09-06"],
    ["2024-05", "2024-05"],
    ["September 12, 2026", "2026-09-12"],
    ["18 мая 2024", "2024-05-18"],
    ["tháng 5 năm 2024", "2024-05"],
    ["ngày 06 tháng 09 năm 2026", "2026-09-06"],
    ["2026", "2026"]
  ];
  for (const [input, expected] of dateCases) {
    const got = w.eval(`parseComprehensiveDate(${JSON.stringify(input)})`);
    check(got === expected, `parseComprehensiveDate(${JSON.stringify(input)}) -> '${expected}' (got '${got}')`);
  }
  for (const input of ["1704067200", "3 ngày trước"]) {
    const got = w.eval(`parseComprehensiveDate(${JSON.stringify(input)})`);
    check(/^\d{4}(-\d{2})?(-\d{2})?$/.test(got), `parseComprehensiveDate timezone-dependent '${input}' -> ISO-ish (got '${got}')`);
  }

  check(w.eval(`formatCitationDate("2024-05-12", "ieee")`) === "May 12, 2024", "formatCitationDate ieee full date");
  check(w.eval(`formatCitationDate("2024-05-12", "apa")`) === "2024, May 12", "formatCitationDate apa full date");
  check(w.eval(`formatCitationDate("2024-05-12", "mla")`) === "12 May 2024", "formatCitationDate mla full date");
  check(w.eval(`formatCitationDate("2024-05", "ieee")`) === "May 2024", "formatCitationDate ieee month-year");

  check(w.eval(`extractYear("September 12, 2026")`) === "2026", "extractYear full string -> 2026");
  check(w.eval(`extractYear("n.d.")`) === "", "extractYear 'n.d.' -> ''");

  check(w.eval(`generateBibtexKey("Nguyễn Văn A", "2024", "Attention Is All You Need")`) === "nguyn2024attention",
    "generateBibtexKey VN author (diacritics stripped) -> 'nguyn2024attention'");
  check(w.eval(`generateBibtexKey("Vaswani, Ashish", "2017", "Attention Is All You Need")`) === "vaswani2017attention",
    "generateBibtexKey LVF author -> 'vaswani2017attention'");

  // --- Full builders (IEEE exact, others key-substring) ---------------------
  console.log("Full citation builders:");
  const ieee = build("buildIeeeCitation");
  const expectedIeee = 'A. Vaswani and N. Shazeer, "Attention Is All You Need," *Advances in Neural Information Processing Systems*, pp. 6000–6010, June 12, 2017, doi: 10.48550/arXiv.1706.03762.';
  check(ieee === expectedIeee, `buildIeeeCitation exact golden\n     got: ${ieee}`);

  const apa = build("buildApaCitation");
  check(apa.includes("Vaswani, A. & Shazeer, N. (2017)") && apa.includes("Attention Is All You Need") &&
    apa.includes("Advances in Neural Information Processing Systems") && apa.includes("https://doi.org/10.48550/arXiv.1706.03762"),
    `buildApaCitation key parts (got ${apa.slice(0, 90)}...)`);

  const harvard = build("buildHarvardCitation");
  check(harvard.includes("Vaswani, A. and Shazeer, N. (2017)") && harvard.includes("Available at:") &&
    harvard.includes("https://doi.org/10.48550/arXiv.1706.03762"),
    `buildHarvardCitation key parts (got ${harvard.slice(0, 90)}...)`);

  const mla = build("buildMlaCitation");
  check(mla.includes("Vaswani, Ashish, and Noam Shazeer") && mla.includes('"Attention Is All You Need."') && mla.includes("2017"),
    `buildMlaCitation key parts (got ${mla.slice(0, 90)}...)`);

  const bibtex = build("buildBibtexCitation");
  check(bibtex.includes("@article{vaswani2017attention") && bibtex.includes("author = {Vaswani, Ashish and Shazeer, Noam}") &&
    bibtex.includes("title = {") && bibtex.includes("Attention Is All You Need"),
    `buildBibtexCitation key parts (got ${bibtex.slice(0, 110)}...)`);

  const intext = build("buildIntextCitation");
  check(intext.includes("(Vaswani & Shazeer, 2017)") && intext.includes("Vaswani and Shazeer [1]"),
    `buildIntextCitation en in-text/narrative (got ${intext.slice(0, 90)}...)`);

  const vancouver = build("buildVancouverCitation");
  const expectedVancouver = 'Vaswani A, Shazeer N. Attention Is All You Need. *Advances in Neural Information Processing Systems*. 2017;6000-6010. doi: 10.48550/arXiv.1706.03762.';
  check(vancouver === expectedVancouver, `buildVancouverCitation exact golden\n     got: ${vancouver}`);

  const chicago = build("buildChicagoCitation");
  const expectedChicago = 'Vaswani, Ashish, and Shazeer, Noam. "Attention Is All You Need." *Advances in Neural Information Processing Systems* (2017): 6000–6010. https://doi.org/10.48550/arXiv.1706.03762.';
  check(chicago === expectedChicago, `buildChicagoCitation exact golden\n     got: ${chicago}`);

  const acs = build("buildAcsCitation");
  const expectedAcs = 'Vaswani, A.; Shazeer, N. Attention Is All You Need. *Advances in Neural Information Processing Systems* 2017, 6000–6010. https://doi.org/10.48550/arXiv.1706.03762.';
  check(acs === expectedAcs, `buildAcsCitation exact golden\n     got: ${acs}`);

  const ama = build("buildAmaCitation");
  const expectedAma = 'Vaswani A, Shazeer N. Attention Is All You Need. *Advances in Neural Information Processing Systems*. 2017;6000–6010. doi:10.48550/arXiv.1706.03762';
  check(ama === expectedAma, `buildAmaCitation exact golden\n     got: ${ama}`);

  const ris = code2("buildRisCitation");
  check(ris.includes("TY  - JOUR") && ris.includes("AU  - Ashish Vaswani and Noam Shazeer") &&
    ris.includes("JO  - Advances in Neural Information Processing Systems") &&
    ris.includes("PY  - 2017") && ris.includes("SP  - 6000–6010") && ris.includes("ER"),
    `buildRisCitation key parts (got ${ris.split("\n").slice(0, 3).join(" | ")}...)`);

  // --- New export builders: EndNote XML + CSL-JSON --------------------------
  console.log("EndNote XML & CSL-JSON builders:");
  const csl = code2("buildCslJsonCitation");
  let cslObj = null;
  try { cslObj = JSON.parse(csl); } catch (e) {}
  check(!!cslObj && cslObj.type === "article-journal" && cslObj.title === "Attention Is All You Need",
    `buildCslJsonCitation valid CSL-JSON (type=${cslObj && cslObj.type})`);
  check(!!cslObj && Array.isArray(cslObj.author) && cslObj.author.length === 2 &&
    cslObj.author[0].family === "Vaswani" && cslObj.author[0].given === "Ashish",
    "CSL-JSON author split into family/given");
  check(!!cslObj && cslObj.issued["date-parts"][0][0] === 2017 &&
    cslObj["container-title"] === "Advances in Neural Information Processing Systems" &&
    cslObj.DOI === "10.48550/arXiv.1706.03762",
    "CSL-JSON carries year/container/DOI");

  const xml = code2("buildEndnoteXmlCitation");
  check(xml.includes('<ref-type name="Journal Article">17</ref-type>') &&
    xml.includes("<title>Attention Is All You Need</title>") &&
    xml.includes("<secondary-title>Advances in Neural Information Processing Systems</secondary-title>") &&
    xml.includes("<author>Vaswani, Ashish</author>") && xml.includes("<year>2017</year>"),
    "buildEndnoteXmlCitation emits ref-type/title/journal/author/year");
  check(xml.includes("<electronic-resource-num>10.48550/arXiv.1706.03762</electronic-resource-num>"),
    "EndNote XML carries DOI");

  // --- Book chapter (IEEE) -------------------------------------------------
  console.log("IEEE book-chapter (chapter in edited volume):");
  const bookChapMeta = {
    sourceType: "book-chapter",
    authors: "J. Bernstein",
    title: "A Bouquet of Dyson",
    container: "Well, Doc, You're In",
    publisher: "Cambridge, MA: MIT Press",
    date: "Oct. 2022",
    pages: "pp. 257-270",
    doi: "10.7551/mitpress/13952.003.0011",
    url: ""
  };
  const ieeeChap = w.eval(`(function(){ return getFormattedCitationByStyle(${JSON.stringify(bookChapMeta)}, "ieee", 1); })()`);
  const expectedChap = '[1] J. Bernstein, "A Bouquet of Dyson," in *Well, Doc, You\'re In*, Cambridge, MA: MIT Press, 2022, pp. 257-270, doi: 10.7551/mitpress/13952.003.0011.';
  check(ieeeChap === expectedChap, `IEEE book-chapter exact golden\n     got: ${ieeeChap}`);
  check(ieeeChap.includes('" in *') && !ieeeChap.includes("Oct."),
    "chapter title in quotes + 'in' before italic book title + year-only");

  // --- IEEE full format guide (journal vol/no/pp + thesis + report) ---------
  console.log("IEEE format guide (journal / thesis / report):");
  const journalMeta = {
    sourceType: "academic",
    authors: "A. Smith and B. Jones",
    title: "Analysis of signals",
    container: "IEEE Trans. Signal Process.",
    date: "Sep. 2023",
    pages: "vol. 45, no. 9, pp. 123-130",
    doi: "",
    url: ""
  };
  const journalCite = w.eval(`(function(){ return getFormattedCitationByStyle(${JSON.stringify(journalMeta)}, "ieee", 2); })()`);
  check(journalCite === '[2] A. Smith and B. Jones, "Analysis of signals," *IEEE Trans. Signal Process.*, vol. 45, no. 9, pp. 123-130, Sep. 2023.',
    `IEEE journal vol/no/pp exact golden\n     got: ${journalCite}`);

  const thesisMeta = {
    sourceType: "thesis",
    authors: "J. O. Williams",
    title: "Narrow-band analyzer",
    container: "Dept. Elect. Eng., Harvard Univ.",
    publisher: "Cambridge, MA",
    pages: "Ph.D. dissertation",
    date: "1993",
    doi: "",
    url: ""
  };
  const thesisCite = w.eval(`(function(){ return buildIeeeCitation(${JSON.stringify(thesisMeta)}); })()`);
  check(thesisCite === 'J. O. Williams, "Narrow-band analyzer," Ph.D. dissertation, Dept. Elect. Eng., Harvard Univ., Cambridge, MA, 1993.',
    `IEEE thesis exact golden\n     got: ${thesisCite}`);

  const reportMeta = {
    sourceType: "pdf",
    authors: "E. E. Reber",
    title: "Oxygen absorption",
    container: "Aerospace Corp.",
    publisher: "Los Angeles, CA",
    pages: "Tech. Rep. TR-0200",
    date: "1988",
    doi: "",
    url: ""
  };
  const reportCite = w.eval(`(function(){ return buildIeeeCitation(${JSON.stringify(reportMeta)}); })()`);
  check(reportCite === 'E. E. Reber, "Oxygen absorption," Aerospace Corp., Los Angeles, CA, Tech. Rep. TR-0200, 1988.',
    `IEEE technical report exact golden\n     got: ${reportCite}`);

  // --- Style overrides via citationSettings ---------------------------------
  console.log("Style overrides (citationSettings):");
  check(code(`(window.__cs({ authorStyle: "uppercase-all", removeDiacritics: false }), formatIeeeAuthors("Nguyễn Văn A"))`) === "V. A. NGUYEN",
    "authorStyle uppercase-all -> 'V. A. NGUYEN'");
  check(code(`(window.__cs({ authorStyle: "initials", removeDiacritics: true }), formatIeeeAuthors("Nguyễn Văn A"))`) === "V. A. Nguyen",
    "removeDiacritics -> 'V. A. Nguyen'");
  check(typeof cs({ authorStyle: "initials", removeDiacritics: false, dateStyle: "full", accessedDate: false }) === "object",
    "__cs() read-back returns settings object (reset ok)");

  finish("citation.test.js");
}

main().catch((e) => {
  console.error("FATAL:", (e && e.stack) || e);
  process.exit(1);
});