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
import { GoogleButton } from "@/components/auth/GoogleButton";

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
    <div className="space-y-7">
      {/* Header */}
      <div className="space-y-1.5">
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Welcome back</h1>
        <p className="text-muted-foreground text-sm">
          Sign in to your SmartRecruit AI account
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2.5 text-sm text-destructive bg-destructive/8 border border-destructive/20 px-4 py-3 rounded-xl">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-sm font-medium">Email address</Label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              id="email" type="email" placeholder="you@example.com" required
              className="pl-10 h-11 bg-background border-border focus:border-primary/50 transition-colors"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-sm font-medium">Password</Label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              id="password" type="password" placeholder="••••••••" required
              className="pl-10 h-11 bg-background border-border focus:border-primary/50 transition-colors"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
        </div>

        <Button
          type="submit"
          className="w-full h-11 gradient-bg text-white border-0 font-semibold shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 hover:opacity-95 transition-all mt-2"
          disabled={loading}
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin mr-2" />Signing in…</>
          ) : "Sign in"}
        </Button>
      </form>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-background px-3 text-muted-foreground font-medium">or continue with</span>
        </div>
      </div>

      <GoogleButton onError={setError} />

      {/* Register link */}
      <p className="text-center text-sm text-muted-foreground pt-1">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="font-semibold text-primary hover:underline underline-offset-4 transition-colors">
          Create one for free
        </Link>
      </p>
    </div>
  );
}
