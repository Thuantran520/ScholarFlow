// ---------------------------------------------------------------------------
// ScholarFlow in-page content-script i18n (GENERATED)
// Regenerate with: node scripts/i18n/generate_content_i18n.js
// Source of truth  : OS/locales/*.js (content_* keys)
// Do NOT edit manually - manual edits are overwritten on regeneration.
// ---------------------------------------------------------------------------


  let currentAppLang = "vi";
  try {
    const storageApi = (typeof browser !== "undefined" && browser.storage) ? browser.storage : chrome.storage;
    if (storageApi && storageApi.local) {
      storageApi.local.get("app_language", (res) => {
        if (res && res.app_language) {
          currentAppLang = res.app_language;
        }
      });
      if (storageApi.onChanged) {
        storageApi.onChanged.addListener((changes, area) => {
          if (area === "local" && changes.app_language) {
            currentAppLang = changes.app_language.newValue || "vi";
          }
        });
      }
    }
  } catch (e) {}

  const CONTENT_I18N = {
    vi: {
      img_prefix: "Ảnh",
      img_generic: "Hình ảnh (img)",
      input_prefix: "Nhập",
      badge_secured: " • ĐÃ BẢO MẬT • ",
      badge_remove_hint: "Gỡ bỏ tại danh sách thanh bên",
      badge_click_to: " • Bấm để ",
      style_blur: "Làm mờ ({0}px)",
      style_blackout: "Hộp đen",
      style_pixelate: "Điểm ảnh",
      style_hide: "Ẩn phần tử",
      phish_block: "Panadolce cảnh báo Phishing: phát hiện mẫu ({0})",
      phish_typo: "Panadolce: có thể là typo-squat '{0}' giống '{1}' — hãy kiểm tra URL cẩn thận.",
      phish_puny: "Panadolce: tên miền punycode '{0}' — có thể là tấn công ký tự giả mạo (homograph).",
      phish_continue: "Tiếp tục truy cập",
      phish_dismiss: "Đóng",
      phish_title: "Cảnh báo Phishing",
      toast_already_redacted: "🛡️ Đối tượng này đã được che. Dùng danh sách ở thanh bên để gỡ bỏ.",
      snip_video_prep_title: "🎥 CHUẨN BỊ QUAY VIDEO",
      snip_video_prep_sub: "Đã chọn trang web! Sẵn sàng thao tác...",
      snip_selected_tag: "✔ Đã chọn thẻ ",
      snip_selected_box: "✔ Đã chọn vùng!",
      snip_click_tag: "Click thẻ",
      snip_or: " hoặc ",
      snip_drag_mouse: "kéo chuột",
      snip_to_select: " để chọn vùng",
      snip_drag_corners: "Kéo 8 góc để tinh chỉnh",
      snip_enter_capture: "[Enter] Chụp ngay",
      snip_esc_cancel: "[Esc] Hủy",
      snip_click_to_pick: "🎯 Click để chọn thẻ",
      snip_btn_capture: "📸 Chụp ngay",
      snip_btn_cancel: "✕ Hủy",
      media_popout_open: "Mở cửa sổ nổi",
      media_popout_close: "Đóng cửa sổ nổi",
      companion_explain: "Giải thích",
      companion_translate: "Dịch",
      companion_summary: "Tóm tắt",
      companion_ask: "Hỏi sâu",
      lingua_wait: "AI đang chấm bài...",
      lingua_off: "Mở thanh bên Panadolce → tab Lingua rồi bấm lại",
      lingua_noai: "Chưa có API key AI (xem Cài đặt AI)",
      lingua_clean: "✓ Không phát hiện lỗi ngữ pháp!",
    },
    en: {
      img_prefix: "Image",
      img_generic: "Image (img)",
      input_prefix: "Input",
      badge_secured: " • SECURED • ",
      badge_remove_hint: "Remove via sidebar list",
      badge_click_to: " • Click to ",
      style_blur: "Blur ({0}px)",
      style_blackout: "Blackout",
      style_pixelate: "Pixelate",
      style_hide: "Hide Element",
      phish_block: "Panadolce Phishing Alert: phishing pattern ({0})",
      phish_typo: "Panadolce: possible typo-squat '{0}' looks like '{1}' — check the URL carefully.",
      phish_puny: "Panadolce: punycode host '{0}' — possible homograph attack.",
      phish_continue: "Continue to site",
      phish_dismiss: "Dismiss",
      phish_title: "Phishing warning",
      toast_already_redacted: "🛡️ This element is already redacted. Remove it via the sidebar list.",
      snip_video_prep_title: "🎥 PREPARING VIDEO RECORDING",
      snip_video_prep_sub: "Web page selected! Ready to operate...",
      snip_selected_tag: "✔ Selected element ",
      snip_selected_box: "✔ Area selected!",
      snip_click_tag: "Click element",
      snip_or: " or ",
      snip_drag_mouse: "drag mouse",
      snip_to_select: " to select area",
      snip_drag_corners: "Drag 8 corners to adjust",
      snip_enter_capture: "[Enter] Capture Now",
      snip_esc_cancel: "[Esc] Cancel",
      snip_click_to_pick: "🎯 Click to select element",
      snip_btn_capture: "📸 Capture Now",
      snip_btn_cancel: "✕ Cancel",
      media_popout_open: "Open pop-out window",
      media_popout_close: "Close pop-out window",
      companion_explain: "Explain",
      companion_translate: "Translate",
      companion_summary: "Summarize",
      companion_ask: "Ask AI",
      lingua_wait: "Checking...",
      lingua_off: "Open the Panadolce sidebar → Lingua tab, then retry",
      lingua_noai: "No AI key configured (see AI Settings)",
      lingua_clean: "✓ No grammar errors found!",
    },
    zh: {
      img_prefix: "图片",
      img_generic: "图片 (img)",
      input_prefix: "输入",
      badge_secured: " • 已脱敏保护 • ",
      badge_remove_hint: "在侧边栏列表中移除",
      badge_click_to: " • 点击以 ",
      style_blur: "模糊 ({0}px)",
      style_blackout: "黑框遮盖",
      style_pixelate: "马赛克",
      style_hide: "隐藏元素",
      phish_block: "Panadolce 钓鱼警告：检测到钓鱼特征 ({0})",
      phish_typo: "Panadolce：可能是域名仿冒 '{0}'，与 '{1}' 相似 — 请仔细检查网址。",
      phish_puny: "Panadolce：punycode 域名 '{0}' — 可能是同形异义字（homograph）攻击。",
      phish_continue: "继续访问",
      phish_dismiss: "关闭",
      phish_title: "钓鱼警告",
      toast_already_redacted: "🛡️ 该元素已被遮盖。可在侧边栏中移除。",
      snip_video_prep_title: "🎥 准备录屏",
      snip_video_prep_sub: "已选择网页！准备就绪...",
      snip_selected_tag: "✔ 已选择元素 ",
      snip_selected_box: "✔ 区域已选定！",
      snip_click_tag: "点击元素",
      snip_or: " 或 ",
      snip_drag_mouse: "拖动鼠标",
      snip_to_select: " 框选区域",
      snip_drag_corners: "拖动 8 个控制点微调",
      snip_enter_capture: "[Enter] 立即截图",
      snip_esc_cancel: "[Esc] 取消",
      snip_click_to_pick: "🎯 点击选择此元素",
      snip_btn_capture: "📸 立即截图",
      snip_btn_cancel: "✕ 取消",
      media_popout_open: "打开悬浮窗",
      media_popout_close: "关闭悬浮窗",
      companion_explain: "解释",
      companion_translate: "翻译",
      companion_summary: "总结",
      companion_ask: "追问",
      lingua_wait: "AI 正在批改……",
      lingua_off: "请打开 Panadolce 侧边栏 → Lingua 标签后重试",
      lingua_noai: "未配置 AI API key（见 AI 设置）",
      lingua_clean: "✓ 未发现语法错误！",
    },
    ru: {
      img_prefix: "Изображение",
      img_generic: "Изображение (img)",
      input_prefix: "Ввод",
      badge_secured: " • СКРЫТО • ",
      badge_remove_hint: "Удалить в боковой панели",
      badge_click_to: " • Нажмите: ",
      style_blur: "Размытие ({0}px)",
      style_blackout: "Черный блок",
      style_pixelate: "Пикселизация",
      style_hide: "Скрыть элемент",
      phish_block: "Предупреждение Panadolce: обнаружен фишинговый паттерн ({0})",
      phish_typo: "Panadolce: возможен typo-squat '{0}' — похож на '{1}'. Проверьте адрес внимательно.",
      phish_puny: "Panadolce: punycode-домен '{0}' — возможна атака с подменой символов (homograph).",
      phish_continue: "Продолжить",
      phish_dismiss: "Закрыть",
      phish_title: "Предупреждение о фишинге",
      toast_already_redacted: "🛡️ Этот элемент уже скрыт. Удалите его через боковую панель.",
      snip_video_prep_title: "🎥 ПОДГОТОВКА К ЗАПИСИ",
      snip_video_prep_sub: "Страница выбрана! Готово к работе...",
      snip_selected_tag: "✔ Выбран элемент ",
      snip_selected_box: "✔ Область выбрана!",
      snip_click_tag: "Клик по элементу",
      snip_or: " или ",
      snip_drag_mouse: "выделите курсором",
      snip_to_select: " для выбора области",
      snip_drag_corners: "Потяните за 8 углов для настройки",
      snip_enter_capture: "[Enter] Сделать снимок",
      snip_esc_cancel: "[Esc] Отмена",
      snip_click_to_pick: "🎯 Кликните для выбора элемента",
      snip_btn_capture: "📸 Сделать снимок",
      snip_btn_cancel: "✕ Отмена",
      media_popout_open: "Открыть всплывающее окно",
      media_popout_close: "Закрыть всплывающее окно",
      companion_explain: "Объяснить",
      companion_translate: "Перевести",
      companion_summary: "Кратко",
      companion_ask: "Спросить",
      lingua_wait: "ИИ проверяет...",
      lingua_off: "Откройте боковую панель Panadolce → вкладку Lingua и повторите",
      lingua_noai: "Не задан API-ключ ИИ (настройки ИИ)",
      lingua_clean: "✓ Ошибок не найдено!",
    },
    ja: {
      img_prefix: "画像",
      img_generic: "画像 (img)",
      input_prefix: "入力",
      badge_secured: " • 保護済み • ",
      badge_remove_hint: "サイドバーリストから解除",
      badge_click_to: " • クリックして ",
      style_blur: "ぼかし ({0}px)",
      style_blackout: "ブラックアウト",
      style_pixelate: "モザイク",
      style_hide: "要素を非表示",
      phish_block: "Panadolce フィッシング警告：不審なパターンを検出 ({0})",
      phish_typo: "Panadolce: '{0}' は '{1}' に似た typo-squat の可能性があります — URL をよく確認してください。",
      phish_puny: "Panadolce: punycode ホスト '{0}' — 同形異義語（homograph）攻撃の可能性。",
      phish_continue: "続行",
      phish_dismiss: "閉じる",
      phish_title: "フィッシング警告",
      toast_already_redacted: "🛡️ この要素は既に保護されています。サイドバーから解除できます。",
      snip_video_prep_title: "🎥 録画の準備完了",
      snip_video_prep_sub: "ページを選択しました！操作可能...",
      snip_selected_tag: "✔ 要素を選択しました ",
      snip_selected_box: "✔ 範囲を選択しました！",
      snip_click_tag: "要素をクリック",
      snip_or: " または ",
      snip_drag_mouse: "マウスをドラッグ",
      snip_to_select: " して範囲選択",
      snip_drag_corners: "8つの角をドラッグして微調整",
      snip_enter_capture: "[Enter] キャプチャ",
      snip_esc_cancel: "[Esc] キャンセル",
      snip_click_to_pick: "🎯 クリックして要素を選択",
      snip_btn_capture: "📸 キャプチャ",
      snip_btn_cancel: "✕ キャンセル",
      media_popout_open: "ポップアウトを開く",
      media_popout_close: "ポップアウトを閉じる",
      companion_explain: "解説",
      companion_translate: "翻訳",
      companion_summary: "要約",
      companion_ask: "質問",
      lingua_wait: "AI が添削中……",
      lingua_off: "Panadolce サイドバーの Lingua タブを開いて再試行してください",
      lingua_noai: "AI API キー未設定（AI 設定）",
      lingua_clean: "✓ 文法エラーなし！",
    },
  };

  function tContent(key, ...args) {
    try {
      const dict = (CONTENT_I18N && (CONTENT_I18N[currentAppLang] || CONTENT_I18N.vi)) || {};
      const val = dict[key] || (CONTENT_I18N && CONTENT_I18N.vi ? CONTENT_I18N.vi[key] : "") || "";
      if (typeof val === "function") return val(...args);
      if (typeof val !== "string") return String(val);
      let out = val;
      for (let i = 0; i < args.length && i < 10; i++) {
        if (args[i] !== undefined && args[i] !== null) {
          out = out.split("{" + i + "}").join(String(args[i]));
        }
      }
      return out;
    } catch (e) {
      return "";
    }
  }

  function notifySidebar(msg) {
    const runtimeApi = (typeof browser !== "undefined" && browser.runtime) ? browser.runtime
      : ((typeof chrome !== "undefined" && chrome.runtime) ? chrome.runtime : null);
    if (runtimeApi && runtimeApi.sendMessage) {
      try {
        const p = runtimeApi.sendMessage(msg);
        if (p && typeof p.catch === "function") p.catch(() => {});
      } catch (e) {}
    }
  }

  window.CONTENT_I18N = CONTENT_I18N;
  window.tContent = tContent;
  window.notifySidebar = notifySidebar;
