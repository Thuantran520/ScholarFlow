/* One-off (v2.4.5 part 3): append Creator + Security-upgrade i18n keys to 5 locales. */
const fs = require("fs");
const path = require("path");
const MARKER = "/* i18n: content_* block start - generated, do not edit */";
const D = {
  vi: {
    soc_st_creator: "Creator", soc_cr_title: "Kế hoạch bài đăng & Số liệu", soc_cr_title_ph: "Tên bài / chiến dịch...",
    soc_cr_platform: "Nền tảng", soc_cr_date: "Ngày đăng", soc_cr_status: "Trạng thái",
    soc_cr_status_idea: "Ý tưởng", soc_cr_status_scheduled: "Đã hẹn lịch", soc_cr_status_posted: "Đã đăng",
    soc_cr_add: "＋ Thêm", soc_cr_need_title: "⚠️ Nhập tên bài trước!", soc_cr_empty: "Chưa có bài nào trong kế hoạch.",
    soc_cr_views: "Xem", soc_cr_likes: "Thích", soc_cr_shares: "Chia sẻ", soc_cr_comments: "Bình luận",
    soc_cr_summary: "{n} bài • {v} lượt xem • {l} thích • {s} chia sẻ • {c} bình luận",
    soc_cr_filter_all: "Tất cả nền tảng", soc_cr_filter_all2: "Mọi trạng thái", soc_cr_search_ph: "Tìm bài...",
    soc_cr_export_csv: "Xuất CSV", soc_cr_groups_title: "Quản lý Group / Kênh",
    soc_cr_gname_ph: "Tên nhóm...", soc_cr_gniche_ph: "Ngách", soc_cr_gurl_ph: "https://nhom...",
    soc_cr_gadd: "＋ Nhóm", soc_cr_gneed_name: "⚠️ Nhập tên nhóm trước!", soc_cr_gempty: "Chưa có nhóm nào được lưu.",
    soc_cr_gopen: "Mở", soc_cr_gopen_all: "Mở tất cả nhóm",
    sec_pw_title: "Trình tạo mật khẩu mạnh", sec_pw_len: "Độ dài", sec_pw_gen: "Tạo", sec_pw_copy: "Copy",
    sec_pw_copied: "✓ Đã copy mật khẩu vào Clipboard!", sec_pw_nochars: "⚠️ Chọn ít nhất 1 kiểu ký tự / chưa có mật khẩu",
    sec_pg_title: "Cảnh báo dán nội dung nhạy cảm", sec_pg_desc: "Nhắc khi bạn dán số điện thoại / CCCD / thẻ ngân hàng vào trang web",
    sec_breach_title: "Kiểm tra lộ & rò rỉ", sec_breach_hibp: "Email bị lộ?", sec_breach_webrtc: "WebRTC leak",
    sec_breach_dns: "DNS leak", sec_breach_clear: "Xóa site đã mở khóa", sec_breach_cleared: "✓ Đã xóa danh sách site ngoại lệ"
  },
  en: {
    soc_st_creator: "Creator", soc_cr_title: "Post Planner & Metrics", soc_cr_title_ph: "Post / campaign title...",
    soc_cr_platform: "Platform", soc_cr_date: "Publish date", soc_cr_status: "Status",
    soc_cr_status_idea: "Idea", soc_cr_status_scheduled: "Scheduled", soc_cr_status_posted: "Posted",
    soc_cr_add: "＋ Add", soc_cr_need_title: "⚠️ Enter a post title first!", soc_cr_empty: "No posts in the plan yet.",
    soc_cr_views: "Views", soc_cr_likes: "Likes", soc_cr_shares: "Shares", soc_cr_comments: "Comments",
    soc_cr_summary: "{n} posts • {v} views • {l} likes • {s} shares • {c} comments",
    soc_cr_filter_all: "All platforms", soc_cr_filter_all2: "All statuses", soc_cr_search_ph: "Search posts...",
    soc_cr_export_csv: "Export CSV", soc_cr_groups_title: "Groups / Channels",
    soc_cr_gname_ph: "Group name...", soc_cr_gniche_ph: "Niche", soc_cr_gurl_ph: "https://group...",
    soc_cr_gadd: "＋ Group", soc_cr_gneed_name: "⚠️ Enter a group name first!", soc_cr_gempty: "No groups saved yet.",
    soc_cr_gopen: "Open", soc_cr_gopen_all: "Open all groups",
    sec_pw_title: "Strong Password Generator", sec_pw_len: "Length", sec_pw_gen: "Generate", sec_pw_copy: "Copy",
    sec_pw_copied: "✓ Password copied to clipboard!", sec_pw_nochars: "⚠️ Select at least one character type / no password yet",
    sec_pg_title: "Sensitive-Paste Warning", sec_pg_desc: "Warns when you paste phone / national ID / bank card numbers into a page",
    sec_breach_title: "Breach & Leak Checks", sec_breach_hibp: "Email breached?", sec_breach_webrtc: "WebRTC leak",
    sec_breach_dns: "DNS leak", sec_breach_clear: "Clear unlocked sites", sec_breach_cleared: "✓ Exception site list cleared"
  },
  zh: {
    soc_st_creator: "创作者", soc_cr_title: "发布计划与数据", soc_cr_title_ph: "帖子 / 活动名称...",
    soc_cr_platform: "平台", soc_cr_date: "发布日期", soc_cr_status: "状态",
    soc_cr_status_idea: "想法", soc_cr_status_scheduled: "已排期", soc_cr_status_posted: "已发布",
    soc_cr_add: "＋ 添加", soc_cr_need_title: "⚠️ 请先输入帖子名称！", soc_cr_empty: "计划中还没有帖子。",
    soc_cr_views: "浏览", soc_cr_likes: "点赞", soc_cr_shares: "分享", soc_cr_comments: "评论",
    soc_cr_summary: "{n} 篇 • {v} 浏览 • {l} 赞 • {s} 分享 • {c} 评论",
    soc_cr_filter_all: "所有平台", soc_cr_filter_all2: "所有状态", soc_cr_search_ph: "搜索帖子...",
    soc_cr_export_csv: "导出 CSV", soc_cr_groups_title: "群组 / 频道管理",
    soc_cr_gname_ph: "群组名称...", soc_cr_gniche_ph: "领域", soc_cr_gurl_ph: "https://群组...",
    soc_cr_gadd: "＋ 群组", soc_cr_gneed_name: "⚠️ 请先输入群组名称！", soc_cr_gempty: "还没有保存的群组。",
    soc_cr_gopen: "打开", soc_cr_gopen_all: "打开所有群组",
    sec_pw_title: "强密码生成器", sec_pw_len: "长度", sec_pw_gen: "生成", sec_pw_copy: "复制",
    sec_pw_copied: "✓ 密码已复制到剪贴板！", sec_pw_nochars: "⚠️ 至少选一种字符类型 / 还没有密码",
    sec_pg_title: "敏感内容粘贴提醒", sec_pg_desc: "当你把手机号 / 身份证号 / 银行卡号粘贴到网页时警告",
    sec_breach_title: "泄露与泄漏检查", sec_breach_hibp: "邮箱泄露?", sec_breach_webrtc: "WebRTC 泄漏",
    sec_breach_dns: "DNS 泄漏", sec_breach_clear: "清除已解锁站点", sec_breach_cleared: "✓ 已清除例外站点列表"
  },
  ru: {
    soc_st_creator: "Креатор", soc_cr_title: "Планировщик постов и метрики", soc_cr_title_ph: "Название поста / кампании...",
    soc_cr_platform: "Платформа", soc_cr_date: "Дата публикации", soc_cr_status: "Статус",
    soc_cr_status_idea: "Идея", soc_cr_status_scheduled: "Запланирован", soc_cr_status_posted: "Опубликован",
    soc_cr_add: "＋ Добавить", soc_cr_need_title: "⚠️ Сначала введите название поста!", soc_cr_empty: "В плане пока нет постов.",
    soc_cr_views: "Просм.", soc_cr_likes: "Лайки", soc_cr_shares: "Репосты", soc_cr_comments: "Коммент.",
    soc_cr_summary: "{n} постов • {v} просмотров • {l} лайков • {s} репостов • {c} комментариев",
    soc_cr_filter_all: "Все платформы", soc_cr_filter_all2: "Все статусы", soc_cr_search_ph: "Поиск постов...",
    soc_cr_export_csv: "Экспорт CSV", soc_cr_groups_title: "Группы / каналы",
    soc_cr_gname_ph: "Название группы...", soc_cr_gniche_ph: "Ниша", soc_cr_gurl_ph: "https://группа...",
    soc_cr_gadd: "＋ Группа", soc_cr_gneed_name: "⚠️ Сначала введите название группы!", soc_cr_gempty: "Сохранённых групп пока нет.",
    soc_cr_gopen: "Открыть", soc_cr_gopen_all: "Открыть все группы",
    sec_pw_title: "Генератор надёжных паролей", sec_pw_len: "Длина", sec_pw_gen: "Создать", sec_pw_copy: "Копировать",
    sec_pw_copied: "✓ Пароль скопирован в буфер обмена!", sec_pw_nochars: "⚠️ Выберите хотя бы один тип символов / пароля пока нет",
    sec_pg_title: "Предупреждение о вставке чувствительных данных", sec_pg_desc: "Предупреждает при вставке телефона / ID / номера банковской карты на страницу",
    sec_breach_title: "Проверки утечек", sec_breach_hibp: "Email утёк?", sec_breach_webrtc: "Утечка WebRTC",
    sec_breach_dns: "Утечка DNS", sec_breach_clear: "Очистить разблокированные сайты", sec_breach_cleared: "✓ Список сайтов-исключений очищен"
  },
  ja: {
    soc_st_creator: "クリエイター", soc_cr_title: "投稿プラン & 数字", soc_cr_title_ph: "投稿 / キャンペーン名...",
    soc_cr_platform: "プラットフォーム", soc_cr_date: "公開日", soc_cr_status: "ステータス",
    soc_cr_status_idea: "アイデア", soc_cr_status_scheduled: "予定済み", soc_cr_status_posted: "投稿済み",
    soc_cr_add: "＋ 追加", soc_cr_need_title: "⚠️ 先に投稿名を入力!", soc_cr_empty: "プランにまだ投稿がありません。",
    soc_cr_views: "表示", soc_cr_likes: "いいね", soc_cr_shares: "共有", soc_cr_comments: "コメント",
    soc_cr_summary: "{n} 件 • {v} 表示 • {l} いいね • {s} 共有 • {c} コメント",
    soc_cr_filter_all: "全プラットフォーム", soc_cr_filter_all2: "全ステータス", soc_cr_search_ph: "検索...",
    soc_cr_export_csv: "CSV出力", soc_cr_groups_title: "グループ / チャンネル管理",
    soc_cr_gname_ph: "グループ名...", soc_cr_gniche_ph: "分野", soc_cr_gurl_ph: "https://グループ...",
    soc_cr_gadd: "＋ グループ", soc_cr_gneed_name: "⚠️ 先にグループ名を入力!", soc_cr_gempty: "保存済みグループはまだありません。",
    soc_cr_gopen: "開く", soc_cr_gopen_all: "全グループを開く",
    sec_pw_title: "強靭パスワード生成", sec_pw_len: "長さ", sec_pw_gen: "生成", sec_pw_copy: "コピー",
    sec_pw_copied: "✓ パスワードをクリップボードへコピー!", sec_pw_nochars: "⚠️ 文字種を1つ以上選択 / パスワード未生成",
    sec_pg_title: "機微情報ペースト警告", sec_pg_desc: "電話・マイナンバー・カード番号をページへ貼付時に注意表示",
    sec_breach_title: "漏えい & リーク確認", sec_breach_hibp: "メール流出?", sec_breach_webrtc: "WebRTC リーク",
    sec_breach_dns: "DNS リーク", sec_breach_clear: "解除サイト一覧をクリア", sec_breach_cleared: "✓ 例外サイト一覧を削除しました"
  }
};
for (const lang of ["vi", "en", "zh", "ru", "ja"]) {
  const dict = D[lang];
  const file = path.join(__dirname, "..", "..", "OS", "locales", lang + ".js");
  let c = fs.readFileSync(file, "utf8");
  if (!c.includes(MARKER)) { console.error("marker missing " + lang); process.exit(1); }
  const lines = Object.keys(dict).map((k) => "    " + JSON.stringify(k) + ": " + JSON.stringify(dict[k]) + ",");
  c = c.replace(MARKER, lines.join("\n") + "\n    " + MARKER);
  fs.writeFileSync(file, c, "utf8");
  console.log(lang + " +" + lines.length + " keys");
}
