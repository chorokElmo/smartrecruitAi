"use client";
import { useState, useRef } from "react";
import { cvApi } from "@/lib/api/cv";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Upload, FileText, CheckCircle2, AlertCircle, Loader2,
  RefreshCw, Sparkles, ArrowRight,
} from "lucide-react";
import { recommendationsApi } from "@/lib/api/recommendations";

type UploadState = "idle" | "uploading" | "success" | "error";

export default function CVPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<UploadState>("idle");
  const [extractedSkills, setExtractedSkills] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [generating, setGenerating] = useState(false);
  const [matchCount, setMatchCount] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = async (file: File) => {
    if (!file.name.endsWith(".pdf")) { setError("Only PDF files are accepted."); setState("error"); return; }
    setFileName(file.name);
    setState("uploading");
    setError("");
    try {
      const { data } = await cvApi.upload(file);
      setExtractedSkills(data.extracted_skills ?? []);
      setState("success");
    } catch (e: any) {
      setError(e.response?.data?.detail ?? "Upload failed.");
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
    } catch (e: any) {
      alert(e.response?.data?.detail ?? "Error generating recommendations.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Upload CV</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Drop your PDF and let AI extract your skills automatically
        </p>
      </div>

      {/* Upload Zone */}
      <Card className="card-glow overflow-hidden">
        <div className="h-1 gradient-bg" />
        <CardContent className="pt-5 pb-5">
          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onClick={() => state !== "uploading" && inputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-200 ${
              state === "uploading"
                ? "cursor-default border-indigo-300 bg-indigo-50/50 dark:bg-indigo-950/20"
                : dragOver
                ? "cursor-copy border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 scale-[1.01]"
                : state === "success"
                ? "cursor-pointer border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20"
                : state === "error"
                ? "cursor-pointer border-red-300 bg-red-50/50 dark:bg-red-950/20"
                : "cursor-pointer border-border hover:border-indigo-400 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/10"
            }`}
          >
            <input ref={inputRef} type="file" accept=".pdf" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />

            {state === "idle" && (
              <div className="space-y-4">
                <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center mx-auto shadow-xl shadow-indigo-500/25">
                  <Upload className="w-7 h-7 text-white" />
                </div>
                <div>
                  <p className="font-bold text-lg">Drop your CV here</p>
                  <p className="text-sm text-muted-foreground mt-1">or click to browse your files</p>
                </div>
                <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><FileText className="w-3 h-3" />PDF only</span>
                  <span>·</span>
                  <span>Max 10 MB</span>
                </div>
              </div>
            )}

            {state === "uploading" && (
              <div className="space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center mx-auto">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                </div>
                <div>
                  <p className="font-bold text-lg">Analyzing your CV…</p>
                  <p className="text-sm font-medium text-indigo-600 mt-1">{fileName}</p>
                  <p className="text-xs text-muted-foreground mt-1">Extracting text and detecting skills</p>
                </div>
              </div>
            )}

            {state === "success" && (
              <div className="space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                </div>
                <div>
                  <p className="font-bold text-lg text-emerald-700 dark:text-emerald-400">CV processed!</p>
                  <p className="text-sm text-muted-foreground mt-1">{fileName}</p>
                  <p className="text-xs text-muted-foreground">Click to upload a different CV</p>
                </div>
              </div>
            )}

            {state === "error" && (
              <div className="space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-900/40 flex items-center justify-center mx-auto">
                  <AlertCircle className="w-8 h-8 text-red-500" />
                </div>
                <div>
                  <p className="font-bold text-destructive">{error}</p>
                  <p className="text-sm text-muted-foreground mt-1">Click to try again</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Extracted Skills */}
      {state === "success" && (
        <Card className="card-glow">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              Extracted Skills ({extractedSkills.length})
            </CardTitle>
            <CardDescription>
              These skills were automatically detected from your CV and synced to your profile.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {extractedSkills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {extractedSkills.map((s) => (
                  <span key={s}
                    className="px-3 py-1 rounded-full text-xs font-medium bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    {s}
                  </span>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border-2 border-dashed border-border p-5 text-center">
                <p className="text-sm text-muted-foreground">
                  No skills detected automatically. Add them manually in your Profile.
                </p>
              </div>
            )}

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm">Find matching jobs</p>
                <p className="text-xs text-muted-foreground mt-0.5">Run AI matching with your updated skill profile</p>
              </div>
              <Button
                onClick={handleGenerate} disabled={generating}
                className="gradient-bg text-white border-0 shadow-md shadow-indigo-500/25 gap-2"
              >
                {generating
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Matching…</>
                  : <><RefreshCw className="w-4 h-4" />Match Jobs</>
                }
              </Button>
            </div>

            {matchCount !== null && (
              <div className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                    Found <strong>{matchCount}</strong> matching jobs!
                  </p>
                  <p className="text-xs text-emerald-600/70 dark:text-emerald-500 mt-0.5">
                    Check your Dashboard for ranked recommendations.
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-emerald-600 ml-auto" />
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
