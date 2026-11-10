import { WorkbenchApp } from '@/components/workbench/workbench-app';
import { requireChatGPTUser } from '@/app/chatgpt-auth';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const user = await requireChatGPTUser('/');
  return (
    <WorkbenchApp
      viewer={{ displayName: user.displayName, email: user.email }}
    />
  );
}
