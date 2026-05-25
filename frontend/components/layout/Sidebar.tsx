"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils/cn";
import {
  LayoutDashboard, Briefcase, User, FileText,
  BookmarkCheck, LogOut, X, Zap,
} from "lucide-react";
import { useAuthStore } from "@/lib/store/authStore";

const navItems = [
  { label: "Dashboard",  href: "/dashboard", icon: LayoutDashboard, badge: null },
  { label: "Jobs",       href: "/jobs",       icon: Briefcase,       badge: null },
  { label: "Saved",      href: "/saved",      icon: BookmarkCheck,   badge: null },
  { label: "My CV",      href: "/cv",         icon: FileText,        badge: null },
  { label: "Profile",    href: "/profile",    icon: User,            badge: null },
];

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export function Sidebar({ open = true, onClose }: SidebarProps) {
  const pathname = usePathname();
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const router = useRouter();

  const initials = [user?.first_name?.[0], user?.last_name?.[0]]
    .filter(Boolean).join("").toUpperCase() || "U";

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <>
      {/* Mobile backdrop */}
      {onClose && open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={open ? { x: 0 } : { x: -280 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className={cn(
          "fixed md:relative inset-y-0 left-0 z-50 md:z-auto",
          "flex flex-col w-[240px] min-h-screen",
          "bg-card border-r border-border",
          open ? "flex" : "hidden md:flex",
        )}
        style={{ boxShadow: "var(--shadow-lg)" }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 h-16 border-b border-border shrink-0">
          <div
            className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center shrink-0"
            style={{ boxShadow: "var(--shadow-primary)" }}
          >
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="font-semibold text-sm block leading-none tracking-tight">SmartRecruit</span>
            <span className="text-[9px] text-muted-foreground font-medium tracking-widest uppercase mt-0.5 block">
              AI Platform
            </span>
          </div>
          {/* Mobile close */}
          {onClose && (
            <button onClick={onClose} className="md:hidden p-1 rounded-lg hover:bg-muted transition-colors ml-auto">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2.5 py-4 space-y-0.5 overflow-y-auto">
          <p className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-widest px-3 mb-2">
            Menu
          </p>

          {navItems.map(({ label, href, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 relative group",
                  active ? "nav-active" : "nav-inactive"
                )}
              >
                <Icon className={cn("w-4 h-4 shrink-0 transition-colors", active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                <span className="truncate">{label}</span>
                {active && (
                  <motion.div
                    layoutId="sidebar-active-dot"
                    className="ml-auto w-1.5 h-1.5 rounded-full bg-primary/50"
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User profile + logout */}
        <div className="px-2.5 py-3 border-t border-border space-y-1 shrink-0">
          {/* User info row */}
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg">
            <div
              className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center text-white text-xs font-bold shrink-0"
              style={{ boxShadow: "var(--shadow-primary)" }}
            >
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold leading-none truncate">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5 leading-none truncate">
                {user?.email}
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium text-muted-foreground hover:bg-destructive/8 hover:text-destructive transition-all duration-150 group"
          >
            <LogOut className="w-4 h-4 shrink-0 group-hover:text-destructive transition-colors" />
            Sign out
          </button>
        </div>
      </motion.aside>
    </>
  );
}
