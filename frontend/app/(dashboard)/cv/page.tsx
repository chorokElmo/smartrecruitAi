"use client";
import { useState, useRef } from "react";
import { cvApi } from "@/lib/api/cv";
import { useAuthStore } from "@/lib/store/authStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { recommendationsApi } from "@/lib/api/recommendations";

type UploadState = "idle" | "uploading" | "success" | "error";

export default function CVPage() {
  const user = useAuthStore((s) => s.user);
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<UploadState>("idle");
  const [extractedSkills, setExtractedSkills] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [generating, setGenerating] = useState(false);
  const [matchCount, setMatchCount] = useState<number | null>(null);

  const handleFile = async (file: File) => {
    if (!file.name.endsWith(".pdf")) { setError("Only PDF files are accepted."); return; }
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
        <h1 className="text-2xl font-bold">Upload CV</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Upload a PDF CV to automatically extract your skills
        </p>
      </div>

      {/* Upload Zone */}
      <Card>
        <CardContent className="pt-6">
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => inputRef.current?.click()}
            className="border-2 border-dashed border-border rounded-xl p-12 text-center cursor-pointer hover:border-primary/50 hover:bg-accent/50 transition-colors"
          >
            <input ref={inputRef} type="file" accept=".pdf" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />

            {state === "idle" && (
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <Upload className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Drop your CV here or click to browse</p>
                  <p className="text-sm text-muted-foreground">PDF files only · Max 10 MB</p>
                </div>
              </div>
            )}

            {state === "uploading" && (
              <div className="space-y-3">
                <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
                <p className="font-medium">Analyzing <span className="text-primary">{fileName}</span>…</p>
                <p className="text-sm text-muted-foreground">Extracting text and detecting skills</p>
              </div>
            )}

            {state === "success" && (
              <div className="space-y-3">
                <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto" />
                <p className="font-semibold text-emerald-600">CV processed successfully!</p>
                <p className="text-sm text-muted-foreground">{fileName}</p>
              </div>
            )}

            {state === "error" && (
              <div className="space-y-3">
                <AlertCircle className="w-10 h-10 text-destructive mx-auto" />
                <p className="font-medium text-destructive">{error}</p>
                <p className="text-sm text-muted-foreground">Click to try again</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Extracted Skills */}
      {state === "success" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Extracted Skills ({extractedSkills.length})
            </CardTitle>
            <CardDescription>
              These skills were automatically detected from your CV and added to your profile.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {extractedSkills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {extractedSkills.map((s) => (
                  <Badge key={s} variant="success">{s}</Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No skills were detected automatically. Add them manually in your Profile.
              </p>
            )}

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Run AI Matching</p>
                <p className="text-xs text-muted-foreground">Find jobs that match your new skill profile</p>
              </div>
              <Button onClick={handleGenerate} disabled={generating} className="gap-2">
                <RefreshCw className={`w-4 h-4 ${generating ? "animate-spin" : ""}`} />
                {generating ? "Matching…" : "Match Jobs"}
              </Button>
            </div>

            {matchCount !== null && (
              <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3 text-sm text-emerald-700 dark:text-emerald-400">
                Found <strong>{matchCount}</strong> matching jobs! Check your Dashboard.
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
