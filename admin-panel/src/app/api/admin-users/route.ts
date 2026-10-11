import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/db';
import { getAllFivemAdmins, getAllTxAdmins, addGenericIdentifierAdmin, removeAdminPermission } from '@/lib/fivem-permissions';
import { recordAuditLog } from '@/lib/audit';

export async function GET() {
  try {
    const db = getDatabase();

    // 1. Web Portal Admins (SQLite admin_users)
    const webAdmins = db.prepare('SELECT id, username, display_name, role, status, created_at FROM admin_users ORDER BY id ASC').all();

    // 2. FiveM In-game Principals (permissions.cfg)
    const fivemAdmins = getAllFivemAdmins();

    // 3. txAdmin Admins (admins.json)
    const txAdmins = getAllTxAdmins();

    return NextResponse.json({
      webAdmins,
      fivemAdmins,
      txAdmins,
      txAdminUrl: 'http://192.168.2.35:40120',
      txAdminLocalPort: 40120,
    });
  } catch (error: any) {
    console.error('Error fetching admin data:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') || 'admin';
    const username = request.headers.get('x-user-name') || 'admin';
    const userId = parseInt(request.headers.get('x-user-id') || '1', 10);

    if (role === 'viewer') {
      return NextResponse.json({ error: 'สิทธิ์ไม่เพียงพอ (Viewer ไม่สามารถแก้ไขสิทธิ์ได้)' }, { status: 403 });
    }

    const body = await request.json();
    const { action } = body;

    const db = getDatabase();

    // ACTION: Add or Update Web Admin
    if (action === 'save_web_admin') {
      const { id, username: uName, display_name, role: uRole, status: uStatus, password } = body;
      if (!uName || !display_name) {
        return NextResponse.json({ error: 'กรุณากรอก Username และชื่อแสดงผล' }, { status: 400 });
      }

      if (id) {
        // Update existing
        const existing = db.prepare('SELECT * FROM admin_users WHERE id = ?').get(id) as any;
        if (!existing) {
          return NextResponse.json({ error: 'ไม่พบผู้ใช้ในระบบ' }, { status: 404 });
        }

        if (password && password.trim()) {
          db.prepare('UPDATE admin_users SET username = ?, display_name = ?, role = ?, status = ?, password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
            .run(uName.trim(), display_name.trim(), uRole || 'viewer', uStatus || 'active', password.trim(), id);
        } else {
          db.prepare('UPDATE admin_users SET username = ?, display_name = ?, role = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
            .run(uName.trim(), display_name.trim(), uRole || 'viewer', uStatus || 'active', id);
        }

        recordAuditLog({
          user: { id: userId, username, display_name: username, role: 'admin', status: 'active' },
          tableName: 'admin_users',
          recordId: id.toString(),
          action: 'UPDATE',
          beforeData: existing,
          afterData: { username: uName, display_name, role: uRole, status: uStatus },
          reason: `แก้ไขผู้ดูแลระบบเว็บ: ${display_name} (${uRole})`,
          ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1',
        });

        return NextResponse.json({ success: true, message: 'บันทึกข้อมูลผู้ดูแลระบบเว็บเรียบร้อย' });
      } else {
        // Create new
        const pwd = password && password.trim() ? password.trim() : '123456';
        const info = db.prepare('INSERT INTO admin_users (username, display_name, password_hash, role, status) VALUES (?, ?, ?, ?, ?)')
          .run(uName.trim(), display_name.trim(), pwd, uRole || 'viewer', uStatus || 'active');

        recordAuditLog({
          user: { id: userId, username, display_name: username, role: 'admin', status: 'active' },
          tableName: 'admin_users',
          recordId: info.lastInsertRowid.toString(),
          action: 'CREATE',
          beforeData: null,
          afterData: { username: uName, display_name, role: uRole, status: uStatus },
          reason: `เพิ่มผู้ดูแลระบบเว็บคนใหม่: ${display_name} (${uRole})`,
          ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1',
        });

        return NextResponse.json({ success: true, message: 'เพิ่มผู้ดูแลระบบเว็บเรียบร้อย' });
      }
    }

    // ACTION: Delete Web Admin
    if (action === 'delete_web_admin') {
      const { id } = body;
      if (id === 1 || id === userId) {
        return NextResponse.json({ error: 'ไม่อนุญาตให้ลบบัญชีหลักหรือบัญชีของตนเอง' }, { status: 400 });
      }
      const existing = db.prepare('SELECT * FROM admin_users WHERE id = ?').get(id) as any;
      if (existing) {
        db.prepare('DELETE FROM admin_users WHERE id = ?').run(id);
        recordAuditLog({
          user: { id: userId, username, display_name: username, role: 'admin', status: 'active' },
          tableName: 'admin_users',
          recordId: id.toString(),
          action: 'DELETE',
          beforeData: existing,
          afterData: null,
          reason: `ลบผู้ดูแลระบบเว็บ: ${existing.display_name}`,
          ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1',
        });
      }
      return NextResponse.json({ success: true, message: 'ลบผู้ใช้สำเร็จ' });
    }

    // ACTION: Add FiveM In-game Admin
    if (action === 'add_fivem_admin') {
      const { identifier, name, group } = body;
      if (!identifier || !identifier.trim()) {
        return NextResponse.json({ error: 'กรุณาระบุ Identifier (เช่น license:xxx หรือ discord:xxx)' }, { status: 400 });
      }
      const ok = addGenericIdentifierAdmin(identifier.trim(), name || 'Admin', group || 'group.admin');
      if (!ok) {
        return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการบันทึก permissions.cfg' }, { status: 500 });
      }

      recordAuditLog({
        user: { id: userId, username, display_name: username, role: 'admin', status: 'active' },
        tableName: 'permissions.cfg',
        recordId: identifier.trim(),
        action: 'CREATE',
        beforeData: null,
        afterData: { identifier, name, group },
        reason: `เพิ่มสิทธิ์ FiveM In-game: ${identifier} -> ${group || 'group.admin'} (${name || '-'})`,
        ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1',
      });

      return NextResponse.json({ success: true, message: 'เพิ่มสิทธิ์ FiveM สำเร็จ' });
    }

    // ACTION: Remove FiveM In-game Admin
    if (action === 'remove_fivem_admin') {
      const { identifier } = body;
      if (!identifier) {
        return NextResponse.json({ error: 'กรุณาระบุ Identifier' }, { status: 400 });
      }
      const ok = removeAdminPermission(identifier);
      if (!ok) {
        return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการแก้ไข permissions.cfg' }, { status: 500 });
      }

      recordAuditLog({
        user: { id: userId, username, display_name: username, role: 'admin', status: 'active' },
        tableName: 'permissions.cfg',
        recordId: identifier,
        action: 'DELETE',
        beforeData: { identifier },
        afterData: null,
        reason: `ถอดสิทธิ์ FiveM In-game: ${identifier}`,
        ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1',
      });

      return NextResponse.json({ success: true, message: 'ถอดสิทธิ์ FiveM เรียบร้อย' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Error processing admin action:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
