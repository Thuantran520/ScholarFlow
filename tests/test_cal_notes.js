const fs = require('fs');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

const html = fs.readFileSync('OS/html/sidebar.html', 'utf8');
const dom = new JSDOM(html, { runScripts: "dangerously", url: "https://example.com/" });
const w = dom.window;

const ics = [
  "BEGIN:VCALENDAR",
  "VERSION:2.0",
  "BEGIN:VEVENT",
  "UID:1@x",
  "DTSTART:20260915T090000",
  "DTEND:20260915T103000",
  "SUMMARY:Học nhóm môn AI",
  "LOCATION:Thư viện trường",
  "DESCRIPTION:Ôn tập chương 3",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "UID:2@x",
  "DTSTART;VALUE=DATE:20260920",
  "SUMMARY:Kỳ thi giữa kỳ",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "UID:3@x",
  "DTSTART:20260901T070000",
  "DTEND:20260901T080000",
  "RRULE:FREQ=WEEKLY;BYDAY=TU",
  "SUMMARY:Buổi học Anh văn",
  "END:VEVENT",
  "END:VCALENDAR"
].join("\n");

const calDataObj = {};
const feed1 = "cal_test_1";
const feed2 = "cal_test_2";
const store = { sf_cal: { feeds: [
  { id: feed1, url: "u1", name: "Lịch A" },
  { id: feed2, url: "u2", name: "Lịch B" }
], events: calDataObj, hidden: [] } };

const chromeStub = [
  "var chrome = {",
  " runtime: { onMessage: { addListener: function(){} }, getManifest: function(){ return { version: '9.9.9' }; }, getURL: function(p){ return p; }, sendMessage: function(){ return Promise.resolve(); }, lastError: null },",
  " tabs: { query: function(q, cb){ cb && cb([]); }, sendMessage: function(){}, create: function(){ return Promise.resolve(); } },",
  " windows: { create: function(){ return Promise.resolve(); } },",
  " scripting: { executeScript: function(){ return Promise.resolve([]); } },",
  " storage: { local: { get: function(keys, cb){ cb(Object.assign({}, " + JSON.stringify(store) + ")); }, set: function(obj, cb){ cb && cb(); } } },",
  " cookies: {}, contextMenus: {}",
  "};"
].join("\n");

const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  let errors = [];
  const results = [];
  const check = (name, cond, extra) => {
    if (cond) results.push("PASS  " + name);
    else { errors.push(name + (extra ? " :: " + extra : "")); results.push("FAIL  " + name + (extra ? " :: " + extra : "")); }
  };

  try {
    const stubEl = w.document.createElement('script');
    stubEl.textContent = chromeStub;
    w.document.body.appendChild(stubEl);

    const files = ['vi.js','en.js','zh.js','ru.js','ja.js'];
    for (const f of files) {
      const s = w.document.createElement('script');
      s.textContent = fs.readFileSync('OS/locales/' + f, 'utf8');
      w.document.body.appendChild(s);
    }
    const i18n = w.document.createElement('script');
    i18n.textContent = fs.readFileSync('OS/js/i18n.js', 'utf8');
    w.document.body.appendChild(i18n);

    const side = w.document.createElement('script');
    side.textContent = fs.readFileSync('OS/js/sidebar.js', 'utf8');
    w.document.body.appendChild(side);
  } catch (e) {
    console.error("LOAD ERROR:", e);
    process.exit(1);
  }

  await sleep(150);

  try {
    check("sidebar.js loaded & calInit ran", typeof w.calParseIcs === "function");

    const parsed = w.calParseIcs(ics);
    check("parse ICS count >= 3", parsed.length >= 3, "got " + parsed.length);
    const rruleEv = parsed.find(e => e.rrule.indexOf("WEEKLY") >= 0);
    check("weekday event parsed", !!rruleEv);
    const allDayEv = parsed.find(e => e.allDay);
    check("all-day event parsed", !!allDayEv);

    w.eval(`calFeeds = ${JSON.stringify(store.sf_cal.feeds)}`);
    w.eval(`calHiddenFeedIds = []`);
    w.eval(`calData = {}`);
    w.eval(`calData["${feed1}"] = [calNormalizeEvent({dtstart:"20260915T090000",dtend:"20260915T103000",allday:false,summary:"Học nhóm môn AI",location:"Thư viện",description:"Ôn tập chương 3",url:"",uid:"a",rrule:""}), calNormalizeEvent({dtstart:"20260901T070000",dtend:"20260901T080000",allday:false,summary:"Anh văn tuần",location:"",description:"",url:"",uid:"b",rrule:"FREQ=WEEKLY;BYDAY=TU"})]`);
    w.eval(`calData["${feed2}"] = [calNormalizeEvent({dtstart:"20260920",dtend:"",allday:true,summary:"Kỳ thi giữa kỳ",location:"",description:"",url:"",uid:"c",rrule:""})]`);

    w.eval("calViewMode='month'");
    w.eval("calViewYear=2026");
    w.eval("calViewMonth=8");
    w.eval("calViewFocusKey='2026-09-15'");
    w.eval("calSelectedKey='2026-09-15'");

    const grid = w.document.getElementById("cal-grid");
    const list = w.document.getElementById("cal-list");
    check("grid & list exist", !!grid && !!list);

    w.calRenderCalendar();
    check("month view renders cells", grid.querySelectorAll(".cal-cell").length > 20, "cells=" + grid.querySelectorAll(".cal-cell").length);
    check("month chips show time", grid.querySelectorAll(".cal-chip, .cw").length > 0);

    w.eval("calViewMode='week'");
    w.calRenderCalendar();
    check("week view header rows", grid.querySelectorAll(".cal-week-head").length === 7, "=" + grid.querySelectorAll(".cal-week-head").length);
    check("week view cells", grid.querySelectorAll(".cal-wcell").length === 7, "=" + grid.querySelectorAll(".cal-wcell").length);
    check("week has event chips", grid.querySelectorAll(".cal-chip, .cw").length > 0);

    w.eval("calViewMode='list'");
    w.calRenderCalendar();
    check("list view shows day sections", list.querySelectorAll(".cal-list-day").length >= 1, "=" + list.querySelectorAll(".cal-list-day").length);
    check("list view has event feed chip", list.querySelectorAll(".cal-event-feed").length >= 1);

    const map = w.calBuildMap("2026-09-01", "2026-09-30");
    check("buildMap has events", Object.keys(map).length >= 2, "keys=" + JSON.stringify(Object.keys(map)));

    w.eval(`calHiddenFeedIds = ["${feed1}"]`);
    const after = w.calBuildMap("2026-09-01", "2026-09-30");
    check("hidden feed excluded", Object.keys(after).length === 1, JSON.stringify(Object.keys(after)));
    w.eval("calHiddenFeedIds = []");

    const evMonthly = w.calNormalizeEvent({dtstart:"20260131",dtend:"",allday:true,summary:"m",location:"",description:"",url:"",uid:"m",rrule:"FREQ=MONTHLY;INTERVAL=1"});
    const occM = w.calOccurrencesInRange(evMonthly, "2026-01-01", "2026-06-30");
    check("monthly recurrences clamp short months", occM.length === 6 && occM.filter(o => o.key === "2026-02-28").length === 1, JSON.stringify(occM.map(o => o.key)));

    const evYearly = w.calNormalizeEvent({dtstart:"20260228",dtend:"",allday:true,summary:"y",location:"",description:"",url:"",uid:"y",rrule:"FREQ=YEARLY;INTERVAL=1"});
    const occY = w.calOccurrencesInRange(evYearly, "2026-01-01", "2030-12-31");
    check("yearly recurrences", occY.length === 5, JSON.stringify(occY.map(o => o.key)));

    w.eval(`var cEv = calNormalizeEvent({dtstart:"20261101T090000",dtend:"",allday:false,summary:"c",location:"",description:"",url:"",uid:"cc",rrule:""}); cEv.color = "#123456"; calData["${feed1}"].push(cEv);`);
    const m2 = w.calBuildMap("2026-11-01", "2026-11-30");
    check("buildMap uses event color", m2["2026-11-01"] && m2["2026-11-01"][0].color === "#123456");

    const g = id => w.document.getElementById(id);
    g("cal-manual-title").value = "Ôn thi cuối kỳ";
    g("cal-manual-start-date").value = "2026-10-05";
    g("cal-manual-start-time").value = "14:00";
    g("cal-manual-end-date").value = "";
    g("cal-manual-end-time").value = "16:00";
    g("cal-manual-loc").value = "Thư viện A";
    g("cal-manual-allday").checked = false;
    w.eval("calManualColor = '#f472b6'");
    g("cal-manual-freq").value = "monthly";
    g("cal-manual-end").value = "count";
    g("cal-manual-count").value = "4";
    w.calAddManualEvent();
    const mEvents = w.eval("calData['cal_manual']");
    check("manual feed created", Array.isArray(mEvents) && mEvents.length === 1);
    check("manual event color", mEvents[0].color === "#f472b6");
    check("manual event rrule COUNT", mEvents[0].rrule === "FREQ=MONTHLY;INTERVAL=1;COUNT=4", mEvents[0].rrule);
    check("manual event time range", mEvents[0].start.time === "14:00" && mEvents[0].end && mEvents[0].end.time === "16:00");

    w.calRenderFeedList();
    const manualRow = Array.prototype.slice.call(w.document.querySelectorAll(".cal-feed-row")).find(r => r.textContent.indexOf("Lịch thủ công") !== -1);
    check("manual feed no refresh btn", !!manualRow && (manualRow.querySelector(".cal-feed-btn:not(.cal-eye):not(.cal-del)") || {style:{}}).style.visibility === "hidden");

    w.calRenderFeedList();
    check("legend eye button rendered", !!w.document.querySelector(".cal-feed-row .cal-eye"));

    const md = w.buildNoteMarkdownNode("**đậm** *nghiêng* ***đậm nghiêng*** `code` [link](https://x.com)\n- mục a\n- mục b");
    check("markdown bold", !!md.querySelector("strong"));
    check("markdown italic", !!md.querySelector("em"));
    check("markdown bold+italic", !!md.querySelector("strong em"));
    check("markdown code", !!md.querySelector("code"));
    check("markdown link", !!md.querySelector("a"));
    check("markdown list", !!md.querySelector("ul") && md.querySelectorAll("li").length === 2);
    check("markdown node text ok", md.querySelector("strong em").textContent === "đậm nghiêng");

    const htmlNote = w.formatResearchNote("**abc** *x* [y](https://a.b)", "vi", true);
    check("formatResearchNote html renders strong", htmlNote.indexOf("<strong>abc</strong>") !== -1);
    const htmlBi = w.formatResearchNote("***abc***", "vi", true);
    check("formatResearchNote html bold+italic", htmlBi.indexOf("<strong><em>abc</em></strong>") !== -1);
    const plainNote = w.formatResearchNote("**abc**", "vi", false);
    check("formatResearchNote plain keeps text", plainNote.indexOf("**abc**") !== -1);

    const field = w.document.createElement("textarea");
    field.value = "hello world";
    field.setSelectionRange(0, 5);
    w.notesToggleInline(field, "**");
    check("wrap selection bold", field.value === "**hello** world");
    field.setSelectionRange(0, 9);
    w.notesToggleInline(field, "**");
    check("toggle bold off", field.value === "hello world");
    field.value = "*hello*";
    field.setSelectionRange(0, 7);
    w.notesToggleInline(field, "**");
    check("bold adds on italic", field.value === "***hello***");
    w.notesToggleInline(field, "**");
    check("bold off keeps italic", field.value === "*hello*");
    field.value = "**hello**";
    field.setSelectionRange(0, 9);
    w.notesToggleInline(field, "*");
    check("italic adds on bold", field.value === "***hello***");
    w.notesToggleInline(field, "*");
    check("italic off keeps bold", field.value === "**hello**");
    field.value = "abc";
    field.setSelectionRange(3, 3);
    w.notesToggleInline(field, "**");
    check("bold no-selection opens markers", field.value === "abc****");

    w.notesInitToolbar();
    const previewBtn = w.document.querySelector('.notes-tool-btn[data-md="preview"]');
    w.notesInitToolbar();
    const f = w.document.getElementById("f-notes");
    f.value = "**test** nội dung";
    f.dispatchEvent(new w.Event("input"));
    previewBtn.click();
    const pv = w.document.getElementById("notes-preview");
    check("preview toggles visible", pv.style.display !== "none");
    check("preview renders markdown", pv.querySelectorAll("strong").length === 1);
    const counter = w.document.getElementById("notes-count");
    check("char counter populated", (counter.textContent || "").length > 0, "count=" + JSON.stringify(counter.textContent));

    w.eval("window.__notesResized = 0; window.__origResize = notesAutoResize; notesAutoResize = function(){ window.__notesResized++; window.__origResize(); };");
    const clearBtn = w.document.getElementById("btn-clear-notes");
    f.value = "xóa hết nội dung";
    clearBtn.click();
    check("clear empties notes", f.value === "");
    check("clear triggers notesAutoResize", w.__notesResized >= 1, "calls=" + w.__notesResized);

  } catch (e) {
    console.error("TEST ERROR:", e);
    errors.push("EXCEPTION: " + e.message);
  }

  console.log(results.join("\n"));
  console.log("\n" + (errors.length ? ("FAILURES: " + errors.length + "\n- " + errors.join("\n- ")) : "ALL CHECKS PASSED"));
  process.exit(errors.length ? 1 : 0);
})();