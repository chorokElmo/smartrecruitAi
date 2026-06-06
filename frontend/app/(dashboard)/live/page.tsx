"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { recommendationsApi } from "@/lib/api/recommendations";
import { useAuthStore } from "@/lib/store/authStore";
import type { LiveMatch } from "@/types/job";
import { listVariants, itemVariants } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import {
  Zap, MapPin, Building2, ExternalLink, CheckCircle2,
  XCircle, Loader2, GraduationCap, Clock, Sparkles,
  Globe, Lock, Briefcase, RefreshCw, AlertCircle,
  Wifi, WifiOff, CalendarX,
} from "lucide-react";

// ── Score badge ───────────────────────────────────────────────────────────────

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 70 ? "bg-emerald-500" :
    score >= 45 ? "bg-amber-500"   :
                  "bg-red-500";
  return (
    <div className={`${color} text-white font-bold text-sm rounded-xl px-2.5 py-1 shrink-0`}>
      {score}%
    </div>
  );
}

// ── Live job card ─────────────────────────────────────────────────────────────

function LiveJobCard({ match, index }: { match: LiveMatch; index: number }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      variants={itemVariants}
      transition={{ delay: index * 0.04 }}
      className="card-base overflow-hidden"
    >
      {/* Score bar */}
      <div className={`h-1 w-full transition-all ${
        match.score >= 70 ? "bg-gradient-to-r from-emerald-500 to-teal-400" :
        match.score >= 45 ? "bg-gradient-to-r from-amber-400 to-orange-400" :
                            "bg-gradient-to-r from-red-400 to-rose-400"
      }`} style={{ width: `${match.score}%` }} />

      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center text-white font-bold text-base shrink-0"
            style={{ boxShadow: "var(--shadow-primary)" }}
          >
            {match.company[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-semibold text-foreground leading-snug line-clamp-2">
                {match.title}
              </h3>
              <ScoreBadge score={match.score} />
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Building2 className="w-3 h-3 shrink-0" />{match.company}
              </span>
              {match.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 shrink-0" />{match.location}
                </span>
              )}
              {match.contract_type && (
                <span className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-medium">
                  {match.contract_type}
                </span>
              )}
              {match.sector === "public" && (
                <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-violet-500/10 text-violet-600 dark:text-violet-400">
                  <Lock className="w-2.5 h-2.5" />Public
                </span>
              )}
              <span className="text-[10px] opacity-60">{match.source_name}</span>
            </div>
          </div>
        </div>

        {/* AI explanation */}
        {match.explanation && (
          <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-muted/50 text-xs text-muted-foreground">
            <Sparkles className="w-3 h-3 shrink-0 text-primary mt-0.5" />
            <span>{match.explanation}</span>
          </div>
        )}

        {/* Skills */}
        <div className="flex flex-wrap gap-1.5">
          {match.matching_skills.slice(0, 4).map((s) => (
            <span key={s} className="flex items-center gap-0.5 px-2 py-0.5 rounded-full skill-matched text-[10px] font-medium">
              <CheckCircle2 className="w-2.5 h-2.5" />{s}
            </span>
          ))}
          {match.missing_skills.slice(0, 3).map((s) => (
            <span key={s} className="flex items-center gap-0.5 px-2 py-0.5 rounded-full skill-missing text-[10px] font-medium opacity-80">
              <XCircle className="w-2.5 h-2.5" />{s}
            </span>
          ))}
        </div>

        {/* Requirements + deadline + remote badges */}
        <div className="flex flex-wrap gap-2">
          {match.required_diploma && (
            <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 font-medium">
              <GraduationCap className="w-2.5 h-2.5" />
              Requis: {match.required_diploma}
            </span>
          )}
          {match.required_experience && (
            <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium">
              <Clock className="w-2.5 h-2.5" />
              {match.required_experience}
            </span>
          )}
          {match.deadline && (() => {
            const dl   = new Date(match.deadline);
            const days = Math.ceil((dl.getTime() - Date.now()) / 86400000);
            const fmt  = dl.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
            return (
              <span className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${
                days <= 7
                  ? "bg-red-500/10 text-red-600 dark:text-red-400"
                  : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
              }`}>
                <CalendarX className="w-2.5 h-2.5" />
                {days <= 7 ? "⚡ " : ""}Clôture: {fmt} · {days}j restants
              </span>
            );
          })()}
          {match.remote_work === true && (
            <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">
              <Wifi className="w-2.5 h-2.5" />Télétravail ✓
            </span>
          )}
          {match.remote_work === false && (
            <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
              <WifiOff className="w-2.5 h-2.5" />Présentiel
            </span>
          )}
        </div>

        {/* Description toggle */}
        <div>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-[11px] text-primary hover:underline"
          >
            {expanded ? "Réduire" : "Voir la description"}
          </button>
          <AnimatePresence>
            {expanded && (
              <motion.p
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="text-xs text-muted-foreground mt-2 leading-relaxed overflow-hidden"
              >
                {match.description || "Aucune description disponible."}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Apply link */}
        {match.source_url && (
          <a href={match.source_url} target="_blank" rel="noopener noreferrer">
            <Button
              size="sm"
              className="h-8 text-xs gradient-bg text-white border-0 gap-1.5 mt-1"
              style={{ boxShadow: "var(--shadow-primary)" }}
            >
              <ExternalLink className="w-3 h-3" />Postuler sur {match.source_name}
            </Button>
          </a>
        )}
      </div>
    </motion.div>
  );
}


// ── Loading steps ─────────────────────────────────────────────────────────────

const LOADING_STEPS = [
  { label: "Scraping Rekrute.ma…",                  icon: Globe    },
  { label: "Lecture des pages détail (diplôme, exp, deadline)…", icon: Briefcase },
  { label: "Scraping Emploi.ma + emploi-public.ma…",icon: Globe    },
  { label: "Groq AI analyse titre · description · niveau · domaine…", icon: Sparkles },
  { label: "Calcul scores de compatibilité…",       icon: Zap      },
];

function LoadingPipeline({ step }: { step: number }) {
  return (
    <div className="card-base p-8 space-y-4 max-w-md mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center">
          <Zap className="w-5 h-5 text-white animate-pulse" />
        </div>
        <div>
          <p className="text-sm font-semibold">Recherche en cours…</p>
          <p className="text-xs text-muted-foreground">Scraping des sites marocains + analyse IA</p>
        </div>
      </div>

      <div className="space-y-2.5">
        {LOADING_STEPS.map((s, i) => {
          const done    = i < step;
          const current = i === step;
          const Icon    = s.icon;
          return (
            <div key={i} className={`flex items-center gap-3 text-sm transition-all ${
              done    ? "text-emerald-600 dark:text-emerald-400" :
              current ? "text-foreground" :
                        "text-muted-foreground/40"
            }`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                done    ? "bg-emerald-500" :
                current ? "bg-primary" :
                          "bg-muted"
              }`}>
                {done ? (
                  <CheckCircle2 className="w-3 h-3 text-white" />
                ) : current ? (
                  <Loader2 className="w-3 h-3 text-white animate-spin" />
                ) : (
                  <Icon className="w-3 h-3 text-muted-foreground" />
                )}
              </div>
              <span className={`text-xs ${current ? "font-medium" : ""}`}>{s.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}


// ── Page ──────────────────────────────────────────────────────────────────────

export default function LiveSearchPage() {
  const user                          = useAuthStore((s) => s.user);
  const [results, setResults]         = useState<LiveMatch[]>([]);
  const [loading, setLoading]         = useState(false);
  const [loadStep, setLoadStep]       = useState(0);
  const [searched, setSearched]       = useState(false);
  const [error, setError]             = useState<string>("");

  const handleSearch = async () => {
    setLoading(true);
    setSearched(true);
    setError("");
    setResults([]);
    setLoadStep(0);

    // Animate loading steps while waiting
    const timer = setInterval(() => {
      setLoadStep((s) => Math.min(s + 1, LOADING_STEPS.length - 1));
    }, 3000);

    try {
      const { data } = await recommendationsApi.liveMatch(3);
      setResults(data);
      setLoadStep(LOADING_STEPS.length);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Erreur lors de la recherche. Vérifiez votre profil.";
      setError(msg);
    } finally {
      clearInterval(timer);
      setLoading(false);
    }
  };

  const topMatches  = results.filter((r) => r.score >= 70).length;
  const goodMatches = results.filter((r) => r.score >= 45).length;

  return (
    <div className="max-w-3xl mx-auto space-y-5">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              Recherche Live
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Offres scraped en temps réel depuis les sites marocains · Analyse IA complète de chaque offre
            </p>
          </div>
          <Button
            onClick={handleSearch}
            disabled={loading}
            className="gradient-bg text-white border-0 h-10 px-5 text-sm font-semibold gap-2 shrink-0"
            style={{ boxShadow: loading ? "none" : "var(--shadow-primary)" }}
          >
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" />Recherche…</>
              : searched
                ? <><RefreshCw className="w-4 h-4" />Relancer</>
                : <><Zap className="w-4 h-4" />Lancer la recherche</>
            }
          </Button>
        </div>
      </motion.div>

      {/* Profile summary */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="card-base p-4 flex flex-wrap gap-3 items-center"
      >
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider w-full">
          Votre profil utilisé pour le matching
        </p>
        {user?.diploma && (
          <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 font-medium">
            <GraduationCap className="w-3 h-3" />{user.diploma}
          </span>
        )}
        {user?.domain && (
          <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium">
            <Briefcase className="w-3 h-3" />{user.domain}
          </span>
        )}
        {user?.years_experience && (
          <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium">
            <Clock className="w-3 h-3" />{user.years_experience} ans
          </span>
        )}
        {(user?.skills?.length ?? 0) > 0 && (
          <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">
            <Sparkles className="w-3 h-3" />{user!.skills.length} compétences
          </span>
        )}
        {!user?.diploma && !user?.domain && !user?.skills?.length && (
          <p className="text-xs text-amber-600">
            ⚠ Profil incomplet — uploadez votre CV ou complétez votre profil pour de meilleurs résultats
          </p>
        )}
      </motion.div>

      {/* Loading pipeline */}
      <AnimatePresence>
        {loading && (
          <motion.div
            key="loading"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <LoadingPipeline step={loadStep} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      {error && !loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-600"
        >
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
        </motion.div>
      )}

      {/* Results */}
      {!loading && results.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {/* Summary */}
          <div className="flex items-center gap-4 px-1">
            <p className="text-sm font-semibold">
              {results.length} offres analysées
            </p>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-medium">
              {topMatches} excellent{topMatches !== 1 ? "s" : ""}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 font-medium">
              {goodMatches - topMatches} bon{goodMatches - topMatches !== 1 ? "s" : ""}
            </span>
            <span className="text-xs text-muted-foreground ml-auto">
              Rekrute · Emploi.ma · emploi-public.ma
            </span>
          </div>

          <motion.div
            variants={listVariants}
            initial="hidden"
            animate="visible"
            className="space-y-3"
          >
            {results.map((m, i) => (
              <LiveJobCard key={`${m.title}-${m.company}-${i}`} match={m} index={i} />
            ))}
          </motion.div>
        </motion.div>
      )}

      {/* Empty state — not yet searched */}
      {!loading && !searched && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="card-base py-16 text-center"
        >
          <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center mx-auto mb-4"
               style={{ boxShadow: "var(--shadow-primary)" }}>
            <Zap className="w-8 h-8 text-white" />
          </div>
          <p className="font-semibold text-lg mb-2">Recherche intelligente en temps réel</p>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed mb-6">
            Cliquez sur "Lancer la recherche" — votre CV sera comparé aux offres actuelles
            sur Rekrute, Emploi.ma et emploi-public.ma par Groq AI.
          </p>
          <div className="flex justify-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Globe className="w-3 h-3" />Rekrute.ma</span>
            <span>·</span>
            <span className="flex items-center gap-1"><Globe className="w-3 h-3" />Emploi.ma</span>
            <span>·</span>
            <span className="flex items-center gap-1"><Lock className="w-3 h-3" />emploi-public.ma</span>
          </div>
        </motion.div>
      )}
    </div>
  );
}
