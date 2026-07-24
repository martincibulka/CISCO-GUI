import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { openDb } from '@/lib/db';
import { verifySession, hasPermission } from '@/lib/auth';

export async function PUT(request, { params }) {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const isSelf = Number(id) === Number(session.userId);

  // Allow self-edit (own username/password). Role changes & editing others require edit_users.
  const allowed = await hasPermission('edit_users');
  if (!isSelf && !allowed) {
    return NextResponse.json({ error: 'Nedostatočné oprávnenia pre správu používateľov' }, { status: 403 });
  }

  try {
    const { username, password, role } = await request.json();
    const db = await openDb();

    const user = await db.get('SELECT * FROM app_users WHERE id = ?', [id]);
    if (!user) {
      return NextResponse.json({ error: 'Používateľ neexistuje' }, { status: 404 });
    }

    // Non-admins can only change their own username/password – not role
    const effectiveRole = (allowed && role) ? role : user.role;

    let query = 'UPDATE app_users SET username = ?, role = ?';
    let args = [username || user.username, effectiveRole || user.role || 'používateľ'];

    if (password) {
      const passwordHash = await bcrypt.hash(password, 10);
      query += ', password_hash = ?';
      args.push(passwordHash);
    }

    query += ' WHERE id = ?';
    args.push(id);

    await db.run(query, args);
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

  const allowed = await hasPermission('edit_users');
  if (!allowed) {
    return NextResponse.json({ error: 'Nedostatočné oprávnenia pre správu používateľov' }, { status: 403 });
  }

  const { id } = await params;

  try {
    const db = await openDb();
    
    const usersCount = await db.get('SELECT COUNT(*) as count FROM app_users');
    if (usersCount.count <= 1) {
      return NextResponse.json({ error: 'Nemožno vymazat posledného používateľa' }, { status: 400 });
    }

    if (Number(id) === Number(session.userId)) {
      return NextResponse.json({ error: 'Nemožno vymazat samého seba' }, { status: 400 });
    }

    await db.run('DELETE FROM app_users WHERE id = ?', [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
