import { getDatabase } from './index';

export function undoSampleData() {
  const db = getDatabase();

  db.exec(`
    DELETE FROM banking_accounts WHERE is_sample = 1;
    DELETE FROM bans WHERE is_sample = 1;
    DELETE FROM player_vehicles WHERE is_sample = 1;
    DELETE FROM players WHERE is_sample = 1;
    DELETE FROM admin_audit_logs WHERE reason LIKE '%(Sample)%';
  `);

  console.log('🧹 All sample data removed in one command!');
}

if (require.main === module || process.argv[1]?.endsWith('seed-undo.ts')) {
  undoSampleData();
}
