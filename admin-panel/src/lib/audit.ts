import { getDatabase } from '@/db';
import { AdminUser } from './auth';

export interface AuditLogEntry {
  user: AdminUser;
  tableName: string;
  recordId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  beforeData?: any;
  afterData?: any;
  reason: string;
  ipAddress?: string;
}

export function recordAuditLog(entry: AuditLogEntry) {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO admin_audit_logs (user_id, username, table_name, record_id, action, before_data, after_data, reason, ip_address)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    entry.user.id,
    entry.user.username,
    entry.tableName,
    entry.recordId,
    entry.action,
    entry.beforeData ? JSON.stringify(entry.beforeData) : null,
    entry.afterData ? JSON.stringify(entry.afterData) : null,
    entry.reason,
    entry.ipAddress || '127.0.0.1'
  );
}
