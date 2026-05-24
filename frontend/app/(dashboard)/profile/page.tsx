"use client";
import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api/client";
import { useAuthStore } from "@/lib/store/authStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { User, GraduationCap, Wrench, Plus, X, CheckCircle2, Loader2 } from "lucide-react";

export default function ProfilePage() {
  const { user, setAuth, token } = useAuthStore();
  const [form, setForm] = useState({ first_name: "", last_name: "", diploma: "" });
  const [skills, setSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({ first_name: user.first_name, last_name: user.last_name, diploma: user.diploma ?? "" });
      setSkills(user.skills ?? []);
    }
  }, [user]);

  const addSkill = () => {
    const s = newSkill.trim();
    if (s && !skills.includes(s)) { setSkills([...skills, s]); setNewSkill(""); }
  };
  const removeSkill = (s: string) => setSkills(skills.filter((x) => x !== s));

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data } = await apiClient.patch("/users/profile", { ...form, skills });
      if (token) setAuth(data, token);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      alert(e.response?.data?.detail ?? "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Profile</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your personal information and skills</p>
      </div>

      {/* Avatar banner */}
      <Card className="card-glow overflow-hidden">
        <div className="h-20 gradient-bg" />
        <CardContent className="pt-0 pb-5">
          <div className="-mt-8 flex items-end gap-4">
            <div className="w-16 h-16 rounded-2xl gradient-bg border-4 border-background flex items-center justify-center text-white font-bold text-2xl shadow-xl shadow-indigo-500/25">
              {user?.first_name?.[0]?.toUpperCase() ?? "?"}
            </div>
            <div className="pb-1">
              <p className="font-bold text-lg">{user?.first_name} {user?.last_name}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal Info */}
      <Card className="card-glow">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center">
              <User className="w-3.5 h-3.5 text-white" />
            </div>
            Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="font-medium">First name</Label>
              <Input className="h-10" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label className="font-medium">Last name</Label>
              <Input className="h-10" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="font-medium">Email address</Label>
            <Input className="h-10 opacity-60" value={user?.email ?? ""} disabled />
            <p className="text-xs text-muted-foreground">Email cannot be changed</p>
          </div>
        </CardContent>
      </Card>

      {/* Education */}
      <Card className="card-glow">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
              <GraduationCap className="w-3.5 h-3.5 text-white" />
            </div>
            Education
          </CardTitle>
          <CardDescription>Your highest diploma or degree</CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            className="h-10"
            placeholder="e.g. Bachelor in Computer Science — ENSIAS 2026"
            value={form.diploma}
            onChange={(e) => setForm({ ...form, diploma: e.target.value })}
          />
        </CardContent>
      </Card>

      {/* Skills */}
      <Card className="card-glow">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
              <Wrench className="w-3.5 h-3.5 text-white" />
            </div>
            Skills
            <span className="ml-auto text-xs font-normal text-muted-foreground">{skills.length} added</span>
          </CardTitle>
          <CardDescription>Add skills manually or upload a CV to extract them automatically</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              className="h-10"
              placeholder="e.g. Python, React, Docker…"
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }}
            />
            <Button type="button" variant="outline" onClick={addSkill} className="h-10 gap-1 shrink-0">
              <Plus className="w-4 h-4" /> Add
            </Button>
          </div>

          {skills.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {skills.map((s) => (
                <div key={s}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-medium group">
                  {s}
                  <button onClick={() => removeSkill(s)}
                    className="hover:text-red-500 transition-colors ml-0.5 opacity-60 group-hover:opacity-100">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border-2 border-dashed border-border p-6 text-center">
              <Wrench className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No skills yet. Type above or upload your CV.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save */}
      <Button
        onClick={handleSave} disabled={saving}
        className={`w-full h-11 font-semibold shadow-lg transition-all duration-300 ${
          saved
            ? "bg-emerald-500 hover:bg-emerald-600 text-white border-0 shadow-emerald-500/25"
            : "gradient-bg text-white border-0 shadow-indigo-500/25"
        }`}
      >
        {saving ? (
          <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving…</>
        ) : saved ? (
          <><CheckCircle2 className="w-4 h-4 mr-2" />Saved successfully!</>
        ) : "Save changes"}
      </Button>
    </div>
  );
}
