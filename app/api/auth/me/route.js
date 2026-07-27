import { NextResponse } from 'next/server';
import { openDb } from '@/lib/db';
import { verifySession } from '@/lib/auth';

export async function GET() {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = await openDb();
    const user = await db.get('SELECT id, username, role FROM app_users WHERE id = ?', [session.userId]);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const role = await db.get('SELECT * FROM app_roles WHERE name = ?', [user.role]);
    const permissions = role ? {
      edit_users: role.edit_users === 1,
      edit_switches: role.edit_switches === 1,
      edit_roles: role.edit_roles === 1,
      view_logs: role.view_logs === 1
    } : {
      edit_users: false,
      edit_switches: false,
      edit_roles: false,
      view_logs: false
    };

    return NextResponse.json({
      userId: user.id,
      username: user.username,
      role: user.role,
      permissions
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
