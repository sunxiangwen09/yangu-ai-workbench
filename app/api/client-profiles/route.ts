import { getChatGPTUser } from '@/app/chatgpt-auth';
import {
  calculateClientProfileReadiness,
  parseClientProfileData,
  type ClientProfileRecord,
  type ClientProfileStatus,
} from '@/lib/client-profile';
import {
  findClientProfileRow,
  insertClientProfileRow,
  listClientProfileRows,
  updateClientProfileRow,
  type ClientProfileRow,
} from '@/lib/client-profiles-db';

export const dynamic = 'force-dynamic';

const ALLOWED_STATUSES = new Set<ClientProfileStatus>([
  'in_progress',
  'minimum_ready',
  'complete',
  'update_required',
]);

function rowToRecord(row: ClientProfileRow): ClientProfileRecord | null {
  let raw: unknown;
  try {
    raw = JSON.parse(row.profile_json);
  } catch {
    return null;
  }
  const parsed = parseClientProfileData(raw);
  if (!parsed.data || !ALLOWED_STATUSES.has(row.status)) return null;
  return {
    id: row.id,
    status: row.status,
    profileVersion: row.profile_version,
    data: parsed.data,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function parseBody(request: Request): Promise<
  | {
      data: NonNullable<ReturnType<typeof parseClientProfileData>['data']>;
      status: ClientProfileStatus;
      id: string | null;
      expectedVersion: number | null;
    }
  | Response
> {
  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > 96_000) {
    return Response.json({ error: '客户档案内容过大' }, { status: 413 });
  }
  const text = await request.text();
  if (text.length > 96_000) {
    return Response.json({ error: '客户档案内容过大' }, { status: 413 });
  }
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return Response.json({ error: '提交内容格式不正确' }, { status: 400 });
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return Response.json({ error: '提交内容格式不正确' }, { status: 400 });
  }
  const input = body as Record<string, unknown>;
  const parsed = parseClientProfileData(input.data);
  if (!parsed.data) {
    return Response.json(
      { error: parsed.errors[0] ?? '客户档案字段不正确' },
      { status: 400 },
    );
  }
  if (
    typeof input.status !== 'string' ||
    !ALLOWED_STATUSES.has(input.status as ClientProfileStatus)
  ) {
    return Response.json({ error: '客户档案状态不正确' }, { status: 400 });
  }
  const status = input.status as ClientProfileStatus;
  if (
    ['minimum_ready', 'complete'].includes(status) &&
    !calculateClientProfileReadiness(parsed.data).minimumReady
  ) {
    return Response.json(
      { error: '请先回答首次建档中的必填问题' },
      { status: 400 },
    );
  }

  return {
    data: parsed.data,
    status,
    id: typeof input.id === 'string' ? input.id : null,
    expectedVersion:
      typeof input.expectedVersion === 'number' &&
      Number.isInteger(input.expectedVersion)
        ? input.expectedVersion
        : null,
  };
}

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) {
    return Response.json({ error: '请先登录后读取客户档案' }, { status: 401 });
  }
  const result = await listClientProfileRows(user.userId);
  const profiles = result.results
    .map(rowToRecord)
    .filter((profile): profile is ClientProfileRecord => profile !== null);
  return Response.json({ profiles });
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) {
    return Response.json({ error: '请先登录后创建客户档案' }, { status: 401 });
  }
  const parsed = await parseBody(request);
  if (parsed instanceof Response) return parsed;
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const record: ClientProfileRecord = {
    id,
    status: parsed.status,
    profileVersion: 1,
    data: parsed.data,
    createdAt: now,
    updatedAt: now,
  };
  await insertClientProfileRow({
    id,
    ownerUserId: user.userId,
    data: parsed.data,
    status: parsed.status,
    now,
  });
  return Response.json({ profile: record }, { status: 201 });
}

export async function PUT(request: Request) {
  const user = await getChatGPTUser();
  if (!user) {
    return Response.json({ error: '请先登录后保存客户档案' }, { status: 401 });
  }
  const parsed = await parseBody(request);
  if (parsed instanceof Response) return parsed;
  if (!parsed.id || !/^[0-9a-f-]{36}$/i.test(parsed.id)) {
    return Response.json({ error: '客户档案标识不正确' }, { status: 400 });
  }
  if (parsed.expectedVersion === null || parsed.expectedVersion < 1) {
    return Response.json(
      { error: '缺少有效档案版本，请重新读取后保存' },
      { status: 400 },
    );
  }
  const current = await findClientProfileRow(parsed.id, user.userId);
  if (!current) {
    return Response.json({ error: '没有找到这个客户档案' }, { status: 404 });
  }
  if (
    parsed.expectedVersion !== null &&
    parsed.expectedVersion !== current.profile_version
  ) {
    return Response.json(
      { error: '档案已在其他页面更新，请刷新后再保存' },
      { status: 409 },
    );
  }

  // Drafts also require a new revision: two devices may edit the same draft.
  // Otherwise the second writer can silently overwrite the first at version 1.
  const nextVersion = current.profile_version + 1;
  const now = new Date().toISOString();
  const result = await updateClientProfileRow({
    id: parsed.id,
    ownerUserId: user.userId,
    expectedVersion: current.profile_version,
    nextVersion,
    data: parsed.data,
    status: parsed.status,
    now,
  });
  if (!result.meta.changes) {
    return Response.json(
      { error: '档案已发生变化，请刷新后重试' },
      { status: 409 },
    );
  }

  return Response.json({
    profile: {
      id: parsed.id,
      status: parsed.status,
      profileVersion: nextVersion,
      data: parsed.data,
      createdAt: current.created_at,
      updatedAt: now,
    } satisfies ClientProfileRecord,
  });
}
