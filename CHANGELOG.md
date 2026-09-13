# Changelog — ScholarFlow

Tất cả thay đổi đáng chú ý của dự án đều được ghi tại đây.
Định dạng theo [Keep a Changelog](https://keepachangelog.com/vi/1.1.0/), phiên bản theo [Semantic Versioning](https://semver.org/lang/vi/).

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
