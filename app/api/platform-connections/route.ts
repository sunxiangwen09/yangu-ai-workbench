import {
  connectionBody,
  connectionFailure,
  connectionJson,
  connectionUser,
  connectionsState,
  changeConnection,
} from '@/lib/platform-connections-server';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const user = await connectionUser();
    return connectionJson(await connectionsState(user.userId));
  } catch (error) {
    return connectionFailure(error);
  }
}
export async function POST(request: Request) {
  try {
    const user = await connectionUser(request);
    return connectionJson({
      connection: await changeConnection(
        user.userId,
        await connectionBody(request),
      ),
    });
  } catch (error) {
    return connectionFailure(error);
  }
}
