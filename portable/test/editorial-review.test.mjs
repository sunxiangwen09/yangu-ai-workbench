import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createApp, inputFor, parseModelResult } from '../server.mjs';
import { knowledgeFor } from '../content-knowledge.mjs';

// These are deterministic interface fixtures, not real model calls or content-quality evidence.
const body = { profile: { industry: '测试行业', audience: '测试受众', offer: '测试服务' }, count: 1, genre: '干货', webSearch: false };
const topicFixture = (label = '初稿', urls = []) => ({ topics: [{
  title: `接口测试选题${label}`, genre: '干货', customerProblem: '测试观众要理解一个具体区别', whyShoot: '测试内容与业务问题有关',
  opening: '这是明确标注的接口测试材料', conversionAction: '按实际业务咨询', evidenceBasis: '测试夹具，不是平台事实', sourceUrls: urls,
  plan: { contentBeats: ['比较输入中的不同条件', '解释条件改变造成的差异', '说明可核对的边界'], hookReason: '测试中的条件差异需要解释', watchReason: '接着看哪项条件改变了判断', payoff: '根据已给条件区分两种情况', engagementReason: '测试中的相关材料可以保存', shootingApproach: '固定口播讲清具体区别', materialNeeds: [],
    depth: { familiarAnswer: '只看表面结果', insight: '同时比较输入条件', mechanism: '输入条件不同使结果不可直接比较', evidence: '本测试夹具提供的条件对照', boundary: '缺输入条件时不能下结论' } },
}], assumptions: ['这是测试夹具'], missingInfo: [] });
const scriptFixture = (label = '初稿') => ({ title: `接口测试脚本${label}`, genre: '干货', whyShoot: '测试选题与正文衔接', script: `这是${label}的接口测试正文，不代表实际模型输出或客户事实。需要保留目标问题与输入材料，解释条件发生变化时怎样检查结论，并将没有依据的部分留待确认，不把接口测试作为内容质量证明。`, conversionAction: '讨论具体问题', evidenceBasis: '测试夹具', factChecks: [] });
const response = (result, extra = {}) => ({ status: 'completed', model: 'editorial-fixture', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(result) }] }], ...extra });
const fakeKey = 'sk-fixture-never-real-credential-123456789';
const noExternal = async () => { throw new Error('Unexpected external provider request in fixture'); };

async function fixture(t, options = {}) {
  const dir = await mkdtemp(path.join(tmpdir(), 'yangu-editorial-test-'));
  const app = await createApp({ dataDir: dir, port: 0, fetcher: noExternal, codexCheck: async () => ({ ready: true }), ...options });
  t.after(async () => { await app.close(); await rm(dir, { recursive: true }); });
  const request = async (endpoint, value, signal) => {
    const res = await fetch(`${app.origin}/api/${endpoint}`, { method: value === undefined ? 'GET' : 'POST', headers: { 'X-Yangu-Token': app.token, ...(value === undefined ? {} : { Origin: app.origin, 'Content-Type': 'application/json' }) }, body: value === undefined ? undefined : JSON.stringify(value), signal });
    return { status: res.status, data: await res.json() };
  };
  return { ...app, dir, request, configureAPI: () => request('config', { provider: 'api', key: fakeKey, model: 'gpt-5.4-mini', audioModel: 'gpt-transcribe' }) };
}

test('topics use exactly two Codex passes and only the revised result is saved', async t => {
  const seen = [];
  const app = await fixture(t, { codexRunner: async (action, input) => {
    seen.push({ action, input: structuredClone(input) });
    return response(topicFixture(seen.length === 1 ? '初稿' : '修订稿'));
  } });
  const result = await app.request('topics', { ...body, editorialDraft: { malicious: 'not accepted' }, editorialSources: [{ url: 'https://untrusted.test/' }] });
  assert.equal(result.status, 200); assert.equal(seen.length, 2);
  assert.equal(seen[0].input.editorialDraft, undefined);
  assert.equal(seen[1].input.webSearch, false);
  assert.equal(seen[1].input.editorialDraft.topics[0].title, '接口测试选题初稿');
  assert.deepEqual(seen[1].input.editorialSources, []);
  const record = result.data.record;
  assert.equal(record.result.topics[0].title, '接口测试选题修订稿');
  assert.equal(record.editorialPasses, 2); assert.equal(record.editorialReviewStatus, 'machine_reviewed');
  assert.equal(record.reviewed, false); assert.equal(record.provider, 'codex');
  assert.equal(record.input.editorialDraft, undefined); assert.equal(record.input.editorialSources, undefined);
  const saved = JSON.parse(await readFile(path.join(app.dir, 'records.json'), 'utf8'));
  assert.equal(saved.length, 1); assert.equal(saved[0].result.topics[0].title, '接口测试选题修订稿');
  assert.equal(app.server.requestTimeout, 660000);
});

test('scripts get two passes but business suggestions and analysis get one', async t => {
  const calls = [];
  const app = await fixture(t, { codexRunner: async (action, input) => {
    calls.push({ action, reviewed: Boolean(input.editorialDraft) });
    if (action === 'script') return response(scriptFixture(input.editorialDraft ? '修订稿' : '初稿'));
    if (action === 'profile-suggest') return response({ audience: '测试受众', offer: '测试服务', assumptions: [] });
    return response({ summary: '基于测试文字的有限拆解', findings: ['流量机制', '获客路径', '变现路径'].map(dimension => ({ dimension, conclusion: '缺少对应证据', sourceType: 'none', sourceQuote: '', certainty: '缺失', evidence: '', missing: '缺外部材料' })), commentInsights: [] });
  } });
  const script = await app.request('script', { ...body, topic: '测试中心问题', seconds: 60 });
  assert.equal(script.status, 200); assert.match(script.data.record.result.script, /修订稿/);
  assert.equal(script.data.record.editorialPasses, 2);
  const suggestion = await app.request('profile-suggest', body);
  const analysis = await app.request('analyze', { transcript: '这是接口测试使用的原创文字材料，仅检查请求次数和输出状态，不代表任何真实视频的原文、观点或已完成的拆解研究。' });
  assert.equal(suggestion.status, 200); assert.equal(analysis.status, 200);
  assert.equal(suggestion.data.record.editorialPasses, undefined); assert.equal(analysis.data.record.editorialPasses, undefined);
  assert.deepEqual(calls, [{ action: 'script', reviewed: false }, { action: 'script', reviewed: true }, { action: 'profile-suggest', reviewed: false }, { action: 'analyze', reviewed: false }]);
});

test('failed or malformed editorial review is not saved and never falls back to configured APIs', async t => {
  for (const failure of ['network', 'shape']) await t.test(failure, async sub => {
    let calls = 0, external = 0;
    const app = await fixture(sub, { fetcher: async () => { external++; throw new Error('Unexpected fallback'); }, codexRunner: async () => {
      calls++;
      if (calls === 1) return response(topicFixture());
      if (failure === 'network') throw new Error('private-upstream-fixture-details');
      return response({ topics: [] });
    } });
    await app.configureAPI(); await app.request('config', { provider: 'codex' });
    const result = await app.request('topics', body);
    assert.equal(result.status, 502); assert.equal(result.data.code, 'editorial_review_incomplete');
    assert.match(result.data.error, /复核未完成/); assert.doesNotMatch(result.data.error, /private-upstream/);
    assert.equal(calls, 2); assert.equal(external, 0);
    const state = (await app.request('state')).data;
    assert.equal(state.totalRecords, 0); assert.equal(state.busy, false); assert.equal(state.provider, 'codex');
    await assert.rejects(readFile(path.join(app.dir, 'records.json')), { code: 'ENOENT' });
  });
});

test('first-pass failure stops immediately without an editorial retry', async t => {
  let calls = 0;
  const app = await fixture(t, { codexRunner: async () => { calls++; return { status: 'incomplete', output: [] }; } });
  const result = await app.request('topics', body);
  assert.equal(result.status, 502); assert.equal(calls, 1);
  assert.equal((await app.request('state')).data.totalRecords, 0);
});

test('OpenAI review does not search again and retains first-pass search and citation evidence', async t => {
  const urls = ['https://source.example/actual-search', 'https://source.example/actual-citation'];
  const calls = [];
  const app = await fixture(t, { initialProvider: 'api', fetcher: async (url, init) => {
    assert.equal(url, 'https://api.openai.com/v1/responses');
    calls.push(JSON.parse(init.body));
    if (calls.length === 1) {
      const first = response(topicFixture('初稿', urls));
      first.output.unshift({ type: 'web_search_call', status: 'completed', action: { sources: [{ url: urls[0], title: '真实检索夹具' }] } });
      first.output[1].content[0].annotations = [{ type: 'url_citation', url: urls[1], title: '首轮引用夹具' }];
      first.usage = { input_tokens: 10, output_tokens: 20 };
      return Response.json(first);
    }
    return Response.json(response(topicFixture('修订稿', [...urls, 'https://fabricated.example/not-a-source']), { usage: { input_tokens: 30, output_tokens: 40 } }));
  } });
  await app.configureAPI();
  const result = await app.request('topics', { ...body, webSearch: true });
  assert.equal(result.status, 200); assert.equal(calls.length, 2);
  assert.deepEqual(calls[0].tools, [{ type: 'web_search' }]); assert.equal(calls[0].tool_choice, 'required');
  assert.equal(calls[1].tools, undefined); assert.equal(calls[1].tool_choice, undefined); assert.equal(calls[1].include, undefined);
  assert.match(calls[1].input, /接口测试选题初稿/); assert.ok(calls[1].input.includes(urls[1]));
  const record = result.data.record;
  assert.deepEqual(record.result.topics[0].sourceUrls, urls); assert.equal(record.result.topics[0].sourceStatus, 'search_source');
  assert.deepEqual(record.sources.map(source => source.url), urls);
  assert.deepEqual(record.usage, { inputTokens: 40, outputTokens: 60 });
  assert.equal(record.input.webSearch, true); assert.equal(record.reviewed, false);
});

test('DeepSeek editorial review stays on DeepSeek for both passes', async t => {
  let codexCalls = 0;
  const requests = [];
  const app = await fixture(t, { codexRunner: async () => { codexCalls++; throw new Error('Unexpected Codex fallback'); }, fetcher: async (url, init) => {
    assert.equal(url, 'https://api.deepseek.com/chat/completions');
    const payload = JSON.parse(init.body); requests.push(payload);
    return Response.json({ model: 'deepseek-fixture', choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(topicFixture(requests.length === 1 ? '初稿' : '修订稿')) } }], usage: { prompt_tokens: 10, completion_tokens: 20 } });
  } });
  await app.request('config', { provider: 'deepseek', deepseekKey: 'fixture-not-real-key-123456', deepseekModel: 'deepseek-flash' });
  const result = await app.request('topics', body);
  assert.equal(result.status, 200); assert.equal(requests.length, 2); assert.equal(codexCalls, 0);
  assert.match(requests[1].messages[1].content, /接口测试选题初稿/);
  assert.equal(result.data.record.provider, 'deepseek'); assert.equal(result.data.record.editorialPasses, 2);
});

test('cancelling OpenAI during editorial review aborts the provider and saves no draft', async t => {
  let calls = 0, signalSeen;
  let reviewStarted;
  const started = new Promise(resolve => { reviewStarted = resolve; });
  const app = await fixture(t, { initialProvider: 'api', fetcher: async (_url, init) => {
    calls++;
    if (calls === 1) return Response.json(response(topicFixture()));
    signalSeen = init.signal; reviewStarted();
    return new Promise((_resolve, reject) => init.signal.addEventListener('abort', () => reject(new Error('Fixture aborted')), { once: true }));
  } });
  await app.configureAPI();
  const pending = app.request('topics', body);
  await started;
  assert.equal((await app.request('state')).data.busy, true);
  assert.equal((await app.request('config', { provider: 'codex' })).status, 409);
  assert.equal((await app.request('cancel', {})).status, 200);
  const result = await pending;
  assert.equal(result.status, 499); assert.equal(result.data.code, 'task_cancelled');
  assert.equal(signalSeen.aborted, true); assert.equal(calls, 2);
  const state = (await app.request('state')).data;
  assert.equal(state.totalRecords, 0); assert.equal(state.busy, false);
});

test('client disconnect during review cancels the local runner and clears busy', async t => {
  let calls = 0, reviewStarted, reviewAborted;
  const started = new Promise(resolve => { reviewStarted = resolve; });
  const aborted = new Promise(resolve => { reviewAborted = resolve; });
  const app = await fixture(t, { codexRunner: async (_action, _input, { signal }) => {
    calls++;
    if (calls === 1) return response(topicFixture());
    reviewStarted();
    return new Promise((_resolve, reject) => signal.addEventListener('abort', () => { reviewAborted(); reject(new Error('Fixture disconnect')); }, { once: true }));
  } });
  const controller = new AbortController();
  const pending = app.request('topics', body, controller.signal).catch(error => error);
  await started; controller.abort(); await pending; await aborted;
  let state;
  for (let attempt = 0; attempt < 20; attempt++) {
    state = (await app.request('state')).data;
    if (!state.busy) break;
    await new Promise(resolve => setTimeout(resolve, 5));
  }
  assert.equal(calls, 2); assert.equal(state.busy, false); assert.equal(state.totalRecords, 0);
});

test('knowledge is selected server-side and only cited cards become topic sources', () => {
  const cards = knowledgeFor({ industry: '美甲' }); assert.ok(cards.length >= 2);
  const input = inputFor('topics', { ...body, profile: { industry: '美甲' }, knowledge: [{ url: 'https://forged.example/' }] });
  assert.deepEqual(input.knowledge, cards);
  assert.deepEqual(inputFor('topics', { ...body, knowledge: cards }).knowledge, []);
  const parsed = parseModelResult('topics', response(topicFixture('知识卡', [cards[0].url, 'https://forged.example/'])), input);
  assert.deepEqual(parsed.result.topics[0].sourceUrls, [cards[0].url]);
  assert.equal(parsed.result.topics[0].sourceStatus, 'knowledge_source');
  assert.deepEqual(parsed.sources.map(source => source.url), [cards[0].url]);
  assert.throws(() => parseModelResult('topics', response(topicFixture('知识卡', [cards[0].url])), { ...input, webSearch: true }), error => error.code === 'search_not_completed');
  const scriptInput = inputFor('script', { profile: { industry: '美甲' }, topic: '所选题', reference: `已选题来源：${cards[1].url}；没有引用其他卡片。` });
  assert.deepEqual(parseModelResult('script', response(scriptFixture()), scriptInput).sources.map(source => source.url), [cards[1].url]);
  assert.deepEqual(parseModelResult('script', response(scriptFixture()), { ...scriptInput, reference: `${cards[1].url}/untrusted-suffix` }).sources, []);
});

test('topic depth must be complete and cannot echo the familiar answer verbatim', () => {
  const input = { count: 1, genre: '干货' };
  const missing = topicFixture(); delete missing.topics[0].plan.depth.mechanism;
  assert.throws(() => parseModelResult('topics', response(missing), input), /选题缺少/);
  const extra = topicFixture(); extra.topics[0].plan.depth.score = '100';
  assert.throws(() => parseModelResult('topics', response(extra), input), /选题缺少/);
  const echoed = topicFixture(); echoed.topics[0].plan.depth.insight = '只看，表面！结果';
  assert.throws(() => parseModelResult('topics', response(echoed), input), /完全相同/);
  assert.doesNotThrow(() => parseModelResult('topics', response(topicFixture()), input));
});

test('selected Obsidian note reaches both script prompts without saving the raw note', async t => {
  const { promptFor } = await import('../prompts.mjs');
  const prompts = [];
  const note = { name: '口播规则.md', content: '测试标记：先给可核对的具体例子。' };
  const app = await fixture(t, { codexRunner: async (action, input) => {
    prompts.push(promptFor(action, input));
    return response(scriptFixture());
  } });
  const request = { ...body, topic: '测试中心问题' };
  const result = await app.request('script', { ...request, obsidianNote: note });
  assert.equal(result.status, 200);
  assert.equal(prompts.length, 2);
  for (const prompt of prompts) assert.ok(prompt.includes(note.content));
  assert.equal(result.data.record.input.obsidianNoteName, note.name);
  assert.equal(result.data.record.input.obsidianNoteContent, undefined);
  const saved = await readFile(path.join(app.dir, 'records.json'), 'utf8');
  assert.ok(!saved.includes(note.content));
  const invalid = await app.request('script', { ...request, obsidianNote: { ...note, content: '字'.repeat(8001) } });
  assert.equal(invalid.status, 400);
  assert.equal(prompts.length, 2);
});

test('script monitor records both actual API request bodies, visible outputs, and validation failures', async t => {
  const sent = [];
  const app = await fixture(t, { fetcher: async (_url, init) => {
    sent.push(JSON.parse(init.body));
    return new Response(JSON.stringify(response(scriptFixture())), { status: 200 });
  } });
  await app.configureAPI();
  const result = await app.request('script', { ...body, topic: '测试监控', obsidianNote: { name: '规则.md', content: '测试笔记原文' } });
  assert.equal(result.status, 200);
  assert.equal((await app.request('script', { ...body, topic: '' })).status, 400);
  const { data } = await app.request('script-traces');
  assert.equal(data.traces[0].status, '失败');
  const events = data.traces[1].events;
  assert.deepEqual(events.filter(e => e.event === '模型请求').map(e => e.payload), sent);
  assert.deepEqual(events.filter(e => e.event === '模型原始正文').map(e => e.tools), [[], []]);
  assert.equal(events.find(e => e.event === '已保存').recordId, result.data.record.id);
  const saved = await readFile(path.join(app.dir, 'script-traces.json'), 'utf8');
  assert.ok(saved.includes('测试笔记原文'));
  assert.ok(!saved.includes(fakeKey));
});
