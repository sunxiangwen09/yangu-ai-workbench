'use client';

import { useState } from 'react';
import {
  ArrowRight,
  Search,
  PencilLine,
  Scissors,
  CalendarDays,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ClientProfileRecord } from '@/lib/client-profile';

export const CURRENT_TEST_LINK = 'https://v.douyin.com/Xrt2L5JgtAA/';
export function StartWorkspace({
  profile,
  draftCount,
  go,
  onResearch,
}: {
  profile: ClientProfileRecord;
  draftCount: number;
  go: (
    view:
      | 'clients'
      | 'topics'
      | 'factory'
      | 'production'
      | 'publish'
      | 'connections',
  ) => void;
  onResearch: (url: string) => void;
}) {
  const [link, setLink] = useState('');
  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm text-muted-foreground">
          {profile.data.brandName || profile.data.workspaceName || '我的工作区'}
        </p>
        <h1 className="mt-2 text-3xl font-semibold">把下一条视频做出来</h1>
        <p className="mt-3 text-base leading-7 text-muted-foreground">
          从你现在的进度开始，不用按顺序做完每一步。
        </p>
      </header>
      <section className="grid gap-4 sm:grid-cols-2" aria-label="创作入口">
        {[
          {
            id: 'topics' as const,
            icon: Search,
            title: '还没想好拍什么',
            desc: '看选题、为什么值得拍，以及参考来源。',
            status: '联网研究需运营者先配置模型服务',
            action: '找选题',
          },
          {
            id: 'factory' as const,
            icon: PencilLine,
            title: '开始写，或者接着改',
            desc: '直接打开连续正文，类型和拍法随时再调整。',
            status: draftCount
              ? '本设备已保存 ' + draftCount + ' 篇稿件'
              : '生成窗口已接入；需后台配置并实测',
            action: draftCount ? '继续写稿' : '打开脚本工作区',
          },
          {
            id: 'production' as const,
            icon: Scissors,
            title: '稿子好了，准备做视频',
            desc: '口播默认不拆分镜，需要时再加辅助画面。',
            status: '自动剪辑待接通',
            action: '查看制作要求',
          },
          {
            id: 'publish' as const,
            icon: CalendarDays,
            title: '成片好了，准备发布',
            desc: '确认内容和账号，再审核发布。',
            status: '平台授权与定时发布待接通',
            action: '查看发布准备',
          },
        ].map((item) => (
          <article
            key={item.id}
            className={
              'surface-card flex flex-col p-5 sm:p-6 ' +
              (item.id === 'factory' ? 'border-ink/25 bg-lime/10' : '')
            }
          >
            <item.icon className="mb-4 size-5 text-ink" />
            <h2 className="text-xl font-semibold">{item.title}</h2>
            <p className="mt-3 text-base leading-7 text-muted-foreground">
              {item.desc}
            </p>
            <p className="mb-5 mt-3 text-sm text-muted-foreground">
              {item.status}
            </p>
            <Button
              className="mt-auto h-11 justify-between"
              variant={item.id === 'factory' ? 'default' : 'outline'}
              onClick={() => go(item.id)}
            >
              {item.action}
              <ArrowRight />
            </Button>
          </article>
        ))}
      </section>
      <details className="surface-card p-5">
        <summary className="cursor-pointer text-base font-medium">
          有参考视频？需要时再拆一下
        </summary>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          研究是可选工具。云端首轮开放抖音单条链接，配置数据与模型服务后再进行真实验证。
        </p>
        <form
          className="mt-4 flex flex-col gap-3 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            if (link.trim()) onResearch(link.trim());
          }}
        >
          <label htmlFor="start-video-link" className="sr-only">
            视频分享链接
          </label>
          <Input
            id="start-video-link"
            value={link}
            onChange={(event) => setLink(event.target.value)}
            placeholder="粘贴视频链接或分享文字"
            className="h-11 text-base"
          />
          <Button
            type="submit"
            className="h-11 shrink-0"
            disabled={!link.trim()}
          >
            打开视频研究
            <ArrowRight />
          </Button>
        </form>
      </details>
      <footer className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
        <span>业务资料和说话习惯，按需要补充即可。</span>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" onClick={() => go('clients')}>
            我的资料
          </Button>
          <Button variant="ghost" onClick={() => go('connections')}>
            账号与连接
          </Button>
        </div>
      </footer>
    </div>
  );
}
