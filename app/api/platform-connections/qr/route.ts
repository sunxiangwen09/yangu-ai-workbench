import {
  connectionFailure,
  connectionQr,
  connectionUser,
} from '@/lib/platform-connections-server';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    const user = await connectionUser();
    return await connectionQr(user.userId, request.url);
  } catch (error) {
    return connectionFailure(error);
  }
}
