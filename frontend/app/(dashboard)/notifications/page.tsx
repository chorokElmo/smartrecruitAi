"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { notificationsApi, type Notification } from "@/lib/api/notifications";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonListItem } from "@/components/ui/skeleton";
import { listVariants, itemVariants } from "@/components/ui/page-wrapper";
import { cn } from "@/lib/utils/cn";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1)  return "À l'instant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h}h`;
  return `il y a ${Math.floor(h / 24)}j`;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading]             = useState(true);
  const [markingAll, setMarkingAll]       = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    notificationsApi
      .list()
      .then((r) => {
        // Newest first
        const sorted = [...r.data].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setNotifications(sorted);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleMarkRead = async (n: Notification) => {
    if (!n.is_read) {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x))
      );
      await notificationsApi.markRead(n.id).catch(() => {});
    }
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await notificationsApi.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {
      // silent
    } finally {
      setMarkingAll(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-xl font-bold">Notifications</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {unreadCount > 0
              ? `${unreadCount} non lue${unreadCount > 1 ? "s" : ""}`
              : "Tout est lu"}
          </p>
        </div>

        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            disabled={markingAll}
            onClick={handleMarkAllRead}
          >
            {markingAll ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CheckCheck className="w-3.5 h-3.5" />
            )}
            Tout marquer comme lu
          </Button>
        )}
      </motion.div>

      {/* List */}
      <div className="card-base overflow-hidden">
        {loading ? (
          <div className="divide-y divide-border">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="p-3">
                <SkeletonListItem />
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="Aucune notification"
            description="Vous serez alerté ici des échéances de candidature et des mises à jour importantes."
          />
        ) : (
          <motion.div
            variants={listVariants}
            initial="hidden"
            animate="visible"
            className="divide-y divide-border"
          >
            {notifications.map((n) => {
              const inner = (
                <motion.div
                  key={n.id}
                  variants={itemVariants}
                  className={cn(
                    "flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-muted/40",
                    !n.is_read && "bg-primary/5 hover:bg-primary/8"
                  )}
                  onClick={() => handleMarkRead(n)}
                >
                  {/* Unread dot */}
                  <div className="mt-1.5 shrink-0 w-2 h-2">
                    {!n.is_read && (
                      <span className="block w-2 h-2 rounded-full bg-primary" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        "text-sm leading-relaxed",
                        !n.is_read
                          ? "font-semibold text-foreground"
                          : "text-muted-foreground"
                      )}
                    >
                      {n.message}
                    </p>
                    <p className="text-[11px] text-muted-foreground/60 mt-1">
                      {timeAgo(n.created_at)}
                    </p>
                  </div>

                  {/* Link arrow if job_id */}
                  {n.job_id && (
                    <span className="shrink-0 text-xs text-primary font-medium mt-0.5">
                      Voir →
                    </span>
                  )}
                </motion.div>
              );

              return n.job_id ? (
                <Link key={n.id} href={`/jobs/${n.job_id}`} className="block">
                  {inner}
                </Link>
              ) : (
                <div key={n.id}>{inner}</div>
              );
            })}
          </motion.div>
        )}
      </div>
    </div>
  );
}
