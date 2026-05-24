"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { jobsApi } from "@/lib/api/jobs";
import type { Job } from "@/types/job";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookmarkCheck, MapPin, Building2, ExternalLink, Loader2, Bookmark } from "lucide-react";

export default function SavedJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    jobsApi.getSaved()
      .then((r) => setJobs(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Saved Jobs</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {jobs.length > 0
            ? <><strong className="text-foreground">{jobs.length}</strong> job{jobs.length !== 1 ? "s" : ""} saved</>
            : "Jobs you bookmark will appear here"}
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 gap-3 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading saved jobs…</span>
        </div>
      ) : jobs.length === 0 ? (
        <Card className="card-glow">
          <CardContent className="py-16 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto">
              <Bookmark className="w-8 h-8 text-muted-foreground/40" />
            </div>
            <div>
              <p className="font-semibold text-lg">No saved jobs yet</p>
              <p className="text-muted-foreground text-sm mt-1">
                Browse jobs and click &quot;Save Job&quot; on any listing to bookmark it here.
              </p>
            </div>
            <Link href="/jobs">
              <Button className="gradient-bg text-white border-0 shadow-md shadow-indigo-500/25 mt-2">
                Browse Jobs
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {jobs.map((job) => (
            <Card key={job.id} className="card-glow group hover:border-indigo-300 transition-all duration-150">
              <CardContent className="pt-5 pb-5 space-y-3">
                {/* Header */}
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center text-white font-bold shrink-0 shadow-md shadow-indigo-500/20">
                    {job.company[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link href={`/jobs/${job.id}`}>
                      <h3 className="font-semibold text-sm leading-snug hover:text-primary transition-colors line-clamp-2">
                        {job.title}
                      </h3>
                    </Link>
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      <Building2 className="w-3 h-3" />{job.company}
                    </p>
                  </div>
                  <BookmarkCheck className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                </div>

                {/* Meta */}
                <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                  {job.location && (
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.location}</span>
                  )}
                  {job.contract_type && (
                    <Badge variant="outline" className="text-[10px] h-5">{job.contract_type}</Badge>
                  )}
                </div>

                {/* Skills */}
                <div className="flex flex-wrap gap-1.5">
                  {job.required_skills.slice(0, 4).map((s) => (
                    <span key={s} className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[10px] font-medium">
                      {s}
                    </span>
                  ))}
                  {job.required_skills.length > 4 && (
                    <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] font-medium">
                      +{job.required_skills.length - 4}
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-1 border-t border-border/50">
                  <Link href={`/jobs/${job.id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full h-8 text-xs">View Details</Button>
                  </Link>
                  {job.source_url && (
                    <a href={job.source_url} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" className="h-8 text-xs gradient-bg text-white border-0 gap-1">
                        <ExternalLink className="w-3 h-3" />Apply
                      </Button>
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
