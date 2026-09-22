# ScholarFlow 2.5.1 — Notes for Reviewers / Ghi chú cho người đánh giá

> Bản dịch tiếng Việt nằm ngay dưới mỗi mục tiếng Anh, để bạn đối chiếu. Nội dung tiếng Anh là nội dung dùng để gửi lên AMO.
> Each section is followed by a Vietnamese translation for your reference. The English text is what you can paste into the AMO submission form.

---

## 1. What this extension does / Tiện ích này làm gì

**EN**
ScholarFlow is a Manifest V3 research assistant for Firefox and Chromium. It runs entirely from the bundled files: no remote scripts, no remote configuration, no framework loaded from a CDN. There is no account system. All settings and all gathered data (citation bibliographies, redaction masks, AI chat history, learned gambling-domain list, Lingua decks) live in the browser's storage under the extension's own keys. The manifest declares `data_collection_permissions: { "required": ["none"] }`.

The package is your own source: it is a verbatim copy of `manifest_firefox.json` (renamed `manifest.json`), the three root icons, and the whole `OS/` directory. No app code is transpiled, minified or bundled at packaging time, so the zip and the source are the same bytes.

**VI**
ScholarFlow là tiện ích học thuật theo Manifest V3 dành cho Firefox và Chromium. Toàn bộ chạy từ các file được đóng gói sẵn: không script từ xa, không cấu hình từ xa, không nạp khung thư viện từ CDN. Không có hệ thống tài khoản. Mọi cài đặt và dữ liệu thu được (danh mục trích dẫn, mask che mờ, lịch sử chat AI, danh sách tên miền cờ bạc đã học, bộ thẻ Lingua) đều nằm trong bộ nhớ trình duyệt dưới các khóa riêng của tiện ích. Manifest khai báo `data_collection_permissions: { "required": ["none"] }`.

Gói nộp lên chính là mã nguồn: bản sao nguyên vẹn của `manifest_firefox.json` (đổi tên thành `manifest.json`), 3 file icon ở gốc và toàn bộ thư mục `OS/`. Mã ứng dụng không bị biên dịch, nén hay đóng gói lại ở bước đóng gói, nên zip và mã nguồn là cùng một tập byte.

---

## 2. Network activity / Hoạt động mạng

**EN**
The extension makes no background network calls. Every network operation is initiated by the user (or continues a user-started action), and the complete list of hosts is fixed and covered by the allowlist test (`tests/security.test.js`). The OS/ tree contains no plain-HTTP URL literals and no remote `src`/`href`.

| Host | When it is contacted |
|---|---|
| `api.crossref.org`, `api.openalex.org`, `doi.org`, `export.arxiv.org`, `arxiv.org`, `search.crossref.org` | Citation tab: auto-fill of book/citation metadata and source verification — only when the user requests it. |
| `www.youtube.com` (oembed + watch page) | Citation verification, and AI reading of the currently open YouTube video's transcript — only via a user question about that video. |
| `html.duckduckgo.com` | AI "multi-source web search" — only when the user presses the web-search button or the auto-web-search path decides the page context is insufficient. |
| `generativelanguage.googleapis.com`, `api.openai.com`, `api.anthropic.com`, `openrouter.ai` | AI assistant — only when the user presses Send, using an API key the user supplies. |
| `localhost:11434` / `localhost:1234` | Local AI (Ollama / LM Studio) — only if the user explicitly adds such a server. |
| `0.peerjs.com` (PeerJS public broker) | Flow tab: peer discovery / signaling only. The actual file, chat and audio/video data travel directly between the two browsers over WebRTC. |
| `music.youtube.com` | Pomodoro break music — only when the user clicks Play. |

In addition, buttons in Security and Social open external pages in new tabs (HaveIBeenPwned, WebRTC/DNS-leak testers, platform recovery/report pages such as `facebook.com/hacked`, `accounts.google.com/signin/recovery`, `safebrowsing.google.com`). These are user clicks; none of those hosts are fetched in the background.

**VI**
Tiện ích không thực hiện lệnh gọi mạng nền nào. Mọi hoạt động mạng do người dùng khởi động (hoặc tiếp nối một thao tác đã khởi động), và danh sách host là cố định, được test allowlist bao phủ (`tests/security.test.js`). Trong `OS/` không có URL thường (`http://`) và không có `src`/`href` từ xa.

| Host | Khi nào được gọi |
|---|---|
| `api.crossref.org`, `api.openalex.org`, `doi.org`, `export.arxiv.org`, `arxiv.org`, `search.crossref.org` | Tab Trích Dẫn: điền metadata và xác minh nguồn — chỉ khi người dùng thao tác. |
| `www.youtube.com` (oembed + trang watch) | Xác minh trích dẫn, và AI đọc transcript video YouTube đang mở — chỉ qua câu hỏi của người dùng về video đó. |
| `html.duckduckgo.com` | "Tìm kiếm web đa nguồn" của AI — chỉ khi người dùng bấm nút tìm web hoặc đường tự động phát hiện ngữ cảnh trang không đủ. |
| `generativelanguage.googleapis.com`, `api.openai.com`, `api.anthropic.com`, `openrouter.ai` | Trợ lý AI — chỉ khi bấm Gửi, dùng API key do người dùng cung cấp. |
| `localhost:11434` / `localhost:1234` | AI cục bộ (Ollama / LM Studio) — chỉ khi người dùng chủ động thêm máy chủ. |
| `0.peerjs.com` (broker công khai của PeerJS) | Tab Flow: chỉ dùng để tìm và bắt tay peer. File, tin nhắn và âm thanh/video truyền trực tiếp giữa hai trình duyệt qua WebRTC. |
| `music.youtube.com` | Nhạc nghỉ Pomodoro — chỉ khi bấm Play. |

Ngoài ra, các nút trong Security và Social mở trang ngoài trong tab mới (HaveIBeenPwned, kiểm tra WebRTC/DNS leak, trang khôi phục/báo cáo như `facebook.com/hacked`, `accounts.google.com/signin/recovery`, `safebrowsing.google.com`). Đây là hành động bấm của người dùng; không host nào trong số đó bị fetch ngầm.

---

## 3. Points that may need attention / Điểm có thể cần đánh giá kỹ

### 3.1 Gambling shield — `declarativeNetRequest`

**EN**
This is the only network-interception feature, and it is worth reading (`OS/js/background.js`, section "Gambling shield").

- A curated, static list of **65 Vietnamese betting/casino domains**, plus a pattern for any domain containing the token `casino`, is turned into dynamic redirect rules. Rules redirect only `MAIN_FRAME` and `SUB_FRAME` to the bundled local page `OS/html/gamble-block.html` (declared as a `web_accessible_resource`). No response body, cookie or other traffic data is inspected — the API used is `declarativeNetRequest`, not `webRequest`.
- A content script (`OS/js/content/gamble-fp.js` + `gamble-scan.js`, `document_idle`) scores every page locally using gambling vocabulary (both Vietnamese and English) through two cheap gates before reading the text. When it decides the top frame is a betting/casino page, it redirects to the block page and records the exact host under `sf_gmbl_learned` (cap 400, oldest entries dropped). The background then installs a precise rule for that host, so a newly minted bookmaker domain is blocked at the network layer on the next visit. This list is learned locally and never leaves the machine.
- The feature is off-by-default in terms of persistence: the switch lives in Social → Protection, and when it is turned off all dynamic rules are removed (`installRules([])`). Unblocking a single domain from the block page adds it to the allowlist and deletes its learned entry.
- It does not block non-gambling content it cannot recognize; it redirects the frames it does recognize.

**VI**
Đây là tính năng can thiệp mạng duy nhất, và đáng đọc trước khi đánh giá (`OS/js/background.js`, mục "Gambling shield").

- Danh sách tĩnh tự quản lý gồm **65 tên miền cá độ/casino hướng Việt Nam**, cộng mẫu cho mọi tên miền chứa token `casino`, được chuyển thành quy tắc chuyển hướng động. Quy tắc chỉ chuyển hướng `MAIN_FRAME` và `SUB_FRAME` về trang cục bộ `OS/html/gamble-block.html` (khai báo là `web_accessible_resource`). Không đọc nội dung phản hồi, cookie hay dữ liệu lưu lượng nào — API dùng là `declarativeNetRequest`, không phải `webRequest`.
- Content script (`OS/js/content/gamble-fp.js` + `gamble-scan.js`, chạy ở `document_idle`) chấm điểm mọi trang bằng từ vựng cờ bạc (tiếng Việt và tiếng Anh) qua hai lớp lọc rẻ trước khi đọc văn bản. Khi xác định khung chính là trang cá độ/casino, nó chuyển hướng về trang chặn và ghi tên miền chính xác vào `sf_gmbl_learned` (giới hạn 400, mục cũ bị loại trước). Background sau đó cài quy tắc chính xác cho host đó, nên một tên miền nhà cái mới xuất hiện sẽ bị chặn ở tầng mạng từ lần truy cập sau. Danh sách này học cục bộ và không rời khỏi máy.
- Người dùng tắt được hoàn toàn: công tắc nằm ở Social → Bảo vệ, khi tắt thì mọi quy tắc động bị gỡ (`installRules([])`). Bỏ chặn một tên miền từ trang chặn sẽ thêm vào danh sách cho phép và xóa mục đã học.
- Tính năng không chặn nội dung không nhận diện được; nó chuyển hướng các khung mà nó nhận diện được.

### 3.2 Self-XSS / script-injection shield (Social)

**EN**
`OS/js/content/social.js` actively protects on the main social platforms (Facebook, Zalo, Instagram, WhatsApp, TikTok, Discord, X, Telegram). It removes injected `<script>` elements from other extensions or `data:`/`blob:` sources, unknown iframes, and `javascript:` links. Its "self-XSS" detector removes inline code that both reads cookies/localStorage/clipboard and calls `fetch`/`XMLHttpRequest`/`WebSocket`/`sendBeacon` in the same statement — the paste-a-code "free account" trick. A "record-only" mode is available instead of removal. It also cleans tracking parameters (`utm_*`, `fbclid`, `gclid`, `igshid`, …) at click time, including the nested `l.php?u=` wrapper, and can remove shop/spam links in comments.

The removal logic only strips the offending scripts/frames/links; it does not alter, read or transmit page content.

**VI**
`OS/js/content/social.js` chủ động bảo vệ trên các nền tảng mạng xã hội chính (Facebook, Zalo, Instagram, WhatsApp, TikTok, Discord, X, Telegram). Nó gỡ thẻ `<script>` lạ đến từ extension khác hoặc nguồn `data:`/`blob:`, iframe không xác định và link `javascript:`. Bộ phát hiện "self-XSS" gỡ mã nội tuyến vừa đọc cookie/localStorage/clipboard vừa gọi `fetch`/`XMLHttpRequest`/`WebSocket`/`sendBeacon` trong cùng biểu thức — chiêu dán mã "nhận acc free". Có chế độ "chỉ ghi nhận, không gỡ". Tính năng cũng làm sạch tham số theo dõi (`utm_*`, `fbclid`, `gclid`, `igshid`, …) tại thời điểm bấm link, kể cả wrapper lồng nhau `l.php?u=`, và có thể gỡ link shop/spam trong bình luận.

Logic gỡ chỉ xóa đúng script/iframe/link vi phạm; không sửa, đọc hay truyền nội dung trang.

### 3.3 Legitimate local page modifications / Thay đổi trang hợp lệ do người dùng bật

**EN**
Three content scripts modify pages, and each is a user-configurable toggle:
- `cookie_reject.js` (all frames) auto-dismisses cookie-consent banners on 16+ known consent platforms. It only clicks equivalents of "reject/close", never "accept".
- `darkmode.js` (`document_start`) applies dark filters once the user enables Dark Mode; it skips sites that already ship a dark theme.
- `security.js` shows phishing/typo-squat warnings, blocks iframe clickjacking, and warns when the user pastes sensitive numbers.

Extraction scripts (`inspect.js`, `snip.js`, `citation.js`, `main.js`, `lingua.js`) are passive and only act on explicit user actions (inspect/select/quote, "grab selected text", AI send). They do not collect or send anything on their own.

**VI**
Ba content script thay đổi trang, mỗi cái đều là công tắc do người dùng bật:
- `cookie_reject.js` (mọi frame) tự từ chối banner đồng ý cookie trên 16+ nền tảng đã biết. Nó chỉ bấm tương đương "từ chối/đóng", không bao giờ "đồng ý".
- `darkmode.js` (`document_start`) áp bộ lọc tối sau khi người dùng bật Dark Mode; nó bỏ qua trang đã có nền tối.
- `security.js` hiện cảnh báo phishing/giả mạo tên miền, chặn clickjacking và cảnh báo khi dán số nhạy cảm.

Các script trích xuất (`inspect.js`, `snip.js`, `citation.js`, `main.js`, `lingua.js`) thụ động và chỉ hoạt động khi người dùng thao tác rõ ràng (tra cứu/chọn/trích dẫn, "lấy đoạn bôi đen", gửi AI). Chúng không tự thu thập hay gửi gì.

### 3.4 Third-party code / Mã bên thứ ba

**EN**
Two vendored, minified third-party libraries are shipped inside the package, not loaded from a CDN: `OS/js/libs/peer.min.js` (PeerJS, WebRTC) and `OS/js/libs/qrious.min.js` (QR generation). Everything else in `OS/` is first-party source. No `eval`, no `new Function`, no dynamic `innerHTML`, no inline event handlers — enforced by the store checks (`scripts/check_store.ps1`) and `tests/security.test.js`.

**VI**
Hai thư viện min không phải nguồn tự viết được đóng kèm trong gói (không nạp từ CDN): `OS/js/libs/peer.min.js` (PeerJS, WebRTC) và `OS/js/libs/qrious.min.js` (tạo mã QR). Mọi thứ còn lại trong `OS/` là mã gốc của dự án. Không dùng `eval`, `new Function`, `innerHTML` động, không có inline event handler — được các bước kiểm tra áp dụng (`scripts/check_store.ps1`) và `tests/security.test.js` xác nhận.

---

## 4. Permission rationale / Giải trình quyền

**EN**

| Permission | Why it is requested |
|---|---|
| `tabs`, `activeTab`, `<all_urls>` | Read the current page for citation metadata, capture, redaction, dark mode, social/security checks. |
| `scripting` | Programmatic content-script injection for page capture, AI page reading, link checks. |
| `storage` | Persist all settings and user data locally. |
| `clipboardWrite` | "Copy" buttons (citation, QR, cookies, chat). |
| `cookies` | Cookie Manager (list/edit/export/import cookies, per-domain profiles). |
| `bookmarks` | "Bookmark all tabs" in Tab Manager. |
| `contextMenus` | Right-click menu entries (inspect element, capture, open-allowlist). |
| `browsingData` | Cookie/tracker cleanup tools. |
| `declarativeNetRequest` | Gambling shield redirect rules (section 3.1). |
| `web_accessible_resources` | The local gambling block page. |

**VI**

| Quyền | Lý do xin |
|---|---|
| `tabs`, `activeTab`, `<all_urls>` | Đọc trang hiện tại để trích dẫn, chụp, che mờ, dark mode, kiểm tra bảo mật/xã hội. |
| `scripting` | Tiêm content-script theo lệnh cho chụp trang, AI đọc trang, kiểm tra link. |
| `storage` | Lưu mọi cài đặt và dữ liệu người dùng cục bộ. |
| `clipboardWrite` | Các nút "Sao chép" (trích dẫn, QR, cookie, chat). |
| `cookies` | Cookie Manager (xem/sửa/xuất/nhập cookie, hồ sơ theo tên miền). |
| `bookmarks` | "Đánh dấu tất cả tab" trong Tab Manager. |
| `contextMenus` | Menu chuột phải (tra cứu phần tử, chụp, mở allowlist). |
| `browsingData` | Công cụ dọn cookie/tracker. |
| `declarativeNetRequest` | Quy tắc chuyển hướng của lá chắn cờ bạc (mục 3.1). |
| `web_accessible_resources` | Trang chặn cờ bạc cục bộ. |

---

## 5. How to build / reproduce this exact package / Cách dựng lại đúng gói này

**EN**

Requirements: Node.js ≥ 18, npm, PowerShell 7+ (`pwsh`) — or Python 3.x as fallback. Building only requires running the repo's own scripts; there is no compilation step.

1. Get the source:
   - The submitted zip **is** the runtime source (see section 1), or clone the repository:
   ```
   git clone https://github.com/Thuantran520/ScholarFlow.git
   cd ScholarFlow
   ```
2. Install dev tooling (used only to run the checks/tests; it is not part of the package): `npm install`.
3. Run the quality gate (syntax → i18n → lint → tests):
   ```
   npm run check
   ```
4. Run the packaging script (it first runs the pre-packaging store checks, then writes the zips):
   ```
   pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/package.ps1
   ```
5. Output: `dist/ScholarFlow_v2.5.1_Firefox.zip`.

Reproducibility: `package.ps1` writes the archive verbatim from `manifest_firefox.json` (as `manifest.json`), the root icons and the `OS/` folder. Because no transformation is applied, any source tree whose `OS/`, icons and `manifest_firefox.json` match the zip produces a byte-equivalent Firefox package. A Python build script (`scripts/build_packages.py`) or `package.ps1 -SkipChecks` can be used to rebuild the package directly from an unzipped copy of it.

**VI**

Yêu cầu: Node.js ≥ 18, npm, PowerShell 7+ (`pwsh`) — hoặc Python 3.x dự phòng. Việc dựng chỉ chạy các script có sẵn trong repo; không có bước biên dịch.

1. Lấy mã nguồn:
   - Gói zip đã nộp **chính là** mã nguồn chạy được (xem mục 1), hoặc clone repository:
   ```
   git clone https://github.com/Thuantran520/ScholarFlow.git
   cd ScholarFlow
   ```
2. Cài công cụ phát triển (chỉ dùng để chạy kiểm tra/test; không nằm trong gói): `npm install`.
3. Chạy cổng kiểm tra chất lượng (cú pháp → i18n → lint → test):
   ```
   npm run check
   ```
4. Chạy script đóng gói (trước tiên chạy kiểm tra trước đóng gói, sau đó ghi ra zip):
   ```
   pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/package.ps1
   ```
5. Kết quả: `dist/ScholarFlow_v2.5.1_Firefox.zip`.

Khả năng tái lập: `package.ps1` ghi zip nguyên vẹn từ `manifest_firefox.json` (đổi thành `manifest.json`), các icon gốc và thư mục `OS/`. Vì không có bước biến đổi nào, bất kỳ cây mã nguồn nào có `OS/`, icon và `manifest_firefox.json` khớp với zip sẽ tạo ra gói Firefox tương đương về byte. Có thể dùng script Python (`scripts/build_packages.py`) hoặc `package.ps1 -SkipChecks` để dựng lại gói trực tiếp từ bản giải nén của nó.

---

## 6. Testing depth / Mức độ kiểm thử

**EN**
The repository ships 7 automated suites run by `npm run check` (plus the 43-step pre-packaging check `scripts/check_store.ps1`): autofill, citation golden values, i18n page integrity, manifest parity, security rules (no eval, no dynamic innerHTML, network allowlist, MV3 CSP), social-upgrade and split_smoke (DOM/UI regressions for all 17 tabs). Firefox and Chrome manifests are kept in parity and verified by `tests/manifest.test.js`. Version parity across the 3 manifests and `package.json` is also asserted.

**VI**
Repository kèm 7 bộ test tự động chạy bằng `npm run check` (cộng 43 bước kiểm tra trước đóng gói `scripts/check_store.ps1`): autofill, golden citation, i18n trang, manifest parity, bảo mật (không eval, không innerHTML động, network allowlist, CSP MV3), social-upgrade và split_smoke (hồi quy DOM/UI cho cả 17 tab). Manifest Firefox và Chrome được giữ đồng bộ và xác nhận bởi `tests/manifest.test.js`. Tính nhất quán phiên bản giữa 3 manifest và `package.json` cũng được kiểm tra.