# Changelog — ScholarFlow

Tất cả thay đổi đáng chú ý của dự án đều được ghi tại đây.
Định dạng theo [Keep a Changelog](https://keepachangelog.com/vi/1.1.0/), phiên bản theo [Semantic Versioning](https://semver.org/lang/vi/).

---

## So sánh nhanh v2.4.2 → v2.4.4

| Hạng mục | v2.4.2 | v2.4.4 |
|---|---|---|
| **Trợ lý AI** | — | **Tab mới**: tóm tắt / hỏi đáp trên trang, Gemini · ChatGPT · Claude · Custom, key lưu local |
| **Ngữ cảnh AI** | — | Nội dung trang + đoạn bôi đen + ghi chú (toggle từng phần, tối đa 4000 ký tự) |
| **Model AI** | — | Gợi ý model theo API key (✓ khả dụng), đính kèm ảnh ≤4MB, 6 prompt chỉnh sửa được |
| **Bảo mật** | Như v2.4.2 | Gọi API chỉ khi bấm Gửi; thêm `optional_host_permissions` cho 3 host AI |

---

## So sánh nhanh v2.4.1 → v2.4.2

| Hạng mục | v2.4.1 | v2.4.2 |
|---|---|---|
| **Trích dẫn** | IEEE, APA, Harvard, MLA, BibTeX | + Vancouver, Chicago 17, ACS, AMA, Trích dẫn trong bài |
| **Loại tài liệu** | Bài báo, Hội thảo, Web, PDF, Phần mềm, Video, Sách | + **Chương sách (Book Chapter)**, + **Luận văn (Thesis)**, + ô **Nhà xuất bản / Nơi XB** |
| **Xuất tài liệu** | .bib, .ris, .txt | + **EndNote XML (.xml)**, + **CSL-JSON (.json)** |
| **Danh mục tài liệu** | Tìm kiếm cơ bản | + **Sắp xếp** (mới lưu / năm / tên / tag) |
| **Tự động nhận diện nguồn** | DOI + meta tags | + nhận diện theo **tên miền** (arxiv, pubmed, springer, openreview, github...) |
| **Che mờ (Redaction)** | blur / hộp đen / điểm ảnh / ẩn | + **lưu tự động & tái áp sau reload**, + **che vùng kéo chính xác**, + **khoá PIN nút "Xem bản gốc"** |
| **Che mờ thông minh** | — | + **quét & che dữ liệu nhạy cảm** (Email, SĐT, CCCD, thẻ, IP), + che theo từ khoá |
| **Bảo mật nâng cao** | — | + áp mask lên **ảnh chụp màn hình**, + pixelate thật bằng canvas, + PIN mã hoá **SHA-256 có salt** |
| **Cookie Manager** | Xuất/nhập .json + chuỗi, xoá dấu vết | + **danh sách cookie chi tiết** (xem/sửa/xoá/copy từng cái), + **xuất Netscape** (curl/wget), + **hồ sơ (profile) theo domain** |
| **Pomodoro** | — | + timer nghiên cứu 25/50/5, bộ lập kế hoạch nghỉ, nhạc nghỉ đa phong cách, cửa sổ nổi |
| **Học tập liên kết** | — | + chu trình mục đích → nguồn → ghi chú → việc cần làm |
| **Lịch & ghi chú** | — | + lịch sự kiện thủ công + đăng ký ICS, soạn ghi chú nghiên cứu, chèn công thức MathML |
| **Autofill nguồn** | — | + tìm & tự điền metadata từ Crossref/OpenAlex |
| **Teleprompter** | Cơ bản | + chỉnh tốc độ, ghi chú chạy song song, cuộn theo bài |
| **Chụp & quay** | Ảnh, quay cơ bản | + quay màn hình chất lượng cao, ảnh sắc nét, chống treo iframe/cuộn lồng |

---

## [2.4.4] - 2026-09-15

### Trợ lý AI (tab mới)

- Thêm tab **"AI Trợ lý"** trong sidebar & popup: tóm tắt, hỏi đáp ngay trên trang đang đứng.
- Hỗ trợ **Gemini (key miễn phí từ aistudio.google.com), ChatGPT, Claude, Custom URL**; API key chỉ lưu **local**, không gửi đi đâu khác.
- **Ngữ cảnh tuỳ chọn** gửi kèm: nội dung trang (tối đa 4000 ký tự), đoạn bôi đen, ghi chú nghiên cứu.
- **6 prompt nhanh**: Tóm tắt · Hỏi đáp · Giải thích · Dịch · Outline · Gợi ý — chỉnh sửa & khôi phục được trong Cài đặt.
- **Gợi ý model theo API key** (Gemini): chỉ hiển thị model khả dụng (đánh dấu ✓), kèm hướng dẫn chuyển sang bản Lite khi model quá tải/404.
- **Đính kèm ảnh** (≤4MB) để hỏi đa phương tiện; trả lời hiển thị dạng markdown cơ bản (bullet, đậm, code block).
- **Lịch sử hội thoại** giữ 50 tin gần nhất; copy từng câu trả lời, chèn trả lời vào ghi chú, xoá/nhóm hội thoại.
- Chế độ **không cần API key**: copy prompt + mở bản Web để dán — vẫn dùng được miễn phí.
- **Đọc trang thật sự thông minh hơn**: tự bỏ menu/quảng cáo, chọn đoạn **liên quan đến câu hỏi** (không chỉ 4000 ký tự đầu), và **gửi kèm tối đa 3 ảnh trên trang** (resize bằng canvas tại máy bạn) cho model vision như Gemini — chỉ khi bấm Gửi.
- **Chế độ "Nguồn thô + script" (nâng cao, mặc định TẮT)**: gửi cả text kể cả phần bị CSS ẩn + nội dung `<script>` nội tuyến của trang — dùng cho trang có đáp án/nội dung nhúng trong script; vẫn qua lớp cách ly untrusted + chọn đoạn liên quan.
- **"Xem video YouTube nói gì"**: trên trang watch, extension tự đọc `ytInitialPlayerResponse` của chính trang → chọn track phụ đề (ưu tiên tiếng Việt, rồi tiếng Anh, kể cả auto-CC) → tải transcript qua API `timedtext` (chỉ cho phép host youtube/google) → đưa vào prompt kèm timestamp `[mm:ss]`, qua lớp cách ly untrusted. Không có phụ đề sẽ có cảnh báo.
- **Chip "Giải đáp án"**: một chạm gửi prompt mẫu "giải trắc nghiệm + đáp án A/B/C/D + giải thích 1 dòng", tự dựa vào nội dung trang, ảnh câu hỏi hoặc dữ liệu đáp án nhúng trong mã nguồn (bật "Nguồn thô + script"). Prompt mẫu này chỉnh được trong ⚙ Cài đặt → Prompt.
- **Hội thoại đa lượt**: 6 tin nhắn gần nhất tự động gửi kèm ngữ cảnh (đúng chuẩn từng API Gemini/OpenAI/Claude) — hỏi "nó là ai?", "rút gọn lại" hoạt động đúng.
- Chip **"Tab"**: AI đọc nội dung tối đa 6 tab đang mở (1500 ký tự/tab, bỏ qua tab hệ thống), tóm tắt từng tab + lập bảng so sánh.
- Chip **"Tài liệu"**: tìm tự động trên **Crossref + OpenAlex** theo câu hỏi/chủ đề trang, AI chấm điểm và trích dẫn APA 5 công trình sát nhất.
- **Nhảy tới timestamp**: các `[mm:ss]` trong câu trả lời về video thành link bấm được → seek thẳng tới giây đó trên YouTube (`YT_SEEK`).
- **Dán link YouTube vào câu hỏi**: AI tự tải transcript của video ĐÓ (không cần đang mở tab) — hết cảnh model "đoán mò" theo tiêu đề; URL trong câu trả lời cũng hiển thị bấm được.
- **Thanh cuộn mới** trong khung chat & modal AI: mỏng 6–8px, bo tròn, gradient tím–xanh, track trong suốt.
- **Tự phục hồi khi model Gemini quá tải**: timeout/429/503 → tự gọi thử `2.5-flash-lite` / `flash-lite-latest` / `3.1-flash-lite`; thành công thì giữ luôn model mới cho các lần sau (có toast ⚡ báo). Timeout gọi API giờ tăng theo độ dài prompt (28s thường, 45s khi kèm transcript).
- **Mọi câu hỏi đều kèm link trang đang đứng** (URL + tiêu đề + videoId nếu là YouTube) trong vùng tin cậy của prompt — AI trích dẫn đúng nguồn, hết tình huống "đứng trang nào không biết".
- Ngữ cảnh mặc định nâng 4000 → **5000 ký tự**.
- **Sửa CORS Firefox khi trích nguồn YouTube**: tab Trích Dẫn giờ hỏi metadata (tên kênh/tác giả, ngày đăng, tiêu đề) qua content script cùng nguồn (`GET_YT_META`) + chốt dự phòng **oEmbed** (API mở CORS) — hết lỗi "Access-Control-Allow-Origin" và lấy đúng **tác giả** để trích dẫn.
- **Transcript bền với mọi trình duyệt**: nếu fetch trực tiếp bị CORS chặn → tự mở **tab ẩn** youtube.com để lấy phụ đề qua content script rồi đóng lại; cuối cùng vẫn có oEmbed cho tên + kênh. Header transcript trong prompt giờ kèm **"Kênh/Tác giả"**.
- **Hết lag tab AI**: tin nhắn mới được thêm từng dòng (không vẽ lại cả hội thoại), lưu lịch sử gom debounce 500ms, vòng lặp 2s tạm dừng khi tab AI đang ẩn, DOM chỉ ghi khi nội dung thực sự đổi.
- **Trích nguồn YouTube trọn vẹn**: `GET_YT_META` trả Title / Tên kênh (tác giả) / **Ngày phát hành** (publishDate→uploadDate→microdata fallback) / videoId / thời lượng; tab Trích Dẫn tự điền **Nền tảng = YouTube** vào "Tạp chí/Nơi XB" và "Nhà xuất bản" cho mọi URL watch/shorts/embed. (DOI/Tập/Số/Trang — đúng bản chất không tồn tại với video, để trống là chuẩn.)
- Sửa bảng markdown trong câu trả lời AI (gộp đúng 1 table thay vì vỡ từng dòng) + **GỢI Ý:** thành chip bấm được.
- **Fix dứt điểm Ngày xuất bản YouTube trong Trích dẫn**: bản cũ đọc raw HTML qua fetch (Chrome được, Firefox CORS); bản trung gian đọc DOM live — nhưng YouTube là SPA, điều hướng nội bộ **strips hết microdata + script playerResponse** nên mất ngày. Nay merge 3 tầng: DOM live → **tab ẩn hard-load** (fresh page luôn đủ metadata) → oEmbed; kèm cache playerResponse 90s.
- **Khôi phục 3 tab xây ở 2.4.3 nhưng chưa từng commit** (recovered từ git unreachable blobs): 🗂 **Tab Manager** (liệt kê/tìm/sort/group/pin, close trùng, bookmark-all, discard, lưu–restore phiên tab, export MD/TXT), 🔐 **Security** (chống phishing + typo-squat, chặn clickjacking, mở chuột phải theo site — kèm content script `security.js` real-time) và 🧪 **Test Helper** (record/replay thao tác, crawl + check link, fuzz form, a11y, perf, bug report có zip ảnh). 136 key i18n × 5 ngôn ngữ + CSS + 3 nav/section mỗi page đã hòa lại vào 2.4.4.
- **Dán ảnh Ctrl+V** vào ô chat tự đính kèm (≤4MB) — khỏi bấm nút Ảnh.
- **Bảo mật tab AI**: chặn Custom URL độc (chỉ HTTPS công khai; chặn localhost/IP nội bộ/metadata/credentials/redirect), **cách ly nội dung web** trong marker không tin cậy chống prompt injection + heuristic cảnh báo, lọc lịch sử chat (role/ảnh sai định dạng), giới hạn tốc độ gửi (2 giây/tin, 20 tin/5 phút).
- Manifest: thêm `optional_host_permissions` cho `generativelanguage.googleapis.com`, `api.openai.com`, `api.anthropic.com` — chi dùng khi bấm Gửi.
- Toàn bộ chuỗi mới đã dịch đủ **5 ngôn ngữ** (vi/en/zh/ru/ja).

---

## [2.4.2] - 2026-09-13

### Trích dẫn & Nguồn tham khảo

**Thêm**
- 4 chuẩn trích dẫn mới: **Vancouver**, **Chicago 17**, **ACS**, **AMA** (y khoa, hoá, KH tự nhiên).
- Tab **"Trong bài"** (in-text) với hướng dẫn IEEE/APA cho trích dẫn ngoặc & mạch văn.
- Loại tài liệu **"Chương sách" (Book Chapter)** và **"Luận văn" (Thesis/Dissertation)**.
- Trường **"Nhà xuất bản / Nơi XB"** (publisher) dùng chung cho sách / chương sách / hội thảo / luận văn / báo cáo.
- Xuất **EndNote XML (.xml)** và **CSL-JSON (.json)** cho toàn danh mục tài liệu.
- Sắp xếp danh mục tài liệu: **mới lưu / theo năm / theo tên / theo tag**.
- Tự động nhận diện loại nguồn theo tên miền (arxiv, pubmed, sciencedirect, springer, nature, acm, mdpi, plos... → bài báo; openreview, nips.cc, icml.cc... → hội thảo; github, gitlab, pypi, npm... → phần mềm).
- Tìm & tự điền metadata từ **Crossref / OpenAlex** (dropdown gợi ý thời gian thực ở ô Tiêu đề).

**Đổi**
- Chuẩn hoá định dạng **IEEE** theo đúng quy chuẩn cho mọi loại tài liệu:
  - Bài báo: `vol. X, no. Y, pp. Z, Tháng Năm`.
  - Sách: `Nơi XB: Nhà xuất bản, Năm` (chỉ năm, không tháng) + lần xuất bản.
  - Hội thảo: kèm Địa điểm tổ chức.
  - Chương sách: `"Tên chương," in *Tên sách*, ...`.
  - Luận văn: cấp bậc học vị + khoa + trường + địa điểm + năm.
  - Báo cáo: `Tổ chức, Địa điểm, Tech. Rep. Số, Năm`.
  - Phần mềm: `*Tên* (Version X). Năm. [Software]. Available: URL`.
- Viết tắt tháng chuẩn IEEE (`Sept.` → `Sep.`).

### Bảo mật & Che mờ (Redaction)

**Thêm**
- **Lưu trữ & tái áp dụng mask** theo từng trang (origin) — che vẫn còn sau khi tải lại trang.
- **Che vùng chính xác**: giữ chuột trái và kéo thành khung ngay trên trang.
- **Khoá PIN** cho nút "Xem bản gốc" (mã hoá SHA-256 có salt, không lưu plaintext).
- **Quét & che dữ liệu nhạy cảm tự động**: Email, SĐT, CCCD, số thẻ, IP.
- **Che theo từ khoá**: che mọi phần tử chứa từ khoá chỉ định.
- **Áp mask lên ảnh chụp màn hình** (màn hình thường / toàn trang / vùng chọn) để ảnh xuất ra luôn được bảo vệ.
- Pixelate thật bằng canvas (downsample → upsample) trên ảnh xuất.

**Đổi**
- PIN chuyển từ hash FNV-1a sang **SHA-256 có salt** qua Web Crypto (kèm fallback đồng bộ).

### Cookie Manager

**Thêm**
- **Danh sách cookie chi tiết**: tên, giá trị, hạn dùng, cờ `httpOnly` / `secure` / `SameSite`.
- Thao tác trên từng cookie: **copy giá trị**, **sửa giá trị**, **xoá riêng lẻ**.
- **Xuất Netscape** (`cookies.txt`) dùng cho `curl` / `wget`.
- **Hồ sơ (profile) cookie theo domain**: lưu nhiều bộ cookie, chuyển đổi nhanh, xoá hồ sơ.

### Chụp ảnh & Quay video

**Thêm**
- Quay màn hình **chất lượng cao** và ảnh chụp sắc nét hơn.
- **Chống treo** khi chụp phần tử trong iframe / cuộn lồng (stall guard).
- Xuất JPEG sắc nét hơn.

### Học tập & Nghiên cứu

**Thêm**
- **Pomodoro nghiên cứu**: timer tập trung 25/50/5, bộ lập kế hoạch nghỉ thông minh, nhạc nghỉ đa phong cách, cửa sổ nổi (floating window).
- **Chu trình học tập thống nhất**: mục đích học → nguồn trích dẫn → ghi chú → việc cần làm liên kết.
- **Nhận diện công thức MathML/MathJax** + chèn LaTeX vào ghi chú.
- **Lịch** với sự kiện thủ công (màu sắc, lặp lại) + đăng ký ICS.
- **Soạn ghi chú nghiên cứu** (markdown, thanh công cụ, xem trước).
- **Teleprompter** nâng cao: chỉnh tốc độ, ghi chú song song, cuộn theo bài.

### Kỹ thuật & Hiệu năng

**Đổi**
- Refactor sidebar thành các module ES, dùng partial nav dùng chung, thêm bộ test.
- Theo dõi điều hướng SPA theo sự kiện (fallback poll 2s) thay cho setInterval 1s — giảm tải CPU.
- Sửa lỗi tự đệ quy `tContent`/`notifySidebar` trong isolated world của Chromium.
- Sửa lỗi **CORS Crossref**: bỏ header `User-Agent` gây chặn preflight khi enrich tiêu đề.
- Mở native side panel khi click icon trên thanh công cụ Chrome.

### Sửa lỗi

- Metadata tiếng Việt trích xuất chính xác hơn (byline, hậu tố trang, innerText).
- Floating window hiển thị đúng ở mọi kích thước (container queries), đồng hồ co giãn theo kích thước.
- Dừng nhạc nghỉ không còn kích hoạt hộp thoại "rời trang" của YouTube Music.
- Ghi chú "focus-done" không còn hiện `{0}` thô.
- Điền IEEE từ Crossref khi bị WAF chặn.

---

## [2.4.1] - 2026-09-12

### Tính năng chính
- Trích dẫn: IEEE, APA 7th, Harvard, MLA 9th, BibTeX + xác minh nguồn.
- Che mờ (Redaction): blur / hộp đen / điểm ảnh / ẩn.
- Chụp ảnh & quay màn hình, teleprompter.
- Cookie Manager: xuất/nhập .json + chuỗi, vượt tường lửa.
- Autofill, danh sách việc cần làm, 5 ngôn ngữ (vi/en/zh/ru/ja).

---

## Hướng dẫn cập nhật

Khi phát hành phiên bản mới, hãy:
1. Thêm một mục `## [x.y.z] - YYYY-MM-DD` ở đầu file (trên phiên bản cũ nhất).
2. Gom thay đổi vào các nhóm: `### Thêm` / `### Đổi` / `### Sửa lỗi` (theo [Keep a Changelog](https://keepachangelog.com/)).
3. Cập nhật bảng **So sánh nhanh** ở đầu file nếu có tính năng mới.
4. Đồng bộ số phiên bản ở `package.json` + 3 file `manifest*.json` + chuỗi hiển thị trong `OS/html/*.html` và `OS/locales/*.js`.
