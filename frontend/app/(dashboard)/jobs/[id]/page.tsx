"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { jobsApi } from "@/lib/api/jobs";
import { recommendationsApi } from "@/lib/api/recommendations";
import type { Job, Recommendation } from "@/types/job";
import { ScoreRingLarge } from "@/components/ui/score-ring";
import { listVariants, itemVariants } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, MapPin, Building2, Calendar,
  ExternalLink, CheckCircle2, XCircle, Loader2,
  Sparkles, Bookmark, BookmarkCheck, Clock,
} from "lucide-react";

function SkeletonDetail() {
  return (
    <div className="max-w-3xl mx-auto space-y-4 animate-fade-up">
      <div className="card-base p-6 space-y-5">
        <div className="flex gap-4">
          <div className="skeleton h-14 w-14 rounded-2xl shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-5 w-2/3" />
            <div className="skeleton h-4 w-1/3" />
            <div className="flex gap-2 mt-2">
              <div className="skeleton h-6 w-16 rounded-full" />
              <div className="skeleton h-6 w-20 rounded-full" />
            </div>
          </div>
          <div className="skeleton h-24 w-24 rounded-2xl shrink-0" />
        </div>
        <div className="skeleton h-px w-full" />
        <div className="flex gap-2">
          <div className="skeleton h-9 w-28 rounded-lg" />
          <div className="skeleton h-9 w-24 rounded-lg" />
        </div>
      </div>
      <div className="card-base p-6 space-y-3">
        <div className="skeleton h-4 w-1/4" />
        <div className="skeleton h-3.5 w-full" />
        <div className="skeleton h-3.5 w-5/6" />
        <div className="skeleton h-3.5 w-4/5" />
      </div>
    </div>
  );
}

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(null);
  const [rec, setRec] = useState<Recommendation | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [savePending, setSavePending] = useState(false);

  useEffect(() => {
    Promise.all([
      jobsApi.getById(id).then((r) => setJob(r.data)),
      recommendationsApi.getAll()
        .then((r) => setRec(r.data.find((x: Recommendation) => x.job.id === id) ?? null))
        .catch(() => {}),
      jobsApi.getSaved()
        .then((r) => setIsSaved(r.data.some((j: Job) => j.id === id)))
        .catch(() => {}),
    ]).finally(() => setLoading(false));
  }, [id]);

  const handleToggleSave = async () => {
    setSavePending(true);
    try {
      if (isSaved) {
        await jobsApi.unsave(id);
        setIsSaved(false);
      } else {
        await jobsApi.save(id);
        setIsSaved(true);
      }
    } catch {
      // ignore — stay in current state
    } finally {
      setSavePending(false);
    }
  };

  if (loading) return (
    <div className="max-w-3xl mx-auto pt-4">
      <div className="flex items-center gap-2 mb-5">
        <div className="skeleton h-8 w-24 rounded-lg" />
      </div>
      <SkeletonDetail />
    </div>
  );

  if (!job) return (
    <div className="max-w-3xl mx-auto py-20 text-center">
      <Building2 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
      <p className="font-semibold text-foreground">Job not found</p>
      <p className="text-sm text-muted-foreground mt-1">This listing may have been removed.</p>
      <Button variant="outline" className="mt-5" onClick={() => router.back()}>
        <ArrowLeft className="w-4 h-4 mr-2" />Back to jobs
      </Button>
    </div>
  );

  const formatDate = (d?: string) =>
    d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : null;

  const deadline = formatDate(job.deadline);
  const isDeadlineSoon = job.deadline
    ? (new Date(job.deadline).getTime() - Date.now()) < 7 * 24 * 60 * 60 * 1000
    : false;

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Back button */}
      <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }}>
        <Button
          variant="ghost"
          className="gap-2 h-8 px-2 text-sm text-muted-foreground hover:text-foreground -ml-1"
          onClick={() => router.back()}
        >
          <ArrowLeft className="w-3.5 h-3.5" />Back
        </Button>
      </motion.div>

      {/* ── Hero card ─────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06, duration: 0.35 }}
        className="card-base overflow-hidden"
      >
        {/* Score color top bar */}
        <div className={`h-1 w-full ${
          rec?.score
            ? rec.score >= 0.7 ? "bg-gradient-to-r from-emerald-500 to-teal-400"
            : rec.score >= 0.4 ? "bg-gradient-to-r from-amber-500 to-orange-400"
            : "bg-gradient-to-r from-red-500 to-rose-400"
            : "gradient-bg"
        }`} />

        <div className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            {/* Company avatar */}
            <div
              className="w-14 h-14 rounded-2xl gradient-bg flex items-center justify-center text-white font-bold text-xl shrink-0"
              style={{ boxShadow: "var(--shadow-primary)" }}
            >
              {job.company[0]?.toUpperCase()}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold leading-tight text-foreground">{job.title}</h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" />{job.company}
                </span>
                {job.location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />{job.location}
                  </span>
                )}
                {deadline && (
                  <span className={`flex items-center gap-1.5 ${isDeadlineSoon ? "text-amber-600 font-medium" : ""}`}>
                    <Clock className="w-3.5 h-3.5" />
                    {isDeadlineSoon ? "⚡ " : ""}Deadline: {deadline}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {job.contract_type && (
                  <span className="gradient-bg text-white text-xs font-medium px-2.5 py-1 rounded-full">
                    {job.contract_type}
                  </span>
                )}
                {job.source_name && (
                  <span className="border border-border text-muted-foreground text-xs font-medium px-2.5 py-1 rounded-full">
                    {job.source_name}
                  </span>
                )}
              </div>
            </div>

            {/* Score ring (large) */}
            {rec && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                className="shrink-0"
              >
                <ScoreRingLarge score={rec.score} size={100} strokeWidth={7} />
              </motion.div>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-border my-4" />

          {/* Actions */}
          <div className="flex items-center gap-2">
            {job.source_url ? (
              <a href={job.source_url} target="_blank" rel="noopener noreferrer">
                <Button
                  className="gradient-bg text-white border-0 h-9 px-4 text-sm font-medium gap-2"
                  style={{ boxShadow: "var(--shadow-primary)" }}
                >
                  <ExternalLink className="w-3.5 h-3.5" />Apply Now
                </Button>
              </a>
            ) : (
              <Button
                className="gradient-bg text-white border-0 h-9 px-4 text-sm font-medium gap-2"
                style={{ boxShadow: "var(--shadow-primary)" }}
                disabled
              >
                <ExternalLink className="w-3.5 h-3.5" />Apply
              </Button>
            )}
            <Button
              variant="outline"
              className={`h-9 px-3 text-sm gap-2 transition-all ${
                isSaved ? "text-primary border-primary/40 bg-primary/5" : ""
              }`}
              onClick={handleToggleSave}
              disabled={savePending}
            >
              {savePending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : isSaved ? (
                <BookmarkCheck className="w-3.5 h-3.5 text-primary" />
              ) : (
                <Bookmark className="w-3.5 h-3.5" />
              )}
              {isSaved ? "Saved" : "Save"}
            </Button>
          </div>
        </div>
      </motion.div>

      {/* ── AI Skills Analysis ────────────────────── */}
      {rec && (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, duration: 0.35 }}
          className="card-base overflow-hidden"
        >
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border">
            <div className="w-6 h-6 rounded-lg gradient-bg flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-white" />
            </div>
            <h2 className="text-sm font-semibold">AI Skills Analysis</h2>
            <span className="ml-auto text-xs text-muted-foreground">
              {rec.matching_skills.length}/{rec.matching_skills.length + rec.missing_skills.length} matched
            </span>
          </div>

          <div className="p-5 space-y-5">
            {rec.matching_skills.length > 0 && (
              <motion.div variants={itemVariants}>
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                    You have {rec.matching_skills.length} of the required skills
                  </p>
                </div>
                <motion.div variants={listVariants} initial="hidden" animate="visible" className="flex flex-wrap gap-2">
                  {rec.matching_skills.map((s) => (
                    <motion.span key={s} variants={itemVariants}
                      className="px-2.5 py-1 rounded-full text-xs font-medium skill-matched">
                      ✓ {s}
                    </motion.span>
                  ))}
                </motion.div>
              </motion.div>
            )}

            {rec.missing_skills.length > 0 && (
              <motion.div variants={itemVariants}>
                <div className="flex items-center gap-2 mb-3">
                  <XCircle className="w-4 h-4 text-red-500" />
                  <p className="text-sm font-semibold text-red-600 dark:text-red-400">
                    {rec.missing_skills.length} skills to develop
                  </p>
                </div>
                <motion.div variants={listVariants} initial="hidden" animate="visible" className="flex flex-wrap gap-2">
                  {rec.missing_skills.map((s) => (
                    <motion.span key={s} variants={itemVariants}
                      className="px-2.5 py-1 rounded-full text-xs font-medium skill-missing opacity-80">
                      {s}
                    </motion.span>
                  ))}
                </motion.div>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}

      {/* ── Required Skills ───────────────────────── */}
      {job.required_skills.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.24, duration: 0.35 }}
          className="card-base overflow-hidden"
        >
          <div className="px-5 py-3.5 border-b border-border">
            <h2 className="text-sm font-semibold">Required Skills ({job.required_skills.length})</h2>
          </div>
          <div className="p-5">
            <div className="flex flex-wrap gap-2">
              {job.required_skills.map((s) => {
                const matched = rec?.matching_skills.includes(s);
                return (
                  <span
                    key={s}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                      matched ? "skill-matched" : "skill-muted"
                    }`}
                  >
                    {matched && "✓ "}{s}
                  </span>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Description ──────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.35 }}
        className="card-base overflow-hidden"
      >
        <div className="px-5 py-3.5 border-b border-border">
          <h2 className="text-sm font-semibold">Job Description</h2>
        </div>
        <div className="p-5">
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
            {job.description}
          </p>
        </div>
      </motion.div>
    </div>
  );
}
