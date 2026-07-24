import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { openDb } from '@/lib/db';
import { createSession } from '@/lib/auth';

export async function POST(request) {
  console.log("--- LOGIN API HIT ---");
  try {
    const { username, password } = await request.json();
    console.log("Login attempt for user:", username);
    
    console.log("Opening DB...");
    const db = await openDb();
    console.log("DB opened successfully.");
    
    const user = await db.get('SELECT * FROM app_users WHERE username = ?', [username]);
    if (!user) {
      return NextResponse.json({ error: 'Nesprávne meno alebo heslo' }, { status: 401 });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return NextResponse.json({ error: 'Nesprávne meno alebo heslo' }, { status: 401 });
    }

    await createSession(user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
