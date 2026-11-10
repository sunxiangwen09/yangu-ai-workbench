import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createApp, inputFor, parseModelResult, douyinLink, readPublicVideo } from '../server.mjs';
import { NAV } from '../public/workspace.js';

const response = (result, extra = {}) => ({ status: 'completed', model: 'gpt-5.4-mini', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(result) }] }], ...extra });
const genreList = ['干货', '观点', '故事', '记录过程'];
const topicPlan = () => ({ depth:{familiarAnswer:'测试用已知说法',insight:'测试用新增判断',mechanism:'测试条件',evidence:'仅为接口夹具',boundary:'不代表实际模型质量'}, hookReason: '保洁范围直接影响当前决策', watchReason: '逐步比较报价中包含的服务', payoff: '得到可照用的范围核对方法', engagementReason: '保存核对步骤供预约时使用', shootingApproach: '固定口播讲清核对方法，不强制分镜', contentBeats: ['提出业主的范围疑问', '展开具体检查方法和例子', '说明适用边界与下一步'], materialNeeds: ['可公开的实际服务范围'] });
const topicFixture = (count = 6, genre = '干货') => ({ topics: Array.from({ length: count }, (_, i) => ({ title: `保洁前先核对的第${i + 1}个问题`, genre, customerProblem: '业主担心服务范围不清楚', whyShoot: '让客户明确判断方式', opening: '约保洁前先问清范围', conversionAction: '说明房屋情况后咨询', evidenceBasis: '输入资料的策划假设', sourceUrls: [], plan: topicPlan() })), assumptions: [], missingInfo: [] });
const topics = topicFixture();
const script = { title: '保洁服务怎么比较', genre: '干货', whyShoot: '先解决范围与报价误解', script: '测试用正文，不代表真实模型生成。先确认房屋状态、范围和验收标准，再比较同样范围的报价；报价低不一定更划算，未包含的工作需要另外确认。', conversionAction: '提供房屋情况', evidenceBasis: '测试输入', factChecks: [] };
const fakeKey = 'sk-test-fixture-not-a-real-credential-123456';
test('all 13 original windows plus history remain reachable in navigation',()=>{
  const ids=NAV.flatMap(([,items])=>items.map(([id])=>id));
  for(const id of ['dashboard','topics','script','production','publish','analytics','clients','research','business','connections','workflow','rules','audit','history']) assert.ok(ids.includes(id),id);
  assert.equal(new Set(ids).size,ids.length);
});
test('restricted or internal cases are filtered at the final server boundary',()=>{
  const result=inputFor('script',{consent:true,topic:'测试',profile:{industry:'保洁',proof:'不可外发的案例',personalStory:'内部经历',evidenceUse:'禁止使用'}});
  assert.equal(result.profile.proof,'');assert.equal(result.profile.personalStory,'');
  const anon=inputFor('topics',{consent:true,profile:{industry:'保洁',proof:'原始身份信息',anonymizedProof:'已匿名的案例',evidenceUse:'仅匿名后可用'}});
  assert.equal(anon.profile.proof,'已匿名的案例');
});
async function fixture(t, fetcher) {
  const dir = await mkdtemp(path.join(tmpdir(), 'yangu-unit-'));
  const app = await createApp({ dataDir: dir, port: 0, fetcher, initialProvider: 'api' });
  t.after(async () => { await app.close(); await rm(dir, { recursive: true }); });
  const request = async (endpoint, body, headers = {}) => {
    const res = await fetch(`${app.origin}/api/${endpoint}`, { method: body === undefined ? 'GET' : 'POST', headers: { 'X-Yangu-Token': app.token, ...(body === undefined ? {} : { Origin: app.origin, 'Content-Type': 'application/json' }), ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: res.status, data: await res.json() };
  };
  return { ...app, dir, request, configure: () => request('config', { key: fakeKey, model: 'gpt-5.4-mini', audioModel: 'gpt-transcribe' }) };
}
test('share links are exact allowlisted HTTPS video links', () => {
  assert.equal(douyinLink('复制 https://v.douyin.com/abc/ 看作品'), 'https://v.douyin.com/abc/');
  for (const value of ['http://v.douyin.com/abc/', 'https://v.douyin.com.evil.test/abc/', 'https://u:p@www.douyin.com/video/123', 'https://127.0.0.1/video/123', 'https://www.douyin.com/user/123']) assert.throws(() => douyinLink(value));
});
test('task submission needs industry, not a repeated consent checkbox; analysis needs real text', () => {
  assert.equal(inputFor('topics', { profile: { industry: '保洁' } }).profile.industry, '保洁');
  assert.throws(() => inputFor('topics', { consent: true, profile: {} }));
  assert.throws(() => inputFor('profile-suggest', { profile: {} }));
  assert.throws(() => inputFor('topics', { profile: '保洁' }));
  assert.throws(() => inputFor('analyze', { consent: true, transcript: '只给了一个标题' }));
  const input = inputFor('script', { consent: true, profile: { industry: '保洁', password: 'discard' }, topic: '客户问题', seconds: 60 });
  assert.equal(input.profile.password, undefined); assert.equal(input.seconds, 60);
});
test('requested topic counts accept 1–20 integers with a compatible default', () => {
  assert.equal(inputFor('topics', { profile: { industry: '装修' } }).count, 6);
  for (const count of [1, 3, 6, 20]) assert.equal(inputFor('topics', { count, profile: { industry: '装修' } }).count, count);
  for (const count of [0, -1, 21, 2.5, '3', null, NaN]) assert.throws(() => inputFor('topics', { count, profile: { industry: '装修' } }), /1–20/);
  const firstThree = { ...topics, topics: topics.topics.slice(0, 3) };
  assert.equal(parseModelResult('topics', response(firstThree), { count: 3 }).result.topics.length, 3);
  assert.throws(() => parseModelResult('topics', response(firstThree), { count: 6 }), /6 个选题/);
});
test('business suggestions keep editable provenance and reject empty or extra business facts', () => {
  const input = inputFor('profile-suggest', { profile: { industry: '装修', audience: '二手房业主', aiSuggestedFields: 'audience,offer,password', suggestionIndustry: '装修', password: 'drop' } });
  assert.equal(input.profile.audience, '二手房业主');
  assert.equal(input.profile.aiSuggestedFields, 'audience,offer');
  assert.equal(input.profile.suggestionIndustry, '装修');
  assert.equal(input.profile.password, undefined);
  const suggestion = { audience: '装修预算待明确的业主', offer: '旧房改造和空间规划建议', assumptions: ['暂按住宅装修服务推测'] };
  const checked = parseModelResult('profile-suggest', response(suggestion), input);
  assert.equal(checked.reviewed, false); assert.equal(checked.machineGenerated, true);
  assert.ok(checked.warnings.some(value => value.includes('不代表已核实')));
  for (const invalid of [{ ...suggestion, audience: '' }, { ...suggestion, offer: '' }, { ...suggestion, years: 20 }, { ...suggestion, assumptions: [10] }]) assert.throws(() => parseModelResult('profile-suggest', response(invalid), input));
});
test('topic genre input is explicit and real materials stay bounded', () => {
  assert.equal(inputFor('topics', { profile: { industry: '装修' } }).genre, '干货');
  for (const genre of genreList) assert.equal(inputFor('topics', { profile: { industry: '装修' }, genre }).genre, genre);
  for (const genre of ['all', '均衡搭配', '', null, false, '产品', '进入过程']) assert.throws(() => inputFor('topics', { profile: { industry: '装修' }, genre }), /请选择/);
  for (const action of ['topics', 'script']) {
    const parsed = inputFor(action, { profile: { industry: '装修' }, topic: '主题', materials: '材'.repeat(6001) });
    assert.equal(parsed.materials.length, 6000);
  }
});
test('default topics use one selected genre regardless of batch size', () => {
  for (const count of [1, 2, 3, 4, 6, 20]) {
    const result = parseModelResult('topics', response(topicFixture(count)), { count });
    assert.ok(result.result.topics.every(row => row.genre === '干货'));
  }
  const mixed = topicFixture(6); mixed.topics[1].genre = '观点';
  assert.throws(() => parseModelResult('topics', response(mixed), { count: 6 }), /所选内容类型/);
  assert.throws(() => parseModelResult('topics', response(topicFixture(6)), { genre: 'all', count: 6 }), /请选择/);
});
test('every explicit genre is honored for the entire requested batch', () => {
  for (const genre of genreList) {
    const result = parseModelResult('topics', response(topicFixture(3, genre)), { genre, count: 3 });
    assert.ok(result.result.topics.every(row => row.genre === genre));
    const wrong = topicFixture(3, genre); wrong.topics[1].genre = genreList.find(item => item !== genre);
    assert.throws(() => parseModelResult('topics', response(wrong), { genre, count: 3 }), /所选内容类型/);
  }
});
test('story and process scripts require supplied material, not generated planning text', () => {
  const actual = '我整理了一个现场测试的记录，先让同事对照原始材料，再逐项标出遗漏项，目前还没有最终结果。';
  for (const genre of ['故事', '记录过程']) {
    const base = { profile: { industry: '企业AI培训' }, topic: '这次任务怎么完成', genre };
    assert.throws(() => inputFor('script', { ...base, reference: '模型产生的策划和剧情建议'.repeat(10) }), error => error.code === 'materials_required');
    assert.throws(() => inputFor('script', { ...base, materials: '太短' }), error => error.code === 'materials_required');
    assert.equal(inputFor('script', { ...base, materials: actual }).materials, actual);
    assert.equal(inputFor('script', { ...base, profile: { ...base.profile, proof: actual, evidenceUse: '可用于创作' } }).profile.proof, actual);
    assert.throws(() => inputFor('script', { ...base, profile: { ...base.profile, proof: actual, personalStory: actual, evidenceUse: '禁止使用' } }), error => error.code === 'materials_required');
    assert.equal(inputFor('script', { ...base, profile: { ...base.profile, proof: '受限原文', anonymizedProof: actual, evidenceUse: '仅匿名后可用' } }).profile.proof, actual);
  }
  for (const genre of ['干货', '观点']) assert.doesNotThrow(() => inputFor('script', { profile: { industry: '装修' }, topic: '如何核对预算', genre }));
});
test('script outputs must match the requested genre', () => {
  assert.throws(() => parseModelResult('script', response(script), { seconds: 90, genre: '观点' }), /所选内容类型/);
  for (const genre of genreList) assert.equal(parseModelResult('script', response({ ...script, genre }), { seconds: 90, genre }).result.genre, genre);
});
test('new topics require useful plan fields, complete beats and unique normalized titles', () => {
  const reject = change => { const data = topicFixture(4); change(data); assert.throws(() => parseModelResult('topics', response(data), { count: 4, genre: '干货' })); };
  for (const key of ['title', 'genre', 'customerProblem', 'whyShoot', 'opening', 'conversionAction', 'evidenceBasis']) reject(data => data.topics[0][key] = ' ');
  reject(data => delete data.topics[0].plan);
  for (const key of ['hookReason', 'watchReason', 'payoff', 'engagementReason', 'shootingApproach']) reject(data => data.topics[0].plan[key] = '');
  reject(data => data.topics[0].plan.contentBeats = ['只有起点', '没有兑现']);
  reject(data => data.topics[0].plan.contentBeats = Array(6).fill('过多节点'));
  reject(data => data.topics[0].plan.contentBeats[1] = '');
  reject(data => data.topics[0].plan.materialNeeds = '错误格式');
  reject(data => data.topics[0].plan.materialNeeds = [null]);
  reject(data => data.topics[0].trafficScore = 99);
  reject(data => data.topics[0].plan.expectedViews = 100000);
  reject(data => data.topics[1].title = data.topics[0].title + ' ！？');
  reject(data => { data.topics[0].title = 'AI 方法'; data.topics[1].title = 'ＡＩ方法！'; });
  reject(data => data.topics[0].sourceUrls = null);
});
test('incomplete, refusal and malformed model output are rejected', () => {
  assert.throws(() => parseModelResult('topics', { status: 'incomplete' }, {}));
  assert.throws(() => parseModelResult('topics', { status: 'completed', output: [{ type: 'message', content: [{ type: 'refusal' }] }] }, {}));
  assert.throws(() => parseModelResult('topics', response({ topics: [] }), {}));
});
test('only actually returned search sources are linked', () => {
  const data = structuredClone(topics); data.topics[0].sourceUrls = ['https://official.example/report', 'https://invented.example/claim'];
  const raw = response(data); raw.output.unshift({ type: 'web_search_call', status: 'completed', action: { sources: [{ url: 'https://official.example/report', title: '测试来源' }] } });
  const result = parseModelResult('topics', raw, { webSearch: true });
  assert.deepEqual(result.result.topics[0].sourceUrls, ['https://official.example/report']);
  assert.equal(result.result.topics[1].sourceStatus, 'planning_hypothesis');
  assert.throws(() => parseModelResult('topics', response(data), { webSearch: true }));
});
test('HTTP honors every selected genre and persists its supplied materials', async t => {
  let payload, requestIndex = 0;
  const f = await fixture(t, async (_url, init) => {
    payload = JSON.parse(init.body);
    const genre = genreList[Math.floor(requestIndex++ / 2)];
    assert.ok(payload.input.includes(`"genre":"${genre}"`));
    return new Response(JSON.stringify(response(topicFixture(2, genre))));
  });
  await f.configure();
  const removedMode = await f.request('topics', { profile: { industry: '保洁' }, genre: 'all', count: 2 });
  assert.equal(removedMode.status, 400); assert.equal(requestIndex, 0);
  for (const genre of genreList) {
    const r = await f.request('topics', { profile: { industry: '保洁' }, genre, count: 2, materials: '测试用已提供的过程材料，不代表真实客户案例' });
    assert.equal(r.status, 200);
    assert.ok(r.data.record.result.topics.every(row => row.genre === genre));
    assert.equal(r.data.record.input.genre, genre);
    assert.equal(r.data.record.input.materials, '测试用已提供的过程材料，不代表真实客户案例');
  }
  assert.equal((await f.request('state')).data.totalRecords, 4);
});
test('saved evidence restrictions run before the story material gate and no model is called', async t => {
  let calls = 0;
  const f = await fixture(t, async () => { calls++; return new Response(JSON.stringify(response({ ...script, genre: '故事' }))); });
  await f.configure();
  await f.request('workspace', { section: 'profile-restricted', fields: { industry: '装修', evidenceUse: '禁止使用' } });
  const r = await f.request('script', { topic: '真实经历', genre: '故事', profile: { profileId: 'profile-restricted', industry: '装修', evidenceUse: '可用于创作', proof: '不应外发的真实案例和内部细节'.repeat(10) }, reference: '模型建议的故事剧情'.repeat(10) });
  assert.equal(r.status, 400); assert.equal(r.data.code, 'materials_required'); assert.equal(calls, 0);
  assert.equal((await f.request('state')).data.totalRecords, 0);
});
test('short script is flagged rather than promoted as finished', () => {
  const result = parseModelResult('script', response(script), { seconds: 120 });
  assert.ok(result.warnings.some(x => x.includes('偏短'))); assert.equal(result.reviewed, false);
});
test('analysis quotes must exist in the provided evidence; no comments are invented', () => {
  const text = '这条原文讨论了如何确认保洁服务范围，建议先明确工作项目再比较报价，不能只比较单价。';
  const data = { summary: '测试拆解', findings: ['流量机制', '获客路径', '变现路径'].map(dimension => ({ dimension, conclusion: '机制待验证', sourceType: 'transcript', sourceQuote: '明确工作项目再比较报价', evidence: '原文中段', certainty: '推断', missing: '成交数据' })), commentInsights: ['虚构评论'] };
  const checked = parseModelResult('analyze', response(data), { transcript: text, comments: '' });
  assert.equal(checked.result.findings[0].evidenceLocated, true);
  assert.deepEqual(checked.result.commentInsights, ['本次没有评论样本，不能分析观众反馈。']);
  data.findings[0].sourceQuote = '不存在的证据';
  assert.equal(parseModelResult('analyze', response(data), { transcript: text, comments: '' }).result.findings[0].evidenceLocated, false);
  assert.throws(() => parseModelResult('analyze', response({ summary: '', findings: [] }), { transcript: text }));
});
test('same-domain homepage redirect cannot become a different video', async () => {
  let calls = 0;
  const r = await readPublicVideo('https://www.douyin.com/video/123456789012345', async () => ++calls === 1 ? new Response('', { status: 302, headers: { location: 'https://www.douyin.com/' } }) : new Response('<video src="https://x.douyinvod.com/wrong.mp4"></video>'));
  assert.equal(r.media, null);
});
test('different video identity is not imported', async () => {
  let calls = 0;
  const r = await readPublicVideo('https://www.douyin.com/video/123456789012345', async () => ++calls === 1 ? new Response('', { status: 302, headers: { location: 'https://www.douyin.com/video/999999999999999' } }) : new Response('<video src="https://x.douyinvod.com/wrong.mp4"></video>'));
  assert.equal(r.media, null);
});
test('untrusted redirect does not get fetched', async () => {
  let calls = 0;
  await assert.rejects(readPublicVideo('https://v.douyin.com/abc/', async () => { calls++; return new Response('', { status: 302, headers: { location: 'http://127.0.0.1/private' } }); }));
  assert.equal(calls, 1);
});
test('HTML title is never returned as transcript', async () => {
  const r = await readPublicVideo('https://www.douyin.com/video/123456789012345', async () => new Response('<title>只有标题</title>'));
  assert.equal(r.media, null); assert.equal(r.transcript, undefined);
});
test('loopback service rejects missing token, foreign Origin and arbitrary static paths', async t => {
  const f = await fixture(t, () => { throw new Error('unexpected network'); });
  assert.equal((await fetch(`${f.origin}/api/state`)).status, 403);
  assert.equal((await f.request('config', {}, { Origin: 'https://evil.example' })).status, 403);
  assert.equal((await fetch(`${f.origin}/api/profile-suggest`, { method: 'POST', headers: { 'X-Yangu-Token': f.token, 'Content-Type': 'application/json' }, body: JSON.stringify({ profile: { industry: '装修' } }) })).status, 403);
  assert.equal((await fetch(`${f.origin}/server.mjs`)).status, 403);
  const page = await fetch(f.origin); assert.equal(page.status, 200); assert.match(page.headers.get('content-security-policy'), /frame-ancestors 'none'/);
});
test('industry autofill and custom topic counts work through HTTP without consent flags', async t => {
  const bodies = [];
  const suggestion = { audience: '需要旧房改造的业主', offer: '住宅空间规划和装修服务', assumptions: ['按住宅装修推测，可修改'] };
  const outputs = [suggestion, topicFixture(3), topicFixture(3), topicFixture(1), topicFixture(1), topicFixture(20), topicFixture(20)];
  const f = await fixture(t, async (url, init) => { bodies.push(JSON.parse(init.body)); return new Response(JSON.stringify(response(outputs[bodies.length - 1]))); });
  await f.configure();
  const auto = await f.request('profile-suggest', { profile: { industry: '装修' } });
  assert.equal(auto.status, 200); assert.deepEqual(auto.data.record.result, suggestion);
  assert.equal(bodies[0].max_output_tokens, 2000); assert.equal(bodies[0].text.format.schema.properties.audience.type, 'string');
  for (const count of [3, 1, 20]) {
    const r = await f.request('topics', { count, profile: { industry: '装修', ...suggestion, aiSuggestedFields: 'audience,offer', suggestionIndustry: '装修' } });
    assert.equal(r.status, 200); assert.equal(r.data.record.input.count, count); assert.equal(r.data.record.result.topics.length, count);
    assert.ok(r.data.record.result.topics.every(row => row.sourceStatus === 'planning_hypothesis'));
  }
  assert.equal(bodies.at(-1).max_output_tokens, 32000);
  const exported = (await f.request('export')).data;
  assert.equal(exported.records.length, 4); assert.ok(!JSON.stringify(exported).includes(fakeKey));
  assert.ok(!(await readFile(path.join(f.dir, 'records.json'), 'utf8')).includes(fakeKey));
});
test('invalid counts and incomplete count results are not saved', async t => {
  let calls = 0;
  const f = await fixture(t, async () => { calls++; return new Response(JSON.stringify(response(topics))); });
  await f.configure();
  assert.equal((await f.request('topics', { count: 21, profile: { industry: '装修' } })).status, 400); assert.equal(calls, 0);
  assert.equal((await f.request('topics', { count: 3, profile: { industry: '装修' } })).status, 400); assert.equal(calls, 1);
  assert.equal((await f.request('state')).data.records.length, 0);
});
test('link research accepts explicit submission without a consent flag', async t => {
  const f = await fixture(t, async () => new Response('<title>页面只有标题</title>'));
  const r = await f.request('research-link', { url: 'https://www.douyin.com/video/123456789012345' });
  assert.equal(r.status, 200); assert.equal(r.data.status, 'needs_media_upload');
  assert.equal((await f.request('state')).data.records.length, 0);
});
test('no key means no API call and no synthetic result', async t => {
  let calls = 0; const f = await fixture(t, () => { calls++; throw new Error('unexpected'); });
  const r = await f.request('topics', { consent: true, profile: { industry: '保洁' } });
  assert.equal(r.status, 409); assert.equal(calls, 0); assert.equal((await f.request('state')).data.records.length, 0);
});
test('configuration remains only in memory, output excludes it, clear works', async t => {
  const f = await fixture(t, async () => new Response(JSON.stringify({ id: 'gpt-5.4-mini' })));
  assert.equal((await f.configure()).status, 200);
  assert.equal((await f.request('check', {})).status, 200);
  const state = await f.request('state'); assert.equal(state.data.configured, true); assert.ok(!JSON.stringify(state).includes(fakeKey));
  await f.request('config', { clear: true }); assert.equal((await f.request('state')).data.configured, false);
});
test('business profile, production and publishing drafts persist locally without AI',async t=>{
  const f=await fixture(t,()=>{throw new Error('must not call provider');});
  for(const [section,fields]of [['profile-one',{name:'测试甲',industry:'保洁',evidenceUse:'禁止使用'}],['profile-two',{name:'测试乙',industry:'家具'}],['publish-one',{title:'计划稿',scheduledAt:'2026-11-06T09:00',review:'待审核'}]]){
    const r=await f.request('workspace',{section,fields});assert.equal(r.status,200);assert.equal(r.data.localOnly,true);
  }
  const exported=(await f.request('export')).data;assert.equal(exported.records.length,0);assert.equal(exported.workspace['profile-one'].fields.industry,'保洁');assert.equal(exported.workspace['profile-two'].fields.industry,'家具');
  assert.equal(exported.workspace['publish-one'].fields.review,'待审核');
  const reloaded=await createApp({dataDir:f.dir,port:0,fetcher:()=>{throw new Error('no external');}});try{const r=await fetch(reloaded.origin+'/api/workspace',{headers:{'X-Yangu-Token':reloaded.token}}).then(r=>r.json());assert.equal(r.workspace['profile-two'].fields.name,'测试乙');}finally{await reloaded.close();}
  assert.equal((await f.request('workspace',{section:'../outside',fields:{title:'bad'}})).status,400);
  assert.equal((await f.request('workspace',{section:'good',fields:{nested:{password:'bad'}}})).status,400);
});
test('saved evidence restriction overrides stale client settings before model request',async t=>{
  let sent;
  const f=await fixture(t,async(url,init)=>{sent=JSON.parse(init.body);return new Response(JSON.stringify(response(script)));});await f.configure();
  await f.request('workspace',{section:'profile-one',fields:{name:'测试',industry:'保洁',evidenceUse:'禁止使用'}});
  const r=await f.request('script',{consent:true,topic:'选择服务',profile:{profileId:'profile-one',industry:'保洁',evidenceUse:'可用于创作',proof:'DO_NOT_SEND_THIS_CASE',personalStory:'DO_NOT_SEND_THIS_STORY'}});
  assert.equal(r.status,200);assert.ok(!JSON.stringify(sent).includes('DO_NOT_SEND_THIS'));
});
test('workspace assets and original 24-feature catalog are included',async t=>{
  const f=await fixture(t,()=>{throw new Error('no external');});
  for(const url of ['/workspace.js','/workflow-catalog.json'])assert.equal((await fetch(f.origin+url)).status,200);
  const catalog=await fetch(f.origin+'/workflow-catalog.json').then(r=>r.json());assert.equal(catalog.features.length,24);assert.equal(catalog.stages.length,5);
  const csp=(await fetch(f.origin)).headers.get('content-security-policy');assert.match(csp,/media-src 'self' blob:/);
});
test('topics-to-script HTTP workflow saves and reloads actual provider fixtures', async t => {
  const bodies = [];
  const f = await fixture(t, async (url, init) => { bodies.push(JSON.parse(init.body)); return new Response(JSON.stringify(response(bodies.length <= 2 ? topics : script))); });
  await f.configure();
  const first = await f.request('topics', { consent: true, profile: { industry: '保洁' }, webSearch: false });
  assert.equal(first.status, 200); assert.equal(first.data.record.result.topics.length, 6);
  const second = await f.request('script', { consent: true, profile: { industry: '保洁' }, topic: first.data.record.result.topics[0].title, seconds: 90 });
  assert.equal(second.status, 200); assert.equal(second.data.record.result.script, script.script);
  assert.equal(bodies[0].store, false); assert.equal(bodies[0].text.format.strict, true);
  assert.ok(!JSON.stringify(bodies).includes(fakeKey));
  const disk = await readFile(path.join(f.dir, 'records.json'), 'utf8'); assert.equal(JSON.parse(disk).length, 2); assert.ok(!disk.includes(fakeKey));
});
test('provider failures do not retry or disclose credentials', async t => {
  let calls = 0; const f = await fixture(t, async () => { calls++; return new Response(`secret ${fakeKey}`, { status: 401 }); });
  await f.configure(); const r = await f.request('topics', { consent: true, profile: { industry: '保洁' } });
  assert.equal(calls, 1); assert.equal(r.status, 502); assert.ok(!JSON.stringify(r).includes(fakeKey));
});
test('empty analysis is rejected before persistence', async t => {
  const f = await fixture(t, async () => new Response(JSON.stringify(response({ summary: '', findings: [] }))));
  await f.configure(); const r = await f.request('analyze', { consent: true, transcript: '测试原文'.repeat(20) });
  assert.equal(r.status, 400); assert.equal((await f.request('state')).data.records.length, 0);
});
test('uploaded media is passed as multipart and only text is saved', async t => {
  let called = false;
  const f = await fixture(t, async (url, init) => { assert.ok(url.endsWith('/audio/transcriptions')); assert.ok(init.body instanceof FormData); assert.equal(init.body.get('model'), 'gpt-transcribe'); called = true; return new Response(JSON.stringify({ text: '这是测试用机器转写，不能当作真实音频识别结果。' })); });
  await f.configure();
  const r = await fetch(`${f.origin}/api/transcribe`, { method: 'POST', headers: { Origin: f.origin, 'X-Yangu-Token': f.token, 'X-Filename': 'sample.mp3' }, body: Buffer.alloc(200, 1) });
  assert.equal(r.status, 200); assert.equal(called, true); const data = await r.json(); assert.equal(data.record.result.status, 'machine_transcribed_needs_review');
});
test('invalid history stops without overwriting the original', async t => {
  const dir = await mkdtemp(path.join(tmpdir(), 'yangu-history-')); t.after(() => rm(dir, { recursive: true }));
  await writeFile(path.join(dir, 'records.json'), '{}');
  await assert.rejects(createApp({ dataDir: dir, port: 0 }));
  assert.equal(await readFile(path.join(dir, 'records.json'), 'utf8'), '{}');
});
test('legacy saved topic records remain readable without the new plan fields', async t => {
  const dir = await mkdtemp(path.join(tmpdir(), 'yangu-legacy-topics-'));
  let app; t.after(async () => { if (app) await app.close(); await rm(dir, { recursive: true }); });
  const legacy = { id: 'old-topic-record', action: 'topics', input: { genre: 'all' }, result: { topics: [{ title: '旧选题甲', genre: '干货' }, { title: '旧选题乙', genre: '观点' }] } };
  await writeFile(path.join(dir, 'records.json'), JSON.stringify([legacy]));
  app = await createApp({ dataDir: dir, port: 0 });
  const state = await fetch(app.origin + '/api/state', { headers: { 'X-Yangu-Token': app.token } }).then(r => r.json());
  assert.deepEqual(state.records, [legacy]);
  assert.deepEqual(JSON.parse(await readFile(path.join(dir, 'records.json'), 'utf8')), [legacy]);
});
test('history is preserved after 100 records; export includes all', async t => {
  const f = await fixture(t, async () => { throw new Error('unexpected network'); });
  for (let i = 0; i < 101; i++) assert.equal((await f.request('save-draft', { title: `稿${i}`, script: '我自己写的测试正文' })).status, 200);
  assert.equal((await f.request('state')).data.records.length, 100);
  assert.equal((await f.request('export')).data.records.length, 101);
  assert.equal(JSON.parse(await readFile(path.join(f.dir, 'records.json'), 'utf8')).length, 101);
});
