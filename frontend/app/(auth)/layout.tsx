import Link from "next/link";
import { Briefcase } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-muted/40 flex flex-col items-center justify-center p-4">
      <Link href="/" className="flex items-center gap-2 mb-8">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <Briefcase className="w-4 h-4 text-primary-foreground" />
        </div>
        <span className="font-bold text-lg">SmartRecruit AI</span>
      </Link>
      {children}
    </div>
  );
}
