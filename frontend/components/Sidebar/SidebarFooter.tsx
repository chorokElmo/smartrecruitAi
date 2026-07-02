"use client";
import { ThemeToggle } from "./ThemeToggle";
import { UserProfile } from "./UserProfile";

interface SidebarFooterProps {
  collapsed: boolean;
}

export function SidebarFooter({ collapsed }: SidebarFooterProps) {
  return (
    <div className="shrink-0 px-3 pb-4 space-y-1 border-t border-border/50 pt-3">
      <ThemeToggle collapsed={collapsed} />
      <div className="pt-1">
        <UserProfile collapsed={collapsed} />
      </div>
    </div>
  );
}
