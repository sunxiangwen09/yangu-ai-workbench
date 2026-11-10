'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, ExternalLink } from 'lucide-react';
import {
  VIDEO_CHECK,
  WORKBENCH_ISSUES,
  auditMarkdown,
  type AuditState,
} from '@/lib/workbench-audit';

export function VideoCheckCard() {
  return (
    <section className="surface-card p-5 sm:p-6" aria-label="本轮视频实测记录">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-coral">
            本轮人工页面实测 · {VIDEO_CHECK.observedAt} · 不是自动采集结果
          </p>
          <h2 className="mt-2 text-xl font-semibold">{VIDEO_CHECK.title}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {VIDEO_CHECK.creator} · {VIDEO_CHECK.duration} · 发布于{' '}
            {VIDEO_CHECK.publishedAt}
          </p>
        </div>
        <a
          href={VIDEO_CHECK.canonicalUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 text-sm underline underline-offset-4"
        >
          打开原视频
          <ExternalLink className="size-4" />
        </a>
      </div>
      <p className="mt-4 text-sm leading-6">
        观察快照：点赞 6,925 · 评论标示 308 · 收藏 1,869 · 分享
        410。没有公开播放量、咨询量或成交数据；这些数字会变化。
      </p>
      <ol className="mt-5 grid gap-3 md:grid-cols-2">
        {VIDEO_CHECK.steps.map((step, index) => (
          <li key={step.label} className="rounded-xl border border-border p-4">
            <div className="flex flex-wrap justify-between gap-2 text-sm">
              <strong>
                {index + 1}. {step.label}
              </strong>
              <span
                className={
                  step.state === '已完成'
                    ? 'text-emerald-800'
                    : 'text-amber-ink'
                }
              >
                {step.state}
              </span>
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {step.detail}
            </p>
          </li>
        ))}
      </ol>
      <details className="mt-4 rounded-lg bg-muted/40 p-4">
        <summary className="cursor-pointer text-sm font-semibold">
          10 条可见评论给了什么线索？
        </summary>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-muted-foreground">
          {VIDEO_CHECK.commentObservations.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className="mt-3 text-sm">
          这是观察摘要，不是完整原句库，也不是购买意向证明。没有用这 10 条冒充
          100 条精选或全部评论。
        </p>
      </details>
    </section>
  );
}

export function AuditWorkspace() {
  const [filter, setFilter] = useState<AuditState | 'all'>('all');
  const [notice, setNotice] = useState('');
  const labels = {
    all: '全部问题',
    fixed: '本轮已修复',
    partial: '部分可用',
    blocked: '待接通 / 被阻断',
  };
  const download = () => {
    const url = URL.createObjectURL(
      new Blob([auditMarkdown()], { type: 'text/markdown;charset=utf-8' }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = '工作台测试与问题清单-2026-09-22.md';
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice('问题清单已交给浏览器下载');
  };
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">内部验收 · 2026-09-22</p>
          <h1 className="mt-2 text-3xl font-semibold">
            哪些能用，哪些还需要补？
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground">
            这里记录本轮发现的问题，不等于所有潜在问题都已排除。“通过隔离测试”和“真实平台实跑成功”分开判断。
          </p>
        </div>
        <Button variant="outline" onClick={download}>
          <Download />
          导出问题清单
        </Button>
      </header>
      {notice && <output className="block text-sm">{notice}</output>}
      <VideoCheckCard />
      <fieldset className="flex flex-wrap gap-2" aria-label="筛选问题状态">
        {(Object.keys(labels) as Array<keyof typeof labels>).map((key) => (
          <Button
            key={key}
            variant={filter === key ? 'default' : 'outline'}
            aria-pressed={filter === key}
            onClick={() => setFilter(key)}
          >
            {labels[key]} ·{' '}
            {
              WORKBENCH_ISSUES.filter(
                (item) => key === 'all' || item.state === key,
              ).length
            }
          </Button>
        ))}
      </fieldset>
      <section className="grid gap-4 lg:grid-cols-2" aria-label="功能问题清单">
        {WORKBENCH_ISSUES.filter(
          (item) => filter === 'all' || item.state === filter,
        ).map((item) => (
          <article key={item.id} className="surface-card p-5">
            <div className="flex flex-wrap justify-between gap-2 text-sm text-muted-foreground">
              <span>
                {item.id} · {item.area}
              </span>
              <span>{labels[item.state]}</span>
            </div>
            <h2 className="mt-3 text-lg font-semibold">{item.problem}</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              核查依据：{item.evidence}
            </p>
            <p className="mt-3 text-sm leading-6">
              {item.state === 'fixed' ? '本轮处理' : '下一步'}：{item.next}
            </p>
          </article>
        ))}
      </section>
      <p className="text-sm leading-6 text-muted-foreground">
        资料依据：
        <a
          className="underline"
          href="https://www.nngroup.com/articles/progressive-disclosure/"
          target="_blank"
          rel="noreferrer"
        >
          NN/g 渐进披露
        </a>
        、
        <a
          className="underline"
          href="https://www.nngroup.com/articles/ten-usability-heuristics/"
          target="_blank"
          rel="noreferrer"
        >
          状态透明与错误恢复
        </a>
        。这些是交互设计参考，不是获客效果保证。
      </p>
    </div>
  );
}
