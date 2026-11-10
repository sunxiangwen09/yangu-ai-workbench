import {
  BUSINESS_GOAL_OPTIONS,
  CASE_STATUS_OPTIONS,
  USE_SCOPE_OPTIONS,
  type ClientProfileData,
} from './client-profile';

export type StrategyMode = 'learning' | 'business';
const value = (text: string) => text.trim() || '待本人补充';

// These are deterministic summaries of customer input, not model-generated advice.
export function buildStrategyBrief(
  mode: StrategyMode,
  data: ClientProfileData,
): string {
  const lines = [
    `${mode === 'learning' ? '本人表达与真实案例' : '业务承接'}参考简报`,
    `客户：${value(data.brandName || data.workspaceName)}`,
    '性质：用户资料汇总；不是自动分析结论，使用前核验事实与公开权限。',
  ];
  if (mode === 'learning') {
    lines.push(
      `语气：${value(data.tone)}`,
      `本人表达样本：\n${value(data.voiceSample)}`,
      `不希望出现的表达：${value(data.dislikedPhrases)}`,
      `案例状态：${CASE_STATUS_OPTIONS[data.caseStatus]}`,
      `证据使用范围：${USE_SCOPE_OPTIONS[data.evidenceUseScope]}`,
    );
    // Restricted evidence must never leak into a copyable creation brief.
    if (data.evidenceUseScope === 'content_allowed') {
      lines.push(
        `独有素材（使用前核验）：${value(data.uniqueMaterial)}`,
        `证据摘要（使用前核验）：${value(data.evidenceSummary)}`,
      );
    } else if (data.evidenceUseScope === 'anonymous_only') {
      lines.push(
        '案例与素材原文未导出：请先人工去标识化并复核，不直接使用姓名、机构或可识别细节。',
      );
    } else {
      lines.push(
        '案例与素材原文未导出：仅内部参考或禁止使用的材料不能写入公开内容。',
      );
    }
    lines.push(
      '连续口播优先保留完整因果，不因套用框架而缩成提纲；固定口播不强制分镜。',
    );
  } else {
    lines.push(
      `主目标：${data.businessGoal ? BUSINESS_GOAL_OPTIONS[data.businessGoal] : '待本人确认'}`,
      `服务谁：${value(data.targetCustomer)}`,
      `主产品：${value(data.primaryOffer)}`,
      `交付内容或结果：${value(data.offerOutcome)}`,
      `交付方式：${value(data.deliveryMode)}`,
      `本人填写的价格：${value(data.priceRange)}`,
      `不能承诺的结果：${value(data.promiseBoundary)}`,
      `客户主要顾虑：${value(data.customerBlocker)}`,
      `内容希望引导的一个动作：${value(data.primaryAction)}`,
      `承接负责人：${value(data.handoffOwner)}`,
      '内容行动须与主产品相连；不保证收益，不把竞品评论者当作自有线索。',
    );
  }
  return lines.join('\n\n');
}

export function strategyGaps(
  mode: StrategyMode,
  data: ClientProfileData,
): string[] {
  const fields: Array<[keyof ClientProfileData, string]> =
    mode === 'learning'
      ? [
          ['voiceSample', '一段本人原话'],
          ['tone', '希望保留的语气'],
          ['evidenceSummary', '真实证据摘要（没有可公开证据时可留空）'],
        ]
      : [
          ['primaryOffer', '主产品'],
          ['targetCustomer', '目标客户'],
          ['offerOutcome', '交付内容'],
          ['promiseBoundary', '承诺边界'],
          ['primaryAction', '一个承接动作'],
          ['handoffOwner', '承接负责人'],
        ];
  return fields
    .filter(([key]) => !String(data[key]).trim())
    .map(([, label]) => label);
}
