// ScholarFlow AI Assistant — minimal, isolated, no layout break
/* global storGet, storSet, showToast, currentTabUrl, currentTabObj, currentMeta, sendTabMessage, getI18nText */
const AI_PROVIDERS = {
  gemini: { label: "Gemini", apiHost: "generativelanguage.googleapis.com", apiUrlBase: "https://generativelanguage.googleapis.com/v1beta/models/", models: ["gemini-3.5-flash","gemini-3.1-pro","gemini-3-flash","gemini-3.1-flash-lite","gemini-3.8-flash","gemini-3.7-flash"], defaultModel: "gemini-3.5-flash", keyPlaceholder: "AIza...", webUrl: "https://gemini.google.com/app", loginUrl: "https://aistudio.google.com/apikey" },
  openai: { label: "ChatGPT", apiHost: "api.openai.com", apiUrl: "https://api.openai.com/v1/chat/completions", models: ["gpt-4o","gpt-4o-mini","o3-mini","o1","o3","o4-mini","gpt-4.1"], defaultModel: "gpt-4o", webUrl: "https://chatgpt.com/" },
  claude: { label: "Claude", apiHost: "api.anthropic.com", apiUrl: "https://api.anthropic.com/v1/messages", models: ["claude-3-7-sonnet","claude-sonnet-5","claude-opus-4-8","claude-3-5-sonnet-20241022","claude-3-5-haiku-20241022"], defaultModel: "claude-3-7-sonnet", webUrl: "https://claude.ai/" },
  custom: { label: "Custom", models: [], defaultModel: "", webUrl: "" }
};
const AI_MODEL_LABELS = {
  "gemini-3.5-flash": "Gemini 3.5 Flash",
  "gemini-3.1-pro": "Gemini 3.1 Pro",
  "gemini-3-flash": "Gemini 3 Flash",
  "gemini-3.1-flash-lite": "Gemini 3.1 Flash-Lite",
  "gemini-3.8-flash": "Gemini 3.8 Flash",
  "gemini-3.7-flash": "Gemini 3.7 Flash",
  "gpt-4o": "GPT-4o",
  "gpt-4o-mini": "GPT-4o Mini",
  "o3-mini": "o3-mini",
  "o1": "o1",
  "o3": "o3",
  "o4-mini": "o4-mini",
  "gpt-4.1": "GPT-4.1",
  "claude-3-7-sonnet": "Claude 3.7 Sonnet",
  "claude-sonnet-5": "Claude Sonnet 5",
  "claude-opus-4-8": "Claude Opus 4.8",
  "claude-3-5-sonnet-20241022": "Claude 3.5 Sonnet",
  "claude-3-5-haiku-20241022": "Claude 3.5 Haiku"
};
const AI_DEFAULT_CUSTOM_SERVERS = [
  { id: "ollama", name: "Ollama Local", url: "http://localhost:11434/v1/chat/completions", model: "llama3", key: "" },
  { id: "lmstudio", name: "LM Studio", url: "http://localhost:1234/v1/chat/completions", model: "local-model", key: "" },
  { id: "openrouter", name: "OpenRouter", url: "https://openrouter.ai/api/v1/chat/completions", model: "deepseek/deepseek-r1", key: "" }
];
let aiCustomServers = [...AI_DEFAULT_CUSTOM_SERVERS];
let aiActiveCustomServerId = "ollama";
const AI_STORAGE_KEYS = { provider: "sf_ai_provider", keys: "sf_ai_keys", history: "sf_ai_history", settings: "sf_ai_settings", models: "sf_ai_models", prompts: "sf_ai_prompts", sessions: "sf_ai_sessions", mem: "sf_ai_mem", customServers: "sf_ai_custom_servers", activeCustomServer: "sf_ai_active_custom_server" };
const AI_DEFAULT_SETTINGS = { includePage: true, includeSelection: true, includeNotes: false, includeImages: true, includeSource: false, stream: true, webSearch: true, autoVideo: true, readingCompanion: true, scope: "auto", maxChars: 16000, temperature: 0.7 };
const AI_DEFAULT_PROMPTS = { summary: "Tóm tắt trang này thành 5 bullet + 1 đoạn 100 chữ bằng tiếng Việt.", qa: "Trả lời câu hỏi dựa trên nội dung trang đang đứng, trích dẫn nguồn nếu có.", explain: "Giải thích đoạn bôi đen bằng tiếng Việt đơn giản.", translate: "Dịch nội dung chính của trang sang tiếng Việt tự nhiên.", outline: "Tạo outline 3 cấp (I, 1, a) cho bài viết này.", timeline: "Tạo danh sách các mốc thời gian (timeline/chương) quan trọng của video hoặc bài viết theo định dạng:\n- [mm:ss] Tiêu đề chương: tóm tắt ngắn nội dung chính.", flashcard: "Tạo 5 thẻ flashcard ôn tập kiến thức cốt lõi từ nội dung trang theo định dạng:\nQ: [Câu hỏi ôn tập]\nA: [Câu trả lời giải thích chi tiết]", cite: "Gợi ý 3 câu hỏi nghiên cứu + 5 từ khóa học thuật từ trang này.", answer: "Giải các câu trắc nghiệm trong nội dung trang: mỗi câu nêu đáp án đúng (A/B/C/D hoặc giá trị) kèm giải thích 1 dòng bằng tiếng Việt. Nếu dữ liệu đáp án nằm trong mã nguồn/script của trang, hãy dựa vào đó để khẳng định.", tabs: "Tóm tắt TỪNG tab đang mở (mỗi tab 2 gạch đầu dòng bằng tiếng Việt), sau đó lập bảng so sánh các tab theo: chủ đề, luận điểm chính, độ tin cậy nguồn.", papers: "Dựa vào danh sách tài liệu tìm được từ Crossref/OpenAlex ở phần ngữ cảnh: chọn và xếp hạng 5 công trình liên quan nhất tới chủ đề trang, mỗi cái nêu lý do 1 dòng và định dạng trích dẫn APA." };
let aiProvider = "gemini";
let aiKeys = {};
let aiHistory = [];
let aiSettings = { ...AI_DEFAULT_SETTINGS };
let aiModels = {};
let aiFetchedModels = [];
let aiPrompts = { ...AI_DEFAULT_PROMPTS };
function aiDefaultPrompts(){ const d={}; ["summary","qa","explain","translate","outline","timeline","flashcard","cite","answer","tabs","papers"].forEach(k=>{ let v=""; try{ v=(typeof getI18nText==="function")?getI18nText("ai_prompt_"+k,""): ""; }catch(e){} if(!v||v==="ai_prompt_"+k) v=AI_DEFAULT_PROMPTS[k]||""; d[k]=v; }); return d; }
let aiIsSending = false;
let aiAttachedImage = null;
let aiAttachedSelection = "";
let aiFavState = { url: null, src: null };
/* ── Multi-page context (trigger: +trang) ── */
let aiPages = [];
function aiAddPage(page) {
  if (!page || !page.url) return;
  if (aiPages.some(function(p) { return p.url === page.url; })) return;
  aiPages.push({ url: page.url, title: page.title || "", favicon: page.favicon || "", text: page.text || "" });
  aiRenderPages();
}
function aiRemovePage(url) {
  aiPages = aiPages.filter(function(p) { return p.url !== url; });
  aiRenderPages();
}
function aiRenderPages() {
  var container = document.getElementById("ai-pages-context");
  var list = document.getElementById("ai-pages-list");
  var count = document.getElementById("ai-pages-count");
  if (!container || !list) return;
  if (aiPages.length === 0) {
    container.style.display = "none";
    return;
  }
  container.style.display = "";
  if (count) count.textContent = String(aiPages.length);
  list.textContent = "";
  aiPages.forEach(function(page) {
    var chip = document.createElement("span");
    chip.className = "ai-page-chip";
    chip.title = page.url;
    var icon;
    if (page.favicon && page.favicon.indexOf("http") === 0) {
      icon = document.createElement("img");
      icon.src = page.favicon; icon.width = 12; icon.height = 12;
      icon.style.cssText = "object-fit:contain;border-radius:2px;vertical-align:middle;";
    } else {
      icon = document.createElement("span"); icon.textContent = "🌐";
    }
    chip.appendChild(icon);
    var label = document.createElement("span");
    label.style.cssText = "max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:inline-block;vertical-align:middle;margin-left:3px;";
    label.textContent = String(page.title || page.url).slice(0, 40);
    chip.appendChild(label);
    var removeBtn = document.createElement("span");
    removeBtn.className = "ai-page-chip-remove";
    removeBtn.textContent = "✕";
    removeBtn.title = aiT("ai_page_remove_tip", null, "Xóa trang này");
    removeBtn.addEventListener("click", function(e) {
      e.stopPropagation();
      aiRemovePage(page.url);
    });
    chip.appendChild(removeBtn);
    list.appendChild(chip);
  });
}
function aiGetCurrentPageInfo() {
  var url = "", title = "", favicon = "";
  try { url = (typeof currentTabUrl !== "undefined" && currentTabUrl) ? String(currentTabUrl) : ((typeof currentMeta !== "undefined" && currentMeta && currentMeta.url) ? String(currentMeta.url) : ""); } catch(e) {}
  try { title = (typeof currentMeta !== "undefined" && currentMeta && currentMeta.title) ? String(currentMeta.title) : ((typeof currentTabObj !== "undefined" && currentTabObj && currentTabObj.title) ? String(currentTabObj.title) : ""); } catch(e) {}
  try { var img = document.getElementById("ai-page-favicon"); if (img && img.src && img.style.display !== "none") favicon = img.src; } catch(e) {}
  return { url: url, title: title, favicon: favicon };
}
function aiGetProviderConfig(id){ return AI_PROVIDERS[id] || AI_PROVIDERS.gemini; }
function aiGetModel(p){ const c=aiGetProviderConfig(p); const all=[...(c.models||[]),...aiFetchedModels]; return (aiModels[p] && all.includes(aiModels[p])) ? aiModels[p] : (c.defaultModel||""); }
function aiSetModel(p,m){ const all=[...(AI_PROVIDERS[p]?.models||[]),...aiFetchedModels]; if(all.includes(m)||p==="custom"){ aiModels[p]=m; storSet({[AI_STORAGE_KEYS.models]:aiModels}); } }
/* ── Security core ────────────────────────────────────────────────────── */
const AI_STOPWORDS = new Set(["hay","và","cho","tôi","của","với","được","là","câu","hỏi","bạn","hãy","giúp","nào","bao","nhiêu","this","the","and","for","tell","me","page","about","what","many","please","can","you"]);
const AI_SAFE_IMG_RE = /^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]{8,600000}$/;
const AI_INJECTION_RE = /(\bignore\b[\s\S]{0,40}\b(previous|above|all)\b[\s\S]{0,40}\binstructions?\b|\bdisregard\b[\s\S]{0,40}\b(instructions?|rules?|policy)\b|\bqu\xean\b[\s\S]{0,40}(h\u01b0\u1edbng d\u1eabn|ch\u1ec9 th\u1ecb)|b\u1ecf qua[\s\S]{0,30}(h\u01b0\u1edbng d\u1eabn|ch\u1ec9 th\u1ecb)|system[\s-]?prompt|\byou are now\b|\bnew instruction\b|\bexfiltrat|\bapi[_ ]?key\b[\s\S]{0,30}\b(send|paste|show|reveal)\b)/i;
let aiSendTimes = [];
let aiPromptFlagged = false;
let aiQuickCtx = null;
let aiForceGround = false;
let aiActiveVideoId = "";
let aiVideoResumeAt = 0;
const _AI_STOPWORDS={a:1,an:1,the:1,of:1,on:1,at:1,in:1,is:1,are:1,was:1,were:1,be:1,to:1,for:1,and:1,or:1,but:1,it:1,its:1,this:1,that:1,these:1,those:1,with:1,from:1,by:1,as:1,do:1,does:1,did:1,what:1,which:1,who:1,how:1,why:1,when:1,where:1,would:1,will:1,can:1,could:1,should:1,about:1,there:1,their:1,your:1,you:1,i:1,me:1,my:1,we:1,us:1,our:1,not:1,no:1,yes:1,so:1,if:1,then:1,than:1,also:1,more:1,most:1,cua:1,va:1,la:1,cho:1,voi:1,mot:1,nhung:1,cac:1,cai:1,nay:1,neu:1,khi:1,ma:1,vao:1,ra:1,o:1,tren:1,duoi:1,trong:1,ngoai:1,tai:1,den:1,tu:1,cung:1,khong:1,co:1,duoc:1,hay:1,sao:1,de:1,v:1,nhieu:1,ban:1,toi:1,ai:1};
function aiContextCovers(query, text){
  const q=String(query||"").toLowerCase().normalize("NFC");
  const t=String(text||"").toLowerCase().normalize("NFC");
  const terms=q.split(/[^a-z0-9\u00C0-\u024F]/i).map(s=>s.toLowerCase().normalize("NFC")).filter(s=>s.length>=2&&!_AI_STOPWORDS[s]);
  if(!terms.length) return true;
  const matched=terms.filter(term=>t.includes(term)).length;
  return matched/terms.length>=0.5;
}
let aiSessions = [];
let aiMem = {};
/* ── Sessions (multi-conversation + search) ── */
function aiSessionId(){ return "s" + Date.now().toString(36) + Math.floor(Math.random()*1e4).toString(36); }
function aiSessionsPersist(){ const clean=aiSessions.slice(0,15).map(s=>({id:s.id,name:String(s.name||"").slice(0,60),ts:Number(s.ts)||Date.now(),msgs:(s.msgs||[]).slice(-60)})); try{ storSet({[AI_STORAGE_KEYS.sessions]:clean}); }catch(e){} }
function aiSessionsLoad(list){ if(!Array.isArray(list)) return []; return list.filter(s=>s&&s.id&&Array.isArray(s.msgs)).slice(0,15).map(s=>({id:String(s.id),name:String(s.name||"").slice(0,60),ts:Number(s.ts)||Date.now(),msgs:s.msgs.slice(-60).map(m=>({role:m.role==="user"?"user":"assistant",content:String(m.content||"").slice(0,16000),provider:AI_PROVIDERS[m.provider]?m.provider:"gemini",ts:Number(m.ts)||Date.now()}))})); }
function aiSessionsSaveCurrent(){ if(!aiHistory.length) return; const cur=aiSessions.find(s=>s.id==="__current"); const snap={role:"",ts:Date.now(),msgs:aiHistory.map(m=>({role:m.role,content:m.content,provider:m.provider,ts:m.ts}))}; if(cur){ cur.msgs=snap.msgs; cur.ts=Date.now(); } else { aiSessions.unshift({id:"__current",name:"⟲",ts:Date.now(),msgs:snap.msgs}); } aiSessionsPersist(); }
function aiSessionsNew(name){ aiSessionsSaveCurrent(); aiHistory=[]; aiActiveVideoId=""; aiVideoResumeAt=0; aiSaveHistory(); aiRenderHistory(); if(name){ aiSessions.unshift({id:aiSessionId(),name:String(name).slice(0,60),ts:Date.now(),msgs:[]}); aiSessionsPersist(); } }
function aiSessionsOpen(id){ const s=aiSessions.find(x=>x.id===id); if(!s) return; aiSessionsSaveCurrent(); const idx=aiSessions.findIndex(x=>x.id===id); if(idx!==-1) aiSessions.splice(idx,1); aiHistory=(s.msgs||[]).map(m=>({role:m.role,content:m.content,provider:m.provider,ts:m.ts})); aiActiveVideoId=""; aiVideoResumeAt=0; aiSaveHistory(); aiRenderHistory(); }
function aiSessionsDelete(id){ aiSessions=aiSessions.filter(s=>s.id!==id); aiSessionsPersist(); }
function aiSessionsSearch(q){ const t=String(q||"").toLowerCase().trim(); if(!t) return aiSessions; return aiSessions.filter(s=>String(s.name).toLowerCase().includes(t)||s.msgs.some(m=>String(m.content||"").toLowerCase().includes(t))); }
function aiRenderSessions(){ const list=document.getElementById("ai-session-list"); const se=document.getElementById("ai-session-search"); if(!list) return; const q=se?se.value:""; list.textContent=""; const items=aiSessionsSearch(q); if(!items.length){ const e=document.createElement("div"); e.className="ai-empty"; e.textContent=aiT("ai_sessions_empty",null,"Chưa có phiên nào được lưu."); list.appendChild(e); return; } items.forEach(s=>{ const row=document.createElement("div"); row.className="ai-session-row"; const info=document.createElement("div"); info.className="ai-session-info"; const nm=document.createElement("div"); nm.className="ai-session-name"; nm.textContent=s.id==="__current"?aiT("ai_sessions_current",null,"Phiên hiện tại"):s.name||"(khong ten)"; const meta=document.createElement("div"); meta.className="ai-session-meta"; try{ meta.textContent=new Date(s.ts).toLocaleString()+" · "+s.msgs.length+" tin"; }catch(e){ meta.textContent=s.msgs.length+" tin"; } info.appendChild(nm); info.appendChild(meta); const acts=document.createElement("div"); acts.className="ai-session-actions"; if(s.id!=="__current"){ const open=document.createElement("button"); open.type="button"; open.className="ai-session-btn"; open.textContent="↪"; open.title=aiT("ai_sessions_open",null,"Mở phiên"); open.addEventListener("click",()=>{ aiHideSessions(); aiSessionsOpen(s.id); }); acts.appendChild(open); } const del=document.createElement("button"); del.type="button"; del.className="ai-session-btn ai-session-del"; del.textContent="✕"; del.title=aiT("ai_sessions_delete",null,"Xoá phiên"); del.addEventListener("click",()=>{ aiSessionsDelete(s.id); aiRenderSessions(); if(typeof showToast==="function") showToast("ai_toast_session_deleted","success"); }); acts.appendChild(del); row.appendChild(info); row.appendChild(acts); list.appendChild(row); }); }
function aiShowSessions(){ const m=document.getElementById("ai-sessions-modal"); if(m) m.style.display="flex"; aiRenderSessions(); }
function aiHideSessions(){ const m=document.getElementById("ai-sessions-modal"); if(m) m.style.display="none"; }
/* ── Per-page memory ── */
function aiMemKey(url){ return String(url||"").replace(/^https?:\/\//,"").replace(/^www\./,"").split("#")[0].slice(0,140); }
function aiMemPersist(){ try{ const keys=Object.keys(aiMem); while(keys.length>60){ delete aiMem[keys.shift()]; } storSet({[AI_STORAGE_KEYS.mem]:aiMem}); }catch(e){} }
function aiMemRemember(url, question){ if(!url||url==="—"||/^(about|chrome|moz-extension|file):/i.test(url)) return; const k=aiMemKey(url); const e=aiMem[k]||{q:[],ts:0,hits:0}; const q=String(question).slice(0,180); const arr=(Array.isArray(e.q)?e.q:[]).filter(x=>x!==q); arr.unshift(q); aiMem[k]={q:arr.slice(0,3),ts:Date.now(),hits:(e.hits||0)+1}; aiMemPersist(); }
function aiMemFor(url){ const k=aiMemKey(url); const e=aiMem[k]; if(!e||!Array.isArray(e.q)||!e.q.length) return ""; if(Date.now()-(e.ts||0)>30*864e5) return ""; return "[Kỷ niệm AI về trang này] Câu hỏi trước:\n- "+e.q.join("\n- ")+"\n(LƯU Ý: Chỉ dùng ngữ cảnh này khi người dùng trực tiếp hỏi về lịch sử trước đó, TUYỆT ĐỐI không tự ý đề cập hay chèn vào câu trả lời hiện tại.)"; }
/* ── AI Skill Engine (Slash commands & Intent auto-detection) ── */
const AI_SKILLS = {
  code: {
    key: "code",
    label: "Lập trình & Kỹ thuật",
    trigger: /^[\/!](code|dev|prog|algo)\b/i,
    intent: /(viết code|viet code|đoạn mã|doan ma|hàm|thuật toán|thuat toan|lập trình|lap trinh|debug|sửa lỗi code|sua loi code|code cho tôi|code cho toi|viết script|viet script|refactor|function|algorithm)/i,
    instruction: "\n\n[KỸ NĂNG CHUYÊN SÂU: LẬP TRÌNH & THUẬT TOÁN TỐI ƯU]\n- Viết mã nguồn sạch (clean code), an toàn, chuẩn mực, có chú thích ngắn gọn ở logic phức tạp.\n- Phân tích chi tiết độ phức tạp Thời gian (Time Complexity) & Không gian (Space Complexity) theo ký hiệu Big-O.\n- Nêu rõ các trường hợp biên (Edge Cases), bẫy tiềm ẩn và hướng dẫn kiểm thử/chạy thử."
  },
  table: {
    key: "table",
    label: "Trích xuất Bảng số liệu",
    trigger: /^[\/!](table|bang)\b/i,
    intent: /(lập bảng|lap bang|trích xuất bảng|trich xuat bang|dưới dạng bảng|duoi dang bang|so sánh bảng|so sanh bang|bảng số liệu|bang so lieu|tổng hợp bảng|tong hop bang|bảng đối chiếu|bang doi chieu|format as table)/i,
    instruction: "\n\n[KỸ NĂNG CHUYÊN SÂU: TRÍCH XUẤT & TỔNG HỢP DỮ LIỆU DẠNG BẢNG]\n- Chuyển hóa toàn bộ dữ liệu, chỉ số, số liệu hoặc tiêu chí so sánh thành bảng Markdown trực quan có tiêu đề cột rõ ràng.\n- Sắp xếp dữ liệu theo trật tự logic, làm nổi bật các chỉ số quan trọng hoặc độ chênh lệch."
  },
  critique: {
    key: "critique",
    label: "Phản biện & Soi lỗi lập luận",
    trigger: /^[\/!](critique|phanbien|review|factcheck)\b/i,
    intent: /(phản biện|phan bien|soi lỗi|soi loi|đánh giá phản biện|danh gia phan bien|lỗ hổng lập luận|lo hong lap luan|ngụy biện|nguy bien|fact-check|tính xác thực|tinh xac thuc|độ tin cậy của bài|do tin cay)/i,
    instruction: "\n\n[KỸ NĂNG CHUYÊN SÂU: PHẢN BIỆN HỌC THUẬT & SOI LỖI LẬP LUẬN]\n- Phân tích tính logic, tính hợp lý và căn cứ của các luận điểm.\n- Chỉ ra các lỗi ngụy biện (nếu có), các điểm thiếu bằng chứng thực nghiệm, hoặc các góc nhìn thiên kiến (bias).\n- Đề xuất các góc nhìn đối lập hoặc giải pháp hoàn thiện hơn."
  },
  mindmap: {
    key: "mindmap",
    label: "Sơ đồ tư duy Mermaid",
    trigger: /^[\/!](mindmap|sodo|chart|mermaid)\b/i,
    intent: /(vẽ sơ đồ|ve so do|sơ đồ tư duy|so do tu duy|mindmap|lược đồ|luoc do|flowchart|quy trình dưới dạng sơ đồ|quy trinh duoi dang so do)/i,
    instruction: "\n\n[KỸ NĂNG CHUYÊN SÂU: TRỰC QUAN HÓA SƠ ĐỒ TƯ DUY MERMAID]\n- Cung cấp khối sơ đồ bằng cú pháp Mermaid chuẩn trong khối mã ```mermaid (ví dụ: graph TD hoặc mindmap).\n- Cấu trúc các nhánh mạch lạc, phân cấp rõ ràng từ ý chính đến các ý phụ và chi tiết minh họa."
  },
  quiz: {
    key: "quiz",
    label: "Tạo đề thi trắc nghiệm",
    trigger: /^[\/!](quiz|tracnghiem|dethi|exam)\b/i,
    intent: /(tạo câu hỏi trắc nghiệm|tao cau hoi trac nghiem|tạo đề thi|tao de thi|bộ câu hỏi ôn tập|bo cau hoi on tap|quiz|trắc nghiệm ôn tập|trac nghiem on tap)/i,
    instruction: "\n\n[KỸ NĂNG CHUYÊN SÂU: THIẾT KẾ ĐỀ THI & CÂU HỎI TRẮC NGHIỆM]\n- Tạo 5 câu trắc nghiệm 4 lựa chọn (A, B, C, D) bao quát các kiến thức cốt lõi.\n- Mỗi câu trình bày rõ ràng: Câu hỏi, 4 phương án, Đáp án đúng, và phần Giải thích chi tiết tại sao đúng/sai."
  },
  feynman: {
    key: "feynman",
    label: "Phương pháp Sư phạm Feynman",
    trigger: /^[\/!](feynman|dehieu|simple)\b/i,
    intent: /(giải thích như cho đứa trẻ|giai thich nhu cho dua tre|giải thích đơn giản|giai thich don gian|phương pháp feynman|phuong phap feynman|dễ hiểu nhất|de hieu nhat|giải thích cho người mới bắt đầu|giai thich cho nguoi moi bat dau|feynman)/i,
    instruction: "\n\n[KỸ NĂNG CHUYÊN SÂU: PHƯƠNG PHÁP SƯ PHẠM FEYNMAN]\n- Chia nhỏ khái niệm phức tạp thành 3 cấp độ: (1) Ẩn dụ đời sống trực quan, (2) Bản chất cốt lõi không dùng thuật ngữ khó, (3) Ứng dụng thực tế.\n- Dùng ngôn từ bình dị, sinh động, dễ liên tưởng."
  },
  math: {
    key: "math",
    label: "Toán học & Khoa học KaTeX",
    trigger: /^[\/!](math|toan|khoahoc|latex)\b/i,
    intent: /(giải bài toán|giai bai toan|chứng minh|chung minh|công thức toán|cong thuc toan|phương trình|phuong trinh|đạo hàm|dao ham|tích phân|tich phan|toán học|toan hoc|vật lý|vat ly)/i,
    instruction: "\n\n[KỸ NĂNG CHUYÊN SÂU: TOÁN HỌC & KHOA HỌC CHUẨN XÁC]\n- Định dạng tất cả các ký hiệu và công thức toán học bằng chuẩn LaTeX: nội dòng dùng \\(...\\) và dòng riêng dùng \\[...\\].\n- Trình bày lời giải từng bước chặt chẽ (step-by-step), giải thích lý do của từng bước chuyển đổi."
  },
  academic: {
    key: "academic",
    label: "Thư tín & Phản hồi Học thuật",
    trigger: /^[\/!](academic|email|letter|peer)\b/i,
    intent: /(viết email cho giáo sư|viet email cho giao su|phản hồi phản biện|phan hoi phan bien|thư tín học thuật|thu tin hoc thuat|peer review response|thư xin học bổng|thu xin hoc bong|email học thuật|email hoc thuat)/i,
    instruction: "\n\n[KỸ NĂNG CHUYÊN SÂU: THƯ TÍN & PHẢN HỒI HỌC THUẬT QUỐC TẾ]\n- Soạn thảo theo văn phong học thuật trang trọng, chuẩn mực, lịch thiệp và khúc chiết.\n- Bố cục rõ ràng: Tiêu đề súc tích, lời chào chuẩn quy thức, luận điểm chính, đề xuất hành động cụ thể và lời kết."
  },
  deepresearch: {
    key: "deepresearch",
    label: "Nghiên cứu Sâu & Tổng quan Đa nguồn",
    trigger: /^[\/!](deep|research|deepresearch|tongquan)\b/i,
    intent: /(nghiên cứu sâu|nghien cuu sau|deep research|tổng quan tài liệu đa chiều|tong quan tai lieu da chieu|literature review|nghiên cứu chuyên sâu|nghien cuu chuyen sau|tổng hợp khoa học|tong hop khoa hoc)/i,
    instruction: "\n\n[KỸ NĂNG CHUYÊN SÂU: DEEP RESEARCH & TỔNG QUAN TÀI LIỆU ĐA CHIỀU]\n- Xây dựng Ma trận Bằng chứng (Evidence Matrix): Giả thuyết cốt lõi, đối chiếu bằng chứng ủng hộ và luận điểm mâu thuẫn giữa các nghiên cứu.\n- Đánh giá phương pháp luận & độ tin cậy thực nghiệm (Cỡ mẫu, bias, tính khái quát).\n- Cung cấp khung khuyến nghị nghiên cứu tiếp nối và cấu trúc trích dẫn chuẩn mực (APA 7th)."
  },
  flashcard: {
    key: "flashcard",
    label: "Thẻ ghi nhớ Anki (Active Recall)",
    trigger: /^[\/!](flashcard|anki|card|ghinho)\b/i,
    intent: /(tạo flashcard|tao flashcard|thẻ ghi nhớ|the ghi nho|anki|ôn tập ngắt quãng|on tap ngat quang|spaced repetition|active recall|bộ thẻ nhớ|bo the nho)/i,
    instruction: "\n\n[KỸ NĂNG CHUYÊN SÂU: THIẾT KẾ FLASHCARD CHUẨN ANKI & ACTIVE RECALL]\n- Tạo 5-8 thẻ flashcard chất lượng cao nhằm kích hoạt truy hồi chủ động (Active Recall).\n- Định dạng mỗi thẻ rõ ràng:\n  🔹 [THẺ N] MẶT TRƯỚC (Prompt/Câu hỏi kích thích tư duy):\n  🔹 MẶT SAU (Answer/Đáp án cô đọng, sắc bén):\n  💡 MỎ NEO TRÍ NHỚ (Memory Anchor/Mnemonics hoặc liên tưởng đời thực):"
  },
  tldr: {
    key: "tldr",
    label: "Tóm tắt Điều hành 80/20 (Executive Brief)",
    trigger: /^[\/!](tldr|brief|exec|8020|cotloi)\b/i,
    intent: /(tóm tắt điều hành|tom tat dieu hanh|executive summary|tldr|tóm tắt 80\/20|tom tat 80\/20|ngắn gọn súc tích nhất|ngan gon suc tich nhat|ý chính trong 1 phút|y chinh trong 1 phut|tóm lược cốt lõi|tom luoc cot loi)/i,
    instruction: "\n\n[KỸ NĂNG CHUYÊN SÂU: BÁO CÁO ĐIỀU HÀNH 80/20 (EXECUTIVE BRIEFING)]\n- Áp dụng nguyên lý Pareto (80/20): Trích xuất 20% thông tin quan trọng nhất chi phối 80% kết quả bài viết/video.\n- Bố cục 4 phần dứt khoát:\n  1. Bối cảnh cốt lõi (Core Context): Tóm lược trong đúng 2 câu.\n  2. 3 Đột phá/Phát hiện then chốt (Key Takeaways).\n  3. Hành động thực thi ngay (Actionable Next Steps).\n  4. Điểm mù hoặc rủi ro tiềm ẩn (Blindspots & Risks)."
  },
  polyglot: {
    key: "polyglot",
    label: "Dịch thuật Học thuật & Thuật ngữ Chuyên ngành",
    trigger: /^[\/!](polyglot|dichchuan|academictrans|trans)\b/i,
    intent: /(dịch học thuật|dich hoc thuat|dịch chuyên ngành|dich chuyen nganh|dịch song ngữ|dich song ngu|academic translation|giữ nguyên thuật ngữ|giu nguyen thuat ngu|dịch văn phong học giả)/i,
    instruction: "\n\n[KỸ NĂNG CHUYÊN SÂU: DỊCH THUẬT HỌC THUẬT & THUẬT NGỮ CHUYÊN SÂU]\n- Dịch thuật trung thành, chuẩn xác văn phong học thuật; tuyệt đối KHÔNG dịch máy móc từng từ (word-by-word).\n- Giữ nguyên vẹn các công thức toán học KaTeX, ký hiệu code, tên riêng và các thuật ngữ chuyên ngành chuẩn quốc tế (kèm nghĩa tiếng Việt trong ngoặc đơn).\n- Giữ nguyên các chú thích trích dẫn nguồn."
  },
  data: {
    key: "data",
    label: "Phân tích Thống kê & Dữ liệu Định lượng",
    trigger: /^[\/!](data|stat|thongke|sohoa)\b/i,
    intent: /(phân tích thống kê|phan tich thong ke|giải thích số liệu|giai thich so lieu|p-value|regression|hồi quy|hoi quy|độ lệch chuẩn|do lech chuan|tương quan|tuong quan|statistical analysis)/i,
    instruction: "\n\n[KỸ NĂNG CHUYÊN SÂU: PHÂN TÍCH THỐNG KÊ & DỮ LIỆU ĐỊNH LƯỢNG]\n- Phân tích và diễn giải ý nghĩa thực tế của các số liệu thống kê (Mean, Median, SD, P-value, R², Khoảng tin cậy 95%).\n- Phân biệt rạch ròi giữa Tương quan (Correlation) và Quan hệ nhân quả (Causation).\n- Cảnh báo các bẫy thống kê thường gặp (P-hacking, survivorship bias, selection bias) và đưa ra kết luận thận trọng."
  },
  video: {
    key: "video",
    label: "Phân tích Video & Timeline Đa phương tiện",
    trigger: /^[\/!](video|yt|youtube|clip|timeline)\b/i,
    intent: /(video này|video nay|clip này|clip nay|video nói gì|video noi gi|nội dung video|noi dung video|tóm tắt video|tom tat video|timeline video|các mốc thời gian trong video|chương trong video)/i,
    instruction: "\n\n[KỸ NĂNG CHUYÊN SÂU: PHÂN TÍCH VIDEO YOUTUBE & TIMELINE CHUYÊN SÂU]\n- Phân tích video theo dòng thời gian: Liệt kê các mốc thời gian quan trọng theo định dạng chuẩn '[mm:ss] Tiêu đề: Nội dung chính' (để người dùng có thể bấm vào xem ngay).\n- Trích xuất luận điểm cốt lõi, bảng biểu, công thức hoặc lời thoại then chốt của diễn giả.\n- Đưa ra kết luận đúc rút và thông điệp hành động (Key Takeaways & Core Message)."
  }
};
function aiDetectSkill(raw){
  const q=String(raw||"").trim();
  if(!q) return null;
  for(const k of Object.keys(AI_SKILLS)){
    const sk=AI_SKILLS[k];
    if(sk.trigger && sk.trigger.test(q)) return Object.assign({}, sk, {matchedBy:"slash"});
  }
  for(const k of Object.keys(AI_SKILLS)){
    const sk=AI_SKILLS[k];
    if(sk.intent && sk.intent.test(q)) return Object.assign({}, sk, {matchedBy:"intent"});
  }
  return null;
}
/* ── Multi-Pipeline Intelligent Orchestrator ── */
const AI_PIPELINES = {
  ACADEMIC_RESEARCH: {
    type: "ACADEMIC_RESEARCH",
    label: "Nghiên cứu Học thuật",
    steps: [
      "Tra cứu & đối chiếu nguồn học thuật (Crossref / OpenAlex / DOI)...",
      "Phân tích phương pháp luận, luận điểm & độ tin cậy...",
      "Tổng hợp báo cáo học thuật chuẩn mực & định dạng APA 7th..."
    ],
    systemDirective: "\n\n[QUY TRÌNH XỬ LÝ: NGHIÊN CỨU HỌC THUẬT & PHẢN BIỆN KHOA HỌC]\n1. Khung lý thuyết & tổng quan luận điểm: Tóm lược phát hiện then chốt, câu hỏi nghiên cứu và cơ sở lý thuyết.\n2. Phân tích phương pháp luận & đối chiếu bằng chứng: Phân tích số liệu, đánh giá độ tin cậy, so sánh giữa các công trình.\n3. Đề xuất & mở rộng: Nêu bật hàm ý học thuật/thực tiễn, hạn chế và 3 câu hỏi gợi mở nghiên cứu tiếp theo."
  },
  ENGINEERING_ALGO: {
    type: "ENGINEERING_ALGO",
    label: "Kỹ thuật & Lập trình",
    steps: [
      "Phân tích yêu cầu kỹ thuật & độ phức tạp bài toán...",
      "Thiết kế giải thuật tối ưu (Time/Space Complexity O(n))...",
      "Sinh mã nguồn sạch (Clean Code, type-safe) & giải thích chi tiết..."
    ],
    systemDirective: "\n\n[QUY TRÌNH XỬ LÝ: KỸ THUẬT, LẬP TRÌNH & GIẢI THUẬT TỐI ƯU]\n1. Phân tích bài toán: Xác định rõ ràng Input, Output, Constraints và các trường hợp biên (Edge Cases).\n2. Triển khai mã nguồn chuẩn mực: Viết mã hoàn chỉnh, sạch sẽ (Clean Code), có chú thích rõ ràng, xử lý ngoại lệ an toàn.\n3. Đánh giá độ phức tạp: Phân tích tường minh độ phức tạp thời gian (Time Complexity O(...)) và không gian (Space Complexity O(...))."
  },
  PAGE_STUDY: {
    type: "PAGE_STUDY",
    label: "Đọc hiểu & Ngữ cảnh Trang",
    steps: [
      "Trích xuất & làm sạch cấu trúc trang/tài liệu/video...",
      "Phân tích ngữ cảnh chuyên sâu, số liệu & luận điểm...",
      "Trực tiếp giải đáp, trích lọc dữ liệu & sinh kết luận toàn diện..."
    ],
    systemDirective: "\n\n[QUY TRÌNH XỬ LÝ: ĐỌC HIỂU & PHÂN TÍCH NGỮ CẢNH TRANG CHUYÊN SÂU]\n1. Nắm bắt trực tiếp: Khai thác triệt để ngữ cảnh trang/tài liệu/video đang xem, trả lời đúng trọng tâm câu hỏi.\n2. Bóc tách dữ liệu có cấu trúc: Trích dẫn rõ ràng luận điểm, tiêu đề phụ, bảng dữ liệu hoặc mốc thời gian từ nguồn.\n3. Kết luận chuẩn xác: Nếu trang không có thông tin riêng biệt đó, nói rõ 'KHÔNG CÓ THÔNG TIN ĐỦ' trước khi suy luận mở rộng."
  },
  LIVE_FACTCHECK: {
    type: "LIVE_FACTCHECK",
    label: "Kiểm chứng Sự thật Đa nguồn",
    steps: [
      "Kích hoạt đối chiếu Google Search & dữ liệu đa nguồn...",
      "Xác thực tính nhất quán giữa các nguồn tin uy tín...",
      "Tổng hợp kết luận sự thật 100% chuẩn xác & khách quan..."
    ],
    systemDirective: "\n\n[QUY TRÌNH XỬ LÝ: KIỂM CHỨNG THỰC TẾ & ĐỐI CHIẾU ĐA NGUỒN]\n1. Kết luận trực diện: Khẳng định tính xác thực của sự việc/nhân vật/thời gian dựa trên sự đồng thuận cao nhất của các nguồn.\n2. Đối chiếu đa chiều: Phân tích mốc sự kiện, bối cảnh lịch sử hoặc dữ liệu số thực tế để minh chứng rõ ràng.\n3. Khách quan & chính xác 100%: Phân biệt rành mạch giữa sự thật đã kiểm chứng và tin đồn/nhầm lẫn phổ biến."
  },
  GENERAL_COGNITIVE: {
    type: "GENERAL_COGNITIVE",
    label: "Tư duy Đa năng & Chuyên gia",
    steps: [
      "Giải cấu trúc yêu cầu & kích hoạt chuỗi suy luận logic (CoT)...",
      "Tổng hợp kiến thức liên ngành & phân tích đa chiều...",
      "Trình bày giải pháp tối ưu kèm đề xuất thực thi..."
    ],
    systemDirective: "\n\n[QUY TRÌNH XỬ LÝ: TƯ DUY TOÀN NĂNG & ĐA CHIỀU (CHAIN-OF-THOUGHT)]\n1. Trả lời trực diện: Cung cấp ngay kết luận hoặc giải pháp cốt lõi nhất một cách mạch lạc, thông minh.\n2. Khai triển chi tiết có cấu trúc: Sử dụng tiêu đề Markdown (##), danh sách phân tích, bảng so sánh và phân tích ưu nhược điểm.\n3. Phương án tối ưu (Best Approach): Đưa ra khuyến nghị thiết thực nhất kèm các câu hỏi gợi mở tiếp theo."
  }
};

const AI_ENG_ALGO_RE = /(code|lập trình|lap trinh|thuật toán|thuat toan|giải thuật|giai thuat|algorithm|python|javascript|typescript|c\+\+|java|rust|golang|sql|regex|debug|sửa lỗi|sua loi|tối ưu mã|toi uu ma|độ phức tạp|do phuc tap|big[- ]?o|o\(|katex|latex|toán|vi tích phân|đại số|ma trận|mã nguồn|ma nguon|hàm |class |function |def |bug|refactor)/i;
const AI_ACADEMIC_RE = /(nghiên cứu|nghien cuu|học thuật|hoc thuat|paper|crossref|openalex|doi|tổng quan tài liệu|tong quan tai lieu|literature review|trích dẫn|trich dan|citation|apa|phản biện|phan bien|luận văn|luan van|khóa luận|khoa luan|thesis|abstract|methodology)/i;
const AI_FACTCHECK_RE = /(ai là|ai la|sự thật|su that|kiểm chứng|kiem chung|ngày nào|ngay nao|năm nào|nam nao|thật không|that khong|chính xác không|chinh xac khong|tin tức|tin tuc|thời sự|thoi su|mới nhất|moi nhat|ai sáng lập|ai sang lap|người phát minh|nguoi phat minh|fact[- ]?check)/i;

function aiResolvePipeline(rawQuery, isPageQuery, detectedSkill, quickReq, hasActiveWebPage, pageUrl){
  const q = String(rawQuery || "").trim();
  const skKey = detectedSkill ? detectedSkill.key : "";
  const u = String(pageUrl || (typeof currentTabUrl !== "undefined" && currentTabUrl) || "");
  let p = AI_PIPELINES.GENERAL_COGNITIVE;
  if(skKey === "code" || skKey === "data" || skKey === "math" || AI_ENG_ALGO_RE.test(q)){
    p = AI_PIPELINES.ENGINEERING_ALGO;
  } else if((quickReq && quickReq.kind === "papers") || skKey === "critique" || skKey === "mail" || skKey === "academic" || skKey === "deepresearch" || AI_ACADEMIC_RE.test(q)){
    p = AI_PIPELINES.ACADEMIC_RESEARCH;
  } else if(isPageQuery || (quickReq && quickReq.kind === "tabs") || skKey === "table" || skKey === "quiz" || skKey === "mindmap" || skKey === "flashcard" || skKey === "tldr" || skKey === "polyglot" || skKey === "video"){
    p = AI_PIPELINES.PAGE_STUDY;
  } else if(skKey === "factcheck" || AI_FACTCHECK_RE.test(q)){
    p = AI_PIPELINES.LIVE_FACTCHECK;
  } else if(hasActiveWebPage && u && !/^(about:|chrome:|moz-extension:|chrome-extension:|edge:)/i.test(u)){
    if(/(arxiv\.org|nature\.com|sciencedirect\.com|pubmed|biorxiv\.org|openreview\.net|researchgate\.net|ieeexplore\.ieee\.org|springer\.com|scopus\.com)/i.test(u)){
      p = AI_PIPELINES.ACADEMIC_RESEARCH;
    } else if(/(github\.com|gitlab\.com|stackoverflow\.com|leetcode\.com|codepen\.io|developer\.mozilla\.org|huggingface\.co|w3schools\.com)/i.test(u)){
      p = AI_PIPELINES.ENGINEERING_ALGO;
    } else if(aiIsYouTubeUrl(u)){
      p = AI_PIPELINES.PAGE_STUDY;
    }
  }
  const lang = (typeof currentAppLanguage !== "undefined" && currentAppLanguage) || "vi";
  if(lang === "vi") return p;
  const I18N_MAP = {
    en: {
      ACADEMIC_RESEARCH: { label: "Academic Research", steps: ["Searching & cross-referencing academic sources (Crossref/OpenAlex/DOI)...", "Analyzing methodology, arguments & credibility...", "Synthesizing scholarly report with APA 7th formatting..."] },
      ENGINEERING_ALGO: { label: "Engineering & Code", steps: ["Analyzing technical requirements & complexity...", "Designing optimal algorithm (Time/Space Complexity O(n))...", "Generating clean, type-safe code & explanations..."] },
      PAGE_STUDY: { label: "Page Understanding", steps: ["Extracting & parsing page/doc/video structure...", "Analyzing deep context, metrics & arguments...", "Delivering structured answer & synthesized insights..."] },
      LIVE_FACTCHECK: { label: "Live Fact-Check", steps: ["Activating Google Search & multi-source verification...", "Verifying consistency across authoritative sources...", "Synthesizing 100% verified facts & objective findings..."] },
      GENERAL_COGNITIVE: { label: "Cognitive Expert", steps: ["Deconstructing request & activating Chain-of-Thought...", "Synthesizing cross-domain knowledge...", "Formulating optimal structured solution..."] }
    },
    zh: {
      ACADEMIC_RESEARCH: { label: "学术研究流程", steps: ["检索比对学术数据（Crossref/OpenAlex/DOI）...", "分析研究方法论、论点与置信度...", "生成标准学术报告与 APA 7th 引用格式..."] },
      ENGINEERING_ALGO: { label: "工程算法流程", steps: ["分析技术要求与问题复杂度...", "设计最优架构解法（时间/空间复杂度 O(n)）...", "生成整洁代码（Clean Code）并详细阐述..."] },
      PAGE_STUDY: { label: "网页深度研读", steps: ["解析并清洗网页/文档/视频结构...", "深度分析上下文脉络、数据与论点...", "精准提取信息并生成综合结构图表..."] },
      LIVE_FACTCHECK: { label: "多源事实核查", steps: ["启动 Google 搜索与全网多源核实...", "多方印证权威来源事实一致性...", "汇总客观、精确的事实结论..."] },
      GENERAL_COGNITIVE: { label: "全能专家推理", steps: ["拆解问题并激活逻辑思维链（CoT）...", "整合跨领域知识与多维度分析...", "输出最优解决方案与执行建议..."] }
    },
    ru: {
      ACADEMIC_RESEARCH: { label: "Академическое исследование", steps: ["Поиск и сопоставление источников (Crossref/OpenAlex/DOI)...", "Анализ методологии, аргументов и надежности...", "Синтез отчета с оформлением по APA 7th..."] },
      ENGINEERING_ALGO: { label: "Инженерия и код", steps: ["Анализ технических требований и сложности...", "Проектирование алгоритма (Time/Space O(n))...", "Генерация чистого кода и пояснений..."] },
      PAGE_STUDY: { label: "Изучение страницы", steps: ["Извлечение и очистка структуры страницы/документа...", "Глубокий анализ контекста, данных и тезисов...", "Формирование точного ответа и синтез..."] },
      LIVE_FACTCHECK: { label: "Проверка фактов", steps: ["Активация поиска Google и мульти-источников...", "Проверка согласованности надежных данных...", "Формулирование проверенных фактов на 100%..."] },
      GENERAL_COGNITIVE: { label: "Когнитивный эксперт", steps: ["Деконструкция запроса и запуск цепочки рассуждений...", "Синтез междисциплинарных знаний...", "Разработка оптимального структурированного решения..."] }
    },
    ja: {
      ACADEMIC_RESEARCH: { label: "学術研究フロー", steps: ["学術情報・DOI等の検索・照合中...", "研究手法・論点・信頼性の分析中...", "APA 7th形式の学術レポートを統合生成中..."] },
      ENGINEERING_ALGO: { label: "エンジニアリング・コード", steps: ["要件と計算量の分析中...", "最適なアルゴリズム設計（O(n)計算量）...", "クリーンコードの実装と詳細解説..."] },
      PAGE_STUDY: { label: "ページ精読・分析", steps: ["ページ・文書・動画構造を抽出・整理中...", "詳細なコンテキスト・数値・論点を精査中...", "構造化された回答と知見を提示中..."] },
      LIVE_FACTCHECK: { label: "リアルタイム事実検証", steps: ["Google検索とマルチソース検証を実行中...", "権威あるソース間での整合性を確認中...", "客観的で正確なファクトを統合中..."] },
      GENERAL_COGNITIVE: { label: "思考・エキスパート", steps: ["問いを分解し思考連鎖（CoT）を展開中...", "学際的な知識を統合・多角的に分析中...", "最適化された解決策と提案を出力中..."] }
    }
  };
  const loc = (I18N_MAP[lang] && I18N_MAP[lang][p.type]) || (I18N_MAP.en && I18N_MAP.en[p.type]);
  if(loc) {
    return Object.assign({}, p, { label: loc.label, steps: loc.steps });
  }
  return p;
}
/* ── Auto page-intent (Copilot-style: no +/@ prefix needed) ── */
const AI_PAGE_INTENT_RE = /(trang\s+(này|hiện tại|của tôi|đang xem)|(web|website)\s+này|bài\s+(này|viết này|báo này|bài báo này)|video\s+(này|nói\s+gì|về\s+gì|có\s+gì)|clip\s+(này|nói\s+gì)|mv\s+này|nội dung\s+(này|chính|trong\s+(?:video|trang|bài|clip)|của\s+(?:video|trang|bài|clip))|đang\s+nói\s+gì|nói\s+về\s+cái?\s*gì|đoạn\s+này|(trên|ở)\s+trang(\s+này)?|trang hiện tại|trang\s+đang\s+(mở|xem)|tác giả\s+(của\s+)?(trang|bài|video|bài hát|mv)\s+này|người\s+viết\s+bài\s+này|người\s+trong\s+video|ai\s+đang\s+nói|this\s+(page|article|video|website|post|document)|current\s+(page|tab|url))/i;
const AI_PAGE_TOOL_RE = /(tóm tắt\s+(trang|trang web|video|clip|nội dung|bài viết|video này|bài này)|dịch\s+(trang|bài|video|đoạn|nội dung)(\s+sang)?|giải\s+các\s+câu\s+trắc\s+nghiệm|trắc\s+nghiệm\s+(trong|ở)\s+trang|đáp\s+án\s+(câu|bài|đề)|tạo\s+outline|outline\s+(this|the)|bôi\s+đen|tóm\s+tắt\s+các\s+tab|so\s+sánh\s+các\s+tab|tài\s+liệu\s+liên\s+quan|trích\s+dẫn\s+APA|định\s+dạng\s+APA|gợi\s+ý\s+câu\s+hỏi\s+nghiên\s+cứu|translate\s+this)/i;
function aiDetectPageIntent(raw){
  const q=String(raw||"").trim();
  if(!q) return false;
  if(/^[+@]\s*/.test(q)) return true;
  return AI_PAGE_INTENT_RE.test(q)||AI_PAGE_TOOL_RE.test(q);
}
function aiSourcesLabel(){
  const L={vi:"Nguồn web (Google Search & Đa nguồn):",en:"Web sources (Google Search & Multi-source):",zh:"网络来源（Google 搜索与多源）:",ru:"Веб-источники (поиск Google и мульти-источники):",ja:"ウェブ出典（Google検索・複数ソース）:"};
  const lang=(typeof currentAppLanguage!=="undefined"&&currentAppLanguage)||"vi";
  return L[lang]||"Web sources:";
}
function aiSearchQueriesLabel(){
  const L={vi:"Truy vấn Google Search:",en:"Google Search queries:",zh:"Google 搜索查询词：",ru:"Запросы Google Search:",ja:"Google検索クエリ:"};
  const lang=(typeof currentAppLanguage!=="undefined"&&currentAppLanguage)||"vi";
  return L[lang]||"Google Search queries:";
}
/* ── Multi-passage RAG ── */
function aiSelectRelevantWindows(fullText, query, budget){
  const T=String(fullText||"");
  if(T.length<=budget) return T;
  const words=(String(query||"").toLowerCase().match(/[\p{L}\p{N}]{2,}/gu)||[]).filter(w=>!AI_STOPWORDS.has(w));
  const score=(chunk)=>{ const w=chunk.toLowerCase(); let sc=0; for(const x of words){ let i=-1; while((i=w.indexOf(x,i+1))!==-1) sc++; } return sc; };
  const win=Math.max(900, Math.floor(budget/3));
  const step=Math.max(300, Math.floor(win/2));
  const cands=[];
  for(let pos=0; pos+win<=T.length; pos+=step) cands.push(pos);
  const last=T.length-win; if(last>=0 && cands[cands.length-1]!==last) cands.push(last);
  const scored=cands.map(p=>({p:p,s:score(T.slice(p,p+win))})).filter(x=>x.s>0).sort((a,b)=>b.s-a.s);
  const picked=[]; const used=[];
  for(const it of scored){ if(picked.length>=3) break; if(used.some(u=>Math.abs(u-it.p)<win)) continue; picked.push(it.p); used.push(it.p); }
  if(!picked.length) return aiSelectRelevantWindow(T, query, budget);
  picked.sort((a,b)=>a-b);
  const head=T.slice(0,400);
  const body=picked.map((p,ix)=>(ix>0?"\n---\n":"")+"[Doan "+(ix+1)+"] "+T.slice(p,p+win).trim());
  const joined = head + "\n…[middle omitted: not relevant to the question]…\n" + body.join("\n");
  return joined.slice(0, budget);
}
let aiAbort = null; let aiUserStopped = false;
function aiSig(parent, ms){ const ctrl=new AbortController(); const t=setTimeout(()=>{ try{ ctrl.abort(); }catch(e){} }, ms); if(parent){ if(parent.aborted){ try{ ctrl.abort(); }catch(e){} } else { try{ parent.addEventListener("abort", ()=>{ try{ ctrl.abort(); }catch(e){} }); }catch(e){} } } return ctrl.signal; }
function aiShowTyping(statusText){
  const c=document.getElementById("ai-chat-history");
  if(!c) return;
  aiHideTyping();
  const row=document.createElement("div");
  row.className="ai-msg ai-msg-assistant ai-typing-row";
  const b=document.createElement("div");
  b.className="ai-bubble ai-typing";
  for(let i=0;i<3;i++){
    const d=document.createElement("span");
    d.className="ai-dot";
    b.appendChild(d);
  }
  if(statusText){
    const st=document.createElement("span");
    st.className="ai-pipeline-status";
    st.textContent=String(statusText);
    b.appendChild(st);
  }
  row.appendChild(b);
  c.appendChild(row);
  c.scrollTop=c.scrollHeight;
}
function aiUpdateTypingStatus(statusText){
  const c=document.getElementById("ai-chat-history");
  if(!c) return;
  const row=c.querySelector(".ai-typing-row");
  if(!row){
    aiShowTyping(statusText);
    return;
  }
  const b=row.querySelector(".ai-typing");
  if(!b) return;
  let st=b.querySelector(".ai-pipeline-status");
  if(!st){
    st=document.createElement("span");
    st.className="ai-pipeline-status";
    b.appendChild(st);
  }
  st.textContent=String(statusText||"");
  c.scrollTop=c.scrollHeight;
}
function aiHideTyping(){ const c=document.getElementById("ai-chat-history"); if(!c) return; c.querySelectorAll(".ai-typing-row").forEach(x=>{ try{ c.removeChild(x); }catch(e){} }); }
async function aiStreamSSE(res, extract, opts){
  const rd=res.body.getReader(); const dec=new TextDecoder(); let buf="", full="";
  while(true){
    const chunk=await rd.read(); if(chunk.done) break;
    buf+=dec.decode(chunk.value,{stream:true}); let nl;
    while((nl=buf.indexOf("\n"))!==-1){
      const line=buf.slice(0,nl).trim(); buf=buf.slice(nl+1);
      if(!line.startsWith("data:")) continue;
      const js=line.slice(5).trim(); if(!js||js==="[DONE]") continue;
      try{ const o=JSON.parse(js); const piece=extract(o); if(piece){ full+=piece; if(opts&&opts.onToken) opts.onToken(piece); } }catch(e){}
    }
  }
  return full;
}
function aiGroundingSources(cand){
  const out=[];
  if(!cand) return out;
  const gm=cand.groundingMetadata;
  const chunks=(gm&&Array.isArray(gm.groundingChunks))?gm.groundingChunks:((gm&&Array.isArray(gm.sources))?gm.sources:[]);
  for(const c of chunks){
    const w=c&&c.web;
    const u=w?(w.uri||""):((c&&c.uri)||"");
    if(!u||!/^https?:\/\//i.test(String(u))) continue;
    const tit=String((w&&w.title)||(c&&c.title)||"").replace(/\s+/g," ").trim();
    if(out.some(x=>x.u===u)) continue;
    out.push({u:String(u).slice(0,300),t:tit.slice(0,140)});
  }
  return out.slice(0,8);
}
function aiGroundingQueries(cand){
  const out=[];
  if(!cand) return out;
  const gm=cand.groundingMetadata;
  const qList=(gm&&Array.isArray(gm.webSearchQueries))?gm.webSearchQueries:[];
  for(const q of qList){
    const s=String(q||"").replace(/\s+/g," ").trim();
    if(s&&!out.includes(s)) out.push(s.slice(0,120));
  }
  return out.slice(0,5);
}
async function aiStreamGemini(model, apiKey, contents, temperature, opts, tools, maxMs, genExtra, sysInst){
  const url="https://generativelanguage.googleapis.com/v1beta/models/"+encodeURIComponent(model)+":streamGenerateContent?alt=sse&key="+encodeURIComponent(apiKey);
  const body={contents:contents,generationConfig:Object.assign({temperature:temperature,maxOutputTokens:8192},genExtra||null)};
  if(sysInst) body.systemInstruction={parts:[{text:sysInst}]};
  if(tools&&tools.length) body.tools=tools;
  const res=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body),signal:aiSig(opts&&opts.signal,maxMs||90000)});
  if(!res.ok){ const t=res.status===404?"model_404":String(res.status); throw new Error("gemini_stream_"+t); }
  const srcs=[];
  const queries=[];
  const extract=(o)=>{
    const cand=o.candidates&&o.candidates[0];
    const p2=cand&&cand.content&&cand.content.parts;
    const txt=Array.isArray(p2)?p2.map(p=>(p&&typeof p.text==="string")?p.text:"").join(""):((p2&&p2[0]&&typeof p2[0].text==="string")?p2[0].text:"");
    const got=aiGroundingSources(cand);
    for(const s of got){ if(!srcs.some(x=>x.u===s.u)) srcs.push(s); }
    const gotQ=aiGroundingQueries(cand);
    for(const q of gotQ){ if(!queries.includes(q)) queries.push(q); }
    return txt;
  };
  const full=await aiStreamSSE(res, extract, opts);
  if(!full) throw new Error("gemini_stream_empty");
  if(srcs.length&&opts) opts.__groundingSources=srcs.concat(opts.__groundingSources||[]).slice(0,8);
  if(queries.length&&opts) opts.__groundingQueries=queries.slice(0,5);
  return full;
}
async function aiStreamOpenAI(apiUrl, model, messages, temperature, apiKey, opts){
  const res=await fetch(apiUrl,{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+apiKey},body:JSON.stringify({model:model,messages:messages,temperature:temperature,stream:true}),signal:aiSig(opts&&opts.signal,90000)});
  if(!res.ok) throw new Error("openai_stream_"+res.status);
  const full=await aiStreamSSE(res, (o)=>{ const ch=o.choices&&o.choices[0]; const d=ch&&(ch.delta||ch.message); return d&&typeof d.content==="string"?d.content:""; }, opts);
  if(!full) throw new Error("openai_stream_empty");
  return full;
}
function aiValidateCustomUrl(raw, allowLocal = false){
  try{
    const u = new URL(String(raw||"").trim());
    if(!allowLocal && u.protocol!=="https:") return false;
    if(allowLocal && u.protocol!=="https:" && u.protocol!=="http:") return false;
    if(u.username||u.password) return false;
    let h = (u.hostname||"").toLowerCase().replace(/^\[|\]$/g,"");
    if(!h) return false;
    if(h === "169.254.169.254") return false;
    if(!allowLocal){
      if(/^(localhost|.+\.localhost|.+\.local|.+\.internal|.+\.intranet|.+\.localdomain)$/i.test(h)) return false;
      if(/^\d+\.\d+\.\d+\.\d+$/.test(h)){
        const p=h.split(".").map(Number);
        if(p.some(x=>!isFinite(x)||x<0||x>255)) return false;
        if(p[0]===0||p[0]===10||p[0]===127) return false;
        if(p[0]===169&&p[1]===254) return false;
        if(p[0]===192&&p[1]===168) return false;
        if(p[0]===172&&p[1]>=16&&p[1]<=31) return false;
        if(p[0]===100&&p[1]>=64&&p[1]<=127) return false;
        if(p[0]===192&&p[1]===0&&p[2]===2) return false;
        if(p[0]===198&&p[1]===18) return false;
        if(p[0]===192&&p[1]===88) return false;
      }
      if(h.includes(":")){
        const n=h.replace(/\./g,"");
        if(/^(::1|::|fd|fc|fe80|fec0)/i.test(n)) return false;
        if(/^\d+\./.test(h)) return false;
      }
    }
    return true;
  }catch(e){ return false; }
}
function aiSanitizeExternal(text, maxChars){
  let t = String(text||"").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2028\u2029\u2060\uFEFF]/g,"");
  t = t.slice(0, Math.max(200, Math.min(32000, maxChars||20000)));
  return { text:t, flagged:AI_INJECTION_RE.test(t) };
}
function aiSanitizeHistory(list){
  const out=[];
  (Array.isArray(list)?list:[]).forEach(m=>{
    if(!m||typeof m!=="object") return;
    if(m.role!=="user"&&m.role!=="assistant") return;
    if(m.content!=null&&typeof m.content!=="string") return;
    const e={ role:m.role, content:String(m.content||"").slice(0,16000), provider:AI_PROVIDERS[m.provider]?m.provider:"gemini", ts:Number(m.ts)||Date.now() };
    if(m.image!=null){ if(typeof m.image==="string"&&AI_SAFE_IMG_RE.test(m.image)) e.image=m.image; else return; }
    out.push(e);
  });
  return out.slice(-50);
}
function aiRateLimitOk(){
  const now=Date.now();
  aiSendTimes=aiSendTimes.filter(t=>now-t<300000);
  if(aiSendTimes.length>=20) return false;
  const last=aiSendTimes[aiSendTimes.length-1]||0;
  if(now-last<2000) return false;
  aiSendTimes.push(now);
  return true;
}
/* ─────────────────────────────────────────────────────────────────────── */
async function aiFetchGeminiModels(k){
  const key=(k||aiKeys["gemini"]||"").trim(); if(!key||key.length<10) return [];
  for(const ver of ["v1beta","v1"]){
    try{
      const res=await fetch("https://generativelanguage.googleapis.com/"+ver+"/models?key="+encodeURIComponent(key),{signal:AbortSignal.timeout(10000)});
      if(!res.ok) continue;
      const d=await res.json();
      const list=(d.models||[]).filter(m=>(m.supportedGenerationMethods||[]).includes("generateContent")).map(m=>String(m.name||"").replace(/^models\//,"")).filter(n=>n&&!/-tts|-image|transcribe|lyria|robotics|computer-use|embedding|antigravity|deep-research|nano-banana|omni/i.test(n));
      if(list.length){ aiFetchedModels=[...new Set([...aiFetchedModels,...list])]; return list; }
    }catch(e){}
  }
  return [];
}
function aiApplyFavicon(){ const img=document.getElementById("ai-page-favicon"), fb=document.getElementById("ai-page-favicon-fb"); if(!img||!fb) return; const f=aiFavState.src||""; if(f&&!/^(chrome|chrome-extension|moz-extension|about|edge|brave):/i.test(f)){ try{ img.src=f; }catch(e){} img.style.display=""; fb.style.display="none"; } else { img.removeAttribute("src"); img.style.display="none"; fb.style.display=""; } }
function aiUpdateFavicon(url){ const good=url&&url!=="—"&&!/^(about|chrome|chrome-extension|moz-extension|edge|brave):/i.test(url); if(!good){ aiFavState={url:null,src:null}; aiApplyFavicon(); return; } if(aiFavState.url===url){ aiApplyFavicon(); return; } aiFavState={url:url,src:null}; let own=""; try{ if(typeof currentTabObj!=="undefined"&&currentTabObj&&currentTabObj.url===url) own=currentTabObj.favIconUrl||""; }catch(e){} if(own){ aiFavState.src=own; aiApplyFavicon(); return; } aiApplyFavicon(); if(typeof ensureActiveTab==="function"){ Promise.resolve(ensureActiveTab()).then(t=>{ if(aiFavState.url!==url) return; const f=(t&&(t.favIconUrl||t.favIcon))||""; if(f){ aiFavState.src=f; aiApplyFavicon(); } }).catch(()=>{}); } }
function aiUpdateChatHeight(){ const wrap=document.querySelector(".ai-chat-wrapper"); if(!wrap) return; const top=wrap.getBoundingClientRect().top; const vh=window.innerHeight||0; if(!vh||top<=0){ return; } const h=Math.max(260, Math.floor(vh-top-14)); if(wrap.style.height!==h+"px") wrap.style.height=h+"px"; }
function aiT(key, params, fallback){ return (typeof getI18nText==="function")?getI18nText(key,params):fallback; }
function aiUpdateCurrentPageDisplay(){
  const tEl=document.getElementById("ai-page-title"), uEl=document.getElementById("ai-page-url");
  if(!tEl||!uEl) return;
  let t="",u="";
  try{
    const tabsApi=(typeof browser!=="undefined"&&browser.tabs)?browser.tabs:(typeof chrome!=="undefined"?chrome.tabs:null);
    if(tabsApi&&tabsApi.query){
      tabsApi.query({active:true,currentWindow:true},tabs=>{
        const x=tabs&&tabs[0];
        if(x&&x.url&&!/^(about:|chrome:|moz-extension:|chrome-extension:|edge:)/i.test(x.url)){
          if(typeof currentTabUrl!=="undefined"&&currentTabUrl!==x.url){
            currentTabUrl=x.url;
            if(typeof currentTabObj!=="undefined") currentTabObj=x;
            if(typeof currentMeta!=="undefined"&&currentMeta){ currentMeta.url=x.url; if(x.title&&x.title!=="Untitled") currentMeta.title=x.title; }
          }
          t=x.title||t;
          u=x.url||u;
          if(!t) t=aiT("ai_page_title_default",null,"Chưa có trang");
          if(!u) u="—";
          if(tEl.textContent!==t){ tEl.textContent=t; tEl.title=t; }
          if(uEl.textContent!==u){ uEl.textContent=u; uEl.title=u; }
          aiUpdateFavicon(u);
          try{
            aiGetSelectionText().then(selText=>{
              if(selText&&selText.trim()){
                aiAttachedSelection=selText.trim();
                const inp=document.getElementById("ai-input");
                if(inp&&!inp.value){
                  const preview=selText.trim().replace(/\s+/g," ").slice(0,36);
                  inp.placeholder="🎯 Bôi đen: \""+preview+(selText.trim().length>36?"...":"")+"\" — Hỏi hoặc bấm chip tác vụ";
                }
              }
            }).catch(()=>{});
          }catch(e){}
        }
      });
    }
  }catch(e){}
  try{ if(window.currentMeta&&currentMeta.title&&String(currentMeta.title).trim()) t=String(currentMeta.title).trim(); else if(typeof currentTabObj!=="undefined"&&currentTabObj&&currentTabObj.title) t=String(currentTabObj.title);}catch(e){}
  try{
    if(typeof currentTabUrl!=="undefined"&&currentTabUrl&&!String(currentTabUrl).startsWith("about:")&&!String(currentTabUrl).startsWith("chrome")&&!String(currentTabUrl).startsWith("moz-extension")) u=String(currentTabUrl);
    else if(window.currentMeta&&currentMeta.url&&!String(currentMeta.url).startsWith("about:")) u=String(currentMeta.url);
    else if(typeof currentTabObj!=="undefined"&&currentTabObj&&currentTabObj.url) u=String(currentTabObj.url);
  }catch(e){}
  if(!t) t=aiT("ai_page_title_default",null,"Chưa có trang");
  if(!u||String(u).startsWith("about:")||String(u).startsWith("chrome")) u="—";
  if(tEl.textContent!==t){ tEl.textContent=t; tEl.title=t; }
  if(uEl.textContent!==u){ uEl.textContent=u; uEl.title=u; }
  aiUpdateFavicon(u);
}
function aiLoadSettings(){
  return new Promise(res=>{
    storGet([AI_STORAGE_KEYS.provider,AI_STORAGE_KEYS.keys,AI_STORAGE_KEYS.history,AI_STORAGE_KEYS.settings,AI_STORAGE_KEYS.models,AI_STORAGE_KEYS.prompts,AI_STORAGE_KEYS.sessions,AI_STORAGE_KEYS.mem,AI_STORAGE_KEYS.customServers,AI_STORAGE_KEYS.activeCustomServer],r=>{
      aiPrompts=aiDefaultPrompts();
      try{ aiSessions=aiSessionsLoad(r[AI_STORAGE_KEYS.sessions]); }catch(e){ aiSessions=[]; }
      try{ if(r[AI_STORAGE_KEYS.mem]&&typeof r[AI_STORAGE_KEYS.mem]==="object") aiMem=r[AI_STORAGE_KEYS.mem]; }catch(e){}
      if(r[AI_STORAGE_KEYS.provider]&&AI_PROVIDERS[r[AI_STORAGE_KEYS.provider]]) aiProvider=r[AI_STORAGE_KEYS.provider];
      if(r[AI_STORAGE_KEYS.keys]&&typeof r[AI_STORAGE_KEYS.keys]==="object") aiKeys=r[AI_STORAGE_KEYS.keys];
      if(Array.isArray(r[AI_STORAGE_KEYS.history])) aiHistory=aiSanitizeHistory(r[AI_STORAGE_KEYS.history]);
      if(r[AI_STORAGE_KEYS.settings]&&typeof r[AI_STORAGE_KEYS.settings]==="object"){ aiSettings={...AI_DEFAULT_SETTINGS,...r[AI_STORAGE_KEYS.settings]}; aiSettings.maxChars=Math.max(1000,Math.min(32000,Number(aiSettings.maxChars)||20000)); const tv=Number(aiSettings.temperature); aiSettings.temperature=isFinite(tv)?Math.max(0,Math.min(2,tv)):0.7; }
      if(r[AI_STORAGE_KEYS.models]&&typeof r[AI_STORAGE_KEYS.models]==="object") aiModels=r[AI_STORAGE_KEYS.models];
      if(r[AI_STORAGE_KEYS.prompts]&&typeof r[AI_STORAGE_KEYS.prompts]==="object") aiPrompts={...aiDefaultPrompts(),...r[AI_STORAGE_KEYS.prompts]};
      if(Array.isArray(r[AI_STORAGE_KEYS.customServers])&&r[AI_STORAGE_KEYS.customServers].length) aiCustomServers=r[AI_STORAGE_KEYS.customServers];
      if(r[AI_STORAGE_KEYS.activeCustomServer]) aiActiveCustomServerId=String(r[AI_STORAGE_KEYS.activeCustomServer]);
      res();
    });
  });
}
function aiSaveProvider(){ storSet({[AI_STORAGE_KEYS.provider]:aiProvider}); }
function aiSaveKeys(){ storSet({[AI_STORAGE_KEYS.keys]:aiKeys}); }
function aiSaveHistory(){ storSet({[AI_STORAGE_KEYS.history]:aiHistory.slice(-50)}); }
function aiSaveSettings(){ storSet({[AI_STORAGE_KEYS.settings]:aiSettings}); }
function aiHasKey(p){ const v=aiKeys[p]; return typeof v==="string"&&v.trim().length>8; }
function aiBuildContext(){
  const a=[]; try{ const t=(currentMeta&&currentMeta.title)?currentMeta.title:(document.title||""); const u=currentTabUrl||(currentMeta&&currentMeta.url)||""; if(t) a.push("Title: "+t); if(u) a.push("URL: "+u);}catch(e){} return a.join("\n");
}
/* ── Multi-Tier Omni Page Text Extractor (Copilot-grade) ── */
async function aiExtractViaScripting(tabId) {
  try {
    const scriptingApi = (typeof browser !== "undefined" && browser.scripting) ? browser.scripting
      : ((typeof chrome !== "undefined" && chrome.scripting) ? chrome.scripting : null);
    if (scriptingApi && scriptingApi.executeScript && tabId) {
      const results = await scriptingApi.executeScript({
        target: { tabId: tabId },
        world: "ISOLATED",
        func: () => {
          try {
            // 1. Khai thác dữ liệu cấu trúc ẩn JSON-LD (Schema.org Article / NewsArticle)
            let jsonLd = "";
            try {
              const scs = document.querySelectorAll('script[type="application/ld+json"]');
              for (let i = 0; i < scs.length; i++) {
                const s = (scs[i].textContent || "").trim();
                if (!s || !s.includes("articleBody")) continue;
                const o = JSON.parse(s);
                const arr = Array.isArray(o) ? o : (Array.isArray(o["@graph"]) ? o["@graph"] : [o]);
                for (const it of arr) {
                  if (it && typeof it.articleBody === "string" && it.articleBody.trim().length > 150) {
                    jsonLd = it.articleBody.trim();
                    break;
                  }
                }
                if (jsonLd) break;
              }
            } catch(e) {}

            // 2. Chấm điểm Heuristic chọn khối nội dung trung tâm (Readability Container Scoring)
            const sels = [
              "article", "main", "[role=main]", "[itemprop='articleBody']",
              ".post-content", ".entry-content", ".article-body", ".article__content",
              ".story-body", ".content-body", ".detail-content", ".fck_detail",
              "#article-body", "#main-content", "#content"
            ];
            let best = null, bestScore = -1;
            const GOOD = /(article|entry|post|story|body|content)/i;
            const BAD = /(comment|sidebar|related|popular|widget|ad|banner|promo|social|cookie)/i;
            sels.forEach(sel => {
              try {
                document.querySelectorAll(sel).forEach(el => {
                  if (!el || el === document.body) return;
                  let sc = (el.tagName === "ARTICLE" || el.tagName === "MAIN") ? 25 : 5;
                  const ic = (el.id || "") + " " + (el.className || "");
                  if (GOOD.test(ic)) sc += 25;
                  if (BAD.test(ic)) sc -= 35;
                  sc += Math.min(50, el.querySelectorAll("p").length * 6);
                  const tLen = (el.textContent || "").length;
                  if (tLen < 80) sc -= 40;
                  else sc += Math.min(60, Math.floor(tLen / 100));
                  if (sc > bestScore) { bestScore = sc; best = el; }
                });
              } catch(e) {}
            });

            const root = (bestScore > 20 && best) ? best : (document.querySelector("article") || document.querySelector("main") || document.querySelector("[role=main]") || document.body);
            let out = (root ? (root.innerText || root.textContent || "") : "");
            if (jsonLd && jsonLd.length > 250 && (!out || out.length < 300)) {
              out = "[Nội dung chính bài viết (JSON-LD)]\n" + jsonLd + (out ? "\n\n" + out : "");
            }
            if (document.body && typeof document.body.innerText === "string" && document.body.innerText.trim().length > out.length && out.length < 150) {
              out = document.body.innerText;
            }
            return (out || "").slice(0, 32000);
          } catch(e) { return ""; }
        }
      });
      if (Array.isArray(results) && results[0] && typeof results[0].result === "string" && results[0].result.trim().length > 100) {
        return results[0].result.trim();
      }
    }
  } catch (e) {}
  try {
    const tabsApi = (typeof browser !== "undefined" && browser.tabs) ? browser.tabs
      : ((typeof chrome !== "undefined" && chrome.tabs) ? chrome.tabs : null);
    if (tabsApi && tabsApi.executeScript && tabId) {
      const code = "(function(){ try { var r = document.querySelector('article') || document.querySelector('main') || document.body; return (r ? (r.innerText || r.textContent || '') : '').slice(0, 32000); } catch(e){ return ''; } })()";
      const results = await new Promise(res => {
        try {
          tabsApi.executeScript(tabId, { code: code }, res);
        } catch(e) { res(null); }
      });
      if (Array.isArray(results) && typeof results[0] === "string" && results[0].trim().length > 100) {
        return results[0].trim();
      }
    }
  } catch(e) {}
  return "";
}

async function aiExtractViaBackgroundFetch(url) {
  if (!url || !/^https?:\/\//i.test(url)) return "";
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(6000),
      credentials: "omit",
      headers: { "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" }
    });
    if (!res.ok) return "";
    const html = await res.text();
    if (!html || html.length < 200) return "";

    // 1. Khai thác dữ liệu cấu trúc ẩn JSON-LD trực tiếp từ mã nguồn HTML
    let jsonLdBody = "";
    try {
      const ldRegex = /<script\s+[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
      let m;
      while ((m = ldRegex.exec(html)) !== null) {
        const raw = (m[1] || "").trim();
        if (!raw || !raw.includes("articleBody")) continue;
        try {
          const parsed = JSON.parse(raw);
          const items = Array.isArray(parsed) ? parsed : (Array.isArray(parsed["@graph"]) ? parsed["@graph"] : [parsed]);
          for (const it of items) {
            if (it && typeof it.articleBody === "string" && it.articleBody.trim().length > 150) {
              jsonLdBody = it.articleBody.trim();
              break;
            }
          }
        } catch(e) {}
        if (jsonLdBody) break;
      }
    } catch(e) {}

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const badTags = ["script", "style", "noscript", "svg", "nav", "footer", "header", "aside", "form"];
    badTags.forEach(tag => {
      doc.querySelectorAll(tag).forEach(el => { try { el.remove(); } catch(e){} });
    });

    // 2. Chấm điểm Heuristic chọn khối nội dung trung tâm (Readability Container Scoring)
    const sels = [
      "article", "main", "[role=main]", "[itemprop='articleBody']",
      ".post-content", ".entry-content", ".article-body", ".article__content",
      ".story-body", ".content-body", ".detail-content", ".fck_detail",
      "#article-body", "#main-content", "#content"
    ];
    let bestEl = null, bestScore = -1;
    const GOOD_RE = /(article|entry|post|story|body|content)/i;
    const BAD_RE = /(comment|sidebar|related|popular|widget|advert|banner|promo|social|share|cookie)/i;
    sels.forEach(sel => {
      try {
        doc.querySelectorAll(sel).forEach(el => {
          if (!el || el === doc.body) return;
          let sc = (el.tagName === "ARTICLE" || el.tagName === "MAIN") ? 25 : 5;
          const idClass = (el.id || "") + " " + (el.className || "");
          if (GOOD_RE.test(idClass)) sc += 25;
          if (BAD_RE.test(idClass)) sc -= 35;
          sc += Math.min(50, el.querySelectorAll("p").length * 6);
          const tLen = (el.textContent || "").trim().length;
          if (tLen < 80) sc -= 40;
          else sc += Math.min(60, Math.floor(tLen / 100));
          if (sc > bestScore) { bestScore = sc; bestEl = el; }
        });
      } catch(e) {}
    });

    const mainEl = (bestScore > 20 && bestEl) ? bestEl : (doc.querySelector("article") || doc.querySelector("main") || doc.querySelector("[role=main]") || doc.body);
    if (!mainEl) return "";
    let txt = (mainEl.textContent || "").replace(/[ \t]+/g, " ").replace(/\n\s*\n/g, "\n\n").trim();
    if (jsonLdBody && jsonLdBody.length > 250 && (!txt || txt.length < 300)) {
      txt = "[Nội dung chính bài viết (JSON-LD)]\n" + jsonLdBody + (txt ? "\n\n" + txt : "");
    }
    return txt.slice(0, 32000);
  } catch (e) {
    return "";
  }
}

async function aiGetPageContextText(query){
  const fb = aiBuildContext();
  let extracted = "";

  // Tầng 1: Content Script GET_PAGE_TEXT
  if (typeof sendTabMessage === "function") {
    try {
      const r = await new Promise(resolve => {
        sendTabMessage({ action: "GET_PAGE_TEXT", maxChars: aiSettings.maxChars, timeoutMs:9000 }, resp => {
          resolve(resp && typeof resp.text === "string" ? resp.text.trim() : "");
        });
      });
      if (r && r.length > 150) {
        extracted = r;
      }
    } catch(e) {}
  }

  // Tầng 2: Isolated World Scripting Fallback
  if (!extracted || extracted.length < 150) {
    let tId = null;
    try {
      if (typeof currentTabObj !== "undefined" && currentTabObj && currentTabObj.id) {
        tId = currentTabObj.id;
      } else if (typeof ensureActiveTab === "function") {
        const at = await ensureActiveTab();
        if (at && at.id) tId = at.id;
      }
    } catch(e) {}
    if (tId) {
      try {
        const scrText = await aiExtractViaScripting(tId);
        if (scrText && scrText.length > extracted.length) {
          extracted = scrText;
        }
      } catch(e) {}
    }
  }

  // Tầng 3: Direct Background Fetch & Local DOMParser
  if (!extracted || extracted.length < 150) {
    let u = "";
    try {
      u = (typeof currentTabUrl !== "undefined" && currentTabUrl) ? currentTabUrl
        : ((typeof currentMeta !== "undefined" && currentMeta && currentMeta.url) ? currentMeta.url : "");
    } catch(e) {}
    if (u && /^https?:\/\//i.test(u)) {
      try {
        const bgText = await aiExtractViaBackgroundFetch(u);
        if (bgText && bgText.length > extracted.length) {
          extracted = bgText;
        }
      } catch(e) {}
    }
  }

  if (extracted && extracted.trim()) {
    const win = aiSelectRelevantWindows(extracted, query || "", aiSettings.maxChars);
    const h = fb ? fb + "\n\n" : "";
    return h + win;
  }
  return fb;
}
function aiSelectRelevantWindow(fullText, query, budget){
  const T=String(fullText||"");
  if(T.length<=budget) return T;
  const words=(String(query||"").toLowerCase().match(/[\p{L}\p{N}]{2,}/gu)||[]).filter(w=>!AI_STOPWORDS.has(w));
  const step=Math.max(250, Math.floor(budget*0.5));
  const cands=[];
  for(let pos=0; pos+budget<=T.length; pos+=step) cands.push(pos);
  const last=T.length-budget;
  if(!cands.length||cands[cands.length-1]!==last) cands.push(last);
  let best=0, bestPos=cands[0]||0;
  for(const pos of cands){
    const w=T.slice(pos,pos+budget).toLowerCase(); let sc=0;
    for(const x of words){ let i=-1; while((i=w.indexOf(x,i+1))!==-1) sc++; }
    if(sc>best){ best=sc; bestPos=pos; }
  }
  const head=T.slice(0,600);
  const body=bestPos>600?T.slice(bestPos,bestPos+budget):T.slice(0,budget);
  return (bestPos>600?head+"\n…[middle omitted: not relevant to the question]…\n":"")+body;
}
function aiGetPageSourceText(){
  return new Promise(res=>{
    if(typeof sendTabMessage!=="function"){ res(""); return; }
    let done=false; const fin=v=>{ if(!done){ done=true; res(v); } };
    setTimeout(()=>fin(""),13000);
    try{
      sendTabMessage({action:"GET_PAGE_SOURCE", timeoutMs:12000},r=>{
        if(!r){ fin(""); return; }
        const parts=[r.text&&String(r.text), r.scripts&&String(r.scripts)].filter(Boolean);
        fin(parts.join("\n").slice(0,24000));
      });
    }catch(e){ fin(""); }
  });
}
function aiExtractYouTubeId(text){
  const m=String(text||"").match(/(?:youtube\.com\/watch\?(?:[^\s<>"']*[&?])?v=|youtube\.com\/shorts\/|youtube\.com\/embed\/|youtu\.be\/)([\w-]{8,12})/i);
  return m?m[1]:"";
}
function aiYtBalancedJson(s,i0){ let depth=0,inStr=false,esc=false; for(let i=i0;i<s.length;i++){ const ch=s[i]; if(inStr){ if(esc){esc=false;} else if(ch==="\\"){esc=true;} else if(ch==="\""){inStr=false;} continue; } if(ch==="\""){inStr=true;continue;} if(ch==="{"){depth++;continue;} if(ch==="}"){depth--; if(depth===0) return s.slice(i0,i+1);} if(depth===0&&i-i0>800000) break; } return ""; }
/* YouTube citation metadata via a DIRECT background fetch (extension already has <all_urls>,
   so this is CORS-privileged from the sidebar page). NO hidden tab is opened — unlike the old
   background-tab fallback which force-loaded a watch page and closed it (the flicker users disliked).
   If the page returns a consent/stripped interstitial, we simply return what we parsed (or null) and
   oEmbed is the last resort. */
async function aiYtMetaViaFetch(videoId){
  const vid=String(videoId||"").trim(); if(!vid) return null;
  try{
    const r=await fetch("https://www.youtube.com/watch?v="+encodeURIComponent(vid),{signal:AbortSignal.timeout(9000),credentials:"omit"});
    if(!r.ok) return null;
    const html=String(await r.text());
    const idx=html.indexOf("ytInitialPlayerResponse"); if(idx===-1) return null;
    const b=html.indexOf("{",idx); if(b===-1||b-idx>200) return null;
    const j=aiYtBalancedJson(html,b); if(!j) return null;
    let obj=null; try{ obj=JSON.parse(j); }catch(e){ return null; }
    const vd=(obj&&obj.videoDetails)||{}; const mf=obj&&obj.microformat&&obj.microformat.playerMicroformatRenderer;
    const gotVid=String(vd.videoId||""); if(gotVid&&gotVid!==vid) return null;
    const title=String(vd.title||"").replace(/\s*-\s*YouTube$/i,"");
    const author=String(vd.author||"");
    const publishDate=String((mf&&mf.publishDate)||(mf&&mf.uploadDate)||"").slice(0,10);
    const lengthSeconds=String(vd.lengthSeconds||"");
    const ok=!!(title||author||publishDate);
    return { success:true, ok:ok, domOnly:true, title:title, author:author, publishDate:publishDate, publisher:"YouTube", platform:"YouTube", videoId:vid, lengthSeconds:lengthSeconds };
  }catch(e){ return null; }
}
function aiDecodeHtmlEntities(str){
  return String(str||"")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
}
/* Multi-source live web search: queries web search to extract real snippets and URLs.
   Enables the AI to cross-reference multiple sources and synthesize the consensus. */
async function aiSearchMultiSources(query){
  const q=String(query||"").replace(/[\u0000-\u001F]/g," ").trim().slice(0,140);
  if(q.length<2) return { text:"", sources:[] };
  try{
    const url="https://html.duckduckgo.com/html/?q="+encodeURIComponent(q);
    const res=await fetch(url,{
      signal:AbortSignal.timeout(6500)
    });
    if(!res.ok) return { text:"", sources:[] };
    const html=await res.text();
    const re=/<a[^>]*class="result__snippet"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    let m;
    const items=[];
    const sources=[];
    while((m=re.exec(html))!==null && items.length<6){
      let rawUrl=m[1];
      if(rawUrl.includes("uddg=")){
        try{
          const u=new URL("https:"+(rawUrl.startsWith("//")?rawUrl:"//"+rawUrl));
          rawUrl=decodeURIComponent(u.searchParams.get("uddg")||rawUrl);
        }catch(e){}
      }
      const snippet=aiDecodeHtmlEntities(m[2].replace(/<[^>]+>/g,"").replace(/\s+/g," ").trim());
      if(snippet && rawUrl.startsWith("http")){
        let host="";
        try{ host=new URL(rawUrl).hostname.replace(/^www\./,""); }catch(e){}
        items.push("- [Nguồn "+(items.length+1)+": "+host+"] ("+rawUrl+"):\n  \""+snippet+"\"");
        sources.push({ u: rawUrl, t: host });
      }
    }
    if(!items.length) return { text:"", sources:[] };
    const header="[KẾT QUẢ TÌM KIẾM ĐA NGUỒN TỪ WEB THỰC TẾ (ĐỐI CHIẾU CHÉO)]:\nQUY TẮC ĐỐI CHIẾU: Hãy đọc kỹ các nguồn bên dưới, tìm thông tin trùng khớp nhất giữa các nguồn (tên thật, ngày/tháng/năm sinh, quê quán, danh tính) để trả lời. Khi các nguồn cùng nhắc đến một thông tin (đồng thuận), hãy khẳng định thông tin đó là đúng. TUYỆT ĐỐI KHÔNG chèn nhãn [Nguồn:...], [Source:...] hay đường link URL vào giữa câu trả lời; trình bày thông tin trực tiếp, tự nhiên và đẹp mắt.\n\n";
    return { text: header+items.join("\n\n"), sources: sources };
  }catch(e){
    return { text:"", sources:[] };
  }
}
function aiCleanFormatting(text){
  if(!text) return "";
  let s=String(text);
  s=s.replace(/\[\s*(?:Nguồn|Source|Tham khảo|Theo)[^\]]*\]/gi, "");
  s=s.replace(/\*?\(\s*(?:Nguồn|Source|Tham khảo|Theo)[:\s][^\)]*\)\*?/gi, "");
  s=s.replace(/\*?\(\s*(?:Lưu ý:\s*)?Trong các phiên (?:trò chuyện|chat) trước[^\)]*\)\*?/gi, "");
  s=s.replace(/[ \t]{2,}/g, " ");
  return s.trim();
}
function aiIsYouTubeUrl(u){
  try{ const hn=String(u||""); const m=/^[a-z][a-z0-9+.-]*:\/\/([^/?#]+)/i.exec(hn); const host=(m?m[1]:hn.split("/")[0]).toLowerCase().replace(/^www\./,""); return /(^|\.)youtube\.com$/.test(host)||host==="youtu.be"; }catch(e){ return false; }
}
async function aiQueryWebTabs(){
  const tabsApi=(typeof browser!=="undefined"&&browser.tabs)?browser.tabs:(typeof chrome!=="undefined"?chrome.tabs:null);
  if(!tabsApi||!tabsApi.query) return [];
  let list=null;
  try{ const pr=tabsApi.query({currentWindow:true}); list=(pr&&typeof pr.then==="function")?await pr:await new Promise(r=>tabsApi.query({currentWindow:true},t=>r(t))); }catch(e){ return []; }
  if(!Array.isArray(list)) return [];
  return list.filter(t=>t&&t.id&&typeof t.url==="string"&&!/^(about:|chrome:|chrome-extension:|moz-extension:|edge:|devtools:|file:)/i.test(t.url)).slice(0,6);
}
async function aiCollectTabsContext(){
  const tabsApi=(typeof browser!=="undefined"&&browser.tabs)?browser.tabs:(typeof chrome!=="undefined"?chrome.tabs:null);
  if(!tabsApi||!tabsApi.sendMessage) return "";
  const tabs=await aiQueryWebTabs(); if(!tabs.length) return "";
  const blocks=[]; let total=0;
  for(let i=0;i<tabs.length&&blocks.length<6;i++){
    const t=tabs[i];
    const txt=await Promise.race([
      new Promise(res=>{ try{ const pr=tabsApi.sendMessage(t.id,{action:"GET_PAGE_TEXT",maxChars:1500}); if(pr&&typeof pr.then==="function"){ pr.then(r=>res(r&&typeof r.text==="string"?r.text:"")).catch(()=>res("")); } else tabsApi.sendMessage(t.id,{action:"GET_PAGE_TEXT",maxChars:1500},resp=>res(resp&&typeof resp.text==="string"?resp.text:"")); }catch(e){ res(""); } }),
      new Promise(res=>setTimeout(()=>res(""),6500))
    ]);
    const clean=String(txt||"").trim(); if(!clean) continue;
    const blk="[Tab "+(i+1)+": "+String(t.title||"(untitled)").slice(0,80)+" \u2014 "+String(t.url).slice(0,120)+"]\n"+clean;
    if(total+blk.length>9000) break; blocks.push(blk); total+=blk.length;
  }
  return blocks.join("\n\n");
}
async function aiScholarSearch(query){
  const q=String(query||"").trim().slice(0,120);
  if(q.length<3){ try{ const md=(typeof currentMeta!=="undefined"&&currentMeta&&currentMeta.title)?String(currentMeta.title):""; return await aiScholarSearchDirect(md||q); }catch(e){ return ""; } }
  return await aiScholarSearchDirect(q);
}
async function aiScholarSearchDirect(q){
  if(!q||String(q).trim().length<3) return "";
  const qs=encodeURIComponent(String(q).trim());
  const uCr="https://api.crossref.org/works?rows=6&select=title,author,container-title,published,DOI&query="+qs;
  const uOa="https://api.openalex.org/works?per-page=6&select=title,display_name,authorships,publication_year,doi&search="+qs;
  const one=(u)=>fetch(u,{signal:AbortSignal.timeout(6000)}).then(r=>r.ok?r.json():null).catch(()=>null);
  const res=await Promise.all([one(uCr),one(uOa)]);
  const lines=[];
  try{
    const items=(res[0]&&res[0].message&&Array.isArray(res[0].message.items))?res[0].message.items:[];
    items.forEach(it=>{ const t=(it.title&&it.title[0])||""; if(!t) return; const au=Array.isArray(it.author)?it.author.slice(0,3).map(a=>(a&&a.family)||"").filter(Boolean).join(", "):""; const j=(it["container-title"]&&it["container-title"][0])||""; const y=(it.published&&it.published["date-parts"]&&it.published["date-parts"][0]&&it.published["date-parts"][0][0])||""; const doi=it.DOI?String(it.DOI).split("/").slice(-2).join("/"):""; lines.push("- [Crossref] "+t+(au?" — "+au:"")+(j?" ("+j+")":"")+(y?", "+y:"")+(doi?" | doi:"+doi:"")); });
  }catch(e){}
  try{
    const results=(res[1]&&Array.isArray(res[1].results))?res[1].results:[];
    results.forEach(it=>{ let t=typeof it.display_name==="string"?it.display_name:(it.display_name&&typeof it.display_name==="object"?String(Object.values(it.display_name)[0]||""):""); if(!t&&typeof it.title==="string") t=it.title; if(!t) return; const au=Array.isArray(it.authorships)?it.authorships.slice(0,3).map(a=>(a&&a.author&&a.author.display_name)||"").filter(Boolean).join(", "):""; const doi=it.doi?String(it.doi).split("/").slice(-2).join("/"):""; lines.push("- [OpenAlex] "+t+(au?" — "+au:"")+(it.publication_year?", "+it.publication_year:"")+(doi?" | doi:"+doi:"")); });
  }catch(e){}
  return lines.slice(0,10).join("\n").slice(0,3000);
}
function aiGetPageImages(){  return new Promise(res=>{
    if(typeof sendTabMessage!=="function"){ res([]); return; }
    let done=false;
    const fin=(v)=>{ if(!done){ done=true; res(v); } };
    setTimeout(()=>fin([]),12500);
    try{
      sendTabMessage({action:"GET_PAGE_IMAGES", max:3, timeoutMs:11000},r=>{
        const arr=(r&&Array.isArray(r.images))?r.images:[];
        fin(arr.slice(0,3).map(u=>{ const c=String(u).indexOf(","); const m=/^data:(image\/[a-z+.-]+);base64/i.exec(String(u)); return c!==-1&&m?{data:String(u).slice(c+1),mimeType:m[1]}:null; }).filter(Boolean));
      });
    }catch(e){ fin([]); }
  });
}
function aiGetSelectionText(){
  return new Promise(res=>{ if(typeof sendTabMessage!=="function"){res("");return;} sendTabMessage({action:"GET_SELECTION_TEXT"},r=>{res(r&&typeof r.text==="string"?r.text.slice(0,4000):"");}); });
}
function aiAppendTsPlain(frag, text){
  const re=/\[(\d{1,2}):([0-5]\d)(?::([0-5]\d))?\]/g; let last=0, m;
  while((m=re.exec(text))!==null){
    if(m.index>last) frag.appendChild(document.createTextNode(text.slice(last,m.index)));
    const secs=m[3]?(Number(m[1])*3600+Number(m[2])*60+Number(m[3])):(Number(m[1])*60+Number(m[2]));
    const sp=document.createElement("span"); sp.className="ai-ts"; sp.textContent=m[0]; sp.setAttribute("data-ts",String(secs)); sp.title=aiT("ai_ts_seek",null,"Nhảy tới thời điểm này trong video");
    frag.appendChild(sp); last=m.index+m[0].length;
  }
  if(last<text.length) frag.appendChild(document.createTextNode(text.slice(last)));
}
function aiShortUrl(u){
  try{
    const x=new URL(u); const host=x.hostname.replace(/^www\./,"");
    const vid=x.searchParams.get("v")||"";
    const seg=x.pathname.split("/").filter(Boolean).pop()||"";
    let core=vid||seg||""; if(core.length>14) core=core.slice(0,14)+"\u2026";
    return host+(core?"/"+core:"");
  }catch(e){ return String(u).slice(0,32)+(String(u).length>32?"\u2026":""); }
}
function aiAppendTextWithTs(frag, text){
  const mdLinkRe=/\[([^\]\n]{1,200})\]\((https?:\/\/[^)\s]{1,500})\)/g;
  let last=0, m;
  while((m=mdLinkRe.exec(text))!==null){
    if(m.index>last) aiAppendUrlTs(frag, text.slice(last,m.index));
    const a=document.createElement("a"); a.href=m[2]; a.textContent=/^https?:\/\//i.test(m[1])?aiShortUrl(m[2]):m[1]; a.title=m[2]; a.target="_blank"; a.rel="noopener noreferrer"; a.className="ai-link";
    frag.appendChild(a); last=m.index+m[0].length;
  }
  if(last<text.length) aiAppendUrlTs(frag, text.slice(last));
}
function aiAppendUrlTs(frag, text){
  const urlRe=/https?:\/\/[^\s<>"'()]+/g; let last=0, m;
  while((m=urlRe.exec(text))!==null){
    if(m.index>last) aiAppendTsPlain(frag, text.slice(last,m.index));
    const a=document.createElement("a"); a.href=m[0]; a.textContent=aiShortUrl(m[0]); a.title=m[0]; a.target="_blank"; a.rel="noopener noreferrer"; a.className="ai-link";
    frag.appendChild(a); last=m.index+m[0].length;
  }
  if(last<text.length) aiAppendTsPlain(frag, text.slice(last));
}
function aiFormatInline(text){
  const frag=document.createDocumentFragment(); text=String(text||""); let i=0;
  const nextMarker=(from)=>{ const marks=[text.indexOf("***",from),text.indexOf("**",from),text.indexOf("~~",from),text.indexOf("==",from),text.indexOf("`",from),text.indexOf("*",from)]; let m=-1; for(const x of marks){ if(x!==-1&&(m===-1||x<m)) m=x; } return m; };
  while(i<text.length){
    if(text.startsWith("***",i)){ const e=text.indexOf("***",i+3); if(e!==-1){ const s=document.createElement("strong"); const em=document.createElement("em"); em.textContent=text.slice(i+3,e); s.appendChild(em); frag.appendChild(s); i=e+3; continue; } }
    if(text.startsWith("**",i)){ const e=text.indexOf("**",i+2); if(e!==-1&&e>i+2){ const s=document.createElement("strong"); s.textContent=text.slice(i+2,e); frag.appendChild(s); i=e+2; continue; } }
    if(text.startsWith("~~",i)){ const e=text.indexOf("~~",i+2); if(e!==-1&&e>i+2){ const st=document.createElement("s"); st.textContent=text.slice(i+2,e); frag.appendChild(st); i=e+2; continue; } }
    if(text.startsWith("==",i)){ const e=text.indexOf("==",i+2); if(e!==-1&&e>i+2){ const mk=document.createElement("span"); mk.textContent=text.slice(i+2,e); mk.style.background="rgba(250,204,21,0.2)"; mk.style.color="#fde68a"; mk.style.padding="0 3px"; mk.style.borderRadius="3px"; mk.style.fontWeight="600"; frag.appendChild(mk); i=e+2; continue; } }
    if(text[i]==="`"){ const e=text.indexOf("`",i+1); if(e!==-1){ const c=document.createElement("code"); c.style.background="rgba(0,0,0,0.25)"; c.style.padding="1px 4px"; c.style.borderRadius="4px"; c.textContent=text.slice(i+1,e); frag.appendChild(c); i=e+1; continue; } }
    if(text[i]==="*"){ const e=text.indexOf("*",i+1); if(e!==-1&&e>i+1){ const em=document.createElement("em"); em.textContent=text.slice(i+1,e); frag.appendChild(em); i=e+1; continue; } }
    const n=nextMarker(i+1); const chunkEnd=(n!==-1)?n:text.length;
    aiAppendTextWithTs(frag, text.slice(i,chunkEnd)); i=chunkEnd;
  }
  return frag;
}
function aiParseTimestampSec(ts){
  const parts=String(ts||"").split(":").map(Number);
  if(parts.length===3) return (parts[0]||0)*3600+(parts[1]||0)*60+(parts[2]||0);
  if(parts.length===2) return (parts[0]||0)*60+(parts[1]||0);
  return 0;
}
function aiRenderFormattedText(bubble, text){
  bubble.textContent=""; bubble.style.lineHeight="1.6";
  let normalized = String(text||"");
  if(normalized.includes("<think>")){
    normalized = normalized.replace(/<think>([\s\S]*?)(?:<\/think>|$)/gi, (m, inner) => {
      const cleaned = inner.trim().replace(/\n+/g, " ");
      return cleaned ? "\n> 💭 **Suy luận:** " + cleaned + "\n\n" : "";
    });
  }
  const lines=normalized.split("\n"); let inCode=false, buf=[];
  const flush=()=>{
    if(!buf.length) return;
    const codeText=buf.join("\n");
    const wrap=document.createElement("div"); wrap.className="ai-code-wrap";
    const pre=document.createElement("pre"); pre.textContent=codeText;
    const btn=document.createElement("button"); btn.type="button"; btn.className="ai-code-copy"; btn.textContent="⎘"; btn.title=aiT("ai_copy_this",null,"Sao chép đoạn này");
    btn.addEventListener("click",()=>{ try{ navigator.clipboard.writeText(codeText).then(()=>{ btn.textContent="✓"; setTimeout(()=>{ btn.textContent="⎘"; },1000); }); }catch(e){} });
    wrap.appendChild(pre); wrap.appendChild(btn); bubble.appendChild(wrap); buf=[];
  };
  let tbl=[];
  const splitRow=(ln)=>{ const cells=String(ln).split("|"); if(cells.length&&cells[0].trim()==="") cells.shift(); if(cells.length&&cells[cells.length-1].trim()==="") cells.pop(); return cells.map(c=>c.trim()); };
  const flushTable=()=>{
    if(!tbl.length){ return; }
    const sepIdx=tbl.findIndex(r=>/^\s*\|?[\s:|-]+\s*\|?\s*$/.test(r)&&r.includes("-"));
    const dataRows=sepIdx===-1?tbl.slice():tbl.filter((_,ix)=>ix!==sepIdx);
    const table=document.createElement("table"); table.className="ai-table";
    const cells=dataRows.map((r,ri)=>{ const c=splitRow(r); if(c.length<2&&dataRows.length>1&&ri>0) return null; return c; }).filter(Boolean);
    if(cells.length<1||cells.every(r=>r.length<2)){ tbl=[]; return; }
    const hasHead=sepIdx!==0;
    cells.forEach((r,ri)=>{ const tr=document.createElement("tr"); r.forEach(cv=>{ const cell=document.createElement(hasHead&&ri===0?"th":"td"); cell.appendChild(aiFormatInline(cv)); tr.appendChild(cell); }); table.appendChild(tr); });
    bubble.appendChild(table); tbl=[];
  };
  let sugMode=false;
  let pendingCardQ=null;
  lines.forEach(raw=>{
    const trimmed=raw.trim();
    if(trimmed.startsWith("|")){ tbl.push(trimmed); return; }
    flushTable();
    if(trimmed.startsWith("```")){ if(inCode) flush(); inCode=!inCode; return; }
    if(inCode){ buf.push(raw); return; }

    /* Interactive Chapter Timeline */
    const chM=trimmed.match(/^(?:[-*•]\s*)?\[([0-9]{1,2}:[0-9]{2}(?::[0-9]{2})?)\]\s*(.+)/);
    if(chM){
      if(pendingCardQ){ const dq=document.createElement("div"); dq.style.margin="2px 0"; dq.appendChild(aiFormatInline(pendingCardQ)); bubble.appendChild(dq); pendingCardQ=null; }
      sugMode=false;
      const timeStr=chM[1];
      const titleContent=chM[2];
      const card=document.createElement("div");
      card.className="ai-chapter-card";
      const seekBtn=document.createElement("button");
      seekBtn.type="button";
      seekBtn.className="ai-chapter-seek";
      seekBtn.textContent="⏱ "+timeStr;
      seekBtn.title=aiT("ai_chapter_seek_hint",null,"Nhấn để phát video tại thời điểm này");
      seekBtn.setAttribute("data-ts",String(aiParseTimestampSec(timeStr)));
      seekBtn.addEventListener("click",(e)=>{
        e.stopPropagation();
        const secs=aiParseTimestampSec(timeStr);
        if(typeof sendTabMessage==="function"){
          sendTabMessage({action:"YT_SEEK",seconds:secs},r=>{
            if((!r||!r.success)&&typeof showToast==="function") showToast("ai_toast_no_video","warning");
          });
        }
      });
      card.appendChild(seekBtn);
      const label=document.createElement("div");
      label.className="ai-chapter-title";
      label.appendChild(aiFormatInline(titleContent));
      card.appendChild(label);
      bubble.appendChild(card);
      return;
    }

    /* 3D Flashcard Question & Answer */
    const qM=trimmed.match(/^(?:Q|Hỏi|Question|\*\*Q\*\*|\*\*Hỏi\*\*)\s*[:：]\s*(.+)/i);
    if(qM){
      if(pendingCardQ){ const dq=document.createElement("div"); dq.style.margin="2px 0"; dq.appendChild(aiFormatInline(pendingCardQ)); bubble.appendChild(dq); }
      sugMode=false;
      pendingCardQ=qM[1].trim();
      return;
    }
    const aM=trimmed.match(/^(?:A|Đáp|Answer|\*\*A\*\*|\*\*Đáp\*\*)\s*[:：]\s*(.+)/i);
    if(aM && pendingCardQ){
      sugMode=false;
      const ansText=aM[1].trim();
      const card=document.createElement("div");
      card.className="ai-flashcard";
      card.title=aiT("ai_flashcard_flip_hint",null,"Nhấn để lật thẻ");
      const inner=document.createElement("div");
      inner.className="ai-flashcard-inner";

      const front=document.createElement("div");
      front.className="ai-flashcard-front";
      const fBadge=document.createElement("div");
      fBadge.className="ai-flashcard-badge";
      fBadge.textContent="Q";
      front.appendChild(fBadge);
      const fText=document.createElement("div");
      fText.className="ai-flashcard-text";
      fText.appendChild(aiFormatInline(pendingCardQ));
      front.appendChild(fText);
      const fHint=document.createElement("div");
      fHint.className="ai-flashcard-hint";
      fHint.textContent="🔄 "+aiT("ai_flashcard_flip_hint",null,"Nhấn để lật thẻ");
      front.appendChild(fHint);

      const back=document.createElement("div");
      back.className="ai-flashcard-back";
      const bBadge=document.createElement("div");
      bBadge.className="ai-flashcard-badge is-answer";
      bBadge.textContent="A";
      back.appendChild(bBadge);
      const bText=document.createElement("div");
      bText.className="ai-flashcard-text";
      bText.appendChild(aiFormatInline(ansText));
      back.appendChild(bText);

      inner.appendChild(front);
      inner.appendChild(back);
      card.appendChild(inner);
      card.addEventListener("click",()=>{ card.classList.toggle("is-flipped"); });
      bubble.appendChild(card);
      pendingCardQ=null;
      return;
    }

    if(pendingCardQ && trimmed!==""){
      const dq=document.createElement("div");
      dq.style.margin="2px 0";
      dq.appendChild(aiFormatInline(pendingCardQ));
      bubble.appendChild(dq);
      pendingCardQ=null;
    }

    const sugHead=trimmed.replace(/^[#>\*\s]+/,"").replace(/[\*\s]+$/,"");
    if(/^(GỢI Ý|GỢI\s*Ý|Gợi ý câu hỏi|SUGGESTED(?:\s*QUESTIONS)?|SUGGESTIONS|建议问题|次の質問|Идеи вопросов)[:：]?$/i.test(sugHead)){ sugMode=true; const lab=document.createElement("div"); lab.className="ai-suggest-title"; lab.textContent="✦ "+aiT("ai_suggest_title",null,"Câu hỏi gợi ý tiếp theo"); bubble.appendChild(lab); return; }
    if(trimmed.startsWith("---")||trimmed.startsWith("***")){ sugMode=false; if(trimmed.length<5){ const hr=document.createElement("hr"); hr.style.border="none"; hr.style.borderTop="1px solid rgba(255,255,255,0.08)"; hr.style.margin="8px 0"; bubble.appendChild(hr); return; } }
    const indent=raw.match(/^(\s*)/)[1].length, t=raw.trimStart();
    const numM=t.match(/^([0-9]{1,2})[.)]\s+(.+)/);
    if(numM){ if(sugMode&&numM[2]){ const chip=document.createElement("button"); chip.type="button"; chip.className="ai-suggest"; const cText=numM[2].replace(/[*`]/g,"").trim(); chip.textContent="✦ "+cText.slice(0,160); chip.addEventListener("click",()=>{ const inp=document.getElementById("ai-input"); if(inp){ inp.value=cText.slice(0,800); inp.focus(); aiGrowInput(inp); } }); bubble.appendChild(chip); return; } const row=document.createElement("div"); row.style.display="flex"; row.style.gap="6px"; row.style.marginLeft=indent>=2?"16px":"0"; row.style.marginTop="2px"; const nb=document.createElement("span"); nb.textContent=numM[1]+"."; nb.style.color="#38bdf8"; nb.style.fontWeight="700"; nb.style.flexShrink="0"; row.appendChild(nb); const sp=document.createElement("span"); sp.style.flex="1"; sp.appendChild(aiFormatInline(numM[2])); row.appendChild(sp); bubble.appendChild(row); return; }
    if(t.startsWith("- ")||t.startsWith("* ")||t.startsWith("• ")){
      const itemText=t.slice(2).replace(/[*`]/g,"").trim();
      if(sugMode&&itemText){
        const chip=document.createElement("button"); chip.type="button"; chip.className="ai-suggest"; chip.textContent="✦ "+itemText.slice(0,160);
        chip.addEventListener("click",()=>{ const inp=document.getElementById("ai-input"); if(inp){ inp.value=itemText.slice(0,800); inp.focus(); aiGrowInput(inp); } });
        bubble.appendChild(chip); return;
      }
      if(sugMode&&!itemText) return;
      sugMode=false;
      const row=document.createElement("div"); row.style.display="flex"; row.style.gap="6px"; row.style.marginLeft=indent>=2?"16px":"0"; row.style.marginTop="2px";
      const dot=document.createElement("span"); dot.textContent="•"; dot.style.color=indent>=2?"#94a3b8":"#a78bfa"; dot.style.flexShrink="0"; row.appendChild(dot);
      const span=document.createElement("span"); span.style.flex="1"; span.appendChild(aiFormatInline(t.slice(2))); row.appendChild(span); bubble.appendChild(row); return;
    }
    if(trimmed===""){ if(sugMode) return; bubble.appendChild(document.createElement("br")); return; }
    if(sugMode&&/^[^\-\*•|]{3,}$/.test(trimmed)&&!/^\d+[).]/.test(trimmed)){
      const chip=document.createElement("button"); chip.type="button"; chip.className="ai-suggest"; chip.textContent="✦ "+trimmed.slice(0,160);
      chip.addEventListener("click",()=>{ const inp=document.getElementById("ai-input"); if(inp){ inp.value=trimmed.slice(0,800); inp.focus(); aiGrowInput(inp); } });
      bubble.appendChild(chip); return;
    }
    sugMode=false;
    if(trimmed.startsWith("> 💭") || trimmed.startsWith("💭") || /^(?:>\s*)?\[(?:Suy luận|Thinking|Reasoning)\]/i.test(trimmed) || /^(?:>\s*)?\*\*(?:Suy luận|Thinking|Reasoning)[:：]\*\*/i.test(trimmed)){
      sugMode = false;
      const thBox = document.createElement("div");
      thBox.className = "ai-thinking-box";
      const thHead = document.createElement("div");
      thHead.className = "ai-thinking-head";
      thHead.textContent = "💭 " + aiT("ai_thinking_title", null, "Quá trình suy luận sâu (Reasoning)");
      thBox.appendChild(thHead);
      const thBody = document.createElement("div");
      const cleanContent = trimmed.replace(/^(?:>\s*)?(?:💭\s*)?(?:\*\*(?:Suy luận|Thinking|Reasoning)[:：]\*\*\s*|\[(?:Suy luận|Thinking|Reasoning)\][:：]?\s*)?/i, "");
      thBody.appendChild(aiFormatInline(cleanContent));
      thBox.appendChild(thBody);
      bubble.appendChild(thBox);
      return;
    }
    if(trimmed.startsWith(">")){ sugMode=false; const bq=document.createElement("div"); bq.className="ai-quote"; bq.style.borderLeft="3px solid rgba(124,58,237,0.55)"; bq.style.background="rgba(124,58,237,0.08)"; bq.style.padding="5px 10px"; bq.style.margin="3px 0"; bq.style.borderRadius="0 8px 8px 0"; bq.style.color="#c4b5fd"; bq.appendChild(aiFormatInline(trimmed.replace(/^>\s?/,""))); bubble.appendChild(bq); return; }
    if(/^#{1,6} /.test(trimmed)){
      const hashes=trimmed.match(/^#+/)[0].length;
      const h=document.createElement("div");
      h.style.fontWeight="700";
      h.style.margin=(hashes===1?"12px 0 6px":(hashes===2?"10px 0 4px":"8px 0 3px"));
      if(hashes===1){
        h.style.fontSize="14px"; h.style.color="#38bdf8"; h.style.borderBottom="1px solid rgba(56,189,248,0.2)"; h.style.paddingBottom="3px";
      } else if(hashes===2){
        h.style.fontSize="12.5px"; h.style.color="#7dd3fc";
      } else {
        h.style.fontSize=hashes<=3?"12px":"11.5px"; h.style.color="#c4b5fd";
      }
      h.appendChild(aiFormatInline(trimmed.replace(/^#+\s+/,"")));
      bubble.appendChild(h);
      return;
    }
    const div=document.createElement("div"); div.style.margin="2px 0"; if(trimmed.startsWith("💡")){ div.style.background="rgba(56,189,248,0.08)"; div.style.border="1px solid rgba(56,189,248,0.15)"; div.style.borderRadius="6px"; div.style.padding="6px 8px"; } div.appendChild(aiFormatInline(raw)); bubble.appendChild(div);
  });
  if(pendingCardQ){ const dq=document.createElement("div"); dq.style.margin="2px 0"; dq.appendChild(aiFormatInline(pendingCardQ)); bubble.appendChild(dq); }
  flushTable(); flush();
}
function aiBuildMsgRow(msg){
  const row=document.createElement("div"); row.className="ai-msg ai-msg-"+(msg.role==="user"?"user":"assistant");
  const bubble=document.createElement("div"); bubble.className="ai-bubble"; aiRenderFormattedText(bubble, msg.content);
  if(msg.image&&AI_SAFE_IMG_RE.test(msg.image)){ const img=document.createElement("img"); img.src=msg.image; img.style.maxWidth="160px"; img.style.maxHeight="120px"; img.style.borderRadius="8px"; img.style.marginTop="6px"; img.style.border="1px solid rgba(255,255,255,0.08)"; bubble.appendChild(img); }
  const foot=document.createElement("div"); foot.style.display="flex"; foot.style.alignItems="center"; foot.style.gap="6px"; foot.style.marginTop="4px";
  const meta=document.createElement("div"); meta.className="ai-msg-meta"; meta.style.flex="1"; let who=msg.role==="user"?aiT("ai_you",null,"Bạn"):aiGetProviderConfig(msg.provider||aiProvider).label; const tsN=Number(msg.ts)||0; if(tsN){ try{ who+=" · "+new Date(tsN).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}); }catch(e){} } meta.textContent=who; foot.appendChild(meta);
  const copyBtn=document.createElement("button"); copyBtn.type="button"; copyBtn.textContent="⎘"; copyBtn.title=aiT("ai_copy_this",null,"Sao chép đoạn này"); copyBtn.style.cssText="width:22px; height:22px; border-radius:6px; border:1px solid rgba(255,255,255,0.08); background:rgba(255,255,255,0.04); color:#94a3b8; cursor:pointer; font-size:11px;"; copyBtn.addEventListener("click",()=>{ navigator.clipboard.writeText(msg.content||"").then(()=>{ copyBtn.textContent="✓"; setTimeout(()=>copyBtn.textContent="⎘",1200); if(typeof showToast==="function") showToast("toast_copied","success"); }); }); foot.appendChild(copyBtn);
  if(msg.role==="user"){ const editBtn=document.createElement("button"); editBtn.type="button"; editBtn.textContent="✎"; editBtn.title=aiT("ai_btn_edit_msg",null,"Sửa & gửi lại từ đây"); editBtn.style.cssText="width:22px; height:22px; border-radius:6px; border:1px solid rgba(255,255,255,0.08); background:rgba(255,255,255,0.04); color:#94a3b8; cursor:pointer; font-size:11px;"; editBtn.addEventListener("click",()=>{ if(aiIsSending) return; const idx=aiHistory.indexOf(msg); if(idx===-1) return; aiHistory.splice(idx); aiSaveHistory(); aiRenderHistory(); const inp=document.getElementById("ai-input"); if(inp){ inp.value=String(msg.content||"").slice(0,8000); inp.focus(); aiGrowInput(inp); } }); foot.appendChild(editBtn); }
  if(msg.role==="assistant"){ const regBtn=document.createElement("button"); regBtn.type="button"; regBtn.textContent="↻"; regBtn.title=aiT("ai_btn_regenerate",null,"Làm lại câu trả lời"); regBtn.style.cssText="width:22px; height:22px; border-radius:6px; border:1px solid rgba(255,255,255,0.08); background:rgba(255,255,255,0.04); color:#94a3b8; cursor:pointer; font-size:11px;"; regBtn.addEventListener("click",()=>{ if(typeof aiRegenerate==="function") aiRegenerate(); }); foot.appendChild(regBtn); }
  row.appendChild(bubble); row.appendChild(foot); return row;
}
function aiScrollToBottom(){ const c=document.getElementById("ai-chat-history"); if(c) c.scrollTop=c.scrollHeight; }
function aiGrowInput(inp){ if(!inp) return; inp.style.height="auto"; inp.style.height=Math.min(140,Math.max(20,inp.scrollHeight))+"px"; }
function aiUpdateLatestBtn(){ const c=document.getElementById("ai-chat-history"); const b=document.getElementById("ai-btn-latest"); if(!c||!b) return; const gap=c.scrollHeight-c.scrollTop-c.clientHeight; b.classList.toggle("is-visible", gap>140); }
function aiConversationMarkdown(){ const out=[]; try{ out.push("_ScholarFlow · "+new Date().toLocaleString()+"_",""); }catch(e){ out.push("",""); } aiHistory.forEach(m=>{ const who=m.role==="user"?aiT("ai_you",null,"Bạn"):aiGetProviderConfig(m.provider||aiProvider).label; let hm=""; const t=Number(m.ts)||0; if(t){ try{ hm=" · "+new Date(t).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}); }catch(e){} } out.push("**"+who+hm+"**","",""+String(m.content||""),""); }); if(aiPages.length){ out.push("---",""); out.push("_"+aiT("ai_pages_added",null,"Trang đã thêm")+":_"); aiPages.forEach(p=>out.push("- "+(p.title||p.url)+" — "+p.url)); out.push(""); } return out.join("\n"); }
function aiDownloadBlob(blob, filename){
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;
  a.download=filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(()=>{ try{ URL.revokeObjectURL(url); }catch(e){} },2000);
}
function aiExportMarkdown(){
  if(!aiHistory||!aiHistory.length){
    if(typeof showToast==="function") showToast("ai_toast_convo_empty","warning");
    return;
  }
  const content=aiConversationMarkdown();
  const dateStr=new Date().toISOString().slice(0,10);
  const blob=new Blob([content],{type:"text/markdown;charset=utf-8"});
  aiDownloadBlob(blob,"ScholarFlow_AI_"+dateStr+".md");
  if(typeof showToast==="function") showToast("toast_copied","success");
}
function aiExportAnki(){
  if(!aiHistory||!aiHistory.length){
    if(typeof showToast==="function") showToast("ai_toast_convo_empty","warning");
    return;
  }
  const cards=[];
  aiHistory.forEach(msg=>{
    if(msg.role==="assistant"&&msg.content){
      const lines=msg.content.split("\n");
      let curQ=null;
      lines.forEach(ln=>{
        const t=ln.trim();
        const qM=t.match(/^(?:Q|Hỏi|Question|\*\*Q\*\*|\*\*Hỏi\*\*)\s*[:：]\s*(.+)/i);
        const aM=t.match(/^(?:A|Đáp|Answer|\*\*A\*\*|\*\*Đáp\*\*)\s*[:：]\s*(.+)/i);
        if(qM){ curQ=qM[1].trim(); }
        else if(aM&&curQ){ cards.push({front:curQ,back:aM[1].trim()}); curQ=null; }
      });
    }
  });
  if(!cards.length){
    for(let i=0;i<aiHistory.length-1;i++){
      if(aiHistory[i].role==="user"&&aiHistory[i+1].role==="assistant"){
        cards.push({
          front:String(aiHistory[i].content||"").trim().slice(0,200),
          back:String(aiHistory[i+1].content||"").trim().slice(0,1000)
        });
      }
    }
  }
  if(!cards.length){
    if(typeof showToast==="function") showToast("ai_toast_no_answer","warning");
    return;
  }
  const tsv=cards.map(c=>{
    const f=c.front.replace(/\t/g," ").replace(/\n/g,"<br>");
    const b=c.back.replace(/\t/g," ").replace(/\n/g,"<br>");
    return f+"\t"+b;
  }).join("\n");
  const dateStr=new Date().toISOString().slice(0,10);
  const blob=new Blob([tsv],{type:"text/tab-separated-values;charset=utf-8"});
  aiDownloadBlob(blob,"ScholarFlow_Flashcards_"+dateStr+".txt");
  if(typeof showToast==="function") showToast("toast_copied","success");
}
function aiRenderHistory(){
  const c=document.getElementById("ai-chat-history"); if(!c) return; c.textContent="";
  if(aiHistory.length===0){ const e=document.createElement("div"); e.className="ai-empty"; e.setAttribute("data-i18n","ai_empty"); e.textContent=(typeof getI18nText==="function")?getI18nText("ai_empty"):"Chưa có hội thoại. Hãy hỏi về trang đang đứng!"; c.appendChild(e); return; }
  const frag=document.createDocumentFragment(); aiHistory.forEach(msg=>frag.appendChild(aiBuildMsgRow(msg))); c.appendChild(frag); c.scrollTop=c.scrollHeight;
  requestAnimationFrame(()=>requestAnimationFrame(aiScrollToBottom));
}
let aiSaveHistTimer=null;
function aiSaveHistorySoon(){ if(aiSaveHistTimer) clearTimeout(aiSaveHistTimer); aiSaveHistTimer=setTimeout(()=>{ aiSaveHistTimer=null; aiSaveHistory(); },500); }
function aiAppendMessage(role, content, provider, image){
  const e={role:String(role)==="user"?"user":"assistant",content:String(content==null?"":content).slice(0,16000),provider:AI_PROVIDERS[provider]?provider:aiProvider,ts:Date.now()}; if(image&&AI_SAFE_IMG_RE.test(image)) e.image=image; aiHistory.push(e); aiSaveHistorySoon();
  const c=document.getElementById("ai-chat-history");
  if(c){ const em=c.querySelector(".ai-empty"); if(em) c.removeChild(em); c.appendChild(aiBuildMsgRow(e)); c.scrollTop=c.scrollHeight; }
  else aiRenderHistory();
}
function aiClearHistory(){ aiHistory=[]; aiActiveVideoId=""; aiVideoResumeAt=0; aiSaveHistory(); aiRenderHistory(); if(typeof showToast==="function") showToast("ai_toast_cleared","success"); }
function aiPopulateModelSelect(explicitVal){
  const currentProvider = aiProvider;
  const currentModel = aiGetModel(currentProvider);
  const targetVal = explicitVal || (currentProvider === "custom" ? ("custom:" + aiActiveCustomServerId) : (currentProvider + ":" + currentModel));

  ["ai-model-select","ai-model-select-main"].forEach(id=>{
    const sel = document.getElementById(id);
    if(!sel) return;
    sel.textContent = "";

    // Gemini
    const geminiModels = [...(AI_PROVIDERS.gemini?.models || []), ...aiFetchedModels];
    [...new Set(geminiModels)].forEach(m => {
      const o = document.createElement("option");
      o.value = "gemini:" + m;
      o.textContent = "Google Gemini - " + (AI_MODEL_LABELS[m] || m);
      if(aiFetchedModels.includes(m)) o.style.color = "#059669";
      sel.appendChild(o);
    });

    // OpenAI
    (AI_PROVIDERS.openai?.models || []).forEach(m => {
      const o = document.createElement("option");
      o.value = "openai:" + m;
      o.textContent = "OpenAI - " + (AI_MODEL_LABELS[m] || m);
      sel.appendChild(o);
    });

    // Claude
    (AI_PROVIDERS.claude?.models || []).forEach(m => {
      const o = document.createElement("option");
      o.value = "claude:" + m;
      o.textContent = "Anthropic - " + (AI_MODEL_LABELS[m] || m);
      sel.appendChild(o);
    });

    // Custom
    if(aiCustomServers && aiCustomServers.length){
      aiCustomServers.forEach(srv => {
        const o = document.createElement("option");
        o.value = "custom:" + srv.id;
        o.textContent = "Custom - " + srv.name + (srv.model ? " (" + srv.model + ")" : "");
        sel.appendChild(o);
      });
    }

    sel.disabled = false;
    sel.value = targetVal;
    if(!sel.value && sel.options.length > 0){
      sel.selectedIndex = 0;
    }
  });
}
function aiOnModelChange(val){
  if(!val) return;
  const colonIdx = val.indexOf(":");
  if(colonIdx === -1){
    aiSetModel(aiProvider, val);
  } else {
    const prov = val.slice(0, colonIdx);
    const mId = val.slice(colonIdx + 1);
    if(prov === "custom"){
      aiProvider = "custom";
      aiActiveCustomServerId = mId;
      storSet({
        [AI_STORAGE_KEYS.provider]: "custom",
        [AI_STORAGE_KEYS.activeCustomServer]: mId
      });
    } else if(AI_PROVIDERS[prov]){
      aiProvider = prov;
      aiSetModel(prov, mId);
      storSet({ [AI_STORAGE_KEYS.provider]: prov });
    }
  }
  aiUpdateProviderUI();
}
function aiUpdateModelLine(){
  const n = document.getElementById("ai-model-name");
  let activeVal = "";
  let displayLabel = "";
  if(aiProvider === "custom"){
    const s = (aiCustomServers && aiCustomServers.find(x => x.id === aiActiveCustomServerId)) || (aiCustomServers && aiCustomServers[0]);
    if(s){
      activeVal = "custom:" + s.id;
      displayLabel = s.name + (s.model ? " (" + s.model + ")" : "");
    } else {
      activeVal = "custom:";
      displayLabel = "Custom Server";
    }
  } else {
    const cur = aiGetModel(aiProvider);
    activeVal = aiProvider + ":" + cur;
    displayLabel = AI_MODEL_LABELS[cur] || cur || (aiGetProviderConfig(aiProvider).defaultModel || "-");
  }
  if(n) n.textContent = displayLabel;
  aiPopulateModelSelect(activeVal);
}
function aiRenderCustomServers(){
  const listEl = document.getElementById("ai-custom-servers-list");
  if(!listEl) return;
  listEl.textContent = "";
  if(!aiCustomServers || !aiCustomServers.length){
    const empty = document.createElement("div");
    empty.style.cssText = "font-size:11px;color:var(--text-muted,#94a3b8);padding:4px 0;";
    empty.textContent = "Chưa có máy chủ AI nào.";
    listEl.appendChild(empty);
    return;
  }
  aiCustomServers.forEach(srv => {
    const item = document.createElement("div");
    item.className = "ai-custom-server-item" + (aiProvider === "custom" && aiActiveCustomServerId === srv.id ? " active" : "");
    
    const info = document.createElement("div");
    const title = document.createElement("div");
    title.className = "ai-custom-server-title";
    title.textContent = srv.name || srv.model || "Custom Server";
    
    const meta = document.createElement("div");
    meta.className = "ai-custom-server-meta";
    meta.textContent = (srv.model ? srv.model + " · " : "") + srv.url;
    
    info.appendChild(title);
    info.appendChild(meta);
    item.appendChild(info);
    
    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "ai-custom-server-del";
    delBtn.textContent = "✕";
    delBtn.title = aiT("ai_sessions_delete", null, "Xóa");
    delBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      aiCustomServers = aiCustomServers.filter(x => x.id !== srv.id);
      storSet({ [AI_STORAGE_KEYS.customServers]: aiCustomServers });
      if(aiActiveCustomServerId === srv.id){
        aiActiveCustomServerId = aiCustomServers.length ? aiCustomServers[0].id : "";
        storSet({ [AI_STORAGE_KEYS.activeCustomServer]: aiActiveCustomServerId });
      }
      aiRenderCustomServers();
      aiUpdateModelLine();
      if(typeof showToast === "function") showToast("ai_toast_server_deleted", "success");
    });
    item.appendChild(delBtn);
    
    item.addEventListener("click", () => {
      aiProvider = "custom";
      aiActiveCustomServerId = srv.id;
      storSet({
        [AI_STORAGE_KEYS.provider]: "custom",
        [AI_STORAGE_KEYS.activeCustomServer]: srv.id
      });
      aiUpdateProviderUI();
      aiRenderCustomServers();
    });
    
    listEl.appendChild(item);
  });
}
function aiAddCustomServer(){
  const nameEl = document.getElementById("ai-custom-new-name");
  const modelEl = document.getElementById("ai-custom-new-model");
  const urlEl = document.getElementById("ai-custom-new-url");
  const keyEl = document.getElementById("ai-custom-new-key");
  if(!urlEl) return;
  const url = urlEl.value.trim();
  if(!url || !aiValidateCustomUrl(url, true)){
    if(typeof showToast === "function") showToast("ai_toast_url_blocked", "warning");
    return;
  }
  const name = (nameEl ? nameEl.value.trim() : "") || "Custom Server";
  const model = (modelEl ? modelEl.value.trim() : "") || "default";
  const key = keyEl ? keyEl.value.trim() : "";
  const id = "srv_" + Date.now().toString(36) + Math.floor(Math.random()*1000).toString(36);
  
  const newSrv = { id, name, url, model, key };
  aiCustomServers.push(newSrv);
  aiActiveCustomServerId = id;
  aiProvider = "custom";
  storSet({
    [AI_STORAGE_KEYS.customServers]: aiCustomServers,
    [AI_STORAGE_KEYS.activeCustomServer]: id,
    [AI_STORAGE_KEYS.provider]: "custom"
  });
  
  if(nameEl) nameEl.value = "";
  if(modelEl) modelEl.value = "";
  if(urlEl) urlEl.value = "";
  if(keyEl) keyEl.value = "";
  
  aiRenderCustomServers();
  aiUpdateProviderUI();
  if(typeof showToast === "function") showToast("ai_toast_server_saved", "success");
}
function aiSyncKeyInputs(){
  const cfg=aiGetProviderConfig(aiProvider); const v=aiKeys[aiProvider]||"";
  ["ai-key-input","ai-key-input-modal"].forEach(id=>{ const el=document.getElementById(id); if(el){ el.placeholder=cfg.keyPlaceholder||"AIza..."; el.value=v; el.type="password"; }});
  const g=document.getElementById("ai-key-gemini"); if(g) g.value=aiKeys["gemini"]||"";
  const o=document.getElementById("ai-key-openai"); if(o) o.value=aiKeys["openai"]||"";
  const c=document.getElementById("ai-key-claude"); if(c) c.value=aiKeys["claude"]||"";
}
function aiUpdateProviderUI(){
  const sel=document.getElementById("ai-provider-select"); if(sel) sel.value=aiProvider;
  const cfg=aiGetProviderConfig(aiProvider); aiSyncKeyInputs();
  const st=document.getElementById("ai-key-status");
  if(st){ const has=aiHasKey(aiProvider); if(has){ st.textContent=aiT("ai_key_connected",null,"API đã kết nối"); st.className="ai-status is-connected"; } else { st.textContent=aiT("ai_key_missing",null,"○ Chưa nhập key"); st.className="ai-status"; } }
  const loginBtn=document.getElementById("ai-btn-open-provider");
  if(loginBtn){ loginBtn.textContent=(typeof getI18nText==="function")?getI18nText("ai_btn_open_provider"):"Mở trang lấy API key ↗"; loginBtn.setAttribute("data-mode","api"); loginBtn.style.display=cfg.loginUrl?"":"none"; }
  document.querySelectorAll(".ai-provider-pill").forEach(p=>{ p.classList.toggle("active", p.dataset.provider===aiProvider); });
  aiUpdateModelLine();
  const cu=document.getElementById("ai-custom-url");
  if(cu){ cu.value=(aiProvider==="custom")?(aiKeys["custom"]||""):""; cu.style.display=aiProvider==="custom"?"":"none"; const lab=document.querySelector('[data-i18n="ai_custom_label"]'); if(lab&&lab.parentElement) lab.parentElement.style.display=aiProvider==="custom"?"":"none"; }
}
function aiBuildSystemInstruction(isPageQuery, skill, pipeline){
  const LANGN={vi:"tiếng Việt",en:"English",zh:"中文",ru:"русский язык",ja:"日本語"};
  const langUi=(typeof currentAppLanguage!=="undefined"&&currentAppLanguage)||"vi";
  const langName=LANGN[langUi]||langUi;
  let sysBody="";
  if(isPageQuery) {
    try{ if(typeof getI18nText==="function"){ const v=getI18nText("ai_sys_preamble",[langName]); if(v&&v!=="ai_sys_preamble") sysBody=v; } }catch(e){}
    if(!sysBody) sysBody="BẠN LÀ ScholarFlow AI — Siêu Trợ Lý Học Thuật & Đọc Hiểu Web Đỉnh Cao. Trả lời bằng "+langName+". KỸ NĂNG ĐỌC HIỂU WEB CHUYÊN SÂU: Khai thác toàn diện dữ liệu trang web, bài báo khoa học, mã nguồn, bảng số liệu và video. Phân tích sâu sắc, nắm bắt trọn vẹn ngữ cảnh, trích xuất chính xác luận điểm cốt lõi, công thức, giải đề thi/trắc nghiệm, viết code chuẩn xác. Khi cần hãy kết hợp Google Search để mở rộng tri thức.";
  } else {
    sysBody="BẠN LÀ ScholarFlow AI — Siêu Trợ Lý Trí Tuệ Nhân Tạo Toàn Năng. Trả lời bằng "+langName+". Tự do và linh hoạt hỗ trợ mọi yêu cầu ở mức độ chuyên gia: giải đáp chuyên sâu, lập trình/viết code tối ưu, phân tích dữ liệu, dịch thuật học thuật, sáng tạo nội dung. Sử dụng Google Search khi cần dữ liệu thực tế mới nhất.";
  }
  if(sysBody.indexOf("{0}")!==-1) sysBody=sysBody.split("{0}").join(langName);
  const factRule="\n\nQUY TẮC SỰ THẬT (GOOGLE SEARCH & ĐA NGUỒN): Khi câu hỏi hỏi về nhân vật, sự kiện, dữ liệu thực tế hoặc học thuật: hãy kết hợp cả công cụ Google Search (grounding) và khối dữ liệu đối chiếu đa nguồn từ web thực tế. Tìm điểm trùng khớp và sự đồng thuận cao nhất giữa các nguồn uy tín để khẳng định thông tin chính xác 100%. Phân biệt rõ ràng từng đối tượng, không nhầm lẫn hay ghép nối sai lệch. Trình bày nội dung trực tiếp, tự nhiên; TUYỆT ĐỐI KHÔNG chèn nhãn [Nguồn:...] hay link URL vào câu trả lời.";
  const thinkingRule="\n\nQUY TẮC SUY LUẬN SÂU (DEEP THINKING / CHAIN-OF-THOUGHT): Với các câu hỏi phức tạp, học thuật, lập trình hoặc suy luận logic, hãy bắt đầu câu trả lời bằng 1-2 câu suy luận ngắn gọn đặt trong định dạng:\n> 💭 **Suy luận:** <tóm lược hướng tiếp cận hoặc tiền đề cốt lõi>\nSau đó xuống dòng và trình bày câu trả lời chi tiết, mạch lạc.";
  let skillRule="";
  if(skill&&skill.instruction) skillRule=skill.instruction;
  let pipelineRule="";
  if(pipeline&&pipeline.systemDirective) pipelineRule=pipeline.systemDirective;
  return sysBody+factRule+thinkingRule+skillRule+pipelineRule;
}
function aiBuildPrompt(userText, pageText, selectionText, imageNote, pinnedNote, pageLink, memNote, webNote, isPageQuery, pipeline){
  const b=[]; aiPromptFlagged=false;
  if(pinnedNote&&String(pinnedNote).trim()){ const sp=aiSanitizeExternal(pinnedNote,Math.min(20000,aiSettings.maxChars+8000)); if(sp.flagged) aiPromptFlagged=true; b.push("[Cac trang da them / Pinned pages]\n<<<DATA_UNTRUSTED_6_BEGIN>>>\n"+sp.text+"\n<<<DATA_UNTRUSTED_6_END>>>"); }
  if(webNote&&String(webNote).trim()){ b.push(webNote); }
  if(isPageQuery && aiSettings.includePage&&pageText){ const s=aiSanitizeExternal(pageText,Math.min(20000,aiSettings.maxChars+6000)); if(s.flagged) aiPromptFlagged=true; b.push("[Current page context]\n<<<DATA_UNTRUSTED_1_BEGIN>>>\n"+s.text+"\n<<<DATA_UNTRUSTED_1_END>>>"); }
  if(isPageQuery && aiSettings.includeSelection&&selectionText){ const s=aiSanitizeExternal(selectionText,6000); if(s.flagged) aiPromptFlagged=true; b.push("[Highlighted selection]\n<<<DATA_UNTRUSTED_2_BEGIN>>>\n"+s.text+"\n<<<DATA_UNTRUSTED_2_END>>>"); }
  if(isPageQuery && aiSettings.includeNotes){ const n=document.getElementById("f-notes")?document.getElementById("f-notes").value.trim():""; if(n) b.push("[Research notes]\n"+n.slice(0,4000)); }
  const ctx=b.length?b.join("\n\n---\n\n")+"\n\n":"";
  const detectedSkill = aiDetectSkill(userText);
  let skillPromptNote = "";
  if(detectedSkill&&detectedSkill.instruction) skillPromptNote = detectedSkill.instruction + "\n\n";
  const resolvedPipe = pipeline || aiResolvePipeline(userText, isPageQuery, detectedSkill, null, false, pageLink && pageLink.url);
  let pipelinePromptNote = "";
  if(resolvedPipe&&resolvedPipe.systemDirective) pipelinePromptNote = resolvedPipe.systemDirective + "\n\n";
  const guard=(b.length?"KỸ NĂNG ĐỌC HIỂU TRANG WEB & TÀI LIỆU CHUYÊN SÂU: Dữ liệu trang web được cung cấp để phục vụ nghiên cứu và phân tích. Bạn có toàn quyền đọc hiểu toàn diện mọi cấu trúc, văn bản, số liệu, đoạn mã và thông tin quan trọng. Phân tích sâu sắc, trả lời thông minh, chính xác và đầy đủ theo yêu cầu của người dùng, không bị hạn chế bởi bất kỳ rào cản giả định nào.\n\n":"")+(imageNote?imageNote+"\n\n":"");
  let linkLine="";
  if(isPageQuery && pageLink&&pageLink.url&&String(pageLink.url)!=="—"){ linkLine="[Trang người dùng đang đứng]\nURL: "+String(pageLink.url).slice(0,300)+(pageLink.title?"\nTiêu đề: "+String(pageLink.title).slice(0,150):"")+(pageLink.videoId?"\nvideoId YouTube: "+String(pageLink.videoId):"")+"\n(Nếu câu hỏi cần dữ liệu nhúng/mã nguồn của trang này, hãy nói rõ người dùng có thể bật 'Nguồn thô + script' ở ⚙ — và luôn kèm link trang khi trích dẫn.)\n\n"; }
  const LANGN={vi:"tiếng Việt",en:"English",zh:"中文",ru:"русский язык",ja:"日本語"};
  const langUi=(typeof currentAppLanguage!=="undefined"&&currentAppLanguage)||"vi";
  const langName=LANGN[langUi]||langUi;
  let sysBody="";
  if(isPageQuery) {
    /* Page query mode: answer from page context */
    try{ if(typeof getI18nText==="function"){ const v=getI18nText("ai_sys_preamble",[langName]); if(v&&v!=="ai_sys_preamble") sysBody=v; } }catch(e){}
    if(!sysBody) sysBody="BẠN LÀ ScholarFlow AI — Siêu Trợ Lý Học Thuật & Đọc Hiểu Web Đỉnh Cao. HƯỚNG DẪN CHUYÊN GIA:\n1) Trả lời bằng "+langName+" thông minh, tự nhiên, phân tích có chiều sâu. Sẵn sàng giải đáp mọi yêu cầu chuyên sâu, viết code, giải bài tập/đề trắc nghiệm, tóm tắt và phản biện khoa học.\n2) KỸ NĂNG ĐỌC HIỂU WEB & TÀI LIỆU CHUYÊN SÂU: Khai thác triệt để dữ liệu trong các khối ngữ cảnh trang web/tài liệu/video đang xem để đưa ra câu trả lời chuẩn xác 100%. Nắm bắt trọn vẹn cấu trúc văn bản, thuật ngữ, số liệu và kết luận. Nếu câu hỏi về chủ đề mở rộng hoặc kiến thức ngoài trang, hãy kết hợp tri thức của bạn và Google Search để trả lời toàn diện nhất. Chỉ khi người dùng hỏi một chi tiết riêng biệt mà trang hoàn toàn không có mới nói rõ 'KHÔNG CÓ THÔNG TIN ĐỦ'.\n3) Trình bày Markdown chuyên nghiệp: ## tiêu đề, danh sách phân tích, bảng so sánh trực quan | cột |, khối `code` định dạng chuẩn. Tuyệt đối không chèn nhãn [Nguồn:...] hay link URL vào câu trả lời.\n4) Kết thúc bằng khối:\nGỢI Ý:\n- <câu hỏi 1>\n- <câu hỏi 2>\n- <câu hỏi 3>";
  } else {
    /* General chat mode: answer from knowledge + web search */
    sysBody="BẠN LÀ ScholarFlow AI — Siêu Trợ Lý Đa Năng Đỉnh Cao. HƯỚNG DẪN:\n1) Trả lời bằng "+langName+" thông minh, chuẩn xác, hữu ích ở trình độ chuyên gia. Hỗ trợ toàn diện mọi yêu cầu: lập trình, phân tích dữ liệu, dịch thuật, tư duy chiến lược, sáng tạo.\n2) Trả lời từ kho tri thức sâu rộng kết hợp Google Search khi cần thông tin thời sự mới nhất. Luôn đưa ra lập luận chặt chẽ, dẫn chứng rõ ràng. Tuyệt đối không chèn nhãn [Nguồn:...] hay link URL vào câu trả lời.\n3) Trình bày Markdown gọn gàng: ## tiêu đề, bullet, bảng so sánh | cột |, khối `code` cho mã nguồn.\n4) Kết thúc bằng khối:\nGỢI Ý:\n- <câu hỏi 1>\n- <câu hỏi 2>\n- <câu hỏi 3>";
  }
  if(sysBody.indexOf("{0}")!==-1) sysBody=sysBody.split("{0}").join(langName);
  const FACT_RULE="\n\nQUY TẮC SỰ THẬT: Khi câu hỏi hỏi về nhân vật, tác giả, sự kiện thực tế hoặc dữ liệu thời gian: hãy kết hợp sử dụng Google Search (grounding) và dữ liệu web thực tế để lấy thông tin chính xác nhất từ nguồn uy tín (người dùng không cần trích dẫn URL nguồn, chỉ cần thông tin chính xác 100%). Phân biệt rõ ràng từng cá nhân, sự kiện, không nhầm lẫn hay chắp vá. TUYỆT ĐỐI KHÔNG chèn nhãn [Nguồn:...] hay link URL vào nội dung câu trả lời.";
  const COMPLETENESS_RULE="\n\nQUY TẮC NỘI DUNG ĐẦY ĐỦ: Khi người dùng yêu cầu nội dung đầy đủ/chi tiết/toàn bộ (lời bài hát, thơ, tài liệu, thuật toán, code, bài giải...): (1) Bắt buộc tìm kiếm hoặc trích xuất bản đầy đủ chính xác nhất — không cắt xén, không dùng dấu '...' hay tóm tắt sơ sài. (2) Trình bày TOÀN BỘ nội dung liền mạch theo đúng trật tự. (3) Nếu nội dung quá dài, trình bày tối đa phần hoàn chỉnh và hướng dẫn tiếp tục liền mạch.";
  const THINKING_RULE="\n\nQUY TẮC SUY LUẬN SÂU (DEEP THINKING): Với câu hỏi phân tích, lập trình, học thuật hoặc suy luận logic, hãy mở đầu bằng 1 dòng suy luận ngắn đặt trong định dạng:\n> 💭 **Suy luận:** <hướng tiếp cận cốt lõi>\nSau đó xuống dòng và trả lời đầy đủ, trực diện.";
  const sys=sysBody+FACT_RULE+COMPLETENESS_RULE+THINKING_RULE+"\n\n";
  let scopeNote="";
  if(isPageQuery) {
    scopeNote="[PHẠM VI] HỎI VỀ TRANG: Người dùng đang hỏi về nội dung trang/video. Ưu tiên ngữ cảnh trang; khi thiếu dữ liệu dùng kiến thức và web search. Nói rõ nguồn trích dẫn.";
  } else {
    scopeNote="[PHẠM VI] TRÒ CHUYỆN CHUNG: Trả lời tự do từ kiến thức + web search. KHÔNG dùng nội dung trang trừ khi người dùng hỏi rõ.";
  }
  if(aiSettings.scope==="web") scopeNote += " CHẾ ĐỘ 'web': ở dòng 'Nguồn:' ghi URL đầy đủ của từng nguồn đã dùng (mỗi URL chỉ MỘT lần, cuối câu) và kèm 3-5 từ khóa để người dùng tự kiểm chứng.";
  let cleanUserQ = userText;
  if(isPageQuery) cleanUserQ = cleanUserQ.replace(/^[+@]\s*/,"");
  if(detectedSkill&&detectedSkill.matchedBy==="slash") cleanUserQ = cleanUserQ.replace(/^[\/!][a-z0-9_-]+\s*/i,"");
  return sys+scopeNote+"\n\n"+(memNote?"[BO NHO CUA AI]\n"+memNote+"\n\n":"")+guard+skillPromptNote+pipelinePromptNote+linkLine+ctx+"[Câu hỏi]\n"+aiSanitizeExternal(cleanUserQ,8000).text;
}
function aiTrimHist(hist){ const h=(Array.isArray(hist)?hist:[]).slice(-6).map(m=>({role:m&&m.role==="user"?"user":"assistant",content:String(m&&m.content||"").slice(0,800)})).filter(m=>m.content.trim()); return h; }
function aiHistoryToGeminiContents(hist, prompt, imgList){ const out=aiTrimHist(hist).map(m=>({role:m.role==="user"?"user":"model",parts:[{text:m.content}]})); const cur=[{text:prompt}].concat((imgList||[]).map(im=>({inline_data:{mime_type:im.mimeType||"image/jpeg",data:im.data}}))); out.push({role:"user",parts:cur}); return out; }
function aiHistoryToOpenAIMessages(hist, prompt, imgList){ const out=aiTrimHist(hist).map(m=>({role:m.role,content:m.content})); out.push({role:"user",content:(imgList&&imgList.length)?[{type:"text",text:prompt}].concat(imgList.map(im=>({type:"image_url",image_url:{url:"data:"+(im.mimeType||"image/jpeg")+";base64,"+im.data}}))):prompt}); return out; }
function aiHistoryToClaudeMessages(hist, prompt, imgList){ const merged=[]; aiTrimHist(hist).forEach(m=>{ const r=m.role; const ex=merged[merged.length-1]; if(ex&&ex.role===r) ex.content=ex.content+"\n"+m.content; else merged.push({role:r,content:m.content}); }); while(merged.length&&merged[0].role==="assistant") merged.shift(); const cur={role:"user",content:(imgList&&imgList.length)?[{type:"text",text:prompt}].concat(imgList.map(im=>({type:"image",source:{type:"base64",media_type:im.mimeType||"image/jpeg",data:im.data}}))):prompt}; const ex=merged[merged.length-1]; if(ex&&ex.role==="user") ex.content=String(ex.content)+"\n\n"+prompt; else merged.push(cur); return merged; }
async function aiCallGeminiLite(prompt, apiKey, imgs, hist){
  const cur=aiGetModel("gemini");
  const tries=["gemini-3.5-flash","gemini-3.1-flash-lite","gemini-3-flash","gemini-3.7-flash"].filter(m=>m&&m!==cur);
  for(const fm of tries){
    for(const ver of ["v1beta","v1"]){
      try{
        const url="https://generativelanguage.googleapis.com/"+ver+"/models/"+encodeURIComponent(fm)+":generateContent?key="+encodeURIComponent(apiKey);
        const r=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({contents:aiHistoryToGeminiContents(hist,prompt,imgs),generationConfig:{temperature:aiSettings.temperature}}),signal:AbortSignal.timeout(25000)});
        if(r.ok){ const d=await r.json(); const cand=d.candidates&&d.candidates[0]; const parts2=cand&&cand.content&&cand.content.parts; if(parts2&&parts2[0]&&parts2[0].text) return { model:fm, text:String(parts2[0].text) }; continue; }
        if(r.status===404||r.status===400) break;
        if(r.status===429||r.status===503) continue;
      }catch(e){ continue; }
    }
  }
  return "";
}
/* Gemini 2.x/3.x models support native Google Search grounding via tools:[{google_search:{}}]. */
function aiGeminiSupportsGrounding(model){ const m=String(model||"").toLowerCase(); return /gemini-[23]/.test(m)||m.includes("latest"); }
/* Gemini can watch a PUBLIC YouTube video server-side: pass the watch URL as fileData.fileUri
   (no transcript scraping, no CORS, no hidden tab). Text part goes AFTER the video part. */
function aiGeminiSupportsVideo(model){ const m=String(model||"").toLowerCase(); return /gemini-[23]/.test(m)||m.includes("latest"); }
/* Agentic video understanding (Gemini 3.5/3.6/3.7/3.8-Flash) reads a long video far cheaper
   (~88% fewer tokens) and more accurately than static 1-FPS. For videos over ~8 min we auto-use an
   agentic-capable model for THIS call only (never changes the user's saved model). */
const AI_AGENTIC_MODELS=["gemini-3.8-flash","gemini-3.7-flash","gemini-3.6-flash","gemini-3.5-flash-lite"];
const AI_AGENTIC_MIN_SEC=480;
function aiGeminiSupportsAgentic(model){ return AI_AGENTIC_MODELS.indexOf(String(model||"").toLowerCase())!==-1; }
function aiFirstAgenticModel(list){ const av=list||((aiFetchedModels&&aiFetchedModels.length)?aiFetchedModels:null); if(!av) return ""; for(let i=0;i<AI_AGENTIC_MODELS.length;i++){ if(av.indexOf(AI_AGENTIC_MODELS[i])!==-1) return AI_AGENTIC_MODELS[i]; } return ""; }
function aiPickVideoModel(lengthSec, avail){ const cur=aiGetModel("gemini"); if((lengthSec||0)>=AI_AGENTIC_MIN_SEC){ if(aiGeminiSupportsAgentic(cur)) return {model:cur,agentic:true}; const alt=aiFirstAgenticModel(avail); if(alt) return {model:alt,agentic:true}; return {model:cur,agentic:false}; } return {model:cur,agentic:false}; }
function aiGetYtLengthSec(){
  return new Promise(res=>{
    if(typeof sendTabMessage!=="function"){ res(0); return; }
    let done=false; const fin=v=>{ if(!done){ done=true; res(v); } };
    setTimeout(()=>fin(0),4000);
    try{ sendTabMessage({action:"GET_YT_META", timeoutMs:3500, silent:true}, r=>{ const s=r&&r.ok?Number(r.lengthSeconds):0; fin(isFinite(s)&&s>0?s:0); }); }catch(e){ fin(0); }
  });
}
function aiCheckYtLive(){
  return new Promise(res=>{
    if(typeof sendTabMessage!=="function"){ res(false); return; }
    let done=false; const fin=v=>{ if(!done){ done=true; res(v); } };
    setTimeout(()=>fin(false),3000);
    try{ sendTabMessage({action:"GET_YT_META", timeoutMs:2500, silent:true}, r=>{ fin(!!(r&&r.ok&&r.isLive)); }); }catch(e){ fin(false); }
  });
}
function _aiFoldAscii(s){ return String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/g,"d").replace(/Đ/g,"D").toLowerCase(); }
const AI_TRANSCRIPT_RE=/(chep\s*loi|bang\s*chep|transcript|phu\s*de|subtitle|lyric|loi\s*(?:bai\s*hat|dan|thoai|ca)|文字起こし|字幕|歌词|转录|транскрипт|субтитр|расшифровк)/i;
const AI_VIDEO_REF_RE=/(video|clip|phim|mv|doan\s*(?:vua|nay|do|tren)|vua\s*(?:xem|nghe)|trong\s*(?:video|clip|phim)|chep\s*loi|phu\s*de|transcript|subtitle|dang\s*noi|noi\s*ve|ai\s*noi)/i;
function aiIsTranscriptRequest(text){ return AI_TRANSCRIPT_RE.test(_aiFoldAscii(text)); }
function aiQueryRefersToVideo(text){ return AI_VIDEO_REF_RE.test(_aiFoldAscii(text)); }
function _aiMMSS(sec){ sec=Math.max(0,Math.floor(sec)||0); const h=Math.floor(sec/3600),m=Math.floor((sec%3600)/60),s=sec%60,p=function(n){return (n<10?"0":"")+n;}; return (h?h+":":"")+p(m)+":"+p(s); }
function aiLastTimestampSec(text){ const m=String(text||"").match(/\[(\d{1,2}):([0-5]\d)(?::([0-5]\d))?\]/g)||[]; if(!m.length) return 0; const p=m[m.length-1].replace(/[\[\]]/g,"").split(":").map(Number); return p.length===3?p[0]*3600+p[1]*60+p[2]:p[0]*60+p[1]; }
const AI_CONTINUE_RE=/(?:^|\s)(tiep tuc|tiep theo|tiep lai|tiep den|tiep|con nua|con lai|lam tiep|noi tiep|doc tiep|dich tiep|phan con lai|phan con|continue|next|go on|more)(?:\s|$|[!?.])/;
function aiIsContinueRequest(text){ const t=_aiFoldAscii(text).replace(/\s+/g," ").trim(); return t.length<=60 && AI_CONTINUE_RE.test(" "+t+" "); }
function aiVideoQuestionText(question, transcriptMode, isLong){
  const tm = transcriptMode || aiIsTranscriptRequest(question);
  let sys="Bạn là trợ lý học thuật ScholarFlow. HÃY XEM video này (CẢ hình ảnh LẪN tiếng) và chỉ trả lời DỰA TRÊN NỘI DUNG THỰC TẾ đã thấy/nghe. TUYỆT ĐỐI không bịa; ý nào video không có thì nói rõ là không đề cập.\n";
  if(isLong){
    sys+="- Video này DÀI. KHÔNG cố chép nguyên văn toàn bộ (một lượt sẽ bị cắt giữa chừng). Thay vào đó hãy trả về BẢNG TIMELINE: chia thành các mục '[mm:ss] – [mm:ss]', mỗi mục 1–2 câu TÓM TẮT sự kiện/ý chính + chi tiết hình ảnh nổi bật, bám đúng thứ tự thời gian tới hết video.\n";
  } else {
    sys+="- Nếu hỏi tóm tắt/phân tích/ý nghĩa/nhân vật: bám cả CHI TIẾT HÌNH ẢNH (đồ vật, hành động, cảnh, chữ trên màn hình) lẫn lời thoại; mỗi luận điểm kèm mốc [mm:ss]. Trả lời gọn, đúng markdown.\n";
    if(tm) sys+="- NẾU xin BẢN CHÉP LỜI / phụ đề / lyrics: chép NGUYÊN VĂN từng câu nói hoặc lời hát, theo DÒNG THỜI GIAN, MỖI phát ngôn một dòng '[mm:ss] <lời>' — KHÔNG gom nhóm theo nhân vật/chủ đề, KHÔNG viết dạng mục lục, KHÔNG dịch, KHÔNG tóm tắt, KHÔNG bỏ sót; bỏ nhãn '[Music]'; nghe không rõ ghi '[nghe không rõ]'. Chép LIÊN TỤC tới HẾT video; nếu không kịp trong một lần, hãy chép đến một mốc '[mm:ss]' hợp lý rồi thêm DÒNG CUỐI đúng định dạng: '⏭️ Còn tiếp — nhắn \"tiếp tục\"'. KHÔNG nhảy cóc hay bịa phần chưa chép.\n";
  }
  sys+="Kết thúc bằng khối 'GỢI Ý:' với 3 câu hỏi tiềm năng.";
  return sys+"\n\n[Câu hỏi]\n"+String(question||"").slice(0,4000);
}
function aiVideoContents(videoId, question, hist, transcriptMode, agentic, isLong){
  const contents=[];
  (Array.isArray(hist)?hist:[]).slice(-6).forEach(function(m){ if(!m||!m.content) return; contents.push({role:m.role==="assistant"?"model":"user",parts:[{text:String(m.content).slice(0,4000)}]}); });
  var vpart={fileData:{fileUri:"https://www.youtube.com/watch?v="+String(videoId||"").trim()}}; if(agentic) vpart.mediaProcessing="AGENTIC";
  contents.push({role:"user",parts:[vpart,{text:aiVideoQuestionText(question, transcriptMode, isLong)}]});
  return contents;
}
async function aiCallGeminiVideo(videoId, question, apiKey, hist, opts, transcriptMode, lengthSec){
  const isLong=(lengthSec||0)>=AI_AGENTIC_MIN_SEC;
  const pick=aiPickVideoModel(lengthSec||0); const model=pick.model; const contents=aiVideoContents(videoId, question, hist, transcriptMode, pick.agentic, isLong);
  const genExtra = pick.agentic ? {mediaResolution:"MEDIA_RESOLUTION_LOW"} : null;
  if(aiSettings.stream!==false&&opts){ try{ return await aiStreamGemini(model, apiKey, contents, aiSettings.temperature, opts, null, pick.agentic?180000:90000, genExtra); }catch(se){ if(opts&&opts.signal&&opts.signal.aborted) throw se; } }
  let lastErr="";
  for(const ver of ["v1beta","v1"]){
    let res;
    try{
      const url="https://generativelanguage.googleapis.com/"+ver+"/models/"+encodeURIComponent(model)+":generateContent?key="+encodeURIComponent(apiKey);
      res=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({contents:contents,generationConfig:Object.assign({temperature:aiSettings.temperature},genExtra||null)}),signal:aiSig(opts&&opts.signal,180000)});
    }catch(e){ lastErr=String(e&&e.message||e); if(/timed out|timeout|aborterror/i.test(lastErr)){ if(ver==="v1beta"){ await new Promise(r=>setTimeout(r,1200)); continue; } throw new Error("gemini_video_timeout"); } throw new Error("gemini_video_network_"+lastErr.slice(0,120)); }
    if(res.ok){ const d=await res.json(); const cand=d.candidates&&d.candidates[0]; const parts=cand&&cand.content&&cand.content.parts; const got=aiGroundingSources(cand); if(got.length&&opts) opts.__groundingSources=got.concat(opts.__groundingSources||[]).slice(0,8); return (parts&&parts[0]&&typeof parts[0].text==="string")?parts[0].text:""; }
    lastErr=await res.text().catch(()=>"");
    if(res.status===400){ const bl=String(lastErr).toLowerCase(); if(bl.includes("prohibited")||bl.includes("private")||bl.includes("unavailable")||bl.includes("age")) return ""; }
    if((res.status===429||res.status===503||res.status===504)&&ver==="v1beta"){ await new Promise(r=>setTimeout(r,1200)); continue; }
    if(res.status===404&&ver==="v1beta"){ continue; }
    throw new Error("gemini_video_"+res.status+"_"+String(lastErr).slice(0,200));
  }
  return "";
}
async function aiCallProvider(provider, prompt, apiKey, image, hist, opts){
  const cfg=aiGetProviderConfig(provider);
  const imgs=Array.isArray(image)?image.filter(x=>x&&x.data):((image&&image.data)?[image]:[]);
  const wantStream=!!(opts&&opts.onToken);
  if(provider==="custom"){
    let server = null;
    if(aiCustomServers && aiCustomServers.length){
      server = aiCustomServers.find(s=>s.id===aiActiveCustomServerId) || aiCustomServers[0];
    }
    let url = (apiKey && String(apiKey).startsWith("http")) ? String(apiKey).trim() : (server ? server.url : (aiKeys["custom"]||"").trim());
    let key = (server && server.key) ? server.key.trim() : "";
    let model = (server && server.model) ? server.model.trim() : "";
    if(!url) throw new Error("custom_url_invalid");
    if(!aiValidateCustomUrl(url, true)) throw new Error("custom_url_blocked");
    const headers = { "Content-Type": "application/json" };
    if(key) headers["Authorization"] = "Bearer " + key;
    const isChatEndpoint = url.includes("/chat/completions") || url.includes("/v1/") || url.includes("/api/");
    let bodyObj;
    if(isChatEndpoint){
      const msgs = aiHistoryToOpenAIMessages(hist, prompt, imgs);
      bodyObj = {
        model: model || "local-model",
        messages: msgs,
        temperature: aiSettings.temperature
      };
    } else {
      bodyObj = { prompt: prompt, model: model || undefined };
    }
    const res = await fetch(url, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(bodyObj),
      signal: aiSig(opts&&opts.signal, 45000),
      redirect: "manual"
    });
    if(res.type==="opaqueredirect"||(res.status>=300&&res.status<400)) throw new Error("custom_redirect_blocked");
    if(!res.ok) throw new Error("http_"+res.status);
    const d = await res.json().catch(()=>({}));
    let answer = "";
    if(d.choices && d.choices[0] && d.choices[0].message && typeof d.choices[0].message.content === "string"){
      answer = d.choices[0].message.content;
    } else if(typeof d.response === "string"){
      answer = d.response;
    } else if(typeof d.text === "string"){
      answer = d.text;
    } else if(typeof d.content === "string"){
      answer = d.content;
    } else if(typeof d.answer === "string"){
      answer = d.answer;
    } else {
      answer = JSON.stringify(d);
    }
    return String(answer).slice(0, 16000);
  }
  if(provider==="gemini"){
    const model=aiGetModel(provider); let lastErr="";
    let grounding=(((aiSettings.webSearch!==false)&&aiSettings.scope!=="only")||(opts&&opts.groundOverride))&&aiGeminiSupportsGrounding(model);
    const effTemp = (grounding || (opts&&opts.groundOverride)) ? Math.min(0.15, aiSettings.temperature) : aiSettings.temperature;
    const isPg = opts && !!opts.isPageQuery;
    const sysInst = aiBuildSystemInstruction(isPg, opts&&opts.skill, opts&&opts.pipeline);
    if(wantStream){ try{ return await aiStreamGemini(model, apiKey, aiHistoryToGeminiContents(hist,prompt,imgs), effTemp, opts, grounding?[{google_search:{}}]:null, null, null, sysInst); }catch(se){ if(opts&&opts.signal&&opts.signal.aborted) throw se; } }
    for(const ver of ["v1beta","v1"]){
      let res;
      try{
        const base="https://generativelanguage.googleapis.com/"+ver+"/models/";
        const url=base+encodeURIComponent(model)+":generateContent?key="+encodeURIComponent(apiKey);
        const body={contents:aiHistoryToGeminiContents(hist,prompt,imgs),generationConfig:{temperature:effTemp,maxOutputTokens:8192}};
        if(ver==="v1beta"&&sysInst) body.systemInstruction={parts:[{text:sysInst}]};
        if(grounding) body.tools=[{google_search:{}}];
        res=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body),signal:aiSig(opts&&opts.signal,prompt.length>9000?45000:28000)});
      }catch(e){ lastErr=String(e&&e.message||e); if(lastErr.toLowerCase().includes("timed out")||lastErr.toLowerCase().includes("timeout")||lastErr.includes("AbortError")){ if(ver==="v1beta"){ await new Promise(r=>setTimeout(r,1200)); continue; } throw new Error("gemini_timeout_"+lastErr.slice(0,120)+" — Model "+model+" overloaded/timeout - switch to a Lite model in Settings"); } throw new Error("gemini_network_"+lastErr.slice(0,120)); }
      if(res.ok){
        const d=await res.json();
        const cand=d.candidates&&d.candidates[0];
        const parts=cand&&cand.content&&cand.content.parts;
        const txt=Array.isArray(parts)?parts.map(p=>(p&&typeof p.text==="string")?p.text:"").join(""):((parts&&parts[0]&&typeof parts[0].text==="string")?parts[0].text:"");
        if(txt){
          const got=aiGroundingSources(cand);
          if(got.length&&opts) opts.__groundingSources=got.concat(opts.__groundingSources||[]).slice(0,8);
          const gotQ=aiGroundingQueries(cand);
          if(gotQ.length&&opts) opts.__groundingQueries=gotQ.slice(0,5);
          return txt;
        }
        return JSON.stringify(d).slice(0,4000);
      }
      const t=await res.text().catch(()=> ""); lastErr=t;
      if(res.status===400&&grounding){ grounding=false; continue; }
      if((res.status===503||res.status===429)&&ver==="v1beta"){ await new Promise(r=>setTimeout(r,1200)); continue; }
      if(res.status===408||res.status===504){ await new Promise(r=>setTimeout(r,1000)); continue; }
      if(res.status===404&&t.includes("not found")&&ver==="v1beta") continue;
      if(res.status===404){ const fetched=await aiFetchGeminiModels(apiKey); const sug=fetched.length?" supported-by-this-key: "+fetched.slice(0,6).join(", ")+" (switch model in Settings)":" (open Settings > Fetch models to list what this key supports)"; throw new Error("gemini_404_model_"+model+"_"+t.slice(0,120)+sug); }
      throw new Error("gemini_"+res.status+"_"+t.slice(0,200));
    }
    throw new Error("gemini_404_model_"+model+"_"+lastErr.slice(0,180));
  }
  if(provider==="openai"){
    const model=aiGetModel(provider)||"gpt-4o";
    const isPg = opts && !!opts.isPageQuery;
    const sysInst = aiBuildSystemInstruction(isPg, opts&&opts.skill, opts&&opts.pipeline);
    const msgs = aiHistoryToOpenAIMessages(hist,prompt,imgs);
    if(sysInst) msgs.unshift({role:"system", content:sysInst});
    if(wantStream){ try{ return await aiStreamOpenAI(cfg.apiUrl, model, msgs, aiSettings.temperature, apiKey, opts); }catch(se){ if(opts&&opts.signal&&opts.signal.aborted) throw se; } }
    const res=await fetch(cfg.apiUrl,{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+apiKey},body:JSON.stringify({model:model,messages:msgs,temperature:aiSettings.temperature,max_tokens:4096}),signal:aiSig(opts&&opts.signal,30000)});
    if(!res.ok){ const t=await res.text().catch(()=> ""); throw new Error("openai_"+res.status+"_"+t.slice(0,200)); }
    const d=await res.json(); return (d.choices&&d.choices[0]&&d.choices[0].message&&d.choices[0].message.content)||"";
  }
  if(provider==="claude"){
    const model=aiGetModel(provider)||"claude-3-5-sonnet-20241022";
    const isPg = opts && !!opts.isPageQuery;
    const sysInst = aiBuildSystemInstruction(isPg, opts&&opts.skill, opts&&opts.pipeline);
    const bodyObj={model:model,max_tokens:8192,messages:aiHistoryToClaudeMessages(hist,prompt,imgs)};
    if(sysInst) bodyObj.system=sysInst;
    const res=await fetch(cfg.apiUrl,{method:"POST",headers:{"Content-Type":"application/json","x-api-key":apiKey,"anthropic-version":"2023-06-01"},body:JSON.stringify(bodyObj),signal:aiSig(opts&&opts.signal,30000)});
    if(!res.ok){ const t=await res.text().catch(()=> ""); throw new Error("claude_"+res.status+"_"+t.slice(0,200)); }
    const d=await res.json(); if(d.content&&Array.isArray(d.content)&&d.content[0]&&d.content[0].text) return d.content[0].text; return JSON.stringify(d).slice(0,4000);
  }
  throw new Error("unknown_provider");
}
function aiLocalFallback(prompt, pageText){
  const src=(pageText||aiBuildContext()||prompt).trim();
  if(!src) return aiT("ai_local_no_ctx",null,"Không có ngữ cảnh trang để tóm tắt. Hãy mở một trang web có nội dung.");
  const sens=src.split(/[\.\!\?]\s+/).filter(Boolean).slice(0,5);
  return sens.map((s,i)=>(i+1)+". "+s.trim().slice(0,180)).join("\n")+"\n\n"+aiT("ai_local_suffix",[aiGetProviderConfig(aiProvider).label],"(Gợi ý cục bộ — nhập API key để dùng "+aiGetProviderConfig(aiProvider).label+" trực tiếp)");
}
function aiUseWebBridge(prompt, provider){
  const cfg=aiGetProviderConfig(provider); const webUrl=cfg.webUrl||"";
  const doCopy=async(text)=>{ try{ if(navigator.clipboard&&navigator.clipboard.writeText) await navigator.clipboard.writeText(text);}catch(e){} if(webUrl){ const tabsApi=(typeof browser!=="undefined"&&browser.tabs)?browser.tabs:(typeof chrome!=="undefined"?chrome.tabs:null); if(tabsApi&&tabsApi.create){ try{tabsApi.create({url:webUrl});}catch(e){ window.open(webUrl,"_blank"); }} else window.open(webUrl,"_blank"); } };
  doCopy(prompt);
  const hint=(typeof getI18nText==="function")?getI18nText("ai_toast_web_hint"):"Đã copy prompt + nội dung trang — dán (Ctrl+V) vào "+cfg.label+" Web để hỏi (miễn phí, không cần API key).";
  return hint+"\n\n---\n"+prompt.slice(0,3000)+(prompt.length>3000?"...":"")+"\n\n("+aiLocalFallback(prompt,"")+")";
}
function aiAttachImageFile(f){
  if(!f||typeof f.type!=="string"||!f.type.startsWith("image/")){ if(typeof showToast==="function") showToast("ai_toast_image_only","warning"); return false; }
  if(f.size>4*1024*1024){ if(typeof showToast==="function") showToast("ai_toast_image_large","warning"); return false; }
  const r=new FileReader();
  r.onload=e=>{ const b64=String(e.target.result||""); const c=b64.indexOf(","); const d=c!==-1?b64.slice(c+1):b64; aiAttachedImage={data:d,mimeType:f.type||"image/jpeg",name:f.name||"clipboard.png",preview:b64}; const thumb=document.getElementById("ai-image-thumb"); const nameEl=document.getElementById("ai-image-name"); const preview=document.getElementById("ai-image-preview"); if(thumb) thumb.src=b64; if(nameEl) nameEl.textContent=(f.name||"clipboard.png")+" ("+Math.round((f.size||0)/1024)+" KB)"; if(preview) preview.style.display="flex"; };
  r.readAsDataURL(f);
  return true;
}
async function aiSendCurrent(){
  if(aiIsSending){ aiQuickCtx=null; return; }
  const quickReq = aiQuickCtx; aiQuickCtx = null;
  const input=document.getElementById("ai-input"); const raw=input?input.value.trim():"";
  if(!raw){ if(typeof showToast==="function") showToast("ai_toast_empty","warning"); return; }
  if(!aiRateLimitOk()){ if(typeof showToast==="function") showToast("ai_toast_rate_limited","warning"); return; }
  if(raw.length>8000&&input){ input.value=raw.slice(0,8000); }
  /* ── Resolve live active tab & URL ── */
  let pageUrl="";
  try{
    if(typeof ensureActiveTab==="function"){
      const liveTab=await ensureActiveTab();
      if(liveTab&&liveTab.url&&!/^(about:|chrome:|moz-extension:|chrome-extension:|edge:)/i.test(liveTab.url)){
        currentTabObj=liveTab;
        currentTabUrl=liveTab.url;
        pageUrl=liveTab.url;
        if(liveTab.title&&liveTab.title!=="Untitled"){
          if(!currentMeta) currentMeta={};
          currentMeta.url=liveTab.url;
          currentMeta.title=liveTab.title;
        }
      }
    }
  }catch(e){}
  if(!pageUrl){
    try{ pageUrl=(typeof currentTabUrl!=="undefined"&&currentTabUrl)?String(currentTabUrl):((typeof currentMeta!=="undefined"&&currentMeta&&currentMeta.url)?String(currentMeta.url):""); }catch(e){}
  }
  const hasActiveWebPage = !!(pageUrl && /^https?:\/\//i.test(pageUrl));
  /* ── Trigger detection: +/@ prefix, quick-chip, active web tab in auto mode, or auto page-intent ── */
  const scopeNow=(typeof aiSettings.scope==="string"&&["only","auto","web"].includes(aiSettings.scope))?aiSettings.scope:"auto";
  const hasSelection = !!(aiAttachedSelection && aiAttachedSelection.trim());
  const detectedSkill = aiDetectSkill(raw);
  const skillWantsPage = detectedSkill && ["critique","table","quiz","mindmap"].includes(detectedSkill.key);
  const explicitPageIntent = (/^[+@]\s*/.test(raw) || !!quickReq || scopeNow==="only" || aiDetectPageIntent(raw) || hasSelection || (skillWantsPage && hasActiveWebPage));
  const isPageQuery = (scopeNow==="only") || (scopeNow==="auto" && explicitPageIntent && hasActiveWebPage);
  const cleanQuery = raw.replace(/^[+@]\s*/, "").replace(/^[\/!][a-z0-9_-]+\s*/i, "");
  /* Web search now relies solely on Gemini's native Google Search grounding; the old DuckDuckGo/
     Wikipedia scraper is gone. The 🔎 button forces grounding on for this one turn via groundOverride. */
  const forceGround = aiForceGround; aiForceGround = false;
  const provider=aiProvider; const key=aiKeys[provider]||"";
  const imageToSend=aiAttachedImage; const imagePreview=imageToSend?imageToSend.preview:null;
  aiAppendMessage("user", raw, provider, imagePreview);
  if(input){ input.value=""; input.style.height=""; }
  const _imgInput=document.getElementById("ai-image-input"); const _preview=document.getElementById("ai-image-preview");
  if(_imgInput) _imgInput.value=""; if(_preview) _preview.style.display="none";
  const _imageForApi=imageToSend; aiAttachedImage=null;
  aiIsSending=true; aiUserStopped=false; aiAbort=new AbortController();
  const sendBtn=document.getElementById("ai-btn-send");
  if(sendBtn){ sendBtn.classList.add("is-stop"); sendBtn.textContent="⏹"; sendBtn.disabled=false; sendBtn.title=aiT("ai_btn_stop",null,"Dừng tạo câu trả lời"); }
  const hist=aiHistory.slice(0,-1);
  const streaming=aiSettings.stream!==false&&aiHasKey(provider)&&(provider==="gemini"||provider==="openai");
  let streamAcc=""; let streamRow=null;
  const onToken=(piece)=>{
    streamAcc+=piece;
    if(!streamRow){
      aiHideTyping();
      aiAppendMessage("assistant","",provider);
      const c=document.getElementById("ai-chat-history");
      streamRow=c&&c.lastElementChild?c.lastElementChild.querySelector(".ai-bubble"):null;
    }
    if(streamRow){
      streamRow.textContent=streamAcc;
      const cur=document.createElement("span");
      cur.className="ai-stream-cursor";
      cur.textContent="▌";
      streamRow.appendChild(cur);
      const c2=document.getElementById("ai-chat-history");
      if(c2) c2.scrollTop=c2.scrollHeight;
    }
  };
  const pipeline = aiResolvePipeline(raw, isPageQuery, detectedSkill, quickReq, hasActiveWebPage, pageUrl);
  aiShowTyping("⚡ [" + pipeline.label + "] 1/3: " + pipeline.steps[0]);
  let pageText=""; let selectionText=aiAttachedSelection||"";
  aiAttachedSelection="";
  if(input){ const defPh=aiT("ai_input_placeholder",null,"Hỏi về trang, video, tài liệu, hoặc nhập câu hỏi bất kỳ..."); if(input.placeholder!==defPh) input.placeholder=defPh; }
  /* Fetch page context when user triggered +/@ prefix, active page in auto mode, or a quick-chip request */
  if(isPageQuery) {
    aiUpdateTypingStatus("⚡ [" + pipeline.label + "] 2/3: " + pipeline.steps[1]);
    try{
      pageText=await aiGetPageContextText(cleanQuery);
      if(!selectionText) selectionText=await aiGetSelectionText();
    }catch(e){}
  }
  if(quickReq){
    aiUpdateTypingStatus("⚡ [" + pipeline.label + "] 2/3: " + pipeline.steps[1]);
    const kc=quickReq;
    try{
      if(kc.kind==="tabs"){ const tb=await aiCollectTabsContext(); if(tb){ pageText=tb; } else if(typeof showToast==="function") showToast("ai_toast_tabs_empty","warning"); }
      else if(kc.kind==="papers"){ const sc=await aiScholarSearch(cleanQuery); if(sc){ pageText = pageText ? pageText+"\n\n[Scholarly search results]\n"+sc : "[Scholarly search results]\n"+sc; } else if(typeof showToast==="function") showToast("ai_toast_scholar_empty","warning"); }
    }catch(e){}
  }
  /* Gemini "watch the video" mode: a PUBLIC YouTube URL is handed to Gemini server-side (visual+audio),
     no transcript scraping / no CORS / no hidden tab. Also keeps video context ALIVE across follow-ups:
     once a video was watched this session, staying on its tab (or saying "video/clip/chép lời") re-attaches
     it, so later questions stay grounded in the real footage instead of only the page title/comments.
     Switching YouTube videos automatically updates aiActiveVideoId so the new video is watched instead of stale session lock. */
  let videoDirectId=""; let wantContinue=false;
  try{
    if(provider==="gemini"&&key&&aiGeminiSupportsVideo(aiGetModel("gemini"))){
      const pid=aiIsYouTubeUrl(pageUrl)?aiExtractYouTubeId(pageUrl):"";
      const qid=aiExtractYouTubeId(cleanQuery)||aiExtractYouTubeId(raw);
      const refersVideo=aiQueryRefersToVideo(cleanQuery)||aiIsTranscriptRequest(cleanQuery);
      if(qid){
        videoDirectId=qid;
        if(qid!==aiActiveVideoId){ aiActiveVideoId=qid; aiVideoResumeAt=0; }
      }
      else if(aiIsContinueRequest(cleanQuery)&&aiActiveVideoId&&aiVideoResumeAt>0){
        videoDirectId=aiActiveVideoId; wantContinue=true;
      }
      else if(pid){
        if(pid!==aiActiveVideoId){
          aiActiveVideoId=pid;
          aiVideoResumeAt=0;
        }
        if(isPageQuery || refersVideo || aiActiveVideoId===pid) videoDirectId=pid;
      }
      else if(refersVideo&&aiActiveVideoId){
        videoDirectId=aiActiveVideoId;
      }
      else if(aiSettings.autoVideo&&pid){
        videoDirectId=pid;
      }
    }
  }catch(e){}
  let pageImages=[];
  if(isPageQuery && !_imageForApi && aiSettings.includeImages && provider!=="custom" && pageText){ try{ pageImages=await aiGetPageImages(); }catch(e){} }
  if(isPageQuery && aiSettings.includeSource){ try{ const srcRaw=await aiGetPageSourceText(); if(srcRaw){ const winSrc=aiSelectRelevantWindow(srcRaw, cleanQuery, 1600); pageText = pageText ? pageText+"\n\n[Raw page source + scripts - relevant excerpt]\n"+winSrc : winSrc; } }catch(e){} }
  /* ── Add multi-page context from pinned pages (aiPages) ──
     Building a "pinnedNote" that ALWAYS reaches the model (regardless of page-intent):
     when the current tab IS a pinned page, its stored snapshot becomes the single
     source of truth (pageText) so in-page and outside answers match exactly. */
  let pinnedNote="";
  if(aiPages.length > 0) {
    const curPg = pageUrl ? aiPages.find(pg=>pg.url===pageUrl) : null;
    var multiPageCtx = "";
    aiPages.forEach(function(pg) {
      const curMark = (curPg && pg.url===curPg.url) ? " ✓" : "";
      if(pg.text) { multiPageCtx += "\n\n[Trang" + curMark + ": " + (pg.url||"") + (pg.title?" | "+pg.title:"") + "]\n" + pg.text.slice(0, 8000); }
    });
    if(multiPageCtx) {
      if(isPageQuery && curPg && curPg.text) pageText = multiPageCtx;
      else pinnedNote = multiPageCtx;
    }
  }
  const apiImages=_imageForApi?[{data:_imageForApi.data,mimeType:_imageForApi.mimeType||"image/jpeg"}]:pageImages;
  const imageNote=apiImages.length?("[Attached images: "+apiImages.length+" taken from the current page. If the question needs visual info (counting objects, reading text in the image), answer from these images.]"):null;
  const webSearchEnabled=((aiSettings.webSearch!==false)&&aiSettings.scope!=="only")||forceGround;
  let multiWebNote="";
  let multiWebSources=[];
  if(webSearchEnabled&&!quickReq){
    aiUpdateTypingStatus("⚡ [" + pipeline.label + "] 2/3: " + pipeline.steps[1]);
    try{
      const sRes=await aiSearchMultiSources(cleanQuery);
      if(sRes&&sRes.text){
        multiWebNote=sRes.text;
        multiWebSources=sRes.sources||[];
      }
    }catch(e){}
  }
  const prompt=aiBuildPrompt(raw, pageText, selectionText, imageNote, pinnedNote, {url:pageUrl||"", title:(function(){ try{ if(typeof currentMeta!=="undefined"&&currentMeta&&currentMeta.title) return String(currentMeta.title); if(typeof currentTabObj!=="undefined"&&currentTabObj&&currentTabObj.title) return String(currentTabObj.title); }catch(e){} return document.title||""; })(), videoId:aiIsYouTubeUrl(pageUrl)?aiExtractYouTubeId(pageUrl):""}, (function(){ try{ return aiMemFor(pageUrl)||""; }catch(e){ return ""; } })(), multiWebNote, isPageQuery, pipeline);
  let answer=""; let usedFallback=false; let callOpts=null;
  if(!aiHasKey(provider)){
    const label=aiGetProviderConfig(provider).label;
    const needKeyMsg=(typeof getI18nText==="function")?getI18nText("ai_need_key",[label]):"⚠️ Chưa nhập API key cho "+label+". Hãy bấm ⚙ Cài đặt → nhập key (Gemini free tại aistudio.google.com). Đã chuẩn hoá: chỉ gửi 4000 ký tự đầu để tiết kiệm token.";
    answer=needKeyMsg+"\n\n--- Context preview that will be sent (first ~5000 chars) ---\n"+prompt.slice(0,1200)+(prompt.length>1200?"...":"")+"\n\n("+aiLocalFallback(prompt, pageText)+")";
    usedFallback=true; if(typeof showToast==="function") showToast("ai_toast_need_key","warning");
  } else {
    aiUpdateTypingStatus("⚡ [" + pipeline.label + "] 3/3: " + pipeline.steps[2]);
    callOpts={signal:aiAbort.signal, onToken:onToken, groundOverride:forceGround, isPageQuery:isPageQuery, skill:detectedSkill, pipeline:pipeline, __groundingSources:multiWebSources.slice()};
    try{
      if(videoDirectId){
        let isLiveStream=false;
        let vidLen=0;
        try{
          const _onTabVid=aiIsYouTubeUrl(pageUrl)?aiExtractYouTubeId(pageUrl):"";
          if(videoDirectId===_onTabVid){
            vidLen=await aiGetYtLengthSec();
            isLiveStream=await aiCheckYtLive();
          }
        }catch(e){}
        if(!isLiveStream){
          if(typeof showToast==="function") showToast("ai_toast_watching_video","info");
          const vIsTranscript = wantContinue || aiIsTranscriptRequest(cleanQuery);
          let vQuestion = cleanQuery;
          if(wantContinue && aiVideoResumeAt>0) vQuestion = "TIẾP TỤC: chép NGUYÊN VĂN lời nói/tiếng từ SAU mốc "+_aiMMSS(aiVideoResumeAt)+" đến HẾT video, theo dòng thời gian, mỗi phát ngôn một dòng '[mm:ss] <lời>'. KHÔNG lặp lại các dòng đã có ở lượt trước.\n\n[Yêu cầu]\n"+cleanQuery;
          let vans="";
          try{ vans=await aiCallGeminiVideo(videoDirectId, vQuestion, key, hist, callOpts, vIsTranscript, vidLen); }catch(ve){ if(aiUserStopped) throw ve; vans=""; }
          if(vans&&String(vans).trim()){
            answer=String(vans).trim();
            aiActiveVideoId=String(videoDirectId);
            aiVideoResumeAt=aiLastTimestampSec(answer);
          }
        }
      }
      if(!answer){
        if(streaming){ await aiCallProvider(provider, prompt, key, apiImages, hist, callOpts); answer=String(streamAcc||""); }
        else answer=await aiCallProvider(provider, prompt, key, apiImages, hist, callOpts);
      }
    }catch(e){
      if(aiUserStopped){
        answer=String(streamAcc||"")+"\n\n"+aiT("ai_toast_stopped",null,"⏹ Đã dừng tạo câu trả lời."); usedFallback=true; if(typeof showToast==="function") showToast("ai_toast_stopped","warning");
      } else {
      const msg0=(e&&e.message)?e.message:"unknown";
      if(provider==="gemini"&&/timeout|timed out|abort|429|503|504|408|overload/i.test(String(msg0))){
        try{
          const lite=await aiCallGeminiLite(prompt, key, apiImages, hist);
          if(lite&&lite.text){ answer=lite.text; aiSetModel("gemini",lite.model); aiUpdateProviderUI(); if(typeof showToast==="function") showToast("ai_toast_auto_fallback","info",[lite.model]); }
        }catch(e2){}
      }
      if(!answer){
      const msg=msg0; let hint="";
      if(String(msg).toLowerCase().includes("timed out")||String(msg).toLowerCase().includes("timeout")||String(msg).toLowerCase().includes("abort")) hint="\n\n"+aiT("ai_hint_timeout",[aiGetModel(provider)],"⏱️ Model "+aiGetModel(provider)+" overloaded/timeout - switch to a Lite model in Settings");
      else if(String(msg).includes("404")&&provider==="gemini") hint="\n\n"+aiT("ai_hint_404",[aiGetModel(provider)],"💡 Gợi ý tiết kiệm token: Model "+aiGetModel(provider)+" không khả dụng (404). Hãy bấm ⚙ → Gợi ý model → chọn Lite.");
      else if((String(msg).includes("custom_url_blocked")||String(msg).includes("custom_redirect_blocked"))&&typeof showToast==="function") showToast("ai_toast_url_blocked","warning");
      answer=String(aiT("ai_err_prefix",[aiGetProviderConfig(provider).label,aiGetModel(provider)],"❌ Lỗi gọi "+aiGetProviderConfig(provider).label+" ("+aiGetModel(provider)+"): ")+msg+hint).slice(0,8000); usedFallback=true; if(typeof showToast==="function") showToast("ai_toast_error","error");
      }
      }
    }
  }
  /* Clean answer: strip any inline citation tags, URLs or memory notes */
  if(!usedFallback&&String(answer||"").trim()){
    answer=aiCleanFormatting(answer);
  }
  aiHideTyping();
  if(streaming){ const last=aiHistory[aiHistory.length-1]; if(streamRow&&last&&last.role==="assistant"){ last.content=String(answer).slice(0,16000); aiSaveHistorySoon(); aiRenderHistory(); } else if(answer){ aiAppendMessage("assistant", answer, provider); } }
  else { aiAppendMessage("assistant", answer, provider); }
  if(!usedFallback){ try{ aiMemRemember(pageUrl, raw); aiSessionsSaveCurrent(); }catch(e){} }
  if(!usedFallback&&typeof showToast==="function") showToast("ai_toast_done","success");
  aiIsSending=false; aiAbort=null;
  if(sendBtn){ sendBtn.classList.remove("is-stop"); sendBtn.textContent=(typeof getI18nText==="function")?getI18nText("ai_btn_send"):"Gửi"; sendBtn.title=aiT("ai_btn_send_title",null,"Gửi câu hỏi (Enter)"); }
}
async function aiRegenerate(){
  if(aiIsSending) return;
  let aIdx=-1; for(let i=aiHistory.length-1;i>=0;i--){ if(aiHistory[i].role==="assistant"){ aIdx=i; break; } }
  let uIdx=-1; for(let i=(aIdx===-1?aiHistory.length-1:aIdx-1);i>=0;i--){ if(aiHistory[i].role==="user"){ uIdx=i; break; } }
  if(uIdx===-1){ if(typeof showToast==="function") showToast("ai_toast_no_answer","warning"); return; }
  const q=String(aiHistory[uIdx].content||"");
  aiHistory.splice(uIdx, aiHistory.length-uIdx); aiSaveHistorySoon(); aiRenderHistory();
  const input=document.getElementById("ai-input"); if(input){ input.value=q; }
  await aiSendCurrent();
}
function aiQuickPrompt(kind){
  const map={
    summary:aiPrompts.summary||((typeof getI18nText==="function")?getI18nText("ai_prompt_summary"):"Tóm tắt trang này thành 5 bullet + 1 đoạn 100 chữ."),
    qa:aiPrompts.qa||((typeof getI18nText==="function")?getI18nText("ai_prompt_qa"):"Trả lời câu hỏi dựa trên nội dung trang."),
    explain:aiPrompts.explain||((typeof getI18nText==="function")?getI18nText("ai_prompt_explain"):"Giải thích đoạn bôi đen bằng tiếng Việt đơn giản."),
    translate:aiPrompts.translate||((typeof getI18nText==="function")?getI18nText("ai_prompt_translate"):"Dịch nội dung chính sang tiếng Việt."),
    outline:aiPrompts.outline||((typeof getI18nText==="function")?getI18nText("ai_prompt_outline"):"Tạo outline 3 cấp cho bài viết này."),
    timeline:aiPrompts.timeline||((typeof getI18nText==="function")?getI18nText("ai_prompt_timeline"):"Tạo danh sách các mốc thời gian (timeline/chương) quan trọng của video hoặc bài viết theo định dạng:\n- [mm:ss] Tiêu đề chương: tóm tắt ngắn nội dung chính."),
    flashcard:aiPrompts.flashcard||((typeof getI18nText==="function")?getI18nText("ai_prompt_flashcard"):"Tạo 5 thẻ flashcard ôn tập kiến thức cốt lõi từ nội dung trang theo định dạng:\nQ: [Câu hỏi ôn tập]\nA: [Câu trả lời giải thích chi tiết]"),
    cite:aiPrompts.cite||((typeof getI18nText==="function")?getI18nText("ai_prompt_cite"):"Gợi ý 3 câu hỏi nghiên cứu + 5 từ khóa từ trang này."),
    answer:aiPrompts.answer||((typeof getI18nText==="function")?getI18nText("ai_prompt_answer"):"Giải các câu trắc nghiệm trong nội dung trang: mỗi câu nêu đáp án đúng kèm giải thích 1 dòng."),
    tabs:aiPrompts.tabs||((typeof getI18nText==="function")?getI18nText("ai_prompt_tabs"):"Tóm tắt từng tab đang mở và lập bảng so sánh."),
    papers:aiPrompts.papers||((typeof getI18nText==="function")?getI18nText("ai_prompt_papers"):"Chọn 5 tài liệu liên quan nhất từ danh sách tìm được, trích dẫn APA.")
  };
  if(kind==="tabs") aiQuickCtx={kind:"tabs"};
  else if(kind==="papers") aiQuickCtx={kind:"papers"};
  else aiQuickCtx={kind:"page"}; /* page-bound chips: summary/qa/explain/translate/outline/timeline/flashcard/cite/answer */
  const input=document.getElementById("ai-input"); if(input){ input.value=map[kind]||map.summary; input.focus(); } aiSendCurrent();
}
function aiUpdateCompanionUI(enabled){
  const optCompanions = document.querySelectorAll("#ai-opt-companion");
  const btnToggleCompanions = document.querySelectorAll("#ai-btn-toggle-companion");
  optCompanions.forEach(opt => opt.checked = !!enabled);
  btnToggleCompanions.forEach(btnToggleCompanion => {
    const txt = enabled ? aiT("ai_btn_disable_companion",null,"Tắt popup") : aiT("ai_opt_reading_companion_enable",null,"Bật lại");
    btnToggleCompanion.textContent = txt;
    btnToggleCompanion.setAttribute("data-i18n", enabled ? "ai_btn_disable_companion" : "ai_opt_reading_companion_enable");
    if(enabled){
      btnToggleCompanion.classList.remove("btn-primary");
      btnToggleCompanion.classList.add("btn-secondary");
    } else {
      btnToggleCompanion.classList.remove("btn-secondary");
      btnToggleCompanion.classList.add("btn-primary");
    }
  });
}
function aiSetCompanionEnabled(enabled, notify=false){
  aiSettings.readingCompanion=!!enabled;
  aiSaveSettings();
  try{
    const _st = (typeof chrome!=="undefined"&&chrome.storage&&chrome.storage.local)?chrome.storage.local:((typeof browser!=="undefined"&&browser.storage&&browser.storage.local)?browser.storage.local:null);
    if(_st){
      _st.set({reading_companion_enabled:!!enabled});
    }
  }catch(e){}
  aiUpdateCompanionUI(!!enabled);
  if(notify && typeof showToast==="function"){
    showToast(enabled?"ai_toast_companion_enabled":"ai_toast_companion_disabled", enabled?"success":"info");
  }
}
function aiSyncCompanionFromStorage(){
  try{
    const _st = (typeof chrome!=="undefined"&&chrome.storage&&chrome.storage.local)?chrome.storage.local:((typeof browser!=="undefined"&&browser.storage&&browser.storage.local)?browser.storage.local:null);
    if(_st){
      _st.get(["reading_companion_enabled"],res=>{
        const isEn=(res&&typeof res.reading_companion_enabled==="boolean")?res.reading_companion_enabled:(typeof aiSettings.readingCompanion==="boolean"?aiSettings.readingCompanion:true);
        aiUpdateCompanionUI(isEn);
      });
    } else {
      aiUpdateCompanionUI(typeof aiSettings.readingCompanion==="boolean"?aiSettings.readingCompanion:true);
    }
  }catch(e){
    aiUpdateCompanionUI(true);
  }
}
function aiInitEvents(){
  const favImg=document.getElementById("ai-page-favicon"); if(favImg) favImg.addEventListener("error",()=>{ aiFavState.src=null; aiApplyFavicon(); });
  const chatHist=document.getElementById("ai-chat-history");
  if(chatHist) {chatHist.addEventListener("click",e=>{
    const tgt=e.target; const sp=(tgt&&tgt.closest)?tgt.closest(".ai-ts"):null; if(!sp) return;
    const secs=Number(sp.getAttribute("data-ts"))||0;
    if(typeof sendTabMessage!=="function") return;
    sendTabMessage({action:"YT_SEEK",seconds:secs},r=>{ if((!r||!r.success)&&typeof showToast==="function") showToast("ai_toast_no_video","warning"); });
  });}
  document.querySelectorAll(".ai-provider-pill").forEach(btn=>{ btn.addEventListener("click",()=>{ aiProvider=btn.dataset.provider; aiSaveProvider(); aiUpdateProviderUI(); }); });
  const sel=document.getElementById("ai-provider-select"); if(sel) sel.addEventListener("change",()=>{ aiProvider=sel.value; aiSaveProvider(); aiUpdateProviderUI(); });
  ["ai-key-input","ai-key-input-modal"].forEach(kid=>{ const el=document.getElementById(kid); if(!el) return; el.addEventListener("change",()=>{ aiKeys[aiProvider]=el.value.trim(); aiSaveKeys(); aiUpdateProviderUI(); }); el.addEventListener("input",()=>{ const other=document.getElementById(kid==="ai-key-input"?"ai-key-input-modal":"ai-key-input"); if(other&&other.value!==el.value) other.value=el.value; const st=document.getElementById("ai-key-status"); if(st){ const has=el.value.trim().length>8; st.textContent=has?aiT("ai_key_entered",null,"Đã nhập"):aiT("ai_key_missing",null,"○ Chưa nhập key"); st.className=has?"ai-status is-connected":"ai-status"; } }); });
  ["ai-btn-save-key-main"].forEach(bid=>{ const btn=document.getElementById(bid); if(!btn) return; btn.addEventListener("click",()=>{ const src=document.getElementById("ai-key-input-modal")?.value?.trim()?document.getElementById("ai-key-input-modal"):document.getElementById("ai-key-input"); if(!src) return; aiKeys[aiProvider]=src.value.trim(); aiSaveKeys(); aiUpdateProviderUI(); if(typeof showToast==="function") showToast("ai_toast_saved","success"); }); });
  const clearKeyBtn=document.getElementById("ai-btn-clear-key");
  if(clearKeyBtn) clearKeyBtn.addEventListener("click",()=>{ delete aiKeys[aiProvider]; aiSaveKeys(); aiUpdateProviderUI(); ["ai-key-input","ai-key-input-modal"].forEach(id=>{const e=document.getElementById(id); if(e) e.value="";}); if(typeof showToast==="function") showToast("ai_toast_cleared","success"); });
  const openBtn=document.getElementById("ai-btn-open-provider");
  if(openBtn) openBtn.addEventListener("click",()=>{ const cfg=aiGetProviderConfig(aiProvider); const mode=openBtn.getAttribute("data-mode"); let url=""; if(mode==="web"&&cfg.webUrl) url=cfg.webUrl; else url=cfg.loginUrl||cfg.helpUrl||cfg.webUrl; if(!url) return; const tabsApi=(typeof browser!=="undefined"&&browser.tabs)?browser.tabs:(typeof chrome!=="undefined"?chrome.tabs:null); if(tabsApi&&tabsApi.create) tabsApi.create({url:url}); else window.open(url,"_blank"); });
  document.querySelectorAll("[data-ai-quick]").forEach(btn=>{ btn.addEventListener("click",()=>aiQuickPrompt(btn.dataset.aiQuick)); });
  const sendBtn=document.getElementById("ai-btn-send"); if(sendBtn) sendBtn.addEventListener("click",()=>{ if(aiIsSending){ if(aiAbort){ aiUserStopped=true; try{ aiAbort.abort(); }catch(e){} } return; } aiSendCurrent(); });
  const input=document.getElementById("ai-input"); if(input){ input.addEventListener("keydown",e=>{ if(e.key==="Enter"&&!e.shiftKey){ e.preventDefault(); aiSendCurrent(); }});
    input.addEventListener("input",()=>{ aiGrowInput(input); });
  }
  /* Floating "↓ newest" pill over the chat + copy-conversation (Markdown) */
  const jumpBtn=document.createElement("button"); jumpBtn.type="button"; jumpBtn.id="ai-btn-latest"; jumpBtn.className="ai-jump-latest"; jumpBtn.title=aiT("ai_btn_jump_latest",null,"Tới tin mới nhất"); jumpBtn.setAttribute("aria-label",aiT("ai_btn_jump_latest",null,"Tới tin mới nhất"));
  jumpBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14l-7 7m0 0l-7-7m7 7V3"></path></svg>';
  jumpBtn.addEventListener("click",()=>{ aiScrollToBottom(); aiUpdateLatestBtn(); });
  const chatWrap=document.querySelector(".ai-chat-wrapper"); if(chatWrap) chatWrap.appendChild(jumpBtn);
  const chatScrollEl=document.getElementById("ai-chat-history");
  if(chatScrollEl) chatScrollEl.addEventListener("scroll",()=>{ if(aiUpdateLatestBtn._q) return; aiUpdateLatestBtn._q=true; requestAnimationFrame(()=>{ aiUpdateLatestBtn._q=false; aiUpdateLatestBtn(); }); });
  const copyConvoBtn=document.getElementById("ai-btn-copy-convo"); if(copyConvoBtn) copyConvoBtn.addEventListener("click",()=>{ if(!aiHistory.length){ if(typeof showToast==="function") showToast("ai_toast_convo_empty","warning"); return; } try{ navigator.clipboard.writeText(aiConversationMarkdown()).then(()=>{ if(typeof showToast==="function") showToast("toast_copied","success"); }); }catch(e){} });
  const exportBtn=document.getElementById("ai-btn-export");
  const exportMenu=document.getElementById("ai-export-menu");
  if(exportBtn&&exportMenu){
    exportBtn.addEventListener("click",(e)=>{
      e.stopPropagation();
      exportMenu.classList.toggle("is-hidden");
    });
    document.addEventListener("click",(e)=>{
      if(!exportMenu.classList.contains("is-hidden")&&!exportMenu.contains(e.target)&&e.target!==exportBtn){
        exportMenu.classList.add("is-hidden");
      }
    });
  }
  const exportMdBtn=document.getElementById("ai-btn-export-md");
  if(exportMdBtn) {exportMdBtn.addEventListener("click",()=>{
    if(exportMenu) exportMenu.classList.add("is-hidden");
    aiExportMarkdown();
  });}
  const exportAnkiBtn=document.getElementById("ai-btn-export-anki");
  if(exportAnkiBtn) {exportAnkiBtn.addEventListener("click",()=>{
    if(exportMenu) exportMenu.classList.add("is-hidden");
    aiExportAnki();
  });}
  const clearBtn=document.getElementById("ai-btn-clear-chat"); if(clearBtn) clearBtn.addEventListener("click",aiClearHistory);
  const newChatBtn=document.getElementById("ai-btn-new-chat"); if(newChatBtn) newChatBtn.addEventListener("click",()=>{ const dt=(function(){ try{ return new Date().toLocaleString(); }catch(e){ return ""; } })(); aiSessionsNew(aiT("ai_session_default_name",null,"Phiên")+" "+dt); if(typeof showToast==="function") showToast("ai_toast_session_saved","success"); });
  const copyBtn=document.getElementById("ai-btn-copy-last"); if(copyBtn) copyBtn.addEventListener("click",()=>{ const last=aiHistory.slice().reverse().find(m=>m.role==="assistant"); if(!last){ if(typeof showToast==="function") showToast("ai_toast_no_answer","warning"); return; } navigator.clipboard.writeText(last.content).then(()=>{ if(typeof showToast==="function") showToast("toast_copied","success"); }).catch(()=>{ if(typeof showToast==="function") showToast("toast_copy_failed","error"); }); });
  const insertBtn=document.getElementById("ai-btn-insert-note"); if(insertBtn) insertBtn.addEventListener("click",()=>{ const last=aiHistory.slice().reverse().find(m=>m.role==="assistant"); if(!last){ if(typeof showToast==="function") showToast("ai_toast_no_answer","warning"); return; } const notesEl=document.getElementById("f-notes"); if(!notesEl) return; const sep=notesEl.value.trim()?"\n\n":""; notesEl.value=notesEl.value+sep+last.content.slice(0,2000); notesEl.dispatchEvent(new Event("input",{bubbles:true})); if(typeof showToast==="function") showToast("toast_notes_inserted","success"); });
  ["ai-opt-page","ai-opt-selection","ai-opt-notes","ai-opt-images","ai-opt-source","ai-opt-stream","ai-opt-websearch","ai-opt-autovideo"].forEach(id=>{ const el=document.getElementById(id); if(!el) return; el.addEventListener("change",()=>{ if(id==="ai-opt-page") aiSettings.includePage=el.checked; if(id==="ai-opt-selection") aiSettings.includeSelection=el.checked; if(id==="ai-opt-notes") aiSettings.includeNotes=el.checked; if(id==="ai-opt-images") aiSettings.includeImages=el.checked; if(id==="ai-opt-source") aiSettings.includeSource=el.checked; if(id==="ai-opt-stream") aiSettings.stream=el.checked; if(id==="ai-opt-websearch") aiSettings.webSearch=el.checked; if(id==="ai-opt-autovideo") aiSettings.autoVideo=el.checked; aiSaveSettings(); }); });
  document.addEventListener("change", (e) => {
    if (e.target && e.target.id === "ai-opt-companion") {
      aiSetCompanionEnabled(e.target.checked, true);
    }
  });
  document.addEventListener("click", (e) => {
    if (e.target && e.target.id === "ai-btn-toggle-companion") {
      aiSetCompanionEnabled(!aiSettings.readingCompanion, true);
    }
  });
  const modalContainer = document.getElementById('modal-container');
  if (modalContainer) {
    modalContainer.addEventListener('modal-loaded', (e) => {
      if (e.detail === 'ai-settings') {
        aiUpdateCompanionUI(aiSettings.readingCompanion);
      }
    });
  }
  aiSyncCompanionFromStorage();
  const scopeSel=document.getElementById("ai-scope-select"); if(scopeSel) scopeSel.addEventListener("change",()=>{ aiSettings.scope=["only","auto","web"].includes(scopeSel.value)?scopeSel.value:"auto"; aiSaveSettings(); });
  const btnWeb=document.getElementById("ai-btn-web-search"); if(btnWeb) btnBtnWire(btnWeb);
  function btnBtnWire(btn){ btn.addEventListener("click",async()=>{
    if(aiIsSending) return;
    const inp=document.getElementById("ai-input"); const typed=inp?inp.value.trim():"";
    let q=typed; if(!q){ for(let i=aiHistory.length-1;i>=0;i--){ if(aiHistory[i].role==="user"){ q=String(aiHistory[i].content||""); break; } } }
    if(!q){ if(typeof showToast==="function") showToast("ai_toast_empty","warning"); return; }
    if(aiProvider!=="gemini"){ if(typeof showToast==="function") showToast("ai_toast_web_need_gemini","warning"); return; }
    if(typeof showToast==="function") showToast("ai_toast_web_searching","info");
    aiForceGround=true;
    if(inp) inp.value="";
    if(typed){ aiSendCurrent(); } else { aiRegenerate(); }
  }); }
  ["ai-btn-toggle-key","ai-btn-toggle-key-main"].forEach(tid=>{ const btn=document.getElementById(tid); if(!btn) return; btn.addEventListener("click",()=>{ ["ai-key-input","ai-key-input-modal","ai-key-gemini","ai-key-openai","ai-key-claude"].forEach(id=>{ const inp=document.getElementById(id); if(inp) inp.type=inp.type==="password"?"text":"password"; }); }); });
  const btnSessions=document.getElementById("ai-btn-sessions"); if(btnSessions) btnSessions.addEventListener("click",aiShowSessions);
  const btnCloseSessions=document.getElementById("ai-btn-close-sessions"); if(btnCloseSessions) btnCloseSessions.addEventListener("click",aiHideSessions);
  const sessBackdrop=document.getElementById("ai-sessions-backdrop"); if(sessBackdrop) sessBackdrop.addEventListener("click",aiHideSessions);
  const sessSearch=document.getElementById("ai-session-search"); if(sessSearch) sessSearch.addEventListener("input",aiRenderSessions);
  const sessNew=document.getElementById("ai-btn-new-session"); if(sessNew) sessNew.addEventListener("click",()=>{ const dt=(function(){ try{ return new Date().toLocaleString(); }catch(e){ return ""; } })(); aiSessionsNew(aiT("ai_session_default_name",null,"Phiên")+" "+dt); aiRenderSessions(); if(typeof showToast==="function") showToast("ai_toast_session_saved","success"); });
  const openSettings=document.getElementById("ai-btn-open-settings"); const closeSettings=document.getElementById("ai-btn-close-settings"); const backdrop=document.getElementById("ai-settings-backdrop"); const modal=document.getElementById("ai-settings-modal"); const changeModelBtn=document.getElementById("ai-btn-change-model"); const showModal=()=>{ if(modal) modal.style.display="flex"; aiPopulateModelSelect(); aiRenderCustomServers(); aiSyncCompanionFromStorage(); }; const hideModal=()=>{ if(modal) modal.style.display="none"; }; if(openSettings) openSettings.addEventListener("click",showModal); if(changeModelBtn) changeModelBtn.addEventListener("click",showModal); if(closeSettings) closeSettings.addEventListener("click",hideModal); if(backdrop) backdrop.addEventListener("click",hideModal);
  const modelSel=document.getElementById("ai-model-select"); if(modelSel) modelSel.addEventListener("change",()=>aiOnModelChange(modelSel.value));
  const addServerBtn=document.getElementById("ai-btn-add-server"); if(addServerBtn) addServerBtn.addEventListener("click",aiAddCustomServer);
  const fetchBtn=document.getElementById("ai-btn-fetch-models");
  if(fetchBtn) {fetchBtn.addEventListener("click",async()=>{
    const key=(document.getElementById("ai-key-input")?.value?.trim()||document.getElementById("ai-key-input-modal")?.value?.trim()||aiKeys["gemini"]||"").trim();
    if(!key||key.length<10){ if(typeof showToast==="function") showToast("ai_toast_need_key","warning"); return; }
    const orig=fetchBtn.textContent; fetchBtn.disabled=true; fetchBtn.textContent="...";
    if(typeof showToast==="function") showToast("ai_toast_models_loading","info");
    const list=await aiFetchGeminiModels(key);
    fetchBtn.disabled=false; fetchBtn.textContent=(typeof getI18nText==="function")?getI18nText("ai_btn_fetch_models"):orig;
    if(list.length){ aiPopulateModelSelect(); if(typeof showToast==="function") showToast("ai_toast_models_ok","success",[list.length]); const cur=aiGetModel("gemini"); if(!list.includes(cur)){ aiSetModel("gemini",list[0]); aiUpdateProviderUI(); } } else { if(typeof showToast==="function") showToast("ai_toast_models_fail","error"); }
  });}
  const customUrl=document.getElementById("ai-custom-url");
  if(customUrl) customUrl.addEventListener("change",()=>{ const v=customUrl.value.trim(); if(v&&!aiValidateCustomUrl(v)){ if(typeof showToast==="function") showToast("ai_toast_url_blocked","warning"); customUrl.value=aiKeys["custom"]||""; return; } aiKeys["custom"]=v; storSet({[AI_STORAGE_KEYS.keys]:aiKeys}); });
  const tempRange=document.getElementById("ai-temp-range"); const tempVal=document.getElementById("ai-temp-val");
  if(tempRange){ const sync=()=>{ const v=parseFloat(tempRange.value); aiSettings.temperature=isFinite(v)?v:0.7; if(tempVal) tempVal.textContent=String(aiSettings.temperature); aiSaveSettings(); }; tempRange.addEventListener("input",sync); tempRange.addEventListener("change",sync); if(tempVal) tempVal.textContent=String(aiSettings.temperature); tempRange.value=String(aiSettings.temperature); }
  const mainModelSel=document.getElementById("ai-model-select-main"); if(mainModelSel) mainModelSel.addEventListener("change",()=>aiOnModelChange(mainModelSel.value));
  [["ai-key-gemini","gemini"],["ai-key-openai","openai"],["ai-key-claude","claude"]].forEach(([id,prov])=>{ const el=document.getElementById(id); if(!el) return; el.addEventListener("change",()=>{ aiKeys[prov]=el.value.trim(); aiSaveKeys(); aiUpdateProviderUI(); }); el.addEventListener("input",()=>{ aiKeys[prov]=el.value.trim(); }); });
  const saveAllBtn=document.getElementById("ai-btn-save-key"); if(saveAllBtn) saveAllBtn.addEventListener("click",()=>{ ["gemini","openai","claude"].forEach(p=>{ const e=document.getElementById("ai-key-"+p); if(e) aiKeys[p]=e.value.trim(); }); const mm=document.getElementById("ai-key-input-modal"); if(mm&&mm.value.trim()) aiKeys[aiProvider]=mm.value.trim(); aiSaveKeys(); aiUpdateProviderUI(); if(typeof showToast==="function") showToast("ai_toast_saved","success"); });
  const promptIds=["summary","qa","explain","translate","outline","timeline","flashcard","cite","answer","tabs","papers"];
  promptIds.forEach(k=>{ const el=document.getElementById("ai-prompt-"+k); if(el) el.value=aiPrompts[k]||aiDefaultPrompts()[k]||""; });
  const savePromptsBtn=document.getElementById("ai-btn-save-prompts"); if(savePromptsBtn) savePromptsBtn.addEventListener("click",()=>{ promptIds.forEach(k=>{ const el=document.getElementById("ai-prompt-"+k); if(el) aiPrompts[k]=el.value.trim()||AI_DEFAULT_PROMPTS[k]; }); storSet({[AI_STORAGE_KEYS.prompts]:aiPrompts}); if(typeof showToast==="function") showToast("ai_toast_prompts_saved","success"); });
  const resetPromptsBtn=document.getElementById("ai-btn-reset-prompts"); if(resetPromptsBtn) resetPromptsBtn.addEventListener("click",()=>{ aiPrompts=aiDefaultPrompts(); try{ storRemove([AI_STORAGE_KEYS.prompts]); }catch(e){} promptIds.forEach(k=>{ const el=document.getElementById("ai-prompt-"+k); if(el) el.value=aiPrompts[k]; }); if(typeof showToast==="function") showToast("ai_toast_prompts_reset","success"); });
  const copyPageBtn=document.getElementById("ai-btn-copy-page"); if(copyPageBtn) copyPageBtn.addEventListener("click",()=>{ const u=document.getElementById("ai-page-url"); const t=u?u.textContent:""; if(t&&t!=="—") navigator.clipboard.writeText(t).then(()=>{ if(typeof showToast==="function") showToast("toast_copied","success"); }); });
  const addPageBtn=document.getElementById("ai-btn-add-page"); if(addPageBtn) addPageBtn.addEventListener("click",async()=>{ const info=aiGetCurrentPageInfo(); if(!info.url){ if(typeof showToast==="function") showToast("ai_toast_no_page","warning"); return; } if(aiPages.some(p=>p.url===info.url)){ if(typeof showToast==="function") showToast("ai_toast_page_added","success",[info.title||info.url]); return; } let pgText=""; try{ pgText=await aiGetPageContextText(""); }catch(e){} aiAddPage({ url:info.url, title:info.title, favicon:info.favicon, text:pgText }); if(typeof showToast==="function") showToast("ai_toast_page_added","success",[info.title||info.url]); });
  const clearPagesBtn=document.getElementById("ai-btn-clear-pages"); if(clearPagesBtn) clearPagesBtn.addEventListener("click",()=>{ aiPages=[]; aiRenderPages(); });
  const attachBtn=document.getElementById("ai-btn-attach-image"); const imgInput=document.getElementById("ai-image-input"); const preview=document.getElementById("ai-image-preview"); const thumb=document.getElementById("ai-image-thumb"); const nameEl=document.getElementById("ai-image-name"); const removeBtn=document.getElementById("ai-btn-remove-image");
  if(attachBtn&&imgInput){ attachBtn.addEventListener("click",()=>imgInput.click()); imgInput.addEventListener("change",()=>{ const f=imgInput.files&&imgInput.files[0]; if(!f) return; aiAttachImageFile(f); }); }
  const pasteHandler=(e)=>{ const cd=e.clipboardData||null; if(!cd||!cd.items) return; let img=null; for(const it of cd.items){ try{ if(it.kind==="file"&&it.type&&it.type.startsWith("image/")){ img=it.getAsFile(); if(img) break; } }catch(e2){} } if(img){ if(e.preventDefault) e.preventDefault(); aiAttachImageFile(img); } };
  const aiInputEl=document.getElementById("ai-input"); if(aiInputEl) aiInputEl.addEventListener("paste",pasteHandler); if(chatHist) chatHist.addEventListener("paste",pasteHandler);
  if(removeBtn) removeBtn.addEventListener("click",()=>{ aiAttachedImage=null; if(imgInput) imgInput.value=""; const p=document.getElementById("ai-image-preview"); if(p) p.style.display="none"; });
}
async function initAI(){
  await aiLoadSettings(); aiUpdateProviderUI();
  const page=document.getElementById("ai-opt-page"); const sel=document.getElementById("ai-opt-selection"); const notes=document.getElementById("ai-opt-notes"); const imgs=document.getElementById("ai-opt-images"); const src=document.getElementById("ai-opt-source"); const strm=document.getElementById("ai-opt-stream");
  if(page) page.checked=!!aiSettings.includePage; if(sel) sel.checked=!!aiSettings.includeSelection; if(notes) notes.checked=!!aiSettings.includeNotes; if(imgs) imgs.checked=!!aiSettings.includeImages; if(src) src.checked=!!aiSettings.includeSource;   if(strm) strm.checked=aiSettings.stream!==false; const wsc=document.getElementById("ai-opt-websearch"); if(wsc) wsc.checked=aiSettings.webSearch!==false; const av=document.getElementById("ai-opt-autovideo"); if(av) av.checked=aiSettings.autoVideo!==false;
  const scp=document.getElementById("ai-scope-select"); if(scp) scp.value=(aiSettings.scope==="only"||aiSettings.scope==="web")?aiSettings.scope:"auto";
  aiRenderHistory(); aiInitEvents(); aiUpdateCurrentPageDisplay(); aiUpdateChatHeight(); setInterval(()=>{ const ta=document.getElementById("tab-ai"); if(ta&&!ta.classList.contains("active")) return; aiUpdateCurrentPageDisplay(); aiUpdateChatHeight(); },2000); window.addEventListener("resize",aiUpdateChatHeight); const aiVisHandler=()=>{ if(document.visibilityState==="visible"){ aiUpdateCurrentPageDisplay(); aiUpdateChatHeight(); } }; document.addEventListener("visibilitychange",aiVisHandler); const tabAi=document.getElementById("tab-ai"); if(tabAi){ const obs=new MutationObserver(()=>{ if(tabAi.classList.contains("active")){ aiUpdateCurrentPageDisplay(); aiUpdateChatHeight(); requestAnimationFrame(()=>requestAnimationFrame(aiScrollToBottom)); } }); obs.observe(tabAi,{attributes:true,attributeFilter:["class"]}); }
  const tabsApi=(typeof browser!=="undefined"&&browser.tabs)?browser.tabs:(typeof chrome!=="undefined"?chrome.tabs:null);
  if(tabsApi&&tabsApi.onActivated){
    try{ tabsApi.onActivated.addListener(()=>{ setTimeout(aiUpdateCurrentPageDisplay,150); }); }catch(e){}
  }
  if(tabsApi&&tabsApi.onUpdated){
    try{ tabsApi.onUpdated.addListener((tabId,changeInfo)=>{ if(changeInfo.status==="complete"||changeInfo.url||changeInfo.title){ setTimeout(aiUpdateCurrentPageDisplay,150); } }); }catch(e){}
  }
}
if(typeof window!=="undefined"){
  window.AI_SKILLS=AI_SKILLS; window.aiDetectSkill=aiDetectSkill;
  window.AI_PIPELINES=AI_PIPELINES; window.aiResolvePipeline=aiResolvePipeline; window.aiUpdateTypingStatus=aiUpdateTypingStatus;
  window.aiExtractViaScripting=aiExtractViaScripting; window.aiExtractViaBackgroundFetch=aiExtractViaBackgroundFetch;
  window.AI_PROVIDERS=AI_PROVIDERS; window.aiValidateCustomUrl=aiValidateCustomUrl; window.aiSanitizeExternal=aiSanitizeExternal; window.aiSanitizeHistory=aiSanitizeHistory; window.aiRateLimitOk=aiRateLimitOk; window.aiSelectRelevantWindow=aiSelectRelevantWindow; window.aiIsYouTubeUrl=aiIsYouTubeUrl; window.aiHistoryToGeminiContents=aiHistoryToGeminiContents; window.aiHistoryToOpenAIMessages=aiHistoryToOpenAIMessages; window.aiHistoryToClaudeMessages=aiHistoryToClaudeMessages; window.aiCollectTabsContext=aiCollectTabsContext; window.aiScholarSearch=aiScholarSearch; window.aiAttachImageFile=aiAttachImageFile; window.aiExtractYouTubeId=aiExtractYouTubeId; window.aiYtMetaViaFetch=aiYtMetaViaFetch; window.aiYtBalancedJson=aiYtBalancedJson; window.aiCallGeminiLite=aiCallGeminiLite; window.aiSig=aiSig; window.aiRegenerate=aiRegenerate; window.aiSelectRelevantWindows=aiSelectRelevantWindows; window.aiSessionsSearch=aiSessionsSearch; window.aiMemKey=aiMemKey; window.aiMemFor=aiMemFor; window.aiRenderSessions=aiRenderSessions; window.aiShowSessions=aiShowSessions; window.aiHideSessions=aiHideSessions; window.aiGetProviderConfig=aiGetProviderConfig; window.aiGetModel=aiGetModel; window.aiSetModel=aiSetModel; window.aiFetchGeminiModels=aiFetchGeminiModels; window.aiHasKey=aiHasKey; window.aiBuildPrompt=aiBuildPrompt; window.aiAddPage=aiAddPage; window.aiRemovePage=aiRemovePage; window.aiRenderPages=aiRenderPages; window.aiGetCurrentPageInfo=aiGetCurrentPageInfo; window.aiLocalFallback=aiLocalFallback; window.aiUseWebBridge=aiUseWebBridge; window.aiContextCovers=aiContextCovers; window.aiCallProvider=aiCallProvider; window.aiLoadSettings=aiLoadSettings; window.aiSaveHistory=aiSaveHistory; window.aiRenderHistory=aiRenderHistory; window.aiScrollToBottom=aiScrollToBottom; window.aiDetectPageIntent=aiDetectPageIntent; window.aiGroundingSources=aiGroundingSources; window.aiSourcesLabel=aiSourcesLabel; window.aiGeminiSupportsGrounding=aiGeminiSupportsGrounding; window.aiGeminiSupportsVideo=aiGeminiSupportsVideo; window.aiGeminiSupportsAgentic=aiGeminiSupportsAgentic; window.aiPickVideoModel=aiPickVideoModel; window.aiVideoContents=aiVideoContents; window.aiCallGeminiVideo=aiCallGeminiVideo; window.aiIsTranscriptRequest=aiIsTranscriptRequest; window.aiQueryRefersToVideo=aiQueryRefersToVideo; window.aiIsContinueRequest=aiIsContinueRequest; window.aiLastTimestampSec=aiLastTimestampSec; window.aiConversationMarkdown=aiConversationMarkdown; window.aiUpdateLatestBtn=aiUpdateLatestBtn; window.aiAppendMessage=aiAppendMessage; window.aiClearHistory=aiClearHistory; window.aiUpdateProviderUI=aiUpdateProviderUI; window.aiPopulateModelSelect=aiPopulateModelSelect; window.aiSendCurrent=aiSendCurrent; window.aiQuickPrompt=aiQuickPrompt; window.initAI=initAI; window.aiProvider=aiProvider; window.aiSettings=aiSettings; window.aiModels=aiModels; window.aiCustomServers=aiCustomServers; window.aiSetCompanionEnabled=aiSetCompanionEnabled; window.aiUpdateCompanionUI=aiUpdateCompanionUI; window.aiOnModelChange=aiOnModelChange; window.aiRenderCustomServers=aiRenderCustomServers; window.aiAddCustomServer=aiAddCustomServer; window.aiUpdateCurrentPageDisplay=aiUpdateCurrentPageDisplay; window.aiGroundingQueries=aiGroundingQueries; window.aiSearchQueriesLabel=aiSearchQueriesLabel; window.aiBuildSystemInstruction=aiBuildSystemInstruction; window.aiSearchMultiSources=aiSearchMultiSources; window.aiDecodeHtmlEntities=aiDecodeHtmlEntities; window.aiExportMarkdown=aiExportMarkdown; window.aiExportAnki=aiExportAnki; window.aiParseTimestampSec=aiParseTimestampSec; window.aiCheckYtLive=aiCheckYtLive;
}
if(document.readyState!=="loading") initAI(); else document.addEventListener("DOMContentLoaded",initAI);
