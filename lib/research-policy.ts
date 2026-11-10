export const COMMENT_PRESETS = [
  {
    id: 'quick',
    label: '快速看方向',
    candidateLimit: 250,
    selectedLimit: 50,
    replyLimit: 5,
    description: '适合先判断是否值得深入研究',
  },
  {
    id: 'balanced',
    label: '标准研究',
    candidateLimit: 500,
    selectedLimit: 100,
    replyLimit: 10,
    description: '兼顾高赞、需求、经历和反对意见',
  },
  {
    id: 'deep',
    label: '深入研究',
    candidateLimit: 1500,
    selectedLimit: 300,
    replyLimit: 10,
    description: '适合评论较多、讨论复杂的作品',
  },
] as const;

export type CommentPresetId = (typeof COMMENT_PRESETS)[number]['id'];
export type ResearchPolicy = {
  preset: CommentPresetId;
  maxWorks: 10 | 30 | 100;
};
export type SavedResearchPolicy = { policy: ResearchPolicy; revision: number };
export const DEFAULT_RESEARCH_POLICY: ResearchPolicy = {
  preset: 'balanced',
  maxWorks: 30,
};

export function getCommentPreset(id: CommentPresetId) {
  return (
    COMMENT_PRESETS.find((preset) => preset.id === id) ?? COMMENT_PRESETS[1]
  );
}

export function parseResearchPolicy(value: unknown): ResearchPolicy | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  if (Object.keys(input).some((key) => !['preset', 'maxWorks'].includes(key)))
    return null;
  if (!COMMENT_PRESETS.some((item) => item.id === input.preset)) return null;
  if (![10, 30, 100].includes(input.maxWorks as number)) return null;
  return {
    preset: input.preset as CommentPresetId,
    maxWorks: input.maxWorks as ResearchPolicy['maxWorks'],
  };
}
