import { NextRequest, NextResponse } from 'next/server';
import { addAdminPermission, removeAdminPermission } from '@/lib/fivem-permissions';
import { recordAuditLog } from '@/lib/audit';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ citizenid: string }> }
) {
  const { citizenid } = await params;
  const role = request.headers.get('x-user-role') || 'admin';
  const username = request.headers.get('x-user-name') || 'admin';
  const userId = parseInt(request.headers.get('x-user-id') || '1', 10);

  if (role === 'viewer') {
    return NextResponse.json(
      { error: 'Forbidden: Viewers cannot grant or revoke admin permissions.' },
      { status: 403 }
    );
  }

  let body: any;
  try {
    body = await request.json();
  } catch (err) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { license, playerName, makeAdmin, reason } = body;

  if (!license) {
    return NextResponse.json({ error: 'Player license is required' }, { status: 400 });
  }

  if (!reason || typeof reason !== 'string' || reason.trim().length < 3) {
    return NextResponse.json({ error: 'A valid reason is strictly required (min 3 chars)' }, { status: 400 });
  }

  let success = false;
  if (makeAdmin) {
    success = addAdminPermission(license, playerName || citizenid);
  } else {
    success = removeAdminPermission(license);
  }

  if (!success) {
    return NextResponse.json({ error: 'Failed to update permissions.cfg' }, { status: 500 });
  }

  // Record Audit Trail
  recordAuditLog({
    user: { id: userId, username, display_name: username, role: 'admin', status: 'active' },
    tableName: 'players',
    recordId: citizenid,
    action: 'UPDATE',
    beforeData: { is_admin: !makeAdmin, license },
    afterData: { is_admin: makeAdmin, license },
    reason: `[FiveM Admin Role] ${makeAdmin ? 'Granted Admin' : 'Revoked Admin'}: ${reason.trim()}`,
    ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1',
  });

  return NextResponse.json({
    success: true,
    message: makeAdmin 
      ? `Successfully granted FiveM Admin rights to ${playerName || citizenid}!`
      : `Successfully revoked FiveM Admin rights from ${playerName || citizenid}!`,
    isAdmin: makeAdmin,
  });
}
