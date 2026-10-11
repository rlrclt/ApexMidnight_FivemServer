"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  UserCheck,
  Server,
  ExternalLink,
  Plus,
  RefreshCw,
  Trash2,
  Edit2,
  KeyRound,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Copy,
  Check,
  Globe,
  Sliders,
  Terminal,
  Activity,
  Sparkles,
} from "lucide-react";

interface WebAdmin {
  id: number;
  username: string;
  display_name: string;
  role: "admin" | "viewer";
  status: "active" | "inactive";
  created_at: string;
}

interface FivemAdmin {
  identifier: string;
  group: string;
  comment?: string;
  rawLine: string;
}

interface TxAdmin {
  name: string;
  master: boolean;
  permissions: string[];
  providers: Record<string, { id?: string; identifier?: string }>;
}

export default function AdminUsersPage() {
  const [activeTab, setActiveTab] = useState<"overview" | "web" | "fivem" | "txadmin">("overview");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [webAdmins, setWebAdmins] = useState<WebAdmin[]>([]);
  const [fivemAdmins, setFivemAdmins] = useState<FivemAdmin[]>([]);
  const [txAdmins, setTxAdmins] = useState<TxAdmin[]>([]);
  const [txUrl, setTxUrl] = useState("http://192.168.2.35:40120");
  const [txOnline, setTxOnline] = useState<boolean | null>(null);
  const [txLatency, setTxLatency] = useState<number>(0);

  // Modal State for Web Admin
  const [webModalOpen, setWebModalOpen] = useState(false);
  const [editingWebUser, setEditingWebUser] = useState<Partial<WebAdmin> & { password?: string }>({});

  // Modal State for FiveM In-Game Admin
  const [fivemModalOpen, setFivemModalOpen] = useState(false);
  const [newFivem, setNewFivem] = useState({ identifier: "", name: "", group: "group.admin" });

  const [copiedText, setCopiedText] = useState<string | null>(null);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const fetchData = async () => {
    try {
      setRefreshing(true);
      const [dataRes, txRes] = await Promise.all([
        fetch("/api/admin-users"),
        fetch("/api/txadmin/status"),
      ]);

      if (dataRes.ok) {
        const d = await dataRes.json();
        setWebAdmins(d.webAdmins || []);
        setFivemAdmins(d.fivemAdmins || []);
        setTxAdmins(d.txAdmins || []);
        if (d.txAdminUrl) setTxUrl(d.txAdminUrl);
      }

      if (txRes.ok) {
        const tx = await txRes.json();
        setTxOnline(tx.online);
        setTxLatency(tx.latencyMs || 0);
        if (tx.txAdminExternalUrl) setTxUrl(tx.txAdminExternalUrl);
      }
    } catch (err: any) {
      console.error(err);
      setMessage({ type: "error", text: "ไม่สามารถโหลดข้อมูลสิทธิ์แอดมินได้" });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveWebAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_web_admin",
          id: editingWebUser.id,
          username: editingWebUser.username,
          display_name: editingWebUser.display_name,
          role: editingWebUser.role || "viewer",
          status: editingWebUser.status || "active",
          password: editingWebUser.password,
        }),
      });

      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "เกิดข้อผิดพลาด");

      setMessage({ type: "success", text: d.message || "บันทึกข้อมูลเรียบร้อยแล้ว" });
      setWebModalOpen(false);
      setEditingWebUser({});
      fetchData();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    }
  };

  const handleDeleteWebAdmin = async (id: number) => {
    if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการลบบัญชีผู้ดูแลระบบเว็บนี้?")) return;
    try {
      const res = await fetch("/api/admin-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_web_admin", id }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "เกิดข้อผิดพลาด");
      setMessage({ type: "success", text: "ลบผู้ใช้เรียบร้อยแล้ว" });
      fetchData();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    }
  };

  const handleAddFivemAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_fivem_admin",
          identifier: newFivem.identifier,
          name: newFivem.name,
          group: newFivem.group,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "เกิดข้อผิดพลาด");
      setMessage({ type: "success", text: "เพิ่มสิทธิ์ FiveM In-game เรียบร้อยแล้ว!" });
      setFivemModalOpen(false);
      setNewFivem({ identifier: "", name: "", group: "group.admin" });
      fetchData();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    }
  };

  const handleRemoveFivemAdmin = async (identifier: string) => {
    if (!confirm(`ต้องการเพิกถอนสิทธิ์ของ ${identifier} หรือไม่?`)) return;
    try {
      const res = await fetch("/api/admin-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove_fivem_admin", identifier }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "เกิดข้อผิดพลาด");
      setMessage({ type: "success", text: "เพิกถอนสิทธิ์เรียบร้อยแล้ว" });
      fetchData();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2 text-primary font-semibold text-xs tracking-wider uppercase mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Permissions & Governance</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            จัดการสิทธิ์แอดมิน (Admin Access)
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            ควบคุมสิทธิ์ Web Portal, สิทธิ์ In-game (permissions.cfg) และการเชื่อมต่อ txAdmin
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg border border-border bg-card hover:bg-muted text-foreground transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            รีเฟรช
          </button>

          <a
            href="/tables/admin_users"
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg border border-border bg-card hover:bg-muted text-foreground transition-colors"
            title="ดูในรูปแบบตาราง Table Viewer ดั้งเดิม"
          >
            <Sliders className="w-3.5 h-3.5 text-primary" />
            <span>มุมมองตาราง (Table View)</span>
          </a>

          <a
            href={txUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-all"
          >
            <Server className="w-3.5 h-3.5" />
            <span>เข้าสู่ txAdmin</span>
            <ExternalLink className="w-3 h-3 ml-0.5" />
          </a>
        </div>
      </div>

      {/* Alert Notification */}
      {message && (
        <div
          className={`flex items-center justify-between p-3.5 rounded-lg text-sm border ${
            message.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              : "bg-red-500/10 border-red-500/30 text-red-400"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {message.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
          <button
            onClick={() => setMessage(null)}
            className="text-xs opacity-70 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* txAdmin Connection Banner Card */}
      <div className="rounded-xl border border-border bg-gradient-to-r from-card to-card/50 p-5 shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-base text-foreground">txAdmin Control System</h3>
                <span
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                    txOnline
                      ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
                      : "bg-red-500/10 border-red-500/25 text-red-400"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      txOnline ? "bg-emerald-400 animate-pulse" : "bg-red-400"
                    }`}
                  />
                  {txOnline ? "ออนไลน์ (Online)" : "ออฟไลน์ (Offline)"}
                </span>
                {txLatency > 0 && (
                  <span className="text-xs text-muted-foreground">({txLatency}ms)</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                เชื่อมต่อไปยังพอร์ต 40120 เพื่อดูคอนโซลเซิร์ฟเวอร์, ผู้เล่นออนไลน์สด, และรีสตาร์ทเกม
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden lg:block">
              <div className="text-xs font-mono text-muted-foreground">{txUrl}</div>
              <div className="text-[11px] text-emerald-400/80">txAdmin v8.1.1 (ApexMidnight)</div>
            </div>
            <a
              href={txUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all shrink-0"
            >
              <span>เปิดแดชบอร์ด</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-border gap-2">
        <button
          onClick={() => setActiveTab("overview")}
          className={`pb-3 px-3.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "overview"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>ภาพรวมสิทธิ์ (Overview)</span>
        </button>
        <button
          onClick={() => setActiveTab("web")}
          className={`pb-3 px-3.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "web"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span>ผู้ดูแลระบบเว็บ ({webAdmins.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("fivem")}
          className={`pb-3 px-3.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "fivem"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>สิทธิ์ FiveM In-game ({fivemAdmins.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("txadmin")}
          className={`pb-3 px-3.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "txadmin"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Server className="w-3.5 h-3.5" />
          <span>บัญชี txAdmin ({txAdmins.length})</span>
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Metric 1 */}
            <div className="p-5 rounded-xl border border-border bg-card">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium">เว็บแอดมิน (Web Portal)</span>
                <UserCheck className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-2xl font-bold mt-2 text-foreground">{webAdmins.length} บัญชี</div>
              <div className="text-xs text-muted-foreground mt-1">
                Super Admin {webAdmins.filter((w) => w.role === "admin").length} คน, Viewer{" "}
                {webAdmins.filter((w) => w.role === "viewer").length} คน
              </div>
            </div>

            {/* Metric 2 */}
            <div className="p-5 rounded-xl border border-border bg-card">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium">สิทธิ์ In-Game (permissions.cfg)</span>
                <Terminal className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-bold mt-2 text-foreground">{fivemAdmins.length} รายการ</div>
              <div className="text-xs text-muted-foreground mt-1">
                License, Discord และ FiveM ID ที่มีสิทธิ์ group.admin
              </div>
            </div>

            {/* Metric 3 */}
            <div className="p-5 rounded-xl border border-border bg-card">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium">txAdmin แอดมิน</span>
                <Server className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold mt-2 text-foreground">{txAdmins.length} บัญชี</div>
              <div className="text-xs text-muted-foreground mt-1">
                Master Admin: {txAdmins.filter((t) => t.master).map((t) => t.name).join(", ") || "-"}
              </div>
            </div>
          </div>

          {/* Quick Permission Info Box */}
          <div className="p-5 rounded-xl border border-border bg-card/60 space-y-3">
            <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
              <Sliders className="w-4 h-4 text-primary" />
              <span>ลำดับสิทธิ์และการจัดการ (Access Architecture)</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-muted-foreground">
              <div className="p-3 rounded-lg bg-secondary/40 border border-border space-y-1">
                <div className="font-semibold text-foreground">1. เว็บแอดมิน (Web Portal)</div>
                <p>จัดการฐานข้อมูลจริง (MySQL) ดูข้อมูลผู้เล่น รถ แบน และเงินสะสม</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/40 border border-border space-y-1">
                <div className="font-semibold text-foreground">2. สิทธิ์ FiveM (In-game)</div>
                <p>ใช้คำสั่งในเกม เช่น /noclip, /adminmenu, /fix, /revive ผ่าน permissions.cfg</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/40 border border-border space-y-1">
                <div className="font-semibold text-foreground">3. txAdmin Web Portal</div>
                <p>แผงควบคุมหลักสำหรับจัดการเครื่อง เซิร์ฟเวอร์ และดูคอนโซลแบบเรียลไทม์</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: WEB ADMINS */}
      {activeTab === "web" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-foreground">ผู้ดูแลระบบเว็บ (Admin Users)</h2>
              <p className="text-xs text-muted-foreground">
                จัดการบัญชีผู้ใช้งานที่สามารถล็อกอินและเข้าดูข้อมูลในเว็บ Admin Panel นี้
              </p>
            </div>
            <button
              onClick={() => {
                setEditingWebUser({ role: "viewer", status: "active" });
                setWebModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>เพิ่มผู้ดูแลเว็บ</span>
            </button>
          </div>

          <div className="rounded-xl border border-border overflow-hidden bg-card">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 border-b border-border text-muted-foreground uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">ชื่อผู้ใช้ (Username)</th>
                  <th className="py-3 px-4">ชื่อแสดงผล</th>
                  <th className="py-3 px-4">สิทธิ์การใช้งาน (Role)</th>
                  <th className="py-3 px-4">สถานะ</th>
                  <th className="py-3 px-4">วันที่สร้าง</th>
                  <th className="py-3 px-4 text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {webAdmins.map((user) => (
                  <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-medium text-foreground">
                      {user.username}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-foreground">
                      {user.display_name}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                          user.role === "admin"
                            ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
                            : "bg-blue-500/10 border-blue-500/25 text-blue-400"
                        }`}
                      >
                        {user.role === "admin" ? "Super Admin" : "Viewer (อ่านอย่างเดียว)"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                          user.status === "active"
                            ? "text-emerald-400"
                            : "text-muted-foreground"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            user.status === "active" ? "bg-emerald-400" : "bg-zinc-500"
                          }`}
                        />
                        {user.status === "active" ? "ใช้งานปกติ" : "ระงับการใช้งาน"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground">{user.created_at || "-"}</td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <button
                        onClick={() => {
                          setEditingWebUser(user);
                          setWebModalOpen(true);
                        }}
                        className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        title="แก้ไขข้อมูล"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {user.id !== 1 && (
                        <button
                          onClick={() => handleDeleteWebAdmin(user.id)}
                          className="p-1.5 rounded-md hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
                          title="ลบผู้ใช้"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: FIVEM IN-GAME ADMINS */}
      {activeTab === "fivem" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-foreground">
                สิทธิ์แอดมิน FiveM In-game (permissions.cfg)
              </h2>
              <p className="text-xs text-muted-foreground">
                ตั้งค่า ACE Principal สำหรับผู้เล่นที่มีสิทธิ์ใช้คำสั่งแอดมินในตัวเกม
              </p>
            </div>
            <button
              onClick={() => setFivemModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>เพิ่มสิทธิ์ผู้เล่น</span>
            </button>
          </div>

          <div className="rounded-xl border border-border overflow-hidden bg-card">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 border-b border-border text-muted-foreground uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Identifier / License</th>
                  <th className="py-3 px-4">ชื่อ / หมายเหตุ</th>
                  <th className="py-3 px-4">ระดับสิทธิ์ (Group)</th>
                  <th className="py-3 px-4 text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {fivemAdmins.map((entry, idx) => (
                  <tr key={idx} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-medium text-foreground">
                      <div className="flex items-center gap-2">
                        <span className="truncate max-w-xs">{entry.identifier}</span>
                        <button
                          onClick={() => copyToClipboard(entry.identifier)}
                          className="text-muted-foreground hover:text-foreground"
                          title="คัดลอก Identifier"
                        >
                          {copiedText === entry.identifier ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-foreground font-medium">
                      {entry.comment || "-"}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 border border-amber-500/25 text-amber-400">
                        {entry.group}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleRemoveFivemAdmin(entry.identifier)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>เพิกถอนสิทธิ์</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: TXADMIN ACCOUNTS */}
      {activeTab === "txadmin" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-foreground">
                บัญชีผู้ดูแลระบบ txAdmin (admins.json)
              </h2>
              <p className="text-xs text-muted-foreground">
                รายการบัญชีที่สามารถล็อกอินเข้าควบคุมเว็บแดชบอร์ด txAdmin ได้โดยตรง
              </p>
            </div>
            <a
              href={txUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>เปิดหน้าล็อกอิน txAdmin</span>
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {txAdmins.map((admin, idx) => (
              <div key={idx} className="p-5 rounded-xl border border-border bg-card space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs uppercase">
                      {admin.name.slice(0, 2)}
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm text-foreground">{admin.name}</h4>
                      <span className="text-[11px] text-muted-foreground">
                        {admin.master ? "Master Account" : "Staff Administrator"}
                      </span>
                    </div>
                  </div>
                  {admin.master && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/25">
                      MASTER
                    </span>
                  )}
                </div>

                <div className="pt-2 border-t border-border/60 text-xs space-y-1.5">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Providers:</span>
                    <span className="font-mono text-foreground">
                      {Object.keys(admin.providers).join(", ") || "None"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Permissions:</span>
                    <span className="font-medium text-foreground">
                      {admin.master ? "All Access (*)" : admin.permissions.join(", ") || "Custom"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: WEB ADMIN (CREATE / EDIT) */}
      {webModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-md p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-semibold text-base text-foreground">
                {editingWebUser.id ? "แก้ไขข้อมูลผู้ดูแลระบบเว็บ" : "เพิ่มผู้ดูแลระบบเว็บคนใหม่"}
              </h3>
              <button
                onClick={() => setWebModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveWebAdmin} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-medium text-foreground">Username (สำหรับล็อกอิน)</label>
                <input
                  type="text"
                  required
                  value={editingWebUser.username || ""}
                  onChange={(e) =>
                    setEditingWebUser({ ...editingWebUser, username: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-border bg-secondary/50 text-foreground focus:outline-hidden focus:border-primary"
                  placeholder="เช่น admin2, auditor"
                />
              </div>

              <div className="space-y-1">
                <label className="font-medium text-foreground">ชื่อแสดงผล (Display Name)</label>
                <input
                  type="text"
                  required
                  value={editingWebUser.display_name || ""}
                  onChange={(e) =>
                    setEditingWebUser({ ...editingWebUser, display_name: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-border bg-secondary/50 text-foreground focus:outline-hidden focus:border-primary"
                  placeholder="เช่น Staff John"
                />
              </div>

              <div className="space-y-1">
                <label className="font-medium text-foreground">
                  รหัสผ่าน {editingWebUser.id && "(เว้นว่างไว้หากไม่ต้องการเปลี่ยน)"}
                </label>
                <input
                  type="password"
                  value={editingWebUser.password || ""}
                  onChange={(e) =>
                    setEditingWebUser({ ...editingWebUser, password: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-border bg-secondary/50 text-foreground focus:outline-hidden focus:border-primary"
                  placeholder="••••••••"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-foreground">บทบาท (Role)</label>
                  <select
                    value={editingWebUser.role || "viewer"}
                    onChange={(e) =>
                      setEditingWebUser({
                        ...editingWebUser,
                        role: e.target.value as "admin" | "viewer",
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-border bg-secondary/50 text-foreground focus:outline-hidden focus:border-primary"
                  >
                    <option value="admin">Super Admin (จัดการได้ทั้งหมด)</option>
                    <option value="viewer">Viewer (ดูได้อย่างเดียว)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-foreground">สถานะ (Status)</label>
                  <select
                    value={editingWebUser.status || "active"}
                    onChange={(e) =>
                      setEditingWebUser({
                        ...editingWebUser,
                        status: e.target.value as "active" | "inactive",
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-border bg-secondary/50 text-foreground focus:outline-hidden focus:border-primary"
                  >
                    <option value="active">เปิดใช้งาน (Active)</option>
                    <option value="inactive">ปิดใช้งาน (Inactive)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setWebModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-border text-foreground hover:bg-muted font-medium"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
                >
                  บันทึกข้อมูล
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: FIVEM IN-GAME ADMIN */}
      {fivemModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-md p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-semibold text-base text-foreground">
                เพิ่มสิทธิ์ FiveM In-game (permissions.cfg)
              </h3>
              <button
                onClick={() => setFivemModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddFivemAdmin} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-medium text-foreground">Identifier หรือ License</label>
                <input
                  type="text"
                  required
                  value={newFivem.identifier}
                  onChange={(e) => setNewFivem({ ...newFivem, identifier: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-secondary/50 text-foreground focus:outline-hidden focus:border-primary font-mono"
                  placeholder="เช่น license:643fee... หรือ discord:584090..."
                />
                <p className="text-[11px] text-muted-foreground">
                  สามารถคัดลอก License ได้จากหน้าเมนู "ผู้เล่น (Players)"
                </p>
              </div>

              <div className="space-y-1">
                <label className="font-medium text-foreground">ชื่อผู้เล่น / หมายเหตุ</label>
                <input
                  type="text"
                  value={newFivem.name}
                  onChange={(e) => setNewFivem({ ...newFivem, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-secondary/50 text-foreground focus:outline-hidden focus:border-primary"
                  placeholder="เช่น Staff Somchai"
                />
              </div>

              <div className="space-y-1">
                <label className="font-medium text-foreground">ระดับสิทธิ์ (Group)</label>
                <select
                  value={newFivem.group}
                  onChange={(e) => setNewFivem({ ...newFivem, group: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-secondary/50 text-foreground focus:outline-hidden focus:border-primary"
                >
                  <option value="group.admin">group.admin (สิทธิ์เต็ม / Admin Commands)</option>
                  <option value="group.mod">group.mod (Moderator)</option>
                  <option value="group.support">group.support (Supporter)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setFivemModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-border text-foreground hover:bg-muted font-medium"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
                >
                  เพิ่มสิทธิ์
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
