'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Copy, Save, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BUSINESS_GOAL_OPTIONS,
  CASE_STATUS_OPTIONS,
  USE_SCOPE_OPTIONS,
  type ClientProfileData,
  type ClientProfileRecord,
} from '@/lib/client-profile';
import {
  buildStrategyBrief,
  strategyGaps,
  type StrategyMode,
} from '@/lib/strategy-brief';
import type { PersistClientProfile } from './client-profile';

type TextField = {
  key: keyof ClientProfileData;
  label: string;
  hint: string;
  max: number;
  rows?: number;
};
const learningFields: TextField[] = [
  {
    key: 'voiceSample',
    label: '一段你自己的原话',
    hint: '可以是口播原稿、咨询时的解释或采访逐字稿。只填你有权使用的内容，不需要刻意写得漂亮。',
    max: 2000,
    rows: 7,
  },
  {
    key: 'tone',
    label: '你希望保留的表达习惯',
    hint: '例如：先举一个现场例子，再解释怎么判断；少用抽象概念。',
    max: 500,
  },
  {
    key: 'dislikedPhrases',
    label: '不希望出现的句子或风格',
    hint: '例如：拒绝“颠覆认知”“闭眼入”；不装作替所有行业下结论。',
    max: 800,
  },
  {
    key: 'uniqueMaterial',
    label: '只有你能讲的经历与素材',
    hint: '记录真实经历、服务过程、操作经验；不要填写客户联系方式等非必要个人信息。',
    max: 1200,
  },
  {
    key: 'evidenceSummary',
    label: '这些内容有什么证据',
    hint: '说明证据是什么、在哪里、是否获得授权。当前保存摘要，不上传原始附件。',
    max: 1200,
  },
];
const businessFields: TextField[] = [
  {
    key: 'primaryOffer',
    label: '这阶段主推什么产品或服务',
    hint: '首轮先聚焦一项，不必把所有业务都放进一条视频。',
    max: 500,
  },
  {
    key: 'targetCustomer',
    label: '谁适合买，他正在经历什么',
    hint: '写具体的人和处境，而不只是“所有老板”。',
    max: 500,
  },
  {
    key: 'offerOutcome',
    label: '购买之后实际交付什么',
    hint: '交付物、服务范围和可核验结果，避免空泛保证。',
    max: 800,
  },
  {
    key: 'deliveryMode',
    label: '用什么方式交付',
    hint: '例如：到店服务、线上咨询、项目交付或课程陪跑。',
    max: 500,
  },
  {
    key: 'priceRange',
    label: '价格或报价方式（选填）',
    hint: '不知道可先留空。这里不自动计算或承诺收益。',
    max: 120,
  },
  {
    key: 'promiseBoundary',
    label: '哪些结果不能承诺',
    hint: '比如不承诺固定播放、咨询量或成交额。按你的业务如实填写。',
    max: 800,
  },
  {
    key: 'customerBlocker',
    label: '客户最常见的顾虑',
    hint: '尽量记录客户原话，再区分事实与自己的猜测。',
    max: 800,
  },
  {
    key: 'primaryAction',
    label: '看完内容后，希望他做的一个动作',
    hint: '例如：通过你公开的业务入口预约诊断。平台允许的具体表达仍需发布前审核。',
    max: 300,
  },
  {
    key: 'handoffOwner',
    label: '谁来接住这次咨询',
    hint: '填写岗位或负责人称呼即可，不需要手机号。',
    max: 120,
  },
];

export function StrategyWorkspace({
  mode,
  profile,
  onPersist,
  go,
  onDirtyChange,
}: {
  mode: StrategyMode;
  profile: ClientProfileRecord;
  onPersist: PersistClientProfile;
  go: (view: 'clients' | 'topics' | 'research') => void;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const [draft, setDraft] = useState(profile.data);
  const [baseline, setBaseline] = useState(profile);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [copied, setCopied] = useState(false);
  const savingRef = useRef(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(baseline.data);
  const stale = profile.profileVersion !== baseline.profileVersion;
  const learning = mode === 'learning';
  const fields = learning ? learningFields : businessFields;
  const brief = buildStrategyBrief(mode, draft);
  const gaps = strategyGaps(mode, draft);
  useEffect(() => {
    onDirtyChange(dirty || saving);
    return () => onDirtyChange(false);
  }, [dirty, saving, onDirtyChange]);
  // Internal navigation is guarded by the parent; browser close is guarded here.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  const update = (patch: Partial<ClientProfileData>) => {
    setDraft((data) => ({ ...data, ...patch }));
    setNotice('');
    setCopied(false);
  };
  const save = async () => {
    if (savingRef.current || !dirty) return;
    savingRef.current = true;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const saved = await onPersist(draft, {
        id: baseline.id,
        expectedVersion: baseline.profileVersion,
        status:
          baseline.status === 'in_progress' ? 'in_progress' : 'update_required',
      });
      setBaseline(saved);
      setDraft(saved.data);
      setNotice(
        '已保存到当前客户档案。同一工作台账号在其他设备重新读取后可见。',
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '保存失败，输入仍保留在本页',
      );
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(
        `${dirty ? '【未保存草稿】\n\n' : ''}${brief}`,
      );
      setCopied(true);
    } catch {
      setError('未能复制，请手动选择右侧简报文字。');
    }
  };
  return (
    <div className="space-y-6">
      <header className="max-w-3xl">
        <p className="mb-2 text-xs font-semibold text-muted-foreground">
          {profile.data.brandName || profile.data.workspaceName || '当前客户'} ·{' '}
          {learning ? '学习与定位' : '设计变现'}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {learning
            ? '让内容有你的声音，也有真实依据'
            : '先说清楚，内容为哪项业务服务'}
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {learning
            ? '这是可持续补充的表达与信任素材底稿。保存样本不等于训练模型，也不会自动模仿别人；当前可整理、保存和复制参考简报。'
            : '把产品、客户、交付和下一步承接连在一起。这里只整理你确认的资料，不凭空推算成交，也不会自动发私信。'}{' '}
          所有问题都可以稍后再补。
        </p>
      </header>
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(300px,0.8fr)]">
        <section
          className="surface-card p-5 sm:p-6"
          aria-label={learning ? '表达与信任资料' : '变现与承接资料'}
        >
          <fieldset disabled={saving} className="space-y-6">
            {!learning && (
              <OptionField
                id="strategy-businessGoal"
                label="这阶段优先做什么"
                value={draft.businessGoal}
                options={BUSINESS_GOAL_OPTIONS}
                onChange={(value) =>
                  update({
                    businessGoal: value as ClientProfileData['businessGoal'],
                  })
                }
              />
            )}
            {fields.map((field) => (
              <div key={field.key} className="space-y-2">
                <label
                  className="block text-sm font-semibold"
                  htmlFor={`strategy-${field.key}`}
                >
                  {field.label}
                </label>
                <p
                  id={`strategy-${field.key}-hint`}
                  className="text-xs leading-5 text-muted-foreground"
                >
                  {field.hint}
                </p>
                <Textarea
                  id={`strategy-${field.key}`}
                  aria-describedby={`strategy-${field.key}-hint`}
                  value={String(draft[field.key])}
                  rows={field.rows || 3}
                  maxLength={field.max}
                  onChange={(event) =>
                    update({ [field.key]: event.target.value })
                  }
                  className="resize-y bg-white text-sm leading-6"
                />
                <p className="text-right text-[11px] text-muted-foreground">
                  {String(draft[field.key]).length} / {field.max}
                </p>
              </div>
            ))}
            {learning && (
              <>
                <OptionField
                  id="strategy-caseStatus"
                  label="案例的真实状态"
                  value={draft.caseStatus}
                  options={CASE_STATUS_OPTIONS}
                  onChange={(value) =>
                    update({
                      caseStatus: value as ClientProfileData['caseStatus'],
                    })
                  }
                />
                <OptionField
                  id="strategy-useScope"
                  label="以上经历素材与证据的使用范围"
                  value={draft.evidenceUseScope}
                  options={USE_SCOPE_OPTIONS}
                  onChange={(value) =>
                    update({
                      evidenceUseScope:
                        value as ClientProfileData['evidenceUseScope'],
                    })
                  }
                />
                <p className="rounded-lg bg-muted/40 p-3 text-xs leading-6 text-muted-foreground">
                  <ShieldCheck className="mr-1 inline size-4" />
                  默认仅内部参考。“匿名使用”材料也不会自动导出原文，须先人工去标识化复核。此限制作用于这里的简报，不替代最终发布审核。
                </p>
              </>
            )}
          </fieldset>
          <div className="sticky bottom-2 mt-6 space-y-3 rounded-xl border border-border bg-white p-4 shadow-sm">
            <p className="text-xs leading-5 text-muted-foreground">
              {dirty
                ? '有未保存修改；切换工作区或客户前请先保存。'
                : '当前内容与已读取的客户档案一致。'}{' '}
              保存只更新资料，不自动修改已有选题或脚本。
            </p>
            {stale && (
              <p role="alert" className="text-xs text-amber-ink">
                当前档案已有较新版本，请先保留草稿，再重新读取，避免覆盖他处修改。
              </p>
            )}
            {error && (
              <p role="alert" className="text-sm text-red-700">
                {error}
                。输入仍保留在本页；刷新前请保留需要的草稿，复制简报不会包含受限证据。
              </p>
            )}
            {notice && (
              <output className="block text-xs leading-5 text-emerald-800">
                {notice}
              </output>
            )}
            <div className="flex flex-wrap gap-2">
              <Button onClick={save} disabled={!dirty || saving || stale}>
                <Save />
                {saving ? '正在保存…' : '保存到当前客户资料'}
              </Button>
              <Button
                variant="ghost"
                disabled={!dirty || saving}
                onClick={() => {
                  setDraft(profile.data);
                  setBaseline(profile);
                  setError('');
                  setNotice('已恢复为最近读取的档案内容');
                  setCopied(false);
                }}
              >
                放弃未保存修改
              </Button>
            </div>
          </div>
        </section>
        <aside className="space-y-4 xl:sticky xl:top-6">
          <section className="surface-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-semibold">
                {learning ? '表达参考简报' : '业务承接简报'}
              </h2>
              <Button variant="outline" size="sm" onClick={copy}>
                <Copy />
                {copied ? '已复制' : dirty ? '复制草稿' : '复制简报'}
              </Button>
            </div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              根据本页输入整理，不是 AI 诊断或自动创作结果。
            </p>
            <pre
              className="mt-4 max-h-[55vh] overflow-y-auto whitespace-pre-wrap break-words rounded-lg bg-muted/40 p-4 font-sans text-sm leading-7"
              aria-label="可复制参考简报"
            >
              {brief}
            </pre>
          </section>
          <section className="surface-card p-5">
            <h2 className="text-sm font-semibold">接下来可以补哪一项</h2>
            {gaps.length ? (
              <ul className="mt-3 list-disc space-y-2 pl-5 text-xs leading-6 text-muted-foreground">
                {gaps.map((gap) => (
                  <li key={gap}>{gap}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-xs leading-6 text-muted-foreground">
                关键字段已有内容。下一步核验事实，不能仅凭“已填写”判断质量或商业效果。
              </p>
            )}
            <p className="mt-3 text-xs text-muted-foreground">
              这是字段缺项提示，不是账号表现评分。
            </p>
          </section>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={dirty || saving}
              onClick={() => go(learning ? 'research' : 'topics')}
            >
              {learning ? '去研究参考内容' : '去选题工作区'}
              <ArrowRight />
            </Button>
            <Button
              variant="ghost"
              disabled={dirty || saving}
              onClick={() => go('clients')}
            >
              查看完整 IP 档案
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}

function OptionField({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: Record<string, string>;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-semibold">
        {label}
      </label>
      <Select
        value={value || '__unset'}
        onValueChange={(selected) => {
          if (selected !== null)
            onChange(selected === '__unset' ? '' : selected);
        }}
      >
        <SelectTrigger id={id} className="w-full bg-white">
          <SelectValue>{options[value] || '稍后再选'}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {id === 'strategy-businessGoal' && (
            <SelectItem value="__unset">稍后再选</SelectItem>
          )}
          {Object.entries(options).map(([key, text]) => (
            <SelectItem key={key} value={key}>
              {text}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
