const sfWebllmState = { status: "idle", modelId: "", progress: 0, progressText: "", error: "", contextSize: 0 };
const SF_WEBLLM_MODELS = [
  { id: "Qwen3.5-2B-q4f16_1-MLC", label: "Qwen3.5 2B", size: "~1.5 GB", ctx: 8192 },
  { id: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC", label: "Qwen2.5 1.5B Instruct", size: "~1.1 GB", ctx: 8192 },
  { id: "Llama-3.2-1B-Instruct-q4f16_1-MLC", label: "Llama 3.2 1B Instruct", size: "~0.9 GB", ctx: 8192 },
  { id: "Phi-4-mini-instruct-q4f16_1-MLC", label: "Phi-4 mini instruct", size: "~2.3 GB", ctx: 8192 },
  { id: "Qwen3-1.7B-q4f16_1-MLC", label: "Qwen3 1.7B", size: "~1.2 GB", ctx: 8192 },
  { id: "SmolLM2-360M-Instruct-q4f16_1-MLC", label: "SmolLM2 360M", size: "~0.3 GB", ctx: 8192 }
];
const SF_WEBLLM_DEFAULT_MODEL = "Qwen3.5-2B-q4f16_1-MLC";
const SF_WEBLLM_OUTPUT_TOKENS = 768;
const SF_WEBLLM_RESERVE_TOKENS = SF_WEBLLM_OUTPUT_TOKENS + 64;
const SF_WEBLLM_FALLBACK_CTX = 8192;
const SF_WEBLLM_PROMPT_BUDGET = 4096;
let sfWebllmVendorPromise = null;
let sfWebllmEngine = null;
let sfWebllmLoadPromise = null;
let sfWebllmChatChain = Promise.resolve();
let sfWebllmInFlight = 0;

function sfWebllmSupported() {
  try {
    return typeof navigator !== "undefined" && !!navigator.gpu && typeof window !== "undefined" && typeof window.Promise === "function";
  } catch (e) {
    return false;
  }
}

function sfWebllmIsReady() {
  return !!(sfWebllmEngine && sfWebllmState.status === "ready");
}

function sfWebllmGetState() {
  return {
    status: sfWebllmState.status,
    modelId: sfWebllmState.modelId,
    progress: sfWebllmState.progress,
    progressText: sfWebllmState.progressText,
    error: sfWebllmState.error,
    contextSize: sfWebllmState.contextSize
  };
}

function sfWebllmModelCtx(mid) {
  const rec = (SF_WEBLLM_MODELS || []).find(function (x) { return x.id === mid; });
  return (rec && rec.ctx) || sfWebllmState.contextSize || SF_WEBLLM_FALLBACK_CTX;
}

function sfWebllmChatContext(mid, budgetOverride) {
  const budget = (typeof budgetOverride === "number" && isFinite(budgetOverride) && budgetOverride > 0)
    ? Math.max(1024, Math.min(16384, Math.round(budgetOverride)))
    : SF_WEBLLM_PROMPT_BUDGET;
  return Math.min(sfWebllmModelCtx(mid), budget + SF_WEBLLM_RESERVE_TOKENS);
}

function sfWebllmEstimateTokens(text) {
  const s = String(text == null ? "" : text);
  let cjk = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c >= 0x2E80 && c <= 0x9FFF) cjk++;
  }
  const latin = s.length - cjk;
  return Math.ceil(latin / 2.6 + cjk * 1.1 - 1e-6) + 8;
}

function sfWebllmTrimMessages(messages, ctxTokens, reserveTokens) {
  const ctx = Math.max(256, Number(ctxTokens) || 0);
  const reserve = Math.max(0, Number(reserveTokens) || 0);
  const budget = Math.max(256, ctx - reserve);
  const msgs = (messages || []).map(function (m) {
    return { role: String((m && m.role) || "user"), content: String((m && m.content == null) ? "" : m.content) };
  });
  if (!msgs.length) return msgs;
  const sum = function (arr) { return arr.reduce(function (t, m) { return t + sfWebllmEstimateTokens(m.content); }, 0); };
  const sys = msgs.filter(function (m) { return m.role === "system"; });
  const rest = msgs.filter(function (m) { return m.role !== "system"; });
  let total = sum(sys) + sum(rest);
  let guard = 0;
  while (rest.length > 1 && total > budget && guard++ < 128) {
    total -= sfWebllmEstimateTokens(rest.shift().content);
  }
  guard = 0;
  while (rest.length && total > budget && guard++ < 64) {
    const last = rest[rest.length - 1];
    const cur = last.content.length;
    if (cur <= 1024) break;
    const keep = Math.max(1024, Math.floor(cur * 0.6));
    const headChars = Math.max(256, Math.floor(keep * 0.35));
    last.content = last.content.slice(0, headChars) + "…\n[ctx-trimmed: middle of the page context removed]\n…" + last.content.slice(-(keep - headChars));
    total = sum(sys) + sum(rest);
  }
  guard = 0;
  while (sys.length && total > budget && guard++ < 64) {
    const sfirst = sys[0];
    sys[0] = { role: sfirst.role, content: sfirst.content.slice(0, Math.max(512, Math.floor(sfirst.content.length * 0.6))) + "…" };
    total = sum(sys) + sum(rest);
  }
  return sys.concat(rest);
}

function sfWebllmPatchState(patch) {
  try { Object.assign(sfWebllmState, patch); } catch (e) {}
}

function sfWebllmVendorUrl() {
  try {
    if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.getURL) return chrome.runtime.getURL("OS/js/libs/webllm/webllm.js");
  } catch (e) {}
  return new URL("../libs/webllm/webllm.js", window.location.href).href;
}

function sfWebllmImportVendor() {
  if (sfWebllmVendorPromise) return sfWebllmVendorPromise;
  let url = "";
  try { url = sfWebllmVendorUrl(); } catch (e) { return Promise.reject(new Error("webllm_unsupported")); }
  sfWebllmVendorPromise = Promise.resolve(import(url)).catch((e) => {
    sfWebllmVendorPromise = null;
    throw e;
  });
  return sfWebllmVendorPromise;
}

async function sfWebllmDisposeEngine() {
  const eng = sfWebllmEngine;
  sfWebllmEngine = null;
  if (!eng) return;
  try { if (typeof eng.interruptGenerate === "function") eng.interruptGenerate(); } catch (e) {}
  try { if (typeof eng.unload === "function") await eng.unload(); } catch (e) {}
  try { if (typeof eng.disconnect === "function") await eng.disconnect(); } catch (e) {}
}

function sfWebllmClassifyError(err) {
  const m = String((err && err.message) || err || "").toLowerCase();
  if (/context window|prompt tokens exceed/.test(m)) return "ctx";
  if (/memory|allocat|out of|buffer|oom|failed to (allocate|create)/.test(m)) return "oom";
  if (/fetch|network|download|load url|failed to|http|cors|aborted/.test(m)) return "download";
  return "other";
}

async function sfWebllmLoad(modelId, onProgress) {
  if (sfWebllmLoadPromise) return sfWebllmLoadPromise;
  const mid = modelId || sfWebllmState.modelId || SF_WEBLLM_DEFAULT_MODEL;
  if (!sfWebllmSupported()) {
    sfWebllmPatchState({ status: "error", modelId: mid, progress: 0, progressText: "", error: "unsupported" });
    return Promise.reject(new Error("webllm_unsupported"));
  }
  if (sfWebllmIsReady() && sfWebllmState.modelId === mid) return Promise.resolve(sfWebllmGetState());
  sfWebllmPatchState({ status: "loading", modelId: mid, progress: 0, progressText: "", error: "" });
  sfWebllmLoadPromise = (async () => {
    try {
      const mod = await sfWebllmImportVendor();
      if (!mod || typeof mod.CreateMLCEngine !== "function") throw new Error("webllm_vendor_invalid");
      await sfWebllmDisposeEngine();
      const engine = await mod.CreateMLCEngine(mid, {
        init: { context_window_size: sfWebllmModelCtx(mid) },
        initProgressCallback: (p) => {
          const pct = (p && typeof p.progress === "number") ? Math.max(0, Math.min(1, p.progress)) : 0;
          const txt = (p && p.text) ? String(p.text) : "";
          sfWebllmPatchState({ progress: pct, progressText: txt });
          if (typeof onProgress === "function") {
            try { onProgress(pct, txt); } catch (e) {}
          }
        }
      });
      sfWebllmEngine = engine;
      sfWebllmPatchState({ status: "ready", modelId: mid, progress: 1, progressText: "", error: "" });
      return sfWebllmGetState();
    } catch (err) {
      sfWebllmEngine = null;
      const raw = String((err && err.message) || err || "unknown");
      const kind = sfWebllmClassifyError(err);
      const suffix = kind === "oom" ? "webllm_load_oom" : (kind === "download" ? "webllm_load_download" : "webllm_load_failed");
      sfWebllmPatchState({ status: "error", progress: 0, progressText: "", error: raw.slice(0, 300) });
      throw new Error(suffix + " — " + raw.slice(0, 300));
    } finally {
      sfWebllmLoadPromise = null;
    }
  })();
  return sfWebllmLoadPromise;
}

async function sfWebllmUnload() {
  try { await sfWebllmDisposeEngine(); } catch (e) {}
  sfWebllmPatchState({ status: "idle", modelId: "", progress: 0, progressText: "", error: "" });
  return sfWebllmGetState();
}

function sfWebllmBuildRequest(messages, temperature, maxTokens) {
  return {
    model: sfWebllmState.modelId,
    messages: messages,
    temperature: (typeof temperature === "number") ? temperature : 0.7,
    max_tokens: maxTokens,
    stream: false
  };
}

async function sfWebllmDoChat(messages, opts) {
  const eng = sfWebllmEngine;
  if (!eng) throw new Error("webllm_not_loaded");
  const signal = opts && opts.signal;
  if (signal && signal.aborted) throw new Error("aborted");
  const onAbort = () => {
    try { if (eng && typeof eng.interruptGenerate === "function") eng.interruptGenerate(); } catch (e) {}
  };
  if (signal && typeof signal.addEventListener === "function") signal.addEventListener("abort", onAbort);
  try {
    await new Promise((resolveYield) => setTimeout(resolveYield, 16));
    const budgetOverride = (opts && opts.promptBudget) ? Number(opts.promptBudget) : NaN;
    let ctx = sfWebllmChatContext(sfWebllmState.modelId, budgetOverride);
    let trimmed = sfWebllmTrimMessages(messages, ctx, SF_WEBLLM_RESERVE_TOKENS);
    try {
      const res = await eng.chat.completions.create(sfWebllmBuildRequest(trimmed, opts && opts.temperature, SF_WEBLLM_OUTPUT_TOKENS));
      if (signal && signal.aborted) throw new Error("aborted");
      const choice = res && res.choices && res.choices[0];
      return String((choice && choice.message && choice.message.content) || "");
    } catch (err) {
      const raw = String((err && err.message) || err || "");
      const reCtx = /context window size:\s*(\d+)/i.exec(raw);
      if (reCtx && Number(reCtx[1])) {
        const real = Number(reCtx[1]);
        sfWebllmPatchState({ contextSize: real });
        const nextCtx = Math.min(sfWebllmChatContext(sfWebllmState.modelId, budgetOverride), real);
        if (nextCtx < ctx) {
          ctx = nextCtx;
          trimmed = sfWebllmTrimMessages(messages, ctx, SF_WEBLLM_RESERVE_TOKENS);
          const res = await eng.chat.completions.create(sfWebllmBuildRequest(trimmed, opts && opts.temperature, SF_WEBLLM_OUTPUT_TOKENS));
          if (signal && signal.aborted) throw new Error("aborted");
          const choice = res && res.choices && res.choices[0];
          return String((choice && choice.message && choice.message.content) || "");
        }
      }
      if (sfWebllmClassifyError(err) === "ctx") throw new Error("webllm_context_overflow — " + raw);
      throw err;
    }
  } finally {
    if (signal && typeof signal.removeEventListener === "function") signal.removeEventListener("abort", onAbort);
  }
}

function sfWebllmQueueDepth() {
  return sfWebllmInFlight;
}

function sfWebllmChat(messages, opts) {
  sfWebllmInFlight++;
  const run = sfWebllmChatChain.then(function () { return sfWebllmDoChat(messages, opts); });
  sfWebllmChatChain = run.catch(function () {});
  return run.finally(function () { sfWebllmInFlight--; });
}

if (typeof window !== "undefined") {
  window.sfWebllmState = sfWebllmState;
  window.SF_WEBLLM_MODELS = SF_WEBLLM_MODELS;
  window.SF_WEBLLM_DEFAULT_MODEL = SF_WEBLLM_DEFAULT_MODEL;
  window.sfWebllmSupported = sfWebllmSupported;
  window.sfWebllmIsReady = sfWebllmIsReady;
  window.sfWebllmGetState = sfWebllmGetState;
  window.sfWebllmLoad = sfWebllmLoad;
  window.sfWebllmUnload = sfWebllmUnload;
  window.sfWebllmChat = sfWebllmChat;
  window.sfWebllmClassifyError = sfWebllmClassifyError;
  window.sfWebllmEstimateTokens = sfWebllmEstimateTokens;
  window.sfWebllmTrimMessages = sfWebllmTrimMessages;
  window.sfWebllmModelCtx = sfWebllmModelCtx;
  window.sfWebllmChatContext = sfWebllmChatContext;
  window.sfWebllmQueueDepth = sfWebllmQueueDepth;
}
