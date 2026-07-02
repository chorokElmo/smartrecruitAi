"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { jobsApi } from "@/lib/api/jobs";
import { Bookmark, Building2, MapPin, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Job {
  id: string;
  title: string;
  company: string;
  location?: string;
  contract_type?: string;
  sector?: string;
}

export default function SavedJobsPage() {
  const [jobs, setJobs]     = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    jobsApi.getSaved()
      .then((r) => setJobs(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const unsave = async (id: string) => {
    setJobs((prev) => prev.filter((j) => j.id !== id));
    await jobsApi.unsave(id).catch(() => {});
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-xl font-bold">Offres sauvegardées</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {jobs.length} offre{jobs.length !== 1 ? "s" : ""} sauvegardée{jobs.length !== 1 ? "s" : ""}
        </p>
      </motion.div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : jobs.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card-base py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <Bookmark className="w-7 h-7 text-muted-foreground/40" />
          </div>
          <p className="font-semibold text-foreground">Aucune offre sauvegardée</p>
          <p className="text-sm text-muted-foreground mt-1">
            Sauvegardez des offres depuis la page{" "}
            <Link href="/jobs" className="text-primary hover:underline">Jobs</Link>.
          </p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job, i) => (
            <motion.div
              key={job.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="card-base p-4 flex flex-col sm:flex-row sm:items-center gap-3 hover:border-border/80 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center text-white text-sm font-bold shrink-0">
                {job.company[0]?.toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <Link href={`/jobs/${job.id}`}>
                  <h3 className="text-sm font-semibold hover:text-primary transition-colors truncate">{job.title}</h3>
                </Link>
                <p className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{job.company}</span>
                  {job.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.location}</span>}
                  {job.contract_type && <span className="bg-muted px-1.5 py-0.5 rounded text-[10px]">{job.contract_type}</span>}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link href={`/jobs/${job.id}`}>
                  <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                    <ExternalLink className="w-3 h-3" />Voir
                  </Button>
                </Link>
                <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground hover:text-destructive" onClick={() => unsave(job.id)}>
                  Retirer
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
