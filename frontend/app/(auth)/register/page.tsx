"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi } from "@/lib/api/auth";
import { useAuthStore } from "@/lib/store/authStore";
import { Loader2, Mail, Lock, User, AlertCircle, CheckCircle2 } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await authApi.register(form);
      const { data: tokenData } = await authApi.login({ email: form.email, password: form.password });
      localStorage.setItem("access_token", tokenData.access_token);
      const { data: user } = await authApi.me();
      setAuth(user, tokenData.access_token);
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Registration failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const perks = [
    "Free forever — no credit card needed",
    "AI CV analysis in under 3 minutes",
    "Personalized job recommendations",
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Create your account</h1>
        <p className="text-muted-foreground mt-1.5 text-sm">Start finding jobs with AI — takes 30 seconds</p>
      </div>

      {/* Perks */}
      <div className="space-y-2">
        {perks.map((p) => (
          <div key={p} className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            {p}
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2.5 text-sm text-destructive bg-destructive/8 border border-destructive/20 px-4 py-3 rounded-xl">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="first_name" className="font-medium">First name</Label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="first_name" placeholder="Youssef" required
                className="pl-10 h-11"
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="last_name" className="font-medium">Last name</Label>
            <Input
              id="last_name" placeholder="Alami" required
              className="h-11"
              value={form.last_name}
              onChange={(e) => setForm({ ...form, last_name: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className="font-medium">Email address</Label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="email" type="email" placeholder="you@example.com" required
              className="pl-10 h-11"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="font-medium">Password</Label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="password" type="password" placeholder="Minimum 8 characters" required minLength={8}
              className="pl-10 h-11"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
        </div>

        <Button
          type="submit"
          className="w-full h-11 gradient-bg text-white border-0 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 font-semibold mt-2"
          disabled={loading}
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin mr-2" />Creating account…</>
          ) : "Create free account"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-primary hover:underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </div>
  );
}
