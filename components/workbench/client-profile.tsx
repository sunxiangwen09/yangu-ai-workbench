'use client';

import { useState } from 'react';
import { useUnsavedChanges } from '@/lib/use-unsaved-changes';
import { buildStrategyBrief } from '@/lib/strategy-brief';
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Check,
  CircleAlert,
  Copy,
  Lock,
  Plus,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  UserCheck,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  BUSINESS_GOAL_OPTIONS,
  CASE_STATUS_OPTIONS,
  INDUSTRY_OPTIONS,
  PRESENTATION_MODE_OPTIONS,
  RESEARCH_SCOPE_OPTIONS,
  USE_SCOPE_OPTIONS,
  calculateClientProfileReadiness,
  createEmptyClientProfileData,
  type BusinessGoal,
  type CaseStatus,
  type ClientProfileData,
  type ClientProfileRecord,
  type ClientProfileStatus,
  type PresentationMode,
  type ProfileSectionId,
  type ResearchScope,
  type UseScope,
} from '@/lib/client-profile';

export type PersistClientProfile = (
  data: ClientProfileData,
  options: {
    id?: string;
    status: ClientProfileStatus;
    expectedVersion?: number;
  },
) => Promise<ClientProfileRecord>;

const onboardingSteps = [
  {
    title: '先认识你和你的行业',
    prompt:
      '你希望客户怎样称呼你？你在什么行业、以什么角色提供服务？我先建立最基本的身份坐标。',
    hint: '这一组信息会决定选题使用什么行业场景和专业口径。',
  },
  {
    title: '这次先卖清楚一件事',
    prompt:
      '你现在最想推广的一个产品或服务是什么？它让客户发生什么变化，又有哪些结果不能承诺？',
    hint: '首轮只选择一个主业务，其他产品稍后再补，避免内容方向互相打架。',
  },
  {
    title: '还原客户真正卡住的进展',
    prompt:
      '请说一个你最想服务的客户。他当时在做什么、具体卡在哪一步、最后想变成什么样？',
    hint: '不要只写“老板、宝妈、创业者”；写出他正在经历的具体情境。',
  },
  {
    title: '找到只有你能讲的材料',
    prompt:
      '你有哪些真实经历、方法、过程或案例，能让这套内容不是换个名字谁都能说？没有公开案例也可以如实选择。',
    hint: 'AI 不会替你编案例。没有证据时，我们会改做过程、观点或方法型内容。',
  },
  {
    title: '确定内容任务和你的表达方式',
    prompt:
      '第一阶段只选一个主目标：做流量、做获客还是做变现？观众看完只做什么动作？你更愿意怎么出镜？',
    hint: '内容类型和拍摄形式会继续分开；固定口播不会被强制拆分镜。',
  },
  {
    title: '确认公开资料研究和使用边界',
    prompt:
      '你是否允许 AI 根据你确认的官网或官方账号补充研究？无论是否允许，都请告诉我哪些话不能说、哪些资料不能公开。',
    hint: '公开网页只会先进入“待你确认”，不会自动变成客户事实或直接写进脚本。',
  },
] as const;

function mergeProfile(
  current: ClientProfileData,
  patch: Partial<ClientProfileData>,
): ClientProfileData {
  return { ...current, ...patch };
}

function requiredMessage(step: number, data: ClientProfileData): string | null {
  if (step === 0) {
    if (!data.brandName.trim()) return '请填写对外使用的 IP 或品牌名称';
    if (!data.role.trim()) return '请填写你在业务中的角色';
    if (!data.industry.trim()) return '请选择或填写主行业';
    if (!data.experienceStartedYear.trim()) return '请填写从业起始年份或年限';
  }
  if (step === 1) {
    if (!data.primaryOffer.trim()) return '请先选择一个当前主推产品或服务';
    if (!data.offerOutcome.trim()) return '请写清客户购买后会发生什么具体变化';
    if (!data.promiseBoundary.trim())
      return '请说明不能承诺的结果，暂无可填写“暂无额外承诺”';
  }
  if (step === 2) {
    if (!data.targetCustomer.trim()) return '请写清第一阶段最优先服务的客户';
    if (!data.customerSituation.trim())
      return '请补充客户当时正在经历的具体情境';
    if (!data.customerBlocker.trim()) return '请写清客户卡在哪一步';
    if (!data.desiredChange.trim()) return '请写清客户最终希望发生的变化';
  }
  if (step === 3) {
    if (!data.uniqueMaterial.trim())
      return '请至少提供一项真实经历、方法、过程或案例';
  }
  if (step === 4) {
    if (!data.businessGoal) return '请只选择一个当前内容主目标';
    if (!data.primaryAction.trim()) return '请写清观众看完只做的一个动作';
    if (!data.tone.trim()) return '请用自己的话描述希望的表达语气';
    if (!data.presentationModes.length) return '请至少选择一种可接受的拍摄形式';
  }
  if (step === 5) {
    if (!data.dislikedPhrases.trim())
      return '请写一项禁用表达；确实没有可填写“暂无”';
    if (
      data.researchConsent &&
      !data.officialWebsite.trim() &&
      !data.officialAccounts.trim()
    ) {
      return '允许联网研究时，请至少提供一个确认过的官网或官方账号';
    }
    if (data.researchConsent && !data.researchScopes.length) {
      return '请至少选择一个联网研究范围';
    }
    if (!data.privacyAcknowledged) return '请确认资料使用与人工审核说明';
  }
  return null;
}

function firstIncompleteStep(data: ClientProfileData): number {
  for (let step = 0; step < onboardingSteps.length; step += 1) {
    if (requiredMessage(step, data)) return step;
  }
  return onboardingSteps.length - 1;
}

function TextField({
  label,
  description,
  value,
  onChange,
  placeholder,
  multiline = false,
  error = false,
}: {
  label: string;
  description?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  error?: boolean;
}) {
  return (
    <Field data-invalid={error || undefined}>
      <FieldLabel>{label}</FieldLabel>
      {description && <FieldDescription>{description}</FieldDescription>}
      {multiline ? (
        <Textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          aria-invalid={error || undefined}
          className="min-h-24 bg-white"
        />
      ) : (
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          aria-invalid={error || undefined}
          className="h-10 bg-white"
        />
      )}
    </Field>
  );
}

function ChoiceGrid<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T | '';
  options: Record<T, string>;
  onChange: (value: T) => void;
}) {
  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <div className="grid gap-2 sm:grid-cols-3">
        {(Object.keys(options) as T[]).map((key) => (
          <button
            key={key}
            type="button"
            aria-pressed={value === key}
            onClick={() => onChange(key)}
            className={`rounded-xl border px-3 py-3 text-left text-xs font-medium transition ${
              value === key
                ? 'border-ink bg-ink text-white shadow-sm'
                : 'border-border bg-white text-foreground hover:border-ink/30'
            }`}
          >
            {options[key]}
          </button>
        ))}
      </div>
    </Field>
  );
}

function MultiChoiceGrid<T extends string>({
  label,
  values,
  options,
  onChange,
}: {
  label: string;
  values: T[];
  options: Record<T, string>;
  onChange: (values: T[]) => void;
}) {
  const toggle = (key: T) => {
    onChange(
      values.includes(key)
        ? values.filter((item) => item !== key)
        : [...values, key],
    );
  };
  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <div className="grid gap-2 sm:grid-cols-2">
        {(Object.keys(options) as T[]).map((key) => (
          <button
            key={key}
            type="button"
            aria-pressed={values.includes(key)}
            onClick={() => toggle(key)}
            className={`flex items-center gap-2 rounded-xl border px-3 py-3 text-left text-xs font-medium transition ${
              values.includes(key)
                ? 'border-lime bg-lime/20 text-ink'
                : 'border-border bg-white hover:border-ink/30'
            }`}
          >
            <span
              className={`grid size-4 place-items-center rounded-full border ${
                values.includes(key)
                  ? 'border-ink bg-ink text-white'
                  : 'border-border'
              }`}
            >
              {values.includes(key) && <Check className="size-3" />}
            </span>
            {options[key]}
          </button>
        ))}
      </div>
    </Field>
  );
}

function OnboardingFields({
  step,
  data,
  update,
}: {
  step: number;
  data: ClientProfileData;
  update: (patch: Partial<ClientProfileData>) => void;
}) {
  if (step === 0) {
    return (
      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="IP / 品牌对外名称 *"
            value={data.brandName}
            onChange={(brandName) =>
              update({
                brandName,
                workspaceName: data.workspaceName || brandName,
              })
            }
            placeholder="例如：老周财税 / 某某门店"
          />
          <TextField
            label="你在业务中的角色 *"
            value={data.role}
            onChange={(role) => update({ role })}
            placeholder="例如：创始人、技术负责人、主理人"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel>主行业 *</FieldLabel>
            <Select
              value={data.industry || null}
              onValueChange={(industry) => update({ industry: industry ?? '' })}
            >
              <SelectTrigger className="h-10 w-full bg-white">
                <SelectValue placeholder="选择最接近的行业" />
              </SelectTrigger>
              <SelectContent align="start">
                {INDUSTRY_OPTIONS.map((industry) => (
                  <SelectItem key={industry} value={industry}>
                    {industry}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <TextField
            label="细分行业"
            value={data.subIndustry}
            onChange={(subIndustry) => update({ subIndustry })}
            placeholder="例如：小微企业财税合规"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="从业起始年份或年限 *"
            value={data.experienceStartedYear}
            onChange={(experienceStartedYear) =>
              update({ experienceStartedYear })
            }
            placeholder="例如：2018 年开始 / 8 年"
          />
          <TextField
            label="主要服务区域"
            value={data.serviceRegion}
            onChange={(serviceRegion) => update({ serviceRegion })}
            placeholder="例如：全国 / 成都及周边"
          />
        </div>
      </FieldGroup>
    );
  }

  if (step === 1) {
    return (
      <FieldGroup>
        <TextField
          label="当前最想推广的一个产品或服务 *"
          value={data.primaryOffer}
          onChange={(primaryOffer) => update({ primaryOffer })}
          placeholder="只选一个，例如：企业年度财税顾问"
          multiline
        />
        <TextField
          label="客户购买后会发生什么具体变化 *"
          value={data.offerOutcome}
          onChange={(offerOutcome) => update({ offerOutcome })}
          placeholder="不要写“提升价值”，写清解决了什么、推进了哪一步"
          multiline
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="交付方式与周期"
            value={data.deliveryMode}
            onChange={(deliveryMode) => update({ deliveryMode })}
            placeholder="例如：线上陪跑 30 天"
          />
          <TextField
            label="价格带或成交方式"
            value={data.priceRange}
            onChange={(priceRange) => update({ priceRange })}
            placeholder="可填写“不公开，先咨询”"
          />
        </div>
        <TextField
          label="不能承诺的结果 *"
          value={data.promiseBoundary}
          onChange={(promiseBoundary) => update({ promiseBoundary })}
          placeholder="例如：不保证具体播放量、咨询量或成交结果"
          multiline
        />
      </FieldGroup>
    );
  }

  if (step === 2) {
    return (
      <FieldGroup>
        <TextField
          label="第一阶段最优先服务的客户 *"
          value={data.targetCustomer}
          onChange={(targetCustomer) => update({ targetCustomer })}
          placeholder="行业、角色、规模、区域、当前阶段"
          multiline
        />
        <TextField
          label="他当时正在经历什么具体情境 *"
          value={data.customerSituation}
          onChange={(customerSituation) => update({ customerSituation })}
          placeholder="例如：老板每周拍三条视频，但没有一条带来有效咨询"
          multiline
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="当前卡点 *"
            value={data.customerBlocker}
            onChange={(customerBlocker) => update({ customerBlocker })}
            placeholder="具体卡在哪一步"
            multiline
          />
          <TextField
            label="希望发生的变化 *"
            value={data.desiredChange}
            onChange={(desiredChange) => update({ desiredChange })}
            placeholder="他会用什么结果判断有用"
            multiline
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="现在用什么替代办法"
            value={data.currentAlternative}
            onChange={(currentAlternative) => update({ currentAlternative })}
            placeholder="例如：跟热点、外包代运营"
          />
          <TextField
            label="选择新方案的标准"
            value={data.selectionCriteria}
            onChange={(selectionCriteria) => update({ selectionCriteria })}
            placeholder="例如：能执行、能追踪、风险可控"
          />
        </div>
      </FieldGroup>
    );
  }

  if (step === 3) {
    return (
      <FieldGroup>
        <TextField
          label="至少一项只有你能讲的真实材料 *"
          description="可以是一次经历、一套做法、真实工作过程、失败教训或已授权案例。"
          value={data.uniqueMaterial}
          onChange={(uniqueMaterial) => update({ uniqueMaterial })}
          placeholder="请写发生了什么、你做了什么、你现在怎样判断"
          multiline
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel>案例和证据现状</FieldLabel>
            <Select
              value={data.caseStatus}
              onValueChange={(caseStatus) =>
                update({ caseStatus: caseStatus as CaseStatus })
              }
            >
              <SelectTrigger className="h-10 w-full bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="start">
                {(Object.keys(CASE_STATUS_OPTIONS) as CaseStatus[]).map(
                  (key) => (
                    <SelectItem key={key} value={key}>
                      {CASE_STATUS_OPTIONS[key]}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel>这些材料目前可以怎样使用</FieldLabel>
            <Select
              value={data.evidenceUseScope}
              onValueChange={(evidenceUseScope) =>
                update({ evidenceUseScope: evidenceUseScope as UseScope })
              }
            >
              <SelectTrigger className="h-10 w-full bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="start">
                {(Object.keys(USE_SCOPE_OPTIONS) as UseScope[]).map((key) => (
                  <SelectItem key={key} value={key}>
                    {USE_SCOPE_OPTIONS[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <TextField
          label="证据与授权说明"
          value={data.evidenceSummary}
          onChange={(evidenceSummary) => update({ evidenceSummary })}
          placeholder="来源、统计周期、截图、客户授权或仍缺什么"
          multiline
        />
      </FieldGroup>
    );
  }

  if (step === 4) {
    return (
      <FieldGroup>
        <ChoiceGrid<BusinessGoal>
          label="当前唯一主目标 *"
          value={data.businessGoal}
          options={BUSINESS_GOAL_OPTIONS}
          onChange={(businessGoal) => update({ businessGoal })}
        />
        <TextField
          label="观众看完只做的一个动作 *"
          value={data.primaryAction}
          onChange={(primaryAction) => update({ primaryAction })}
          placeholder="例如：留言描述当前卡点 / 预约一次诊断"
        />
        <TextField
          label="你希望内容听起来像什么 *"
          value={data.tone}
          onChange={(tone) => update({ tone })}
          placeholder="用自己的话描述，不只写“专业、真诚、有温度”"
          multiline
        />
        <MultiChoiceGrid<PresentationMode>
          label="可以接受的拍摄形式 *"
          values={data.presentationModes}
          options={PRESENTATION_MODE_OPTIONS}
          onChange={(presentationModes) => update({ presentationModes })}
        />
        <TextField
          label="一段你平时会说的话"
          value={data.voiceSample}
          onChange={(voiceSample) => update({ voiceSample })}
          placeholder="粘贴 3—8 句话，之后用于校准语气，不改变事实"
          multiline
        />
      </FieldGroup>
    );
  }

  return (
    <FieldGroup>
      <TextField
        label="绝对不要出现的表达或内容 *"
        value={data.dislikedPhrases}
        onChange={(dislikedPhrases) => update({ dislikedPhrases })}
        placeholder="例如：不要高位训人；不公开客户姓名；暂无也请填写“暂无”"
        multiline
      />
      <div className="flex items-start gap-3 rounded-xl border border-border bg-white p-4">
        <Checkbox
          aria-label="允许 AI 根据已确认的公开链接建立研究任务"
          checked={data.researchConsent}
          onCheckedChange={(researchConsent) =>
            update({
              researchConsent: Boolean(researchConsent),
              researchStatus: researchConsent
                ? data.researchStatus
                : 'not_requested',
            })
          }
          className="mt-0.5"
        />
        <span>
          <span className="block text-xs font-semibold">
            允许 AI 根据我确认的公开链接建立研究任务
          </span>
          <span className="mt-1 block text-[10px] leading-5 text-muted-foreground">
            只研究你选择的范围；私人联系方式、登录后页面和非公开资料默认排除。
          </span>
        </span>
      </div>
      {data.researchConsent && (
        <div className="space-y-4 rounded-xl border border-lime/50 bg-lime/10 p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="确认过的官方网站"
              value={data.officialWebsite}
              onChange={(officialWebsite) => update({ officialWebsite })}
              placeholder="https://..."
            />
            <TextField
              label="官方账号或公开资料链接"
              value={data.officialAccounts}
              onChange={(officialAccounts) => update({ officialAccounts })}
              placeholder="公众号、抖音、视频号、小红书等"
              multiline
            />
          </div>
          <MultiChoiceGrid<ResearchScope>
            label="允许研究的范围"
            values={data.researchScopes}
            options={RESEARCH_SCOPE_OPTIONS}
            onChange={(researchScopes) => update({ researchScopes })}
          />
        </div>
      )}
      <div className="flex items-start gap-3 rounded-xl border border-ink/10 bg-ink/[0.035] p-4">
        <Checkbox
          aria-label="确认资料使用与人工审核规则"
          checked={data.privacyAcknowledged}
          onCheckedChange={(privacyAcknowledged) =>
            update({ privacyAcknowledged: Boolean(privacyAcknowledged) })
          }
          className="mt-0.5"
        />
        <span>
          <span className="block text-xs font-semibold">
            我已确认资料使用与人工审核规则 *
          </span>
          <span className="mt-1 block text-[10px] leading-5 text-muted-foreground">
            客户回答作为“客户自述”保存；公开网页作为“公开观察”保存。AI
            推断、案例、数字、承诺和对外发布仍需逐项人工确认，可随时修改使用范围。
          </span>
        </span>
      </div>
    </FieldGroup>
  );
}

export function ClientProfileOnboarding({
  viewerName,
  initialProfile,
  allowCancel,
  onPersist,
  onComplete,
  onSkip,
  onCancel,
}: {
  viewerName: string;
  initialProfile?: ClientProfileRecord | null;
  allowCancel?: boolean;
  onPersist: PersistClientProfile;
  onComplete: (profile: ClientProfileRecord) => void;
  onSkip: (profile: ClientProfileRecord) => void;
  onCancel?: () => void;
}) {
  const [record, setRecord] = useState<ClientProfileRecord | null>(
    initialProfile ?? null,
  );
  const [data, setData] = useState<ClientProfileData>(
    initialProfile?.data ?? createEmptyClientProfileData(),
  );
  const [step, setStep] = useState(() =>
    firstIncompleteStep(initialProfile?.data ?? createEmptyClientProfileData()),
  );
  const [saving, setSaving] = useState(false);
  const [skipping, setSkipping] = useState(false);
  const [error, setError] = useState('');

  const update = (patch: Partial<ClientProfileData>) => {
    setData((current) => mergeProfile(current, patch));
    setError('');
  };

  const skipOnboarding = async () => {
    setSaving(true);
    setSkipping(true);
    setError('');
    try {
      const saved = await onPersist(data, {
        id: record?.id,
        status: calculateClientProfileReadiness(data).minimumReady
          ? record?.status === 'complete'
            ? 'complete'
            : 'minimum_ready'
          : 'in_progress',
        expectedVersion: record?.profileVersion,
      });
      onSkip(saved);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : '保存失败，请重试，已填写内容仍保留在此页',
      );
    } finally {
      setSaving(false);
      setSkipping(false);
    }
  };

  const saveAndMove = async (direction: 'next' | 'stay') => {
    const message = requiredMessage(step, data);
    if (message) {
      setError(message);
      return;
    }
    setSaving(true);
    setError('');
    try {
      const finalStep = step === onboardingSteps.length - 1;
      const saved = await onPersist(data, {
        id: record?.id,
        status: finalStep ? 'minimum_ready' : 'in_progress',
        expectedVersion: record?.profileVersion,
      });
      setRecord(saved);
      setData(saved.data);
      if (finalStep) {
        onComplete(saved);
        return;
      }
      if (direction === 'next') setStep((current) => current + 1);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : '保存失败，请稍后重试',
      );
    } finally {
      setSaving(false);
    }
  };

  const stepInfo = onboardingSteps[step];
  const progress = Math.round(((step + 1) / onboardingSteps.length) * 100);
  const readiness = calculateClientProfileReadiness(data);

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 lg:px-10 lg:py-10">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center gap-3">
          <div className="brand-mark">
            <Sparkles className="size-[18px]" />
          </div>
          <div>
            <div className="text-sm font-semibold">获客 OS · 首次建档</div>
            <div className="text-[10px] text-muted-foreground">
              {viewerName} 的客户内容工作区
            </div>
          </div>
          <Badge
            className="ml-auto border-ink/10 bg-white text-ink"
            variant="outline"
          >
            第 {step + 1} / {onboardingSteps.length} 组
          </Badge>
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            disabled={saving}
            onClick={() => void skipOnboarding()}
          >
            {skipping ? '正在保存并进入…' : '先跳过，进入工作台'}
            {!skipping && <ArrowRight />}
          </Button>
        </header>

        <section className="mt-7 grid overflow-hidden rounded-[24px] border border-border bg-white shadow-[0_24px_80px_rgba(16,42,34,0.08)] lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="bg-ink p-6 text-white lg:p-8">
            <div className="flex items-center gap-2 text-[11px] font-semibold text-lime">
              <Bot className="size-4" /> AI 业务访谈
            </div>
            <h1 className="mt-5 text-2xl font-semibold leading-tight tracking-[-0.04em]">
              让内容更了解
              <br />
              你的生意。
            </h1>
            <p className="mt-4 text-xs leading-6 text-white/55">
              可以现在回答，也可以先进入工作台。已填写的内容会随跳过一起保存，之后在“IP
              与业务资料”中随时补充。
            </p>
            <div className="mt-7">
              <div className="flex items-center justify-between text-[10px] text-white/45">
                <span>首次建档</span>
                <span>{progress}%</span>
              </div>
              <Progress
                value={progress}
                className="mt-2 bg-white/10 [&_[data-slot=progress-indicator]]:bg-lime"
              />
            </div>
            <div className="mt-7 space-y-3">
              {onboardingSteps.map((item, index) => (
                <div
                  key={item.title}
                  className={`flex items-center gap-3 text-[10px] ${
                    index === step
                      ? 'text-white'
                      : index < step
                        ? 'text-lime'
                        : 'text-white/28'
                  }`}
                >
                  <span
                    className={`grid size-6 shrink-0 place-items-center rounded-full border ${
                      index < step
                        ? 'border-lime bg-lime text-ink'
                        : index === step
                          ? 'border-white/50 bg-white/10'
                          : 'border-white/10'
                    }`}
                  >
                    {index < step ? <Check className="size-3" /> : index + 1}
                  </span>
                  <span>{item.title}</span>
                </div>
              ))}
            </div>
          </aside>

          <div className="p-5 sm:p-8 lg:p-10">
            <div className="rounded-2xl border border-lime/50 bg-lime/10 p-4">
              <div className="flex gap-3">
                <div className="grid size-8 shrink-0 place-items-center rounded-xl bg-ink text-lime">
                  <Bot className="size-4" />
                </div>
                <div>
                  <h2 className="text-base font-semibold tracking-[-0.02em]">
                    {stepInfo.title}
                  </h2>
                  <p className="mt-2 text-xs leading-6 text-foreground/75">
                    {stepInfo.prompt}
                  </p>
                  <p className="mt-2 text-[10px] leading-5 text-muted-foreground">
                    {stepInfo.hint}
                  </p>
                </div>
              </div>
            </div>

            <form
              className="mt-7"
              onSubmit={(event) => {
                event.preventDefault();
                void saveAndMove('next');
              }}
            >
              <OnboardingFields step={step} data={data} update={update} />
              {error && (
                <div
                  role="alert"
                  className="mt-4 flex items-center gap-2 text-xs text-destructive"
                >
                  <CircleAlert className="size-4" /> {error}
                </div>
              )}
              <div className="mt-8 flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:items-center">
                {step > 0 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setStep((current) => current - 1)}
                    disabled={saving}
                  >
                    <ArrowLeft /> 返回上一组
                  </Button>
                ) : allowCancel ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={onCancel}
                    disabled={saving}
                  >
                    取消新建
                  </Button>
                ) : (
                  <div className="text-[10px] text-muted-foreground">
                    完成每组后自动保存
                  </div>
                )}
                <div className="sm:ml-auto">
                  <Button type="submit" disabled={saving}>
                    {saving
                      ? '正在保存…'
                      : step === onboardingSteps.length - 1
                        ? '完成建档，查看档案'
                        : '保存并继续'}
                    {!saving && <ArrowRight />}
                  </Button>
                </div>
              </div>
              <p className="mt-4 text-[10px] leading-5 text-muted-foreground">
                当前已回答 {readiness.answered}/{readiness.total}{' '}
                项。每次点击“保存并继续”后写入你的云端客户档案；不同登录用户与不同客户相互隔离。
              </p>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}

function ProfileStatusBadge({ profile }: { profile: ClientProfileRecord }) {
  const readiness = calculateClientProfileReadiness(profile.data);
  if (profile.status === 'in_progress' || !readiness.minimumReady) {
    return (
      <Badge
        variant="outline"
        className="border-amber/40 bg-amber/10 text-amber-ink"
      >
        待完成
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="border-lime/60 bg-lime/15 text-ink">
      基础资料已填
    </Badge>
  );
}

function SectionEditor({
  section,
  data,
  update,
}: {
  section: ProfileSectionId;
  data: ClientProfileData;
  update: (patch: Partial<ClientProfileData>) => void;
}) {
  if (section === 'identity') {
    return <OnboardingFields step={0} data={data} update={update} />;
  }
  if (section === 'business') {
    return <OnboardingFields step={1} data={data} update={update} />;
  }
  if (section === 'audience') {
    return <OnboardingFields step={2} data={data} update={update} />;
  }
  if (section === 'evidence') {
    return <OnboardingFields step={3} data={data} update={update} />;
  }
  if (section === 'voice') {
    return (
      <FieldGroup>
        <TextField
          label="你希望内容听起来像什么 *"
          value={data.tone}
          onChange={(tone) => update({ tone })}
          placeholder="用自己的话描述表达方式"
          multiline
        />
        <MultiChoiceGrid<PresentationMode>
          label="可以接受的拍摄形式 *"
          values={data.presentationModes}
          options={PRESENTATION_MODE_OPTIONS}
          onChange={(presentationModes) => update({ presentationModes })}
        />
        <TextField
          label="本人原话样本"
          value={data.voiceSample}
          onChange={(voiceSample) => update({ voiceSample })}
          placeholder="粘贴真实说过的 3—8 句话"
          multiline
        />
        <TextField
          label="禁用表达或内容 *"
          value={data.dislikedPhrases}
          onChange={(dislikedPhrases) => update({ dislikedPhrases })}
          placeholder="没有也请写“暂无”"
          multiline
        />
      </FieldGroup>
    );
  }
  if (section === 'conversion') {
    return (
      <FieldGroup>
        <ChoiceGrid<BusinessGoal>
          label="当前唯一主目标 *"
          value={data.businessGoal}
          options={BUSINESS_GOAL_OPTIONS}
          onChange={(businessGoal) => update({ businessGoal })}
        />
        <TextField
          label="唯一行动 *"
          value={data.primaryAction}
          onChange={(primaryAction) => update({ primaryAction })}
          placeholder="观众看完只做什么"
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="后续由谁承接"
            value={data.handoffOwner}
            onChange={(handoffOwner) => update({ handoffOwner })}
            placeholder="本人、客服、销售等"
          />
          <TextField
            label="最终发布批准人"
            value={data.finalApprover}
            onChange={(finalApprover) => update({ finalApprover })}
            placeholder="姓名或岗位"
          />
        </div>
        <div className="flex items-start gap-3 rounded-xl border border-border bg-white p-4">
          <Checkbox
            aria-label="确认生成内容仍需逐项人工审核"
            checked={data.privacyAcknowledged}
            onCheckedChange={(privacyAcknowledged) =>
              update({ privacyAcknowledged: Boolean(privacyAcknowledged) })
            }
            className="mt-0.5"
          />
          <span className="text-xs leading-5">
            我确认 AI 推断、案例、数字、承诺和对外发布仍需逐项人工审核。
          </span>
        </div>
      </FieldGroup>
    );
  }
  return (
    <FieldGroup>
      <div className="flex items-start gap-3 rounded-xl border border-border bg-white p-4">
        <Checkbox
          aria-label="允许 AI 根据已确认的公开链接建立研究任务"
          checked={data.researchConsent}
          onCheckedChange={(researchConsent) =>
            update({
              researchConsent: Boolean(researchConsent),
              researchStatus: researchConsent
                ? data.researchStatus
                : 'not_requested',
            })
          }
          className="mt-0.5"
        />
        <span>
          <span className="block text-xs font-semibold">
            允许 AI 根据我确认的公开链接建立研究任务
          </span>
          <span className="mt-1 block text-[10px] leading-5 text-muted-foreground">
            不读取登录后页面、私人联系方式或未授权资料。
          </span>
        </span>
      </div>
      {data.researchConsent && (
        <>
          <TextField
            label="官方网站"
            value={data.officialWebsite}
            onChange={(officialWebsite) => update({ officialWebsite })}
            placeholder="https://..."
          />
          <TextField
            label="官方账号和其他公开资料链接"
            value={data.officialAccounts}
            onChange={(officialAccounts) => update({ officialAccounts })}
            placeholder="每行一个来源或说明"
            multiline
          />
          <MultiChoiceGrid<ResearchScope>
            label="允许研究的范围"
            values={data.researchScopes}
            options={RESEARCH_SCOPE_OPTIONS}
            onChange={(researchScopes) => update({ researchScopes })}
          />
        </>
      )}
    </FieldGroup>
  );
}

export function ClientProfileWorkspace({
  profiles,
  activeProfile,
  onSelect,
  onNew,
  onContinueInterview,
  onPersist,
  flash,
  onDirtyChange,
}: {
  profiles: ClientProfileRecord[];
  activeProfile: ClientProfileRecord;
  onSelect: (id: string) => void;
  onNew: () => void;
  onContinueInterview: (id: string) => void;
  onPersist: PersistClientProfile;
  flash: (message: string) => void;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const [data, setData] = useState(activeProfile.data);
  const [selectedSection, setSelectedSection] = useState<ProfileSectionId>(
    calculateClientProfileReadiness(activeProfile.data).sections.find(
      (section) => section.complete < 100,
    )?.id ?? 'identity',
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const update = (patch: Partial<ClientProfileData>) => {
    setData((current) => mergeProfile(current, patch));
    setError('');
  };
  const readiness = calculateClientProfileReadiness(data);
  const savedReadiness = calculateClientProfileReadiness(activeProfile.data);
  const dirty = JSON.stringify(data) !== JSON.stringify(activeProfile.data);
  useUnsavedChanges(dirty || saving, onDirtyChange);
  const canLeave = () => {
    if (dirty || saving) {
      setError('请先保存或放弃本次修改，再切换客户或继续问答');
      return false;
    }
    return true;
  };

  const save = async (nextData = data, researchTask = false) => {
    setSaving(true);
    setError('');
    try {
      const nextReadiness = calculateClientProfileReadiness(nextData);
      const status: ClientProfileStatus = nextReadiness.minimumReady
        ? nextReadiness.complete === 100
          ? 'complete'
          : 'minimum_ready'
        : 'update_required';
      const saved = await onPersist(nextData, {
        id: activeProfile.id,
        status,
        expectedVersion: activeProfile.profileVersion,
      });
      setData(saved.data);
      flash(
        researchTask
          ? '研究授权与范围已保存，网页观察仍需逐项确认'
          : `客户档案已保存为 v${saved.profileVersion}`,
      );
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : '保存失败，请稍后重试',
      );
    } finally {
      setSaving(false);
    }
  };

  const createResearchBrief = async () => {
    if (!data.researchConsent) {
      setSelectedSection('research');
      setError('请先确认是否允许 AI 使用公开链接建立研究任务');
      return;
    }
    if (!data.officialWebsite.trim() && !data.officialAccounts.trim()) {
      setSelectedSection('research');
      setError('请至少提供一个经过确认的官网或官方账号');
      return;
    }
    const nextData = {
      ...data,
      researchStatus: 'scope_saved' as const,
      researchRequestedAt: new Date().toISOString(),
    };
    setData(nextData);
    await save(nextData, true);
  };

  return (
    <>
      <section className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="eyebrow">
            <UserCheck className="size-3.5" /> 客户事实底稿 · v
            {activeProfile.profileVersion}
          </div>
          <h1 className="mt-3 max-w-4xl text-[clamp(1.75rem,3vw,2.55rem)] font-semibold leading-[1.08] tracking-[-0.045em]">
            我的 IP 与业务资料
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            每个客户拥有独立档案。当前先保存客户自述与使用边界；公开观察和 AI
            推断会在研究执行器接入后分开记录、逐项确认。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="bg-white"
            onClick={() => {
              if (canLeave()) onNew();
            }}
          >
            <Plus /> 新建客户
          </Button>
          <Button
            onClick={() => {
              if (canLeave()) onContinueInterview(activeProfile.id);
            }}
            variant={savedReadiness.minimumReady ? 'outline' : 'default'}
          >
            <Bot />{' '}
            {savedReadiness.minimumReady ? '继续资料问答' : '按问题补充资料'}
          </Button>
        </div>
      </section>

      <section className="mt-7 grid gap-4 xl:grid-cols-[250px_minmax(0,1fr)_340px]">
        <aside className="surface-card h-fit p-3">
          <div className="px-2 pb-3 pt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            客户工作区
          </div>
          <div className="space-y-1.5">
            {profiles.map((profile) => {
              const selected = profile.id === activeProfile.id;
              const profileReadiness = calculateClientProfileReadiness(
                profile.data,
              );
              return (
                <button
                  key={profile.id}
                  type="button"
                  aria-label={`切换到${profile.data.workspaceName || profile.data.brandName || '未命名客户'}工作区`}
                  onClick={() => {
                    if (profile.id === activeProfile.id || canLeave())
                      onSelect(profile.id);
                  }}
                  className={`w-full rounded-xl border p-3 text-left transition ${
                    selected
                      ? 'border-ink bg-ink text-white'
                      : 'border-transparent hover:border-border hover:bg-muted/60'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`grid size-8 shrink-0 place-items-center rounded-lg text-xs font-bold ${
                        selected ? 'bg-lime text-ink' : 'bg-muted text-ink'
                      }`}
                    >
                      {(profile.data.brandName || '客').slice(0, 1)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-semibold">
                        {profile.data.workspaceName ||
                          profile.data.brandName ||
                          '未命名客户'}
                      </div>
                      <div
                        className={`mt-0.5 truncate text-[9px] ${
                          selected ? 'text-white/45' : 'text-muted-foreground'
                        }`}
                      >
                        {profile.data.industry || '行业待补'} ·{' '}
                        {profileReadiness.complete}%
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <div className="space-y-4">
          <article className="surface-card overflow-hidden p-0">
            <div className="border-b border-border p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold tracking-[-0.025em]">
                      {data.brandName || '未命名客户'}
                    </h2>
                    <ProfileStatusBadge profile={activeProfile} />
                  </div>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {data.role || '角色待补'} · {data.industry || '行业待补'}
                    {data.subIndustry ? ` / ${data.subIndustry}` : ''} · 更新于{' '}
                    {new Date(activeProfile.updatedAt).toLocaleString('zh-CN', {
                      month: 'numeric',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {dirty && (
                    <Badge
                      variant="outline"
                      className="border-amber/40 bg-amber/10 text-amber-ink"
                    >
                      有未保存修改
                    </Badge>
                  )}
                  <Button
                    size="sm"
                    onClick={() => void save()}
                    disabled={!dirty || saving}
                  >
                    <Save /> {saving ? '保存中…' : '保存档案'}
                  </Button>
                </div>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-border bg-muted/35 p-4">
                  <div className="text-[10px] text-muted-foreground">
                    资料收集
                  </div>
                  <div className="mt-1 text-xl font-semibold">
                    {readiness.complete}%
                  </div>
                  <Progress value={readiness.complete} className="mt-2" />
                </div>
                <div className="rounded-xl border border-lime/50 bg-lime/10 p-4">
                  <div className="text-[10px] text-muted-foreground">
                    选题状态
                  </div>
                  <div className="mt-1 text-sm font-semibold">
                    {readiness.canGenerateTopics
                      ? '客户上下文可用'
                      : '仍有关键问题'}
                  </div>
                  <p className="mt-2 text-[9px] leading-4 text-muted-foreground">
                    {readiness.canGenerateTopics
                      ? '档案已可作为后续客户专属选题的上下文'
                      : `下一项：${readiness.nextQuestion}`}
                  </p>
                </div>
                <div className="rounded-xl border border-coral/20 bg-coral/[0.04] p-4">
                  <div className="text-[10px] text-muted-foreground">
                    发布状态
                  </div>
                  <div className="mt-1 text-sm font-semibold">仍需逐条审核</div>
                  <p className="mt-2 text-[9px] leading-4 text-muted-foreground">
                    档案完整不等于脚本、案例和数字可以直接发布
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 p-5 sm:grid-cols-2">
              {readiness.sections.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setSelectedSection(section.id)}
                  className={`rounded-xl border p-4 text-left transition ${
                    selectedSection === section.id
                      ? 'border-ink bg-ink/[0.035] shadow-sm'
                      : 'border-border bg-white hover:-translate-y-0.5 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-semibold">
                      {section.title}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {section.done}/{section.total}
                    </span>
                  </div>
                  <Progress
                    value={section.complete}
                    className="mt-3 [&_[data-slot=progress-indicator]]:bg-lime"
                  />
                  <p className="mt-3 text-[10px] leading-4 text-muted-foreground">
                    {section.description}
                  </p>
                </button>
              ))}
            </div>
          </article>

          <article className="surface-card p-5">
            <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-[10px] font-semibold text-coral">
                  正在编辑
                </div>
                <h2 className="mt-1 text-sm font-semibold">
                  {
                    readiness.sections.find(
                      (section) => section.id === selectedSection,
                    )?.title
                  }
                </h2>
              </div>
              <Badge variant="outline" className="w-fit">
                客户自述 · 保存后生成新版本
              </Badge>
            </div>
            <fieldset className="mt-5" disabled={saving}>
              <SectionEditor
                section={selectedSection}
                data={data}
                update={update}
              />
            </fieldset>
            {error && (
              <div
                role="alert"
                className="mt-4 flex items-center gap-2 text-xs text-destructive"
              >
                <CircleAlert className="size-4" /> {error}
              </div>
            )}
            <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-border pt-4">
              {(selectedSection === 'voice' ||
                selectedSection === 'evidence') && (
                <Button
                  variant="outline"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(
                        buildStrategyBrief('learning', data),
                      );
                      flash(
                        '已复制本人表达与案例资料摘要；受限证据原文不会导出',
                      );
                    } catch {
                      setError('复制失败，请检查浏览器剪贴板权限');
                    }
                  }}
                >
                  <Copy />
                  复制写稿参考资料
                </Button>
              )}
              <Button
                variant="ghost"
                disabled={!dirty || saving}
                onClick={() => {
                  setData(activeProfile.data);
                  setError('');
                }}
              >
                放弃未保存修改
              </Button>
              <Button onClick={() => void save()} disabled={!dirty || saving}>
                <Save /> {saving ? '保存中…' : '保存本次修改'}
              </Button>
            </div>
          </article>
        </div>

        <aside className="space-y-4">
          <article className="surface-card border-lime/50 bg-lime/10 p-5">
            <div className="flex items-center gap-2">
              <Bot className="size-4 text-ink" />
              <h2 className="text-sm font-semibold">下一项建议补什么</h2>
            </div>
            <p className="mt-3 text-xs leading-6 text-foreground/80">
              {readiness.nextQuestion
                ? `请先补充：${readiness.nextQuestion}。补完后，我再判断下一项，不一次塞给你整份问卷。`
                : '最低客户上下文已经成立。下一步可以进入选题，但案例、数字和公开权限仍按每条内容继续核验。'}
            </p>
            <Button
              className="mt-4 w-full"
              onClick={() => {
                if (canLeave()) onContinueInterview(activeProfile.id);
              }}
            >
              <Bot /> {readiness.nextQuestion ? '继续补档' : '继续完善长期档案'}
            </Button>
          </article>

          <article className="surface-card p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Search className="size-4 text-coral" />
                <h2 className="text-sm font-semibold">公开资料研究</h2>
              </div>
              <Badge variant="outline">
                {data.researchStatus === 'scope_saved'
                  ? '范围已保存'
                  : '尚未建立'}
              </Badge>
            </div>
            <div className="mt-4 space-y-3 text-[10px] leading-5 text-muted-foreground">
              <div className="flex gap-2">
                <span className="grid size-5 shrink-0 place-items-center rounded-full bg-ink text-[9px] text-white">
                  1
                </span>
                客户确认企业主体、官方链接和允许研究的范围
              </div>
              <div className="flex gap-2">
                <span className="grid size-5 shrink-0 place-items-center rounded-full bg-muted text-[9px] text-ink">
                  2
                </span>
                联网能力按范围收集来源，保留链接、日期和原文定位
              </div>
              <div className="flex gap-2">
                <span className="grid size-5 shrink-0 place-items-center rounded-full bg-muted text-[9px] text-ink">
                  3
                </span>
                客户逐项确认后才进入正式事实；未确认内容只作公开观察
              </div>
            </div>
            <Button
              className="mt-4 w-full"
              variant="outline"
              onClick={() => void createResearchBrief()}
              disabled={saving}
            >
              <Search /> 保存研究授权与范围
            </Button>
            <p className="mt-3 text-[9px] leading-4 text-muted-foreground">
              当前按钮只建立可执行研究简报，不会伪装成已经访问网页；联网执行器接入后再返回待确认观察。
            </p>
          </article>

          <article className="surface-card p-5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-coral" />
              <h2 className="text-sm font-semibold">研究结果入档前分开</h2>
            </div>
            <div className="mt-4 space-y-2">
              {[
                ['客户自述', '本人回答，不自动等于可公开'],
                ['公开观察', '研究器接入后保留来源，等待确认'],
                ['AI 推断', '研究器接入后只作判断，不冒充事实'],
              ].map(([title, description]) => (
                <div
                  key={title}
                  className="rounded-xl border border-border p-3"
                >
                  <div className="flex items-center gap-2 text-[10px] font-semibold">
                    <Lock className="size-3" /> {title}
                  </div>
                  <p className="mt-1 text-[9px] leading-4 text-muted-foreground">
                    {description}
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

export function ClientProfilesLoading({ viewerName }: { viewerName: string }) {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-4">
      <div className="surface-card w-full max-w-md p-8 text-center">
        <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-ink text-lime">
          <Sparkles className="size-5 animate-pulse" />
        </div>
        <h1 className="mt-4 text-lg font-semibold">正在读取客户工作区</h1>
        <p className="mt-2 text-xs text-muted-foreground">
          {viewerName} 的客户档案正在安全载入
        </p>
      </div>
    </main>
  );
}

export function ClientProfilesError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-4">
      <div className="surface-card w-full max-w-md p-8 text-center">
        <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-coral/10 text-coral">
          <CircleAlert className="size-5" />
        </div>
        <h1 className="mt-4 text-lg font-semibold">客户档案暂时没有载入</h1>
        <p className="mt-2 text-xs leading-6 text-muted-foreground">
          {message}
        </p>
        <Button className="mt-5" onClick={onRetry}>
          重新载入
        </Button>
      </div>
    </main>
  );
}
