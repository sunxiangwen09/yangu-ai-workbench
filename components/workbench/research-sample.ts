export type BrowserCommentEvidence = {
  localRef: string;
  parentRef: string | null;
  author: string;
  body: string;
  likes: number | null;
  note?: string;
};

export const editingResearchSample = {
  source: {
    platform: '抖音',
    shareUrl: 'https://v.douyin.com/PsCmfeJmy-s/',
    canonicalUrl: 'https://www.douyin.com/video/7681218601885371690',
    contentId: '7681218601885371690',
    title: '第2集｜剪掉废话不叫剪辑，让观众看懂才叫 #AI剪辑',
    author: 'dontbesilent 聊赚钱',
    publishedAt: '2026-09-03 16:11 CST',
    duration: '03:09',
    authorSnapshot: '49.8 万粉丝 · 256.0 万获赞',
    browserObservedAt: '2026-09-03 晚间（CST）',
  },
  task: {
    jobId: 'job_a88f962cffa348c7ae58',
    state: 'failed',
    stage: 'adapter_error',
    provider: 'tikhub-rest',
    failure:
      '单作品路由与 ID 校验已接通；TIKHUB_API_KEY 未配置，本轮精确返回 auth_rejected，没有把 0 条结果伪装成采集完成。',
  },
  engagement: {
    likes: 326,
    comments: 12,
    favorites: 209,
    shares: 43,
    playCount: null,
    note: '同一晚页面刷新后数值仍在变化；这是早期快照，不是最终数据。',
  },
  chapters: [
    {
      time: '00:11',
      title: '剪辑逻辑',
      summary: '剪辑是文案的二次创作，而不只是机械删减。',
    },
    {
      time: '00:28',
      title: '案例分析',
      summary: '用案例说明要同时考虑理解成本和耐心，删除无效填充。',
    },
    {
      time: '01:26',
      title: 'AI 工具演示',
      summary: '展示文稿重排、内容删减和顺序调整。',
    },
    {
      time: '02:40',
      title: '方法收束',
      summary: '展示如何用对照样本和公开方法制作自己的规则。',
    },
  ],
  observation:
    '前段是人物配白板时间线讲解，中后段切到屏幕演示逐段处理表和原稿—人工稿对照；不是纯固定口播。',
  verifiedPoints: [
    '一个结论后连续出现三个案例时，要比较各案例的解释力和证据力；不是机械全留，也不是只按长度删除。若拍摄前发现案例都弱，应换案例或补录。',
    '开头和结尾即使词面近似，也可能分别承担“提出问题”和“收束证明”；按文本相似度自动去重会误删。',
    '一小时以上的双人讨论即使删掉口头废话，逻辑仍可能跳跃；需要按带时间码的语义段判断保留、删除和调序，并检查前置依赖。',
  ],
  evidenceLimits: [
    '章节文字由抖音标注为 AI 生成，只能作结构索引，不能当逐字原文。',
    '完整内容已用于方法核验，但为避免占用空间未保留下载或转写文件；系统中仍没有可追溯的完整逐字稿。',
    '评论页已显示“暂时没有更多评论”，但没有 comment_id、游标和分页回执，因此只能证明本次网页登录可见到尾。',
    '没有播放量、完播率、留存曲线、主页访问、咨询或成交数据。',
  ],
  classification: {
    contentGenre: '干货为主，观点为辅',
    contentForm: '混合型：固定讲解 / 白板 + 屏幕演示',
    primaryRole: '获客：能力证明与信任建立（待后台验证）',
    secondaryRole: '流量与产品教育（机制假设）',
    reviewState: '人工观察 · 仍需逐字稿与数据复核',
  },
  distributionHypotheses: [
    '“不是删废话，而是让人看懂”的认知反差能快速筛选剪辑与 AI 创作者。',
    '白板案例把抽象观点具体化，屏幕实操继续证明不是只讲概念。',
    '作者在评论区给出可复用的训练方法，可能强化收藏与关注动机。',
    '收藏/点赞与分享/点赞的早期比例支持“实用性”假设，但没有播放和账号基线，不能判定已经爆。',
  ],
  acquisitionHypotheses: [
    '反常识标题叫停目标人群。',
    '案例让观众承认“一键去废话”不能解决理解问题。',
    '工具实操证明作者具备商业判断与 AI 落地能力。',
    '评论区继续交付方法，可能把观众带向关注、咨询或后续产品；本条尚无真实线索证据。',
  ],
  monetizationHypotheses: [
    '可能为专属剪辑规则、方法训练、咨询或知识服务做产品教育。',
    '视频页未出现可核验订单、报名或咨询结果，变现状态必须保持“未知”。',
  ],
  comments: [
    {
      localRef: 'browser-top-01',
      parentRef: null,
      author: '大湾区在逃姐',
      body: '你的头发为什么一天比一天好看了[发呆]',
      likes: 7,
      note: '弱业务相关',
    },
    {
      localRef: 'browser-top-02',
      parentRef: null,
      author: '小妖的AI学习日记',
      body: '唉？栋哥你不是商业博主嘛，为什么是AI博主',
      likes: 0,
      note: '账号定位认知断层',
    },
    {
      localRef: 'browser-top-03',
      parentRef: null,
      author: '语汐',
      body: 'codexw还是好用啊',
      likes: 0,
      note: '工具认知',
    },
    {
      localRef: 'browser-top-04',
      parentRef: null,
      author: 'dontbesilent 聊赚钱（作者）',
      body: '我会提供多组「原稿—人工删减稿」对照，从真实案例中学习哪些可删、哪些必留、何时合并或缩写，以及哪些删法会损害观点、因果、证据、判断边界、作者声音和口播效果；同时加入成功样本、误删样本和反例，明确规则成立条件与失效边界，再制作并测试专属删稿规则。',
      likes: 0,
      note: '为避免照搬第三方 Skill 文本，这里只保存作者公开方法的忠实摘要',
    },
    {
      localRef: 'browser-top-05',
      parentRef: null,
      author: '少数派复利笔记（++OwO++）',
      body: 'WOW，非常好的内容，最近我打算做点不写稿直接口播的长视频，这个刚好可以用。另外视频最后一段只有右声道，建议直接导出单声道视频，双声道徒增复杂性。',
      likes: 1,
      note: '明确使用场景 + 音频质检卡点；作者赞过',
    },
    {
      localRef: 'browser-top-06',
      parentRef: null,
      author: '許无忆',
      body: '无恶意，这个视频观看流失点应该在 1:10 秒。',
      likes: 2,
      note: '留存风险信号，需后台曲线验证',
    },
    {
      localRef: 'browser-reply-06-01',
      parentRef: 'browser-top-06',
      author: '梳毛毛',
      body: '这都被你知道',
      likes: 0,
    },
    {
      localRef: 'browser-reply-06-02',
      parentRef: 'browser-top-06',
      author: '吃饺子蘸番茄酱',
      body: '[捂脸]你算准了，我正好从这里开始走神',
      likes: 1,
      note: '第二个独立用户支持 1:10 风险',
    },
    {
      localRef: 'browser-reply-06-03',
      parentRef: 'browser-top-06',
      author: '許无忆',
      body: '[玫瑰]',
      likes: 0,
      note: '表情回复',
    },
    {
      localRef: 'browser-top-07',
      parentRef: null,
      author: '语汐',
      body: '博主听劝',
      likes: 0,
    },
    {
      localRef: 'browser-top-08',
      parentRef: null,
      author: '大湾区在逃姐',
      body: '逆天，太狠了',
      likes: 0,
    },
    {
      localRef: 'browser-top-09',
      parentRef: null,
      author: '石熔鑫聊祛痘护肤',
      body: '卡了',
      likes: 0,
      note: '语义不明确，不能直接归因内容',
    },
  ] satisfies BrowserCommentEvidence[],
  blockers: [
    {
      priority: '已解决',
      title: '单作品精确采集链路',
      detail:
        '已完成：content source 强制单作品、只接受作品链接，并在提供商返回后校验 content_id；仍需配置真实凭证做首轮外部验收。',
    },
    {
      priority: 'P0',
      title: '第三方采集鉴权',
      detail: 'TikHub 密钥未配置；当前真实任务在适配器阶段失败。',
    },
    {
      priority: 'P0',
      title: '完整逐字稿',
      detail:
        '已完成视频内容复核并保存方法摘要，但完整逐字稿未保留；需要补字幕轨、作者稿或可核对转写。',
    },
    {
      priority: 'P0',
      title: '评论 API 完整性',
      detail: '浏览器看到末尾，但缺评论 ID、游标、分页回执和重复校验。',
    },
    {
      priority: 'P1',
      title: '1:10 留存风险',
      detail:
        '两位用户指出此处走神；需抖音后台留存曲线验证并回看该段信息负担。',
    },
    {
      priority: 'P1',
      title: '末段声道问题',
      detail:
        '评论指出最后一段只有右声道；制作审核必须加入左右声道/单声道检查。',
    },
    {
      priority: 'P1',
      title: '账号定位衔接',
      detail:
        '评论出现“商业博主为什么是 AI 博主”的疑问，需要栏目导语连接商业结果与 AI 手段。',
    },
    {
      priority: 'P1',
      title: '早期数据窗口',
      detail: '发布仅数小时，至少在 24h / 72h 再采集一次，才可与同期内容比较。',
    },
  ],
} as const;

export const comprehensionEditingMethod = {
  principle: '剪掉废话只是粗剪；剪辑的验收标准是观众能否准确、低成本地理解。',
  actions: [
    '保留',
    '删除',
    '缩写',
    '合并',
    '调序',
    '替换',
    '补录',
    '旁白',
  ] as const,
  diagnosticOrder: [
    '定位最重要的理解问题',
    '回到时间码、原文和画面证据',
    '判断是信息缺失、顺序错误、例子过载还是表达重复',
    '选择最小修改动作，并写清误删风险',
    '重放验证观点、因果、证据、边界和作者声音是否仍完整',
  ],
  brollGate: [
    '这段画面具体帮助观众理解什么？',
    '只看人物口播时，缺的是证据、步骤、空间关系还是抽象概念？',
    '优先用真实录屏、资料、现场或证据；AI B-roll 只解释抽象概念。',
    'AI 画面不得冒充客户案例、产品界面、企业现场或实际结果。',
    '移除 B-roll 后正文逻辑仍应成立；否则先修正文。',
  ],
  regressionCases: [
    {
      name: '多案例重复',
      input: '三个案例都在支持同一结论',
      expected: '保留最能解释或证明的案例；若都弱则改写或补录',
    },
    {
      name: '必要重复',
      input: '开头提出问题，结尾用近似句收束',
      expected: '不能按相似度自动删除，先比较语义功能',
    },
    {
      name: '因果与边界',
      input: '短句连接原因结果，或限制结论成立条件',
      expected: '删除必须失败，除非有等价修复',
    },
    {
      name: '跳跃访谈',
      input: '删掉口头语后仍然逻辑跳跃',
      expected: '允许调序，但前置依赖、代词、时间线和音画连续性都要通过',
    },
    {
      name: '视觉欺骗',
      input: 'AI B-roll 被当作客户案例、后台或真实现场',
      expected: '必须拒绝，换真实证据或明确标为抽象解释',
    },
  ],
};
