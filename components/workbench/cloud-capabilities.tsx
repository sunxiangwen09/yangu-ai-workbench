'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { NativeSelect } from '@/components/ui/native-select';
import type {
  CapabilityAction,
  CapabilityRun,
} from '@/lib/capability-protocol';

type Mode = 'configure' | 'collect' | 'search' | 'write' | 'production';
type ServiceState = {
  secureStorageReady: boolean;
  credentials: { provider: string; updated_at: string }[];
  history: CapabilityRun[];
  dailyRequestBudget: number;
};
const labels: Record<string, string> = {
  collect: '链接采集',
  search: '行业研究',
  analyze: '视频拆解',
  script: '口播稿',
  transcribe: '原文转写',
  asr_poll: '转写进度',
};
const statuses: Record<string, string> = {
  running: '处理中 / 等待回执',
  completed: '已返回结果',
  waiting: '仍在转写',
  failed: '未完成',
};
async function readService() {
  const response = await fetch('/api/capabilities', { cache: 'no-store' });
  const data = (await response.json()) as ServiceState & { error?: string };
  if (!response.ok)
    throw Object.assign(new Error(data.error || '后台状态暂时无法读取。'), {
      status: response.status,
    });
  return data;
}

export function CloudCapabilities({
  mode,
  profileId,
  initialUrl = '',
  onConfigure,
}: {
  mode: Mode;
  profileId?: string;
  initialUrl?: string;
  onConfigure?: () => void;
}) {
  const [service, setService] = useState<ServiceState | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [keys, setKeys] = useState({ tikhub: '', bailian: '' });
  const [url, setUrl] = useState(initialUrl);
  const [instructions, setInstructions] = useState('');
  const [consent, setConsent] = useState(false);
  const [sourceId, setSourceId] = useState('');
  const [result, setResult] = useState<CapabilityRun | null>(null);
  const [includeProfile, setIncludeProfile] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const load = async () => {
    const data = await readService();
    setService(data);
    return data;
  };
  useEffect(() => {
    let active = true;
    readService()
      .then((data) => {
        if (active) setService(data);
      })
      .catch((error) => {
        if (active) {
          setMessage(error.message);
          setForbidden(error.status === 401 || error.status === 403);
        }
      });
    return () => {
      active = false;
    };
  }, []);
  const post = async (body: Record<string, unknown>) => {
    const response = await fetch('/api/capabilities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = (await response.json()) as {
      error?: string;
      run: CapabilityRun;
      saved?: boolean;
    };
    if (!response.ok) throw new Error(data.error || '操作未完成。');
    return data;
  };
  const configure = async (provider: 'tikhub' | 'bailian', remove = false) => {
    setBusy(true);
    setMessage('');
    try {
      await post({
        action: 'configure',
        provider,
        key: remove ? undefined : keys[provider],
        remove,
      });
      setKeys((current) => ({ ...current, [provider]: '' }));
      await load();
      setMessage(
        remove
          ? '已移除后台密钥；历史结果保留。'
          : '密钥已在后台加密保存。尚未调用服务，不代表验证通过。',
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '配置未保存。');
    } finally {
      setBusy(false);
    }
  };
  const run = async (action: CapabilityAction) => {
    setBusy(true);
    setMessage('');
    try {
      const data = await post({
        action,
        requestId: crypto.randomUUID(),
        url,
        instructions,
        processingConsent: consent,
        sourceRunId: sourceId || undefined,
        profileId: includeProfile ? profileId : undefined,
      });
      setResult(data.run);
      setSourceId(data.run.id);
      await load();
      setMessage(
        data.run.status === 'failed'
          ? '此前这次请求未完成。为避免重复收费，未重新提交；请核对服务商任务记录。'
          : data.run.status === 'running'
            ? '已有请求尚无最终回执，未重复提交。若长时间未更新，请先核对服务商记录。'
            : data.run.status === 'waiting'
              ? '已保存转写任务。稍后点“查询转写”，不会重新提交。'
              : '已保存本次回执。请核验结果，不代表整条流程已通过。',
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '操作未完成。');
      await load().catch(() => undefined);
    } finally {
      setBusy(false);
    }
  };
  const source = service?.history.find((item) => item.id === sourceId);
  const readyForVideoScript =
    source?.status === 'completed' &&
    (source.result.transcriptReady === true || source.action === 'analyze');
  const has = (provider: string) =>
    service?.credentials.some((item) => item.provider === provider);
  const choose = (id: string) => {
    setSourceId(id);
    setResult(service?.history.find((item) => item.id === id) ?? null);
  };
  if (forbidden)
    return (
      <section className="surface-card mb-6 p-5">
        <p className="text-base">{message}</p>
        <p className="mt-2 text-sm text-muted-foreground">
          本轮为运营者内部验证，尚未对客户开放付费调用。
        </p>
      </section>
    );
  return (
    <section
      className="surface-card mb-6 p-5 sm:p-6"
      aria-label="真实服务操作窗口"
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">
            {
              {
                configure: '后台服务配置',
                collect: '给链接，研究这条视频',
                search: '从真实来源找选题',
                write: '根据资料写口播稿',
                production: '制作与剪辑连接',
              }[mode]
            }
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {mode === 'configure'
              ? '仅运营者可见。以下是可选的外部服务，不是连接平台账号的必填步骤。'
              : '内部实测 · 按实际服务返回显示结果，不使用演示数据补空缺。'}
          </p>
        </div>
        {onConfigure && mode !== 'configure' && (
          <Button variant="outline" onClick={onConfigure}>
            后台服务
          </Button>
        )}
      </header>
      {message && (
        <output className="my-4 block rounded-xl border border-border bg-muted/30 p-4 text-sm leading-6">
          {message}
        </output>
      )}
      {mode === 'configure' ? (
        <div className="mt-5 space-y-5">
          <p className="text-sm leading-6">
            当前优先验证浏览器采集，账号连接请使用下方“我的平台账号”。这里保留此前的外部服务配置；未配置时不会调用，扫码连接不依赖
            TikHub 密钥。
          </p>
          <div className="grid gap-4 lg:grid-cols-2">
            {(['tikhub', 'bailian'] as const).map((provider) => (
              <form
                key={provider}
                className="rounded-xl border border-border p-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  void configure(provider);
                }}
              >
                <h3 className="text-base font-semibold">
                  {provider === 'tikhub'
                    ? 'TikHub · 作品与评论'
                    : '阿里云百炼 · 搜索、转写和写稿'}
                </h3>
                <p className="my-3 text-sm leading-6 text-muted-foreground">
                  {provider === 'tikhub'
                    ? '首轮接抖音单条作品，小红书与视频号仍待适配验收。'
                    : '首轮使用北京地域的千问与 Paraformer；其他地域不会自动切换。'}
                </p>
                <p className="mb-3 text-sm">
                  {has(provider)
                    ? '已保存密钥 · 实测以任务回执为准'
                    : '未配置 · 不会发起付费调用'}
                </p>
                <label
                  htmlFor={'key-' + provider}
                  className="text-sm font-medium"
                >
                  {has(provider) ? '替换后台密钥' : '后台 API Key'}
                </label>
                <Input
                  id={'key-' + provider}
                  type="password"
                  autoComplete="new-password"
                  value={keys[provider]}
                  onChange={(event) =>
                    setKeys((current) => ({
                      ...current,
                      [provider]: event.target.value,
                    }))
                  }
                  className="mt-2 h-11 text-base"
                  placeholder="在此输入，不要发送到聊天中"
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="submit"
                    disabled={
                      busy ||
                      !service?.secureStorageReady ||
                      keys[provider].trim().length < 12
                    }
                  >
                    加密保存
                  </Button>
                  {has(provider) && (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={busy}
                      onClick={() => void configure(provider, true)}
                    >
                      移除密钥
                    </Button>
                  )}
                </div>
              </form>
            ))}
          </div>
          <p className="text-sm leading-6 text-muted-foreground">
            保存不会测试扣费。密钥不写入网页本地存储、不回显；每次实测单独点击。当前每日最多预留
            60
            次外部主请求，模型、转写和搜索另按服务商规则计费，并非金额上限。客户商业上线许可尚未确认。
          </p>
          {!service?.secureStorageReady && (
            <p className="text-sm text-amber-ink">
              安全存储未就绪，暂不能保存；不要在其他普通输入框粘贴密钥。
            </p>
          )}
        </div>
      ) : mode === 'production' ? (
        <div className="mt-5 space-y-4 text-base leading-7">
          <p>
            先用自己的口播原片验证：原文 → 语义删改 → 字幕 →
            成片。固定口播不强制分镜，B-roll 只在帮助理解时加入。
          </p>
          <div className="rounded-xl bg-muted/40 p-4">
            <p className="font-medium">网页剪辑执行器尚未接通</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              ChatCut
              可作为内部试片工具，但本网站还不能直接创建它的剪辑任务。FFmpeg
              云端渲染、素材上传与 MiniMax
              动画仍待验证；这里不会假装已经上传或生成。
            </p>
          </div>
          <a
            className="inline-block text-sm underline underline-offset-4"
            href="https://chatcut.io/docs/agent-plugin"
            target="_blank"
            rel="noreferrer"
          >
            查看剪辑工具的授权与能力说明
          </a>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          <div className="flex flex-wrap gap-3 text-sm">
            <span>采集：{has('tikhub') ? '密钥已保存' : '待后台配置'}</span>
            <span>
              转写与模型：{has('bailian') ? '密钥已保存' : '待后台配置'}
            </span>
          </div>
          {mode === 'collect' && (
            <div>
              <label
                className="text-sm font-medium"
                htmlFor="cloud-source-link"
              >
                作品链接或分享文字
              </label>
              <Input
                id="cloud-source-link"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="粘贴抖音公开作品链接"
                className="mt-2 h-11 text-base"
              />
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                首轮只取单条作品、最多两页一级评论和一个回复线程，精选最多 20
                条。通过后再开放更大范围。
              </p>
            </div>
          )}
          <div>
            <label
              className="text-sm font-medium"
              htmlFor="cloud-task-instructions"
            >
              {mode === 'search'
                ? '行业与想解决的问题'
                : mode === 'write'
                  ? '这条视频想讲什么？'
                  : '补充研究要求（可不填）'}
            </label>
            <Textarea
              id="cloud-task-instructions"
              value={instructions}
              onChange={(event) => setInstructions(event.target.value)}
              maxLength={4000}
              className="mt-2 min-h-28 text-base"
              placeholder={
                mode === 'search'
                  ? '例如：装修公司老板，想拍客户担心增项费用的选题，找近期可信资料。'
                  : '例如：面向中小企业老板，用具体案例讲清楚一个问题，写成约两分钟的连续口播。'
              }
            />
          </div>
          <div>
            <label htmlFor="cloud-source-run" className="text-sm font-medium">
              使用哪份已保存的资料？
            </label>
            <NativeSelect
              id="cloud-source-run"
              className="mt-2 w-full [&_select]:h-11 [&_select]:text-base"
              value={sourceId}
              onChange={(event) => choose(event.target.value)}
            >
              <option value="">不选来源，按当前输入开始</option>
              {service?.history
                .filter((item) =>
                  ['completed', 'waiting'].includes(item.status),
                )
                .map((item) => (
                  <option value={item.id} key={item.id}>
                    {labels[item.action]} · {item.result.title.slice(0, 45)} ·{' '}
                    {item.createdAt.slice(5, 16).replace('T', ' ')}
                  </option>
                ))}
            </NativeSelect>
          </div>
          {profileId && (
            <label
              htmlFor="cloud-include-profile"
              className="flex items-start gap-2 text-sm leading-6"
            >
              <Checkbox
                id="cloud-include-profile"
                checked={includeProfile}
                onCheckedChange={setIncludeProfile}
                className="mt-1 size-4 shrink-0"
              />
              使用当前已云端保存的客户资料（未保存则会提示，不编造客户情况）
            </label>
          )}
          <label
            htmlFor="cloud-processing-consent"
            className="flex items-start gap-2 text-sm leading-6"
          >
            <Checkbox
              id="cloud-processing-consent"
              checked={consent}
              onCheckedChange={setConsent}
              className="mt-1 size-4 shrink-0"
            />
            我有权处理本次资料，同意将所选文本及必要媒体交给配置的服务进行本次研究或生成，并知悉可能产生服务费用。
          </label>
          <div className="flex flex-wrap gap-3">
            {mode === 'collect' && (
              <>
                <Button
                  disabled={busy || !consent || !has('tikhub') || !url.trim()}
                  onClick={() => void run('collect')}
                >
                  1. 采集这条链接
                </Button>
                <Button
                  variant="outline"
                  disabled={
                    busy ||
                    !consent ||
                    !has('bailian') ||
                    source?.action !== 'collect'
                  }
                  onClick={() => void run('transcribe')}
                >
                  2. 提取口播原文
                </Button>
                <Button
                  variant="outline"
                  disabled={
                    busy ||
                    !consent ||
                    !has('bailian') ||
                    !source?.result.taskId
                  }
                  onClick={() => void run('asr_poll')}
                >
                  查询转写
                </Button>
                <Button
                  variant="outline"
                  disabled={
                    busy ||
                    !consent ||
                    !has('bailian') ||
                    source?.result.transcriptReady !== true
                  }
                  onClick={() => void run('analyze')}
                >
                  3. 按原文拆解
                </Button>
                <Button
                  variant="outline"
                  disabled={
                    busy || !consent || !has('bailian') || !readyForVideoScript
                  }
                  onClick={() => void run('script')}
                >
                  4. 写成我的口播稿
                </Button>
              </>
            )}
            {mode === 'search' && (
              <Button
                disabled={
                  busy || !consent || !has('bailian') || !instructions.trim()
                }
                onClick={() => void run('search')}
              >
                查来源并生成选题
              </Button>
            )}
            {mode === 'write' && (
              <Button
                disabled={
                  busy ||
                  !consent ||
                  !has('bailian') ||
                  (!source && !instructions.trim())
                }
                onClick={() => void run('script')}
              >
                生成连续口播稿
              </Button>
            )}
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() =>
                void load().catch((error) => setMessage(error.message))
              }
            >
              {busy ? '处理中…' : '刷新回执'}
            </Button>
          </div>
          <p className="text-sm leading-6 text-muted-foreground">
            配置密钥不等于整条链路验证通过；原文、拆解、口播稿分别保存到当前工作台账号，换设备可读取。采集失败不会自动切换到你的登录账号。
          </p>
        </div>
      )}
      {result && (
        <article
          className="mt-6 rounded-xl border border-border p-4 sm:p-5"
          aria-label="本次真实任务回执"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h3 className="text-lg font-semibold">{result.result.title}</h3>
            <span className="text-sm text-muted-foreground">
              {statuses[result.status] ?? result.status}
            </span>
          </div>
          {result.result.sourceUrl && (
            <a
              href={result.result.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-block break-all text-sm underline"
            >
              打开原始作品
            </a>
          )}
          {result.result.warnings?.map((warning) => (
            <p key={warning} className="mt-3 text-sm leading-6 text-amber-ink">
              {warning}
            </p>
          ))}
          {(result.result.transcript || result.result.text) && (
            <div className="mt-4 whitespace-pre-wrap break-words text-base leading-8">
              {result.result.transcript || result.result.text}
            </div>
          )}
          {!!result.result.sources?.length && (
            <ul className="mt-4 space-y-2">
              {result.result.sources.map((item) => (
                <li key={item.url}>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="break-words text-sm underline"
                  >
                    {item.title}
                  </a>
                </li>
              ))}
            </ul>
          )}
          {!!result.result.comments?.length && (
            <details className="mt-4">
              <summary className="cursor-pointer text-base font-medium">
                评论原句 · {result.result.comments.length} 条
              </summary>
              <div className="mt-3 space-y-3">
                {result.result.comments.map((comment) => (
                  <blockquote
                    key={comment.id}
                    className="border-l-2 border-lime pl-3 text-base leading-7"
                  >
                    {comment.text}
                    <footer className="mt-1 text-sm text-muted-foreground">
                      {comment.likes} 赞 ·{' '}
                      {comment.parentId
                        ? '回复 ' + comment.parentId
                        : '一级评论'}{' '}
                      · ID {comment.id}
                    </footer>
                  </blockquote>
                ))}
              </div>
            </details>
          )}
        </article>
      )}
      {!!service?.history.length && (
        <details className="mt-5">
          <summary className="cursor-pointer text-sm font-medium">
            最近 20 次真实回执
          </summary>
          <div className="mt-3 space-y-2">
            {service.history.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => choose(item.id)}
                className="flex w-full flex-wrap justify-between gap-2 rounded-lg border border-border p-3 text-left text-sm"
              >
                <span>
                  {labels[item.action]} · {item.result.title.slice(0, 45)}
                </span>
                <span className="text-muted-foreground">
                  {statuses[item.status] ?? item.status}
                </span>
              </button>
            ))}
          </div>
        </details>
      )}
    </section>
  );
}
