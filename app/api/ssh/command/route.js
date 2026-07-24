import { NextResponse } from 'next/server';
import { executeCommand } from '@/lib/sshManager';

export async function POST(request) {
  try {
    const { ip_address, command } = await request.json();
    if (!ip_address || !command) {
      return NextResponse.json({ error: 'Missing IP or command' }, { status: 400 });
    }

    const output = await executeCommand(ip_address, command);
    return NextResponse.json({ success: true, output });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
