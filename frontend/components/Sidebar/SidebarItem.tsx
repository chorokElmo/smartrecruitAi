"use client";
import { useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils/cn";
import type { NavItem } from "./types";
import * as Tooltip from "@radix-ui/react-tooltip";

interface SidebarItemProps {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
}

export function SidebarItem({ item, active, collapsed }: SidebarItemProps) {
  const Icon = item.icon;

  const inner = (
    <Link
      href={item.href}
      aria-label={item.label}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex items-center gap-3 rounded-xl px-3 py-2.5 cursor-pointer",
        "transition-colors duration-150 outline-none",
        "focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1",
        "group",
        active
          ? "bg-[#081636] dark:bg-blue-600 text-white shadow-md shadow-[#081636]/30 dark:shadow-blue-500/25"
          : "text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/[0.07]",
        collapsed && "justify-center px-2"
      )}
    >
      {/* Active left glow bar */}
      {active && !collapsed && (
        <motion.span
          layoutId="active-bar"
          className="absolute -left-4 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-[#081636] dark:bg-blue-400 shadow-[0_0_8px_2px_rgba(8,22,54,0.5)] dark:shadow-[0_0_8px_2px_rgba(96,165,250,0.6)]"
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        />
      )}

      {/* Hover background shimmer */}
      {!active && (
        <span className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-gradient-to-r from-blue-500/5 to-transparent" />
      )}

      {/* Icon */}
      <motion.span
        whileHover={{ scale: 1.12 }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
        className="relative shrink-0"
      >
        <Icon
          className={cn(
            "w-[18px] h-[18px] transition-colors duration-150",
            active ? "text-white" : "text-muted-foreground group-hover:text-foreground"
          )}
          strokeWidth={active ? 2.2 : 1.8}
        />
        {/* Pulse badge */}
        {item.pulse && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500">
            <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-75" />
          </span>
        )}
      </motion.span>

      {/* Label + badge */}
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.span
            key="label"
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -6 }}
            transition={{ duration: 0.18 }}
            className="flex flex-1 items-center justify-between min-w-0 overflow-hidden"
          >
            <span
              className={cn(
                "text-sm truncate leading-none transition-transform duration-150 group-hover:translate-x-[2px]",
                active ? "font-semibold text-white" : "font-medium"
              )}
            >
              {item.label}
            </span>

            {typeof item.badge === "number" && item.badge > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className={cn(
                  "ml-1 shrink-0 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center leading-none",
                  active
                    ? "bg-white/25 text-white"
                    : "bg-[#081636]/10 text-[#081636] dark:bg-blue-500/20 dark:text-blue-300"
                )}
              >
                {item.badge > 99 ? "99+" : item.badge}
              </motion.span>
            )}
          </motion.span>
        )}
      </AnimatePresence>

      {/* Collapsed badge dot */}
      {collapsed && typeof item.badge === "number" && item.badge > 0 && (
        <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-500" />
      )}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip.Provider delayDuration={200}>
        <Tooltip.Root>
          <Tooltip.Trigger asChild>{inner}</Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content
              side="right"
              sideOffset={8}
              className="z-[200] px-2.5 py-1.5 rounded-lg bg-foreground text-background text-xs font-medium shadow-xl"
            >
              {item.label}
              {typeof item.badge === "number" && item.badge > 0 && (
                <span className="ml-1.5 text-blue-300">·{item.badge}</span>
              )}
              <Tooltip.Arrow className="fill-foreground" />
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
      </Tooltip.Provider>
    );
  }

  return inner;
}
