"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { jobsApi } from "@/lib/api/jobs";
import { recommendationsApi } from "@/lib/api/recommendations";
import type { Job, Recommendation } from "@/types/job";
import { ScoreRingLarge } from "@/components/ui/score-ring";
import { listVariants, itemVariants } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, MapPin, Building2,
  ExternalLink, CheckCircle2, XCircle, Loader2,
  Sparkles, Bookmark, BookmarkCheck, Clock,
  FileText, Copy, Download, X, Send,
} from "lucide-react";

// ── Cover Letter Modal ────────────────────────────────────────────────────────

function CoverLetterModal({
  jobId,
  jobTitle,
  company,
  onClose,
}: {
  jobId: string;
  jobTitle: string;
  company: string;
  onClose: () => void;
}) {
  const [letter, setLetter]     = useState<string>("");
  const [loading, setLoading]   = useState(true);
  const [copied, setCopied]     = useState(false);
  const [error, setError]       = useState<string>("");

  useEffect(() => {
    jobsApi
      .coverLetter(jobId)
      .then((r) => setLetter(r.data.cover_letter))
      .catch((e: unknown) => {
        const msg =
          (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
          "Failed to generate cover letter.";
        setError(msg);
      })
      .finally(() => setLoading(false));
  }, [jobId]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(letter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownload = () => {
    const blob = new Blob([letter], { type: "text/plain;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `lettre-motivation-${company.replace(/\s+/g, "-").toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.25 }}
        className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold">Lettre de motivation</p>
              <p className="text-xs text-muted-foreground truncate max-w-xs">
                {jobTitle} — {company}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">
                Generating your personalised cover letter…
              </p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <XCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          ) : (
            <pre className="text-sm text-foreground leading-relaxed whitespace-pre-wrap font-sans bg-muted/30 rounded-xl p-4 border border-border">
              {letter}
            </pre>
          )}
        </div>

        {/* Footer actions */}
        {!loading && !error && (
          <div className="flex items-center gap-2 px-5 py-4 border-t border-border shrink-0">
            <Button
              variant="outline"
              className="gap-2 h-9 text-sm"
              onClick={handleCopy}
            >
              {copied ? (
                <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />Copied!</>
              ) : (
                <><Copy className="w-3.5 h-3.5" />Copy</>
              )}
            </Button>
            <Button
              variant="outline"
              className="gap-2 h-9 text-sm"
              onClick={handleDownload}
            >
              <Download className="w-3.5 h-3.5" />Download .txt
            </Button>
            <Button
              className="ml-auto gradient-bg text-white border-0 h-9 text-sm gap-2"
              style={{ boxShadow: "var(--shadow-primary)" }}
              onClick={onClose}
            >
              Done
            </Button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}


// ── Skeleton ──────────────────────────────────────────────────────────────────

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


// ── Main page ─────────────────────────────────────────────────────────────────

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [job, setJob]               = useState<Job | null>(null);
  const [rec, setRec]               = useState<Recommendation | null>(null);
  const [loading, setLoading]       = useState(true);
  const [isSaved, setIsSaved]       = useState(false);
  const [savePending, setSavePending]     = useState(false);
  const [isApplied, setIsApplied]         = useState(false);
  const [applyPending, setApplyPending]   = useState(false);
  const [showCoverLetter, setShowCoverLetter] = useState(false);

  useEffect(() => {
    Promise.all([
      jobsApi.getById(id).then((r) => setJob(r.data)),
      recommendationsApi.getAll()
        .then((r) => setRec(r.data.find((x: Recommendation) => x.job.id === id) ?? null))
        .catch(() => {}),
      jobsApi.getSaved()
        .then((r) => setIsSaved(r.data.some((j: Job) => j.id === id)))
        .catch(() => {}),
      jobsApi.getApplied()
        .then((r) => setIsApplied((r.data as string[]).includes(id)))
        .catch(() => {}),
    ]).finally(() => setLoading(false));
  }, [id]);

  const handleToggleSave = async () => {
    setSavePending(true);
    try {
      if (isSaved) { await jobsApi.unsave(id); setIsSaved(false); }
      else         { await jobsApi.save(id);   setIsSaved(true);  }
    } catch { /* ignore */ } finally { setSavePending(false); }
  };

  const handleToggleApply = async () => {
    setApplyPending(true);
    try {
      if (isApplied) { await jobsApi.unmarkApplied(id); setIsApplied(false); }
      else           { await jobsApi.markApplied(id);   setIsApplied(true);  }
    } catch { /* ignore */ } finally { setApplyPending(false); }
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

  const deadline       = formatDate(job.deadline);
  const isDeadlineSoon = job.deadline
    ? (new Date(job.deadline).getTime() - Date.now()) < 7 * 24 * 60 * 60 * 1000
    : false;

  return (
    <>
      {/* Cover letter modal */}
      <AnimatePresence>
        {showCoverLetter && (
          <CoverLetterModal
            jobId={id}
            jobTitle={job.title}
            company={job.company}
            onClose={() => setShowCoverLetter(false)}
          />
        )}
      </AnimatePresence>

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

              {/* Score ring */}
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
            <div className="flex flex-wrap items-center gap-2">
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

              {/* Cover letter button */}
              <Button
                variant="outline"
                className="h-9 px-3 text-sm gap-2"
                onClick={() => setShowCoverLetter(true)}
              >
                <FileText className="w-3.5 h-3.5" />Cover Letter
              </Button>

              {/* Mark as Applied */}
              <Button
                variant="outline"
                className={`h-9 px-3 text-sm gap-2 transition-all ${
                  isApplied
                    ? "text-emerald-600 border-emerald-400/40 bg-emerald-500/5"
                    : ""
                }`}
                onClick={handleToggleApply}
                disabled={applyPending}
              >
                {applyPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : isApplied ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                {isApplied ? "Applied ✓" : "Mark Applied"}
              </Button>

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

        {/* ── Score breakdown (Part 7) ───────────────── */}
        {rec && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12, duration: 0.35 }}
            className="card-base overflow-hidden"
          >
            <div className="px-5 py-3.5 border-b border-border">
              <h2 className="text-sm font-semibold">Match Breakdown</h2>
            </div>
            <div className="px-5 py-4 grid grid-cols-3 gap-4">
              {[
                { label: "Skills",      value: rec.skill_score      ?? rec.score, color: "text-primary" },
                { label: "Title fit",   value: rec.title_score      ?? 0,         color: "text-violet-500" },
                { label: "Experience",  value: rec.experience_score ?? 0.5,       color: "text-amber-500" },
              ].map(({ label, value, color }) => (
                <div key={label} className="text-center">
                  <p className={`text-2xl font-bold ${color}`}>{Math.round(value * 100)}%</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

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
    </>
  );
}
