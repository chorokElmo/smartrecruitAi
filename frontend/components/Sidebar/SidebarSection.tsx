"use client";
import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { SidebarItem } from "./SidebarItem";
import type { NavSection } from "./types";

interface SidebarSectionProps {
  section: NavSection;
  collapsed: boolean;
}

export function SidebarSection({ section, collapsed }: SidebarSectionProps) {
  const pathname = usePathname();

  return (
    <div className="space-y-0.5">
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.p
            key={section.section}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
            className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 select-none overflow-hidden"
          >
            {section.section}
          </motion.p>
        )}
      </AnimatePresence>

      {collapsed && <div className="py-1.5" />}

      {section.items.map((item) => (
        <SidebarItem
          key={item.href}
          item={item}
          active={pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))}
          collapsed={collapsed}
        />
      ))}
    </div>
  );
}
