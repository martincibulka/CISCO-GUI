import Pane from "@/components/Pane";
import { verifySession } from '@/lib/auth';
import { openDb } from '@/lib/db';
import AppHeader from '@/components/AppHeader';
import MiddlePanel from '@/components/MiddlePanel';
import { redirect } from 'next/navigation';
import { getAppVersion } from '@/lib/version';

export default async function Home() {
  const session = await verifySession();
  if (!session) {
    redirect('/login');
  }

  const db = await openDb();
  const user = await db.get('SELECT username FROM app_users WHERE id = ?', [session.userId]);
  const username = user ? user.username : 'Neznámy používateľ';
  const version = getAppVersion();

  return (
    <>
      <AppHeader username={username} version={version} />
      <main className="main-container">
        <Pane title="Left Pane" />
        <MiddlePanel />
        <Pane title="Right Pane" />
      </main>
    </>
  );
}

