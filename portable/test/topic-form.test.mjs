import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { mergeSuggestions, clearStaleSuggestions, topicCount, topicReference, sameProfileContext, writingContextChanged } from '../public/topic-form.mjs';

test('saving fields on the same customer preserves the writing context', () => {
  const previous = { profileId:'a', industry:'装修', region:'杭州' };
  assert.equal(writingContextChanged(previous, { profileId:'a', industry:'装修', region:'宁波' }, {saving:true}), false);
  assert.equal(writingContextChanged(previous, { profileId:'a', industry:' 装修 ' }), false);
  assert.equal(writingContextChanged(null, previous), false);
});
test('first save assigns a customer ID without discarding its in-progress writing', () => {
  assert.equal(writingContextChanged({profileId:'',industry:'装修'}, {profileId:'a',industry:'装修'}, {saving:true}), false);
  assert.equal(writingContextChanged({profileId:'',industry:'装修'}, {profileId:'a',industry:'装修'}), true);
});
test('actual customer and industry changes still invalidate writing material', () => {
  const previous = {profileId:'a',industry:'装修'};
  assert.equal(writingContextChanged(previous, {profileId:'b',industry:'装修'}), true);
  assert.equal(writingContextChanged(previous, {profileId:'a',industry:'餐饮'}, {saving:true}), true);
  assert.equal(writingContextChanged(previous, {profileId:'',industry:''}), true);
  assert.equal(writingContextChanged(previous, {profileId:'b',industry:'装修'}, {saving:true}), true);
});
test('field restoration and profile save use the writing-context guard', async () => {
  const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  const workspace = await readFile(new URL('../public/workspace.js', import.meta.url), 'utf8');
  assert.match(app, /if \(writingContextChanged\(activeWritingContext, nextContext, context\)\)/);
  assert.doesNotMatch(app, /if \(clear\) \{ \$\('topic-materials'\)/);
  assert.match(workspace, /restoreProfile\(generationProfile\(values\),true,\{profileId,saving:true\}\)/);
});

test('AI fills empty fields but never overwrites a manual value', () => {
  const current = { industry: '装修', audience: '我自己的客户', offer: '' };
  const r = mergeSuggestions(current, { audience: '推荐人群', offer: '推荐服务' }, '装修');
  assert.deepEqual(r.fields, { industry: '装修', audience: '我自己的客户', offer: '推荐服务' });
  assert.deepEqual(r.added, { offer: '推荐服务' });
  assert.equal(current.offer, '');
});

test('event materials from another profile are not treated as current customer facts', () => {
  assert.equal(sameProfileContext({industry:'装修',profileId:'a'},{industry:'装修',profileId:'b'}),false);
  assert.equal(sameProfileContext({industry:'装修',profileId:'a'},{industry:'装修',profileId:'a'}),true);
  assert.equal(sameProfileContext({industry:'装修',audience:'个人'},{industry:'装修',audience:'企业'}),false);
  assert.equal(sameProfileContext({industry:'装修',profileId:'a'},{industry:'餐饮',profileId:'a'}),false);
});
test('outdated AI response is not applied to another industry', () => {
  const current = { industry: '餐饮', audience: '', offer: '' };
  assert.deepEqual(mergeSuggestions(current, { audience: '装修客户', offer: '装修服务' }, '装修').added, {});
});
test('changing industry clears untouched suggestions and preserves manual revisions', () => {
  const r = clearStaleSuggestions({ industry: '餐饮', audience: '旧建议', offer: '已手改服务' }, '装修', { audience: '旧建议', offer: '旧服务' });
  assert.deepEqual(r.fields, { industry: '餐饮', audience: '', offer: '已手改服务' });
  assert.deepEqual(r.suggested, {});
});
test('same industry preserves suggested context', () => {
  const current = { industry: '装修', audience: '建议客户', offer: '建议服务' }, suggested = { audience: '建议客户' };
  assert.deepEqual(clearStaleSuggestions(current, '装修', suggested), { fields: current, suggested });
});
test('topic count accepts whole numbers 1–20 and rejects missing or invalid values', () => {
  for (const value of ['1', '3', '6', '20']) assert.equal(topicCount(value), Number(value));
  for (const value of ['', ' ', '0', '-1', '21', '2.5', 'abc']) assert.throws(() => topicCount(value), /1–20/);
});
test('topic UI has no repeated consent gate and exposes autofill plus count', async () => {
  const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
  const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  assert.doesNotMatch(html + app, /id="consent"|consent\(\)|请先勾选资料处理/);
  assert.match(html, /id="fill-profile"/);
  assert.match(html, /id="topic-count"[^>]+min="1" max="20"/);
  assert.match(app, /count, genre: topicGenre\(\), materials:/);
  assert.match(app, /topic-draft/);
});

test('only four genres are selectable and details are collapsed by default', async () => {
  const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
  const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  assert.equal((html.match(/name="topic-genre"/g) || []).length, 4);
  for (const value of ['干货','观点','故事','记录过程']) assert.ok(html.includes('name="topic-genre" value="' + value + '"'));
  assert.ok(!html.includes('均衡搭配'));
  assert.ok(!html.includes('name="topic-genre" value="all"'));
  assert.ok(html.includes('name="topic-genre" value="干货" checked'));
  assert.ok(app.includes('[value="干货"]'));
  assert.match(app, /node\('details', null, 'topic-detail'\)/);
  assert.doesNotMatch(app, /detail\.open\s*=\s*true/);
  assert.match(app, /detail\.append\(body\)/);
  assert.match(html, /id="script-materials"/);
  assert.match(app, /setTopicGenre\(draft\.genre/);
});
test('script receives the full selected idea, opening and viewing payoff', () => {
  const topic = {title:'具体问题',genre:'观点',customerProblem:'客户处境',whyShoot:'业务原因',opening:'开场原句',conversionAction:'相关咨询',evidenceBasis:'本次材料',sourceUrls:[],
    plan:{hookReason:'具体停留理由',watchReason:'尚待解答的疑问',payoff:'最后交付的判断',engagementReason:'转给同事的理由',shootingApproach:'口播及选择原因',contentBeats:['第一步信息','第二步原因','第三步验证'],materialNeeds:['待补事实']}};
  const reference = topicReference(topic);
  for (const value of ['具体问题','开场原句','具体停留理由','尚待解答的疑问','最后交付的判断','第二步原因','待补事实','不是发生过的真实案例']) assert.ok(reference.includes(value));
  assert.doesNotThrow(() => topicReference({...topic,plan:undefined}));
  const deep=topicReference({...topic,plan:{...topic.plan,depth:{familiarAnswer:'常见说法',insight:'新增判断',mechanism:'具体原因',evidence:'可追溯材料',boundary:'实际例外'}}});
  for(const value of ['常见说法','新增判断','具体原因','可追溯材料','实际例外']) assert.ok(deep.includes(value));
});
