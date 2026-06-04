"use client";
import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/store/authStore";
import { cn } from "@/lib/utils/cn";

interface Notification {
  id: string;
  message: string;
  is_read: boolean;
  created_at: string;
  job_title?: string;
  job_company?: string;
  job_id?: string;
}

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export function NotificationBell() {
  const token = useAuthStore((s) => s.token);
  const [unread, setUnread]     = useState(0);
  const [open, setOpen]         = useState(false);
  const [notifs, setNotifs]     = useState<Notification[]>([]);
  const [loading, setLoading]   = useState(false);
  const dropRef                 = useRef<HTMLDivElement>(null);

  // ── Fetch unread count every 60 s ─────────────────────────
  useEffect(() => {
    if (!token) return;

    const fetchCount = async () => {
      try {
        const res = await fetch(`${API}/notifications/unread-count`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setUnread(data.count ?? 0);
        }
      } catch {/* network error — silent */}
    };

    fetchCount();
    const interval = setInterval(fetchCount, 60_000);
    return () => clearInterval(interval);
  }, [token]);

  // ── Load full list when dropdown opens ───────────────────
  useEffect(() => {
    if (!open || !token) return;

    const fetchNotifs = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API}/notifications?limit=10`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data: Notification[] = await res.json();
          setNotifs(data);
          // Reset unread count optimistically
          setUnread(0);
          // Mark all as read on the server
          fetch(`${API}/notifications/read-all`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${token}` },
          }).catch(() => {});
        }
      } catch {/* silent */}
      setLoading(false);
    };

    fetchNotifs();
  }, [open, token]);

  // ── Close on outside click ───────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60_000);
    if (m < 1)  return "À l'instant";
    if (m < 60) return `il y a ${m} min`;
    const h = Math.floor(m / 60);
    if (h < 24) return `il y a ${h}h`;
    return `il y a ${Math.floor(h / 24)}j`;
  };

  return (
    <div className="relative" ref={dropRef}>
      {/* Bell button */}
      <Button
        variant="ghost"
        size="icon"
        className="w-8 h-8 rounded-lg relative"
        aria-label="Notifications"
        onClick={() => setOpen((v) => !v)}
      >
        <Bell className="w-4 h-4 text-muted-foreground" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </Button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-10 w-80 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-sm font-semibold">Notifications</span>
            {notifs.some((n) => !n.is_read) && (
              <button
                className="text-xs text-primary hover:underline"
                onClick={() => {
                  fetch(`${API}/notifications/read-all`, {
                    method: "PATCH",
                    headers: { Authorization: `Bearer ${token}` },
                  }).catch(() => {});
                  setNotifs((prev) => prev.map((n) => ({ ...n, is_read: true })));
                  setUnread(0);
                }}
              >
                Tout marquer lu
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {loading && (
              <div className="flex items-center justify-center py-8 text-xs text-muted-foreground">
                Chargement…
              </div>
            )}
            {!loading && notifs.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 gap-2">
                <Bell className="w-8 h-8 text-muted-foreground/40" />
                <p className="text-xs text-muted-foreground">Aucune notification</p>
              </div>
            )}
            {!loading &&
              notifs.map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    "px-4 py-3 border-b border-border last:border-0 hover:bg-muted/30 transition-colors",
                    !n.is_read && "bg-primary/5"
                  )}
                >
                  <p className="text-xs leading-relaxed text-foreground">{n.message}</p>
                  {n.job_company && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">{n.job_company}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground/60 mt-1">
                    {timeAgo(n.created_at)}
                  </p>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
