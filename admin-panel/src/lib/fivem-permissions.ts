import fs from 'node:fs';
import path from 'node:path';

// Path to permissions.cfg
const PERM_PATH = path.resolve(process.cwd(), '..', 'server-data', 'permissions.cfg');
// Path to txAdmin admins.json
const TX_ADMINS_PATH = path.resolve(process.cwd(), '..', 'alpine', 'txData', 'admins.json');

export interface FivemAdminEntry {
  identifier: string;
  group: string;
  comment?: string;
  rawLine: string;
}

export interface TxAdminEntry {
  name: string;
  master: boolean;
  permissions: string[];
  providers: Record<string, { id?: string; identifier?: string }>;
}

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

export function getAllFivemAdmins(): FivemAdminEntry[] {
  const list: FivemAdminEntry[] = [];
  try {
    if (!fs.existsSync(PERM_PATH)) return list;
    const content = fs.readFileSync(PERM_PATH, 'utf-8');
    const lines = content.split('\n');
    let currentComment = '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (trimmed.startsWith('#')) {
        currentComment = trimmed.replace(/^#\s*/, '');
        continue;
      }
      const match = trimmed.match(/^add_principal\s+identifier\.([^\s]+)\s+([^\s#]+)(?:\s+#\s*(.*))?$/);
      if (match) {
        list.push({
          identifier: match[1],
          group: match[2],
          comment: match[3] || currentComment || undefined,
          rawLine: trimmed,
        });
        currentComment = '';
      }
    }
  } catch (err) {
    console.error('Error reading all FiveM admins:', err);
  }
  return list;
}

export function getAllTxAdmins(): TxAdminEntry[] {
  try {
    if (!fs.existsSync(TX_ADMINS_PATH)) return [];
    const content = fs.readFileSync(TX_ADMINS_PATH, 'utf-8');
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) {
      return parsed.map((item: any) => ({
        name: item.name || 'Unknown',
        master: !!item.master,
        permissions: Array.isArray(item.permissions) ? item.permissions : [],
        providers: item.providers || {},
      }));
    }
  } catch (err) {
    console.error('Error reading txAdmin admins.json:', err);
  }
  return [];
}

export function isPlayerAdmin(license: string): boolean {
  if (!license) return false;
  const adminLicenses = getAdminLicenses();
  const rawLicense = license.includes(':') ? license.split(':')[1] : license;
  return adminLicenses.has(license) || adminLicenses.has(rawLicense) || adminLicenses.has(`license2:${rawLicense}`) || adminLicenses.has(`license:${rawLicense}`);
}

export function addAdminPermission(license: string, playerName: string, group: string = 'group.admin'): boolean {
  try {
    if (!fs.existsSync(PERM_PATH)) return false;
    const rawLicense = license.includes(':') ? license.split(':')[1] : license;
    const content = fs.readFileSync(PERM_PATH, 'utf-8');

    // Check if already exists
    if (content.includes(rawLicense)) return true;

    const newEntries = `\n# Admin added via Web Portal: ${playerName}\nadd_principal identifier.license2:${rawLicense} ${group}\nadd_principal identifier.license:${rawLicense} ${group}\n`;
    fs.appendFileSync(PERM_PATH, newEntries, 'utf-8');
    return true;
  } catch (err) {
    console.error('Error adding admin to permissions.cfg:', err);
    return false;
  }
}

export function addGenericIdentifierAdmin(identifier: string, name: string, group: string = 'group.admin'): boolean {
  try {
    if (!fs.existsSync(PERM_PATH)) return false;
    const cleanId = identifier.trim();
    const content = fs.readFileSync(PERM_PATH, 'utf-8');

    if (content.includes(cleanId)) return true;

    const newEntry = `\n# Admin added via Web Portal: ${name}\nadd_principal identifier.${cleanId} ${group}\n`;
    fs.appendFileSync(PERM_PATH, newEntry, 'utf-8');
    return true;
  } catch (err) {
    console.error('Error adding generic identifier to permissions.cfg:', err);
    return false;
  }
}

export function removeAdminPermission(identifierOrLicense: string): boolean {
  try {
    if (!fs.existsSync(PERM_PATH)) return false;
    const target = identifierOrLicense.trim();
    const rawLicense = target.includes(':') ? target.split(':')[1] : target;
    const content = fs.readFileSync(PERM_PATH, 'utf-8');
    const lines = content.split('\n');

    const filtered = lines.filter((l) => {
      const trimmed = l.trim();
      if (trimmed.startsWith('# Admin added via Web Portal:')) {
        // keep comment filtering if following line matches
        return true;
      }
      return !trimmed.includes(target) && !trimmed.includes(rawLicense);
    });

    fs.writeFileSync(PERM_PATH, filtered.join('\n'), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error removing admin from permissions.cfg:', err);
    return false;
  }
}
