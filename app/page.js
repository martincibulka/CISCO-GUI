import Pane from "@/components/Pane";
import { verifySession } from '@/lib/auth';
import { openDb } from '@/lib/db';
import UserMenu from '@/components/UserMenu';
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
      <header className="app-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="app-title">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
            <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
            <line x1="6" y1="6" x2="6.01" y2="6"></line>
            <line x1="6" y1="18" x2="6.01" y2="18"></line>
          </svg>
          Cisco Switch Manager
          <span className="app-version">{version}</span>
        </h1>
        <UserMenu username={username} />
      </header>
      <main className="main-container">
        <Pane title="Left Pane" />
        <MiddlePanel />
        <Pane title="Right Pane" />
      </main>
    </>
  );
}

