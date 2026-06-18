"use client";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { recommendationsApi } from "@/lib/api/recommendations";
import { jobsApi } from "@/lib/api/jobs";
import { useAuthStore } from "@/lib/store/authStore";
import { useCvStore } from "@/lib/store/cvStore";
import { CvGate } from "@/components/layout/CvGate";
import type { Recommendation, Job } from "@/types/job";
import { ScoreRing } from "@/components/ui/score-ring";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonListItem, SkeletonStatCard } from "@/components/ui/skeleton";
import { itemVariants, listVariants } from "@/components/ui/page-wrapper";
import {
  Brain, Sparkles, TrendingUp, BarChart3, Layers,
  ArrowRight, RefreshCw, Briefcase, Star,
  MapPin, Building2, ChevronRight, Target, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

interface ScoreSnapshot {
  avg_score: number;
  top_score: number;
  total_matched: number;
  recorded_at: string;
}

/* ── Decode HTML entities coming from scraped job data ─── */
const decode = (str?: string) =>
  (str ?? "")
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

/* ── Score badge (green ≥70 / orange ≥50 / grey) ───────── */
function ScoreBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color =
    pct >= 70 ? "#10B981" : pct >= 50 ? "#F59E0B" : "#94A3B8";
  return (
    <span
      className="text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0"
      style={{ background: `${color}22`, color }}
    >
      {pct}%
    </span>
  );
}

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
    <motion.div variants={itemVariants} transition={{ delay }} className="card-base card-hover fade-in p-5 group">
      <div className="flex items-start justify-between mb-4">
        <div className={`stat-icon ${gradient}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <span className="text-3xl font-bold tracking-tight text-foreground">{count}{suffix}</span>
      </div>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
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
              {decode(rec.job.title)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1 truncate">
              <Building2 className="w-3 h-3 shrink-0" />{decode(rec.job.company)}
              {rec.job.location && (
                <><span className="text-border">·</span>
                  <MapPin className="w-3 h-3 shrink-0" />{decode(rec.job.location)}</>
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

  const load = async (force = false) => {
    setLoading(true);
    try {
      const { data } = await recommendationsApi.advice(force);
      setContent(data.content);
      setGeneratedAt(data.generated_at);
      setCached(data.cached);
    } catch {
      // Silently fail — user has no skills or server error
    } finally {
      setLoading(false);
    }
  };

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
      className="card-base fade-in overflow-hidden"
    >
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

      <div className="p-5">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-10 gap-3">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">Génération de votre roadmap par IA…</p>
            </motion.div>
          ) : !hasSkills ? (
            <motion.div key="noskills" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <EmptyState icon={Target} title="Roadmap indisponible"
                description="Ajoutez des compétences à votre profil ou uploadez un CV pour générer votre roadmap personnalisée." />
            </motion.div>
          ) : content ? (
            <motion.div key="content" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
              <pre className="text-sm text-foreground leading-relaxed whitespace-pre-wrap font-sans">{content}</pre>
              {timeAgo && (
                <p className="text-[11px] text-muted-foreground pt-2 border-t border-border">Généré le {timeAgo}</p>
              )}
            </motion.div>
          ) : (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <EmptyState icon={Target} title="Aucune roadmap générée"
                description="Cliquez sur Régénérer pour créer votre plan de carrière personnalisé."
                action={{ label: "Générer ma roadmap", onClick: () => load() }} />
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
  const [domainJobs, setDomainJobs] = useState<Job[]>([]);
  const [jobCount, setJobCount]     = useState(0);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading]       = useState(true);
  const [history, setHistory]       = useState<ScoreSnapshot[]>([]);
  const [minScore, setMinScore]     = useState(50);

  const { hasCv, refresh: refreshCv } = useCvStore();

  const loadHistory = () =>
    recommendationsApi.history().then((r) => setHistory(r.data)).catch(() => {});

  const loadRecs = (ms: number) =>
    recommendationsApi.getAll(ms).then((r) => setRecs(r.data)).catch(() => {});

  useEffect(() => { refreshCv(); }, [refreshCv]);

  useEffect(() => {
    if (hasCv !== true) { setLoading(false); return; }
    Promise.all([
      loadRecs(minScore),
      jobsApi.list({ search: user?.domain ?? "", size: 5 }).then((r) => setDomainJobs(r.data.items)).catch(() => {}),
      jobsApi.count().then((r) => setJobCount(r.data.count)).catch(() => {}),
      loadHistory(),
    ]).finally(() => setLoading(false));
  }, [hasCv]);

  const changeMinScore = (ms: number) => { setMinScore(ms); loadRecs(ms); };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await recommendationsApi.generate();
      await loadRecs(minScore);
      loadHistory();
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
  const avgScore  = recs.length ? recs.reduce((a, r) => a + (r.score || 0), 0) / recs.length : 0;
  const hour      = new Date().getHours();
  const greeting  = hour < 12 ? "Bonjour" : hour < 18 ? "Bon après-midi" : "Bonsoir";
  const hasSkills = (user?.skills?.length ?? 0) > 0;

  // score map for the domain list (job_id → best rec score)
  const scoreByJob = new Map(recs.map((r) => [r.job.id, r.score]));

  const stats = [
    { icon: Brain,      label: "AI Matches",        value: recs.length,                       gradient: "gradient-bg",         delay: 0    },
    { icon: BarChart3,  label: "Score moyen",       value: Math.round(avgScore * 100), suffix: "%", gradient: "gradient-bg-emerald", delay: 0.06 },
    { icon: TrendingUp, label: "Top Match",         value: Math.round(topScore * 100), suffix: "%", gradient: "gradient-bg-amber",  delay: 0.12 },
    { icon: Sparkles,   label: "Mes compétences",   value: user?.skills?.length ?? 0,         gradient: "gradient-bg",         delay: 0.18 },
    { icon: Layers,     label: "Offres disponibles", value: jobCount,                         gradient: "gradient-bg-emerald", delay: 0.24 },
  ];

  if (hasCv === false) return <CvGate variant="dashboard" />;

  const enoughHistory = history.length >= 2;

  return (
    <div className="dark -m-5 md:-m-8 p-5 md:p-8 min-h-[calc(100vh-4rem)] bg-[#0A0A0F] text-white">
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
              {new Date().toLocaleDateString("fr-FR", { weekday: "long", month: "long", day: "numeric" })}
            </p>
          </div>
          <Button
            data-tour="generate"
            variant="gradient"
            onClick={handleGenerate}
            disabled={generating}
            className="h-10 px-5 shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${generating ? "animate-spin" : ""}`} />
            {generating ? "Analyse en cours…" : "Lancer le matching IA"}
          </Button>
        </motion.div>

        {/* ── Stat cards (5) ───────────────────────── */}
        <motion.div
          data-tour="chart"
          variants={listVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-2 lg:grid-cols-5 gap-4"
        >
          {loading
            ? [0, 1, 2, 3, 4].map((i) => <SkeletonStatCard key={i} />)
            : stats.map((s) => <StatCard key={s.label} {...s} />)
          }
        </motion.div>

        {/* ── Score progression chart ──────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.35 }}
          className="card-base fade-in p-5"
        >
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" /> Progression de votre compatibilité
          </h2>
          {enoughHistory ? (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart
                data={history.map((h) => ({
                  date: new Date(h.recorded_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
                  avg_score: Math.round(h.avg_score),
                }))}
                margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
              >
                <defs>
                  <linearGradient id="scoreLine" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#6B4EFF" />
                    <stop offset="100%" stopColor="#A855F7" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" unit="%" />
                <Tooltip
                  contentStyle={{ background: "#1A1A2E", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 12, color: "#fff" }}
                  formatter={(v: number) => [`${v}%`, "Score moyen"]}
                />
                <Line type="monotone" dataKey="avg_score" stroke="url(#scoreLine)" strokeWidth={3} dot={{ r: 4, fill: "#6B4EFF" }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Générez vos recommandations plusieurs fois pour voir votre progression.
            </p>
          )}
        </motion.div>

        {/* ── Main grid ────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

          {/* Recommendations */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18, duration: 0.35 }}
            className="lg:col-span-3 card-base fade-in overflow-hidden"
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
                  Voir tout <ArrowRight className="w-3 h-3" />
                </Button>
              </Link>
            </div>

            {/* Match-level filter */}
            <div className="flex flex-wrap items-center gap-2 px-4 py-2 border-b border-border">
              <span className="text-[11px] text-muted-foreground ml-1">Affichage :</span>
              {[
                { ms: 50, label: "✅ Bon match (50%+)" },
                { ms: 30, label: "👍 Correct (30%+)" },
                { ms: 0,  label: "🔍 Tout afficher" },
              ].map(({ ms, label }) => (
                <button
                  key={ms}
                  onClick={() => changeMinScore(ms)}
                  className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full border transition-colors ${
                    minScore === ms
                      ? "gradient-bg text-white border-transparent"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="p-2">
              {loading ? (
                <div className="space-y-1.5 p-2">
                  {[0, 1, 2, 3].map((i) => <SkeletonListItem key={i} />)}
                </div>
              ) : recs.length === 0 && minScore === 50 ? (
                <div className="py-10 px-6 text-center space-y-3">
                  <p className="text-sm font-medium">Aucun bon match trouvé.</p>
                  <p className="text-sm text-muted-foreground">💡 Essayez "Correct (30%+)" pour voir plus de résultats.</p>
                  <Button onClick={() => changeMinScore(30)} variant="gradient" className="h-9 px-4 text-sm">
                    👍 Voir les offres Correct (30%+)
                  </Button>
                </div>
              ) : recs.length === 0 ? (
                <EmptyState
                  icon={Brain}
                  title="Aucune correspondance à ce niveau"
                  description='Lancez "Lancer le matching IA" ou élargissez davantage la recherche.'
                  action={{ label: "Lancer le matching IA", onClick: handleGenerate }}
                />
              ) : (
                <motion.div variants={listVariants} initial="hidden" animate="visible" className="space-y-0.5">
                  {recs.slice(0, 5).map((rec, i) => <RecRow key={rec.id} rec={rec} index={i} />)}
                </motion.div>
              )}
            </div>
          </motion.div>

          {/* Recommandé pour votre domaine */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.24, duration: 0.35 }}
            className="lg:col-span-2 card-base fade-in overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg gradient-bg-emerald flex items-center justify-center">
                  <Briefcase className="w-3 h-3 text-white" />
                </div>
                <h2 className="text-sm font-semibold">🎯 Recommandé pour votre domaine</h2>
              </div>
              <Link href="/jobs">
                <Button variant="ghost" size="sm" className="h-7 text-xs px-2 gap-1 text-muted-foreground hover:text-foreground">
                  Tout <ArrowRight className="w-3 h-3" />
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
              ) : domainJobs.length === 0 ? (
                <p className="text-sm text-muted-foreground p-6 text-center">
                  Aucune offre trouvée pour votre domaine.
                </p>
              ) : domainJobs.map((job) => {
                const s = scoreByJob.get(job.id);
                return (
                  <div key={job.id} className="px-4 py-3 flex items-center gap-2 hover:bg-muted/40 transition-colors group">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{decode(job.title)}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{decode(job.company)}</p>
                    </div>
                    {s !== undefined && <ScoreBadge score={s} />}
                    <Link href={`/jobs/${job.id}`}>
                      <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs">Voir</Button>
                    </Link>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>

        {/* ── Skills cloud ─────────────────────────── */}
        {hasSkills && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.35 }}
            className="card-base fade-in p-4"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-lg gradient-bg-amber flex items-center justify-center">
                <Sparkles className="w-3 h-3 text-white" />
              </div>
              <h2 className="text-sm font-semibold">Vos compétences</h2>
              <span className="text-xs text-muted-foreground ml-auto">{user!.skills.length} détectées</span>
            </div>
            <motion.div variants={listVariants} initial="hidden" animate="visible" className="flex flex-wrap gap-2">
              {user!.skills.map((skill) => (
                <motion.span
                  key={skill}
                  variants={itemVariants}
                  className="px-2.5 py-1 rounded-full text-xs font-medium"
                  style={{ background: "rgba(107,78,255,0.2)", color: "#A855F7" }}
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
    </div>
  );
}
