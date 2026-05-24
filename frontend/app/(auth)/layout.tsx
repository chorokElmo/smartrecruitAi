import Link from "next/link";
import { Briefcase, Brain, Target, Zap } from "lucide-react";

const highlights = [
  { icon: Brain,  text: "AI extracts your skills from any CV in seconds" },
  { icon: Target, text: "Real compatibility scores for every job listing" },
  { icon: Zap,    text: "Personalized recommendations updated instantly" },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      {/* Left panel — gradient brand side */}
      <div className="hidden lg:flex lg:w-[45%] gradient-bg flex-col justify-between p-12 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full -translate-y-1/3 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/5 rounded-full translate-y-1/3 -translate-x-1/3" />

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 relative z-10">
          <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
            <Briefcase className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl text-white">SmartRecruit AI</span>
        </Link>

        {/* Middle content */}
        <div className="relative z-10 space-y-8">
          <div>
            <h2 className="text-3xl font-extrabold text-white leading-tight mb-3">
              Your AI-powered<br />career companion
            </h2>
            <p className="text-white/70 leading-relaxed">
              The smartest way for Moroccan professionals to find their next opportunity.
            </p>
          </div>
          <div className="space-y-4">
            {highlights.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <p className="text-white/80 text-sm">{text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom quote */}
        <p className="text-white/40 text-xs relative z-10">
          © 2026 SmartRecruit AI — PFE Project
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-background">
        {/* Mobile logo */}
        <Link href="/" className="flex items-center gap-2 mb-8 lg:hidden">
          <div className="w-8 h-8 rounded-xl gradient-bg flex items-center justify-center">
            <Briefcase className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg">SmartRecruit AI</span>
        </Link>
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  );
}
