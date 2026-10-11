import mysql from 'mysql2/promise';

const MYSQL_URL = process.env.MYSQL_URL || 'mysql://fivem_apex:ApexMidnight2026Secured@localhost/ApexMidnight-Fivem?charset=utf8mb4';

let pool: mysql.Pool | null = null;

export function getMySQLPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool({
      uri: MYSQL_URL,
      waitForConnections: true,
      connectionLimit: 10,
      maxIdle: 10,
      idleTimeout: 60000,
      queueLimit: 0,
    });
  }
  return pool;
}
