export const CLIENT_PROFILE_SCHEMA_VERSION = 1;

export type BusinessGoal = 'traffic' | 'acquisition' | 'monetization';
export type PresentationMode =
  | 'fixed_talking_head'
  | 'vlog_process'
  | 'screen_tutorial'
  | 'mixed';
export type CaseStatus = 'has_evidence' | 'to_add' | 'no_public_case';
export type UseScope =
  | 'content_allowed'
  | 'anonymous_only'
  | 'internal_only'
  | 'prohibited';
export type ResearchScope =
  | 'company'
  | 'industry'
  | 'customer_questions'
  | 'competitors';
export type ResearchStatus =
  | 'not_requested'
  | 'scope_saved'
  | 'needs_review'
  | 'confirmed';
export type ClientProfileStatus =
  | 'in_progress'
  | 'minimum_ready'
  | 'complete'
  | 'update_required';

export type ClientProfileData = {
  workspaceName: string;
  brandName: string;
  role: string;
  industry: string;
  subIndustry: string;
  experienceStartedYear: string;
  experiencePublic: boolean;
  serviceRegion: string;
  primaryOffer: string;
  offerOutcome: string;
  deliveryMode: string;
  priceRange: string;
  promiseBoundary: string;
  targetCustomer: string;
  decisionMaker: string;
  customerSituation: string;
  customerBlocker: string;
  desiredChange: string;
  currentAlternative: string;
  selectionCriteria: string;
  uniqueMaterial: string;
  caseStatus: CaseStatus;
  evidenceSummary: string;
  evidenceUseScope: UseScope;
  businessGoal: BusinessGoal | '';
  primaryAction: string;
  handoffOwner: string;
  tone: string;
  voiceSample: string;
  dislikedPhrases: string;
  presentationModes: PresentationMode[];
  officialWebsite: string;
  officialAccounts: string;
  researchConsent: boolean;
  researchScopes: ResearchScope[];
  researchStatus: ResearchStatus;
  researchRequestedAt: string;
  privacyAcknowledged: boolean;
  finalApprover: string;
};

export type ClientProfileRecord = {
  id: string;
  status: ClientProfileStatus;
  profileVersion: number;
  data: ClientProfileData;
  createdAt: string;
  updatedAt: string;
};

export const INDUSTRY_OPTIONS = [
  '企业服务',
  '本地生活',
  '教育培训',
  '制造业',
  '家居建材',
  '餐饮食品',
  '零售电商',
  '美容健康',
  '法律财税',
  '文旅住宿',
  '汽车服务',
  '其他',
] as const;

export const BUSINESS_GOAL_OPTIONS: Record<BusinessGoal, string> = {
  traffic: '做流量',
  acquisition: '做获客',
  monetization: '做变现',
};

export const PRESENTATION_MODE_OPTIONS: Record<PresentationMode, string> = {
  fixed_talking_head: '固定口播',
  vlog_process: '现场 Vlog',
  screen_tutorial: '录屏教程',
  mixed: '混合型',
};

export const RESEARCH_SCOPE_OPTIONS: Record<ResearchScope, string> = {
  company: '企业与品牌公开资料',
  industry: '行业变化与官方信息',
  customer_questions: '客户常见问题与决策顾虑',
  competitors: '同行内容方向与承接方式',
};

export const CASE_STATUS_OPTIONS: Record<CaseStatus, string> = {
  has_evidence: '有案例和证据',
  to_add: '有案例，稍后补证据',
  no_public_case: '暂无可公开案例',
};

export const USE_SCOPE_OPTIONS: Record<UseScope, string> = {
  content_allowed: '核验后可用于内容',
  anonymous_only: '只能匿名使用',
  internal_only: '仅内部参考',
  prohibited: '禁止使用',
};

export function createEmptyClientProfileData(): ClientProfileData {
  return {
    workspaceName: '',
    brandName: '',
    role: '',
    industry: '',
    subIndustry: '',
    experienceStartedYear: '',
    experiencePublic: true,
    serviceRegion: '',
    primaryOffer: '',
    offerOutcome: '',
    deliveryMode: '',
    priceRange: '',
    promiseBoundary: '',
    targetCustomer: '',
    decisionMaker: '',
    customerSituation: '',
    customerBlocker: '',
    desiredChange: '',
    currentAlternative: '',
    selectionCriteria: '',
    uniqueMaterial: '',
    caseStatus: 'to_add',
    evidenceSummary: '',
    evidenceUseScope: 'internal_only',
    businessGoal: '',
    primaryAction: '',
    handoffOwner: '',
    tone: '',
    voiceSample: '',
    dislikedPhrases: '',
    presentationModes: [],
    officialWebsite: '',
    officialAccounts: '',
    researchConsent: false,
    researchScopes: ['company', 'industry', 'customer_questions'],
    researchStatus: 'not_requested',
    researchRequestedAt: '',
    privacyAcknowledged: false,
    finalApprover: '',
  };
}

export type ProfileSectionId =
  | 'identity'
  | 'business'
  | 'audience'
  | 'evidence'
  | 'voice'
  | 'conversion'
  | 'research';

export type ProfileSectionProgress = {
  id: ProfileSectionId;
  title: string;
  description: string;
  complete: number;
  done: number;
  total: number;
};

export type ClientProfileReadiness = {
  complete: number;
  answered: number;
  total: number;
  minimumReady: boolean;
  canGenerateTopics: boolean;
  canGenerateScripts: boolean;
  sections: ProfileSectionProgress[];
  nextQuestion: string | null;
  blockers: string[];
};

const hasText = (value: string) => value.trim().length > 0;

export function calculateClientProfileReadiness(
  data: ClientProfileData,
): ClientProfileReadiness {
  const sectionRules: Array<{
    id: ProfileSectionId;
    title: string;
    description: string;
    checks: Array<[string, boolean]>;
  }> = [
    {
      id: 'identity',
      title: '身份与行业',
      description: 'IP 名称、角色、行业、从业经历',
      checks: [
        ['IP 或品牌名称', hasText(data.brandName)],
        ['本人角色', hasText(data.role)],
        ['主行业', hasText(data.industry)],
        ['从业起始年份或年限', hasText(data.experienceStartedYear)],
      ],
    },
    {
      id: 'business',
      title: '产品与服务',
      description: '当前主推业务、交付结果与承诺边界',
      checks: [
        ['当前主推产品或服务', hasText(data.primaryOffer)],
        ['客户能获得的具体变化', hasText(data.offerOutcome)],
        ['不能承诺的边界', hasText(data.promiseBoundary)],
      ],
    },
    {
      id: 'audience',
      title: '目标客户与进展',
      description: '真实情境、卡点、希望变化与选择标准',
      checks: [
        ['优先目标客户', hasText(data.targetCustomer)],
        ['客户所处情境', hasText(data.customerSituation)],
        ['客户当前卡点', hasText(data.customerBlocker)],
        ['客户希望发生的变化', hasText(data.desiredChange)],
      ],
    },
    {
      id: 'evidence',
      title: '真实经历与案例',
      description: '经历、方法、过程、案例及使用权限',
      checks: [
        ['至少一项客户独有素材', hasText(data.uniqueMaterial)],
        ['案例现状已回答', Boolean(data.caseStatus)],
        ['证据使用范围已选择', Boolean(data.evidenceUseScope)],
      ],
    },
    {
      id: 'voice',
      title: '我的说话习惯与拍摄方式',
      description: '本人语气、禁用表达与可接受形式',
      checks: [
        ['表达语气', hasText(data.tone)],
        ['至少一种拍摄形式', data.presentationModes.length > 0],
        ['禁用表达或明确暂无', hasText(data.dislikedPhrases)],
      ],
    },
    {
      id: 'conversion',
      title: '内容目标与承接',
      description: '唯一主目标、行动与最终批准人',
      checks: [
        ['流量/获客/变现主目标', Boolean(data.businessGoal)],
        ['唯一行动', hasText(data.primaryAction)],
        ['内容与资料使用说明已确认', data.privacyAcknowledged],
      ],
    },
    {
      id: 'research',
      title: '公开资料研究',
      description: '官方链接、研究范围与客户确认',
      checks: data.researchConsent
        ? [
            [
              '至少一个客户确认的官方来源',
              hasText(data.officialWebsite) || hasText(data.officialAccounts),
            ],
            ['研究范围已选择', data.researchScopes.length > 0],
          ]
        : [['是否允许联网研究已回答', true]],
    },
  ];

  const sections = sectionRules.map((section) => {
    const done = section.checks.filter(([, value]) => value).length;
    return {
      id: section.id,
      title: section.title,
      description: section.description,
      done,
      total: section.checks.length,
      complete: Math.round((done / section.checks.length) * 100),
    };
  });
  const flattened = sectionRules.flatMap((section) => section.checks);
  const answered = flattened.filter(([, value]) => value).length;
  const blockers = flattened
    .filter(([, value]) => !value)
    .map(([label]) => label);
  const minimumReady = blockers.length === 0;

  return {
    complete: Math.round((answered / flattened.length) * 100),
    answered,
    total: flattened.length,
    minimumReady,
    canGenerateTopics: minimumReady,
    canGenerateScripts:
      minimumReady &&
      hasText(data.voiceSample || data.tone) &&
      data.presentationModes.length > 0,
    sections,
    nextQuestion: blockers[0] ?? null,
    blockers,
  };
}

const STRING_LIMITS: Record<
  Exclude<
    keyof ClientProfileData,
    | 'experiencePublic'
    | 'caseStatus'
    | 'evidenceUseScope'
    | 'businessGoal'
    | 'researchStatus'
    | 'presentationModes'
    | 'researchConsent'
    | 'researchScopes'
    | 'privacyAcknowledged'
  >,
  number
> = {
  workspaceName: 80,
  brandName: 80,
  role: 120,
  industry: 80,
  subIndustry: 120,
  experienceStartedYear: 40,
  serviceRegion: 120,
  primaryOffer: 500,
  offerOutcome: 800,
  deliveryMode: 500,
  priceRange: 120,
  promiseBoundary: 800,
  targetCustomer: 500,
  decisionMaker: 200,
  customerSituation: 800,
  customerBlocker: 800,
  desiredChange: 800,
  currentAlternative: 800,
  selectionCriteria: 800,
  uniqueMaterial: 1200,
  evidenceSummary: 1200,
  primaryAction: 300,
  handoffOwner: 120,
  tone: 500,
  voiceSample: 2000,
  dislikedPhrases: 800,
  officialWebsite: 500,
  officialAccounts: 1200,
  researchRequestedAt: 80,
  finalApprover: 120,
};

export function parseClientProfileData(value: unknown): {
  data: ClientProfileData | null;
  errors: string[];
} {
  const errors: string[] = [];
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { data: null, errors: ['客户档案格式不正确'] };
  }
  const input = value as Record<string, unknown>;
  const base = createEmptyClientProfileData();
  const data = { ...base };

  for (const [key, limit] of Object.entries(STRING_LIMITS)) {
    const raw = input[key];
    if (raw === undefined || raw === null) continue;
    if (typeof raw !== 'string') {
      errors.push(`${key} 必须是文字`);
      continue;
    }
    if (raw.length > limit) {
      errors.push(`${key} 内容过长`);
      continue;
    }
    (data as unknown as Record<string, unknown>)[key] = raw.trim();
  }

  for (const key of [
    'experiencePublic',
    'researchConsent',
    'privacyAcknowledged',
  ] as const) {
    const raw = input[key];
    if (raw === undefined) continue;
    if (typeof raw !== 'boolean') errors.push(`${key} 必须是布尔值`);
    else data[key] = raw;
  }

  const enumValue = <T extends string>(
    key: string,
    allowed: readonly T[],
    fallback: T,
  ): T => {
    const raw = input[key];
    if (raw === undefined) return fallback;
    if (typeof raw !== 'string' || !allowed.includes(raw as T)) {
      errors.push(`${key} 选项不正确`);
      return fallback;
    }
    return raw as T;
  };

  data.caseStatus = enumValue(
    'caseStatus',
    ['has_evidence', 'to_add', 'no_public_case'] as const,
    base.caseStatus,
  );
  data.evidenceUseScope = enumValue(
    'evidenceUseScope',
    [
      'content_allowed',
      'anonymous_only',
      'internal_only',
      'prohibited',
    ] as const,
    base.evidenceUseScope,
  );
  data.businessGoal = enumValue(
    'businessGoal',
    ['', 'traffic', 'acquisition', 'monetization'] as const,
    base.businessGoal,
  );
  data.researchStatus = enumValue(
    'researchStatus',
    ['not_requested', 'scope_saved', 'needs_review', 'confirmed'] as const,
    base.researchStatus,
  );

  const parseEnumArray = <T extends string>(
    key: string,
    allowed: readonly T[],
  ): T[] => {
    const raw = input[key];
    if (raw === undefined) return [];
    if (!Array.isArray(raw) || raw.some((item) => typeof item !== 'string')) {
      errors.push(`${key} 必须是选项数组`);
      return [];
    }
    const values = [...new Set(raw)] as T[];
    if (values.some((item) => !allowed.includes(item))) {
      errors.push(`${key} 包含未知选项`);
      return [];
    }
    return values;
  };

  data.presentationModes = parseEnumArray('presentationModes', [
    'fixed_talking_head',
    'vlog_process',
    'screen_tutorial',
    'mixed',
  ] as const);
  data.researchScopes = parseEnumArray('researchScopes', [
    'company',
    'industry',
    'customer_questions',
    'competitors',
  ] as const);

  if (data.officialWebsite) {
    try {
      const url = new URL(data.officialWebsite);
      if (!['http:', 'https:'].includes(url.protocol)) {
        errors.push('官网链接只支持 http 或 https');
      }
    } catch {
      errors.push('官网链接格式不正确');
    }
  }

  return { data: errors.length ? null : data, errors };
}
