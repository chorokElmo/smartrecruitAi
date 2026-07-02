"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/authStore";
import { cvApi } from "@/lib/api/cv";
import { recommendationsApi } from "@/lib/api/recommendations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, X, Download, Target, Phone, Mail, MapPin, Globe, Linkedin } from "lucide-react";

function loadHtml2Pdf(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject("no window");
  const w = window as any;
  if (w.html2pdf) return Promise.resolve(w.html2pdf);
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
    s.onload = () => resolve(w.html2pdf);
    s.onerror = () => reject(new Error("html2pdf load failed"));
    document.body.appendChild(s);
  });
}

interface Edu { diploma: string; school: string; year: string }
interface Exp { role: string; company: string; period: string; desc: string }
interface Ref { name: string; role: string; phone: string; email: string }

const Field = ({ label, value, set, ph, multi }: { label: string; value: string; set: (v: string) => void; ph?: string; multi?: boolean }) => (
  <div className="space-y-1">
    <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
    {multi
      ? <textarea className="w-full text-sm rounded-md border border-input bg-background p-2 h-20 resize-none" value={value} placeholder={ph} onChange={(e) => set(e.target.value)} />
      : <Input className="h-9 text-sm" value={value} placeholder={ph} onChange={(e) => set(e.target.value)} />}
  </div>
);

export default function CvBuilderPage() {
  const router     = useRouter();
  const user       = useAuthStore((s) => s.user);
  const previewRef = useRef<HTMLDivElement>(null);

  const [photo,    setPhoto]    = useState<string | null>(null);
  const [nom,      setNom]      = useState("");
  const [prenom,   setPrenom]   = useState("");
  const [titre,    setTitre]    = useState("");
  const [resume,   setResume]   = useState("");
  const [phone,    setPhone]    = useState("");
  const [email,    setEmail]    = useState("");
  const [ville,    setVille]    = useState("");
  const [website,  setWebsite]  = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [skills,   setSkills]   = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState("");
  const [langs,    setLangs]    = useState<string[]>([]);
  const [newLang,  setNewLang]  = useState("");
  const [edu,      setEdu]      = useState<Edu[]>([]);
  const [exp,      setExp]      = useState<Exp[]>([]);
  const [refs,     setRefs]     = useState<Ref[]>([]);
  const [busy,     setBusy]     = useState(false);

  useEffect(() => {
    if (user) {
      setNom(user.last_name || "");
      setPrenom(user.first_name || "");
      setTitre(user.domain || "");
      setEmail(user.email || "");
      setSkills(user.skills || []);
      if (user.diploma) setEdu([{ diploma: user.diploma, school: "", year: "" }]);
      if (user.years_experience) setExp([{ role: user.domain || "", company: "", period: `${user.years_experience} ans d'expérience`, desc: "" }]);
      setLangs(["Arabe", "Français", "Anglais"]);
    }
    cvApi.getLatest().then(({ data }) => {
      if (data?.extracted_skills?.length) setSkills((s) => Array.from(new Set([...s, ...data.extracted_skills])));
    }).catch(() => {});
  }, [user]);

  const onPhoto = (f?: File) => {
    if (!f) return;
    const r = new FileReader();
    r.onload = () => setPhoto(r.result as string);
    r.readAsDataURL(f);
  };

  const exportPdf = async () => {
    const html2pdf = await loadHtml2Pdf();
    await html2pdf().set({
      margin: 0, filename: `cv-${prenom || "mon"}-${nom || "cv"}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    }).from(previewRef.current!).save();
  };

  const useForMatching = async () => {
    setBusy(true);
    try {
      const html2pdf = await loadHtml2Pdf();
      const blob: Blob = await html2pdf().set({
        margin: 0, image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      }).from(previewRef.current!).outputPdf("blob");
      const file = new File([blob], "cv-builder.pdf", { type: "application/pdf" });
      await cvApi.upload(file);
      try { await recommendationsApi.generate(); } catch { /* ignore */ }
      router.push("/dashboard");
    } finally {
      setBusy(false);
    }
  };

  const addSkill = () => { if (newSkill.trim()) { setSkills([...skills, newSkill.trim()]); setNewSkill(""); } };
  const addLang  = () => { if (newLang.trim())  { setLangs([...langs, newLang.trim()]);   setNewLang("");  } };

  // ── Template colors (Black White Minimalist) ──────────────────────────────
  const BLK = "#111111";
  const GRY = "#f5f5f5";
  const ACC = "#111111";

  return (
    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-6">

      {/* ── LEFT: form ─────────────────────────────────────────────────────── */}
      <div className="space-y-4 lg:max-h-[calc(100vh-120px)] lg:overflow-y-auto lg:pr-2 pb-24">
        <h1 className="text-xl font-bold">Créateur de CV</h1>
        <p className="text-sm text-muted-foreground">Remplissez les champs — le CV se met à jour en temps réel.</p>

        {/* Photo */}
        <div className="card-base p-4 space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Photo</p>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-muted overflow-hidden flex items-center justify-center text-xs text-muted-foreground border">
              {photo ? <img src={photo} alt="" className="w-full h-full object-cover" /> : "Photo"}
            </div>
            <input type="file" accept="image/*" onChange={(e) => onPhoto(e.target.files?.[0])} className="text-xs text-muted-foreground" />
          </div>
        </div>

        {/* Identity */}
        <div className="card-base p-4 space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Identité</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Prénom" value={prenom} set={setPrenom} ph="Ex: Youssef" />
            <Field label="Nom" value={nom} set={setNom} ph="Ex: Alami" />
          </div>
          <Field label="Titre du poste" value={titre} set={setTitre} ph="Ex: Développeur Full Stack" />
          <Field label="Résumé professionnel" value={resume} set={setResume} ph="Décrivez votre profil en 2–3 phrases…" multi />
        </div>

        {/* Contact */}
        <div className="card-base p-4 space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Contact</p>
          <Field label="Téléphone" value={phone} set={setPhone} ph="+212 6XX XXX XXX" />
          <Field label="Email" value={email} set={setEmail} ph="vous@exemple.com" />
          <Field label="Ville" value={ville} set={setVille} ph="Casablanca, Maroc" />
          <Field label="Site web" value={website} set={setWebsite} ph="www.monsite.com" />
          <Field label="LinkedIn" value={linkedin} set={setLinkedin} ph="linkedin.com/in/monprofil" />
        </div>

        {/* Skills */}
        <div className="card-base p-4 space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Compétences</p>
          <div className="flex gap-2">
            <Input className="h-9 text-sm" value={newSkill} placeholder="Ex: React, Python…"
              onChange={(e) => setNewSkill(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }} />
            <Button type="button" variant="outline" className="h-9 shrink-0" onClick={addSkill}><Plus className="w-4 h-4" /></Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {skills.map((s, i) => (
              <span key={i} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-muted font-medium">
                {s}<button onClick={() => setSkills(skills.filter((_, j) => j !== i))}><X className="w-3 h-3 ml-0.5 text-muted-foreground hover:text-red-500" /></button>
              </span>
            ))}
          </div>
        </div>

        {/* Languages */}
        <div className="card-base p-4 space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Langues</p>
          <div className="flex gap-2">
            <Input className="h-9 text-sm" value={newLang} placeholder="Ex: Anglais, Espagnol…"
              onChange={(e) => setNewLang(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addLang(); } }} />
            <Button type="button" variant="outline" className="h-9 shrink-0" onClick={addLang}><Plus className="w-4 h-4" /></Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {langs.map((l, i) => (
              <span key={i} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-muted font-medium">
                {l}<button onClick={() => setLangs(langs.filter((_, j) => j !== i))}><X className="w-3 h-3 ml-0.5 text-muted-foreground hover:text-red-500" /></button>
              </span>
            ))}
          </div>
        </div>

        {/* Education */}
        <div className="card-base p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Formation</p>
            <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1"
              onClick={() => setEdu([...edu, { diploma: "", school: "", year: "" }])}>
              <Plus className="w-3 h-3" />Ajouter
            </Button>
          </div>
          {edu.length === 0 && <p className="text-xs text-muted-foreground italic">Aucune formation ajoutée.</p>}
          {edu.map((e, i) => (
            <div key={i} className="space-y-2 border-t border-border pt-3">
              <Input className="h-8 text-xs" placeholder="Diplôme — Ex: Master Informatique" value={e.diploma}
                onChange={(ev) => setEdu(edu.map((x, j) => j === i ? { ...x, diploma: ev.target.value } : x))} />
              <Input className="h-8 text-xs" placeholder="École / Université — Ex: ENSIAS Rabat" value={e.school}
                onChange={(ev) => setEdu(edu.map((x, j) => j === i ? { ...x, school: ev.target.value } : x))} />
              <Input className="h-8 text-xs" placeholder="Année — Ex: 2018 – 2021" value={e.year}
                onChange={(ev) => setEdu(edu.map((x, j) => j === i ? { ...x, year: ev.target.value } : x))} />
              <button onClick={() => setEdu(edu.filter((_, j) => j !== i))} className="text-[10px] text-red-500 hover:underline">Supprimer</button>
            </div>
          ))}
        </div>

        {/* Experience */}
        <div className="card-base p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Expériences</p>
            <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1"
              onClick={() => setExp([...exp, { role: "", company: "", period: "", desc: "" }])}>
              <Plus className="w-3 h-3" />Ajouter
            </Button>
          </div>
          {exp.length === 0 && <p className="text-xs text-muted-foreground italic">Aucune expérience ajoutée.</p>}
          {exp.map((e, i) => (
            <div key={i} className="space-y-2 border-t border-border pt-3">
              <Input className="h-8 text-xs" placeholder="Poste — Ex: Développeur Front-end" value={e.role}
                onChange={(ev) => setExp(exp.map((x, j) => j === i ? { ...x, role: ev.target.value } : x))} />
              <Input className="h-8 text-xs" placeholder="Entreprise — Ex: OCP Group, Casablanca" value={e.company}
                onChange={(ev) => setExp(exp.map((x, j) => j === i ? { ...x, company: ev.target.value } : x))} />
              <Input className="h-8 text-xs" placeholder="Période — Ex: Jan 2022 – Présent" value={e.period}
                onChange={(ev) => setExp(exp.map((x, j) => j === i ? { ...x, period: ev.target.value } : x))} />
              <textarea className="w-full text-xs rounded-md border border-input bg-background p-2 h-16 resize-none"
                placeholder="Description — missions, réalisations…" value={e.desc}
                onChange={(ev) => setExp(exp.map((x, j) => j === i ? { ...x, desc: ev.target.value } : x))} />
              <button onClick={() => setExp(exp.filter((_, j) => j !== i))} className="text-[10px] text-red-500 hover:underline">Supprimer</button>
            </div>
          ))}
        </div>

        {/* References */}
        <div className="card-base p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Références</p>
            <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1"
              onClick={() => setRefs([...refs, { name: "", role: "", phone: "", email: "" }])}>
              <Plus className="w-3 h-3" />Ajouter
            </Button>
          </div>
          {refs.length === 0 && <p className="text-xs text-muted-foreground italic">Aucune référence ajoutée.</p>}
          {refs.map((r, i) => (
            <div key={i} className="space-y-2 border-t border-border pt-3">
              <Input className="h-8 text-xs" placeholder="Nom — Ex: Mohammed Benali" value={r.name}
                onChange={(ev) => setRefs(refs.map((x, j) => j === i ? { ...x, name: ev.target.value } : x))} />
              <Input className="h-8 text-xs" placeholder="Poste & Entreprise — Ex: DRH chez Maroc Telecom" value={r.role}
                onChange={(ev) => setRefs(refs.map((x, j) => j === i ? { ...x, role: ev.target.value } : x))} />
              <Input className="h-8 text-xs" placeholder="Téléphone" value={r.phone}
                onChange={(ev) => setRefs(refs.map((x, j) => j === i ? { ...x, phone: ev.target.value } : x))} />
              <Input className="h-8 text-xs" placeholder="Email" value={r.email}
                onChange={(ev) => setRefs(refs.map((x, j) => j === i ? { ...x, email: ev.target.value } : x))} />
              <button onClick={() => setRefs(refs.filter((_, j) => j !== i))} className="text-[10px] text-red-500 hover:underline">Supprimer</button>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-2 sticky bottom-0 bg-background py-3 border-t border-border">
          <Button onClick={exportPdf} className="flex-1 h-10 gradient-bg text-white border-0 gap-2 text-sm font-semibold"
            style={{ boxShadow: "var(--shadow-primary)" }}>
            <Download className="w-4 h-4" />Télécharger PDF
          </Button>
          <Button onClick={useForMatching} disabled={busy} variant="outline" className="flex-1 h-10 gap-2 text-sm">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Target className="w-4 h-4" />}
            Pour le matching
          </Button>
        </div>
      </div>

      {/* ── RIGHT: A4 live preview — Black White Minimalist ──────────────────── */}
      <div className="overflow-x-auto">
        <div
          ref={previewRef}
          style={{
            width: 794, minHeight: 1123, background: "#fff",
            fontFamily: "Georgia, 'Times New Roman', serif",
            color: BLK, position: "relative",
          }}
        >
          {/* ── HEADER ── */}
          <div style={{ background: BLK, padding: "40px 48px 32px", display: "flex", alignItems: "center", gap: 28 }}>
            {photo && (
              <div style={{ width: 90, height: 90, borderRadius: "50%", overflow: "hidden", border: "3px solid #fff", flexShrink: 0 }}>
                <img src={photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
            )}
            <div>
              <div style={{ fontSize: 32, fontWeight: 800, color: "#fff", letterSpacing: 2, lineHeight: 1.1 }}>
                {(prenom || nom) ? `${prenom.toUpperCase()} ${nom.toUpperCase()}` : "VOTRE NOM COMPLET"}
              </div>
              <div style={{ fontSize: 13, color: "#ccc", marginTop: 6, letterSpacing: 4, textTransform: "uppercase" }}>
                {titre || "Titre du poste"}
              </div>
            </div>
          </div>

          {/* ── CONTACT BAR ── */}
          <div style={{ background: "#222", padding: "10px 48px", display: "flex", flexWrap: "wrap", gap: "8px 24px" }}>
            {(phone || "[+212 6XX XXX XXX]").split("").length > 0 && (
              <span style={{ fontSize: 11, color: "#ddd", display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ fontSize: 10 }}>☏</span> {phone || "+212 6XX XXX XXX"}
              </span>
            )}
            <span style={{ fontSize: 11, color: "#ddd", display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ fontSize: 10 }}>✉</span> {email || "email@exemple.com"}
            </span>
            {ville && <span style={{ fontSize: 11, color: "#ddd" }}>📍 {ville}</span>}
            {website && <span style={{ fontSize: 11, color: "#ddd" }}>🌐 {website}</span>}
            {linkedin && <span style={{ fontSize: 11, color: "#ddd" }}>in {linkedin}</span>}
          </div>

          {/* ── BODY: two columns ── */}
          <div style={{ display: "grid", gridTemplateColumns: "35% 65%" }}>

            {/* LEFT COLUMN */}
            <div style={{ background: GRY, padding: "28px 24px", borderRight: "1px solid #e0e0e0" }}>

              {/* Profile summary */}
              {resume && (
                <>
                  <SectionTitle color={ACC}>Profil</SectionTitle>
                  <p style={{ fontSize: 11, lineHeight: 1.7, color: "#444", marginBottom: 20 }}>{resume}</p>
                </>
              )}

              {/* Skills */}
              <SectionTitle color={ACC}>Compétences</SectionTitle>
              <div style={{ marginBottom: 20 }}>
                {(skills.length ? skills : ["Ex: React", "Node.js", "Python"]).map((s, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: BLK, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: "#333" }}>{s}</span>
                  </div>
                ))}
              </div>

              {/* Languages */}
              <SectionTitle color={ACC}>Langues</SectionTitle>
              <div style={{ marginBottom: 20 }}>
                {(langs.length ? langs : ["Arabe", "Français", "Anglais"]).map((l, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: BLK, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: "#333" }}>{l}</span>
                  </div>
                ))}
              </div>

              {/* Education */}
              <SectionTitle color={ACC}>Formation</SectionTitle>
              <div style={{ marginBottom: 20 }}>
                {(edu.length ? edu : [{ diploma: "Votre diplôme", school: "Université", year: "2020 – 2023" }]).map((e, i) => (
                  <div key={i} style={{ marginBottom: 14 }}>
                    {e.year && <div style={{ fontSize: 10, color: "#888", marginBottom: 2 }}>{e.year}</div>}
                    <div style={{ fontSize: 12, fontWeight: 700, color: BLK }}>{e.diploma || "Diplôme"}</div>
                    <div style={{ fontSize: 11, color: "#555" }}>{e.school}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div style={{ padding: "28px 32px" }}>

              {/* Experience */}
              <SectionTitle color={ACC}>Expérience Professionnelle</SectionTitle>
              <div style={{ marginBottom: 24 }}>
                {(exp.length ? exp : [{ role: "Votre poste", company: "Entreprise — Casablanca", period: "Jan 2022 – Présent", desc: "Décrivez vos missions et réalisations ici." }]).map((e, i) => (
                  <div key={i} style={{ marginBottom: 18, paddingLeft: 14, borderLeft: `3px solid ${BLK}` }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: BLK }}>{e.role || "Poste"}</div>
                    <div style={{ fontSize: 11, color: "#555", marginBottom: 3 }}>{e.company}</div>
                    {e.period && <div style={{ fontSize: 10, color: "#888", marginBottom: 5, fontStyle: "italic" }}>{e.period}</div>}
                    {e.desc && <div style={{ fontSize: 11, color: "#444", lineHeight: 1.6 }}>{e.desc}</div>}
                  </div>
                ))}
              </div>

              {/* References */}
              {refs.length > 0 && (
                <>
                  <SectionTitle color={ACC}>Références</SectionTitle>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    {refs.map((r, i) => (
                      <div key={i} style={{ background: GRY, padding: "10px 12px", borderRadius: 6 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: BLK }}>{r.name}</div>
                        <div style={{ fontSize: 11, color: "#555" }}>{r.role}</div>
                        {r.phone && <div style={{ fontSize: 10, color: "#777", marginTop: 4 }}>{r.phone}</div>}
                        {r.email && <div style={{ fontSize: 10, color: "#777" }}>{r.email}</div>}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <div style={{
      fontSize: 12, fontWeight: 800, color, textTransform: "uppercase",
      letterSpacing: 2, borderBottom: `2px solid ${color}`,
      paddingBottom: 4, marginBottom: 12,
    }}>
      {children}
    </div>
  );
}
