"use client";

import React, { useState, useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { 
  History, 
  Search, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  X,
  FileSpreadsheet,
  ArrowRight
} from "lucide-react";

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({
        page: page.toString(),
        limit: "15",
        search: search.trim()
      });
      const res = await fetch(`/api/audit-logs?${q.toString()}`);
      const json = await res.json();
      setLogs(json.logs || []);
      setTotalPages(json.pagination.totalPages || 1);
      setTotal(json.pagination.total || 0);
    } catch (err) {
      console.error("Error loading audit logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col lg:flex-row">
      <Sidebar currentRole="admin" username="SuperAdmin" />

      <main className="flex-1 w-full lg:ml-72 p-4 lg:p-8 max-w-7xl mx-auto overflow-x-hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <History className="w-6 h-6 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">
                ประวัติการแก้ไขข้อมูล (Audit Trail Logs)
              </h1>
            </div>
            <p className="text-sm text-muted-foreground">
              บันทึกทุกการเปลี่ยนแปลงในฐานข้อมูล: ผู้ดำเนินการ, เวลา, ค่าก่อน-หลัง, และเหตุผลประกอบ
            </p>
          </div>

          <button
            onClick={fetchLogs}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-muted text-sm font-medium transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            <span>รีเฟรชประวัติ</span>
          </button>
        </div>

        {/* Filter */}
        <div className="p-4 rounded-xl bg-card border border-border mb-6 shadow-sm">
          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="ค้นหาชื่อผู้ดำเนินการ, ตาราง, Record ID, หรือเหตุผล..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg text-sm hover:opacity-90"
            >
              ค้นหา
            </button>
          </form>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-muted-foreground text-xs font-semibold">
                  <th className="py-3 px-4 w-16">ID</th>
                  <th className="py-3 px-4">วัน-เวลา</th>
                  <th className="py-3 px-4">ผู้แก้ไข</th>
                  <th className="py-3 px-4">ตาราง (Table)</th>
                  <th className="py-3 px-4">Record ID</th>
                  <th className="py-3 px-4">ประเภท</th>
                  <th className="py-3 px-4">เหตุผล (Reason)</th>
                  <th className="py-3 px-4 text-right pr-6">รายละเอียด</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading && logs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-muted-foreground">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                      กำลังโหลดประวัติ Audit Log...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-muted-foreground">
                      ยังไม่มีประวัติการเปลี่ยนแปลงข้อมูล
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 text-xs font-mono text-muted-foreground">#{log.id}</td>
                      <td className="py-3 px-4 text-xs whitespace-nowrap text-muted-foreground">
                        {log.created_at}
                      </td>
                      <td className="py-3 px-4 text-xs font-semibold text-foreground">
                        <span className="px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground border border-border">
                          {log.username}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs font-mono font-medium text-primary">
                        {log.table_name}
                      </td>
                      <td className="py-3 px-4 text-xs font-mono text-foreground font-semibold">
                        {log.record_id}
                      </td>
                      <td className="py-3 px-4 text-xs">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground max-w-xs truncate" title={log.reason}>
                        {log.reason}
                      </td>
                      <td className="py-3 px-4 text-right pr-6 whitespace-nowrap">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-secondary text-secondary-foreground hover:bg-muted"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>ดู Before/After</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
            <div>
              ทั้งหมด <span className="font-bold text-foreground">{total}</span> รายการ
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="p-1.5 rounded-lg bg-secondary text-secondary-foreground hover:bg-muted disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs px-2.5 py-1 bg-secondary rounded-lg font-medium text-foreground">
                {page} / {totalPages || 1}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="p-1.5 rounded-lg bg-secondary text-secondary-foreground hover:bg-muted disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Before / After Detail Modal */}
        {selectedLog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-2xl bg-card rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-5 border-b border-border flex items-center justify-between bg-muted/30">
                <div>
                  <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-primary" />
                    <span>รายละเอียดการแก้ไขข้อมูล (Audit Diff)</span>
                  </h3>
                  <p className="text-xs text-muted-foreground font-mono">
                    ตาราง: {selectedLog.table_name} | ID: {selectedLog.record_id} | โดย: {selectedLog.username}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div className="p-3 rounded-lg bg-secondary/50 border border-border text-xs">
                  <span className="font-bold text-foreground">เหตุผลที่ระบุ (Reason): </span>
                  <span className="text-muted-foreground">{selectedLog.reason}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Before Data */}
                  <div className="space-y-1.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-rose-500">
                      ค่าเดิมก่อนแก้ไข (Before)
                    </h4>
                    <pre className="p-3 rounded-xl bg-background border border-border text-xs font-mono text-muted-foreground overflow-x-auto max-h-80">
                      {selectedLog.before_data
                        ? JSON.stringify(JSON.parse(selectedLog.before_data), null, 2)
                        : "(ไม่มีข้อมูลก่อนหน้า)"}
                    </pre>
                  </div>

                  {/* After Data */}
                  <div className="space-y-1.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-500">
                      ค่าใหม่หลังแก้ไข (After)
                    </h4>
                    <pre className="p-3 rounded-xl bg-background border border-border text-xs font-mono text-emerald-600 dark:text-emerald-400 overflow-x-auto max-h-80">
                      {selectedLog.after_data
                        ? JSON.stringify(JSON.parse(selectedLog.after_data), null, 2)
                        : "(ไม่มีข้อมูลหลังแก้ไข)"}
                    </pre>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-border flex justify-end">
                <button
                  onClick={() => setSelectedLog(null)}
                  className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg text-sm font-medium hover:bg-muted"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
