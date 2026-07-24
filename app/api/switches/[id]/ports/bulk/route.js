import { NextResponse } from 'next/server';
import { openDb } from '@/lib/db';
import { verifySession } from '@/lib/auth';

export async function POST(request, { params }) {
  const { id } = await params;
  
  if (!id) {
    return NextResponse.json({ error: 'Switch ID is required' }, { status: 400 });
  }

  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const { ports } = data;

    if (!Array.isArray(ports)) {
      return NextResponse.json({ error: 'ports array is required' }, { status: 400 });
    }

    const db = await openDb();

    // Validate if switch exists
    const switchExists = await db.get('SELECT id FROM saved_switches WHERE id = ?', [id]);
    if (!switchExists) {
      return NextResponse.json({ error: 'Switch not found' }, { status: 404 });
    }

    const user = await db.get('SELECT username FROM app_users WHERE id = ?', [session.userId]);
    const username = user ? user.username : 'Unknown';

    // Begin transaction for bulk insert
    await db.exec('BEGIN TRANSACTION');

    try {
      const stmt = await db.prepare(`
        INSERT INTO port_settings (switch_id, port_name, description, status, vlan, port_security, mac_address, last_updated, last_updated_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
        ON CONFLICT(switch_id, port_name) DO UPDATE SET
          description=COALESCE(NULLIF(excluded.description, ''), description),
          status=COALESCE(NULLIF(excluded.status, ''), status),
          vlan=COALESCE(NULLIF(excluded.vlan, ''), vlan),
          last_updated=CURRENT_TIMESTAMP,
          last_updated_by=excluded.last_updated_by
      `);

      for (const port of ports) {
        if (!port.port_name) continue;
        
        // Use empty string to signal to COALESCE that we want to keep the old value if the new value is falsy but wait... 
        // We parsed the values from 'sh int status'. If they are present, we should update them.
        // If they are missing or empty string, maybe we want to keep the DB value? 
        // Actually, if 'sh int status' says vlan is empty (routed), we should update to empty.
        // Wait, COALESCE(NULLIF(excluded.vlan, ''), vlan) means if excluded.vlan is '', keep existing vlan.
        // Is that what we want? Yes, because 'sh int status' doesn't show voice vlans, and if the port is a trunk, vlan is 'trunk'.
        // Let's just use COALESCE so we don't accidentally wipe out database configurations that aren't visible in sh int status.
        // Actually, let's fetch existing for each, or just use COALESCE like above.
        
        // Since we are running in a transaction, let's fetch existing and merge, same as the single endpoint!
        const existing = await db.get('SELECT * FROM port_settings WHERE switch_id = ? AND port_name = ?', [id, port.port_name]);
        
        // For bulk sync from `sh int status`, we update description, status, and vlan ONLY IF they were successfully parsed.
        // Since the parser provides them, we can use them directly. If the parser provided an empty string, we should probably keep the DB value?
        // No, if the description is actually empty on the switch, the DB should be cleared so it matches!
        let finalDesc = port.description !== undefined ? port.description : (existing ? existing.description : "");
        if (existing && existing.description && finalDesc && finalDesc.trim() !== "" && existing.description.startsWith(finalDesc)) {
          finalDesc = existing.description;
        }
        const finalStatus = port.status !== undefined ? port.status : (existing ? existing.status : "");
        const finalVlan = port.vlan !== undefined ? port.vlan : (existing ? existing.vlan : "");
        const finalPortSec = port.port_security !== undefined ? port.port_security : (existing ? existing.port_security : "0");
        const finalMac = port.mac_address !== undefined ? port.mac_address : (existing ? existing.mac_address : "");

        await stmt.run([
          id, 
          port.port_name, 
          finalDesc, 
          finalStatus, 
          finalVlan, 
          finalPortSec, 
          finalMac, 
          username
        ]);
      }
      
      await stmt.finalize();
      await db.exec('COMMIT');
    } catch (e) {
      await db.exec('ROLLBACK');
      throw e;
    }

    return NextResponse.json({ message: 'Bulk port settings saved successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error saving bulk port settings:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
