import { NextResponse } from 'next/server';
import { openDb } from '@/lib/db';
import { verifySession, hasPermission } from '@/lib/auth';

export async function GET() {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = await openDb();
    const roles = await db.all('SELECT id, name, edit_users, edit_switches, edit_roles, view_logs FROM app_roles');
    return NextResponse.json(roles);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const allowed = await hasPermission('edit_roles');
  if (!allowed) {
    return NextResponse.json({ error: 'Nedostatočné oprávnenia pre správu oprávnení' }, { status: 403 });
  }

  try {
    const { name, edit_users, edit_switches, edit_roles, view_logs } = await request.json();
    if (!name || name.trim() === "") {
      return NextResponse.json({ error: 'Názov oprávnenia je povinný' }, { status: 400 });
    }

    const db = await openDb();
    const existing = await db.get('SELECT * FROM app_roles WHERE name = ?', [name.trim()]);
    if (existing) {
      return NextResponse.json({ error: 'Oprávnenie s týmto názvom už existuje' }, { status: 400 });
    }

    await db.run('INSERT INTO app_roles (name, edit_users, edit_switches, edit_roles, view_logs) VALUES (?, ?, ?, ?, ?)',
      [name.trim(), edit_users ? 1 : 0, edit_switches ? 1 : 0, edit_roles ? 1 : 0, view_logs ? 1 : 0]);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
