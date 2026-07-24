import { NextResponse } from 'next/server';
import { openDb } from '@/lib/db';
import { verifySession } from '@/lib/auth';

export async function PUT(request, { params }) {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const { name } = await request.json();
    if (!name || name.trim() === "") {
      return NextResponse.json({ error: 'Názov oprávnenia nemôže byť prázdny' }, { status: 400 });
    }

    const db = await openDb();
    const role = await db.get('SELECT * FROM app_roles WHERE id = ?', [id]);
    if (!role) {
      return NextResponse.json({ error: 'Oprávnenie neexistuje' }, { status: 404 });
    }

    const existing = await db.get('SELECT * FROM app_roles WHERE name = ? AND id != ?', [name.trim(), id]);
    if (existing) {
      return NextResponse.json({ error: 'Oprávnenie s týmto názvom už existuje' }, { status: 400 });
    }

    await db.run('UPDATE app_roles SET name = ? WHERE id = ?', [name.trim(), id]);
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

  const { id } = await params;

  try {
    const db = await openDb();
    
    const rolesCount = await db.get('SELECT COUNT(*) as count FROM app_roles');
    if (rolesCount.count <= 1) {
      return NextResponse.json({ error: 'Nemožno vymazat posledné oprávnenie' }, { status: 400 });
    }

    await db.run('DELETE FROM app_roles WHERE id = ?', [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
