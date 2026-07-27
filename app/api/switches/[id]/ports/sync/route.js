import { NextResponse } from 'next/server';
import { openDb } from '@/lib/db';
import { verifySession } from '@/lib/auth';

// POST /api/switches/[id]/ports/sync
// Accepts live port data from the switch (parsed sh int status output)
// Compares against stored DB state and logs any discrepancies as 'external' changes.
// Does NOT modify port_settings – only writes to port_change_log.
export async function POST(request, { params }) {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const { ports } = await request.json();
    if (!Array.isArray(ports) || ports.length === 0) {
      return NextResponse.json({ synced: 0 });
    }

    const db = await openDb();

    // Validate switch exists
    const sw = await db.get('SELECT id FROM saved_switches WHERE id = ?', [id]);
    if (!sw) {
      return NextResponse.json({ error: 'Switch not found' }, { status: 404 });
    }

    // Fields we can compare from live sh int status data
    const comparableFields = ['status', 'vlan'];
    let externalChanges = 0;

    for (const livePort of ports) {
      const { port_name, status: liveStatus, vlan: liveVlan } = livePort;
      if (!port_name) continue;

      const stored = await db.get(
        'SELECT status, vlan FROM port_settings WHERE switch_id = ? AND port_name = ?',
        [id, port_name]
      );

      // No stored record yet – nothing to compare against
      if (!stored) continue;

      const liveValues = { status: liveStatus ?? '', vlan: liveVlan ?? '' };
      const storedValues = { status: stored.status ?? '', vlan: stored.vlan ?? '' };

      for (const field of comparableFields) {
        const liveVal = String(liveValues[field] ?? '');
        const storedVal = String(storedValues[field] ?? '');

        if (liveVal !== storedVal && liveVal !== '') {
          // Check if the last log entry for this port+field is already this external change
          // (avoid duplicate logs on every sh int status refresh)
          const lastLog = await db.get(
            `SELECT new_value, source FROM port_change_log
             WHERE switch_id = ? AND port_name = ? AND field = ?
             ORDER BY changed_at DESC LIMIT 1`,
            [id, port_name, field]
          );

          // Only log if the live value is different from last logged new_value
          const alreadyLogged = lastLog && lastLog.new_value === liveVal && lastLog.source === 'external';
          if (!alreadyLogged) {
            await db.run(
              `INSERT INTO port_change_log (switch_id, port_name, field, old_value, new_value, changed_by, source)
               VALUES (?, ?, ?, ?, ?, 'externá zmena', 'external')`,
              [id, port_name, field, storedVal, liveVal]
            );
            externalChanges++;
          }
        }
      }
    }

    return NextResponse.json({ synced: externalChanges });
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
