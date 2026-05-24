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
import { Progress } from "@/components/ui/progress";
import { Search, MapPin, Clock, ExternalLink } from "lucide-react";

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

  const scoreColor = (s: number) => s >= 0.7 ? "text-emerald-600" : s >= 0.4 ? "text-amber-600" : "text-red-500";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Job Listings</h1>
        <p className="text-muted-foreground text-sm mt-1">{total} opportunities found</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search jobs, companies…"
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-9 w-36" placeholder="Location"
              value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
          <Button type="submit">Search</Button>
        </form>
        <div className="flex gap-2 flex-wrap">
          {CONTRACT_TYPES.map((ct) => (
            <Button key={ct} size="sm"
              variant={contractType === ct ? "default" : "outline"}
              onClick={() => { setContractType(ct); setPage(1); }}>
              {ct}
            </Button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse"><CardContent className="pt-6 h-40 bg-muted rounded-xl" /></Card>
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">No jobs found. Try a different search.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {jobs.map((job) => {
            const score = scoreMap[job.id];
            return (
              <Link key={job.id} href={`/jobs/${job.id}`} className="block group">
                <Card className="h-full hover:shadow-md transition-shadow border-border group-hover:border-primary/30">
                  <CardContent className="pt-5 pb-5 flex flex-col h-full gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-sm leading-snug group-hover:text-primary transition-colors line-clamp-2">{job.title}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">{job.company}</p>
                      </div>
                      {score !== undefined && (
                        <div className="text-right shrink-0">
                          <p className={`text-xs font-bold ${scoreColor(score)}`}>{Math.round(score * 100)}%</p>
                          <Progress value={score * 100} className="w-12 h-1 mt-1" />
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {job.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.location}</span>}
                      {job.contract_type && <Badge variant="outline" className="text-xs">{job.contract_type}</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 flex-1">{job.description}</p>
                    <div className="flex flex-wrap gap-1 mt-auto">
                      {job.required_skills.slice(0, 3).map((s) => (
                        <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                      ))}
                      {job.required_skills.length > 3 && (
                        <Badge variant="outline" className="text-xs">+{job.required_skills.length - 3}</Badge>
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
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
          <span className="text-sm text-muted-foreground">Page {page} of {pages}</span>
          <Button variant="outline" size="sm" disabled={page === pages} onClick={() => setPage(p => p + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}
