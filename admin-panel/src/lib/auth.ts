import { cookies } from 'next/headers';
import { getDatabase } from '@/db';

export interface AdminUser {
  id: number;
  username: string;
  display_name: string;
  role: 'admin' | 'viewer';
  status: 'active' | 'inactive';
}

const SESSION_COOKIE = 'admin_session_user';

export async function getCurrentUser(): Promise<AdminUser | null> {
  const cookieStore = await cookies();
  const sessionUser = cookieStore.get(SESSION_COOKIE)?.value;

  if (!sessionUser) {
    // Default to admin for convenient preview if no cookie, or null
    return null;
  }

  const db = getDatabase();
  const stmt = db.prepare('SELECT id, username, display_name, role, status FROM admin_users WHERE username = ? AND status = "active"');
  const user = stmt.get(sessionUser) as AdminUser | undefined;

  return user || null;
}

export function verifyCredentials(username: string, passwordHash: string): AdminUser | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT id, username, display_name, role, status FROM admin_users WHERE username = ? AND password_hash = ? AND status = "active"');
  const user = stmt.get(username, passwordHash) as AdminUser | undefined;
  return user || null;
}

export function isUserPermitted(user: AdminUser | null, action: 'read' | 'write'): boolean {
  if (!user || user.status !== 'active') return false;
  if (action === 'read') return true; // Both admin & viewer can read
  if (action === 'write') return user.role === 'admin'; // Only admin can write
  return false;
}
