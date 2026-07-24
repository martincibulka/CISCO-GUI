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
    const roles = await db.all('SELECT id, name FROM app_roles');
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

  try {
    const { name } = await request.json();
    if (!name || name.trim() === "") {
      return NextResponse.json({ error: 'Názov oprávnenia je povinný' }, { status: 400 });
    }

    const db = await openDb();
    const existing = await db.get('SELECT * FROM app_roles WHERE name = ?', [name.trim()]);
    if (existing) {
      return NextResponse.json({ error: 'Oprávnenie s týmto názvom už existuje' }, { status: 400 });
    }

    await db.run('INSERT INTO app_roles (name) VALUES (?)', [name.trim()]);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
