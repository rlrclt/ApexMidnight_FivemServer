import fs from 'node:fs';
import path from 'node:path';

// Path to permissions.cfg
const PERM_PATH = path.resolve(process.cwd(), '..', 'server-data', 'permissions.cfg');

export function getAdminLicenses(): Set<string> {
  const adminSet = new Set<string>();
  try {
    if (!fs.existsSync(PERM_PATH)) return adminSet;
    const content = fs.readFileSync(PERM_PATH, 'utf-8');
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('#') || !trimmed) continue;
      // Format: add_principal identifier.<license> group.admin
      const match = trimmed.match(/^add_principal\s+identifier\.([^\s]+)\s+group\.admin/);
      if (match) {
        const id = match[1];
        adminSet.add(id);
        // Also add stripped version without license: or license2:
        if (id.includes(':')) {
          adminSet.add(id.split(':')[1]);
        }
      }
    }
  } catch (err) {
    console.error('Error reading permissions.cfg:', err);
  }
  return adminSet;
}

export function isPlayerAdmin(license: string): boolean {
  if (!license) return false;
  const adminLicenses = getAdminLicenses();
  const rawLicense = license.includes(':') ? license.split(':')[1] : license;
  return adminLicenses.has(license) || adminLicenses.has(rawLicense) || adminLicenses.has(`license2:${rawLicense}`) || adminLicenses.has(`license:${rawLicense}`);
}

export function addAdminPermission(license: string, playerName: string): boolean {
  try {
    if (!fs.existsSync(PERM_PATH)) return false;
    const rawLicense = license.includes(':') ? license.split(':')[1] : license;
    const content = fs.readFileSync(PERM_PATH, 'utf-8');

    // Check if already exists
    if (content.includes(rawLicense)) return true;

    const newEntries = `\n# Admin added via Web Portal: ${playerName}\nadd_principal identifier.license2:${rawLicense} group.admin\nadd_principal identifier.license:${rawLicense} group.admin\n`;
    fs.appendFileSync(PERM_PATH, newEntries, 'utf-8');
    return true;
  } catch (err) {
    console.error('Error adding admin to permissions.cfg:', err);
    return false;
  }
}

export function removeAdminPermission(license: string): boolean {
  try {
    if (!fs.existsSync(PERM_PATH)) return false;
    const rawLicense = license.includes(':') ? license.split(':')[1] : license;
    const content = fs.readFileSync(PERM_PATH, 'utf-8');
    const lines = content.split('\n');

    const filtered = lines.filter((l) => !l.includes(rawLicense));
    fs.writeFileSync(PERM_PATH, filtered.join('\n'), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error removing admin from permissions.cfg:', err);
    return false;
  }
}
