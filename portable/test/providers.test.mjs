import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createApp } from '../server.mjs';
import { codexEnvironment, codexArgs, adaptCodexOutput, CodexError, runProcess } from '../codex-bridge.mjs';
import { adaptDeepSeek, generateWithDeepSeek } from '../deepseek-provider.mjs';
import { promptFor, SCHEMAS, TOPIC_RULES, TOPIC_PLANNING, SCRIPT_ATTENTION } from '../prompts.mjs';
import { DEPTH_RULES, editorialReviewContext } from '../editorial-methods.mjs';
import { knowledgeFor } from '../content-knowledge.mjs';
const depthFixture={familiarAnswer:'测试常见说法',insight:'测试新增判断',mechanism:'测试因果条件',evidence:'仅接口夹具',boundary:'不代表真实内容'};
const result={title:'测试稿',genre:'干货',whyShoot:'测试',script:'这是接口测试材料，不是实际模型输出。我们先核对客户的具体问题，再明确任务输入、输出标准和人工核对的要求，不能把生成成功等同于内容正确或客户成交。',conversionAction:'讨论具体问题',evidenceBasis:'测试',factChecks:[]};
const envelope={status:'completed',model:'fixture',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(result)}]}]};
const input={consent:true,topic:'企业AI怎样落地',profile:{industry:'AI培训'},seconds:60};
test('knowledge scripts require a concrete demonstration; other genres use separate logic',()=>{const knowledge=promptFor('script',{...input,genre:'干货'});assert.match(knowledge,/具体示范/);assert.match(knowledge,/如何检查结果/);assert.match(knowledge,/唯一中心问题/);assert.match(knowledge,/不能替代答案/);const story=promptFor('script',{...input,genre:'故事'});assert.match(story,/真实人物/);assert.doesNotMatch(story,/至少展开一个与选题直接相关/);});
test('autofill prompt preserves existing details and topic prompt honors count and provenance',()=>{
  const suggestion=promptFor('profile-suggest',{profile:{industry:'装修',audience:'二手房业主'}});
  assert.match(suggestion,/原样保留/);assert.match(suggestion,/不编造从业年限/);assert.match(suggestion,/合理假设/);
  const selected=promptFor('topics',{count:3,profile:{industry:'装修',aiSuggestedFields:'offer'}});
  assert.match(selected,/恰好3个/);assert.match(selected,/建议而非已核实事实/);assert.match(selected,/sourceUrls全部为空/);
});
test('four topic genres define different attention and value mechanisms',()=>{
  assert.deepEqual(Object.keys(TOPIC_RULES),['干货','观点','故事','记录过程']);
  assert.match(TOPIC_RULES['干货'],/示范\/对照\/判断/);assert.match(TOPIC_RULES['干货'],/收藏价值/);
  assert.match(TOPIC_RULES['观点'],/明确可讨论的判断/);assert.match(TOPIC_RULES['观点'],/合理例外/);assert.match(TOPIC_RULES['观点'],/不能把.*教程换个观点标签/);
  assert.match(TOPIC_RULES['故事'],/目标、受阻、关键选择/);assert.match(TOPIC_RULES['故事'],/没有事件.*待采集/);assert.match(TOPIC_RULES['故事'],/不能虚构/);
  assert.match(TOPIC_RULES['记录过程'],/真实动作、遇到的阻碍、调整/);assert.match(TOPIC_RULES['记录过程'],/待拍计划/);assert.match(TOPIC_RULES['记录过程'],/不能预先写成功结果/);
});
test('topic planning screens weak angles before hooks and never predicts virality',()=>{
  assert.match(TOPIC_PLANNING,/改变核心问题、判断或事件/);
  assert.match(TOPIC_PLANNING,/不是只换标题字眼/);
  assert.match(TOPIC_PLANNING,/可演示或有材料支持的新信息/);
  assert.match(TOPIC_PLANNING,/淘汰重做，先改问题与角度/);
  assert.match(TOPIC_PLANNING,/再写正文推进，最后写标题和开头/);
  assert.match(TOPIC_PLANNING,/不要写播放量、爆款概率、算法偏爱或保证获客/);
  assert.doesNotMatch(TOPIC_PLANNING,/100%|百分之百|必爆/);
});
test('topics distinguish knowledge, angle, title and opening before writing packaging',()=>{
  for (const term of ['知识点是','选题角度是','标题是','开头是']) assert.ok(TOPIC_PLANNING.includes(term));
  assert.match(TOPIC_PLANNING,/不能把知识点换成问句/);
  assert.match(TOPIC_PLANNING,/不能先起刺激标题/);
});
test('topic audience follows the actual customer and never defaults to the presenter role',()=>{
  assert.match(TOPIC_PLANNING,/profile\.audience/);
  assert.match(TOPIC_PLANNING,/不能因为出镜者是老板/);
  assert.match(SCRIPT_ATTENTION,/出镜者的职业身份不决定听众/);
});
test('topic fields require content discoveries and real payoff rather than post-hoc hook labels',()=>{
  const p=promptFor('topics',{genre:'干货',count:2,profile:{industry:'美业'}});
  assert.match(p,/事后圆说/);
  assert.match(p,/payoff直接写.*实际答案/);
  assert.match(p,/至少一项用明确的对照\/演示\/真实材料/);
  assert.match(p,/没提供访谈原话就不冒充真实引语/);
});
test('creative variety permits positive curiosity while retaining evidence limits',()=>{
  assert.match(TOPIC_PLANNING,/明确愿望、日常反常、意外便利/);
  assert.match(TOPIC_PLANNING,/同批不能全部靠劝阻句/);
  assert.match(TOPIC_PLANNING,/不能预编/);
  assert.match(SCRIPT_ATTENTION,/同一个观众问号和实际发现/);
  assert.match(SCRIPT_ATTENTION,/正文要把它讲出来/);
});
test('topic structure builds concrete content before extracting its title',()=>{
  const fields=Object.keys(SCHEMAS.topics.properties.topics.items.properties);
  assert.ok(fields.indexOf('customerProblem') < fields.indexOf('plan'));
  assert.ok(fields.indexOf('plan') < fields.indexOf('title'));
  assert.equal(Object.keys(SCHEMAS.topics.properties.topics.items.properties.plan.properties)[0],'depth');
  assert.match(TOPIC_PLANNING,/不要把最有意思的内容藏在正文里/);
  assert.match(TOPIC_PLANNING,/同批逐对比较实际交付/);
  assert.match(TOPIC_PLANNING,/不能把所有干货写成审核和防错/);
});
test('topic prompts keep every requested item in the one selected genre',()=>{
  const profile={industry:'企业AI培训'};
  const defaultPrompt=promptFor('topics',{profile,count:3});
  assert.match(defaultPrompt,/全部必须是干货/);assert.match(defaultPrompt,/恰好3个/);
  assert.doesNotMatch(defaultPrompt,/均衡|每类至少一条|类型不得重复/);
  for(const genre of Object.keys(TOPIC_RULES)){
    const single=promptFor('topics',{profile,count:2,genre,materials:'这是用户提供的待核实素材'});
    assert.ok(single.includes(`全部必须是${genre}`));assert.match(single,/恰好2个/);
    assert.match(single,/"materials":"这是用户提供的待核实素材"/);
  }
});
test('script attention turns selected topic plans into a continuous payoff rather than labels',()=>{
  assert.match(SCRIPT_ATTENTION,/将其中的开头、持续观看理由、正文推进和回报落实为内容/);
  assert.match(SCRIPT_ATTENTION,/不把这些分析标签念出来/);
  assert.match(SCRIPT_ATTENTION,/当前选定类型优先/);
  assert.match(SCRIPT_ATTENTION,/第一段尽早兑现/);
  assert.match(SCRIPT_ATTENTION,/结尾确实回答开头的问题/);
  assert.match(SCRIPT_ATTENTION,/不能用.*编造证明/);
  assert.match(SCRIPT_ATTENTION,/不咨询的人也有收获/);
  const drafted=promptFor('script',{...input,genre:'观点',materials:'尚在进行中的真实记录'});
  assert.ok(drafted.includes(SCRIPT_ATTENTION));
  assert.match(drafted,/不可从选题策划反推发生过真实事件/);
});
test('Codex and DeepSeek accept the same restricted business suggestion schema',()=>{
  const suggestion={audience:'有住宅装修需求的业主',offer:'空间规划和装修服务建议',assumptions:['按住宅服务推测']};
  assert.doesNotThrow(()=>adaptCodexOutput(JSON.stringify(suggestion),'{"type":"turn.completed"}','profile-suggest'));
  assert.doesNotThrow(()=>adaptDeepSeek('profile-suggest',{choices:[{finish_reason:'stop',message:{content:JSON.stringify(suggestion)}}]}));
  assert.throws(()=>adaptCodexOutput(JSON.stringify({...suggestion,experience:'虚构年限'}),'{"type":"turn.completed"}','profile-suggest'));
});
test('DeepSeek autofill uses a small fast request; 20 topics receive enough output budget',async()=>{
  const suggestion={audience:'住宅业主',offer:'装修服务',assumptions:['行业建议']};let sent;
  const fetcher=async(url,init)=>{assert.equal(url,'https://api.deepseek.com/chat/completions');sent=JSON.parse(init.body);return new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify(suggestion)}}]}));};
  await generateWithDeepSeek('profile-suggest',{profile:{industry:'装修'}},{key:'fixture-not-real',model:'deepseek-flash',fetcher});
  assert.equal(sent.thinking.type,'disabled');assert.equal(sent.reasoning_effort,undefined);assert.equal(sent.max_tokens,2000);
  const fixtureTopics={topics:Array.from({length:20},(_,i)=>({title:`测试${i}`,genre:'干货',customerProblem:'测试',whyShoot:'测试',opening:'测试',conversionAction:'测试',evidenceBasis:'测试',sourceUrls:[],plan:{depth:depthFixture,hookReason:'具体问题',watchReason:'逐步展开',payoff:'可照用结果',engagementReason:'保存参考',shootingApproach:'固定口播',contentBeats:['问题','示范','结果'],materialNeeds:[]}})),assumptions:[],missingInfo:[]};
  await generateWithDeepSeek('topics',{profile:{industry:'装修'},count:20},{key:'fixture-not-real',model:'deepseek-flash',fetcher:async(url,init)=>{sent=JSON.parse(init.body);return new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify(fixtureTopics)}}]}));}});
  assert.equal(sent.max_tokens,36000);assert.equal(sent.thinking.type,'enabled');
});
async function fixture(t,options={}) { const dir=await mkdtemp(path.join(tmpdir(),'yangu-provider-'));const app=await createApp({dataDir:dir,port:0,...options});t.after(async()=>{await app.close();await rm(dir,{recursive:true});});return {...app,dir,request:async(endpoint,body)=>{const r=await fetch(app.origin+'/api/'+endpoint,{method:body===undefined?'GET':'POST',headers:{'X-Yangu-Token':app.token,...(body===undefined?{}:{Origin:app.origin,'Content-Type':'application/json'})},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,data:await r.json()};}}; }
test('Codex is default and both writing passes never call an API',async t=>{let calls=0;const f=await fixture(t,{fetcher:()=>{throw Error('API forbidden')},codexCheck:async()=>({ready:true,note:'test'}),codexRunner:async()=>{calls++;return envelope;}});assert.equal((await f.request('state')).data.provider,'codex');await f.request('check',{});const r=await f.request('script',input);assert.equal(r.status,200);assert.equal(calls,2);assert.equal(r.data.record.provider,'codex');assert.equal(r.data.record.editorialPasses,2);assert.equal((await f.request('state')).data.records.length,1);});
test('Codex failure does not fall back to an already configured API key',async t=>{let apiCalls=0;const f=await fixture(t,{fetcher:()=>{apiCalls++},codexRunner:async()=>{throw new CodexError('test quota','codex_quota',429)}});await f.request('config',{provider:'api',key:'sk-test-only-not-a-secret',model:'test',audioModel:'test'});await f.request('config',{provider:'codex'});const r=await f.request('script',input);assert.equal(r.status,429);assert.equal(apiCalls,0);const state=(await f.request('state')).data;assert.equal(state.busy,false);assert.equal(state.records.length,0);});
test('child environment excludes credentials and config denies writing tools',()=>{const env=codexEnvironment({HOME:'/test',PATH:'/bin',OPENAI_API_KEY:'secret',DEEPSEEK_API_KEY:'secret',CODEX_API_KEY:'secret',OTHER_SECRET:'secret'});assert.deepEqual(env,{PATH:'/bin',HOME:'/test'});const args=codexArgs('/schema','/output','/tmp');assert.ok(args.includes('--ignore-user-config'));assert.ok(args.includes('read-only'));assert.ok(args.includes('features.shell_tool=false'));assert.ok(args.includes('features.plugins=false'));assert.ok(args.includes('forced_login_method="chatgpt"'));assert.equal(args.at(-1),'-');});
test('Codex output requires complete event and matching shape; tool results rejected',()=>{assert.doesNotThrow(()=>adaptCodexOutput(JSON.stringify(result),' {"type":"turn.completed"}\n','script'));assert.throws(()=>adaptCodexOutput('{}','{"type":"turn.completed"}','script'));assert.throws(()=>adaptCodexOutput(JSON.stringify(result),'','script'));assert.throws(()=>adaptCodexOutput(JSON.stringify(result),' {"type":"item.completed","item":{"type":"command_execution"}}\n{"type":"turn.completed"}','script'));});
test('Codex timeout terminates process without returning raw errors',async()=>{await assert.rejects(runProcess({command:process.execPath,prefix:[]},['-e','setTimeout(()=>{},10000)'],{timeout:25}),e=>e.code==='codex_timeout');});
test('recoverable stream warning only succeeds with completed turn and valid output',()=>{assert.doesNotThrow(()=>adaptCodexOutput(JSON.stringify(result),'{"type":"error","message":"reconnecting"}\n{"type":"turn.completed"}','script'));assert.throws(()=>adaptCodexOutput(JSON.stringify(result),'{"type":"error"}','script'));assert.throws(()=>adaptCodexOutput(JSON.stringify(result),'{"type":"turn.failed"}\n{"type":"turn.completed"}','script'));});
test('cancelled text task clears busy without saving',async t=>{const f=await fixture(t,{codexRunner:async(a,i,{signal})=>new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(new CodexError('cancel','codex_cancelled',499)),{once:true}))});const pending=f.request('script',input);for(let i=0;i<30;i++){if((await f.request('state')).data.busy)break;await new Promise(r=>setTimeout(r,5));}await f.request('cancel',{});assert.equal((await pending).status,499);const state=(await f.request('state')).data;assert.equal(state.busy,false);assert.equal(state.records.length,0);});
test('DeepSeek uses only official endpoint, own credential, valid JSON and no secret persistence',async t=>{const key='test-deepseek-key-not-real';let calls=0;const f=await fixture(t,{fetcher:async(url,init)=>{calls++;assert.match(url,/^https:\/\/api\.deepseek\.com\/(models|chat\/completions)$/);assert.equal(init.headers.Authorization,'Bearer '+key);if(url.endsWith('/models'))return new Response(JSON.stringify({data:[{id:'deepseek-flash'}]}));const body=JSON.parse(init.body);assert.equal(body.response_format.type,'json_object');assert.match(body.messages[0].content,/JSON/);return new Response(JSON.stringify({model:'deepseek-flash',choices:[{finish_reason:'stop',message:{content:JSON.stringify(result)}}]}));}});assert.equal((await f.request('config',{provider:'deepseek',deepseekKey:key,deepseekModel:'deepseek-flash'})).status,200);assert.equal((await f.request('check',{})).status,200);const r=await f.request('script',input);assert.equal(r.status,200);assert.equal(r.data.record.provider,'deepseek');assert.equal(calls,3);assert.ok(!JSON.stringify((await f.request('export')).data).includes(key));assert.ok(!(await readFile(path.join(f.dir,'records.json'),'utf8')).includes(key));await f.request('config',{clear:true,provider:'deepseek'});assert.equal((await f.request('script',input)).status,409);});
test('depth rules require a new judgment with evidence and a boundary, not more jargon',()=>{
  for(const key of Object.keys(depthFixture)) assert.ok(DEPTH_RULES.includes(key));
  assert.match(DEPTH_RULES,/三句话换着说同一个意思只算一个信息点/);
  assert.match(DEPTH_RULES,/观点中的事实同样要有依据/);
  const p=promptFor('script',{...input,genre:'干货',knowledge:knowledgeFor({industry:'美甲'})});
  assert.match(p,/Nailympia/);assert.match(p,/不是所有门店必须遵守/);
  assert.match(p,/不能把写作方法来源当行业证据|不是本次联网搜索/);
});
test('second-pass prompt contains the draft only once and retains the selected topic',()=>{
  assert.equal(editorialReviewContext({}), '');
  const p=promptFor('script',{...input,genre:'干货',editorialDraft:{script:'唯一初稿标记'},editorialSources:[]});
  assert.equal(p.split('唯一初稿标记').length,2);
  assert.match(p,/第二轮内容编辑/);assert.match(p,/不能擅自换题/);assert.match(p,/最薄的地方/);
});
test('portable packaging includes every new runtime module and the MIT notices',async()=>{
  const build=await readFile(new URL('../build-portable.mjs',import.meta.url),'utf8');
  for(const file of ['editorial-methods.mjs','content-knowledge.mjs','THIRD_PARTY_NOTICES.txt']) assert.ok(build.includes(`'${file}'`));
  const notice=await readFile(new URL('../THIRD_PARTY_NOTICES.txt',import.meta.url),'utf8');
  assert.match(notice,/Copyright \(c\) 2026 隐拾三月/);assert.match(notice,/Copyright \(c\) 2026 chengkj99/);assert.match(notice,/MIT License/);
});
test('DeepSeek balance error does not retry, leak upstream or create history',async t=>{let calls=0;const f=await fixture(t,{fetcher:async()=>{calls++;return new Response('secret upstream',{status:402})}});await f.request('config',{provider:'deepseek',deepseekKey:'test-fixture-key-only',deepseekModel:'deepseek-flash'});const r=await f.request('script',input);assert.equal(calls,1);assert.equal(r.data.code,'deepseek_402');assert.ok(!JSON.stringify(r).includes('secret upstream'));assert.equal((await f.request('state')).data.records.length,0);});
test('DeepSeek incomplete, blank and malformed JSON output is rejected',()=>{for(const content of ['', ' ', '{}', 'not JSON'])assert.throws(()=>adaptDeepSeek('script',{choices:[{finish_reason:'stop',message:{content}}]}));assert.throws(()=>adaptDeepSeek('script',{choices:[{finish_reason:'length',message:{content:JSON.stringify(result)}}]}));});
test('unsupported search and audio cannot silently use another provider',async t=>{let calls=0;const f=await fixture(t,{fetcher:()=>{calls++}});await f.request('config',{provider:'deepseek',deepseekKey:'test-fixture-key-only',deepseekModel:'deepseek-flash'});const r=await f.request('topics',{consent:true,profile:{industry:'保洁'},webSearch:true});assert.equal(r.data.code,'deepseek_search_unavailable');assert.equal(calls,0);});
