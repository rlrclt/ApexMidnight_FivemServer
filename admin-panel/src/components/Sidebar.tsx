"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { 
  Database, 
  Users, 
  Car, 
  ShieldAlert, 
  Building2, 
  History, 
  UserCheck, 
  Menu, 
  X, 
  Sun, 
  Moon,
  ChevronRight
} from "lucide-react";

interface SidebarProps {
  currentRole: "admin" | "viewer";
  username: string;
  onRoleSwitch?: (role: "admin" | "viewer") => void;
}

export function Sidebar({ currentRole, username, onRoleSwitch }: SidebarProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isDark, setIsDark] = useState(true);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const navItems = [
    { name: "ผู้เล่น (Players)", href: "/tables/players", icon: Users },
    { name: "ยานพาหนะ (Vehicles)", href: "/tables/player_vehicles", icon: Car },
    { name: "การแบน (Bans)", href: "/tables/bans", icon: ShieldAlert },
    { name: "บัญชีสังคม (Society Banking)", href: "/tables/bank_accounts_new", icon: Building2 },
    { name: "ประวัติการแก้ไข (Audit Logs)", href: "/audit-logs", icon: History },
    { name: "จัดการสิทธิ์แอดมิน (Admin Access)", href: "/admin-users", icon: UserCheck },
    { name: "ตารางผู้ใช้แอดมิน (Admin Table)", href: "/tables/admin_users", icon: Database },
  ];

  return (
    <>
      {/* Mobile Top Navbar Bar */}
      <div className="lg:hidden flex items-center justify-between p-4 bg-card border-b border-border">
        <div className="flex items-center gap-2">
          <Database className="w-6 h-6 text-primary" />
          <span className="font-bold text-base">Apex Admin</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-muted"
            title="สลับธีม"
          >
            {isDark ? <Sun className="w-4 h-4 text-yellow-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 rounded-lg bg-secondary text-secondary-foreground"
            aria-label="Toggle menu"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Main Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-card border-r border-border flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold shadow-inner">
              <Database className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-bold text-base text-foreground">Apex Core</h1>
              <p className="text-xs text-muted-foreground">FiveM Live Database</p>
            </div>
          </div>
          <button
            onClick={toggleTheme}
            className="hidden lg:flex p-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-muted transition-colors"
            title="สลับธีม Dark/Light"
          >
            {isDark ? <Sun className="w-4 h-4 text-yellow-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button>
        </div>

        {/* User Identity / Role Status */}
        <div className="p-4 mx-4 mt-4 rounded-xl bg-secondary/60 border border-border">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-muted-foreground">สิทธิ์ผู้ใช้งาน</span>
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                currentRole === "admin"
                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30"
                  : "bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/30"
              }`}
            >
              {currentRole === "admin" ? "ADMINISTRATOR" : "VIEWER (READ-ONLY)"}
            </span>
          </div>
          <p className="text-sm font-semibold truncate text-foreground">{username}</p>
          
          {/* Role Switcher */}
          {onRoleSwitch && (
            <div className="mt-3 pt-2 border-t border-border/80 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">สลับบทบาท:</span>
              <div className="flex gap-1.5">
                <button
                  onClick={() => onRoleSwitch("admin")}
                  className={`min-h-[28px] px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                    currentRole === "admin" ? "bg-primary text-primary-foreground shadow-sm" : "bg-card border border-border hover:bg-muted text-foreground"
                  }`}
                >
                  Admin
                </button>
                <button
                  onClick={() => onRoleSwitch("viewer")}
                  className={`min-h-[28px] px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                    currentRole === "viewer" ? "bg-primary text-primary-foreground shadow-sm" : "bg-card border border-border hover:bg-muted text-foreground"
                  }`}
                >
                  Viewer
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
          <div className="px-3 pb-2 text-xs font-semibold text-muted-foreground">
            ตารางฐานข้อมูล FiveM จริง
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href.startsWith("/tables") && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all group ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/70"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 transition-transform group-hover:scale-110 ${isActive ? "text-primary-foreground" : "text-muted-foreground"}`} />
                  <span>{item.name}</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 transition-opacity" />
              </Link>
            );
          })}
        </div>

        {/* txAdmin Direct Launcher */}
        <div className="p-3 mx-4 mb-2 rounded-xl bg-card border border-border/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <div>
              <div className="text-xs font-semibold text-foreground">txAdmin Control</div>
              <div className="text-[10px] text-muted-foreground font-mono">Port :40120</div>
            </div>
          </div>
          <a
            href="http://192.168.2.35:40120"
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-lg bg-secondary hover:bg-muted text-foreground transition-colors"
            title="เปิดหน้า txAdmin"
          >
            <ChevronRight className="w-4 h-4" />
          </a>
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-border text-xs text-muted-foreground flex items-center justify-between">
          <span>FiveM MySQL Live</span>
          <span className="font-mono text-[10px] text-emerald-500">● Connected</span>
        </div>
      </aside>
    </>
  );
}
