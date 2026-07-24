import { NextResponse } from 'next/server';
import { connectSSH } from '@/lib/sshManager';

export async function POST(request) {
  try {
    const { ip_address, username, password } = await request.json();
    if (!ip_address || !username || !password) {
      return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
    }

    await connectSSH(ip_address, username, password);
    return NextResponse.json({ success: true, message: `Connected to ${ip_address}` });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
