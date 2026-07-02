"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { OnboardingTour } from "@/components/layout/OnboardingTour";
import { VideoModal } from "@/components/layout/VideoModal";
import { useAuthStore } from "@/lib/store/authStore";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Zustand persist rehydrates from localStorage asynchronously after the first
  // render. Without this flag the layout fires router.push("/login") before the
  // stored token is available, logging out the user on every page refresh.
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => { setHydrated(true); }, []);

  useEffect(() => {
    if (hydrated && !isAuthenticated) {
      router.push("/login");
    }
  }, [hydrated, isAuthenticated, router]);

  if (!hydrated) return null;   // wait for localStorage → store sync
  if (!isAuthenticated) return null;

  return (
    <div className="flex min-h-screen bg-background">
      <OnboardingTour />
      <VideoModal />
      {/* Desktop sidebar — always visible on lg+, collapsible */}
      <Sidebar />

      {/* Mobile drawer */}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar onMenuToggle={() => setSidebarOpen((v) => !v)} />
        <main className="flex-1 p-4 sm:p-5 md:p-8 overflow-auto bg-background overflow-x-hidden">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
