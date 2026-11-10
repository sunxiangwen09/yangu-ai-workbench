'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BookOpenText,
  CalendarDays,
  Check,
  ChevronDown,
  CircleAlert,
  Clock3,
  Copy,
  Database,
  Download,
  Eye,
  ExternalLink,
  FileText,
  Film,
  FlaskConical,
  Gauge,
  HardDrive,
  Inbox,
  Layers3,
  LayoutDashboard,
  Link2,
  Lock,
  Menu,
  MessageSquareText,
  PencilLine,
  PlugZap,
  Plus,
  Radio,
  RefreshCw,
  Save,
  Scissors,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Target,
  Table2,
  Trash2,
  Upload,
  UserCheck,
  Users,
  Video,
  X,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CommentPolicyDialog } from '@/components/workbench/comment-policy';
import { PlatformAccounts } from '@/components/workbench/platform-accounts';
import { CloudCapabilities } from '@/components/workbench/cloud-capabilities';
import { WorkflowHub } from '@/components/workbench/workflow-hub';
import { StrategyWorkspace } from '@/components/workbench/strategy-workspace';
import { StartWorkspace } from '@/components/workbench/start-workspace';
import {
  AuditWorkspace,
  VideoCheckCard,
} from '@/components/workbench/audit-workspace';
import { useUnsavedChanges } from '@/lib/use-unsaved-changes';
import {
  extractDouyinLink,
  analysisMatchesSelection,
  claimMatchesTab,
  evidenceQuote,
  commentSelectionLabel,
} from '@/lib/research-link';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DEFAULT_RESEARCH_POLICY,
  getCommentPreset,
  type ResearchPolicy,
  type SavedResearchPolicy,
} from '@/lib/research-policy';
import {
  topicBriefs,
  type ContentGenre,
  type EvidenceStatus,
  type TopicBrief,
} from '@/components/workbench/topic-briefs';
import {
  ClientProfileOnboarding,
  ClientProfilesError,
  ClientProfilesLoading,
  ClientProfileWorkspace,
  type PersistClientProfile,
} from '@/components/workbench/client-profile';
import {
  calculateClientProfileReadiness,
  type ClientProfileRecord,
} from '@/lib/client-profile';
import {
  comprehensionEditingMethod,
  editingResearchSample,
} from '@/components/workbench/research-sample';

type ViewId =
  | 'dashboard'
  | 'audit'
  | 'workflow'
  | 'learning'
  | 'business'
  | 'topics'
  | 'research'
  | 'factory'
  | 'production'
  | 'publish'
  | 'analytics'
  | 'clients'
  | 'connections'
  | 'rules';

type ScriptRoute =
  | 'fixed_talking_head'
  | 'vlog_process'
  | 'screen_tutorial'
  | 'mixed';

type ScriptDraft = {
  genre: ContentGenre;
  route: ScriptRoute;
  script: string;
};

type GatewayConnection = 'checking' | 'ready' | 'not_configured' | 'offline';

type ResearchJob = {
  job_id: string;
  kind?: string;
  platform: string;
  creator_url: string | null;
  source_url?: string | null;
  state: string;
  stage: string;
  progress: {
    discovered: number;
    normalized: number;
    failed: number;
  };
  completeness: {
    complete: boolean;
    gap_count: number;
    gaps?: string[];
    posts?: {
      complete: boolean;
      unique_works: number;
      range_exhausted: boolean;
    };
    comments?: {
      works_total: number;
      works_top_level_complete: number;
      works_replies_complete: number;
      top_level_comments: number;
      replies: number;
      failed_pages: number;
      gap_count: number;
    };
  };
  cancel_requested: boolean;
  warning_count: number;
  failure: {
    present: boolean;
    recoverable: boolean;
    code?: string | null;
  };
  created_at: string | null;
  updated_at: string | null;
};

type ResearchJobDetail = {
  job: ResearchJob;
  content_count: number;
  comment_sync: {
    works_total: number;
    works_initialized: number;
    works_missing_sync: number;
    top_level_complete: number;
    replies_complete: number;
    top_level_comments: number;
    replies: number;
    failed_pages: number;
  };
};

type ResearchContent = {
  content_id: string;
  external_id: string | null;
  url: string | null;
  title: string | null;
  description: string | null;
  published_at: string | null;
  duration_ms: number | null;
  processing_state: string;
  metrics: Partial<
    Record<
      | 'play_count'
      | 'like_count'
      | 'comment_count'
      | 'share_count'
      | 'collect_count',
      number
    >
  >;
};

type ResearchContentsResponse = {
  items: ResearchContent[];
  count: number;
  total: number;
  offset: number;
  next_offset: number | null;
};

type ResearchTranscript = {
  transcript_id: string;
  transcript_kind: string;
  language: string | null;
  raw_text: string | null;
  verified_text: string | null;
  confidence: number | null;
  source: string;
  status: string;
  created_at: string | null;
  updated_at: string | null;
};

type ResearchTranscriptsResponse = {
  items: ResearchTranscript[];
  count: number;
  available: boolean;
};

type ResearchComment = {
  selection?: {
    method: string;
    scope: string;
    score?: number;
    categories?: string[];
    concrete_detail?: boolean;
  } | null;
  comment_id: string;
  parent_comment_id: string | null;
  root_comment_id: string | null;
  reply_to_comment_id: string | null;
  level: number;
  text: string | null;
  author: {
    display_name: string | null;
    unique_id: string | null;
    is_creator: boolean;
  };
  like_count: number | null;
  reply_count_hint: number | null;
  created_at_platform: string | null;
  creator_liked: boolean;
  source_page: number | null;
  source_cursor: string | null;
  observed_at: string | null;
};

type ResearchCommentsResponse = {
  items: ResearchComment[];
  count: number;
  total: number;
  offset: number;
  next_offset: number | null;
};

type ResearchCommentCoverage = {
  sampling?: {
    candidate_limit: number | null;
    selected_limit: number | null;
    reply_limit: number | null;
    candidates_seen: number;
    selected_count: number;
    stop_reason: string | null;
    selection_method: string;
    scope: string;
  };
  content_id: string;
  external_id: string;
  mode: string;
  complete: boolean;
  top_level: {
    status: string;
    pages: number;
    saved: number;
    provider_reported: number | null;
  };
  replies: {
    status: string;
    root_threads_total: number;
    root_threads_complete: number;
    saved: number;
  };
  failed_or_incomplete_pages: number;
  page_receipts: Array<{
    page_kind: string;
    root_comment_id: string | null;
    page_number: number;
    item_count: number;
    total_hint: number | null;
    has_more: boolean | null;
    status: string;
    fetched_at: string | null;
  }>;
  reply_threads: Array<{
    root_comment_id: string;
    status: string;
    pages: number;
    saved: number;
    provider_reported: number | null;
    completed_at: string | null;
  }>;
  gaps: string[];
  scope_statement: string;
};

type GatewayCapabilities = {
  providers: Array<{ name: string; configured: boolean }>;
  evidence_import?: { supported: boolean; schema_version: number };
  secrets_exposed: false;
};

type ContentAnalysis = {
  analysis_id: string;
  content_id: string;
  evidence_job_id: string;
  current_revision: number;
  review_status: 'needs_review' | 'approved' | 'changes_requested' | 'rejected';
  revision_review_status: string;
  revision: {
    revision: number;
    schema_version: number;
    content_genre: {
      primary: ContentGenre | null;
      secondary: ContentGenre[];
      confidence: number | null;
      classification_reason: string | null;
      review_status: string;
      evidence_refs: string[];
    };
    content_form: {
      type: ScriptRoute | 'image_text' | 'unknown';
      presentation_variant: string | null;
      confidence: number | null;
      classification_reason: string | null;
      review_status: string;
      evidence_refs: string[];
    };
    business_role: {
      designed_function: {
        primary: 'traffic' | 'acquisition' | 'monetization' | null;
        secondary: Array<'traffic' | 'acquisition' | 'monetization'>;
        reason: string | null;
        evidence_refs: string[];
        confidence: number | null;
        review_status: string;
      };
      observed_outcomes: Record<
        'traffic' | 'acquisition' | 'monetization',
        { evidence_level: string; evidence_refs: string[] }
      >;
    };
    original_transcript_ref: string | null;
    clean_transcript_ref: string | null;
    author_kind: string;
    created_at: string | null;
  };
  claims: Array<{
    claim_id: string;
    domain: string;
    statement: string | null;
    epistemic_status: string;
    confidence: number | null;
  }>;
  evidence_links: Array<{
    link_ref: string;
    claim_id: string | null;
    relation: string;
    evidence_type: string;
    evidence_ref_id: string | null;
  }>;
  reviews: Array<{
    revision: number;
    decision: string;
    to_status: string;
    note: string | null;
    created_at: string | null;
  }>;
};

const LOCAL_GATEWAY_BASE = 'http://127.0.0.1:8765/internal-api/v1';
const TERMINAL_JOB_STATES = new Set([
  'completed',
  'partially_completed',
  'failed',
  'cancelled',
]);

const genreLabels: Record<ContentGenre, string> = {
  process_record: '记录过程',
  knowledge: '干货',
  opinion: '观点',
  story: '故事',
};

const formLabels: Record<
  ContentAnalysis['revision']['content_form']['type'],
  string
> = {
  fixed_talking_head: '固定口播',
  vlog_process: '现场 Vlog',
  screen_tutorial: '录屏教程',
  mixed: '混合型',
  image_text: '图文',
  unknown: '待判定',
};

const businessLabels = {
  traffic: '做流量',
  acquisition: '做获客',
  monetization: '做变现',
} as const;

const reviewStatusLabels: Record<ContentAnalysis['review_status'], string> = {
  needs_review: '待复核',
  approved: '已批准',
  changes_requested: '需修改',
  rejected: '已驳回',
};

async function localGatewayRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 4500);
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  try {
    const response = await fetch(`${LOCAL_GATEWAY_BASE}${path}`, {
      ...init,
      cache: 'no-store',
      signal: controller.signal,
      headers,
    });
    const payload = (await response.json()) as T & {
      error?: { message?: string };
    };
    if (!response.ok) {
      throw new Error(
        payload.error?.message || `本机任务请求失败（${response.status}）`,
      );
    }
    return payload;
  } finally {
    window.clearTimeout(timeout);
  }
}

const viewMeta: Record<
  ViewId,
  { label: string; kicker: string; title: string; description: string }
> = {
  audit: {
    label: '测试与问题清单',
    kicker: '内部验收',
    title: '哪些能用，哪些待补',
    description: '问题逐条记录，不把页面入口当成可用功能。',
  },
  workflow: {
    label: '流程总览',
    kicker: '五个阶段 · 按需进入',
    title: '从了解业务到下一轮内容',
    description: '每个功能说明输入、交付和真实进度，不强制走完所有步骤。',
  },
  learning: {
    label: '我的说话习惯与案例',
    kicker: '学习与定位',
    title: '保留你的表达，积累真实依据',
    description: '本人表达样本、案例摘要和公开权限，保存到当前客户资料。',
  },
  business: {
    label: '变现与承接',
    kicker: '设计变现',
    title: '内容最终为哪项业务服务',
    description: '整理产品、受众、交付和咨询承接，不编造收益预测。',
  },
  dashboard: {
    label: '开始工作',
    kicker: '内部创作台 · 当前能力与下一步',
    title: '今天把一条内容真正走到可发布',
    description:
      '这里不再堆系统模块，只显示今天要确认的选题、脚本、成片、发布与评论线索。',
  },
  topics: {
    label: '找选题',
    kicker: '选题雷达',
    title: '先找到客户正在关心什么，再决定拍什么',
    description:
      '每个选题都要说清来源、为什么值得拍、说给谁听、内容主类型和拍摄形式，再交付可审核的完整脚本。',
  },
  research: {
    label: '博主研究与视频拆解',
    kicker: '按需研究',
    title: '拆一条参考视频',
    description:
      '先看正文与评论，再找值得借鉴的方法。没有参考视频也可以直接写稿。',
  },
  factory: {
    label: '写脚本',
    kicker: '连续正文',
    title: '直接写，边写边改',
    description: '沿用当前类型和拍法，不必重新选择。',
  },
  production: {
    label: '做视频',
    kicker: '制作标准与样例 · 执行器待接入',
    title: '口播原片进来，审核通过的成片出去',
    description:
      '先明确拍摄形式、剪辑和审核标准；真实原片处理、AI 动画与成片执行器尚未接通。',
  },
  publish: {
    label: '审核发布',
    kicker: '发布流程规划 · 云端发布待接通',
    title: '一条成片，生成三套平台发布版本',
    description:
      '目标是分平台准备标题、封面字、正文与话题，审核后排期。当前尚未接通账号授权或真实自动发布。',
  },
  analytics: {
    label: '看反馈',
    kicker: '评论 · 线索 · 单条视频台账',
    title: '每条视频都有自己的评论、数据与获客复盘表',
    description:
      '先定义播放、互动、评论、咨询和线索的复盘口径；真实后台数据、私信与成交信息尚未自动回流。',
  },
  clients: {
    label: 'IP 与业务资料',
    kicker: '每个客户的长期内容底稿',
    title: '先让 AI 读懂这位客户的业务、人设和真实证据',
    description:
      '可以先进入工作台，再按需补充业务资料；分步访谈随时可继续，每个客户的资料分别保存。',
  },
  connections: {
    label: '平台与模型',
    kicker: '发布账号 · 数据源 · AI 制作能力',
    title: '把账号、采集通道、剪辑引擎与视频模型接进同一系统',
    description:
      '抖音、小红书、视频号授权与 Seedance、MiniMax、HyperFrames 等能力逐项显示真实状态。',
  },
  rules: {
    label: '素材、技能与记忆',
    kicker: '长期素材与工作标准',
    title: '把好内容背后的素材、规则和审美留下来',
    description:
      '事实、案例、口播标准、剪辑样例和回复知识共同沉淀；推断与建议不冒充事实。',
  },
};

const navGroups: Array<{
  label: string;
  collapsed?: boolean;
  items: Array<{ id: ViewId; icon: typeof LayoutDashboard; badge?: string }>;
}> = [
  {
    label: '日常创作',
    items: [
      { id: 'dashboard', icon: LayoutDashboard },
      { id: 'topics', icon: Radio },
      { id: 'factory', icon: PencilLine },
      { id: 'production', icon: Scissors },
      { id: 'publish', icon: CalendarDays },
      { id: 'analytics', icon: Inbox },
    ],
  },
  {
    label: '资料与研究工具',
    collapsed: true,
    items: [
      { id: 'clients', icon: Users },
      { id: 'research', icon: Search },
      { id: 'business', icon: Target },
      { id: 'connections', icon: PlugZap },
    ],
  },
  {
    label: '使用说明与内部维护',
    collapsed: true,
    items: [
      { id: 'workflow', icon: Layers3 },
      { id: 'rules', icon: ShieldCheck },
      { id: 'audit', icon: FlaskConical },
    ],
  },
];

const routeDetails: Record<
  ScriptRoute,
  { label: string; code: string; desc: string }
> = {
  fixed_talking_head: {
    label: '固定口播',
    code: 'fixed_talking_head',
    desc: '只输出连续原文和文字结构，不生成分镜。',
  },
  vlog_process: {
    label: 'Vlog / 现场跟拍',
    code: 'vlog_process',
    desc: '只拆真实事件、关键动作和必要镜头。',
  },
  screen_tutorial: {
    label: '录屏教程',
    code: 'screen_tutorial',
    desc: '只输出目标、步骤、关键界面和错误处理。',
  },
  mixed: {
    label: '混合型',
    code: 'mixed',
    desc: '连续口播块保留，只标有意义的视觉变化。',
  },
};

const genreDetails: Record<
  ContentGenre,
  { label: string; code: string; promise: string; desc: string }
> = {
  process_record: {
    label: '记录过程',
    code: 'process_record',
    promise: '让客户看见一件真实工作如何发生和完成',
    desc: '起点、关键节点、真实动作、结果或当前状态都要有证据。',
  },
  knowledge: {
    label: '干货',
    code: 'knowledge',
    promise: '让客户学会一个步骤、判断标准或避坑方法',
    desc: '说明为什么、适用条件、常见错误和风险，不只给结论。',
  },
  opinion: {
    label: '观点',
    code: 'opinion',
    promise: '讲清一句可被同意或反对的中心判断',
    desc: '用处境、证据、案例、合理反方和边界完成论证。',
  },
  story: {
    label: '故事',
    code: 'story',
    promise: '让人物、冲突、行动和变化构成完整经历',
    desc: '有案例、角色或情绪不等于故事，必须出现结果或状态变化。',
  },
};

const genreQualityGates: Record<ContentGenre, string[]> = {
  process_record: [
    '任务或起点明确',
    '关键节点有顺序',
    '动作与承诺有现场证据',
    '结果或当前状态清楚',
    '真实记录与情景再现分开',
    '客户、员工和单据已授权脱敏',
  ],
  knowledge: [
    '观众学会的结果明确',
    '步骤或判断标准完整',
    '解释原因而非只给结论',
    '适用条件与边界清楚',
    '常见错误或风险已说明',
    '高风险结论有来源与日期',
  ],
  opinion: [
    '一句话核心可争辩',
    '目标客户处境具体',
    '至少两组相关证据或案例',
    '因果链完整',
    '回应一个合理反方',
    '说明边界并只给一个行动',
  ],
  story: [
    '人物与初始处境明确',
    '目标或欲望清楚',
    '冲突来自具体事件',
    '人物采取了真实行动',
    '出现转折或状态变化',
    '结果与隐私授权已核验',
  ],
};

function StatusBadge({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode;
  tone?: 'safe' | 'warn' | 'danger' | 'neutral' | 'info';
}) {
  const classes = {
    safe: 'border-[#6ca178]/25 bg-[#6ca178]/8 text-[#397748]',
    warn: 'border-amber/35 bg-amber/10 text-amber-ink',
    danger: 'border-coral/30 bg-coral/8 text-[#b24730]',
    neutral: 'border-border bg-muted/70 text-muted-foreground',
    info: 'border-ink/15 bg-ink/5 text-ink',
  };
  return (
    <Badge variant="outline" className={`text-[10px] ${classes[tone]}`}>
      {children}
    </Badge>
  );
}

function evidenceTone(status: EvidenceStatus): 'safe' | 'warn' | 'danger' {
  if (status === 'ready') return 'safe';
  if (status === 'blocked') return 'danger';
  return 'warn';
}

function ViewHeader({
  view,
  actions,
}: {
  view: ViewId;
  actions?: React.ReactNode;
}) {
  const meta = viewMeta[view];
  return (
    <section className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
      <div>
        <div className="eyebrow">
          <Activity className="size-3.5" /> {meta.kicker}
        </div>
        <h1 className="mt-3 max-w-4xl text-[clamp(1.75rem,3vw,2.55rem)] font-semibold leading-[1.08] tracking-[-0.045em]">
          {meta.title}
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
          {meta.description}
        </p>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </section>
  );
}

function EmptyConnection({
  title,
  description,
  action,
  onAction,
}: {
  title: string;
  description: string;
  action: string;
  onAction: () => void;
}) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-muted/30 p-5 text-center">
      <div className="mx-auto grid size-9 place-items-center rounded-xl bg-white text-muted-foreground shadow-sm">
        <PlugZap className="size-4" />
      </div>
      <div className="mt-3 text-sm font-medium">{title}</div>
      <p className="mx-auto mt-1 max-w-sm text-[11px] leading-5 text-muted-foreground">
        {description}
      </p>
      <Button className="mt-3" variant="outline" size="sm" onClick={onAction}>
        {action}
      </Button>
    </div>
  );
}

export function WorkbenchApp({
  viewer,
}: {
  viewer: { displayName: string; email: string };
}) {
  const [activeView, setActiveView] = useState<ViewId>('dashboard');
  const [strategyDirty, setStrategyDirty] = useState(false);
  const [researchInitialUrl, setResearchInitialUrl] = useState('');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [savedTopics, setSavedTopics] = useState<string[]>(['topic-1']);
  const [selectedTopicId, setSelectedTopicId] = useState(topicBriefs[0].id);
  const [scriptDrafts, setScriptDrafts] = useState<Record<string, ScriptDraft>>(
    {},
  );
  const [storageReady, setStorageReady] = useState(false);
  const [loadedProfileId, setLoadedProfileId] = useState('');
  const [notice, setNotice] = useState('');
  const [profiles, setProfiles] = useState<ClientProfileRecord[]>([]);
  const [profilesState, setProfilesState] = useState<
    'loading' | 'ready' | 'error'
  >('loading');
  const [profilesError, setProfilesError] = useState('');
  const [activeProfileId, setActiveProfileId] = useState('');
  const [onboardingProfileId, setOnboardingProfileId] = useState<string | null>(
    null,
  );
  const selectedTopic =
    topicBriefs.find((topic) => topic.id === selectedTopicId) ?? topicBriefs[0];
  const activeProfile =
    profiles.find((profile) => profile.id === activeProfileId) ?? profiles[0];

  const loadProfiles = useCallback(async () => {
    setProfilesState('loading');
    setProfilesError('');
    try {
      const response = await fetch('/api/client-profiles', {
        cache: 'no-store',
      });
      const payload = (await response.json()) as {
        profiles?: ClientProfileRecord[];
        error?: string;
      };
      if (!response.ok || !payload.profiles) {
        throw new Error(payload.error || '客户档案载入失败');
      }
      const nextProfiles = payload.profiles;
      setProfiles(nextProfiles);
      const preferredId = window.localStorage.getItem(
        'huoke-os-active-client-v1',
      );
      const preferred =
        nextProfiles.find((profile) => profile.id === preferredId) ??
        nextProfiles[0];
      if (!preferred) {
        setActiveProfileId('');
        setOnboardingProfileId('new');
      } else {
        setActiveProfileId(preferred.id);
        window.localStorage.setItem('huoke-os-active-client-v1', preferred.id);
        setOnboardingProfileId(null);
      }
      setProfilesState('ready');
    } catch (caught) {
      setProfilesError(
        caught instanceof Error ? caught.message : '客户档案载入失败',
      );
      setProfilesState('error');
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadProfiles(), 0);
    return () => window.clearTimeout(timer);
  }, [loadProfiles]);

  const persistClientProfile: PersistClientProfile = useCallback(
    async (data, options) => {
      const response = await fetch('/api/client-profiles', {
        method: options.id ? 'PUT' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          id: options.id,
          expectedVersion: options.expectedVersion,
          status: options.status,
          data,
        }),
      });
      const payload = (await response.json()) as {
        profile?: ClientProfileRecord;
        error?: string;
      };
      if (!response.ok || !payload.profile) {
        throw new Error(payload.error || '客户档案保存失败');
      }
      const saved = payload.profile;
      setProfiles((current) => {
        const exists = current.some((profile) => profile.id === saved.id);
        return exists
          ? current.map((profile) =>
              profile.id === saved.id ? saved : profile,
            )
          : [saved, ...current];
      });
      setActiveProfileId(saved.id);
      window.localStorage.setItem('huoke-os-active-client-v1', saved.id);
      return saved;
    },
    [],
  );

  useEffect(() => {
    if (!activeProfileId) return;
    const timer = window.setTimeout(() => {
      setStorageReady(false);
      setSavedTopics(['topic-1']);
      setSelectedTopicId(topicBriefs[0].id);
      setScriptDrafts({});
      const clientStorageKey = `huoke-os-client-${activeProfileId}-v1`;
      const saved =
        window.localStorage.getItem(clientStorageKey) ??
        window.localStorage.getItem('huoke-os-v3') ??
        window.localStorage.getItem('huoke-os-v2') ??
        window.localStorage.getItem('huoke-os-v1');
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as {
            savedTopics?: string[];
            selectedTopicId?: string;
            scriptDrafts?: Record<string, Partial<ScriptDraft>>;
          };
          if (parsed.savedTopics) {
            setSavedTopics(
              parsed.savedTopics.filter((id) =>
                topicBriefs.some((topic) => topic.id === id),
              ),
            );
          }
          if (
            parsed.selectedTopicId &&
            topicBriefs.some((topic) => topic.id === parsed.selectedTopicId)
          ) {
            setSelectedTopicId(parsed.selectedTopicId);
          }
          if (parsed.scriptDrafts) {
            const validGenres = new Set<ContentGenre>([
              'process_record',
              'knowledge',
              'opinion',
              'story',
            ]);
            const validRoutes = new Set<ScriptRoute>([
              'fixed_talking_head',
              'vlog_process',
              'screen_tutorial',
              'mixed',
            ]);
            const restored = Object.entries(parsed.scriptDrafts).reduce<
              Record<string, ScriptDraft>
            >((result, [id, draft]) => {
              if (
                topicBriefs.some((topic) => topic.id === id) &&
                validGenres.has(draft.genre as ContentGenre) &&
                validRoutes.has(draft.route as ScriptRoute) &&
                typeof draft.script === 'string'
              ) {
                result[id] = {
                  genre: draft.genre as ContentGenre,
                  route: draft.route as ScriptRoute,
                  script: draft.script,
                };
              }
              return result;
            }, {});
            setScriptDrafts(restored);
          }
        } catch {
          // Keep safe defaults when old local state is malformed.
        }
      }
      window.localStorage.removeItem('huoke-os-v1');
      window.localStorage.removeItem('huoke-os-v2');
      window.localStorage.removeItem('huoke-os-v3');
      setLoadedProfileId(activeProfileId);
      setStorageReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [activeProfileId]);

  useEffect(() => {
    if (
      !storageReady ||
      !activeProfileId ||
      loadedProfileId !== activeProfileId
    )
      return;
    window.localStorage.setItem(
      `huoke-os-client-${activeProfileId}-v1`,
      JSON.stringify({ savedTopics, selectedTopicId, scriptDrafts }),
    );
  }, [
    activeProfileId,
    loadedProfileId,
    savedTopics,
    scriptDrafts,
    selectedTopicId,
    storageReady,
  ]);

  const flash = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 2600);
  };

  const go = (id: ViewId) => {
    if (id !== activeView && strategyDirty) {
      flash('本页有未保存内容，请先保存或放弃修改');
      return;
    }
    setActiveView(id === 'learning' ? 'clients' : id);
    setMobileNavOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleTopic = (id: string) => {
    setSavedTopics((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  };

  if (profilesState === 'loading') {
    return <ClientProfilesLoading viewerName={viewer.displayName} />;
  }

  if (profilesState === 'error') {
    return (
      <ClientProfilesError message={profilesError} onRetry={loadProfiles} />
    );
  }

  const onboardingProfile =
    onboardingProfileId && onboardingProfileId !== 'new'
      ? profiles.find((profile) => profile.id === onboardingProfileId)
      : null;

  if (!profiles.length || onboardingProfileId) {
    return (
      <ClientProfileOnboarding
        key={onboardingProfile?.id ?? 'new-client'}
        viewerName={viewer.displayName}
        initialProfile={onboardingProfile}
        allowCancel={onboardingProfileId === 'new' && profiles.length > 0}
        onPersist={persistClientProfile}
        onComplete={(profile) => {
          setActiveProfileId(profile.id);
          setOnboardingProfileId(null);
          setActiveView('clients');
        }}
        onSkip={(profile) => {
          setActiveProfileId(profile.id);
          setOnboardingProfileId(null);
          setActiveView('dashboard');
        }}
        onCancel={() => setOnboardingProfileId(null)}
      />
    );
  }

  if (!activeProfile) {
    return <ClientProfilesLoading viewerName={viewer.displayName} />;
  }

  return (
    <main className="workbench-readable min-h-screen bg-background text-foreground">
      <aside className="sidebar-shell fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col px-4 py-5 lg:flex">
        <Brand />
        <ProjectSwitcher profile={activeProfile} onOpen={() => go('clients')} />
        <SidebarNav activeView={activeView} onNavigate={go} />
        <ConnectionSummary onOpen={() => go('connections')} />
      </aside>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-ink/30 backdrop-blur-sm"
            aria-label="关闭菜单"
            onClick={() => setMobileNavOpen(false)}
          />
          <aside className="sidebar-shell relative flex h-full w-[278px] flex-col px-4 py-5 shadow-2xl">
            <div className="flex items-center">
              <Brand />
              <Button
                className="ml-auto text-white/60 hover:bg-white/10 hover:text-white"
                variant="ghost"
                size="icon"
                onClick={() => setMobileNavOpen(false)}
              >
                <X />
              </Button>
            </div>
            <ProjectSwitcher
              profile={activeProfile}
              onOpen={() => go('clients')}
            />
            <SidebarNav activeView={activeView} onNavigate={go} />
            <ConnectionSummary onOpen={() => go('connections')} />
          </aside>
        </div>
      )}

      <div className="lg:pl-[248px]">
        <header className="sticky top-0 z-20 flex h-16 items-center border-b border-border/80 bg-background/88 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <Button
            variant="ghost"
            size="icon"
            className="mr-2 lg:hidden"
            aria-label="打开菜单"
            onClick={() => setMobileNavOpen(true)}
          >
            <Menu />
          </Button>
          <div className="flex min-w-0 items-center gap-2 lg:hidden">
            <div className="brand-mark size-8">
              <Sparkles className="size-4" />
            </div>
            <div className="truncate text-sm font-semibold">衍谷 AI</div>
          </div>
          <div className="hidden text-xs text-muted-foreground lg:block">
            AI 短视频获客 · 你的内部创作系统
          </div>
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <Badge
              variant="outline"
              className="hidden border-amber/30 bg-amber/8 text-amber-ink md:inline-flex"
            >
              <FlaskConical /> 内部共创版 · 未对客户开放
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              aria-label="设置"
              onClick={() => go('connections')}
            >
              <Settings2 />
            </Button>
            <div className="grid size-8 place-items-center rounded-full bg-ink text-[11px] font-semibold text-white">
              {(viewer.displayName || viewer.email || '用')
                .slice(0, 1)
                .toUpperCase()}
            </div>
          </div>
        </header>

        <div className="border-b border-border bg-white/55 px-4 py-2 lg:hidden">
          <div className="flex gap-1 overflow-x-auto">
            {navGroups
              .flatMap((group) => group.items)
              .filter((item) =>
                [
                  'dashboard',
                  'topics',
                  'factory',
                  'production',
                  'publish',
                ].includes(item.id),
              )
              .map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => go(item.id)}
                  className={`shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-medium ${activeView === item.id ? 'bg-ink text-white' : 'text-muted-foreground'}`}
                >
                  {viewMeta[item.id].label}
                </button>
              ))}
            <button
              type="button"
              className="shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium"
              onClick={() => setMobileNavOpen(true)}
            >
              更多功能
            </button>
          </div>
        </div>

        <div className="mx-auto max-w-[1460px] px-4 pb-16 pt-7 sm:px-6 lg:px-8">
          {(activeView === 'topics' || activeView === 'factory') && (
            <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-white p-4">
              <p className="flex-1 text-sm leading-6 text-muted-foreground">
                上方服务窗口用于真实研究与生成，需运营者配置后实测；下方参考工作区仍只保存于本设备。
              </p>
              <Button variant="outline" onClick={() => go('clients')}>
                补充资料
              </Button>
            </div>
          )}
          <div key={activeView} className="view-enter">
            {activeView === 'workflow' && (
              <WorkflowHub
                clientName={
                  activeProfile.data.brandName ||
                  activeProfile.data.workspaceName
                }
                go={go}
              />
            )}
            {activeView === 'business' && (
              <StrategyWorkspace
                key={`${activeView}-${activeProfile.id}`}
                mode={activeView}
                profile={activeProfile}
                onPersist={persistClientProfile}
                go={go}
                onDirtyChange={setStrategyDirty}
              />
            )}
            {activeView === 'dashboard' && (
              <StartWorkspace
                profile={activeProfile}
                draftCount={Object.keys(scriptDrafts).length}
                go={go}
                onResearch={(url) => {
                  setResearchInitialUrl(url);
                  go('research');
                }}
              />
            )}
            {activeView === 'audit' && <AuditWorkspace />}
            {activeView === 'topics' && (
              <>
                <CloudCapabilities
                  mode="search"
                  profileId={activeProfile.id}
                  onConfigure={() => go('connections')}
                />
                <details>
                  <summary className="mb-4 cursor-pointer text-sm font-medium">
                    参考选题与原有草稿
                  </summary>
                  <TopicsView
                    drafts={scriptDrafts}
                    savedTopics={savedTopics}
                    selectedTopicId={selectedTopicId}
                    onSelectTopic={setSelectedTopicId}
                    toggleTopic={toggleTopic}
                    onOpenScript={(id) => {
                      setSelectedTopicId(id);
                      go('factory');
                    }}
                    flash={flash}
                  />
                </details>
              </>
            )}
            {activeView === 'research' && (
              <>
                <ResearchView
                  key={activeProfile.id}
                  initialUrl={researchInitialUrl}
                  go={go}
                  flash={flash}
                />
                <details className="mt-6">
                  <summary className="mb-4 cursor-pointer text-sm font-medium">
                    备用云端数据服务（需单独配置，默认不用）
                  </summary>
                  <CloudCapabilities
                    key={'cloud-' + activeProfile.id}
                    mode="collect"
                    initialUrl={researchInitialUrl}
                    profileId={activeProfile.id}
                    onConfigure={() => go('connections')}
                  />
                </details>
              </>
            )}
            {activeView === 'factory' && (
              <>
                <CloudCapabilities
                  mode="write"
                  profileId={activeProfile.id}
                  onConfigure={() => go('connections')}
                />
                <details>
                  <summary className="mb-4 cursor-pointer text-sm font-medium">
                    继续编辑原有参考稿
                  </summary>
                  <FactoryView
                    key={selectedTopic.id}
                    topic={selectedTopic}
                    draft={scriptDrafts[selectedTopic.id]}
                    onSave={(draft) =>
                      setScriptDrafts((current) => ({
                        ...current,
                        [selectedTopic.id]: draft,
                      }))
                    }
                    flash={flash}
                    onDirtyChange={setStrategyDirty}
                  />
                </details>
              </>
            )}
            {activeView === 'production' && (
              <>
                <CloudCapabilities
                  mode="production"
                  onConfigure={() => go('connections')}
                />
                <details>
                  <summary className="mb-4 cursor-pointer text-sm font-medium">
                    制作标准与样例
                  </summary>
                  <ProductionView go={go} flash={flash} />
                </details>
              </>
            )}
            {activeView === 'publish' && <PublishView go={go} flash={flash} />}
            {activeView === 'analytics' && <AnalyticsView flash={flash} />}
            {activeView === 'clients' && (
              <ClientProfileWorkspace
                key={activeProfile.id}
                profiles={profiles}
                activeProfile={activeProfile}
                onSelect={(id) => {
                  setActiveProfileId(id);
                  window.localStorage.setItem('huoke-os-active-client-v1', id);
                }}
                onNew={() => setOnboardingProfileId('new')}
                onContinueInterview={(id) => setOnboardingProfileId(id)}
                onPersist={persistClientProfile}
                flash={flash}
                onDirtyChange={setStrategyDirty}
              />
            )}
            {activeView === 'connections' && (
              <ConnectionsView flash={flash} viewer={viewer} />
            )}
            {activeView === 'rules' && <RulesView flash={flash} />}
          </div>
        </div>
      </div>

      {notice && (
        <output className="fixed bottom-5 left-1/2 z-[80] flex -translate-x-1/2 items-center gap-2 rounded-xl bg-ink px-4 py-3 text-xs font-medium text-white shadow-2xl">
          <MessageSquareText className="size-4 shrink-0 text-lime" /> {notice}
        </output>
      )}
    </main>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-3 px-2">
      <div className="brand-mark">
        <Sparkles className="size-[18px]" />
      </div>
      <div>
        <div className="font-semibold tracking-[-0.02em] text-white">
          衍谷 AI
        </div>
        <div className="mt-0.5 text-[11px] text-white/45">自媒体获客工作台</div>
      </div>
      <Badge className="ml-auto border-white/10 bg-white/8 text-[10px] text-white/60">
        V1
      </Badge>
    </div>
  );
}

function ProjectSwitcher({
  profile,
  onOpen,
}: {
  profile: ClientProfileRecord;
  onOpen: () => void;
}) {
  const readiness = calculateClientProfileReadiness(profile.data);
  const label =
    profile.data.workspaceName || profile.data.brandName || '我的工作区';
  return (
    <button
      type="button"
      onClick={onOpen}
      className="mt-6 w-full rounded-xl border border-white/8 bg-white/[0.045] p-2.5 text-left transition-colors hover:bg-white/[0.07]"
    >
      <div className="flex items-center gap-2.5">
        <div className="grid size-8 place-items-center rounded-lg bg-lime text-[12px] font-bold text-ink">
          {(profile.data.brandName || '客').slice(0, 1)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-medium text-white/90">
            {label}
          </div>
          <div className="mt-0.5 text-[10px] text-white/40">
            {profile.data.industry || '行业待补'} · 档案 {readiness.complete}%
          </div>
        </div>
        <ChevronDown className="size-3.5 text-white/35" />
      </div>
    </button>
  );
}

function SidebarNav({
  activeView,
  onNavigate,
}: {
  activeView: ViewId;
  onNavigate: (id: ViewId) => void;
}) {
  const items = (group: (typeof navGroups)[number]) => (
    <div className="mt-2 space-y-0.5">
      {group.items.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={
              'nav-item ' + (activeView === item.id ? 'nav-item-active' : '')
            }
            type="button"
          >
            <Icon className="size-[17px] shrink-0" />
            <span>{viewMeta[item.id].label}</span>
          </button>
        );
      })}
    </div>
  );
  return (
    <nav
      className="mt-5 flex-1 space-y-5 overflow-y-auto"
      aria-label="工作台导航"
    >
      {navGroups.map((group) =>
        group.collapsed ? (
          <details
            key={group.label}
            open={group.items.some((item) => item.id === activeView)}
            className="border-t border-white/10 pt-4"
          >
            <summary className="cursor-pointer px-3 py-2 text-sm text-white/65">
              {group.label}
            </summary>
            {items(group)}
          </details>
        ) : (
          <div key={group.label}>
            <div className="px-3 text-sm text-white/45">{group.label}</div>
            {items(group)}
          </div>
        ),
      )}
    </nav>
  );
}

function ConnectionSummary({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="rounded-xl border border-white/8 bg-[#183329] p-3">
      <div className="flex items-center gap-2 text-[11px] font-medium text-white/85">
        账号与连接
      </div>
      <p className="mt-1.5 text-[10px] leading-relaxed text-white/38">
        采集与发布待接通
      </p>
      <button
        onClick={onOpen}
        className="mt-2.5 flex items-center gap-1 text-[10px] font-medium text-lime"
        type="button"
      >
        查看连接状态 <ArrowRight className="size-3" />
      </button>
    </div>
  );
}

function TopicsView({
  drafts,
  savedTopics,
  selectedTopicId,
  onSelectTopic,
  toggleTopic,
  onOpenScript,
  flash,
}: {
  drafts: Record<string, ScriptDraft>;
  savedTopics: string[];
  selectedTopicId: string;
  onSelectTopic: (id: string) => void;
  toggleTopic: (id: string) => void;
  onOpenScript: (id: string) => void;
  flash: (message: string) => void;
}) {
  const [filter, setFilter] = useState('全部');
  const filters = ['全部', '获客与商业 IP', '企业 AI 落地', 'AI 短视频生产'];
  const visible =
    filter === '全部'
      ? topicBriefs
      : topicBriefs.filter((topic) => topic.line === filter);
  const topic =
    topicBriefs.find((item) => item.id === selectedTopicId) ?? topicBriefs[0];
  const saved = savedTopics.includes(topic.id);

  const chooseFilter = (nextFilter: string) => {
    setFilter(nextFilter);
    const candidates =
      nextFilter === '全部'
        ? topicBriefs
        : topicBriefs.filter((item) => item.line === nextFilter);
    if (
      candidates.length &&
      !candidates.some((item) => item.id === selectedTopicId)
    )
      onSelectTopic(candidates[0].id);
  };

  const copyScript = async () => {
    try {
      await navigator.clipboard.writeText(
        drafts[topic.id]?.script ?? topic.script,
      );
      flash('完整口播正文已复制');
    } catch {
      flash('当前浏览器没有开放剪贴板权限');
    }
  };

  return (
    <>
      <ViewHeader
        view="topics"
        actions={
          <>
            <Button
              variant="outline"
              className="bg-white"
              onClick={() => flash('来源导入尚未接通，本次没有上传或保存材料')}
            >
              <Upload /> 导入来源
            </Button>
            <Button
              onClick={() =>
                flash('新建选题表单尚未接通；当前可以查看、收藏和修改参考稿')
              }
            >
              <Plus /> 新建选题
            </Button>
          </>
        }
      />
      <div className="mt-7 flex flex-col gap-3 rounded-2xl border border-ink/10 bg-ink px-5 py-4 text-white lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-xs font-semibold text-lime">
            选题不是标题，内容类型也不是拍摄形式
          </div>
          <p className="mt-1 text-[12px] leading-5 text-white/58">
            来源信号 → 为什么值得拍 → 四大内容类型 → 拍摄形式 → 可审核成稿
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-white/50">
          <Lock className="size-3.5 text-lime" /> 内容类型与拍摄形式独立保存
        </div>
      </div>
      <section className="mt-4 grid items-start gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="surface-card overflow-hidden p-0 xl:sticky xl:top-20">
          <div className="border-b border-border p-4">
            <div className="flex gap-1 overflow-x-auto">
              {filters.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => chooseFilter(item)}
                  className={`shrink-0 rounded-lg px-3 py-1.5 text-[10px] font-medium ${filter === item ? 'bg-ink text-white' : 'bg-muted/70 text-muted-foreground'}`}
                >
                  {item}
                </button>
              ))}
            </div>
            <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
              当前只放 3
              条来源可追溯的样板，暂不拿虚拟数量和“机会分”制造专业感。
            </p>
          </div>
          <div className="space-y-2 p-3">
            {visible.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTopic(item.id)}
                className={`topic-selector w-full p-4 text-left ${item.id === topic.id ? 'topic-selector-active' : ''}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[10px] font-semibold text-muted-foreground">
                    {item.rank} · {genreDetails[item.primaryGenre].label} ·{' '}
                    {item.line}
                  </span>
                  <StatusBadge tone={evidenceTone(item.evidenceStatus)}>
                    {item.evidenceStatus === 'blocked'
                      ? '阻塞'
                      : item.evidenceStatus === 'ready'
                        ? '可发布'
                        : '待补证据'}
                  </StatusBadge>
                </div>
                <h2 className="mt-2 text-[13px] font-semibold leading-5">
                  {item.title}
                </h2>
                <p className="mt-2 line-clamp-2 text-[11px] leading-5 text-muted-foreground">
                  {item.targetCustomer}
                </p>
                <div className="mt-3 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <BookOpenText className="size-3" /> {item.sources[0].label} ·{' '}
                  {item.sources[0].date}
                </div>
              </button>
            ))}
          </div>
        </aside>

        <div className="min-w-0 space-y-4">
          <article className="surface-card overflow-hidden p-0">
            <div className="border-b border-border bg-muted/25 px-5 py-5 sm:px-6">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-ink text-white">{topic.line}</Badge>
                <StatusBadge tone="info">
                  主类型 · {genreDetails[topic.primaryGenre].label}
                </StatusBadge>
                <StatusBadge tone={evidenceTone(topic.evidenceStatus)}>
                  {topic.evidenceLabel}
                </StatusBadge>
                <StatusBadge tone="neutral">拍摄形式 · 固定口播</StatusBadge>
              </div>
              <h2 className="mt-4 max-w-4xl text-xl font-semibold leading-8 tracking-[-0.025em] sm:text-2xl">
                {topic.title}
              </h2>
            </div>
            <div className="grid gap-3 p-5 sm:p-6 lg:grid-cols-2">
              <section className="rounded-xl border border-border bg-white p-4">
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <Target className="size-4 text-coral" /> 目标客户
                </div>
                <p className="mt-3 text-[13px] leading-6 text-muted-foreground">
                  {topic.targetCustomer}
                </p>
                <div className="mt-4 rounded-lg bg-muted/55 p-3">
                  <div className="text-[10px] font-semibold text-foreground">
                    他正在经历
                  </div>
                  <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                    {topic.customerProblem}
                  </p>
                </div>
              </section>
              <section className="rounded-xl border border-coral/15 bg-coral/[0.025] p-4">
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <Sparkles className="size-4 text-coral" /> 为什么要拍
                </div>
                <p className="mt-3 text-[13px] leading-6 text-muted-foreground">
                  {topic.whyShoot}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <StatusBadge tone="info">{topic.businessGoal}</StatusBadge>
                  <StatusBadge tone="neutral">
                    {topic.estimatedDuration}
                  </StatusBadge>
                </div>
              </section>
              <section className="rounded-xl border border-border bg-muted/35 p-4 lg:col-span-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-semibold text-foreground">
                    类型判定
                  </span>
                  <StatusBadge tone="info">
                    {genreDetails[topic.primaryGenre].label} · 主
                  </StatusBadge>
                  {topic.secondaryGenres.map((genre) => (
                    <StatusBadge key={genre} tone="neutral">
                      {genreDetails[genre].label} · 次
                    </StatusBadge>
                  ))}
                </div>
                <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
                  {topic.genreReason}
                </p>
              </section>
              <section className="rounded-xl bg-ink p-4 text-white lg:col-span-2">
                <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-lime">
                  业务承接
                </div>
                <p className="mt-2 text-[12px] leading-6 text-white/67">
                  {topic.businessLink}
                </p>
              </section>
            </div>
          </article>

          <article className="surface-card p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <Database className="size-4 text-coral" />
              <h2 className="text-sm font-semibold">选题来源</h2>
              <span className="text-[11px] text-muted-foreground">
                来源留在研究卡，不念进口播
              </span>
            </div>
            <div className="mt-4 space-y-2">
              {topic.sources.map((source) => (
                <div
                  key={source.reference}
                  className="grid gap-3 rounded-xl border border-border bg-white p-4 sm:grid-cols-[100px_minmax(0,1fr)_auto] sm:items-center"
                >
                  <StatusBadge tone="info">{source.kind}</StatusBadge>
                  <div className="min-w-0">
                    <div className="text-[12px] font-semibold">
                      {source.label}
                    </div>
                    <div className="mt-1 break-all text-[10px] leading-4 text-muted-foreground">
                      {source.date} · {source.reference}
                    </div>
                  </div>
                  {source.href && (
                    <a
                      href={source.href}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-coral hover:underline"
                    >
                      打开原始来源 <ExternalLink className="size-3" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </article>

          <article className="surface-card p-5 sm:p-6">
            <h2 className="text-sm font-semibold">事实、判断与缺口分开</h2>
            <div className="mt-4 grid gap-3 lg:grid-cols-3">
              {[
                {
                  title: '已确认事实',
                  items: topic.confirmedFacts,
                  tone: 'safe' as const,
                },
                {
                  title: '我们的判断',
                  items: topic.judgments,
                  tone: 'info' as const,
                },
                {
                  title: '发布前待补',
                  items: topic.missingEvidence,
                  tone: 'warn' as const,
                },
              ].map((group) => (
                <section
                  key={group.title}
                  className="rounded-xl border border-border p-4"
                >
                  <StatusBadge tone={group.tone}>{group.title}</StatusBadge>
                  <ul className="mt-3 space-y-2">
                    {group.items.map((item) => (
                      <li
                        key={item}
                        className="flex gap-2 text-[11px] leading-5 text-muted-foreground"
                      >
                        <span className="mt-2 size-1.5 shrink-0 rounded-full bg-ink/35" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </article>

          <article className="surface-card overflow-hidden p-0">
            <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div>
                <div className="flex items-center gap-2">
                  <BookOpenText className="size-4 text-coral" />
                  <h2 className="text-sm font-semibold">完整连续口播正文</h2>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  从开头到结尾可直接朗读；不是标题、提纲或分镜。
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="bg-white"
                onClick={copyScript}
              >
                <Copy /> {drafts[topic.id] ? '复制我的最新稿' : '复制参考原稿'}
              </Button>
            </div>
            <div className="script-prose px-5 py-6 sm:px-8 sm:py-8">
              {drafts[topic.id]?.script ?? topic.script}
            </div>
            <div className="flex flex-col gap-3 border-t border-border bg-muted/30 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div>
                <div className="text-[10px] font-semibold">唯一行动</div>
                <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                  {topic.primaryAction}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  variant={saved ? 'secondary' : 'outline'}
                  onClick={() => toggleTopic(topic.id)}
                >
                  {saved ? <Check /> : <Plus />}
                  {saved ? '已加入计划' : '加入拍摄计划'}
                </Button>
                <Button onClick={() => onOpenScript(topic.id)}>
                  进入脚本与拍摄 <ArrowRight />
                </Button>
              </div>
            </div>
          </article>
        </div>
      </section>
    </>
  );
}

function ResearchView({
  initialUrl,
  go,
  flash,
}: {
  initialUrl: string;
  go: (id: ViewId) => void;
  flash: (message: string) => void;
}) {
  const [url, setUrl] = useState(initialUrl);
  const [policyDialogOpen, setPolicyDialogOpen] = useState(false);
  const [savedPolicy, setSavedPolicy] = useState<SavedResearchPolicy>({
    policy: DEFAULT_RESEARCH_POLICY,
    revision: 0,
  });
  const [policyReady, setPolicyReady] = useState(false);
  const [policyMessage, setPolicyMessage] = useState('正在读取账号的研究范围…');
  const policy = savedPolicy.policy;
  const commentPreset = getCommentPreset(policy.preset);
  const readPolicy = useCallback(async () => {
    try {
      const response = await fetch('/api/research-preferences', {
        cache: 'no-store',
      });
      const result = (await response.json()) as SavedResearchPolicy & {
        error?: string;
      };
      if (!response.ok) throw new Error(result.error || '研究范围读取失败');
      setSavedPolicy(result);
      setPolicyReady(true);
      setPolicyMessage(
        result.revision
          ? '已读取账号的云端研究范围'
          : '当前使用默认范围；可修改并保存到账号',
      );
    } catch (error) {
      setPolicyReady(false);
      setPolicyMessage(
        error instanceof Error ? error.message : '云端研究范围暂时无法读取',
      );
    }
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => void readPolicy(), 0);
    return () => window.clearTimeout(timer);
  }, [readPolicy]);
  const savePolicy = async (nextPolicy: ResearchPolicy) => {
    const response = await fetch('/api/research-preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        policy: nextPolicy,
        expectedRevision: savedPolicy.revision,
      }),
    });
    const result = (await response.json()) as SavedResearchPolicy & {
      error?: string;
    };
    if (!response.ok) {
      if (response.status === 409) await readPolicy();
      throw new Error(result.error || '研究范围保存失败');
    }
    setSavedPolicy(result);
    setPolicyMessage('研究范围已保存到账号，换设备仍可读取');
    flash('研究范围已保存，仅用于新任务');
  };
  const [sourceKind, setSourceKind] = useState<'content' | 'creator'>(
    'content',
  );
  const [connection, setConnection] = useState<GatewayConnection>('checking');
  const [starting, setStarting] = useState(false);
  const [detail, setDetail] = useState<ResearchJobDetail | null>(null);
  const [contents, setContents] = useState<ResearchContent[]>([]);
  const [transcripts, setTranscripts] = useState<ResearchTranscript[]>([]);
  const [comments, setComments] = useState<ResearchComment[]>([]);
  const [commentCoverage, setCommentCoverage] =
    useState<ResearchCommentCoverage | null>(null);
  const [evidenceMessage, setEvidenceMessage] = useState('');
  const [selectedContentId, setSelectedContentId] = useState<string | null>(
    null,
  );
  const [analysis, setAnalysis] = useState<ContentAnalysis | null>(null);
  const [analysisMessage, setAnalysisMessage] = useState('');
  const [reviewingAnalysis, setReviewingAnalysis] = useState(false);
  const analysisRequest = useRef(0);
  const [evidenceRefresh, setEvidenceRefresh] = useState(0);
  const [contentsMessage, setContentsMessage] = useState('');
  const [taskMessage, setTaskMessage] = useState('');
  const [evidenceImportReady, setEvidenceImportReady] = useState(false);
  const [importingEvidence, setImportingEvidence] = useState(false);
  const [recentResearch, setRecentResearch] = useState<ResearchJob[]>([]);
  const [localRecordsMessage, setLocalRecordsMessage] = useState('');
  const evidenceFileInput = useRef<HTMLInputElement>(null);
  const localOpenRequest = useRef(0);
  const [tab, setTab] = useState<
    | 'scope'
    | 'body'
    | 'classification'
    | 'traffic'
    | 'acquisition'
    | 'monetization'
    | 'comments'
    | 'editing'
  >('body');

  const isEditingSample =
    url.includes(editingResearchSample.source.contentId) ||
    url.includes('PsCmfeJmy-s');

  const loadLocalResearch = async () => {
    try {
      const result = await localGatewayRequest<{ items: ResearchJob[] }>(
        '/jobs?limit=50&offset=0',
      );
      // Listing records never resumes a legacy paid collection task.
      const records = result.items.filter(
        (job) => job.kind === 'browser_import',
      );
      setRecentResearch(records);
      setLocalRecordsMessage(
        records.length
          ? `已找到 ${records.length} 条本机浏览器研究记录（最近 50 个任务内）`
          : '尚无已导入的浏览器研究记录',
      );
    } catch {
      setRecentResearch([]);
      setLocalRecordsMessage('本机记录读取失败，请检查本机服务');
    }
  };

  const openLocalResearch = async (jobId: string) => {
    const requestId = ++localOpenRequest.current;
    analysisRequest.current++;
    setDetail(null);
    setContents([]);
    setSelectedContentId(null);
    setTranscripts([]);
    setComments([]);
    setCommentCoverage(null);
    setAnalysis(null);
    setTaskMessage('正在打开已保存的研究，不会重新采集或消耗 API…');
    try {
      const result = await localGatewayRequest<ResearchJobDetail>(
        `/jobs/${jobId}`,
      );
      if (requestId !== localOpenRequest.current) return;
      setUrl(result.job.source_url ?? result.job.creator_url ?? '');
      setSourceKind('content');
      setDetail(result);
      setTaskMessage(
        `已打开真实浏览器证据 · ${jobId}。原文和评论分别核验，不代表完整采集。`,
      );
    } catch (error) {
      if (requestId !== localOpenRequest.current) return;
      setTaskMessage(
        error instanceof Error ? error.message : '研究记录打开失败',
      );
    }
  };

  const importBrowserEvidence = async (file: File) => {
    if (file.size > 256 * 1024) {
      flash('证据文件超过 256 KB，请缩小采样范围');
      return;
    }
    setImportingEvidence(true);
    try {
      const body: unknown = JSON.parse(await file.text());
      const result = await localGatewayRequest<{
        job: { job_id: string };
        replayed: boolean;
      }>('/evidence-import', { method: 'POST', body: JSON.stringify(body) });
      await openLocalResearch(result.job.job_id);
      await loadLocalResearch();
      flash(
        result.replayed
          ? '已打开相同证据，没有重复入库'
          : '浏览器证据已入库，未调用付费采集接口',
      );
    } catch (error) {
      flash(error instanceof Error ? error.message : '证据导入失败');
    } finally {
      setImportingEvidence(false);
      if (evidenceFileInput.current) evidenceFileInput.current.value = '';
    }
  };

  const checkGateway = async () => {
    setConnection('checking');
    setEvidenceImportReady(false);
    try {
      const capabilities =
        await localGatewayRequest<GatewayCapabilities>('/capabilities');
      const tikhub = capabilities.providers.find(
        (provider) => provider.name === 'tikhub',
      );
      setConnection(tikhub?.configured ? 'ready' : 'not_configured');
      setEvidenceImportReady(capabilities.evidence_import?.supported === true);
      await loadLocalResearch();
      setTaskMessage(
        tikhub?.configured
          ? 'API 采集已配置；只有主动创建 API 任务才会调用。浏览器证据可独立入库。'
          : capabilities.evidence_import?.supported
            ? '本机证据导入已接通，无需 TikHub 密钥；仅粘贴链接仍不会自动操控浏览器。'
            : '本机服务已连接；未发现浏览器证据入口，请升级本机服务',
      );
    } catch {
      setConnection('offline');
      setTaskMessage('本机采集服务未启动，页面不会创建假任务');
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => void checkGateway(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const jobId = detail?.job.job_id;
    const state = detail?.job.state;
    if (!jobId || !state || TERMINAL_JOB_STATES.has(state)) return;

    let disposed = false;
    const poll = async () => {
      try {
        const next = await localGatewayRequest<ResearchJobDetail>(
          `/jobs/${jobId}`,
        );
        if (!disposed) {
          setDetail(next);
          setTaskMessage(
            TERMINAL_JOB_STATES.has(next.job.state)
              ? `任务 ${jobId} 已进入 ${next.job.state}${next.job.failure.code ? ` · ${next.job.failure.code}` : ''}`
              : `任务 ${jobId} 正在执行：${next.job.stage}`,
          );
        }
      } catch {
        if (!disposed) {
          setTaskMessage('任务仍保存在本机，但本轮进度读取失败');
        }
      }
    };
    void poll();
    const timer = window.setInterval(poll, 2000);
    return () => {
      disposed = true;
      window.clearInterval(timer);
    };
  }, [detail?.job.job_id, detail?.job.state]);

  useEffect(() => {
    const jobId = detail?.job.job_id;
    if (!jobId) return;
    let disposed = false;
    const loadContents = async () => {
      try {
        const loaded: ResearchContent[] = [];
        const visitedOffsets = new Set<number>();
        let offset: number | null = 0;
        let total = 0;
        while (offset !== null && !visitedOffsets.has(offset)) {
          visitedOffsets.add(offset);
          const result: ResearchContentsResponse =
            await localGatewayRequest<ResearchContentsResponse>(
              `/jobs/${jobId}/contents?limit=100&offset=${offset}`,
            );
          if (disposed) return;
          loaded.push(...result.items);
          total = result.total;
          setContents([...loaded]);
          setContentsMessage(`正在加载真实作品索引 ${loaded.length}/${total}`);
          offset = result.next_offset;
        }
        if (disposed) return;
        setSelectedContentId((current) =>
          current && loaded.some((item) => item.content_id === current)
            ? current
            : (loaded[0]?.content_id ?? null),
        );
        setContentsMessage(
          total
            ? `已逐页加载 ${loaded.length}/${total} 条真实作品索引`
            : '任务尚未返回作品',
        );
      } catch {
        if (!disposed) {
          setContentsMessage('作品索引接口尚未就绪，当前不显示模拟作品');
        }
      }
    };
    void loadContents();
    return () => {
      disposed = true;
    };
  }, [detail?.content_count, detail?.job.job_id]);

  useEffect(() => {
    const jobId = detail?.job.job_id;
    if (!jobId || !selectedContentId) {
      return;
    }
    let disposed = false;
    const loadEvidence = async () => {
      setTranscripts([]);
      setComments([]);
      setCommentCoverage(null);
      setEvidenceMessage('正在逐页读取原文、评论和覆盖证明…');
      const [transcriptResult, coverageResult] = await Promise.allSettled([
        localGatewayRequest<ResearchTranscriptsResponse>(
          `/jobs/${jobId}/contents/${selectedContentId}/transcripts`,
        ),
        localGatewayRequest<ResearchCommentCoverage>(
          `/jobs/${jobId}/contents/${selectedContentId}/comment-coverage`,
        ),
      ]);
      if (!disposed) {
        setTranscripts(
          transcriptResult.status === 'fulfilled'
            ? transcriptResult.value.items
            : [],
        );
        setCommentCoverage(
          coverageResult.status === 'fulfilled' ? coverageResult.value : null,
        );
      }
      try {
        const loaded: ResearchComment[] = [];
        const visitedOffsets = new Set<number>();
        let offset: number | null = 0;
        let total = 0;
        while (offset !== null && !visitedOffsets.has(offset)) {
          visitedOffsets.add(offset);
          const result: ResearchCommentsResponse =
            await localGatewayRequest<ResearchCommentsResponse>(
              `/jobs/${jobId}/contents/${selectedContentId}/comments?limit=500&offset=${offset}`,
            );
          if (disposed) return;
          loaded.push(...result.items);
          total = result.total;
          setComments([...loaded]);
          setEvidenceMessage(`正在逐页读取评论 ${loaded.length}/${total}`);
          offset = result.next_offset;
        }
        if (!disposed) {
          setEvidenceMessage(
            total
              ? `已读取 ${loaded.length}/${total} 个评论节点；是否完整以覆盖证明为准`
              : '接口没有返回评论节点；这不等于评论数为 0',
          );
        }
      } catch {
        if (!disposed) {
          setComments([]);
          setEvidenceMessage('评论正文读取失败；当前不显示模拟评论');
        }
      }
    };
    void loadEvidence();
    return () => {
      disposed = true;
    };
  }, [
    detail?.job.job_id,
    selectedContentId,
    detail?.job.state,
    detail?.comment_sync.top_level_comments,
    detail?.comment_sync.replies,
    evidenceRefresh,
  ]);

  const loadAnalysis = useCallback(async () => {
    const requestId = ++analysisRequest.current;
    setAnalysis(null);
    const jobId = detail?.job.job_id;
    if (!jobId || !selectedContentId) {
      setAnalysis(null);
      setAnalysisMessage('');
      return;
    }
    setAnalysisMessage('正在读取这条视频的已保存拆解…');
    try {
      const result = await localGatewayRequest<ContentAnalysis>(
        `/jobs/${jobId}/contents/${selectedContentId}/analysis`,
      );
      if (requestId !== analysisRequest.current) return;
      if (!analysisMatchesSelection(result, jobId, selectedContentId))
        throw new Error('拆解与当前作品不匹配');
      setAnalysis(result);
      setAnalysisMessage(
        `已读取第 ${result.current_revision} 版·${result.evidence_links.length} 条证据引用·${result.claims.length} 个重要结论`,
      );
    } catch {
      if (requestId !== analysisRequest.current) return;
      setAnalysis(null);
      setAnalysisMessage(
        '这条真实作品尚无已保存的拆解版本；页面不会用样例结论冒充。',
      );
    }
  }, [detail?.job.job_id, selectedContentId]);

  useEffect(() => {
    const requestSequence = analysisRequest;
    const timer = window.setTimeout(() => void loadAnalysis(), 0);
    return () => {
      window.clearTimeout(timer);
      requestSequence.current++;
    };
  }, [loadAnalysis]);

  const reviewAnalysis = async (decision: 'approve' | 'request_changes') => {
    if (
      !analysis ||
      !analysisMatchesSelection(analysis, detail?.job.job_id, selectedContentId)
    )
      return;
    const requestId = analysisRequest.current;
    setReviewingAnalysis(true);
    try {
      const result = await localGatewayRequest<ContentAnalysis>(
        `/analyses/${analysis.analysis_id}/reviews`,
        {
          method: 'POST',
          body: JSON.stringify({
            expected_revision: analysis.current_revision,
            decision,
            idempotency_key: `web-${analysis.analysis_id}-${analysis.current_revision}-${decision}-${Date.now()}`,
            reviewer_kind: 'human',
            reviewer_ref: 'local-owner',
            note:
              decision === 'approve'
                ? '原文、类型、经营作用与证据已人工核对'
                : '需补充原文、有效评论证据或同窗口对照后再复核',
          }),
        },
      );
      if (
        requestId !== analysisRequest.current ||
        !analysisMatchesSelection(result, detail?.job.job_id, selectedContentId)
      )
        return;
      setAnalysis(result);
      setAnalysisMessage(
        decision === 'approve'
          ? '这一版已通过人工复核'
          : '已记入“需补证据”；原版本与复核记录均保留',
      );
      flash(decision === 'approve' ? '拆解已批准' : '已记录修改要求');
    } catch (error) {
      if (requestId !== analysisRequest.current) return;
      const message =
        error instanceof Error ? error.message : '人工复核操作失败';
      setAnalysisMessage(message);
      flash(message);
    } finally {
      setReviewingAnalysis(false);
    }
  };

  const start = async () => {
    const sourceUrl = extractDouyinLink(url);
    if (!policyReady) {
      flash('先重新读取账号研究范围，避免使用其他设备已改过的旧设置');
      return;
    }
    if (!url.trim()) {
      flash('先粘贴一个博主主页或作品链接');
      return;
    }
    if (!sourceUrl) {
      flash('没有识别到有效的抖音作品或博主链接，请检查分享文字');
      return;
    }
    if (connection === 'not_configured') {
      flash('采集通道还未接通，尚未创建任务。可先查看本轮测试记录与缺失材料。');
      return;
    }
    if (connection === 'offline') {
      flash('本机采集服务未启动，不能创建真实任务');
      return;
    }
    if (connection === 'checking') {
      flash('正在检查本机采集服务，请稍后再试');
      return;
    }
    setStarting(true);
    setTaskMessage('正在校验链接并创建真实采集任务…');
    try {
      const result = await localGatewayRequest<{
        created: boolean;
        resumed: boolean;
        job: ResearchJob;
      }>('/jobs', {
        method: 'POST',
        body: JSON.stringify({
          platform: 'douyin',
          creator_url: sourceUrl,
          source_kind: sourceKind,
          max_items: sourceKind === 'content' ? 1 : policy.maxWorks,
          comment_mode: 'curated',
          comment_candidate_limit: commentPreset.candidateLimit,
          comment_selected_limit: commentPreset.selectedLimit,
          comment_reply_limit: commentPreset.replyLimit,
          comment_api: 'web',
          resume: true,
        }),
      });
      setDetail({
        job: result.job,
        content_count: result.job.progress.normalized,
        comment_sync: {
          works_total: 0,
          works_initialized: 0,
          works_missing_sync: 0,
          top_level_complete: 0,
          replies_complete: 0,
          top_level_comments: 0,
          replies: 0,
          failed_pages: 0,
        },
      });
      setContents([]);
      analysisRequest.current++;
      setAnalysis(null);
      setTranscripts([]);
      setComments([]);
      setCommentCoverage(null);
      setEvidenceMessage('等待真实作品后再读取正文与评论');
      setSelectedContentId(null);
      setContentsMessage('等待任务返回作品索引');
      const disposition = result.created
        ? '真实任务已创建'
        : result.resumed
          ? '未完成任务已继续'
          : '已打开相同任务';
      setTaskMessage(`${disposition} · ${result.job.job_id}`);
      flash(disposition);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '真实采集任务创建失败';
      setTaskMessage(message);
      flash(message);
    } finally {
      setStarting(false);
    }
  };

  const cancel = async () => {
    if (!detail) return;
    try {
      const result = await localGatewayRequest<{ job: ResearchJob }>(
        `/jobs/${detail.job.job_id}/cancel`,
        { method: 'POST', body: '{}' },
      );
      setDetail((current) =>
        current ? { ...current, job: result.job } : current,
      );
      setTaskMessage('已请求安全停止；已经保存的数据不会删除');
      flash('已请求停止采集任务');
    } catch (error) {
      flash(error instanceof Error ? error.message : '停止任务失败');
    }
  };

  const connectionLabel = {
    checking: '正在检查本机服务',
    ready: 'API 采集通道已配置',
    not_configured: evidenceImportReady
      ? '浏览器证据入库已接通'
      : '证据导入服务需升级',
    offline: '本机采集服务未启动',
  }[connection];
  const selectedContent =
    contents.find((item) => item.content_id === selectedContentId) ?? null;
  const matchingAnalysis = analysisMatchesSelection(
    analysis,
    detail?.job.job_id,
    selectedContentId,
  )
    ? analysis
    : null;
  const isCurrentTest =
    url.includes('Xrt2L5JgtAA') || url.includes('7685586228548291892');

  return (
    <>
      <ViewHeader
        view="research"
        actions={
          <Badge className="bg-ink text-white">
            <Lock /> 仅内部研究
          </Badge>
        }
      />
      {isCurrentTest && (
        <details className="mt-5 rounded-xl border border-border p-4">
          <summary className="cursor-pointer text-sm font-semibold">
            本轮链接已试读：完整正文被登录阻断，查看实测记录
          </summary>
          <div className="mt-4">
            <VideoCheckCard />
          </div>
        </details>
      )}
      <section className="mt-7 rounded-2xl border border-ink/10 bg-ink p-5 text-white shadow-xl shadow-ink/5">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-lime">
              <Link2 className="size-4" /> 单作品精确研究 + 任意博主批量研究
            </div>
            <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em]">
              {sourceKind === 'content'
                ? '粘贴一条作品链接，先把这一条研究透'
                : '粘贴博主主页链接，逐页采集公开作品'}
            </h2>
            <p className="mt-1 text-[11px] leading-5 text-white/48">
              原文、类型、传播、获客和变现分别核验。评论按限定候选做精选，保留原句与上下文；不拿标题替代内容，也不把样本写成全部评论。
            </p>
            <div className="mt-4 flex w-fit rounded-lg bg-white/8 p-1">
              {(
                [
                  ['content', '单条作品'],
                  ['creator', '博主主页'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSourceKind(id)}
                  className={`rounded-md px-3 py-1.5 text-[10px] font-medium transition-colors ${sourceKind === id ? 'bg-lime text-ink' : 'text-white/60 hover:text-white'}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <Input
              aria-label="研究视频或博主链接"
              value={url}
              disabled={
                starting ||
                !!(detail && !TERMINAL_JOB_STATES.has(detail.job.state))
              }
              onChange={(event) => {
                localOpenRequest.current++;
                setUrl(event.target.value);
                analysisRequest.current++;
                setAnalysis(null);
                setDetail(null);
                setContents([]);
                setSelectedContentId(null);
                setTranscripts([]);
                setComments([]);
                setCommentCoverage(null);
              }}
              placeholder={
                sourceKind === 'content'
                  ? 'https://www.douyin.com/video/... 或作品分享链接'
                  : 'https://www.douyin.com/user/... 或博主主页分享链接'
              }
              className="mt-3 h-11 border-white/10 bg-white/8 px-4 text-white placeholder:text-white/28 focus-visible:border-lime focus-visible:ring-lime/20"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="h-11 border-white/15 bg-white/8 text-white hover:bg-white/12 hover:text-white"
              onClick={() => setPolicyDialogOpen(true)}
              disabled={!policyReady}
            >
              任务设置
            </Button>
            <Button
              onClick={() => evidenceFileInput.current?.click()}
              disabled={importingEvidence || !evidenceImportReady}
              className="h-11 bg-lime px-5 text-ink hover:bg-lime/85"
            >
              {importingEvidence ? (
                <>
                  <RefreshCw className="animate-spin" /> 正在导入
                </>
              ) : (
                <>
                  导入已采集证据 <Upload />
                </>
              )}
            </Button>
          </div>
        </div>
      </section>
      <CommentPolicyDialog
        open={policyDialogOpen}
        onOpenChange={setPolicyDialogOpen}
        value={policy}
        onSave={savePolicy}
      />
      <section
        className="mt-4 rounded-xl border border-border bg-white p-4"
        aria-label="本机浏览器研究记录"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold">浏览器实采 · 本机验证</h3>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              读取已登录页面后，将原文和精选评论存入研究库。这里不提取
              Cookie，也不自动登录、转写或抓取链接。
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadLocalResearch()}
            disabled={!evidenceImportReady}
          >
            <RefreshCw /> 读取已保存研究
          </Button>
        </div>
        <p role="status" className="mt-3 text-xs text-muted-foreground">
          {localRecordsMessage}
        </p>
        <div className="mt-2 space-y-2">
          {recentResearch.map((job) => (
            <button
              key={job.job_id}
              type="button"
              onClick={() => void openLocalResearch(job.job_id)}
              className="flex w-full flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3 text-left text-xs hover:bg-muted"
            >
              <span className="break-all">
                {job.source_url ?? job.creator_url ?? job.job_id}
              </span>
              <span className="shrink-0 text-muted-foreground">
                部分证据 · 打开研究 →
              </span>
            </button>
          ))}
        </div>
        <details className="mt-3 text-xs">
          <summary className="cursor-pointer text-muted-foreground">
            内部调试：导入浏览器证据文件
          </summary>
          <p className="my-2 leading-5 text-muted-foreground">
            只接收经过核验的 JSON
            证据包。缺失原文会如实保留为缺失；评论样本不会标成全量。普通客户不需要填写这些字段。
          </p>
          <input
            ref={evidenceFileInput}
            type="file"
            accept=".json,application/json"
            aria-label="浏览器证据 JSON 文件"
            disabled={!evidenceImportReady || importingEvidence}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void importBrowserEvidence(file);
            }}
          />
          {importingEvidence && <p role="status">正在校验并导入…</p>}
        </details>
        <details className="mt-3 text-xs">
          <summary className="cursor-pointer text-muted-foreground">
            旧 API 采集通道（默认不用）
          </summary>
          <p className="my-2 leading-5 text-muted-foreground">
            仅在已自行配置数据服务时使用，可能产生服务商费用。浏览器证据导入不依赖这条通道。
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={start}
            disabled={starting || !policyReady || connection !== 'ready'}
          >
            {starting ? '正在创建…' : '使用 API 创建采集任务'}
          </Button>
        </details>
      </section>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-white p-4">
        <div className="text-sm leading-6">
          <p className="font-medium">
            {sourceKind === 'content'
              ? '1 条作品'
              : `最多 ${policy.maxWorks} 条作品`}{' '}
            · 每条最多查看 {commentPreset.candidateLimit} 条候选，保存{' '}
            {commentPreset.selectedLimit} 条精选
          </p>
          <output className="text-muted-foreground">
            {policyMessage}。回复计入总额，有价值的评论不足时不凑数。
          </output>
        </div>
        {!policyReady && (
          <Button variant="outline" onClick={() => void readPolicy()}>
            重新读取范围
          </Button>
        )}
      </div>
      <div className="mt-4 flex flex-col gap-3 rounded-xl border border-border bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span
            className={`mt-1 size-2.5 shrink-0 rounded-full ${connection === 'ready' ? 'bg-[#4d8a5b]' : connection === 'checking' ? 'bg-amber' : 'bg-coral'}`}
          />
          <div>
            <div className="text-xs font-semibold">{connectionLabel}</div>
            <p className="mt-1 text-[10px] leading-5 text-muted-foreground">
              {taskMessage ||
                '只有接口真正返回任务后，页面才会显示任务编号和进度。'}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          {detail && !TERMINAL_JOB_STATES.has(detail.job.state) && (
            <Button variant="outline" size="sm" onClick={cancel}>
              安全停止
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={checkGateway}>
            <RefreshCw /> 重新检查
          </Button>
        </div>
      </div>
      <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber/25 bg-amber/8 p-4">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-ink" />
        <p className="text-[11px] leading-5 text-muted-foreground">
          <span className="font-semibold text-foreground">
            当前仍是内部采集通道：
          </span>
          三平台云端连接尚未接通，登录工作台不会自动获得平台权限。后续按账号分别验证采集与发布，不要求先把三个平台全部连接。
          <button
            type="button"
            className="ml-2 font-medium text-foreground underline underline-offset-4"
            onClick={() => go('connections')}
          >
            查看我的平台账号
          </button>
        </p>
      </div>
      {isEditingSample && <EditingSampleContext />}
      <section className="mt-4 space-y-4">
        <div className="surface-card p-0">
          <div className="flex gap-1 overflow-x-auto border-b border-border px-4 pt-3">
            {[
              ['scope', '博主与采集'],
              ['body', '正文与结构'],
              ['classification', '类型与作用'],
              ['traffic', '为什么火'],
              ['acquisition', '怎么获客'],
              ['monetization', '怎么变现'],
              ['comments', '评论证据'],
              ['editing', '剪辑理解'],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id as typeof tab)}
                className={`shrink-0 border-b-2 px-3 py-2 text-[11px] font-medium ${tab === id ? 'border-coral text-foreground' : 'border-transparent text-muted-foreground'}`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="p-5">
            {(!isEditingSample || selectedContent) && (
              <ResearchSelectionContext
                content={selectedContent}
                message={contentsMessage}
                analysis={matchingAnalysis}
                analysisMessage={analysisMessage}
                reviewing={reviewingAnalysis}
                onReloadAnalysis={() => void loadAnalysis()}
                onReview={reviewAnalysis}
              />
            )}
            {tab === 'scope' && (
              <ResearchScope
                connection={connection}
                job={detail?.job ?? null}
                policy={policy}
                sourceKind={sourceKind}
              />
            )}
            {tab === 'body' &&
              (selectedContent ? (
                <LiveTranscriptEvidence
                  transcripts={transcripts}
                  message={evidenceMessage}
                />
              ) : isEditingSample ? (
                <SampleBodyEvidence />
              ) : (
                <ResearchEmptyStandard label="正文与结构" />
              ))}
            {selectedContent && (
              <Button
                variant="outline"
                size="sm"
                className="mb-4"
                onClick={() => setEvidenceRefresh((value) => value + 1)}
              >
                <RefreshCw />
                重新读取正文与评论
              </Button>
            )}
            {selectedContent &&
              [
                'classification',
                'traffic',
                'acquisition',
                'monetization',
              ].includes(tab) && (
                <SavedAnalysisDetails
                  analysis={matchingAnalysis}
                  tab={tab}
                  transcripts={transcripts}
                  comments={comments}
                />
              )}
            {tab === 'classification' &&
              !selectedContent &&
              (isEditingSample ? (
                <SampleClassificationEvidence />
              ) : (
                <ResearchEmptyStandard label="类型与作用" />
              ))}
            {tab === 'traffic' &&
              !selectedContent &&
              (isEditingSample ? (
                <SampleTrafficEvidence />
              ) : (
                <ResearchEmptyStandard label="为什么火" />
              ))}
            {tab === 'acquisition' &&
              !selectedContent &&
              (isEditingSample ? (
                <SampleAcquisitionEvidence />
              ) : (
                <ResearchEmptyStandard label="怎么获客" />
              ))}
            {tab === 'monetization' &&
              !selectedContent &&
              (isEditingSample ? (
                <SampleMonetizationEvidence />
              ) : (
                <ResearchEmptyStandard label="怎么变现" />
              ))}
            {tab === 'comments' &&
              (selectedContent ? (
                <LiveCommentEvidence
                  comments={comments}
                  coverage={commentCoverage}
                  message={evidenceMessage}
                />
              ) : isEditingSample ? (
                <SampleCommentEvidence />
              ) : (
                <ResearchEmptyStandard label="评论证据" />
              ))}
            {tab === 'editing' && (
              <>
                <p className="mb-3 text-sm text-muted-foreground">
                  以下是通用剪辑标准，不是当前作品的剪辑结论。
                </p>
                <ComprehensionEditingResearch />
              </>
            )}
          </div>
        </div>
        <div className="space-y-4">
          <details className="surface-card p-4">
            <summary className="cursor-pointer text-sm font-medium">
              采集范围与任务详情（按需查看）
            </summary>
            <div className="mt-4 space-y-4">
              <article className="surface-card p-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold">任务前估算</h2>
                  <StatusBadge tone="neutral">待首批页校准</StatusBadge>
                </div>
                <div className="mt-4 space-y-3">
                  {[
                    ['任务状态', detail?.job.state ?? '尚未创建'],
                    ['已保存作品', String(detail?.content_count ?? 0)],
                    [
                      '评论完成作品',
                      `${detail?.comment_sync.top_level_complete ?? 0}/${detail?.comment_sync.works_total ?? 0}`,
                    ],
                    ['媒体策略', '默认不下载视频或音频'],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="flex items-center justify-between border-b border-border pb-2 text-[10px] last:border-0"
                    >
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-medium">{value}</span>
                    </div>
                  ))}
                </div>
                <Button
                  className="mt-4 w-full"
                  variant="outline"
                  onClick={() => setPolicyDialogOpen(true)}
                  disabled={!policyReady}
                >
                  <Gauge /> 设置采集上限
                </Button>
              </article>
              <article className="surface-card p-5">
                <h2 className="text-sm font-semibold">三层采集完整度</h2>
                <div className="mt-4">
                  <CoverageDemo detail={detail} />
                </div>
              </article>
            </div>
          </details>
          {contents.length ? (
            <ResearchContentQueue
              contents={contents}
              selectedContentId={selectedContentId}
              onSelect={setSelectedContentId}
              message={contentsMessage}
            />
          ) : null}
          <article className="surface-card p-5">
            <h2 className="text-sm font-semibold">研究结论的出口</h2>
            <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
              只有完成原文、评论与证据核验后，才保留可迁移机制；删除对方人设、案例和标志性表达，再回到我的行业生成新选题与连续口播稿。
            </p>
            <Button className="mt-4 w-full" onClick={() => go('factory')}>
              查看脚本工作区（不自动改写） <ArrowRight />
            </Button>
          </article>
        </div>
      </section>
    </>
  );
}

function SavedAnalysisDetails({
  analysis,
  tab,
  transcripts,
  comments,
}: {
  analysis: ContentAnalysis | null;
  tab: string;
  transcripts: ResearchTranscript[];
  comments: ResearchComment[];
}) {
  if (!analysis) return <ResearchEmptyStandard label="该作品的拆解结论" />;
  const claims = analysis.claims.filter((claim) =>
    claimMatchesTab(claim.domain, tab),
  );
  const reasons =
    tab === 'classification'
      ? [
          analysis.revision.content_genre.classification_reason,
          analysis.revision.content_form.classification_reason,
          analysis.revision.business_role.designed_function.reason,
        ].filter(Boolean)
      : [];
  const statuses: Record<string, string> = {
    observed: '可观察事实',
    user_stated: '本人陈述',
    derived: '依据推导',
    hypothesis: '待验证假设',
    missing: '缺少证据',
  };
  const relations: Record<string, string> = {
    support: '支持',
    counterexample: '反例',
    comparison: '对照',
    alternative_context: '其他可能解释',
    asserted_by_user: '本人陈述',
  };
  const renderEvidence = (
    evidence: ContentAnalysis['evidence_links'][number],
  ) => (
    <details
      key={evidence.link_ref}
      className="mt-3 rounded-lg border border-border p-3"
    >
      <summary className="cursor-pointer break-all text-sm">
        {relations[evidence.relation] || '关系待核'} ·{' '}
        {evidence.evidence_type === 'transcript'
          ? '正文'
          : evidence.evidence_type === 'comment'
            ? '评论'
            : '其他来源'}{' '}
        · {evidence.link_ref}
      </summary>
      <p className="mt-2 break-all text-xs text-muted-foreground">
        引用记录：{evidence.evidence_ref_id || '缺少记录标识'}
      </p>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-7">
        {evidenceQuote(evidence, transcripts, comments) ||
          '当前页面未取得该证据原文，不能仅凭引用标识视为已核验。'}
      </p>
    </details>
  );
  const unassigned = analysis.evidence_links.filter((item) => !item.claim_id);
  return (
    <section className="space-y-4">
      <h3 className="text-base font-semibold">这条作品已保存的判断与依据</h3>
      <p className="text-sm text-muted-foreground">
        来自第 {analysis.current_revision}{' '}
        版拆解；判断仍需按证据复核，不是通用样板，也不代表已证明因果。
      </p>
      {reasons.map((reason, index) => (
        <p key={index} className="rounded-lg bg-muted/40 p-4 text-sm leading-6">
          {reason}
        </p>
      ))}
      {claims.length ? (
        claims.map((claim) => {
          const evidence = analysis.evidence_links.filter(
            (item) => item.claim_id === claim.claim_id,
          );
          return (
            <article
              key={claim.claim_id}
              className="rounded-xl border border-border p-4"
            >
              <p className="text-base leading-7">
                {claim.statement || '尚未填写结论'}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                结论状态：{statuses[claim.epistemic_status] || '待核'} ·
                置信度：
                {claim.confidence === null ? '未评估' : claim.confidence}
              </p>
              {evidence.length ? (
                evidence.map(renderEvidence)
              ) : (
                <p className="mt-3 text-sm text-amber-ink">
                  这条判断没有关联证据，需补齐再审核。
                </p>
              )}
            </article>
          );
        })
      ) : (
        <p className="text-sm text-muted-foreground">
          本版没有保存这个维度的结论，不以样板补齐。
        </p>
      )}
      {unassigned.length > 0 && (
        <details className="rounded-lg bg-muted/30 p-4">
          <summary className="cursor-pointer text-sm">
            其他尚未关联具体判断的证据 · {unassigned.length} 条
          </summary>
          {unassigned.map(renderEvidence)}
        </details>
      )}
    </section>
  );
}

function EditingSampleContext() {
  const { source, engagement, task } = editingResearchSample;
  return (
    <article className="mt-4 overflow-hidden rounded-2xl border border-coral/20 bg-white shadow-sm">
      <div className="border-b border-border bg-coral/[0.035] p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge tone="info">本轮真实测试样本</StatusBadge>
              <StatusBadge tone="warn">证据部分完成</StatusBadge>
              <StatusBadge tone="danger">采集任务失败已留痕</StatusBadge>
            </div>
            <h2 className="mt-3 text-base font-semibold tracking-[-0.02em]">
              {source.title}
            </h2>
            <p className="mt-2 text-[10px] leading-5 text-muted-foreground">
              {source.author} · {source.duration} · 发布于 {source.publishedAt}{' '}
              · 作品 ID {source.contentId}
            </p>
          </div>
          <a
            href={source.canonicalUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-border bg-white px-3 text-[10px] font-medium hover:bg-muted"
          >
            查看原作品 <ExternalLink className="size-3.5" />
          </a>
        </div>
      </div>
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="p-5">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {[
              ['点赞', engagement.likes],
              ['评论节点', engagement.comments],
              ['收藏', engagement.favorites],
              ['分享', engagement.shares],
              ['播放', engagement.playCount],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-muted/45 p-3">
                <div className="text-[9px] text-muted-foreground">{label}</div>
                <div className="mt-1 text-sm font-semibold">
                  {typeof value === 'number' ? value : '未公开'}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[10px] leading-5 text-muted-foreground">
            {engagement.note}{' '}
            没有播放、留存和账号同期对照，当前不能把它写成“已火”。
          </p>
        </div>
        <div className="border-t border-border bg-ink/[0.025] p-5 lg:border-l lg:border-t-0">
          <div className="text-[10px] font-semibold">
            真实任务 · {task.jobId}
          </div>
          <p className="mt-2 text-[10px] leading-5 text-muted-foreground">
            {task.state} / {task.stage} / {task.provider}
          </p>
          <p className="mt-2 text-[10px] leading-5 text-coral">
            {task.failure}
          </p>
        </div>
      </div>
    </article>
  );
}

function ResearchEmptyStandard({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-muted/25 p-5">
      <div className="flex items-start gap-3">
        <CircleAlert className="mt-0.5 size-4 shrink-0 text-amber-ink" />
        <div>
          <h2 className="text-sm font-semibold">{label}尚无真实证据</h2>
          <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
            先创建任务并选择一条真实作品。没有接口返回的正文、评论或证据定位时，此处不显示示例数据，也不生成确定结论。
          </p>
        </div>
      </div>
    </div>
  );
}

function LiveTranscriptEvidence({
  transcripts,
  message,
}: {
  transcripts: ResearchTranscript[];
  message: string;
}) {
  if (!transcripts.length) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/25 p-5">
        <div className="flex items-start gap-3">
          <FileText className="mt-0.5 size-4 shrink-0 text-amber-ink" />
          <div>
            <h2 className="text-sm font-semibold">没有可用的逐字原文</h2>
            <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
              {message || '接口尚未返回字幕、作者原稿或转写。'}{' '}
              标题和平台章节不能替代正文；自动 ASR 尚未接入时保持空缺。
            </p>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">真实原文 / 转写版本</h2>
          <p className="mt-1 text-[10px] leading-5 text-muted-foreground">
            {message}；原始转写与人工校对稿分开保存。
          </p>
        </div>
        <StatusBadge tone="info">{transcripts.length} 个版本</StatusBadge>
      </div>
      <div className="mt-5 space-y-3">
        {transcripts.map((transcript) => (
          <article
            key={transcript.transcript_id}
            className="rounded-xl border border-border p-4"
          >
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge tone={transcript.verified_text ? 'safe' : 'warn'}>
                {transcript.verified_text ? '已有校对稿' : '原始转写待校对'}
              </StatusBadge>
              <span className="text-[9px] text-muted-foreground">
                {transcript.transcript_kind} · {transcript.source} ·{' '}
                {transcript.language || '语言未知'}
              </span>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-[11px] leading-6">
              {transcript.verified_text ||
                transcript.raw_text ||
                '该版本没有正文'}
            </p>
            <p className="mt-3 text-[9px] leading-4 text-muted-foreground">
              置信度 {transcript.confidence ?? '未提供'} · 状态{' '}
              {transcript.status} · 版本 {transcript.transcript_id}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}

function LiveCommentEvidence({
  comments,
  coverage,
  message,
}: {
  comments: ResearchComment[];
  coverage: ResearchCommentCoverage | null;
  message: string;
}) {
  const roots = comments.filter((comment) => comment.level === 1);
  const sample = coverage?.sampling;
  const sampleError =
    sample?.stop_reason &&
    [
      'provider_error',
      'provider_count_mismatch',
      'pagination_gap',
      'request_or_runtime_limit',
      'cancelled',
    ].includes(sample.stop_reason);
  const sampleFinished =
    sample?.stop_reason && sample.stop_reason !== 'in_progress';
  const sampleLabel = sampleFinished
    ? sampleError
      ? '样本已保留 · 需检查停止原因'
      : '有限评论样本已保存'
    : '有限候选采集中';
  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">接口返回的评论与回复</h2>
          <p className="mt-1 text-[10px] leading-5 text-muted-foreground">
            {message || '等待评论接口'}
          </p>
        </div>
        <div className="flex gap-2">
          <StatusBadge
            tone={
              sample
                ? sampleError
                  ? 'warn'
                  : 'info'
                : coverage?.complete
                  ? 'safe'
                  : 'warn'
            }
          >
            {sample
              ? sampleLabel
              : coverage?.complete
                ? '采集时点公开范围完成'
                : '覆盖仍有缺口'}
          </StatusBadge>
          <StatusBadge tone="neutral">{comments.length} 个节点</StatusBadge>
        </div>
      </div>
      {coverage && (
        <section className="mt-4 rounded-xl border border-border bg-muted/30 p-4">
          {sample && (
            <div className="mb-4 border-b border-border pb-4 text-sm leading-6">
              <p className="font-semibold">
                {sample.selection_method === 'browser_observed'
                  ? `实际查看 ${sample.candidates_seen} 条候选 · 保存 ${sample.selected_count} 条精选（含回复上下文）`
                  : `已查看 ${sample.candidates_seen} / 最多 ${sample.candidate_limit ?? '未设置'} 条候选 · 已保存 ${sample.selected_count} / 最多 ${sample.selected_limit ?? '未设置'} 条精选`}
              </p>
              <p className="mt-1 text-muted-foreground">
                {sampleFinished
                  ? `停止原因：${presentSamplingStop(sample.stop_reason ?? 'in_progress')}`
                  : '尚未结束，以任务最终回执为准'}
              </p>
              <p className="mt-1 text-muted-foreground">
                {sample.selection_method === 'browser_observed'
                  ? '从浏览器实际读到的评论中精选，不是全视频最高赞排行。保留需求、质疑与回复上下文。'
                  : '规则初筛，不是全视频最高赞排行。根评论上下文也计入保存数量，不足上限不凑数。'}
              </p>
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-4">
            {[
              ['一级评论', `${coverage.top_level.saved} 条`],
              ['一级评论页', `${coverage.top_level.pages} 页`],
              [
                '回复线程',
                `${coverage.replies.root_threads_complete}/${coverage.replies.root_threads_total}`,
              ],
              ['失败 / 不完整页', String(coverage.failed_or_incomplete_pages)],
            ].map(([label, value]) => (
              <div key={label}>
                <div className="text-[9px] text-muted-foreground">{label}</div>
                <div className="mt-1 text-xs font-semibold">{value}</div>
              </div>
            ))}
          </div>
          {coverage.gaps.length > 0 && (
            <div className="mt-3 space-y-1 border-t border-border pt-3">
              {coverage.gaps.map((gap) => (
                <p key={gap} className="text-[9px] leading-4 text-coral">
                  {sample ? '范围 / 限制' : '缺口'}：{presentGatewayGap(gap)}
                </p>
              ))}
            </div>
          )}
          <p className="mt-3 text-[9px] leading-4 text-muted-foreground">
            {sample
              ? '本次只研究已查看候选，不承诺完整覆盖。平台限制、删除、折叠及尚未查看的评论不在样本内。'
              : '完整只指采集时点提供商公开可见范围；被删除、隐藏、折叠、受限及之后新增的评论不在承诺内。'}
          </p>
        </section>
      )}
      {!comments.length ? (
        <div className="mt-4 rounded-xl border border-dashed border-border p-5 text-[11px] leading-5 text-muted-foreground">
          没有取得评论正文。这里不会用示例评论补空，也不会把“没有采到”写成“评论为
          0”。
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {roots.map((root) => {
            const replies = comments.filter(
              (comment) =>
                comment.level === 2 &&
                comment.root_comment_id === root.comment_id,
            );
            return (
              <article
                key={root.comment_id}
                className="rounded-xl border border-border p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-[10px] font-semibold">
                    {root.author.display_name || '匿名用户'}
                    {root.author.is_creator ? ' · 作者' : ''}
                  </div>
                  <span className="text-[9px] text-muted-foreground">
                    点赞 {root.like_count ?? '未知'} · 第{' '}
                    {root.source_page ?? '—'} 页
                  </span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-[11px] leading-5">
                  {root.text || '[无文本内容]'}
                </p>
                {root.selection && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {commentSelectionLabel(root.selection, presentCommentCategory)}
                  </p>
                )}
                <p className="mt-2 font-mono text-[8px] text-muted-foreground">
                  {root.comment_id}
                </p>
                {replies.length > 0 && (
                  <div className="mt-3 space-y-2 border-l border-border pl-4">
                    {replies.map((reply) => (
                      <div
                        key={reply.comment_id}
                        className="rounded-lg bg-muted/45 p-3"
                      >
                        <div className="text-[9px] font-semibold">
                          {reply.author.display_name || '匿名用户'}
                          {reply.author.is_creator ? ' · 作者' : ''}
                        </div>
                        <p className="mt-1 whitespace-pre-wrap text-[10px] leading-5">
                          {reply.text || '[无文本内容]'}
                        </p>
                        {reply.selection && (
                          <p className="mt-1 text-sm text-muted-foreground">
                            {commentSelectionLabel(reply.selection, presentCommentCategory)}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
      {coverage?.page_receipts.length ? (
        <details className="mt-4 rounded-xl border border-border p-4">
          <summary className="cursor-pointer text-[10px] font-semibold">
            查看 {coverage.page_receipts.length} 条分页回执
          </summary>
          <div className="mt-3 space-y-2">
            {coverage.page_receipts.map((receipt, index) => (
              <div
                key={`${receipt.page_kind}-${receipt.root_comment_id}-${receipt.page_number}-${index}`}
                className="font-mono text-[8px] leading-4 text-muted-foreground"
              >
                {receipt.page_kind} · page {receipt.page_number} ·{' '}
                {receipt.item_count} 条 · has_more {String(receipt.has_more)} ·{' '}
                {receipt.status}
              </div>
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}

function SampleBodyEvidence() {
  const sample = editingResearchSample;
  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">实际观看后的内容结构</h2>
          <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
            下面是页面章节与画面抽查，不是只从标题反推，也不是完整逐字稿。
          </p>
        </div>
        <StatusBadge tone="warn">逐字原文仍缺失</StatusBadge>
      </div>
      <div className="mt-5 rounded-xl border border-border p-4">
        <div className="text-xs font-semibold">画面观察</div>
        <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
          {sample.observation}
        </p>
      </div>
      <div className="mt-4 space-y-2">
        {sample.chapters.map((chapter) => (
          <div
            key={chapter.time}
            className="grid gap-2 rounded-xl border border-border p-4 sm:grid-cols-[64px_120px_minmax(0,1fr)]"
          >
            <span className="font-mono text-[10px] text-coral">
              {chapter.time}
            </span>
            <span className="text-xs font-semibold">{chapter.title}</span>
            <span className="text-[11px] leading-5 text-muted-foreground">
              {chapter.summary}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-xl border border-[#6ca178]/25 bg-[#6ca178]/[0.04] p-4">
        <div className="text-xs font-semibold">视频正文中已核到的三个例子</div>
        <div className="mt-3 space-y-2">
          {sample.verifiedPoints.map((point, index) => (
            <div
              key={point}
              className="flex items-start gap-3 text-[10px] leading-5"
            >
              <span className="grid size-5 shrink-0 place-items-center rounded-md bg-[#4d8a5b] text-[8px] text-white">
                {index + 1}
              </span>
              <span className="text-muted-foreground">{point}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4 rounded-xl border border-amber/25 bg-amber/8 p-4">
        <div className="text-xs font-semibold">证据边界</div>
        <div className="mt-3 space-y-2">
          {sample.evidenceLimits.map((limit) => (
            <div
              key={limit}
              className="flex items-start gap-2 text-[10px] leading-5"
            >
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-ink" />
              <span className="text-muted-foreground">{limit}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SampleClassificationEvidence() {
  const classification = editingResearchSample.classification;
  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">这条作品的三轴判定</h2>
          <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
            内容类型、拍摄形式与经营作用分开保存，避免把“口播”误当内容类型。
          </p>
        </div>
        <StatusBadge tone="warn">{classification.reviewState}</StatusBadge>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {[
          [
            '内容类型',
            classification.contentGenre,
            '根据讲解、案例和方法演示判定',
          ],
          ['呈现形式', classification.contentForm, '实际出现白板和屏幕切换'],
          [
            '经营作用',
            classification.primaryRole,
            classification.secondaryRole,
          ],
        ].map(([label, value, note]) => (
          <section key={label} className="rounded-xl border border-border p-4">
            <div className="text-[9px] font-medium text-muted-foreground">
              {label}
            </div>
            <h3 className="mt-2 text-xs font-semibold leading-5">{value}</h3>
            <p className="mt-2 text-[10px] leading-4 text-muted-foreground">
              {note}
            </p>
          </section>
        ))}
      </div>
      <div className="mt-4 rounded-xl bg-lime/18 p-4 text-[11px] leading-5 text-muted-foreground">
        固定口播仍只需要连续正文；但这条实际是混合型，因此研究时要记录白板和屏幕演示分别承担了什么理解任务，不需要把所有镜头拆成分镜。
      </div>
    </div>
  );
}

function SampleTrafficEvidence() {
  const sample = editingResearchSample;
  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">先验证“火”，再解释传播机制</h2>
          <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
            当前只能提出有证据边界的传播假设，不能写“这条已经爆了”。
          </p>
        </div>
        <StatusBadge tone="danger">爆款未证明</StatusBadge>
      </div>
      <div className="mt-5 grid gap-2 sm:grid-cols-3">
        {[
          ['收藏 / 点赞', '64.1%', '早期实用性信号'],
          ['分享 / 点赞', '13.2%', '早期传播意愿信号'],
          ['评论节点 / 点赞', '3.7%', '不是咨询转化率'],
        ].map(([label, value, note]) => (
          <div key={label} className="rounded-xl border border-border p-4">
            <div className="text-[9px] text-muted-foreground">{label}</div>
            <div className="mt-1 text-lg font-semibold">{value}</div>
            <div className="mt-1 text-[9px] text-muted-foreground">{note}</div>
          </div>
        ))}
      </div>
      <div className="mt-4 space-y-2">
        {sample.distributionHypotheses.map((item, index) => (
          <div key={item} className="flex gap-3 rounded-xl bg-muted/45 p-4">
            <span className="grid size-6 shrink-0 place-items-center rounded-lg bg-ink text-[9px] text-white">
              {index + 1}
            </span>
            <p className="text-[11px] leading-5 text-muted-foreground">
              {item}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-start gap-2 rounded-xl border border-coral/20 bg-coral/[0.035] p-4 text-[10px] leading-5">
        <CircleAlert className="mt-0.5 size-3.5 shrink-0 text-coral" />
        <span className="text-muted-foreground">
          下一次验证：24h / 72h
          复采公开指标，并取得作者后台留存曲线和账号同期同类作品中位数。
        </span>
      </div>
    </div>
  );
}

function SampleAcquisitionEvidence() {
  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">获客路径 · 目前是机制假设</h2>
          <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
            公开页面能证明内容和互动，不能证明私信、加微、有效线索或成交。
          </p>
        </div>
        <StatusBadge tone="warn">缺后台转化证据</StatusBadge>
      </div>
      <div className="mt-5 space-y-2">
        {editingResearchSample.acquisitionHypotheses.map((item, index) => (
          <div
            key={item}
            className="grid gap-2 rounded-xl border border-border p-4 sm:grid-cols-[74px_minmax(0,1fr)]"
          >
            <span className="text-[10px] font-semibold text-coral">
              路径 {index + 1}
            </span>
            <span className="text-[11px] leading-5 text-muted-foreground">
              {item}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <section className="rounded-xl bg-lime/18 p-4">
          <div className="text-xs font-semibold">已观察到</div>
          <p className="mt-2 text-[10px] leading-5 text-muted-foreground">
            一位观众明确表示适合其“不写稿直接口播长视频”的计划；作者公开补充了对照样本学习方法。
          </p>
        </section>
        <section className="rounded-xl bg-coral/[0.06] p-4">
          <div className="text-xs font-semibold">仍然未知</div>
          <p className="mt-2 text-[10px] leading-5 text-muted-foreground">
            主页访问、关注来源、私信、咨询、有效线索与成交。本条不能用“有评论”替代获客结果。
          </p>
        </section>
      </div>
    </div>
  );
}

function SampleMonetizationEvidence() {
  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">变现路径与证明上限</h2>
          <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
            只描述可能连接的产品路径，不把账号级业务或评论意向归因成本条成交。
          </p>
        </div>
        <StatusBadge tone="neutral">真实结果未知</StatusBadge>
      </div>
      <div className="mt-5 space-y-3">
        {editingResearchSample.monetizationHypotheses.map((item, index) => (
          <div
            key={item}
            className="flex items-start gap-3 rounded-xl border border-border p-4"
          >
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-muted text-[9px] font-semibold">
              {index + 1}
            </span>
            <p className="text-[11px] leading-5 text-muted-foreground">
              {item}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-xl border border-amber/25 bg-amber/8 p-4 text-[10px] leading-5 text-muted-foreground">
        升级为“结果已核验”至少需要：本条归因链接或咨询来源、有效线索定义、统计窗口，以及授权后台记录。
      </div>
    </div>
  );
}

function SampleCommentEvidence() {
  const comments = editingResearchSample.comments;
  const topLevel = comments.filter((comment) => comment.parentRef === null);
  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">本次网页登录可见评论树</h2>
          <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
            9 条一级评论 + 3 条回复；已展开唯一回复组并看到“暂时没有更多评论”。
          </p>
        </div>
        <div className="flex gap-2">
          <StatusBadge tone="safe">页面可见到尾</StatusBadge>
          <StatusBadge tone="warn">API 完整性未证明</StatusBadge>
        </div>
      </div>
      <div className="mt-5 space-y-3">
        {topLevel.map((comment) => {
          const replies = comments.filter(
            (candidate) => candidate.parentRef === comment.localRef,
          );
          return (
            <article
              key={comment.localRef}
              className="rounded-xl border border-border p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] font-semibold">
                    {comment.author}
                  </span>
                  <span className="ml-2 font-mono text-[8px] text-muted-foreground">
                    {comment.localRef}
                  </span>
                </div>
                <span className="text-[9px] text-muted-foreground">
                  点赞 {comment.likes ?? '未知'}
                </span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-[11px] leading-5">
                {comment.body}
              </p>
              {comment.note && (
                <p className="mt-2 text-[9px] leading-4 text-muted-foreground">
                  研究备注：{comment.note}
                </p>
              )}
              {replies.length > 0 && (
                <div className="mt-3 space-y-2 border-l border-border pl-4">
                  {replies.map((reply) => (
                    <div
                      key={reply.localRef}
                      className="rounded-lg bg-muted/45 p-3"
                    >
                      <div className="flex items-center justify-between gap-2 text-[9px]">
                        <span className="font-semibold">
                          回复 · {reply.author}
                        </span>
                        <span className="text-muted-foreground">
                          点赞 {reply.likes ?? '未知'}
                        </span>
                      </div>
                      <p className="mt-1 text-[10px] leading-5">{reply.body}</p>
                      {reply.note && (
                        <p className="mt-1 text-[9px] leading-4 text-muted-foreground">
                          研究备注：{reply.note}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </article>
          );
        })}
      </div>
      <div className="mt-4 rounded-xl border border-coral/20 bg-coral/[0.035] p-4 text-[10px] leading-5 text-muted-foreground">
        这些 browser-* 编号只是本轮本地证据定位，不是抖音
        comment_id。真正“完整评论”还必须保存评论 ID、父子 ID、每页游标、has_more
        终止回执、去重结果和采集时间。
      </div>
    </div>
  );
}

function ComprehensionEditingResearch() {
  const method = comprehensionEditingMethod;
  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">从“删废话”升级到“意义剪辑”</h2>
          <p className="mt-1 max-w-2xl text-[11px] leading-5 text-muted-foreground">
            {method.principle} 这里吸收 DBSkill
            的对照样本、反例和边界意识，流程与字段由本项目独立实现，不复制第三方
            Skill 文本。
          </p>
        </div>
        <StatusBadge tone="info">制作板块共用</StatusBadge>
      </div>
      <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <section className="rounded-xl border border-border p-4">
          <h3 className="text-xs font-semibold">单段诊断顺序</h3>
          <div className="mt-3 space-y-2">
            {method.diagnosticOrder.map((item, index) => (
              <div key={item} className="flex gap-3 rounded-lg bg-muted/45 p-3">
                <span className="grid size-5 shrink-0 place-items-center rounded-md bg-ink text-[8px] text-white">
                  {index + 1}
                </span>
                <span className="text-[10px] leading-5 text-muted-foreground">
                  {item}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {method.actions.map((action) => (
              <Badge key={action} variant="outline" className="bg-white">
                {action}
              </Badge>
            ))}
          </div>
        </section>
        <section className="rounded-xl border border-border p-4">
          <h3 className="text-xs font-semibold">AI B-roll 进入门</h3>
          <div className="mt-3 space-y-2">
            {method.brollGate.map((item) => (
              <div
                key={item}
                className="flex items-start gap-2 text-[10px] leading-5"
              >
                <Check className="mt-0.5 size-3.5 shrink-0 text-[#4d8a5b]" />
                <span className="text-muted-foreground">{item}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
      <div className="mt-4 overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[760px] text-left text-[10px]">
          <thead className="bg-muted/55 text-muted-foreground">
            <tr>
              <th className="p-3">必存字段</th>
              <th className="p-3">为什么需要</th>
              <th className="p-3">误删 / 误导风险</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['时间码 + 原句', '能回到真实素材复核', '不要只保存 AI 摘要'],
              [
                '语义角色',
                '观点 / 因果 / 证据 / 条件 / 边界 / CTA',
                '删除条件词会反转结论',
              ],
              [
                '处理动作 + 原因',
                '保留、移动、合并、压缩或删除必须可解释',
                '短不等于更好懂',
              ],
              [
                '视觉任务',
                '证明、解释、演示、情绪或无需画面',
                '装饰性 B-roll 会抢理解',
              ],
              [
                '删前 / 删后回放',
                '验证作者声音和口播节奏',
                '局部顺滑可能破坏全篇',
              ],
            ].map((row) => (
              <tr key={row[0]} className="border-t border-border">
                <td className="p-3 font-semibold">{row[0]}</td>
                <td className="p-3 text-muted-foreground">{row[1]}</td>
                <td className="p-3 text-muted-foreground">{row[2]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4">
        <h3 className="text-xs font-semibold">这条样本暴露的制作卡点</h3>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {editingResearchSample.blockers.map((blocker) => (
            <div
              key={blocker.title}
              className="rounded-xl border border-border p-4"
            >
              <div className="flex items-center gap-2">
                <StatusBadge
                  tone={
                    blocker.priority === 'P0'
                      ? 'danger'
                      : blocker.priority === '已解决'
                        ? 'safe'
                        : 'warn'
                  }
                >
                  {blocker.priority}
                </StatusBadge>
                <span className="text-[11px] font-semibold">
                  {blocker.title}
                </span>
              </div>
              <p className="mt-2 text-[10px] leading-5 text-muted-foreground">
                {blocker.detail}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ResearchScope({
  connection,
  job,
  policy,
  sourceKind,
}: {
  connection: GatewayConnection;
  job: ResearchJob | null;
  policy: ResearchPolicy;
  sourceKind: 'content' | 'creator';
}) {
  const preset = getCommentPreset(policy.preset);
  const items = [
    {
      title:
        sourceKind === 'content'
          ? '只研究链接对应的 1 条作品'
          : `下一批最多 ${policy.maxWorks} 条作品`,
      desc: '按来源返回顺序读取，记录真实边界；达到所选上限就停止，不宣称全账号研究完成',
      checked: true,
    },
    {
      title: `每条作品最多 ${preset.candidateLimit} 条评论候选`,
      desc: `按规则初筛，最多保存 ${preset.selectedLimit} 条有信息的评论；不是先全部抓取再挑选`,
      checked: true,
    },
    {
      title: `每个讨论串最多查看 ${preset.replyLimit} 条回复`,
      desc: '回复与一级评论共用候选总额，选中回复连同根评论保存；保留高赞、问题、经历、异议和购买信号',
      checked: true,
    },
    {
      title: '原文与双轴分类',
      desc: '标题、说明、ASR、校对稿分开；内容主类型与拍摄形式分开；媒体默认不留存',
      checked: true,
    },
    {
      title: '有多少证据，就分析到哪里',
      desc: '四类内容、相对爆款和经营作用只依据已得到的样本；没有同期基线时，不推算全账号表现',
      checked: true,
    },
    {
      title: '流量 / 获客 / 变现角色地图',
      desc: '每条视频标一个主要经营作用，可有次要作用；“能走到哪里”和“实际做到什么”分开保存',
      checked: true,
    },
  ];
  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">新任务的研究范围</h2>
          <p className="mt-1 text-[10px] text-muted-foreground">
            有界采集成为默认方式；下列设置只用于新任务，已有任务按创建时的范围执行
          </p>
        </div>
        <StatusBadge
          tone={
            job?.completeness.complete
              ? 'safe'
              : job
                ? 'warn'
                : connection === 'ready'
                  ? 'info'
                  : 'neutral'
          }
        >
          {job?.completeness.complete
            ? '采集时点可见范围已完成'
            : job
              ? `${job.state} · ${job.stage}`
              : connection === 'ready'
                ? '可创建真实任务'
                : '尚无真实任务'}
        </StatusBadge>
      </div>
      <div className="mt-4 space-y-2">
        {items.map((item) => (
          <div
            key={item.title}
            className="flex items-start gap-3 rounded-xl border border-border p-3.5"
          >
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-ink/40" />
            <div>
              <div className="text-xs font-medium">{item.title}</div>
              <p className="mt-1 text-[10px] leading-4 text-muted-foreground">
                {item.desc}
              </p>
            </div>
          </div>
        ))}
      </div>
      {job?.completeness.gaps?.length ? (
        <div className="mt-4 rounded-xl border border-coral/20 bg-coral/[0.035] p-4">
          <div className="text-[10px] font-semibold">
            真实任务缺口 · {job.job_id}
          </div>
          <div className="mt-2 space-y-1">
            {job.completeness.gaps.map((gap) => (
              <p
                key={gap}
                className="text-[9px] leading-4 text-muted-foreground"
              >
                {presentGatewayGap(gap)}
              </p>
            ))}
          </div>
        </div>
      ) : null}
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {[
          ['两层研究', '博主长期结构 + 单条视频证据'],
          ['存储策略', '零媒体默认'],
          ['续跑策略', '作品 ID 去重，缺什么补什么'],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl bg-muted/50 p-3">
            <div className="text-[10px] text-muted-foreground">{label}</div>
            <div className="mt-1 text-xs font-semibold">{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatMetric(value: number | undefined) {
  if (value === undefined) return '—';
  return new Intl.NumberFormat('zh-CN', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

function presentSamplingStop(reason: string) {
  return (
    (
      {
        candidate_limit: '达到候选总额',
        top_level_budget: '达到一级评论候选额度，已为回复预留范围',
        reply_limit: '达到所选讨论串回复上限',
        sample_range_exhausted: '本次访问窗口结束，未访问范围仍可能有评论',
        provider_count_mismatch: '来源未遵守请求条数，超额部分未保存并已停止',
        provider_error: '来源访问出错，已保留现有样本',
        pagination_gap: '分页异常，需要复核',
        request_or_runtime_limit: '达到请求次数或运行时间上限',
        cancelled: '任务已停止，已有样本保留',
        visible_range_exhausted:
          '本轮已读取页面范围结束；未继续滚动和展开的评论不在样本内',
        limit_reached: '达到本轮采样上限',
        no_new_comments: '当前页面没有加载新评论，不代表全部评论已取完',
        login_required: '平台要求重新登录，已停止',
        access_restricted: '平台限制访问，已停止',
        user_stopped: '本轮主动停止，已保存的证据保留',
      } as Record<string, string>
    )[reason] || reason
  );
}

function presentCommentCategory(category: string) {
  return (
    (
      {
        question: '具体提问',
        pain: '痛点',
        pain_point: '痛点',
        objection: '异议',
        experience: '真实经历',
        purchase_intent: '购买信号',
        high_like: '高赞观点',
        high_likes: '高赞观点',
        concrete_detail: '具体信息',
        informative: '有信息内容',
        creator_reply: '作者回复',
        context: '根评论上下文',
        substantive: '有信息观点',
      } as Record<string, string>
    )[category] || category
  );
}

function presentGatewayGap(gap: string) {
  if (gap.includes('provider credential is missing or was rejected')) {
    return '第三方采集凭证缺失或被拒绝；本轮没有采到作品或评论。';
  }
  if (gap.includes('comment collection has not started')) {
    return '这条作品尚未开始评论采集。';
  }
  if (gap.includes('top-level comments status is')) {
    return `一级评论未采到终止页：${gap.split(' is ').at(-1) ?? '状态未知'}`;
  }
  if (gap.includes('comment replies status is')) {
    return `评论回复未采到终止页：${gap.split(' is ').at(-1) ?? '状态未知'}`;
  }
  return gap;
}

function ResearchSelectionContext({
  content,
  message,
  analysis,
  analysisMessage,
  reviewing,
  onReloadAnalysis,
  onReview,
}: {
  content: ResearchContent | null;
  message: string;
  analysis: ContentAnalysis | null;
  analysisMessage: string;
  reviewing: boolean;
  onReloadAnalysis: () => void;
  onReview: (decision: 'approve' | 'request_changes') => void;
}) {
  if (!content) {
    return (
      <div className="mb-5 flex items-start gap-3 rounded-xl border border-dashed border-border bg-muted/25 p-4">
        <CircleAlert className="mt-0.5 size-4 shrink-0 text-amber-ink" />
        <div>
          <div className="text-[11px] font-semibold">尚未选择真实作品</div>
          <p className="mt-1 text-[10px] leading-4 text-muted-foreground">
            {message || '创建博主研究任务后，这里会显示真实作品索引。'}
            以下标签页展示拆解标准，不代表已经分析了某条视频。
          </p>
        </div>
      </div>
    );
  }
  const metrics = [
    ['播放', content.metrics.play_count],
    ['点赞', content.metrics.like_count],
    ['评论', content.metrics.comment_count],
    ['分享', content.metrics.share_count],
    ['收藏', content.metrics.collect_count],
  ] as const;
  const genre = analysis?.revision.content_genre.primary;
  const form = analysis?.revision.content_form.type;
  const business = analysis?.revision.business_role.designed_function.primary;
  const reviewTone =
    analysis?.review_status === 'approved'
      ? 'safe'
      : analysis?.review_status === 'rejected'
        ? 'danger'
        : 'warn';
  return (
    <div className="mb-5 rounded-xl border border-ink/10 bg-ink/[0.025] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[9px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            当前选中作品 · {content.external_id || content.content_id}
          </div>
          <h2 className="mt-1 line-clamp-2 text-sm font-semibold">
            {content.title || content.description || '未取得标题'}
          </h2>
          <div className="mt-2 text-[9px] text-muted-foreground">
            {content.published_at?.slice(0, 10) || '发布日期未知'} ·{' '}
            {content.duration_ms
              ? `${Math.round(content.duration_ms / 1000)} 秒`
              : '时长未知'}
          </div>
        </div>
        <div className="flex gap-2">
          <StatusBadge tone="safe">真实作品索引</StatusBadge>
          <StatusBadge tone={reviewTone}>
            {analysis
              ? analysis.review_status === 'approved'
                ? `第 ${analysis.current_revision} 版已复核`
                : `第 ${analysis.current_revision} 版·${reviewStatusLabels[analysis.review_status]}`
              : '尚无拆解版本'}
          </StatusBadge>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {metrics.map(([label, value]) => (
          <div key={label} className="rounded-lg bg-white p-2.5">
            <div className="text-[9px] text-muted-foreground">{label}</div>
            <div className="mt-0.5 text-xs font-semibold">
              {formatMetric(value)}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[9px] leading-4 text-muted-foreground">
        指标只代表采集时快照；在同观察窗口的账号基线、完整原文与评论未齐之前，不自动生成“为什么火”的确定结论。
      </p>
      <div className="mt-4 border-t border-ink/10 pt-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold">
                拆解版本与人工复核
              </span>
              {analysis && (
                <>
                  <StatusBadge tone="info">
                    {genre ? genreLabels[genre] : '类型待判'}
                  </StatusBadge>
                  <StatusBadge tone="neutral">
                    {form ? formLabels[form] : '形式待判'}
                  </StatusBadge>
                  <StatusBadge tone="neutral">
                    {business ? businessLabels[business] : '作用待判'}
                  </StatusBadge>
                </>
              )}
            </div>
            <p className="mt-1 max-w-2xl text-[10px] leading-5 text-muted-foreground">
              {analysisMessage || '正在检查这条作品是否已有可追溯的拆解版本。'}
            </p>
            {analysis && (
              <p className="mt-1 text-[9px] leading-4 text-muted-foreground">
                固定口播只能引用连续原文；新版本会自动回到待复核，不继承旧版批准状态。
              </p>
            )}
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={reviewing}
              onClick={onReloadAnalysis}
            >
              <RefreshCw className={reviewing ? 'animate-spin' : ''} /> 重新读取
            </Button>
            {analysis && analysis.review_status !== 'approved' && (
              <Button
                variant="outline"
                size="sm"
                disabled={reviewing}
                onClick={() => onReview('request_changes')}
              >
                <CircleAlert /> 需补证据
              </Button>
            )}
            {analysis && analysis.review_status !== 'approved' && (
              <Button
                size="sm"
                disabled={reviewing}
                onClick={() => onReview('approve')}
              >
                <UserCheck /> 人工批准本版
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ResearchContentQueue({
  contents,
  selectedContentId,
  onSelect,
  message,
}: {
  contents: ResearchContent[];
  selectedContentId: string | null;
  onSelect: (contentId: string) => void;
  message: string;
}) {
  return (
    <article className="surface-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">真实作品研究队列</h2>
          <p className="mt-1 text-[10px] leading-4 text-muted-foreground">
            {message || '按发布时间加载作品索引'}
          </p>
        </div>
        <StatusBadge tone="info">逐条拆解</StatusBadge>
      </div>
      <div className="mt-4 max-h-[390px] space-y-2 overflow-y-auto pr-1">
        {contents.map((content) => {
          const selected = content.content_id === selectedContentId;
          return (
            <button
              key={content.content_id}
              type="button"
              onClick={() => onSelect(content.content_id)}
              className={`w-full rounded-xl border p-3 text-left transition-colors ${selected ? 'border-ink bg-ink/[0.045]' : 'border-border hover:bg-muted/35'}`}
            >
              <div className="line-clamp-2 text-[10px] font-semibold leading-4">
                {content.title || content.description || '未取得标题'}
              </div>
              <div className="mt-2 flex items-center justify-between gap-2 text-[9px] text-muted-foreground">
                <span>{content.published_at?.slice(0, 10) || '日期未知'}</span>
                <span>
                  播放 {formatMetric(content.metrics.play_count)} · 评论{' '}
                  {formatMetric(content.metrics.comment_count)}
                </span>
              </div>
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-[9px] leading-4 text-muted-foreground">
        每条作品现在都可读取独立拆解版本和追加式人工复核；没有版本时明确显示缺口，不用模拟结论填充。
      </p>
    </article>
  );
}

function CoverageDemo({ detail }: { detail: ResearchJobDetail | null }) {
  const job = detail?.job;
  const comments = job?.completeness.comments;
  const sync = detail?.comment_sync;
  const rows: Array<{
    label: string;
    saved: string;
    reported: string;
    status: string;
    tone: 'safe' | 'warn' | 'danger' | 'neutral' | 'info';
  }> = [
    {
      label: '作品层',
      saved: String(detail?.content_count ?? job?.progress.normalized ?? 0),
      reported: '—',
      status: job?.completeness.posts?.complete
        ? '已到终止页'
        : job
          ? '采集中 / 有缺口'
          : '未开始',
      tone: job?.completeness.posts?.complete
        ? 'safe'
        : job
          ? 'warn'
          : 'neutral',
    },
    {
      label: '一级评论层',
      saved: String(
        sync?.top_level_comments ?? comments?.top_level_comments ?? 0,
      ),
      reported: `${sync?.top_level_complete ?? comments?.works_top_level_complete ?? 0}/${sync?.works_total ?? comments?.works_total ?? 0} 作品`,
      status:
        sync &&
        sync.works_total > 0 &&
        sync.top_level_complete === sync.works_total
          ? '已完成'
          : job
            ? '采集中 / 有缺口'
            : '未开始',
      tone:
        sync &&
        sync.works_total > 0 &&
        sync.top_level_complete === sync.works_total
          ? 'safe'
          : job
            ? 'warn'
            : 'neutral',
    },
    {
      label: '回复层',
      saved: String(sync?.replies ?? comments?.replies ?? 0),
      reported: `${sync?.replies_complete ?? comments?.works_replies_complete ?? 0}/${sync?.works_total ?? comments?.works_total ?? 0} 作品`,
      status:
        sync &&
        sync.works_total > 0 &&
        sync.replies_complete === sync.works_total
          ? '已完成'
          : job
            ? '采集中 / 有缺口'
            : '未开始',
      tone:
        sync &&
        sync.works_total > 0 &&
        sync.replies_complete === sync.works_total
          ? 'safe'
          : job
            ? 'warn'
            : 'neutral',
    },
  ];
  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">三层覆盖率</h2>
          <p className="mt-1 text-[10px] text-muted-foreground">
            没有跑到分页结束，整批不能写“完整”
          </p>
        </div>
        <StatusBadge
          tone={
            job?.completeness.complete
              ? 'safe'
              : job?.failure.present
                ? 'danger'
                : job
                  ? 'warn'
                  : 'neutral'
          }
        >
          {job?.completeness.complete
            ? '可见范围已完成'
            : job?.failure.present
              ? '任务失败'
              : job
                ? `${job.state} · 缺口 ${job.completeness.gap_count}`
                : '无任务'}
        </StatusBadge>
      </div>
      <div className="mt-4 overflow-hidden rounded-xl border border-border">
        <table className="w-full text-left text-[10px]">
          <thead className="bg-muted/55 text-muted-foreground">
            <tr>
              <th className="p-3 font-medium">层级</th>
              <th className="p-3 font-medium">去重实得</th>
              <th className="p-3 font-medium">接口报告</th>
              <th className="p-3 font-medium">状态</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-t border-border">
                <td className="p-3 font-medium">{row.label}</td>
                <td className="p-3">{row.saved}</td>
                <td className="p-3">{row.reported}</td>
                <td className="p-3">
                  <StatusBadge tone={row.tone}>{row.status}</StatusBadge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 rounded-xl bg-muted/50 p-4">
        <div className="flex items-center gap-2 text-xs font-medium">
          <CircleAlert className="size-4 text-amber-ink" /> “完整”的唯一口径
        </div>
        <p className="mt-2 text-[10px] leading-5 text-muted-foreground">
          指定采集时点、指定提供方公开可见范围，作品、一级评论和每条回复都翻页到结束；删除、隐藏、接口未返回和采集后新增内容不在承诺内。
        </p>
      </div>
    </div>
  );
}

function FactoryView({
  topic,
  draft,
  onSave,
  flash,
  onDirtyChange,
}: {
  topic: TopicBrief;
  draft?: ScriptDraft;
  onSave: (draft: ScriptDraft) => void;
  flash: (message: string) => void;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const [route, setRoute] = useState<ScriptRoute>(draft?.route ?? topic.route);
  const [genre, setGenre] = useState<ContentGenre>(
    draft?.genre ?? topic.primaryGenre,
  );
  const [script, setScript] = useState(draft?.script ?? topic.script);
  const [previewOpen, setPreviewOpen] = useState(false);
  const dirty =
    genre !== (draft?.genre ?? topic.primaryGenre) ||
    route !== (draft?.route ?? topic.route) ||
    script !== (draft?.script ?? topic.script);
  useUnsavedChanges(dirty, onDirtyChange);
  const reset = () => {
    setGenre(draft?.genre ?? topic.primaryGenre);
    setRoute(draft?.route ?? topic.route);
    setScript(draft?.script ?? topic.script);
  };
  return (
    <>
      <ViewHeader
        view="factory"
        actions={
          <>
            <Button variant="outline" onClick={() => setPreviewOpen(true)}>
              <Eye />
              预览成稿
            </Button>
            <Button variant="ghost" disabled={!dirty} onClick={reset}>
              放弃未保存修改
            </Button>
            <Button
              onClick={() => {
                onSave({ genre, route, script });
                flash('当前草稿已保存在本设备');
              }}
            >
              <Save />
              保存当前草稿
            </Button>
          </>
        }
      />
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{topic.title}</DialogTitle>
            <DialogDescription>
              {dirty ? '当前未保存草稿' : '当前读取版本'} · {genreLabels[genre]}{' '}
              · {formLabels[route]}
            </DialogDescription>
          </DialogHeader>
          <div className="whitespace-pre-wrap text-base leading-8">
            {script || '正文为空，先写下想说的话。'}
          </div>
        </DialogContent>
      </Dialog>
      <section className="surface-card mt-5 p-4 sm:p-6">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <StatusBadge tone="info">{genreDetails[genre].label}</StatusBadge>
          <StatusBadge tone="info">{routeDetails[route].label}</StatusBadge>
          <span className="text-muted-foreground">
            {dirty ? '有未保存修改' : '当前读取版本'}
          </span>
        </div>
        <h2 className="mt-3 text-xl font-semibold leading-8">{topic.title}</h2>
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer text-muted-foreground">
            调整内容类型与拍法（可选）
          </summary>
          <div className="mt-4 rounded-xl border border-border p-4">
            <fieldset>
              <legend className="text-sm font-medium">内容类型</legend>
              <div className="mt-3 flex flex-wrap gap-2">
                {(Object.keys(genreDetails) as ContentGenre[]).map((id) => (
                  <Button
                    key={id}
                    type="button"
                    aria-pressed={genre === id}
                    variant={genre === id ? 'default' : 'outline'}
                    onClick={() => setGenre(id)}
                  >
                    {genreDetails[id].label}
                  </Button>
                ))}
              </div>
            </fieldset>
            <fieldset className="mt-4">
              <legend className="text-sm font-medium">拍摄形式</legend>
              <div className="mt-3 flex flex-wrap gap-2">
                {(Object.keys(routeDetails) as ScriptRoute[]).map((id) => (
                  <Button
                    key={id}
                    type="button"
                    aria-pressed={route === id}
                    variant={route === id ? 'default' : 'outline'}
                    onClick={() => setRoute(id)}
                  >
                    {routeDetails[id].label}
                  </Button>
                ))}
              </div>
            </fieldset>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              {genreDetails[genre].promise}。{genreDetails[genre].desc}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {routeDetails[route].desc} 切换设置不会自动改写正文。
            </p>
          </div>
        </details>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
          <label htmlFor="script-editor" className="text-base font-medium">
            {route === 'fixed_talking_head'
              ? '连续口播正文'
              : '主脚本 / 旁白与口播正文'}
          </label>
          <span className="text-sm text-muted-foreground">
            {script.replace(/\s/g, '').length} 字符 · 仅当前设备保存
          </span>
        </div>
        <Textarea
          id="script-editor"
          value={script}
          onChange={(event) => setScript(event.target.value)}
          className="mt-3 min-h-[480px] resize-y bg-white p-4 text-base leading-8 sm:p-5"
        />
        {route === 'fixed_talking_head' ? (
          <p className="mt-3 text-sm text-muted-foreground">
            固定口播保留连续正文，不需要分镜。
          </p>
        ) : (
          <details className="mt-4 rounded-xl border border-border p-4">
            <summary className="cursor-pointer text-sm font-medium">
              按需要查看拍摄提示
            </summary>
            {route === 'vlog_process' && <RouteVlog genre={genre} />}{' '}
            {route === 'screen_tutorial' && (
              <RouteTutorial genre={genre} topic={topic} />
            )}{' '}
            {route === 'mixed' && <RouteMixed genre={genre} />}
          </details>
        )}
      </section>
      <details className="surface-card mt-4 p-5">
        <summary className="cursor-pointer text-base font-medium">
          发布前检查与参考来源
        </summary>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          写稿时不必逐项操作，定稿与发布前再核对；这份清单尚未自动检查。
        </p>
        <p className="mt-3 text-sm leading-6">
          目标客户：{topic.targetCustomer}
        </p>
        <div className="mt-4 grid gap-5 md:grid-cols-2">
          <div>
            <h3 className="text-base font-medium">内容检查</h3>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6">
              {genreQualityGates[genre].map((label) => (
                <li key={label}>{label}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-base font-medium">发布前待补的证据</h3>
            <p className="mt-2 text-sm text-amber-ink">{topic.evidenceLabel}</p>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6">
              {topic.missingEvidence.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
        <h3 className="mt-5 text-base font-medium">参考来源</h3>
        <div className="mt-3 space-y-2">
          {topic.sources.map((source) => (
            <div
              key={source.reference}
              className="rounded-lg bg-muted/50 p-3 text-sm"
            >
              <p>
                {source.label} · {source.date}
              </p>
              <p className="mt-2 break-all text-muted-foreground">
                {source.reference}
              </p>
            </div>
          ))}
        </div>
      </details>
    </>
  );
}

function RouteVlog({ genre }: { genre: ContentGenre }) {
  const rows: Record<ContentGenre, string[][]> = {
    process_record: [
      ['01', '任务起点', '交代今天要解决的真实任务', '场景和任务证据'],
      ['02', '执行节点', '记录关键动作和遇到的问题', '只拍能证明过程的动作'],
      ['03', '结果出现', '给出前后变化和证据', '结果画面 + 同期声'],
      ['04', '状态说明', '说明是否闭环、边界和下一步', '必要时连续口播收束'],
    ],
    knowledge: [
      ['01', '问题现场', '让客户看见具体错误或疑问', '真实问题与使用场景'],
      ['02', '错误示范', '解释为什么会出错和代价', '错误动作或结果证据'],
      ['03', '正确操作', '按顺序完成关键方法', '只拍决定理解的步骤'],
      ['04', '结果与边界', '验证效果并说明适用条件', '前后对照或验收结果'],
    ],
    opinion: [
      ['01', '真实处境', '从现场问题提出中心判断', '承载问题的真实场景'],
      ['02', '证据案例', '用动作、数据或人物证明判断', '可核验的现场证据'],
      ['03', '反方边界', '回应合理反例，不把观点说满', '例外或限制条件'],
      ['04', '本人结论', '回到创作者判断和一个行动', '连续口播，不硬切镜头'],
    ],
    story: [
      ['01', '人物起点', '交代人物、处境和想完成的事', '人物与环境建立镜头'],
      ['02', '具体冲突', '让一件事件真正改变进程', '冲突发生的动作或证据'],
      [
        '03',
        '行动转折',
        '记录人物如何处理而不是旁白概括',
        '决定变化的真实行动',
      ],
      ['04', '结果变化', '呈现结果、代价或新的状态', '结果画面 + 克制收束'],
    ],
  };

  return (
    <div className="mt-5 space-y-3">
      {rows[genre].map((row) => (
        <div
          key={row[0]}
          className="grid gap-3 rounded-xl border border-border p-4 sm:grid-cols-[36px_90px_minmax(0,1fr)]"
        >
          <span className="text-lg font-semibold text-muted-foreground/50">
            {row[0]}
          </span>
          <span className="text-xs font-semibold">{row[1]}</span>
          <div>
            <p className="text-xs">{row[2]}</p>
            <p className="mt-1 text-[10px] text-muted-foreground">
              必要画面：{row[3]}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function RouteTutorial({
  genre,
  topic,
}: {
  genre: ContentGenre;
  topic: TopicBrief;
}) {
  const steps: Record<ContentGenre, string[]> = {
    process_record: [
      '打开能证明任务起点的界面',
      '保留决定进程的关键操作',
      '记录异常、修正与真实结果',
      '展示当前状态与下一步',
    ],
    knowledge: [
      '先展示观众要完成的结果',
      '按顺序保留必要操作',
      '指出一个常见错误与判断标准',
      '用结果界面说明适用边界',
    ],
    opinion: [
      '用真实界面呈现问题处境',
      '用可核验的输入与输出支撑判断',
      '保留一个反例或限制条件',
      '回到中心判断与唯一行动',
    ],
    story: [
      '用界面建立人物的初始处境',
      '展示真正引发冲突的操作或消息',
      '保留人物做出选择的关键动作',
      '展示结果、代价或状态变化',
    ],
  };

  return (
    <div className="mt-5">
      {genre !== 'knowledge' && (
        <div className="mb-3 rounded-lg border border-amber/30 bg-amber/8 p-3 text-[10px] leading-5 text-amber-ink">
          录屏教程可以承载{genreDetails[genre].label}
          ，但要确认屏幕操作真的参与表达；如果只是装饰画面，改回固定口播或混合型。
        </div>
      )}
      <div className="rounded-xl bg-muted/50 p-4">
        <div className="text-[10px] text-muted-foreground">操作目标</div>
        <div className="mt-1 text-sm font-semibold">
          围绕「{topic.title}」，只录真正承担表达的屏幕动作
        </div>
      </div>
      <ol className="mt-3 space-y-2">
        {steps[genre].map((step, index) => (
          <li
            key={step}
            className="flex gap-3 rounded-xl border border-border p-4"
          >
            <span className="grid size-6 shrink-0 place-items-center rounded-lg bg-ink text-[10px] text-white">
              {index + 1}
            </span>
            <div>
              <div className="text-xs font-medium">{step}</div>
              <div className="mt-1 text-[10px] text-muted-foreground">
                关键界面：只记录这一动作的输入与输出
              </div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function RouteMixed({ genre }: { genre: ContentGenre }) {
  const evidenceNode: Record<ContentGenre, string> = {
    process_record: '保留任务起点、关键动作与结果证据',
    knowledge: '保留决定理解的步骤、错误示范或验收结果',
    opinion: '保留能支撑判断的现场、数据或反例',
    story: '保留引发冲突、选择与状态变化的画面',
  };

  return (
    <div className="mt-5 space-y-3">
      <div className="rounded-lg border border-border bg-muted/45 p-3 text-[10px] leading-5 text-muted-foreground">
        当前正文按“{genreDetails[genre].label}
        ”验收；混合型只负责保留连续口播块，并标出真正承担信息的现场、录屏或证据节点。
      </div>
      {[
        ['正文块', '连续口播 / 旁白', '完整保留，不拆句'],
        ['证据点', '现场 / 录屏 / 资料', evidenceNode[genre]],
        ['回到正文', '连续口播 / 旁白', '解释证据和结论之间的关系'],
        ['必要收束', '结果 / 边界', '只标真正有意义的变化'],
      ].map((row) => (
        <div
          key={row[0]}
          className="grid gap-2 rounded-xl border border-border p-4 sm:grid-cols-[90px_140px_minmax(0,1fr)]"
        >
          <span className="text-[10px] text-muted-foreground">{row[0]}</span>
          <span className="text-xs font-semibold">{row[1]}</span>
          <span className="text-xs">{row[2]}</span>
        </div>
      ))}
    </div>
  );
}

function ProductionView({
  go,
  flash,
}: {
  go: (id: ViewId) => void;
  flash: (message: string) => void;
}) {
  const modes = [
    {
      title: '技术粗剪',
      desc: '只处理口误、静音、字幕、音量与基础画面；完成这一步不等于观众已经看懂。',
      status: '默认路径',
      icon: Video,
    },
    {
      title: '证据增强',
      desc: '插入真实截图、官方资料、录屏和必要的动态图形。',
      status: '按脚本证据点',
      icon: ShieldCheck,
    },
    {
      title: '动画增强',
      desc: '只有抽象概念确实需要解释时，才生成 AI 动画或 B-roll。',
      status: '可选分支',
      icon: Sparkles,
    },
  ];
  const animationSteps = [
    ['01', '视觉任务', '这段动画到底要解释什么'],
    ['02', '风格板审核', '先定审美，不急着批量生成'],
    ['03', '关键帧审核', '先确认第一张画面方向'],
    ['04', '10 秒试镜', '验证动作、节奏与人物一致性'],
    ['05', '批量生成', '审核通过后再消耗模型额度'],
    ['06', '粗剪与修改', '回到时间线，与真实口播合并'],
  ];
  const semanticTimeline = [
    [
      '原稿与原片',
      '待接入',
      '保存来源、版本和带时间码逐字稿；ASR 错误不静默润色',
    ],
    [
      '语义分段',
      '规则已入库',
      '按钩子、观点、原因、证据、案例、边界、回扣和 CTA 标注功能',
    ],
    [
      '逐段决策',
      '规则已入库',
      '保留 / 删除 / 缩写 / 合并 / 调序 / 替换 / 补录 / 旁白',
    ],
    [
      '误删与调序审计',
      '规则已入库',
      '检查观点、因果、证据、边界、代词、时间线和作者声音',
    ],
    [
      '人工批准',
      '强制门禁',
      '原文、AI 建议和目标顺序并排；不可逆时间线前必须确认',
    ],
    ['时间线粗剪', '执行器待接入', '把已批准动作映射到源时间码并检查跳切'],
    [
      '理解型视觉',
      '按需',
      '真实证据优先；只在确有理解任务时加入 B-roll 或动画',
    ],
    [
      '理解 / 权利 / 技术质检',
      '未开始',
      '独立回放音频、核事实授权、字幕、声道、响度与同步',
    ],
  ];
  const providers = [
    {
      name: 'HyperFrames',
      role: '动态图形 / 字幕 / 合成',
      status: '本机样片已存在',
      tone: 'safe' as const,
    },
    {
      name: 'Seedance',
      role: '文生视频 / 图生视频',
      status: '待确认能力与接入方式',
      tone: 'warn' as const,
    },
    {
      name: 'MiniMax Video',
      role: 'AI 动画与短片段',
      status: '待连接',
      tone: 'warn' as const,
    },
    {
      name: '智能剪辑引擎',
      role: '口播清理 / 时间线 / 导出',
      status: '流程研究中',
      tone: 'neutral' as const,
    },
  ];
  return (
    <>
      <ViewHeader
        view="production"
        actions={
          <>
            <Button
              variant="outline"
              className="bg-white"
              onClick={() => flash('原片上传尚未接通，本次没有上传文件')}
            >
              <Upload /> 上传口播原片
            </Button>
            <Button onClick={() => go('publish')}>
              查看成片审核 <ArrowRight />
            </Button>
          </>
        }
      />
      <div className="mt-7 flex items-start gap-3 rounded-xl border border-lime/40 bg-lime/15 p-4">
        <Scissors className="mt-0.5 size-4 shrink-0 text-ink" />
        <p className="text-[11px] leading-5 text-muted-foreground">
          <span className="font-semibold text-foreground">
            固定口播不先拆分镜。
          </span>
          它从连续正文和口播原片直接进入基础剪辑；真实证据、录屏和 AI
          动画都是按需要添加的分支，不是每条视频的必经步骤。
          <span className="ml-1 font-semibold text-foreground">
            剪掉废话只是技术粗剪，观众准确看懂才是意义剪辑的验收结果。
          </span>
        </p>
      </div>
      <section className="mt-4 grid items-start gap-4 xl:grid-cols-[minmax(0,1.45fr)_390px]">
        <div className="space-y-4">
          <article className="surface-card p-5 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold">意义剪辑规则试运行</h2>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  来源研究 #7681218601885371690 ·
                  只迁移方法，不复制原文、人设和案例
                </p>
              </div>
              <div className="flex gap-2">
                <StatusBadge tone="safe">规则已入库</StatusBadge>
                <StatusBadge tone="warn">执行器待接入</StatusBadge>
              </div>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {modes.map((mode) => {
                const Icon = mode.icon;
                return (
                  <section
                    key={mode.title}
                    className="rounded-xl border border-border p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="grid size-9 place-items-center rounded-xl bg-muted text-ink">
                        <Icon className="size-4" />
                      </div>
                      <StatusBadge
                        tone={
                          mode.status === '默认路径'
                            ? 'safe'
                            : mode.status === '可选分支'
                              ? 'warn'
                              : 'info'
                        }
                      >
                        {mode.status}
                      </StatusBadge>
                    </div>
                    <h3 className="mt-4 text-xs font-semibold">{mode.title}</h3>
                    <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
                      {mode.desc}
                    </p>
                  </section>
                );
              })}
            </div>
          </article>
          <article className="surface-card p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold">逐语义段决策台</h2>
                <p className="mt-1 max-w-2xl text-[11px] leading-5 text-muted-foreground">
                  每个动作都必须回到时间码、原句和语义功能，并写清理由与误删风险；“太长”或“重复”不是充分理由。
                </p>
              </div>
              <StatusBadge tone="info">拍前 / 拍后分流</StatusBadge>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {comprehensionEditingMethod.actions.map((action) => (
                <Badge key={action} variant="outline" className="bg-muted/35">
                  {action}
                </Badge>
              ))}
            </div>
            <div className="mt-4 overflow-x-auto rounded-xl border border-border">
              <table className="w-full min-w-[760px] text-left text-[10px]">
                <thead className="bg-muted/55 text-muted-foreground">
                  <tr>
                    <th className="p-3">语义段</th>
                    <th className="p-3">必须保存</th>
                    <th className="p-3">批准条件</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    [
                      '原始定位',
                      '起止时间码、逐字原句、ASR 置信与校对状态',
                      '能准确回到源素材',
                    ],
                    [
                      '表达功能',
                      '观点 / 原因 / 证据 / 案例 / 过渡 / 边界 / 回扣 / CTA',
                      '上下游依赖已说明',
                    ],
                    [
                      '编辑决定',
                      '动作、目标顺序、原因、置信度与版本',
                      '人工接受或驳回留痕',
                    ],
                    [
                      '意义风险',
                      '观点 / 因果 / 证据 / 边界 / 作者声音 / 口语感',
                      '无损失或有明确等价修复',
                    ],
                    [
                      '视觉支持',
                      '解决的观众问题、素材来源、权利与 AI 标识',
                      '不是装饰，也不冒充证据',
                    ],
                  ].map((row) => (
                    <tr key={row[0]} className="border-t border-border">
                      <td className="p-3 font-semibold">{row[0]}</td>
                      <td className="p-3 text-muted-foreground">{row[1]}</td>
                      <td className="p-3 text-muted-foreground">{row[2]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <section className="rounded-xl bg-lime/18 p-4">
                <div className="text-xs font-semibold">拍前分支</div>
                <p className="mt-2 text-[10px] leading-5 text-muted-foreground">
                  可以改写、换弱案例、补证据和重录。若三个案例都弱，不能从坏素材里硬选一个。
                </p>
              </section>
              <section className="rounded-xl bg-amber/8 p-4">
                <div className="text-xs font-semibold">拍后分支</div>
                <p className="mt-2 text-[10px] leading-5 text-muted-foreground">
                  默认只操作已有时间码；需要补录、旁白或生成辅助视觉时重新请求人工批准。
                </p>
              </section>
            </div>
          </article>
          <article className="surface-card p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold">AI 动画生成门</h2>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  先审方向，再消耗额度；避免整条稿子逐句生成无用画面。
                </p>
              </div>
              <StatusBadge tone="warn">可选分支</StatusBadge>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {animationSteps.map((step) => (
                <section
                  key={step[0]}
                  className="rounded-xl border border-border p-4"
                >
                  <div className="text-[10px] font-semibold text-coral">
                    {step[0]}
                  </div>
                  <h3 className="mt-2 text-xs font-semibold">{step[1]}</h3>
                  <p className="mt-1 text-[10px] leading-4 text-muted-foreground">
                    {step[2]}
                  </p>
                </section>
              ))}
            </div>
          </article>
          <article className="surface-card p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold">意义剪辑任务状态机</h2>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  先解决理解问题，再生成视觉，最后独立做权利与技术质检
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => flash('制作服务尚未接通，本次没有创建制作任务')}
              >
                <Plus /> 新建任务
              </Button>
            </div>
            <div className="mt-5 space-y-2">
              {semanticTimeline.map((row, index) => (
                <div
                  key={row[0]}
                  className="grid gap-2 rounded-xl border border-border p-4 sm:grid-cols-[32px_150px_110px_minmax(0,1fr)] sm:items-center"
                >
                  <span className="grid size-6 place-items-center rounded-lg bg-muted text-[9px]">
                    {index + 1}
                  </span>
                  <span className="text-xs font-semibold">{row[0]}</span>
                  <StatusBadge
                    tone={
                      row[1] === '规则已入库'
                        ? 'safe'
                        : row[1] === '强制门禁'
                          ? 'info'
                          : row[1] === '待接入' || row[1] === '执行器待接入'
                            ? 'warn'
                            : 'neutral'
                    }
                  >
                    {row[1]}
                  </StatusBadge>
                  <span className="text-[10px] text-muted-foreground">
                    {row[2]}
                  </span>
                </div>
              ))}
            </div>
          </article>
        </div>
        <aside className="space-y-4">
          <article className="surface-card p-5">
            <div className="flex items-center gap-2">
              <Film className="size-4 text-coral" />
              <h2 className="text-sm font-semibold">制作能力状态</h2>
            </div>
            <div className="mt-4 space-y-3">
              {providers.map((provider) => (
                <div
                  key={provider.name}
                  className="rounded-xl border border-border p-3.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold">
                      {provider.name}
                    </span>
                    <StatusBadge tone={provider.tone}>
                      {provider.status}
                    </StatusBadge>
                  </div>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {provider.role}
                  </p>
                </div>
              ))}
            </div>
            <Button
              className="mt-4 w-full"
              variant="outline"
              onClick={() => go('connections')}
            >
              管理模型与剪辑连接
            </Button>
          </article>
          <article className="surface-card p-5">
            <h2 className="text-sm font-semibold">成片审核清单</h2>
            <div className="mt-4 space-y-3">
              {[
                '每个删除、合并与调序都绑定原段、功能和理由',
                '观点、因果、证据、条件、回扣与作者声音没有误删',
                '调序后的前置依赖、代词、时间线和音画连续性成立',
                '纯听音频时，目标观众仍能理解核心论证',
                '每个 B-roll 都解决明确问题；AI 画面不冒充真实证据',
                '字幕、左右声道 / 单声道、响度、同步与导出回放通过',
                '数据、截图、隐私、权利和 AI 标识可追溯',
                '成片哈希与版本已记录',
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-start gap-2 text-[11px] leading-5"
                >
                  <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-muted">
                    <Check className="size-3 text-muted-foreground" />
                  </span>
                  {item}
                </div>
              ))}
            </div>
          </article>
          <article className="surface-card p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold">规则回归测试</h2>
              <StatusBadge tone="warn">每次改规则必跑</StatusBadge>
            </div>
            <div className="mt-4 space-y-3">
              {comprehensionEditingMethod.regressionCases.map((test) => (
                <div
                  key={test.name}
                  className="rounded-xl border border-border p-3.5"
                >
                  <div className="text-[10px] font-semibold">{test.name}</div>
                  <p className="mt-1 text-[9px] leading-4 text-muted-foreground">
                    输入：{test.input}
                  </p>
                  <p className="mt-1 text-[9px] leading-4 text-[#4d7657]">
                    预期：{test.expected}
                  </p>
                </div>
              ))}
            </div>
          </article>
        </aside>
      </section>
    </>
  );
}

function PublishView({
  go,
  flash,
}: {
  go: (id: ViewId) => void;
  flash: (message: string) => void;
}) {
  const platforms = [
    {
      name: '抖音',
      account: '主账号 · 未授权',
      title: '790 万播放以后，我为什么重新分开看流量和成交',
      smallTitle: '播放不是成交',
      body: '做企业短视频，先找到链路断在哪一段。没有的数据留空，不拿播放替代咨询和成交。',
      tags: '#企业短视频 #AI获客 #内容复盘',
      time: '示例时间 18:30 · 未排期',
      status: '待账号授权',
    },
    {
      name: '小红书',
      account: '品牌专业号 · 未授权',
      title: '一条 790 万播放，为什么不能直接证明获客能力？',
      smallTitle: '先别只看播放量',
      body: '把最近 10 条内容的播放、主页访问、咨询与成交分开记录，你会更快找到真正的断点。',
      tags: '#企业获客 #短视频运营 #AI提效',
      time: '示例时间 11:40 · 未排期',
      status: '能力待验证',
    },
    {
      name: '视频号',
      account: '企业账号 · 未授权',
      title: '企业做短视频，流量只是入口',
      smallTitle: '入口不能冒充整条路',
      body: '这条内容讲清楚：播放、涨粉、咨询、有效线索和成交为什么必须分别统计。',
      tags: '#企业经营 #短视频获客 #AI工作流',
      time: '示例时间 19:30 · 未排期',
      status: '能力待验证',
    },
  ];
  const approvals = [
    ['成片版本与哈希', '等待真实成片'],
    ['事实、字幕与隐私', '待审核'],
    ['AI 内容标识', '待确认'],
    ['三平台文案', '仅示例，待生成'],
    ['账号与发布时间', '未授权'],
  ];
  return (
    <>
      <ViewHeader
        view="publish"
        actions={
          <>
            <Button
              variant="outline"
              className="bg-white"
              onClick={() => go('connections')}
            >
              <PlugZap /> 连接发布账号
            </Button>
            <Button
              onClick={() =>
                flash('平台文案生成尚未接通；没有生成新稿，也没有执行发布')
              }
            >
              <Sparkles /> 生成平台版本
            </Button>
          </>
        }
      />
      <div className="mt-7 flex items-start gap-3 rounded-xl border border-amber/25 bg-amber/8 p-4">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-amber-ink" />
        <div>
          <div className="text-xs font-semibold">
            自动发布从“成片审核通过”以后才开始
          </div>
          <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
            每个平台分别确认账号、主标题、封面小标题、发布正文、话题、CTA
            和时间。批准后进入定时任务；未授权、审核失败或平台能力未核验时不会自动执行。
          </p>
        </div>
      </div>
      <section className="mt-4 grid items-start gap-4 xl:grid-cols-[minmax(0,1.45fr)_390px]">
        <div className="space-y-4">
          <article className="surface-card overflow-hidden p-0">
            <div className="flex flex-col gap-3 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Video className="size-4 text-coral" />
                  <h2 className="text-sm font-semibold">
                    发布示例（不是真实任务）
                  </h2>
                </div>
                <h3 className="mt-2 text-base font-semibold">
                  790 万播放不等于替企业成交
                </h3>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  固定口播 · 连续稿 v4 · 成片尚未上传
                </p>
              </div>
              <div className="flex gap-2">
                <StatusBadge tone="warn">待成片审核</StatusBadge>
                <StatusBadge tone="info">3 个平台版本</StatusBadge>
              </div>
            </div>
            <div className="grid gap-3 p-5 lg:grid-cols-3">
              {platforms.map((platform) => (
                <section
                  key={platform.name}
                  className="rounded-xl border border-border bg-white p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold">{platform.name}</div>
                    <StatusBadge tone="warn">{platform.status}</StatusBadge>
                  </div>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {platform.account}
                  </p>
                  <div className="mt-4 space-y-3">
                    <div>
                      <div className="text-[9px] font-semibold text-muted-foreground">
                        主标题
                      </div>
                      <p className="mt-1 text-[12px] font-medium leading-5">
                        {platform.title}
                      </p>
                    </div>
                    <div>
                      <div className="text-[9px] font-semibold text-muted-foreground">
                        封面小标题
                      </div>
                      <p className="mt-1 rounded-lg bg-lime/20 px-2.5 py-2 text-[11px] font-semibold">
                        {platform.smallTitle}
                      </p>
                    </div>
                    <div>
                      <div className="text-[9px] font-semibold text-muted-foreground">
                        发布正文
                      </div>
                      <p className="mt-1 text-[10px] leading-5 text-muted-foreground">
                        {platform.body}
                      </p>
                    </div>
                    <div>
                      <div className="text-[9px] font-semibold text-muted-foreground">
                        话题
                      </div>
                      <p className="mt-1 text-[10px] leading-5 text-coral">
                        {platform.tags}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-[10px]">
                    <span>
                      <Clock3 className="mr-1 inline size-3" />
                      {platform.time}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        flash(
                          `${platform.name}发布编辑器尚未接通，本次没有修改文案`,
                        )
                      }
                    >
                      <PencilLine /> 编辑
                    </Button>
                  </div>
                </section>
              ))}
            </div>
          </article>
          <article className="surface-card p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold">发布任务状态</h2>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  成片通过后，三平台任务分别排队、执行、重试和回写作品 ID
                </p>
              </div>
              <Badge className="bg-coral text-white">0 可执行</Badge>
            </div>
            <div className="mt-5 grid gap-2 sm:grid-cols-5">
              {[
                '成片已审',
                '文案已审',
                '账号已授权',
                '已到发布时间',
                '发布成功/失败',
              ].map((item, index) => (
                <div
                  key={item}
                  className="rounded-xl border border-border p-3 text-center"
                >
                  <div
                    className={`mx-auto grid size-6 place-items-center rounded-full text-[9px] ${index === 0 ? 'bg-amber/20 text-amber-ink' : 'bg-muted text-muted-foreground'}`}
                  >
                    {index + 1}
                  </div>
                  <div className="mt-2 text-[10px] font-medium">{item}</div>
                </div>
              ))}
            </div>
          </article>
        </div>
        <aside className="space-y-4">
          <article className="surface-card p-5">
            <h2 className="text-sm font-semibold">本次发布审批</h2>
            <div className="mt-4 space-y-3">
              {approvals.map((row) => (
                <div
                  key={row[0]}
                  className="flex items-center gap-3 text-[11px]"
                >
                  <span className="grid size-4 place-items-center rounded-full bg-muted text-muted-foreground">
                    <Clock3 className="size-3" />
                  </span>
                  <span className="flex-1">{row[0]}</span>
                  <span className="text-[9px] text-muted-foreground">
                    {row[1]}
                  </span>
                </div>
              ))}
            </div>
            <Button className="mt-5 w-full" disabled>
              审核并确认排期
            </Button>
          </article>
          <EmptyConnection
            onAction={() => go('connections')}
            title="三平台账号均未授权"
            description="当前只展示发布规范与示例，尚未生成发布包。真实连接需逐个平台核验权限与执行能力。"
            action="查看连接方案"
          />
          <article className="surface-card p-5">
            <h2 className="text-sm font-semibold">计划接入的发布后回流</h2>
            <div className="mt-4 space-y-3">
              {[
                '作品 ID 与真实发布时间',
                '2h / 24h / 72h / 7d 数据快照',
                '完整评论线程与回复状态',
                '咨询、加微、有效线索与成交',
                '本条结论与下一轮唯一变量',
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-start gap-2 text-[10px] leading-5"
                >
                  <Clock3 className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                  {item}
                </div>
              ))}
            </div>
          </article>
        </aside>
      </section>
    </>
  );
}

function AnalyticsView({ flash }: { flash: (message: string) => void }) {
  const ledgers = [
    {
      title: '790 万播放不等于替企业成交',
      platform: '抖音',
      state: '待发布',
      version: '口播 v4 · 成片 —',
      snapshots: '2h / 24h / 72h / 7d 均待发布',
      views: '—',
      engagement: '—',
      comments: '—',
      visits: '—',
      inquiries: '—',
      leads: '—',
      conclusion: '证据不足',
    },
    {
      title: 'AI 一分钟写完 20 条，为什么老板还会改到凌晨',
      platform: '未排期',
      state: '脚本待补证据',
      version: '口播 v3 · 成片 —',
      snapshots: '尚未建立发布任务',
      views: '—',
      engagement: '—',
      comments: '—',
      visits: '—',
      inquiries: '—',
      leads: '—',
      conclusion: '证据不足',
    },
  ];
  const metrics = [
    ['已发布作品', '0', '当前样板尚未真实发布'],
    ['待处理自有评论', '—', '账号未授权，尚未读取'],
    ['高意向互动', '—', '需评论与私信真实信号'],
    ['有效线索', '—', '需资格确认与业务回填'],
  ];
  return (
    <>
      <ViewHeader
        view="analytics"
        actions={
          <Button
            variant="outline"
            className="bg-white"
            onClick={() =>
              flash('后台数据导入尚未接通；没有读取数据，也没有建立待办')
            }
          >
            <Upload /> 导入后台数据
          </Button>
        }
      />
      <section className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(([label, value, note]) => (
          <article key={label} className="surface-card p-4">
            <div className="text-2xl font-semibold tracking-[-0.04em]">
              {value}
            </div>
            <div className="mt-4 text-xs font-semibold">{label}</div>
            <p className="mt-1 text-[10px] leading-4 text-muted-foreground">
              {note}
            </p>
          </article>
        ))}
      </section>

      <section className="surface-card mt-4 overflow-hidden p-0">
        <div className="flex flex-col gap-3 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Table2 className="size-4 text-coral" />
              <h2 className="text-sm font-semibold">单条视频复盘台账</h2>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              每条作品绑定选题、脚本、成片、平台作品
              ID、数据快照、评论线程和获客结果。
            </p>
          </div>
          <StatusBadge tone="warn">真实后台未连接</StatusBadge>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1220px] text-left text-[10px]">
            <thead className="bg-muted/55 text-muted-foreground">
              <tr>
                {[
                  '视频 / 平台',
                  '内容版本',
                  '复盘窗口',
                  '播放',
                  '赞藏',
                  '评论覆盖',
                  '主页访问',
                  '咨询',
                  '有效线索',
                  '当前结论',
                ].map((label) => (
                  <th key={label} className="p-3 font-medium">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ledgers.map((item) => (
                <tr
                  key={item.title}
                  className="border-t border-border align-top"
                >
                  <td className="p-3">
                    <div className="max-w-[230px] font-semibold leading-5">
                      {item.title}
                    </div>
                    <div className="mt-1 flex gap-2">
                      <StatusBadge tone="info">{item.platform}</StatusBadge>
                      <StatusBadge tone="warn">{item.state}</StatusBadge>
                    </div>
                  </td>
                  <td className="p-3 text-muted-foreground">{item.version}</td>
                  <td className="max-w-[180px] p-3 text-muted-foreground">
                    {item.snapshots}
                  </td>
                  <td className="p-3">{item.views}</td>
                  <td className="p-3">{item.engagement}</td>
                  <td className="p-3">{item.comments}</td>
                  <td className="p-3">{item.visits}</td>
                  <td className="p-3">{item.inquiries}</td>
                  <td className="p-3">{item.leads}</td>
                  <td className="p-3">
                    <StatusBadge tone="warn">{item.conclusion}</StatusBadge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-border bg-muted/25 px-5 py-3 text-[10px] leading-5 text-muted-foreground">
          数据窗口固定为
          2h、24h、72h、7d；没有值就保留“—”，不能把播放、涨粉或评论量替代咨询、有效线索和成交。
        </div>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_420px]">
        <article className="surface-card p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">自有账号评论与线索队列</h2>
              <p className="mt-1 text-[11px] text-muted-foreground">
                发布后的评论、私信与咨询在这里处理；对标账号评论不会混入。
              </p>
            </div>
            <StatusBadge tone="neutral">尚未读取，不是 0 条</StatusBadge>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {[
              ['普通问题', '生成回复草稿；低风险规则成熟后可进入白名单'],
              ['需求与异议', '归入客户问题库，并回写下一轮选题'],
              ['询价与合作', '标为高意向，必须人工确认回复与承接'],
              ['投诉、隐私与法律', '禁止自动发送，始终人工审批'],
            ].map(([title, desc], index) => (
              <div key={title} className="rounded-xl border border-border p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold">{title}</h3>
                  <StatusBadge
                    tone={index < 2 ? 'info' : index === 2 ? 'warn' : 'danger'}
                  >
                    L{index + 1}
                  </StatusBadge>
                </div>
                <p className="mt-2 text-[10px] leading-5 text-muted-foreground">
                  {desc}
                </p>
              </div>
            ))}
          </div>
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => flash('当前没有已授权账号评论可处理')}
          >
            <MessageSquareText /> 打开评论工作区
          </Button>
        </article>
        <aside className="space-y-4">
          <article className="surface-card p-5">
            <h2 className="text-sm font-semibold">两种评论，两种用途</h2>
            <div className="mt-4 space-y-3">
              <div className="rounded-xl border border-border p-4">
                <div className="text-xs font-semibold">对标账号评论</div>
                <p className="mt-2 text-[10px] leading-5 text-muted-foreground">
                  只服务内容研究、客户问题发现和选题，不允许替对方回复，也不记为我的线索。
                </p>
              </div>
              <div className="rounded-xl border border-lime/40 bg-lime/10 p-4">
                <div className="text-xs font-semibold">自有账号评论</div>
                <p className="mt-2 text-[10px] leading-5 text-muted-foreground">
                  进入回复、意向识别、线索承接与复盘，所有实际发送都保留状态和记录。
                </p>
              </div>
            </div>
          </article>
          <article className="surface-card p-5">
            <h2 className="text-sm font-semibold">复盘只允许五种结论</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {['保留', '放大', '单变量重测', '停止', '证据不足'].map(
                (item, index) => (
                  <StatusBadge key={item} tone={index === 4 ? 'warn' : 'info'}>
                    {item}
                  </StatusBadge>
                ),
              )}
            </div>
          </article>
        </aside>
      </section>
    </>
  );
}

function ConnectionsView({
  flash,
  viewer,
}: {
  flash: (message: string) => void;
  viewer: { displayName: string; email: string };
}) {
  const connections = [
    {
      name: '任意博主研究适配器',
      role: '仅内部任意博主研究',
      ability:
        'TikHub 或独立连接器抓取作品、一级评论、可见回复，并回写分页覆盖率',
      status: '任务网关已接 / 私有配置缺失',
      tone: 'warn' as const,
      icon: Search,
      action: '查看采集通道要求',
    },
    {
      name: '国内发布适配器',
      role: '内部首版候选 · social-auto-upload',
      ability:
        '参考其浏览器上传与定时发布方法；客户版拟由云端独立会话执行，尚未接入，也不是官方 OAuth',
      status: '仅完成开源评估',
      tone: 'info' as const,
      icon: Upload,
      action: '建立隔离验证环境',
    },
    {
      name: '视频制作适配器',
      role: 'MoneyPrinterTurbo + 自研口播剪辑',
      ability:
        '脚本、字幕、配音、素材、Seedance 生成与批量成片；口播原片剪辑仍需自研补齐',
      status: '仅完成开源评估',
      tone: 'info' as const,
      icon: Film,
      action: '拆分最小制作任务',
    },
    {
      name: '本机任务 Worker',
      role: '本机采集任务执行器；生成与发布未接入',
      ability:
        'lease 心跳、过期恢复、旧 Worker 写入隔离、失败尝试追加留痕、累计请求预算与零媒体默认',
      status: '恢复保护已完成 · 按需启动',
      tone: 'safe' as const,
      icon: Database,
      action: '查看运行状态',
    },
    {
      name: 'CRM / 线索回填',
      role: '咨询到成交',
      ability: '主页访问、咨询、加微、有效线索、成交',
      status: '口径待定义',
      tone: 'neutral' as const,
      icon: Users,
      action: '定义线索口径',
    },
  ];
  return (
    <>
      <ViewHeader view="connections" />
      <PlatformAccounts viewer={viewer} />
      <details className="mt-5">
        <summary className="cursor-pointer text-sm font-medium">
          运营者高级设置 · 可选外部服务
        </summary>
        <div className="mt-3">
          <CloudCapabilities mode="configure" />
        </div>
      </details>
      <section className="mt-4 grid gap-3 lg:grid-cols-2">
        {connections.map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.name} className="surface-card p-5">
              <div className="flex items-start gap-4">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted text-ink">
                  <Icon className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-semibold">{item.name}</h2>
                    <StatusBadge tone={item.tone}>{item.status}</StatusBadge>
                  </div>
                  <p className="mt-1 text-[10px] font-medium text-coral">
                    {item.role}
                  </p>
                  <p className="mt-3 text-[10px] leading-5 text-muted-foreground">
                    {item.ability}
                  </p>
                  <Button
                    className="mt-4"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      flash(`${item.name}尚未接通，${item.action}还不能执行`)
                    }
                  >
                    {item.action} <ArrowRight />
                  </Button>
                </div>
              </div>
            </article>
          );
        })}
      </section>
      <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_430px]">
        <article className="surface-card p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold">平台 × 能力矩阵</h2>
              <p className="mt-1 text-[10px] text-muted-foreground">
                不把“多平台”写成所有平台都能全量评论
              </p>
            </div>
            <StatusBadge tone="info">真实边界</StatusBadge>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-[10px]">
              <thead className="bg-muted/55 text-muted-foreground">
                <tr>
                  <th className="p-3">平台</th>
                  <th className="p-3">对标研究</th>
                  <th className="p-3">自有评论 / 数据</th>
                  <th className="p-3">内部发布路径</th>
                  <th className="p-3">当前状态</th>
                </tr>
              </thead>
              <tbody>
                {[
                  [
                    '抖音',
                    '本机任务网关已接；云端账号采集待接入',
                    '授权能力待申请',
                    '浏览器适配器候选',
                    'P0 · 先做研究',
                  ],
                  [
                    '小红书',
                    '连接器待评估',
                    '账号后台待接',
                    '浏览器适配器候选',
                    'P1',
                  ],
                  [
                    '视频号',
                    '数据接口已有候选，适配与实测待完成',
                    '账号后台待接',
                    '浏览器适配器候选',
                    'P1',
                  ],
                ].map((row) => (
                  <tr key={row[0]} className="border-t border-border">
                    <td className="p-3 font-medium">{row[0]}</td>
                    {row.slice(1).map((cell) => (
                      <td key={cell} className="p-3 text-muted-foreground">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
        <article className="surface-card p-5">
          <div className="flex items-center gap-2">
            <HardDrive className="size-4 text-coral" />
            <h2 className="text-sm font-semibold">数据与磁盘策略</h2>
          </div>
          <div className="mt-4 space-y-3">
            {[
              ['默认不保存视频 / 音频', '开启'],
              ['ASR 临时音频任务后删除', '开启'],
              ['评论与证据结构化保存', '开启'],
              ['失败尝试追加留痕 / 旧 Worker 隔离', '开启'],
              ['原始 API 敏感字段落盘', '关闭'],
              ['按批次导出后清理', '待实现'],
            ].map(([label, status]) => (
              <div
                key={label}
                className="flex items-center justify-between text-[10px]"
              >
                <span>{label}</span>
                <StatusBadge
                  tone={
                    status === '开启'
                      ? 'safe'
                      : status === '关闭'
                        ? 'safe'
                        : 'warn'
                  }
                >
                  {status}
                </StatusBadge>
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                flash(
                  '这里的素材导出尚未接通；真实任务的证据包需从采集服务导出',
                )
              }
            >
              <Download /> 导出
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => flash('这里尚未读取真实采集批次，没有执行删除')}
            >
              <Trash2 /> 清理批次
            </Button>
          </div>
        </article>
      </section>
      <section className="surface-card mt-4 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold">开源组件评估结论</h2>
            <p className="mt-1 text-[10px] leading-5 text-muted-foreground">
              没有一个项目覆盖整条链路。初代采用“自研核心 +
              隔离适配器”，所有候选都先验证许可证、登录风控和实际数据覆盖。
            </p>
          </div>
          <StatusBadge tone="info">参考，不等于已安装</StatusBadge>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            [
              'social-auto-upload',
              '国内三平台发布候选',
              'MIT · 浏览器登录态，不是官方 OAuth',
              'https://github.com/dreammis/social-auto-upload',
            ],
            [
              'MoneyPrinterTurbo',
              '视频制作与 Seedance 候选',
              'MIT · 口播原片剪辑仍需补齐',
              'https://github.com/harry0703/MoneyPrinterTurbo',
            ],
            [
              'TrendRadar',
              '热点与选题来源参考',
              'GPL-3.0 · 只到热榜，不抓账号评论',
              'https://github.com/sansan0/TrendRadar',
            ],
            [
              'MediaCrawler',
              '采集接口需求参考',
              '非商业学习许可 · 不能作为商业产品代码底座',
              'https://github.com/NanmiCoder/MediaCrawler',
            ],
            [
              'yyl-benchmark-breakdown',
              '对标拆解流程高相似候选',
              '仓库文字声明 MIT · 未确认与目标视频为同一项目，且默认下载/全视频分镜不直接采用',
              'https://github.com/ttfake92-lab/skills/tree/main/skills/yyl-benchmark-breakdown',
            ],
          ].map(([name, role, boundary, href]) => (
            <a
              key={name}
              href={href}
              target="_blank"
              rel="noreferrer"
              className="group rounded-xl border border-border p-4 transition hover:-translate-y-0.5 hover:border-ink/25 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold">{name}</h3>
                <ExternalLink className="size-3.5 text-muted-foreground transition group-hover:text-coral" />
              </div>
              <p className="mt-2 text-[10px] font-medium text-coral">{role}</p>
              <p className="mt-2 text-[10px] leading-5 text-muted-foreground">
                {boundary}
              </p>
            </a>
          ))}
        </div>
      </section>
    </>
  );
}

function RulesView({ flash }: { flash: (message: string) => void }) {
  const layers = [
    {
      title: '账号事实',
      desc: '身份、经历、产品、客户与可公开边界',
      icon: UserCheck,
    },
    {
      title: '选题来源规则',
      desc: '来源、日期、事实、判断、为什么拍与待补证据',
      icon: Radio,
    },
    {
      title: '口播写作标准',
      desc: '完整因果链、可开口、少套话、唯一行动',
      icon: BookOpenText,
    },
    {
      title: '拆解模式库',
      desc: '流量机制、获客机制、评论证据与不可复制项',
      icon: Search,
    },
    {
      title: '剪辑审美样例',
      desc: '通过和拒绝的字幕、节奏、动画、包装与返工原因',
      icon: Film,
    },
    {
      title: '回复知识库',
      desc: '常见问题、异议、风险等级、承接边界与批准话术',
      icon: MessageSquareText,
    },
    {
      title: '外部资料学习台账',
      desc: '来源、读取覆盖、未读范围、采用状态和规则变化',
      icon: Database,
    },
  ];
  return (
    <>
      <ViewHeader
        view="rules"
        actions={
          <Button
            onClick={() => flash('规则编辑与保存尚未接通，本次没有创建草稿')}
          >
            <Plus /> 补充规则或样例
          </Button>
        }
      />
      <section className="mt-7 grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_430px]">
        <div className="surface-card p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold">持续生长的内部记忆库</h2>
              <p className="mt-1 text-[10px] text-muted-foreground">
                以后你继续补资料时，先进入待核验层，通过后才影响新内容
              </p>
            </div>
            <Layers3 className="size-5 text-coral" />
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {layers.map((layer, index) => {
              const Icon = layer.icon;
              return (
                <article
                  key={layer.title}
                  className="relative rounded-xl border border-border p-4"
                >
                  <div className="flex gap-3">
                    <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-ink">
                      <Icon className="size-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] text-muted-foreground">
                          0{index + 1}
                        </span>
                        <h3 className="text-xs font-semibold">{layer.title}</h3>
                      </div>
                      <p className="mt-1 text-[10px] leading-4 text-muted-foreground">
                        {layer.desc}
                      </p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
          <div className="mt-5 rounded-xl border border-ink/10 bg-ink p-4 text-white">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-[10px] font-semibold text-lime">
                  飞书交付资料 · 首轮学习
                </div>
                <h3 className="mt-1 text-sm font-semibold">
                  25 个直接条目已核查，二级附件按权限和视觉覆盖分别记账
                </h3>
              </div>
              <StatusBadge tone="warn">部分附件待补读</StatusBadge>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {(Object.keys(genreDetails) as ContentGenre[]).map((genre) => (
                <div
                  key={genre}
                  className="rounded-lg border border-white/10 bg-white/[0.055] p-3"
                >
                  <div className="text-[11px] font-semibold text-lime">
                    {genreDetails[genre].label}
                  </div>
                  <p className="mt-1 text-[9px] leading-4 text-white/55">
                    {genreDetails[genre].promise}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[9px] leading-4 text-white/45">
              这四类是正文逻辑；口播、Vlog、第一视角、OS、助理视角、录屏和混剪属于拍摄或呈现形式。
            </p>
          </div>
        </div>
        <div className="space-y-4">
          <article className="surface-card p-5">
            <h2 className="text-sm font-semibold">不可违背的内容规则</h2>
            <div className="mt-4 space-y-3">
              {[
                '内容主类型与拍摄形式独立',
                '固定口播不拆分镜',
                '原文与改写稿永久分开',
                '外链未读不冒充已研究',
                'AI 洞察必须回链证据',
                '没有真实案例就标待补',
                '一条内容只给一个主行动',
                '播放、涨粉、咨询、成交分开',
              ].map((rule) => (
                <div key={rule} className="flex items-center gap-2 text-[10px]">
                  <Lock className="size-3.5 text-ink" />
                  {rule}
                </div>
              ))}
            </div>
          </article>
          <article className="surface-card p-5">
            <h2 className="text-sm font-semibold">资料事实状态</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {[
                'observed 观察事实',
                'user_stated 用户确认',
                'derived 派生结论',
                'hypothesis 假设',
                'missing 缺失',
              ].map((item, index) => (
                <StatusBadge
                  key={item}
                  tone={index < 2 ? 'safe' : index === 4 ? 'danger' : 'neutral'}
                >
                  {item}
                </StatusBadge>
              ))}
            </div>
            <p className="mt-3 text-[10px] leading-5 text-muted-foreground">
              生成、审批和发布都读取同一事实层，避免不同页面各自“编一个版本”。
            </p>
          </article>
        </div>
      </section>
    </>
  );
}
