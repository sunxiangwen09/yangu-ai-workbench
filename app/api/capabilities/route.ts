import { CapabilityError } from '@/lib/capability-protocol';
import {
  bodyOf,
  execute,
  json,
  requireOperator,
  saveCredential,
  state,
} from '@/lib/capability-server';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const user = await requireOperator();
    return json(await state(user.userId));
  } catch (error) {
    return failure(error);
  }
}
export async function POST(request: Request) {
  try {
    const user = await requireOperator(request);
    const body = await bodyOf(request);
    if (body.action === 'configure') {
      await saveCredential(user.userId, body);
      return json({ saved: true });
    }
    return json({ run: await execute(user.userId, body) });
  } catch (error) {
    return failure(error);
  }
}
function failure(error: unknown) {
  return error instanceof CapabilityError
    ? json({ error: error.message, code: error.code }, error.status)
    : json(
        {
          error: '服务暂时不可用，未完成本次操作。',
          code: 'service_unavailable',
        },
        503,
      );
}
