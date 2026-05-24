"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import {
  LayoutDashboard, Briefcase, User, FileText, BookmarkCheck, LogOut,
} from "lucide-react";
import { useAuthStore } from "@/lib/store/authStore";
import { useRouter } from "next/navigation";

const navItems = [
  { label: "Dashboard",  href: "/dashboard", icon: LayoutDashboard },
  { label: "Jobs",       href: "/jobs",       icon: Briefcase },
  { label: "Saved Jobs", href: "/saved",      icon: BookmarkCheck },
  { label: "My CV",      href: "/cv",         icon: FileText },
  { label: "Profile",    href: "/profile",    icon: User },
];

export function Sidebar() {
  const pathname = usePathname();
  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <aside className="flex flex-col w-64 min-h-screen bg-card border-r border-border/60">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-border/60">
        <div className="w-8 h-8 rounded-xl gradient-bg flex items-center justify-center shadow-md shadow-indigo-500/25">
          <Briefcase className="w-4 h-4 text-white" />
        </div>
        <div>
          <span className="font-bold text-sm tracking-tight block leading-none">SmartRecruit</span>
          <span className="text-[10px] text-muted-foreground font-medium tracking-widest uppercase">AI Platform</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-5 space-y-1">
        <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest px-3 mb-3">
          Navigation
        </p>
        {navItems.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                active
                  ? "gradient-bg text-white shadow-md shadow-indigo-500/25"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className={cn("w-4 h-4", active ? "text-white" : "")} />
              {label}
              {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white/60" />}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-border/60">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-150"
        >
          <LogOut className="w-4 h-4" />
          Log out
        </button>
      </div>
    </aside>
  );
}
