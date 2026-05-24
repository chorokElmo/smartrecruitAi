"use client";
import { useAuthStore } from "@/lib/store/authStore";
import { useTheme } from "next-themes";
import { Sun, Moon, Bell, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export function TopBar() {
  const user = useAuthStore((s) => s.user);
  const { theme, setTheme } = useTheme();

  const initials = [user?.first_name?.[0], user?.last_name?.[0]]
    .filter(Boolean).join("").toUpperCase() || "U";

  return (
    <header className="h-16 border-b border-border/60 bg-card/80 backdrop-blur-sm flex items-center justify-between px-6 sticky top-0 z-30">
      {/* Greeting */}
      <div>
        <p className="text-sm font-semibold text-foreground">
          Good day, {user?.first_name ?? "there"} 👋
        </p>
        <p className="text-xs text-muted-foreground">
          {new Date().toLocaleDateString("en-MA", { weekday: "long", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5">
        <Button
          variant="ghost" size="icon"
          className="w-9 h-9 rounded-xl"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {theme === "dark"
            ? <Sun className="w-4 h-4 text-amber-500" />
            : <Moon className="w-4 h-4" />
          }
        </Button>
        <Button variant="ghost" size="icon" className="w-9 h-9 rounded-xl relative">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-500" />
        </Button>
        <div className="ml-2 flex items-center gap-2.5 pl-2.5 border-l border-border/60">
          <div className="w-8 h-8 rounded-xl gradient-bg flex items-center justify-center text-white text-xs font-bold shadow-md shadow-indigo-500/25">
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
