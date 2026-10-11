import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/db';
import { getMySQLPool } from '@/db/mysql';
import { MANAGED_TABLES } from '@/lib/tables-config';
import { recordAuditLog } from '@/lib/audit';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ table: string; id: string }> }
) {
  const { table, id } = await params;
  const config = MANAGED_TABLES[table];

  if (!config || !config.permittedForEditing) {
    return NextResponse.json({ error: `Table '${table}' is not permitted for editing` }, { status: 403 });
  }

  const role = request.headers.get('x-user-role') || 'admin';
  const username = request.headers.get('x-user-name') || 'admin';
  const userId = parseInt(request.headers.get('x-user-id') || '1', 10);

  if (role === 'viewer') {
    return NextResponse.json(
      { error: 'Forbidden: Viewers have read-only access and cannot edit database records.' },
      { status: 403 }
    );
  }

  let body: any;
  try {
    body = await request.json();
  } catch (err) {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const { updates, reason } = body;

  if (!reason || typeof reason !== 'string' || reason.trim().length < 3) {
    return NextResponse.json({ error: 'A valid reason for this modification is strictly required (min 3 chars)' }, { status: 400 });
  }

  if (!updates || typeof updates !== 'object') {
    return NextResponse.json({ error: 'No update fields provided' }, { status: 400 });
  }

  // 1. จัดการบันทึกกลับไปยังฐานข้อมูล MySQL จริงสำหรับตาราง players
  if (table === 'players') {
    try {
      const pool = getMySQLPool();
      const [rows]: any = await pool.query('SELECT * FROM players WHERE citizenid = ?', [id]);
      if (!rows || rows.length === 0) {
        return NextResponse.json({ error: `Player with citizenid '${id}' not found in MySQL` }, { status: 404 });
      }

      const beforeRow = rows[0];
      let currentMoney = { cash: 0, bank: 0, crypto: 0 };
      try {
        if (beforeRow.money) currentMoney = typeof beforeRow.money === 'string' ? JSON.parse(beforeRow.money) : beforeRow.money;
      } catch (_) {}

      // Update money fields if provided in satang
      if (updates.cash_satang !== undefined) {
        currentMoney.cash = Math.round(Number(updates.cash_satang) / 100);
      }
      if (updates.bank_satang !== undefined) {
        currentMoney.bank = Math.round(Number(updates.bank_satang) / 100);
      }
      if (updates.crypto_satang !== undefined) {
        currentMoney.crypto = Math.round(Number(updates.crypto_satang) / 100);
      }

      const newName = updates.name !== undefined ? String(updates.name) : beforeRow.name;
      const newPhone = updates.phone_number !== undefined ? String(updates.phone_number) : beforeRow.phone_number;
      const newMoneyStr = JSON.stringify(currentMoney);

      // Execute update to FiveM MySQL Database
      await pool.query(
        'UPDATE players SET name = ?, phone_number = ?, money = ? WHERE citizenid = ?',
        [newName, newPhone, newMoneyStr, id]
      );

      const afterRow = {
        ...beforeRow,
        name: newName,
        phone_number: newPhone,
        money: newMoneyStr,
      };

      // Record Audit Log in SQLite
      recordAuditLog({
        user: { id: userId, username, display_name: username, role: 'admin', status: 'active' },
        tableName: 'players',
        recordId: id,
        action: 'UPDATE',
        beforeData: beforeRow,
        afterData: afterRow,
        reason: reason.trim(),
        ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1',
      });

      return NextResponse.json({
        success: true,
        message: `Player '${id}' in FiveM MySQL successfully updated!`,
        before: beforeRow,
        after: afterRow,
      });
    } catch (err: any) {
      console.error('MySQL update error:', err);
      return NextResponse.json({ error: `MySQL update failed: ${err.message}` }, { status: 500 });
    }
  }

  // 2. Default: SQLite fallback
  const db = getDatabase();
  const selectStmt = db.prepare(`SELECT * FROM ${config.name} WHERE ${config.primaryKey} = ?`);
  const beforeRow = selectStmt.get(id);

  if (!beforeRow) {
    return NextResponse.json({ error: `Record with ${config.primaryKey} '${id}' not found` }, { status: 404 });
  }

  const setClauses: string[] = [];
  const updateValues: any[] = [];
  const sanitizedAfter: Record<string, any> = { ...beforeRow };

  for (const col of config.columns) {
    if (col.primaryKey || col.readOnly) continue;
    if (updates[col.name] !== undefined) {
      const val = updates[col.name];

      if (col.type === 'number' || col.type === 'currency_satang') {
        const numVal = Number(val);
        if (isNaN(numVal) || !Number.isInteger(numVal)) {
          return NextResponse.json(
            { error: `Validation Error: Column '${col.name}' must be a valid integer, received: '${val}'` },
            { status: 400 }
          );
        }
        setClauses.push(`${col.name} = ?`);
        updateValues.push(numVal);
        sanitizedAfter[col.name] = numVal;
      } else if (col.type === 'boolean') {
        const boolVal = val === true || val === 1 || val === '1' ? 1 : 0;
        setClauses.push(`${col.name} = ?`);
        updateValues.push(boolVal);
        sanitizedAfter[col.name] = boolVal;
      } else {
        const strVal = String(val);
        setClauses.push(`${col.name} = ?`);
        updateValues.push(strVal);
        sanitizedAfter[col.name] = strVal;
      }
    }
  }

  if (setClauses.length === 0) {
    return NextResponse.json({ error: 'No valid columns provided to update' }, { status: 400 });
  }

  if (config.columns.some((c) => c.name === 'updated_at')) {
    setClauses.push(`updated_at = CURRENT_TIMESTAMP`);
  }

  const updateSql = `UPDATE ${config.name} SET ${setClauses.join(', ')} WHERE ${config.primaryKey} = ?`;
  const updateStmt = db.prepare(updateSql);
  updateStmt.run(...updateValues, id);

  recordAuditLog({
    user: { id: userId, username, display_name: username, role: 'admin', status: 'active' },
    tableName: config.name,
    recordId: String(id),
    action: 'UPDATE',
    beforeData: beforeRow,
    afterData: sanitizedAfter,
    reason: reason.trim(),
    ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1',
  });

  return NextResponse.json({
    success: true,
    message: `Record ${id} in ${config.name} successfully updated`,
    before: beforeRow,
    after: sanitizedAfter,
  });
}
