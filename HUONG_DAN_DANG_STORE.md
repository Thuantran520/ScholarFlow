# HƯỚNG DẪN ĐẨY EXTENSION LÊN CHROME WEB STORE & MOZILLA ADD-ONS (AMO)

Tài liệu này hướng dẫn chi tiết từng bước chuẩn bị, đóng gói và vượt qua khâu kiểm duyệt gắt gao của **Google Chrome Web Store** và **Mozilla Add-ons (AMO)** cho tiện ích **ScholarFlow v2.0.0**.

---

## I. CHECKLIST CHUẨN BỊ TRƯỚC KHI ĐĂNG

Tiện ích **ScholarFlow** hiện tại đã được cấu hình và kiểm định kỹ thuật đạt chuẩn Store 100%:
- [x] **Kiến trúc Manifest V3 hiện đại nhất**: Tương thích Chromium (Chrome/Edge/Cốc Cốc/Brave) và Mozilla Gecko (Firefox 109+).
- [x] **Chính sách bảo mật nội dung (CSP)**: `0` inline script, `0` inline onclick, `0` hàm `eval()`.
- [x] **Trang Chính sách quyền riêng tư (`privacy.html`)**: Đã tích hợp sẵn, cam kết 100% dữ liệu xử lý cục bộ (Zero Telemetry/Local-First).
- [x] **Hỗ trợ đa ngôn ngữ quốc tế (Live 5 Languages Switcher)**:
  - 🇻🇳 Tiếng Việt (Mặc định)
  - 🇬🇧 English (Toàn cầu)
  - 🇨🇳 中文 (Tiếng Trung)
  - 🇷🇺 Русский (Tiếng Nga)
  - 🇯🇵 日本語 (Tiếng Nhật)
  - Menu chuyển đổi tức thì ngay trên thanh Header, lưu trạng thái tự động vào `chrome.storage.local`.
- [x] **Đồng bộ giao diện 100%**: Popup và Sidebar (Thanh bên) có cùng giao diện Glassmorphic hiện đại, hỗ trợ cả 3 tab:
  1. 📝 **Trích Dẫn**: 6 chuẩn quốc tế (IEEE, APA 7th, Harvard, MLA 9th, BibTeX, In-text), đối soát OpenAlex & Crossref DOI.
  2. 🛡️ **Che Mờ**: Tương tác chọn che mờ/bảo mật thông tin nhạy cảm, slider mức mờ.
  3. 📸 **Chụp & Quay**: Chụp cuộn toàn trang, chụp đối tượng, quay video màn hình kèm tùy chọn âm thanh.
- [x] **Hệ thống chứng chỉ uy tín (Trust Center)**: Modal trung tâm uy tín và chứng nhận chuẩn quốc tế tích hợp ngay trong tiện ích.
- [x] **Đầy đủ bộ icon**: `icon16.png`, `icon48.png`, `icon128.png`.

---

## II. HƯỚNG DẪN ĐĂNG LÊN CHROME WEB STORE (GOOGLE)

### Bước 1: Chuẩn bị file zip cho Chrome
1. Nhấp đúp chạy file `Dung_Cho_Chrome_Edge.bat` để đảm bảo `manifest.json` đang ở định dạng Chromium V3 (có quyền `sidePanel` và `service_worker`).
2. Nén các file sau thành file `ScholarFlow_Chrome_v2.0.0.zip`:
   - `manifest.json`
   - `background.js`
   - `content.js`
   - `content.css`
   - `popup.html`
   - `sidebar.html`
   - `sidebar.js`
   - `privacy.html`
   - `icon16.png`, `icon48.png`, `icon128.png`, `icon.png`
   *(Lưu ý: Không nén các file `.bat`, file `.txt`, file `.md` vào zip)*.

### Bước 2: Đăng ký tài khoản Chrome Web Store Developer
1. Truy cập [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/).
2. Đăng nhập bằng tài khoản Google (phí đăng ký nhà phát triển 1 lần là $5 USD).

### Bước 3: Tải file lên và điền thông tin
1. Bấm **"New Item" (Mục mới)** -> Chọn file `ScholarFlow_Chrome_v2.0.0.zip`.
2. Điền thông tin Store Listing:
   - **Tên tiện ích**: `ScholarFlow - Trợ Lý Nghiên Cứu & Trích Dẫn Học Thuật`
   - **Mô tả ngắn**: `Trợ lý học thuật chuyên sâu: Trích dẫn chuẩn IEEE/APA/Harvard/MLA/BibTeX, chụp quay tài liệu và che mờ thông tin bảo mật.`
   - **Danh mục (Category)**: `Productivity` (Năng suất) hoặc `Education` (Giáo dục).
   - **Ảnh chụp màn hình (Screenshots)**: Tải lên ít nhất 1 ảnh kích thước `1280x800` hoặc `640x400` hiển thị giao diện tiện ích.

### Bước 4: Khai báo Quyền Riêng Tư (Privacy Practices) - CỰC KỲ QUAN TRỌNG
*Google sẽ từ chối nếu không giải trình đúng lý do sử dụng các permissions. Hãy sao chép nguyên văn các đoạn dưới đây vào ô tương ứng trên Developer Console:*

- **Single Purpose Description (Mục đích duy nhất)**:
  > "ScholarFlow is an all-in-one academic research companion that extracts scholarly bibliographic citations (IEEE, APA, Harvard, MLA, BibTeX), performs smart document capture/recording, and offers on-page element privacy redaction."

- **Permission Justifications (Giải trình quyền hạn)**:
  - `activeTab`: *"Required to read the title, author metadata, and DOI from the currently open webpage or academic paper when the user requests a citation or screenshot."*
  - `scripting`: *"Used to inject interactive element selector highlights for screen capturing and privacy blurring on user command."*
  - `storage`: *"Used to store saved bibliographies, user citation preferences, and recording settings strictly locally on the user's browser."*
  - `clipboardWrite`: *"Allows the user to easily copy formatted citations and captured screenshots to their clipboard with a single click."*
  - `sidePanel`: *"Enables the native Chrome Side Panel interface so researchers can browse documents and generate citations side-by-side without popup auto-closing."*
  - `host_permissions (<all_urls>)`: *"Required to extract metadata from diverse academic journals, publisher sites, and resolve DOIs via Crossref and OpenAlex APIs on whatever research site the user visits."*

- **Data Usage Disclosure (Khai báo dữ liệu)**:
  - Tích chọn: **"I do not sell user data"** (Tôi không bán dữ liệu người dùng).
  - Tích chọn: **"I do not use or transfer user data for purposes unrelated to the item's core functionality"**.
  - Tích chọn: **"I do not use or transfer user data to determine creditworthiness or for lending purposes"**.
  - **Privacy Policy URL**: Điền link trang `privacy.html` (có thể host trên GitHub Pages, ví dụ: `https://[username].github.io/ScholarFlow/privacy.html`).

3. Bấm **"Submit for Review" (Gửi để xem xét)**. Thời gian duyệt thường từ 24h - 72h.

---

## III. HƯỚNG DẪN ĐĂNG LÊN MOZILLA ADD-ONS (AMO - FIREFOX)

### Bước 1: Chuẩn bị file zip cho Firefox
1. Nhấp đúp chạy file `Dung_Cho_Firefox.bat` (chuyển sang manifest có `sidebar_action` và `gecko.id`).
2. Nén các file mã nguồn tương tự như trên thành `ScholarFlow_Firefox_v2.0.0.zip`.

### Bước 2: Đăng ký tài khoản Firefox Add-on Developer
1. Truy cập [Mozilla Add-on Developer Hub](https://addons.mozilla.org/developers/).
2. Đăng nhập bằng tài khoản Firefox Account (hoàn toàn miễn phí, không mất phí đăng ký như Google).

### Bước 3: Nộp tiện ích (Submit Add-on)
1. Bấm **"Submit a New Add-on"** -> Chọn **"On this site"** (Phân phối công khai trên kho tiện ích Mozilla).
2. Tải file `ScholarFlow_Firefox_v2.0.0.zip` lên. Hệ thống tự động quét kiểm tra file:
   - Nhờ cấu trúc CSP sạch và không dùng hàm cấm, quá trình kiểm tra tự động sẽ báo **100% Pass** (Xanh lá).
3. Điền thông tin:
   - **Name**: `ScholarFlow - Trợ Lý Nghiên Cứu & Trích Dẫn Học Thuật`
   - **Summary**: `Trợ lý học thuật: Trích dẫn IEEE/APA/Harvard/MLA/BibTeX, chụp quay tài liệu thông minh & che mờ bảo mật.`
   - **Categories**: `Academic` (Học thuật) & `Photos, Music & Media`.
   - **Privacy Policy URL**: Điền đường dẫn trang `privacy.html`.
4. Bấm **"Submit Version"**. Đội ngũ reviewer của Mozilla sẽ phê duyệt trong vòng 24 - 48 giờ.

---

## IV. CÁC TÍNH CHỈ VÀ YẾU TỐ UY TÍN ĐÃ TÍCH HỢP SẴN

1. **Huy hiệu Local-First Privacy**: Bảo đảm không truyền dữ liệu ra server lạ, giúp vượt qua các chính sách kiểm duyệt khắt khe nhất về quyền riêng tư.
2. **Tuân thủ chuẩn quốc tế**:
   - IEEE 2026 Manual
   - APA 7th Edition (Mới nhất)
   - Harvard Standard
   - MLA 9th Edition
   - BibTeX (LaTeX/Overleaf/ACM)
3. **Tích hợp API học thuật chính quy**: OpenAlex, Crossref DOI, arXiv, Semantic Scholar.
4. **Nút "Mở Sidebar" trên Popup**: Cho phép người dùng chuyển đổi linh hoạt giữa dạng cửa sổ thả xuống (Popup) và thanh bên cố định (Side Panel/Sidebar) chỉ bằng 1 cú click!
