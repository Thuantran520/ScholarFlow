const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('Testing Agentic AI & Sandbox features...');

// 1. Verify i18n keys
const locales = ['vi', 'en', 'zh', 'ru', 'ja'];
const expectedKeys = [
  'ai_agent_section_title',
  'ai_opt_agent_mode',
  'ai_opt_agent_mode_hint',
  'ai_opt_agent_confirm',
  'ai_opt_agent_confirm_hint',
  'ai_agent_disabled_notice',
  'ai_agent_approval_title',
  'ai_agent_approval_desc',
  'ai_agent_btn_approve',
  'ai_agent_btn_cancel',
  'ai_agent_approved_status',
  'ai_agent_cancelled_status',
  'ai_agent_badge_safe',
  'ai_autonav_searching',
  'ai_autonav_opened',
  'ai_autonav_btn_open',
  'ai_autonav_not_found',
  'ai_autonav_related',
  'ai_persona_title',
  'ai_persona_hint',
  'ai_persona_style_casual',
  'ai_persona_style_humorous',
  'ai_persona_style_polite',
  'ai_persona_style_concise',
  'ai_persona_style_professional',
  'ai_persona_custom_label',
  'ai_persona_custom_ph',
  'ai_agent_step_scroll',
  'ai_agent_label_like',
  'ai_agent_label_comment',
  'ai_agent_label_message',
  'ai_agent_label_share',
  'ai_compose_card_title',
  'ai_compose_platform_lbl',
  'ai_compose_draft_lbl',
  'ai_compose_btn_send',
  'ai_compose_btn_fill_only',
  'ai_compose_btn_copy',
  'ai_compose_btn_regen',
  'ai_compose_safe_notice',
  'ai_compose_copied_ok',
  'ai_opt_agent_vision',
  'ai_opt_agent_vision_hint',
  'ai_btn_vision_label',
  'ai_btn_vision_title',
  'ai_toast_vision_captured',
  'ai_vision_attached_badge',
  'ai_skill_vision_label',
  'ai_btn_live_stream_label',
  'ai_btn_live_stream_title',
  'ai_live_status_active',
  'ai_live_token_badge',
  'ai_btn_live_switch_tip',
  'ai_btn_live_snap_tip',
  'ai_btn_live_close_tip',
  'ai_toast_live_started',
  'ai_toast_live_stopped',
  'ai_toast_live_error',
  'ai_live_source_camera',
  'ai_live_source_screen',
  'ai_live_source_tab',
  'ai_live_tab_desc',
  'ai_typing_copilot_vision'
];

locales.forEach(lang => {
  const file = path.join(__dirname, '..', 'OS', 'locales', `${lang}.js`);
  const content = fs.readFileSync(file, 'utf8');
  expectedKeys.forEach(k => {
    assert(content.includes(`"${k}":`), `Missing key ${k} in ${lang}.js`);
  });
  console.log(`  PASS: All keys present in ${lang}.js`);
});

// 2. Verify HTML files
['sidebar.html', 'popup.html'].forEach(f => {
  const htmlFile = path.join(__dirname, '..', 'OS', 'html', f);
  const content = fs.readFileSync(htmlFile, 'utf8');
  assert(content.includes('id="ai-opt-agent-mode"'), `Missing ai-opt-agent-mode in ${f}`);
  assert(content.includes('id="ai-opt-agent-confirm"'), `Missing ai-opt-agent-confirm in ${f}`);
  assert(content.includes('id="ai-opt-agent-vision"'), `Missing ai-opt-agent-vision in ${f}`);
  assert(content.includes('id="ai-btn-capture-vision"'), `Missing ai-btn-capture-vision in ${f}`);
  assert(content.includes('id="ai-btn-live-stream"'), `Missing ai-btn-live-stream in ${f}`);
  assert(content.includes('id="ai-live-box"'), `Missing ai-live-box in ${f}`);
  assert(content.includes('id="ai-live-video"'), `Missing ai-live-video in ${f}`);
  assert(content.includes('id="ai-live-source-select"'), `Missing ai-live-source-select in ${f}`);
  assert(content.includes('id="ai-live-tab-card"'), `Missing ai-live-tab-card in ${f}`);
  assert(content.includes('id="ai-persona-select"'), `Missing ai-persona-select in ${f}`);
  assert(content.includes('id="ai-persona-custom"'), `Missing ai-persona-custom in ${f}`);
  console.log(`  PASS: Checkboxes & Persona controls present in ${f}`);
});

// 3. Verify CSS files
['tabs/ai.css', 'popup.css', 'sidebar.css'].forEach(f => {
  const cssFile = path.join(__dirname, '..', 'OS', 'css', f);
  const content = fs.readFileSync(cssFile, 'utf8');
  assert(content.includes('.ai-agent-card'), `Missing .ai-agent-card in ${f}`);
  assert(content.includes('.ai-agent-btn-approve'), `Missing .ai-agent-btn-approve in ${f}`);
  assert(content.includes('.ai-agent-plan-list'), `Missing .ai-agent-plan-list in ${f}`);
  assert(content.includes('.ai-compose-card'), `Missing .ai-compose-card in ${f}`);
  if (f === 'tabs/ai.css') {
    assert(content.includes('.ai-live-box'), `Missing .ai-live-box in ${f}`);
    assert(content.includes('.ai-live-status-pill'), `Missing .ai-live-status-pill in ${f}`);
    assert(content.includes('.ai-live-source-select'), `Missing .ai-live-source-select in ${f}`);
    assert(content.includes('.ai-live-tab-card'), `Missing .ai-live-tab-card in ${f}`);
  }
  console.log(`  PASS: CSS classes present in ${f}`);
});

// 4. Verify JS Skill, Auto-Nav, Persona, Vision, and Triggers
const aiJs = fs.readFileSync(path.join(__dirname, '..', 'OS', 'js', 'tabs', 'ai.js'), 'utf8');
assert(aiJs.includes('key: "agent"'), 'Missing agent skill in AI_SKILLS');
assert(aiJs.includes('key: "vision"'), 'Missing vision skill in AI_SKILLS');
assert(aiJs.includes('aiCaptureActiveTabLowToken'), 'Missing aiCaptureActiveTabLowToken in ai.js');
assert(aiJs.includes('aiStartLiveStream'), 'Missing aiStartLiveStream in ai.js');
assert(aiJs.includes('aiStopLiveStream'), 'Missing aiStopLiveStream in ai.js');
assert(aiJs.includes('aiBroadcastLiveBorder'), 'Missing aiBroadcastLiveBorder in ai.js');
assert(aiJs.includes('aiGrabLiveFrame'), 'Missing aiGrabLiveFrame in ai.js');
assert(fs.readFileSync(path.join(__dirname, '..', 'OS', 'css', 'content.css'), 'utf8').includes('#sf-copilot-vision-border'), 'Missing #sf-copilot-vision-border in content.css');
assert(fs.readFileSync(path.join(__dirname, '..', 'OS', 'js', 'content', 'main.js'), 'utf8').includes('SET_LIVE_VISION_BORDER'), 'Missing SET_LIVE_VISION_BORDER in main.js');
assert(aiJs.includes('aiCompressDataUrl'), 'Missing aiCompressDataUrl in ai.js');
assert(aiJs.includes('aiAppendAgentApprovalCard'), 'Missing aiAppendAgentApprovalCard in ai.js');
assert(aiJs.includes('aiRunAgentWorkflow'), 'Missing aiRunAgentWorkflow in ai.js');
assert(aiJs.includes('aiDetectAutoNavIntent'), 'Missing aiDetectAutoNavIntent in ai.js');
assert(aiJs.includes('aiExecuteAutoNav'), 'Missing aiExecuteAutoNav in ai.js');
assert(aiJs.includes('aiDetectSocialComposeIntent'), 'Missing aiDetectSocialComposeIntent in ai.js');
assert(aiJs.includes('aiAppendSocialComposeCard'), 'Missing aiAppendSocialComposeCard in ai.js');
assert(aiJs.includes('aiGeneratePersonaDraft'), 'Missing aiGeneratePersonaDraft in ai.js');
assert(aiJs.includes('aiBuildSocialSendPlan'), 'Missing aiBuildSocialSendPlan in ai.js');

// Load ai.js into a minimal VM context to unit-test action & social detection
const vm = require('vm');
const sandbox = {
  window: { addEventListener: () => {} },
  setInterval: () => {},
  setTimeout: () => {},
  clearInterval: () => {},
  clearTimeout: () => {},
  requestAnimationFrame: () => {},
  document: {
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: () => {},
    createElement: () => ({ style: {}, classList: { add() {}, remove() {}, toggle() {}, contains: () => false }, appendChild() {}, addEventListener() {}, setAttribute() {}, getAttribute: () => null, removeAttribute() {} })
  },
  localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  navigator: { clipboard: { writeText: async () => {} } },
  chrome: { storage: { local: { get: (_, cb) => cb && cb({}), set: () => {} } } },
  storGet: (_, cb) => cb && cb({}),
  storSet: (_, cb) => cb && cb(),
  storRemove: (_, cb) => cb && cb(),
  t: (k, ...args) => {
    let s = k;
    args.forEach((a, idx) => { s += ` [${idx}:${a}]`; });
    return s;
  },
  toast: () => {},
  escapeHtml: (s) => String(s || ''),
  console
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(aiJs, sandbox);

// Test deictic stripping & action detection ("hãy nhấn like kênh này", "nhấn follow", etc.)
const likeAction = sandbox.window.aiDetectAgentAction('hãy nhấn like kênh này');
assert(likeAction && likeAction.verb === 'click' && likeAction.labelKey === 'ai_agent_label_like', 'Should detect like action on "hãy nhấn like kênh này"');
const likePlan = sandbox.window.aiBuildAgentActionPlan(likeAction, true);
assert(Array.isArray(likePlan) && likePlan.some(s => s.kind === 'click' && s.labelKey === 'ai_agent_label_like'), 'Plan should include a like click step');
const likeStepLabel = sandbox.window.aiAgentStepLabel(likePlan[1]);
assert(!likeStepLabel.includes('{0}'), 'Step label must never contain literal "{0}"');

const followAction = sandbox.window.aiDetectAgentAction('nhấn follow kênh này');
assert(followAction && followAction.verb === 'click' && followAction.sensitive === true, 'Should detect follow action');
const followPlan = sandbox.window.aiBuildAgentActionPlan(followAction, false);
assert(Array.isArray(followPlan) && followPlan.some(s => s.kind === 'click' && s.sensitive === true && s.selector.includes("data-e2e='follow-button'") && s.selector.includes("data-e2e='feed-follow'")), 'Plan should include TikTok follow selectors (follow-button, feed-follow, browse-follow)');

const awsNav = sandbox.window.aiDetectAutoNavIntent('đăng ký aws giúp tôi');
assert(awsNav && awsNav.action === 'signup' && awsNav.topic.toLowerCase().includes('aws'), 'AWS signup should be detected by aiDetectAutoNavIntent');

// Test social compose intent detection (Messenger, Discord, YouTube comment)
const ytCompose = sandbox.window.aiDetectSocialComposeIntent('bình luận trực tiếp trên youtube khen video hay quá', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
assert(ytCompose && ytCompose.kind === 'comment' && ytCompose.platform.id === 'youtube', 'Should detect YouTube comment intent');

const msgCompose = sandbox.window.aiDetectSocialComposeIntent('nhắn tin trên messenger cho bạn bảo tối nay đi cà phê', 'https://www.messenger.com/');
assert(msgCompose && msgCompose.kind === 'message' && msgCompose.platform.id === 'messenger', 'Should detect Messenger chat intent');

const discordCompose = sandbox.window.aiDetectSocialComposeIntent('nhắn trên discord rủ anh em vào voice', 'https://discord.com/channels/@me');
assert(discordCompose && discordCompose.platform.id === 'discord', 'Should detect Discord chat intent');

// Test Persona draft generation fallback
const draftDefault = sandbox.window.aiLocalPersonaDraft(ytCompose, 'MixiGaming Vlog');
assert(draftDefault && draftDefault.length > 5, 'Should generate persona draft');

const socialSendPlan = sandbox.window.aiBuildSocialSendPlan('youtube', 'Video đỉnh quá anh ơi!', true);
assert(Array.isArray(socialSendPlan) && socialSendPlan.some(s => s.kind === 'type' && s.text === 'Video đỉnh quá anh ơi!' && s.strictEditable === true), 'Social send plan should contain strictEditable type step with drafted text');
assert(socialSendPlan.some(s => s.kind === 'submit' && s.strictEditable === true), 'Social send plan with shouldSubmit=true should contain strictEditable submit step');

console.log('  PASS: Deictic Agent Actions, Social Compose & Persona drafts validated');

// Simple regex test
const trigger = /^[\/!](agent|sandbox|browse)\b/i;
assert(trigger.test('/agent tìm tài liệu'), 'Trigger should match /agent');
assert(trigger.test('/sandbox deep learning'), 'Trigger should match /sandbox');
assert(trigger.test('!browse quantum computing'), 'Trigger should match !browse');
assert(!trigger.test('hello world'), 'Trigger should not match normal prompt');

// Auto-Navigation Intent test
const autonavRegexTest = (q) => {
  const hasOpenAction = /(bật|mở|truy cập|vào|open|launch|navigate to|go to)\s*(lên|ra)?/i.test(q);
  if(!hasOpenAction) return null;
  const p1 = /(?:tìm(?:\s+kiếm)?|search|kiếm)\s+(.+?)(?:\s+(?:thì\s+tìm\s+kiếm\s+)?(?:và|rồi|va|roi)?\s*(?:bật|mở|open|truy cập|vào)\s*(?:lên|ra)?(?:\s+(?:giúp|hộ)\s+(?:tôi|tao|mình|em|nha|nhé|cho tôi))?)$/i.exec(q);
  if(p1 && p1[1]) return p1[1].trim();
  const p2 = /^(?:hãy\s+)?(?:bật|mở|truy\s+cập|vào|open|launch|navigate\s+to|go\s+to)\s+(?:trang\s+web\s+|trang\s+|web\s+|website\s+|kênh\s+youtube\s+|kênh\s+)?(.+?)(?:\s+(?:lên|ra))?(?:\s+(?:giúp|hộ)\s+(?:tôi|tao|mình|em|nha|nhé|cho tôi))?$/i.exec(q);
  if(p2 && p2[1]) return p2[1].trim();
  return null;
};

assert(autonavRegexTest('tìm kênh youtube độ mixi và bật lên giúp tôi'), 'Should detect find and open');
assert(autonavRegexTest('mở web mixigaming'), 'Should detect open website');
assert(autonavRegexTest('bật kênh youtube độ mixi lên'), 'Should detect launch channel');
assert(!autonavRegexTest('hôm nay thứ mấy'), 'Should not match general questions');

console.log('  PASS: Auto-Navigation intents validated successfully');
console.log('agent_sandbox.test.js: ALL CHECKS PASSED');

