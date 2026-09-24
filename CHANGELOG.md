# Changelog — ScholarFlow

Tất cả thay đổi đáng chú ý của dự án đều được ghi tại đây.
Định dạng theo [Keep a Changelog](https://keepachangelog.com/vi/1.1.0/), phiên bản theo [Semantic Versioning](https://semver.org/lang/vi/).

---

## [2.5.3] - 2026-09-24
### Added
- Tính năng Dịch học thuật thông minh (Smart Paragraph Translation) với 2 chế độ: Google Translate (nhanh, cả trang) và Local AI (dịch nội bộ 100%, bảo mật, bôi đen). (Đang phát triển)

### Fixed
- Sửa lỗi thanh công cụ Snipping (`#super-snip-toolbar`) bị trôi ra ngoài màn hình khi vẽ khung chọn sát lề hoặc quá nhỏ (Smart Collision Detection).

## [2.5.2] - 2026-09-22

### 🐛 Bản vá lỗi (Patch) — sửa logic lõi & đồng bộ phiên bản

**Sửa lỗi**
- **Không còn mất danh sách "đã bỏ chặn" domain cờ bạc khi chỉnh cài đặt Social**: `gambleAllow` chỉ lưu trong storage (background ghi khi bấm "Bỏ chặn tên miền này") nhưng `socSaveSettings` ghi đè `sf_social_settings` mà không gộp lại — bật/tắt bất kỳ công tắc nào (chống chèn, dọn link, cờ bạc...) cũng âm thầm xoá allowlist → domain đã cho phép bị chặn lại ở cả tầng DNR lẫn content scan. Nay mỗi lần lưu sẽ merge `gambleAllow` cũ vào payload.
- **Media player: PiP từ thanh bên trên Firefox chỉ "chuyển sang tab video" chứ không mở nổi cửa sổ**: sau vòng trước, bấm nút "cửa sổ nổi" vẫn (1) `tabmgrActivateTab` trước rồi gửi `MEDIA_PIP` — Firefox không có API PiP nên request bị khước từ và người dùng chỉ thấy hiệu ứng duy nhất là nhảy tab (tưởng nút hỏng); thêm nữa (2) **bấm lần thứ 2 để ĐÓNG cửa sổ lại bị nhảy tab dù đóng không cần cử chỉ**. Nay (a) chỉ chuyển focus về tab khi thực sự **mở** (đang chưa ở PiP); đã đang mở thì **tắt ngay mà không nhảy tab**; (b) agent chỉ dựng nút PiP tròn in-page khi trình duyệt có API gốc (`pipSupported` — Firefox không có → nút thanh bên ẩn, chấm dứt cảnh "bấm 1 lần = nhảy tab không mở gì"). Đồng thời khi một trang có **nhiều player**, gộp thêm tín hiệu **`.ytp-live` trên shell player** (lớp đánh dấu live mà YouTube gắn cả trước khi badge vẽ, và bền trên layout mobile không có badge).
- **Media player: nhận diện live YouTube bị SAI (video thường báo "TRỰC TIẾP", còn 24/7 live thật như lofi radio lại hiện thanh thời gian bình thường)** — sửa tận gốc bằng cách chỉ tin một tín hiệu đáng tin: **root player `.html5-video-player` mang class `.ytp-live`** (YouTube chỉ gán class này khi đang phát trực tiếp, không bao giờ cho VOD). Chi tiết:
  - **Đọc `.ytp-live` ở CẤP DOCUMENT**, không chỉ shell của `<video>` đang bắt: live 24/7 (lofi) có `duration` DVR hữu hạn (~14h) và `<video>` mà agent lấy mẫu thường là **element phụ/ambient nằm ngoài main player**, nên chỉ cần main player có `.ytp-live` là đủ kết luận live → hết cảnh live thật hiện thời gian.
  - **Không dùng sự *tồn tại* của `.ytp-live-badge`** làm tín hiệu: node này **luôn có** trong control bar của MỌI video và chỉ ẩn/hiện bằng **CSS** (không phải thuộc tính `disabled`/`hidden`), nên bộ lọc thuộc tính kiểu `:not([disabled])` khớp nhầm cả video thường (vd clip "Relax with my cat") → gán live giả.
  - **Nhưng** có live 24/7 (vd lofi radio) **không** gắn `.ytp-live` lên root → nếu chỉ tin class đó thì nó **mất luôn** live. Giải pháp cuối: coi **chip LIVE `.ytp-live-badge` ĐƯỢC RENDER THẬT** là tín hiệu live (đo `getComputedStyle`: `display:none`/`visibility:hidden`/`opacity:0` = ẩn → video thường; chip nhìn thấy được = live). Đây đúng là thứ mắt người dùng thấy, nên cả cat (chip ẩn) lẫn lofi (chip hiện, không cần `.ytp-live`) đều ra đúng. Giữ thêm `.html5-video-player.ytp-live` (doc-level) và URL `/live/` làm tín hiệu phụ.
  - **`getStartDate()` không quyết định live**: YouTube phát VOD qua MSE nên nó trả mốc thời gian THẬT (không phải 1970); nó chỉ còn **điền đồng hồ elapsed** `● mm:ss` khi video đã chắc chắn live.
  - **Tắt heuristic "duration không hữu hạn = live" trong ngữ cảnh YouTube** (nhiều `<video>` phụ báo Infinity/NaN cho cả video thường), heuristic này vẫn giữ cho player HTML5/MSE ở trang khác.
  - Kèm **dọn 2 cảnh báo "Lỗi bản đồ nguồn: NetworkError"** trên Firefox khi bật DevTools (`peer.min.js`/`qrious.min.js` trỏ `.map` không đóng gói → gỡ comment `sourceMappingURL`, giữ nguyên code, vẫn `node --check` OK).
- **Media player: nhận diện live cho MỌI nền tảng (không chỉ YouTube)** — mở rộng bộ dò **platform-agnostic**:
  - **Cửa sổ DVR tự trượt theo thời gian thực**: trước chỉ đếm **cạnh trái** `seekable.start(0)`, nay đếm **cả cạnh phải** `seekable.end` (kiểu HLS growing-window: start đóng đinh 0 nhưng end tiến). Cạnh (trái HOẶC phải) tiến ~đúng nhịp thời gian ⇒ live; video thường (VOD) cả hai cạnh đứng yên ⇒ không bao giờ bị gán live. Bắt Twitch, Facebook/Instagram Live, Kick, HLS.js/dash.js generic… kể cả live có độ-dài-hữu-hạn trước đây lọt lưới.
  - **XGPlayer (TikTok LIVE + Nimo/Douyu-class)**: khi `isLive`, xgplayer gắn class **`.xgplayer-is-live`** lên root player và chèn chip **`.xgplayer-live`** — mình đọc cả hai ở cấp document (light DOM, content script thấy được), nên TikTok/Nimo live được nhận ngay cả khi `duration` hữu hạn.
  - **"Bắt đúng video"**: `_allMedia`/`_biggest` giờ **ưu tiên element có nguồn thật** (`currentSrc`/`src`/`<source>`/`srcObject`) rồi mới tới lớn nhất — vì TikTok đặt video stream THẬT có src, còn ảnh cover là `<video poster>` KHÔNG có src (trước đây nó "lớn nhất" nên bị chọn → mất thumbnail + sai trạng thái). Fallback về danh sách đầy đủ nếu chẳng có element nào có nguồn.
  - **Thumbnail TikTok/live không có poster**: `_metaArt`/**`_nearbyImg`** lấy **ảnh lớn nhất** trong vùng player theo `naturalWidth` (không dùng layout-width có thể = 0, không giới hạn 640px), bỏ ảnh nhỏ <120px (favicon/avatar); thêm fallback `og:image:secure_url`/`twitter:image`/`link[rel=image_src]`/`meta[itemprop=image]` và `srcset`.
  - Seam `__sfMedia._liveEdge` + các test mới: cạnh trái/hay phải trượt ⇒ live, cạnh đứng ⇒ không live, `.xgplayer-is-live` ⇒ live, cover lớn ⇒ đúng artwork.
- **Media player: PiP trên Firefox** — nới điều kiện để **không tự ẩn** nút khi Firefox expose `requestPictureInPicture` nhưng `document.pictureInPictureEnabled` còn trả `false` (API mới, gate sau pref `dom.media-pip.enabled`): giờ `pipSupported` **chỉ cần method tồn tại**, và `_pipAcquire` **không** chặn theo `pictureInPictureEnabled` nữa → nút in-page xuất hiện được. **Trung thực:** ở bản Firefox Release chưa bật pref đó thì Web PiP API **không tồn tại**, và extension không có API nào gọi PiP của trình duyệt — khi đó không thể bật hình-trong-hình bằng code (người dùng phải dùng nút PiP gốc của Firefox: hover video → icon pop-out, hoặc chuột phải video → "Picture in Picture").
- **Media player: nút PiP in-page không hiện/không bấm được (lỗi "bất cập ở sidebar")** — CSS của overlay bị viết **thiếu dấu `.`** trước tên class: `__sf-media-pip{...}` thay vì `.__sf-media-pip{...}`, nên selector khớp **element `<__sf-media-pip>`** chứ không khớp **`<button class="__sf-media-pip">`** → mọi rule (`position:fixed`, `.is-visible`, `pointer-events`) **không áp dụng** → nút không bao giờ hiện để bấm. Vì Chrome/Firefox **bắt buộc transient user activation trên trang video** để MỞ PiP (click ở sidebar không cấp cử chỉ cho trang), luồng đúng là: sidebar gửi `MEDIA_PIP` → nếu `needs-gesture` thì **chuyển sang tab video** để **nút tròn in-page** (đã pulse) chờ 1 chạm thật → mở được. Nút bị CSS làm hỏng nên người dùng kẹt. Nay đã sửa selector + thêm **test hồi quy** kiểm tra `<style>` có `.__sf-media-pip{`/`.is-visible` và không còn selector dotless (kiểu lỗi này JSDOM chỉ check `classList` nên trước đó lọt qua).
- **Media player: Firefox/Chrome — mở PiP từ sidebar chỉ ăn LẦN ĐẦU, lần sau phải "chạm video rồi mới bấm sidebar"** — nguyên nhân: `requestPictureInPicture()` bắt buộc **transient user activation trên chính document trang video**; click ở sidebar/popup **không** cấp activation cho document khác, nên chỉ mở được khi trang video còn trong cửa sổ cử chỉ ~5s sau lần tương tác gần nhất. Vì không extension nào tổng hợp được activation đó, mình đổi luồng thành **một chiều**: khi `MEDIA_PIP` bị từ chối (`needs-gesture`), content script **gài cò `_pipArmForGesture()`** — người dùng chỉ cần **chạm 1 cái thật lên trang video** là `_pipTryEnter()` tự gọi lại `requestPictureInPicture()` (lúc này đã có cử chỉ) → **PiP mở ngay, không phải quay lại sidebar**; mỗi lần bấm sidebar đều gài lại, có `isTrusted` guard + auto-tắt sau 12s để không "ăn" nhầm click không liên quan. Test mới: lần 1 `needs-gesture` → `_pipArmed()` true → `_pipTryEnter()` gọi lại (calls=2) → disarm.
- **Header sai lệch khi ẩn item bên phải đầu tiên**: `margin-left:auto` (đẩy cụm phải sát lề) gán vào phần tử `display:none` nên các item phải + bánh răng cài đặt dồn sát bên trái thay vì nằm bên phải. Nay anchor lấy item hợp lệ ĐẦU TIÊN chưa bị ẩn.
- **Nút ▲▼ reorder header "chết" khi hai item cùng giá trị order**: swap hai giá trị order bằng nhau là no-op (mặc định `brand:0`/`lang:0` trùng nhau ngay sau khi đổi side). Nay mỗi lần đổi side / di chuyển đều đánh số lại thứ tự theo nhóm (0,1,2…) nên nút luôn có tác dụng.
- **Reorder nav làm quên tab đang mở**: `saveNav` chỉ ghi `{order}` — phần `active` bị xoá, mở lại sidebar tự nhảy về tab đầu tiên dù trước đó đang ở tab khác. Nay `active` luôn được lưu kèm mỗi lần sắp thứ tự/reorder/reset.
- **Media player: sau fan-preview, tiêu đề nhảy về "Unknown"**: `_tabmgrMediaPreviewReset` chỉ đọc từ bản đồ `known` (chỉ lưu tab có agent state) — tab nghe được nhưng không có agent state bị mất tiêu đề. Nay đọc thẳng `sourceTab`/`state` đang hiển thị.
- **Media player: phím seek dùng mốc thời gian cũ**: base của phím ←/→ lấy `state.currentTime` chụp tại lúc vẽ (poll không làm mới) và `dragTime` không bao giờ được xoá sau drag → sau khi kéo thanh, các lần bấm phím sau nhảy về vị trí cũ thay vì thời gian thực đang phát. Nay base lấy từ đồng hồ live đang extrapolate trên thanh (được poll làm mới mỗi lần) và mốc drag được giải phóng ngay sau khi gửi seek.
- **Media player: chưa nhận diện được video đang phát trực tiếp**: trước chỉ xét `duration === Infinity` — player sống kiểu MSE/HLS (nhiều trang video phổ biến) báo `duration = 0` khi có metadata nhưng có nhiều hơn chỉ số của stream, nên badge LIVE/thanh đỏ không bao giờ bật. Nay nhận diện là `readyState > 0` và `duration` KHÔNG phải số hữu hạn dương (Infinity, 0, NaN) — bắt đủ cả native lẫn MSE/HLS, và không nhầm video chưa nạp metadata (readyState 0) thành live.
- **Media player: bấm đổi poster bị "nháy" lại hiệu ứng quạt**: sau khi đổi bài, deck bìa vừa dựng lại nằm ngay dưới con trỏ nên `pointerenter` bắn tức thì → chạy lại animation mở quạt một lượt (nhấp nháy thấy được). Nay deck mới có **khóa mount** 260ms: bỏ qua lần `pointerenter` đầu + tắt `transition` của các thẻ trong quãng đó, deck hiện ra tĩnh ngay; quạt chỉ mở lại khi thực sự rê ra rồi rê vào.
- **Media player: nút prev chỉ "phát lại từ đầu" chứ chưa tua về video trước**: trước ưu tiên restart khi đang phát giữa bài (>3s) nên bấm prev quanh quẩn phát lại chính bài đó. Nay đổi thứ tự — ưu tiên bấm nút **Previous của chính trang web** (trang tự áp ngưỡng restart của nó, ví dụ chính YouTube quay đầu khi đang giữa video); chỉ khi trang không hề có nút đó mới fallback tua về đầu bài.
- **Media player: nút "cửa sổ nổi" chưa hoạt động được khi bấm từ thanh bên**: Chrome từ chối **mở** Picture-in-Picture nếu request không nằm trong một *cử chỉ người dùng* tươi trên trang video (lỗi chuẩn: "Must be handling a user gesture"); sidebar gửi tin nhắn là request "stale" nên không mở nổi. Nay (1) bấm nút trên thanh bên sẽ **chuyển focus về tab video trước** rồi thử API trực tiếp; (2) nếu trình duyệt vẫn khước từ, agent **thả ngay một nút PiP tròn nhỏ ngay trên video trong trang** (click thật trên đó là cử chỉ hợp lệ) — người dùng chỉ cần bấm 1 lần là cửa sổ nổi mở. Nút in-page chỉ xuất hiện khi trình duyệt có API gốc (Firefox không có → không hiện), đóng cửa sổ thì không cần cử chỉ.
- **Media player: PiP giờ thử mở NGAY Ở TAB NỀN, không cần bấm vào tab trước (như Edge)**: trước đây mỗi lần bấm nút cửa sổ nổi trên sidebar là **bắt buộc** `tabmgrActivateTab` (chuyển sang tab video) rồi mới mở → chậm, phiền, và người dùng tưởng phải click video thì mới bật. Nay content script trả kèm `pipOutcome` (`opened`/`closed`/`needs-gesture`/`unsupported`) sau khi **thử API ngay trên tab nền** (không đổi focus): trình duyệt cho mở không cần cử chỉ (Edge) → **cửa sổ bật ra tức thì, không nhảy tab**; chỉ khi bị từ chối vì thiếu cử chỉ (`needs-gesture`, Chrome/Firefox) thì sidebar mới chuyển tab một lần để nút PiP in-page đang nhấp nháy chờ đúng 1 chạm. Thêm `MEDIA_PIP` timeout 1.5s (đủ cho promise PiP), và test mới cho cả hai nhánh.
- **Media player: nút "video trước" trên YouTube phải bấm vào tab mới ăn**: `_skipFind` tìm thấy `.ytp-prev-button` nhưng YouTube **render sẵn nút này ở trạng thái disabled** khi không có video trước; code cũ bấm vào nút disabled (no-op) rồi `return`, **bỏ qua** luôn cả nhánh lùi-qua-queue lẫn tua-về-đầu → prev trông như "chết" tới khi focus lại tab. Nay `_skip` **bỏ qua điều khiển đang disabled** (`.disabled`/`aria-disabled`/lớp `disabled`), nên khi không thực sự có video trước nó rơi đúng vào lùi item queue hoặc restart — chạy được ngay từ tab nền, không cần click vào tab. (Prev/Next/vẫn gửi thẳng `MEDIA_SKIP` tới tab nền, không đổi focus.)
- **Media player: thời gian của video live vẫn hiển thị `00:00 / 00:00`**: một số player live (finite-duration + `seekable` vô hạn, hoặc stream thông qua `getStartDate()`) chưa được nhận diện là live nên thanh đen không full. Nay nhận diện thêm (a) **`seekable.end` là vô hạn** và (b) **`getStartDate()` > epoch 1970** (khẳng định live + biết thời điểm bắt đầu phát); đồng thời **thời gian hiển thị của stream trực tiếp = thời gian phát thực của stream** (`● mm:ss` đếm từ ngay khi bắt đầu sóng) thay vì badge tĩnh — badge LIVE chỉ còn dùng khi không xác định được vạch bắt đầu.
- **Media player: livestream YouTube vẫn chưa nhận diện (live) trong một số trường hợp**: thêm lớp tín hiệu chặn cuối cho stream player "không chịu" báo độ dài vô hạn dù đang live — (1) `duration` hữu hạn nhưng **khổng lồ bất thường** (>10¹⁰ giây ≈ ≥300 năm, kiểu MSE kẹp số) được xem là vô hạn → live; (2) **trang tự xưng là live qua dấu hiệu DOM địa phương** — URL `/live/` của YouTube hoặc badge **`.ytp-live-badge`** trong thanh player → live; (3) khi một trang có **nhiều player** (teaser, lớp ambient, slot quảng cáo…), agent ưu tiên **player lớn nhất trên màn hình** để không nhầm preview nhỏ thành nguồn chính.

**Nâng cấp Media player (UI/UX)**
- **Đổi tên banner "Player nhạc" → "Trình phát media"**: phản ánh đúng cả video lẫn nhạc; dịch đủ 5 ngôn ngữ + cập nhật chuỗi fallback trong `sidebar.html`, `popup.html`.
- **Phát trực tiếp (live stream): thanh tiến trình đỏ full + nhãn LIVE**: agent `media.js` nhận diện live khi `readyState > 0` và `duration` không phải số hữu hạn dương (native = `Infinity`, MSE/HLS live = `0`) → thanh đỏ chạy 100% toàn thanh, thời gian thay bằng badge **● LIVE** nhấp nháy đỏ thay vì `00:00 / 00:00` gây hiểu nhầm; và tắt hoàn toàn khả năng seek (kéo chuột, phím ←/→) vì stream trực tiếp không seek được.
- **Bấm poster không còn "loạn"/giật về bài trước**: thứ tự lớp ảnh bìa phía sau giờ xoay **tiến từ bài hiện tại** (`hiện tại → kế tiếp → sau kế tiếp`, vòng quanh) thay vì xếp theo chỉ số bắt đầu phát cũ — trước đây thẻ ngay bên phải poster là BÀI TRƯỚC, vô tình bấm vào là nhảy giật lùi. Giờ deck đọc trái→phải = "đang phát → kế tiếp", nút bấm nào cũng đi tới.
- **Nút tròn điều khiển ‹ | play/pause | › + nút cửa sổ nổi (popup) cho video**: cụm trái sắp `prev ‹` → `play/pause` → `next ›`, 3 nút điều khiển đều hình tròn 24px khớp nhau; thêm **nút PiP tròn** trong cụm phải — bấm mở/đóng **cửa sổ nổi động (Picture-in-Picture)** cho video đang xem, 100% local (trình duyệt tự render, không mở tab/cửa sổ mới), nút chỉ hiện với nguồn **video có API gốc** (`isVideo` + `pipSupported`, Firefox tự ẩn) và sáng đỏ khi cửa sổ đang mở; kèm **nút PiP in-page ngay trên video** làm lối mở đáng tin cậy khi trình duyệt yêu cầu cử chỉ thật.

**Kỹ thuật & tuân thủ**
- Đồng bộ phiên bản **2.5.2** ở `package.json` + 3 `manifest*` + chuỗi hiển thị `OS/html/sidebar.html`, `OS/html/popup.html`, `OS/html/privacy.html` + `trust_card4_body_html` / `privacy_last_updated` trên cả 5 ngôn ngữ (vi/en/zh/ru/ja) — parity pass theo `tests/manifest.test.js`.
- Mở rộng test: `split_smoke.test.js` phủ header (ẩn item phải, reorder trùng order, giữ `active` khi reorder nav), media player (keyboard seek dùng đồng hồ live, reset fan-preview giữ tiêu đề, detect live `Infinity`/`0`/finite/`seekable` vô hạn/`getStartDate()`/`1e11` kẹp MSE/badge `.ytp-live-badge`/ưu tiên player lớn nhất, hiển thị thời gian stream elapsed `● mm:ss`, prev ưu tiên nút của trang, khóa mount chống "nháy" quạt, nút PiP mở/đóng cửa sổ nổi video — chỉ hiện với nguồn video + API gốc, nút PiP in-page chỉ dựng khi video hỗ trợ và ẩn khi không có layout) và `social-upgrade.test.js` phủ việc bảo toàn `gambleAllow` khi lưu cài đặt.

---

## So sánh nhanh v2.5.1 → v2.5.2

| Hạng mục | v2.5.1 | v2.5.2 |
|---|---|---|
| **Allowlist "bỏ chặn" cờ bạc** | Bị xoá khi chỉnh bất kỳ công tắc Social | **Giữ nguyên** (merge `gambleAllow` khi lưu) |
| **Header custom** | Cụm phải + ▲▼ reorder lỗi khi ẩn/trùng order | **Anchor item hiển thị đầu tiên + đánh số lại thứ tự** |
| **Nav reorder** | Mất tab đang active khi bấm ▲▼/reset | **Lưu kèm `active`**, mở lại đúng tab đã dùng |
| **Media player** | Fan-preview mất tiêu đề, phím seek nhảy về thời gian cũ | **Khôi phục tiêu đề từ nguồn live + base từ đồng hồ realtime** |
| **Media player (live)** | Chỉ nhận `duration=Infinity`, bỏ sót live HLS/MSE | **Bắt mọi `duration` không hữu hạn dương khi có metadata + `seekable` vô hạn + `getStartDate()`** |
| **Media player (live time)** | Hiện `00:00 / 00:00` cho stream trực tiếp | **Thời gian hiển thị = thời gian sóng thật (`● mm:ss`)** khi biết vạch bắt đầu |
| **Media player (prev)** | Nút prev chỉ phát lại bài từ đầu | **Ưu tiên nút Previous của trang**, chỉ fallback tua đầu khi không có nút |
| **Media player (poster)** | Bấm đổi bài bị "nháy" lại hiệu ứng quạt | **Khóa mount 260ms** (bỏ qua pointerenter + tắt transition) — deck hiện tĩnh |
| **Media player (UI)** | "Player nhạc", seek được với stream trực tiếp, poster gây giật lùi, nút play/prev/next xáo thứ tự | **Banner "Trình phát media" + thanh đỏ full/LIVE (chặn seek) + deck xoay tiến + nút tròn ‹▶› bên trái + nút PiP mở/đóng cửa sổ nổi video** |
| **PiP cửa sổ nổi** | Bấm từ thanh bên bị Chrome từ chối (thiếu user gesture) | **Focus tab trước khi gửi + nút PiP in-page trên video (click thật = cử chỉ hợp lệ) — mở được từ chỗ nào** |
| **Phiên bản** | 2.5.1 | **2.5.2** (5 ngôn ngữ, parity check ✓) |

---

### 🛡️ Đại tu tính năng Bảo vệ mạng xã hội (tab Social)
- **Chống chèn content script (Protect against content script injection)** — mục "Bảo vệ" giờ chỉ giữ 1 tính năng hợp nhất, tự động phát hiện & gỡ trên Facebook/Zalo/Instagram/WhatsApp/TikTok/Discord/X/Telegram:
  - Script lạ từ extension khác (`chrome-extension://`, `moz-extension://`), script `data:`/`blob:` che giấu, iframe lạ, link `javascript:`.
  - **Mã inline self-XSS** (chiêu dán code "nhận acc free"): chặn khi code vừa đọc cookie/localStorage/clipboard vừa gọi fetch/XHR/WebSocket/sendBeacon.
  - 2 quy trình chặn: **Gỡ bỏ ngay** hoặc **Chỉ ghi nhận, không gỡ**.
- **Làm sạch link theo dõi khi bấm** (bật mặc định): cắt `utm_*`, `fbclid`, `gclid`, `igshid`... khỏi URL trước khi mở — kể cả nested bên trong wrapper `l.facebook.com/l.php?u=...`.
- **Gỡ link quảng cáo / shop online trong bình luận** (tùy chọn): Shopee/Lazada/Tiki/Sendo/TikTok Shop/Temu/AliExpress (đổi short-ID vẫn chặn nhờ giải mã wrapper), shop lạ mang ≥2 dấu vết tiếp thị FB cũng bị gỡ; link mạng xã hội/báo chí/trang lành bị loại trừ; xóa cả thẻ preview sản phẩm.
- Dòng thống kê "Đã chặn N lần chèn mã · dọn M link theo dõi · gỡ K link shop" + nút Reset ngay trong tab Social.
- Gỡ toàn bộ khiên CSS cũ (ẩn typing/đã xem/online) — đã được thay thế bằng các module khác; khôi phục helpers lõi cho Recovery/Vault/Checklist/Creator/Tools.
- Sửa: `messaging.js` thiếu `security.js`/`social.js` trong danh sách lazy-inject; listener `onMessage` của content script Social tham chiếu sai API.

### 🌐 Tab mới "Lingua Lab" — học ngoại ngữ (P0)
- Xây trên 5 trụ cột SLA (thông lệ nghiên cứu ngôn ngữ học): **đầu vào dễ hiểu i+1** (học từ chính trang đang đọc), **spaced repetition SM-2** + active recall, **output hypothesis** (bắt viết), **targeted corrective feedback** (sửa lỗi phân loại), **lexical approach** (học collocation).
- **Sentence mining mọi website**: bôi đen → "Lấy đoạn bôi đen" → AI tạo thẻ chuẩn **L2→L2** (nghĩa giải thích bằng ngôn ngữ đích, KHÔNG dịch tiếng mẹ đẻ — không còn là Google Translate) + ví dụ + cloze + collocations.
- **Grammar coach + Sổ lỗi**: chấm bài viết, phân loại lỗi (linking words, mạo từ, giới từ, thì, hòa hợp, collocation, chính tả...), mỗi lỗi vào ledger đếm tần suất → bấm 1 nút sinh thẻ drill từ chính lỗi của bạn.
- **Ngân hàng 30 liên từ học thuật** (however/therefore/moreover/although...) theo nhóm tương phản–kết quả–tăng cường–nhượng bộ..., drill điền chỗ trống offline.
- **Nghe**: đọc thẻ bằng TTS cục bộ của trình duyệt; streak + mục tiêu ôn/ngày; deck tách riêng theo từng ngôn ngữ đích (EN/ES/FR/DE/JA/KO/ZH/RU).
- AI call chỉ chạy khi bấm nút; hỗ trợ Ollama/LM Studio local → có thể học 100% offline.
- **P1 — Chíp "✍ Lingua?" trên mọi website**: hiện khi bạn gõ tiếng Anh vào comment/textarea/contenteditable (≥40 ký tự, chỉ kiểm tra khi bấm) → sidebar chấm, lỗi vào Sổ lỗi, kết quả trả về bong bóng tại chỗ (không auto-gửi; sidebar đóng thì báo rõ).
- **Dictation 100% offline**: TTS đọc câu ngẫu nhiên từ deck/liên từ → gõ lại → diff từng từ tô màu + % điểm, từ sai tự ghi vào ledger lỗi `spelling`.
- **Linker rewriter**: nút "Nối câu bằng liên từ (AI)" biến mấy câu cụt thành văn học thuật với however/therefore/although... kèm nút "Dùng bản này".

### 🤖 Trợ lý AI
- **Skill engine**: 13+ kỹ năng qua `/code /table /quiz /critique /mindmap /math...` + nhận diện ý định tự nhiên; orchestrator 5 pipeline (Engineering, Academic Research, Live Fact-check, Page Study, General Cognitive).
- **Trích xuất 3 tầng**: Shadow DOM/iframe → scripting isolated → background fetch; chấm điểm container Readability + JSON-LD `articleBody`.
- **Máy chủ tùy biến (Custom/Local AI)**: thêm Ollama, LM Studio, vLLM, OpenRouter với tên/model/key riêng; selector model hợp nhất; Gemini mặc định đời mới.
- Popup AI nhanh khi bôi đen (Reading Companion): thêm nút tắt/bật tức thì.

- **Lá chắn cờ bạc (mặc định BẬT)**: dùng `declarativeNetRequest` chặn ngay từ tầng mạng ~65 domain cá độ / casino / game bài hướng VN (kubet, 88bet, bong88, w88, iwin, nohu, b52...) + mọi domain chứa `casino`, kể cả iframe quảng cáo cờ bạc nhúng trong trang khác. Không fetch danh sách — tất cả nằm trong máy.
- **Quét vân tay nội dung + TỰ HỌC domain mới (chống rotation)**: `gamble-fp.js` chấm điểm trang bằng chính ngôn ngữ cờ bạc (nhà cái, tài xỉu, xúc xóc, bắn cá, nạp/rút, đại lý...) qua 2 lớp gate rẻ (TLD hiểm + tên miền số) trước khi đọc text; trang bị nhận diện → chặn tại chỗ + gửi domain về danh sách học cục bộ (`sf_gmbl_learned`, cap 400) → background dựng rule mạng riêng: **lần sau bị chặn từ tầng network**. Nhà cái đổi sang brand mới tinh cũng chỉ "dính" 1 lần duy nhất.
- Trang chặn **bản địa hóa 5 ngôn ngữ** (`gamble-block.html`): hiện tên miền bị chặn, cảnh báo chiêu lure "kèo sạch/tài xỉu 100%", nút Quay lại và **Bỏ chặn tên miền này** (allowlist theo brand-token hoặc domain gốc, tự xóa entry đã học).
- Bật/tắt trong Social → Bảo vệ; lời từ nền tảng mạng xã hội (bấm link từ comment) được chuyển hướng vào trang giải thích thay vì "ERR_BLOCKED".

### 🌙 Dark Mode Studio — bản "tinh chỉnh an toàn"
- **Night Reader (tông màu đọc — mặc định AN TOÀN, không vỡ UI)**: hoạt động *trên nền engine invert hiện có* — không đụng bố cục website. Slider **Ấm nóng chữ** (0–100%: chữ trắng → kem sepia như báo giấy), **Nền tối thêm** (0–60%: đen sâu tới mức tối nhất, tự bù sáng cho ảnh), **Màu liên kết** tùy chọn (màu được tính ngược qua filter invert để hiển thị đúng màu bạn chọn).
- **3 bộ màu dựng sẵn**: 📰 *Sepia tin tức*, ⚫ *AMOLED* (nền đen tuyệt đối), 🌊 *Midnight ocean*.
- **Tô màu phẳng (tức thì)** — chế độ cũ (thay màu trực tiếp, không invert) được GIỮ LẠI nhưng là switch riêng, **tắt mặc định** kèm cảnh báo "có thể làm phẳng bố cục" vì nó ghi đè màu mọi phần tử.
- **Typography mạnh hơn**: 10 font (thêm Palatino sách cổ điển, Charter báo, Verdana rộng, **Atkinson Hyperlegible** hỗ trợ thị giác, Tahoma gọn), slider **chiều rộng cột đọc** (0–1400px) + **căn lề 2 bên**.
- Tone hoạt động cả trên trang dark-native (GitHub...): khi đó chỉ áp tint, không invert.

### ⚖️ Trung tâm uy tín
- Modal **Minh Bạch Quyền Hạn Trình Duyệt** mới (giải trình từng permission <all_urls>/cookies/clipboard/storage/scripting), hiện lần đầu + mở lại từ nút trong Trust Center.
- Version hiển thị về 2.5.1; `privacy_last_updated` đồng bộ 2.5.1_beta trên cả 5 ngôn ngữ.

---

## So sánh nhanh v2.5.0 → v2.5.1

| Hạng mục | v2.5.0 | v2.5.1 |
|---|---|---|
| **Bảo vệ MXH** | Khiên CSS ẩn typing/đã xem/online từng nền tảng | **Engine chống chèn script** (ext/data/inline self-XSS/iframe/javascript:), 2 quy trình chặn, thống kê + reset |
| **Link an toàn** | - | **Cắt tracking utm/fbclid khi bấm** (giải cả wrapper `l.php?u=`), **gỡ link shop/quảng cáo trong bình luận** (decode wrapper, đổi short-ID vẫn chặn) |
| **Trợ lý AI** | Gemini/ChatGPT/Claude + grounding | + 13+ skill lệnh `/`, 5 pipeline điều phối, trích xuất 3 tầng + JSON-LD/Readability |
| **Model tùy biến** | Custom URL đơn lẻ | + Kho máy chủ Ollama/LM Studio/vLLM/OpenRouter (tên + endpoint + model + key), selector hợp nhất |
| **Minh bạch quyền hạn** | - | + Modal giải trình 5 nhóm permission, hiển thị lần đầu |
| **Ngoại ngữ** | - | **+ tab Lingua Lab**: sentence mining mọi trang, SRS SM-2 thẻ L2→L2, grammar coach + sổ lỗi phân loại, drill liên từ, TTS nghe |
| **Chống cờ bạc** | - | **+ lá chắn DNR** chặn ~65 domain cá độ VN + domain chứa casino, trang chặn bản địa 5 ngôn ngữ, bỏ chặn từng tên miền |

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

## So sánh nhanh v2.4.4 → v2.4.5

| Hạng mục | v2.4.4 | v2.4.5 |
|---|---|---|
| **Bảo vệ MXH** | - | **Tab "Social" mới**: khiên ẩn typing/đã xem/online cho Facebook, Zalo, Instagram + WhatsApp/TikTok/Discord/X/Telegram |
| **Khôi phục tài khoản** | - | Wizard 8 kịch bản bị hack (mất email/SĐT/2FA, WhatsApp PIN, SIM swap...) × 9 nền tảng, xuất hướng dẫn .txt gửi bạn bè |
| **Két sắt mã hóa** | - | **AES-256-GCM** bằng mật khẩu chủ: email/SĐT dự phòng, trusted contacts, recovery codes 2FA — 100% máy bạn |
| **Dark Mode** | - | **Tab "Dark" riêng (Studio)**: tối mọi trang kiểu Dark Reader, tự bỏ qua trang dark-native, ⚡ép tối, chỉnh sáng/tương phản/độ màu theo site, bảng màu đọc giấy, font/giãn dòng/từ cách |
| **Security** | Phishing, clickjack, unlock | + **trust report 12 lớp heuristic** (typo/punycode/form giả/shortener/entropy...), **tự từ chối banner cookie** 16+ CMP, **audit cookie**, trình tạo mật khẩu mạnh, cảnh báo dán CCCD/thẻ |
| **Creator (KOL/KOC)** | - | + kế hoạch bài đăng, metrics (views/likes/shares/comments), xuất CSV KPI, quản lý Group/Kênh |
| **Pomodoro** | 25/50/5 + timer | + 4 preset lịch ngắt nghỉ 1 chạm, đồng hồ giờ kết thúc, stepper đầy khung |

---

## So sánh nhanh v2.4.2 → v2.5.0

| Hạng mục | v2.4.2 | v2.5.0 |
|---|---|---|
| **Tab Flow (P2P)** | — | **Tab mới**: Truyền file P2P mã hóa WebRTC trực tiếp không qua server, đồng bộ tab/link, Voice/Video Call thời gian thực |
| **Tạo Mã QR & Vòng Cây** | — | **Tab mới**: QR Nghệ Thuật (Apple Squircle 100% quét được), Vòng Cây Apple Clip, Photo QR (biến ảnh thành mã QR), tùy biến Logo & Emoji trung tâm |
| **Trợ lý AI** | — | **Nâng cấp đột phá**: Gemini Native Google Search grounding chống ảo giác, Consensus Search đối chiếu đa nguồn, Multi-window RAG, ghim trang web |
| **Bảo vệ Mạng Xã Hội** | — | **Tab Social**: Khiên ẩn typing/đã xem 9 nền tảng, Wizard khôi phục tài khoản bị hack 8 kịch bản, Két sắt mã hóa AES-256-GCM lưu mã 2FA |
| **Dark Mode Studio** | — | **Tab Dark Mode**: Engine v4 chạy từ `document_start` triệt tiêu chớp sáng, tối thông minh mọi website, tinh chỉnh độ tương phản & typography |
| **Bảo vệ & Chống Lừa Đảo** | Cơ bản | **Trust report 12 lớp heuristic** phát hiện giả mạo ngân hàng/ví điện tử, tự động từ chối banner cookie 16+ CMP, audit theo dõi |
| **Quản lý Tab (Tab Manager)** | — | Thống kê tab mở, tìm kiếm & đóng tab tức thì, tự động cập nhật khi đóng tab từ trình duyệt |
| **Giao diện & Kiến trúc** | Chuẩn | Kiến trúc module hóa (OS/js/tabs/), chế độ cửa sổ nổi độc lập (Pop-out), đồng bộ 100% 5 ngôn ngữ (vi, en, zh, ru, ja) |

---

## [2.5.0] - 2026-09-18

### Tab Flow mới (Đồng bộ & Truyền dữ liệu P2P thời gian thực)
- **Truyền file P2P trực tiếp (WebRTC/PeerJS)**: Kết nối ngang hàng mã hóa 100% giữa 2 trình duyệt không qua bất kỳ máy chủ trung gian nào (No cloud, 100% riêng tư).
- **Chunking dữ liệu lớn**: Chia nhỏ file thành các khối 64KB kèm thanh đo tiến trình thời gian thực, truyền ổn định file lớn mượt mà.
- **Tự tạo phòng & Quét mã QR**: Tạo ID phòng cố định hoặc ngẫu nhiên, tạo mã QR kết nối nhanh tức thì bằng điện thoại hoặc máy tính khác.
- **Cuộc gọi Audio/Video Call P2P**: Đàm thoại âm thanh và video trực tiếp hai chiều chất lượng cao ngay trong sidebar extension.
- **Cửa sổ nổi độc lập (Pop-out Mode)**: Mở Flow ra tab riêng (`flow.html`) tránh việc ngắt kết nối cuộc gọi/truyền file khi vô tình đóng sidebar hoặc chuyển tab.

### Tab QR Code mới (Tạo mã QR nghệ thuật & Photo QR)
- **3 chế độ mã hóa**:
  - **QR Nghệ Thuật ✨**: Định vị 3 mắt Apple Squircle bo góc mượt mà, chấm dữ liệu dạng hạt botanical hữu cơ, **100% quét được** ngay lập tức bằng mọi ứng dụng (Camera iOS/Android, Zalo, Google Lens).
  - **Vòng Cây 🌿**: Mã hóa đồng tâm đa tầng lấy cảm hứng từ Apple App Clip Code.
  - **QR Chuẩn**: Mã QR chuẩn ISO độ tương phản tối đa.
- **Biến ảnh thành mã QR (Photo QR)**: Tải ảnh bất kỳ (avatar, sản phẩm, phong cảnh...) để làm nền nghệ thuật cho mã QR; tích hợp lớp phủ mờ thông minh và đệm trắng 3 góc định vị giữ vững 100% khả năng quét.
- **Tùy biến biểu tượng trung tâm**: Hỗ trợ tải ảnh làm Logo thu nhỏ hoặc nhập bất kỳ ký tự/Emoji nào (`🚀`, `⭐`, `❤️`, chữ cái viết tắt...), tự co giãn kích thước font theo độ dài ký tự.
- **Thiết kế tinh gọn**: Tự động lấp đầy các chấm dữ liệu khi không nhập icon/logo, không bị đục lỗ/vòng tròn trống ở giữa.
- **3 Theme màu sang trọng**: Đen Trắng, Gỗ Xanh 🍃, Hoàng Kim ✨.
- **Hiệu ứng 3D Card**: Thẻ QR nghiêng 3D theo chuyển động chuột (perspective tilt + ánh sáng bóng mờ).
- **Tiện ích xuất**: Tải ảnh PNG chất lượng cao, chép ảnh vào bộ nhớ tạm 1 chạm, chép link, mở tab toàn màn hình độc lập (`qr.html`).

### Nâng cấp Trợ lý AI & Grounding Search
- **Gemini Native Google Search Grounding**: Tích hợp công cụ tìm kiếm Google gốc trực tiếp vào Gemini, loại bỏ ảo giác thông tin với strict fact rule.
- **Consensus Search đa nguồn**: Tự động kiểm chứng và trích xuất nguồn URL xác thực, cung cấp gợi ý câu hỏi tiếp theo (follow-up chips).
- **Multi-window RAG**: Phân đoạn nội dung trang web nhiều tầng, ghi nhớ ngữ cảnh thông minh và hỗ trợ ghim nhiều tab trang web (`pinned-pages strip`).
- **SSE Streaming**: Phản hồi tức thì dạng dòng gõ chữ thời gian thực, có nút dừng (Stop generating) và tạo lại câu trả lời (Regenerate).

### Hệ thống & Đa ngôn ngữ
- Đồng bộ hoàn chỉnh **1568+ chuỗi dịch cho cả 5 ngôn ngữ**: Tiếng Việt (`vi`), Tiếng Anh (`en`), Tiếng Trung (`zh`), Tiếng Nga (`ru`), Tiếng Nhật (`ja`).
- Vượt qua 100% bộ kiểm thử tự động (6/6 suites passed) và 41 bước kiểm tra nghiêm ngặt của Chrome Web Store & Firefox Add-on Store.

---

## [2.4.5] - 2026-09-17

### Bảo vệ mạng xã hội (tab Social mới)

- **Khiên riêng tư client-side**: ẩn "đang gõ", "đã xem", "Active now" trên Facebook/Messenger, Zalo, Instagram (9 công tắc) + khiên đơn cho WhatsApp Web, TikTok, Discord, X, Telegram — content script `social.js` tiêm CSS best-effort, tự cập nhật khi đổi cấu hình (không cần F5).
- **Recovery Wizard 8 kịch bản × 9 nền tảng**: còn phiên đăng nhập / còn email-SĐT / hacker đổi email / đổi SĐT / mất cả hai (verify giấy tờ) / bị bật 2FA / WhatsApp bị đặt PIN 2 lớp / SIM swap — mỗi bước kèm link chính thức + cảnh báo lừa đảo; **xuất hướng dẫn .txt** để gửi cho bạn bè bị hack.
- **Két sắt thông tin khôi phục**: mã hóa **AES-256-GCM, PBKDF2 150k vòng** bằng mật khẩu chủ ngay trên máy (WebCrypto), lưu email/SĐT dự phòng, trusted contacts, recovery codes; quên master = mất dữ liệu (thiết kế không后门).
- **Checklist phòng thủ 10 mục** + **Công cụ**: quét tracker trên trang, dọn cookie theo dõi MXH, link mở hộp chưa đọc 7 nền tảng, **nút báo cáo** Google Safe Browsing + Meta, mẫu bằng chứng cho đơn Cảnh sát mạng.
- **Creator workspace (KOL/KOC)**: lên lịch bài đăng theo nền tảng/trạng thái, ghi chỉ số views/likes/shares/comments, tổng KPI, **xuất CSV**, danh sách Group/Kênh + mở tất cả.

### Dark Mode Studio (tab riêng mới)

- Engine v4 chạy **`document_start`** + cache `darkKnown` theo hostname → **không còn flash nền trắng**: trang sáng tối ngay từ frame đầu, trang dark-native (GitHub/YouTube...) tự bỏ qua không invert 2 lần.
- **Chỉnh theo site**: độ sáng/tương phản/độ màu (0% = chế độ xám đọc sách) với ảnh tự bù filter; ⚡ép tối thủ công.
- **Chế độ đọc dịu mắt**: 5 màu giấy (Giấy/Bạc hà/Xanh/Hổ phách/Hồng) + tự chọn color picker, cường độ qua lớp phủ `mix-blend multiply` không phá layout.
- **Typography toàn trang**: font (Serif/Sans/Mono/Verdana...), cỡ 85–150%, giãn dòng, khoảng chữ, khoảng từ — toggle bật/tắt tức thì.
- Quản lý danh sách loại trừ/chọn theo host, pill trạng thái, thanh trượt có nhãn + value.

### Security nâng cấp

- **Trust report 12 lớp**: brand title-mismatch, form password + action lạ, URL rút gọn, entropy/hyphen domain, @-spoof, cổng lạ, http, punycode... + **thang điểm rủi ro 0–10** — bắt cả trang giả mạo giao diện tinh vi (thêm danh sách brand NH & ví VN: Vietcombank, BIDV, Agribank, Techcombank, MoMo, ZaloPay...).
- **Tự từ chối banner cookie** (engine `cookie_reject.js`, `all_frames: true`): rules riêng cho 16+ CMP (OneTrust, CookieYes, Osano, iubenda, Complianz, Tarteaucitron, consentmanager, Quantcast, Didomi, Sourcepoint, Cookiebot...), text 15+ ngôn ngữ, **không bao giờ bấm Accept**, mở khóa scroll.
- **Audit cookie theo domain**: phân loại tracker/phân tích/chức năng, cảnh báo thiếu Secure/HttpOnly/SameSite=None, xóa từng cái hoặc xóa hết tracker.
- **Trình tạo mật khẩu mạnh** (crypto + stepper độ dài pill), **cảnh báo dán số nhạy cảm** (SĐT/CCCD/thẻ), quick-link HaveIBeenPwned/WebRTC/DNS leak, dọn site đã mở right-click.

### Tinh chỉnh UI/UX

- **Dark Mode hết dấu ✓ trong dropdown model AI** → model khả dụng tô màu xanh lá.
- Làm đẹp toàn cục: checkbox/radio accent, select option nền tối, **scrollbar mỏng** (Chrome + Firefox `scrollbar-width`), stepper `pm-stepper` full khung có value-focus.
- Pomodoro: 4 preset lịch (Deep 90/50-10, Sprint 2H, Đọc 60', Nhẹ 45') 1 chạm tính luôn timeline, **⏰ giờ kết thúc dự kiến**, card gọn.

### Kỹ thuật & tuân thủ

- Nội dung mới i18n **đủ 5 ngôn ngữ** (vi/en/zh/ru/ja) — parity pass; key `ai_model_hint`/`ai_key_*`/`sec_trust_*`... cập nhật.
- 3 manifest đồng bộ version **2.4.5**, thêm content script `social.js`, `cookie_reject.js` (all_frames), `darkmode.js` (document_start); `manifest_firefox.json` ≡ `manifest.json`.
- Bộ test mở rộng: tab-nav 14/14, allowlist host chính thức mới, 6/6 suites xanh.

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
