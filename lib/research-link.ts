export function extractDouyinLink(input: string): string | null {
  const candidates =
    input.match(/https?:\/\/[^\s<>"'[\],，。；！）)\u3400-\u9fff]+/g) || [];
  for (const raw of candidates) {
    try {
      const url = new URL(raw);
      if (url.protocol !== 'https:' || url.username || url.password || url.port)
        continue;
      if (url.hostname === 'v.douyin.com' && /^\/[\w-]+\/?$/.test(url.pathname))
        return url.href;
      if (
        ['www.douyin.com', 'douyin.com'].includes(url.hostname) &&
        /^\/(video|note|user)\/[^/]+\/?$/.test(url.pathname)
      )
        return url.href;
    } catch {
      /* Try the next visible URL in a share message. */
    }
  }
  return null;
}

export function claimMatchesTab(domain: string, tab: string): boolean {
  if (tab === 'traffic')
    return domain === 'why_hot' || domain === 'performance';
  return domain === tab;
}

export function evidenceQuote(
  evidence: { evidence_type: string; evidence_ref_id: string | null },
  transcripts: Array<{
    transcript_id: string;
    verified_text: string | null;
    raw_text: string | null;
  }>,
  comments: Array<{ comment_id: string; text: string | null }>,
): string | null {
  if (evidence.evidence_type === 'transcript') {
    const row = transcripts.find(
      (item) => item.transcript_id === evidence.evidence_ref_id,
    );
    return row?.verified_text || row?.raw_text || null;
  }
  if (evidence.evidence_type === 'comment')
    return (
      comments.find((item) => item.comment_id === evidence.evidence_ref_id)
        ?.text || null
    );
  return null;
}

export function analysisMatchesSelection(
  analysis: { content_id: string; evidence_job_id: string } | null,
  jobId?: string,
  contentId?: string | null,
) {
  return (
    !!analysis &&
    analysis.content_id === contentId &&
    analysis.evidence_job_id === jobId
  );
}

export function commentSelectionLabel(
  selection: { method?: string; categories?: unknown; concrete_detail?: boolean } | null | undefined,
  categoryLabel: (category: string) => string = (category) => category,
): string | null {
  if (!selection) return null;
  if (selection.method === 'browser_observed')
    return '浏览器观察精选 · 非全站排名 · 待复核';
  const categories = Array.isArray(selection.categories)
    ? selection.categories.filter((item): item is string => typeof item === 'string')
    : [];
  const detail = categories.map(categoryLabel).join('、') ||
    (selection.concrete_detail ? '具体信息' : '候选内互动信号');
  return `规则初筛：${detail} · 待复核`;
}
