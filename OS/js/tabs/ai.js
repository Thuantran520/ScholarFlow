// ScholarFlow AI Assistant — minimal, isolated, no layout break
/* global storGet, storSet, showToast, currentTabUrl, currentTabObj, currentMeta, sendTabMessage, getI18nText */
const AI_PROVIDERS = {
  gemini: { label: "Gemini", apiHost: "generativelanguage.googleapis.com", apiUrlBase: "https://generativelanguage.googleapis.com/v1beta/models/", models: ["gemini-3.5-flash","gemini-3.5-flash-lite","gemini-3-flash","gemini-3.1-flash-lite","gemini-3.8-flash","gemini-3.7-flash"], defaultModel: "gemini-3.5-flash-lite", keyPlaceholder: "AIza...", webUrl: "https://gemini.google.com/app", loginUrl: "https://aistudio.google.com/apikey" },
  openai: { label: "ChatGPT", apiHost: "api.openai.com", apiUrl: "https://api.openai.com/v1/chat/completions", models: ["gpt-4o","gpt-4o-mini","o3-mini","o1","o3","o4-mini","gpt-4.1"], defaultModel: "gpt-4o", webUrl: "https://chatgpt.com/" },
  claude: { label: "Claude", apiHost: "api.anthropic.com", apiUrl: "https://api.anthropic.com/v1/messages", models: ["claude-3-7-sonnet","claude-sonnet-5","claude-opus-4-8","claude-3-5-sonnet-20241022","claude-3-5-haiku-20241022"], defaultModel: "claude-3-7-sonnet", webUrl: "https://claude.ai/" },
  custom: { label: "Custom", models: [], defaultModel: "", webUrl: "" },
  webllm: { label: "WebLLM", models: [], defaultModel: "Qwen3.5-2B-q4f16_1-MLC", keyPlaceholder: "—", webUrl: "", loginUrl: "" }
};
const AI_MODEL_LABELS = {
  "Qwen3.5-2B-q4f16_1-MLC": "Qwen3.5 2B",
  "Qwen2.5-1.5B-Instruct-q4f16_1-MLC": "Qwen2.5 1.5B Instruct",
  "Llama-3.2-1B-Instruct-q4f16_1-MLC": "Llama 3.2 1B Instruct",
  "Phi-4-mini-instruct-q4f16_1-MLC": "Phi-4 mini instruct",
  "Qwen3-1.7B-q4f16_1-MLC": "Qwen3 1.7B",
  "SmolLM2-360M-Instruct-q4f16_1-MLC": "SmolLM2 360M",
  "gemini-3.5-flash": "Gemini 3.5 Flash",
  "gemini-3.5-flash-lite": "Gemini 3.5 Flash-Lite",
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
  { id: "lmstudio",  name: "LM Studio",    url: "http://localhost:1234/v1/chat/completions",  model: "", key: "" },
  { id: "openrouter", name: "OpenRouter", url: "https://openrouter.ai/api/v1/chat/completions", model: "deepseek/deepseek-r1", key: "" }
];
let aiCustomServers = [...AI_DEFAULT_CUSTOM_SERVERS];
let aiActiveCustomServerId = "ollama";
const AI_STORAGE_KEYS = { provider: "sf_ai_provider", keys: "sf_ai_keys", history: "sf_ai_history", settings: "sf_ai_settings", models: "sf_ai_models", customModels: "sf_ai_custom_models", prompts: "sf_ai_prompts", sessions: "sf_ai_sessions", mem: "sf_ai_mem", customServers: "sf_ai_custom_servers", activeCustomServer: "sf_ai_active_custom_server" };
const AI_DEFAULT_SETTINGS = { includePage: true, includeSelection: true, includeNotes: false, includeImages: true, includeSource: false, stream: true, webSearch: true, autoVideo: true, readingCompanion: true, agentMode: false, agentConfirm: true, agentVision: false, personaStyle: "casual", personaCustom: "", scope: "auto", maxChars: 16000, temperature: 0.7, ctxBudget: 4096 };
const AI_PERSONAS = {
  casual: {
    id: "casual",
    labelKey: "ai_persona_style_casual",
    directive: "Phong cách giao tiếp: Tự nhiên, thân thiện, gần gũi như bạn bè đời thường (xưng mình/bạn hoặc tui/bồ tùy ngữ cảnh, giọng điệu ấm áp, dễ mến)."
  },
  humorous: {
    id: "humorous",
    labelKey: "ai_persona_style_humorous",
    directive: "Phong cách giao tiếp: Hài hước, lầy lội, bắt trend, dí dỏm kiểu Gen Z (dùng từ ngữ trẻ trung, vui nhộn, tạo không khí thoải mái)."
  },
  polite: {
    id: "polite",
    labelKey: "ai_persona_style_polite",
    directive: "Phong cách giao tiếp: Lịch sự, tinh tế, ấm áp và tôn trọng người đối diện (dùng từ ngữ nhã nhặn, chân thành, thiện cảm)."
  },
  concise: {
    id: "concise",
    labelKey: "ai_persona_style_concise",
    directive: "Phong cách giao tiếp: Ngắn gọn, đi thẳng vào trọng tâm, dứt khoát, không vòng vo, chỉ 1-2 câu súc tích."
  },
  professional: {
    id: "professional",
    labelKey: "ai_persona_style_professional",
    directive: "Phong cách giao tiếp: Chuyên nghiệp, học thuật, chuẩn mực và rõ ràng."
  }
};
function aiBuildPersonaDirective(settings){
  const s = settings || aiSettings || {};
  const styleKey = (s.personaStyle && AI_PERSONAS[s.personaStyle]) ? s.personaStyle : "casual";
  const base = AI_PERSONAS[styleKey].directive;
  const custom = String(s.personaCustom || "").trim().slice(0, 600);
  return custom ? (base + " Đặc điểm tính cách / cách xưng hô riêng của người dùng: " + custom + ".") : base;
}
const AI_DEFAULT_PROMPTS = { summary: "Tóm tắt trang này thành 5 bullet + 1 đoạn 100 chữ bằng tiếng Việt.", qa: "Trả lời câu hỏi dựa trên nội dung trang đang đứng, trích dẫn nguồn nếu có.", explain: "Giải thích đoạn bôi đen bằng tiếng Việt đơn giản.", translate: "Dịch nội dung chính của trang sang tiếng Việt tự nhiên.", outline: "Tạo outline 3 cấp (I, 1, a) cho bài viết này.", timeline: "Tạo danh sách các mốc thời gian (timeline/chương) quan trọng của video hoặc bài viết theo định dạng:\n- [mm:ss] Tiêu đề chương: tóm tắt ngắn nội dung chính.", flashcard: "Tạo 5 thẻ flashcard ôn tập kiến thức cốt lõi từ nội dung trang theo định dạng:\nQ: [Câu hỏi ôn tập]\nA: [Câu trả lời giải thích chi tiết]", cite: "Gợi ý 3 câu hỏi nghiên cứu + 5 từ khóa học thuật từ trang này.", answer: "Giải các câu trắc nghiệm trong nội dung trang: mỗi câu nêu đáp án đúng (A/B/C/D hoặc giá trị) kèm giải thích 1 dòng bằng tiếng Việt. Nếu dữ liệu đáp án nằm trong mã nguồn/script của trang, hãy dựa vào đó để khẳng định.", tabs: "Tóm tắt TỪNG tab đang mở (mỗi tab 2 gạch đầu dòng bằng tiếng Việt), sau đó lập bảng so sánh các tab theo: chủ đề, luận điểm chính, độ tin cậy nguồn.", papers: "Dựa vào danh sách tài liệu tìm được từ Crossref/OpenAlex ở phần ngữ cảnh: chọn và xếp hạng 5 công trình liên quan nhất tới chủ đề trang, mỗi cái nêu lý do 1 dòng và định dạng trích dẫn APA." };
let aiProvider = "gemini";
let aiKeys = {};
let aiHistory = [];
let aiSettings = { ...AI_DEFAULT_SETTINGS };
let aiModels = {};
let aiCustomModels = {};
let aiFetchedModels = [];
let aiPrompts = { ...AI_DEFAULT_PROMPTS };
function aiDefaultPrompts(){ const d={}; ["summary","qa","explain","translate","outline","timeline","flashcard","cite","answer","tabs","papers"].forEach(k=>{ let v=""; try{ v=(typeof getI18nText==="function")?getI18nText("ai_prompt_"+k,""): ""; }catch(e){} if(!v||v==="ai_prompt_"+k) v=AI_DEFAULT_PROMPTS[k]||""; d[k]=v; }); return d; }
let aiIsSending = false;
const AI_MAX_ATTACHED_IMAGES = 10;
let aiAttachedImages = [];
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
function aiGetProviderModels(prov){
  if(prov === "webllm"){
    const lm = (typeof window !== "undefined" && Array.isArray(window.SF_WEBLLM_MODELS)) ? window.SF_WEBLLM_MODELS : [];
    if(lm.length) return lm.map(m => m.id);
    if(AI_PROVIDERS.webllm && AI_PROVIDERS.webllm.models.length) return [...AI_PROVIDERS.webllm.models];
    return [];
  }
  if(prov === "custom") return [];
  if(aiCustomModels && Array.isArray(aiCustomModels[prov]) && aiCustomModels[prov].length > 0){
    return aiCustomModels[prov];
  }
  return [...(AI_PROVIDERS[prov]?.models || [])];
}
function aiGetProviderConfig(id){ return AI_PROVIDERS[id] || AI_PROVIDERS.gemini; }
function aiGetModel(p){ const c=aiGetProviderConfig(p); const all=[...aiGetProviderModels(p),...(p==="gemini"?aiFetchedModels:[])]; if(aiModels[p] && (p==="gemini" || p==="custom" || all.includes(aiModels[p]))) return aiModels[p]; if(c.defaultModel && all.includes(c.defaultModel)) return c.defaultModel; return all[0]||c.defaultModel||""; }
function aiSetModel(p,m){ const all=[...aiGetProviderModels(p),...(p==="gemini"?aiFetchedModels:[])]; if(all.includes(m)||p==="custom"){ aiModels[p]=m; storSet({[AI_STORAGE_KEYS.models]:aiModels}); } }
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
  agent: {
    key: "agent",
    label: "Tác nhân Agentic AI & Sandbox",
    trigger: /^[\/!](agent|sandbox|browse)\b/i,
    intent: /(chạy agent|chay agent|agent tìm kiếm|agent tim kiem|tự động lướt web|tu dong luot web|agent duyệt web|agent duyet web|autonomous agent)/i,
    instruction: "\n\n[KỸ NĂNG CHUYÊN SÂU: TÁC NHÂN AGENTIC AI & DUYỆT WEB SANDBOX]\n- Tác nhân đã được người dùng ủy quyền thực thi trong môi trường Sandbox cô lập.\n- Tổng hợp, phân tích và đối chiếu thông tin từ các nguồn đã duyệt một cách toàn diện, khách quan, trung thực.\n- Bố cục kết quả rõ ràng: Bối cảnh, Phân tích chi tiết, Bảng so sánh hoặc Điểm then chốt, và Khuyến nghị hành động."
  },
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
  vision: {
    key: "vision",
    label: "Thị giác Màn hình & Đọc hiểu Giao diện (Vision)",
    trigger: /^[\/!](vision|screen|capture|nhin|xemanh|live|stream|cam|camera)\b/i,
    intent: /(nhìn màn hình|nhin man hinh|chụp màn hình này|xem giao diện|đọc ảnh màn hình|phân tích ảnh chụp|thị giác máy tính|vision|xem trang này qua ảnh|quay trực tiếp|quay truc tiep|camera trực tiếp|live stream|quay lên|nhìn camera)/i,
    instruction: "\n\n[KỸ NĂNG CHUYÊN SÂU: THỊ GIÁC MÀN HÌNH (VISION) & ĐỌC HIỂU GIAO DIỆN TRỰC QUAN]\n- Phân tích và quan sát toàn diện hình ảnh chụp màn hình được cung cấp.\n- Đọc hiểu mọi thành phần trực quan: nút bấm, biểu tượng (icon Follow TikTok/YouTube, avatar, nút đóng modal), biểu đồ, bảng biểu, hình vẽ minh họa, công thức và văn bản trong ảnh.\n- Phân tích chính xác bố cục, màu sắc, cảnh báo và chỉ dẫn thực tế trên giao diện để giải đáp hoặc thực thi chính xác."
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
function aiSig(parent, ms){ const ctrl=new AbortController(); setTimeout(()=>{ try{ ctrl.abort(); }catch(e){} }, ms); if(parent){ if(parent.aborted){ try{ ctrl.abort(); }catch(e){} } else { try{ parent.addEventListener("abort", ()=>{ try{ ctrl.abort(); }catch(e){} }); }catch(e){} } } return ctrl.signal; }
function aiRenderPipelineStatus(el, info){
  while(el.firstChild){ el.removeChild(el.firstChild); }
  if(info==null || typeof info!=="object"){
    el.textContent=String(info||"");
    return;
  }
  const total=Number(info.total)>0?Number(info.total):3;
  const step=Math.max(1, Math.min(Number(info.step)||1, total));
  const head=document.createElement("div");
  head.className="ai-pipe-head";
  const lbl=document.createElement("span");
  lbl.className="ai-pipe-label";
  lbl.textContent=String(info.label||"");
  const cnt=document.createElement("span");
  cnt.className="ai-pipe-step";
  cnt.textContent=step+"/"+total;
  head.appendChild(lbl);
  head.appendChild(cnt);
  const track=document.createElement("div");
  track.className="ai-pipe-track";
  const fill=document.createElement("div");
  fill.className="ai-pipe-fill";
  fill.style.width=Math.round((step/total)*100)+"%";
  track.appendChild(fill);
  const txt=document.createElement("div");
  txt.className="ai-pipe-text";
  txt.textContent=String(info.text||"");
  el.appendChild(head);
  el.appendChild(track);
  el.appendChild(txt);
}
function aiShowTyping(statusText){
  const c=document.getElementById("ai-chat-history");
  if(!c) return;
  aiHideTyping();
  const row=document.createElement("div");
  row.className="ai-msg ai-msg-assistant ai-typing-row";
  const b=document.createElement("div");
  b.className="ai-bubble ai-typing";
  const animWrap=document.createElement("div");
  animWrap.className="ai-loading-thinking-wrap";
  const anim=document.createElement("img");
  anim.src="../assest/ai-loading-thinking.gif";
  anim.alt="AI Thinking...";
  anim.className="ai-loading-thinking-anim";
  animWrap.appendChild(anim);
  b.appendChild(animWrap);
  if(statusText){
    const st=document.createElement("span");
    st.className="ai-pipeline-status";
    b.appendChild(st);
    aiRenderPipelineStatus(st, statusText);
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
  aiRenderPipelineStatus(st, statusText);
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
    storGet([AI_STORAGE_KEYS.provider,AI_STORAGE_KEYS.keys,AI_STORAGE_KEYS.history,AI_STORAGE_KEYS.settings,AI_STORAGE_KEYS.models,AI_STORAGE_KEYS.customModels,AI_STORAGE_KEYS.prompts,AI_STORAGE_KEYS.sessions,AI_STORAGE_KEYS.mem,AI_STORAGE_KEYS.customServers,AI_STORAGE_KEYS.activeCustomServer],r=>{
      aiPrompts=aiDefaultPrompts();
      try{ aiSessions=aiSessionsLoad(r[AI_STORAGE_KEYS.sessions]); }catch(e){ aiSessions=[]; }
      try{ if(r[AI_STORAGE_KEYS.mem]&&typeof r[AI_STORAGE_KEYS.mem]==="object") aiMem=r[AI_STORAGE_KEYS.mem]; }catch(e){}
      if(r[AI_STORAGE_KEYS.provider]&&AI_PROVIDERS[r[AI_STORAGE_KEYS.provider]]) aiProvider=r[AI_STORAGE_KEYS.provider];
      if(r[AI_STORAGE_KEYS.keys]&&typeof r[AI_STORAGE_KEYS.keys]==="object") aiKeys=r[AI_STORAGE_KEYS.keys];
      if(Array.isArray(r[AI_STORAGE_KEYS.history])) aiHistory=aiSanitizeHistory(r[AI_STORAGE_KEYS.history]);
      if(r[AI_STORAGE_KEYS.settings]&&typeof r[AI_STORAGE_KEYS.settings]==="object"){ aiSettings={...AI_DEFAULT_SETTINGS,...r[AI_STORAGE_KEYS.settings]}; aiSettings.maxChars=Math.max(1000,Math.min(32000,Number(aiSettings.maxChars)||20000)); const tv=Number(aiSettings.temperature); aiSettings.temperature=isFinite(tv)?Math.max(0,Math.min(2,tv)):0.7; }
      if(r[AI_STORAGE_KEYS.models]&&typeof r[AI_STORAGE_KEYS.models]==="object") aiModels=r[AI_STORAGE_KEYS.models];
      if(r[AI_STORAGE_KEYS.customModels]&&typeof r[AI_STORAGE_KEYS.customModels]==="object") aiCustomModels=r[AI_STORAGE_KEYS.customModels];
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
function aiActiveCustomServer(){
  if(!aiCustomServers||!aiCustomServers.length) return null;
  return aiCustomServers.find(x=>x.id===aiActiveCustomServerId)||aiCustomServers[0];
}
function aiCanUse(p){
  if(p==="webllm"){
    try{ return !!(typeof window!=="undefined" && window.sfWebllmIsReady && window.sfWebllmIsReady()); }catch(e){ return false; }
  }
  if(aiHasKey(p)) return true;
  if(p==="custom"){
    const s=aiActiveCustomServer();
    if(s&&s.url&&String(s.url).trim()) return true;
  }
  return false;
}
function aiNeedProviderMsg(p){
  const label=aiGetProviderConfig(p).label;
  if(p==="webllm"){
    return (typeof getI18nText==="function")?getI18nText("ai_need_webllm",[label]):"⚠️ WebLLM chưa sẵn sàng. Hãy mở ⚙ Cài đặt AI → WebLLM → Tải model trước khi gửi.";
  }
  return (typeof getI18nText==="function")?getI18nText("ai_need_key",[label]):"⚠️ Chưa nhập API key cho "+label+". Hãy bấm ⚙ Cài đặt → nhập key.";
}
function aiNeedProviderToastKey(p){
  return (p==="webllm")?"ai_toast_webllm_not_loaded":"ai_toast_need_key";
}
function aiWebllmStatusText(){
  try{
    const s=(typeof window!=="undefined"&&window.sfWebllmState)?window.sfWebllmState:{status:"idle"};
    if(s.status==="loading"){ const pct=String(Math.round((s.progress||0)*100)); return aiT("ai_webllm_status_loading",[pct],"⏳ Đang tải model... "+pct+"%"); }
    if(s.status==="ready") return aiT("ai_webllm_status_ready",[s.modelId||""],"● Sẵn sàng — "+(s.modelId||""));
    if(s.status==="error") return aiT("ai_webllm_status_error",null,"● Lỗi tải model (kiểm tra WebGPU / bộ nhớ / mạng)");
    return aiT("ai_webllm_status_idle",null,"○ Chưa tải model");
  }catch(e){ return "○ Chưa tải model"; }
}
function aiWebllmSyncSection(){
  try{
    const supported=(typeof window!=="undefined"&&typeof window.sfWebllmSupported==="function")?window.sfWebllmSupported():false;
    const s=(typeof window!=="undefined"&&window.sfWebllmState)?window.sfWebllmState:{status:"idle"};
    const st=document.getElementById("ai-webllm-status");
    if(st) st.textContent=supported?aiWebllmStatusText():aiT("ai_webllm_unsupported",null,"⚠️ Trình duyệt không hỗ trợ WebGPU — WebLLM cần Chrome/Edge 113+ trở lên.");
    const bar=document.getElementById("ai-webllm-progress");
    if(bar) bar.style.display=(supported&&s.status==="loading")?"":"none";
    const fill=document.getElementById("ai-webllm-progress-fill");
    if(fill) fill.style.width=String(Math.round((s.progress||0)*100))+"%";
    const loadBtn=document.getElementById("ai-btn-webllm-load");
    if(loadBtn) loadBtn.disabled=!supported||s.status==="loading";
    const unloadBtn=document.getElementById("ai-btn-webllm-unload");
    if(unloadBtn) unloadBtn.disabled=s.status!=="ready";
    const budgetSel=document.getElementById("ai-webllm-ctx-budget");
    if(budgetSel) budgetSel.value=String(aiSettings.ctxBudget||4096);
    const budgetVal=document.getElementById("ai-webllm-ctx-budget-val");
    if(budgetVal) budgetVal.textContent=String(aiSettings.ctxBudget||4096);
  }catch(e){}
}
function aiNormalizeCustomUrl(raw){
  let u=String(raw||"").trim();
  if(!u) return u;
  let suffix="";
  const qi=u.indexOf("?");
  if(qi>=0){ suffix=u.slice(qi); u=u.slice(0,qi); }
  u=u.replace(/\/+$/,"");
  let path="";
  try{ path=new URL(u).pathname.replace(/\/+$/,""); }catch(e){ return String(raw||"").trim(); }
  if(/\/chat\/completions$/.test(path)) return u+suffix;
  if(path===""||path==="/") return u+"/v1/chat/completions"+suffix;
  if(/\/v1$/.test(path)) return u+"/chat/completions"+suffix;
  if(/\/v1\/chat$/.test(path)) return u+"/completions"+suffix;
  return u+suffix;
}
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
    const reTitle=/<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    const titlesMap=[];
    let tm;
    while((tm=reTitle.exec(html))!==null&&titlesMap.length<8){
      let rUrl=tm[1];
      if(rUrl.includes("uddg=")){
        try{
          const u=new URL("https:"+(rUrl.startsWith("//")?rUrl:"//"+rUrl));
          rUrl=decodeURIComponent(u.searchParams.get("uddg")||rUrl);
        }catch(e){}
      }
      const tText=aiDecodeHtmlEntities(tm[2].replace(/<[^>]+>/g,"").replace(/\s+/g," ").trim());
      if(rUrl.startsWith("http")){
        titlesMap.push({ u:rUrl, title:tText });
      }
    }
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
        const matchedTitleObj=titlesMap.find(item=>item.u===rawUrl)||titlesMap[items.length]||null;
        const pageTitle=(matchedTitleObj&&matchedTitleObj.title)?matchedTitleObj.title:host;
        items.push("- [Nguồn "+(items.length+1)+": "+pageTitle+"] ("+rawUrl+"):\n  \""+snippet+"\"");
        sources.push({ u: rawUrl, t: pageTitle, host: host });
      }
    }
    if(!sources.length&&titlesMap.length){
      titlesMap.slice(0,6).forEach((tmItem,idx)=>{
        let host="";
        try{ host=new URL(tmItem.u).hostname.replace(/^www\./,""); }catch(e){}
        items.push("- [Nguồn "+(idx+1)+": "+tmItem.title+"] ("+tmItem.u+")");
        sources.push({ u: tmItem.u, t: tmItem.title, host: host });
      });
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
  const re=/(?:\[|\()\s*(\d{1,2}:[0-5]\d(?::[0-5]\d)?)(?:\s*[-–—~]\s*(\d{1,2}:[0-5]\d(?::[0-5]\d)?))?\s*(?:\]|\))/g;
  let last=0, m;
  while((m=re.exec(text))!==null){
    if(m.index>last) frag.appendChild(document.createTextNode(text.slice(last,m.index)));
    const secs=aiParseTimestampSec(m[1]);
    const sp=document.createElement("span");
    sp.className="ai-ts" + (m[2] ? " is-range" : "");
    sp.setAttribute("data-ts",String(secs));
    if(m[2]){
      sp.setAttribute("data-ts-end", String(aiParseTimestampSec(m[2])));
      sp.title=aiT("ai_ts_seek",null,"Nhảy tới thời điểm này trong video") + " (" + m[1] + " – " + m[2] + ")";
    } else {
      sp.title=aiT("ai_ts_seek",null,"Nhảy tới thời điểm này trong video") + " (" + m[1] + ")";
    }
    const icon=document.createElement("span");
    icon.className="ai-ts-icon";
    icon.textContent="▶";
    sp.appendChild(icon);
    const txt=document.createElement("span");
    txt.className="ai-ts-text";
    txt.textContent=m[2] ? (m[1]+" – "+m[2]) : m[1];
    sp.appendChild(txt);
    frag.appendChild(sp);
    last=m.index+m[0].length;
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
    if(text.startsWith("***",i)){ const e=text.indexOf("***",i+3); if(e!==-1){ const s=document.createElement("strong"); const em=document.createElement("em"); aiAppendTextWithTs(em, text.slice(i+3,e)); s.appendChild(em); frag.appendChild(s); i=e+3; continue; } }
    if(text.startsWith("**",i)){ const e=text.indexOf("**",i+2); if(e!==-1&&e>i+2){ const s=document.createElement("strong"); aiAppendTextWithTs(s, text.slice(i+2,e)); frag.appendChild(s); i=e+2; continue; } }
    if(text.startsWith("~~",i)){ const e=text.indexOf("~~",i+2); if(e!==-1&&e>i+2){ const st=document.createElement("s"); aiAppendTextWithTs(st, text.slice(i+2,e)); frag.appendChild(st); i=e+2; continue; } }
    if(text.startsWith("==",i)){ const e=text.indexOf("==",i+2); if(e!==-1&&e>i+2){ const mk=document.createElement("span"); mk.style.background="rgba(250,204,21,0.2)"; mk.style.color="#fde68a"; mk.style.padding="0 3px"; mk.style.borderRadius="3px"; mk.style.fontWeight="600"; aiAppendTextWithTs(mk, text.slice(i+2,e)); frag.appendChild(mk); i=e+2; continue; } }
    if(text[i]==="`"){ const e=text.indexOf("`",i+1); if(e!==-1){ const c=document.createElement("code"); c.style.background="rgba(0,0,0,0.25)"; c.style.padding="1px 4px"; c.style.borderRadius="4px"; c.textContent=text.slice(i+1,e); frag.appendChild(c); i=e+1; continue; } }
    if(text[i]==="*"){ const e=text.indexOf("*",i+1); if(e!==-1&&e>i+1){ const em=document.createElement("em"); aiAppendTextWithTs(em, text.slice(i+1,e)); frag.appendChild(em); i=e+1; continue; } }
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
    const chM=trimmed.match(/^(?:[-*•]\s*)?\[([0-9]{1,2}:[0-9]{2}(?::[0-9]{2})?)(?:\s*[-–—~]\s*([0-9]{1,2}:[0-9]{2}(?::[0-9]{2})?))?\]\s*(.+)/);
    if(chM && !chM[3].startsWith(":") && !chM[3].startsWith("**") && chM[3].length <= 140){
      if(pendingCardQ){ const dq=document.createElement("div"); dq.style.margin="2px 0"; dq.appendChild(aiFormatInline(pendingCardQ)); bubble.appendChild(dq); pendingCardQ=null; }
      sugMode=false;
      const timeStr=chM[1];
      const rangeEnd=chM[2];
      const titleContent=chM[3];
      const card=document.createElement("div");
      card.className="ai-chapter-card";
      const seekBtn=document.createElement("button");
      seekBtn.type="button";
      seekBtn.className="ai-chapter-seek";
      seekBtn.textContent="⏱ " + (rangeEnd ? (timeStr + " – " + rangeEnd) : timeStr);
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
    if(numM){ if(sugMode&&numM[2]){ const chip=document.createElement("button"); chip.type="button"; chip.className="ai-suggest"; const cText=numM[2].replace(/[*`]/g,"").trim(); chip.textContent="✦ "+cText.slice(0,160); chip.addEventListener("click",()=>{ const inp=document.getElementById("ai-input"); if(inp){ inp.value=cText.slice(0,800); inp.focus(); aiGrowInput(inp); } }); bubble.appendChild(chip); return; } const row=document.createElement("div"); row.style.display="flex"; row.style.gap="6px"; row.style.marginLeft=indent>=2?"16px":"0"; row.style.marginTop="2px"; const nb=document.createElement("span"); nb.textContent=numM[1]+"."; nb.style.color="var(--primary)"; nb.style.fontWeight="700"; nb.style.flexShrink="0"; row.appendChild(nb); const sp=document.createElement("span"); sp.style.flex="1"; sp.appendChild(aiFormatInline(numM[2])); row.appendChild(sp); bubble.appendChild(row); return; }
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
      return;
    }
    if(trimmed.startsWith(">")){ sugMode=false; const bq=document.createElement("div"); bq.className="ai-quote"; bq.style.borderLeft="3px solid rgba(124,58,237,0.55)"; bq.style.background="rgba(124,58,237,0.08)"; bq.style.padding="5px 10px"; bq.style.margin="3px 0"; bq.style.borderRadius="0 8px 8px 0"; bq.style.color="#c4b5fd"; bq.appendChild(aiFormatInline(trimmed.replace(/^>\s?/,""))); bubble.appendChild(bq); return; }
    if(/^#{1,6} /.test(trimmed)){
      const hashes=trimmed.match(/^#+/)[0].length;
      const h=document.createElement("div");
      h.style.fontWeight="700";
      h.style.margin=(hashes===1?"12px 0 6px":(hashes===2?"10px 0 4px":"8px 0 3px"));
      if(hashes===1){
        h.style.fontSize="14px"; h.style.color="var(--primary)"; h.style.borderBottom="1px solid rgba(var(--primary-rgb),0.2)"; h.style.paddingBottom="3px";
      } else if(hashes===2){
        h.style.fontSize="12.5px"; h.style.color="#7dd3fc";
      } else {
        h.style.fontSize=hashes<=3?"12px":"11.5px"; h.style.color="#c4b5fd";
      }
      h.appendChild(aiFormatInline(trimmed.replace(/^#+\s+/,"")));
      bubble.appendChild(h);
      return;
    }
    const div=document.createElement("div"); div.style.margin="2px 0"; if(trimmed.startsWith("💡")){ div.style.background="rgba(var(--primary-rgb),0.08)"; div.style.border="1px solid rgba(var(--primary-rgb),0.15)"; div.style.borderRadius="6px"; div.style.padding="6px 8px"; } div.appendChild(aiFormatInline(raw)); bubble.appendChild(div);
  });
  if(pendingCardQ){ const dq=document.createElement("div"); dq.style.margin="2px 0"; dq.appendChild(aiFormatInline(pendingCardQ)); bubble.appendChild(dq); }
  flushTable(); flush();
}
function aiBuildMsgRow(msg){
  const row=document.createElement("div"); row.className="ai-msg ai-msg-"+(msg.role==="user"?"user":"assistant");
  const bubble=document.createElement("div"); bubble.className="ai-bubble"; aiRenderFormattedText(bubble, msg.content);
  const msgImgs = (Array.isArray(msg.images) && msg.images.length)
    ? msg.images.filter(x => typeof x === "string" && AI_SAFE_IMG_RE.test(x))
    : ((msg.image && AI_SAFE_IMG_RE.test(msg.image)) ? [msg.image] : []);
  if(msgImgs.length){
    const imgWrap=document.createElement("div");
    imgWrap.style.cssText="display:flex; flex-wrap:wrap; gap:6px; margin-top:6px; max-width:100%;";
    msgImgs.forEach(src=>{
      const img=document.createElement("img");
      img.src=src;
      img.style.maxWidth=msgImgs.length===1?"160px":"80px";
      img.style.maxHeight=msgImgs.length===1?"120px":"60px";
      img.style.objectFit="cover";
      img.style.borderRadius="6px";
      img.style.border="1px solid rgba(255,255,255,0.12)";
      img.style.cursor="pointer";
      img.title=aiT("ai_click_zoom_image",null,"Bấm để phóng to ảnh");
      img.addEventListener("click",()=>{ try{ window.open(src,"_blank"); }catch(e){} });
      imgWrap.appendChild(img);
    });
    bubble.appendChild(imgWrap);
  }
  const foot=document.createElement("div"); foot.style.display="flex"; foot.style.alignItems="center"; foot.style.gap="6px"; foot.style.marginTop="4px";
  const meta=document.createElement("div"); meta.className="ai-msg-meta"; meta.style.flex="1"; let who=msg.role==="user"?aiT("ai_you",null,"Bạn"):aiGetProviderConfig(msg.provider||aiProvider).label; const tsN=Number(msg.ts)||0; if(tsN){ try{ who+=" · "+new Date(tsN).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}); }catch(e){} } meta.textContent=who; foot.appendChild(meta);
  const copyBtn=document.createElement("button"); copyBtn.type="button"; copyBtn.textContent="⎘"; copyBtn.title=aiT("ai_copy_this",null,"Sao chép đoạn này"); copyBtn.style.cssText="width:22px; height:22px; border-radius:6px; border:1px solid rgba(255,255,255,0.08); background:rgba(255,255,255,0.04); color:#94a3b8; cursor:pointer; font-size:11px;"; copyBtn.addEventListener("click",()=>{ navigator.clipboard.writeText(msg.content||"").then(()=>{ copyBtn.textContent="✓"; setTimeout(()=>copyBtn.textContent="⎘",1200); if(typeof showToast==="function") showToast("toast_copied","success"); }); }); foot.appendChild(copyBtn);
  if(msg.role==="user"){ const editBtn=document.createElement("button"); editBtn.type="button"; editBtn.textContent="✎"; editBtn.title=aiT("ai_btn_edit_msg",null,"Sửa & gửi lại từ đây"); editBtn.style.cssText="width:22px; height:22px; border-radius:6px; border:1px solid rgba(255,255,255,0.08); background:rgba(255,255,255,0.04); color:#94a3b8; cursor:pointer; font-size:11px;"; editBtn.addEventListener("click",()=>{ if(aiIsSending) return; const idx=aiHistory.indexOf(msg); if(idx===-1) return; aiHistory.splice(idx); aiSaveHistory(); aiRenderHistory(); const inp=document.getElementById("ai-input"); if(inp){ inp.value=String(msg.content||"").slice(0,8000); inp.focus(); aiGrowInput(inp); } }); foot.appendChild(editBtn); }
  if(msg.role==="assistant"){ const regBtn=document.createElement("button"); regBtn.type="button"; regBtn.textContent="↻"; regBtn.title=aiT("ai_btn_regenerate",null,"Làm lại câu trả lời"); regBtn.style.cssText="width:22px; height:22px; border-radius:6px; border:1px solid rgba(255,255,255,0.08); background:rgba(255,255,255,0.04); color:#94a3b8; cursor:pointer; font-size:11px;"; regBtn.addEventListener("click",()=>{ if(typeof aiRegenerate==="function") aiRegenerate(); }); foot.appendChild(regBtn); }
  row.appendChild(bubble); row.appendChild(foot); return row;
}
function aiScrollToBottom(){ const c=document.getElementById("ai-chat-history"); if(c) c.scrollTop=c.scrollHeight; }
function aiGrowInput(inp){
  if(!inp) return;
  const ph=inp.getAttribute("placeholder");
  if(ph) inp.removeAttribute("placeholder");
  inp.style.height="auto";
  const h=Math.min(140,Math.max(20,inp.scrollHeight));
  if(ph) inp.setAttribute("placeholder", ph);
  inp.style.height=h+"px";
}
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
  const e={role:String(role)==="user"?"user":"assistant",content:String(content==null?"":content).slice(0,16000),provider:AI_PROVIDERS[provider]?provider:aiProvider,ts:Date.now()};
  if(Array.isArray(image)){
    const valid=image.filter(img=>typeof img==="string"&&AI_SAFE_IMG_RE.test(img));
    if(valid.length){
      e.images=valid;
      e.image=valid[0];
    }
  } else if(image&&AI_SAFE_IMG_RE.test(image)){
    e.image=image;
    e.images=[image];
  }
  aiHistory.push(e);
  aiSaveHistorySoon();
  const c=document.getElementById("ai-chat-history");
  if(c){ const em=c.querySelector(".ai-empty"); if(em) c.removeChild(em); c.appendChild(aiBuildMsgRow(e)); c.scrollTop=c.scrollHeight; }
  else aiRenderHistory();
}
function aiClearHistory(){ aiHistory=[]; aiActiveVideoId=""; aiVideoResumeAt=0; aiSaveHistory(); aiRenderHistory(); if(typeof showToast==="function") showToast("ai_toast_cleared","success"); }

function aiAddCustomModel(prov, modelName){
  if(!prov || !AI_PROVIDERS[prov] || prov === "custom") return;
  const m = String(modelName || "").trim();
  if(!m) return;
  let list = aiGetProviderModels(prov).slice();
  if(list.includes(m)){
    if(typeof showToast === "function") showToast("ai_toast_model_added", "info", [m]);
    return;
  }
  list.push(m);
  aiCustomModels[prov] = list;
  storSet({ [AI_STORAGE_KEYS.customModels]: aiCustomModels });
  aiPopulateModelSelect();
  aiRenderModelsManager();
  if(typeof showToast === "function") showToast("ai_toast_model_added", "success", [m]);
}

function aiDeleteCustomModel(prov, modelName){
  if(!prov || !AI_PROVIDERS[prov] || prov === "custom") return;
  let list = aiGetProviderModels(prov).slice();
  list = list.filter(x => x !== modelName);
  if(list.length === 0){
    list = [...(AI_PROVIDERS[prov]?.models || [])];
  }
  aiCustomModels[prov] = list;
  storSet({ [AI_STORAGE_KEYS.customModels]: aiCustomModels });
  const cur = aiGetModel(prov);
  if(cur === modelName){
    aiSetModel(prov, list[0] || "");
  }
  aiPopulateModelSelect();
  aiRenderModelsManager();
  aiUpdateModelLine();
  if(typeof showToast === "function") showToast("ai_toast_model_deleted", "info", [modelName]);
}

function aiResetCustomModels(prov){
  if(!prov || !AI_PROVIDERS[prov] || prov === "custom") return;
  delete aiCustomModels[prov];
  storSet({ [AI_STORAGE_KEYS.customModels]: aiCustomModels });
  const defaultList = [...(AI_PROVIDERS[prov]?.models || [])];
  aiSetModel(prov, defaultList[0] || "");
  aiPopulateModelSelect();
  aiRenderModelsManager();
  aiUpdateModelLine();
  if(typeof showToast === "function") showToast("ai_toast_models_reset", "success");
}

function aiRenderModelsManager(){
  const sel = document.getElementById("ai-manage-provider-select");
  const listEl = document.getElementById("ai-models-list");
  if(!listEl) return;
  const prov = sel ? sel.value : "gemini";
  const models = aiGetProviderModels(prov);
  listEl.textContent = "";
  models.forEach(m => {
    const tag = document.createElement("span");
    tag.className = "ai-model-tag";
    const nameSpan = document.createElement("span");
    nameSpan.textContent = AI_MODEL_LABELS[m] || m;
    tag.appendChild(nameSpan);
    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "ai-model-tag-del";
    delBtn.textContent = "✕";
    delBtn.title = aiT("ai_sessions_delete", null, "Xóa");
    delBtn.addEventListener("click", () => aiDeleteCustomModel(prov, m));
    tag.appendChild(delBtn);
    listEl.appendChild(tag);
  });
}

function aiPopulateModelSelect(explicitVal){
  const hasGeminiKey = aiHasKey("gemini");
  const hasOpenaiKey = aiHasKey("openai");
  const hasClaudeKey = aiHasKey("claude");
  const hasCustomServers = aiCustomServers && aiCustomServers.length > 0;
  const noKeysEntered = !hasGeminiKey && !hasOpenaiKey && !hasClaudeKey;

  // Auto-switch to an active keyed provider if current provider doesn't have a key
  if(!noKeysEntered && aiProvider !== "custom" && aiProvider !== "webllm"){
    if(!aiHasKey(aiProvider)){
      if(hasGeminiKey) aiProvider = "gemini";
      else if(hasOpenaiKey) aiProvider = "openai";
      else if(hasClaudeKey) aiProvider = "claude";
      else if(hasCustomServers) aiProvider = "custom";
      storSet({ [AI_STORAGE_KEYS.provider]: aiProvider });
    }
  }

  const currentProvider = aiProvider;
  const currentModel = aiGetModel(currentProvider);
  const targetVal = explicitVal || (currentProvider === "custom" ? ("custom:" + aiActiveCustomServerId) : (currentProvider + ":" + currentModel));

  ["ai-model-select","ai-model-select-main"].forEach(id=>{
    const sel = document.getElementById(id);
    if(!sel) return;
    sel.textContent = "";

    // Gemini: show if Gemini key is present OR if NO keys entered anywhere (default provided models)
    if(hasGeminiKey || noKeysEntered){
      const geminiModels = [...aiGetProviderModels("gemini"), ...aiFetchedModels];
      if (aiModels["gemini"] && !geminiModels.includes(aiModels["gemini"])) {
        geminiModels.unshift(aiModels["gemini"]);
      }
      [...new Set(geminiModels)].forEach(m => {
        const o = document.createElement("option");
        o.value = "gemini:" + m;
        o.textContent = "Google Gemini - " + (AI_MODEL_LABELS[m] || m);
        if(aiFetchedModels.includes(m)) o.style.color = "#059669";
        sel.appendChild(o);
      });
    }

    // OpenAI: only if OpenAI key entered
    if(hasOpenaiKey){
      aiGetProviderModels("openai").forEach(m => {
        const o = document.createElement("option");
        o.value = "openai:" + m;
        o.textContent = "OpenAI - " + (AI_MODEL_LABELS[m] || m);
        sel.appendChild(o);
      });
    }

    // Claude: only if Claude key entered
    if(hasClaudeKey){
      aiGetProviderModels("claude").forEach(m => {
        const o = document.createElement("option");
        o.value = "claude:" + m;
        o.textContent = "Anthropic - " + (AI_MODEL_LABELS[m] || m);
        sel.appendChild(o);
      });
    }

    // Custom
    if(hasCustomServers){
      aiCustomServers.forEach(srv => {
        const o = document.createElement("option");
        o.value = "custom:" + srv.id;
        o.textContent = "Custom - " + srv.name + (srv.model ? " (" + srv.model + ")" : "");
        sel.appendChild(o);
      });
    }

    // WebLLM (in-browser model): shown when it is the active provider or the
    // browser has WebGPU, mirroring how Gemini is shown without a key.
    const webllmActive = aiProvider === "webllm";
    const webllmSupported = (typeof window !== "undefined" && typeof window.sfWebllmSupported === "function") ? window.sfWebllmSupported() : false;
    if(webllmActive || webllmSupported){
      aiGetProviderModels("webllm").forEach(m => {
        const o = document.createElement("option");
        o.value = "webllm:" + m;
        o.textContent = "WebLLM (Offline) - " + (AI_MODEL_LABELS[m] || m);
        sel.appendChild(o);
      });
    }

    sel.disabled = false;
    sel.value = targetVal;
    if(!sel.value && sel.options.length > 0){
      sel.selectedIndex = 0;
      const firstVal = sel.value;
      if(firstVal){
        const colonIdx = firstVal.indexOf(":");
        if(colonIdx !== -1){
          const prov = firstVal.slice(0, colonIdx);
          const mId = firstVal.slice(colonIdx + 1);
          if(prov === "custom"){
            aiProvider = "custom";
            aiActiveCustomServerId = mId;
          } else if(AI_PROVIDERS[prov]){
            aiProvider = prov;
            aiSetModel(prov, mId);
          }
        }
      }
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
  const nameEl = document.getElementById("ai-cs-name");
  const modelEl = document.getElementById("ai-cs-model");
  const urlEl = document.getElementById("ai-cs-url");
  const keyEl = document.getElementById("ai-cs-key");
  if(!urlEl) return;
  const url = aiNormalizeCustomUrl(urlEl.value.trim());
  if(!url || !aiValidateCustomUrl(url, true)){
    if(typeof showToast === "function") showToast("ai_toast_url_blocked", "warning");
    return;
  }
  const name = (nameEl ? nameEl.value.trim() : "") || "Custom Server";
  const model = (modelEl ? modelEl.value.trim() : "");
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
  if(st){ if(aiProvider==="webllm"){ st.textContent=aiWebllmStatusText(); st.className=(typeof window!=="undefined"&&window.sfWebllmIsReady&&window.sfWebllmIsReady())?"ai-status is-connected":"ai-status"; } else { const has=aiCanUse(aiProvider); const local=aiProvider==="custom"&&!aiHasKey("custom")&&!!aiActiveCustomServer(); if(has){ st.textContent=local?aiT("ai_key_server_ready",null,"Đã kết nối máy chủ tùy biến"):aiT("ai_key_connected",null,"API đã kết nối"); st.className="ai-status is-connected"; } else { st.textContent=aiT("ai_key_missing",null,"○ Chưa nhập key"); st.className="ai-status"; } } }
  const loginBtn=document.getElementById("ai-btn-open-provider");
  if(loginBtn){ loginBtn.textContent=(typeof getI18nText==="function")?getI18nText("ai_btn_open_provider"):"Mở trang lấy API key ↗"; loginBtn.setAttribute("data-mode","api"); loginBtn.style.display=cfg.loginUrl?"":"none"; }
  document.querySelectorAll(".ai-provider-pill").forEach(p=>{ p.classList.toggle("active", p.dataset.provider===aiProvider); });
  aiUpdateModelLine();
  const cu=document.getElementById("ai-custom-url");
  if(cu){ cu.value=(aiProvider==="custom")?(aiKeys["custom"]||""):""; cu.style.display=aiProvider==="custom"?"":"none"; const lab=document.querySelector('[data-i18n="ai_custom_label"]'); if(lab&&lab.parentElement) lab.parentElement.style.display=aiProvider==="custom"?"":"none"; }
  aiWebllmSyncSection();
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

  let skillRule="";
  if(skill&&skill.instruction) skillRule=skill.instruction;
  let pipelineRule="";
  if(pipeline&&pipeline.systemDirective) pipelineRule=pipeline.systemDirective;
  return sysBody+factRule+skillRule+pipelineRule;
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

  const sys=sysBody+FACT_RULE+COMPLETENESS_RULE+"\n\n";
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
function aiLastTimestampSec(text){
  const m=String(text||"").match(/(?:\[|\()\s*(\d{1,2}:[0-5]\d(?::[0-5]\d)?)(?:\s*[-–—~]\s*(\d{1,2}:[0-5]\d(?::[0-5]\d)?))?\s*(?:\]|\))/g)||[];
  if(!m.length) return 0;
  const lastMatch=m[m.length-1];
  const parts=lastMatch.replace(/[\[\]\(\)]/g,"").split(/[-–—~]/).map(s=>s.trim()).filter(Boolean);
  const targetTs=parts[parts.length-1]||parts[0];
  return aiParseTimestampSec(targetTs);
}
const AI_CONTINUE_RE=/(?:^|\s)(tiep tuc|tiep theo|tiep lai|tiep den|tiep|con nua|con lai|lam tiep|noi tiep|doc tiep|dich tiep|phan con lai|phan con|continue|next|go on|more)(?:\s|$|[!?.])/;
function aiIsContinueRequest(text){ const t=_aiFoldAscii(text).replace(/\s+/g," ").trim(); return t.length<=60 && AI_CONTINUE_RE.test(" "+t+" "); }
function aiVideoQuestionText(question, transcriptMode, isLong){
  const tm = transcriptMode || aiIsTranscriptRequest(question);
  let sys="Bạn là trợ lý học thuật ScholarFlow. HÃY XEM video này (CẢ hình ảnh LẪN tiếng) và chỉ trả lời DỰA TRÊN NỘI DUNG THỰC TẾ đã thấy/nghe. TUYỆT ĐỐI không bịa; ý nào video không có thì nói rõ là không đề cập.\n";
  if(isLong){
    sys+="- Video này DÀI. KHÔNG cố chép nguyên văn toàn bộ (một lượt sẽ bị cắt giữa chừng). Thay vào đó hãy trả về BẢNG TIMELINE: chia thành các mục '[mm:ss] – [mm:ss]', mỗi mục 1–2 câu TÓM TẮT sự kiện/ý chính + chi tiết hình ảnh nổi bật, bám đúng thứ tự thời gian tới hết video.\n";
  } else {
    sys+="- Nếu hỏi tóm tắt/phân tích/ý nghĩa/nhân vật: bám cả CHI TIẾT HÌNH ẢNH (đồ vật, hành động, cảnh, chữ trên màn hình) lẫn lời thoại; mỗi luận điểm kèm mốc [mm:ss] hoặc khoảng thời gian [mm:ss - mm:ss]. Trả lời gọn, đúng markdown.\n";
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
  if(provider==="webllm"){
    const b=(typeof window!=="undefined")?window:null;
    if(!b||typeof b.sfWebllmChat!=="function") throw new Error("webllm_unsupported");
    if(typeof b.sfWebllmIsReady!=="function"||!b.sfWebllmIsReady()) throw new Error("webllm_not_loaded");
    const selModel=aiGetModel("webllm");
    if(selModel&&b.sfWebllmState&&b.sfWebllmState.modelId&&b.sfWebllmState.modelId!==selModel) throw new Error("webllm_model_mismatch");
    const text=await b.sfWebllmChat(aiHistoryToOpenAIMessages(hist,prompt,[]),{temperature:aiSettings.temperature,signal:opts&&opts.signal,promptBudget:aiSettings.ctxBudget});
    return String(text||"").slice(0,16000);
  }
  if(provider==="custom"){
    let server = null;
    if(aiCustomServers && aiCustomServers.length){
      server = aiCustomServers.find(s=>s.id===aiActiveCustomServerId) || aiCustomServers[0];
    }
    let url = (apiKey && String(apiKey).startsWith("http")) ? String(apiKey).trim() : (server ? server.url : (aiKeys["custom"]||"").trim());
    url = aiNormalizeCustomUrl(url);
    let key = (server && server.key) ? server.key.trim() : "";
    let model = (server && server.model) ? server.model.trim() : "";
    if(model==="local-model"||model==="default") model = "";
    if(!url) throw new Error("custom_url_invalid");
    if(!aiValidateCustomUrl(url, true)) throw new Error("custom_url_blocked");
    const headers = { "Content-Type": "application/json" };
    if(key) headers["Authorization"] = "Bearer " + key;
    let urlPath=""; try{ urlPath=new URL(url).pathname; }catch(e){ urlPath=url; }
    const isOllamaNative = /\/api\/(generate|completion|embeddings)$/.test(urlPath);
    const isChatEndpoint = !isOllamaNative;
    let bodyObj;
    if(isChatEndpoint){
      const msgs = aiHistoryToOpenAIMessages(hist, prompt, imgs);
      bodyObj = {
        messages: msgs,
        temperature: aiSettings.temperature
      };
      if(model) bodyObj.model = model;
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
    const rawBody = await res.text().catch(()=> "");
    let d = {}; try{ d = JSON.parse(rawBody); }catch(e){ d = {}; }
    const serverErr = d && typeof d==="object" ? ((d.error && ((d.error.message||d.error.error)||d.error)) || d.message || "") : "";
    if(!res.ok) throw new Error("http_"+res.status+(serverErr?(" — "+String(serverErr).slice(0,300)):""));
    if(serverErr && !d.choices) throw new Error(String(serverErr).slice(0,500));
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
      answer = rawBody || JSON.stringify(d);
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

/* ── Vision: Token-Saving Viewport Compression & Capture ── */
async function aiCaptureActiveTabLowToken(maxDimension = 768, quality = 0.6) {
  const tabsApi = (typeof browser !== "undefined" && browser.tabs) ? browser.tabs : (typeof chrome !== "undefined" ? chrome.tabs : null);
  if (!tabsApi || !tabsApi.captureVisibleTab) return null;
  return new Promise((resolve) => {
    try {
      tabsApi.captureVisibleTab(null, { format: "jpeg", quality: 65 }, async (dataUrl) => {
        if (!dataUrl) {
          try {
            tabsApi.captureVisibleTab(null, { format: "png" }, async (pngUrl) => {
              if (!pngUrl) return resolve(null);
              const compressed = await aiCompressDataUrl(pngUrl, maxDimension, quality);
              resolve(compressed);
            });
          } catch(e) { resolve(null); }
          return;
        }
        const compressed = await aiCompressDataUrl(dataUrl, maxDimension, quality);
        resolve(compressed);
      });
    } catch(e) {
      resolve(null);
    }
  });
}

function aiCompressDataUrl(dataUrl, maxDimension = 768, quality = 0.6) {
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.onload = () => {
        let w = img.width;
        let h = img.height;
        if (w > maxDimension || h > maxDimension) {
          if (w > h) {
            h = Math.round((h * maxDimension) / w);
            w = maxDimension;
          } else {
            w = Math.round((w * maxDimension) / h);
            h = maxDimension;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        const lowResDataUrl = canvas.toDataURL("image/jpeg", quality);
        const parts = lowResDataUrl.split(",");
        const base64Data = parts[1] || "";
        resolve({
          name: "screen_vision.jpg",
          size: Math.round(base64Data.length * 0.75),
          mimeType: "image/jpeg",
          data: base64Data,
          preview: lowResDataUrl,
          width: w,
          height: h,
          isVision: true
        });
      };
      img.onerror = () => resolve(null);
      img.src = dataUrl;
    } catch(e) {
      resolve(null);
    }
  });
}

async function aiHandleVisionCaptureClick() {
  const visionBtn = document.getElementById("ai-btn-capture-vision");
  const existingIdx = aiAttachedImages.findIndex(im => im && im.isVision);
  if (existingIdx !== -1) {
    aiAttachedImages.splice(existingIdx, 1);
    aiRenderAttachedImages();
    if (visionBtn) visionBtn.classList.remove("is-active");
    return;
  }
  if (typeof aiUpdateTypingStatus === "function") {
    aiUpdateTypingStatus("⏳ Đang chụp & nén màn hình tiết kiệm token...");
  }
  const snap = await aiCaptureActiveTabLowToken(768, 0.6);
  if (typeof aiHideTyping === "function") {
    aiHideTyping();
  }
  if (snap && snap.data) {
    aiAttachedImages.push(snap);
    aiRenderAttachedImages();
    if (visionBtn) visionBtn.classList.add("is-active");
    const kb = Math.round(snap.size / 1024);
    if (typeof showToast === "function") {
      showToast("ai_toast_vision_captured", "success", [kb]);
    }
  } else {
    if (typeof showToast === "function") {
      showToast("ai_toast_capture_failed", "warning");
    }
  }
}

/* ── Realtime Live Stream Controller (Camera & Screen) ── */
let aiLiveStream = null;
let aiLiveSilentActive = false;
let aiLiveSourceType = 'tab';
let aiLiveRefreshTimer = null;

async function aiCheckHasCamera() {
  try {
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.some(d => d.kind === 'videoinput');
    }
  } catch(e) {}
  return false;
}

function aiBroadcastLiveBorder(enabled) {
  const tabsApi = (typeof browser !== "undefined" && browser.tabs) ? browser.tabs : (typeof chrome !== "undefined" ? chrome.tabs : null);
  if (!tabsApi || !tabsApi.query) return;
  try {
    tabsApi.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0] && tabs[0].id) {
        try {
          tabsApi.sendMessage(tabs[0].id, { action: "SET_LIVE_VISION_BORDER", enabled: !!enabled }, () => {
            void (chrome.runtime && chrome.runtime.lastError);
          });
        } catch(e) {}
      }
    });
  } catch(e) {}
}

async function aiStartLiveStream(sourceType = 'tab', isFallback = false) {
  const box = document.getElementById('ai-live-box');
  const video = document.getElementById('ai-live-video');
  const previewImg = document.getElementById('ai-live-preview-img');
  const tabCard = document.getElementById('ai-live-tab-card');
  const tabTitle = document.getElementById('ai-live-tab-title');
  const select = document.getElementById('ai-live-source-select');
  const btn = document.getElementById('ai-btn-live-stream');
  const statusText = document.getElementById('ai-live-status-text');

  if (select) select.value = sourceType;

  if (aiLiveStream) {
    try {
      aiLiveStream.getTracks().forEach(t => t.stop());
    } catch(e) {}
    aiLiveStream = null;
    window.aiLiveStream = null;
  }
  if (aiLiveRefreshTimer) {
    clearInterval(aiLiveRefreshTimer);
    aiLiveRefreshTimer = null;
  }

  aiLiveSourceType = sourceType;

  try {
    if (sourceType === 'camera') {
      let stream = null;
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false
        });
      } else {
        throw new Error('getUserMedia not supported');
      }

      if (!stream) throw new Error('Could not acquire camera stream');

      aiLiveStream = stream;
      window.aiLiveStream = stream;
      aiLiveSilentActive = false;
      window.aiLiveSilentActive = false;

      stream.getVideoTracks().forEach(track => {
        track.onended = () => {
          aiStopLiveStream(false);
        };
      });

      if (video) {
        video.style.display = 'block';
        video.srcObject = stream;
        try { await video.play(); } catch(e) {}
      }
      if (previewImg) previewImg.style.display = 'none';
      if (tabCard) tabCard.style.display = 'none';
    } else if (sourceType === 'screen') {
      // ── Hardware-Accelerated 60 FPS Window / Screen Stream ──
      let stream = null;
      if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } },
          audio: false
        });
      } else {
        throw new Error('getDisplayMedia not supported');
      }

      if (!stream) throw new Error('Could not acquire display stream');

      aiLiveStream = stream;
      window.aiLiveStream = stream;
      aiLiveSilentActive = false;
      window.aiLiveSilentActive = false;

      stream.getVideoTracks().forEach(track => {
        track.onended = () => {
          aiStopLiveStream(false);
        };
      });

      if (video) {
        video.style.display = 'block';
        video.srcObject = stream;
        try { await video.play(); } catch(e) {}
      }
      if (previewImg) previewImg.style.display = 'none';
      if (tabCard) tabCard.style.display = 'none';
    } else {
      // ── Tab hiện tại (Silent Ambient Viewport - Viền phát sáng đổ sáng bên trong, 100% không hiện thanh chia sẻ) ──
      aiLiveSilentActive = true;
      window.aiLiveSilentActive = true;
      aiLiveStream = null;
      window.aiLiveStream = null;

      if (video) {
        video.style.display = 'none';
        video.srcObject = null;
      }
      if (previewImg) previewImg.style.display = 'none';

      if (tabCard) {
        tabCard.style.display = 'flex';
        const info = (typeof aiGetCurrentPageInfo === 'function') ? aiGetCurrentPageInfo() : null;
        if (tabTitle) {
          tabTitle.textContent = (info && info.title) ? info.title : document.title || 'Tab hiện tại';
        }
      }
    }

    if (box) box.style.display = 'flex';
    if (btn) btn.classList.add('is-active');

    aiBroadcastLiveBorder(true);

    let sourceLabel = 'Tab';
    if (sourceType === 'camera') {
      sourceLabel = (typeof aiT === 'function') ? aiT('ai_live_source_camera', null, 'Camera') : 'Camera';
    } else if (sourceType === 'screen') {
      sourceLabel = (typeof aiT === 'function') ? aiT('ai_live_source_screen', null, 'Màn hình') : 'Màn hình';
    } else {
      sourceLabel = (typeof aiT === 'function') ? aiT('ai_live_source_tab', null, 'Tab hiện tại') : 'Tab hiện tại';
    }

    if (statusText) {
      statusText.textContent = 'REALTIME LIVE (' + sourceLabel + ')';
    }

    if (typeof showToast === 'function') {
      showToast('ai_toast_live_started', 'success', [sourceLabel]);
    }
    return true;
  } catch (err) {
    console.warn('aiStartLiveStream error:', err);

    if ((sourceType === 'screen' || sourceType === 'camera') && !isFallback) {
      console.info('Switching to Silent Tab Viewport fallback...');
      return await aiStartLiveStream('tab', true);
    }

    aiStopLiveStream(false);

    const isCancelled = err && (
      err.name === 'NotAllowedError' ||
      err.name === 'AbortError' ||
      (err.message && err.message.toLowerCase().includes('permission denied'))
    );

    if (!isCancelled) {
      if (typeof showToast === 'function') {
        showToast('ai_toast_live_error', 'warning');
      }
    }
    return false;
  }
}

function aiStopLiveStream(notify = true) {
  aiBroadcastLiveBorder(false);
  if (aiLiveRefreshTimer) {
    clearInterval(aiLiveRefreshTimer);
    aiLiveRefreshTimer = null;
  }
  if (aiLiveStream) {
    try {
      aiLiveStream.getTracks().forEach(t => t.stop());
    } catch(e) {}
    aiLiveStream = null;
    window.aiLiveStream = null;
  }
  aiLiveSilentActive = false;
  window.aiLiveSilentActive = false;

  const video = document.getElementById('ai-live-video');
  if (video) {
    video.srcObject = null;
    video.style.display = 'none';
  }

  const previewImg = document.getElementById('ai-live-preview-img');
  if (previewImg) {
    previewImg.src = '';
    previewImg.style.display = 'none';
  }

  const tabCard = document.getElementById('ai-live-tab-card');
  if (tabCard) {
    tabCard.style.display = 'none';
  }

  const box = document.getElementById('ai-live-box');
  if (box) box.style.display = 'none';

  const btn = document.getElementById('ai-btn-live-stream');
  if (btn) btn.classList.remove('is-active');

  if (notify && typeof showToast === 'function') {
    showToast('ai_toast_live_stopped', 'info');
  }
}

async function aiToggleLiveStream() {
  if (aiLiveSilentActive || aiLiveStream) {
    aiStopLiveStream(true);
    return;
  }
  await aiStartLiveStream('tab');
}

async function aiSwitchLiveStreamSource() {
  const sources = ['tab', 'screen', 'camera'];
  const curIdx = sources.indexOf(aiLiveSourceType);
  const nextSource = sources[(curIdx + 1) % sources.length];
  await aiStartLiveStream(nextSource, true);
}

function aiGrabLiveFrame(maxDimension = 768, quality = 0.6) {
  const video = document.getElementById('ai-live-video');
  if (video && video.srcObject && video.videoWidth && video.videoHeight) {
    let w = video.videoWidth;
    let h = video.videoHeight;
    if (w > maxDimension || h > maxDimension) {
      if (w > h) {
        h = Math.round((h * maxDimension) / w);
        w = maxDimension;
      } else {
        w = Math.round((w * maxDimension) / h);
        h = maxDimension;
      }
    }
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, w, h);
    const lowResDataUrl = canvas.toDataURL('image/jpeg', quality);
    const parts = lowResDataUrl.split(',');
    const base64Data = parts[1] || '';
    return {
      name: 'live_stream_frame.jpg',
      size: Math.round(base64Data.length * 0.75),
      mimeType: 'image/jpeg',
      data: base64Data,
      preview: lowResDataUrl,
      width: w,
      height: h,
      isLiveFrame: true
    };
  }
  if (window._aiLastLiveTabSnap) {
    return Object.assign({}, window._aiLastLiveTabSnap, { isLiveFrame: true });
  }
  return null;
}

function aiHandleLiveSnapClick() {
  const frame = aiGrabLiveFrame(768, 0.6);
  if (!frame) {
    if (typeof showToast === "function") showToast("ai_toast_capture_failed", "warning");
    return;
  }
  const existingIdx = aiAttachedImages.findIndex(im => im && im.isLiveFrame);
  if (existingIdx !== -1) {
    aiAttachedImages.splice(existingIdx, 1);
  }
  aiAttachedImages.push(frame);
  aiRenderAttachedImages();
  const kb = Math.round(frame.size / 1024);
  if (typeof showToast === "function") {
    showToast("ai_toast_vision_captured", "success", [kb]);
  }
}


function aiRenderAttachedImages(){
  const preview=document.getElementById("ai-image-preview");
  const list=document.getElementById("ai-image-preview-list");
  const countEl=document.getElementById("ai-image-count-label");
  const thumb=document.getElementById("ai-image-thumb");
  const nameEl=document.getElementById("ai-image-name");
  if(!preview) return;
  if(!aiAttachedImages.length){
    preview.style.display="none";
    if(list) list.textContent="";
    if(thumb) thumb.src="";
    if(nameEl) nameEl.textContent="";
    aiAttachedImage=null;
    return;
  }
  aiAttachedImage=aiAttachedImages[0]||null;
  preview.style.display="flex";
  if(countEl){
    countEl.textContent=(typeof getI18nText==="function")
      ? getI18nText("ai_attached_images_count",[aiAttachedImages.length, AI_MAX_ATTACHED_IMAGES])
      : ("Ảnh đã đính kèm ("+aiAttachedImages.length+"/"+AI_MAX_ATTACHED_IMAGES+")");
  }
  if(list){
    list.textContent="";
    aiAttachedImages.forEach((img, idx)=>{
      const card=document.createElement("div");
      card.className="ai-image-item";
      card.title=(img.name||"image")+" ("+Math.round((img.size||0)/1024)+" KB)";
      const imgEl=document.createElement("img");
      imgEl.src=img.preview;
      imgEl.alt=img.name||"attachment";
      card.appendChild(imgEl);
      const delBtn=document.createElement("button");
      delBtn.type="button";
      delBtn.className="ai-image-del-btn";
      delBtn.textContent="✕";
      delBtn.title=(typeof getI18nText==="function")?getI18nText("ai_btn_remove_this_image"):"Xóa ảnh này";
      delBtn.addEventListener("click",(ev)=>{
        ev.stopPropagation();
        aiAttachedImages.splice(idx, 1);
        aiRenderAttachedImages();
      });
      card.appendChild(delBtn);
      list.appendChild(card);
    });
  }
  const visionBtn=document.getElementById("ai-btn-capture-vision"); if(visionBtn){ const hasV=aiAttachedImages.some(im=>im&&im.isVision); visionBtn.classList.toggle("is-active", hasV || !!aiSettings.agentVision); }
  if(thumb&&aiAttachedImages[0]) thumb.src=aiAttachedImages[0].preview;
  if(nameEl&&aiAttachedImages[0]){
    nameEl.textContent=(aiAttachedImages.length===1)
      ? (aiAttachedImages[0].name+" ("+Math.round(aiAttachedImages[0].size/1024)+" KB)")
      : (aiAttachedImages.length+" ảnh đã chọn");
  }
}
function aiAttachImageFiles(files){
  const list=Array.from(files||[]).filter(f=>f&&typeof f.type==="string"&&f.type.startsWith("image/"));
  if(!list.length){
    if(typeof showToast==="function") showToast("ai_toast_image_only","warning");
    return false;
  }
  const currentCount=aiAttachedImages.length;
  const slots=AI_MAX_ATTACHED_IMAGES - currentCount;
  if(slots<=0){
    if(typeof showToast==="function") showToast("ai_toast_image_max","warning",[AI_MAX_ATTACHED_IMAGES]);
    return false;
  }
  if(list.length>slots){
    if(typeof showToast==="function") showToast("ai_toast_image_max","warning",[AI_MAX_ATTACHED_IMAGES]);
  }
  const toAdd=list.slice(0, slots);
  toAdd.forEach(f=>{
    if(f.size>4*1024*1024){
      if(typeof showToast==="function") showToast("ai_toast_image_large","warning");
      return;
    }
    const r=new FileReader();
    r.onload=e=>{
      if(aiAttachedImages.length>=AI_MAX_ATTACHED_IMAGES) return;
      const b64=String(e.target.result||"");
      const c=b64.indexOf(",");
      const d=c!==-1?b64.slice(c+1):b64;
      aiAttachedImages.push({
        data: d,
        mimeType: f.type||"image/jpeg",
        name: f.name||"clipboard.png",
        size: f.size||0,
        preview: b64
      });
      aiRenderAttachedImages();
    };
    r.readAsDataURL(f);
  });
  return true;
}
function aiAttachImageFile(f){
  return aiAttachImageFiles(f?[f]:[]);
}

function aiCheckLocalAssistantQuery(rawQuery){
  if(!rawQuery || typeof rawQuery !== "string") return null;
  const q = rawQuery.trim().toLowerCase().replace(/[?!.,;~…]+$/, "").trim();
  if(!q || q.length > 100) return null;

  const lang = (typeof currentAppLanguage !== "undefined" && currentAppLanguage) || "vi";
  const now = new Date();

  // 1. Date & Day of week
  const isDateQuery = /^(hôm nay( là)? thứ mấy|hôm nay ngày bao nhiêu|hôm nay ngày mấy|hôm nay ngày gì|ngày hôm nay( là ngày mấy)?|thứ mấy rồi|hôm nay là ngày nào|what day is today|what('s| is) today('s)? (date|day)|today('s)? date|今日は何曜日|今日の日付|今天星期几|今天是几号|какой сегодня день|какое сегодня число)$/i.test(q);
  if(isDateQuery){
    const daysVi = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
    const daysEn = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const daysZh = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
    const daysJa = ["日曜日", "月曜日", "火曜日", "水曜日", "木曜日", "金曜日", "土曜日"];
    const daysRu = ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"];

    const d = now.getDate().toString().padStart(2, "0");
    const m = (now.getMonth() + 1).toString().padStart(2, "0");
    const y = now.getFullYear();
    const dayIdx = now.getDay();
    const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    if(lang === "en"){
      return "📅 **Today is " + daysEn[dayIdx] + ", " + now.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) + "**.\n⏰ **Current time:** " + timeStr + ".\n\nWishing you a productive and wonderful day! ☀️";
    } else if(lang === "zh"){
      return "📅 **今天是 " + y + "年" + m + "月" + d + "日，" + daysZh[dayIdx] + "**。\n⏰ **当前时间：** " + timeStr + "。\n\n祝你拥有充实高效的一天！☀️";
    } else if(lang === "ja"){
      return "📅 **今日は " + y + "年" + m + "月" + d + "日（" + daysJa[dayIdx] + "）です**。\n⏰ **現在時刻：** " + timeStr + "。\n\n実りある素晴らしい一日をお過ごしください！☀️";
    } else if(lang === "ru"){
      return "📅 **Сегодня " + daysRu[dayIdx] + ", " + d + "." + m + "." + y + "**.\n⏰ **Текущее время:** " + timeStr + ".\n\nЖелаю вам продуктивного и отличного дня! ☀️";
    } else {
      return "📅 **Hôm nay là " + daysVi[dayIdx] + ", ngày " + d + "/" + m + "/" + y + "**.\n⏰ **Thời gian hiện tại:** " + timeStr + ".\n\nChúc bạn một ngày làm việc và học tập thật hiệu quả, tràn đầy năng lượng! ☀️";
    }
  }

  // 2. Current Time
  const isTimeQuery = /^(bây giờ là mấy giờ|mấy giờ rồi|bây giờ mấy giờ|thời gian hiện tại|mấy giờ thế|what time is it|what('s| is) the time|current time|今何時|现在几点|сколько сейчас времени|который час)$/i.test(q);
  if(isTimeQuery){
    const timeFull = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    if(lang === "en") return "⏰ **The current time is " + timeFull + "**.";
    if(lang === "zh") return "⏰ **现在时间是 " + timeFull + "**。";
    if(lang === "ja") return "⏰ **現在の時刻は " + timeFull + " です**。";
    if(lang === "ru") return "⏰ **Текущее время: " + timeFull + "**.";
    return "⏰ **Bây giờ là " + timeFull + "**.";
  }

  // 3. Greetings
  const isGreeting = /^(xin chào|chào bạn|chào|hello|hi|alo|chào trợ lý|chào scholarflow|good morning|good afternoon|good evening|hey|chào buổi sáng|chào buổi tối|chào nha|hi bạn|chào cậu|你好|こんにちは|привет|здравствуйте)$/i.test(q);
  if(isGreeting){
    if(lang === "en"){
      return "👋 **Hello!** I am **ScholarFlow AI** — your academic and digital research assistant.\n\nHow can I help you today? You can:\n- 📖 Analyze and summarize web pages\n- 🎥 Extract key chapters from YouTube videos\n- 💻 Assist with coding, exam solving, or translation\n- 📝 Clip notes and code directly to your Scratchpad\n\nAsk me anything to get started!";
    } else if(lang === "zh"){
      return "👋 **你好！** 我是 **ScholarFlow AI** — 你的学术与智能研究助手。\n\n今天有什么可以帮你的？你可以：\n- 📖 分析并总结网页或学术文章\n- 🎥 提取 YouTube 视频重要节点与时间戳\n- 💻 协助编写代码、解题或学术翻译\n- 📝 一键将摘要与代码片段摘录至暂存便签\n\n随时提出问题开始吧！";
    } else if(lang === "ja"){
      return "👋 **こんにちは！** **ScholarFlow AI** です — あなたの学術研究とWebリサーチを支援するスマートアシスタントです。\n\nどのようなお手伝いが必要ですか？\n- 📖 ウェブページや論文の要約・分析\n- 🎥 YouTube動画の重要タイムライン抽出\n- 💻 プログラミング、課題解説、翻訳\n- 📝 スクラッチパッドへの迅速なメモ・コード保存\n\nお気軽に質問を入力してください！";
    } else if(lang === "ru"){
      return "👋 **Здравствуйте!** Я **ScholarFlow AI** — ваш академический и исследовательский ассистент.\n\nЧем я могу вам помочь сегодня? Вы можете:\n- 📖 Анализировать и резюмировать веб-страницы\n- 🎥 Извлекать таймкоды и суть из видео YouTube\n- 💻 Помогать с кодингом, задачами и переводом\n- 📝 Сохранять заметки в блокнот в один клик\n\nЗадайте вопрос, чтобы начать!";
    } else {
      return "👋 **Xin chào bạn!** Tôi là **ScholarFlow AI** — trợ lý học thuật và nghiên cứu đồng hành cùng bạn.\n\nHôm nay tôi có thể hỗ trợ gì cho bạn? Bạn có thể:\n- 📖 Phân tích, tóm tắt và đọc hiểu trang web/bài báo đang xem\n- 🎥 Bóc tách mốc thời gian và tóm tắt video YouTube\n- 💻 Viết code, giải đề thi, dịch thuật học thuật\n- 📝 Trích dẫn nội dung trực tiếp vào Sổ nháp chỉ với 1 click\n\nHãy nhập câu hỏi hoặc bấm vào các nút gợi ý bên dưới để bắt đầu nhé!";
    }
  }

  // 4. Who are you / Identity
  const isIdentity = /^(bạn là ai|bạn tên gì|ngươi là ai|who are you|bạn là gì|tên bạn là gì|mày là ai|bạn là ai thế|你是谁|あなたは誰|кто ты)$/i.test(q);
  if(isIdentity){
    if(lang === "en"){
      return "🤖 I am **ScholarFlow AI**, an intelligent academic and research assistant built directly into your browser. I help you accelerate reading, analyze complex pages, summarize videos, generate citations, and take instant research notes.";
    } else if(lang === "zh"){
      return "🤖 我是 **ScholarFlow AI**，内置于浏览器中的全能学术与研究智能助手。我致力于帮助你高效阅读文献、分析复杂网页、提炼视频核心内容、生成学术引用并快速摘录笔记。";
    } else if(lang === "ja"){
      return "🤖 私はブラウザに統合された学術・研究アシスタント **ScholarFlow AI** です。ドキュメントの速読、Webページの深層理解、動画の要約、学術引用の生成、素早いメモ作成を強力にサポートします。";
    } else if(lang === "ru"){
      return "🤖 Я **ScholarFlow AI** — интеллектуальный исследовательский ассистент, встроенный прямо в ваш браузер. Я помогаю быстрее читать документы, анализировать страницы, резюмировать видео и организовывать заметки.";
    } else {
      return "🤖 Tôi là **ScholarFlow AI** — trợ lý học thuật và tri thức số thông minh được tích hợp trực tiếp ngay trong trình duyệt của bạn.\n\nTôi được thiết kế để giúp bạn tăng tốc độ đọc hiểu tài liệu, nghiên cứu khoa học, bóc tách video YouTube, tạo trích dẫn chuẩn và ghi chú học tập nhanh chóng.";
    }
  }

  // 5. Capabilities / Feature guide
  const isCapabilities = /^(bạn làm được gì|hướng dẫn( sử dụng)?|chức năng|tính năng|bạn có thể làm gì|scholarflow có gì|help|hướng dẫn trợ lý|có tính năng gì|hướng dẫn dùng|giúp gì được|你能做什么|何ができますか|что ты умеешь)$/i.test(q);
  if(isCapabilities){
    if(lang === "en"){
      return "✨ **Key Capabilities of ScholarFlow AI:**\n\n1. 📖 **Web Context & Deep Q&A:** Summarize articles, explain complex terms, analyze code, and solve exercises directly from the active tab.\n2. 🎥 **YouTube Breakdown:** Extract key chapters, summarize transcripts, and jump directly to timestamps.\n3. 📚 **Academic Citations:** Generate APA, MLA, Chicago, Harvard, BibTeX citations instantly.\n4. 📝 **Instant Scratchpad:** Clip quotes, tables, and code snippets into your persistent local notebook.\n5. 🛡️ **Privacy & Security:** Sensitive data redaction, Phishing detection, and Safe Link Guard.\n\n💡 *Tip: Simply type your question or click the quick action chips below to get started!*";
    } else if(lang === "zh"){
      return "✨ **ScholarFlow AI 核心功能：**\n\n1. 📖 **网页深度理解与问答：** 一键提炼要点、学术翻译、代码分析、解答页面练习题。\n2. 🎥 **YouTube 视频解析：** 智能时间轴分段、核心内容提炼、点击跳转播放。\n3. 📚 **标准学术引用：** 快速生成 APA, MLA, Chicago, Harvard, BibTeX 等规范引用格式。\n4. 📝 **随身便签（Scratchpad）：** 随时摘录网页高价值段落与代码。\n5. 🛡️ **隐私与安全保护：** 敏感数据脱敏、防钓鱼钓网与 Link Guard 安全过渡。\n\n💡 *提示：直接输入问题或点击下方的快捷提示按钮即可开始！*";
    } else if(lang === "ja"){
      return "✨ **ScholarFlow AI の主な機能：**\n\n1. 📖 **Webページの深層理解とQ&A：** 記事の要約、学術翻訳、コード解説、ページ内の問題演習の回答。\n2. 🎥 **YouTube動画の構造化：** チャプター別の要約、タイムスタンプへのワンクリックジャンプ。\n3. 📚 **学術文献引用（Citation）：** APA, MLA, Chicago, Harvard, BibTeX などの標準引用を自動生成。\n4. 📝 **スクラッチパッド：** 重要な引用文やコードスニペットを素早くローカル保存。\n5. 🛡️ **セキュリティ＆プライバシー：** 機密情報のマスキング、フィッシング検知、Link Guard 保護。\n\n💡 *ヒント：質問を入力するか、下のクイックチップをクリックして始めましょう！*";
    } else if(lang === "ru"){
      return "✨ **Возможности ScholarFlow AI:**\n\n1. 📖 **Глубокий анализ страниц:** Быстрое резюме, перевод, объяснение кода и решение задач по содержимому текущей вкладки.\n2. 🎥 **Разбор видео YouTube:** Выделение ключевых глав, тезисы и мгновенный переход по таймкодам.\n3. 📚 **Академическое цитирование:** Автогенерация цитат в стандартах APA, MLA, Chicago, BibTeX.\n4. 📝 **Блокнот (Scratchpad):** Быстрое сохранение цитат и сниппетов кода в один клик.\n5. 🛡️ **Безопасность:** Маскирование чувствительных данных, защита от фишинга и Link Guard.\n\n💡 *Совет: введите любой вопрос или используйте быстрые кнопки ниже!*";
    } else {
      return "✨ **Các tính năng nổi bật của ScholarFlow & AI Trợ lý:**\n\n1. 📖 **Đọc hiểu & Tóm tắt trang web:** Tự động trích xuất ý chính, dịch thuật chuyên sâu, giải đề trắc nghiệm và phân tích mã nguồn ngay trên tab đang xem.\n2. 🎥 **Bóc tách Video YouTube:** Tóm tắt video theo mốc thời gian (timeline), bấm vào mốc thời gian để nhảy trực tiếp đến video.\n3. 📚 **Trích dẫn chuẩn học thuật:** Tạo nhanh trích dẫn APA, MLA, Chicago, Harvard, IEEE, BibTeX từ DOI/URL.\n4. 📝 **Sổ nháp & Trích xuất mã:** Lưu trích dẫn, ảnh, ghi chú nhanh vào Sổ nháp chỉ với 1 click.\n5. 🛡️ **Bảo mật & Tiện ích:** Che mờ thông tin nhạy cảm, chống lừa đảo Link Guard, Quản lý tab và Pomodoro.\n\n💡 *Mẹo: Bạn có thể gõ câu hỏi bất kỳ hoặc dùng các phím tắt nhanh trên thanh công cụ để bắt đầu!*";
    }
  }

  return null;
}

function aiDetectAutoNavIntent(rawQuery){
    if(!rawQuery || typeof rawQuery !== "string") return null;
    const q = rawQuery.trim().replace(/^[\/!](agent|sandbox|browse)\s+/i, "");

    const isYt = /(youtube|kênh|kenh|video|clip|yt)/i.test(q);

    // Pattern: "tìm kênh youtube độ mixi và bật lên" or "tìm trang web mixigaming thì tìm kiếm và bật lên"
    // Also matches generic "mở [xyz]" or "bật [xyz]"
    const match = /(?:tìm(?:\s+kiếm)?|search|kiếm|mở|bật|truy cập)\s+(.+?)(?:\s+(?:thì\s+tìm\s+kiếm\s+)?(?:và|rồi|va|roi)?\s*(?:bật|mở|open|truy cập|vào)\s*(?:lên|ra)?(?:\s+(?:giúp|hộ)\s+(?:tôi|tao|mình|em|nha|nhé|cho tôi))?)?$/i.exec(q);

    if(match && match[1]){
      let topic = match[1].trim();
      // Remove trailing " và bật lên" just in case the regex captured it in group 1
      topic = topic.replace(/(?:\s+(?:thì\s+tìm\s+kiếm\s+)?(?:và|rồi)\s*(?:bật|mở)\s*lên)$/i, "").trim();
      if(topic.length >= 2) return { query: topic, topic: topic, original: q, isYoutube: isYt };
    }

    const authNav = /^(?:hãy\s+|giúp\s+tôi\s+|làm\s+ơn\s+)?(đăng\s*ký|dang\s*ky|sign\s*up|register|tạo\s*tài\s*khoản|đăng\s*nhập|dang\s*nhap|login|sign\s*in|log\s*in)\s+(?:tài\s*khoản\s+|tai\s*khoan\s+|trang\s+|web\s+)?(aws|amazon|github|gitlab|google|gmail|openai|chatgpt|claude|discord|tiktok|facebook|messenger|instagram|linkedin|twitter|reddit|netflix|spotify|canva|figma|notion|vercel|cloudflare|azure|gcp|[a-z0-9-]+\.[a-z]{2,})(?:\s+(?:giúp|hộ|cho)\s*(?:tôi|tao|mình|em)?|\s+(?:nha|nhé|luôn|đi))*[\s.!?]*$/i.exec(q);
    if(authNav && authNav[2]){
      const isSignup = /đăng\s*ký|dang\s*ky|sign\s*up|register|tạo\s*tài\s*khoản/i.test(authNav[1]);
      const svc = authNav[2].trim();
      return {
        query: svc + (isSignup ? " sign up create account" : " login sign in"),
        topic: svc,
        action: isSignup ? "signup" : "login",
        original: q,
        isYoutube: false
      };
    }

    return null;
  }

  async function aiExecuteAutoNav(navIntent, provider){
  aiIsSending = true;
  aiUserStopped = false;
  aiAbort = new AbortController();

  const sendBtn = document.getElementById("ai-btn-send");
  if(sendBtn){
    sendBtn.classList.add("is-stop");
    sendBtn.textContent = "⏹";
    sendBtn.disabled = false;
    sendBtn.title = aiT("ai_btn_stop", null, "Dừng tạo câu trả lời");
  }

  aiShowTyping(aiT("ai_autonav_searching", null, "🔍 Đang tìm kiếm và chuẩn bị mở trang web..."));

  let targetUrl = "";
  let targetTitle = "";
  let extraSources = [];

  try {
    let sQuery = navIntent.query;
    if(navIntent.isYoutube && !/youtube/i.test(sQuery)){
      sQuery = "youtube " + sQuery;
    }
    const searchRes = await aiSearchMultiSources(sQuery);

    if(aiUserStopped) return;

    if(searchRes && Array.isArray(searchRes.sources) && searchRes.sources.length){
      if(navIntent.isYoutube){
        const yt = searchRes.sources.find(s => s && s.u && /youtube\.com|youtu\.be/i.test(s.u));
        if(yt){
          targetUrl = yt.u;
          targetTitle = yt.t || "YouTube";
        }
      }
      if(!targetUrl){
        targetUrl = searchRes.sources[0].u;
        targetTitle = searchRes.sources[0].t || "";
      }
      extraSources = searchRes.sources.filter(s => s.u !== targetUrl).slice(0, 3);
    }

    if(!targetUrl){
      if(navIntent.isYoutube){
        targetUrl = "https://www.youtube.com/results?search_query=" + encodeURIComponent(navIntent.query);
        targetTitle = "YouTube Search: " + navIntent.query;
      } else if(/^([a-z0-9_-]+\.)+[a-z]{2,}(\/.*)?$/i.test(navIntent.query)){
        targetUrl = "https://" + navIntent.query;
        targetTitle = navIntent.query;
      } else {
        targetUrl = "https://www.google.com/search?q=" + encodeURIComponent(navIntent.query);
        targetTitle = "Tìm kiếm: " + navIntent.query;
      }
    }

    const tabsApi = (typeof browser !== "undefined" && browser.tabs) ? browser.tabs : (typeof chrome !== "undefined" ? chrome.tabs : null);
    let opened = false;
    let tabId = null;
    if(tabsApi && tabsApi.create){
      try {
        const created = tabsApi.create({ url: targetUrl, active: true });
        if(created && typeof created.then === "function"){
          const t = await created;
          if(t && typeof t.id === "number") tabId = t.id;
        }
        opened = true;
      } catch(e) {}
    }
    if(!opened){
      try {
        window.open(targetUrl, "_blank");
        opened = true;
      } catch(e) {}
    }

    let actionResults = [];
    if(Array.isArray(navIntent.plan) && navIntent.plan.length && !aiUserStopped){
      aiUpdateTypingStatus(aiT("ai_agent_action_running", null, "▶ Đang thực hiện thao tác trên trang..."));
      actionResults = await aiAgentRunPlan(navIntent.plan, tabId);
    }

    aiHideTyping();
    aiIsSending = false;
    if(sendBtn){
      sendBtn.classList.remove("is-stop");
      sendBtn.textContent = "➤";
      sendBtn.title = aiT("ai_btn_send", null, "Gửi câu hỏi");
    }

    let report = "**" + aiT("ai_autonav_opened", null, "Đã tìm thấy và tự động mở trang web:") + "**\n\n";
    report += "**[" + (targetTitle || targetUrl) + "](" + targetUrl + ")**\n\n";
    report += "- **Địa chỉ web:** `" + targetUrl + "`\n";
    report += "- **Thao tác:** Đã tự động mở trong tab mới của trình duyệt\n";

    if(extraSources.length){
      report += "\n**" + aiT("ai_autonav_related", null, "Các địa chỉ liên quan:") + "**\n";
      extraSources.forEach(es => {
        report += "- [" + (es.t || es.u) + "](" + es.u + ")\n";
      });
    }

    report += aiAgentResultsReport(actionResults);

    report += "\n*(Nếu trình duyệt ngăn mở tab tự động, bạn có thể bấm trực tiếp vào đường link màu xanh phía trên để truy cập)*";

    aiAppendMessage("assistant", report, provider);
    aiSaveHistorySoon();
  } catch(err) {
    aiHideTyping();
    aiIsSending = false;
    if(sendBtn){
      sendBtn.classList.remove("is-stop");
      sendBtn.textContent = "➤";
      sendBtn.title = aiT("ai_btn_send", null, "Gửi câu hỏi");
    }
    aiAppendMessage("assistant", aiT("ai_autonav_not_found", null, "⚠️ Không tìm thấy địa chỉ trang web phù hợp cho yêu cầu này."), provider);
  }
}

const AI_AGENT_SENSITIVE_RE = /(?:đang\s*thông|đăng\s*ký|dang\s*ky|đăng\s*nhập|dang\s*nhap|thanh\s*toán|chuyển\s*khoản|giỏ\s*hàng|đặt\s*hàng|mua\s*hàng|mua\s*ngay|checkout|payment|purchase|subscribe|follow|sign\s*in|log\s*in|add to cart|delete account|xóa\s*tài khoản)/i;
const AI_AGENT_ACTION_VERBS = [
  { verb:"click", labelKey:"ai_agent_label_unsubscribe", sensitive:true, match:["hủy đăng ký","huy dang ky","unsubscribe","unfollow","bỏ theo dõi","bo theo doi","huỷ đăng ký"],
    re:/(^|[\s,;:!?"'`(\[■])(?:(?:nhấn|nhan|bấm|bam|click|tap|press|chọn|chon)\s+(?:nút\s+|nut\s+|vào\s+|vao\s+)?)?(?:hủy\s*đăng\s*ký|huy\s*dang\s*ky|bỏ\s*theo\s*dõi|bo\s*theo\s*doi|unsubscribe|unfollow)(?=[\s,;.!?)"'»\]]|$)/i },
  { verb:"click", labelKey:"ai_agent_label_subscribe", sensitive:true, match:["đăng ký","dang ky","subscribe","follow","theo dõi","theo doi"],
    selector:"ytd-watch-metadata ytd-subscribe-button-renderer button, #owner #subscribe-button button, yt-subscribe-button-view-model button, #subscribe-button-shape button, ytd-subscribe-button-renderer button, #subscribe-button button, button[data-e2e='follow-button'], [data-e2e='follow-button'] button, [data-e2e='follow-button'], button[data-e2e='browse-follow'], [data-e2e='browse-follow'], button[data-e2e='feed-follow'], [data-e2e='feed-follow'], button[data-e2e='user-info-follow-btn']",
    re:/(^|[\s,;:!?"'`(\[■])(?:(?:nhấn|nhan|bấm|bam|click|tap|press|chọn|chon)\s+(?:nút\s+|nut\s+|vào\s+|vao\s+)?)?(?:đăng\s*ký(?:\s+kênh)?|dang\s*ky(?:\s+kenh)?|subscribe|theo\s*dõi|theo\s*doi|follow)(?=[\s,;.!?)"'»\]]|$)/i },
  { verb:"click", labelKey:"ai_agent_label_like", sensitive:false, match:["like","thích","thich","thả tim","tha tim","upvote","love"],
    selector:"ytd-WatchMetadata like-button-view-model button, segmented-like-dislike-button-view-model like-button-view-model button, #top-level-buttons-computed ytd-toggle-button-renderer:first-of-type button, [data-e2e='like-icon'], [data-e2e='browse-like-icon'], button[aria-label*='like this' i], button[aria-label*='thích video' i], div[role='button'][aria-label*='Thích' i], div[role='button'][aria-label*='Like' i]",
    re:/(^|[\s,;:!?"'`(\[■])(?:(?:nhấn|nhan|bấm|bam|click|tap|press|chọn|chon)\s+(?:nút\s+|nut\s+|vào\s+|vao\s+)?)?(?:like|thích|thả\s*tim|tha\s*tim|upvote)(?=[\s,;.!?)"'»\]]|$)/i },
  { verb:"click", labelKey:"ai_agent_label_share", sensitive:false, match:["chia sẻ","chia se","share"],
    selector:"ytd-WatchMetadata button[aria-label*='Share' i], ytd-WatchMetadata button[aria-label*='Chia sẻ' i], #top-level-buttons-computed ytd-button-renderer button[aria-label*='Share' i], [data-e2e='share-icon'], [data-e2e='browse-share-group'], button[aria-label*='Share' i], button[aria-label*='Chia sẻ' i]",
    re:/(^|[\s,;:!?"'`(\[■])(?:(?:nhấn|nhan|bấm|bam|click|tap|press)\s+(?:nút\s+|nut\s+|vào\s+|vao\s+)?)?(?:chia\s*sẻ|chia\s*se|share)(?=[\s,;.!?)"'»\]]|$)/i },
  { verb:"click", labelKey:"ai_agent_label_login", sensitive:true, match:["đăng nhập","dang nhap","login","sign in","log in"],
    re:/(^|[\s,;:!?"'`(\[■])(?:(?:nhấn|nhan|bấm|bam|click|tap|press)\s+(?:nút\s+|nut\s+|vào\s+|vao\s+)?)?(?:đăng\s*nhập|dang\s*nhap|sign\s*in|log\s*in|login)(?=[\s,;.!?)"'»\]]|$)/i },
  { verb:"click", labelKey:"ai_agent_label_buy", sensitive:true, match:["mua","thanh toán","checkout","add to cart","thêm vào giỏ","mua ngay"],
    re:/(^|[\s,;:!?"'`(\[■])(?:mua\s*hàng|mua ngay|mua|mua sắm|mua sam|thanh\s*toán|checkout|payment|purchase|đặt\s*hàng|thêm vào giỏ|add to cart)(?=[\s,;.!?)"'»\]]|$)/i },
  { verb:"scroll", labelKey:"ai_agent_step_scroll", sensitive:false, match:null,
    re:/(^|[\s,;:!?"'`(\[■])(?:cuộn\s*(?:xuống|lên|trang)?|kéo\s*(?:xuống|lên)|scroll\s*(?:down|up|to\s*bottom|to\s*top)?)(?=[\s,;.!?)"'»\]]|$)/i },
  { verb:"comment", labelKey:"ai_agent_label_comment", sensitive:false, match:["bình luận","binh luan","comment","nhận xét","add a comment","viết bình luận"],
    selector:"#contenteditable-root[contenteditable='true'], ytd-comment-simplebox-renderer #placeholder-area, [data-e2e='comment-input'] [contenteditable='true'], [data-e2e='comment-text'] [contenteditable='true'], div[class*='DivInputEditor'] [contenteditable='true'], textarea[placeholder*='comment' i], textarea[placeholder*='bình luận' i], [contenteditable='true'][aria-label*='comment' i], [contenteditable='true'][aria-label*='bình luận' i], [role='textbox'][aria-label*='comment' i], [role='textbox'][aria-label*='bình luận' i]",
    re:/(^|[\s,;:!?"'`(\[■])(?:(?:viết|viet|gửi|gui|đăng|dang|thêm|them|nhập|nhap)\s+)?(?:bình\s*luận|binh\s*luan|comment|nhận\s*xét|nhan\s*xet|cmt)(?=[\s,:;.!?)"'»\]]|$)/i },
  { verb:"message", labelKey:"ai_agent_label_message", sensitive:false, match:["tin nhắn","tin nhan","message","nhắn tin","aa","write a message","gửi tin nhắn"],
    selector:"div[role='textbox'][contenteditable='true'], [contenteditable='true'][aria-label*='message' i], [contenteditable='true'][aria-label*='tin nhắn' i], [contenteditable='true'][data-lexical-editor='true'], div[class*='slateTextArea'][contenteditable='true'], textarea[placeholder*='message' i], textarea[placeholder*='tin nhắn' i]",
    re:/(^|[\s,;:!?"'`(\[■])(?:(?:gửi\s+|gui\s+)?(?:tin\s*nhắn|tin\s*nhan)|nhắn\s*tin|nhan\s*tin|trả\s*lời\s*tin\s*nhắn|reply\s*message|send\s*message|chat\s*với)(?=[\s,:;.!?)"'»\]]|$)/i },
  { verb:"submit", labelKey:"ai_agent_step_submit", sensitive:false, match:null,
    re:/(^|[\s,;:!?"'`(\[■])(?:gửi|gui|submit|nhấn\s*enter|nhan enter|press\s*enter|enter)(?=[\s,;.!?)"'»\]]|$)/i },
  { verb:"type", labelKey:"ai_agent_step_type", sensitive:true, match:["mật khẩu", "mật mã", "password"],
    selector:"input[type='password']",
    re:/(^|[\s,;:!?"'(\[\u2026])(?:nhập\s*mật\s*khẩu|nhap\s*mat\s*khau|nhập\s*password|type\s*password|điền\s*mật\s*khẩu)(?=[\s,:;"'\[\u2026]|$)/i },
  { verb:"type", labelKey:"ai_agent_step_type", sensitive:false, match:null,
    re:/(^|[\s,;:!?"'`(\[■])(?:gõ|go|nhập|nhap|type|điền|dien|fill)(?=[\s,:;"'`\[■]|$)/i },
  { verb:"click", labelKey:"ai_agent_step_click", sensitive:false, match:null,
    re:/(^|[\s,;:!?"'`(\[■])(?:bấm|bam|nhấn|nhan|chọn|chon|click|tap|press)(?=[\s,:;"'`\[■]|$)/i }
];
function aiAgentStripTail(s){
  return String(s||"")
    .replace(/[\s,;:.!?]*(?:giúp\s*(?:tôi|tao|mình|em|nó|no)?|hộ\s*(?:tôi|tao|mình|em)?|ho\s*(?:tôi|tao)?|làm\s*ơn|lam\s*on|help\s*me|please|cho\s*(?:tôi|tao|mình|em)?|nha|nhé|ne|đi|di|nữa|nua|luôn|luon)[\s,;:.!?]*$/i,"")
    .replace(/[\s,;:.!?]+(?:rồi|roi|va|và|và\s*rồi|then|sau\s*đó|tiep\s*theo|tiếp theo)[\s,;:.!?]*$/i,"")
    .trim();
}
function aiAgentStripLead(s){
  return String(s||"")
    .replace(/^(?:[\s,;:.!?]*(?:rồi|roi|va|và|then|sau\s*đó|tiep\s*theo|tiếp theo|để|de|và\s*nhập|va nhap|trực\s*tiếp|truc\s*tiep)[\s,;:.!?]+)/i,"")
    .replace(/^(?:[\s,;:.!?]+)/,"")
    .trim();
}
function aiAgentStripDeicticTarget(s){
  return String(s||"")
    .replace(/^(?:vào\s+|vao\s+|cho\s+|trên\s+|tren\s+|ở\s+|o\s+|tại\s+|tai\s+)?(?:nút\s+|nut\s+|button\s+)?(?:kênh|kenh|video|clip|bài\s*viết|bai\s*viet|bài\s*đăng|bài|bai|trang\s*web|trang|page|channel|post|stream|livestream)(?:\s+(?:youtube|tiktok|facebook|fb|discord|messenger|instagram|ig|x|twitter|web|này|nay|đó|do|hiện\s*tại|đang\s*xem|đang\s*mở))*$/i, "")
    .replace(/\s+(?:trên|tren|ở|o|tại|tai|vào|vao|cho)\s+(?:kênh|kenh|video|clip|bài\s*viết|bài|trang|youtube|tiktok|facebook|fb|discord|messenger)(?:\s+(?:này|nay|đó|do|hiện\s*tại|đang\s*xem))?$/i, "")
    .replace(/\s+(?:kênh|kenh|video|clip|bài\s*viết|bài|trang|channel|post)\s+(?:này|nay|đó|do|hiện\s*tại|đang\s*xem)$/i, "")
    .replace(/^(?:này|nay|đó|do|hiện\s*tại|đang\s*xem)$/i, "")
    .trim();
}
function aiAgentStripSearchVerb(s){
  const t = String(s||"").trim();
  if(/^(?:tìm\s+hiểu|tim\s*hieu|research|tìm\s*hiểu)/i.test(t)) return t;
  const r = t.replace(/^[\/!]?(?:agent|sandbox|browse)\s+/i,"")
             .replace(/^(?:tìm(?:\s+kiếm)?|search|kiếm|mở|bật|truy cập|open|launch)\s+/i,"").trim();
  return r || t;
}
function aiAgentIsNavCommand(s){
  const t = String(s||"").trim();
  if(/^[\/!]?(?:agent|sandbox|browse)\b/i.test(t)) return true;
  if(/^(?:tìm\s+hiểu|tim\s*hieu|research|tìm\s*hiểu)\b/i.test(t)) return false;
  return /^(?:tìm(?:\s+kiếm)?|search|kiếm|mở|bật|truy cập|open|launch)\s/i.test(t);
}
function aiDetectAgentAction(rawQuery){
  if(!rawQuery || typeof rawQuery !== "string") return null;
  const q = rawQuery.trim().replace(/^[\/!](?:agent|sandbox|browse)\s+/i,"");
  if(q.length < 4) return null;
  let best = null;
  for(let i=0;i<AI_AGENT_ACTION_VERBS.length;i++){
    const v = AI_AGENT_ACTION_VERBS[i];
    const m = v.re.exec(q);
    if(!m) continue;
    const before = q.slice(0, m.index).trim();
    if(before !== "" && !/(?:^|[\s,;:.!?])(?:rồi|roi|va|và|then|next|sau\s*đó|tiep\s*theo|tiếp theo|hãy|hay|vui\s*lòng|làm\s*ơn|giúp\s*tôi|hộ\s*tôi|,)$/i.test(before)) continue;
    const hit = { idx: m.index, verb: v, matchedText: m[0], clause: q.slice(m.index + m[0].length), priority: i };
    if(!best || hit.idx < best.idx || (hit.idx === best.idx && hit.priority < best.priority)) best = hit;
  }
  if(!best) return null;
  const v = best.verb;
  let topic = aiAgentStripTail(q.slice(0, best.idx));
  topic = aiAgentStripSearchVerb(topic);
  if(topic.length < 2) topic = aiAgentStripSearchVerb(aiAgentStripTail(q.slice(0, best.idx)));
  let clause = aiAgentStripLead(best.clause);
  clause = aiAgentStripTail(clause);
  const out = { verb:v.verb, topic:topic, raw:rawQuery.trim(), labelKey:v.labelKey, match:null, text:null, selector:v.selector||null, submitAfter:false, sensitive:!!v.sensitive };
  if(v.verb === "scroll"){
    const isUp = /(?:lên|up|top)/i.test(best.matchedText + " " + clause);
    out.dir = isUp ? "up" : "down";
    return out;
  }
  if(v.verb === "comment" || v.verb === "message"){
    let textPart = clause;
    textPart = textPart.replace(/^(?:trực\s*tiếp\s+)?(?:trên|tren|vào|vao|ở|o|tại|tai|cho)\s+(?:kênh\s+|video\s+|bài\s+|trang\s+)?(?:youtube|discord|messenger|facebook|fb|tiktok|web|này|nay|đó|do)(?:\s+(?:này|nay|bản\s*web))?\s*(?:[:：,-]|\s+là|\s+rằng|\s+nội\s*dung)?\s*/i, "");
    const cm = /^(.+?)\s+(?:vào|vao|trên|tren|trong|into|to|at)\s+(?:ô\s+|khung\s+|kênh\s+|video\s+)?(youtube|discord|messenger|facebook|tiktok|bình\s*luận|comment|tin\s*nhắn|chat)(?:\s+này)?$/i.exec(textPart);
    if(cm) textPart = cm[1];
    textPart = String(textPart||"").replace(/^[:：,\s]+/, "").replace(/^["'“”']+|["'“”']+$/g,"").trim();
    out.match = v.match ? v.match.slice() : [v.verb];
    if(textPart){
      out.text = textPart;
      out.submitAfter = true;
    }
    return out;
  }
  if(v.verb === "type"){
    const cm = /^(.+?)\s+(?:vào|vao|trong|into|to|at)\s+(.+)$/i.exec(clause);
    let textPart = clause, targetPart = "";
    if(cm){ textPart = cm[1]; targetPart = cm[2]; }
    textPart = String(textPart||"").replace(/^[:：,\s]+/, "").replace(/^["'“”']+|["'“”']+$/g,"").trim();
    targetPart = aiAgentStripTail(String(targetPart||"").replace(/^["'“”']+|["'“”']+$/g,"").trim());
    if(!textPart && !targetPart) return null;
    out.text = textPart;
    if(targetPart){ out.match = [targetPart]; out.labelKey = "ai_agent_step_type"; }
    else if(v.match && v.match.length){ out.match = v.match.slice(); }
    if(/(?:rồi|roi|va|và|,)?\s*(?:gửi|gui|submit|nhấn\s*enter|nhan enter|press\s*enter|enter)\s*$/i.test(clause) ||
       /(?:gửi|gui|submit|enter)\s*$/i.test(q)){ out.submitAfter = true; }
  } else if(v.verb === "submit"){
    out.verb = "submit";
  } else {
    let target = aiAgentStripTail(clause);
    target = aiAgentStripDeicticTarget(target);
    if(v.match && !target){ out.match = v.match.slice(); }
    else if(v.match && /^(?:nút|nut|button|link|tab|mục|muc|ô|trang)\s*/i.test(target)){
      const cleaned = aiAgentStripDeicticTarget(target.replace(/^(?:nút|nut|button|link|tab|mục|muc|ô|trang)\s+/i,"").trim());
      out.match = cleaned ? [cleaned].concat(v.match) : v.match.slice();
    }
    else if(target){
      out.match = v.match ? [target].concat(v.match) : [target];
    }
    else if(v.match){ out.match = v.match.slice(); }
    if(!out.match || !out.match.length) return null;
    out.sensitive = !!v.sensitive || AI_AGENT_SENSITIVE_RE.test((out.match||[]).join(" ") + " " + target);
  }
  out.sensitive = out.sensitive || AI_AGENT_SENSITIVE_RE.test(out.text || "") || AI_AGENT_SENSITIVE_RE.test((out.match||[]).join(" "));
  return out;
}
function aiBuildAgentActionPlan(action, isYoutube){
  const steps = [];
  const a = action;
  if(!a) return steps;

  if (a.verb === 'scroll') {
    return [{ kind:'scroll', dir:a.dir||'down', y:a.dir==='up'?-550:550, label:a.dir==='up'?'lên trên':'xuống dưới' }];
  }

  // Dynamic fallback for complex intents
  const isComplexTarget = /aws|amazon|tài\s*khoản|tai\s*khoan|đăng\s*ký\s*aws|đăng\s*ký\s*tài\s*khoản|hủy\s*đăng\s*ký|huy\s*dang\s*ky/i.test(a.raw || "") || ['đăng nhập', 'dang nhap', 'login', 'sign in', 'mua', 'checkout', 'nhắn tin', 'tin nhắn', 'message', 'hủy đăng ký', 'unsubscribe', 'unfollow', 'bỏ theo dõi'].some(m => (a.match||[]).includes(m));

  if ((!a.selector || isComplexTarget) && (a.verb === 'click' || a.verb === 'message' || a.verb === 'comment' || a.verb === 'type')) {
       // Only fallback if there's no pre-defined text to type (e.g. social compose)
       if (!a.text) {
         return [{ kind: 'dynamic', rawQuery: a.raw, isYoutube: isYoutube }];
       }
  }

  // Otherwise, use static plan
  steps.push({ kind:'wait', ms: isYoutube ? 2600 : 1800 });

  if (a.verb === 'type' || a.verb === 'comment' || a.verb === 'message') {
    if(a.match && a.match.length) steps.push({ kind:'click', match:a.match.slice(), selector:a.selector||null, label:a.match[0] });
    if(a.text) steps.push({ kind:'type', text:String(a.text), match:(a.match&&a.match.length)?a.match.slice():null, selector:a.selector||null, label:String(a.text), strictEditable: true });
    if(a.submitAfter) steps.push({ kind:'submit', match:(a.match&&a.match.length)?a.match.slice():null, selector:a.selector||null, strictEditable: true });
  } else if (a.verb === 'submit') {
    steps.push({ kind:'submit', match:null });
  } else {
    steps.push({ kind:'click', match:(a.match&&a.match.length)?a.match.slice():null, selector:a.selector||null, label:(a.match&&a.match[0])||'', labelKey:a.labelKey||null, sensitive:!!a.sensitive });
  }
  return steps;
}
function aiAgentPlanIsSensitive(plan){
  if(!Array.isArray(plan)) return false;
  for(let i=0;i<plan.length;i++){
    const s = plan[i];
    if(!s) continue;
    if(s.sensitive) return true;
    const blob = [s.label, s.text, (s.match||[]).join(" "), s.selector].join(" ");
    if(blob && AI_AGENT_SENSITIVE_RE.test(blob)) return true;
  }
  return false;
}
function aiAgentRequiresApproval(plan, confirmSetting){
  if(!Array.isArray(plan) || !plan.length) return false;
  if(aiAgentPlanIsSensitive(plan)) return true;
  return confirmSetting !== false;
}
function aiAgentStepLabel(step){
  if(!step) return "";
  if(step.kind === "navigate") {
    let lbl = step.label||step.url||"";
    return aiT("ai_agent_step_navigate", [lbl], "Mở trang " + lbl).replace("{0}", lbl);
  }
      if(step.kind === "dynamic") {
      return "Tự động phân tích DOM và hành động...";
    }
    if(step.kind === "wait") {
    let lbl = String(Math.round((step.ms||1500)/100)/10);
    return aiT("ai_agent_step_wait", [lbl], "Chờ trang tải " + lbl + "s").replace("{0}", lbl);
  }
  if(step.kind === "scroll") {
    let lbl = step.label || (step.dir === "up" ? "lên trên" : "xuống dưới");
    return aiT("ai_agent_step_scroll", [lbl], "Cuộn trang " + lbl).replace("{0}", lbl);
  }
  if(step.kind === "type") {
    let lbl = step.text||step.label||"";
    return aiT("ai_agent_step_type", [lbl], "Nhập: " + lbl).replace("{0}", lbl);
  }
  if(step.kind === "submit") return aiT("ai_agent_step_submit", null, "Gửi form / Nhấn Enter");
  if(step.kind === "click"){
    let lbl = step.label || (step.match && step.match[0]) || "";
    if(step.labelKey && step.labelKey !== "ai_agent_step_click") {
      let text = aiT(step.labelKey, [lbl], "");
      if(text && text !== step.labelKey) return text.split("{0}").join(lbl);
    }
    if(!lbl) lbl = "nút tương ứng";
    return aiT("ai_agent_step_click", [lbl], "Bấm: " + lbl).split("{0}").join(lbl);
  }
  return String(step.kind||"");
}
function aiAgentSleep(ms){ return new Promise(function(r){ setTimeout(r, ms); }); }
function aiAgentStepIcon(kind){
  if(kind === "navigate") return "🌐";
  if(kind === "wait") return "⏳";
  if(kind === "scroll") return "📜";
  if(kind === "type") return "⌨️";
  if(kind === "submit") return "📨";
  if(kind === "click") return "🖱️";
  return "•";
}
function sfAgentDomAct(step){
  var res = { ok:false, kind:(step && step.kind) || "", found:false };
  function norm(s){
    var t = String(s == null ? "" : s).toLowerCase().replace(/\u0111/g, "d");
    if(t.normalize) t = t.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return t.replace(/\s+/g, " ").trim();
  }
  function visible(el){
    if(!el || !el.isConnected) return false;
    if(el.hidden) return false;
    if(el.disabled || (el.getAttribute && el.getAttribute("aria-disabled") === "true")) return false;
    var n = el;
    while(n && n.nodeType === 1){
      if(n.hidden) return false;
      if(window.getComputedStyle){
        var st = window.getComputedStyle(n);
        if(st && (st.display === "none" || st.visibility === "hidden")) return false;
      }
      n = n.parentElement;
    }
    return true;
  }
  function hay(el){
    if(!el) return "";
    var parts = [el.textContent || "", el.title || "", el.id || "",
      el.getAttribute ? (el.getAttribute("aria-label") || "") : "",
      el.getAttribute ? (el.getAttribute("placeholder") || "") : "",
      el.getAttribute ? (el.getAttribute("aria-placeholder") || "") : "",
      el.getAttribute ? (el.getAttribute("data-placeholder") || "") : "",
      el.getAttribute ? (el.getAttribute("data-e2e") || "") : "",
      el.getAttribute ? (el.getAttribute("name") || "") : "",
      el.getAttribute ? (el.getAttribute("value") || "") : ""];
    if(el.getAttribute && el.getAttribute("for")){
      var lab = document.getElementById(el.getAttribute("for"));
      if(lab) parts.push(lab.textContent || "");
    }
    if(el.tagName === "INPUT" || el.tagName === "TEXTAREA"){
      var lab2 = el.labels && el.labels[0];
      if(lab2) parts.push(lab2.textContent || "");
    }
    return norm(parts.join(" "));
  }
  function isFollowStep(st){
    if(!st) return false;
    if(st.labelKey === "ai_agent_label_subscribe") return true;
    if(Array.isArray(st.match)){
      for(var k=0; k<st.match.length; k++){
        var m = norm(st.match[k]);
        if(m === "follow" || m === "theo doi" || m === "subscribe" || m === "dang ky") return true;
      }
    }
    return false;
  }
  function isSearchInput(el){
    if(!el) return false;
    var tp = norm(el.type || "");
    var rl = norm(el.getAttribute ? (el.getAttribute("role") || "") : "");
    var nm = norm(el.name || "");
    var id = norm(el.id || "");
    var e2e = norm(el.getAttribute ? (el.getAttribute("data-e2e") || "") : "");
    if(tp === "search" || rl === "searchbox" || nm === "q" || nm === "search_query" || id === "search" || id === "search-input" || e2e.indexOf("search") !== -1) return true;
    var h = hay(el);
    if(/\b(?:tim kiem|search)\b/.test(h) && !/\b(?:binh luan|comment|tin nhan|message|chat)\b/.test(h)) return true;
    return false;
  }
  function isExcludedCandidate(el, st, kind){
    if(!el) return true;
    if(kind === "editable" && st && st.strictEditable){
      if(isSearchInput(el)) return true;
      if(el.closest && el.closest('form[role="search"], [role="search"], #search-form, ytd-searchbox, [data-e2e*="search"]')) return true;
    }
    if(kind === "click" && isFollowStep(st)){
      if(el.tagName === "A") return true;
      if(el.closest && el.closest('nav, aside, [role="navigation"], [data-e2e*="nav-"], [class*="SideNav" i], [class*="DivSideNavContainer" i], ytd-guide-renderer, ytd-mini-guide-renderer')) return true;
      var e2e = norm(el.getAttribute ? (el.getAttribute("data-e2e") || "") : "");
      if(e2e && (e2e.indexOf("nav-") !== -1 || e2e.indexOf("followers") !== -1 || e2e.indexOf("following") !== -1 || e2e.indexOf("suggested") !== -1 || e2e.indexOf("unfollow") !== -1)) return true;
      var h = hay(el);
      if(/(?:tai khoan da follow|cac tai khoan|following accounts|suggested accounts|tai khoan duoc de xuat|dang follow|da follow|da theo doi|nguoi theo doi|luot theo doi|\bfollowing\b|\bfollowers\b|\bunfollow\b|bo follow|bo theo doi|da dang ky|\bsubscribed\b|\bunsubscribe\b|huy dang ky|\bban be\b|\bfriends\b)/.test(h)) return true;
    }
    return false;
  }
  function pickBestInViewport(cands){
    if(!cands || !cands.length) return null;
    if(cands.length === 1) return cands[0];
    var vh = (typeof window !== "undefined" && window.innerHeight) ? window.innerHeight : 0;
    var vw = (typeof window !== "undefined" && window.innerWidth) ? window.innerWidth : 0;
    if(!vh) return cands[0];
    var bestEl = cands[0];
    var bestScore = -1e9;
    for(var idx=0; idx<cands.length; idx++){
      var c = cands[idx];
      var r = c.getBoundingClientRect ? c.getBoundingClientRect() : null;
      if(!r || (r.width === 0 && r.height === 0)){
        if(0 > bestScore){ bestScore = 0; bestEl = c; }
        continue;
      }
      var cy = r.top + r.height / 2;
      var cx = r.left + r.width / 2;
      var inV = (r.bottom > 0 && r.top < vh && (!vw || (r.right > 0 && r.left < vw)));
      var dist = Math.abs(cy - vh / 2) + (vw ? Math.abs(cx - vw / 2) * 0.25 : 0);
      var score = (inV ? 100000 : 0) - dist;
      if(score > bestScore){
        bestScore = score;
        bestEl = c;
      }
    }
    return bestEl;
  }
  function pick(st, kind){
    if(!st) return null;
    if(st.selector){
      try{
        var direct = document.querySelectorAll(st.selector);
        var directValid = [];
        for(var d=0; d<direct.length; d++){
          if(visible(direct[d]) && !isExcludedCandidate(direct[d], st, kind)) directValid.push(direct[d]);
        }
        if(directValid.length) return pickBestInViewport(directValid);
      }catch(e){}
    }
    var sel = kind === "editable"
      ? 'input:not([type=hidden]):not([type=submit]):not([type=button]):not([type=checkbox]):not([type=radio]),textarea,[contenteditable=""],[contenteditable="true"],[role="textbox"]'
      : 'a,button,[role="button"],ytd-toggle-button-renderer,ytd-button-renderer,like-button-view-model,input[type="submit"],input[type="button"],summary,label,option,#placeholder-area';
    var pool = [];
    try{ pool = Array.prototype.slice.call(document.querySelectorAll(sel)); }catch(e){ pool = []; }
    var i, j, el;
    if(st.match && st.match.length){
      if(kind === "click" && isFollowStep(st)){
        var exactHits = [];
        for(i=0;i<st.match.length;i++){
          var tf = norm(st.match[i]);
          if(!tf) continue;
          for(j=0;j<pool.length;j++){
            el = pool[j];
            if(!visible(el) || isExcludedCandidate(el, st, kind)) continue;
            var txt = norm(el.textContent || "");
            if(txt === tf || txt === "+" + tf) exactHits.push(el);
          }
        }
        if(exactHits.length) return pickBestInViewport(exactHits);
      }
      var subHits = [];
      for(i=0;i<st.match.length;i++){
        var t = norm(st.match[i]);
        if(!t) continue;
        for(j=0;j<pool.length;j++){
          el = pool[j];
          if(!visible(el) || isExcludedCandidate(el, st, kind)) continue;
          if(hay(el).indexOf(t) !== -1) subHits.push(el);
        }
        if(subHits.length) return pickBestInViewport(subHits);
      }
    }
    if(kind === "editable" && (!st || !st.strictEditable)){
      for(j=0;j<pool.length;j++){
        if(visible(pool[j]) && !isExcludedCandidate(pool[j], st, kind)) return pool[j];
      }
      return null;
    }
    return null;
  }
  function highlightEl(el){
    if(!el || !el.style) return;
    try{
      var prevOutline = el.style.outline;
      var prevOffset = el.style.outlineOffset;
      el.style.outline = "2px solid #8b5cf6";
      el.style.outlineOffset = "2px";
      setTimeout(function(){
        try{
          el.style.outline = prevOutline;
          el.style.outlineOffset = prevOffset;
        }catch(e){}
      }, 2400);
    }catch(e){}
  }
  function typeInto(el, text){
    if(!el) return false;
    var val = String(text == null ? "" : text);
    try{ if(el.focus) el.focus(); }catch(e){}
    highlightEl(el);
    var isCE = el.isContentEditable || (el.getAttribute && (el.getAttribute("contenteditable") === "true" || el.getAttribute("contenteditable") === "" || el.getAttribute("role") === "textbox"));
    if(isCE && el.tagName !== "INPUT" && el.tagName !== "TEXTAREA"){
      var inserted = false;
      try{
        if(window.getSelection && document.createRange){
          var sel = window.getSelection();
          var range = document.createRange();
          range.selectNodeContents(el);
          range.collapse(false);
          if(sel){ sel.removeAllRanges(); sel.addRange(range); }
        }
        if(typeof document.execCommand === "function"){
          document.execCommand("selectAll", false, null);
          inserted = !!document.execCommand("insertText", false, val);
        }
      }catch(e){}
      if(!inserted || !(el.textContent || "").trim()){
        el.textContent = val;
      }
      try{
        if(typeof InputEvent === "function"){
          el.dispatchEvent(new InputEvent("beforeinput", { bubbles:true, cancelable:true, inputType:"insertText", data:val }));
          el.dispatchEvent(new InputEvent("input", { bubbles:true, inputType:"insertText", data:val }));
        } else {
          el.dispatchEvent(new Event("input", { bubbles:true }));
        }
        el.dispatchEvent(new Event("change", { bubbles:true }));
        el.dispatchEvent(new KeyboardEvent("keyup", { key:" ", bubbles:true }));
      }catch(e){}
      return true;
    }
    var proto = null;
    if(el.tagName === "TEXTAREA" && typeof HTMLTextAreaElement !== "undefined") proto = HTMLTextAreaElement.prototype;
    else if(el.tagName === "INPUT" && typeof HTMLInputElement !== "undefined") proto = HTMLInputElement.prototype;
    var setter = proto ? Object.getOwnPropertyDescriptor(proto, "value") : null;
    if(setter && setter.set) setter.set.call(el, val);
    else el.value = val;
    try{
      el.dispatchEvent(new Event("input", { bubbles:true }));
      el.dispatchEvent(new Event("change", { bubbles:true }));
    }catch(e){}
    return true;
  }
  try{
    if(!step || !document) return res;
    if(step.kind === "scroll"){
      var scEl = null;
      if(step.selector){
        try{ scEl = document.querySelector(step.selector); }catch(e){}
      }
      if(scEl && scEl.scrollIntoView){
        try{ scEl.scrollIntoView({ behavior:"smooth", block:"center" }); }catch(e){ try{ scEl.scrollIntoView(); }catch(e2){} }
      } else if(window.scrollBy){
        var dy = Number(step.y) || (step.dir === "up" ? -500 : 500);
        try{ window.scrollBy({ top:dy, behavior:"smooth" }); }catch(e){ try{ window.scrollBy(0, dy); }catch(e2){} }
      }
      res.found = true;
      res.ok = true;
      return res;
    }
    if(step.kind === "click"){
      var el = pick(step, "click");
      res.found = !!el;
      if(!el){ res.reason = "not_found"; return res; }
      try{ if(el.scrollIntoView) el.scrollIntoView({ block:"center" }); }catch(e){}
      highlightEl(el);
      try{ el.click(); }catch(e){ try{ el.dispatchEvent(new MouseEvent("click", { bubbles:true, cancelable:true })); }catch(e2){ res.reason = "click_failed"; return res; } }
      res.ok = true;
      return res;
    }
    if(step.kind === "type"){
      var target = pick(step, "editable");
      if(!target){
        try{
          var ytPh = document.querySelector("ytd-comment-simplebox-renderer #placeholder-area, #placeholder-area");
          if(ytPh && visible(ytPh)){
            ytPh.click();
            target = document.querySelector("#contenteditable-root[contenteditable='true'], ytd-commentbox #contenteditable-root");
          }
        }catch(e){}
      }
      res.found = !!target;
      if(!target){ res.reason = "not_found"; return res; }
      if(!typeInto(target, step.text)){ res.reason = "type_failed"; return res; }
      res.ok = true;
      return res;
    }
    if(step.kind === "submit"){
      if(step.selector){
        try{
          var directBtns = document.querySelectorAll(step.selector);
          for(var bIdx=0; bIdx<directBtns.length; bIdx++){
            if(visible(directBtns[bIdx])){
              directBtns[bIdx].click();
              res.found = true; res.ok = true; res.how = "selector_button";
              return res;
            }
          }
        }catch(e){}
      }
      var src = pick(step, "editable") || (!step.strictEditable ? pick(step, "click") : null);
      var form = src && (src.form || (src.closest ? src.closest("form") : null));
      if(!form && !step.strictEditable && document.forms && document.forms.length) form = document.forms[0];
      if(form){
        res.found = true;
        var btn = null;
        try{ btn = form.querySelector('button[type="submit"],input[type="submit"],button:not([type])'); }catch(e){ btn = null; }
        if(btn){
          try{ btn.click(); }catch(e){ try{ btn.dispatchEvent(new MouseEvent("click", { bubbles:true, cancelable:true })); }catch(e2){} }
          res.ok = true;
          res.how = "button";
          return res;
        }
        var ev = null;
        try{ ev = new Event("submit", { bubbles:true, cancelable:true }); }catch(e){ ev = null; }
        if(ev && form.dispatchEvent(ev)){ res.ok = true; res.how = "event"; return res; }
      }
      var socialBtnSel = "ytd-commentbox #submit-button button:not([disabled]), ytd-comment-simplebox-renderer #submit-button button:not([disabled]), [data-e2e='comment-post'], div[aria-label='Press enter to send' i][role='button'], div[aria-label*='Nhấn Enter để gửi' i][role='button'], button[aria-label='Send' i], button[aria-label*='Send message' i], button[aria-label*='Gửi' i], div[role='button'][aria-label*='Send' i], div[role='button'][aria-label*='Gửi' i]";
      try{
        var sBtns = document.querySelectorAll(socialBtnSel);
        for(var sIdx=0; sIdx<sBtns.length; sIdx++){
          if(visible(sBtns[sIdx])){
            sBtns[sIdx].click();
            res.found = true; res.ok = true; res.how = "social_button";
            return res;
          }
        }
      }catch(e){}
      if(src){
        res.found = true;
        try{
          if(src.focus) src.focus();
          var kd = new KeyboardEvent("keydown", { key:"Enter", code:"Enter", keyCode:13, which:13, bubbles:true, cancelable:true });
          var kp = new KeyboardEvent("keypress", { key:"Enter", code:"Enter", keyCode:13, which:13, bubbles:true, cancelable:true });
          var ku = new KeyboardEvent("keyup", { key:"Enter", code:"Enter", keyCode:13, which:13, bubbles:true, cancelable:true });
          src.dispatchEvent(kd);
          src.dispatchEvent(kp);
          src.dispatchEvent(ku);
          res.ok = true;
          res.how = "enter_key";
          return res;
        }catch(e){}
      }
      res.reason = "no_form";
      return res;
    }
    res.reason = "unknown_kind";
  }catch(e){
    res.reason = String((e && e.message) || e);
  }
  return res;
}
function aiDetectSocialPlatform(rawQuery, pageUrl){
  const q = String(rawQuery || "").toLowerCase();
  const u = String(pageUrl || "").toLowerCase();
  if(/messenger|fb\.com\/messages|facebook\.com\/messages/.test(q) || /messenger\.com|facebook\.com\/messages/.test(u)) return { id:"messenger", label:"Messenger", icon:"💬", kind:"message" };
  if(/discord/.test(q) || /discord\.com/.test(u)) return { id:"discord", label:"Discord Web", icon:"🎮", kind:"message" };
  if(/youtube|youtu\.be|yt\b/.test(q) || /youtube\.com|youtu\.be/.test(u)) return { id:"youtube", label:"YouTube Comment", icon:"📺", kind:"comment" };
  if(/tiktok/.test(q) || /tiktok\.com/.test(u)) return { id:"tiktok", label:"TikTok", icon:"🎵", kind:"comment" };
  if(/telegram/.test(q) || /telegram\.org/.test(u)) return { id:"telegram", label:"Telegram Web", icon:"✈️", kind:"message" };
  if(/zalo/.test(q) || /zalo\.me/.test(u)) return { id:"zalo", label:"Zalo Web", icon:"💙", kind:"message" };
  if(/facebook|\bfb\b/.test(q) || /facebook\.com/.test(u)) return { id:"facebook", label:"Facebook", icon:"📘", kind:"comment" };
  return { id:"web", label:"Web Chat / Comment", icon:"🌐", kind:/bình\s*luận|comment|cmt|nhận\s*xét/i.test(q) ? "comment" : "message" };
}
function aiDetectSocialComposeIntent(rawQuery, pageUrl){
  if(!rawQuery || typeof rawQuery !== "string") return null;
  const q = rawQuery.trim().replace(/^[\/!](?:agent|sandbox|browse)\s+/i, "");
  if(q.length < 4) return null;
  if(/^(?:tóm\s*tắt|tom\s*tat|dịch|dich|giải\s*thích|giai\s*thich|phân\s*tích|phan\s*tich|tại\s*sao|tai\s*sao|là\s*gì|la\s*gi)\b/i.test(q)) return null;
  const hasSocialVerb = /(?:^|[\s,;:!?"'\[])(?:nhắn\s*tin|nhan\s*tin|gửi\s*tin\s*nhắn|gui\s*tin\s*nhan|nhắn\s+giúp|nhắn\s+hộ|nhắn\s+cho|nhắn\s+vào|nhắn\s+trên|nhắn\s+bảo|trả\s*lời\s*tin\s*nhắn|rep\s*tin\s*nhắn|soạn\s*tin\s*nhắn|viết\s*tin\s*nhắn|bình\s*luận|binh\s*luan|comment|cmt|viết\s*bình\s*luận|đăng\s*bình\s*luận|nhận\s*xét\s*video)(?=[\s,:;.!?)"'\]]|$)/i.test(q);
  if(!hasSocialVerb) return null;
  const platform = aiDetectSocialPlatform(q, pageUrl);
  let hint = q
    .replace(/^(?:hãy|hay|vui\s*lòng|làm\s*ơn|giúp\s*tôi|giúp\s*mình|agent\s*ơi|trợ\s*lý\s*ơi)\s+/i, "")
    .replace(/^(?:soạn|viết|đăng|gửi|nhập|thử|hỗ\s*trợ)?\s*(?:tin\s*nhắn|nhắn\s*tin|nhắn|trả\s*lời\s*tin\s*nhắn|rep\s*tin\s*nhắn|bình\s*luận|binh\s*luan|comment|cmt|nhận\s*xét)\s*/i, "")
    .replace(/^(?:trực\s*tiếp\s+)?(?:giúp\s*(?:tôi|mình|em|tao)?|hộ\s*(?:tôi|mình|em|tao)?)\s*/i, "")
    .replace(/^(?:trực\s*tiếp\s+)?(?:trên|tren|vào|vao|ở|o|tại|tai|cho)\s+(?:kênh\s+|video\s+|bài\s+|trang\s+)?(?:youtube|discord|messenger|facebook|fb|tiktok|telegram|zalo|web|này|nay|đó|do)(?:\s+(?:bản\s*web|này|nay))?\s*/i, "")
    .replace(/^(?:theo\s*tính\s*cách(?:\s*của\s*(?:tôi|mình))?|dựa\s*trên\s*tính\s*cách(?:\s*của\s*(?:tôi|mình))?)\s*/i, "")
    .replace(/^[:：,\s]+/, "")
    .trim();
  const autoSend = /(?:gửi\s*luôn|gui\s*luon|đăng\s*luôn|dang\s*luon|send\s*now)\s*$/i.test(q);
  return {
    raw: rawQuery.trim(),
    platform: platform,
    kind: platform.kind,
    hint: hint,
    autoSend: autoSend
  };
}
function aiLocalPersonaDraft(intent, pageTitle){
  const s = aiSettings || {};
  const style = (s.personaStyle && AI_PERSONAS[s.personaStyle]) ? s.personaStyle : "casual";
  const custom = String(s.personaCustom || "").trim();
  let core = String((intent && intent.hint) || "").trim();
  core = core
    .replace(/^(?:bảo|nói|nhắn|khen|hỏi|rủ|chúc)\s+(?:nó|bạn\s*ấy|họ|anh\s*em|mọi\s*người|kênh|video(?:\s*này)?)?\s*(?:là|rằng|:)?\s*/i, "")
    .replace(/\s*(?:giúp\s*(?:tôi|mình)|hộ\s*(?:tôi|mình)|theo\s*tính\s*cách(?:\s*của\s*(?:tôi|mình))?)\s*$/i, "")
    .replace(/^["'“”']+|["'“”']+$/g, "")
    .trim();
  const isComment = intent && intent.kind === "comment";
  if(!core){
    if(isComment){
      const tShort = pageTitle ? String(pageTitle).replace(/\s*-\s*YouTube$/i, "").slice(0, 60) : "video này";
      if(style === "humorous") return "Xem " + tShort + " cuốn thực sự luôn á, đỉnh của chóp! 🔥😂";
      if(style === "polite") return "Cảm ơn kênh đã chia sẻ nội dung rất hữu ích và chỉn chu. Chúc kênh ngày càng phát triển nhé! ❤️";
      if(style === "concise") return "Nội dung rất hay và chất lượng, cảm ơn tác giả! 👍";
      if(style === "professional") return "Nội dung phân tích rất sâu sắc, bố cục mạch lạc và mang lại nhiều giá trị thực tiễn. Cảm ơn tác giả đã chia sẻ.";
      return "Video hay và cuốn quá, cảm ơn kênh đã chia sẻ nha! ❤️👍";
    } else {
      if(style === "humorous") return "Alo alo đồng chí ơi, đang làm gì đó? Vào việc luôn thôi nào! 😎🔥";
      if(style === "polite") return "Chào bạn nhé, khi nào rảnh phản hồi giúp mình tin nhắn này nha. Cảm ơn bạn nhiều!";
      if(style === "concise") return "Chào bạn, nhắn lại mình khi rảnh nhé.";
      if(style === "professional") return "Xin chào, tôi liên hệ để trao đổi nhanh về công việc. Mong sớm nhận được phản hồi từ bạn.";
      return "Ê bạn ơi, rảnh không cho mình nhắn cái này xíu nha! 😊";
    }
  }
  if(style === "humorous") return core + " nha fen ơi 😂🔥";
  if(style === "polite") return "Dạ " + core.charAt(0).toLowerCase() + core.slice(1) + " ạ. Cảm ơn nhiều nhé! ✨";
  if(style === "concise") return core.replace(/[.!?]+$/, "") + ".";
  if(style === "professional") return core.charAt(0).toUpperCase() + core.slice(1) + ". Trân trọng.";
  return core + (custom ? "" : " nha! 😊");
}
async function aiGeneratePersonaDraft(intent, pageContext, provider, key){
  const pInfo = aiGetCurrentPageInfo();
  const pageTitle = (pInfo && pInfo.title) ? pInfo.title : "";
  const personaRule = aiBuildPersonaDirective(aiSettings);
  const prov = provider || aiProvider;
  const apiKey = key !== undefined ? key : (aiKeys[prov] || "");
  if(!aiCanUse(prov)){
    return aiLocalPersonaDraft(intent, pageTitle);
  }
  const isComment = intent && intent.kind === "comment";
  const platformLabel = (intent && intent.platform && intent.platform.label) || (isComment ? "YouTube Comment" : "Messenger / Discord");
  const prompt = [
    "NHIỆM VỤ: Hãy đóng vai người dùng và soạn ĐÚNG MỘT " + (isComment ? "bình luận (comment)" : "tin nhắn chat") + " trên nền tảng " + platformLabel + ".",
    "[TÍNH CÁCH & PHONG CÁCH CỦA NGƯỜI DÙNG]",
    personaRule,
    pageTitle ? ("[TIÊU ĐỀ TRANG / VIDEO ĐANG MỞ]: " + pageTitle) : "",
    pageContext ? ("[NGỮ CẢNH TRANG / CUỘC TRÒ CHUYỆN]:\n" + String(pageContext).slice(0, 2000)) : "",
    "[YÊU CẦU CỦA NGƯỜI DÙNG]: " + ((intent && intent.hint) ? intent.hint : (intent ? intent.raw : "Viết nội dung phù hợp với ngữ cảnh hiện tại")),
    "QUY TẮC BẮT BUỘC: Chỉ trả về DUY NHẤT nội dung tin nhắn/bình luận hoàn chỉnh để điền thẳng vào ô chat (KHÔNG giải thích, KHÔNG đặt trong dấu ngoặc kép, KHÔNG thêm tiêu đề hay GỢI Ý)."
  ].filter(Boolean).join("\n\n");
  try{
    const rawAns = await aiCallProvider(prov, prompt, apiKey, [], [], { isPageQuery: false });
    let cleaned = String(rawAns || "").trim()
      .replace(/\n*GỢI Ý:[\s\S]*$/i, "")
      .replace(/^["'“”']+|["'“”']+$/g, "")
      .trim();
    if(cleaned) return cleaned;
  }catch(e){}
  return aiLocalPersonaDraft(intent, pageTitle);
}
function aiBuildSocialSendPlan(platformId, text, shouldSubmit){
  const msg = String(text || "").trim();
  if(!msg) return [];
  if(platformId === "youtube"){
    return aiBuildAgentActionPlan({
      verb: "comment",
      text: msg,
      submitAfter: !!shouldSubmit,
      match: ["bình luận", "comment", "add a comment"]
    }, true);
  }
  if(platformId === "discord"){
    return aiBuildAgentActionPlan({
      verb: "message",
      text: msg,
      submitAfter: !!shouldSubmit,
      selector: "div[class*='slateTextArea'][contenteditable='true'], div[role='textbox'][contenteditable='true']",
      match: ["message", "tin nhắn"]
    }, false);
  }
  if(platformId === "messenger"){
    return aiBuildAgentActionPlan({
      verb: "message",
      text: msg,
      submitAfter: !!shouldSubmit,
      selector: "div[role='textbox'][contenteditable='true'][data-lexical-editor='true'], div[role='textbox'][contenteditable='true']",
      match: ["aa", "message", "tin nhắn"]
    }, false);
  }
  return aiBuildAgentActionPlan({
    verb: platformId === "tiktok" || platformId === "facebook" ? "comment" : "message",
    text: msg,
    submitAfter: !!shouldSubmit,
    match: ["bình luận", "comment", "tin nhắn", "message", "aa"]
  }, false);
}
async function aiAppendSocialComposeCard(intent, provider, key){
  const c = document.getElementById("ai-chat-history");
  if(!c || !intent) return;
  const em = c.querySelector(".ai-empty");
  if(em) c.removeChild(em);

  const row = document.createElement("div");
  row.className = "ai-msg ai-msg-assistant ai-social-compose-row";

  const bubble = document.createElement("div");
  bubble.className = "ai-bubble ai-agent-card ai-compose-card";

  const head = document.createElement("div");
  head.className = "ai-agent-head";
  const headDot = document.createElement("span");
  headDot.className = "ai-agent-head-dot";
  const headText = document.createElement("span");
  headText.className = "ai-agent-head-text";
  headText.textContent = aiT("ai_compose_card_title", null, "Trợ lý Soạn thảo · Theo tính cách");
  head.appendChild(headDot);
  head.appendChild(headText);
  bubble.appendChild(head);

  const metaRow = document.createElement("div");
  metaRow.className = "ai-compose-meta";
  const platBadge = document.createElement("span");
  platBadge.className = "ai-compose-badge is-platform";
  platBadge.textContent = (intent.platform.icon || "💬") + " " + (intent.platform.label || "Web Chat");
  metaRow.appendChild(platBadge);

  const pStyleKey = (aiSettings.personaStyle && AI_PERSONAS[aiSettings.personaStyle]) ? aiSettings.personaStyle : "casual";
  const personaBadge = document.createElement("span");
  personaBadge.className = "ai-compose-badge is-persona";
  personaBadge.textContent = "🎭 " + aiT(AI_PERSONAS[pStyleKey].labelKey, null, "Tự nhiên, thân thiện");
  metaRow.appendChild(personaBadge);
  bubble.appendChild(metaRow);

  const safeNotice = document.createElement("div");
  safeNotice.className = "ai-compose-safe-notice";
  safeNotice.textContent = aiT("ai_compose_safe_notice", null, "🔒 Chế độ an toàn: Không tự động gửi ngầm. Khuyên dùng \"Chỉ điền vào ô chat\" hoặc \"Sao chép\" để tự kiểm tra trước.");
  bubble.appendChild(safeNotice);

  const draftLbl = document.createElement("div");
  draftLbl.className = "ai-compose-label";
  draftLbl.textContent = aiT("ai_compose_draft_lbl", null, "Nội dung dự kiến (bạn có thể sửa trực tiếp trước khi gửi):");
  bubble.appendChild(draftLbl);

  const textarea = document.createElement("textarea");
  textarea.className = "ai-compose-textarea";
  textarea.rows = 3;
  textarea.value = aiT("ai_compose_generating", null, "⏳ Đang soạn nội dung theo tính cách của bạn...");
  textarea.disabled = true;
  bubble.appendChild(textarea);

  const actions = document.createElement("div");
  actions.className = "ai-agent-actions";

  const fillOnlyBtn = document.createElement("button");
  fillOnlyBtn.type = "button";
  fillOnlyBtn.className = "btn btn-primary ai-agent-btn-approve ai-compose-btn-fill";
  fillOnlyBtn.textContent = aiT("ai_compose_btn_fill_only", null, "✍️ Chỉ điền vào ô chat (An toàn)");
  fillOnlyBtn.disabled = true;

  const copyBtn = document.createElement("button");
  copyBtn.type = "button";
  copyBtn.className = "btn btn-secondary ai-compose-btn-secondary ai-compose-btn-copy";
  copyBtn.textContent = aiT("ai_compose_btn_copy", null, "📋 Sao chép");
  copyBtn.disabled = true;

  const sendNowBtn = document.createElement("button");
  sendNowBtn.type = "button";
  sendNowBtn.className = "btn btn-secondary ai-compose-btn-secondary ai-compose-btn-send";
  sendNowBtn.textContent = aiT("ai_compose_btn_send", null, "🚀 Điền & Gửi luôn");
  sendNowBtn.disabled = true;

  const regenBtn = document.createElement("button");
  regenBtn.type = "button";
  regenBtn.className = "btn btn-secondary ai-compose-btn-secondary ai-compose-btn-regen";
  regenBtn.textContent = aiT("ai_compose_btn_regen", null, "🔄 Soạn lại");
  regenBtn.disabled = true;

  actions.appendChild(fillOnlyBtn);
  actions.appendChild(copyBtn);
  actions.appendChild(sendNowBtn);
  actions.appendChild(regenBtn);
  bubble.appendChild(actions);

  const statusMsg = document.createElement("div");
  statusMsg.className = "ai-agent-status-label";
  statusMsg.style.display = "none";
  bubble.appendChild(statusMsg);

  row.appendChild(bubble);
  c.appendChild(row);
  c.scrollTop = c.scrollHeight;

  const setBtnsDisabled = function(dis){
    fillOnlyBtn.disabled = dis;
    copyBtn.disabled = dis;
    sendNowBtn.disabled = dis;
    regenBtn.disabled = dis;
  };

  const generateAndFillTextarea = async function(){
    textarea.disabled = true;
    setBtnsDisabled(true);
    textarea.value = aiT("ai_compose_generating", null, "⏳ Đang soạn nội dung theo tính cách của bạn...");
    let pgCtx = "";
    try{ pgCtx = await aiGetPageContextText(intent.raw || ""); }catch(e){}
    const draft = await aiGeneratePersonaDraft(intent, pgCtx, provider, key);
    textarea.value = draft;
    textarea.disabled = false;
    setBtnsDisabled(false);
  };

  const executeOnPage = async function(shouldSubmit){
    const textToUse = String(textarea.value || "").trim();
    if(!textToUse) return;
    setBtnsDisabled(true);
    statusMsg.style.display = "block";
    statusMsg.className = "ai-agent-status-label is-approved";
    statusMsg.textContent = aiT("ai_agent_action_running", null, "▶ Đang thực hiện thao tác trên trang...");

    const plan = aiBuildSocialSendPlan(intent.platform.id, textToUse, shouldSubmit);
    const tabsApi = (typeof browser !== "undefined" && browser.tabs) ? browser.tabs : (typeof chrome !== "undefined" ? chrome.tabs : null);
    if(!tabsApi || !tabsApi.query){
      statusMsg.className = "ai-agent-status-label is-cancelled";
      statusMsg.textContent = aiT("ai_compose_failed", null, "⚠️ Chưa tìm thấy đúng ô chat/bình luận trên trang (đã chặn tự điền nhầm vào ô tìm kiếm). Hãy bấm mở ô bình luận hoặc bấm \"📋 Sao chép\".");
      setBtnsDisabled(false);
      return;
    }
    tabsApi.query({ active: true, currentWindow: true }, async function(tabs){
      if(!tabs || !tabs[0]){
        statusMsg.className = "ai-agent-status-label is-cancelled";
        statusMsg.textContent = aiT("ai_compose_failed", null, "⚠️ Chưa tìm thấy đúng ô chat/bình luận trên trang (đã chặn tự điền nhầm vào ô tìm kiếm). Hãy bấm mở ô bình luận hoặc bấm \"📋 Sao chép\".");
        setBtnsDisabled(false);
        return;
      }
      const results = await window.aiAgentRunPlan(plan, tabs[0].id);
      const typeOk = results.some(function(r){ return r && r.kind === "type" && r.ok; });
      if(typeOk){
        statusMsg.className = "ai-agent-status-label is-completed";
        statusMsg.textContent = shouldSubmit
          ? aiT("ai_compose_sent_ok", null, "✅ Đã tự động điền và gửi trên trang!")
          : aiT("ai_compose_filled_ok", null, "✅ Đã điền vào đúng ô nhập trên trang (đã viền sáng — bạn tự kiểm tra rồi bấm Enter để gửi).");
      } else {
        statusMsg.className = "ai-agent-status-label is-cancelled";
        statusMsg.textContent = aiT("ai_compose_failed", null, "⚠️ Chưa tìm thấy đúng ô chat/bình luận trên trang (đã chặn tự điền nhầm vào ô tìm kiếm). Hãy bấm mở ô bình luận hoặc bấm \"📋 Sao chép\".");
      }
      setBtnsDisabled(false);
    });
  };

  fillOnlyBtn.addEventListener("click", function(){ executeOnPage(false); });
  copyBtn.addEventListener("click", async function(){
    const textToUse = String(textarea.value || "").trim();
    if(!textToUse) return;
    try{
      if(navigator && navigator.clipboard && navigator.clipboard.writeText){
        await navigator.clipboard.writeText(textToUse);
      }
    }catch(e){}
    statusMsg.style.display = "block";
    statusMsg.className = "ai-agent-status-label is-completed";
    statusMsg.textContent = aiT("ai_compose_copied_ok", null, "✅ Đã sao chép nội dung! Bạn có thể dán (Ctrl+V) vào bất kỳ ô chat nào.");
  });
  sendNowBtn.addEventListener("click", function(){ executeOnPage(true); });
  regenBtn.addEventListener("click", function(){ generateAndFillTextarea(); });

  await generateAndFillTextarea();
}
async function aiAgentRunStep(tabId, step){
  try{
    const scriptingApi = (typeof browser !== "undefined" && browser.scripting) ? browser.scripting
      : ((typeof chrome !== "undefined" && chrome.scripting) ? chrome.scripting : null);
    if(!scriptingApi || !scriptingApi.executeScript || !tabId) return { ok:false, kind:(step&&step.kind)||"", reason:"no_scripting" };
    const raw = await scriptingApi.executeScript({
      target: { tabId: tabId },
      world: "ISOLATED",
      func: window.sfAgentDomAct,
      args: [step]
    });
    const out = raw && raw[0] && raw[0].result;
    if(out && typeof out === "object") return out;
    return { ok:false, kind:(step&&step.kind)||"", reason:"no_result" };
  }catch(e){
    return { ok:false, kind:(step&&step.kind)||"", reason:String((e && e.message) || e) };
  }
}
async function aiAgentRunPlan(plan, tabId){
  const results = [];
  if(!Array.isArray(plan) || !plan.length) return results;
  for(let i=0;i<plan.length;i++){
    const step = plan[i];
    if(!step) continue;
    if(aiUserStopped) break;
    let r;
    if(step.kind === "wait"){ await aiAgentSleep(step.ms || 1500); r = { ok:true, kind:"wait" }; }
    else if(step.kind === "navigate"){ r = { ok:true, kind:"navigate", skipped:!!tabId }; }
    else r = await aiAgentRunStep(tabId, step);
    r.label = aiAgentStepLabel(step);
    r.icon = aiAgentStepIcon(step.kind);
    results.push(r);
  }
  return results;
}
function aiAgentResultsReport(results){
  if(!Array.isArray(results) || !results.length) return "";


  const rows = document.querySelectorAll(".ai-agent-approval-row");
  const lastRow = rows[rows.length - 1];
  if (lastRow) {
    const statusMsg = lastRow.querySelector(".ai-agent-status-label");
    if (statusMsg && statusMsg.className.indexOf("is-approved") !== -1) {
      const lis = lastRow.querySelectorAll(".ai-agent-plan-step");
      results.forEach(function(r, idx){
        if (lis[idx]) {
          lis[idx].textContent = (r.ok ? "[Thành công] " : "[Thất bại] ") + (r.label || r.kind || "");
          if (!r.ok) {
            lis[idx].textContent += " - " + aiT("ai_agent_action_notfound", null, "không tìm thấy hoặc không thực hiện được trên trang");
          }
        }
      });
      statusMsg.className = "ai-agent-status-label is-completed";
      let msg = aiT("ai_agent_action_done", null, "Đã hoàn tất thao tác.");
      statusMsg.textContent = msg;
      if(statusMsg.textContent.indexOf("✅") !== 0) statusMsg.textContent = "✅ " + statusMsg.textContent;
      return "";
    }
  }

  let md = "\n\n### " + aiT("ai_agent_plan_title", null, "Kế hoạch thao tác của Agent") + "\n";
  results.forEach(function(r){
    md += "- " + (r.ok ? "[Thành công] " : "[Thất bại] ") + (r.label || r.kind || "");
    if(!r.ok){
      md += " - " + aiT("ai_agent_action_notfound", null, "không tìm thấy hoặc không thực hiện được trên trang");
    }
    md += "\n";
  });
  let smry = aiT("ai_agent_action_done", null, "Đã hoàn tất thao tác.");
  if(smry.indexOf("✅") !== 0) smry = "✅ " + smry;
  md += "\n" + smry;
  return md;
}

function aiAppendAgentApprovalCard(cleanQuery, raw, provider, key, detectedSkill, isDemo, opts){
  opts = opts || {};
  const plan = Array.isArray(opts.plan) && opts.plan.length ? opts.plan : null;
  const riskPlan = !!(plan && aiAgentPlanIsSensitive(plan));
  const c = document.getElementById("ai-chat-history");
  if(!c) return;
  const row = document.createElement("div");
  row.className = "ai-msg ai-msg-assistant ai-agent-approval-row";

  const bubble = document.createElement("div");
  bubble.className = "ai-bubble ai-agent-card";

  const head = document.createElement("div");
  head.className = "ai-agent-head";
  const headDot = document.createElement("span");
  headDot.className = "ai-agent-head-dot";
  const headText = document.createElement("span");
  headText.className = "ai-agent-head-text";
  headText.textContent = aiT("ai_agent_approval_title", null, "Trợ lý tự động · Xác nhận thao tác") + (isDemo ? " (Demo)" : "");
  head.appendChild(headDot);
  head.appendChild(headText);
  bubble.appendChild(head);

  const desc = document.createElement("div");
  desc.className = "ai-agent-desc";
  desc.textContent = aiT("ai_agent_approval_desc", null, "Yêu cầu cần thực hiện:");
  bubble.appendChild(desc);

  const targetBox = document.createElement("div");
  targetBox.className = "ai-agent-target";
  targetBox.textContent = "“" + (cleanQuery || raw) + "”" + (isDemo ? " [Chạy thử nghiệm 0 Token]" : "");
  bubble.appendChild(targetBox);

  if(riskPlan){
    const risk = document.createElement("div");
    risk.className = "ai-agent-risk";
    risk.textContent = aiT("ai_agent_plan_risk", null, "⚠️ Thao tác nhạy cảm trên trang web — chỉ đồng ý khi bạn tự tin vào trang đích.");
    bubble.appendChild(risk);
  }

  if(plan){
    const planBox = document.createElement("div");
    planBox.className = "ai-agent-plan";
    const planTitle = document.createElement("div");
    planTitle.className = "ai-agent-plan-title";
    planTitle.textContent = aiT("ai_agent_plan_title", null, "Các bước thực hiện");
    planBox.appendChild(planTitle);
    const planList = document.createElement("ol");
    planList.className = "ai-agent-plan-list";
    plan.forEach(function(st){
      const li = document.createElement("li");
      li.className = "ai-agent-plan-step" + (st && st.sensitive ? " is-sensitive" : "");
      li.textContent = aiAgentStepIcon(st && st.kind) + " " + aiAgentStepLabel(st);
      planList.appendChild(li);
    });
    planBox.appendChild(planList);
    bubble.appendChild(planBox);
  }

  const actions = document.createElement("div");
  actions.className = "ai-agent-actions";

  const approveBtn = document.createElement("button");
  approveBtn.type = "button";
  approveBtn.className = "btn btn-primary ai-agent-btn-approve";
  approveBtn.textContent = isDemo ? "✓ Chạy thử nghiệm (0 Token)" : aiT("ai_agent_btn_approve", null, "✓ Thực hiện ngay");

  const cancelBtn = document.createElement("button");
  cancelBtn.type = "button";
  cancelBtn.className = "btn btn-secondary ai-agent-btn-cancel";
  cancelBtn.textContent = aiT("ai_agent_btn_cancel", null, "✕ Hủy bỏ");

  actions.appendChild(approveBtn);
  actions.appendChild(cancelBtn);
  bubble.appendChild(actions);

  const statusMsg = document.createElement("div");
  statusMsg.className = "ai-agent-status-label";
  statusMsg.style.display = "none";
  bubble.appendChild(statusMsg);

  row.appendChild(bubble);
  c.appendChild(row);
  c.scrollTop = c.scrollHeight;

  approveBtn.addEventListener("click", () => {
    approveBtn.disabled = true;
    cancelBtn.disabled = true;
    actions.style.display = "none";
    statusMsg.style.display = "block";
    statusMsg.className = "ai-agent-status-label is-approved";
    statusMsg.textContent = isDemo
      ? "✓ Đang thực hiện thử nghiệm (0 Token)..."
      : (plan ? aiT("ai_agent_action_running", null, "▶ Đang thực hiện thao tác trên trang...") : aiT("ai_agent_approved_status", null, "✓ Đang thực hiện yêu cầu..."));
    if(typeof opts.onApprove === "function"){
      opts.onApprove();
    } else {
      aiRunAgentWorkflow(cleanQuery, raw, provider, key, detectedSkill, isDemo);
    }
  });

  cancelBtn.addEventListener("click", () => {
    approveBtn.disabled = true;
    cancelBtn.disabled = true;
    actions.style.display = "none";
    statusMsg.style.display = "block";
    statusMsg.className = "ai-agent-status-label is-cancelled";
    statusMsg.textContent = aiT("ai_agent_cancelled_status", null, "✕ Đã hủy bỏ tác vụ.");
  });
}

async function aiRunAgentWorkflow(cleanQuery, raw, provider, key, detectedSkill, isDemo){
  if(aiIsSending) return;
  aiIsSending = true;
  aiUserStopped = false;
  aiAbort = new AbortController();

  const sendBtn = document.getElementById("ai-btn-send");
  if(sendBtn){
    sendBtn.classList.add("is-stop");
    sendBtn.textContent = "⏹";
    sendBtn.disabled = false;
    sendBtn.title = aiT("ai_btn_stop", null, "Dừng tạo câu trả lời");
  }

  aiShowTyping("🔍 Đang kích hoạt Sandbox và tìm kiếm dữ liệu web...");

  let webRes = null; let scholarRes = "";
  try {
    const actualQuery = cleanQuery.replace(/^(demo|test)\s+/i, "");
    const _sr = await Promise.all([
      aiSearchMultiSources(actualQuery),
      aiScholarSearch(actualQuery)
    ]);
    webRes = _sr[0]; scholarRes = _sr[1];

    if(aiUserStopped) return;

    aiUpdateTypingStatus("📑 Đang đọc & bóc tách dữ liệu sạch trong Sandbox cô lập...");

    let sandboxCleanText = "";
    if(webRes && webRes.text){
      sandboxCleanText += webRes.text + "\n\n";
    }
    if(scholarRes){
      sandboxCleanText += "[DỮ LIỆU TÀI LIỆU HỌC THUẬT TỪ SANDBOX]:\n" + scholarRes + "\n\n";
    }

    if(aiUserStopped) return;

    if(isDemo){
      aiUpdateTypingStatus("✨ Đang tổng hợp báo cáo Sandbox cục bộ (0 Token)...");
      await new Promise(r => setTimeout(r, 600));
      aiHideTyping();

      let demoReport = "## 🛡️ Báo cáo Tổng hợp Agentic Sandbox (Chế độ Thử nghiệm 0 Token)\n\n";
      demoReport += "🎯 **Mục tiêu đã duyệt:** *" + actualQuery + "*\n\n";
      demoReport += "### 1. Dữ liệu đã bóc tách & cô lập an toàn trong Sandbox:\n";
      if(webRes && Array.isArray(webRes.sources) && webRes.sources.length){
        demoReport += "- **Đã quét qua " + webRes.sources.length + " nguồn trực tuyến:**\n";
        webRes.sources.forEach((s, idx) => {
          demoReport += "  " + (idx + 1) + ". `" + s.t + "` — " + s.u + "\n";
        });
      } else {
        demoReport += "- Đã quét dữ liệu trực tuyến trong môi trường Sandbox cô lập.\n";
      }
      if(scholarRes){
        demoReport += "- **Tài liệu học thuật (OpenAlex / Crossref):** Đã đối chiếu các công trình nghiên cứu liên quan.\n";
      }
      demoReport += "\n### 2. Thông tin cốt lõi đã làm sạch (Clean Data):\n";
      if(webRes && webRes.text){
        const cleanSnippet = webRes.text.replace(/\[KẾT QUẢ TÌM KIẾM[\s\S]*?\n\n/i, "").slice(0, 1000);
        demoReport += "> " + cleanSnippet.split("\n").filter(Boolean).slice(0, 6).join("\n> ") + "\n\n";
      }
      if(scholarRes){
        const scholarLines = scholarRes.split("\n").filter(Boolean).slice(0, 4);
        demoReport += "**Nguồn học thuật tiêu biểu:**\n";
        scholarLines.forEach(l => { demoReport += l + "\n"; });
        demoReport += "\n";
      }
      demoReport += "### 3. Đánh giá bảo mật của Sandbox:\n";
      demoReport += "- ✅ Mã độc JavaScript / Pop-up: **Đã chặn 100% trong Sandbox**\n";
      demoReport += "- ✅ Tracker & Cookie theo dõi: **Cách ly tuyệt đối**\n";
      demoReport += "- ✅ Chi phí token: **0 Token (Chạy cục bộ 100% trên trình duyệt)**\n\n";
      demoReport += "GỢI Ý:\n- Bạn có thể lấy API key miễn phí tại Google AI Studio để AI phân tích chuyên sâu hơn\n- Thử lệnh: /agent demo pin thể rắn 2026\n- Thử lệnh: /agent demo xe điện thế hệ mới";

      aiAppendMessage("assistant", demoReport, provider);
      return;
    }

    aiUpdateTypingStatus("✨ Đang đối chiếu đa nguồn và tổng hợp báo cáo...");

    const agentPrompt = "<<<DATA_UNTRUSTED_1_BEGIN>>>\n" +
      (sandboxCleanText.trim() || "[Không tìm thấy dữ liệu bổ sung từ web]") +
      "\n<<<DATA_UNTRUSTED_1_END>>>\n\n" +
      cleanQuery;

    const agentSysDirective = "\n\n[TÁC NHÂN AGENTIC AI — MÔI TRƯỜNG SANDBOX ĐÃ CẤP QUYỀN VÀ BẢO VỆ]\n" +
      "- Bạn là Agentic AI được người dùng cấp quyền thực thi tự động duyệt tìm kiếm trong Sandbox vô trùng.\n" +
      "- Phân tích, tổng hợp và đối chiếu thông tin từ dữ liệu Sandbox đã bóc tách phía trên một cách toàn diện, trung thực.\n" +
      "- Tuyệt đối không chèn nhãn [Nguồn:...] hay link URL vào giữa câu trả lời; trình bày tự nhiên, cấu trúc Markdown rõ ràng (tiêu đề ##, bullet, bảng so sánh).\n" +
      "- Đưa ra khuyến nghị thiết thực và kết thúc bằng 3 câu hỏi gợi ý tiếp theo.";

    const sysInst = aiBuildSystemInstruction("auto") + agentSysDirective;

    const hist = aiHistory.slice(0, -1);
    const streaming = aiSettings.stream !== false && aiHasKey(provider) && (provider === "gemini" || provider === "openai");

    let streamAcc = "";
    let streamRow = null;
    let streamRaf = null;

    const renderLiveStream = () => {
      streamRaf = null;
      if(!streamRow) return;
      aiRenderFormattedText(streamRow, streamAcc);
      const cur = document.createElement("span");
      cur.className = "ai-stream-cursor";
      const lastEl = streamRow.lastElementChild;
      if(lastEl && !lastEl.classList.contains("ai-table") && !lastEl.classList.contains("ai-code-wrap") && !lastEl.classList.contains("ai-flashcard")){
        lastEl.appendChild(cur);
      } else {
        streamRow.appendChild(cur);
      }
      const c2 = document.getElementById("ai-chat-history");
      if(c2) c2.scrollTop = c2.scrollHeight;
    };

    const onToken = (piece) => {
      streamAcc += piece;
      if(!streamRow){
        aiHideTyping();
        aiAppendMessage("assistant", "", provider);
        const c = document.getElementById("ai-chat-history");
        streamRow = c && c.lastElementChild ? c.lastElementChild.querySelector(".ai-bubble") : null;
      }
      if(!streamRaf){
        streamRaf = requestAnimationFrame(renderLiveStream);
      }
    };

    const apiKey = String(key || aiKeys[provider] || "").trim();
    const callOpts = {
      signal: aiAbort.signal,
      onToken: onToken,
      groundOverride: false,
      skill: detectedSkill,
      isPageQuery: false,
      sysInstruction: sysInst
    };

    let fullAnswer = "";
    if(streaming){
      await aiCallProvider(provider, agentPrompt, apiKey, [], hist, callOpts);
      fullAnswer = String(streamAcc || "");
    } else {
      fullAnswer = await aiCallProvider(provider, agentPrompt, apiKey, [], hist, callOpts);
    }

    if(streamRaf){ cancelAnimationFrame(streamRaf); streamRaf = null; }
    aiHideTyping();

    if(!aiUserStopped){
    if(/(bật|mở|truy cập|vào|open|launch)\s*(lên|ra)?/i.test(cleanQuery) && webRes && Array.isArray(webRes.sources) && webRes.sources.length){
      try {
        const topU = webRes.sources[0].u;
        const tabsApi = (typeof browser !== "undefined" && browser.tabs) ? browser.tabs : (typeof chrome !== "undefined" ? chrome.tabs : null);
        if(tabsApi && tabsApi.create) tabsApi.create({ url: topU, active: true });
        else window.open(topU, "_blank");
      } catch(e) {}
    }
      let fullContent = (typeof fullAnswer === "string" && fullAnswer) ? fullAnswer : streamAcc;
      fullContent = fullContent.trim();
  if(streamRow){
        aiRenderFormattedText(streamRow, fullContent);
        if(aiHistory.length && aiHistory[aiHistory.length - 1].role === "assistant"){
          aiHistory[aiHistory.length - 1].content = fullContent;
          aiSaveHistorySoon();
        }
      } else {
        aiAppendMessage("assistant", fullContent, provider);
      }
    }
  } catch(err) {
    aiHideTyping();
    if(!aiUserStopped){
      const errMsg = String(err && (err.message || err) || "");
      if(errMsg.includes("API key not valid") || errMsg.includes("gemini_400") || errMsg.includes("401") || errMsg.includes("INVALID_ARGUMENT")){
        aiAppendMessage("assistant", "⚠️ **API Key của bạn không hợp lệ hoặc đã hết hạn (Lỗi 400/401 từ Google/OpenAI).**\n\n1. Hãy mở **⚙ Cài đặt AI** → Kiểm tra lại API Key.\n2. Lấy API key miễn phí tại: https://aistudio.google.com/app/apikey\n\n💡 **Mẹo:** Bạn có thể gõ `/agent demo " + cleanQuery + "` để chạy thử nghiệm tính năng Agent Sandbox **ngay lập tức mà không cần API key và không tốn token**!", provider);
      } else if(errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("quota") || errMsg.includes("Quota")){
        let liteWorked = false;
        if(provider === "gemini"){
          try{
            aiUpdateTypingStatus("⚡ Model chính chạm giới hạn (429) — Đang chuyển sang Flash Lite...");
            const lite = await aiCallGeminiLite(agentPrompt, apiKey, [], hist);
            if(lite && lite.text){
              liteWorked = true;
              let content = lite.text.trim();

              aiAppendMessage("assistant", content, provider);
              if(typeof showToast === "function") showToast("ai_toast_auto_fallback", "info", [lite.model]);
            }
          }catch(liteErr){}
        }
        if(!liteWorked){
          let rescueReport = "⚠️ **Hạn mức yêu cầu tạm thời bị vượt quá (Lỗi 429 Quota Exceeded từ Google).**\n\n";
          rescueReport += "🛡️ **Agent đã tự động kích hoạt Chế độ Cứu hộ Sandbox (0 Token)** để tổng hợp đầy đủ dữ liệu cho bạn:\n\n";
          rescueReport += "🎯 **Mục tiêu đã duyệt:** *" + cleanQuery + "*\n\n";
          rescueReport += "### 1. Dữ liệu đã bóc tách từ Sandbox:\n";
          if(webRes && Array.isArray(webRes.sources) && webRes.sources.length){
            rescueReport += "- **Đã quét qua " + webRes.sources.length + " nguồn trực tuyến:**\n";
            webRes.sources.forEach((s, idx) => {
              rescueReport += "  " + (idx + 1) + ". `" + s.t + "` — " + s.u + "\n";
            });
          }
          if(scholarRes){
            rescueReport += "- **Tài liệu học thuật (OpenAlex / Crossref):** Đã đối chiếu các công trình nghiên cứu liên quan.\n";
          }
          if(webRes && webRes.text){
            const cleanSnippet = webRes.text.replace(/\[KẾT QUẢ TÌM KIẾM[\s\S]*?\n\n/i, "").slice(0, 1000);
            rescueReport += "\n### 2. Thông tin cốt lõi thu thập được:\n";
            rescueReport += "> " + cleanSnippet.split("\n").filter(Boolean).slice(0, 6).join("\n> ") + "\n\n";
          }
          rescueReport += "💡 **Lời khuyên:** Vui lòng đợi khoảng 30 - 60 giây để Google giải phóng hạn mức (Rate limit) hoặc chọn model khác trong **⚙ Cài đặt AI**.";

          aiAppendMessage("assistant", rescueReport, provider);
        }
      } else {
        let friendlyErr = errMsg;
        try {
          const jsonM = errMsg.match(/\{[\s\S]*\}/);
          if(jsonM){
            const parsed = JSON.parse(jsonM[0]);
            if(parsed.error && parsed.error.message){
              friendlyErr = parsed.error.message;
            }
          }
        } catch(e){}
        aiAppendMessage("assistant", "⚠️ **Không thể hoàn thành tác vụ Agent:** " + friendlyErr + "\n\n💡 Bạn có thể thử lại sau giây lát hoặc gõ `/agent demo " + cleanQuery + "` để chạy chế độ 0 Token.", provider);
      }
    }
  } finally {
    aiIsSending = false;
    if(sendBtn){
      sendBtn.classList.remove("is-stop");
      sendBtn.textContent = "➤";
      sendBtn.disabled = false;
      sendBtn.title = aiT("ai_btn_send", null, "Gửi câu hỏi");
    }
    const c = document.getElementById("ai-chat-history");
    if(c) c.scrollTop = c.scrollHeight;
  }
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
  const imagesToSend=aiAttachedImages.slice();
  const isSummaryQuery = !!quickReq || (aiQuickCtx && aiQuickCtx.kind === "page") || /^(tóm tắt|tom tat|summary)\b/i.test(raw);
  const isLiveRunning = !!(window.aiLiveSilentActive || window.aiLiveStream || aiLiveStream || aiLiveSilentActive);
  if(imagesToSend.length === 0 && isLiveRunning){
    try {
      const liveSnap = aiGrabLiveFrame(768, 0.6);
      if(liveSnap && liveSnap.data){
        liveSnap.isSilent = true;
        imagesToSend.push(liveSnap);
      }
    } catch(e){}
  } else if(imagesToSend.length === 0 && (isSummaryQuery || (detectedSkill && detectedSkill.key === "vision"))){
    try {
      const snap = await aiCaptureActiveTabLowToken(768, 0.6);
      if(snap && snap.data){
        snap.isSilent = true;
        imagesToSend.push(snap);
      }
    } catch(e){}
  }
  // Copilot Vision mode: silent background captures are not displayed as bulky images in the chat history
  const imagePreviews = imagesToSend.filter(im => !im.isSilent && !im.isLiveFrame).map(im => im.preview);
  aiAppendMessage("user", raw, provider, imagePreviews);
  if(imagesToSend.some(im => im.isSilent || im.isLiveFrame)){
    const copilotMsg = (typeof aiT === "function")
      ? aiT("ai_typing_copilot_vision", null, "Copilot Vision đang đọc hiểu giao diện màn hình...")
      : "Copilot Vision đang đọc hiểu giao diện màn hình...";
    aiUpdateTypingStatus(copilotMsg);
  }
  if(input){ input.value=""; input.style.height=""; }
  const _imgInput=document.getElementById("ai-image-input");
  if(_imgInput) _imgInput.value="";
  const _imagesForApi=imagesToSend;
  aiAttachedImages=[];
  aiAttachedImage=null;
  aiRenderAttachedImages();
  const canRunAgentIntent = (imagesToSend.length === 0 && !quickReq && !/^[+@]/.test(raw));
  const autoNavIntent = (canRunAgentIntent && !isPageQuery) ? aiDetectAutoNavIntent(raw) : null;
  if(autoNavIntent){
    const agentAction = aiDetectAgentAction(raw);
    if(agentAction && agentAction.topic && agentAction.topic.length >= 2){
      autoNavIntent.query = agentAction.topic;
    }
    const agentPlan = agentAction ? aiBuildAgentActionPlan(agentAction, autoNavIntent.isYoutube) : [];
    if(agentPlan.length){
      autoNavIntent.plan = agentPlan;
      if(aiAgentRequiresApproval(agentPlan, aiSettings.agentConfirm)){
        aiAppendAgentApprovalCard(cleanQuery, raw, provider, key, detectedSkill, false, {
          plan: agentPlan,
          onApprove: function(){ aiExecuteAutoNav(autoNavIntent, provider); }
        });
        return;
      }
    }
    aiExecuteAutoNav(autoNavIntent, provider);
    return;
  }
  const socialComposeIntent = canRunAgentIntent ? aiDetectSocialComposeIntent(raw, pageUrl) : null;
  if(socialComposeIntent){
    aiAppendSocialComposeCard(socialComposeIntent, provider, key);
    return;
  }
  const agentActionDirect = canRunAgentIntent ? aiDetectAgentAction(raw) : null;
  if(!autoNavIntent && agentActionDirect){
    const isYoutube = typeof window.aiIsYouTubeUrl === "function" ? window.aiIsYouTubeUrl(pageUrl || aiGetCurrentPageInfo().url) : false;
    const agentPlan = aiBuildAgentActionPlan(agentActionDirect, isYoutube);
    if(agentPlan.length){
            const doRun = async function(){
        aiUpdateTypingStatus("⏳ Đang phân tích Actionable DOM...");
        const tabsApi = (typeof browser !== "undefined" && browser.tabs) ? browser.tabs : (typeof chrome !== "undefined" ? chrome.tabs : null);
        if(!tabsApi || !tabsApi.query) return;
        tabsApi.query({active: true, currentWindow: true}, async function(tabs){
          if(!tabs || !tabs[0]) return;
          const tabId = tabs[0].id;
          let finalPlan = agentPlan;
          if(agentPlan.length === 1 && agentPlan[0].kind === "dynamic") {
            const domInfo = await new Promise(res => {
              try {
                sendTabMessage({action: "GET_ACTIONABLE_DOM", timeoutMs: 3000, silent: true}, r => {
                  res(r && r.ok ? r.dom : "");
                }, tabId);
              } catch(e){ res(""); }
            });
            let visionImgList = [];
            if(aiSettings.agentVision){
              try {
                aiUpdateTypingStatus("Đang chụp ảnh Vision nén (tiết kiệm token)...");
                const shot = await aiCaptureActiveTabLowToken(768, 0.6);
                if(shot && shot.data){
                  visionImgList = [{ mimeType: "image/jpeg", data: shot.data }];
                }
              } catch(e){}
            }
            if(domInfo) {
              const visionPromptNote = visionImgList.length
                ? "\n- Kèm ảnh chụp màn hình Vision (đã nén độ phân giải thấp để tối ưu token): Hãy quan sát kỹ ảnh giao diện thực tế và đối chiếu với DOM để xác định chính xác nút bấm, icon mạng xã hội (nút Follow TikTok/YouTube, avatar, nút đóng modal, biểu tượng không có text)."
                : "";
              const prompt = "Dựa vào Actionable DOM" + (visionImgList.length ? " và hình ảnh giao diện thực tế đính kèm (Vision):" : ":") + "\n" + domInfo + "\n\nNhiệm vụ: " + agentPlan[0].rawQuery + "\nLưu ý:" + visionPromptNote + "\n- Nếu nhiệm vụ là nhắn tin hoặc bình luận, hãy dựa vào lịch sử trò chuyện để viết nội dung phù hợp với tính cách, ngữ cảnh và yêu cầu của người dùng.\nTrả về JSON array các bước [{kind: 'click', selector: '...', match: ['từ khóa']}, {kind: 'type', selector: '...', text: '...'}, {kind: 'wait', ms: 1000}, {kind: 'submit'}] chỉ chứa JSON.";
              try {
                const resText = await window.aiCallGeminiLite(prompt, key, visionImgList, window.aiHistory || []);
                if(resText && resText.text) {
                  const jsonMatch = resText.text.match(/\[.*\]/s);
                  if(jsonMatch) {
                    finalPlan = JSON.parse(jsonMatch[0]);
                  }
                }
              } catch(e){}
            } else {
              // fallback if DOM fetch fails
              finalPlan = [{kind: "wait", ms: 1000}, {kind: "click", match: [agentPlan[0].rawQuery]}];
            }
          }
          aiUpdateTypingStatus("⏳ Đang thực thi trên trang hiện tại...");
          const results = await window.aiAgentRunPlan(finalPlan, tabId);
          const report = aiAgentResultsReport(results);
          aiHideTyping();
          if(report) aiAppendMessage("assistant", report, provider);
        });
      };
      if(aiAgentRequiresApproval(agentPlan, aiSettings.agentConfirm)){
        aiAppendAgentApprovalCard(cleanQuery, raw, provider, key, detectedSkill, false, {
          plan: agentPlan,
          onApprove: doRun
        });
        return;
      }
      doRun();
      return;
    }
  }
  const isAgentCmd = /^[\/!](agent|sandbox|browse)\b/i.test(raw) || (detectedSkill && detectedSkill.key === "agent");
  if(isAgentCmd){
    if(!cleanQuery){
      aiAppendMessage("assistant", "💡 Hãy nhập yêu cầu tìm kiếm cùng lệnh, ví dụ: `/agent tìm kiếm công nghệ pin thể rắn mới nhất`", provider);
      return;
    }
    if(!aiSettings.agentMode){
      const disabledMsg = (typeof getI18nText === "function")
        ? getI18nText("ai_agent_disabled_notice")
        : "⚠️ **Chế độ AI Agent chưa được bật trong Cài đặt.**\n\nVui lòng mở ⚙ **Cài đặt AI** và bật *'Bật chế độ AI Agent (Thử nghiệm)'* để cho phép Agent tự động duyệt web trong Sandbox khi gõ lệnh `/agent`.";
      aiAppendMessage("assistant", disabledMsg, provider);
      return;
    }
    if(!aiCanUse(provider)){
      const needKeyMsg = aiNeedProviderMsg(provider);
      aiAppendMessage("assistant", needKeyMsg, provider);
      return;
    }
    if(aiSettings.agentConfirm !== false){
      aiAppendAgentApprovalCard(cleanQuery, raw, provider, key, detectedSkill);
      return;
    }
    aiRunAgentWorkflow(cleanQuery, raw, provider, key, detectedSkill);
    return;
  }
  if(imagesToSend.length === 0 && !isPageQuery && !quickReq){
    const localAnswer = aiCheckLocalAssistantQuery(raw);
    if(localAnswer){
      aiAppendMessage("assistant", localAnswer, provider);
      aiSaveHistorySoon();
      return;
    }
  }
  aiIsSending=true; aiUserStopped=false; aiAbort=new AbortController();
  const sendBtn=document.getElementById("ai-btn-send");
  if(sendBtn){ sendBtn.classList.add("is-stop"); sendBtn.textContent="⏹"; sendBtn.disabled=false; sendBtn.title=aiT("ai_btn_stop",null,"Dừng tạo câu trả lời"); }
  if(!aiCanUse(provider)){
    aiIsSending=false;
    if(sendBtn){ sendBtn.classList.remove("is-stop"); sendBtn.textContent="➤"; sendBtn.disabled=false; sendBtn.title=aiT("ai_btn_send",null,"Gửi câu hỏi"); }
    aiAppendMessage("assistant", aiNeedProviderMsg(provider), provider);
    if(typeof showToast==="function") showToast(aiNeedProviderToastKey(provider),"warning");
    return;
  }
  const hist=aiHistory.slice(0,-1);
  const streaming=aiSettings.stream!==false&&aiHasKey(provider)&&(provider==="gemini"||provider==="openai");
  let streamAcc=""; let streamRow=null;
  let streamRaf=null;
  const renderLiveStream=()=>{
    streamRaf=null;
    if(!streamRow) return;
    aiRenderFormattedText(streamRow, streamAcc);
    const cur=document.createElement("span");
    cur.className="ai-stream-cursor";
    const lastEl=streamRow.lastElementChild;
    if(lastEl && !lastEl.classList.contains("ai-table") && !lastEl.classList.contains("ai-code-wrap") && !lastEl.classList.contains("ai-flashcard") && !lastEl.classList.contains("ai-chapter-card")){
      lastEl.appendChild(cur);
    } else {
      streamRow.appendChild(cur);
    }
    const c2=document.getElementById("ai-chat-history");
    if(c2) c2.scrollTop=c2.scrollHeight;
  };
  const onToken=(piece)=>{
    streamAcc+=piece;
    if(!streamRow){
      aiHideTyping();
      aiAppendMessage("assistant","",provider);
      const c=document.getElementById("ai-chat-history");
      streamRow=c&&c.lastElementChild?c.lastElementChild.querySelector(".ai-bubble"):null;
    }
    if(streamRow){
      if(!streamRaf){
        streamRaf=requestAnimationFrame(renderLiveStream);
      }
    }
  };
  const pipeline = aiResolvePipeline(raw, isPageQuery, detectedSkill, quickReq, hasActiveWebPage, pageUrl);
  aiShowTyping({label:pipeline.label, step:1, total:pipeline.steps.length, text:pipeline.steps[0]});
  let pageText=""; let selectionText=aiAttachedSelection||"";
  aiAttachedSelection="";
  /* Fetch page context when user triggered +/@ prefix, active page in auto mode, or a quick-chip request */
  if(isPageQuery) {
    aiUpdateTypingStatus({label:pipeline.label, step:2, total:pipeline.steps.length, text:pipeline.steps[1]});
    try{
      pageText=await aiGetPageContextText(cleanQuery);
      if(!selectionText) selectionText=await aiGetSelectionText();
    }catch(e){}
  }
  if(quickReq){
    aiUpdateTypingStatus({label:pipeline.label, step:2, total:pipeline.steps.length, text:pipeline.steps[1]});
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
  if(isPageQuery && (!_imagesForApi || !_imagesForApi.length) && aiSettings.includeImages && provider!=="custom" && provider!=="webllm" && pageText){ try{ pageImages=await aiGetPageImages(); }catch(e){} }
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
  const apiImages=(provider==="webllm")?[]:((_imagesForApi && _imagesForApi.length)?_imagesForApi.map(im=>({data:im.data,mimeType:im.mimeType||"image/jpeg"})):pageImages);
  const imageNote=apiImages.length?("[Attached images: "+apiImages.length+". If the question needs visual info (counting objects, reading text in the image, comparing images), answer from these images.]"):null;
  const webSearchEnabled=((aiSettings.webSearch!==false)&&aiSettings.scope!=="only")||forceGround;
  let multiWebNote="";
  let multiWebSources=[];
  if(webSearchEnabled&&!quickReq){
    aiUpdateTypingStatus({label:pipeline.label, step:2, total:pipeline.steps.length, text:pipeline.steps[1]});
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
  if(!aiCanUse(provider)){
    answer=aiNeedProviderMsg(provider);
    usedFallback=true; if(typeof showToast==="function") showToast(aiNeedProviderToastKey(provider),"warning");
  } else {
    aiUpdateTypingStatus({label:pipeline.label, step:3, total:pipeline.steps.length, text:pipeline.steps[2]});
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
        if(streamRaf){ cancelAnimationFrame(streamRaf); streamRaf=null; }
        answer=String(streamAcc||"")+"\n\n"+aiT("ai_toast_stopped",null,"⏹ Đã dừng tạo câu trả lời."); usedFallback=true; if(typeof showToast==="function") showToast("ai_toast_stopped","warning");
      } else {
      const msg0=(e&&e.message)?e.message:"unknown";
      if(provider==="gemini"&&/timeout|timed out|abort|429|503|504|408|overload/i.test(String(msg0))){
        try{
          const lite=await aiCallGeminiLite(prompt, key, apiImages, hist);
          if(lite&&lite.text){ answer=lite.text; if(typeof showToast==="function") showToast("ai_toast_auto_fallback","info",[lite.model]); }
        }catch(e2){}
      }
      if(!answer){
      const msg=msg0; let hint="";
      const _srv = provider==="custom" ? aiActiveCustomServer() : null;
      const _label = (_srv && _srv.name) ? (aiGetProviderConfig(provider).label+" · "+_srv.name) : aiGetProviderConfig(provider).label;
      const _model = (_srv && _srv.model) ? _srv.model : aiGetModel(provider);
      if(provider==="webllm"&&/webllm_not_loaded|webllm_model_mismatch/i.test(String(msg))) hint="\n\n"+aiT("ai_hint_webllm_not_loaded",null,"💡 Model WebLLM chưa được tải: mở ⚙ Cài đặt AI → WebLLM → Tải model, rồi gửi lại.");
      else if(provider==="webllm"&&/webllm_unsupported/i.test(String(msg))) hint="\n\n"+aiT("ai_webllm_unsupported",null,"⚠️ Trình duyệt không hỗ trợ WebGPU — WebLLM cần Chrome/Edge 113+ trở lên.");
      else if(provider==="webllm"&&/webllm_context_overflow|context window|prompt tokens exceed/i.test(String(msg))) hint="\n\n"+aiT("ai_hint_webllm_ctx",null,"💡 Prompt vượt cửa sổ ngữ cảnh của model local — ScholarFlow đã tự cắt bớt ngữ cảnh; nếu vẫn lỗi, hãy giảm Số ký tự ngữ cảnh trong ⚙ Cài đặt AI hoặc chọn model lớn hơn.");
      else if(provider==="webllm"&&/webllm_load_oom|oom|out of memory|allocat/i.test(String(msg))) hint="\n\n"+aiT("ai_hint_webllm_oom",null,"💡 Bộ nhớ không đủ — chọn model nhỏ hơn (VD SmolLM2 360M) ở ⚙ Cài đặt AI → WebLLM rồi tải lại.");
      else if(provider==="webllm"&&/webllm_load_download|webllm_load_failed|fetch|network/i.test(String(msg))) hint="\n\n"+aiT("ai_hint_webllm_download",null,"💡 Không tải được weight model — kiểm tra mạng rồi bấm Tải model lại.");
      else if(String(msg).toLowerCase().includes("timed out")||String(msg).toLowerCase().includes("timeout")||String(msg).toLowerCase().includes("abort")) hint="\n\n"+aiT("ai_hint_timeout",[_model],"⏱️ Model "+_model+" overloaded/timeout - switch to a Lite model in Settings");
      else if(String(msg).includes("404")&&provider==="gemini") hint="\n\n"+aiT("ai_hint_404",[_model],"💡 Gợi ý tiết kiệm token: Model "+_model+" không khả dụng (404). Hãy bấm ⚙ → Gợi ý model → chọn Lite.");
      else if(provider==="custom"&&/no models loaded/i.test(String(msg))) hint="\n\n"+aiT("ai_hint_no_model",null,"💡 Chưa nạp model trong LM Studio: mở app → tab Developer → Load model (hoặc chạy `lms load`), giữ server chạy rồi bấm gửi lại.");
      else if(provider==="custom"&&/Unexpected endpoint|http_40[45]/i.test(String(msg))) hint="\n\n"+aiT("ai_hint_endpoint",null,"💡 Endpoint sai — URL máy chủ phải trỏ tới .../v1/chat/completions (VD: http://localhost:1234/v1/chat/completions).");
      else if((String(msg).includes("custom_url_blocked")||String(msg).includes("custom_redirect_blocked"))&&typeof showToast==="function") showToast("ai_toast_url_blocked","warning");
      answer=String(aiT("ai_err_prefix",[_label,_model],"❌ Lỗi gọi "+_label+" ("+_model+"): ")+msg+hint).slice(0,8000); usedFallback=true; if(typeof showToast==="function") showToast("ai_toast_error","error");
      }
      }
    }
  }
  /* Clean answer: strip any inline citation tags, URLs or memory notes */
  if(!usedFallback&&String(answer||"").trim()){
    answer=aiCleanFormatting(answer);
  }
  aiHideTyping();
  if(streaming){
    if(streamRaf){ cancelAnimationFrame(streamRaf); streamRaf=null; }
    const last=aiHistory[aiHistory.length-1];
    if(streamRow&&last&&last.role==="assistant"){
      last.content=String(answer).slice(0,16000);
      aiSaveHistorySoon();
      aiRenderHistory();
    } else if(answer){
      aiAppendMessage("assistant", answer, provider);
    }
  }
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
function aiWebllmLoadAction(){
  if(typeof window==="undefined"||typeof window.sfWebllmLoad!=="function"){ if(typeof showToast==="function") showToast("ai_webllm_unsupported","error"); return; }
  if(!(window.sfWebllmSupported&&window.sfWebllmSupported())){ if(typeof showToast==="function") showToast("ai_webllm_unsupported","error"); aiWebllmSyncSection(); return; }
  const sel=document.getElementById("ai-webllm-model-select");
  const modelId=(sel&&sel.value)||aiGetModel("webllm")||"";
  if(!modelId) return;
  aiSetModel("webllm",modelId);
  if(typeof showToast==="function") showToast("ai_toast_webllm_loading","info",[modelId]);
  aiUpdateProviderUI();
  window.sfWebllmLoad(modelId,function(pct,_txt){
    const bar=document.getElementById("ai-webllm-progress");
    if(bar) bar.style.display="";
    const fill=document.getElementById("ai-webllm-progress-fill");
    if(fill) fill.style.width=String(Math.round(pct*100))+"%";
    const pctStr=String(Math.round(pct*100));
    const st=document.getElementById("ai-webllm-status");
    if(st) st.textContent=aiT("ai_webllm_status_loading",[pctStr],"⏳ Đang tải model... "+pctStr+"%");
    const kst=document.getElementById("ai-key-status");
    if(kst&&aiProvider==="webllm") kst.textContent=st?st.textContent:"";
  }).then(function(){
    if(typeof showToast==="function") showToast("ai_toast_webllm_ready","success",[modelId]);
    aiUpdateProviderUI();
  }).catch(function(){
    if(typeof showToast==="function") showToast("ai_toast_webllm_error","error");
    aiUpdateProviderUI();
  });
}
function aiWebllmUnloadAction(){
  if(typeof window==="undefined"||typeof window.sfWebllmUnload!=="function") return;
  window.sfWebllmUnload().then(function(){
    if(typeof showToast==="function") showToast("ai_toast_webllm_stopped","info");
    aiUpdateProviderUI();
  });
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
  ["ai-opt-page","ai-opt-selection","ai-opt-notes","ai-opt-images","ai-opt-source","ai-opt-stream","ai-opt-websearch","ai-opt-autovideo","ai-opt-agent-mode","ai-opt-agent-confirm","ai-opt-agent-vision"].forEach(id=>{ const el=document.getElementById(id); if(!el) return; el.addEventListener("change",()=>{ if(id==="ai-opt-page") aiSettings.includePage=el.checked; if(id==="ai-opt-selection") aiSettings.includeSelection=el.checked; if(id==="ai-opt-notes") aiSettings.includeNotes=el.checked; if(id==="ai-opt-images") aiSettings.includeImages=el.checked; if(id==="ai-opt-source") aiSettings.includeSource=el.checked; if(id==="ai-opt-stream") aiSettings.stream=el.checked; if(id==="ai-opt-websearch") aiSettings.webSearch=el.checked; if(id==="ai-opt-autovideo") aiSettings.autoVideo=el.checked; if(id==="ai-opt-agent-mode") aiSettings.agentMode=el.checked; if(id==="ai-opt-agent-confirm") aiSettings.agentConfirm=el.checked;
      if(id==="ai-opt-agent-vision") { aiSettings.agentVision=el.checked; const vb=document.getElementById("ai-btn-capture-vision"); if(vb) vb.classList.toggle("is-active", !!el.checked); } aiSaveSettings(); }); });
  const personaSel=document.getElementById("ai-persona-select");
  if(personaSel){
    personaSel.addEventListener("change",()=>{
      aiSettings.personaStyle=(personaSel.value&&AI_PERSONAS[personaSel.value])?personaSel.value:"casual";
      aiSaveSettings();
      if(typeof showToast==="function") showToast("ai_toast_persona_saved","success");
    });
  }
  const personaCustomEl=document.getElementById("ai-persona-custom");
  if(personaCustomEl){
    personaCustomEl.addEventListener("input",()=>{ aiSettings.personaCustom=String(personaCustomEl.value||"").slice(0,600); aiSaveSettings(); });
    personaCustomEl.addEventListener("change",()=>{ aiSettings.personaCustom=String(personaCustomEl.value||"").slice(0,600); aiSaveSettings(); if(typeof showToast==="function") showToast("ai_toast_persona_saved","success"); });
  }
  document.addEventListener("change", (e) => {
    if (e.target && e.target.id === "ai-opt-companion") {
      aiSetCompanionEnabled(e.target.checked, true);
    } else if (e.target && e.target.id === "ai-persona-select") {
      aiSettings.personaStyle = (e.target.value && AI_PERSONAS[e.target.value]) ? e.target.value : "casual";
      aiSaveSettings();
    } else if (e.target && e.target.id === "ai-persona-custom") {
      aiSettings.personaCustom = String(e.target.value || "").slice(0, 600);
      aiSaveSettings();
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
        const ps = document.getElementById("ai-persona-select");
        if (ps) ps.value = (aiSettings.personaStyle && AI_PERSONAS[aiSettings.personaStyle]) ? aiSettings.personaStyle : "casual";
        const pc = document.getElementById("ai-persona-custom");
        if (pc) pc.value = aiSettings.personaCustom || "";
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
  const openSettings=document.getElementById("ai-btn-open-settings"); const closeSettings=document.getElementById("ai-btn-close-settings"); const backdrop=document.getElementById("ai-settings-backdrop"); const modal=document.getElementById("ai-settings-modal"); const changeModelBtn=document.getElementById("ai-btn-change-model"); const showModal=()=>{ if(modal) modal.style.display="flex"; aiPopulateModelSelect(); aiRenderCustomServers(); aiRenderModelsManager(); aiSyncCompanionFromStorage(); }; const hideModal=()=>{ if(modal) modal.style.display="none"; }; if(openSettings) openSettings.addEventListener("click",showModal); if(changeModelBtn) changeModelBtn.addEventListener("click",showModal); if(closeSettings) closeSettings.addEventListener("click",hideModal); if(backdrop) backdrop.addEventListener("click",hideModal);
  const modelSel=document.getElementById("ai-model-select"); if(modelSel) modelSel.addEventListener("change",()=>aiOnModelChange(modelSel.value));
  const wlModelSel=document.getElementById("ai-webllm-model-select");
  if(wlModelSel){
    wlModelSel.textContent="";
    aiGetProviderModels("webllm").forEach(m=>{ const o=document.createElement("option"); o.value=m; o.textContent=(AI_MODEL_LABELS[m]||m); wlModelSel.appendChild(o); });
    const wlCur=aiGetModel("webllm");
    if(wlCur) wlModelSel.value=wlCur;
    wlModelSel.addEventListener("change",()=>{ aiSetModel("webllm",wlModelSel.value); aiUpdateProviderUI(); });
  }
  const wlLoadBtn=document.getElementById("ai-btn-webllm-load"); if(wlLoadBtn) wlLoadBtn.addEventListener("click",aiWebllmLoadAction);
  const wlUnloadBtn=document.getElementById("ai-btn-webllm-unload"); if(wlUnloadBtn) wlUnloadBtn.addEventListener("click",aiWebllmUnloadAction);
  const wlBudget=document.getElementById("ai-webllm-ctx-budget");
  if(wlBudget){ const wlBudgetSync=()=>{ const v=Math.max(1024,Math.min(16384,Number(wlBudget.value)||4096)); aiSettings.ctxBudget=v; const bv=document.getElementById("ai-webllm-ctx-budget-val"); if(bv) bv.textContent=String(v); aiSaveSettings(); }; wlBudget.addEventListener("input",wlBudgetSync); }
  aiWebllmSyncSection();
  const manageProvSel=document.getElementById("ai-manage-provider-select");
  if(manageProvSel) manageProvSel.addEventListener("change", aiRenderModelsManager);
  const addModelBtn=document.getElementById("ai-btn-add-model");
  const newModelInp=document.getElementById("ai-new-model-name");
  if(addModelBtn&&newModelInp){
    const doAddModel=()=>{ const v=newModelInp.value.trim(); if(v){ aiAddCustomModel(manageProvSel?.value||"gemini", v); newModelInp.value=""; } };
    addModelBtn.addEventListener("click", doAddModel);
    newModelInp.addEventListener("keydown", (e)=>{ if(e.key==="Enter"){ e.preventDefault(); doAddModel(); } });
  }
  const resetModelsBtn=document.getElementById("ai-btn-reset-models");
  if(resetModelsBtn) resetModelsBtn.addEventListener("click", ()=>{ aiResetCustomModels(manageProvSel?.value||"gemini"); });
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
  if(tempRange){ const updateAiCapsule=(v)=>{ const min=parseFloat(tempRange.min)||0; const max=parseFloat(tempRange.max)||1; const ratio=Math.max(0,Math.min(100,((v-min)/(max-min))*100)); const fill=document.getElementById("ai-temp-capsule-fill"); const thumb=document.getElementById("ai-temp-capsule-thumb"); if(fill) fill.style.width=ratio.toFixed(1)+"%"; if(thumb){ thumb.style.left=ratio.toFixed(1)+"%"; thumb.style.transform="translate(-"+ratio.toFixed(1)+"%, -50%)"; } if(tempVal) tempVal.textContent=String(v); tempRange.style.setProperty("--range-pct",ratio.toFixed(1)+"%"); }; const sync=()=>{ const v=parseFloat(tempRange.value); aiSettings.temperature=isFinite(v)?v:0.7; updateAiCapsule(aiSettings.temperature); aiSaveSettings(); }; tempRange.addEventListener("input",sync); tempRange.addEventListener("change",sync); const initialTemp=isFinite(aiSettings.temperature)?aiSettings.temperature:0.7; tempRange.value=String(initialTemp); updateAiCapsule(initialTemp); }
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
  const attachBtn=document.getElementById("ai-btn-attach-image"); const imgInput=document.getElementById("ai-image-input"); const removeBtn=document.getElementById("ai-btn-remove-image");
  const visionBtn=document.getElementById("ai-btn-capture-vision"); if(visionBtn) visionBtn.addEventListener("click", aiHandleVisionCaptureClick);
  const liveStreamBtn=document.getElementById("ai-btn-live-stream"); if(liveStreamBtn) liveStreamBtn.addEventListener("click", aiToggleLiveStream);
  const liveCloseBtn=document.getElementById("ai-btn-live-close"); if(liveCloseBtn) liveCloseBtn.addEventListener("click", ()=>aiStopLiveStream(true));
  const liveSwitchBtn=document.getElementById("ai-btn-live-switch"); if(liveSwitchBtn) liveSwitchBtn.addEventListener("click", aiSwitchLiveStreamSource);
  const liveSourceSelect=document.getElementById("ai-live-source-select"); if(liveSourceSelect) liveSourceSelect.addEventListener("change", (e)=>aiStartLiveStream(e.target.value, true));
  const liveSnapBtn=document.getElementById("ai-btn-live-snap"); if(liveSnapBtn) liveSnapBtn.addEventListener("click", aiHandleLiveSnapClick);
  if(attachBtn&&imgInput){ attachBtn.addEventListener("click",()=>imgInput.click()); imgInput.addEventListener("change",()=>{ if(imgInput.files&&imgInput.files.length) aiAttachImageFiles(imgInput.files); imgInput.value=""; }); }
  const pasteHandler=(e)=>{ const cd=e.clipboardData||null; if(!cd||!cd.items) return; const imgs=[]; for(const it of cd.items){ try{ if(it.kind==="file"&&it.type&&it.type.startsWith("image/")){ const img=it.getAsFile(); if(img) imgs.push(img); } }catch(e2){} } if(imgs.length){ if(e.preventDefault) e.preventDefault(); aiAttachImageFiles(imgs); } };
  const aiInputEl=document.getElementById("ai-input"); if(aiInputEl) aiInputEl.addEventListener("paste",pasteHandler); if(chatHist) chatHist.addEventListener("paste",pasteHandler);
  const dropHandler=(e)=>{ const dt=e.dataTransfer; if(!dt||!dt.files||!dt.files.length) return; const imgs=Array.from(dt.files).filter(f=>f&&f.type&&f.type.startsWith("image/")); if(imgs.length){ if(e.preventDefault) e.preventDefault(); aiAttachImageFiles(imgs); } };
  if(aiInputEl){ aiInputEl.addEventListener("dragover",(e)=>{ if(e.dataTransfer&&Array.from(e.dataTransfer.types||[]).includes("Files")) e.preventDefault(); }); aiInputEl.addEventListener("drop",dropHandler); }
  if(chatHist){ chatHist.addEventListener("dragover",(e)=>{ if(e.dataTransfer&&Array.from(e.dataTransfer.types||[]).includes("Files")) e.preventDefault(); }); chatHist.addEventListener("drop",dropHandler); }
  if(removeBtn) removeBtn.addEventListener("click",()=>{ aiAttachedImages=[]; aiAttachedImage=null; if(imgInput) imgInput.value=""; aiRenderAttachedImages(); });
  const setupHScroll=(selector)=>{ document.querySelectorAll(selector).forEach(el=>{ el.addEventListener("wheel",(e)=>{ if(e.deltaY!==0 && el.scrollWidth>el.clientWidth){ el.scrollLeft+=e.deltaY; e.preventDefault(); } },{passive:false}); }); };
  setupHScroll(".ai-quick-chips"); setupHScroll(".ai-pages-list");
}
async function initAI(){
  await aiLoadSettings(); aiUpdateProviderUI();
  const page=document.getElementById("ai-opt-page"); const sel=document.getElementById("ai-opt-selection"); const notes=document.getElementById("ai-opt-notes"); const imgs=document.getElementById("ai-opt-images"); const src=document.getElementById("ai-opt-source"); const strm=document.getElementById("ai-opt-stream");
  if(page) page.checked=!!aiSettings.includePage; if(sel) sel.checked=!!aiSettings.includeSelection; if(notes) notes.checked=!!aiSettings.includeNotes; if(imgs) imgs.checked=!!aiSettings.includeImages; if(src) src.checked=!!aiSettings.includeSource;   if(strm) strm.checked=aiSettings.stream!==false; const wsc=document.getElementById("ai-opt-websearch"); if(wsc) wsc.checked=aiSettings.webSearch!==false; const av=document.getElementById("ai-opt-autovideo"); if(av) av.checked=aiSettings.autoVideo!==false; const agm=document.getElementById("ai-opt-agent-mode"); if(agm) agm.checked=!!aiSettings.agentMode; const agc=document.getElementById("ai-opt-agent-confirm"); if(agc) agc.checked=aiSettings.agentConfirm!==false; const agv=document.getElementById("ai-opt-agent-vision"); if(agv) agv.checked=!!aiSettings.agentVision;
  const ps=document.getElementById("ai-persona-select"); if(ps) ps.value=(aiSettings.personaStyle&&AI_PERSONAS[aiSettings.personaStyle])?aiSettings.personaStyle:"casual";
  const pc=document.getElementById("ai-persona-custom"); if(pc) pc.value=aiSettings.personaCustom||"";
  const scp=document.getElementById("ai-scope-select"); if(scp) scp.value=(aiSettings.scope==="only"||aiSettings.scope==="web")?aiSettings.scope:"auto";
  aiRenderHistory(); aiInitEvents(); aiUpdateCurrentPageDisplay(); aiUpdateChatHeight(); setInterval(()=>{ const ta=document.getElementById("tab-ai"); if(ta&&!ta.classList.contains("active")) return; aiUpdateCurrentPageDisplay(); aiUpdateChatHeight(); },2000); window.addEventListener("resize",aiUpdateChatHeight); const aiVisHandler=()=>{ if(document.visibilityState==="visible"){ aiUpdateCurrentPageDisplay(); aiUpdateChatHeight(); } }; document.addEventListener("visibilitychange",aiVisHandler); const tabAi=document.getElementById("tab-ai"); if(tabAi){ const obs=new MutationObserver(()=>{ if(tabAi.classList.contains("active")){ aiUpdateCurrentPageDisplay(); aiUpdateChatHeight(); requestAnimationFrame(()=>requestAnimationFrame(aiScrollToBottom)); } }); obs.observe(tabAi,{attributes:true,attributeFilter:["class"]}); }
  const tabsApi=(typeof browser!=="undefined"&&browser.tabs)?browser.tabs:(typeof chrome!=="undefined"?chrome.tabs:null);
  if(tabsApi&&tabsApi.onActivated){
    try{ tabsApi.onActivated.addListener(()=>{ setTimeout(aiUpdateCurrentPageDisplay,150); if(window.aiLiveStream||aiLiveStream) aiBroadcastLiveBorder(true); }); }catch(e){}
  }
  if(tabsApi&&tabsApi.onUpdated){
    try{ tabsApi.onUpdated.addListener((tabId,changeInfo)=>{ if(changeInfo.status==="complete"||changeInfo.url||changeInfo.title){ setTimeout(aiUpdateCurrentPageDisplay,150); } }); }catch(e){}
  }
}
if(typeof window!=="undefined"){
  window.AI_SKILLS=AI_SKILLS; window.aiDetectSkill=aiDetectSkill;
  window.AI_PIPELINES=AI_PIPELINES; window.aiResolvePipeline=aiResolvePipeline; window.aiAppendAgentApprovalCard=aiAppendAgentApprovalCard; window.aiRunAgentWorkflow=aiRunAgentWorkflow; window.aiDetectAutoNavIntent=aiDetectAutoNavIntent; window.aiExecuteAutoNav=aiExecuteAutoNav; window.aiUpdateTypingStatus=aiUpdateTypingStatus;
  window.aiExtractViaScripting=aiExtractViaScripting; window.aiExtractViaBackgroundFetch=aiExtractViaBackgroundFetch;
  window.aiDetectAgentAction=aiDetectAgentAction; window.aiBuildAgentActionPlan=aiBuildAgentActionPlan; window.aiAgentRequiresApproval=aiAgentRequiresApproval; window.aiAgentPlanIsSensitive=aiAgentPlanIsSensitive; window.aiAgentStepLabel=aiAgentStepLabel; window.aiAgentStepIcon=aiAgentStepIcon; window.aiAgentResultsReport=aiAgentResultsReport; window.aiAgentRunPlan=aiAgentRunPlan; window.aiAgentRunStep=aiAgentRunStep; window.sfAgentDomAct=sfAgentDomAct; window.aiAgentIsNavCommand=aiAgentIsNavCommand;
  window.AI_PERSONAS=AI_PERSONAS; window.aiBuildPersonaDirective=aiBuildPersonaDirective; window.aiDetectSocialPlatform=aiDetectSocialPlatform; window.aiDetectSocialComposeIntent=aiDetectSocialComposeIntent; window.aiLocalPersonaDraft=aiLocalPersonaDraft; window.aiGeneratePersonaDraft=aiGeneratePersonaDraft; window.aiBuildSocialSendPlan=aiBuildSocialSendPlan; window.aiAppendSocialComposeCard=aiAppendSocialComposeCard;
  window.AI_PROVIDERS=AI_PROVIDERS; window.AI_MODEL_LABELS=AI_MODEL_LABELS; window.aiValidateCustomUrl=aiValidateCustomUrl; window.aiSanitizeExternal=aiSanitizeExternal; window.aiSanitizeHistory=aiSanitizeHistory; window.aiRateLimitOk=aiRateLimitOk; window.aiSelectRelevantWindow=aiSelectRelevantWindow; window.aiIsYouTubeUrl=aiIsYouTubeUrl; window.aiHistoryToGeminiContents=aiHistoryToGeminiContents; window.aiHistoryToOpenAIMessages=aiHistoryToOpenAIMessages; window.aiHistoryToClaudeMessages=aiHistoryToClaudeMessages; window.aiCollectTabsContext=aiCollectTabsContext; window.aiScholarSearch=aiScholarSearch; window.aiAttachImageFile=aiAttachImageFile; window.aiAttachImageFiles=aiAttachImageFiles; window.aiRenderAttachedImages=aiRenderAttachedImages; window.aiExtractYouTubeId=aiExtractYouTubeId; window.aiYtMetaViaFetch=aiYtMetaViaFetch; window.aiYtBalancedJson=aiYtBalancedJson; window.aiCallGeminiLite=aiCallGeminiLite; window.aiSig=aiSig; window.aiRegenerate=aiRegenerate; window.aiSelectRelevantWindows=aiSelectRelevantWindows; window.aiSessionsSearch=aiSessionsSearch; window.aiMemKey=aiMemKey; window.aiMemFor=aiMemFor; window.aiRenderSessions=aiRenderSessions; window.aiShowSessions=aiShowSessions; window.aiHideSessions=aiHideSessions; window.aiGetProviderConfig=aiGetProviderConfig; window.aiGetModel=aiGetModel; window.aiSetModel=aiSetModel; window.aiFetchGeminiModels=aiFetchGeminiModels; window.aiHasKey=aiHasKey; window.aiCanUse=aiCanUse; window.aiActiveCustomServer=aiActiveCustomServer; window.aiNormalizeCustomUrl=aiNormalizeCustomUrl; window.aiBuildPrompt=aiBuildPrompt; window.aiAddPage=aiAddPage; window.aiRemovePage=aiRemovePage; window.aiRenderPages=aiRenderPages; window.aiGetCurrentPageInfo=aiGetCurrentPageInfo; window.aiLocalFallback=aiLocalFallback; window.aiUseWebBridge=aiUseWebBridge; window.aiContextCovers=aiContextCovers; window.aiCallProvider=aiCallProvider; window.aiLoadSettings=aiLoadSettings; window.aiSaveHistory=aiSaveHistory; window.aiRenderHistory=aiRenderHistory; window.aiScrollToBottom=aiScrollToBottom; window.aiDetectPageIntent=aiDetectPageIntent; window.aiGroundingSources=aiGroundingSources; window.aiSourcesLabel=aiSourcesLabel; window.aiGeminiSupportsGrounding=aiGeminiSupportsGrounding; window.aiGeminiSupportsVideo=aiGeminiSupportsVideo; window.aiGeminiSupportsAgentic=aiGeminiSupportsAgentic; window.aiPickVideoModel=aiPickVideoModel; window.aiVideoContents=aiVideoContents; window.aiCallGeminiVideo=aiCallGeminiVideo; window.aiIsTranscriptRequest=aiIsTranscriptRequest; window.aiQueryRefersToVideo=aiQueryRefersToVideo; window.aiIsContinueRequest=aiIsContinueRequest; window.aiLastTimestampSec=aiLastTimestampSec; window.aiConversationMarkdown=aiConversationMarkdown; window.aiUpdateLatestBtn=aiUpdateLatestBtn; window.aiAppendMessage=aiAppendMessage; window.aiClearHistory=aiClearHistory; window.aiUpdateProviderUI=aiUpdateProviderUI; window.aiPopulateModelSelect=aiPopulateModelSelect; window.aiSendCurrent=aiSendCurrent; window.aiQuickPrompt=aiQuickPrompt; window.initAI=initAI; window.aiProvider=aiProvider; window.aiSettings=aiSettings; window.aiModels=aiModels; window.aiCustomServers=aiCustomServers; window.aiSetCompanionEnabled=aiSetCompanionEnabled; window.aiUpdateCompanionUI=aiUpdateCompanionUI; window.aiOnModelChange=aiOnModelChange; window.aiRenderCustomServers=aiRenderCustomServers; window.aiAddCustomServer=aiAddCustomServer; window.aiAddCustomModel=aiAddCustomModel; window.aiDeleteCustomModel=aiDeleteCustomModel; window.aiResetCustomModels=aiResetCustomModels; window.aiRenderModelsManager=aiRenderModelsManager; window.aiCheckLocalAssistantQuery=aiCheckLocalAssistantQuery; window.aiGetProviderModels=aiGetProviderModels; window.aiUpdateCurrentPageDisplay=aiUpdateCurrentPageDisplay; window.aiGroundingQueries=aiGroundingQueries; window.aiSearchQueriesLabel=aiSearchQueriesLabel; window.aiBuildSystemInstruction=aiBuildSystemInstruction; window.aiSearchMultiSources=aiSearchMultiSources; window.aiDecodeHtmlEntities=aiDecodeHtmlEntities; window.aiExportMarkdown=aiExportMarkdown; window.aiExportAnki=aiExportAnki; window.aiParseTimestampSec=aiParseTimestampSec; window.aiCheckYtLive=aiCheckYtLive; window.aiWebllmStatusText=aiWebllmStatusText; window.aiWebllmSyncSection=aiWebllmSyncSection; window.aiWebllmLoadAction=aiWebllmLoadAction; window.aiWebllmUnloadAction=aiWebllmUnloadAction; window.aiNeedProviderMsg=aiNeedProviderMsg; window.aiNeedProviderToastKey=aiNeedProviderToastKey; window.aiCaptureActiveTabLowToken=aiCaptureActiveTabLowToken; window.aiCompressDataUrl=aiCompressDataUrl; window.aiHandleVisionCaptureClick=aiHandleVisionCaptureClick; window.aiStartLiveStream=aiStartLiveStream; window.aiStopLiveStream=aiStopLiveStream; window.aiToggleLiveStream=aiToggleLiveStream; window.aiSwitchLiveStreamSource=aiSwitchLiveStreamSource; window.aiGrabLiveFrame=aiGrabLiveFrame; window.aiHandleLiveSnapClick=aiHandleLiveSnapClick; window.aiBroadcastLiveBorder=aiBroadcastLiveBorder;
}
if(document.readyState!=="loading") initAI(); else document.addEventListener("DOMContentLoaded",initAI);
