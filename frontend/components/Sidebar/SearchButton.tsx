"use client";
import { Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils/cn";
import * as Tooltip from "@radix-ui/react-tooltip";

interface SearchButtonProps {
  collapsed: boolean;
}

export function SearchButton({ collapsed }: SearchButtonProps) {
  const btn = (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      aria-label="Search (Ctrl+K)"
      onClick={() => {
        // Fire a synthetic Ctrl+K so the app-level handler can catch it
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true }));
      }}
      className={cn(
        "flex items-center gap-2.5 w-full rounded-xl px-3 py-2 text-left",
        "bg-white dark:bg-white/[0.04] border border-border/70",
        "text-muted-foreground hover:text-foreground hover:border-[#081636]/40 dark:hover:border-blue-500/40",
        "transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
        "shadow-sm hover:shadow-md",
        collapsed && "justify-center px-2"
      )}
    >
      <Search className="w-3.5 h-3.5 shrink-0" />
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.span
            key="search-text"
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.18 }}
            className="flex flex-1 items-center justify-between overflow-hidden"
          >
            <span className="text-sm whitespace-nowrap">Search…</span>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-mono bg-muted text-muted-foreground border border-border/60">
              ⌘K
            </kbd>
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );

  if (collapsed) {
    return (
      <Tooltip.Provider delayDuration={200}>
        <Tooltip.Root>
          <Tooltip.Trigger asChild>{btn}</Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content
              side="right"
              sideOffset={8}
              className="z-[200] px-2.5 py-1.5 rounded-lg bg-foreground text-background text-xs font-medium shadow-xl"
            >
              Search · Ctrl+K
              <Tooltip.Arrow className="fill-foreground" />
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
      </Tooltip.Provider>
    );
  }

  return btn;
}
