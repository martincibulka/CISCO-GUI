import { NextResponse } from 'next/server';
import { openDb } from '@/lib/db';
import { verifySession } from '@/lib/auth';

export async function GET(request, { params }) {
  const { id } = await params;
  
  if (!id) {
    return NextResponse.json({ error: 'Switch ID is required' }, { status: 400 });
  }

  try {
    const db = await openDb();
    
    // Validate if switch exists
    const switchExists = await db.get('SELECT id FROM saved_switches WHERE id = ?', [id]);
    if (!switchExists) {
      return NextResponse.json({ error: 'Switch not found' }, { status: 404 });
    }

    const ports = await db.all('SELECT * FROM port_settings WHERE switch_id = ?', [id]);
    
    return NextResponse.json(ports, { status: 200 });
  } catch (error) {
    console.error('Error fetching port settings:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

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
    const { port_name, description, status, vlan, port_security, mac_address } = data;

    if (!port_name) {
      return NextResponse.json({ error: 'port_name is required' }, { status: 400 });
    }

    const db = await openDb();

    // Validate if switch exists
    const switchExists = await db.get('SELECT id FROM saved_switches WHERE id = ?', [id]);
    if (!switchExists) {
      return NextResponse.json({ error: 'Switch not found' }, { status: 404 });
    }

    const user = await db.get('SELECT username FROM app_users WHERE id = ?', [session.userId]);
    const username = user ? user.username : 'Unknown';

    // Fetch existing to allow partial updates
    const existing = await db.get('SELECT * FROM port_settings WHERE switch_id = ? AND port_name = ?', [id, port_name]);

    const finalDesc = description !== undefined ? description : (existing ? existing.description : "");
    const finalStatus = status !== undefined ? status : (existing ? existing.status : "");
    const finalVlan = vlan !== undefined ? vlan : (existing ? existing.vlan : "");
    const finalPortSec = port_security !== undefined ? port_security : (existing ? existing.port_security : "0");
    const finalMac = mac_address !== undefined ? mac_address : (existing ? existing.mac_address : "");

    // Upsert the port settings
    const result = await db.run(`
      INSERT INTO port_settings (switch_id, port_name, description, status, vlan, port_security, mac_address, last_updated, last_updated_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
      ON CONFLICT(switch_id, port_name) DO UPDATE SET
        description=excluded.description,
        status=excluded.status,
        vlan=excluded.vlan,
        port_security=excluded.port_security,
        mac_address=excluded.mac_address,
        last_updated=CURRENT_TIMESTAMP,
        last_updated_by=excluded.last_updated_by
    `, [id, port_name, finalDesc, finalStatus, finalVlan, finalPortSec, finalMac, username]);

    return NextResponse.json({ message: 'Port settings saved successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error saving port settings:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
