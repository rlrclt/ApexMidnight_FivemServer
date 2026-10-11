"use client";

import React, { useState, useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { formatSatangToBaht } from "@/lib/utils";
import { ColumnMeta, TableConfig } from "@/lib/tables-config";
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  ChevronLeft, 
  ChevronRight, 
  Edit3, 
  Eye, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw,
  X,
  ShieldCheck,
  ShieldAlert
} from "lucide-react";

interface TableViewerProps {
  initialTable: string;
}

export function TableViewer({ initialTable }: TableViewerProps) {
  const [currentTable, setCurrentTable] = useState(initialTable);
  const [role, setRole] = useState<"admin" | "viewer">("admin");
  const [username, setUsername] = useState("SuperAdmin");
  
  // Data states
  const [data, setData] = useState<any[]>([]);
  const [config, setConfig] = useState<TableConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination & Filtering states
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("");
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("ASC");
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Edit Modal states
  const [selectedRow, setSelectedRow] = useState<any | null>(null);
  const [editFormData, setEditFormData] = useState<Record<string, any>>({});
  const [editReason, setEditReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        search: search.trim(),
        sortBy: sortBy,
        sortOrder: sortOrder
      });

      const res = await fetch(`/api/tables/${currentTable}?${q.toString()}`);
      if (!res.ok) {
        throw new Error(`Failed to load data (${res.status} ${res.statusText})`);
      }
      const json = await res.json();
      setData(json.data || []);
      setConfig(json);
      setTotalPages(json.pagination.totalPages || 1);
      setTotalRecords(json.pagination.totalRecords || 0);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred while loading table data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentTable, page, limit, sortBy, sortOrder]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchData();
  };

  const handleSort = (columnName: string) => {
    if (sortBy === columnName) {
      setSortOrder(sortOrder === "ASC" ? "DESC" : "ASC");
    } else {
      setSortBy(columnName);
      setSortOrder("ASC");
    }
    setPage(1);
  };

  const openEditModal = (row: any) => {
    setSelectedRow(row);
    setEditFormData({ ...row });
    setEditReason("");
    setSubmitError(null);
    setSubmitSuccess(null);
  };

  const handleToggleFiveMAdmin = async (makeAdmin: boolean) => {
    if (!selectedRow) return;
    const confirmMsg = makeAdmin 
      ? `คุณต้องการแต่งตั้ง ${selectedRow.name} (${selectedRow.citizenid}) เป็นแอดมิน FiveM ใช่หรือไม่?`
      : `คุณต้องการถอนสิทธิ์แอดมินของ ${selectedRow.name} (${selectedRow.citizenid}) ใช่หรือไม่?`;

    if (!window.confirm(confirmMsg)) return;

    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const res = await fetch(`/api/players/${selectedRow.citizenid}/toggle-admin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-role": role,
          "x-user-name": username,
          "x-user-id": role === "admin" ? "1" : "2"
        },
        body: JSON.stringify({
          license: selectedRow.license,
          playerName: selectedRow.name,
          makeAdmin,
          reason: editReason.trim() || (makeAdmin ? "Promoted to FiveM Admin via Portal" : "Revoked FiveM Admin via Portal")
        })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update admin permission");

      setSubmitSuccess(json.message);
      setSelectedRow((prev: any) => ({ ...prev, is_admin_game: makeAdmin ? 1 : 0 }));
      setEditFormData((prev: any) => ({ ...prev, is_admin_game: makeAdmin ? 1 : 0 }));
      fetchData();
    } catch (err: any) {
      setSubmitError(err.message || "Failed to toggle admin permission");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config || !selectedRow) return;

    if (!editReason.trim() || editReason.trim().length < 3) {
      setSubmitError("จำเป็นต้องระบุเหตุผลในการแก้ไขอย่างน้อย 3 ตัวอักษร");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const id = selectedRow[config.primaryKey];
      const res = await fetch(`/api/tables/${config.name}/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-role": role,
          "x-user-name": username,
          "x-user-id": role === "admin" ? "1" : "2"
        },
        body: JSON.stringify({
          updates: editFormData,
          reason: editReason.trim()
        })
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || `HTTP ${res.status}`);
      }

      setSubmitSuccess("บันทึกข้อมูลและบันทึกประวัติ Audit Log สำเร็จเรียบร้อยแล้ว!");
      setTimeout(() => {
        setSelectedRow(null);
        fetchData();
      }, 1200);
    } catch (err: any) {
      setSubmitError(err.message || "Failed to update record");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col lg:flex-row">
      <Sidebar
        currentRole={role}
        username={username}
        onRoleSwitch={(newRole) => {
          setRole(newRole);
          setUsername(newRole === "admin" ? "SuperAdmin" : "AuditorViewer");
        }}
      />

      <main className="flex-1 w-full lg:ml-72 p-4 lg:p-8 max-w-7xl mx-auto overflow-x-hidden">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold text-foreground">
                {config ? config.label : currentTable}
              </h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium">
                {totalRecords.toLocaleString()} แถว
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {config ? config.description : "ฐานข้อมูลที่ได้รับอนุญาตให้เข้าถึง"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchData}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-muted text-sm font-medium transition-colors"
              title="รีเฟรชข้อมูล"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">รีเฟรช</span>
            </button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="p-4 rounded-xl bg-card border border-border mb-6 shadow-sm">
          <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="ค้นหาข้อมูลทุกคอลัมน์..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              <Filter className="w-4 h-4" />
              <span>ค้นหา</span>
            </button>
          </form>
        </div>

        {/* Status / Error State */}
        {error && (
          <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive flex items-center gap-3 mb-6">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <div className="text-sm">
              <span className="font-bold">เกิดข้อผิดพลาด: </span>
              {error}
            </div>
          </div>
        )}

        {/* Data Table Container (Responsive, No Overflow) */}
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-muted-foreground text-xs font-semibold">
                  <th className="py-3.5 px-4 w-12 text-center">#</th>
                  {config?.columns.map((col) => (
                    <th
                      key={col.name}
                      onClick={() => handleSort(col.name)}
                      className="py-3.5 px-4 cursor-pointer hover:text-foreground transition-colors select-none"
                    >
                      <div className="flex items-center gap-1.5 whitespace-nowrap">
                        <span>{col.label}</span>
                        <ArrowUpDown className="w-3.5 h-3.5 opacity-50" />
                      </div>
                    </th>
                  ))}
                  <th className="py-3.5 px-4 text-right pr-6 whitespace-nowrap">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading && data.length === 0 ? (
                  <tr>
                    <td colSpan={(config?.columns.length || 5) + 2} className="py-12 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                        <span>กำลังโหลดข้อมูลจากฐานข้อมูล...</span>
                      </div>
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={(config?.columns.length || 5) + 2} className="py-12 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <AlertCircle className="w-8 h-8 text-muted-foreground opacity-40" />
                        <span className="font-medium text-foreground">ไม่พบข้อมูลในตารางนี้</span>
                        <span className="text-xs">ลองค้นหาด้วยคำอื่น หรือเพิ่มข้อมูลใหม่</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  data.map((row, index) => (
                    <tr
                      key={row[config?.primaryKey || "id"] || index}
                      className="hover:bg-muted/30 transition-colors group"
                    >
                      <td className="py-3.5 px-4 text-center text-xs text-muted-foreground">
                        {(page - 1) * limit + index + 1}
                      </td>
                      {config?.columns.map((col) => {
                        const val = row[col.name];
                        return (
                          <td key={col.name} className="py-3.5 px-4 whitespace-nowrap text-foreground font-mono text-xs">
                            {col.type === "currency_satang" ? (
                              <span className="font-semibold text-emerald-500">
                                {formatSatangToBaht(Number(val) || 0)}
                              </span>
                            ) : col.name === "is_admin_game" ? (
                              val ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 shadow-sm">
                                  👑 ADMIN
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-muted text-muted-foreground border border-border">
                                  👤 PLAYER
                                </span>
                              )
                            ) : col.type === "boolean" ? (
                              <span
                                className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                                  val ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-muted text-muted-foreground"
                                }`}
                              >
                                {val ? "ใช่ / มีผล" : "ไม่"}
                              </span>
                            ) : (
                              String(val !== null && val !== undefined ? val : "-")
                            )}
                          </td>
                        );
                      })}
                      <td className="py-3.5 px-4 text-right pr-6 whitespace-nowrap">
                        <button
                          onClick={() => openEditModal(row)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                            role === "admin"
                              ? "bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground border border-primary/20"
                              : "bg-secondary text-secondary-foreground hover:bg-muted border border-border"
                          }`}
                        >
                          {role === "admin" ? <Edit3 className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          <span>{role === "admin" ? "แก้ไข" : "ดูข้อมูล"}</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="p-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
            <div>
              กำลังแสดงหน้า <span className="font-bold text-foreground">{page}</span> จากทั้งหมด{" "}
              <span className="font-bold text-foreground">{totalPages}</span> หน้า ({totalRecords} รายการ)
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="p-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                aria-label="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs px-3 py-1 bg-secondary rounded-lg font-medium text-foreground">
                {page} / {totalPages || 1}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="p-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                aria-label="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Edit Row Modal */}
        {selectedRow && config && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-lg bg-card rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              {/* Modal Header */}
              <div className="p-5 border-b border-border flex items-center justify-between bg-muted/30">
                <div>
                  <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                    {role === "admin" ? <Edit3 className="w-5 h-5 text-primary" /> : <Eye className="w-5 h-5 text-blue-500" />}
                    <span>{role === "admin" ? "แก้ไขข้อมูลแถว" : "ตรวจสอบข้อมูลแถว"}</span>
                  </h3>
                  <p className="text-xs text-muted-foreground font-mono">
                    {config.primaryKey}: {selectedRow[config.primaryKey]}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedRow(null)}
                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body Form */}
              <form onSubmit={handleEditSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
                {/* Role Warning Banner if Viewer */}
                {role === "viewer" && (
                  <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-500 flex items-center gap-3 text-xs">
                    <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                    <span>คุณกำลังอยู่ในสิทธิ์ **Viewer (Read-Only)** ไม่สามารถบันทึกการแก้ไขข้อมูลได้</span>
                  </div>
                )}

                {submitError && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{submitError}</span>
                  </div>
                )}

                {submitSuccess && (
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    <span>{submitSuccess}</span>
                  </div>
                )}

                {/* FiveM Admin Permission Control Bar for players */}
                {config.name === "players" && selectedRow && (
                  <div className="p-3.5 rounded-xl bg-secondary/70 border border-border flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <span>สถานะสิทธิ์ใน FiveM:</span>
                        {selectedRow.is_admin_game ? (
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                            👑 เป็นแอดมินอยู่ (group.admin)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-muted text-muted-foreground border border-border">
                            👤 ผู้เล่นทั่วไป
                          </span>
                        )}
                      </span>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {selectedRow.is_admin_game ? "ผู้เล่นนี้สามารถใช้คำสั่ง /admin, /noclip และฟังก์ชันดูแลเมืองได้" : "ผู้เล่นนี้ไม่มีสิทธิ์แอดมินในเกม"}
                      </p>
                    </div>

                    {role === "admin" && (
                      selectedRow.is_admin_game ? (
                        <button
                          type="button"
                          onClick={() => handleToggleFiveMAdmin(false)}
                          disabled={submitting}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-500/10 text-rose-600 hover:bg-rose-500 hover:text-white border border-rose-500/20 transition-colors"
                        >
                          ❌ ปลดแอดมิน
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleToggleFiveMAdmin(true)}
                          disabled={submitting}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500/15 text-amber-600 hover:bg-amber-500 hover:text-white border border-amber-500/30 transition-colors shadow-sm"
                        >
                          👑 แต่งตั้งเป็นแอดมิน
                        </button>
                      )
                    )}
                  </div>
                )}

                {config.columns.map((col) => {
                  const isReadOnly = col.primaryKey || col.readOnly || role === "viewer";
                  const value = editFormData[col.name] !== undefined ? editFormData[col.name] : "";

                  return (
                    <div key={col.name} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-foreground">
                          {col.label} {col.required && <span className="text-destructive">*</span>}
                        </label>
                        {col.type === "currency_satang" && (
                          <span className="text-[11px] font-mono text-emerald-500">
                            ≈ {formatSatangToBaht(Number(value) || 0)}
                          </span>
                        )}
                      </div>

                      {col.type === "select" && col.options ? (
                        <select
                          disabled={isReadOnly}
                          value={value}
                          onChange={(e) => setEditFormData({ ...editFormData, [col.name]: e.target.value })}
                          className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60"
                        >
                          {col.options.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : col.type === "boolean" ? (
                        <select
                          disabled={isReadOnly}
                          value={value ? 1 : 0}
                          onChange={(e) => setEditFormData({ ...editFormData, [col.name]: parseInt(e.target.value, 10) })}
                          className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60"
                        >
                          <option value={1}>1 (ใช่ / เปิดใช้งาน)</option>
                          <option value={0}>0 (ไม่ / ปิดใช้งาน)</option>
                        </select>
                      ) : (
                        <input
                          type={col.type === "number" || col.type === "currency_satang" ? "number" : "text"}
                          disabled={isReadOnly}
                          value={value}
                          onChange={(e) => {
                            const val = col.type === "number" || col.type === "currency_satang" 
                              ? (e.target.value === "" ? "" : parseInt(e.target.value, 10)) 
                              : e.target.value;
                            setEditFormData({ ...editFormData, [col.name]: val });
                          }}
                          className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60"
                        />
                      )}
                    </div>
                  );
                })}

                {/* Reason Input (Mandatory when editing) */}
                {role === "admin" && (
                  <div className="pt-2 border-t border-border space-y-1.5">
                    <label className="text-xs font-bold text-foreground flex items-center justify-between">
                      <span>เหตุผลในการแก้ไขข้อมูล (Audit Reason) <span className="text-destructive">*</span></span>
                      <span className="text-[10px] text-muted-foreground">จำเป็นต้องระบุ</span>
                    </label>
                    <textarea
                      required
                      placeholder="เช่น ปรับยอดเงินชดเชยจากบั๊กเควส, แก้ไขเบอร์โทรศัพท์ตามคำขอผู้เล่น..."
                      rows={2}
                      value={editReason}
                      onChange={(e) => setEditReason(e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                )}

                {/* Modal Footer */}
                <div className="pt-4 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedRow(null)}
                    className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg text-sm font-medium hover:bg-muted transition-colors"
                  >
                    ยกเลิก
                  </button>
                  {role === "admin" && (
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-5 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
                    >
                      {submitting && <RefreshCw className="w-4 h-4 animate-spin" />}
                      <span>บันทึกการแก้ไข</span>
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
