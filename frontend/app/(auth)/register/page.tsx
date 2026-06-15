"use client";
import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi } from "@/lib/api/auth";
import { useAuthStore } from "@/lib/store/authStore";
import { useRegisterStore } from "@/lib/store/registerStore";
import {
  Loader2, Mail, Lock, User, AlertCircle, CloudUpload,
  CheckCircle2, X, ArrowRight, ArrowLeft, FileText,
} from "lucide-react";
import { GoogleButton } from "@/components/auth/GoogleButton";

export default function RegisterPage() {
  const router  = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const s       = useRegisterStore();

  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef  = useRef<File | null>(null);
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [newSkill, setNewSkill] = useState("");

  const handleFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) { setError("PDF uniquement."); return; }
    fileRef.current = file;
    setError(""); setLoading(true);
    try {
      const { data } = await authApi.extractCv(file);
      s.set({
        fileName: file.name,
        name: data.name ?? "",
        email: data.email ?? "",
        skills: data.skills ?? [],
        diploma: data.diploma ?? "",
        domain: data.domain ?? "",
        years_experience: data.years_experience ?? "",
        step: 2,
      });
    } catch {
      setError("Échec de l'analyse du CV. Réessayez.");
    } finally {
      setLoading(false);
    }
  };

  const addSkill = () => {
    const v = newSkill.trim();
    if (v && !s.skills.includes(v)) s.set({ skills: [...s.skills, v] });
    setNewSkill("");
  };

  const handleFinish = async () => {
    if (password.length < 8) { setError("Mot de passe : 8 caractères min."); return; }
    if (password !== confirm) { setError("Les mots de passe ne correspondent pas."); return; }
    if (!fileRef.current) { setError("CV manquant — recommencez à l'étape 1."); s.set({ step: 1 }); return; }
    setError(""); setLoading(true);
    try {
      const fd = new FormData();
      fd.append("cv_file", fileRef.current);
      fd.append("name", s.name);
      fd.append("email", s.email);
      fd.append("password", password);
      if (s.domain)           fd.append("domain", s.domain);
      if (s.diploma)          fd.append("diploma", s.diploma);
      if (s.years_experience) fd.append("years_experience", s.years_experience);
      fd.append("skills", JSON.stringify(s.skills));

      const { data: tok } = await authApi.registerFromCv(fd);
      localStorage.setItem("access_token", tok.access_token);
      const { data: user } = await authApi.me();
      setAuth(user, tok.access_token);
      try { await import("@/lib/api/recommendations").then((m) => m.recommendationsApi.generate()); } catch {}
      s.reset();
      router.push("/dashboard");
    } catch (err: unknown) {
      setError((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Échec de l'inscription.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Créer votre compte</h1>
        <p className="text-muted-foreground mt-1.5 text-sm">Étape {s.step}/3</p>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
        <div className="h-full gradient-bg transition-all duration-300" style={{ width: `${(s.step / 3) * 100}%` }} />
      </div>

      {error && (
        <div className="flex items-center gap-2.5 text-sm text-destructive bg-destructive/8 border border-destructive/20 px-4 py-3 rounded-xl">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}

      {/* STEP 1 — Upload CV */}
      {s.step === 1 && (
        <div className="space-y-4">
          <input ref={inputRef} type="file" accept=".pdf" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          <div
            onClick={() => inputRef.current?.click()}
            onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
            onDragOver={(e) => e.preventDefault()}
            className="border-2 border-dashed border-border rounded-2xl p-12 text-center cursor-pointer hover:border-primary/40 transition-colors"
          >
            {loading ? (
              <><Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-3" />
                <p className="font-semibold">Analyse du CV en cours…</p></>
            ) : (
              <><div className="w-14 h-14 rounded-2xl gradient-bg flex items-center justify-center mx-auto mb-3" style={{ boxShadow: "var(--shadow-primary)" }}>
                  <CloudUpload className="w-7 h-7 text-white" /></div>
                <p className="font-semibold">Déposez votre CV (PDF)</p>
                <p className="text-sm text-muted-foreground mt-1">ou cliquez pour parcourir</p></>
            )}
          </div>
          <div className="relative">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">ou</span>
            </div>
          </div>
          <GoogleButton onError={setError} />
        </div>
      )}

      {/* STEP 2 — Review extracted info */}
      {s.step === 2 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs text-emerald-600">
            <FileText className="w-3.5 h-3.5" />{s.fileName} analysé
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Nom complet</Label>
              <Input value={s.name} onChange={(e) => s.set({ name: e.target.value })} placeholder="Youssef Alami" className="h-10" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Email</Label>
              <Input type="email" value={s.email} onChange={(e) => s.set({ email: e.target.value })} placeholder="you@example.com" className="h-10" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Domaine</Label>
              <Input value={s.domain} onChange={(e) => s.set({ domain: e.target.value })} className="h-10" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Diplôme</Label>
              <Input value={s.diploma} onChange={(e) => s.set({ diploma: e.target.value })} className="h-10" />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label className="text-xs">Années d'expérience</Label>
              <Input value={s.years_experience} onChange={(e) => s.set({ years_experience: e.target.value })} className="h-10" />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Compétences ({s.skills.length})</Label>
            <div className="flex gap-2">
              <Input value={newSkill} onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }}
                placeholder="Ajouter une compétence…" className="h-9 text-sm" />
              <Button type="button" variant="outline" onClick={addSkill} className="h-9 shrink-0">+</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {s.skills.map((sk) => (
                <span key={sk} className="flex items-center gap-1 px-2.5 py-1 rounded-full skill-neutral text-xs font-medium">
                  {sk}
                  <button onClick={() => s.set({ skills: s.skills.filter((x) => x !== sk) })} className="hover:text-red-500">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => s.set({ step: 1 })} className="h-10 gap-1"><ArrowLeft className="w-4 h-4" />Retour</Button>
            <Button onClick={() => { if (!s.name || !s.email) { setError("Nom et email requis."); return; } setError(""); s.set({ step: 3 }); }}
              className="flex-1 h-10 gradient-bg text-white border-0 gap-1" style={{ boxShadow: "var(--shadow-primary)" }}>
              Continuer<ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3 — Password */}
      {s.step === 3 && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="font-medium">Mot de passe</Label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input type="password" minLength={8} placeholder="8 caractères min" className="pl-10 h-11"
                value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="font-medium">Confirmer le mot de passe</Label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input type="password" placeholder="Retapez le mot de passe" className="pl-10 h-11"
                value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => s.set({ step: 2 })} className="h-11 gap-1"><ArrowLeft className="w-4 h-4" />Retour</Button>
            <Button onClick={handleFinish} disabled={loading}
              className="flex-1 h-11 gradient-bg text-white border-0 font-semibold gap-2" style={{ boxShadow: "var(--shadow-primary)" }}>
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Création…</> : <><CheckCircle2 className="w-4 h-4" />Créer mon compte</>}
            </Button>
          </div>
        </div>
      )}

      <p className="text-center text-sm text-muted-foreground">
        Déjà un compte ?{" "}
        <Link href="/login" className="font-semibold text-primary hover:underline underline-offset-4">Se connecter</Link>
      </p>
    </div>
  );
}
