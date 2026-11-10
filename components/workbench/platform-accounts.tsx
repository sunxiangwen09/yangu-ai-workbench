'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  Cloud,
  Link2,
  LoaderCircle,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Unplug,
  UserRound,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  CONNECTION_LABELS,
  PLATFORM_NAMES,
  type ConnectionStatus,
  type ConnectionsSnapshot,
  type PlatformConnection,
  type PlatformId,
} from '@/lib/platform-connections';

const PLATFORMS: { id: PlatformId; mark: string; color: string }[] = [
  { id: 'douyin', mark: '抖', color: 'bg-ink text-white' },
  { id: 'xiaohongshu', mark: '红', color: 'bg-[#e83c54] text-white' },
  { id: 'channels', mark: '视', color: 'bg-[#f39724] text-white' },
];
const LOGIN_STATES: ConnectionStatus[] = [
  'starting',
  'waiting_scan',
  'waiting_confirmation',
  'needs_verification',
];
const CAPABILITY_LABELS = {
  not_verified: '尚未验证',
  available: '可用',
  restricted: '暂不可用',
} as const;

function hasExpired(connection: PlatformConnection | undefined, now: number) {
  const expiresAt = connection?.loginSession?.expiresAt;
  if (!expiresAt) return false;
  const expiry = Date.parse(expiresAt);
  return !Number.isFinite(expiry) || expiry <= now;
}

// The login image must come from the workbench's authenticated proxy.
function safeQrPath(path: string | undefined) {
  if (
    !path ||
    !/^\/api\/platform-connections\/qr\?platform=(douyin|xiaohongshu|channels)&sessionId=[a-zA-Z0-9_-]{16,100}$/.test(
      path,
    )
  ) {
    return undefined;
  }
  return path;
}

export function PlatformAccounts({
  viewer,
}: {
  viewer: { displayName: string; email: string };
}) {
  const [selected, setSelected] = useState<PlatformId | null>(null);
  const [snapshot, setSnapshot] = useState<ConnectionsSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [visible, setVisible] = useState(true);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [failedQr, setFailedQr] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const currentSnapshot = useRef<ConnectionsSnapshot | null>(null);
  const request = useRef<AbortController | null>(null);
  const generation = useRef(0);

  const abortRequest = useCallback(() => {
    generation.current += 1;
    request.current?.abort();
    request.current = null;
    setChecking(false);
    setPending(null);
  }, []);

  const refreshStatus = useCallback(async () => {
    if (request.current) return;
    const controller = new AbortController();
    const version = generation.current;
    request.current = controller;
    setChecking(true);
    try {
      const response = await fetch('/api/platform-connections', {
        credentials: 'same-origin',
        cache: 'no-store',
        signal: AbortSignal.any([
          controller.signal,
          AbortSignal.timeout(15000),
        ]),
      });
      const result = (await response.json()) as ConnectionsSnapshot & {
        error?: string;
      };
      if (!response.ok)
        throw new Error(result.error || '暂时无法检查连接，请稍后重试。');
      if (!Array.isArray(result.connections))
        throw new Error('连接状态未能读取，请重试。');
      if (controller.signal.aborted || version !== generation.current) return;
      currentSnapshot.current = result;
      setSnapshot(result);
      setError(null);
      setNow(Date.now());
    } catch (cause) {
      if (controller.signal.aborted || version !== generation.current) return;
      currentSnapshot.current = null;
      setSnapshot(null);
      setError(
        cause instanceof Error
          ? cause.message
          : '暂时无法检查连接，请稍后重试。',
      );
    } finally {
      if (version === generation.current && request.current === controller) {
        request.current = null;
        setChecking(false);
      }
    }
  }, []);

  useEffect(() => {
    const updateVisibility = () =>
      setVisible(document.visibilityState === 'visible');
    updateVisibility();
    document.addEventListener('visibilitychange', updateVisibility);
    return () =>
      document.removeEventListener('visibilitychange', updateVisibility);
  }, []);

  useEffect(() => {
    abortRequest();
    if (!visible) return;
    if (!selected && currentSnapshot.current) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    void refreshStatus();
    // No interval: each check finishes before the next five-second wait starts.
    const poll = async () => {
      if (stopped || !selected) return;
      const entry = currentSnapshot.current?.connections.find(
        (item) => item.platform === selected,
      );
      if (
        entry &&
        LOGIN_STATES.includes(entry.status) &&
        !hasExpired(entry, Date.now())
      ) {
        await refreshStatus();
      }
      if (!stopped) timer = setTimeout(poll, 5000);
    };
    if (selected) timer = setTimeout(poll, 5000);
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      abortRequest();
    };
  }, [selected, visible, abortRequest, refreshStatus]);

  useEffect(() => {
    if (!selected || !visible) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [selected, visible]);

  const performAction = async (
    action: 'start' | 'refresh' | 'cancel' | 'disconnect',
  ) => {
    if (!selected || pending) return;
    abortRequest();
    const platform = selected;
    const entry = currentSnapshot.current?.connections.find(
      (item) => item.platform === platform,
    );
    const controller = new AbortController();
    const version = generation.current;
    request.current = controller;
    setPending(action);
    setError(null);
    setFailedQr(null);
    try {
      const response = await fetch('/api/platform-connections', {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.any([
          controller.signal,
          AbortSignal.timeout(15000),
        ]),
        body: JSON.stringify({
          action,
          platform,
          sessionId: entry?.loginSession?.id,
          requestId: crypto.randomUUID(),
        }),
      });
      const result = (await response.json()) as {
        connection?: PlatformConnection;
        error?: string;
      };
      if (!response.ok)
        throw new Error(result.error || '操作未完成，请检查连接后重试。');
      if (result.connection?.platform !== platform)
        throw new Error('返回的账号连接不匹配，请重新检查。');
      if (controller.signal.aborted || version !== generation.current) return;
      const previous = currentSnapshot.current;
      if (previous) {
        const next = {
          ...previous,
          connections: previous.connections.map((item) =>
            item.platform === platform ? result.connection! : item,
          ),
        };
        currentSnapshot.current = next;
        setSnapshot(next);
      }
      setConfirmDisconnect(false);
      setNow(Date.now());
    } catch (cause) {
      if (controller.signal.aborted || version !== generation.current) return;
      setError(
        cause instanceof Error ? cause.message : '操作未完成，请稍后重试。',
      );
    } finally {
      if (version === generation.current && request.current === controller) {
        request.current = null;
        setPending(null);
      }
    }
  };

  const openPlatform = (platform: PlatformId) => {
    abortRequest();
    setError(null);
    setFailedQr(null);
    setConfirmDisconnect(false);
    setNow(Date.now());
    setSelected(platform);
  };
  const connection = snapshot?.connections.find(
    (entry) => entry.platform === selected,
  );
  const expired = hasExpired(connection, now);
  const status: ConnectionStatus | undefined =
    expired && connection && LOGIN_STATES.includes(connection.status)
      ? 'expired'
      : connection?.status;
  const loginActive = status !== undefined && LOGIN_STATES.includes(status);
  const qrPath =
    visible &&
    !error &&
    pending !== 'refresh' &&
    status === 'waiting_scan' &&
    !expired
      ? safeQrPath(connection?.loginSession?.qrPath)
      : undefined;
  const qrId = connection?.loginSession?.id;
  const actionDisabled =
    Boolean(pending) ||
    snapshot?.mode === 'not_configured' ||
    !connection ||
    status === 'unavailable';

  return (
    <section className="surface-card mt-7 overflow-hidden p-0">
      <div className="flex flex-col gap-4 border-b border-border bg-ink p-5 text-white sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Cloud className="size-5 text-lime" /> 我的平台账号
          </h2>
          <p className="mt-2 text-sm leading-6 text-white/70">
            在工作台内连接和管理账号，采集与发布权限分别检查。
          </p>
        </div>
        <div className="min-w-0 rounded-xl bg-white/8 px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <UserRound className="size-4" /> {viewer.displayName}
          </div>
          <p className="mt-1 break-all text-sm text-white/60">
            当前工作台账号 · {viewer.email}
          </p>
        </div>
      </div>
      <div className="p-5">
        {snapshot?.mode !== 'service' && (
          <div
            className="rounded-xl border border-amber/30 bg-amber/8 p-4 text-sm leading-6"
            role="status"
          >
            <p className="font-semibold">
              {!snapshot
                ? '正在检查账号连接'
                : snapshot.mode === 'unreachable'
                  ? '连接服务暂时不可用'
                  : '站内扫码服务尚未接通'}
            </p>
            <p className="mt-1 text-muted-foreground">
              在旁边的网站登录，不会自动绑定到工作台。这里仅显示服务实际确认的连接，不会生成演示二维码。
            </p>
          </div>
        )}
        {!selected && error && (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          {PLATFORMS.map((platform) => {
            const entry = snapshot?.connections.find(
              (item) => item.platform === platform.id,
            );
            const entryStatus =
              entry &&
              hasExpired(entry, now) &&
              LOGIN_STATES.includes(entry.status)
                ? 'expired'
                : entry?.status;
            return (
              <article
                key={platform.id}
                className="rounded-xl border border-border p-4"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`grid size-10 place-items-center rounded-xl font-semibold ${platform.color}`}
                  >
                    {platform.mark}
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-semibold">
                      {PLATFORM_NAMES[platform.id]}
                    </h3>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                      {entryStatus === 'connected' && (
                        <CheckCircle2 className="size-3.5 text-emerald-700" />
                      )}
                      {entryStatus
                        ? CONNECTION_LABELS[entryStatus]
                        : '尚未读取状态'}
                    </p>
                  </div>
                </div>
                <dl className="my-4 space-y-2 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="shrink-0 text-muted-foreground">平台账号</dt>
                    <dd className="break-all text-right">
                      {entry?.accountLabel || '尚未确认'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">研究采集</dt>
                    <dd>
                      {
                        CAPABILITY_LABELS[
                          entry?.capabilities.research || 'not_verified'
                        ]
                      }
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">审核后发布</dt>
                    <dd>
                      {
                        CAPABILITY_LABELS[
                          entry?.capabilities.publish || 'not_verified'
                        ]
                      }
                    </dd>
                  </div>
                </dl>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => openPlatform(platform.id)}
                >
                  <Link2 />{' '}
                  {entryStatus === 'connected' ? '管理连接' : '连接账号'}
                </Button>
              </article>
            );
          })}
        </div>
        <div className="mt-4 grid gap-3 text-sm leading-6 text-muted-foreground md:grid-cols-3">
          <p className="flex items-start gap-2">
            <LockKeyhole className="mt-1 size-4 shrink-0" />
            不需要在这里填写平台密码，也不需要复制 Cookie。
          </p>
          <p className="flex items-start gap-2">
            <Smartphone className="mt-1 size-4 shrink-0" />
            跨设备复用需要云端连接服务验证通过；仅在本机登录还不能复用。
          </p>
          <p className="flex items-start gap-2">
            <ShieldCheck className="mt-1 size-4 shrink-0" />
            账号连接后仍分别验证采集和发布，不会自动替你发布内容。
          </p>
        </div>
      </div>
      <Dialog
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) {
            abortRequest();
            setSelected(null);
            setConfirmDisconnect(false);
            setFailedQr(null);
          }
        }}
      >
        <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selected ? PLATFORM_NAMES[selected] : '平台'} · 账号连接
            </DialogTitle>
            <DialogDescription>
              连接过程留在工作台内。由你本人扫码确认，系统随后检查登录结果。
            </DialogDescription>
          </DialogHeader>
          <div
            className="rounded-xl border border-border bg-muted/30 p-4"
            role="status"
            aria-live="polite"
          >
            <p className="flex items-center gap-2 font-semibold">
              {(checking || pending || status === 'starting') && (
                <LoaderCircle className="size-4 animate-spin" />
              )}
              {status === 'connected' && (
                <CheckCircle2 className="size-4 text-emerald-700" />
              )}
              {status ? CONNECTION_LABELS[status] : '正在检查连接'}
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {expired && status === 'expired'
                ? '本次二维码已过期，已停止展示。请刷新后重新扫码。'
                : connection?.message || '正在读取该平台的真实连接状态。'}
            </p>
            {connection?.accountLabel && (
              <p className="mt-2 break-all text-sm">
                账号：{connection.accountLabel}
              </p>
            )}
          </div>
          {qrPath && qrId && failedQr !== qrId && (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-border p-4">
              {/* The protected image is deliberately never copied to browser storage. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={qrId}
                src={qrPath}
                alt={`用${selected ? PLATFORM_NAMES[selected] : '平台'}手机端扫描此二维码登录`}
                className="aspect-square w-52 max-w-full rounded-lg bg-white object-contain p-2"
                referrerPolicy="no-referrer"
                onError={() => setFailedQr(qrId)}
              />
              <p className="text-center text-sm leading-6">
                用手机扫码，并在手机上确认登录。
              </p>
              <p className="text-xs text-muted-foreground">
                本次二维码剩余{' '}
                {Math.max(
                  0,
                  Math.ceil(
                    (Date.parse(connection!.loginSession!.expiresAt) - now) /
                      1000,
                  ),
                )}{' '}
                秒
              </p>
            </div>
          )}
          {status === 'waiting_scan' && (!qrPath || failedQr === qrId) && (
            <p
              role="alert"
              className="rounded-xl bg-amber/8 p-4 text-sm leading-6"
            >
              二维码暂时无法显示，请刷新二维码。不会用示例图片代替。
            </p>
          )}
          {status === 'waiting_confirmation' && (
            <p className="text-sm leading-6">
              已进入确认步骤，请查看手机提示。这里会自动检查结果，无需手动标记“已登录”。
            </p>
          )}
          {status === 'needs_verification' && (
            <p className="text-sm leading-6">
              平台要求额外验证，请由你本人完成手机端提示。如果手机没有提示，本通道暂时无法继续，不会自动绕过验证。
            </p>
          )}
          {status === 'connected' && connection && (
            <div className="grid grid-cols-2 gap-3 rounded-xl bg-muted/30 p-4 text-sm">
              <p>
                研究采集：{CAPABILITY_LABELS[connection.capabilities.research]}
              </p>
              <p>
                审核后发布：{CAPABILITY_LABELS[connection.capabilities.publish]}
              </p>
            </div>
          )}
          {error && (
            <p role="alert" className="text-sm leading-6 text-destructive">
              {error}
            </p>
          )}
          {confirmDisconnect ? (
            <div className="rounded-xl border border-destructive/20 p-4 text-sm leading-6">
              <p>
                确认断开{selected ? PLATFORM_NAMES[selected] : '平台'}
                连接？之后需要重新连接才能使用相应的账号能力。
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  variant="destructive"
                  disabled={Boolean(pending)}
                  onClick={() => void performAction('disconnect')}
                >
                  确认断开
                </Button>
                <Button
                  variant="outline"
                  disabled={Boolean(pending)}
                  onClick={() => setConfirmDisconnect(false)}
                >
                  保留连接
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {status !== 'connected' && !loginActive && (
                <Button
                  disabled={actionDisabled}
                  onClick={() =>
                    void performAction(
                      status === 'expired' && connection?.loginSession
                        ? 'refresh'
                        : 'start',
                    )
                  }
                >
                  <Link2 />
                  {status === 'expired'
                    ? '刷新二维码'
                    : status === 'error'
                      ? '重新连接'
                      : '开始扫码连接'}
                </Button>
              )}
              {loginActive && status !== 'starting' && (
                <Button
                  disabled={actionDisabled}
                  onClick={() => void performAction('refresh')}
                >
                  <RefreshCw />
                  刷新二维码
                </Button>
              )}
              <Button
                variant="outline"
                disabled={Boolean(pending) || checking}
                onClick={() => void refreshStatus()}
              >
                <RefreshCw className={checking ? 'animate-spin' : ''} />
                检查连接
              </Button>
              {loginActive && (
                <Button
                  variant="ghost"
                  disabled={Boolean(pending)}
                  onClick={() => void performAction('cancel')}
                >
                  取消本次连接
                </Button>
              )}
              {status === 'connected' && (
                <Button
                  variant="ghost"
                  disabled={Boolean(pending)}
                  onClick={() => setConfirmDisconnect(true)}
                >
                  <Unplug />
                  断开连接
                </Button>
              )}
            </div>
          )}
          <p className="text-xs leading-5 text-muted-foreground">
            关闭窗口只会停止检查，不会解绑账号。首次扫码建议用电脑或平板显示二维码，再用手机扫描；同一手机不能直接扫描自己的屏幕。
          </p>
        </DialogContent>
      </Dialog>
    </section>
  );
}
