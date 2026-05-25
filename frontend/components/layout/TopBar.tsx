"use client";
import { useAuthStore } from "@/lib/store/authStore";
import { useTheme } from "next-themes";
import { usePathname } from "next/navigation";
import { Sun, Moon, Bell, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/jobs": "Browse Jobs",
  "/saved": "Saved Jobs",
  "/cv": "My CV",
  "/profile": "Profile",
};

interface TopBarProps {
  onMenuToggle?: () => void;
}

export function TopBar({ onMenuToggle }: TopBarProps) {
  const user = useAuthStore((s) => s.user);
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();

  const initials = [user?.first_name?.[0], user?.last_name?.[0]]
    .filter(Boolean).join("").toUpperCase() || "U";

  // Resolve page title (handle dynamic routes like /jobs/[id])
  const baseRoute = "/" + (pathname.split("/")[1] ?? "");
  const pageTitle = pageTitles[baseRoute] ?? "SmartRecruit AI";
  const isJobDetail = pathname.startsWith("/jobs/") && pathname !== "/jobs";

  return (
    <header
      className="h-14 border-b border-border bg-card/90 backdrop-blur-md flex items-center gap-3 px-4 sticky top-0 z-30"
      style={{ boxShadow: "0 1px 0 hsl(var(--border))" }}
    >
      {/* Hamburger (mobile) */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden w-8 h-8 rounded-lg shrink-0"
        onClick={onMenuToggle}
        aria-label="Open menu"
      >
        <Menu className="w-4 h-4" />
      </Button>

      {/* Page title / breadcrumb */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-sm">
          {isJobDetail ? (
            <>
              <span className="text-muted-foreground font-medium hidden sm:inline">Jobs</span>
              <span className="text-muted-foreground hidden sm:inline">/</span>
              <span className="font-semibold text-foreground truncate max-w-[200px]">Detail</span>
            </>
          ) : (
            <span className="font-semibold text-foreground">{pageTitle}</span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8 rounded-lg"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="Toggle theme"
        >
          {theme === "dark"
            ? <Sun className="w-4 h-4 text-amber-400" />
            : <Moon className="w-4 h-4 text-muted-foreground" />
          }
        </Button>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg relative" aria-label="Notifications">
          <Bell className="w-4 h-4 text-muted-foreground" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-primary animate-pulse-slow" />
        </Button>

        {/* Avatar */}
        <div className="ml-1 pl-2 border-l border-border flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg gradient-bg flex items-center justify-center text-white text-xs font-bold"
            style={{ boxShadow: "var(--shadow-primary)" }}
            title={`${user?.first_name} ${user?.last_name}`}
          >
            {initials}
          </div>
          <div className="hidden sm:block">
            <p className="text-xs font-semibold leading-none">{user?.first_name} {user?.last_name}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5 leading-none">{user?.email}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
