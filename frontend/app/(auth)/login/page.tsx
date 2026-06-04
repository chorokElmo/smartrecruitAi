"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi } from "@/lib/api/auth";
import { useAuthStore } from "@/lib/store/authStore";
import { Loader2, Mail, Lock, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data: tokenData } = await authApi.login(form);
      localStorage.setItem("access_token", tokenData.access_token);
      const { data: user } = await authApi.me();
      setAuth(user, tokenData.access_token);
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Invalid email or password"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Welcome back</h1>
        <p className="text-muted-foreground mt-1.5 text-sm">
          Sign in to your SmartRecruit AI account
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2.5 text-sm text-destructive bg-destructive/8 border border-destructive/20 px-4 py-3 rounded-xl">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
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
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="font-medium">Password</Label>
          </div>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="password" type="password" placeholder="••••••••" required
              className="pl-10 h-11"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
        </div>

        <Button
          type="submit"
          className="w-full h-11 gradient-bg text-white border-0 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 font-semibold"
          disabled={loading}
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Signing in…</>
          ) : "Sign in"}
        </Button>
      </form>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">New here?</span>
        </div>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="font-semibold text-primary hover:underline underline-offset-4">
          Create one for free
        </Link>
      </p>
    </div>
  );
}
