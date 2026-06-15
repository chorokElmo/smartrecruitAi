"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useOnboardingStore } from "@/lib/store/onboardingStore";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Joyride: any = dynamic(() => import("react-joyride").then((m) => m.Joyride), { ssr: false });

const STEPS = [
  { target: '[data-tour="cv"]',       content: "📄 Uploadez votre CV ici pour extraire vos compétences automatiquement" },
  { target: '[data-tour="generate"]', content: "🎯 Générez vos recommandations personnalisées" },
  { target: '[data-tour="jobs"]',     content: "💼 Explorez les offres qui correspondent à votre profil" },
  { target: '[data-tour="chart"]',    content: "📊 Suivez votre progression ici" },
];

export function OnboardingTour() {
  const { run, completed, start, complete } = useOnboardingStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (mounted && !completed) start();
  }, [mounted, completed, start]);

  if (!mounted) return null;

  const handle = (data: { status?: string }) => {
    if (data.status && ["finished", "skipped"].includes(data.status)) complete();
  };

  return (
    <Joyride
      steps={STEPS}
      run={run}
      continuous
      showProgress
      showSkipButton
      callback={handle}
      locale={{ back: "Retour", close: "Fermer", last: "Terminer", next: "Suivant", skip: "Passer" }}
      styles={{ options: { primaryColor: "#6366f1", zIndex: 10000 } }}
    />
  );
}
