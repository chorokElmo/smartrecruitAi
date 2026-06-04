"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { apiClient } from "@/lib/api/client";
import { useAuthStore } from "@/lib/store/authStore";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { listVariants, itemVariants } from "@/components/ui/page-wrapper";
import {
  User, GraduationCap, Wrench, Plus, X,
  CheckCircle2, Loader2, Shield, Briefcase, Clock,
  Sparkles,
} from "lucide-react";

type Tab = "personal" | "skills" | "security";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "personal", label: "Personal Info", icon: User },
  { id: "skills",   label: "Skills",        icon: Wrench },
  { id: "security", label: "Security",      icon: Shield },
];

interface Toast {
  id: number;
  message: string;
  type: "success" | "error";
}

export default function ProfilePage() {
  const { user, setAuth, token } = useAuthStore();
  const [activeTab, setActiveTab]   = useState<Tab>("personal");
  const [form, setForm] = useState({
    first_name:       "",
    last_name:        "",
    diploma:          "",
    domain:           "",
    years_experience: "",
  });
  const [skills, setSkills]       = useState<string[]>([]);
  const [newSkill, setNewSkill]   = useState("");
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [toasts, setToasts]       = useState<Toast[]>([]);
  const [recsQueued, setRecsQueued] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        first_name:       user.first_name       ?? "",
        last_name:        user.last_name        ?? "",
        diploma:          user.diploma          ?? "",
        domain:           user.domain           ?? "",
        years_experience: user.years_experience ?? "",
      });
      setSkills(user.skills ?? []);
    }
  }, [user]);

  // ── Toast helpers ─────────────────────────────────────────────
  const addToast = (message: string, type: Toast["type"] = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };

  // ── Skill management ─────────────────────────────────────────
  const addSkill = () => {
    const s = newSkill.trim();
    if (s && !skills.map((x) => x.toLowerCase()).includes(s.toLowerCase())) {
      setSkills([...skills, s]);
      setNewSkill("");
    }
  };
  const removeSkill = (s: string) => setSkills(skills.filter((x) => x !== s));

  // ── Save ──────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const payload: Record<string, unknown> = {
        first_name: form.first_name || undefined,
        last_name:  form.last_name  || undefined,
        skills,
      };
      if (form.diploma)          payload.diploma          = form.diploma;
      if (form.domain)           payload.domain           = form.domain;
      if (form.years_experience) payload.years_experience = form.years_experience;

      const { data } = await apiClient.patch("/users/profile", payload);
      if (token) setAuth(data, token);

      setSaved(true);
      setTimeout(() => setSaved(false), 3500);

      const hasSkills = (data.skills ?? []).length > 0;
      if (hasSkills) {
        setRecsQueued(true);
        addToast("✏️ Profile saved — recommendations updating in background…");
        setTimeout(() => setRecsQueued(false), 8000);
      } else {
        addToast("✏️ Profile saved successfully!");
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Failed to save profile.";
      addToast(msg, "error");
    } finally {
      setSaving(false);
    }
  };

  const initials = [user?.first_name?.[0], user?.last_name?.[0]]
    .filter(Boolean).join("").toUpperCase() || "?";

  return (
    <div className="max-w-2xl mx-auto space-y-5">

      {/* ── Toast stack ────────────────────────────── */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -12, scale: 0.95 }}
              animate={{ opacity: 1, y: 0,   scale: 1 }}
              exit={{   opacity: 0, y: -12,  scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={`pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg text-sm font-medium max-w-xs ${
                t.type === "success"
                  ? "bg-emerald-500 text-white"
                  : "bg-red-500 text-white"
              }`}
            >
              {t.type === "success"
                ? <CheckCircle2 className="w-4 h-4 shrink-0" />
                : <X className="w-4 h-4 shrink-0" />}
              {t.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* ── Avatar banner ─────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="card-base overflow-hidden"
      >
        <div className="h-24 gradient-bg relative">
          <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full bg-white/5" />
          <div className="absolute -right-2 top-6 w-20 h-20 rounded-full bg-white/5" />
        </div>

        <div className="px-5 pb-5">
          <div className="-mt-8 flex items-end gap-4">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
              className="w-16 h-16 rounded-2xl gradient-bg border-4 border-card flex items-center justify-center text-white font-bold text-2xl shrink-0"
              style={{ boxShadow: "var(--shadow-primary)" }}
            >
              {initials}
            </motion.div>
            <div className="pb-1 min-w-0">
              <p className="font-bold text-lg leading-tight truncate">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
              {/* AI-extracted badges */}
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {user?.domain && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                    <Briefcase className="w-2.5 h-2.5" />
                    {user.domain}
                  </span>
                )}
                {user?.diploma && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400">
                    <GraduationCap className="w-2.5 h-2.5" />
                    {user.diploma}
                  </span>
                )}
                {user?.years_experience && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <Clock className="w-2.5 h-2.5" />
                    {user.years_experience} ans exp.
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Recs updating banner ─────────────────── */}
      <AnimatePresence>
        {recsQueued && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{   opacity: 0, height: 0 }}
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-primary/10 border border-primary/20 text-sm text-primary font-medium overflow-hidden"
          >
            <Sparkles className="w-4 h-4 shrink-0 animate-pulse" />
            AI recommendations are being regenerated based on your new profile…
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Tabs ──────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, duration: 0.3 }}
        className="flex gap-1 p-1 bg-muted rounded-xl"
      >
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium transition-all duration-150 ${
              activeTab === id
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </motion.div>

      {/* ── Tab content ──────────────────────────── */}
      <AnimatePresence mode="wait">

        {/* Personal tab */}
        {activeTab === "personal" && (
          <motion.div
            key="personal"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="card-base overflow-hidden"
          >
            <div className="px-5 py-3.5 border-b border-border">
              <h2 className="text-sm font-semibold">Personal Information</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Manage your public profile details
              </p>
            </div>
            <div className="p-5 space-y-4">

              {/* Name row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">First name</Label>
                  <Input
                    className="h-9 text-sm"
                    value={form.first_name}
                    onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Last name</Label>
                  <Input
                    className="h-9 text-sm"
                    value={form.last_name}
                    onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                  />
                </div>
              </div>

              {/* Email (read-only) */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Email address</Label>
                <Input className="h-9 text-sm opacity-50" value={user?.email ?? ""} disabled />
                <p className="text-[11px] text-muted-foreground">Email cannot be changed</p>
              </div>

              {/* Diploma */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5" />
                  Education / Diploma
                  <span className="ml-auto text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                    auto-extracted from CV
                  </span>
                </Label>
                <Input
                  className="h-9 text-sm"
                  placeholder="e.g. Master, Licence, Ingénieur…"
                  value={form.diploma}
                  onChange={(e) => setForm({ ...form, diploma: e.target.value })}
                />
              </div>

              {/* Domain */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5" />
                  Professional Domain
                  <span className="ml-auto text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                    auto-extracted from CV
                  </span>
                </Label>
                <Input
                  className="h-9 text-sm"
                  placeholder="e.g. Développement web, DevOps & Cloud…"
                  value={form.domain}
                  onChange={(e) => setForm({ ...form, domain: e.target.value })}
                />
              </div>

              {/* Years of experience */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Years of Experience
                  <span className="ml-auto text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                    auto-extracted from CV
                  </span>
                </Label>
                <Input
                  className="h-9 text-sm"
                  placeholder="e.g. 3  or  5+"
                  value={form.years_experience}
                  onChange={(e) => setForm({ ...form, years_experience: e.target.value })}
                />
                <p className="text-[11px] text-muted-foreground">
                  Used to improve AI job matching accuracy
                </p>
              </div>

            </div>
          </motion.div>
        )}

        {/* Skills tab */}
        {activeTab === "skills" && (
          <motion.div
            key="skills"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="card-base overflow-hidden"
          >
            <div className="px-5 py-3.5 border-b border-border">
              <h2 className="text-sm font-semibold flex items-center justify-between">
                Skills
                <span className="text-xs font-normal text-muted-foreground">
                  {skills.length} added
                </span>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Add skills manually or upload a CV to auto-extract
              </p>
            </div>
            <div className="p-5 space-y-4">

              {/* Input */}
              <div className="flex gap-2">
                <Input
                  className="h-9 text-sm flex-1"
                  placeholder="e.g. Python, React, Docker…"
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); addSkill(); }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={addSkill}
                  className="h-9 px-3 shrink-0 gap-1 text-sm"
                >
                  <Plus className="w-3.5 h-3.5" />Add
                </Button>
              </div>

              {/* Skill pills */}
              {skills.length > 0 ? (
                <motion.div
                  variants={listVariants}
                  initial="hidden"
                  animate="visible"
                  className="flex flex-wrap gap-2"
                >
                  {skills.map((s) => (
                    <motion.div
                      key={s}
                      variants={itemVariants}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full skill-neutral text-xs font-medium group"
                    >
                      {s}
                      <button
                        onClick={() => removeSkill(s)}
                        className="opacity-40 group-hover:opacity-100 hover:text-red-500 transition-all -mr-0.5"
                        aria-label={`Remove ${s}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <div className="rounded-xl border-2 border-dashed border-border p-8 text-center">
                  <Wrench className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No skills yet. Type above or{" "}
                    <a
                      href="/cv"
                      className="text-primary hover:underline underline-offset-2"
                    >
                      upload your CV
                    </a>
                    .
                  </p>
                </div>
              )}

              {skills.length > 0 && (
                <p className="text-[11px] text-muted-foreground">
                  💡 Saving will re-run AI matching against all available jobs automatically.
                </p>
              )}

            </div>
          </motion.div>
        )}

        {/* Security tab */}
        {activeTab === "security" && (
          <motion.div
            key="security"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="card-base overflow-hidden"
          >
            <div className="px-5 py-3.5 border-b border-border">
              <h2 className="text-sm font-semibold">Security</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Manage your account security settings
              </p>
            </div>
            <div className="p-5 space-y-4">
              <div className="rounded-xl bg-muted/50 border border-border p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold">Account Protected</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Your account is secured with a hashed password. Password
                      changes will be available in a future update.
                    </p>
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  Email (login)
                </Label>
                <Input
                  className="h-9 text-sm opacity-50"
                  value={user?.email ?? ""}
                  disabled
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Save button ───────────────────────────── */}
      {activeTab !== "security" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Button
            onClick={handleSave}
            disabled={saving}
            className={`w-full h-10 text-sm font-semibold border-0 transition-all duration-300 gap-2 ${
              saved
                ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                : "gradient-bg text-white"
            }`}
            style={{
              boxShadow: saved
                ? "0 4px 16px rgba(16,185,129,0.3)"
                : "var(--shadow-primary)",
            }}
          >
            {saving ? (
              <><Loader2 className="w-4 h-4 animate-spin" />Saving…</>
            ) : saved ? (
              <><CheckCircle2 className="w-4 h-4" />Saved — recommendations updating</>
            ) : (
              "Save changes"
            )}
          </Button>
        </motion.div>
      )}
    </div>
  );
}
