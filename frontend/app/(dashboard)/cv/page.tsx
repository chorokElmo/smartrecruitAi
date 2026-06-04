"use client";
import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cvApi } from "@/lib/api/cv";
import { recommendationsApi } from "@/lib/api/recommendations";
import { Button } from "@/components/ui/button";
import { listVariants, itemVariants } from "@/components/ui/page-wrapper";
import {
  Upload, FileText, CheckCircle2, AlertCircle,
  Loader2, RefreshCw, Sparkles, ArrowRight,
  CloudUpload, GraduationCap, Briefcase, Clock,
} from "lucide-react";
import Link from "next/link";

type UploadState = "idle" | "uploading" | "success" | "error";

interface CVResult {
  extracted_skills:  string[];
  diploma?:          string;
  domain?:           string;
  years_experience?: string;
}

const steps = [
  { id: 1, label: "Upload",  icon: Upload    },
  { id: 2, label: "Analyze", icon: Sparkles  },
  { id: 3, label: "Match",   icon: RefreshCw },
];

export default function CVPage() {
  const inputRef                            = useRef<HTMLInputElement>(null);
  const [state, setState]                   = useState<UploadState>("idle");
  const [result, setResult]                 = useState<CVResult | null>(null);
  const [fileName, setFileName]             = useState("");
  const [error, setError]                   = useState("");
  const [generating, setGenerating]         = useState(false);
  const [matchCount, setMatchCount]         = useState<number | null>(null);
  const [dragOver, setDragOver]             = useState(false);

  const handleFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError("Only PDF files are accepted. Please upload a .pdf file.");
      setState("error");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("File size must be under 10 MB.");
      setState("error");
      return;
    }
    setFileName(file.name);
    setState("uploading");
    setError("");
    setResult(null);
    setMatchCount(null);
    try {
      const { data } = await cvApi.upload(file);
      setResult({
        extracted_skills:  data.extracted_skills  ?? [],
        diploma:           data.diploma,
        domain:            data.domain,
        years_experience:  data.years_experience,
      });
      setState("success");
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Upload failed. Please try again.";
      setError(msg);
      setState("error");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const { data } = await recommendationsApi.generate();
      setMatchCount(data.length);
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Error generating recommendations.";
      alert(msg);
    } finally {
      setGenerating(false);
    }
  };

  const activeStep = state === "success" ? 3 : state === "uploading" ? 2 : 1;
  const extractedSkills = result?.extracted_skills ?? [];

  return (
    <div className="max-w-2xl mx-auto space-y-5">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <h1 className="text-xl font-bold">Upload CV</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Upload your PDF and let AI extract your skills, diploma and experience automatically
        </p>
      </motion.div>

      {/* ── Progress Steps ────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, duration: 0.3 }}
        className="card-base p-4"
      >
        <div className="flex items-center justify-between relative">
          <div className="absolute left-0 right-0 top-1/2 h-px bg-border -translate-y-1/2 mx-12" />
          {steps.map((step) => {
            const done   = activeStep > step.id;
            const active = activeStep === step.id;
            const Icon   = step.icon;
            return (
              <div key={step.id} className="flex flex-col items-center gap-1.5 relative z-10">
                <motion.div
                  animate={{
                    scale: active ? 1.1 : 1,
                    backgroundColor:
                      done   ? "#10b981"
                      : active ? "hsl(var(--primary))"
                      : "hsl(var(--muted))",
                  }}
                  transition={{ duration: 0.3 }}
                  className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm"
                >
                  {done
                    ? <CheckCircle2 className="w-4 h-4 text-white" />
                    : <Icon className={`w-4 h-4 ${active ? "text-white" : "text-muted-foreground"}`} />
                  }
                </motion.div>
                <span className={`text-[10px] font-semibold ${
                  active ? "text-primary" : done ? "text-emerald-600" : "text-muted-foreground"
                }`}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* ── Drop Zone ────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12, duration: 0.3 }}
        className="card-base overflow-hidden"
      >
        <div className={`h-1 transition-all duration-500 ${
          state === "success"   ? "bg-gradient-to-r from-emerald-500 to-teal-400" :
          state === "error"     ? "bg-gradient-to-r from-red-500 to-rose-400" :
          state === "uploading" ? "gradient-bg animate-pulse-slow" :
          "gradient-bg"
        }`} />

        <div className="p-5">
          <input
            ref={inputRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />

          <motion.div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onClick={() => state !== "uploading" && inputRef.current?.click()}
            animate={{
              scale: dragOver ? 1.01 : 1,
              borderColor:
                dragOver         ? "hsl(var(--primary))" :
                state === "success" ? "#10b981" :
                state === "error"   ? "#ef4444" :
                "hsl(var(--border))",
              backgroundColor:
                dragOver            ? "hsl(var(--accent))" :
                state === "success" ? "rgba(16,185,129,0.04)" :
                state === "error"   ? "rgba(239,68,68,0.04)" :
                "transparent",
            }}
            transition={{ duration: 0.2 }}
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
              state !== "uploading" ? "cursor-pointer" : "cursor-default"
            }`}
          >
            <AnimatePresence mode="wait">
              {state === "idle" && (
                <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                  <motion.div
                    animate={{ y: dragOver ? -4 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="w-14 h-14 rounded-2xl gradient-bg flex items-center justify-center mx-auto"
                    style={{ boxShadow: "var(--shadow-primary)" }}
                  >
                    <CloudUpload className="w-7 h-7 text-white" />
                  </motion.div>
                  <div>
                    <p className="font-semibold text-foreground">
                      {dragOver ? "Drop your CV here" : "Drag & drop your CV"}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">or click to browse your files</p>
                  </div>
                  <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5" />PDF only</span>
                    <span className="text-border">·</span>
                    <span>Max 10 MB</span>
                  </div>
                </motion.div>
              )}

              {state === "uploading" && (
                <motion.div key="uploading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                    <Loader2 className="w-7 h-7 text-primary animate-spin" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Analyzing your CV…</p>
                    <p className="text-sm font-medium text-primary mt-1 truncate max-w-xs mx-auto">{fileName}</p>
                    <p className="text-xs text-muted-foreground mt-1">Extracting text, skills, diploma & experience</p>
                  </div>
                </motion.div>
              )}

              {state === "success" && (
                <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-7 h-7 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-emerald-700 dark:text-emerald-400">CV processed successfully!</p>
                    <p className="text-sm text-muted-foreground mt-1 truncate">{fileName}</p>
                    <p className="text-xs text-muted-foreground mt-1">Click to upload a different CV</p>
                  </div>
                </motion.div>
              )}

              {state === "error" && (
                <motion.div key="error" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-900/40 flex items-center justify-center mx-auto">
                    <AlertCircle className="w-7 h-7 text-red-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-red-600 dark:text-red-400">{error}</p>
                    <p className="text-sm text-muted-foreground mt-1">Click to try again</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </motion.div>

      {/* ── AI Extraction Results ─────────────────── */}
      <AnimatePresence>
        {state === "success" && (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35 }}
            className="card-base overflow-hidden"
          >
            <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border">
              <div className="w-6 h-6 rounded-lg gradient-bg flex items-center justify-center">
                <Sparkles className="w-3 h-3 text-white" />
              </div>
              <h2 className="text-sm font-semibold">AI Extraction Results</h2>
            </div>

            <div className="p-5 space-y-5">

              {/* ── Enriched metadata ─────────────────── */}
              {(result?.diploma || result?.domain || result?.years_experience) && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {result?.diploma && (
                    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-violet-500/8 border border-violet-500/15">
                      <GraduationCap className="w-4 h-4 text-violet-600 dark:text-violet-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Diploma</p>
                        <p className="text-sm font-semibold text-foreground mt-0.5">{result.diploma}</p>
                      </div>
                    </div>
                  )}
                  {result?.domain && (
                    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-primary/8 border border-primary/15">
                      <Briefcase className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Domain</p>
                        <p className="text-sm font-semibold text-foreground mt-0.5">{result.domain}</p>
                      </div>
                    </div>
                  )}
                  {result?.years_experience && (
                    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/8 border border-amber-500/15">
                      <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Experience</p>
                        <p className="text-sm font-semibold text-foreground mt-0.5">{result.years_experience} ans</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Skills ────────────────────────────── */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">
                  Detected Skills ({extractedSkills.length})
                </p>
                {extractedSkills.length > 0 ? (
                  <motion.div
                    variants={listVariants}
                    initial="hidden"
                    animate="visible"
                    className="flex flex-wrap gap-2"
                  >
                    {extractedSkills.map((s) => (
                      <motion.span
                        key={s}
                        variants={itemVariants}
                        className="px-2.5 py-1 rounded-full text-xs font-medium skill-neutral"
                      >
                        {s}
                      </motion.span>
                    ))}
                  </motion.div>
                ) : (
                  <div className="rounded-xl border-2 border-dashed border-border p-6 text-center">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      No skills detected automatically from your CV text.<br />
                      You can add them manually in your{" "}
                      <Link href="/profile" className="text-primary underline-offset-2 hover:underline">
                        Profile
                      </Link>.
                    </p>
                  </div>
                )}
              </div>

              <div className="border-t border-border" />

              {/* ── Run matching ──────────────────────── */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">Find matching jobs</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Run AI matching with your updated skill profile
                  </p>
                </div>
                <Button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="gradient-bg text-white border-0 h-9 px-4 text-sm font-medium gap-2 shrink-0"
                  style={{ boxShadow: generating ? "none" : "var(--shadow-primary)" }}
                >
                  {generating
                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Matching…</>
                    : <><RefreshCw className="w-3.5 h-3.5" />Match Jobs</>
                  }
                </Button>
              </div>

              {/* Success banner */}
              <AnimatePresence>
                {matchCount !== null && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4"
                  >
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                        Found <strong>{matchCount}</strong> matching jobs!
                      </p>
                      <p className="text-xs text-emerald-600/70 dark:text-emerald-500 mt-0.5">
                        Check your Dashboard for ranked recommendations.
                      </p>
                    </div>
                    <Link href="/dashboard">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs gap-1 text-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 shrink-0"
                      >
                        Dashboard <ArrowRight className="w-3 h-3" />
                      </Button>
                    </Link>
                  </motion.div>
                )}
              </AnimatePresence>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
