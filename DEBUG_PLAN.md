// BẢNG DEBUG - Các bước kiểm tra nếu lỗi vẫn còn

/*
=== CÁC NGUYÊN NHÂN CÓ THỂ GÂY LỖI ===

1. GM_SHIM_CODE KHÔNG ĐƯỢC INJECT
   - _shim() trả về null → _buildCode() trả về raw user code không có shim
   - Kiểm tra: _shim() phải check cả SF_US_SHIM và SF_FULL_GM_SHIM

2. TRANG YOUTUBE CÓ 'const GM_addStyle'
   - Error log từ console relay của ScholarFlow BÁO lỗi từ YouTube
   - Không phải lỗi của extension
   - Kiểm tra: mở DevTools trên YouTube, tìm "const GM_addStyle" trong Sources

3. CONTENT SCRIPT TRONG MANIFEST GÂY LỖI
   - Các content script trong manifest.json chạy trên mọi trang
   - Kiểm tra: ryd.js, inspect.js, main.js, userscripts_runner.js

4. scripting.registerContentScripts() XỬ LÝ CODE KHÔNG ĐÚNG
   - Code có thể bị split hoặc xử lý khác
   - Kiểm tra: thêm console.log vào shim

=== CÁCH KIỂM TRA ===

Bước 1: Mở Chrome DevTools trên youtube.com
Bước 2: Vào Console tab
Bước 3: Gõ: window.SF_US_SHIM
   → Nếu có value: shim đã được load trong background
   → Nếu undefined: shim chưa được load, cần kiểm tra background.js

Bước 4: Gõ: document.querySelector('script')
   → Kiểm tra xem có script nào chứa GM_SHIM_CODE không

Bước 5: Trong Sources tab, tìm "ScholarFlow Userscript Compatibility Layer"
   → Nếu không có: shim không được inject

Bước 6: Kiểm tra console log của ScholarFlow:
   → Nếu có "[uncaught] SyntaxError: redeclaration of const GM_addStyle"
   → Kiểm tra file nào bị lỗi

=== CÁCH SỬA THÊM NẾU LỖI VẪN CÒN ===

Cách A: Thêm try/catch wrapper vào GM_SHIM_CODE:
```js
try {
  // tất cả code shim ở đây
} catch(e) {
  console.error('[ScholarFlow] Shim error:', e.message);
}
```

Cách B: Dùng window['GM_addStyle'] = function(){} thay vì var GM_addStyle
Cách C: Xóa hoàn toàn GM_* variables, dùng _sfGM_* bên trong

=== NẾU LỖI TỪ PAGE YOUTUBE (KHÔNG PHẢI EXTENSION) ===

Nếu YouTube có `const GM_addStyle` trong bundle của họ,
và console relay của ScholarFlow bắt lỗi đó,
thì error là false positive. Không cần sửa.

Kiểm tra: mở https://www.youtube.com WITHOUT ScholarFlow,
nếu vẫn thấy lỗi → lỗi từ YouTube, không phải extension.

=== NẾU _shim() TRẢ VỀ NULL ===

Trong userscripts_bg.js, _shim() kiểm tra:
  globalThis.SF_US_SHIM hoặc globalThis.SF_FULL_GM_SHIM

Nếu cả hai đều undefined, background.js có thể:
1. Không import được gm-shim.js
2. Module loading failed
3. Script không được load

Kiểm tra: trong background.js, thêm:
  console.log('[SF] SF_US_SHIM:', typeof globalThis.SF_US_SHIM);
  console.log('[SF] SF_FULL_GM_SHIM:', typeof globalThis.SF_FULL_GM_SHIM);
*/
