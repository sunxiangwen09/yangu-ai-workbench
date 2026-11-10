import http from 'node:http';
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { spawn } from 'node:child_process';
import { SYSTEM, SCHEMAS, promptFor } from './prompts.mjs';
import { checkCodex, generateWithCodex, CodexError } from './codex-bridge.mjs';
import { deepseekCall, generateWithDeepSeek, DeepSeekError } from './deepseek-provider.mjs';
import { knowledgeFor } from './content-knowledge.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const MAX_FILE = 24 * 1024 * 1024;
const TYPES = new Set(['记录过程', '干货', '观点', '故事']);
const MEDIA_EXT = new Set(['mp3', 'mp4', 'mpeg', 'mpga', 'm4a', 'wav', 'webm']);
const API = 'https://api.openai.com/v1';
const safeModel = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,90}$/.test(value);
export class AppError extends Error { constructor(message, status = 400, code = 'invalid_input') { super(message); this.status = status; this.code = code; } }
function text(value, max = 10000) { return typeof value === 'string' ? value.trim().slice(0, max) : ''; }
function requireTrue(value, message) { if (!value) throw new AppError(message); }
export function safeLink(raw) {
  try { const u = new URL(raw); return u.protocol === 'https:' && !u.username && !u.password && !u.port ? u.href : null; } catch { return null; }
}
export function douyinLink(raw) {
  const matches = text(raw, 5000).match(/https:\/\/[^\s<>"'[\],，。；！）)\u3400-\u9fff]+/g) || [];
  for (const item of matches) {
    const link = safeLink(item); if (!link) continue;
    const u = new URL(link);
    if (u.hostname === 'v.douyin.com' && /^\/[\w-]+\/?$/.test(u.pathname)) return u.href;
    if (u.hostname === 'www.douyin.com' && /^\/video\/\d+\/?$/.test(u.pathname)) return `${u.origin}${u.pathname}`;
  }
  throw new AppError('请粘贴单条抖音视频的 HTTPS 分享链接，不支持博主主页批量采集。');
}
export function inputFor(action, body) {
  requireTrue(body && typeof body === 'object' && !Array.isArray(body), '输入格式不正确。');
  const profile = body.profile || {};
  requireTrue(typeof profile === 'object' && !Array.isArray(profile), '业务资料格式不正确。');
  const input = { profile: Object.fromEntries(['name', 'brand', 'industry', 'audience', 'offer', 'experience', 'proof', 'style', 'region', 'cta', 'customerPain', 'differentiation', 'boundaries', 'goal', 'platforms', 'resources', 'personalStory', 'role', 'niche', 'outcome', 'delivery', 'price', 'desiredChange', 'alternatives', 'criteria', 'avoid', 'form', 'reviewPolicy'].map(k => [k, text(profile[k], 3500)])) };
  input.profile.profileId = text(profile.profileId, 80);
  input.profile.evidenceUse = text(profile.evidenceUse, 80);
  input.profile.aiSuggestedFields = text(profile.aiSuggestedFields, 80).split(',').filter(field => ['audience', 'offer'].includes(field.trim())).map(field => field.trim()).join(',');
  input.profile.suggestionIndustry = text(profile.suggestionIndustry, 3500);
  if (profile.evidenceUse && profile.evidenceUse !== '可用于创作') {
    input.profile.proof = profile.evidenceUse === '仅匿名后可用' ? text(profile.anonymizedProof, 3500) : '';
    input.profile.personalStory = '';
  }
  if (action !== 'analyze') requireTrue(input.profile.industry, '先填写你的行业。');
  if (action === 'topics') {
    input.count = body.count === undefined ? 6 : body.count;
    requireTrue(Number.isInteger(input.count) && input.count >= 1 && input.count <= 20, '选题数量请填写 1–20 的整数。');
    input.genre = body.genre === undefined ? '干货' : body.genre;
    requireTrue(TYPES.has(input.genre), '请选择干货、观点、故事或记录过程。');
    input.materials = text(body.materials, 6000);
    input.webSearch = body.webSearch === true;
  }
  if (action === 'script') {
    if (body.obsidianNote !== undefined) {
      const { name, content } = body.obsidianNote || {};
      requireTrue(typeof name === 'string' && /^[^/\\\r\n]{1,245}\.md$/i.test(name), '请选择一份 Obsidian Markdown 笔记。');
      requireTrue(typeof content === 'string' && content.length <= 8000 && content.trim(), 'Obsidian 笔记须有内容，且最多 8,000 字。');
      input.obsidianNoteName = name;
      input.obsidianNoteContent = content.trim();
    }
    input.topic = text(body.topic, 1800); requireTrue(input.topic, '请先选一个选题或写下想讲的问题。');
    input.seconds = [60, 90, 120, 180].includes(body.seconds) ? body.seconds : 90;
    input.genre = TYPES.has(body.genre) ? body.genre : '干货';
    input.reference = text(body.reference, 24000); input.revision = text(body.revision, 2500);
    input.materials = text(body.materials, 6000);
    if (['故事', '记录过程'].includes(input.genre)) {
      const suppliedMaterials = [input.materials, input.profile.proof, input.profile.personalStory].join('').replace(/\s/g, '');
      if (suppliedMaterials.length < 20) throw new AppError('这类脚本需要真实事件或过程。请补充人物/任务、发生了什么、如何处理及结果或当前进度。', 400, 'materials_required');
    }
  }
  if (action === 'analyze') {
    input.transcript = text(body.transcript, 60000); requireTrue(input.transcript.length >= 40, '请先取得至少一段真实原文，不能只凭标题拆解。');
    input.comments = text(body.comments, 20000);
    input.sourceUrl = safeLink(text(body.sourceUrl, 2000)) || '';
    input.transcriptStatus = body.transcriptStatus === 'user_checked' ? '用户声明已校对' : '原文或机器转写待核验';
  }
  if (action === 'topics' || action === 'script') input.knowledge = knowledgeFor(input.profile);
  return input;
}
export function extractSources(response) {
  const found = new Map();
  const add = value => { const url = safeLink(value?.url); if (url && !found.has(url)) found.set(url, { url, title: text(value.title, 500) || new URL(url).hostname }); };
  for (const item of response.output || []) {
    if (item.type === 'web_search_call') for (const source of item.action?.sources || []) add(source);
    for (const content of item.content || []) for (const annotation of content.annotations || []) if (annotation.type === 'url_citation') add(annotation);
  }
  return [...found.values()].slice(0, 60);
}
export function parseModelResult(action, response, input) {
  if (response.status !== 'completed') throw new AppError('模型未完整完成本次输出，没有将残缺结果当作成品。可检查额度、模型或缩小任务后重试。', 502, 'incomplete_response');
  const chunks = (response.output || []).flatMap(x => x.type === 'message' ? x.content || [] : []);
  if (chunks.some(x => x.type === 'refusal')) throw new AppError('模型未接受本次内容请求，请调整输入。', 422, 'model_refusal');
  let result;
  try { result = JSON.parse(chunks.filter(x => x.type === 'output_text').map(x => x.text).join('')); } catch { throw new AppError('模型返回格式不完整，未伪造内容。请换用支持结构化输出的模型后重试。', 502, 'invalid_model_output'); }
  const sources = extractSources(response);
  const searchedUrls = new Set(sources.map(source => source.url));
  const knowledgeSources = new Map((input.knowledge || []).map(card => {
    const url = safeLink(card?.url);
    return url ? [url, { url, title: text(card.title, 500) || new URL(url).hostname }] : null;
  }).filter(Boolean));
  const addKnowledgeSource = url => { if (knowledgeSources.has(url) && !sources.some(source => source.url === url)) sources.push(knowledgeSources.get(url)); };
  const warnings = [];
  if (action === 'profile-suggest') {
    requireTrue(result && !Array.isArray(result) && typeof result === 'object' && Object.keys(result).every(key => ['audience', 'offer', 'assumptions'].includes(key)), '业务建议格式不完整，请重试。');
    requireTrue(text(result.audience, 3500).length > 0 && text(result.offer, 3500).length > 0 && Array.isArray(result.assumptions) && result.assumptions.every(item => typeof item === 'string'), '模型没有返回可用的客户与服务建议。');
    result.audience = text(result.audience, 3500); result.offer = text(result.offer, 3500);
    result.assumptions = result.assumptions.map(item => text(item, 1000)).filter(Boolean).slice(0, 10);
    warnings.push('这是按行业推测的业务建议，可修改；不代表已核实你的实际业务。');
  }
  if (action === 'topics') {
    const expected = input.count ?? 6;
    requireTrue(result && Array.isArray(result.topics) && result.topics.length === expected, `模型未返回完整的 ${expected} 个选题，请重试；未将不完整结果作为成品。`);
    requireTrue(Array.isArray(result.assumptions) && result.assumptions.every(x => typeof x === 'string') && Array.isArray(result.missingInfo) && result.missingInfo.every(x => typeof x === 'string'), '选题的假设或待补资料格式不完整。');
    const urls = new Set([...searchedUrls, ...knowledgeSources.keys()]);
    const titleKeys = new Set();
    const selectedGenre = input.genre ?? '干货';
    requireTrue(TYPES.has(selectedGenre), '请选择干货、观点、故事或记录过程。');
    const topicTextFields = ['title', 'genre', 'customerProblem', 'whyShoot', 'opening', 'conversionAction', 'evidenceBasis'];
    const planTextFields = ['hookReason', 'watchReason', 'payoff', 'engagementReason', 'shootingApproach'];
    const isText = value => typeof value === 'string' && value.trim().length > 0;
    result.topics = result.topics.map(row => {
      requireTrue(row && typeof row === 'object' && !Array.isArray(row) && topicTextFields.every(key => isText(row[key])), '选题字段缺失，未将空泛残稿作为成品。');
      requireTrue(Object.keys(row).every(key => [...topicTextFields, 'sourceUrls', 'plan'].includes(key)), '选题包含未约定字段，不能把流量评分或预测当作事实。');
      requireTrue(TYPES.has(row.genre), '模型返回了不支持的内容类型。');
      requireTrue(row.genre === selectedGenre, '模型没有按所选内容类型生成，请重试。');
      const titleKey = row.title.normalize('NFKC').replace(/[\s\p{P}\p{S}]/gu, '').toLowerCase();
      requireTrue(titleKey && !titleKeys.has(titleKey), '选题标题重复或为空，请重试。'); titleKeys.add(titleKey);
      const plan = row.plan;
      requireTrue(plan && typeof plan === 'object' && !Array.isArray(plan) && planTextFields.every(key => isText(plan[key])), '选题缺少吸引点、观看理由、价值兑现或拍法思路，请重试。');
      requireTrue(Object.keys(plan).every(key => [...planTextFields, 'contentBeats', 'materialNeeds', 'depth'].includes(key)), '选题思路包含未约定字段。');
      const depthFields = ['familiarAnswer', 'insight', 'mechanism', 'evidence', 'boundary'];
      requireTrue(plan.depth && typeof plan.depth === 'object' && !Array.isArray(plan.depth) && depthFields.every(key => isText(plan.depth[key])) && Object.keys(plan.depth).every(key => depthFields.includes(key)), '选题缺少常见答案、新判断、原因、证据或适用边界，请重试。');
      const comparable = value => value.normalize('NFKC').replace(/[\s\p{P}\p{S}]/gu, '').toLowerCase();
      requireTrue(comparable(plan.depth.familiarAnswer) !== comparable(plan.depth.insight), '选题的新判断与常见答案完全相同，不能把重复表述当作内容发现。');
      requireTrue(Array.isArray(plan.contentBeats) && plan.contentBeats.length >= 3 && plan.contentBeats.length <= 5 && plan.contentBeats.every(isText), '正文思路需要完整的 3–5 个内容节点。');
      requireTrue(Array.isArray(plan.materialNeeds) && plan.materialNeeds.every(isText), '选题待补素材格式不正确。');
      requireTrue(Array.isArray(row.sourceUrls) && row.sourceUrls.every(value => typeof value === 'string'), '选题来源格式不正确。');
      const linked = [...new Set(row.sourceUrls.map(safeLink).filter(url => urls.has(url)))];
      linked.forEach(addKnowledgeSource);
      return { ...row, sourceUrls: linked, sourceStatus: linked.some(url => searchedUrls.has(url)) ? 'search_source' : linked.length ? 'knowledge_source' : 'planning_hypothesis' };
    });
    if (input.webSearch && !(response.output || []).some(x => x.type === 'web_search_call' && x.status === 'completed')) throw new AppError('本次没有完成真实检索，未把策划建议当作联网结果。', 502, 'search_not_completed');
    if (!sources.length) warnings.push('没有可核验的网页来源；这些选题只可作为创作假设，不能宣称热点。');
  }
  if (action === 'script') {
    requireTrue(typeof result.script === 'string' && result.script.length > 50, '模型没有返回可用正文。');
    requireTrue(TYPES.has(result.genre) && (!input.genre || result.genre === input.genre), '模型没有按所选内容类型生成脚本，请重试。');
    const count = [...result.script.replace(/\s/g, '')].length;
    result.characterCount = count; result.estimatedSeconds = Math.round(count / 3.6);
    if (count < input.seconds * 2.5) warnings.push('这版正文偏短，建议补充理由和具体例子后再演示。');
    if (count > input.seconds * 5) warnings.push('这版正文偏长，建议按自然语速试读后压缩。');
    if (/镜头\s*\d|分镜\s*\d/.test(result.script)) warnings.push('正文混入了镜头标签，请先删去，固定口播不需要分镜。');
    const referenceUrls = new Set((input.reference || '').match(/https:\/\/[^\s<>"'\[\],，。；！）)\u3400-\u9fff]+/g)?.map(safeLink).filter(Boolean) || []);
    for (const url of referenceUrls) addKnowledgeSource(url);
  }
  if (action === 'analyze') {
    requireTrue(Array.isArray(result.findings) && result.findings.length >= 3 && text(result.summary).length > 0, '模型未返回完整拆解。');
    requireTrue(['流量机制', '获客路径', '变现路径'].every(d => result.findings.some(f => f.dimension === d)), '拆解缺少流量、获客或变现维度。');
    const compact = value => typeof value === 'string' ? value.replace(/\s/g, '') : '';
    for (const finding of result.findings) {
      requireTrue(text(finding.conclusion).length > 0, '拆解结论为空。');
      const haystack = finding.sourceType === 'transcript' ? input.transcript : finding.sourceType === 'comment' ? input.comments : '';
      const quote = compact(finding.sourceQuote);
      finding.evidenceLocated = Boolean(quote && quote.length <= 100 && compact(haystack).includes(quote));
      if (!finding.evidenceLocated) {
        finding.certainty = '未核验推断 / 证据缺失';
        finding.evidence = '未能在本次材料中定位所声称的短引';
        finding.sourceQuote = '';
        warnings.push(`${finding.dimension}的证据未能定位，不能当作已观察事实。`);
      }
    }
    if (!input.comments.trim()) result.commentInsights = ['本次没有评论样本，不能分析观众反馈。'];
  }
  return { result, sources, warnings, model: response.model || '', usage: response.usage ? { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens } : null, machineGenerated: true, reviewed: false };
}

// Carry real evidence forward without concatenating the first draft's JSON text.
function withEditorialEvidence(first, reviewed) {
  const evidence = [];
  for (const item of first.output || []) {
    if (item.type === 'web_search_call') evidence.push(item);
    if (item.type !== 'message') continue;
    const content = (item.content || []).filter(part => Array.isArray(part.annotations) && part.annotations.some(annotation => annotation.type === 'url_citation')).map(part => ({ type: 'output_text', text: '', annotations: part.annotations.filter(annotation => annotation.type === 'url_citation') }));
    if (content.length) evidence.push({ type: 'message', content });
  }
  return { ...reviewed, output: [...evidence, ...(reviewed.output || [])] };
}
async function boundedBody(stream, max) {
  let size = 0; const chunks = [];
  for await (const chunk of stream) { size += chunk.length; if (size > max) throw new AppError('文件或输入超过本次上限。', 413, 'input_too_large'); chunks.push(Buffer.from(chunk)); }
  return Buffer.concat(chunks);
}
async function responseJson(response) {
  if (!response.ok) {
    const msg = ({ 401: '密钥无效或已撤销，请重新配置。', 403: 'OpenAI 拒绝访问，请检查账号权限、可用地区或组织设置。', 404: '当前账号无法使用所选模型，请在设置中更换。', 429: '额度不足或请求过频，请检查 API 账单和限额；没有自动重试。', 400: '模型或请求参数不被服务接受，请检查所选模型是否支持此能力。' })[response.status] || `OpenAI 暂未完成请求（HTTP ${response.status}），未自动重试。`;
    await response.body?.cancel(); throw new AppError(msg, 502, `provider_${response.status}`);
  }
  const buffer = await boundedBody(response.body, 2 * 1024 * 1024);
  try { return JSON.parse(buffer.toString('utf8')); } catch { throw new AppError('服务返回了不可解析的结果。', 502, 'invalid_provider_json'); }
}
function safePageHost(url) { const u = new URL(url); return u.protocol === 'https:' && !u.username && !u.password && !u.port && ['v.douyin.com', 'www.douyin.com', 'www.iesdouyin.com'].includes(u.hostname); }
function mediaHost(raw) { const u = new URL(raw); return u.protocol === 'https:' && !u.username && !u.password && !u.port && ['douyinvod.com', 'douyin.com', 'bytecdn.cn'].some(x => u.hostname.endsWith(`.${x}`)); }
export async function readPublicVideo(link, fetcher = fetch) {
  let url = douyinLink(link);
  const requestedId = new URL(url).pathname.match(/^\/video\/(\d+)/)?.[1];
  for (let i = 0; i < 5; i++) {
    if (!safePageHost(url)) throw new AppError('分享链接跳转到不支持的页面，已停止。');
    const response = await fetcher(url, { redirect: 'manual', signal: AbortSignal.timeout(15000) });
    if ([301, 302, 303, 307, 308].includes(response.status)) { const location = response.headers.get('location'); await response.body?.cancel(); if (!location) break; url = new URL(location, url).href; continue; }
    if (!response.ok) { await response.body?.cancel(); break; }
    const final = new URL(url);
    const finalId = final.pathname.match(/^\/(?:share\/)?video\/(\d+)\/?$/)?.[1];
    if (!finalId || (requestedId && finalId !== requestedId)) { await response.body?.cancel(); return { url, title: '', media: null }; }
    const html = (await boundedBody(response.body, 2 * 1024 * 1024)).toString('utf8');
    const title = html.match(/<title[^>]*>([^<]{1,500})<\/title>/i)?.[1] || '';
    let media = html.match(/<video[^>]+src=["'](https:[^"']+)["']/i)?.[1];
    if (!media) {
      for (const match of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
        try { const value = JSON.parse(match[1]); const rows = Array.isArray(value) ? value : [value]; media = rows.find(x => x['@type'] === 'VideoObject')?.contentUrl; if (media) break; } catch { /* Not a public video object. */ }
      }
    }
    if (typeof media === 'string' && safeLink(media.replaceAll('&amp;', '&')) && mediaHost(media.replaceAll('&amp;', '&'))) return { url, title, media: media.replaceAll('&amp;', '&') };
    return { url, title, media: null };
  }
  return { url, title: '', media: null };
}

export async function createApp({ dataDir, fetcher = fetch, port = 3918, initialProvider = 'codex', codexRunner = generateWithCodex, codexCheck = checkCodex } = {}) {
  const directory = dataDir || path.join(homedir(), 'YanguAI-LocalData');
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const recordsPath = path.join(directory, 'records.json');
  let records = [];
  try { const parsed = JSON.parse(await readFile(recordsPath, 'utf8')); if (!Array.isArray(parsed) || parsed.some(r => !r || typeof r !== 'object' || !r.id || !r.action || !r.result)) throw new Error('Invalid history'); records = parsed; } catch (error) { if (error.code !== 'ENOENT') throw new AppError('本机历史文件无法读取，已停止以保护旧数据。'); }
  const tracePath = path.join(directory, 'script-traces.json');
  let traces = [];
  let traceError = false;
  try {
    const saved = JSON.parse(await readFile(tracePath, 'utf8'));
    if (!Array.isArray(saved)) throw new Error('Invalid traces');
    traces = saved.slice(0, 20);
  } catch (error) { traceError = error.code !== 'ENOENT'; }
  const activeTraces = new Map();
  let traceQueue = Promise.resolve();
  const finishTrace = async trace => {
    activeTraces.delete(trace.id);
    traces = [trace, ...traces].slice(0, 20);
    if (traceError) return;
    const snapshot = JSON.stringify(traces);
    traceQueue = traceQueue.then(async () => {
      const tmp = tracePath + '.tmp';
      await writeFile(tmp, snapshot, { mode: 0o600 });
      await rename(tmp, tracePath);
    }).catch(() => { traceError = true; });
    await traceQueue;
  };
  const workspacePath = path.join(directory, 'workspace.json');
  let workspace = {};
  try { const parsed = JSON.parse(await readFile(workspacePath, 'utf8')); if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') throw new Error('Invalid workspace'); workspace = parsed; } catch (error) { if (error.code !== 'ENOENT') throw new AppError('业务资料文件无法读取，已停止以保护旧数据。'); }
  let workspaceQueue = Promise.resolve();
  const saveWorkspace = async (section, fields) => {
    requireTrue(typeof section === 'string' && /^[a-z][a-z0-9-]{0,65}$/.test(section), '资料分区无效。');
    requireTrue(fields && typeof fields === 'object' && !Array.isArray(fields) && Object.keys(fields).length <= 80, '资料格式无效。');
    requireTrue(Object.entries(fields).every(([k, v]) => /^[a-zA-Z][a-zA-Z0-9-]{0,60}$/.test(k) && typeof v === 'string' && v.length <= 60000), '请只保存文本资料，且单项不超过 60000 字。');
    requireTrue(Object.hasOwn(workspace, section) || Object.keys(workspace).length < 500, '本机资料分区已达 500 个，请先导出整理。');
    const operation = workspaceQueue.then(async () => {
      const entry = { fields, updatedAt: new Date().toISOString() };
      const next = { ...workspace, [section]: entry };
      const tmp = `${workspacePath}.${randomBytes(6).toString('hex')}.tmp`;
      await writeFile(tmp, JSON.stringify(next), { flag: 'wx', mode: 0o600 });
      await rename(tmp, workspacePath); workspace = next;
      return entry;
    });
    workspaceQueue = operation.catch(() => {}); return operation;
  };
  let key = '', model = 'gpt-5.4-mini', audioModel = 'gpt-transcribe', busy = false;
  let provider = initialProvider, codexStatus = { ready: false, note: '请检查 Codex 连接。' };
  let deepseekKey = '', deepseekModel = 'deepseek-flash';
  let activeController;
  const token = randomBytes(32).toString('hex');
  let origin = '', writeQueue = Promise.resolve();
  const save = async (action, input, output) => {
    const record = { id: randomBytes(10).toString('hex'), action, createdAt: new Date().toISOString(), input, ...output };
    const operation = writeQueue.then(async () => {
      const next = [record, ...records];
      const tmp = `${recordsPath}.${randomBytes(6).toString('hex')}.tmp`;
      await writeFile(tmp, JSON.stringify(next), { mode: 0o600, flag: 'wx' });
      await rename(tmp, recordsPath); records = next;
    });
    writeQueue = operation.catch(() => {}); await operation; return record;
  };
  const apiCall = async (endpoint, init = {}) => {
    if (!key) throw new AppError('先到 API 设置填写你自己的密钥，本次没有调用服务。', 409, 'key_required');
    try { return await responseJson(await fetcher(`${API}${endpoint}`, { ...init, headers: { Authorization: `Bearer ${key}`, ...init.headers }, redirect: 'error', signal: init.signal ? AbortSignal.any([init.signal, AbortSignal.timeout(150000)]) : AbortSignal.timeout(150000) })); }
    catch (error) { if (init.signal?.aborted) throw new AppError('任务已停止，没有将未完成结果保存为成品。', 499, 'task_cancelled'); if (error instanceof AppError) throw error; throw new AppError('网络不可达或请求超时。请检查现场网络能否正常访问 OpenAI；未自动重试，已有结果不会丢失。', 502, 'network_error'); }
  };
  const transcribe = async (bytes, filename, sourceUrl = '') => {
    const ext = filename.split('.').pop()?.toLowerCase(); requireTrue(MEDIA_EXT.has(ext), '支持 mp3、mp4、m4a、wav、webm 等音视频，文件不超过 24 MB。');
    requireTrue(bytes.length > 100 && bytes.length <= MAX_FILE, '音视频文件为空或超过 24 MB。');
    const form = new FormData(); form.set('file', new Blob([bytes]), `recording.${ext}`); form.set('model', audioModel);
    const result = await apiCall('/audio/transcriptions', { method: 'POST', body: form });
    requireTrue(typeof result.text === 'string' && result.text.trim().length > 0, '没有识别到正文，不能用标题补齐。');
    return save('transcribe', { sourceUrl, filename: path.basename(filename), bytes: bytes.length }, { result: { transcript: result.text, status: 'machine_transcribed_needs_review' }, model: audioModel, machineGenerated: true, reviewed: false, warnings: ['机器转写待校对，特别留意品牌名、数字、漏字和同音词。'], sources: sourceUrl ? [{ url: sourceUrl, title: '原视频页面' }] : [] });
  };
  const server = http.createServer(async (req, res) => {
    let trace;
    let stage = '提交';
    const observe = (event, data) => trace?.events.push({ at: new Date().toISOString(), stage, event, ...data });
    const send = (status, body, type = 'application/json; charset=utf-8') => { if (res.destroyed) return; res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; media-src 'self' blob:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'" }); res.end(typeof body === 'string' ? body : JSON.stringify(body)); };
    try {
      if (req.headers.host !== new URL(origin).host) throw new AppError('无效的本机访问地址。', 403, 'host_rejected');
      const url = new URL(req.url, origin);
      if (req.method === 'GET' && ['/', '/app.js', '/workspace.js', '/topic-form.mjs', '/styles.css', '/workflow-catalog.json'].includes(url.pathname)) {
        const file = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
        let content = await readFile(path.join(ROOT, 'public', file), 'utf8');
        if (file === 'index.html') content = content.replace('__SESSION_TOKEN__', token);
        return send(200, content, /\.m?js$/.test(file) ? 'text/javascript; charset=utf-8' : file.endsWith('.css') ? 'text/css; charset=utf-8' : file.endsWith('.json') ? 'application/json; charset=utf-8' : 'text/html; charset=utf-8');
      }
      const supplied = String(req.headers['x-yangu-token'] || '');
      if (Buffer.byteLength(supplied) !== Buffer.byteLength(token) || !timingSafeEqual(Buffer.from(supplied), Buffer.from(token))) throw new AppError('页面会话已失效，请从启动窗口重新打开。', 403, 'session_required');
      if (req.headers.origin && req.headers.origin !== origin) throw new AppError('不接受其他网页发起的操作。', 403, 'origin_rejected');
      if (req.method === 'GET' && url.pathname === '/api/state') return send(200, { provider, codex: codexStatus, configured: provider === 'codex' ? codexStatus.ready : provider === 'deepseek' ? Boolean(deepseekKey) : Boolean(key), apiConfigured: Boolean(key), deepseekConfigured: Boolean(deepseekKey), deepseekModel, model, audioModel, busy, records: records.slice(0, 100), totalRecords: records.length, dataDir: directory, version: '0.8.3-local', autoEditing: false, autoPublishing: false });
      if (req.method === 'GET' && url.pathname === '/api/export') return send(200, { version: 2, exportedAt: new Date().toISOString(), records, workspace });
      if (req.method === 'GET' && url.pathname === '/api/script-traces') return send(200, { traces: [...activeTraces.values(), ...traces], traceError });
      if (req.method === 'GET' && url.pathname === '/api/workspace') return send(200, { workspace });
      if (req.method !== 'POST') throw new AppError('接口不存在。', 404, 'not_found');
      if (req.headers.origin !== origin) throw new AppError('请在本机工作台内提交。', 403, 'origin_required');
      if (req.url === '/api/transcribe') {
        if (provider !== 'api') throw new AppError('当前文字通道不含音视频转写。可导入已有原文，或手动选择 OpenAI API 模式。', 409, 'audio_provider_required');
        if (!key) throw new AppError('请先配置 API 密钥。', 409, 'key_required');
        if (busy) throw new AppError('上一项任务还在运行，请稍等。', 409, 'busy');
        const filename = decodeURIComponent(String(req.headers['x-filename'] || ''));
        busy = true;
        try { const bytes = await boundedBody(req, MAX_FILE); return send(200, { record: await transcribe(bytes, filename) }); } finally { busy = false; }
      }
      if (!String(req.headers['content-type']).startsWith('application/json')) throw new AppError('请求格式不正确。', 415);
      let body; try { body = JSON.parse((await boundedBody(req, 160000)).toString('utf8')); } catch (e) { if (e instanceof AppError) throw e; throw new AppError('输入不是有效 JSON。'); }
      requireTrue(body && typeof body === 'object' && !Array.isArray(body), '输入格式不正确。');
      if (url.pathname === '/api/workspace') return send(200, { entry: await saveWorkspace(body.section, body.fields), localOnly: true });
      if (url.pathname === '/api/config') {
        if (busy) throw new AppError('任务运行中不能切换密钥或模型。', 409, 'busy');
        if (body.clear === true) { if (body.provider === 'deepseek') deepseekKey = ''; else key = ''; return send(200, { configured: false }); }
        if (body.provider !== undefined) requireTrue(['codex','api','deepseek'].includes(body.provider), '请选择有效的 AI 模式。');
        if (body.provider === 'codex') { provider = 'codex'; return send(200, { provider }); }
        if (body.provider === 'deepseek') {
          requireTrue(safeModel(body.deepseekModel), 'DeepSeek 模型名称不正确。');
          if (body.deepseekKey) { requireTrue(typeof body.deepseekKey === 'string' && /^[A-Za-z0-9_-]{16,4096}$/.test(body.deepseekKey), 'DeepSeek 密钥格式不正确。'); deepseekKey = body.deepseekKey; }
          provider = 'deepseek'; deepseekModel = body.deepseekModel;
          return send(200, { provider, configured: Boolean(deepseekKey) });
        }
        requireTrue(safeModel(body.model) && safeModel(body.audioModel), '模型名称格式不正确。');
        if (body.key) { requireTrue(typeof body.key === 'string' && /^sk-[A-Za-z0-9_-]{12,4090}$/.test(body.key), '请填写完整的 OpenAI API 密钥，不要填 ChatGPT 密码。'); key = body.key; }
        model = body.model; audioModel = body.audioModel;
        if (body.provider === 'api') provider = 'api';
        return send(200, { configured: Boolean(key), model, audioModel, storage: 'process_memory_only' });
      }
      if (url.pathname === '/api/check') {
        if (provider === 'codex') { codexStatus = await codexCheck(); return send(200, { ...codexStatus, reachable: codexStatus.ready }); }
        if (provider === 'deepseek') {
          const result = await deepseekCall('/models', deepseekKey, { fetcher });
          const models = (result.data || []).map(row => row.id).filter(safeModel);
          requireTrue(models.includes(deepseekModel), 'DeepSeek 当前账号未返回所选模型，请核对模型名称。');
          return send(200, { reachable:true, model:deepseekModel, note:'DeepSeek 密钥与所选模型可访问。请生成一次选题验证效果；本检查不代表余额或生成已通过。' });
        }
        const result = await apiCall(`/models/${encodeURIComponent(model)}`); return send(200, { reachable: true, model: result.id || model, note: 'API 与所选模型可访问；生成、转写及余额尚未核验。' });
      }
      if (url.pathname === '/api/cancel') { activeController?.abort(); return send(200, { requested: Boolean(activeController), note: '已请求停止。API 模式不能撤回已发出的请求。' }); }
      if (['/api/script', '/api/save-draft'].includes(url.pathname)) {
        trace = { id: randomBytes(10).toString('hex'), startedAt: new Date().toISOString(), status: '运行中', events: [] };
        activeTraces.set(trace.id, trace);
        const { obsidianNote, ...form } = body;
        observe('提交输入', { input: form, obsidianNote: obsidianNote?.name });
      }
      if (url.pathname === '/api/save-draft') {
        stage = '保存编辑稿';
        const draft = text(body.script, 60000); requireTrue(draft, '正文不能为空。');
        const record = await save('draft', { parentId: text(body.parentId, 100) }, { result: { title: text(body.title, 500), script: draft }, sources: [], warnings: [], machineGenerated: false, reviewed: false });
        observe('已保存', { record });
        trace.status = '完成';
        await finishTrace(trace);
        return send(200, { record });
      }
      if (busy) throw new AppError('已有任务在运行，请等结果返回，避免重复调用费用。', 409, 'busy');
      if (url.pathname === '/api/research-link') {
        busy = true;
        try {
          let page; try { page = await readPublicVideo(body.url, fetcher); } catch (error) { if (error instanceof AppError) throw error; throw new AppError('未能读取抖音公开页面。可在浏览器正常打开后，上传你有权使用的音视频；不会绕过登录或验证。', 502, 'page_unavailable'); }
          if (!page.media) return send(200, { status: 'needs_media_upload', sourceUrl: page.url, message: '页面没有直接开放可读取的音视频。本次未取得口播原文，也未采集评论。请上传有权使用的视频/音频，或粘贴已有逐字稿继续；不会拿标题冒充正文。' });
          if (provider !== 'api' || !key) throw new AppError('已找到公开媒体，但转写需手动选择 API 模式并配置密钥。Codex 模式可先导入已有逐字稿。', 409, 'key_required');
          const response = await fetcher(page.media, { redirect: 'error', signal: AbortSignal.timeout(30000) });
          if (!response.ok || !/^(video|audio)\//.test(response.headers.get('content-type') || '')) { await response.body?.cancel(); throw new AppError('公开媒体不可读取，请改为上传本地音视频。', 502); }
          const bytes = await boundedBody(response.body, MAX_FILE);
          return send(200, { status: 'transcribed', record: await transcribe(bytes, 'source.mp4', page.url) });
        } finally { busy = false; }
      }
      const action = url.pathname.replace('/api/', '');
      requireTrue(['profile-suggest', 'topics', 'script', 'analyze'].includes(action), '接口不存在。');
      if (body.profile?.profileId && workspace[body.profile.profileId]?.fields) {
        const saved = workspace[body.profile.profileId].fields;
        body.profile.evidenceUse = saved.evidenceUse || '待确认';
        body.profile.anonymizedProof = saved.anonymizedProof || '';
      }
      stage = '资料校验';
      const input = inputFor(action, body);
      if (trace) {
        if (input.obsidianNoteName) observe('Obsidian 本机文件读取', { tool: '浏览器 File.text()', output: { name: input.obsidianNoteName, content: input.obsidianNoteContent } });
        const { obsidianNoteContent, ...prepared } = input;
        observe('校验后的生成输入', { input: prepared });
      }
      busy = true;
      const controller = new AbortController();
      activeController = controller;
      const selectedProvider = provider;
      const assertActive = () => { if (controller.signal.aborted || res.destroyed) throw new AppError('任务已停止，没有将未完成结果保存为成品。', 499, 'task_cancelled'); };
      const disconnect = () => { if (!res.writableEnded) controller.abort(); };
      res.once('close', disconnect);
      try {
        const generate = async generationInput => {
          assertActive();
          stage = generationInput.editorialDraft ? '复核修订' : '初稿';
          const monitor = trace ? observe : undefined;
          observe('准备调用模型', { provider: selectedProvider, builtInRules: ['固定口播正文规则', '四类内容写作规则', '内容深度与开头检查', ...(generationInput.editorialDraft ? ['复核修订规则'] : [])] });
          if (selectedProvider === 'codex') return codexRunner(action, generationInput, { signal: controller.signal, observe: monitor });
          if (selectedProvider === 'deepseek') return generateWithDeepSeek(action, generationInput, { key: deepseekKey, model: deepseekModel, fetcher, signal: controller.signal, observe: monitor });
          const outputBudget = action === 'profile-suggest' ? 2000 : action === 'topics' ? Math.max(10000, input.count * 1600) : 6500;
          const payload = { model, store: false, instructions: SYSTEM, input: promptFor(action, generationInput), max_output_tokens: outputBudget, text: { format: { type: 'json_schema', name: `${action}_result`, strict: true, schema: SCHEMAS[action] } } };
          if (generationInput.webSearch) Object.assign(payload, { tools: [{ type: 'web_search' }], tool_choice: 'required', include: ['web_search_call.action.sources'] });
          if (key) observe('模型请求', { payload, skills: [], configuredTools: payload.tools || [] });
          const raw = await apiCall('/responses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: controller.signal });
          observe('模型原始正文', { status: raw.status, output: (raw.output || []).filter(item => item.type === 'message'), tools: (raw.output || []).filter(item => /_call$/.test(item.type)), usage: raw.usage });
          return raw;
        };
        const response = await generate(input);
        assertActive();
        let output = parseModelResult(action, response, input);
        observe('校验后的输出', { output });
        if (action === 'topics' || action === 'script') {
          const firstOutput = output;
          const reviewInput = { ...input, editorialDraft: firstOutput.result, editorialSources: firstOutput.sources, webSearch: false };
          try {
            const reviewedResponse = await generate(reviewInput);
            assertActive();
            if ((reviewedResponse.output || []).some(item => item.type === 'web_search_call')) throw new AppError('复核阶段不应再次联网。', 502, 'unexpected_review_search');
            output = parseModelResult(action, withEditorialEvidence(response, reviewedResponse), input);
            observe('校验后的输出', { output });
          } catch (error) {
            observe('复核失败', { code: error.code || 'local_error' });
            assertActive();
            throw new AppError('内容复核未完成，初稿没有保存为正式结果。请保留输入后重试；没有自动重试或切换生成通道。', 502, 'editorial_review_incomplete');
          }
          const bothUsage = [firstOutput.usage, output.usage];
          const totals = bothUsage.every(usage => Number.isFinite(usage?.inputTokens) && Number.isFinite(usage?.outputTokens)) ? { inputTokens: bothUsage.reduce((sum, usage) => sum + usage.inputTokens, 0), outputTokens: bothUsage.reduce((sum, usage) => sum + usage.outputTokens, 0) } : null;
          output = { ...output, usage: totals, editorialPasses: 2, editorialReviewStatus: 'machine_reviewed' };
        }
        assertActive();
        const { obsidianNoteContent, ...recordInput } = input;
        stage = '保存';
        const record = await save(action, recordInput, { ...output, provider: selectedProvider });
        if (trace) {
          observe('已保存', { recordId: record.id, output: record.result });
          trace.status = '完成';
          await finishTrace(trace);
        }
        return send(200, { record });
      } finally { res.removeListener('close', disconnect); activeController = undefined; busy = false; }
    } catch (error) {
      const known = error instanceof AppError || error instanceof CodexError || error instanceof DeepSeekError;
      const failure = { error: known ? error.message : '本机处理失败，未将未完成结果当作成功。请保留当前输入后重试。', code: known ? error.code : 'local_error' };
      if (trace) {
        trace.status = failure.code === 'task_cancelled' ? '已取消' : '失败';
        observe(trace.status, failure);
        await finishTrace(trace);
      }
      send(known ? error.status : 500, failure);
    }
  });
  server.requestTimeout = 660000; server.headersTimeout = 10000;
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
  origin = `http://127.0.0.1:${server.address().port}`;
  return { server, origin, token, close: () => { activeController?.abort(); return new Promise(resolve => server.close(resolve)); } };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const candidate = Number(process.env.YANGU_PORT || 3918);
  try {
    const app = await createApp({ port: Number.isInteger(candidate) && candidate >= 1024 && candidate <= 65535 ? candidate : 3918 });
    console.log(`衍谷AI自媒体获客工作台\n演示地址：${app.origin}\n未自动打开时，请把上方地址复制到浏览器。\n资料目录：${path.join(homedir(), 'YanguAI-LocalData')}\n请保留此窗口。按 Ctrl+C 退出；密钥只在本次启动内存中保存。`);
    if (!process.argv.includes('--no-open')) {
      if (process.platform === 'darwin') spawn('open', [app.origin], { stdio: 'ignore' }).on('error', () => {});
      else if (process.platform === 'win32') spawn('rundll32.exe', ['url.dll,FileProtocolHandler', app.origin], { stdio: 'ignore' }).on('error', () => {});
    }
    const stop = () => { app.server.close(() => process.exit(0)); setTimeout(() => process.exit(0), 1000).unref(); };
    process.on('SIGINT', stop); process.on('SIGTERM', stop);
  } catch (error) { console.error(error.code === 'EADDRINUSE' ? '演示端口已被占用。先关闭旧启动窗口，或打开原来的演示地址。' : '启动失败，请确认文件夹已完整解压且可写入本机资料目录。'); process.exitCode = 1; }
}
