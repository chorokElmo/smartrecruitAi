"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";

export function CvGate({ variant }: { variant: "dashboard" | "jobs" }) {
  return (
    <div className="max-w-xl mx-auto py-20 text-center">
      <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center mx-auto mb-6"
           style={{ boxShadow: "var(--shadow-primary)" }}>
        <Upload className="w-8 h-8 text-white" />
      </div>
      {variant === "dashboard" ? (
        <>
          <h1 className="text-2xl font-bold mb-3">Bienvenue sur SmartRecruit AI</h1>
          <p className="text-muted-foreground leading-relaxed mb-8">
            Pour commencer, uploadez votre CV.<br />
            Nous extrairons automatiquement vos compétences, diplôme et expérience
            pour trouver vos meilleurs matches.
          </p>
        </>
      ) : (
        <p className="text-lg font-medium mb-8">
          Uploadez votre CV pour voir les offres qui correspondent à votre profil.
        </p>
      )}
      <Link href="/cv">
        <Button className="gradient-bg text-white border-0 h-12 px-8 text-base font-semibold gap-2"
                style={{ boxShadow: "var(--shadow-primary)" }}>
          <Upload className="w-5 h-5" />Uploader mon CV
        </Button>
      </Link>
    </div>
  );
}
