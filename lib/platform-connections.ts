export const PLATFORM_NAMES = {
  douyin: '抖音',
  xiaohongshu: '小红书',
  channels: '视频号',
} as const;
export type PlatformId = keyof typeof PLATFORM_NAMES;
export const CONNECTION_LABELS = {
  unavailable: '连接服务待接通',
  disconnected: '未连接',
  starting: '正在准备登录',
  waiting_scan: '等待扫码',
  waiting_confirmation: '请在手机上确认',
  needs_verification: '需要本人验证',
  connected: '已连接',
  expired: '登录已过期',
  error: '连接未完成',
} as const;
export type ConnectionStatus = keyof typeof CONNECTION_LABELS;
export type ConnectionCapability = 'not_verified' | 'available' | 'restricted';
export type PlatformConnection = {
  platform: PlatformId;
  status: ConnectionStatus;
  message: string;
  accountLabel?: string;
  verifiedAt?: string;
  capabilities: {
    research: ConnectionCapability;
    publish: ConnectionCapability;
  };
  loginSession?: { id: string; expiresAt: string; qrPath?: string };
};
export type ConnectionsSnapshot = {
  mode: 'not_configured' | 'service' | 'unreachable';
  connections: PlatformConnection[];
};
export type ConnectionAction = 'start' | 'refresh' | 'cancel' | 'disconnect';
export class ConnectionError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function platformId(value: unknown): PlatformId {
  if (typeof value !== 'string' || !Object.hasOwn(PLATFORM_NAMES, value))
    throw new ConnectionError('invalid_platform', '请选择支持的平台。');
  return value as PlatformId;
}
export function sessionId(value: unknown): string {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]{16,100}$/.test(value))
    throw new ConnectionError(
      'invalid_session',
      '登录任务已失效，请重新连接。',
    );
  return value;
}
export function unavailableConnection(
  platform: PlatformId,
): PlatformConnection {
  return {
    platform,
    status: 'unavailable',
    message:
      platform === 'channels'
        ? '当前执行环境不支持视频号连接。此入口保持暂停，不通过其他路径绕过访问限制。'
        : '后台浏览器服务尚未接通，暂时无法在这里生成真实登录二维码。你在其他浏览器的登录不会自动绑定到工作台。',
    capabilities: { research: 'not_verified', publish: 'not_verified' },
  };
}
const MESSAGES: Record<ConnectionStatus, string> = {
  unavailable: '当前平台连接服务尚未就绪。',
  disconnected: '在这里开始连接，使用本人账号完成平台授权。',
  starting: '正在准备专属登录窗口，请稍候。',
  waiting_scan: '请用对应平台的手机 App 扫码。仅在官方 App 中确认你的账号。',
  waiting_confirmation: '扫码已收到，请在手机上确认；正在等待平台返回结果。',
  needs_verification:
    '平台需要本人完成额外验证。当前扫码窗口无法完成这项验证，连接已暂停。',
  connected: '后台已验证账号连接。采集和发布能力仍分别检查。',
  expired: '二维码或账号登录已过期，请重新连接。',
  error: '本次连接未完成，请稍后重新检查。',
};
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new ConnectionError(
      'invalid_service_response',
      '连接服务返回不完整，请稍后重试。',
      502,
    );
  return value as Record<string, unknown>;
}
function recentTimestamp(value: unknown, now: number) {
  if (typeof value !== 'string') return false;
  const time = Date.parse(value);
  return Number.isFinite(time) && time <= now + 30000 && time >= now - 300000;
}
// The executor is a separate service. Never infer connection from a client flag,
// a QR being displayed, or a login observed in the operator's local browser.
export function verifiedConnection(
  value: unknown,
  owner: string,
  platform: PlatformId,
  now = Date.now(),
): PlatformConnection {
  const data = record(value);
  if (data.ownerRef !== owner || data.platform !== platform)
    throw new ConnectionError(
      'connection_owner_mismatch',
      '连接身份校验失败，未显示其他账号的数据。',
      502,
    );
  if (
    typeof data.status !== 'string' ||
    !Object.hasOwn(CONNECTION_LABELS, data.status)
  )
    throw new ConnectionError(
      'invalid_service_response',
      '连接服务返回了未知状态。',
      502,
    );
  const status = data.status as ConnectionStatus;
  const result: PlatformConnection = {
    platform,
    status,
    message: MESSAGES[status],
    capabilities: { research: 'not_verified', publish: 'not_verified' },
  };
  if (status === 'connected') {
    if (
      !recentTimestamp(data.verifiedAt, now) ||
      typeof data.accountLabel !== 'string' ||
      !data.accountLabel.trim() ||
      data.accountLabel.length > 120
    )
      throw new ConnectionError(
        'unverified_connection',
        '服务未提供有效的账号确认，不能标记为已连接。',
        502,
      );
    result.accountLabel = data.accountLabel;
    result.verifiedAt = data.verifiedAt as string;
    const capabilities = record(data.capabilities);
    for (const key of ['research', 'publish'] as const) {
      // Each positive capability requires its own recent verification, not only login.
      const check = capabilities[key];
      if (!check || typeof check !== 'object' || Array.isArray(check)) continue;
      const evidence = check as Record<string, unknown>;
      if (evidence.status === 'restricted')
        result.capabilities[key] = 'restricted';
      if (
        evidence.status === 'available' &&
        recentTimestamp(evidence.verifiedAt, now)
      )
        result.capabilities[key] = 'available';
    }
    return result;
  }
  if (
    [
      'starting',
      'waiting_scan',
      'waiting_confirmation',
      'needs_verification',
    ].includes(status)
  ) {
    const login = record(data.loginSession);
    const id = sessionId(login.id);
    const expires =
      typeof login.expiresAt === 'string' ? Date.parse(login.expiresAt) : NaN;
    if (!Number.isFinite(expires) || expires > now + 15 * 60 * 1000)
      throw new ConnectionError(
        'invalid_expiry',
        '登录有效期不正确，请重新创建登录任务。',
        502,
      );
    if (expires <= now)
      return { ...result, status: 'expired', message: MESSAGES.expired };
    result.loginSession = { id, expiresAt: login.expiresAt as string };
    if (status === 'waiting_scan' && login.qrAvailable === true)
      result.loginSession.qrPath = `/api/platform-connections/qr?platform=${platform}&sessionId=${encodeURIComponent(id)}`;
  }
  return result;
}

export function connectionCommand(value: unknown) {
  const data = record(value);
  const platform = platformId(data.platform);
  if (
    !['start', 'refresh', 'cancel', 'disconnect'].includes(String(data.action))
  )
    throw new ConnectionError('invalid_action', '此连接操作暂不支持。');
  if (
    typeof data.requestId !== 'string' ||
    !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(
      data.requestId,
    )
  )
    throw new ConnectionError(
      'invalid_request_id',
      '请求标识无效，请重新操作。',
    );
  const action = data.action as ConnectionAction;
  return {
    platform,
    action,
    requestId: data.requestId,
    ...(action === 'refresh' || action === 'cancel'
      ? { sessionId: sessionId(data.sessionId) }
      : {}),
  };
}
