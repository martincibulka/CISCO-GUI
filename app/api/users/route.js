import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { openDb } from '@/lib/db';
import { verifySession } from '@/lib/auth';

export async function GET() {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = await openDb();
    const users = await db.all('SELECT id, username FROM app_users');
    return NextResponse.json(users);
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
    const { username, password } = await request.json();
    if (!username || !password) {
      return NextResponse.json({ error: 'Meno a heslo sú povinné' }, { status: 400 });
    }

    const db = await openDb();
    const existing = await db.get('SELECT * FROM app_users WHERE username = ?', [username]);
    if (existing) {
      return NextResponse.json({ error: 'Používateľ s týmto menom už existuje' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await db.run('INSERT INTO app_users (username, password_hash) VALUES (?, ?)', [username, passwordHash]);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
