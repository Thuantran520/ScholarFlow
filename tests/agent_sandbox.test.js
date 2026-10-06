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
  'ai_autonav_related'
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
  console.log(`  PASS: Checkboxes present in ${f}`);
});

// 3. Verify CSS files
['tabs/ai.css', 'popup.css', 'sidebar.css'].forEach(f => {
  const cssFile = path.join(__dirname, '..', 'OS', 'css', f);
  const content = fs.readFileSync(cssFile, 'utf8');
  assert(content.includes('.ai-agent-card'), `Missing .ai-agent-card in ${f}`);
  assert(content.includes('.ai-agent-btn-approve'), `Missing .ai-agent-btn-approve in ${f}`);
  console.log(`  PASS: CSS classes present in ${f}`);
});

// 4. Verify JS Skill, Auto-Nav, and Triggers
const aiJs = fs.readFileSync(path.join(__dirname, '..', 'OS', 'js', 'tabs', 'ai.js'), 'utf8');
assert(aiJs.includes('key: "agent"'), 'Missing agent skill in AI_SKILLS');
assert(aiJs.includes('aiAppendAgentApprovalCard'), 'Missing aiAppendAgentApprovalCard in ai.js');
assert(aiJs.includes('aiRunAgentWorkflow'), 'Missing aiRunAgentWorkflow in ai.js');
assert(aiJs.includes('aiDetectAutoNavIntent'), 'Missing aiDetectAutoNavIntent in ai.js');
assert(aiJs.includes('aiExecuteAutoNav'), 'Missing aiExecuteAutoNav in ai.js');

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
