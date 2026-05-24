"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { jobsApi } from "@/lib/api/jobs";
import { recommendationsApi } from "@/lib/api/recommendations";
import type { Job, Recommendation } from "@/types/job";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, MapPin, Building2, Calendar, ExternalLink, CheckCircle2, XCircle } from "lucide-react";

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

  if (loading) return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading…</div>;
  if (!job) return <div className="text-center py-16 text-muted-foreground">Job not found.</div>;

  const score = rec?.score ?? null;
  const scoreColor = score !== null
    ? score >= 0.7 ? "text-emerald-600" : score >= 0.4 ? "text-amber-600" : "text-red-500"
    : "";

  const formatDate = (d?: string) => d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : null;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Button variant="ghost" className="gap-2" onClick={() => router.back()}>
        <ArrowLeft className="w-4 h-4" /> Back
      </Button>

      {/* Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-2xl font-bold leading-tight">{job.title}</h1>
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><Building2 className="w-4 h-4" />{job.company}</span>
                {job.location && <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{job.location}</span>}
                {job.deadline && <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />Deadline: {formatDate(job.deadline)}</span>}
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {job.contract_type && <Badge>{job.contract_type}</Badge>}
                {job.source_name && <Badge variant="outline">{job.source_name}</Badge>}
              </div>
            </div>
            {score !== null && (
              <div className="text-right shrink-0 space-y-1">
                <p className="text-xs text-muted-foreground">AI Match</p>
                <p className={`text-3xl font-bold ${scoreColor}`}>{Math.round(score * 100)}%</p>
                <Progress value={score * 100} className="w-24" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* AI Analysis */}
      {rec && (
        <Card>
          <CardHeader><CardTitle>AI Skills Analysis</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {rec.matching_skills.length > 0 && (
              <div>
                <p className="text-sm font-medium text-emerald-600 flex items-center gap-1 mb-2">
                  <CheckCircle2 className="w-4 h-4" /> Matching skills ({rec.matching_skills.length})
                </p>
                <div className="flex flex-wrap gap-2">
                  {rec.matching_skills.map((s) => (
                    <Badge key={s} variant="success">{s}</Badge>
                  ))}
                </div>
              </div>
            )}
            {rec.missing_skills.length > 0 && (
              <div>
                <p className="text-sm font-medium text-red-500 flex items-center gap-1 mb-2">
                  <XCircle className="w-4 h-4" /> Missing skills ({rec.missing_skills.length})
                </p>
                <div className="flex flex-wrap gap-2">
                  {rec.missing_skills.map((s) => (
                    <Badge key={s} variant="destructive" className="opacity-70">{s}</Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Description */}
      <Card>
        <CardHeader><CardTitle>Job Description</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{job.description}</p>
        </CardContent>
      </Card>

      {/* Required Skills */}
      <Card>
        <CardHeader><CardTitle>Required Skills</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {job.required_skills.map((s) => (
              <Badge key={s} variant={rec?.matching_skills.includes(s) ? "success" : "secondary"}>{s}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        {job.source_url ? (
          <a href={job.source_url} target="_blank" rel="noopener noreferrer">
            <Button className="gap-2"><ExternalLink className="w-4 h-4" />Apply Now</Button>
          </a>
        ) : (
          <Button className="gap-2"><ExternalLink className="w-4 h-4" />Apply Now</Button>
        )}
      </div>
    </div>
  );
}
