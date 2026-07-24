import { NextResponse } from 'next/server';
import { openDb } from '@/lib/db';
import { verifySession, hasPermission } from '@/lib/auth';

export async function GET() {
  try {
    const db = await openDb();
    const vlans = await db.all('SELECT * FROM vlans ORDER BY vlan_id ASC');
    return NextResponse.json(vlans, { status: 200 });
  } catch (error) {
    console.error('Error fetching VLANs:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request) {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const allowed = await hasPermission('edit_switches');
  if (!allowed) {
    return NextResponse.json({ error: 'Nedostatočné oprávnenia pre správu VLANov' }, { status: 403 });
  }

  try {
    const { vlan_id, name } = await request.json();

    if (!vlan_id || isNaN(Number(vlan_id))) {
      return NextResponse.json({ error: 'Valid vlan_id is required' }, { status: 400 });
    }

    const id = Number(vlan_id);
    if (id < 1 || id > 4094) {
      return NextResponse.json({ error: 'VLAN ID must be between 1 and 4094' }, { status: 400 });
    }

    const db = await openDb();
    await db.run(
      'INSERT INTO vlans (vlan_id, name) VALUES (?, ?)',
      [id, name || '']
    );
    return NextResponse.json({ message: 'VLAN added successfully' }, { status: 201 });
  } catch (error) {
    if (error.message && error.message.includes('UNIQUE')) {
      return NextResponse.json({ error: 'VLAN already exists' }, { status: 409 });
    }
    console.error('Error adding VLAN:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request) {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const allowed = await hasPermission('edit_switches');
  if (!allowed) {
    return NextResponse.json({ error: 'Nedostatočné oprávnenia pre správu VLANov' }, { status: 403 });
  }

  try {
    const { vlan_id } = await request.json();
    if (!vlan_id) {
      return NextResponse.json({ error: 'vlan_id is required' }, { status: 400 });
    }
    const db = await openDb();
    await db.run('DELETE FROM vlans WHERE vlan_id = ?', [Number(vlan_id)]);
    return NextResponse.json({ message: 'VLAN deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting VLAN:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
