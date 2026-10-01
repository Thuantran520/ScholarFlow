const fs = require('fs');
const path = require('path');

global.window = global;
require('../OS/locales/vi.js');
require('../OS/locales/en.js');
require('../OS/locales/zh.js');
require('../OS/locales/ru.js');
require('../OS/locales/ja.js');

const vi = global.I18N_VI;
const en = global.I18N_EN;
const zh = global.I18N_ZH;
const ru = global.I18N_RU;
const ja = global.I18N_JA;

const NEW_KEYS = {
  "us_test_err_prefix": {
    "vi": "Lỗi chạy thử:",
    "en": "Test run error:",
    "zh": "测试运行错误：",
    "ru": "Ошибка пробного запуска:",
    "ja": "テスト実行エラー:"
  },
  "us_replaced_count": {
    "vi": "Đã thay thế {0} vị trí",
    "en": "Replaced {0} occurrences",
    "zh": "已替换 {0} 处",
    "ru": "Заменено {0} совпадений",
    "ja": "{0} か所を置換しました"
  },
  "video_audio_tab": {
    "vi": "(Có âm thanh tab)",
    "en": "(With tab audio)",
    "zh": "(含标签页音频)",
    "ru": "(Со звуком вкладки)",
    "ja": "(タブ音声あり)"
  },
  "video_audio_none": {
    "vi": "(Không lưu âm thanh)",
    "en": "(No audio)",
    "zh": "(不录制音频)",
    "ru": "(Без звука)",
    "ja": "(音声なし)"
  },
  "verify_toast_clip_empty": {
    "vi": "📋 Bộ nhớ tạm (Clipboard) đang trống!",
    "en": "📋 Clipboard is empty!",
    "zh": "📋 剪贴板为空！",
    "ru": "📋 Буфер обмена пуст!",
    "ja": "📋 クリップボードが空です！"
  },
  "verify_toast_clip_ctrlv": {
    "vi": "💡 Hãy bấm phím Ctrl+V vào ô để dán!",
    "en": "💡 Press Ctrl+V in the box to paste!",
    "zh": "💡 请在输入框中按 Ctrl+V 粘贴！",
    "ru": "💡 Нажмите Ctrl+V в поле для вставки!",
    "ja": "💡 入力欄で Ctrl+V を押して貼り付けてください！"
  },
  "verify_toast_no_tab_info": {
    "vi": "Chưa nhận diện được tiêu đề hoặc URL trang hiện tại!",
    "en": "Could not identify the title or URL of the active tab!",
    "zh": "无法识别当前标签页的标题或网址！",
    "ru": "Не удалось определить заголовок или URL текущей вкладки!",
    "ja": "現在のタブのタイトルまたはURLを特定できませんでした！"
  },
  "us_run_count_title": {
    "vi": "Đã chạy {0} lần",
    "en": "Ran {0} times",
    "zh": "已运行 {0} 次",
    "ru": "Запущено {0} раз",
    "ja": "{0} 回実行"
  },
  "us_move_up": {
    "vi": "Di chuyển lên",
    "en": "Move up",
    "zh": "上移",
    "ru": "Переместить вверх",
    "ja": "上へ移動"
  },
  "us_move_down": {
    "vi": "Di chuyển xuống",
    "en": "Move down",
    "zh": "下移",
    "ru": "Переместить вниз",
    "ja": "下へ移動"
  },
  "us_apply_page": {
    "vi": "Áp dụng ngay lên trang web đang mở",
    "en": "Apply now to active webpage",
    "zh": "立即应用到当前网页",
    "ru": "Применить к активной веб-странице",
    "ja": "開いているWebページに今すぐ適用"
  },
  "us_apply_no_page": {
    "vi": "Không tìm thấy trang để áp dụng!",
    "en": "No webpage found to apply!",
    "zh": "未找到可应用的网页！",
    "ru": "Не найдена страница для применения!",
    "ja": "適用するページが見つかりません！"
  },
  "us_page_reloaded": {
    "vi": "Đã tải lại trang!",
    "en": "Page reloaded!",
    "zh": "页面已重新加载！",
    "ru": "Страница перезагружена!",
    "ja": "ページを再読み込みしました！"
  },
  "us_apply_success": {
    "vi": "Đã áp dụng thành công!",
    "en": "Applied successfully!",
    "zh": "应用成功！",
    "ru": "Успешно применено!",
    "ja": "正常に適用されました！"
  },
  "us_apply_err": {
    "vi": "Lỗi khi áp dụng: ",
    "en": "Error applying: ",
    "zh": "应用时出错：",
    "ru": "Ошибка при применении: ",
    "ja": "適用エラー: "
  },
  "us_edit_script": {
    "vi": "Chỉnh sửa script",
    "en": "Edit script",
    "zh": "编辑脚本",
    "ru": "Редактировать скрипт",
    "ja": "スクリプトを編集"
  },
  "us_open_studio_tab": {
    "vi": "Mở trong Userscript Studio (tab toàn màn hình)",
    "en": "Open in Userscript Studio (fullscreen tab)",
    "zh": "在 Userscript Studio 中打开（全屏标签页）",
    "ru": "Открыть в Userscript Studio (полноэкранная вкладка)",
    "ja": "Userscript Studio で開く（フルスクリーンタブ）"
  },
  "us_dupe_script": {
    "vi": "Nhân bản (sao chép) script",
    "en": "Duplicate script",
    "zh": "克隆（复制）脚本",
    "ru": "Дублировать скрипт",
    "ja": "スクリプトを複製"
  },
  "us_copy_suffix": {
    "vi": " (bản sao)",
    "en": " (copy)",
    "zh": " (副本)",
    "ru": " (копия)",
    "ja": " (コピー)"
  },
  "us_del_script": {
    "vi": "Xóa script này",
    "en": "Delete this script",
    "zh": "删除此脚本",
    "ru": "Удалить этот скрипт",
    "ja": "このスクリプトを削除"
  },
  "us_del_confirm": {
    "vi": "Xóa script \"{0}\"?",
    "en": "Delete script \"{0}\"?",
    "zh": "删除脚本“{0}”？",
    "ru": "Удалить скрипт «{0}»?",
    "ja": "スクリプト「{0}」を削除しますか？"
  },
  "us_pill_matches_title": {
    "vi": "URL Áp dụng: ",
    "en": "Target URLs: ",
    "zh": "适用网址：",
    "ru": "Применяемые URL: ",
    "ja": "適用URL: "
  },
  "us_pill_runat_title": {
    "vi": "Thời điểm chạy: ",
    "en": "Run at: ",
    "zh": "运行阶段：",
    "ru": "Момент запуска: ",
    "ja": "実行タイミング: "
  },
  "us_meta_author_prefix": {
    "vi": "Tác giả: ",
    "en": "Author: ",
    "zh": "作者：",
    "ru": "Автор: ",
    "ja": "作者: "
  },
  "us_formatted_done": {
    "vi": "Đã format!",
    "en": "Formatted!",
    "zh": "已格式化！",
    "ru": "Отформатировано!",
    "ja": "整形完了！"
  },
  "us_update_success_count": {
    "vi": "Đã cập nhật thành công {0} kịch bản!",
    "en": "Successfully updated {0} scripts!",
    "zh": "成功更新了 {0} 个脚本！",
    "ru": "Успешно обновлено {0} скриптов!",
    "ja": "{0} 個のスクリプトを正常に更新しました！"
  },
  "us_update_err_prefix": {
    "vi": "Lỗi kiểm tra cập nhật: ",
    "en": "Update check error: ",
    "zh": "检查更新出错：",
    "ru": "Ошибка проверки обновлений: ",
    "ja": "更新確認エラー: "
  },
  "us_update_all_latest": {
    "vi": "Tất cả các kịch bản đều đang ở phiên bản mới nhất.",
    "en": "All scripts are up to date.",
    "zh": "所有脚本均已是最新版本。",
    "ru": "Все скрипты обновлены до последней версии.",
    "ja": "すべてのスクリプトが最新バージョンです。"
  },
  "us_storage_loading": {
    "vi": "Đang tải dữ liệu GM Storage...",
    "en": "Loading GM Storage data...",
    "zh": "正在加载 GM Storage 数据...",
    "ru": "Загрузка данных GM Storage...",
    "ja": "GM Storage データを読み込み中..."
  },
  "us_storage_no_tab": {
    "vi": "Không tìm thấy trang web đang mở.",
    "en": "No open webpage found.",
    "zh": "未找到打开的网页。",
    "ru": "Открытая веб-страница не найдена.",
    "ja": "開いているWebページが見つかりません。"
  },
  "us_storage_not_supported": {
    "vi": "Trang hệ thống trình duyệt không hỗ trợ GM Storage.",
    "en": "Browser internal pages do not support GM Storage.",
    "zh": "浏览器系统页面不支持 GM Storage。",
    "ru": "Системные страницы браузера не поддерживают GM Storage.",
    "ja": "ブラウザ内部ページは GM Storage に対応していません。"
  },
  "us_storage_empty": {
    "vi": "(Không có dữ liệu GM_* nào trên trang này)",
    "en": "(No GM_* data on this page)",
    "zh": "(此页面上无 GM_* 数据)",
    "ru": "(На этой странице нет данных GM_*)",
    "ja": "(このページに GM_* データはありません)"
  },
  "us_storage_edit_val": {
    "vi": "Chỉnh sửa giá trị",
    "en": "Edit value",
    "zh": "编辑值",
    "ru": "Редактировать значение",
    "ja": "値を編集"
  },
  "us_storage_edit_prompt": {
    "vi": "Sửa giá trị cho key \"{0}\":",
    "en": "Edit value for key \"{0}\":",
    "zh": "修改键“{0}”的值：",
    "ru": "Изменить значение ключа «{0}»:",
    "ja": "キー「{0}」の値を編集:"
  },
  "us_storage_err_update": {
    "vi": "Lỗi cập nhật: ",
    "en": "Update error: ",
    "zh": "更新出错：",
    "ru": "Ошибка обновления: ",
    "ja": "更新エラー: "
  },
  "us_storage_del_key": {
    "vi": "Xóa key này",
    "en": "Delete this key",
    "zh": "删除此键",
    "ru": "Удалить этот ключ",
    "ja": "このキーを削除"
  },
  "us_storage_del_confirm": {
    "vi": "Xóa key \"{0}\" khỏi trang này?",
    "en": "Delete key \"{0}\" from this page?",
    "zh": "从此页面删除键“{0}”？",
    "ru": "Удалить ключ «{0}» с этой страницы?",
    "ja": "このページからキー「{0}」を削除しますか？"
  },
  "us_storage_err_del": {
    "vi": "Lỗi xóa: ",
    "en": "Delete error: ",
    "zh": "删除出错：",
    "ru": "Ошибка удаления: ",
    "ja": "削除エラー: "
  },
  "us_storage_key_req": {
    "vi": "Vui lòng nhập tên Key!",
    "en": "Please enter Key name!",
    "zh": "请输入键名称！",
    "ru": "Пожалуйста, введите имя ключа!",
    "ja": "キー名を入力してください！"
  },
  "us_storage_err_save": {
    "vi": "Lỗi lưu storage: ",
    "en": "Error saving storage: ",
    "zh": "保存存储出错：",
    "ru": "Ошибка сохранения хранилища: ",
    "ja": "ストレージ保存エラー: "
  },
  "us_storage_clear_confirm": {
    "vi": "Bạn có chắc chắn muốn xóa toàn bộ GM Storage của trang này không?",
    "en": "Are you sure you want to clear all GM Storage for this page?",
    "zh": "确定要清除此页面的所有 GM Storage 吗？",
    "ru": "Вы уверены, что хотите очистить все GM Storage для этой страницы?",
    "ja": "このページのすべての GM Storage を消去してもよろしいですか？"
  },
  "us_storage_err_clear": {
    "vi": "Lỗi xóa: ",
    "en": "Delete error: ",
    "zh": "删除出错：",
    "ru": "Ошибка удаления: ",
    "ja": "削除エラー: "
  },
  "us_console_cleared": {
    "vi": "(Logs đã được xóa)",
    "en": "(Logs cleared)",
    "zh": "(日志已清除)",
    "ru": "(Журнал очищен)",
    "ja": "(ログがクリアされました)"
  },
  "us_console_copied": {
    "vi": "Đã sao chép output!",
    "en": "Output copied!",
    "zh": "已复制输出！",
    "ru": "Вывод скопирован!",
    "ja": "出力をコピーしました！"
  }
};

for (const [key, trans] of Object.entries(NEW_KEYS)) {
  vi[key] = trans.vi;
  en[key] = trans.en;
  zh[key] = trans.zh;
  ru[key] = trans.ru;
  ja[key] = trans.ja;
}

function writeLocaleFile(lang, varName, obj) {
  const filePath = path.join(__dirname, '..', 'OS', 'locales', `${lang}.js`);
  let content = `// OS/locales/${lang}.js — ${lang.toUpperCase()} localization dictionary\n`;
  content += `// Total keys: ${Object.keys(obj).length}\n\n`;
  content += `const ${varName} = {\n`;
  
  const keys = Object.keys(obj);
  keys.forEach((k, idx) => {
    const isLast = idx === keys.length - 1;
    const jsonKey = JSON.stringify(k);
    const jsonVal = JSON.stringify(obj[k]);
    content += `  ${jsonKey}: ${jsonVal}${isLast ? '' : ','}\n`;
  });
  
  content += `};\n\n`;
  content += `if (typeof module !== 'undefined' && module.exports) {\n`;
  content += `  module.exports = ${varName};\n`;
  content += `} else if (typeof window !== 'undefined') {\n`;
  content += `  window.${varName} = ${varName};\n`;
  content += `}\n`;
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Wrote ${filePath} with ${keys.length} keys.`);
}

writeLocaleFile('vi', 'I18N_VI', vi);
writeLocaleFile('en', 'I18N_EN', en);
writeLocaleFile('zh', 'I18N_ZH', zh);
writeLocaleFile('ru', 'I18N_RU', ru);
writeLocaleFile('ja', 'I18N_JA', ja);

console.log('Successfully added all remaining keys!');

