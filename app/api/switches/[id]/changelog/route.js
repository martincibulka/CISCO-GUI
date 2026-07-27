import { NextResponse } from 'next/server';
import { openDb } from '@/lib/db';
import { verifySession, hasPermission } from '@/lib/auth';

// GET /api/switches/[id]/changelog?port=Gi0/1&limit=200
export async function GET(request, { params }) {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const allowed = await hasPermission('view_logs');
  if (!allowed) {
    return NextResponse.json({ error: 'Nedostatočné oprávnenia pre zobrazenie logov' }, { status: 403 });
  }

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const portFilter = searchParams.get('port');
  const limit = Math.min(parseInt(searchParams.get('limit') || '200', 10), 500);

  try {
    const db = await openDb();

    const sw = await db.get('SELECT id, name FROM saved_switches WHERE id = ?', [id]);
    if (!sw) {
      return NextResponse.json({ error: 'Switch not found' }, { status: 404 });
    }

    let query = `
      SELECT id, port_name, field, old_value, new_value, changed_by, source,
             strftime('%d.%m.%Y %H:%M:%S', changed_at) as changed_at
      FROM port_change_log
      WHERE switch_id = ?
    `;
    const args = [id];

    if (portFilter) {
      query += ' AND port_name = ?';
      args.push(portFilter);
    }

    query += ' ORDER BY changed_at DESC LIMIT ?';
    args.push(limit);

    const rows = await db.all(query, args);
    return NextResponse.json({ switch: sw, logs: rows });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
