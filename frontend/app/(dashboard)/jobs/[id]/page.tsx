"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { jobsApi } from "@/lib/api/jobs";
import { recommendationsApi } from "@/lib/api/recommendations";
import type { Job, Recommendation } from "@/types/job";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft, MapPin, Building2, Calendar, ExternalLink,
  CheckCircle2, XCircle, Loader2, Sparkles,
} from "lucide-react";

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(null);
  const [rec, setRec] = useState<Recommendation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      jobsApi.getById(id).then((r) => setJob(r.data)),
      recommendationsApi.getAll()
        .then((r) => setRec(r.data.find((x: Recommendation) => x.job.id === id) ?? null))
        .catch(() => {}),
    ]).finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="flex items-center justify-center h-64 gap-3 text-muted-foreground">
      <Loader2 className="w-5 h-5 animate-spin" /><span>Loading job details…</span>
    </div>
  );
  if (!job) return (
    <div className="text-center py-20 text-muted-foreground">
      <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
      <p className="font-semibold">Job not found</p>
    </div>
  );

  const score = rec?.score ?? null;
  const scoreGradient = score !== null
    ? score >= 0.7 ? "from-emerald-500 to-teal-500"
    : score >= 0.4 ? "from-amber-500 to-orange-500"
    : "from-red-500 to-rose-500"
    : "from-gray-400 to-gray-500";

  const scoreLabel = score !== null
    ? score >= 0.7 ? "Great match!" : score >= 0.4 ? "Decent match" : "Weak match"
    : "";

  const formatDate = (d?: string) =>
    d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : null;

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <Button variant="ghost" className="gap-2 -ml-2 text-muted-foreground" onClick={() => router.back()}>
        <ArrowLeft className="w-4 h-4" /> Back to Jobs
      </Button>

      {/* Header Card */}
      <Card className="card-glow overflow-hidden">
        {/* Gradient top bar */}
        <div className={`h-1.5 w-full bg-gradient-to-r ${score !== null ? scoreGradient : "from-indigo-500 to-violet-500"}`} />
        <CardContent className="pt-6 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            {/* Company logo placeholder */}
            <div className="w-14 h-14 rounded-2xl gradient-bg flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/20 text-white font-bold text-xl">
              {job.company[0]}
            </div>

            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-extrabold leading-tight">{job.title}</h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" />{job.company}</span>
                {job.location && <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{job.location}</span>}
                {job.deadline && <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />Deadline: {formatDate(job.deadline)}</span>}
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {job.contract_type && <Badge className="gradient-bg text-white border-0 text-xs">{job.contract_type}</Badge>}
                {job.source_name && <Badge variant="outline" className="text-xs">{job.source_name}</Badge>}
              </div>
            </div>

            {/* AI Score badge */}
            {score !== null && (
              <div className={`shrink-0 text-center p-4 rounded-2xl bg-gradient-to-br ${scoreGradient} text-white shadow-lg`}>
                <p className="text-3xl font-extrabold leading-none">{Math.round(score * 100)}%</p>
                <p className="text-xs text-white/80 mt-1 font-medium">{scoreLabel}</p>
                <p className="text-[10px] text-white/60 mt-0.5">AI Match</p>
              </div>
            )}
          </div>

          <Separator className="my-5" />

          <div className="flex gap-3">
            {job.source_url ? (
              <a href={job.source_url} target="_blank" rel="noopener noreferrer">
                <Button className="gradient-bg text-white border-0 shadow-md shadow-indigo-500/25 gap-2">
                  <ExternalLink className="w-4 h-4" /> Apply Now
                </Button>
              </a>
            ) : (
              <Button className="gradient-bg text-white border-0 shadow-md shadow-indigo-500/25 gap-2">
                <ExternalLink className="w-4 h-4" /> Apply Now
              </Button>
            )}
            <Button variant="outline">Save Job</Button>
          </div>
        </CardContent>
      </Card>

      {/* AI Skills Analysis */}
      {rec && (
        <Card className="card-glow">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              AI Skills Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {rec.matching_skills.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 mb-3">
                  <CheckCircle2 className="w-4 h-4" />
                  You have {rec.matching_skills.length} matching skill{rec.matching_skills.length !== 1 ? "s" : ""}
                </p>
                <div className="flex flex-wrap gap-2">
                  {rec.matching_skills.map((s) => (
                    <span key={s} className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {rec.missing_skills.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-red-500 flex items-center gap-1.5 mb-3">
                  <XCircle className="w-4 h-4" />
                  {rec.missing_skills.length} skill{rec.missing_skills.length !== 1 ? "s" : ""} to develop
                </p>
                <div className="flex flex-wrap gap-2">
                  {rec.missing_skills.map((s) => (
                    <span key={s} className="px-3 py-1 rounded-full text-xs font-medium bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 opacity-80">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Description */}
      <Card className="card-glow">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Job Description</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{job.description}</p>
        </CardContent>
      </Card>

      {/* Required Skills */}
      <Card className="card-glow">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Required Skills ({job.required_skills.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {job.required_skills.map((s) => {
              const matched = rec?.matching_skills.includes(s);
              return (
                <span key={s} className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  matched
                    ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                    : "bg-muted text-muted-foreground border-border"
                }`}>
                  {matched && <span className="mr-1">✓</span>}{s}
                </span>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
