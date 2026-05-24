"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { recommendationsApi } from "@/lib/api/recommendations";
import { jobsApi } from "@/lib/api/jobs";
import { useAuthStore } from "@/lib/store/authStore";
import type { Recommendation } from "@/types/job";
import type { Job } from "@/types/job";
import { Briefcase, Star, BookmarkCheck, Brain, ArrowRight, RefreshCw } from "lucide-react";

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      recommendationsApi.getAll().then((r) => setRecs(r.data)),
      jobsApi.list({ size: 5 }).then((r) => setRecentJobs(r.data.items)),
    ]).finally(() => setLoading(false));
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const { data } = await recommendationsApi.generate();
      setRecs(data);
    } catch (e: any) {
      alert(e.response?.data?.detail ?? "Add skills to your profile first.");
    } finally {
      setGenerating(false);
    }
  };

  const scoreColor = (score: number) =>
    score >= 0.7 ? "text-emerald-600" : score >= 0.4 ? "text-amber-600" : "text-red-500";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Your personalized job intelligence hub
          </p>
        </div>
        <Button onClick={handleGenerate} disabled={generating} className="gap-2">
          <RefreshCw className={`w-4 h-4 ${generating ? "animate-spin" : ""}`} />
          {generating ? "Generating…" : "Run AI Matching"}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: Brain,         label: "AI Matches",   value: recs.length,           color: "text-primary" },
          { icon: Briefcase,     label: "Skills",       value: user?.skills?.length ?? 0, color: "text-emerald-600" },
          { icon: BookmarkCheck, label: "Profile",      value: user?.diploma ? "Complete" : "Incomplete", color: "text-amber-600" },
        ].map(({ icon: Icon, label, value, color }) => (
          <Card key={label}>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-sm text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Recommendations */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Star className="w-4 h-4 text-primary" /> Top Recommendations
            </CardTitle>
            <Link href="/jobs"><Button variant="ghost" size="sm" className="gap-1">View all <ArrowRight className="w-3 h-3" /></Button></Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : recs.length === 0 ? (
              <div className="text-center py-6 space-y-3">
                <p className="text-sm text-muted-foreground">No recommendations yet.</p>
                <Button size="sm" onClick={handleGenerate} disabled={generating}>Run AI Matching</Button>
              </div>
            ) : (
              recs.slice(0, 4).map((rec) => (
                <Link key={rec.id} href={`/jobs/${rec.job.id}`} className="block group">
                  <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate group-hover:text-primary transition-colors">{rec.job.title}</p>
                      <p className="text-xs text-muted-foreground">{rec.job.company} · {rec.job.location}</p>
                    </div>
                    <div className="text-right ml-4 shrink-0">
                      <p className={`text-sm font-bold ${scoreColor(rec.score)}`}>{Math.round(rec.score * 100)}%</p>
                      <Progress value={rec.score * 100} className="w-16 h-1.5 mt-1" />
                    </div>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        {/* Recent Jobs */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-primary" /> Recent Listings
            </CardTitle>
            <Link href="/jobs"><Button variant="ghost" size="sm" className="gap-1">Browse all <ArrowRight className="w-3 h-3" /></Button></Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentJobs.map((job) => (
              <Link key={job.id} href={`/jobs/${job.id}`} className="block group">
                <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate group-hover:text-primary transition-colors">{job.title}</p>
                    <p className="text-xs text-muted-foreground">{job.company} · {job.location}</p>
                  </div>
                  {job.contract_type && (
                    <Badge variant="secondary" className="ml-4 shrink-0 text-xs">{job.contract_type}</Badge>
                  )}
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Skills */}
      {(user?.skills?.length ?? 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Your Skills ({user!.skills.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {user!.skills.map((skill) => (
                <Badge key={skill} variant="secondary">{skill}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
