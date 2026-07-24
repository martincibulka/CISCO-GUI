import { NextResponse } from 'next/server';
import { openDb } from '@/lib/db';

export async function GET() {
  try {
    const db = await openDb();
    const switches = await db.all('SELECT * FROM saved_switches ORDER BY name ASC');
    return NextResponse.json(switches);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { name, ip_address, username, password, enable_password } = await request.json();
    if (!name || !ip_address) {
      return NextResponse.json({ error: 'Name and IP address are required' }, { status: 400 });
    }

    const db = await openDb();
    const result = await db.run(
      'INSERT INTO saved_switches (name, ip_address, username, password, enable_password) VALUES (?, ?, ?, ?, ?)',
      [name, ip_address, username || null, password || null, enable_password || null]
    );

    const newSwitch = await db.get('SELECT * FROM saved_switches WHERE id = ?', [result.lastID]);
    return NextResponse.json(newSwitch, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
