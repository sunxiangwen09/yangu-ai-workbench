export const VIDEO_CHECK = {
  shareUrl: 'https://v.douyin.com/Xrt2L5JgtAA/',
  canonicalUrl: 'https://www.douyin.com/video/7685586228548291892',
  title: '当你把 AI 当成项目经理',
  creator: '第四种黑猩猩',
  observedAt: '2026-09-22',
  publishedAt: '2026-09-15 14:29',
  duration: '03:43',
  metrics: { likes: 6925, comments: 308, favorites: 1869, shares: 410 },
  visibleRootComments: 10,
  steps: [
    {
      label: '识别真实作品',
      state: '已完成',
      detail: '短链接跳转到具体作品，作者、标题、时长与公开互动数字可见。',
    },
    {
      label: '取得完整口播',
      state: '被阻断',
      detail:
        '页面弹出登录提示；未取得完整逐字稿，也没有自动转写结果。标题不能当正文。',
    },
    {
      label: '查看评论',
      state: '部分完成',
      detail:
        '未登录页面可见 10 条一级评论；页面提示登录后查看更多。没有完成精选候选池或回复核验。',
    },
    {
      label: '判类型与拍摄形式',
      state: '待补材料',
      detail:
        '四类内容、固定口播或录屏等形式需依据完整内容，不从标题自动定性。',
    },
    {
      label: '判断为什么火',
      state: '待补证据',
      detail:
        '还需完整内容与账号同期基线。6925 个点赞不能单独证明“爆款”或因果。',
    },
    {
      label: '判断获客与变现',
      state: '待补证据',
      detail:
        '未取得实际行动指令、咨询记录、成交或合作证据；不判断已获客或已变现。',
    },
  ],
  commentObservations: [
    '部分评论表达对工具的日常使用习惯，属于态度反馈，不是购买意向。',
    '有评论提到工作中的实际帮助，也有人提到上下文质量和返工；这些是后续核查方向，不是已核实案例。',
    '可见点赞不高的信息型评论仍可能有价值；不能只按点赞筛选。',
  ],
} as const;

export type AuditState = 'fixed' | 'partial' | 'blocked';
export const WORKBENCH_ISSUES: Array<{
  id: string;
  area: string;
  problem: string;
  state: AuditState;
  evidence: string;
  next: string;
}> = [
  {
    id: 'UX-01',
    area: '首页',
    problem: '写死的任务数、待发布数容易被当成真实工作进度',
    state: 'fixed',
    evidence: '原页面实测显示固定 3/5/2，与真实队列无关联',
    next: '改为任务入口，只显示当前设备实际保存的草稿数',
  },
  {
    id: 'UX-02',
    area: 'IP 资料',
    problem: '“表达与信任素材”重复且含义不直白',
    state: 'fixed',
    evidence: '原 IP 档案已有本人原话、语气和案例字段',
    next: '合并回 IP 资料中的说话习惯与真实案例；保留数据和公开权限',
  },
  {
    id: 'UX-03',
    area: '制作、发布、规则',
    problem: '部分按钮只弹成功提示，没有执行或保存',
    state: 'fixed',
    evidence: '静态检查发现创建制作任务、生成版本等只有提示',
    next: '改成“待接通，尚未执行”；不再展示虚假成功',
  },
  {
    id: 'UX-04',
    area: '链接输入',
    problem: '整段分享文字、Markdown 链接和紧接中文的短链不能可靠识别',
    state: 'fixed',
    evidence: '对常见分享文本复现了三种漏识别；已新增解析回归',
    next: '支持分享文本和常见标点，同时保留 HTTPS 与抖音域名限制',
  },
  {
    id: 'UX-05',
    area: '通用组件与可访问性',
    problem: '全仓检查还有 20 条既有规则报告，键盘与辅助阅读支持尚未全面验收',
    state: 'partial',
    evidence:
      '涉及通用表单、轮播、图表等未改动组件；本轮修改文件的专项检查通过',
    next: '逐项确认实际影响并修复，补键盘、屏幕阅读器和真实手机验收；不把规则报告全部当已复现故障',
  },
  {
    id: 'DATA-01',
    area: '资料与脚本',
    problem: '未保存输入可能在切页或切客户时丢失',
    state: 'fixed',
    evidence: '原资料和脚本编辑未注册离开保护',
    next: '统一保存/放弃提示，关闭网页提醒；草稿仍需主动保存',
  },
  {
    id: 'DATA-02',
    area: '研究证据',
    problem: '切换作品时旧拆解响应可能覆盖新作品',
    state: 'fixed',
    evidence: '代码检查发现异步读取未绑定当前作品',
    next: '清空旧证据、丢弃过期响应、审批前核对任务与作品',
  },
  {
    id: 'DATA-03',
    area: '原文存储',
    problem: '相同转写 ID 可能覆盖另一任务的正文',
    state: 'fixed',
    evidence: '隔离数据库复现；已加入归属冲突拒绝与回归检查',
    next: '禁止跨任务/作品复用转写 ID；当前仍无公开原文写入入口',
  },
  {
    id: 'DATA-04',
    area: '历史证据版本',
    problem: '同一任务内修改正文后，已批准的旧分析可能引用到变化后的文本',
    state: 'partial',
    evidence: '当前只防跨任务覆盖；同一任务的正文记录仍可更新',
    next: '加入不可变正文版本或内容哈希，让历史分析始终指向当时的原文',
  },
  {
    id: 'R-01',
    area: '抖音测试',
    problem: '当前页面要求登录以继续核验内容与更多评论',
    state: 'blocked',
    evidence: '本轮链接出现登录弹窗及“登录后可查看更多评论”',
    next: '用户自行登录后继续读取；不发送或导出账号密码、cookie',
  },
  {
    id: 'R-02',
    area: '批量采集',
    problem: '真实自动采集提供商未配置，云端扫码采集未建设',
    state: 'blocked',
    evidence:
      '配置能力核验：TikHub 未配置、F2 未配置；任务合同测试不等于采集成功',
    next: '接入平台侧的数据通道并实测范围、成本、限制及失败恢复',
  },
  {
    id: 'R-03',
    area: '原文转写',
    problem: '没有自动口播转写，手动导入的字幕也未解析成正文',
    state: 'blocked',
    evidence: '适配器没有写入 transcripts；网关只有原文读取接口',
    next: '实现上传/粘贴原文、来源、校对版本，再接 ASR',
  },
  {
    id: 'R-04',
    area: '研究恢复',
    problem: '离开研究页后缺少客户可见的任务恢复列表',
    state: 'partial',
    evidence: '后端可持久化，网页任务仍在当前页面状态中',
    next: '建设客户归属、云端任务列表与恢复入口',
  },
  {
    id: 'R-05',
    area: '分析准备度',
    problem: '准备度检查漏算正式原文与精选评论，可能错误显示为零',
    state: 'fixed',
    evidence: '隔离夹具已有完整原文和 10 条精选评论，但旧检查仍报零',
    next: '已按指定任务读取正式正文和评论，分别统计数量、质量与采样范围；新增 8 项后端回归通过。仍不等于已采集本轮视频',
  },
  {
    id: 'R-06',
    area: '拆解展示',
    problem: '真实拆解曾只显示分类和数量，详细页仍是通用样板',
    state: 'fixed',
    evidence: '静态检查定位了真实结果与样板分支混用',
    next: '展示本作品的判断及其关联证据，修复“为什么火”字段对应与正文/评论同 ID 混用；缺原文不填样板',
  },
  {
    id: 'R-07',
    area: '服务端采集预算',
    problem: '网页上限不等于服务端硬限制，当前默认请求预算仍偏大',
    state: 'partial',
    evidence: '本机网关默认请求预算为 10000，客户级政策和费用限制未统一落实',
    next: '对每个客户、任务和日累计强制限额；超过预算安全停止，不能只依赖网页设置',
  },
  {
    id: 'C-01',
    area: '选题与脚本',
    problem: '选题还是固定样板，不会因客户填写档案自动变化',
    state: 'partial',
    evidence: '当前页面使用 3 条固定参考稿，未连接生成服务',
    next: '明确样板身份；后续打通客户资料、真实来源、个性化完整口播',
  },
  {
    id: 'C-02',
    area: '研究到创作',
    problem: '进入脚本页面不会自动携带研究原文和证据',
    state: 'partial',
    evidence: '当前动作只是页面跳转',
    next: '先创建带研究来源的新选题记录，再交给创作，不能直接冒充改写完成',
  },
  {
    id: 'C-03',
    area: '跨设备',
    problem: '草稿与收藏只保存在当前浏览器',
    state: 'partial',
    evidence: 'IP 档案和研究范围云端保存；稿件使用本机存储',
    next: '迁移内容资产到带客户隔离与版本校验的云端存储',
  },
  {
    id: 'C-04',
    area: '稿件版本',
    problem: '修改脚本后，从选题页复制的仍可能是原始样板',
    state: 'fixed',
    evidence: '原复制按钮只读取静态原稿',
    next: '优先展示与复制当前客户已保存的最新稿；预览明确是否有未保存修改',
  },
  {
    id: 'C-05',
    area: '本机草稿异常恢复',
    problem: '浏览器存储被禁用、容量不足或旧数据损坏时，缺少可靠的恢复流程',
    state: 'partial',
    evidence: '代码检查发现本机存储读写和旧版本迁移缺少完整失败保护',
    next: '补充失败提示、可恢复备份与导出；在云端内容库完成前不要将这里作为唯一稿件备份',
  },
  {
    id: 'P-01',
    area: '视频制作',
    problem: '没有素材上传、实际剪辑、动画生成和成片审批',
    state: 'blocked',
    evidence: '当前为操作规范和示例，不产出视频文件',
    next: '先用一条自有原片接通剪辑、字幕与审核；动画按需再接',
  },
  {
    id: 'P-02',
    area: '账号与发布',
    problem: '三平台云端登录、审核后排期与真实发布未接通',
    state: 'blocked',
    evidence: '入口显示待建设；未产生平台授权或发布回执',
    next: '按平台验证会话、权限、审核与定时回执，先单平台小范围实跑',
  },
  {
    id: 'A-01',
    area: '评论与复盘',
    problem: '缺少真实数据导入、逐视频反馈、私信处理及线索台账',
    state: 'blocked',
    evidence: '当前页面仍为口径与参考表，没有后台回流',
    next: '先建立逐视频手动记录，未知不填零；竞品评论和自有线索隔离',
  },
  {
    id: 'A-02',
    area: '客户开放',
    problem: '独立客户登录及云端任务、会话隔离尚未端到端验收',
    state: 'blocked',
    evidence: '当前仅是本人可访问的内部版',
    next: '上线客户版前单独做身份、权限、数据保留与发布安全评估',
  },
];

export function auditMarkdown() {
  const labels = {
    fixed: '本轮已修复',
    partial: '部分可用，待补',
    blocked: '未接通或被阻断',
  };
  return (
    `# 工作台测试与问题清单\n\n日期：2026-09-22\n测试视频：${VIDEO_CHECK.canonicalUrl}\n\n说明：静态审计、隔离自动测试与页面实测分别记录，不等于所有功能已端到端通过。\n\n` +
    WORKBENCH_ISSUES.map(
      (item) =>
        `## ${item.id} · ${item.area} · ${labels[item.state]}\n\n问题：${item.problem}\n\n依据：${item.evidence}\n\n处理/下一步：${item.next}`,
    ).join('\n\n')
  );
}
