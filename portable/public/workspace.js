// The portable shell preserves the original workbench's 13 navigation windows.
// Deferred capabilities save local planning drafts; they never claim execution.
export const NAV = [
  ['日常创作', [['dashboard', '开始工作'], ['topics', '找选题'], ['script', '写脚本'], ['production', '做视频'], ['publish', '审核发布'], ['analytics', '看反馈']]],
  ['资料与研究工具', [['clients', 'IP 与业务资料'], ['research', '博主研究与视频拆解'], ['business', '变现与承接'], ['connections', '平台与模型']]],
  ['使用说明与内部维护', [['workflow', '流程总览'], ['rules', '素材、技能与记忆'], ['audit', '测试与问题清单'], ['history', '历史与导出']]],
];
export const EXTRA_VIEWS = {dashboard:'工作台',clients:'IP 与业务资料',production:'制作与智能剪辑',publish:'审核与定时发布',analytics:'数据复盘',business:'变现与承接',connections:'平台与模型',workflow:'流程总览',rules:'素材、技能与记忆',audit:'测试与问题清单'};
const IP_GROUPS = [
  ['身份与行业', [['name','品牌 / IP 名称'],['role','你的角色'],['industry','所属行业'],['niche','细分行业'],['experience','从业起始年份 / 年限'],['region','服务地区']]],
  ['产品与业务', [['offer','主推产品或服务','text'],['outcome','客户购买后获得什么变化','text'],['delivery','交付方式与周期'],['price','价格范围 / 成交方式'],['boundaries','不能承诺的内容','text']]],
  ['客户与问题', [['audience','希望吸引的客户'],['scenario','客户遇到问题时的具体场景','text'],['customerPain','客户最常问、最担心什么','text'],['desiredChange','客户想要的变化'],['alternatives','客户目前怎么解决'],['criteria','客户选择服务的标准']]],
  ['真实经历与案例', [['differentiation','你独有的经验与优势','text'],['personalStory','本人真实经历','text'],['proof','真实案例 / 本人原话','text'],['caseStatus','案例核验与授权状态'],['evidenceUse','证据可用范围',['待确认','可用于创作','仅匿名后可用','仅内部留存','禁止使用']],['anonymizedProof','已去掉身份信息的案例（仅匿名时使用）','text']]],
  ['表达与拍摄', [['style','说话习惯与语气'],['avoid','不希望出现的表达','text'],['form','常用拍摄形式',['固定口播','Vlog / 现场跟拍','录屏教程','混合型']],['resources','现有人员、设备和拍摄条件','text']]],
  ['内容目标与承接', [['goal','本阶段唯一优先目标',['获客','流量','变现']],['cta','希望观众完成的一步'],['owner','咨询承接人'],['approver','最终审核人'],['reviewPolicy','人工审核要求','text']]],
  ['公开资料研究范围', [['researchPermission','是否允许研究公开资料',['暂不允许','允许按下方范围研究']],['website','官网链接'],['platforms','官方账号链接','text'],['researchScope','允许研究的范围','text']]],
];
const FORMS = {
  production: { title: '视频制作任务', note: '仅保存制作方案，自动剪辑未接入。素材仅本机预览。', fields: [['title','任务名称'],['script','已确认的口播正文','text'],['form','拍摄形式',['固定口播','Vlog / 现场跟拍','录屏教程','混合型']],['footage','素材清单 / 本机文件位置','text'],['broll','哪里需要 B-roll / 动画说明','text'],['editing','剪辑逻辑','text'],['captions','字幕 / 画幅 / 声音要求','text']], tabs: ['任务与素材','理解与剪辑','B-roll 与动画','字幕与成片'], action: '保存制作方案' },
  publish: { title: '发布准备与人工审核', note: '仅保存草稿，不执行上传或定时发布。', fields: [['title','发布标题'],['subtitle','封面小标题'],['description','作品简介与话题','text'],['platform','目标平台',['抖音','小红书','视频号']],['account','目标账号（待授权）'],['file','待发布成片文件位置'],['scheduledAt','计划发布时间','datetime-local'],['review','人工审核状态',['待审核','需修改','人工确认通过（尚未发布）']],['reviewer','审核人'],['notes','审核意见 / 权利与事实核验','text']], tabs: ['作品与标题','人工审核','计划发布'], action: '保存发布草稿（不执行）' },
  analytics: { title: '单条作品复盘表', note: '手工录入，未知数据留空。', fields: [['url','作品链接'],['date','统计日期','date'],['period','观察周期',['2 小时','24 小时','72 小时','7 天']],['platform','平台',['抖音','小红书','视频号']],['version','内容版本'],['views','播放量','number'],['likes','点赞数','number'],['commentsCount','评论数','number'],['saves','收藏数','number'],['profileVisits','主页访问量','number'],['leads','明确咨询数','number'],['qualifiedLeads','有效线索数','number'],['deals','已核实成交数','number'],['comments','有价值的原始评论与作者回复','text'],['insights','你的观察 / 仍待确认','text'],['decision','复盘决定',['证据不足','保留','放大','单变量重测','停止']],['next','下一条怎么改','text']], action: '保存本条复盘' },
  business: { title: '业务承接方案', note: '仅保存方案，不自动联系客户。', fields: [['offer','主推服务与适合人群','text'],['problem','客户愿意付费解决的问题','text'],['proof','可公开的真实证明','text'],['cta','唯一下一步动作'],['handoff','由谁承接 / 如何跟进','text'],['qualify','客户筛选标准','text'],['boundaries','不能承诺、不能采集的信息','text']], action: '保存承接方案' },
  rules: { title: '素材与方法笔记', note: '笔记暂不自动用于生成；可复制到脚本参考材料。', fields: [['title','笔记 / 素材名称'],['category','分类',['账号事实','选题来源规则','口播写作标准','拆解模式库','剪辑审美样例','回复知识库','外部资料学习台账']],['source','资料来源链接 / 本机位置'],['rights','使用许可与范围'],['content','方法正文 / 素材说明','text'],['limitations','使用条件与不适用情况','text']], action: '保存知识笔记' },
  audit: { title: '记录一个待解决问题', note: '勿填写密钥、Cookie 或密码。', fields: [['title','问题名称'],['module','发生在哪个窗口'],['steps','怎样出现 / 预期表现','text'],['actual','实际表现 / 证据位置','text'],['priority','优先级',['影响明天演示','后续接入','体验改进']],['status','处理状态',['待处理','处理中','已复测通过']]], action: '保存问题' },
};
const STATUS = [
  ['IP 与业务资料','clients','本机可用','多档案、跳过访谈、保存与切换，带入选题和正文'],
  ['找选题 / 写脚本','topics','AI 生成','真实模型与可选联网检索已接线；密钥由你配置'],
  ['博主研究与视频拆解','research','部分可用','原文导入可用；上传转写需 API，链接受平台开放程度限制'],
  ['制作与智能剪辑','production','方案窗口','可准备并保存；动画、自动剪辑与成片导出待接入'],
  ['审核与定时发布','publish','草稿窗口','可保存审核与发布时间；未接平台，不执行发布'],
  ['看反馈 / 数据复盘','analytics','手工可用','填写真实指标与评论，后台自动回流待接入'],
  ['三平台账号连接','connections','待接入','无二维码、无持久登录、无自动评论采集'],
];
export function mountWorkspace({ $, node, api, notice, show, restoreProfile, getProfile, getRecords }) {
  const main = document.querySelector('main');
  const nav = document.querySelector('nav'); nav.replaceChildren();
  for (const [group, items] of NAV) { nav.append(node('p', group)); for (const [id, label] of items) { const b = node('button', label, 'nav'); b.dataset.view = id; b.addEventListener('click', () => show(id)); nav.append(b); } }
  let workspace = {}, profileId = ''; const dirty = new Set();
  const panels = {};
  for (const id of Object.keys(EXTRA_VIEWS)) { const el = node('section', null, 'view'); el.id = `view-${id}`; el.hidden = true; main.append(el); panels[id] = el; }
  const goButton = (label, target, cls = 'secondary') => { const b = node('button', label, cls); b.addEventListener('click', () => show(target)); return b; };
  const statusGrid = parent => { const grid = node('div', null, 'module-grid'); for (const [label, id, status, detail] of STATUS) { const c = node('article', null, 'card module-card'); c.append(node('span', status, 'status-tag'), node('h3', label), goButton('打开窗口 →', id)); grid.append(c); } parent.append(grid); };
  const save = async (section, fields) => { const { entry } = await api('workspace', { section, fields }); workspace[section] = entry; return entry; };
  const makeField = (prefix, spec) => { const [key, title, kind] = spec; const label = node('label', title); let input;
    if (Array.isArray(kind)) { input = node('select'); for (const option of kind) { const o = node('option', option); o.value = option; input.append(o); } }
    else if (kind === 'text') { input = node('textarea'); input.rows = 4; input.maxLength = 6000; }
    else { input = node('input'); input.type = kind || 'text'; if (kind === 'number') { input.min = '0'; input.step = '1'; } else input.maxLength = 1500; }
    input.id = `${prefix}-${key}`; input.dataset.field = key; input.addEventListener('input', () => { dirty.add(prefix); }); label.append(input); return label; };
  const fieldsFrom = el => Object.fromEntries([...el.querySelectorAll('[data-field]')].map(i => [i.dataset.field, i.value]));
  const fill = (el, fields = {}) => { for (const input of el.querySelectorAll('[data-field]')) input.value = fields[input.dataset.field] ?? (input.tagName === 'SELECT' ? input.options[0].value : ''); };
  const profileBar = node('div', null, 'card profile-toolbar');
  const profileSelect = node('select'); profileSelect.id = 'profile-select'; profileSelect.setAttribute('aria-label', '选择老板或客户资料');
  const newProfile = node('button','新建资料','secondary'), skip = goButton('跳过访谈，直接找选题 →','topics');
  profileBar.append(node('span','当前资料','label'), profileSelect, newProfile, skip); panels.clients.append(profileBar);
  const ip = node('div', null, 'card'); ip.id = 'ip-form'; ip.append(node('h2','老板 / IP 业务档案'),node('p','行业必填，其余资料可稍后补充。本机保存。','hint'));
  IP_GROUPS.forEach(([title, specs], index) => { const details = node('details',null,'profile-group'); details.open = index === 0; details.append(node('summary',`${index+1}. ${title}`)); const grid = node('div',null,'form-grid'); for (const spec of specs) grid.append(makeField('ip',spec)); details.append(grid); ip.append(details); });
  const ipActions = node('div',null,'button-row'); const saveIP = node('button','保存资料并用于创作','primary'), discardIP = node('button','恢复已保存资料','secondary'), copyIP = node('button','复制业务简报','secondary');
  ipActions.append(saveIP,discardIP,copyIP); ip.append(ipActions); const ipStatus = node('p','未保存 · 建档可跳过','hint'); ip.append(ipStatus); panels.clients.append(ip);
  function generationProfile(p) { const allowed = p.evidenceUse === '可用于创作'; return { ...p, proof: allowed ? p.proof : p.evidenceUse === '仅匿名后可用' ? p.anonymizedProof : '', personalStory: allowed ? p.personalStory : '', style: [p.style, p.avoid && `避免：${p.avoid}`].filter(Boolean).join('；'), offer: [p.offer,p.outcome,p.delivery].filter(Boolean).join('；'), audience: [p.audience,p.scenario].filter(Boolean).join('；') }; }
  function populateProfiles() { profileSelect.replaceChildren(); profileSelect.append(node('option','新资料（尚未保存）')); profileSelect.options[0].value=''; for (const [id, entry] of Object.entries(workspace)) if (id.startsWith('profile-')) { const o = node('option',entry.fields.name || entry.fields.industry || '未命名资料'); o.value=id; profileSelect.append(o); } profileSelect.value=profileId; }
  function chooseProfile(id) { profileId=id; const entry=workspace[id]; fill(ip,entry?.fields); restoreProfile(entry ? generationProfile(entry.fields) : {} , true, {profileId:id}); ipStatus.textContent=entry ? `本机保存于 ${new Date(entry.updatedAt).toLocaleString('zh-CN')} · 不是云端同步` : '新资料 · 尚未保存'; dirty.delete('ip'); populateProfiles(); }
  newProfile.addEventListener('click', async () => { if (dirty.has('ip') && !confirm('当前有未保存输入，确定新建？原已保存资料会保留。')) return; try { await save('current-profile',{id:''}); chooseProfile(''); } catch(e){notice(e.message,'error');} });
  profileSelect.addEventListener('change', async () => { const id=profileSelect.value; if(dirty.has('ip') && !confirm('切换将丢弃未保存输入，继续吗？')) { profileSelect.value=profileId; return; } chooseProfile(id); try { await save('current-profile',{id}); } catch(e){notice(e.message,'error');} });
  saveIP.addEventListener('click',async()=>{ try { const values=fieldsFrom(ip); if(!values.industry.trim()) throw new Error('请先填写行业，或跳过建档直接浏览其他窗口。'); profileId ||= `profile-${crypto.randomUUID()}`; const entry=await save(profileId,values); await save('current-profile',{id:profileId}); restoreProfile(generationProfile(values),true,{profileId,saving:true}); dirty.delete('ip'); populateProfiles(); ipStatus.textContent=`本机保存于 ${new Date(entry.updatedAt).toLocaleString('zh-CN')}`; notice('业务资料已保存并带入选题、脚本；未授权或仅内部留存的案例不会带入模型。'); } catch(e){notice(e.message,'error');} });
  discardIP.addEventListener('click',()=>{if(confirm('恢复该档案最近保存的版本？未保存的填写将丢弃。')) chooseProfile(profileId);});
  copyIP.addEventListener('click',async()=>{try { const p=generationProfile(fieldsFrom(ip)); await navigator.clipboard.writeText(Object.entries(p).filter(([,v])=>v).map(([k,v])=>`${k}：${v}`).join('\n')); notice('业务简报已复制。请再次检查可分享范围。'); }catch(e){notice(e.message,'error');}});
  const row=node('div',null,'button-row quick-actions'); row.append(goButton('IP 与业务资料','clients'),goButton('AI 设置','settings'),goButton('找选题','topics')); panels.dashboard.append(row); statusGrid(panels.dashboard);
  statusGrid(panels.workflow);
  const featureCatalog=node('div');panels.workflow.append(featureCatalog);
  async function loadCatalog(){const response=await fetch('/workflow-catalog.json');if(!response.ok)throw new Error('流程说明文件未打包，请重新完整解压。');const catalog=await response.json();for(const stage of catalog.stages){const group=node('details',null,'card profile-group');group.append(node('summary',`${stage.label} · ${stage.question}`));const grid=node('div',null,'module-grid');for(const feature of catalog.features.filter(f=>f.stage===stage.id)){const card=node('article',null,'module-card');card.append(node('h3',feature.name),node('p',feature.summary,'hint'));const detail=node('details');detail.append(node('summary','怎么使用'));for(const [label,value]of [['输入',feature.input],['产出目标',feature.output],['边界',feature.boundary]])detail.append(node('p',`${label}：${value}`,'hint'));detail.append(node('p','以上是流程设计，实际执行能力以对应窗口标识为准；本版不提供云端同步。','warning'));card.append(detail,goButton('进入对应窗口',feature.target));grid.append(card);}group.append(grid);featureCatalog.append(group);}}
  panels.workflow.append(node('p','四类内容：记录过程、干货、观点、故事。拍摄形式独立选择；固定口播交付连续正文，只有需要现场画面时才规划分镜。','callout'));
  const savedLists = {};
  function renderSaved(type) { const target=savedLists[type]; target.replaceChildren(); const entries=Object.entries(workspace).filter(([id])=>id.startsWith(`${type}-`)).reverse(); if(!entries.length) target.append(node('p','暂无记录','hint')); for(const [id,entry] of entries){ const r=node('div',null,'history-row'); const info=node('div'); info.append(node('h3',entry.fields.title || entry.fields.url || `${FORMS[type].title}`),node('small',`${new Date(entry.updatedAt).toLocaleString('zh-CN')} · ${type==='publish'?'草稿，未发布':'本机记录'}`)); const b=node('button','打开编辑','secondary'); b.addEventListener('click',()=>{if(dirty.has(type)&&!confirm('打开另一条记录会替换未保存输入，继续吗？'))return;fill(panels[type],entry.fields);dirty.delete(type); panels[type].dataset.record=id; notice('已打开本机记录；修改后再次保存。');}); r.append(info,b); target.append(r); } }
  for(const [type,config] of Object.entries(FORMS)) {
    const view=panels[type]; if(type==='audit') statusGrid(view);
    if(config.tabs){ const steps=node('div',null,'stage-strip'); for(const [i,label] of config.tabs.entries()) steps.append(node('span',`${i+1}  ${label}`)); view.append(steps); }
    const layout=node('div',null,'workspace'); const card=node('section',null,'card'); card.append(node('h2',config.title),node('p',config.note,'callout')); const fields=node('div',null,'form-grid'); for(const f of config.fields) fields.append(makeField(type,f)); card.append(fields);
    if(type==='production'){ const media=node('input'); media.type='file';media.accept='video/*,audio/*';media.id='production-preview-file'; const label=node('label','预览本机素材（不上传）'); label.append(media);const preview=node('video');preview.controls=true;preview.hidden=true;preview.className='media-preview'; let objectUrl=''; media.addEventListener('change',()=>{if(objectUrl)URL.revokeObjectURL(objectUrl);const file=media.files[0];if(file){objectUrl=URL.createObjectURL(file);preview.src=objectUrl;preview.hidden=false;$('production-footage').value=file.name;dirty.add('production');}}); card.append(label,preview,goButton('去写脚本确认正文 →','script')); }
    const buttons=node('div',null,'button-row'); const saveB=node('button',config.action,'secondary'), newB=node('button','新建一条','text-button');buttons.append(saveB,newB);card.append(buttons);
    saveB.addEventListener('click',async()=>{try {const values=fieldsFrom(card);if(!Object.values(values).some(v=>v.trim() && !['待审核','待处理','获客','抖音','固定口播','影响明天演示','账号事实','2 小时','证据不足'].includes(v)))throw new Error('请先填写这条记录的具体内容。'); for(const i of card.querySelectorAll('input[type=number]')) if(i.value && (!Number.isInteger(Number(i.value))||Number(i.value)<0)) throw new Error('统计数据请填写非负整数；未知请留空。'); const id=view.dataset.record || `${type}-${crypto.randomUUID()}`;await save(id,values);dirty.delete(type);view.dataset.record=id;renderSaved(type);notice(type==='publish'?'发布草稿已保存，没有加入执行队列，也没有发布。':'已保存本机记录；未调用剪辑、发布或平台采集服务。');}catch(e){notice(e.message,'error');}});
    newB.addEventListener('click',()=>{if(dirty.has(type)&&!confirm('放弃未保存输入并新建？'))return;fill(card);view.dataset.record='';dirty.delete(type);});
    const saved=node('section',null,'card');saved.append(node('h2','已保存的记录'));const list=node('div');savedLists[type]=list;saved.append(list);layout.append(card,saved);view.append(layout);
  }
  const platformGrid=node('div',null,'module-grid');
  for(const name of ['抖音','小红书','视频号']){const card=node('section',null,'card');card.append(node('span','未接通','status-tag pending'),node('h3',name),node('p','平台账号：未确认\n研究采集：未验证\n审核后发布：未验证','platform-status'));const b=node('button','查看连接窗口','secondary');b.addEventListener('click',()=>{const dialog=$('platform-dialog');$('platform-dialog-title').textContent=`连接${name}账号`;$('platform-dialog-detail').textContent='本机便携版尚未接入受控扫码服务，不能在这里完成账号授权。未来接入后将分别验证登录、采集与发布权限。当前不需要填写密码或复制 Cookie，也不会生成演示二维码。';dialog.showModal();});card.append(b);platformGrid.append(card);} panels.connections.append(platformGrid);
  const models=node('div',null,'card launch-card');models.append(node('h2','AI 模型能力'),node('p','Codex 本机账号、DeepSeek API、OpenAI API。','hint'),goButton('打开 AI 设置','settings'));panels.connections.append(models);
  const dialog=node('dialog');dialog.id='platform-dialog';dialog.append(node('h2',null));dialog.firstChild.id='platform-dialog-title';const dp=node('p',null,'hint');dp.id='platform-dialog-detail';dialog.append(dp);const close=node('button','知道了','secondary');close.addEventListener('click',()=>dialog.close());dialog.append(close);document.body.append(dialog);
  const sourceHint=node('div',null,'callout');sourceHint.append(node('strong','研究资料'),node('p','自动采集未接入，请导入真实原文与评论。'));$('view-research').prepend(sourceHint);
  const researchPages = ['博主与采集','正文与结构','类型与作用','为什么火','怎么获客','怎么变现','评论证据','剪辑理解'];
  const researchTabs=node('div',null,'stage-strip'), researchDetail=node('div',null,'card');researchDetail.id='research-detail';researchDetail.hidden=true;
  const researchNotes=['仅处理单条公开链接。批量作品与评论采集尚未接入。','先取得真实逐字稿，才能研究正文结构。','四类内容与拍摄形式分开判断。','没有播放曲线与同账号基线时，只能提出流量机制假设。','评论中的询价或需求是线索，不是成交。','需成交、报价或交付证据才能验证变现路径。','只分析本次粘贴的评论样本，不是全量或全站点赞最高评论。','音频转写看不到画面，不能据此断言镜头、动画或剪辑手法。'];
  researchPages.forEach((label,i)=>{const b=node('button',label,'secondary');b.addEventListener('click',()=>{researchDetail.hidden=false;researchDetail.replaceChildren(node('h3',label),node('p',researchNotes[i],'hint'));const latest=[...getRecords()].find(r=>r.action==='analyze'&&r.input?.transcript===$('transcript').value);if(latest){const r=latest.result;const content=i===1?(r.structure||[]).join('\n'):i===2?`${r.genre} / ${r.form}`:i>=3&&i<=5?JSON.stringify(r.findings?.filter(f=>f.dimension===['流量机制','获客路径','变现路径'][i-3]),null,2):i===6?(r.commentInsights||[]).join('\n'):'';if(content)researchDetail.append(node('p',content,'platform-status'));}else researchDetail.append(node('p','当前原文尚无已保存的拆解结果；完成下方拆解后再查看。','hint'));});researchTabs.append(b);});$('view-research').insertBefore(researchTabs,sourceHint.nextSibling);researchTabs.after(researchDetail);
  const scope=node('details',null,'card profile-group');scope.append(node('summary','采集范围与博主批量窗口（待接入）'));for(const spec of [['blogger','博主主页链接'],['works','作品上限',['10','30','100']],['comments','候选评论上限',['100','300','500']],['selected','精选评论目标',['30','50','100']],['replies','每条精选评论回复上限',['0','3','5']]])scope.append(makeField('scope',spec));scope.append(node('p','以上为后续采集配置草稿，当前不会自动采集；只保存范围，不生成采集任务。','warning'));const saveScope=node('button','保存采集范围草稿','secondary');saveScope.addEventListener('click',async()=>{try{await save('research-scope',fieldsFrom(scope));dirty.delete('scope');notice('范围草稿已保存，采集执行器尚未接入。');}catch(e){notice(e.message,'error');}});scope.append(saveScope);$('view-research').append(scope);
  const toIP=goButton('完整资料','clients','text-button');$('topic-form-heading').append(toIP);
  const productionFromScript=node('button','把当前正文带到制作窗口 →','secondary'); productionFromScript.addEventListener('click',()=>{const value=$('script-editor')?.value;if(!value){notice('先生成或打开一篇口播稿，再带入制作。','error');return;}$('production-script').value=value;$('production-title').value=$('script-topic').value;dirty.add('production');show('production');});$('view-script').append(productionFromScript);
  window.addEventListener('beforeunload',e=>{if(dirty.size){e.preventDefault();e.returnValue='';}});
  return {
    async load(){ const r=await api('workspace');workspace=r.workspace;profileId=workspace['current-profile']?.fields?.id || '';if(workspace[profileId])chooseProfile(profileId);else populateProfiles();fill(scope,workspace['research-scope']?.fields);for(const type of Object.keys(FORMS))renderSaved(type);await loadCatalog(); },
    extraProfile(){const entry=workspace[profileId];return entry?{...generationProfile(entry.fields),profileId}:{};},
    resetProfileContext(){if(dirty.has('ip')&&!confirm('有未保存的 IP 资料，确定改用示例？'))return false;chooseProfile('');return true;},
    async rememberQuickProfile(p){ if(!p.industry) return; const id=profileId || `profile-${crypto.randomUUID()}`;const old=workspace[id]?.fields || {};await save(id,{...old,...p});profileId=id;await save('current-profile',{id});populateProfiles();fill(ip,workspace[id].fields); },
  };
}
