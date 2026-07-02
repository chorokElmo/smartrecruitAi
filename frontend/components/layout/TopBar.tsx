"use client";
import { useAuthStore } from "@/lib/store/authStore";
import { usePathname } from "next/navigation";
import { Menu, HelpCircle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { useOnboardingStore } from "@/lib/store/onboardingStore";

const pageTitles: Record<string, string> = {
  "/dashboard":    "Dashboard",
  "/jobs":         "Offres d'emploi",
  "/applications": "Mes candidatures",
  "/saved":        "Offres sauvegardées",
  "/cv":           "Mon CV",
  "/profile":      "Profil",
  "/notifications":"Notifications",
  "/settings":     "Paramètres",
  "/help":         "Aide & Support",
};

interface TopBarProps {
  onMenuToggle?: () => void;
}

export function TopBar({ onMenuToggle }: TopBarProps) {
  const user = useAuthStore((s) => s.user);
  const pathname = usePathname();
  const startTour = useOnboardingStore((s) => s.start);

  const initials = [user?.first_name?.[0], user?.last_name?.[0]]
    .filter(Boolean).join("").toUpperCase() || "U";

  // Resolve page title (handle dynamic routes like /jobs/[id])
  const baseRoute = "/" + (pathname.split("/")[1] ?? "");
  const pageTitle = pageTitles[baseRoute] ?? "SmartRecruit AI";
  const isJobDetail = pathname.startsWith("/jobs/") && pathname !== "/jobs";

  return (
    <header
      className="h-16 border-b border-border bg-card/80 backdrop-blur-xl flex items-center gap-3 px-4 md:px-6 sticky top-0 z-30"
    >
      {/* Hamburger (mobile) */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden w-9 h-9 rounded-lg shrink-0"
        onClick={onMenuToggle}
        aria-label="Open menu"
      >
        <Menu className="w-4 h-4" />
      </Button>

      {/* Page title / breadcrumb */}
      <div className="flex items-center gap-2 min-w-0">
        <div className="flex items-center gap-1.5">
          {isJobDetail ? (
            <>
              <span className="text-muted-foreground font-medium hidden sm:inline">Offres</span>
              <span className="text-muted-foreground hidden sm:inline">/</span>
              <span className="font-bold text-foreground truncate max-w-[200px]">Détail</span>
            </>
          ) : (
            <h1 className="font-bold text-lg text-foreground tracking-tight">{pageTitle}</h1>
          )}
        </div>
      </div>

      {/* Search (decorative quick-jump to jobs) */}
      <div className="hidden md:flex items-center ml-4 lg:ml-6 flex-1 max-w-xs lg:max-w-sm">
        <div className="flex items-center gap-2 w-full h-9 px-3 rounded-lg bg-secondary/60 border border-transparent focus-within:border-primary/30 focus-within:bg-card transition-colors">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            placeholder="Rechercher une offre…"
            className="bg-transparent border-0 outline-none text-sm w-full placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <div className="flex-1" />

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Relaunch onboarding tour */}
        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8 rounded-lg"
          onClick={startTour}
          aria-label="Relancer le guide"
          title="Relancer le guide"
        >
          <HelpCircle className="w-4 h-4 text-muted-foreground" />
        </Button>

        {/* Notifications — real bell with unread count badge */}
        <NotificationBell />

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
