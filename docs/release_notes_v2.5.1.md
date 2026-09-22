# Ghi chú Phiên bản — ScholarFlow 2.5.1

> Bản ghi chú này dùng cho phần "Release Notes" khi đăng phiên bản 2.5.1 lên cửa hàng tiện ích.

## Tính năng mới trong phiên bản 2.5.1

| Hạng mục | Nội dung |
|---|---|
| 🛡️ Bảo vệ mạng xã hội (Social) | **Chống chèn script tập nhất**: gỡ script lạ từ extension khác, script dạng `data:`/`blob:` che giấu, iframe lạ và link `javascript:`; phát hiện mã self-XSS (mã vừa đọc cookie/localStorage/clipboard vừa gọi fetch/XHR/WebSocket/sendBeacon). Hai chế độ: **Gỡ bỏ ngay** hoặc **Chỉ ghi nhận**. |
| | **Làm sạch link theo dõi khi bấm**: cắt `utm_*`, `fbclid`, `gclid`, `igshid`... khỏi URL trước khi mở, kể cả wrapper lồng nhau `l.php?u=`. |
| | **Gỡ link quảng cáo / shop trong bình luận**: Shopee, Lazada, Tiki, Sendo, TikTok Shop, Temu, AliExpress (đổi short-ID vẫn chặn nhờ giải mã wrapper), kèm xóa thẻ preview. |
| | Dòng thống kê + nút Reset ngay trong tab: đã chặn chèn, dọn link, gỡ link shop. |
| 🌐 Lingua Lab (học ngoại ngữ) | **Sentence mining mọi trang**: bôi đen → AI tạo thẻ chuẩn L2→L2 (giải thích bằng chính ngôn ngữ đang học, không dịch tiếng mẹ) kèm ví dụ, cloze và collocations. |
| | **Hệ thống lặp lại cách quãng SM-2** + active recall, deck riêng theo từng ngôn ngữ đích (en, es, fr, de, ja, zh, ru), streak và mục tiêu ôn mỗi ngày. |
| | **Grammar coach + Sổ lỗi**: chấm bài viết, phân loại lỗi (liên từ, mạo từ, giới từ, thì, hòa hợp, collocation, chính tả), mỗi lỗi đếm tần suất → bấm 1 nút sinh thẻ luyện từ chính lỗi của bạn. |
| | **Ngân hàng 30 liên từ học thuật** (however, therefore, moreover, although...) phân nhóm chức năng, drill điền chỗ trống offline. |
| | **Nghe**: đọc thẻ bằng TTS cục bộ của trình duyệt. |
| | **Chíp "✍ Lingua?" trên mọi trang**: kiểm tra tiếng Anh khi gõ từ 40 ký tự vào comment/textarea/contenteditable, kết quả trả về bong bóng tại chỗ (chỉ chạy khi bấm). |
| | **Chép chính tả 100% offline**: TTS đọc câu → gõ lại → đối chiếu từng từ tô màu + % điểm, từ sai tự ghi vào sổ lỗi `spelling`. |
| | **AI nối câu (Linker)**: biến câu cụt thành văn học thuật với however/therefore/although... kèm nút "Dùng bản này". |
| 🤖 Trợ lý AI | **Skill engine**: 13+ kỹ năng qua `/code /table /quiz /critique /mindmap /math...` + nhận diện ý định tự nhiên; 5 quy trình điều phối (Engineering, Academic Research, Live Fact-check, Page Study, General Cognitive). |
| | **Trích xuất 3 tầng**: Shadow DOM/iframe → scripting cách ly → fetch nền; chấm điểm Readability + JSON-LD `articleBody`. |
| | **Máy chủ AI tùy biến**: thêm Ollama, LM Studio, vLLM, OpenRouter với tên/model/key riêng; ô chọn model thống nhất. |
| | **Bộ hiển thị trạng thái quy trình**: nhãn đang xử lý, bộ đếm bước, thanh tiến trình. |
| | **Popup AI nhanh (Reading Companion)**: bật/tắt tức thì khi bôi đen. |
| 🎲 Lá chắn cờ bạc | **Chặn từ tầng mạng** bằng `declarativeNetRequest`: ~65 tên miền cá độ/casino hướng Việt Nam (kubet, 88bet, w88, iwin, nohu, b52...) + mọi tên miền chứa "casino", kể cả iframe quảng cáo cờ bạc nhúng trong trang khác. Danh sách nằm trong máy, không tải từ mạng. |
| | **Quét vân tay nội dung + tự học tên miền mới** (chống rotation): nhận diện bài viết cờ bạc qua chính ngôn ngữ (nhà cái, tài xỉu, bắn cá, nạp/rút, đại lý...) bằng 2 lớp lọc rẻ → chặn tại chỗ + học tên miền vào danh sách cục bộ (giới hạn 400) → lần sau chặn ngay từ tầng mạng. |
| | **Trang chặn bản địa hóa 5 ngôn ngữ**: hiện tên miền bị chặn, cảnh báo chiêu lure, nút Quay lại và **Bỏ chặn tên miền này**. |
| 🌙 Dark Mode Studio | **Night Reader (tông màu đọc an toàn)**: hoạt động trên nền engine invert, không đụng bố cục — thanh trượt **Ấm chữ** (0–100%), **Nền tối thêm** (0–60%) tự bù sáng cho ảnh, **màu liên kết** tùy chọn. |
| | **3 bộ màu dựng sẵn**: Sepia tin tức, AMOLED, Midnight ocean. |
| | **Tô màu phẳng (chế độ cũ)** giữ lại nhưng là công tắc riêng, tắt mặc định kèm cảnh báo. |
| | **Typography mạnh hơn**: 10 font (thêm Palatino, Charter, Verdana, Atkinson Hyperlegible, Tahoma), thanh trượt **chiều rộng cột đọc** và **căn lề 2 bên**. |
| ⚖️ Trung tâm uy tín | **Modal Minh Bạch Quyền Hạn Trình Duyệt** mới: giải trình từng quyền <all_urls>/cookies/clipboard/storage/scripting, hiện lần đầu và mở lại từ nút trong Trust Center. |
| 🧩 Giao diện | **Tùy chỉnh bố cục thanh đầu**: vị trí trên/dưới, hiện/ẩn từng mục và thứ tự cho brand/ngôn ngữ/uy tín/badge. |
| | **Sắp xếp lại thanh điều hướng** (17 tab) với nút khôi phục; thứ tự và tab đang mở được ghi nhớ. |
| | **Ô chat AI một dòng tự giãn** (autogrow), thay nhãn "+Trang" cũ bằng dải trang ghim ngang. |

## Sửa lỗi và tinh chỉnh

| Hạng mục | Nội dung |
|---|---|
| Bảo vệ mạng xã hội | Gỡ toàn bộ khiên CSS cũ (ẩn typing/đã xem/online) đã bị thay bởi các module khác; khôi phục helpers lõi cho Recovery/Vault/Checklist/Creator/Tools. |
| | Sửa `messaging.js` thiếu `security.js`/`social.js` trong danh sách lazy-inject; sửa listener `onMessage` của content script Social tham chiếu sai API. |
| Lingua | Bỏ tiếng Hàn (KO) khỏi ô chọn ngôn ngữ đích — giữ 7 ngôn ngữ: en, es, fr, de, ja, zh, ru. |
| Phiên bản | Đồng bộ phiên bản 2.5.1 ở 3 manifest, `package.json`, chuỗi hiển thị và `privacy_last_updated` trên cả 5 ngôn ngữ. |

## Bảo mật và quyền riêng tư

| Hạng mục | Nội dung |
|---|---|
| Xử lý cục bộ | Không máy chủ, không phân tích, không theo dõi. Dữ liệu nằm trong bộ nhớ trình duyệt. |
| Truy cập mạng | Chỉ gọi mạng khi người dùng thao tác: Crossref/OpenAlex/DOI (trích dẫn), Gemini/ChatGPT/Claude/OpenRouter hoặc AI cục bộ (trợ lý AI), broker PeerJS (chỉ để bắt tay, dữ liệu truyền trực tiếp WebRTC). |
| Quyền hạn | Khuyến nghị trước khi cập nhật: tiện ích xin thêm quyền `declarativeNetRequest` để bật lá chắn cờ bạc; có thể tắt trong Social → Bảo vệ. Modal "Minh bạch quyền hạn" giải trình chi tiết từng quyền. |

---
*Ghi chú phiên bản được biên soạn từ `CHANGELOG.md` và kiểm thử tự động của phiên bản 2.5.1.*