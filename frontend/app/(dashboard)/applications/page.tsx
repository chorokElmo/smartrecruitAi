"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { applicationsApi } from "@/lib/api/jobs";
import { Building2, MapPin, Loader2, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface Application {
  id: string;
  status: string;
  created_at: string;
  job: { id: string; title: string; company: string; location?: string; contract_type?: string };
}

const STATUS_OPTIONS = ["applied", "pending", "rejected", "accepted"] as const;
const STATUS_META: Record<string, { label: string; color: string; dot: string }> = {
  applied:  { label: "📨 Postulé",    color: "text-blue-600",    dot: "bg-blue-500" },
  pending:  { label: "⏳ En attente", color: "text-amber-600",   dot: "bg-amber-500" },
  rejected: { label: "❌ Refusé",     color: "text-red-600",     dot: "bg-red-500" },
  accepted: { label: "✅ Accepté",    color: "text-emerald-600", dot: "bg-emerald-500" },
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
    <div className="max-w-4xl mx-auto space-y-5">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-xl font-bold">Mes candidatures</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {apps.length} candidature{apps.length !== 1 ? "s" : ""} au total
        </p>
      </motion.div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {STATUS_OPTIONS.map((s) => (
          <div key={s} className="card-base p-4 text-center">
            <p className={cn("text-2xl font-bold", STATUS_META[s].color)}>{counts[s] ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-1">{STATUS_META[s].label}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : apps.length === 0 ? (
        <div className="card-base py-16 text-center">
          <Briefcase className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="font-semibold">Aucune candidature</p>
          <p className="text-sm text-muted-foreground mt-1">
            Postulez à des offres depuis la page <Link href="/jobs" className="text-primary hover:underline">Jobs</Link>.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {STATUS_OPTIONS.filter((s) => counts[s] > 0).map((s) => (
            <div key={s}>
              <div className="flex items-center gap-2 mb-2">
                <span className={cn("w-2 h-2 rounded-full", STATUS_META[s].dot)} />
                <h2 className="text-sm font-semibold">{STATUS_META[s].label}</h2>
                <span className="text-xs text-muted-foreground">({counts[s]})</span>
              </div>
              <div className="space-y-2">
                {apps.filter((a) => a.status === s).map((a) => (
                  <div key={a.id} className="card-base p-4 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl gradient-bg flex items-center justify-center text-white text-sm font-bold shrink-0">
                      {a.job.company[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link href={`/jobs/${a.job.id}`}>
                        <h3 className="text-sm font-semibold hover:text-primary transition-colors truncate">{a.job.title}</h3>
                      </Link>
                      <p className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                        <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{a.job.company}</span>
                        {a.job.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{a.job.location}</span>}
                      </p>
                    </div>
                    <select
                      value={a.status}
                      onChange={(e) => updateStatus(a.id, e.target.value)}
                      className="text-xs font-medium px-2 py-1.5 rounded-lg border border-border bg-background cursor-pointer shrink-0"
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{STATUS_META[opt].label}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
