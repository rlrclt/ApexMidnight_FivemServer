export interface ColumnMeta {
  name: string;
  label: string;
  type: 'string' | 'number' | 'currency_satang' | 'boolean' | 'datetime' | 'select';
  primaryKey?: boolean;
  required?: boolean;
  options?: string[];
  readOnly?: boolean;
}

export interface TableConfig {
  name: string;
  label: string;
  description: string;
  primaryKey: string;
  permittedForEditing: boolean;
  columns: ColumnMeta[];
}

export const MANAGED_TABLES: Record<string, TableConfig> = {
  players: {
    name: 'players',
    label: 'ผู้เล่น (Players)',
    description: 'ข้อมูลตัวละคร ผู้เล่น อาชีพ และสถานะการเงิน (FiveM Qbox Real Data)',
    primaryKey: 'citizenid',
    permittedForEditing: true,
    columns: [
      { name: 'citizenid', label: 'Citizen ID', type: 'string', primaryKey: true, required: true, readOnly: true },
      { name: 'name', label: 'ชื่อตัวละคร', type: 'string', required: true },
      { name: 'license', label: 'FiveM License', type: 'string', required: true, readOnly: true },
      { name: 'phone_number', label: 'เบอร์โทรศัพท์', type: 'string' },
      { name: 'is_admin_game', label: 'สิทธิ์แอดมิน FiveM', type: 'boolean', readOnly: true },
      { name: 'job', label: 'อาชีพ', type: 'select', options: ['unemployed', 'police', 'ambulance', 'mechanic', 'taxi', 'cardealer', 'garbage'] },
      { name: 'gang', label: 'แก๊ง / ก๊ก', type: 'string' },
      { name: 'cash_satang', label: 'เงินสด', type: 'currency_satang', required: true },
      { name: 'bank_satang', label: 'เงินในธนาคาร', type: 'currency_satang', required: true },
      { name: 'crypto_satang', label: 'คริปโต', type: 'currency_satang', required: true },
      { name: 'updated_at', label: 'อัปเดตล่าสุด', type: 'datetime', readOnly: true }
    ]
  },
  player_vehicles: {
    name: 'player_vehicles',
    label: 'ยานพาหนะ (Vehicles)',
    description: 'ทะเบียนรถ เจ้าของ อู่จอด สภาพเครื่องยนต์ (FiveM Real Data)',
    primaryKey: 'plate',
    permittedForEditing: true,
    columns: [
      { name: 'plate', label: 'ทะเบียนรถ', type: 'string', primaryKey: true, required: true, readOnly: true },
      { name: 'citizenid', label: 'Citizen ID เจ้าของ', type: 'string', required: true },
      { name: 'vehicle', label: 'รุ่นรถ (Model)', type: 'string', required: true },
      { name: 'garage', label: 'ที่จอดรถ (Garage)', type: 'string' },
      { name: 'state', label: 'สถานะ (1=ในอู่, 0=ข้างนอก)', type: 'number' },
      { name: 'fuel', label: 'น้ำมัน (%)', type: 'number' },
      { name: 'engine_health', label: 'สภาพเครื่องยนต์ (0-1000)', type: 'number' },
      { name: 'body_health', label: 'สภาพตัวถัง (0-1000)', type: 'number' }
    ]
  },
  bans: {
    name: 'bans',
    label: 'การแบน (Bans)',
    description: 'บันทึกการระงับการใช้งานและเหตุผลการแบน (FiveM Real Data)',
    primaryKey: 'id',
    permittedForEditing: true,
    columns: [
      { name: 'id', label: 'ID', type: 'number', primaryKey: true, readOnly: true },
      { name: 'name', label: 'ชื่อผู้เล่น', type: 'string', required: true },
      { name: 'license', label: 'License', type: 'string' },
      { name: 'discord', label: 'Discord ID', type: 'string' },
      { name: 'ip', label: 'IP Address', type: 'string' },
      { name: 'reason', label: 'เหตุผลการแบน', type: 'string', required: true },
      { name: 'banned_by', label: 'ผู้ดำเนินการแบน', type: 'string', required: true },
      { name: 'expire', label: 'เวลาหมดอายุ (Unix)', type: 'number' }
    ]
  },
  bank_accounts_new: {
    name: 'bank_accounts_new',
    label: 'บัญชีการเงินสังคม (Society Banking)',
    description: 'บัญชีกองทุนกลางหน่วยงาน เช่น ตำรวจ หมอ กรมการขนส่ง แก๊ง (FiveM Real Data)',
    primaryKey: 'id',
    permittedForEditing: true,
    columns: [
      { name: 'id', label: 'ชื่อบัญชีหน่วยงาน (Account ID)', type: 'string', primaryKey: true, required: true, readOnly: true },
      { name: 'amount_satang', label: 'ยอดเงินคงเหลือ', type: 'currency_satang', required: true },
      { name: 'isFrozen', label: 'ระงับบัญชี (1=อายัด, 0=ปกติ)', type: 'number' },
      { name: 'creator', label: 'ผู้สร้างบัญชี', type: 'string', readOnly: true }
    ]
  },
  admin_users: {
    name: 'admin_users',
    label: 'ผู้ใช้แอดมิน (Admin Users)',
    description: 'จัดการสิทธิ์บัญชีผู้ใช้ที่ได้รับอนุญาตให้เข้าถึงระบบแอดมิน',
    primaryKey: 'id',
    permittedForEditing: true,
    columns: [
      { name: 'id', label: 'ID', type: 'number', primaryKey: true, readOnly: true },
      { name: 'username', label: 'Username', type: 'string', required: true },
      { name: 'display_name', label: 'ชื่อแสดงผล', type: 'string', required: true },
      { name: 'role', label: 'บทบาท (Role)', type: 'select', options: ['admin', 'viewer'], required: true },
      { name: 'status', label: 'สถานะ', type: 'select', options: ['active', 'inactive'], required: true },
      { name: 'created_at', label: 'วันที่สร้าง', type: 'datetime', readOnly: true }
    ]
  }
};
