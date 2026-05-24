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
import type { Recommendation, Job } from "@/types/job";
import { Briefcase, Star, Brain, ArrowRight, RefreshCw, Sparkles, TrendingUp, BookmarkCheck } from "lucide-react";

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

  const scoreColor = (s: number) =>
    s >= 0.7 ? "text-emerald-500" : s >= 0.4 ? "text-amber-500" : "text-red-400";

  const scoreBarColor = (s: number) =>
    s >= 0.7 ? "bg-emerald-500" : s >= 0.4 ? "bg-amber-500" : "bg-red-400";

  const statCards = [
    {
      icon: Brain, label: "AI Matches", value: recs.length,
      gradient: "from-indigo-500 to-violet-500", light: "bg-indigo-50 dark:bg-indigo-950/30",
      text: "text-indigo-600 dark:text-indigo-400",
    },
    {
      icon: Sparkles, label: "My Skills", value: user?.skills?.length ?? 0,
      gradient: "from-emerald-500 to-teal-500", light: "bg-emerald-50 dark:bg-emerald-950/30",
      text: "text-emerald-600 dark:text-emerald-400",
    },
    {
      icon: TrendingUp, label: "Top Score", value: recs[0] ? `${Math.round(recs[0].score * 100)}%` : "—",
      gradient: "from-amber-500 to-orange-500", light: "bg-amber-50 dark:bg-amber-950/30",
      text: "text-amber-600 dark:text-amber-400",
    },
  ];

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Your personalized AI recruitment hub</p>
        </div>
        <Button
          onClick={handleGenerate} disabled={generating}
          className="gradient-bg text-white border-0 shadow-md shadow-indigo-500/25 gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${generating ? "animate-spin" : ""}`} />
          {generating ? "Generating…" : "Run AI Matching"}
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statCards.map(({ icon: Icon, label, value, gradient, light, text }) => (
          <Card key={label} className={`border-0 ${light} card-glow`}>
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-md`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <span className={`text-3xl font-extrabold ${text}`}>{value}</span>
              </div>
              <p className="text-sm font-medium text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Recommendations */}
        <Card className="card-glow">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center">
                <Star className="w-3.5 h-3.5 text-white" />
              </div>
              Top Recommendations
            </CardTitle>
            <Link href="/jobs">
              <Button variant="ghost" size="sm" className="gap-1 text-xs h-7 px-2">
                View all <ArrowRight className="w-3 h-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />
                ))}
              </div>
            ) : recs.length === 0 ? (
              <div className="text-center py-10 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto">
                  <Brain className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">No recommendations yet</p>
                <Button size="sm" onClick={handleGenerate} disabled={generating}
                  className="gradient-bg text-white border-0">
                  Run AI Matching
                </Button>
              </div>
            ) : (
              recs.slice(0, 4).map((rec) => (
                <Link key={rec.id} href={`/jobs/${rec.job.id}`} className="block group">
                  <div className="flex items-center justify-between p-3 rounded-xl border border-border/60 hover:border-indigo-300 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 transition-all duration-150">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate group-hover:text-primary transition-colors">{rec.job.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{rec.job.company} · {rec.job.location}</p>
                    </div>
                    <div className="text-right ml-4 shrink-0">
                      <p className={`text-sm font-bold ${scoreColor(rec.score)}`}>{Math.round(rec.score * 100)}%</p>
                      <div className="w-16 h-1.5 bg-muted rounded-full mt-1 overflow-hidden">
                        <div className={`h-full rounded-full ${scoreBarColor(rec.score)}`} style={{ width: `${rec.score * 100}%` }} />
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        {/* Recent Jobs */}
        <Card className="card-glow">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                <Briefcase className="w-3.5 h-3.5 text-white" />
              </div>
              Recent Listings
            </CardTitle>
            <Link href="/jobs">
              <Button variant="ghost" size="sm" className="gap-1 text-xs h-7 px-2">
                Browse all <ArrowRight className="w-3 h-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentJobs.map((job) => (
              <Link key={job.id} href={`/jobs/${job.id}`} className="block group">
                <div className="flex items-center justify-between p-3 rounded-xl border border-border/60 hover:border-emerald-300 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition-all duration-150">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate group-hover:text-emerald-600 transition-colors">{job.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{job.company} · {job.location}</p>
                  </div>
                  {job.contract_type && (
                    <Badge variant="secondary" className="ml-3 shrink-0 text-xs">{job.contract_type}</Badge>
                  )}
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Skills Cloud */}
      {(user?.skills?.length ?? 0) > 0 && (
        <Card className="card-glow">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              Your Skills ({user!.skills.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {user!.skills.map((skill) => (
                <span key={skill}
                  className="px-3 py-1 rounded-full text-xs font-medium bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  {skill}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
