"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { applicationsApi } from "@/lib/api/jobs";
import { Building2, MapPin, Loader2, Briefcase, Send, Clock, XCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface Application {
  id: string;
  status: string;
  created_at: string;
  job: { id: string; title: string; company: string; location?: string; contract_type?: string };
}

const STATUS_OPTIONS = ["applied", "pending", "rejected", "accepted"] as const;
const STATUS_META: Record<string, { label: string; color: string; dot: string; bg: string; border: string; icon: React.ElementType }> = {
  applied:  { label: "Postulé",    color: "text-blue-600 dark:text-blue-400",    dot: "bg-blue-500",    bg: "bg-blue-50 dark:bg-blue-950/30",    border: "border-blue-200 dark:border-blue-800",    icon: Send },
  pending:  { label: "En attente", color: "text-amber-600 dark:text-amber-400",  dot: "bg-amber-500",  bg: "bg-amber-50 dark:bg-amber-950/30",  border: "border-amber-200 dark:border-amber-800",  icon: Clock },
  rejected: { label: "Refusé",     color: "text-red-600 dark:text-red-400",      dot: "bg-red-500",    bg: "bg-red-50 dark:bg-red-950/30",      border: "border-red-200 dark:border-red-800",      icon: XCircle },
  accepted: { label: "Accepté",    color: "text-emerald-600 dark:text-emerald-400", dot: "bg-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-emerald-200 dark:border-emerald-800", icon: CheckCircle2 },
};

const STATUS_SELECT_COLOR: Record<string, string> = {
  applied:  "bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800",
  pending:  "bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  rejected: "bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800",
  accepted: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
};

export default function ApplicationsPage() {
  const [apps, setApps]       = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    applicationsApi.list().then((r) => setApps(r.data)).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const updateStatus = async (id: string, status: string) => {
    setApps((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
    await applicationsApi.updateStatus(id, status);
  };

  const counts = STATUS_OPTIONS.reduce(
    (acc, s) => ({ ...acc, [s]: apps.filter((a) => a.status === s).length }),
    {} as Record<string, number>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-xl font-bold">Mes candidatures</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {apps.length} candidature{apps.length !== 1 ? "s" : ""} au total
        </p>
      </motion.div>

      {/* Status counter cards */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-3"
      >
        {STATUS_OPTIONS.map((s) => {
          const meta = STATUS_META[s];
          const Icon = meta.icon;
          return (
            <div key={s} className={cn("rounded-xl border p-4", meta.bg, meta.border)}>
              <div className="flex items-center justify-between mb-2">
                <Icon className={cn("w-4 h-4", meta.color)} />
                <span className={cn("text-2xl font-bold", meta.color)}>{counts[s] ?? 0}</span>
              </div>
              <p className={cn("text-xs font-medium", meta.color)}>{meta.label}</p>
            </div>
          );
        })}
      </motion.div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : apps.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card-base py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <Briefcase className="w-7 h-7 text-muted-foreground/40" />
          </div>
          <p className="font-semibold text-foreground">Aucune candidature</p>
          <p className="text-sm text-muted-foreground mt-1">
            Postulez à des offres depuis la page{" "}
            <Link href="/jobs" className="text-primary hover:underline">Jobs</Link>.
          </p>
        </motion.div>
      ) : (
        <div className="space-y-6">
          {STATUS_OPTIONS.filter((s) => counts[s] > 0).map((s, gi) => (
            <motion.div
              key={s}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: gi * 0.06 }}
            >
              <div className="flex items-center gap-2 mb-3">
                <span className={cn("w-2 h-2 rounded-full", STATUS_META[s].dot)} />
                <h2 className="text-sm font-semibold">{STATUS_META[s].label}</h2>
                <span className="text-xs text-muted-foreground">({counts[s]})</span>
              </div>
              <div className="space-y-2">
                {apps.filter((a) => a.status === s).map((a) => (
                  <div key={a.id} className="card-base p-4 flex flex-col sm:flex-row sm:items-center gap-3 hover:border-border/80 transition-colors">
                    {/* Company avatar */}
                    <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center text-white text-sm font-bold shrink-0">
                      {a.job.company[0]?.toUpperCase()}
                    </div>

                    {/* Job info */}
                    <div className="min-w-0 flex-1">
                      <Link href={`/jobs/${a.job.id}`}>
                        <h3 className="text-sm font-semibold hover:text-primary transition-colors truncate">
                          {a.job.title}
                        </h3>
                      </Link>
                      <p className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3 h-3" />{a.job.company}
                        </span>
                        {a.job.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />{a.job.location}
                          </span>
                        )}
                      </p>
                    </div>

                    {/* Status select */}
                    <select
                      value={a.status}
                      onChange={(e) => updateStatus(a.id, e.target.value)}
                      className={cn(
                        "text-xs font-medium px-2.5 py-1.5 rounded-lg border cursor-pointer w-full sm:w-auto transition-colors",
                        STATUS_SELECT_COLOR[a.status]
                      )}
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{STATUS_META[opt].label}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
