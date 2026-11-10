'use client';

import { MessageSquareText, Check, SlidersHorizontal } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  COMMENT_PRESETS,
  getCommentPreset,
  type ResearchPolicy,
} from '@/lib/research-policy';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export function CommentPolicyDialog({
  open,
  onOpenChange,
  value,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: ResearchPolicy;
  onSave: (value: ResearchPolicy) => Promise<void>;
}) {
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const wasOpen = useRef(false);
  useEffect(() => {
    if (open && !wasOpen.current) {
      setDraft(value);
      setError('');
    }
    wasOpen.current = open;
  }, [open, value]);
  const selected = getCommentPreset(draft.preset);
  const save = async () => {
    setSaving(true);
    setError('');
    try {
      await onSave(draft);
      onOpenChange(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : '保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SlidersHorizontal className="size-5" /> 研究范围
          </DialogTitle>
          <DialogDescription>
            保存在当前工作台账号，换设备仍可读取。仅用于新任务，不改变已创建任务。
          </DialogDescription>
        </DialogHeader>
        <div
          className="grid gap-3 sm:grid-cols-3"
          role="group"
          aria-label="评论采集档位"
        >
          {COMMENT_PRESETS.map((preset) => (
            <Button
              key={preset.id}
              variant="outline"
              disabled={saving}
              aria-pressed={draft.preset === preset.id}
              className={`h-auto flex-col items-start gap-2 whitespace-normal p-4 text-left ${draft.preset === preset.id ? 'border-ink bg-ink text-white hover:bg-ink/90 hover:text-white' : ''}`}
              onClick={() => setDraft({ ...draft, preset: preset.id })}
            >
              <span className="flex w-full items-center justify-between text-sm">
                {preset.label}
                {draft.preset === preset.id && <Check className="size-4" />}
              </span>
              <span className="text-xl font-semibold">
                最多 {preset.selectedLimit} 条
              </span>
              <span className="text-sm opacity-65">{preset.description}</span>
            </Button>
          ))}
        </div>
        <div className="space-y-2">
          <label htmlFor="research-max-works" className="text-sm font-semibold">
            博主主页：本次作品上限
          </label>
          <Select
            value={String(draft.maxWorks)}
            disabled={saving}
            onValueChange={(value) => {
              if (value)
                setDraft({
                  ...draft,
                  maxWorks: Number(value) as ResearchPolicy['maxWorks'],
                });
            }}
          >
            <SelectTrigger id="research-max-works" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[10, 30, 100].map((count) => (
                <SelectItem key={count} value={String(count)}>
                  最多 {count} 条作品
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm leading-6 text-muted-foreground">
            按来源返回顺序读取，不保证是全账号最热门作品；单条链接始终只研究 1
            条。
          </p>
        </div>
        <div className="rounded-xl bg-muted/50 p-4 text-sm leading-6">
          <div className="flex items-center gap-2 font-semibold">
            <MessageSquareText className="size-4" /> 本次每条视频
          </div>
          <p className="mt-2">
            最多查看 {selected.candidateLimit} 条候选，保存最多{' '}
            {selected.selectedLimit} 条精选。每个讨论串最多查看{' '}
            {selected.replyLimit} 条回复，回复计入候选总额。
          </p>
          <p className="mt-2 text-muted-foreground">
            过滤重复、纯表情、无实际信息的夸赞或广告，兼顾高赞观点、具体提问、真实经历、异议与购买意向。有价值的评论不足时按实得保存，不凑数。
          </p>
        </div>
        <p className="text-sm leading-6 text-muted-foreground">
          精选范围仅限本次已查看的候选。按可解释规则做初筛，保留原文供你复核；不代表整条视频的最高赞排行或全部用户意见。
        </p>
        {error && (
          <p role="alert" className="text-sm text-coral">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button
            variant="outline"
            disabled={saving}
            onClick={() => onOpenChange(false)}
          >
            取消
          </Button>
          <Button disabled={saving} onClick={() => void save()}>
            {saving ? '正在保存…' : '保存到工作台账号'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
