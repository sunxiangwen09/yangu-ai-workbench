import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import {
  ConnectionError,
  connectionCommand,
  platformId,
  sessionId,
  unavailableConnection,
  verifiedConnection,
  type PlatformId,
  type ConnectionsSnapshot,
} from '@/lib/platform-connections';

export const connectionHeaders = {
  'Cache-Control': 'no-store, private',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  Vary: 'Cookie',
};
export function connectionJson(data: unknown, status = 200) {
  return Response.json(data, { status, headers: connectionHeaders });
}
export function connectionFailure(error: unknown) {
  return error instanceof ConnectionError
    ? connectionJson({ error: error.message, code: error.code }, error.status)
    : connectionJson(
        {
          error: '连接服务暂不可用，账号状态未改变。',
          code: 'connection_unavailable',
        },
        503,
      );
}
export async function connectionUser(request?: Request) {
  const user = await getChatGPTUser();
  if (!user)
    throw new ConnectionError('sign_in_required', '请先登录工作台。', 401);
  if (request) {
    if (
      request.headers.get('origin') !== new URL(request.url).origin ||
      request.headers.get('sec-fetch-site') === 'cross-site'
    )
      throw new ConnectionError(
        'invalid_origin',
        '请在工作台内操作账号连接。',
        403,
      );
    if (!request.headers.get('content-type')?.startsWith('application/json'))
      throw new ConnectionError('invalid_type', '请求格式不正确。', 415);
  }
  return user;
}
export async function connectionBody(request: Request) {
  if (Number(request.headers.get('content-length') || 0) > 4096)
    throw new ConnectionError('too_large', '连接请求过大。', 413);
  const raw = await request.text();
  if (raw.length > 4096)
    throw new ConnectionError('too_large', '连接请求过大。', 413);
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw new ConnectionError('invalid_json', '请求格式不正确。');
  }
}
function configured() {
  return Boolean(
    env.PLATFORM_SESSION_SERVICE_URL && env.PLATFORM_SESSION_SERVICE_KEY,
  );
}
function serviceConfig() {
  if (!configured())
    throw new ConnectionError(
      'session_service_not_configured',
      '后台浏览器服务尚未接通，暂时无法生成真实扫码窗口。无需重新登录平台。',
      503,
    );
  const url = new URL(env.PLATFORM_SESSION_SERVICE_URL!);
  const host = url.hostname.toLowerCase();
  // This is a fixed operator-configured service, never a URL supplied by a customer.
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/' ||
    !host.includes('.') ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    /^[\d.]+$/.test(host) ||
    host.includes(':') ||
    host === 'localhost' ||
    env.PLATFORM_SESSION_SERVICE_KEY!.length < 32
  )
    throw new ConnectionError(
      'session_service_config_invalid',
      '后台连接服务配置尚未通过检查。',
      503,
    );
  return { origin: url.origin, key: env.PLATFORM_SESSION_SERVICE_KEY! };
}
async function ownerReference(userId: string, secret: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const data = new TextEncoder().encode(
    'appgprj_6a94b4b6ca888191839695355f7b9e70:platform-session:' + userId,
  );
  return Array.from(
    new Uint8Array(await crypto.subtle.sign('HMAC', key, data)),
    (b) => b.toString(16).padStart(2, '0'),
  ).join('');
}
async function executor(userId: string, path: string, body?: unknown) {
  const config = serviceConfig();
  const owner = await ownerReference(userId, config.key);
  let response: Response;
  try {
    response = await fetch(config.origin + path, {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        Authorization: `Bearer ${config.key}`,
        'X-Workbench-Owner': owner,
        'Content-Type': 'application/json',
        Accept: path.endsWith('/qr') ? 'image/png' : 'application/json',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      redirect: 'error',
      signal: AbortSignal.timeout(12000),
    });
  } catch {
    throw new ConnectionError(
      'session_service_unreachable',
      '连接服务未响应，请稍后检查；未自动重复创建登录任务。',
      503,
    );
  }
  if (!response.ok)
    throw new ConnectionError(
      'session_service_rejected',
      '连接服务未完成请求，状态尚未确认。',
      502,
    );
  return { response, owner };
}
async function boundedBody(response: Response, max: number) {
  if (Number(response.headers.get('content-length') || 0) > max) {
    await response.body?.cancel();
    throw new ConnectionError(
      'response_too_large',
      '连接服务返回过大，已停止读取。',
      502,
    );
  }
  const reader = response.body?.getReader();
  if (!reader)
    throw new ConnectionError('empty_response', '连接服务未返回数据。', 502);
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.byteLength;
      if (size > max) {
        await reader.cancel();
        throw new ConnectionError(
          'response_too_large',
          '连接服务返回过大，已停止读取。',
          502,
        );
      }
      chunks.push(part.value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}
async function platformState(
  userId: string,
  platform: PlatformId,
  command?: ReturnType<typeof connectionCommand>,
) {
  if (platform === 'channels') return unavailableConnection(platform);
  const { response, owner } = await executor(
    userId,
    `/v1/platforms/${platform}/connection`,
    command,
  );
  let data: unknown;
  try {
    data = JSON.parse(
      new TextDecoder().decode(await boundedBody(response, 65536)),
    );
  } catch (error) {
    if (error instanceof ConnectionError) throw error;
    throw new ConnectionError(
      'invalid_service_response',
      '连接服务返回不完整。',
      502,
    );
  }
  return verifiedConnection(data, owner, platform);
}
export async function connectionsState(
  userId: string,
): Promise<ConnectionsSnapshot> {
  const platforms: PlatformId[] = ['douyin', 'xiaohongshu', 'channels'];
  if (!configured())
    return {
      mode: 'not_configured',
      connections: platforms.map(unavailableConnection),
    };
  const connections = await Promise.all(
    platforms.map(async (platform) => {
      try {
        return await platformState(userId, platform);
      } catch (error) {
        return {
          ...unavailableConnection(platform),
          status: 'error' as const,
          message:
            error instanceof ConnectionError
              ? error.message
              : '连接服务暂不可用。',
        };
      }
    }),
  );
  return {
    mode: connections.some((c) => c.status === 'error')
      ? 'unreachable'
      : 'service',
    connections,
  };
}
export async function changeConnection(userId: string, body: unknown) {
  const command = connectionCommand(body);
  if (command.platform === 'channels')
    throw new ConnectionError(
      'platform_restricted',
      unavailableConnection('channels').message,
      409,
    );
  return platformState(userId, command.platform, command);
}
export async function connectionQr(userId: string, url: string) {
  const query = new URL(url).searchParams;
  const platform = platformId(query.get('platform'));
  const id = sessionId(query.get('sessionId'));
  if (platform === 'channels')
    throw new ConnectionError(
      'platform_restricted',
      unavailableConnection('channels').message,
      409,
    );
  const current = await platformState(userId, platform);
  if (
    current.status !== 'waiting_scan' ||
    current.loginSession?.id !== id ||
    !current.loginSession.qrPath
  )
    throw new ConnectionError(
      'qr_not_available',
      '二维码已失效或不属于当前登录任务，请重新检查。',
      409,
    );
  const { response, owner } = await executor(
    userId,
    `/v1/platforms/${platform}/sessions/${id}/qr`,
  );
  if (
    response.headers.get('X-Workbench-Owner') !== owner ||
    response.headers.get('X-Login-Session') !== id ||
    response.headers.get('content-type')?.split(';')[0] !== 'image/png'
  )
    throw new ConnectionError(
      'qr_identity_mismatch',
      '二维码来源校验失败，已停止显示。',
      502,
    );
  const bytes = await boundedBody(response, 512000);
  if (
    ![137, 80, 78, 71, 13, 10, 26, 10].every(
      (byte, index) => bytes[index] === byte,
    )
  )
    throw new ConnectionError(
      'invalid_qr_image',
      '二维码图像不完整，请刷新连接。',
      502,
    );
  return new Response(bytes, {
    headers: {
      ...connectionHeaders,
      'Content-Type': 'image/png',
      'Content-Security-Policy': "default-src 'none'; frame-ancestors 'self'",
    },
  });
}
