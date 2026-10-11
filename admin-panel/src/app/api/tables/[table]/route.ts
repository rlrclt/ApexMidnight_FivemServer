import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/db';
import { getMySQLPool } from '@/db/mysql';
import { MANAGED_TABLES } from '@/lib/tables-config';
import { isPlayerAdmin } from '@/lib/fivem-permissions';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ table: string }> }
) {
  const { table } = await params;
  const config = MANAGED_TABLES[table];

  if (!config) {
    return NextResponse.json({ error: `Table '${table}' not found or restricted` }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '10', 10)));
  const search = searchParams.get('search') || '';
  const sortBy = searchParams.get('sortBy') || config.primaryKey;
  const sortOrder = (searchParams.get('sortOrder') || 'ASC').toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

  const validColumn = config.columns.find((c) => c.name === sortBy);
  const safeSortColumn = validColumn ? validColumn.name : config.primaryKey;
  const offset = (page - 1) * limit;

  // 1. ดึงข้อมูลจริงจาก MySQL สำหรับตาราง players
  if (table === 'players') {
    try {
      const pool = getMySQLPool();
      let whereClause = '';
      const queryParams: any[] = [];

      if (search.trim()) {
        whereClause = 'WHERE name LIKE ? OR citizenid LIKE ? OR license LIKE ? OR phone_number LIKE ?';
        const s = `%${search.trim()}%`;
        queryParams.push(s, s, s, s);
      }

      // Count total
      const [countRows]: any = await pool.query(
        `SELECT COUNT(*) as total FROM players ${whereClause}`,
        queryParams
      );
      const totalRecords = countRows[0]?.total || 0;

      // Select data
      const [rows]: any = await pool.query(
        `SELECT citizenid, name, license, money, charinfo, job, gang, phone_number, last_updated 
         FROM players ${whereClause} 
         ORDER BY ${safeSortColumn === 'cash_satang' || safeSortColumn === 'bank_satang' ? 'last_updated' : safeSortColumn} ${sortOrder} 
         LIMIT ? OFFSET ?`,
        [...queryParams, limit, offset]
      );

      // Map MySQL Qbox format to table schema
      const mappedRows = rows.map((r: any) => {
        let moneyObj: any = { cash: 0, bank: 0, crypto: 0 };
        try {
          if (r.money) moneyObj = typeof r.money === 'string' ? JSON.parse(r.money) : r.money;
        } catch (_) {}

        let jobObj: any = { name: 'unemployed', label: 'Civilian' };
        try {
          if (r.job) jobObj = typeof r.job === 'string' ? JSON.parse(r.job) : r.job;
        } catch (_) {}

        let gangObj: any = { name: 'none', label: 'No Gang' };
        try {
          if (r.gang) gangObj = typeof r.gang === 'string' ? JSON.parse(r.gang) : r.gang;
        } catch (_) {}

        return {
          citizenid: r.citizenid,
          name: r.name,
          license: r.license,
          is_admin_game: isPlayerAdmin(r.license) ? 1 : 0,
          phone_number: r.phone_number || '-',
          job: jobObj.name || 'unemployed',
          gang: gangObj.name || 'none',
          cash_satang: Math.round((moneyObj.cash || 0) * 100),
          bank_satang: Math.round((moneyObj.bank || 0) * 100),
          crypto_satang: Math.round((moneyObj.crypto || 0) * 100),
          is_dead: 0,
          is_sample: 0, // Real FiveM Data!
          updated_at: r.last_updated ? new Date(r.last_updated).toLocaleString('th-TH') : '-',
        };
      });

      return NextResponse.json({
        table: config.name,
        label: config.label,
        primaryKey: config.primaryKey,
        columns: config.columns,
        pagination: {
          page,
          limit,
          totalRecords,
          totalPages: Math.ceil(totalRecords / limit),
        },
        data: mappedRows,
      });
    } catch (err: any) {
      console.error('Error fetching real players from MySQL:', err);
      // Fallback to SQLite if MySQL has error
    }
  }

  // 2. ดึงข้อมูลจาก MySQL สำหรับ player_vehicles
  if (table === 'player_vehicles') {
    try {
      const pool = getMySQLPool();
      let whereClause = '';
      const queryParams: any[] = [];

      if (search.trim()) {
        whereClause = 'WHERE plate LIKE ? OR citizenid LIKE ? OR vehicle LIKE ?';
        const s = `%${search.trim()}%`;
        queryParams.push(s, s, s);
      }

      const [countRows]: any = await pool.query(
        `SELECT COUNT(*) as total FROM player_vehicles ${whereClause}`,
        queryParams
      );
      const totalRecords = countRows[0]?.total || 0;

      const [rows]: any = await pool.query(
        `SELECT plate, citizenid, vehicle, hash, garage, state, fuel, engine, body 
         FROM player_vehicles ${whereClause} 
         LIMIT ? OFFSET ?`,
        [...queryParams, limit, offset]
      );

      const mappedRows = rows.map((r: any) => ({
        plate: r.plate,
        citizenid: r.citizenid,
        vehicle: r.vehicle,
        garage: r.garage || 'pillboxgarage',
        state: r.state || 1,
        fuel: r.fuel || 100,
        engine_health: Math.round(r.engine || 1000),
        body_health: Math.round(r.body || 1000),
        is_sample: 0,
      }));

      return NextResponse.json({
        table: config.name,
        label: config.label,
        primaryKey: config.primaryKey,
        columns: config.columns,
        pagination: {
          page,
          limit,
          totalRecords,
          totalPages: Math.ceil(totalRecords / limit),
        },
        data: mappedRows,
      });
    } catch (err: any) {
      console.error('Error fetching real vehicles from MySQL:', err);
    }
  }

  // 3. ดึงข้อมูลจาก MySQL สำหรับ bans
  if (table === 'bans') {
    try {
      const pool = getMySQLPool();
      let whereClause = '';
      const queryParams: any[] = [];

      if (search.trim()) {
        whereClause = 'WHERE name LIKE ? OR license LIKE ? OR reason LIKE ?';
        const s = `%${search.trim()}%`;
        queryParams.push(s, s, s);
      }

      const [countRows]: any = await pool.query(
        `SELECT COUNT(*) as total FROM bans ${whereClause}`,
        queryParams
      );
      const totalRecords = countRows[0]?.total || 0;

      const [rows]: any = await pool.query(
        `SELECT id, name, license, discord, ip, reason, expire, bannedby 
         FROM bans ${whereClause} 
         LIMIT ? OFFSET ?`,
        [...queryParams, limit, offset]
      );

      const mappedRows = rows.map((r: any) => ({
        id: r.id,
        name: r.name,
        license: r.license,
        discord: r.discord,
        ip: r.ip,
        reason: r.reason,
        banned_by: r.bannedby || 'Admin',
        expire: r.expire,
        is_sample: 0,
      }));

      return NextResponse.json({
        table: config.name,
        label: config.label,
        primaryKey: config.primaryKey,
        columns: config.columns,
        pagination: {
          page,
          limit,
          totalRecords,
          totalPages: Math.ceil(totalRecords / limit),
        },
        data: mappedRows,
      });
    } catch (err: any) {
      console.error('Error fetching real bans from MySQL:', err);
    }
  }

  // 4. ดึงข้อมูลจาก MySQL สำหรับ bank_accounts_new (Society Banking จริง)
  if (table === 'bank_accounts_new') {
    try {
      const pool = getMySQLPool();
      let whereClause = '';
      const queryParams: any[] = [];

      if (search.trim()) {
        whereClause = 'WHERE id LIKE ? OR creator LIKE ?';
        const s = `%${search.trim()}%`;
        queryParams.push(s, s);
      }

      const [countRows]: any = await pool.query(
        `SELECT COUNT(*) as total FROM bank_accounts_new ${whereClause}`,
        queryParams
      );
      const totalRecords = countRows[0]?.total || 0;

      const [rows]: any = await pool.query(
        `SELECT id, amount, isFrozen, creator 
         FROM bank_accounts_new ${whereClause} 
         LIMIT ? OFFSET ?`,
        [...queryParams, limit, offset]
      );

      const mappedRows = rows.map((r: any) => ({
        id: r.id,
        amount_satang: Math.round((r.amount || 0) * 100),
        isFrozen: r.isFrozen || 0,
        creator: r.creator || '-',
      }));

      return NextResponse.json({
        table: config.name,
        label: config.label,
        primaryKey: config.primaryKey,
        columns: config.columns,
        pagination: {
          page,
          limit,
          totalRecords,
          totalPages: Math.ceil(totalRecords / limit),
        },
        data: mappedRows,
      });
    } catch (err: any) {
      console.error('Error fetching real bank accounts from MySQL:', err);
    }
  }

  // 5. Default: SQLite fallback / admin_users
  const db = getDatabase();
  let whereClause = '';
  const queryParams: any[] = [];

  if (search.trim()) {
    const searchableCols = config.columns.filter((c) => c.type === 'string');
    if (searchableCols.length > 0) {
      whereClause = 'WHERE ' + searchableCols.map((c) => `${c.name} LIKE ?`).join(' OR ');
      for (let i = 0; i < searchableCols.length; i++) {
        queryParams.push(`%${search.trim()}%`);
      }
    }
  }

  const countSql = `SELECT COUNT(*) as total FROM ${config.name} ${whereClause}`;
  const countStmt = db.prepare(countSql);
  const countResult = (queryParams.length > 0 ? countStmt.get(...queryParams) : countStmt.get()) as { total: number };
  const totalRecords = countResult ? countResult.total : 0;

  const dataSql = `SELECT * FROM ${config.name} ${whereClause} ORDER BY ${safeSortColumn} ${sortOrder} LIMIT ? OFFSET ?`;
  const dataStmt = db.prepare(dataSql);
  const rows = dataStmt.all(...queryParams, limit, offset);

  return NextResponse.json({
    table: config.name,
    label: config.label,
    primaryKey: config.primaryKey,
    columns: config.columns,
    pagination: {
      page,
      limit,
      totalRecords,
      totalPages: Math.ceil(totalRecords / limit),
    },
    data: rows,
  });
}
