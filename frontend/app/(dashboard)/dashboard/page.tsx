"use client";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { recommendationsApi } from "@/lib/api/recommendations";
import { jobsApi } from "@/lib/api/jobs";
import { useAuthStore } from "@/lib/store/authStore";
import type { Recommendation, Job } from "@/types/job";
import { ScoreRing } from "@/components/ui/score-ring";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonListItem, SkeletonStatCard } from "@/components/ui/skeleton";
import { itemVariants, listVariants } from "@/components/ui/page-wrapper";
import {
  Brain, Sparkles, TrendingUp, BookmarkCheck,
  ArrowRight, RefreshCw, Briefcase, Star,
  MapPin, Building2, ChevronRight, Target, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

/* ── Animated counter ─────────────────────────── */
function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(0);
  const frame = useRef<number>();

  useEffect(() => {
    if (target === 0) { setValue(0); return; }
    let start: number;
    const step = (ts: number) => {
      if (!start) start = ts;
      const pct  = Math.min((ts - start) / duration, 1);
      const ease = 1 - Math.pow(1 - pct, 3);
      setValue(Math.round(ease * target));
      if (pct < 1) frame.current = requestAnimationFrame(step);
    };
    frame.current = requestAnimationFrame(step);
    return () => { if (frame.current) cancelAnimationFrame(frame.current); };
  }, [target, duration]);

  return value;
}

/* ── Stat card ────────────────────────────────── */
function StatCard({
  icon: Icon, label, value, suffix = "", gradient, delay = 0,
}: {
  icon: React.ElementType; label: string; value: number; suffix?: string;
  gradient: string; delay?: number;
}) {
  const count = useCountUp(value, 800);
  return (
    <motion.div variants={itemVariants} transition={{ delay }} className="card-base p-5 group">
      <div className="flex items-start justify-between mb-4">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${gradient}`}
          style={{ boxShadow: "var(--shadow-primary)" }}
        >
          <Icon className="w-5 h-5 text-white" />
        </div>
        <span className="text-3xl font-bold text-foreground">{count}{suffix}</span>
      </div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
    </motion.div>
  );
}

/* ── Rec row ──────────────────────────────────── */
function RecRow({ rec, index }: { rec: Recommendation; index: number }) {
  return (
    <motion.div variants={itemVariants} transition={{ delay: index * 0.05 }}>
      <Link href={`/jobs/${rec.job.id}`} className="block group">
        <div className="flex items-center gap-3 px-3 py-3 rounded-xl border border-transparent hover:border-border hover:bg-muted/50 transition-all duration-150">
          <span className="text-xs font-semibold text-muted-foreground/50 w-4 shrink-0">
            {String(index + 1).padStart(2, "0")}
          </span>
          <ScoreRing score={rec.score} size={44} strokeWidth={4} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
              {rec.job.title}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1 truncate">
              <Building2 className="w-3 h-3 shrink-0" />{rec.job.company}
              {rec.job.location && (
                <><span className="text-border">·</span>
                  <MapPin className="w-3 h-3 shrink-0" />{rec.job.location}</>
              )}
            </p>
            {rec.explanation && (
              <p className="text-[10px] text-muted-foreground/70 mt-0.5 truncate">{rec.explanation}</p>
            )}
          </div>
          <div className="hidden sm:flex items-center gap-1 shrink-0">
            <span className="text-xs text-muted-foreground">{rec.matching_skills.length} skills</span>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

/* ── Roadmap card ─────────────────────────────── */
function RoadmapCard({ hasSkills }: { hasSkills: boolean }) {
  const [content, setContent]           = useState<string>("");
  const [generatedAt, setGeneratedAt]   = useState<string>("");
  const [cached, setCached]             = useState(false);
  const [loading, setLoading]           = useState(false);
  const [loadedOnce, setLoadedOnce]     = useState(false);

  const load = async (force = false) => {
    setLoading(true);
    try {
      const { data } = await recommendationsApi.advice(force);
      setContent(data.content);
      setGeneratedAt(data.generated_at);
      setCached(data.cached);
      setLoadedOnce(true);
    } catch {
      // Silently fail — user has no skills or server error
    } finally {
      setLoading(false);
    }
  };

  // Auto-load if user has skills
  useEffect(() => {
    if (hasSkills) load();
  }, [hasSkills]);

  const timeAgo = generatedAt
    ? new Date(generatedAt).toLocaleDateString("fr-FR", {
        day: "numeric", month: "long", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      })
    : "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.36, duration: 0.35 }}
      className="card-base overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg gradient-bg flex items-center justify-center">
            <Target className="w-3 h-3 text-white" />
          </div>
          <h2 className="text-sm font-semibold">🎯 Votre roadmap personnalisée</h2>
          {cached && (
            <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
              en cache
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs px-2 gap-1.5 text-muted-foreground hover:text-foreground"
          onClick={() => load(true)}
          disabled={loading || !hasSkills}
        >
          <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
          Régénérer
        </Button>
      </div>

      {/* Content */}
      <div className="p-5">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-10 gap-3"
            >
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">
                Génération de votre roadmap par IA…
              </p>
            </motion.div>
          ) : !hasSkills ? (
            <motion.div key="noskills" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <EmptyState
                icon={Target}
                title="Roadmap indisponible"
                description="Ajoutez des compétences à votre profil ou uploadez un CV pour générer votre roadmap personnalisée."
              />
            </motion.div>
          ) : content ? (
            <motion.div
              key="content"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              <pre className="text-sm text-foreground leading-relaxed whitespace-pre-wrap font-sans">
                {content}
              </pre>
              {timeAgo && (
                <p className="text-[11px] text-muted-foreground pt-2 border-t border-border">
                  Généré le {timeAgo}
                </p>
              )}
            </motion.div>
          ) : (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <EmptyState
                icon={Target}
                title="Aucune roadmap générée"
                description="Cliquez sur Régénérer pour créer votre plan de carrière personnalisé."
                action={{ label: "Générer ma roadmap", onClick: () => load() }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}


/* ── Page ─────────────────────────────────────── */
export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const [recs, setRecs]             = useState<Recommendation[]>([]);
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    Promise.all([
      recommendationsApi.getAll().then((r) => setRecs(r.data)),
      jobsApi.list({ size: 6 }).then((r) => setRecentJobs(r.data.items)),
    ]).finally(() => setLoading(false));
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const { data } = await recommendationsApi.generate();
      setRecs(data);
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { detail?: string }; }; code?: string })?.response?.data?.detail ??
        "Upload a CV first to get AI matches.";
      alert(msg);
    } finally {
      setGenerating(false);
    }
  };

  const topScore  = recs[0]?.score ?? 0;
  const hour      = new Date().getHours();
  const greeting  = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const hasSkills = (user?.skills?.length ?? 0) > 0;

  const stats = [
    { icon: Brain,      label: "AI Matches",  value: recs.length,                     gradient: "gradient-bg",        delay: 0    },
    { icon: Sparkles,   label: "My Skills",   value: user?.skills?.length ?? 0,        gradient: "gradient-bg-emerald", delay: 0.06 },
    { icon: TrendingUp, label: "Top Match",   value: Math.round(topScore * 100), suffix: "%", gradient: "gradient-bg-amber", delay: 0.12 },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      {/* ── Header ───────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">👋</span>
            <h1 className="text-xl font-bold text-foreground">
              {greeting}, {user?.first_name ?? "there"}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>
        <Button
          onClick={handleGenerate}
          disabled={generating}
          className="gradient-bg text-white border-0 h-9 px-4 text-sm font-medium gap-2 shrink-0"
          style={{ boxShadow: generating ? "none" : "var(--shadow-primary)" }}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${generating ? "animate-spin" : ""}`} />
          {generating ? "Matching…" : "Run AI Matching"}
        </Button>
      </motion.div>

      {/* ── Stat cards ───────────────────────────── */}
      <motion.div
        variants={listVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
      >
        {loading
          ? [0, 1, 2].map((i) => <SkeletonStatCard key={i} />)
          : stats.map((s) => <StatCard key={s.label} {...s} />)
        }
      </motion.div>

      {/* ── Main grid ────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        {/* Recommendations */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, duration: 0.35 }}
          className="lg:col-span-3 card-base overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg gradient-bg flex items-center justify-center">
                <Star className="w-3 h-3 text-white" />
              </div>
              <h2 className="text-sm font-semibold">Top Matches</h2>
              {recs.length > 0 && (
                <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">
                  {recs.length}
                </span>
              )}
            </div>
            <Link href="/jobs">
              <Button variant="ghost" size="sm" className="h-7 text-xs px-2 gap-1 text-muted-foreground hover:text-foreground">
                See all <ArrowRight className="w-3 h-3" />
              </Button>
            </Link>
          </div>

          <div className="p-2">
            {loading ? (
              <div className="space-y-1.5 p-2">
                {[0, 1, 2, 3].map((i) => <SkeletonListItem key={i} />)}
              </div>
            ) : recs.length === 0 ? (
              <EmptyState
                icon={Brain}
                title="No matches yet"
                description="Run AI matching after uploading your CV to see personalized job recommendations."
                action={{ label: "Run AI Matching", onClick: handleGenerate }}
              />
            ) : (
              <motion.div variants={listVariants} initial="hidden" animate="visible" className="space-y-0.5">
                {recs.slice(0, 5).map((rec, i) => <RecRow key={rec.id} rec={rec} index={i} />)}
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Recent jobs */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.24, duration: 0.35 }}
          className="lg:col-span-2 card-base overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg gradient-bg-emerald flex items-center justify-center">
                <Briefcase className="w-3 h-3 text-white" />
              </div>
              <h2 className="text-sm font-semibold">Recent Listings</h2>
            </div>
            <Link href="/jobs">
              <Button variant="ghost" size="sm" className="h-7 text-xs px-2 gap-1 text-muted-foreground hover:text-foreground">
                All <ArrowRight className="w-3 h-3" />
              </Button>
            </Link>
          </div>

          <div className="divide-y divide-border">
            {loading ? (
              <div className="space-y-0 p-2">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className="p-3 space-y-1.5">
                    <div className="skeleton h-3.5 w-3/4" />
                    <div className="skeleton h-2.5 w-1/2" />
                  </div>
                ))}
              </div>
            ) : recentJobs.map((job) => (
              <Link key={job.id} href={`/jobs/${job.id}`} className="block group">
                <div className="px-4 py-3 hover:bg-muted/40 transition-colors">
                  <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">
                    {job.title}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                    <span className="truncate">{job.company}</span>
                    {job.contract_type && (
                      <>
                        <span className="text-border shrink-0">·</span>
                        <span className="shrink-0 px-1.5 py-0.5 bg-muted rounded text-[10px] font-medium">
                          {job.contract_type}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ── Skills cloud ─────────────────────────── */}
      {hasSkills && (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.35 }}
          className="card-base p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-lg gradient-bg-amber flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-white" />
            </div>
            <h2 className="text-sm font-semibold">Your Skills</h2>
            <span className="text-xs text-muted-foreground ml-auto">{user!.skills.length} detected</span>
          </div>
          <motion.div
            variants={listVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-wrap gap-2"
          >
            {user!.skills.map((skill) => (
              <motion.span
                key={skill}
                variants={itemVariants}
                className="px-2.5 py-1 rounded-full text-xs font-medium skill-neutral"
              >
                {skill}
              </motion.span>
            ))}
          </motion.div>
        </motion.div>
      )}

      {/* ── Roadmap card ─────────────────────────── */}
      <RoadmapCard hasSkills={hasSkills} />

    </div>
  );
}
