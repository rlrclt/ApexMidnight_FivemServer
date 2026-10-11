import { getDatabase } from './index';

export function seedDatabase() {
  const db = getDatabase();

  // 1. Create Default Admin Users (Admin and Viewer)
  // Simple deterministic SHA-256 for demo (or clear text hash)
  const insertUser = db.prepare(`
    INSERT OR IGNORE INTO admin_users (username, password_hash, display_name, role, status)
    VALUES (?, ?, ?, ?, ?)
  `);

  insertUser.run('admin', 'admin123', 'Super Administrator', 'admin', 'active');
  insertUser.run('viewer', 'viewer123', 'Auditor Viewer', 'viewer', 'active');

  // 2. Seed Sample Players (Marked with is_sample = 1)
  const insertPlayer = db.prepare(`
    INSERT OR IGNORE INTO players (citizenid, name, license, phone_number, job, gang, cash_satang, bank_satang, crypto_satang, is_dead, is_sample)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `);

  const samplePlayers = [
    ['QBX1001', 'Somchai Jaidee (Sample)', 'license:1111111111111', '0812345678', 'police', 'none', 1500000, 45000000, 25000, 0],
    ['QBX1002', 'Wichai Thongchai (Sample)', 'license:2222222222222', '0898765432', 'ambulance', 'none', 850000, 32000000, 10000, 0],
    ['QBX1003', 'Anan Sukprasert (Sample)', 'license:3333333333333', '0855554444', 'mechanic', 'none', 2400000, 15000000, 0, 0],
    ['QBX1004', 'Kittisak Bangkhen (Sample)', 'license:4444444444444', '0866667777', 'unemployed', 'ballas', 520000, 8500000, 5000, 0],
    ['QBX1005', 'Narongrit Saetang (Sample)', 'license:5555555555555', '0877778888', 'taxi', 'none', 120000, 4200000, 0, 0]
  ];

  for (const p of samplePlayers) {
    insertPlayer.run(...p);
  }

  // 3. Seed Sample Vehicles
  const insertVehicle = db.prepare(`
    INSERT OR IGNORE INTO player_vehicles (plate, citizenid, vehicle, hash, garage, state, fuel, engine_health, body_health, is_sample)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `);

  const sampleVehicles = [
    ['APEX-01', 'QBX1001', 'police3', '2046537925', 'police_hq', 1, 95, 1000, 1000],
    ['EMS-99', 'QBX1002', 'ambulance', '1171614426', 'pillboxgarage', 1, 88, 1000, 950],
    ['TUNER-7', 'QBX1003', 'sultanrs', '1491375710', 'legion_square', 1, 60, 850, 900],
    ['GANG-88', 'QBX1004', 'buccaneer', '1853826012', 'grove_street', 0, 40, 500, 600]
  ];

  for (const v of sampleVehicles) {
    insertVehicle.run(...v);
  }

  // 4. Seed Sample Bans
  const insertBan = db.prepare(`
    INSERT OR IGNORE INTO bans (name, license, discord, ip, reason, banned_by, expire, is_sample)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1)
  `);

  insertBan.run('Cheater99 (Sample)', 'license:9999999', 'discord:9999999', '127.0.0.1', 'Speed hacking & spawning cash', 'Admin-Anticheat', 1893456000);
  insertBan.run('ToxicPlayer (Sample)', 'license:8888888', 'discord:8888888', '127.0.0.2', 'Severe toxicity in OOC chat', 'Mod_Somchai', 1793456000);

  // 5. Seed Sample Banking Accounts (Satang integer: 100 satang = 1 THB)
  const insertBank = db.prepare(`
    INSERT OR IGNORE INTO banking_accounts (account_id, citizenid, account_name, account_type, balance_satang, is_sample)
    VALUES (?, ?, ?, ?, ?, 1)
  `);

  insertBank.run('ACC-10001', 'QBX1001', 'Personal Savings (Sample)', 'personal', 45000000);
  insertBank.run('ACC-20001', 'QBX1002', 'Medical Department Fund (Sample)', 'business', 150000000);
  insertBank.run('ACC-30001', 'QBX1004', 'Southside Crew Vault (Sample)', 'gang', 85000000);

  console.log('✅ Sample data seeded successfully (labeled with is_sample = 1)');
}

if (require.main === module || process.argv[1]?.endsWith('seed.ts')) {
  seedDatabase();
}
