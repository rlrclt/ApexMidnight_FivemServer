import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';

const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'admin_database.sqlite');

// Ensure directory exists
const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

let dbInstance: DatabaseSync | null = null;

export function getDatabase(): DatabaseSync {
  if (!dbInstance) {
    dbInstance = new DatabaseSync(DB_PATH);
    dbInstance.exec('PRAGMA foreign_keys = ON;');
    dbInstance.exec('PRAGMA journal_mode = WAL;');
    initSchema(dbInstance);
  }
  return dbInstance;
}

export function initSchema(db: DatabaseSync) {
  // 1. Table for Admin Users (RBAC)
  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      role TEXT CHECK(role IN ('admin', 'viewer')) NOT NULL DEFAULT 'viewer',
      status TEXT CHECK(status IN ('active', 'inactive')) NOT NULL DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 2. Table for Audit Logs
  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      username TEXT NOT NULL,
      table_name TEXT NOT NULL,
      record_id TEXT NOT NULL,
      action TEXT CHECK(action IN ('CREATE', 'UPDATE', 'DELETE')) NOT NULL,
      before_data TEXT,
      after_data TEXT,
      reason TEXT NOT NULL,
      ip_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_audit_table_record ON admin_audit_logs(table_name, record_id);
    CREATE INDEX IF NOT EXISTS idx_audit_created ON admin_audit_logs(created_at);
  `);

  // 3. Managed Entity Tables (FiveM Core Mock Schema with Satang Currency)
  db.exec(`
    CREATE TABLE IF NOT EXISTS players (
      citizenid TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      license TEXT NOT NULL,
      phone_number TEXT,
      job TEXT NOT NULL DEFAULT 'unemployed',
      gang TEXT DEFAULT 'none',
      cash_satang INTEGER NOT NULL DEFAULT 0,
      bank_satang INTEGER NOT NULL DEFAULT 0,
      crypto_satang INTEGER NOT NULL DEFAULT 0,
      is_dead INTEGER NOT NULL DEFAULT 0,
      is_sample INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_players_license ON players(license);
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS player_vehicles (
      plate TEXT PRIMARY KEY,
      citizenid TEXT NOT NULL,
      vehicle TEXT NOT NULL,
      hash TEXT NOT NULL,
      garage TEXT DEFAULT 'pillboxgarage',
      state INTEGER NOT NULL DEFAULT 1,
      fuel INTEGER NOT NULL DEFAULT 100,
      engine_health INTEGER NOT NULL DEFAULT 1000,
      body_health INTEGER NOT NULL DEFAULT 1000,
      is_sample INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (citizenid) REFERENCES players(citizenid) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_vehicles_citizenid ON player_vehicles(citizenid);
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS bans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      license TEXT,
      discord TEXT,
      ip TEXT,
      reason TEXT NOT NULL,
      banned_by TEXT NOT NULL,
      expire INTEGER,
      is_sample INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS banking_accounts (
      account_id TEXT PRIMARY KEY,
      citizenid TEXT,
      account_name TEXT NOT NULL,
      account_type TEXT CHECK(account_type IN ('personal', 'business', 'gang')) NOT NULL,
      balance_satang INTEGER NOT NULL DEFAULT 0,
      is_sample INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}
