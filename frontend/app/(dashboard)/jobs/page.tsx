"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { jobsApi, applicationsApi } from "@/lib/api/jobs";
import { recommendationsApi } from "@/lib/api/recommendations";
import type { Job, Recommendation } from "@/types/job";
import { ScoreRing } from "@/components/ui/score-ring";
import { SkeletonCard } from "@/components/ui/skeleton";
import { listVariants, itemVariants } from "@/components/ui/page-wrapper";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, MapPin, Building2, ChevronLeft, ChevronRight, Lock } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useFilterStore } from "@/lib/store/filterStore";
import { useCvStore } from "@/lib/store/cvStore";
import { CvGate } from "@/components/layout/CvGate";

const SECTORS = [
  { value: "all",     label: "Toutes sources" },
  { value: "private", label: "Privé"  },
  { value: "public",  label: "Public" },
];

const STATUS_OPTIONS = ["applied", "pending", "rejected", "accepted"] as const;
const STATUS_LABEL: Record<string, string> = {
  applied: "📨 Postulé", pending: "⏳ En attente", rejected: "❌ Refusé", accepted: "✅ Accepté",
};
const STATUS_COLOR: Record<string, string> = {
  applied:  "bg-blue-500/10 text-blue-600 border-blue-500/30",
  pending:  "bg-amber-500/10 text-amber-600 border-amber-500/30",
  rejected: "bg-red-500/10 text-red-600 border-red-500/30",
  accepted: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
};

type AppInfo = { application_id: string; status: string };

function ApplyControl({
  job, appInfo, onApply, onStatus,
}: {
  job: Job;
  appInfo?: AppInfo;
  onApply: (jobId: string) => void;
  onStatus: (appId: string, jobId: string, status: string) => void;
}) {
  if (!appInfo) {
    return (
      <button
        onClick={(e) => { e.preventDefault(); onApply(job.id); }}
        className="w-full text-xs font-medium px-3 py-1.5 rounded-lg gradient-bg text-white"
        style={{ boxShadow: "var(--shadow-primary)" }}
      >
        📨 Postuler
      </button>
    );
  }
  return (
    <select
      value={appInfo.status}
      onClick={(e) => e.preventDefault()}
      onChange={(e) => { e.preventDefault(); onStatus(appInfo.application_id, job.id, e.target.value); }}
      className={cn("w-full text-xs font-medium px-2 py-1.5 rounded-lg border cursor-pointer", STATUS_COLOR[appInfo.status])}
    >
      {STATUS_OPTIONS.map((s) => (
        <option key={s} value={s}>{STATUS_LABEL[s]}</option>
      ))}
    </select>
  );
}

function ScoreBadge({ score }: { score?: number }) {
  if (score === undefined || score === null) {
    return (
      <div className="shrink-0 w-11 h-11 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-xs font-bold" title="Non scoré">—</div>
    );
  }
  const pct = Math.round(score * 100);
  const color = pct >= 70 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-slate-400";
  return (
    <div className={`shrink-0 w-11 h-11 rounded-full ${color} flex items-center justify-center text-white text-xs font-bold shadow-sm`}>
      {pct}%
    </div>
  );
}

function JobCard({
  job, score, index, appInfo, onApply, onStatus,
}: {
  job: Job; score?: number; index: number;
  appInfo?: AppInfo;
  onApply: (jobId: string) => void;
  onStatus: (appId: string, jobId: string, status: string) => void;
}) {
  const unscored = score === undefined || score === null;
  return (
    <motion.div variants={itemVariants} transition={{ delay: index * 0.04 }}>
      <Link href={`/jobs/${job.id}`} className="block group h-full">
        <div className={cn("card-base card-hover h-full flex flex-col p-4 gap-3", unscored && "opacity-75")}>

          {/* Header: title + score badge */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors leading-snug line-clamp-2">
                {job.title}
              </h3>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2 truncate">
                <span className="flex items-center gap-1"><Building2 className="w-3 h-3 shrink-0" />{job.company}</span>
                {job.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3 shrink-0" />{job.location}</span>}
              </p>
            </div>
            <ScoreBadge score={score} />
          </div>

          {/* Tags: domain, experience, contract, public */}
          <div className="flex flex-wrap items-center gap-1.5">
            {unscored && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground">Non scoré</span>
            )}
            {job.required_diploma && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-violet-500/10 text-violet-600 dark:text-violet-400">
                🎓 {job.required_diploma}
              </span>
            )}
            {job.required_experience && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400">
                ⏱ {job.required_experience} ans
              </span>
            )}
            {job.contract_type && (
              <span className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-medium">{job.contract_type}</span>
            )}
            {job.sector === "public" && (
              <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-violet-500/10 text-violet-600 dark:text-violet-400">
                <Lock className="w-2.5 h-2.5" />Public
              </span>
            )}
          </div>

          {/* Description */}
          <p className="text-xs text-muted-foreground line-clamp-2 flex-1 leading-relaxed">
            {job.description}
          </p>

          {/* Skills (max 3 + more) */}
          {job.required_skills.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {job.required_skills.slice(0, 3).map((s) => (
                <span key={s} className="px-2 py-0.5 rounded-full skill-neutral text-[10px] font-medium">{s}</span>
              ))}
              {job.required_skills.length > 3 && (
                <span className="px-2 py-0.5 rounded-full skill-muted text-[10px] font-medium">
                  +{job.required_skills.length - 3} more
                </span>
              )}
            </div>
          )}

          {/* Footer: source badge + apply */}
          <div className="pt-2 mt-auto border-t border-border/60 space-y-2">
            {job.source_name && (
              <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary">
                {job.source_name}
              </span>
            )}
            <ApplyControl job={job} appInfo={appInfo} onApply={onApply} onStatus={onStatus} />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export default function JobsPage() {
  const [jobs, setJobs]             = useState<Job[]>([]);
  const [recs, setRecs]             = useState<Recommendation[]>([]);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const [pages, setPages]           = useState(1);
  const { search, city, contractType, source, minScore, set: setFilters } = useFilterStore();
  const [loading, setLoading]       = useState(true);
  const [apps, setApps]             = useState<Record<string, AppInfo>>({});
  const [matchesOnly, setMatchesOnly] = useState(false);
  const [filterOpts, setFilterOpts] = useState<{ contract_types: string[]; cities: string[] }>({ contract_types: [], cities: [] });
  const { hasCv, refresh: refreshCv } = useCvStore();

  const scoreMap = Object.fromEntries(recs.map((r) => [r.job.id, r.score]));

  const loadApps = useCallback(() => {
    jobsApi.getAppliedFull().then((r) => setApps(r.data)).catch(() => {});
  }, []);

  const handleApply = async (jobId: string) => {
    await jobsApi.markApplied(jobId);
    loadApps();
  };
  const handleStatus = async (appId: string, jobId: string, status: string) => {
    setApps((prev) => ({ ...prev, [jobId]: { ...prev[jobId], status } }));
    await applicationsApi.updateStatus(appId, status);
  };

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, size: 12 };
      if (search)                 params.search        = search;
      if (city)                   params.city          = city;
      if (contractType !== "All") params.contract_type = contractType;
      if (source !== "all")       params.source        = source;

      const { data } = await jobsApi.list(params);
      setJobs(data.items);
      setTotal(data.total);
      setPages(data.pages ?? Math.ceil(data.total / 12));
    } finally {
      setLoading(false);
    }
  }, [page, contractType, source, search, city]);

  useEffect(() => { refreshCv(); }, [refreshCv]);
  useEffect(() => { if (hasCv === true) fetchJobs(); }, [hasCv, page, contractType, source, city, search]);
  useEffect(() => {
    if (hasCv !== true) return;
    jobsApi.filters().then((r) => setFilterOpts(r.data)).catch(() => {});
    loadApps();
    recommendationsApi.getAll(0).then(async ({ data }) => {
      const newest = data.reduce((m: number, r: Recommendation) =>
        Math.max(m, r.generated_at ? new Date(r.generated_at).getTime() : 0), 0);
      const stale = data.length === 0 || (Date.now() - newest) > 24 * 60 * 60 * 1000;
      if (stale) {
        try {
          await recommendationsApi.generate();
          const fresh = await recommendationsApi.getAll(0);
          setRecs(fresh.data);
          return;
        } catch { /* no skills yet — keep what we have */ }
      }
      setRecs(data);
    }).catch(() => {});
  }, [loadApps, hasCv]);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setPage(1); fetchJobs(); };

  /* Smart pagination: show up to 5 pages around current */
  const pageNumbers = (() => {
    if (pages <= 5) return Array.from({ length: pages }, (_, i) => i + 1);
    const start = Math.max(1, Math.min(page - 2, pages - 4));
    return Array.from({ length: 5 }, (_, i) => start + i);
  })();

  if (hasCv === false) return <CvGate variant="jobs" />;

  return (
    <div className="max-w-6xl mx-auto space-y-5">

      {/* ── Header ───────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
        className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">Browse Jobs</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {total > 0
              ? <><strong className="text-foreground font-semibold">{total}</strong> opportunities found</>
              : "Find your next opportunity"
            }
          </p>
        </div>
        <button
          onClick={() => setMatchesOnly((v) => !v)}
          className={cn(
            "shrink-0 text-sm font-medium px-4 h-9 rounded-lg border transition-all",
            matchesOnly
              ? "gradient-bg text-white border-transparent"
              : "border-border text-muted-foreground hover:text-foreground bg-background"
          )}
          style={matchesOnly ? { boxShadow: "var(--shadow-primary)" } : undefined}
        >
          🎯 Mes matches {matchesOnly ? "ON" : "OFF"}
        </button>
      </motion.div>

      {/* ── Filters ──────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, duration: 0.3 }}
        className="card-base p-3 space-y-3"
      >
        {/* Search + dropdown row */}
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <Input
              className="pl-9 h-9 text-sm"
              placeholder="Rechercher…"
              value={search}
              onChange={(e) => { setFilters({ search: e.target.value }); setPage(1); }}
            />
          </div>

          {/* Ville */}
          <div className="relative w-full sm:w-40">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <select
              className="pl-9 h-9 text-sm w-full rounded-md border border-input bg-background"
              value={city}
              onChange={(e) => { setFilters({ city: e.target.value }); setPage(1); }}
            >
              <option value="">Toutes les villes</option>
              {filterOpts.cities.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Type de contrat (dynamic) */}
          <select
            className="h-9 text-sm w-full sm:w-36 rounded-md border border-input bg-background px-2"
            value={contractType}
            onChange={(e) => { setFilters({ contractType: e.target.value }); setPage(1); }}
          >
            <option value="All">Tout contrat</option>
            {filterOpts.contract_types.map((ct) => (
              <option key={ct} value={ct}>{ct}</option>
            ))}
          </select>

          {/* Source */}
          <select
            className="h-9 text-sm w-full sm:w-32 rounded-md border border-input bg-background px-2"
            value={source}
            onChange={(e) => { setFilters({ source: e.target.value }); setPage(1); }}
          >
            {SECTORS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </form>

        {/* Score minimum slider */}
        <div className="flex items-center gap-3 pt-1">
          <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
            Score min : <strong className="text-foreground">{minScore}%</strong>
          </span>
          <input
            type="range" min={0} max={100} step={5}
            value={minScore}
            onChange={(e) => setFilters({ minScore: Number(e.target.value) })}
            className="flex-1 accent-primary cursor-pointer"
          />
        </div>
      </motion.div>

      {/* ── Job grid ─────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : jobs.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card-base py-20 text-center">
          <Search className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="font-semibold text-foreground">No jobs found</p>
          <p className="text-sm text-muted-foreground mt-1">Try different keywords or remove filters</p>
        </motion.div>
      ) : (
        <motion.div
          variants={listVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
        >
          {jobs
            .filter((job) => {
              const sc = scoreMap[job.id];
              if (matchesOnly && (sc === undefined || sc === null)) return false;
              if (minScore > 0 && Math.round((sc ?? 0) * 100) < minScore) return false;
              return true;
            })
            .sort((a, b) => (scoreMap[b.id] ?? -1) - (scoreMap[a.id] ?? -1))
            .map((job, i) => (
              <JobCard key={job.id} job={job} score={scoreMap[job.id]} index={i}
                appInfo={apps[job.id]} onApply={handleApply} onStatus={handleStatus} />
            ))}
        </motion.div>
      )}

      {/* ── Pagination ───────────────────────────── */}
      {pages > 1 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex items-center justify-center gap-2"
        >
          <Button
            variant="outline" size="sm"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="h-8 px-3 text-xs gap-1"
          >
            <ChevronLeft className="w-3.5 h-3.5" />Previous
          </Button>

          <div className="flex items-center gap-1">
            {page > 3 && pages > 5 && (
              <>
                <button onClick={() => setPage(1)} className="w-8 h-8 rounded-lg text-xs font-medium hover:bg-muted text-muted-foreground">1</button>
                <span className="text-muted-foreground text-xs px-1">…</span>
              </>
            )}
            {pageNumbers.map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={cn(
                  "w-8 h-8 rounded-lg text-xs font-medium transition-all",
                  page === p ? "gradient-bg text-white" : "hover:bg-muted text-muted-foreground"
                )}
              >
                {p}
              </button>
            ))}
            {page < pages - 2 && pages > 5 && (
              <>
                <span className="text-muted-foreground text-xs px-1">…</span>
                <button onClick={() => setPage(pages)} className="w-8 h-8 rounded-lg text-xs font-medium hover:bg-muted text-muted-foreground">{pages}</button>
              </>
            )}
          </div>

          <Button
            variant="outline" size="sm"
            disabled={page === pages}
            onClick={() => setPage((p) => p + 1)}
            className="h-8 px-3 text-xs gap-1"
          >
            Next<ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </motion.div>
      )}
    </div>
  );
}
