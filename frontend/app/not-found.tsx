import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Briefcase, ArrowLeft, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
      {/* Logo */}
      <div className="w-14 h-14 rounded-2xl gradient-bg flex items-center justify-center mb-8 shadow-xl shadow-indigo-500/30">
        <Briefcase className="w-7 h-7 text-white" />
      </div>

      {/* Code */}
      <p className="text-7xl font-black gradient-text mb-4">404</p>

      {/* Message */}
      <h1 className="text-2xl font-bold mb-2">Page not found</h1>
      <p className="text-muted-foreground max-w-xs leading-relaxed mb-8">
        This page does not exist or has been moved. Let us get you back on track.
      </p>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Link href="/dashboard">
          <Button
            className="gradient-bg text-white border-0 h-10 px-6 gap-2"
            style={{ boxShadow: "var(--shadow-primary)" }}
          >
            <ArrowLeft className="w-4 h-4" />Back to Dashboard
          </Button>
        </Link>
        <Link href="/jobs">
          <Button variant="outline" className="h-10 px-6 gap-2">
            <Search className="w-4 h-4" />Browse Jobs
          </Button>
        </Link>
      </div>
    </div>
  );
}
