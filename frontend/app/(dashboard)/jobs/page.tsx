"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { jobsApi } from "@/lib/api/jobs";
import { recommendationsApi } from "@/lib/api/recommendations";
import type { Job, Recommendation } from "@/types/job";
import { ScoreRing } from "@/components/ui/score-ring";
import { SkeletonCard } from "@/components/ui/skeleton";
import { listVariants, itemVariants } from "@/components/ui/page-wrapper";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, MapPin, Building2, ChevronLeft, ChevronRight, Filter, Globe, Lock } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const CONTRACT_TYPES = ["All", "CDI", "CDD", "Stage", "Freelance"];
const SECTORS = [
  { value: "all",     label: "All sectors" },
  { value: "private", label: "Privé",  icon: Globe },
  { value: "public",  label: "Public", icon: Lock  },
];

function JobCard({ job, score, index }: { job: Job; score?: number; index: number }) {
  return (
    <motion.div variants={itemVariants} transition={{ delay: index * 0.04 }}>
      <Link href={`/jobs/${job.id}`} className="block group h-full">
        <div className="card-base card-hover h-full flex flex-col p-4 gap-3">

          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className="w-9 h-9 rounded-xl gradient-bg flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-sm">
                {job.company[0]?.toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors leading-snug line-clamp-2">
                  {job.title}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1 truncate">
                  <Building2 className="w-3 h-3 shrink-0" />{job.company}
                </p>
              </div>
            </div>
            {score !== undefined && <ScoreRing score={score} size={42} strokeWidth={3.5} />}
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
            {job.sector === "public" && (
              <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-violet-500/10 text-violet-600 dark:text-violet-400">
                <Lock className="w-2.5 h-2.5" />Public
              </span>
            )}
            {job.source_name && (
              <span className="text-[10px] opacity-60">{job.source_name}</span>
            )}
          </div>

          {/* Description */}
          <p className="text-xs text-muted-foreground line-clamp-2 flex-1 leading-relaxed">
            {job.description}
          </p>

          {/* Skills */}
          {job.required_skills.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border/60 mt-auto">
              {job.required_skills.slice(0, 3).map((s) => (
                <span key={s} className="px-2 py-0.5 rounded-full skill-neutral text-[10px] font-medium">
                  {s}
                </span>
              ))}
              {job.required_skills.length > 3 && (
                <span className="px-2 py-0.5 rounded-full skill-muted text-[10px] font-medium">
                  +{job.required_skills.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  );
}

export default function JobsPage() {
  const [jobs, setJobs]             = useState<Job[]>([]);
  const [recs, setRecs]             = useState<Recommendation[]>([]);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const [pages, setPages]           = useState(1);
  const [search, setSearch]         = useState("");
  const [location, setLocation]     = useState("");
  const [contractType, setContractType] = useState("All");
  const [sector, setSector]         = useState("all");
  const [loading, setLoading]       = useState(true);

  const scoreMap = Object.fromEntries(recs.map((r) => [r.job.id, r.score]));

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, size: 12 };
      if (search)              params.search        = search;
      if (location)            params.location      = location;
      if (contractType !== "All") params.contract_type = contractType;
      if (sector !== "all")    params.sector        = sector;

      const { data } = await jobsApi.list(params);
      setJobs(data.items);
      setTotal(data.total);
      setPages(data.pages ?? Math.ceil(data.total / 12));
    } finally {
      setLoading(false);
    }
  }, [page, contractType, sector, search, location]);

  useEffect(() => { fetchJobs(); }, [page, contractType, sector]);
  useEffect(() => {
    recommendationsApi.getAll().then((r) => setRecs(r.data)).catch(() => {});
  }, []);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setPage(1); fetchJobs(); };
  const changeSector = (v: string) => { setSector(v); setPage(1); };

  /* Smart pagination: show up to 5 pages around current */
  const pageNumbers = (() => {
    if (pages <= 5) return Array.from({ length: pages }, (_, i) => i + 1);
    const start = Math.max(1, Math.min(page - 2, pages - 4));
    return Array.from({ length: 5 }, (_, i) => start + i);
  })();

  return (
    <div className="max-w-6xl mx-auto space-y-5">

      {/* ── Header ───────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <h1 className="text-xl font-bold">Browse Jobs</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {total > 0
            ? <><strong className="text-foreground font-semibold">{total}</strong> opportunities found</>
            : "Find your next opportunity"
          }
        </p>
      </motion.div>

      {/* ── Filters ──────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, duration: 0.3 }}
        className="card-base p-3 space-y-3"
      >
        {/* Search row */}
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <Input
              className="pl-9 h-9 text-sm"
              placeholder="Search jobs, companies, skills…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="relative w-full sm:w-36">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <Input
              className="pl-9 h-9 text-sm"
              placeholder="Location…"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
          <Button
            type="submit"
            className="gradient-bg text-white border-0 h-9 px-4 text-sm font-medium shrink-0 gap-1.5"
            style={{ boxShadow: "var(--shadow-primary)" }}
          >
            <Filter className="w-3.5 h-3.5" />Search
          </Button>
        </form>

        {/* Contract type pills */}
        <div className="flex gap-1.5 flex-wrap">
          {CONTRACT_TYPES.map((ct) => (
            <button
              key={ct}
              onClick={() => { setContractType(ct); setPage(1); }}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium border transition-all duration-150",
                contractType === ct
                  ? "gradient-bg text-white border-transparent"
                  : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground bg-background"
              )}
            >
              {ct}
            </button>
          ))}

          {/* Sector divider */}
          <span className="text-border text-xs px-1 self-center">|</span>

          {/* Sector pills */}
          {SECTORS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => changeSector(value)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium border transition-all duration-150 flex items-center gap-1",
                sector === value
                  ? value === "public"
                    ? "bg-violet-600 text-white border-transparent"
                    : "gradient-bg text-white border-transparent"
                  : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground bg-background"
              )}
            >
              {Icon && <Icon className="w-2.5 h-2.5" />}
              {label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* ── Job grid ─────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : jobs.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card-base py-20 text-center">
          <Search className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="font-semibold text-foreground">No jobs found</p>
          <p className="text-sm text-muted-foreground mt-1">Try different keywords or remove filters</p>
        </motion.div>
      ) : (
        <motion.div
          variants={listVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
        >
          {jobs.map((job, i) => (
            <JobCard key={job.id} job={job} score={scoreMap[job.id]} index={i} />
          ))}
        </motion.div>
      )}

      {/* ── Pagination ───────────────────────────── */}
      {pages > 1 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex items-center justify-center gap-2"
        >
          <Button
            variant="outline" size="sm"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="h-8 px-3 text-xs gap-1"
          >
            <ChevronLeft className="w-3.5 h-3.5" />Previous
          </Button>

          <div className="flex items-center gap-1">
            {page > 3 && pages > 5 && (
              <>
                <button onClick={() => setPage(1)} className="w-8 h-8 rounded-lg text-xs font-medium hover:bg-muted text-muted-foreground">1</button>
                <span className="text-muted-foreground text-xs px-1">…</span>
              </>
            )}
            {pageNumbers.map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={cn(
                  "w-8 h-8 rounded-lg text-xs font-medium transition-all",
                  page === p ? "gradient-bg text-white" : "hover:bg-muted text-muted-foreground"
                )}
              >
                {p}
              </button>
            ))}
            {page < pages - 2 && pages > 5 && (
              <>
                <span className="text-muted-foreground text-xs px-1">…</span>
                <button onClick={() => setPage(pages)} className="w-8 h-8 rounded-lg text-xs font-medium hover:bg-muted text-muted-foreground">{pages}</button>
              </>
            )}
          </div>

          <Button
            variant="outline" size="sm"
            disabled={page === pages}
            onClick={() => setPage((p) => p + 1)}
            className="h-8 px-3 text-xs gap-1"
          >
            Next<ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </motion.div>
      )}
    </div>
  );
}
