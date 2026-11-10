import { EXTRA_VIEWS, mountWorkspace } from './workspace.js';
import { mergeSuggestions, clearStaleSuggestions, topicCount, suggestedKeys, topicReference, sameProfileContext, writingContextChanged } from './topic-form.mjs';
const $ = id => document.getElementById(id);
const token = document.querySelector('meta[name="yangu-session"]').content;
const profileKeys = ['industry', 'audience', 'offer', 'experience', 'proof', 'style', 'region', 'cta'];
let records = [], selected = null, running = false, taskCancelled = false;
let suggestedValues = {}, lastIndustry = '', activeWritingContext = null, draftReady = false, draftTimer, draftQueue = Promise.resolve();
const labels = { 'profile-suggest': '业务补全建议', topics: '行业选题', script: '连续口播稿', analyze: '视频拆解', transcribe: '机器转写', draft: '编辑稿' };
const views = { topics: '找选题', script: '写脚本', research: '博主研究与视频拆解', history: '历史与导出', settings: 'AI 设置' };
Object.assign(views, EXTRA_VIEWS);
function node(tag, text, cls) { const el = document.createElement(tag); if (text != null) el.textContent = text; if (cls) el.className = cls; return el; }
function notice(message, type = '') { const box = $('notice'); box.textContent = message; box.className = type; box.hidden = !message; }
function scriptMaterialView() { $('script-materials-wrap').hidden = !['故事','记录过程'].includes($('genre').value) && !$('script-materials').value.trim(); }
const topicGenre = () => document.querySelector('input[name="topic-genre"]:checked')?.value || '干货';
function setTopicGenre(value) { const match = [...document.querySelectorAll('input[name="topic-genre"]')].find(el => el.value === value); (match || document.querySelector('input[name="topic-genre"][value="干货"]')).checked = true; }
function show(view) { if (!views[view]) return; for (const item of document.querySelectorAll('.view')) item.hidden = item.id !== `view-${view}`; for (const nav of document.querySelectorAll('.nav')) nav.classList.toggle('active', nav.dataset.view === view); $('view-title').textContent = views[view]; $('profile-summary').textContent = $('industry').value ? `当前行业：${$('industry').value}` : '请先在业务资料中填写行业。'; if (view === 'history') renderHistory(); if (view === 'script') scriptMaterialView(); window.scrollTo({ top: 0, behavior: 'instant' }); }
document.querySelectorAll('[data-view]').forEach(el => el.addEventListener('click', () => show(el.dataset.view)));
const quickProfile = () => Object.fromEntries(profileKeys.map(k => [k, $(k).value]));
const profile = () => {
  const quick = quickProfile(), saved = workspaces.extraProfile();
  const p = { ...(saved.industry?.trim() === quick.industry.trim() ? saved : {}), ...quick };
  p.aiSuggestedFields = suggestedKeys.filter(k => suggestedValues[k] && suggestedValues[k] === p[k]).join(',');
  p.suggestionIndustry = p.aiSuggestedFields ? p.industry : '';
  if (p.evidenceUse && p.evidenceUse !== '可用于创作') { p.proof = p.evidenceUse === '仅匿名后可用' ? p.anonymizedProof || '' : ''; p.personalStory = ''; }
  return p;
};
function suggestionBadges() { for (const k of suggestedKeys) $(k + '-suggestion').hidden = !(suggestedValues[k] && suggestedValues[k] === $(k).value); }
function fieldError(id, message) { const el = $(id + '-error'); el.textContent = message; el.hidden = !message; $(id === 'count' ? 'topic-count' : id).setAttribute('aria-invalid', String(Boolean(message))); }
function validateTopics() {
  fieldError('industry', ''); fieldError('count', '');
  if (!$('industry').value.trim()) { fieldError('industry', '请先填写行业。'); $('industry').focus(); return null; }
  try { return topicCount($('topic-count').value); } catch (e) { fieldError('count', e.message); $('topic-count').focus(); return null; }
}
function saveTopicDraft() {
  if (!draftReady) return Promise.resolve();
  clearTimeout(draftTimer);
  const p = profile();
  const fields = Object.fromEntries(profileKeys.map(k => [k, p[k] || '']));
  Object.assign(fields, { count: $('topic-count').value, genre: topicGenre(), materials: $('topic-materials').value, profileId: workspaces.extraProfile().profileId || '', aiSuggestedFields: p.aiSuggestedFields, suggestionIndustry: p.suggestionIndustry });
  $('draft-status').textContent = '保存中';
  draftQueue = draftQueue.catch(() => {}).then(() => api('workspace', { section: 'topic-draft', fields })).then(() => { $('draft-status').textContent = '已保存'; }, () => { $('draft-status').textContent = '保存失败，请导出或重试'; });
  return draftQueue;
}
function scheduleDraft() { clearTimeout(draftTimer); $('draft-status').textContent = '待保存'; draftTimer = setTimeout(saveTopicDraft, 400); }
async function fillProfile() {
  const before = quickProfile();
  if (!before.industry.trim()) throw new Error('请先填写行业。');
  if (before.audience.trim() && before.offer.trim()) return false;
  const r = await api('profile-suggest', { profile: profile() });
  if (taskCancelled) throw new Error('任务已停止。');
  const merged = mergeSuggestions(quickProfile(), r.record.result, before.industry);
  for (const key of suggestedKeys) $(key).value = merged.fields[key];
  Object.assign(suggestedValues, merged.added);
  lastIndustry = before.industry.trim();
  suggestionBadges(); await saveTopicDraft();
  return Boolean(Object.keys(merged.added).length);
}
async function api(endpoint, body, extra = {}) {
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), ['topics','script'].includes(endpoint) ? 650000 : 320000);
  try {
    const response = await fetch(`/api/${endpoint}`, { method: body === undefined ? 'GET' : 'POST', headers: { 'X-Yangu-Token': token, ...(body !== undefined && !(body instanceof File) ? { 'Content-Type': 'application/json' } : {}), ...extra }, body: body instanceof File ? body : body === undefined ? undefined : JSON.stringify(body), signal: controller.signal });
    const result = await response.json(); if (!response.ok) { const error = new Error(result.error || '请求未完成。'); error.code = result.code; throw error; } return result;
  } catch (error) { if (error.name === 'AbortError') throw new Error('等待超时。请先查看历史记录，确认上一任务是否完成后再重试，避免重复计费。'); throw error; } finally { clearTimeout(timer); }
}
let activeProvider = 'codex';
function providerView() { const p = $('provider').value; $('codex-config').hidden = p !== 'codex'; $('api-config').hidden = p !== 'api'; $('deepseek-config').hidden = p !== 'deepseek'; }
async function state() {
  const result = await api('state'); records = result.records; activeProvider = result.provider;
  const name = {codex:'Codex',api:'OpenAI API',deepseek:'DeepSeek'}[result.provider];
  $('connection-badge').textContent = name + (result.configured ? (result.provider === 'codex' ? ' 已连接' : ' 已配置') : ' 待配置');
  $('connection-badge').classList.toggle('ready', result.configured);
  $('provider').value = result.provider; providerView();
  $('model').value = result.model; $('audio-model').value = result.audioModel; $('deepseek-model').value = result.deepseekModel;
  $('codex-status').textContent = result.codex.note;
  $('config-status').textContent = result.configured ? name + ' 已应用。' : name + ' 尚未就绪。';
  const apiMode = result.provider === 'api';
  $('web-search-option').hidden = !apiMode; $('web-search').disabled = !apiMode; if (!apiMode) $('web-search').checked = false;
  $('search-note').textContent = apiMode ? '公开网页依据，按 API 计费；不是三平台全量搜索。' : '当前模式按业务资料策划；联网来源核验未接入。';
  $('transcribe').disabled = !apiMode; $('transcribe').title = apiMode ? '' : '音视频转写需 OpenAI API 模式；也可导入已有原文';
}

async function task(message, callback) {
  if (running) return;
  running = true; taskCancelled = false; $('cancel-task').hidden = false;
  const locked = [...document.querySelectorAll('.task-button, .topic-form input, .topic-form textarea, #view-script .form-card textarea, #view-script .form-card select, #script-note, .topic-write, #save-config, #provider, .profile-toolbar select, .profile-toolbar button, #ip-form button')].filter(el => !el.disabled);
  locked.forEach(el => el.disabled = true);
  notice(message, 'busy');
  try { await callback(); await state(); } catch (error) { notice(error.message, 'error'); if (error.code === 'materials_required') { $('script-materials-wrap').hidden = false; $('script-materials').focus(); } }
  finally { running = false; $('cancel-task').hidden = true; locked.forEach(el => el.disabled = false); $('transcribe').disabled = activeProvider !== 'api'; }
}
function box(out, cls = '') { const el = $(out); el.replaceChildren(); el.className = cls; return el; }
function metadata(record, parent) { const genreLabel = ['script','draft'].includes(record.action) && record.result?.genre ? record.result.genre + ' · ' : ''; parent.append(node('p', `${genreLabel}${labels[record.action]} · ${new Date(record.createdAt).toLocaleString('zh-CN')} · ${record.model || '本机编辑'} · ${record.reviewed ? '已复核' : '待人工复核'}`, 'output-meta')); for (const warning of record.warnings || []) parent.append(node('div', warning, 'warning')); }
function bullets(items, parent) { if (!items?.length) return; const list = node('ul', null, 'list'); for (const item of items) list.append(node('li', String(item))); parent.append(list); }
function links(sources, parent) { if (!sources?.length) return; const wrap = node('div', null, 'sources'); for (const s of sources) { try { const u = new URL(s.url); if (u.protocol !== 'https:' || u.username || u.password) continue; const a = node('a', s.title || u.hostname); a.href = u.href; a.target = '_blank'; a.rel = 'noopener noreferrer'; wrap.append(a); } catch {} } parent.append(wrap); }
function download(name, content, type = 'text/plain;charset=utf-8') { const blob = new Blob([content], { type }); const url = URL.createObjectURL(blob); const a = node('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
function exportRecord(record) { download(`衍谷AI-${labels[record.action]}-${record.id}.json`, JSON.stringify(record, null, 2), 'application/json'); }
function clearScriptContext() {
  $('script-note').value = ''; $('script-topic').value = ''; $('script-reference').value = ''; $('script-materials').value = ''; $('revision').value = '';
  box('script-output', 'empty').append(node('p','暂无脚本'));
}
function restoreProfile(p, clear = false, context = {}) {
  const nextContext = {
    profileId: context.profileId ?? p?.profileId ?? activeWritingContext?.profileId ?? '',
    industry: typeof p?.industry === 'string' ? p.industry : clear ? '' : $('industry').value,
  };
  if (writingContextChanged(activeWritingContext, nextContext, context)) { $('topic-materials').value = ''; clearScriptContext(); }
  activeWritingContext = nextContext;
  for (const k of profileKeys) if (typeof p?.[k] === 'string' || clear) $(k).value = p?.[k] || '';
  suggestedValues = Object.fromEntries((p?.aiSuggestedFields || '').split(',').filter(k => suggestedKeys.includes(k) && p.suggestionIndustry === p.industry).map(k => [k, p[k]]));
  lastIndustry = $('industry').value.trim(); suggestionBadges();
  if (draftReady) scheduleDraft();
}

function renderTopics(record) {
  selected = record; const out = box('topics-output', 'topic-output');
  $('topics-count').textContent = record.result.topics.length + ' 条';
  const top = node('div', null, 'topic-result-meta');
  top.append(node('span', (record.input?.profile?.industry || '') + ' · ' + new Date(record.createdAt).toLocaleString('zh-CN')));
  const exportButton = node('button', '导出选题', 'text-button'); exportButton.addEventListener('click', () => exportRecord(record)); top.append(exportButton); out.append(top);
  const grid = node('div', null, 'topic-grid'); out.append(grid);
  for (const [index, topic] of record.result.topics.entries()) {
    const card = node('article', null, 'card topic-card');
    const meta = node('div', null, 'topic-meta');
    meta.append(node('span', String(index + 1).padStart(2, '0'), 'topic-number'), node('span', topic.genre || '待确认', 'genre-tag'));
    card.append(meta, node('h3', topic.title));
    const button = node('button', '写脚本', 'secondary topic-write');
    button.addEventListener('click', () => {
      clearScriptContext();
      $('script-topic').value = topic.title;
      if (['记录过程', '干货', '观点', '故事'].includes(topic.genre)) $('genre').value = topic.genre;
      $('script-reference').value = topicReference(topic);
      $('script-materials').value = sameProfileContext(record.input?.profile, profile()) ? record.input?.materials || '' : '';
      show('script'); notice('');
    });
    const detail = node('details', null, 'topic-detail');
    detail.append(node('summary', '查看创作思路'));
    const body = node('div', null, 'topic-detail-body');
    const add = (label, value) => { if (value) body.append(node('span', label, 'label'), node('p', value)); };
    add('为什么拍', topic.whyShoot);
    add('客户问题', topic.customerProblem);
    add('开头怎么讲', topic.opening);
    if (topic.plan) {
      if (topic.plan.depth) {
        add('这条新在哪', topic.plan.depth.insight);
        add('为什么会这样', topic.plan.depth.mechanism);
        add('依据与适用条件', `${topic.plan.depth.evidence}\n${topic.plan.depth.boundary}`);
      }
      add('为什么会停下来', topic.plan.hookReason);
      add('为什么继续看', topic.plan.watchReason);
      add('看完得到什么', topic.plan.payoff);
      add('互动动机', topic.plan.engagementReason);
      add('怎么拍及理由', topic.plan.shootingApproach);
      body.append(node('span', '正文如何推进', 'label')); bullets(topic.plan.contentBeats, body);
      if (topic.plan.materialNeeds?.length) { body.append(node('span', '拍摄前补充', 'label')); bullets(topic.plan.materialNeeds, body); }
    } else add('内容设计', '这条历史选题尚无新版观看与拍摄方案，可重新生成。');
    add('获客承接', topic.conversionAction);
    add(topic.sourceStatus === 'search_source' ? '来源 · 本次检索' : topic.sourceStatus === 'knowledge_source' ? '来源 · 已收录资料' : '来源 · 业务资料推导', topic.evidenceBasis);
    links((topic.sourceUrls || []).map(url => record.sources.find(s => s.url === url) || { url, title: url }), body);
    body.append(node('p', '吸引力为策划判断，需发布后验证。', 'hint'));
    detail.append(body);
    card.append(button, detail); grid.append(card);
  }
  const notes = node('details', null, 'topic-notes'); notes.append(node('summary', '假设与待补充资料'));
  for (const [title, list] of [['未确认的假设', record.result.assumptions], ['待补充资料', record.result.missingInfo], ['核验提示', record.warnings]]) if (list?.length) { notes.append(node('h3', title)); bullets(list, notes); }
  out.append(notes);
}
function renderScript(record) {
  selected = record; const out = box('script-output', 'card'); out.append(node('h3', record.result.title)); metadata(record, out);
  if (record.result.whyShoot) out.append(node('p', `为什么拍：${record.result.whyShoot}`, 'hint'));
  if (record.input?.obsidianNoteName) out.append(node('p', 'Obsidian 参考笔记 · ' + record.input.obsidianNoteName, 'output-meta'));
  const editor = node('textarea', null, 'script-editor'); editor.id = 'script-editor'; editor.setAttribute('aria-label', '可编辑的连续口播稿'); editor.value = record.result.script; out.append(editor);
  const count = node('p', '', 'hint'); const updateCount = () => count.textContent = `${[...editor.value.replace(/\s/g, '')].length} 字符 · 时长只是按语速估算，请实际试读`; editor.addEventListener('input', updateCount); updateCount(); out.append(count);
  const row = node('div', null, 'button-row');
  for (const [label, action] of [['复制正文', async () => { await navigator.clipboard.writeText(editor.value); notice('正文已复制。'); }], ['导出 TXT', () => download(`衍谷AI-口播稿-${record.id}.txt`, `${record.result.title}\n\n${editor.value}\n\n为什么拍：${record.result.whyShoot || ''}\n待核验：${(record.result.factChecks || []).join('；')}`)], ['保存编辑稿', async () => { const r = await api('save-draft', { script: editor.value, title: record.result.title, parentId: record.id }); await state(); notice('编辑稿已另存，原生成版本保留。'); selected = r.record; }]]) { const b = node('button', label, 'secondary'); b.addEventListener('click', () => Promise.resolve(action()).catch(e => notice(e.message, 'error'))); row.append(b); }
  out.append(row); if (record.result.factChecks?.length) { out.append(node('h3', '拍摄前核验')); bullets(record.result.factChecks, out); } if (record.result.evidenceBasis) out.append(node('p', `依据：${record.result.evidenceBasis}`, 'hint'));
}
function renderAnalysis(record) {
  selected = record; const out = box('analysis-output'); out.append(node('hr'), node('h3', record.result.summary)); metadata(record, out); out.append(node('p', `内容类型：${record.result.genre} · 拍摄形式：${record.result.form}`, 'hint'));
  out.append(node('h3', '正文逻辑')); bullets(record.result.structure, out);
  for (const finding of record.result.findings) { const row = node('div', null, 'finding'); row.append(node('h3', finding.dimension), node('small', finding.certainty), node('p', finding.conclusion), node('p', `证据定位：${finding.evidence}`, 'hint')); if (finding.sourceQuote) row.append(node('blockquote', finding.sourceQuote, 'callout')); row.append(node('p', `仍缺：${finding.missing}`, 'hint')); out.append(row); }
  for (const [heading, values] of [['评论里值得留意的需求', record.result.commentInsights], ['可迁移的方法', record.result.transferable], ['缺失的证据', record.result.missingEvidence]]) { out.append(node('h3', heading)); bullets(values, out); }
  const row = node('div', null, 'button-row'); const use = node('button', '带着方法，写我的脚本 →', 'secondary'); use.addEventListener('click', () => { $('script-reference').value = `参考作品只迁移方法，不复制原句：\n${record.result.summary}\n${record.result.transferable.join('\n')}\n缺失证据：${record.result.missingEvidence.join('；')}`; show('script'); }); const save = node('button', '导出拆解', 'secondary'); save.addEventListener('click', () => exportRecord(record)); row.append(use, save); out.append(row);
}
function loadTranscript(record) { $('transcript').value = record.result.transcript; $('comments').value=''; $('analysis-output').replaceChildren(); $('checked-transcript').checked = false; $('transcript-badge').textContent = '机器转写 · 待逐字校对'; $('video-link').value = record.input?.sourceUrl || ''; }
function openRecord(record) { if (record.action === 'profile-suggest') {
  const out = box('topics-output', 'card');
  $('topics-count').textContent = '';
  out.append(node('h3', (record.input?.profile?.industry || '') + ' · 业务建议'));
  for (const [key, title] of [['audience','目标客户'],['offer','产品 / 服务']]) out.append(node('h3',title),node('p',record.result[key]));
  bullets(record.result.assumptions,out); show('topics');
} else if (record.action === 'topics') { renderTopics(record); show('topics'); } else if (['script', 'draft'].includes(record.action)) { renderScript(record); $('script-topic').value = record.input?.topic || record.result.title || ''; if (['干货','观点','故事','记录过程'].includes(record.result.genre)) $('genre').value = record.result.genre; $('script-materials').value = sameProfileContext(record.input?.profile, profile()) ? record.input?.materials || '' : ''; $('script-reference').value = sameProfileContext(record.input?.profile, profile()) ? record.input?.reference || '' : ''; $('revision').value = ''; show('script'); } else if (record.action === 'transcribe') { loadTranscript(record); show('research'); } else { $('transcript').value = record.input?.transcript || ''; $('comments').value = record.input?.comments || ''; $('video-link').value = record.input?.sourceUrl || ''; $('checked-transcript').checked = false; $('transcript-badge').textContent='历史原文 · 本次尚未重新核对'; renderAnalysis(record); show('research'); } notice(`已打开历史内容（${record.input?.profile?.name || record.input?.profile?.industry || '未关联档案'}）。不会改变当前老板档案；再次生成以当前资料为准。`); }
function renderHistory() { const out = box('history-list'); if (!records.length) { out.append(node('p', '暂无记录', 'hint')); return; } for (const record of records) { const row = node('div', null, 'history-row'); const description = node('div'); description.append(node('h3', record.result?.title || record.result?.summary?.slice(0, 50) || `${record.input?.profile?.industry || record.input?.filename || ''} ${labels[record.action]}`), node('small', `${new Date(record.createdAt).toLocaleString('zh-CN')} · ${labels[record.action]} · 待复核`)); const open = node('button', '打开 →', 'secondary'); open.addEventListener('click', () => openRecord(record)); row.append(description, open); out.append(row); } }

$('fill-profile').addEventListener('click', () => {
  fieldError('industry', '');
  if (!$('industry').value.trim()) { fieldError('industry', '请先填写行业。'); $('industry').focus(); return; }
  if ($('audience').value.trim() && $('offer').value.trim()) { notice('客户和服务已填写，保留你的内容。清空需要重新补全的字段即可。'); return; }
  task('正在补全目标客户和服务…', async () => { await fillProfile(); notice('已补全，可直接修改。'); });
});
$('generate-topics').addEventListener('click', () => {
  const count = validateTopics(); if (count === null) return;
  task('正在策划选题并复核内容…', async () => {
    if (!$('audience').value.trim() || !$('offer').value.trim()) { notice('正在补全业务资料…', 'busy'); await fillProfile(); }
    if (taskCancelled) throw new Error('任务已停止。');
    await saveTopicDraft();
    if (taskCancelled) throw new Error('任务已停止。');
    notice('正在生成 ' + count + ' 条选题…', 'busy');
    const r = await api('topics', { profile: profile(), count, genre: topicGenre(), materials: $('topic-materials').value, webSearch: $('web-search').checked });
    renderTopics(r.record); notice('已生成 ' + r.record.result.topics.length + ' 条选题。');
  });
});
document.querySelectorAll('input[name="topic-genre"]').forEach(el => el.addEventListener('change', scheduleDraft));
$('genre').addEventListener('change', scriptMaterialView);
for (const key of [...profileKeys, 'topic-count', 'topic-materials']) $(key).addEventListener('input', () => {
  if (key === 'industry') {
    if ($('industry').value.trim() !== lastIndustry) { $('topic-materials').value = ''; clearScriptContext(); }
    const next = clearStaleSuggestions(quickProfile(), lastIndustry, suggestedValues);
    for (const k of suggestedKeys) $(k).value = next.fields[k];
    suggestedValues = next.suggested; lastIndustry = $('industry').value.trim(); activeWritingContext = { ...activeWritingContext, industry: lastIndustry }; fieldError('industry', '');
  } else if (suggestedKeys.includes(key) && $(key).value !== suggestedValues[key]) delete suggestedValues[key];
  if (key === 'topic-count') fieldError('count', '');
  suggestionBadges(); scheduleDraft();
});
let noteReadFailure = '';
async function refreshScriptTraces() {
  const list = $('script-traces');
  try {
    const { traces, traceError } = await api('script-traces');
    list.replaceChildren();
    if (noteReadFailure) list.append(node('p', noteReadFailure, 'warning'));
    if (traceError) list.append(node('p', '日志文件无法读取或写入。本次会话仍可查看已捕获的日志。', 'warning'));
    if (!traces.length) list.append(node('p', '暂无服务器端脚本日志。', 'hint'));
    for (const trace of traces) {
      const group = node('details');
      group.append(node('summary', `${new Date(trace.startedAt).toLocaleString('zh-CN')} · ${trace.status} · ${trace.id.slice(0, 8)}`));
      for (const { at, stage, event, ...data } of trace.events) {
        const entry = node('details');
        entry.append(node('summary', `${new Date(at).toLocaleTimeString('zh-CN')} · ${stage} · ${event}`));
        const output = node('pre', JSON.stringify(data, null, 2), 'script-trace-data');
        entry.append(output);
        group.append(entry);
      }
      list.append(group);
    }
  } catch (error) { list.replaceChildren(node('p', error.message, 'warning')); }
}
$('script-monitor').addEventListener('toggle', () => { if ($('script-monitor').open) refreshScriptTraces(); });
$('refresh-script-traces').addEventListener('click', refreshScriptTraces);
$('generate-script').addEventListener('click', () => task('正在写稿并复核内容…', async () => {
  const file = $('script-note').files[0];
  let obsidianNote;
  noteReadFailure = '';
  try {
    if (file) {
      if (!/\.md$/i.test(file.name) || file.size > 32000) throw new Error('请选择一份 32 KB 以内的 Obsidian Markdown 笔记。');
      let content;
      try { content = (await file.text()).trim(); }
      catch { throw new Error('无法读取 Obsidian 笔记，请重新选择后再生成。'); }
      if (!content || content.length > 8000) throw new Error('Obsidian 笔记须有内容，且最多 8,000 字。');
      obsidianNote = { name: file.name, content };
    }
  } catch (error) {
    noteReadFailure = `Obsidian 读取 · ${file.name} · ${error.message}`;
    throw error;
  }
  const r = await api('script', { obsidianNote, profile: profile(), topic: $('script-topic').value, genre: $('genre').value, seconds: Number($('seconds').value), reference: $('script-reference').value, materials: $('script-materials').value, revision: $('revision').value }); renderScript(r.record); notice('脚本已保存，仍需核验事实并试读。'); }).finally(() => { if ($('script-monitor').open) refreshScriptTraces(); }));
$('analyze').addEventListener('click', () => task('正在对照原文和评论拆解，不推定成交结果…', async () => { const r = await api('analyze', { profile: profile(), transcript: $('transcript').value, comments: $('comments').value, sourceUrl: $('video-link').value, transcriptStatus: $('checked-transcript').checked ? 'user_checked' : 'needs_review' }); renderAnalysis(r.record); notice('拆解已保存，观察与推断分别列出。'); }));
$('read-link').addEventListener('click', () => task('正在尝试读取公开媒体；若平台限制则停止…', async () => { const r = await api('research-link', { url: $('video-link').value }); if (r.record) { loadTranscript(r.record); notice('公开媒体已取得并转写，原文待校对。'); } else { if (r.sourceUrl) $('video-link').value = r.sourceUrl; notice(r.message, 'error'); } }));
$('transcribe').addEventListener('click', () => task('正在上传所选媒体并转写，不另存本机媒体副本…', async () => { const file = $('media-file').files[0]; if (!file) throw new Error('先选择一份你有权使用的音视频。'); if (file.size > 24 * 1024 * 1024) throw new Error('文件超过 24 MB，请先导出较小音频或压缩后再试。'); const r = await api('transcribe', file, { 'X-Filename': encodeURIComponent(file.name) }); loadTranscript(r.record); notice('机器转写已保存。先核对品牌、数字和疑似错字，再拆解。'); }));
$('evidence-file').addEventListener('change', async () => { try { const file = $('evidence-file').files[0]; if (!file) return; if (file.size > 1024 * 1024) throw new Error('证据文件请控制在 1 MB 内。'); const content = await file.text(); let importedText='', importedComments='', importedUrl=''; if (file.name.endsWith('.json')) { const data = JSON.parse(content); const original = data.transcript?.text || data.raw_text || data.result?.transcript; if (typeof original !== 'string' || !original.trim()) throw new Error('证据包没有原文，不能用标题代替。'); importedText = original; importedComments = Array.isArray(data.comments) ? data.comments.map((r, i) => `${i + 1}. ${r.text || ''}${r.like_count != null ? `（观察点赞${r.like_count}）` : ''}`).join('\n') : ''; if (data.source_url) importedUrl = data.source_url; } else importedText = content; $('transcript').value=importedText; $('comments').value=importedComments; $('video-link').value=importedUrl; $('analysis-output').replaceChildren(); $('checked-transcript').checked = false; $('transcript-badge').textContent = '本地资料已导入 · 未校验'; notice('已导入本地资料，尚未发送给模型。请核对后点击拆解。'); } catch (error) { notice(error.message, 'error'); } finally { $('evidence-file').value = ''; } });
$('provider').addEventListener('change', providerView);
$('save-config').addEventListener('click', async () => { try {
  const p = $('provider').value;
  const config = p === 'codex' ? {provider:p} : p === 'deepseek' ? {provider:p,deepseekKey:$('deepseek-key').value.trim(),deepseekModel:$('deepseek-model').value.trim()} : {provider:p,key:$('api-key').value.trim(),model:$('model').value.trim(),audioModel:$('audio-model').value.trim()};
  await api('config', config); $('api-key').value = ''; $('deepseek-key').value = ''; await state(); notice('设置已应用，请检查连接。');
} catch (error) { notice(error.message, 'error'); } });
$('check-api').addEventListener('click', () => task('正在检查连接…', async () => { if ($('provider').value !== activeProvider) throw new Error('请先应用所选模式，再检查连接。'); const r = await api('check', {}); notice(r.note, r.reachable ? '' : 'error'); }));
for (const [id,provider] of [['clear-key','api'],['clear-deepseek-key','deepseek']]) $(id).addEventListener('click', async () => { try { await api('config', {clear:true,provider}); $('api-key').value=''; $('deepseek-key').value=''; await state(); notice('密钥已清除，历史保留。'); } catch(e) {notice(e.message,'error');} });
$('cancel-task').addEventListener('click', async () => { taskCancelled = true; try { const r=await api('cancel',{}); notice(r.note); } catch(e){notice(e.message,'error');} });
$('export-all').addEventListener('click', async () => { try { const all = await api('export'); if (!all.records.length && !Object.keys(all.workspace || {}).length) return notice('暂无记录可导出。'); download('衍谷AI-本机内容记录.json', JSON.stringify(all, null, 2), 'application/json'); } catch (e) { notice(e.message, 'error'); } });
const workspaces = mountWorkspace({ $, node, api, notice, show, restoreProfile, getProfile: profile, getRecords: () => records });
show('dashboard');
Promise.all([state(), workspaces.load()]).then(async () => {
  const r = await api('workspace'), draft = r.workspace['topic-draft']?.fields;
  if (draft && (draft.profileId || '') === (workspaces.extraProfile().profileId || '')) {
    restoreProfile(draft, true); setTopicGenre(draft.genre || '干货'); $('topic-materials').value = draft.materials || ''; try { $('topic-count').value = topicCount(draft.count); } catch {}
    $('draft-status').textContent = '已保存';
  }
  draftReady = true;
  if (activeProvider === 'codex') { await api('check', {}); await state(); }
}).catch(e => notice(e.message, 'error'));
