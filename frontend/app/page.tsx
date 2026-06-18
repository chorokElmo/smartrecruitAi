"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Briefcase, Brain, Target, ArrowRight,
  Sparkles, Zap,
} from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "AI Skill Extraction",
    desc: "Upload your CV and our NLP engine automatically detects 80+ technical and soft skills with high accuracy.",
    color: "from-indigo-500 to-violet-500",
  },
  {
    icon: Target,
    title: "Smart Job Matching",
    desc: "Get a real compatibility score for every listing. Know your exact match percentage before you apply.",
    color: "from-violet-500 to-purple-500",
  },
  {
    icon: Briefcase,
    title: "Centralized Listings",
    desc: "All Moroccan opportunities in one place — ANAPEC, banks, startups, and top tech companies.",
    color: "from-purple-500 to-pink-500",
  },
];

const stats = [
  { value: 873, suffix: "+", label: "Job Listings", icon: Briefcase },
  { value: 95,  suffix: "%", label: "Match Accuracy", icon: Target },
  { value: 3,   suffix: " min", label: "CV Analysis",  icon: Zap },
  { value: 80,  suffix: "+", label: "Skills Detected", icon: Brain },
];

const steps = [
  { num: "01", title: "Create your account", desc: "Sign up in seconds — no credit card required." },
  { num: "02", title: "Upload your CV",      desc: "Drop your PDF and let AI extract your skills instantly." },
  { num: "03", title: "Get matched",         desc: "Receive ranked job recommendations with compatibility scores." },
];

const HEADLINE = ["Find", "your", "dream", "job", "in", "Morocco"];

/* Count up 0 → target over `duration` ms once in view */
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
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#0A0A0F]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-white.png" alt="SmartRecruit AI" className="h-10 w-auto" />
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" className="font-medium text-white hover:bg-white/10 hover:text-white">Log in</Button>
            </Link>
            <Link href="/register">
              <Button variant="gradient">Get started free</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero (video background) ── */}
      <section className="relative min-h-screen overflow-hidden flex flex-col items-center justify-center text-center px-6">
        {/* Video */}
        <video
          autoPlay muted loop playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-30"
        >
          <source src="/hero-bg.mp4" type="video/mp4" />
        </video>
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0F]/70 via-[#0A0A0F]/50 to-[#0A0A0F]" />
        {/* Floating blobs */}
        <div className="blob blob-1" />
        <div className="blob blob-2" />

        <div className="relative z-10 max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 mb-8 backdrop-blur-sm"
          >
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-semibold text-white/80 uppercase tracking-wider">
              AI-Powered Recruitment Platform
            </span>
          </motion.div>

          <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight mb-6 leading-[1.1]">
            <span className="inline-flex flex-wrap justify-center gap-x-3">
              {HEADLINE.map((word, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1, duration: 0.5 }}
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
              transition={{ delay: HEADLINE.length * 0.1, duration: 0.5 }}
            >
              powered by AI
            </motion.span>
          </h1>

          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8, duration: 0.6 }}
            className="text-lg text-white/70 max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Upload your CV, get your skills extracted automatically, and receive
            personalized job recommendations with real compatibility scores.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1, duration: 0.5 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link href="/register">
              <Button size="lg" variant="gradient" className="pulse-glow gap-2 px-8 h-12 text-base">
                Start for free <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="gap-2 px-8 h-12 text-base bg-white/5 border-white/15 text-white hover:bg-white/10 hover:text-white">
                Sign in to dashboard
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ── Stats (count up on scroll) ── */}
      <motion.section
        variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
        className="border-y border-white/10 bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600"
      >
        <div className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {stats.map(({ value, suffix, label, icon: Icon }) => (
            <div key={label} className="text-white">
              <div className="flex justify-center mb-2">
                <Icon className="w-5 h-5 text-white/70" />
              </div>
              <p className="text-3xl font-extrabold"><CountUp target={value} suffix={suffix} /></p>
              <p className="text-sm text-white/70 mt-1">{label}</p>
            </div>
          ))}
        </div>
      </motion.section>

      {/* ── Features ── */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-16">
          <Badge variant="secondary" className="mb-4 bg-white/10 text-white border-0">Features</Badge>
          <h2 className="text-3xl font-bold mb-4">Everything you need to land a job</h2>
          <p className="text-white/60 max-w-xl mx-auto">
            Three powerful tools working together to give you an unfair advantage in the Moroccan job market.
          </p>
        </motion.div>
        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true }}
          variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {features.map(({ icon: Icon, title, desc, color }) => (
            <motion.div
              key={title}
              variants={fadeUp}
              className="rounded-2xl p-8 space-y-4 bg-white/5 border border-white/10 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-primary/40"
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-lg`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-bold text-xl">{title}</h3>
              <p className="text-white/60 leading-relaxed">{desc}</p>
              <div className="flex items-center gap-1.5 text-sm font-medium text-primary">
                <span>Learn more</span><ArrowRight className="w-3.5 h-3.5" />
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── How it works ── */}
      <section className="border-y border-white/10 bg-white/[0.02]">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-16">
            <Badge variant="secondary" className="mb-4 bg-white/10 text-white border-0">How It Works</Badge>
            <h2 className="text-3xl font-bold">Up and running in 3 minutes</h2>
          </motion.div>
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true }}
            variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8 relative"
          >
            <div className="hidden md:block absolute top-8 left-1/3 right-1/3 h-px bg-gradient-to-r from-indigo-400/40 via-violet-400/40 to-purple-400/40" />
            {steps.map(({ num, title, desc }) => (
              <motion.div key={num} variants={fadeUp} className="relative text-center space-y-4">
                <div className="w-16 h-16 gradient-bg rounded-2xl flex items-center justify-center mx-auto shadow-xl shadow-indigo-500/25">
                  <span className="text-white font-black text-lg">{num}</span>
                </div>
                <h3 className="font-bold text-lg">{title}</h3>
                <p className="text-white/60 text-sm leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <motion.div
          variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
          className="relative rounded-3xl gradient-bg p-12 text-center overflow-hidden shadow-2xl shadow-indigo-500/30"
        >
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
        </motion.div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/10 bg-[#0A0A0F]">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-white/50">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-white.png" alt="SmartRecruit AI" className="h-7 w-auto" />
            <span>— PFE Project 2026</span>
          </div>
          <p>Built with FastAPI + Next.js 15 + AI Matching</p>
        </div>
      </footer>
    </div>
  );
}
