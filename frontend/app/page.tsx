import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Briefcase, Brain, Target, ArrowRight, CheckCircle,
  Sparkles, Zap, Shield, Users, TrendingUp, Star,
} from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "AI Skill Extraction",
    desc: "Upload your CV and our NLP engine automatically detects 80+ technical and soft skills with high accuracy.",
    color: "from-indigo-500 to-violet-500",
    bg: "bg-indigo-50 dark:bg-indigo-950/30",
  },
  {
    icon: Target,
    title: "Smart Job Matching",
    desc: "Get a real compatibility score for every listing. Know your exact match percentage before you apply.",
    color: "from-violet-500 to-purple-500",
    bg: "bg-violet-50 dark:bg-violet-950/30",
  },
  {
    icon: Briefcase,
    title: "Centralized Listings",
    desc: "All Moroccan opportunities in one place — ANAPEC, banks, startups, and top tech companies.",
    color: "from-purple-500 to-pink-500",
    bg: "bg-purple-50 dark:bg-purple-950/30",
  },
];

const stats = [
  { value: "500+", label: "Job Listings", icon: Briefcase },
  { value: "95%",  label: "Match Accuracy", icon: Target },
  { value: "3 min", label: "CV Analysis",  icon: Zap },
  { value: "80+",  label: "Skills Detected", icon: Brain },
];

const steps = [
  { num: "01", title: "Create your account", desc: "Sign up in seconds — no credit card required." },
  { num: "02", title: "Upload your CV",      desc: "Drop your PDF and let AI extract your skills instantly." },
  { num: "03", title: "Get matched",         desc: "Receive ranked job recommendations with compatibility scores." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background overflow-hidden">

      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl gradient-bg flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <Briefcase className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">SmartRecruit<span className="gradient-text"> AI</span></span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" className="font-medium">Log in</Button>
            </Link>
            <Link href="/register">
              <Button className="gradient-bg text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 border-0">
                Get started free
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative max-w-6xl mx-auto px-6 pt-20 pb-24 text-center">
        {/* Background blobs */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-400/10 rounded-full blur-3xl" />
          <div className="absolute top-20 right-1/4 w-[400px] h-[400px] bg-violet-400/10 rounded-full blur-3xl" />
        </div>

        <div className="inline-flex items-center gap-2 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 rounded-full px-4 py-1.5 mb-8">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider">
            AI-Powered Recruitment Platform
          </span>
        </div>

        <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight mb-6 leading-[1.1]">
          Find your dream job in Morocco
          <br />
          <span className="gradient-text">powered by AI</span>
        </h1>

        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
          Upload your CV, get your skills extracted automatically, and receive
          personalized job recommendations with real compatibility scores.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/register">
            <Button size="lg" className="gradient-bg text-white shadow-xl shadow-indigo-500/30 hover:shadow-indigo-500/50 border-0 gap-2 px-8 h-12 text-base">
              Start for free <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline" className="gap-2 px-8 h-12 text-base">
              Sign in to dashboard
            </Button>
          </Link>
        </div>

        {/* Social proof */}
        <div className="flex items-center justify-center gap-2 mt-8 text-sm text-muted-foreground">
          <div className="flex -space-x-2">
            {["YA","SM","KE","NB"].map((i) => (
              <div key={i} className="w-7 h-7 rounded-full gradient-bg border-2 border-background flex items-center justify-center text-white text-[10px] font-bold">{i}</div>
            ))}
          </div>
          <span>Trusted by <strong className="text-foreground">500+</strong> Moroccan professionals</span>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="border-y border-border/60 bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600">
        <div className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {stats.map(({ value, label, icon: Icon }) => (
            <div key={label} className="text-white">
              <div className="flex justify-center mb-2">
                <Icon className="w-5 h-5 text-white/70" />
              </div>
              <p className="text-3xl font-extrabold">{value}</p>
              <p className="text-sm text-white/70 mt-1">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4">Features</Badge>
          <h2 className="text-3xl font-bold mb-4">Everything you need to land a job</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Three powerful tools working together to give you an unfair advantage in the Moroccan job market.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map(({ icon: Icon, title, desc, color, bg }) => (
            <div key={title} className={`rounded-2xl border p-8 space-y-4 ${bg} card-glow transition-all duration-300`}>
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-lg`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-bold text-xl">{title}</h3>
              <p className="text-muted-foreground leading-relaxed">{desc}</p>
              <div className="flex items-center gap-1.5 text-sm font-medium text-primary">
                <span>Learn more</span><ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="bg-muted/50 border-y">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4">How It Works</Badge>
            <h2 className="text-3xl font-bold">Up and running in 3 minutes</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connector line */}
            <div className="hidden md:block absolute top-8 left-1/3 right-1/3 h-px bg-gradient-to-r from-indigo-300 via-violet-300 to-purple-300" />
            {steps.map(({ num, title, desc }) => (
              <div key={num} className="relative text-center space-y-4">
                <div className="w-16 h-16 gradient-bg rounded-2xl flex items-center justify-center mx-auto shadow-xl shadow-indigo-500/25">
                  <span className="text-white font-black text-lg">{num}</span>
                </div>
                <h3 className="font-bold text-lg">{title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <div className="relative rounded-3xl gradient-bg p-12 text-center overflow-hidden shadow-2xl shadow-indigo-500/30">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-48 h-48 bg-white rounded-full -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-white rounded-full translate-x-1/2 translate-y-1/2" />
          </div>
          <div className="relative z-10">
            <Sparkles className="w-10 h-10 text-white/80 mx-auto mb-4" />
            <h2 className="text-3xl font-extrabold text-white mb-4">
              Ready to find your next opportunity?
            </h2>
            <p className="text-white/80 mb-8 max-w-lg mx-auto">
              Join hundreds of Moroccan students and professionals using SmartRecruit AI to land jobs faster.
            </p>
            <Link href="/register">
              <Button size="lg" variant="secondary" className="gap-2 px-8 h-12 text-base font-semibold shadow-xl">
                Create free account <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t bg-card">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg gradient-bg flex items-center justify-center">
              <Briefcase className="w-3 h-3 text-white" />
            </div>
            <span className="font-semibold text-foreground">SmartRecruit AI</span>
            <span>— PFE Project 2026</span>
          </div>
          <p>Built with FastAPI + Next.js 15 + AI Matching</p>
        </div>
      </footer>
    </div>
  );
}
