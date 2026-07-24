import { NextResponse } from 'next/server';
import { openDb } from '@/lib/db';
import { verifySession, hasPermission } from '@/lib/auth';

export async function PUT(request, { params }) {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const allowed = await hasPermission('edit_switches');
  if (!allowed) {
    return NextResponse.json({ error: 'Nedostatočné oprávnenia pre správu switchov' }, { status: 403 });
  }

  try {
    const { id } = await params;
    const { name, ip_address, username, password, enable_password } = await request.json();
    if (!name || !ip_address) {
      return NextResponse.json({ error: 'Name and IP address are required' }, { status: 400 });
    }

    const db = await openDb();
    await db.run(
      'UPDATE saved_switches SET name = ?, ip_address = ?, username = ?, password = ?, enable_password = ? WHERE id = ?',
      [name, ip_address, username || null, password || null, enable_password || null, id]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const allowed = await hasPermission('edit_switches');
  if (!allowed) {
    return NextResponse.json({ error: 'Nedostatočné oprávnenia pre správu switchov' }, { status: 403 });
  }

  try {
    const { id } = await params;
    const db = await openDb();
    await db.run('DELETE FROM saved_switches WHERE id = ?', [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
