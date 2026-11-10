export const suggestedKeys = ['audience', 'offer'];

export function sameProfileContext(saved = {}, current = {}) {
  const clean = value => typeof value === 'string' ? value.trim() : '';
  if (clean(saved.industry) !== clean(current.industry)) return false;
  if (saved.profileId || current.profileId) return Boolean(saved.profileId && saved.profileId === current.profileId);
  return ['audience','offer'].every(key => clean(saved[key]) === clean(current[key]));
}

// Updating fields on the same customer is not a new writing task.
// The first save may assign an ID without changing the customer's material.
export function writingContextChanged(previous, next, { saving = false } = {}) {
  if (!previous) return false;
  const clean = value => typeof value === 'string' ? value.trim() : '';
  if (clean(previous.industry) !== clean(next.industry)) return true;
  const previousId = clean(previous.profileId), nextId = clean(next.profileId);
  if (previousId === nextId) return false;
  return !(saving && !previousId && nextId);
}

// Fill only empty fields and reject a response for an industry that has changed.
export function mergeSuggestions(current, result, requestIndustry) {
  const fields = { ...current }, added = {};
  if (current.industry.trim() !== requestIndustry.trim()) return { fields, added };
  for (const key of suggestedKeys) {
    if (!current[key]?.trim() && typeof result[key] === 'string' && result[key].trim()) {
      fields[key] = result[key].trim();
      added[key] = fields[key];
    }
  }
  return { fields, added };
}

export function clearStaleSuggestions(current, previousIndustry, suggested) {
  const fields = { ...current };
  if (current.industry.trim() !== previousIndustry.trim()) {
    for (const key of suggestedKeys) if (suggested[key] && fields[key] === suggested[key]) fields[key] = '';
    return { fields, suggested: {} };
  }
  return { fields, suggested: { ...suggested } };
}

export function topicCount(value) {
  const count = Number(value);
  if (!String(value).trim() || !Number.isInteger(count) || count < 1 || count > 20) throw new Error('请输入 1–20 之间的整数。');
  return count;
}

export function topicReference(topic) {
  const lines = [
    '选题：' + topic.title, '内容类型：' + topic.genre,
    '客户问题：' + topic.customerProblem, '为什么拍：' + topic.whyShoot,
    '开头建议：' + topic.opening, '获客承接：' + topic.conversionAction,
  ];
  const plan = topic.plan;
  if (plan) {
    if (plan.depth) for (const [key, label] of [['familiarAnswer','已有常见说法'],['insight','本条新增判断'],['mechanism','原因与作用方式'],['evidence','支持材料'],['boundary','适用边界']]) if (plan.depth[key]) lines.push(label + '：' + plan.depth[key]);
    for (const [key, label] of [['hookReason','停留理由'],['watchReason','继续观看理由'],['payoff','正文需要兑现'],['engagementReason','自然互动动机'],['shootingApproach','呈现方式及理由']]) if (plan[key]) lines.push(label + '：' + plan[key]);
    lines.push('具体正文推进：' + (plan.contentBeats || []).join('；'));
    if (plan.materialNeeds?.length) lines.push('尚缺真实材料：' + plan.materialNeeds.join('；'));
  }
  lines.push('来源依据：' + topic.evidenceBasis, '来源：' + ((topic.sourceUrls || []).join('；') || '按业务资料策划，未做热度验证'));
  lines.push('以上是创作方案，不是发生过的真实案例。真实事件和过程仅以用户素材为准。当前所选类型与方案不同时，应重新组织结构。');
  return lines.join('\n');
}
