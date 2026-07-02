"use client";
import { useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard, Briefcase, Bookmark, FileText, User, Bell,
  Settings, HelpCircle, Send,
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils/cn";
import { SidebarHeader } from "./SidebarHeader";
import { SidebarSection } from "./SidebarSection";
import { SidebarFooter } from "./SidebarFooter";
import { SearchButton } from "./SearchButton";
import type { NavSection } from "./types";
import { useSidebarStore } from "./useSidebarStore";

const NAV: NavSection[] = [
  {
    section: "Main",
    items: [
      { label: "Dashboard",     href: "/dashboard",     icon: LayoutDashboard },
      { label: "Jobs",           href: "/jobs",          icon: Briefcase },
      { label: "Saved Jobs",    href: "/saved",         icon: Bookmark },
      { label: "Candidatures",  href: "/applications",  icon: Send },
    ],
  },
  {
    section: "My Profile",
    items: [
      { label: "My CV",         href: "/cv",            icon: FileText },
      { label: "Profile",       href: "/profile",       icon: User },
      { label: "Notifications", href: "/notifications", icon: Bell, pulse: true },
    ],
  },
  {
    section: "Account",
    items: [
      { label: "Settings",      href: "/settings",      icon: Settings },
      { label: "Help",          href: "/help",          icon: HelpCircle },
    ],
  },
];

interface SidebarProps {
  /** Mobile-only: whether the drawer is visible */
  open?: boolean;
  onClose?: () => void;
}

export function Sidebar({ open = true, onClose }: SidebarProps) {
  const { collapsed, setCollapsed } = useSidebarStore();
  const router = useRouter();

  // Ctrl+K command palette shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        // Expand sidebar and focus search if collapsed
        if (collapsed) setCollapsed(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [collapsed, setCollapsed]);

  // Swipe-to-close on mobile
  const handleBackdropClick = useCallback(() => onClose?.(), [onClose]);

  const sidebarContent = (
    <motion.aside
      animate={{ width: collapsed ? 88 : 280 }}
      transition={{ type: "spring", stiffness: 320, damping: 32 }}
      className={cn(
        "flex flex-col h-full overflow-hidden",
        "bg-white dark:bg-[#0a1a40]",
        "border-r border-border/60",
        "relative"
      )}
      style={{ minWidth: collapsed ? 88 : 280 }}
      aria-label="Sidebar navigation"
    >
      {/* Subtle top gradient accent */}
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none" />

      <SidebarHeader collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />

      {/* Search */}
      <div className="px-3 mb-1">
        <SearchButton collapsed={collapsed} />
      </div>

      {/* Separator */}
      <div className="mx-3 mb-2 h-px bg-border/50" />

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 space-y-0.5 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
        {NAV.map((section) => (
          <SidebarSection key={section.section} section={section} collapsed={collapsed} />
        ))}
      </nav>

      <SidebarFooter collapsed={collapsed} />
    </motion.aside>
  );

  // ── Desktop (always visible, collapsible) ──────────────────────────────────
  if (!onClose) {
    return (
      <div className="hidden lg:flex h-screen sticky top-0 shrink-0">
        {sidebarContent}
      </div>
    );
  }

  // ── Mobile drawer ─────────────────────────────────────────────────────────
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
            onClick={handleBackdropClick}
            aria-hidden
          />

          {/* Drawer */}
          <motion.div
            key="drawer"
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="fixed inset-y-0 left-0 z-50 w-[280px] lg:hidden"
          >
            {/* Force expanded on mobile */}
            <motion.aside
              className={cn(
                "flex flex-col h-full overflow-hidden",
                "bg-white dark:bg-[#0a1a40]",
                "border-r border-border/60"
              )}
              aria-label="Sidebar navigation"
            >
              <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none" />

              {/* Mobile header — close button variant */}
              <div className="flex items-center justify-between px-4 pt-5 pb-4 shrink-0">
                <div className="flex items-center gap-3">
                  <Image
                    src="/logo.png"
                    alt="SmartRecruit AI"
                    width={140}
                    height={36}
                    className="h-9 w-auto object-contain block dark:hidden"
                  />
                  <Image
                    src="/logo-white.png"
                    alt="SmartRecruit AI"
                    width={140}
                    height={36}
                    className="h-9 w-auto object-contain hidden dark:block"
                  />
                </div>
                <button
                  onClick={onClose}
                  aria-label="Close menu"
                  className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="px-3 mb-1">
                <SearchButton collapsed={false} />
              </div>
              <div className="mx-3 mb-2 h-px bg-border/50" />

              <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 space-y-0.5 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                {NAV.map((section) => (
                  <SidebarSection key={section.section} section={section} collapsed={false} />
                ))}
              </nav>

              <SidebarFooter collapsed={false} />
            </motion.aside>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
