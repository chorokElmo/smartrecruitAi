"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { HelpCircle, ChevronDown, ChevronUp, Mail, BookOpen, Rocket } from "lucide-react";

const faqs = [
  {
    q: "Comment fonctionne le matching IA ?",
    a: "Notre algorithme compare vos compétences, diplôme, domaine et expérience extraits de votre CV avec les exigences de chaque offre. Il calcule un score de compatibilité sémantique pour chaque poste.",
  },
  {
    q: "Comment importer mon CV ?",
    a: "Rendez-vous sur la page « Mon CV », cliquez sur « Importer un CV » et téléchargez votre fichier PDF. L'IA extrait automatiquement vos informations.",
  },
  {
    q: "Mes données sont-elles en sécurité ?",
    a: "Oui. Vos données sont stockées de façon sécurisée et ne sont jamais partagées avec des tiers sans votre consentement.",
  },
  {
    q: "Comment sauvegarder une offre ?",
    a: "Sur la page d'une offre, cliquez sur l'icône favoris. L'offre apparaîtra dans votre page « Offres sauvegardées ».",
  },
  {
    q: "Puis-je modifier mes compétences manuellement ?",
    a: "Oui. Dans la page « Mon CV » ou « Profil », vous pouvez ajouter, modifier ou supprimer des compétences.",
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-4 text-left gap-4"
      >
        <span className="text-sm font-medium">{q}</span>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
      </button>
      {open && <p className="text-sm text-muted-foreground pb-4 leading-relaxed">{a}</p>}
    </div>
  );
}

export default function HelpPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-xl font-bold">Aide & Support</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Trouvez des réponses à vos questions</p>
      </motion.div>

      {/* Quick links */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { icon: Rocket,      title: "Démarrage rapide",   desc: "Configurez votre profil en 3 minutes" },
          { icon: BookOpen, title: "Guide utilisateur",   desc: "Toutes les fonctionnalités expliquées" },
          { icon: Mail,     title: "Contacter le support", desc: "Réponse sous 24h" },
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="card-base p-4 flex flex-col gap-2 hover:border-primary/30 transition-colors cursor-pointer">
            <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center">
              <Icon className="w-4 h-4 text-white" />
            </div>
            <p className="text-sm font-semibold">{title}</p>
            <p className="text-xs text-muted-foreground">{desc}</p>
          </div>
        ))}
      </motion.div>

      {/* FAQ */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card-base p-6">
        <div className="flex items-center gap-2 mb-4">
          <HelpCircle className="w-4 h-4 text-primary" />
          <h2 className="font-semibold">Questions fréquentes</h2>
        </div>
        {faqs.map((f) => <FaqItem key={f.q} q={f.q} a={f.a} />)}
      </motion.div>

      {/* Contact */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="card-base p-6 text-center">
        <p className="text-sm text-muted-foreground">Vous n&apos;avez pas trouvé votre réponse ?</p>
        <a href="mailto:support@smartrecruit.ai" className="text-sm font-semibold text-primary hover:underline mt-1 block">
          support@smartrecruit.ai
        </a>
      </motion.div>
    </div>
  );
}
