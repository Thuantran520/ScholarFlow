# ScholarFlow Roadmap

> Kế hoạch phát triển từ v2.4.2 trở đi. Cập nhật sau mỗi milestone hoặc khi có phản hồi từ Store.

## Trạng thái hiện tại — v2.4.1 (đã nộp Store)

- **Store:** Đã nộp Firefox Add-ons (AMO) + Chrome Web Store; đang chờ phê duyệt.
- **Chất lượng:** 0 errors / 0 warnings / 0 notices trên addons-linter.
- **Đóng gói:** `scripts/check_store.ps1` (34 mục kiểm tra) tự chạy trong `scripts/package.ps1`; GitHub Actions build + upload zip tự động mỗi push, tạo Release khi tag `v*`.
- **Privacy:** Trang chính sách công khai tại GitHub Pages (`docs/privacy.html`), link trên trang landing.
- **Tính năng chính:** Citations (IEEE/APA/Harvard/MLA/BibTeX + đối soát nguồn), Redaction (blur/blackout/pixelate), Capture (screenshot/record/teleprompter), Cookie Manager, Autofill, To-do List, Bypass Paywall, 5 ngôn ngữ.

## v2.4.2 — Nâng cấp vì học tập & nghiên cứu (ưu tiên)

**Mục tiêu:** Thêm tính năng mới, sửa lỗi và cải thiện tính năng cũ — phục vụ trực tiếp việc học tập và nghiên cứu học thuật. (Các việc hành chính cho Store như theo dõi duyệt, screenshots, reviewer… tạm để phía sau.)

### Tính năng mới
- [ ] **Search & autofill nguồn:** gõ tên bài báo / tác giả → gợi ý từ Crossref / OpenAlex → tự điền metadata, giảm nhập tay.
- [ ] **Định dạng trích dẫn thêm:** Vancouver, Chicago 17, ACS/AMA (KH tự nhiên & y sinh).
- [ ] **Luồng học tập hợp nhất:** nối trích dẫn ↔ ghi chú ↔ to-do thành một chu trình (mục đích → nguồn → tóm tắt → hoàn thành).
- [ ] **Ghi chú trực tiếp trên PDF:** đánh dấu + trích dẫn từ tài liệu PDF đang đọc.
- [ ] **Flashcards ôn tập:** sinh thẻ ghi nhớ (spaced repetition) từ thư viện trích dẫn.
- [ ] **Hỗ trợ công thức (MathML):** nhận diện công thức toán khi trích dẫn tài liệu toán/CS.

### Sửa lỗi & cải thiện tính năng cũ
- [ ] **Metadata tiếng Việt:** trích xuất chính xác hơn cho trang báo/tài liệu tiếng Việt + tên tác giả kiểu "Nguyễn Văn A".
- [ ] **Capture:** sửa vùng chọn khi trang có iframe / cuộn lồng; ảnh sau redact sắc nét hơn.
- [ ] **Teleprompter:** chỉnh nhanh tốc độ + hiển thị lên ghi chú — phù hợp thuyết trình.
- [ ] **Bảo mật:** thu hẹp `host_permissions` về các domain cần thiết (giảm cảnh báo của Store).
- [ ] **Hiệu năng:** sidebar chạy mượt khi mở nhiều tab / trang nặng.
- [ ] **Lỗi phát sinh khi dùng:** ghi nhận và thêm vào danh sách sau mỗi buổi sử dụng.

## v2.5 — Nâng cao công cụ nghiên cứu (trung hạn)

**Mục tiêu:** Trở thành nơi quản lý tham khảo học thuật chỉn chu hơn.

- [ ] **Tích hợp Zotero / EndNote:** import từ file `.bib`/`.ris` có sẵn và export 2 chiều.
- [ ] **Bảng cộng tác trích dẫn:** merge / khử trùng lặp thư mục tham khảo, gắn thẻ (tags) và tìm kiếm.
- [ ] **Nâng cấp đối soát nguồn:** thêm Semantic Scholar + kiểm tra DOI trùng; phân biệt preprint vs bản chính thức.
- [ ] **Capture nâng cao:** gộp các vùng đã redact vào một ảnh; export PDF đa trang.
- [ ] **Ngôn ngữ:** thêm es / de / fr / pt.
- [ ] **Dark mode** nhất quán cho toàn bộ giao diện sidebar + teleprompter.

## v3.0 — Mở rộng hệ sinh thái (dài hạn)

**Mục tiêu:** Đồng bộ an toàn + hiện diện đa nền tảng, giữ cam kết privacy.

- [ ] **Cloud sync tùy chọn (opt-in):** đồng bộ thư mục trích dẫn giữa các máy qua mã hóa end-to-end; mặc định TẮT (bảo toàn 100% local).
- [ ] **Ứng dụng desktop (Tauri/Electron):** cùng bộ engine xử lý cục bộ, bổ sung Đọc-tạm (ruler/annotate).
- [ ] **Plugin / extensibility:** cho phép thêm formatter trích dẫn tùy chỉnh qua cấu hình.
- [ ] **Thống kê nghiên cứu cá nhân:** thời gian đọc, số nguồn đã xác minh — toàn bộ cục bộ.
- [ ] **Báo cáo tự động cho Store:** chạy bộ kiểm tra trình duyệt (Playwright) cho từng phiên bản trước khi đóng gói.

## Nguyên tắc xuyên suốt

- 100% xử lý cục bộ, không máy chủ, không tracking.
- Ít quyền nhất + giải trình rõ ràng từng quyền cho Store.
- Mỗi cập nhật phải chạy qua `check_store.ps1` + addons-linter trước khi nộp.
- Có GitHub Actions làm cổng bảo vệ chất lượng cho mọi PR/push.