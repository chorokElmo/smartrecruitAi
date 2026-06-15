"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/authStore";
import { cvApi } from "@/lib/api/cv";
import { recommendationsApi } from "@/lib/api/recommendations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, X, Download, Target } from "lucide-react";

const SIDEBAR = "#2C3E50";
const PURPLE  = "#6B4EFF";

// Load html2pdf.js from CDN at runtime (kept out of the webpack graph to avoid
// pulling jsPDF + html2canvas into this route's bundle).
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

interface Edu { diploma: string; school: string; from: string; to: string }
interface Exp { role: string; company: string; city: string; from: string; to: string; desc: string }
interface Ref { name: string; role: string; company: string; phone: string; email: string }

export default function CvBuilderPage() {
  const router  = useRouter();
  const user    = useAuthStore((s) => s.user);
  const previewRef = useRef<HTMLDivElement>(null);

  const [photo, setPhoto]   = useState<string | null>(null);
  const [nom, setNom]       = useState("");
  const [prenom, setPrenom] = useState("");
  const [titre, setTitre]   = useState("");
  const [resume, setResume] = useState("");
  const [phone, setPhone]   = useState("");
  const [email, setEmail]   = useState("");
  const [ville, setVille]   = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState("");
  const [langs, setLangs]   = useState<string[]>([]);
  const [newLang, setNewLang] = useState("");
  const [edu, setEdu]       = useState<Edu[]>([]);
  const [exp, setExp]       = useState<Exp[]>([]);
  const [refs, setRefs]     = useState<Ref[]>([]);
  const [busy, setBusy]     = useState(false);

  useEffect(() => {
    if (user) {
      setNom(user.last_name || "");
      setPrenom(user.first_name || "");
      setTitre(user.domain || "");
      setEmail(user.email || "");
      setSkills(user.skills || []);
      if (user.diploma) setEdu([{ diploma: user.diploma, school: "", from: "", to: "" }]);
      if (user.years_experience) setExp([{ role: user.domain || "", company: "", city: "", from: "", to: `${user.years_experience} ans`, desc: "" }]);
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
      margin: 0, filename: "cv.pdf", image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    }).from(previewRef.current!).save();
  };

  const useForMatching = async () => {
    setBusy(true);
    try {
      const html2pdf = await loadHtml2Pdf();
      const blob: Blob = await html2pdf().set({
        margin: 0, image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      }).from(previewRef.current!).outputPdf("blob");
      const file = new File([blob], "cv-builder.pdf", { type: "application/pdf" });
      await cvApi.upload(file);
      try { await recommendationsApi.generate(); } catch { /* ignore */ }
      router.push("/dashboard");
    } finally {
      setBusy(false);
    }
  };

  const Field = ({ label, value, set, ph }: { label: string; value: string; set: (v: string) => void; ph?: string }) => (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <Input className="h-9 text-sm" value={value} placeholder={ph} onChange={(e) => set(e.target.value)} />
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[40%_60%] gap-6">
      {/* ── LEFT: form ── */}
      <div className="space-y-5 lg:max-h-[calc(100vh-120px)] lg:overflow-y-auto pr-2">
        <h1 className="text-xl font-bold">Créateur de CV</h1>

        {/* Photo */}
        <div className="card-base p-4 space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Photo</label>
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-muted overflow-hidden flex items-center justify-center text-xs text-muted-foreground">
              {photo ? <img src={photo} alt="" className="w-full h-full object-cover" /> : "Photo"}
            </div>
            <input type="file" accept="image/*" onChange={(e) => onPhoto(e.target.files?.[0])} className="text-xs" />
          </div>
        </div>

        {/* Identity */}
        <div className="card-base p-4 grid grid-cols-2 gap-3">
          <Field label="Prénom" value={prenom} set={setPrenom} />
          <Field label="Nom" value={nom} set={setNom} />
          <div className="col-span-2"><Field label="Titre du poste" value={titre} set={setTitre} /></div>
          <div className="col-span-2 space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Résumé</label>
            <textarea className="w-full text-sm rounded-md border border-input bg-background p-2 h-20" value={resume} onChange={(e) => setResume(e.target.value)} />
          </div>
        </div>

        {/* Contact */}
        <div className="card-base p-4 grid grid-cols-1 gap-3">
          <Field label="Téléphone" value={phone} set={setPhone} />
          <Field label="Email" value={email} set={setEmail} />
          <Field label="Ville" value={ville} set={setVille} />
        </div>

        {/* Skills */}
        <div className="card-base p-4 space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Compétences</label>
          <div className="flex gap-2">
            <Input className="h-9 text-sm" value={newSkill} onChange={(e) => setNewSkill(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (newSkill.trim()) { setSkills([...skills, newSkill.trim()]); setNewSkill(""); } } }} placeholder="Ajouter…" />
            <Button type="button" variant="outline" className="h-9 shrink-0" onClick={() => { if (newSkill.trim()) { setSkills([...skills, newSkill.trim()]); setNewSkill(""); } }}><Plus className="w-4 h-4" /></Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {skills.map((s, i) => (
              <span key={i} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs" style={{ background: PURPLE + "22", color: PURPLE }}>
                {s}<button onClick={() => setSkills(skills.filter((_, j) => j !== i))}><X className="w-3 h-3" /></button>
              </span>
            ))}
          </div>
        </div>

        {/* Languages */}
        <div className="card-base p-4 space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Langues</label>
          <div className="flex gap-2">
            <Input className="h-9 text-sm" value={newLang} onChange={(e) => setNewLang(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (newLang.trim()) { setLangs([...langs, newLang.trim()]); setNewLang(""); } } }} placeholder="Ajouter une langue…" />
            <Button type="button" variant="outline" className="h-9 shrink-0" onClick={() => { if (newLang.trim()) { setLangs([...langs, newLang.trim()]); setNewLang(""); } }}><Plus className="w-4 h-4" /></Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {langs.map((l, i) => (
              <span key={i} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-muted">
                {l}<button onClick={() => setLangs(langs.filter((_, j) => j !== i))}><X className="w-3 h-3" /></button>
              </span>
            ))}
          </div>
        </div>

        {/* Education */}
        <div className="card-base p-4 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-muted-foreground">Formation</label>
            <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setEdu([...edu, { diploma: "", school: "", from: "", to: "" }])}><Plus className="w-3 h-3" />Ajouter</Button>
          </div>
          {edu.map((e, i) => (
            <div key={i} className="grid grid-cols-2 gap-2 border-t border-border pt-2">
              <Input className="h-8 text-xs col-span-2" placeholder="Diplôme" value={e.diploma} onChange={(ev) => setEdu(edu.map((x, j) => j === i ? { ...x, diploma: ev.target.value } : x))} />
              <Input className="h-8 text-xs col-span-2" placeholder="École" value={e.school} onChange={(ev) => setEdu(edu.map((x, j) => j === i ? { ...x, school: ev.target.value } : x))} />
              <Input className="h-8 text-xs" placeholder="De" value={e.from} onChange={(ev) => setEdu(edu.map((x, j) => j === i ? { ...x, from: ev.target.value } : x))} />
              <Input className="h-8 text-xs" placeholder="À" value={e.to} onChange={(ev) => setEdu(edu.map((x, j) => j === i ? { ...x, to: ev.target.value } : x))} />
              <button onClick={() => setEdu(edu.filter((_, j) => j !== i))} className="col-span-2 text-[10px] text-red-500 text-left">Supprimer</button>
            </div>
          ))}
        </div>

        {/* Experience */}
        <div className="card-base p-4 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-muted-foreground">Expériences</label>
            <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setExp([...exp, { role: "", company: "", city: "", from: "", to: "", desc: "" }])}><Plus className="w-3 h-3" />Ajouter</Button>
          </div>
          {exp.map((e, i) => (
            <div key={i} className="grid grid-cols-2 gap-2 border-t border-border pt-2">
              <Input className="h-8 text-xs" placeholder="Poste" value={e.role} onChange={(ev) => setExp(exp.map((x, j) => j === i ? { ...x, role: ev.target.value } : x))} />
              <Input className="h-8 text-xs" placeholder="Entreprise" value={e.company} onChange={(ev) => setExp(exp.map((x, j) => j === i ? { ...x, company: ev.target.value } : x))} />
              <Input className="h-8 text-xs" placeholder="Ville" value={e.city} onChange={(ev) => setExp(exp.map((x, j) => j === i ? { ...x, city: ev.target.value } : x))} />
              <div className="flex gap-1">
                <Input className="h-8 text-xs" placeholder="De" value={e.from} onChange={(ev) => setExp(exp.map((x, j) => j === i ? { ...x, from: ev.target.value } : x))} />
                <Input className="h-8 text-xs" placeholder="À" value={e.to} onChange={(ev) => setExp(exp.map((x, j) => j === i ? { ...x, to: ev.target.value } : x))} />
              </div>
              <textarea className="col-span-2 text-xs rounded-md border border-input bg-background p-2 h-14" placeholder="Description" value={e.desc} onChange={(ev) => setExp(exp.map((x, j) => j === i ? { ...x, desc: ev.target.value } : x))} />
              <button onClick={() => setExp(exp.filter((_, j) => j !== i))} className="col-span-2 text-[10px] text-red-500 text-left">Supprimer</button>
            </div>
          ))}
        </div>

        {/* References */}
        <div className="card-base p-4 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-muted-foreground">Références</label>
            <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setRefs([...refs, { name: "", role: "", company: "", phone: "", email: "" }])}><Plus className="w-3 h-3" />Ajouter</Button>
          </div>
          {refs.map((r, i) => (
            <div key={i} className="grid grid-cols-2 gap-2 border-t border-border pt-2">
              <Input className="h-8 text-xs" placeholder="Nom" value={r.name} onChange={(ev) => setRefs(refs.map((x, j) => j === i ? { ...x, name: ev.target.value } : x))} />
              <Input className="h-8 text-xs" placeholder="Poste" value={r.role} onChange={(ev) => setRefs(refs.map((x, j) => j === i ? { ...x, role: ev.target.value } : x))} />
              <Input className="h-8 text-xs" placeholder="Entreprise" value={r.company} onChange={(ev) => setRefs(refs.map((x, j) => j === i ? { ...x, company: ev.target.value } : x))} />
              <Input className="h-8 text-xs" placeholder="Téléphone" value={r.phone} onChange={(ev) => setRefs(refs.map((x, j) => j === i ? { ...x, phone: ev.target.value } : x))} />
              <Input className="h-8 text-xs col-span-2" placeholder="Email" value={r.email} onChange={(ev) => setRefs(refs.map((x, j) => j === i ? { ...x, email: ev.target.value } : x))} />
              <button onClick={() => setRefs(refs.filter((_, j) => j !== i))} className="col-span-2 text-[10px] text-red-500 text-left">Supprimer</button>
            </div>
          ))}
        </div>

        <div className="flex gap-2 sticky bottom-0 bg-background py-3">
          <Button onClick={exportPdf} className="flex-1 h-10 gradient-bg text-white border-0 gap-2 text-sm" style={{ boxShadow: "var(--shadow-primary)" }}><Download className="w-4 h-4" />Télécharger en PDF</Button>
          <Button onClick={useForMatching} disabled={busy} variant="outline" className="flex-1 h-10 gap-2 text-sm">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Target className="w-4 h-4" />}Utiliser pour le matching
          </Button>
        </div>
      </div>

      {/* ── RIGHT: live preview (A4) ── */}
      <div className="overflow-auto">
        <div ref={previewRef} style={{ width: 794, minHeight: 1123, display: "grid", gridTemplateColumns: "38% 62%", background: "#fff", color: "#1A1A2E", fontFamily: "Inter, Arial, sans-serif" }}>
          {/* Sidebar */}
          <div style={{ background: SIDEBAR, color: "#fff", padding: "32px 24px" }}>
            <div style={{ width: 150, height: 150, borderRadius: "50%", background: "#9aa3ad", margin: "0 auto 28px", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
              {photo ? <img src={photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "[PHOTO]"}
            </div>

            <SideHeading>Contact</SideHeading>
            <SideItem label="Phone" value={phone || "[TÉLÉPHONE]"} />
            <SideItem label="Email" value={email || "[EMAIL]"} />
            <SideItem label="Address" value={ville || "[VILLE]"} />

            <SideHeading>Education</SideHeading>
            {(edu.length ? edu : [{ diploma: "[DIPLÔME]", school: "[ÉCOLE]", from: "", to: "" }]).map((e, i) => (
              <div key={i} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, opacity: .8 }}>{[e.from, e.to].filter(Boolean).join(" - ")}</div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{e.diploma}</div>
                <div style={{ fontSize: 12, opacity: .85 }}>{e.school}</div>
              </div>
            ))}

            <SideHeading>Expertise</SideHeading>
            <ul style={{ paddingLeft: 16, margin: 0 }}>
              {(skills.length ? skills : ["[COMPÉTENCES]"]).map((s, i) => (
                <li key={i} style={{ fontSize: 12, marginBottom: 4 }}>{s}</li>
              ))}
            </ul>

            <SideHeading>Language</SideHeading>
            <div style={{ fontSize: 12 }}>{(langs.length ? langs : ["[LANGUES]"]).join(", ")}</div>
          </div>

          {/* Main */}
          <div style={{ padding: "32px 28px" }}>
            <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: 1, color: SIDEBAR }}>
              {(prenom || nom) ? `${prenom} ${nom}`.toUpperCase() : "[NOM PRÉNOM]"}
            </div>
            <div style={{ fontSize: 16, letterSpacing: 3, color: "#555", marginBottom: 6 }}>
              {(titre || "[TITRE DU POSTE]").toUpperCase()}
            </div>
            <div style={{ fontSize: 12, color: "#666", marginBottom: 22 }}>{resume || "[RÉSUMÉ]"}</div>

            <MainHeading>Experience</MainHeading>
            <div style={{ position: "relative", paddingLeft: 22 }}>
              <div style={{ position: "absolute", left: 5, top: 4, bottom: 4, width: 2, background: "#ddd" }} />
              {(exp.length ? exp : [{ role: "[EXPÉRIENCE]", company: "", city: "", from: "", to: "", desc: "" }]).map((e, i) => (
                <div key={i} style={{ position: "relative", marginBottom: 18 }}>
                  <div style={{ position: "absolute", left: -22, top: 2, width: 12, height: 12, borderRadius: "50%", border: `3px solid ${PURPLE}`, background: "#fff" }} />
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{[e.from, e.to].filter(Boolean).join(" - ")}</div>
                  <div style={{ fontSize: 13, color: "#444" }}>{[e.company, e.city].filter(Boolean).join(" | ")}</div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{e.role}</div>
                  {e.desc && <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>{e.desc}</div>}
                </div>
              ))}
            </div>

            {refs.length > 0 && (<>
              <MainHeading>Reference</MainHeading>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {refs.map((r, i) => (
                  <div key={i}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{r.name}</div>
                    <div style={{ fontSize: 12, color: "#555" }}>{[r.company, r.role].filter(Boolean).join(" / ")}</div>
                    <div style={{ fontSize: 11, marginTop: 4 }}><b>Phone:</b> {r.phone}</div>
                    <div style={{ fontSize: 11 }}><b>Email:</b> {r.email}</div>
                  </div>
                ))}
              </div>
            </>)}
          </div>
        </div>
      </div>
    </div>
  );
}

function SideHeading({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 18, fontWeight: 800, margin: "20px 0 8px", paddingBottom: 4, borderBottom: "2px solid rgba(255,255,255,.4)" }}>{children}</div>;
}
function SideItem({ label, value }: { label: string; value: string }) {
  return <div style={{ marginBottom: 10 }}><div style={{ fontSize: 13, fontWeight: 700 }}>{label}</div><div style={{ fontSize: 12, opacity: .85 }}>{value}</div></div>;
}
function MainHeading({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 22, fontWeight: 800, color: "#2C3E50", borderBottom: "2px solid #2C3E50", paddingBottom: 4, margin: "22px 0 14px" }}>{children}</div>;
}
