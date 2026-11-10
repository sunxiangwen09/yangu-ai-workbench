// Small reviewed research cards, not live search or a complete industry database.
// Source prose is summarized; the tutorials and their media are not bundled.
const NAIL_CARDS = [
  {
    id: 'nail-cat-eye-effects', title: 'Asia Colors：猫眼石胶系列产品介绍', publisher: 'Asia Colors 亚洲色彩',
    url: 'https://asiacolors.com.tw/-blog-posts-4/2022/5/24/1', publishedAt: '2022-05-24', checkedAt: '2026-11-05',
    facts: ['品牌教程展示固化前使用磁棒不同端，形成C型或集中斜线效果。', '该品牌碎钻系列加入闪片，作者展示强光下更明显的闪烁。'],
    limits: ['只支持该品牌教学和产品区别，不代表所有猫眼产品。', '色号、磁棒塑形、闪片配方和照明是不同因素；不能归结为贵就好或不亮就是偷工减料。', '本工作台未拍摄用户产品的对照，不能声称已有实测结果，也不能说固化后磁粉仍在移动。'],
  },
  {
    id: 'nail-french-proportion', title: '妮宝贝：Peggy老师传统法式现场示范', publisher: '妮宝贝指甲',
    url: 'https://nubaby.cc/35652', publishedAt: '2022-05-21', checkedAt: '2026-11-05',
    facts: ['页面含老师现场教学文字：完成一指后请顾客确认白边弧度与比例。', '老师在这次传统法式演示中指出，白色区域推得过高会显得较短。'],
    limits: ['这是该次传统法式的审美判断，不是统一长度比例标准，也不证明短甲不能做法式。', '可讨论总长与白边占比的区别；同尺寸甲片改变白边的比较只是待拍方案，不冒充已观察效果。'],
  },
  {
    id: 'nail-finish-dimensions', title: 'Nailympia 2026 Gel Polish Manicure 评分表', publisher: 'Nailympia',
    url: 'https://cdn.nailympia.com/wp-content/uploads/2026/01/Nailympia-2026-Scoresheet_Gel-Polish-Manicure-1.pdf', publishedAt: '2026', checkedAt: '2026-11-05',
    facts: ['官方比赛评分将涂色均匀、表面光泽、长度比例、厚度一致、弧度和甲型分别观察。', '其中分别检查刷痕、表面凹凸和左右形状一致性；亮度不是唯一项目。'],
    limits: ['比赛评分仅用作观察维度参考，不是所有门店必须遵守的消费标准。', '不照搬竞赛厚度/毫米数/弧度要求，不说越薄越好，不据此判断持久性、安全性或价格是否合理。', '消费者的款式偏好和日常使用需求可以不同，不能把某种甲型定义为唯一高级审美。'],
  },
];

export function knowledgeFor(profile = {}) {
  // Broad beauty profiles do not silently become nail businesses.
  return /美甲|nail/i.test(`${profile.industry || ''} ${profile.niche || ''}`)
    ? structuredClone(NAIL_CARDS) : [];
}

export function knowledgeContext(input) {
  const cards = input.knowledge || [];
  if (!cards.length) return '没有匹配的已核验行业资料卡。不能把写作方法来源当行业证据，也不能假装本次已联网；如现有材料不足，缩小结论并列出真正待查的材料。';
  return `下列为已阅读的行业资料摘要，不是本次联网搜索、不代表趋势或客户实测。每题只引用真正用到且支持该结论的卡片url到sourceUrls，脚本沿用所选题依据。来源中的商业宣传不作为效果证明。事实可参考，编辑推断和待拍实验必须另外说明，不按资料条数机械一篇拆一题。\n${JSON.stringify(cards)}`;
}
