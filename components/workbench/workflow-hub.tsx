'use client';

import { useState } from 'react';
import { ArrowRight, BookOpenText, CircleHelp, Route } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  WORKFLOW_FEATURES,
  WORKFLOW_STAGES,
  type WorkflowDestination,
  type WorkflowFeature,
  type WorkflowStage,
} from './workflow-catalog';

const stateLabels = {
  usable: '资料工具可用',
  partial: '部分可用',
  planned: '待接通',
} as const;

export function WorkflowHub({
  clientName,
  go,
}: {
  clientName: string;
  go: (view: WorkflowDestination) => void;
}) {
  const [stage, setStage] = useState<WorkflowStage>('learn');
  const [detail, setDetail] = useState<WorkflowFeature | null>(null);
  const selected = WORKFLOW_STAGES.find((item) => item.id === stage)!;
  const features = WORKFLOW_FEATURES.filter((item) => item.stage === stage);
  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p className="mb-2 text-xs font-semibold text-muted-foreground">
            全流程 · {clientName || '当前客户'}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            从了解业务，到下一条更值得拍的内容
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            选你正在做的事，不必从头答完问卷。每个入口都写清输入、交付和真实进度；“有入口”不代表自动化已经接通。
          </p>
        </div>
        <Button
          variant="outline"
          className="shrink-0"
          onClick={() => go('clients')}
        >
          查看当前客户资料 <ArrowRight />
        </Button>
      </header>
      <nav
        aria-label="创作流程阶段"
        className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5"
      >
        {WORKFLOW_STAGES.map((item, index) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={stage === item.id}
            onClick={() => setStage(item.id)}
            className={`rounded-xl border p-4 text-left transition-colors ${stage === item.id ? 'border-ink bg-ink text-white' : 'border-border bg-white hover:border-ink/30'}`}
          >
            <span
              className={`mb-3 block text-xs ${stage === item.id ? 'text-lime' : 'text-muted-foreground'}`}
            >
              0{index + 1}
            </span>
            <span className="block font-semibold">{item.label}</span>
            <span className="mt-2 block text-xs leading-5 opacity-70">
              {item.question}
            </span>
          </button>
        ))}
      </nav>
      <section aria-label={selected.label} className="space-y-4">
        <div className="flex items-center gap-3">
          <Route className="size-5 text-coral" />
          <div>
            <h2 className="font-semibold">{selected.label}</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              这一段留下：{selected.outcome}
            </p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {features.map((feature) => (
            <article
              key={feature.id}
              className="surface-card flex flex-col gap-3 p-5"
            >
              <div>
                <Badge
                  variant="outline"
                  className={
                    feature.state === 'usable'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                      : feature.state === 'planned'
                        ? 'text-muted-foreground'
                        : 'border-amber/30 bg-amber/8 text-amber-ink'
                  }
                >
                  {stateLabels[feature.state]}
                </Badge>
              </div>
              <h3 className="text-base font-semibold">{feature.name}</h3>
              <p className="text-sm leading-6">{feature.summary}</p>
              <p className="text-xs leading-5 text-muted-foreground">
                {feature.stateDetail}
              </p>
              <Button
                variant="outline"
                className="mt-auto w-full justify-between"
                onClick={() => setDetail(feature)}
              >
                怎么使用 <CircleHelp className="size-4" />
              </Button>
            </article>
          ))}
        </div>
      </section>
      <aside className="rounded-xl border border-border bg-white/60 p-4 text-xs leading-6 text-muted-foreground">
        <span className="font-semibold text-ink">始终保留的创作原则：</span>
        记录过程、干货、观点、故事是内容类型；口播、Vlog、录屏是呈现形式。固定口播优先连续正文，不强制分镜。研究评论与自有客户线索分开管理。
        <p className="mt-2">
          结构参考了{' '}
          <a
            className="underline underline-offset-4"
            href="https://dagou.cn.com/guide"
            target="_blank"
            rel="noreferrer"
          >
            DGAi 公开使用指南
          </a>
          ，按我们的实际能力重新设计；没有验证其登录后的生成效果。
        </p>
      </aside>
      <Dialog
        open={detail !== null}
        onOpenChange={(open) => {
          if (!open) setDetail(null);
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle>{detail.name}</DialogTitle>
                <DialogDescription>{detail.stateDetail}</DialogDescription>
              </DialogHeader>
              <div className="grid gap-3 rounded-xl bg-muted/40 p-4 text-sm leading-6">
                <p>
                  <strong>需要准备：</strong>
                  {detail.input}
                </p>
                <p>
                  <strong>目标交付：</strong>
                  {detail.output}
                  {detail.state === 'planned' && (
                    <span className="text-muted-foreground">
                      （规划目标，尚不能自动交付）
                    </span>
                  )}
                </p>
              </div>
              <ol className="list-decimal space-y-3 pl-6 text-sm leading-6">
                {detail.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
              <p className="rounded-lg border border-amber/30 bg-amber/8 p-3 text-xs leading-6 text-amber-ink">
                {detail.boundary}
              </p>
              <Button
                onClick={() => {
                  go(detail.target);
                  setDetail(null);
                }}
              >
                <BookOpenText />
                {detail.state === 'usable' ? '打开资料工具' : '查看相关工作区'}
                <ArrowRight />
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
