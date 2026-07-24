import { NextResponse } from 'next/server';
import { executeCommand } from '@/lib/sshManager';
import { verifySession, hasPermission } from '@/lib/auth';

export async function POST(request) {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { ip_address, command } = await request.json();
    if (!ip_address || !command) {
      return NextResponse.json({ error: 'Missing IP or command' }, { status: 400 });
    }

    const isShowCmd = /^(show|sh|ping|dir|where|pwd|exit|end)\b/i.test(command.trim());
    const allowed = await hasPermission('edit_switches');
    
    if (!allowed && !isShowCmd) {
      return NextResponse.json({ error: 'Nedostatočné oprávnenia pre spúšťanie konfiguračných príkazov' }, { status: 403 });
    }

    const output = await executeCommand(ip_address, command);
    return NextResponse.json({ success: true, output });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
