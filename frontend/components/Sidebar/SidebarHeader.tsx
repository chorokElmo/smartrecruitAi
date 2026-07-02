"use client";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import Image from "next/image";

interface SidebarHeaderProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function SidebarHeader({ collapsed, onToggle }: SidebarHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 pt-5 pb-4 shrink-0">
      <div className="flex items-center gap-3 flex-1 min-w-0 overflow-hidden">
        {/* Logo icon (collapsed) / full logo (expanded) */}
        <AnimatePresence initial={false} mode="wait">
          {collapsed ? (
            <motion.div
              key="icon"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
              className="shrink-0"
            >
              <Image
                src="/logo-icon.png"
                alt="SmartRecruit AI"
                width={36}
                height={36}
                className="rounded-xl dark:invert dark:brightness-200"
              />
            </motion.div>
          ) : (
            <motion.div
              key="full"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.2 }}
              className="relative flex-1 min-w-0 h-20 overflow-hidden"
            >
              <Image
                src="/logo.png"
                alt="SmartRecruit AI"
                fill
                className="object-contain object-left block dark:hidden"
              />
              <Image
                src="/logo-white.png"
                alt="SmartRecruit AI"
                fill
                className="object-contain object-left hidden dark:block"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Collapse toggle — hidden on mobile */}
      <motion.button
        onClick={onToggle}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className={cn(
          "hidden lg:flex items-center justify-center rounded-lg w-7 h-7 shrink-0",
          "bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground",
          "border border-border/60 transition-colors duration-150",
          collapsed && "ml-auto"
        )}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <motion.div
          animate={{ rotate: collapsed ? 180 : 0 }}
          transition={{ duration: 0.25 }}
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </motion.div>
      </motion.button>
    </div>
  );
}
