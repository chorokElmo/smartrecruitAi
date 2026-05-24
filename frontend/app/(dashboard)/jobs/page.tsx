"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { jobsApi } from "@/lib/api/jobs";
import { recommendationsApi } from "@/lib/api/recommendations";
import type { Job, Recommendation } from "@/types/job";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, MapPin, Building2, ChevronLeft, ChevronRight } from "lucide-react";

const CONTRACT_TYPES = ["All", "CDI", "CDD", "Stage", "Freelance"];

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("");
  const [contractType, setContractType] = useState("All");
  const [loading, setLoading] = useState(true);

  const scoreMap = Object.fromEntries(recs.map((r) => [r.job.id, r.score]));

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, size: 12 };
      if (search) params.search = search;
      if (location) params.location = location;
      if (contractType !== "All") params.contract_type = contractType;
      const { data } = await jobsApi.list(params);
      setJobs(data.items);
      setTotal(data.total);
      setPages(data.pages);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchJobs(); }, [page, contractType]);
  useEffect(() => { recommendationsApi.getAll().then((r) => setRecs(r.data)).catch(() => {}); }, []);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setPage(1); fetchJobs(); };

  const scoreColor = (s: number) =>
    s >= 0.7 ? "text-emerald-600 dark:text-emerald-400" :
    s >= 0.4 ? "text-amber-600 dark:text-amber-400" : "text-red-500";

  const scoreRingColor = (s: number) =>
    s >= 0.7 ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30" :
    s >= 0.4 ? "border-amber-400 bg-amber-50 dark:bg-amber-950/30" :
    "border-red-400 bg-red-50 dark:bg-red-950/30";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Job Listings</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {total > 0 ? <><strong className="text-foreground">{total}</strong> opportunities found</> : "Browse all opportunities"}
        </p>
      </div>

      {/* Filters */}
      <Card className="card-glow">
        <CardContent className="pt-4 pb-4 space-y-3">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input className="pl-10 h-10" placeholder="Search jobs, companies, skills…"
                value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="relative w-full sm:w-40">
              <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input className="pl-10 h-10" placeholder="Location"
                value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>
            <Button type="submit" className="gradient-bg text-white border-0 h-10 shadow-md shadow-indigo-500/20">
              Search
            </Button>
          </form>

          <div className="flex gap-2 flex-wrap">
            {CONTRACT_TYPES.map((ct) => (
              <button key={ct}
                onClick={() => { setContractType(ct); setPage(1); }}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all duration-150 ${
                  contractType === ct
                    ? "gradient-bg text-white border-transparent shadow-md shadow-indigo-500/20"
                    : "border-border text-muted-foreground hover:border-indigo-300 hover:text-indigo-600"
                }`}>
                {ct}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-5 space-y-3">
                <div className="h-4 bg-muted rounded-full w-3/4" />
                <div className="h-3 bg-muted rounded-full w-1/2" />
                <div className="h-3 bg-muted rounded-full w-full" />
                <div className="flex gap-2 mt-2">
                  <div className="h-5 w-12 bg-muted rounded-full" />
                  <div className="h-5 w-16 bg-muted rounded-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="font-semibold text-lg">No jobs found</p>
          <p className="text-muted-foreground text-sm mt-1">Try a different search term or location</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {jobs.map((job) => {
            const score = scoreMap[job.id];
            return (
              <Link key={job.id} href={`/jobs/${job.id}`} className="block group">
                <Card className="h-full transition-all duration-200 card-glow group-hover:border-indigo-300 group-hover:-translate-y-0.5">
                  <CardContent className="pt-5 pb-5 flex flex-col h-full gap-3">
                    {/* Top row */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-sm leading-snug group-hover:text-primary transition-colors line-clamp-2">
                          {job.title}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <Building2 className="w-3 h-3" />{job.company}
                        </p>
                      </div>
                      {score !== undefined && (
                        <div className={`shrink-0 min-w-[46px] text-center px-2 py-1 rounded-lg border ${scoreRingColor(score)}`}>
                          <p className={`text-xs font-bold ${scoreColor(score)}`}>{Math.round(score * 100)}%</p>
                          <p className="text-[9px] text-muted-foreground">match</p>
                        </div>
                      )}
                    </div>

                    {/* Meta */}
                    <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                      {job.location && (
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.location}</span>
                      )}
                      {job.contract_type && (
                        <Badge variant="outline" className="text-[10px] h-5 px-2">{job.contract_type}</Badge>
                      )}
                    </div>

                    {/* Description */}
                    <p className="text-xs text-muted-foreground line-clamp-2 flex-1">{job.description}</p>

                    {/* Skills */}
                    <div className="flex flex-wrap gap-1.5 mt-auto pt-1 border-t border-border/50">
                      {job.required_skills.slice(0, 3).map((s) => (
                        <span key={s} className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[10px] font-medium">
                          {s}
                        </span>
                      ))}
                      {job.required_skills.length > 3 && (
                        <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] font-medium">
                          +{job.required_skills.length - 3}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 1}
            onClick={() => setPage(p => p - 1)} className="gap-1">
            <ChevronLeft className="w-3 h-3" />Previous
          </Button>
          <span className="text-sm text-muted-foreground px-2">
            <strong>{page}</strong> / {pages}
          </span>
          <Button variant="outline" size="sm" disabled={page === pages}
            onClick={() => setPage(p => p + 1)} className="gap-1">
            Next<ChevronRight className="w-3 h-3" />
          </Button>
        </div>
      )}
    </div>
  );
}
