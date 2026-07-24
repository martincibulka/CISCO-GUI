import { NodeSSH } from 'node-ssh';

if (!global.sshSessions) {
  global.sshSessions = new Map();
}

export function getSession(ip) {
  return global.sshSessions.get(ip);
}

export async function connectSSH(ip, username, password) {
  const ssh = new NodeSSH();
  
  await ssh.connect({
    host: ip,
    username,
    password,
    tryKeyboard: true,
    readyTimeout: 10000,
    algorithms: {
      kex: [
        'curve25519-sha256',
        'curve25519-sha256@libssh.org',
        'ecdh-sha2-nistp256',
        'ecdh-sha2-nistp384',
        'ecdh-sha2-nistp521',
        'diffie-hellman-group-exchange-sha256',
        'diffie-hellman-group14-sha1',
        'diffie-hellman-group-exchange-sha1',
        'diffie-hellman-group1-sha1'
      ],
      cipher: [
        'aes128-ctr',
        'aes192-ctr',
        'aes256-ctr',
        'aes128-gcm',
        'aes128-gcm@openssh.com',
        'aes256-gcm',
        'aes256-gcm@openssh.com',
        'aes256-cbc',
        'aes192-cbc',
        'aes128-cbc',
        '3des-cbc'
      ],
      serverHostKey: [
        'ssh-ed25519',
        'ecdsa-sha2-nistp256',
        'ecdsa-sha2-nistp384',
        'ecdsa-sha2-nistp521',
        'rsa-sha2-512',
        'rsa-sha2-256',
        'ssh-rsa',
        'ssh-dss'
      ],
      hmac: [
        'hmac-sha2-256',
        'hmac-sha2-512',
        'hmac-sha1',
        'hmac-md5',
        'hmac-sha2-256-96',
        'hmac-sha2-512-96',
        'hmac-ripemd160',
        'hmac-sha1-96',
        'hmac-md5-96'
      ]
    }
  });

  const shell = await ssh.requestShell({ term: 'vt100' });
  
  const sessionData = {
    ssh,
    shell,
    buffer: "",
    resolvePromise: null,
  };

  shell.on('data', (data) => {
    const text = data.toString('utf8');
    sessionData.buffer += text;
    if (sessionData.resolvePromise) {
      sessionData.resolvePromise();
    }
  });

  global.sshSessions.set(ip, sessionData);
  
  await new Promise(r => setTimeout(r, 500));
  await executeCommand(ip, '\x15terminal length 0');

  return sessionData;
}

export async function executeCommand(ip, command) {
  const session = getSession(ip);
  if (!session) throw new Error("No active session for this IP");

  session.buffer = "";
  session.shell.write(command + '\n');

  await new Promise((resolve) => {
    let resolved = false;
    session.resolvePromise = () => {
      if (resolved) return;
      const buf = session.buffer.trim();
      if (buf.endsWith('#') || buf.endsWith('>')) {
        resolved = true;
        resolve();
      }
    };
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve();
      }
    }, 1500);
  });
  
  await new Promise(r => setTimeout(r, 150));
  
  const output = session.buffer;
  session.buffer = "";
  session.resolvePromise = null;
  
  return output;
}
