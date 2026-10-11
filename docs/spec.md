# FiveM Database Admin Interface Specification (`docs/spec.md`)

## 1. ภาพรวมระบบ (Overview)
ระบบเว็บแอปพลิเคชันบริหารจัดการฐานข้อมูล (Database Admin Interface) สำหรับโปรเจกต์ FiveM (Qbox Framework) พัฒนาด้วยเทคโนโลยี:
- **Next.js (App Router)** + **TypeScript**
- **Tailwind CSS** + **shadcn/ui Design Tokens** + **Lucide Icons**
- **Node.js Native SQLite Engine (`node:sqlite`)** พร้อมระบบ Transaction, WAL Mode, และ Foreign Key Integrity
- **Role-Based Access Control (RBAC)**: รองรับบทบาท `admin` (แก้ไขข้อมูลได้) และ `viewer` (ดูได้อย่างเดียว / Read-only)
- **Comprehensive Audit Trail**: บันทึกทุกการเปลี่ยนแปลงลงในตาราง `admin_audit_logs` พร้อมค่า Before/After, ผู้แก้ไข, เวลา, และเหตุผลบังคับกรอก (Audit Reason)
- **Integer Satang Currency Management**: จัดเก็บยอดเงินเป็นจำนวนเต็มสตางค์ (Integer Satang) 100% ไม่ใช้เลขทศนิยม ป้องกันการคลาดเคลื่อนของข้อมูลทางการเงิน

---

## 2. โครงสร้างฐานข้อมูล (Database Schema)

### 2.1 ตารางจัดการผู้ใช้ระบบแอดมิน (`admin_users`)
จัดเก็บรายชื่อและสิทธิ์ของผู้ใช้งานที่มีสิทธิ์เข้าใช้งาน Admin Interface:
| Column | Type | Constraints | คำอธิบาย |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | ลำดับผู้ใช้ |
| `username` | TEXT | UNIQUE NOT NULL | ชื่อบัญชีเข้าใช้งาน |
| `password_hash` | TEXT | NOT NULL | รหัสผ่านแฮช |
| `display_name` | TEXT | NOT NULL | ชื่อแสดงผล |
| `role` | TEXT | CHECK IN ('admin', 'viewer') | บทบาทสิทธิ์ (Admin / Viewer) |
| `status` | TEXT | CHECK IN ('active', 'inactive') | สถานะการใช้งาน |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | วันที่สร้าง |

### 2.2 ตารางประวัติการแก้ไข (`admin_audit_logs`)
| Column | Type | Constraints | คำอธิบาย |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | ลำดับ Log |
| `user_id` | INTEGER | | รหัสผู้แก้ไข |
| `username` | TEXT | NOT NULL | ชื่อผู้แก้ไข |
| `table_name` | TEXT | NOT NULL | ชื่อตารางที่ถูกแก้ไข |
| `record_id` | TEXT | NOT NULL | Primary Key ของแถวที่ถูกแก้ไข |
| `action` | TEXT | CHECK IN ('CREATE', 'UPDATE', 'DELETE') | ประเภทการดำเนินการ |
| `before_data` | TEXT | JSON | ข้อมูลเดิมก่อนแก้ไข |
| `after_data` | TEXT | JSON | ข้อมูลใหม่หลังแก้ไข |
| `reason` | TEXT | NOT NULL | เหตุผลในการแก้ไข |
| `ip_address` | TEXT | | IP ของผู้ดำเนินการ |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | เวลาที่ทำการแก้ไข |

### 2.3 ตารางข้อมูลหลัก (Core Managed Tables)
1. **`players`**: ข้อมูลตัวละคร, license, phone_number, job, gang, cash_satang, bank_satang, crypto_satang, is_dead
2. **`player_vehicles`**: ทะเบียนรถ (plate), citizenid, model, garage, state, fuel, engine_health, body_health
3. **`bans`**: รายการแบนผู้เล่น, reason, banned_by, expire
4. **`banking_accounts`**: บัญชีธนาคารส่วนตัวและแก๊ง, balance_satang

---

## 3. ข้อมูลตัวอย่าง (Sample Data) และคำสั่งล้างข้อมูล
- ข้อมูลตัวอย่างทุกแถวถูกกำกับด้วยฟิลด์ `is_sample = 1`
- คำสั่ง Seed ข้อมูล: `npm run seed`
- คำสั่งถอนการติดตั้งข้อมูลตัวอย่างคำสั่งเดียว: `npm run seed:undo` (ลบเฉพาะแถวที่เป็น `is_sample = 1` โดยไม่กระทบข้อมูลจริง)

---

## 4. คู่มือการใช้งานสำหรับแต่ละบทบาท (Role Usage Guide)

### 4.1 บทบาท Administrator
- สามารถค้นหา, กรอง, จัดเรียง และดูข้อมูลได้ทุกตาราง
- สามารถกดปุ่ม **"แก้ไข"** ในตารางที่ได้รับอนุญาต
- ระบบจะสร้างฟอร์มแก้ไขอัตโนมัติตาม Column Data Type (ตัวเลข, ข้อความ, วันเวลา, ตัวเลือก Select, สกุลเงินสตางค์)
- **จำเป็นต้องระบุเหตุผลในการแก้ไข (Audit Reason)** ก่อนกดยืนยันบันทึกข้อมูล
- ทุกการแก้ไขจะถูกบันทึกลง `admin_audit_logs` ทันที

### 4.2 บทบาท Viewer (Read-only)
- สามารถดูข้อมูล ค้นหา และกรองข้อมูลได้ตามปกติ
- เมื่อคลิกดูแถวข้อมูล ปุ่มจะเป็น **"ดูข้อมูล"** (Inspect)
- ฟิลด์ทั้งหมดในฟอร์มจะถูกล็อก (Disabled) ไม่สามารถแก้ไขค่าได้
- มีแบนเนอร์แจ้งเตือนสถานะ Viewer อย่างชัดเจน
- หากมีการส่งคำขออัปเดตผ่าน API จะถูกบล็อกด้วยสถานะ **403 Forbidden** ทันที

---

## 5. ผลการทดสอบเกณฑ์การยอมรับ (Acceptance Criteria Results)
ชุดทดสอบแบบอัตโนมัติรันผ่านคำสั่ง `npm test` ผลการทดสอบ: **4 passed / 0 failed**:
1. **Pagination & Scalability Test**: ผ่านการทดสอบแบ่งหน้า Server-side กับข้อมูลขนาดใหญ่ รวดเร็วและแม่นยำ
2. **Viewer Role RBAC Test**: สิทธิ์ Viewer ถูกปฏิเสธสถานะ 403 Forbidden ทั้ง UI และ API
3. **Type Mismatch Validation Test**: ปฏิเสธค่าที่ไม่ใช่จำนวนเต็มในฟิลด์ Satang และค่าผิดประเภทก่อนส่งถึงฐานข้อมูล (400 Bad Request)
4. **Audit Logging Test**: บันทึกข้อมูล ก่อน-หลัง (Before/After Diff) พร้อมเหตุผลและชื่อผู้แก้ไขถูกต้องครบถ้วน

---

## 6. คำสั่งเปิดใช้งานระบบ (Run Command)
```bash
cd admin-panel
npm run dev
# เปิดใช้งานที่ http://localhost:3005 หรือ http://<IP-Address>:3005
```
