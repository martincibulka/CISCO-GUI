import { NextResponse } from 'next/server';
import { getSession } from '@/lib/sshManager';

function cleanOutput(str) {
  let cleaned = str.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');
  cleaned = cleaned.replace(/\x07/g, '');
  
  let result = [];
  for (let char of cleaned) {
    if (char === '\x08') {
      result.pop();
    } else {
      result.push(char);
    }
  }
  return result.join('');
}

export async function POST(request) {
  try {
    const { ip_address, command } = await request.json();
    const session = getSession(ip_address);
    if (!session) return NextResponse.json({ error: 'No session' }, { status: 400 });

    session.buffer = "";
    
    // Pošleme Ctrl+U (\x15) pre vyčistenie riadku, potom príkaz a TAB
    session.shell.write('\x15' + command + '\t');

    await new Promise(r => {
      session.resolvePromise = r;
      setTimeout(r, 400);
    });
    
    const rawOutput = session.buffer;
    session.buffer = "";
    session.resolvePromise = null;
    
    const cleaned = cleanOutput(rawOutput);
    
    if (cleaned.includes('\n') || cleaned.includes('\r')) {
      return NextResponse.json({ completed: command });
    }

    let finalCommand = cleaned.trimStart();
    const promptMatch = finalCommand.match(/^.*?[#>]\s*/);
    if (promptMatch) {
      finalCommand = finalCommand.substring(promptMatch[0].length);
    }

    finalCommand = finalCommand.replace(/^\^U/, '').trimStart();

    return NextResponse.json({ completed: finalCommand });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
