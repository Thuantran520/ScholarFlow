# Work Accomplished

- **Fixed Reading Companion Toggle (Popup AI Nhanh)**: Bị mất popup là do lỗi đồng bộ UI giữa popup chat và mục Settings. Nút bật/tắt trong phần cài đặt không ghi nhận thao tác của người dùng. Tôi đã cập nhật cơ chế để áp dụng event delegation, cho phép bật/tắt chính xác ở mọi giao diện (sidebar, popup, settings modal).
- **Flattened AI Model Dropdown**: Đáp ứng yêu cầu bỏ khung chọn (optgroup) và làm phẳng danh sách model. Tất cả model hiện tại đều hiển thị trong một danh sách duy nhất.
- **Fixed `isInspectMode` typo**: Đã sửa lỗi check biến `isInspectActive` trong file `main.js` thành `isInspectMode` để tránh gọi companion khi đang inspect phần tử.
- Models `gemini-2.5` đã được xóa và thay thế ở các phiên trước.

Vui lòng reload lại extension và thử bôi đen lại văn bản, hoặc bật/tắt companion trong settings để kiểm tra.

