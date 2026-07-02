"use client";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import * as Tooltip from "@radix-ui/react-tooltip";

interface ThemeToggleProps {
  collapsed: boolean;
}

export function ThemeToggle({ collapsed }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  const btn = (
    <motion.button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      aria-label="Toggle theme"
      className={cn(
        "flex items-center gap-2.5 rounded-xl px-3 py-2.5 w-full",
        "text-muted-foreground hover:text-foreground hover:bg-accent/60 dark:hover:bg-white/[0.06]",
        "transition-colors duration-150 outline-none",
        "focus-visible:ring-2 focus-visible:ring-blue-500",
        collapsed && "justify-center px-2"
      )}
    >
      <motion.span
        key={isDark ? "moon" : "sun"}
        initial={{ rotate: -30, opacity: 0, scale: 0.7 }}
        animate={{ rotate: 0, opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
        className="shrink-0"
      >
        {isDark ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
      </motion.span>

      {!collapsed && (
        <span className="text-sm font-medium">{isDark ? "Light mode" : "Dark mode"}</span>
      )}
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
              {isDark ? "Light mode" : "Dark mode"}
              <Tooltip.Arrow className="fill-foreground" />
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
      </Tooltip.Provider>
    );
  }

  return btn;
}
