"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Briefcase, Brain, Target, ArrowRight,
  Sparkles, Zap, CheckCircle2, Star,
} from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "AI Skill Extraction",
    desc: "Upload your CV and our NLP engine automatically detects 80+ technical and soft skills with high accuracy.",
    color: "from-indigo-500 to-violet-500",
    badge: "NLP-powered",
  },
  {
    icon: Target,
    title: "Smart Job Matching",
    desc: "Get a real compatibility score for every listing. Know your exact match percentage before you apply.",
    color: "from-violet-500 to-purple-500",
    badge: "Semantic AI",
  },
  {
    icon: Briefcase,
    title: "Centralized Listings",
    desc: "All Moroccan opportunities in one place — ANAPEC, banks, startups, and top tech companies.",
    color: "from-purple-500 to-pink-500",
    badge: "6 sources",
  },
];

const stats = [
  { value: 873, suffix: "+", label: "Job Listings",   icon: Briefcase },
  { value: 95,  suffix: "%", label: "Match Accuracy", icon: Target },
  { value: 3,   suffix: " min", label: "CV Analysis", icon: Zap },
  { value: 80,  suffix: "+", label: "Skills Detected", icon: Brain },
];

const steps = [
  { num: "01", title: "Create your account", desc: "Sign up in seconds — no credit card required.", icon: CheckCircle2 },
  { num: "02", title: "Upload your CV",      desc: "Drop your PDF and let AI extract your skills instantly.", icon: Zap },
  { num: "03", title: "Get matched",         desc: "Receive ranked job recommendations with compatibility scores.", icon: Star },
];

const HEADLINE = ["Find", "your", "dream", "job", "in", "Morocco"];

function CountUp({ target, suffix = "", duration = 2000 }: { target: number; suffix?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let start: number;
    let raf = 0;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(ease * target));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [inView, target, duration]);

  return <span ref={ref}>{val}{suffix}</span>;
}

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.21, 0.47, 0.32, 0.98] } },
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white overflow-hidden">

      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-50 border-b border-white/8 bg-[#0A0A0F]/90 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-white.png" alt="SmartRecruit AI" className="h-9 w-auto" />
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" className="font-medium text-white/80 hover:text-white hover:bg-white/8 text-sm">
                Log in
              </Button>
            </Link>
            <Link href="/register">
              <Button variant="gradient" className="text-sm shadow-lg shadow-violet-500/20">
                Get started free
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative min-h-[90vh] overflow-hidden flex flex-col items-center justify-center text-center px-6 pt-16 pb-24">
        {/* Video background */}
        <video autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover opacity-20">
          <source src="/hero-bg.mp4" type="video/mp4" />
        </video>
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0F]/60 via-[#0A0A0F]/40 to-[#0A0A0F]" />
        {/* Blobs */}
        <div className="blob blob-1" />
        <div className="blob blob-2" />

        <div className="relative z-10 max-w-4xl mx-auto">
          {/* Pill badge */}
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 bg-white/6 border border-white/10 rounded-full px-4 py-1.5 mb-10 backdrop-blur-sm"
          >
            <Sparkles className="w-3.5 h-3.5 text-violet-400" />
            <span className="text-xs font-semibold text-white/70 tracking-wider uppercase">
              AI-Powered Recruitment Platform for Morocco
            </span>
          </motion.div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 leading-[1.08]">
            <span className="inline-flex flex-wrap justify-center gap-x-3 mb-2">
              {HEADLINE.map((word, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.09, duration: 0.5 }}
                >
                  {word}
                </motion.span>
              ))}
            </span>
            <br />
            <motion.span
              className="gradient-text"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: HEADLINE.length * 0.09, duration: 0.5 }}
            >
              powered by AI
            </motion.span>
          </h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8, duration: 0.6 }}
            className="text-lg sm:text-xl text-white/60 max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Upload your CV, get your skills extracted automatically, and receive
            personalized job recommendations with real compatibility scores.
          </motion.p>

          {/* CTA buttons */}
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1, duration: 0.5 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12"
          >
            <Link href="/register">
              <Button size="lg" variant="gradient" className="pulse-glow gap-2 px-8 h-12 text-base font-semibold shadow-xl shadow-violet-500/25">
                Start for free <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="gap-2 px-8 h-12 text-base bg-white/5 border-white/12 text-white hover:bg-white/10 hover:border-white/20 hover:text-white">
                Sign in to dashboard
              </Button>
            </Link>
          </motion.div>

          {/* Trust badges */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2, duration: 0.6 }}
            className="flex flex-wrap items-center justify-center gap-4 text-xs text-white/40"
          >
            {["No credit card required", "Free to use", "Data stays private"].map((t) => (
              <span key={t} className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                {t}
              </span>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Stats ── */}
      <motion.section
        variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
        className="border-y border-white/8"
      >
        <div className="max-w-6xl mx-auto px-6 py-14 grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map(({ value, suffix, label, icon: Icon }) => (
            <div key={label} className="text-center space-y-2">
              <div className="flex justify-center mb-3">
                <div className="w-10 h-10 rounded-xl bg-white/6 border border-white/10 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-violet-400" />
                </div>
              </div>
              <p className="text-3xl font-extrabold bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">
                <CountUp target={value} suffix={suffix} />
              </p>
              <p className="text-sm text-white/50">{label}</p>
            </div>
          ))}
        </div>
      </motion.section>

      {/* ── Features ── */}
      <section className="max-w-6xl mx-auto px-6 py-28">
        <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-16">
          <Badge variant="secondary" className="mb-5 bg-violet-500/10 text-violet-300 border border-violet-500/20 px-3 py-1">
            Features
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold mb-5 tracking-tight">
            Everything you need to land a job
          </h2>
          <p className="text-white/50 max-w-xl mx-auto text-lg leading-relaxed">
            Three powerful tools working together to give you an unfair advantage in the Moroccan job market.
          </p>
        </motion.div>

        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true }}
          variants={{ visible: { transition: { staggerChildren: 0.12 } } }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {features.map(({ icon: Icon, title, desc, color, badge }) => (
            <motion.div
              key={title}
              variants={fadeUp}
              className="group relative rounded-2xl p-8 bg-white/[0.04] border border-white/8 backdrop-blur-sm hover:bg-white/[0.07] hover:border-violet-500/30 transition-all duration-300"
            >
              <div className="flex items-start justify-between mb-6">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <span className="text-[10px] font-semibold text-violet-400 bg-violet-400/10 border border-violet-400/20 px-2 py-1 rounded-full uppercase tracking-wider">
                  {badge}
                </span>
              </div>
              <h3 className="font-bold text-xl mb-3">{title}</h3>
              <p className="text-white/50 leading-relaxed text-sm mb-5">{desc}</p>
              <div className="flex items-center gap-1.5 text-sm font-medium text-violet-400 group-hover:gap-2.5 transition-all">
                <span>Learn more</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── How it works ── */}
      <section className="border-y border-white/8 bg-white/[0.015]">
        <div className="max-w-6xl mx-auto px-6 py-28">
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-16">
            <Badge variant="secondary" className="mb-5 bg-violet-500/10 text-violet-300 border border-violet-500/20 px-3 py-1">
              How It Works
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Up and running in 3 minutes</h2>
            <p className="text-white/50 mt-4 max-w-lg mx-auto">No setup required. Just create an account and upload your CV.</p>
          </motion.div>

          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true }}
            variants={{ visible: { transition: { staggerChildren: 0.12 } } }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8 relative"
          >
            {/* Connector line */}
            <div className="hidden md:block absolute top-10 left-[calc(33%+2rem)] right-[calc(33%+2rem)] h-px bg-gradient-to-r from-violet-500/30 via-violet-400/50 to-violet-500/30" />
            {steps.map(({ num, title, desc, icon: Icon }) => (
              <motion.div key={num} variants={fadeUp} className="relative text-center space-y-5">
                <div className="relative mx-auto w-20 h-20">
                  <div className="w-20 h-20 gradient-bg rounded-2xl flex items-center justify-center shadow-xl shadow-violet-500/20">
                    <span className="text-white font-black text-xl">{num}</span>
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-[#0A0A0F] rounded-lg border border-white/10 flex items-center justify-center">
                    <Icon className="w-3.5 h-3.5 text-violet-400" />
                  </div>
                </div>
                <h3 className="font-bold text-lg">{title}</h3>
                <p className="text-white/50 text-sm leading-relaxed max-w-xs mx-auto">{desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="max-w-6xl mx-auto px-6 py-28">
        <motion.div
          variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
          className="relative rounded-3xl gradient-bg p-12 sm:p-16 text-center overflow-hidden shadow-2xl shadow-violet-500/25"
        >
          {/* Decorative circles */}
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 right-0 w-80 h-80 bg-white rounded-full translate-x-1/2 translate-y-1/2" />
          </div>
          <div className="relative z-10 max-w-2xl mx-auto">
            <div className="w-14 h-14 bg-white/15 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-5 tracking-tight">
              Ready to find your next opportunity?
            </h2>
            <p className="text-white/75 mb-10 text-lg leading-relaxed">
              Join hundreds of Moroccan students and professionals using SmartRecruit AI to land jobs faster.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/register">
                <Button size="lg" variant="secondary" className="gap-2 px-8 h-12 text-base font-semibold shadow-xl bg-white text-violet-700 hover:bg-white/90">
                  Create free account <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="ghost" className="gap-2 px-8 h-12 text-base text-white/80 hover:text-white hover:bg-white/10 border border-white/20">
                  Sign in
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/8 bg-[#0A0A0F]">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-white.png" alt="SmartRecruit AI" className="h-7 w-auto opacity-70" />
              <span className="text-white/30 text-sm">— PFE Project 2026</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-white/30">
              <span>FastAPI + Next.js 15</span>
              <span>·</span>
              <span>Groq LLM + sentence-transformers</span>
              <span>·</span>
              <span>PostgreSQL 16</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
