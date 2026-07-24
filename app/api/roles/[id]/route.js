import { NextResponse } from 'next/server';
import { openDb } from '@/lib/db';
import { verifySession, hasPermission } from '@/lib/auth';

export async function PUT(request, { params }) {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const allowed = await hasPermission('edit_roles');
  if (!allowed) {
    return NextResponse.json({ error: 'Nedostatočné oprávnenia pre správu oprávnení' }, { status: 403 });
  }

  const { id } = await params;

  try {
    const { name, edit_users, edit_switches, edit_roles } = await request.json();
    const db = await openDb();
    
    const role = await db.get('SELECT * FROM app_roles WHERE id = ?', [id]);
    if (!role) {
      return NextResponse.json({ error: 'Oprávnenie neexistuje' }, { status: 404 });
    }

    const targetName = name !== undefined ? name.trim() : role.name;
    if (!targetName) {
      return NextResponse.json({ error: 'Názov oprávnenia nemôže byť prázdny' }, { status: 400 });
    }

    const existing = await db.get('SELECT * FROM app_roles WHERE name = ? AND id != ?', [targetName, id]);
    if (existing) {
      return NextResponse.json({ error: 'Oprávnenie s týmto názvom už existuje' }, { status: 400 });
    }

    const editUsersVal = edit_users !== undefined ? (edit_users ? 1 : 0) : role.edit_users;
    const editSwitchesVal = edit_switches !== undefined ? (edit_switches ? 1 : 0) : role.edit_switches;
    const editRolesVal = edit_roles !== undefined ? (edit_roles ? 1 : 0) : role.edit_roles;

    await db.run('UPDATE app_roles SET name = ?, edit_users = ?, edit_switches = ?, edit_roles = ? WHERE id = ?', [targetName, editUsersVal, editSwitchesVal, editRolesVal, id]);
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

  const allowed = await hasPermission('edit_roles');
  if (!allowed) {
    return NextResponse.json({ error: 'Nedostatočné oprávnenia pre správu oprávnení' }, { status: 403 });
  }

  const { id } = await params;

  try {
    const db = await openDb();
    
    const role = await db.get('SELECT * FROM app_roles WHERE id = ?', [id]);
    if (!role) {
      return NextResponse.json({ error: 'Oprávnenie neexistuje' }, { status: 404 });
    }

    if (role.name === 'admin') {
      return NextResponse.json({ error: 'Nemožno vymazať základné oprávnenie admin' }, { status: 400 });
    }

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
