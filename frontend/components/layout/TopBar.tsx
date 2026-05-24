"use client";
import { useAuthStore } from "@/lib/store/authStore";
import { useTheme } from "next-themes";
import { Sun, Moon, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

export function TopBar() {
  const user = useAuthStore((s) => s.user);
  const { theme, setTheme } = useTheme();

  return (
    <header className="h-16 border-b bg-card flex items-center justify-between px-6">
      <p className="text-sm text-muted-foreground">
        Welcome back,{" "}
        <span className="font-semibold text-foreground">{user?.first_name ?? "User"}</span>
      </p>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>
        <Button variant="ghost" size="icon">
          <Bell className="w-4 h-4" />
        </Button>
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
          {user?.first_name?.[0]?.toUpperCase() ?? "U"}
        </div>
      </div>
    </header>
  );
}
