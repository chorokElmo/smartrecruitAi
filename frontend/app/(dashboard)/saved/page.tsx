"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { jobsApi } from "@/lib/api/jobs";
import type { Job } from "@/types/job";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonCard } from "@/components/ui/skeleton";
import { listVariants, itemVariants } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import {
  BookmarkCheck, MapPin, Building2, ExternalLink,
  Bookmark, Clock, Trash2, Loader2,
} from "lucide-react";

function SavedJobCard({
  job,
  index,
  onUnsave,
}: {
  job: Job;
  index: number;
  onUnsave: (id: string) => Promise<void>;
}) {
  const [removing, setRemoving] = useState(false);

  const formatDate = (d?: string) =>
    d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : null;

  const deadline        = formatDate(job.deadline);
  const isDeadlineSoon  = job.deadline
    ? (new Date(job.deadline).getTime() - Date.now()) < 7 * 24 * 60 * 60 * 1000
    : false;

  const handleRemove = async () => {
    setRemoving(true);
    await onUnsave(job.id);
    // parent removes the card from list — no need to reset state
  };

  return (
    <motion.div
      variants={itemVariants}
      transition={{ delay: index * 0.05 }}
      layout
      exit={{ opacity: 0, scale: 0.95 }}
    >
      <div className="card-base card-hover overflow-hidden flex flex-col">
        <div className="h-0.5 gradient-bg" />

        <div className="p-4 flex-1 space-y-3">
          {/* Header */}
          <div className="flex items-start gap-3">
            <div
              className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center text-white font-bold text-base shrink-0"
              style={{ boxShadow: "var(--shadow-primary)" }}
            >
              {job.company[0]?.toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <Link href={`/jobs/${job.id}`}>
                <h3 className="text-sm font-semibold text-foreground hover:text-primary transition-colors leading-snug line-clamp-2 cursor-pointer">
                  {job.title}
                </h3>
              </Link>
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1 truncate">
                <Building2 className="w-3 h-3 shrink-0" />{job.company}
              </p>
            </div>
            <BookmarkCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          </div>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
            {job.location && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 shrink-0" />{job.location}
              </span>
            )}
            {job.contract_type && (
              <span className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-medium">
                {job.contract_type}
              </span>
            )}
            {deadline && (
              <span className={`flex items-center gap-1 ${isDeadlineSoon ? "text-amber-600 font-medium" : ""}`}>
                <Clock className="w-3 h-3 shrink-0" />{deadline}
              </span>
            )}
          </div>

          {/* Skills */}
          {job.required_skills.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {job.required_skills.slice(0, 4).map((s) => (
                <span key={s} className="px-2 py-0.5 rounded-full skill-neutral text-[10px] font-medium">
                  {s}
                </span>
              ))}
              {job.required_skills.length > 4 && (
                <span className="px-2 py-0.5 rounded-full skill-muted text-[10px] font-medium">
                  +{job.required_skills.length - 4}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-4 pb-4 flex gap-2 border-t border-border pt-3">
          <Link href={`/jobs/${job.id}`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full h-8 text-xs">
              View Details
            </Button>
          </Link>
          {job.source_url && (
            <a href={job.source_url} target="_blank" rel="noopener noreferrer">
              <Button
                size="sm"
                className="h-8 text-xs gradient-bg text-white border-0 gap-1"
                style={{ boxShadow: "var(--shadow-primary)" }}
              >
                <ExternalLink className="w-3 h-3" />Apply
              </Button>
            </a>
          )}
          {/* Unsave */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs px-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all"
            onClick={handleRemove}
            disabled={removing}
            title="Remove bookmark"
          >
            {removing
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Trash2 className="w-3.5 h-3.5" />
            }
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

export default function SavedJobsPage() {
  const router              = useRouter();
  const [jobs, setJobs]     = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    jobsApi.getSaved()
      .then((r) => setJobs(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleUnsave = async (id: string) => {
    try {
      await jobsApi.unsave(id);
      setJobs((prev) => prev.filter((j) => j.id !== id));
    } catch {
      // ignore — job stays in list
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <h1 className="text-xl font-bold">Saved Jobs</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {jobs.length > 0
            ? <><strong className="text-foreground font-semibold">{jobs.length}</strong> job{jobs.length !== 1 ? "s" : ""} bookmarked</>
            : "Jobs you bookmark will appear here"
          }
        </p>
      </motion.div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : jobs.length === 0 ? (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="card-base">
          <EmptyState
            icon={Bookmark}
            title="No saved jobs yet"
            description="Browse jobs and click Save on any listing to bookmark it here for later."
            action={{ label: "Browse Jobs", onClick: () => router.push("/jobs") }}
          />
        </motion.div>
      ) : (
        <motion.div
          variants={listVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
          layout
        >
          <AnimatePresence>
            {jobs.map((job, i) => (
              <SavedJobCard key={job.id} job={job} index={i} onUnsave={handleUnsave} />
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
