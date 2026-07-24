import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { openDb } from './db';

const secretKey = new TextEncoder().encode('supers3cr3tciscok3y2026!');

export async function createSession(userId) {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day
  const session = await new SignJWT({ userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('1d')
    .sign(secretKey);
    
  (await cookies()).set('cisco_session', session, {
    httpOnly: true,
    secure: false,
    expires: expiresAt,
    path: '/',
  });
}

export async function verifySession() {
  const cookie = (await cookies()).get('cisco_session')?.value;
  if (!cookie) return null;
  try {
    const { payload } = await jwtVerify(cookie, secretKey);
    return payload;
  } catch (err) {
    return null;
  }
}

export async function deleteSession() {
  (await cookies()).delete('cisco_session');
}

export async function hasPermission(permissionFlag) {
  const session = await verifySession();
  if (!session) return false;
  try {
    const db = await openDb();
    const user = await db.get('SELECT * FROM app_users WHERE id = ?', [session.userId]);
    if (!user) return false;
    
    // Get user's role permissions
    const role = await db.get('SELECT * FROM app_roles WHERE name = ?', [user.role]);
    if (!role) return false;
    
    return role[permissionFlag] === 1;
  } catch (e) {
    return false;
  }
}
