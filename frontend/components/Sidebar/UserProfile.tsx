"use client";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, Settings } from "lucide-react";
import { useAuthStore } from "@/lib/store/authStore";
import { cn } from "@/lib/utils/cn";
import * as Tooltip from "@radix-ui/react-tooltip";

interface UserProfileProps {
  collapsed: boolean;
}

export function UserProfile({ collapsed }: UserProfileProps) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();

  const initials = [user?.first_name?.[0], user?.last_name?.[0]]
    .filter(Boolean).join("").toUpperCase() || "U";

  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(" ") || "User";
  const role = (user as { role?: string })?.role || "Candidate";

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const avatar = (
    <div className="relative shrink-0">
      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#081636] to-[#1e3a8a] dark:from-blue-500 dark:to-blue-700 flex items-center justify-center text-white text-xs font-bold shadow-md">
        {initials}
      </div>
      {/* Online indicator */}
      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-sidebar ring-0" />
    </div>
  );

  if (collapsed) {
    return (
      <Tooltip.Provider delayDuration={200}>
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <motion.button
              whileHover={{ scale: 1.05 }}
              className="flex items-center justify-center w-full py-1 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-xl"
              onClick={handleLogout}
              aria-label="Logout"
            >
              {avatar}
            </motion.button>
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content
              side="right"
              sideOffset={8}
              className="z-[200] px-2.5 py-1.5 rounded-lg bg-foreground text-background text-xs font-medium shadow-xl"
            >
              {fullName}
              <Tooltip.Arrow className="fill-foreground" />
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
      </Tooltip.Provider>
    );
  }

  return (
    <AnimatePresence initial={false}>
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 px-1 py-1 rounded-xl hover:bg-accent/50 dark:hover:bg-white/[0.06] transition-colors duration-150 group"
      >
        {avatar}

        <div className="flex-1 min-w-0 overflow-hidden">
          <p className="text-sm font-semibold text-foreground leading-none truncate">{fullName}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-none capitalize truncate">{role}</p>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          <button
            onClick={() => router.push("/profile")}
            aria-label="Settings"
            className={cn(
              "p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent",
              "transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-blue-500 outline-none"
            )}
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleLogout}
            aria-label="Logout"
            className={cn(
              "p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10",
              "transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-red-500 outline-none"
            )}
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
