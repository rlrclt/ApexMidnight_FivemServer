import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '20', 10)));
  const table = searchParams.get('table') || '';
  const search = searchParams.get('search') || '';

  const db = getDatabase();
  const offset = (page - 1) * limit;

  let whereClauses: string[] = [];
  const params: any[] = [];

  if (table) {
    whereClauses.push('table_name = ?');
    params.push(table);
  }

  if (search.trim()) {
    whereClauses.push('(username LIKE ? OR record_id LIKE ? OR reason LIKE ?)');
    const s = `%${search.trim()}%`;
    params.push(s, s, s);
  }

  const whereSql = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

  const countStmt = db.prepare(`SELECT COUNT(*) as total FROM admin_audit_logs ${whereSql}`);
  const countResult = (params.length > 0 ? countStmt.get(...params) : countStmt.get()) as { total: number };
  const total = countResult ? countResult.total : 0;

  const dataStmt = db.prepare(`SELECT * FROM admin_audit_logs ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`);
  const logs = dataStmt.all(...params, limit, offset);

  return NextResponse.json({
    logs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}
