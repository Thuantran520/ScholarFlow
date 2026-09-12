# ScholarFlow Roadmap

> Kế hoạch phát triển từ v2.4.2 trở đi. Cập nhật sau mỗi milestone hoặc khi có phản hồi từ Store.

## Trạng thái hiện tại — v2.4.1 (đã nộp Store)

- **Store:** Đã nộp Firefox Add-ons (AMO) + Chrome Web Store; đang chờ phê duyệt.
- **Chất lượng:** 0 errors / 0 warnings / 0 notices trên addons-linter.
- **Đóng gói:** `scripts/check_store.ps1` (34 mục kiểm tra) tự chạy trong `scripts/package.ps1`; GitHub Actions build + upload zip tự động mỗi push, tạo Release khi tag `v*`.
- **Privacy:** Trang chính sách công khai tại GitHub Pages (`docs/privacy.html`), link trên trang landing.
- **Tính năng chính:** Citations (IEEE/APA/Harvard/MLA/BibTeX + đối soát nguồn), Redaction (blur/blackout/pixelate), Capture (screenshot/record/teleprompter), Cookie Manager, Autofill, To-do List, Bypass Paywall, 5 ngôn ngữ.

## v2.4.2 — Củng cố bản phát hành (ngắn hạn)

**Mục tiêu:** Ổn định + phản ứng nhanh với phản hồi từ Store.

- [ ] Theo dõi phê duyệt AMO / Chrome; xử lý mọi yêu cầu từ reviewer (permission justifications, screenshots, video demo).
- [ ] Tích hợp `npx addons-linter` vào GitHub Actions để bắt warning/error **trước khi** đóng gói (hiện chỉ có check nội bộ).
- [ ] Rà soát quyền `cookies` / `browsingData` / `<all_urls>`: cập nhật giải trình (justification) kịp bản duyệt.
- [ ] Sửa các lỗi nhỏ báo cáo từ cộng đồng / reviewer sau khi lên sóng.
- [ ] Bổ sung ảnh demo (screenshot gallery) cho trang landing + listing store.
- [ ] Tăng version manifest → `2.4.2` + đóng gói lại qua `package.ps1` (bắt buộc cho Chrome khi update).

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