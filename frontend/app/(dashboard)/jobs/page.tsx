"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { jobsApi, applicationsApi } from "@/lib/api/jobs";
import { recommendationsApi } from "@/lib/api/recommendations";
import type { Job, Recommendation, LiveMatch } from "@/types/job";
import { ScoreRing } from "@/components/ui/score-ring";
import { SkeletonCard } from "@/components/ui/skeleton";
import { listVariants, itemVariants } from "@/components/ui/page-wrapper";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search, MapPin, Building2, ChevronLeft, ChevronRight, Lock,
  Briefcase, SlidersHorizontal, Star, RefreshCw, Target,
  ExternalLink, ArrowLeft, CheckCircle2, XCircle, Globe, Shield,
  Rocket, TrendingUp,
} from "lucide-react";
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
  applied: "Postulé", pending: "En attente", rejected: "Refusé", accepted: "Accepté",
};
const STATUS_COLOR: Record<string, string> = {
  applied:  "bg-blue-50 text-blue-600 border-blue-200",
  pending:  "bg-amber-50 text-amber-600 border-amber-200",
  rejected: "bg-red-50 text-red-600 border-red-200",
  accepted: "bg-emerald-50 text-emerald-600 border-emerald-200",
};

type AppInfo = { application_id: string; status: string };

/* ── Score color helpers ─────────────────────────────────── */
function scoreGradient(pct: number) {
  if (pct >= 70) return "from-emerald-500 to-teal-400";
  if (pct >= 50) return "from-amber-500 to-orange-400";
  return "from-slate-300 to-slate-400";
}
function scoreBg(pct: number) {
  if (pct >= 70) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (pct >= 50) return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-slate-50 text-slate-500 border-slate-200";
}

/* ── Apply control ───────────────────────────────────────── */
function ApplyControl({ job, appInfo, onApply, onStatus }: {
  job: Job; appInfo?: AppInfo;
  onApply: (id: string) => void;
  onStatus: (appId: string, jobId: string, status: string) => void;
}) {
  if (!appInfo) {
    return (
      <button
        onClick={(e) => { e.preventDefault(); onApply(job.id); }}
        className="w-full h-9 text-sm font-semibold rounded-xl gradient-bg text-white hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
        style={{ boxShadow: "var(--shadow-primary)" }}
      >
        <Briefcase className="w-3.5 h-3.5" />Postuler
      </button>
    );
  }
  return (
    <select
      value={appInfo.status}
      onClick={(e) => e.preventDefault()}
      onChange={(e) => { e.preventDefault(); onStatus(appInfo.application_id, job.id, e.target.value); }}
      className={cn("w-full h-9 text-sm font-medium px-3 rounded-xl border cursor-pointer", STATUS_COLOR[appInfo.status])}
    >
      {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
    </select>
  );
}

/* ── Regular job card ────────────────────────────────────── */
function JobCard({ job, score, index, appInfo, onApply, onStatus }: {
  job: Job; score?: number; index: number;
  appInfo?: AppInfo;
  onApply: (id: string) => void;
  onStatus: (appId: string, jobId: string, status: string) => void;
}) {
  const hasScore = score !== undefined && score !== null;
  const pct = hasScore ? Math.round(score! * 100) : null;

  return (
    <motion.div variants={itemVariants} transition={{ delay: index * 0.04 }} className="h-full">
      <Link href={`/jobs/${job.id}`} className="block group h-full">
        <div className="h-full flex flex-col rounded-2xl border border-border bg-white overflow-hidden shadow-sm hover:shadow-lg hover:border-primary/25 hover:-translate-y-0.5 transition-all duration-200">
          {/* Score bar */}
          {pct !== null && (
            <div className={`h-1 w-full bg-gradient-to-r ${scoreGradient(pct)}`} />
          )}
          <div className="flex flex-col flex-1 p-5 gap-3">
            {/* Title + score */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold text-gray-900 group-hover:text-primary transition-colors leading-snug line-clamp-2">
                  {job.title}
                </h3>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1.5">
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <Building2 className="w-3 h-3 shrink-0" />{job.company}
                  </span>
                  {job.location && (
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <MapPin className="w-3 h-3 shrink-0" />{job.location}
                    </span>
                  )}
                </div>
              </div>
              {hasScore
                ? <ScoreRing score={score!} size={44} strokeWidth={4} />
                : <div className="shrink-0 w-11 h-11 rounded-full border-2 border-dashed border-gray-200 flex items-center justify-center"><span className="text-xs text-gray-300 font-bold">—</span></div>
              }
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-1.5">
              {job.contract_type && <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/8 text-primary border border-primary/15">{job.contract_type}</span>}
              {job.required_diploma && <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-50 text-violet-600 border border-violet-100">{job.required_diploma}</span>}
              {job.required_experience && <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-600 border border-amber-100">⏱ {job.required_experience} ans</span>}
              {job.sector === "public" && <span className="flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-600 border border-blue-100"><Shield className="w-2.5 h-2.5" />Public</span>}
              {!hasScore && <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-50 text-gray-400 border border-gray-100">Non scoré</span>}
            </div>

            {/* Description */}
            {job.description && (
              <p className="text-xs text-gray-500 line-clamp-2 flex-1 leading-relaxed">{job.description}</p>
            )}

            {/* Skills */}
            {job.required_skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {job.required_skills.slice(0, 3).map((s) => (
                  <span key={s} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-50 text-indigo-600 border border-indigo-100">{s}</span>
                ))}
                {job.required_skills.length > 3 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-50 text-gray-400 border border-gray-100">+{job.required_skills.length - 3}</span>
                )}
              </div>
            )}

            {/* Footer */}
            <div className="mt-auto pt-3 border-t border-gray-100 flex items-center gap-2">
              {job.source_name && <span className="text-[10px] font-semibold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full shrink-0">{job.source_name}</span>}
              <div className="flex-1">
                <ApplyControl job={job} appInfo={appInfo} onApply={onApply} onStatus={onStatus} />
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

/* ── Live match card (AI result) ─────────────────────────── */
function LiveMatchCard({ match, index }: { match: LiveMatch; index: number }) {
  const pct = Math.round(match.score);
  return (
    <motion.div
      variants={itemVariants}
      transition={{ delay: index * 0.05 }}
      className="h-full"
    >
      <div className="h-full flex flex-col rounded-2xl border border-border bg-white overflow-hidden shadow-sm hover:shadow-lg hover:border-primary/25 hover:-translate-y-0.5 transition-all duration-200">
        {/* Score bar */}
        <div className={`h-1.5 w-full bg-gradient-to-r ${scoreGradient(pct)}`} />

        <div className="flex flex-col flex-1 p-5 gap-3">
          {/* Title + score badge */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold text-gray-900 leading-snug line-clamp-2">{match.title}</h3>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1.5">
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <Building2 className="w-3 h-3 shrink-0" />{match.company}
                </span>
                {match.location && (
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <MapPin className="w-3 h-3 shrink-0" />{match.location}
                  </span>
                )}
              </div>
            </div>
            {/* Score badge */}
            <div className={cn("shrink-0 flex items-center justify-center w-12 h-12 rounded-xl border font-extrabold text-sm", scoreBg(pct))}>
              {pct}%
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5">
            {match.contract_type && <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/8 text-primary border border-primary/15">{match.contract_type}</span>}
            {match.required_diploma && <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-50 text-violet-600 border border-violet-100">{match.required_diploma}</span>}
            {match.required_experience && <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-600 border border-amber-100">⏱ {match.required_experience} ans</span>}
            {match.sector === "public"
              ? <span className="flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-600 border border-blue-100"><Shield className="w-2.5 h-2.5" />Public</span>
              : <span className="flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-100"><Globe className="w-2.5 h-2.5" />Privé</span>
            }
          </div>

          {/* AI explanation */}
          {match.explanation && (
            <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed italic">{match.explanation}</p>
          )}

          {/* Matching skills */}
          {match.matching_skills.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Compétences correspondantes</p>
              <div className="flex flex-wrap gap-1.5">
                {match.matching_skills.slice(0, 4).map((s) => (
                  <span key={s} className="flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-600 border border-emerald-100">
                    <CheckCircle2 className="w-2.5 h-2.5" />{s}
                  </span>
                ))}
                {match.missing_skills.slice(0, 2).map((s) => (
                  <span key={s} className="flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-50 text-red-500 border border-red-100">
                    <XCircle className="w-2.5 h-2.5" />{s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="mt-auto pt-3 border-t border-gray-100 flex items-center gap-2">
            <span className="text-[10px] font-semibold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full shrink-0">{match.source_name}</span>
            <a
              href={match.source_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex-1 h-9 text-sm font-semibold rounded-xl gradient-bg text-white hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              style={{ boxShadow: "var(--shadow-primary)" }}
            >
              <ExternalLink className="w-3.5 h-3.5" />Postuler
            </a>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Section with public/private split ───────────────────── */
function MatchSection({ title, icon: Icon, color, matches, emptyMsg }: {
  title: string; icon: React.ElementType; color: string;
  matches: LiveMatch[]; emptyMsg: string;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", color)}>
          <Icon className="w-4.5 h-4.5 text-white" />
        </div>
        <div>
          <h2 className="text-base font-bold text-gray-900">{title}</h2>
          <p className="text-xs text-gray-500">{matches.length} offre{matches.length !== 1 ? "s" : ""} trouvée{matches.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {matches.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/60 py-14 text-center">
          <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
            <Icon className="w-5 h-5 text-gray-300" />
          </div>
          <p className="text-sm font-semibold text-gray-400">{emptyMsg}</p>
          <p className="text-xs text-gray-400 mt-1">Aucune nouvelle offre correspondant à votre profil</p>
        </div>
      ) : (
        <motion.div
          variants={listVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
        >
          {matches.map((m, i) => <LiveMatchCard key={`${m.source_url}-${i}`} match={m} index={i} />)}
        </motion.div>
      )}
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────── */
export default function JobsPage() {
  const [jobs, setJobs]               = useState<Job[]>([]);
  const [recs, setRecs]               = useState<Recommendation[]>([]);
  const [liveMatches, setLiveMatches] = useState<LiveMatch[] | null>(null);
  const [total, setTotal]             = useState(0);
  const [page, setPage]               = useState(1);
  const [pages, setPages]             = useState(1);
  const { search, city, contractType, source, minScore, set: setFilters } = useFilterStore();
  const [loading, setLoading]         = useState(true);
  const [generating, setGenerating]   = useState(false);
  const [apps, setApps]               = useState<Record<string, AppInfo>>({});
  const [matchesOnly, setMatchesOnly] = useState(false);
  const [filterOpts, setFilterOpts]   = useState<{ contract_types: string[]; cities: string[] }>({ contract_types: [], cities: [] });
  const { hasCv, refresh: refreshCv } = useCvStore();

  const scoreMap = Object.fromEntries(recs.map((r) => [r.job.id, r.score]));

  const loadApps = useCallback(() => {
    jobsApi.getAppliedFull().then((r) => setApps(r.data)).catch(() => {});
  }, []);

  const handleApply = async (jobId: string) => { await jobsApi.markApplied(jobId); loadApps(); };
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
        try { await recommendationsApi.generate(); const f = await recommendationsApi.getAll(0); setRecs(f.data); return; }
        catch { /* no skills */ }
      }
      setRecs(data);
    }).catch(() => {});
  }, [loadApps, hasCv]);

  const handleLiveMatch = async () => {
    setGenerating(true);
    setLiveMatches(null);
    try {
      const { data } = await recommendationsApi.liveMatch(8);
      setLiveMatches(data ?? []);
    } catch {
      setLiveMatches([]);
    } finally {
      setGenerating(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setPage(1); fetchJobs(); };

  const pageNumbers = (() => {
    if (pages <= 5) return Array.from({ length: pages }, (_, i) => i + 1);
    const start = Math.max(1, Math.min(page - 2, pages - 4));
    return Array.from({ length: 5 }, (_, i) => start + i);
  })();

  if (hasCv === false) return <CvGate variant="jobs" />;

  const filteredJobs = jobs
    .filter((job) => {
      const sc = scoreMap[job.id];
      if (matchesOnly && (sc === undefined || sc === null)) return false;
      if (minScore > 0 && Math.round((sc ?? 0) * 100) < minScore) return false;
      return true;
    })
    .sort((a, b) => (scoreMap[b.id] ?? -1) - (scoreMap[a.id] ?? -1));

  const publicMatches  = (liveMatches ?? []).filter((m) => m.sector === "public").slice(0, 10);
  const privateMatches = (liveMatches ?? []).filter((m) => m.sector !== "public").slice(0, 10);

  const inMatchView = liveMatches !== null || generating;

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4"
      >
        <div className="flex items-center gap-3">
          {inMatchView && (
            <button
              onClick={() => setLiveMatches(null)}
              className="w-9 h-9 rounded-xl border border-border bg-white flex items-center justify-center text-gray-500 hover:text-gray-900 hover:border-gray-300 transition-colors shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">
              {inMatchView ? "Résultats IA" : "Offres d'emploi"}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {inMatchView
                ? `${(liveMatches ?? []).length} nouvelles offres analysées par l'IA`
                : total > 0
                  ? <><span className="font-semibold text-gray-900">{total.toLocaleString()}</span> offres disponibles</>
                  : "Trouvez votre prochaine opportunité"
              }
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {/* Live AI match button */}
          <button
            onClick={handleLiveMatch}
            disabled={generating}
            className={cn(
              "flex items-center gap-2 text-sm font-semibold px-5 h-10 rounded-xl transition-all",
              generating
                ? "bg-primary/10 text-primary border border-primary/20 cursor-not-allowed"
                : "gradient-bg text-white hover:opacity-90 shadow-md"
            )}
            style={!generating ? { boxShadow: "var(--shadow-primary)" } : undefined}
          >
            {generating
              ? <><RefreshCw className="w-4 h-4 animate-spin" /><span>Analyse en cours…</span></>
              : <><Rocket className="w-4 h-4" /><span>Recherche IA</span></>
            }
          </button>

          {/* Mes matches toggle — only in normal view */}
          {!inMatchView && (
            <button
              onClick={() => setMatchesOnly((v) => !v)}
              className={cn(
                "flex items-center gap-2 text-sm font-semibold px-4 h-10 rounded-xl border transition-all",
                matchesOnly
                  ? "bg-primary/8 text-primary border-primary/25"
                  : "border-gray-200 text-gray-500 hover:text-gray-900 hover:border-gray-300 bg-white"
              )}
            >
              <Star className="w-4 h-4" />
              Mes matches
              <span className={cn(
                "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                matchesOnly ? "bg-primary/12 text-primary" : "bg-gray-100 text-gray-400"
              )}>
                {matchesOnly ? "ON" : "OFF"}
              </span>
            </button>
          )}
        </div>
      </motion.div>

      <AnimatePresence mode="wait">

        {/* ── AI MATCH VIEW ─────────────────────────────────── */}
        {inMatchView && (
          <motion.div
            key="match-view"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="space-y-8"
          >
            {generating ? (
              /* Loading state */
              <div className="rounded-2xl border border-dashed border-primary/20 bg-primary/3 py-24 text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center mx-auto" style={{ boxShadow: "var(--shadow-primary)" }}>
                  <Target className="w-8 h-8 text-white animate-pulse" />
                </div>
                <div>
                  <p className="text-base font-bold text-gray-800">L&apos;IA recherche vos meilleures offres…</p>
                  <p className="text-sm text-gray-500 mt-1">Analyse de votre profil et scraping des sites d&apos;emploi marocains</p>
                </div>
                <div className="flex items-center justify-center gap-6 pt-2 text-xs text-gray-400">
                  {["rekrute.com", "marocannonces.ma", "emploi.ma"].map((s) => (
                    <span key={s} className="flex items-center gap-1"><TrendingUp className="w-3 h-3 text-primary animate-pulse" />{s}</span>
                  ))}
                </div>
              </div>
            ) : (
              /* Results */
              <>
                {/* Summary banner */}
                <div className="rounded-2xl bg-gradient-to-r from-primary/6 to-violet-500/6 border border-primary/12 p-5 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center shrink-0" style={{ boxShadow: "var(--shadow-primary)" }}>
                    <Target className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">Matching IA terminé</p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      <span className="font-semibold text-blue-600">{publicMatches.length} offres publiques</span>
                      {" · "}
                      <span className="font-semibold text-emerald-600">{privateMatches.length} offres privées</span>
                      {" "}trouvées selon votre profil
                    </p>
                  </div>
                </div>

                {/* Public jobs */}
                <MatchSection
                  title="Secteur Public"
                  icon={Shield}
                  color="bg-blue-500"
                  matches={publicMatches}
                  emptyMsg="Aucune nouvelle offre publique"
                />

                {/* Private jobs */}
                <MatchSection
                  title="Secteur Privé"
                  icon={Globe}
                  color="bg-emerald-500"
                  matches={privateMatches}
                  emptyMsg="Aucune nouvelle offre privée"
                />
              </>
            )}
          </motion.div>
        )}

        {/* ── NORMAL VIEW ───────────────────────────────────── */}
        {!inMatchView && (
          <motion.div
            key="normal-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-5"
          >
            {/* Filters */}
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest">
                <SlidersHorizontal className="w-3.5 h-3.5" />Filtres
              </div>

              <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                  <Input className="pl-9 h-10 text-sm rounded-xl" placeholder="Titre, compétence…"
                    value={search} onChange={(e) => { setFilters({ search: e.target.value }); setPage(1); }} />
                </div>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none z-10" />
                  <select className="w-full pl-9 h-10 text-sm rounded-xl border border-gray-200 bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                    value={city} onChange={(e) => { setFilters({ city: e.target.value }); setPage(1); }}>
                    <option value="">Toutes les villes</option>
                    {filterOpts.cities.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <select className="w-full h-10 text-sm rounded-xl border border-gray-200 bg-white px-3 appearance-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                  value={contractType} onChange={(e) => { setFilters({ contractType: e.target.value }); setPage(1); }}>
                  <option value="All">Tout contrat</option>
                  {filterOpts.contract_types.map((ct) => <option key={ct} value={ct}>{ct}</option>)}
                </select>
                <select className="w-full h-10 text-sm rounded-xl border border-gray-200 bg-white px-3 appearance-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                  value={source} onChange={(e) => { setFilters({ source: e.target.value }); setPage(1); }}>
                  {SECTORS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </form>

              <div className="flex items-center gap-4">
                <span className="text-xs text-gray-500 whitespace-nowrap w-28">
                  Score min&nbsp;: <span className="font-bold text-gray-800">{minScore}%</span>
                </span>
                <input type="range" min={0} max={100} step={5} value={minScore}
                  onChange={(e) => setFilters({ minScore: Number(e.target.value) })}
                  className="flex-1 accent-primary cursor-pointer" />
                {minScore > 0 && (
                  <button onClick={() => setFilters({ minScore: 0 })} className="text-[11px] text-primary hover:underline whitespace-nowrap">
                    Réinitialiser
                  </button>
                )}
              </div>
            </div>

            {/* Results count */}
            {!loading && filteredJobs.length > 0 && (
              <p className="text-xs text-gray-400 px-1">
                {filteredJobs.length} résultat{filteredJobs.length > 1 ? "s" : ""} affichés
              </p>
            )}

            {/* Job grid */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {Array.from({ length: 9 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : filteredJobs.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 py-24 text-center">
                <div className="w-14 h-14 rounded-2xl bg-white border border-gray-200 shadow-sm flex items-center justify-center mx-auto mb-4">
                  <Search className="w-6 h-6 text-gray-300" />
                </div>
                <p className="font-semibold text-gray-700">Aucune offre trouvée</p>
                <p className="text-sm text-gray-400 mt-1">Essayez d&apos;autres mots-clés ou supprimez des filtres</p>
              </div>
            ) : (
              <motion.div variants={listVariants} initial="hidden" animate="visible"
                className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredJobs.map((job, i) => (
                  <JobCard key={job.id} job={job} score={scoreMap[job.id]} index={i}
                    appInfo={apps[job.id]} onApply={handleApply} onStatus={handleStatus} />
                ))}
              </motion.div>
            )}

            {/* Pagination */}
            {pages > 1 && (
              <div className="flex items-center justify-center gap-1.5 pt-2">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}
                  className="h-9 px-3 text-xs gap-1 rounded-xl">
                  <ChevronLeft className="w-3.5 h-3.5" />Préc.
                </Button>
                <div className="flex items-center gap-1">
                  {page > 3 && pages > 5 && (
                    <><button onClick={() => setPage(1)} className="w-9 h-9 rounded-xl text-xs font-medium hover:bg-gray-100 text-gray-500 transition-colors">1</button>
                    <span className="text-gray-300 text-xs px-1">…</span></>
                  )}
                  {pageNumbers.map((p) => (
                    <button key={p} onClick={() => setPage(p)}
                      className={cn("w-9 h-9 rounded-xl text-xs font-semibold transition-all",
                        page === p ? "gradient-bg text-white shadow-sm" : "hover:bg-gray-100 text-gray-500")}>
                      {p}
                    </button>
                  ))}
                  {page < pages - 2 && pages > 5 && (
                    <><span className="text-gray-300 text-xs px-1">…</span>
                    <button onClick={() => setPage(pages)} className="w-9 h-9 rounded-xl text-xs font-medium hover:bg-gray-100 text-gray-500 transition-colors">{pages}</button></>
                  )}
                </div>
                <Button variant="outline" size="sm" disabled={page === pages} onClick={() => setPage((p) => p + 1)}
                  className="h-9 px-3 text-xs gap-1 rounded-xl">
                  Suiv.<ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
