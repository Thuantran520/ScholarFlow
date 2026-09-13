# AGENTS.md — ScholarFlow

> **Mandatory operating procedure for every contributor — human or AI agent.**
> Read this file in full **before** touching any code, and follow the checklist
> **after** every change. This project is 100%-local and 5-language; half-done
> changes (especially missing translations) break the build and the store review.

---

## 1. Project at a glance

- **Type:** Browser extension (Manifest V3), Chromium + Firefox, MV3 content scripts.
- **Languages:** `vi`, `en`, `zh`, `ru`, `ja` (5 locales) — all strings MUST be translated into all 5.
- **Privacy model:** 100% local processing. No server, no analytics, no tracking. Never add a network call that isn't clearly user-triggered.
- **Layout:**
  - `OS/` — extension source (html / js / css / locales / content scripts).
  - `manifest.json` = Firefox flavor (byte-identical to `manifest_firefox.json`); `manifest_chrome.json` = Chrome flavor.
  - `tests/` — the test suite (`npm test` runs every `*.test.js`).
  - `scripts/` — build/check tooling (see §9).
  - `docs/` — GitHub Pages landing + privacy policy.
- **Version:** bump `package.json` + `manifest.json` + `manifest_firefox.json` + `manifest_chrome.json` + the display strings in `OS/html/*.html` and `OS/locales/*.js` (see §7).

---

## 2. Mandatory checklist — run after ANY code change

The order matters. Do not skip steps.

1. **Sync i18n** — every new user-facing string has keys in all 5 locales (see §3).
2. **Check file structure** — no stray files, modules stay in their correct place, manifests still reference valid paths (see §4).
3. **Check code cleanliness** — no `eval`, no inline `<script>`, no inline event handlers, no dynamic `innerHTML`, no secrets (see §5).
4. **Verify correctness** — `node --check` each changed `.js`, then run the tests (see §6).
5. **Run the full suite** — `npm run check` (i18n + tests). It must be green before commit.

If any step fails, fix it before committing.

---

## 3. i18n workflow (MANDATORY — the #1 cause of breakage)

### Single source of truth
`OS/locales/{vi,en,zh,ru,ja}.js` — each exposes `I18N_<LANG>` with the **exact same key set**.

There are three namespaces, distinguished by prefix:

| Prefix | Used for | Notes |
|---|---|---|
| *(none)* | Sidebar / popup UI | referenced by `data-i18n*` in HTML |
| `content_` | Content-script strings (inspect/snip badges, toasts) | also listed in `scripts/i18n/namespace_manifest.json` |
| `privacy_` | The privacy page | also listed in `scripts/i18n/namespace_manifest.json` |

### Adding a new sidebar/popup string
1. Add the attribute in HTML: `data-i18n="my_key"` (or `data-i18n-title`, `data-i18n-placeholder`, `data-i18n-aria`, `data-i18n-html`).
2. Add `"my_key": "<vi text>"` to **`vi.js`**.
3. Add the SAME key to **`en.js`, `zh.js`, `ru.js`, `ja.js`** with correct translations.
4. Use `{0}`, `{1}`… for dynamic values, and keep `{`/`}` balanced.

### Adding a new content-script string
1. Add `"content_my_key": "<vi text>"` to all 5 locale files.
2. Add `"my_key"` (no prefix) to the `"content"` array in `scripts/i18n/namespace_manifest.json`.
3. Regenerate the artifact: `node scripts/i18n/generate_content_i18n.js`
   (this rewrites `OS/js/content/i18n.js` — **never edit that file by hand**).

### Adding a new privacy string
1. Add `"privacy_my_key": "..."` to all 5 locale files.
2. Add `"my_key"` to the `"privacy"` array in `scripts/i18n/namespace_manifest.json`.

### Verify
```bash
node scripts/i18n/check_locales.js
```
This checks: key parity across 5 locales, namespace manifest match, non-empty values,
balanced `{}` placeholders, HTML `data-i18n*` resolution, static `t()` keys, and that
`OS/js/content/i18n.js` is in sync.

---

## 4. File structure rules

- Keep the split modules where they are:
  - `OS/js/core/*` (browser/state/constants/messaging/active-tab), `OS/js/citation/*`,
    `OS/js/tabs/*`, `OS/js/content/*`, `OS/js/utils/*`, `OS/js/editor/*`.
- Content scripts load in this order (in `manifest*.json` `content_scripts.js`):
  `i18n.js → inspect.js → snip.js → scroll.js → citation.js → main.js`.
  Do not reorder unless you also update all 3 manifests.
- `OS/js/content/i18n.js` is **generated** — never hand-edit.
- Sidebar/popup must stay structurally mirrored: same `id` set, same `data-i18n` keys,
  same nav (`@@NAV@@` partial is synced by `node scripts/sync_main_nav.js`).
- New test files must end in `.test.js` and live in `tests/` so `run_all.js` picks them up.

---

## 5. Code cleanliness rules

These are enforced by `scripts/check_store.ps1` and `tests/security.test.js`:

- No `eval(...)`, no `new Function(...)`, no `document.write(...)`.
- No inline `<script>` blocks and no inline event handlers (`onclick=...`) in HTML.
- No dynamic `innerHTML`/`insertAdjacentHTML`/`outerHTML` (build DOM with `createElement`/`textContent`).
- No `createContextualFragment`.
- No hardcoded secrets/keys/tokens anywhere.
- All `https://` URLs must be on the allowlist (see `tests/security.test.js`).
- Prefer `textContent` over `innerHTML` for user-controlled strings (XSS safety).

---

## 6. Testing

### The full gate (run this before every commit)
```bash
npm run check
```
This runs, in order:
1. `node scripts/check_syntax.js` — parses every `OS/js/**/*.js`.
2. `node scripts/i18n/check_locales.js` — i18n integrity (key parity, namespaces, HTML refs).
3. `npm run lint` — ESLint (duplicate keys/cases, unreachable code).
4. `node tests/run_all.js` — every `tests/*.test.js` in its own child process.

Suites: `autofill`, `citation`, `i18n_pages`, `manifest`, `security`, `split_smoke`.

### When you add a feature or fix a bug
Add or extend a test in the matching suite. Golden-value tests live in
`tests/citation.test.js`; DOM/UI flows in `tests/split_smoke.test.js`; i18n integrity in
`tests/i18n_pages.test.js`; security rules in `tests/security.test.js`; manifest parity in
`tests/manifest.test.js`.

### Pre-packaging (before release)
```bash
pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/check_store.ps1
```
35 checks: version parity, referenced-file existence, JS syntax (`node --check`), security
scan, HTML inline-script scan, and the i18n integrity check.

---

## 7. Version bump

Bump **all** of these together (they must match):
1. `package.json` → `"version"`.
2. `manifest.json`, `manifest_firefox.json`, `manifest_chrome.json` → `"version"`.
3. Display strings in `OS/html/sidebar.html`, `OS/html/popup.html`, `OS/html/privacy.html`.
4. `"trust_card4_body_html"` and `"privacy_last_updated"` in all 5 `OS/locales/*.js`.
5. Add a `## [x.y.z]` entry at the top of `CHANGELOG.md` (and the comparison table).

`tests/manifest.test.js` verifies the manifest ↔ `package.json` parity.

---

## 8. Packaging

```bash
pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/package.ps1
```
Runs the pre-packaging checks, then writes `dist/ScholarFlow_v<ver>_Chrome.zip` and
`..._Firefox.zip`. (Python fallback: `python scripts/build_packages.py`.)

---

## 9. Command cheat-sheet

| Task | Command |
|---|---|
| Full gate (syntax + i18n + lint + tests) | `npm run check` |
| Tests only | `npm test` |
| i18n check only | `npm run check:i18n` |
| JS syntax check only | `npm run check:syntax` |
| Lint (ESLint) | `npm run lint` |
| Regenerate content i18n | `node scripts/i18n/generate_content_i18n.js` |
| Sync nav partial | `node scripts/sync_main_nav.js` |
| Pre-packaging checks | `pwsh scripts/check_store.ps1` |
| Package zips | `pwsh scripts/package.ps1` |
| Chrome dev load | `pwsh scripts/dev_chrome.ps1` |

---

## 10. Pitfalls (things that have broken the build before)

- **Missing translation in one locale** → `check_locales.js` key-parity fails. Always add to all 5.
- **Hand-editing `OS/js/content/i18n.js`** → overwritten by the generator; edit the locale files instead.
- **Unbalanced `<div>` in `sidebar.html`/`popup.html`** → tab sections nest into each other and buttons stop working. Always verify the 8 `.tab-section`s are siblings.
- **Changing content-script load order** → `startInspectMode`/`onMessage` become undefined. Keep `i18n → inspect → snip → scroll → citation → main`.
- **Adding a `User-Agent` header to `fetch`** → CORS preflight gets rejected by Crossref/OpenAlex. Use plain `GET` with `AbortSignal.timeout` only.
- **Forgetting the version bump in one file** → `manifest.test.js` parity fails.

---

## 11. Legacy one-off scripts (do NOT use casually)

`scripts/archive/` contains ~35 historical one-off scripts (`patch_*.py`, `fix_*.py`,
`update_*.py`, `translate_*.py`, `audit_*.py`, …). These were written for specific
migrations and are **not part of the standard workflow**. Do not run or modify them
unless you know exactly what they do. The only scripts you should normally touch are:

- `scripts/i18n/check_locales.js`, `generate_content_i18n.js`, `merge_namespaces.js`
- `scripts/check_store.ps1`, `scripts/package.ps1`
- `scripts/sync_main_nav.js`
- `scripts/dev_chrome.ps1`, `scripts/dev_firefox.ps1`
