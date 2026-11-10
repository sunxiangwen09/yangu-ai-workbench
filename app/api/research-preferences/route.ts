import { getChatGPTUser } from '@/app/chatgpt-auth';
import { parseResearchPolicy } from '@/lib/research-policy';
import {
  readResearchPreferences,
  writeResearchPreferences,
} from '@/lib/research-preferences-db';

export const dynamic = 'force-dynamic';
const response = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie' },
  });

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return response({ error: '请先登录工作台' }, 401);
  try {
    return response(await readResearchPreferences(user.userId));
  } catch {
    console.error('Research preferences read failed');
    return response({ error: '暂时无法读取云端研究范围，请稍后重试' }, 503);
  }
}

export async function PUT(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return response({ error: '请先登录工作台' }, 401);
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin)
    return response({ error: '请从工作台内保存设置' }, 403);
  if (!request.headers.get('content-type')?.startsWith('application/json'))
    return response({ error: '需要 JSON 格式' }, 415);
  if (Number(request.headers.get('content-length') || 0) > 2048)
    return response({ error: '提交内容过大' }, 413);
  let input: Record<string, unknown>;
  try {
    const text = await request.text();
    if (text.length > 2048) return response({ error: '提交内容过大' }, 413);
    const value: unknown = JSON.parse(text);
    if (!value || typeof value !== 'object' || Array.isArray(value))
      return response({ error: '设置格式不正确' }, 400);
    input = value as Record<string, unknown>;
  } catch {
    return response({ error: '设置格式不正确' }, 400);
  }
  const policy = parseResearchPolicy(input.policy);
  const revision = input.expectedRevision;
  if (
    !policy ||
    typeof revision !== 'number' ||
    !Number.isSafeInteger(revision) ||
    revision < 0 ||
    Object.keys(input).some(
      (key) => !['policy', 'expectedRevision'].includes(key),
    )
  ) {
    return response({ error: '请选择有效档位与作品范围' }, 400);
  }
  try {
    if (!(await writeResearchPreferences(user.userId, policy, revision)))
      return response(
        { error: '研究范围已在另一设备更新，请重新读取后再保存' },
        409,
      );
    return response({ policy, revision: revision + 1 });
  } catch {
    console.error('Research preferences write failed');
    return response({ error: '未确认云端保存结果，请重新读取范围后再试' }, 503);
  }
}
