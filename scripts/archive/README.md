# scripts/archive

Historical one-off scripts. These were written for specific, already-completed
migrations (i18n patching, HTML cleanup, manifest fixes, telemetry removal, etc.).

**Do not run or modify these** unless you are doing a similar one-time migration
and understand exactly what each does. They are not part of the standard build,
test, or packaging workflow.

For the standard workflow, use the scripts in `scripts/` (see `../AGENTS.md` §11):

- `scripts/check_store.ps1` — pre-packaging checks
- `scripts/package.ps1` — build zips
- `scripts/sync_main_nav.js` — sync the `@@NAV@@` partial
- `scripts/i18n/check_locales.js` — i18n integrity
- `scripts/dev_chrome.ps1` / `scripts/dev_firefox.ps1` — dev loaders
