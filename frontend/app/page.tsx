import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Brain, Target, ArrowRight, CheckCircle } from "lucide-react";

const features = [
  { icon: Brain,    title: "AI Skill Extraction",  desc: "Upload your CV and our AI automatically detects your technical skills." },
  { icon: Target,   title: "Smart Matching",        desc: "See a compatibility score for every job — know your chances before applying." },
  { icon: Briefcase,title: "Centralized Jobs",      desc: "All Moroccan opportunities in one place: ANAPEC, banks, tech companies." },
];

const stats = [
  { value: "500+", label: "Job Listings" },
  { value: "95%",  label: "Match Accuracy" },
  { value: "3min", label: "CV Analysis" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Briefcase className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">SmartRecruit AI</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost">Log in</Button>
            </Link>
            <Link href="/register">
              <Button>Get started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-16 text-center">
        <Badge variant="secondary" className="mb-6">
          AI-Powered Recruitment Platform
        </Badge>
        <h1 className="text-5xl font-bold tracking-tight mb-6 leading-tight">
          Find your dream job in Morocco
          <br />
          <span className="text-primary">powered by AI</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
          Upload your CV, get your skills extracted automatically, and receive personalized
          job recommendations with real compatibility scores.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/register">
            <Button size="lg" className="gap-2">
              Start for free <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline">View demo</Button>
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y bg-muted/40">
        <div className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-3 gap-8 text-center">
          {stats.map((s) => (
            <div key={s.label}>
              <p className="text-4xl font-bold text-primary">{s.value}</p>
              <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <h2 className="text-3xl font-bold text-center mb-16">Everything you need to land a job</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-xl border bg-card p-6 space-y-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold text-lg">{title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary text-primary-foreground">
        <div className="max-w-6xl mx-auto px-6 py-16 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to find your next opportunity?</h2>
          <p className="text-primary-foreground/80 mb-8">
            Join hundreds of Moroccan students and professionals using SmartRecruit AI.
          </p>
          <Link href="/register">
            <Button size="lg" variant="secondary" className="gap-2">
              Create your account <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-card">
        <div className="max-w-6xl mx-auto px-6 py-8 flex items-center justify-between text-sm text-muted-foreground">
          <p>© 2026 SmartRecruit AI — PFE Project</p>
          <p>Built with FastAPI + Next.js + spaCy</p>
        </div>
      </footer>
    </div>
  );
}
