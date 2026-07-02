"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/lib/store/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Lock, Trash2, CheckCircle2, AlertCircle, Loader2, X } from "lucide-react";
import { apiClient } from "@/lib/api/client";

interface Toast { id: number; message: string; type: "success" | "error" }

function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const add = (message: string, type: Toast["type"] = "success") => {
    const id = Date.now();
    setToasts((p) => [...p, { id, message, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 4000);
  };
  return { toasts, add };
}

export default function SettingsPage() {
  const user    = useAuthStore((s) => s.user);
  const setAuth = useAuthStore((s) => s.setAuth);
  const token   = useAuthStore((s) => s.token);
  const logout  = useAuthStore((s) => s.logout);
  const { toasts, add: addToast } = useToasts();

  const [firstName, setFirstName] = useState(user?.first_name ?? "");
  const [lastName,  setLastName]  = useState(user?.last_name ?? "");
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);

  const [currentPw, setCurrentPw] = useState("");
  const [newPw,     setNewPw]     = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg,     setPwMsg]     = useState<{ text: string; ok: boolean } | null>(null);

  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting,      setDeleting]      = useState(false);

  const saveProfile = async () => {
    setSaving(true);
    try {
      const { data } = await apiClient.patch("/users/me", { first_name: firstName, last_name: lastName });
      if (token) setAuth(data, token);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      addToast("Profil enregistré avec succès.", "success");
    } catch {
      addToast("Erreur lors de l'enregistrement. Réessayez.", "error");
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    setPwMsg(null);
    if (newPw !== confirmPw) { setPwMsg({ text: "Les mots de passe ne correspondent pas.", ok: false }); return; }
    if (newPw.length < 8)    { setPwMsg({ text: "8 caractères minimum.", ok: false }); return; }
    setPwLoading(true);
    try {
      await apiClient.post("/users/me/change-password", { current_password: currentPw, new_password: newPw });
      setPwMsg({ text: "Mot de passe mis à jour avec succès !", ok: true });
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
    } catch {
      setPwMsg({ text: "Mot de passe actuel incorrect.", ok: false });
    } finally {
      setPwLoading(false);
    }
  };

  const deleteAccount = async () => {
    setDeleting(true);
    try {
      await apiClient.delete("/users/me");
      logout();
    } catch {
      addToast("Erreur lors de la suppression. Contactez le support.", "error");
      setDeleteConfirm(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">

      {/* Toast stack */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none items-end">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0,   scale: 1 }}
              exit={{   opacity: 0, y: -10,  scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={`pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg text-sm font-medium max-w-xs ${
                t.type === "success" ? "bg-emerald-500 text-white" : "bg-red-500 text-white"
              }`}
            >
              {t.type === "success"
                ? <CheckCircle2 className="w-4 h-4 shrink-0" />
                : <AlertCircle  className="w-4 h-4 shrink-0" />}
              {t.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-xl font-bold">Paramètres</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Gérez vos informations de compte</p>
      </motion.div>

      {/* Profile */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="card-base p-6 space-y-5">
        <div className="flex items-center gap-2 mb-1">
          <User className="w-4 h-4 text-primary" />
          <h2 className="font-semibold">Informations personnelles</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Prénom</Label>
            <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="h-9" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Nom</Label>
            <Input value={lastName} onChange={(e) => setLastName(e.target.value)} className="h-9" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs">Email</Label>
            <Input value={user?.email ?? ""} disabled className="h-9 opacity-60 cursor-not-allowed" />
            <p className="text-[11px] text-muted-foreground">L&apos;email ne peut pas être modifié.</p>
          </div>
        </div>
        <Button onClick={saveProfile} disabled={saving} className="gradient-bg text-white border-0 h-9 gap-2">
          {saving
            ? <><Loader2 className="w-4 h-4 animate-spin" />Enregistrement…</>
            : saved
            ? <><CheckCircle2 className="w-4 h-4" />Enregistré</>
            : "Enregistrer"}
        </Button>
      </motion.div>

      {/* Password */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card-base p-6 space-y-5">
        <div className="flex items-center gap-2 mb-1">
          <Lock className="w-4 h-4 text-primary" />
          <h2 className="font-semibold">Mot de passe</h2>
        </div>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Mot de passe actuel</Label>
            <Input type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} className="h-9" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Nouveau mot de passe</Label>
            <Input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} className="h-9" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Confirmer le nouveau mot de passe</Label>
            <Input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} className="h-9" />
          </div>
          {pwMsg && (
            <p className={`text-xs flex items-center gap-1.5 ${pwMsg.ok ? "text-emerald-600" : "text-destructive"}`}>
              {pwMsg.ok
                ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                : <AlertCircle  className="w-3.5 h-3.5 shrink-0" />}
              {pwMsg.text}
            </p>
          )}
        </div>
        <Button onClick={changePassword} disabled={pwLoading || !currentPw || !newPw || !confirmPw} variant="outline" className="h-9 gap-2">
          {pwLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Modification…</> : "Changer le mot de passe"}
        </Button>
      </motion.div>

      {/* Danger zone */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="card-base p-6 border-destructive/30">
        <div className="flex items-center gap-2 mb-3">
          <Trash2 className="w-4 h-4 text-destructive" />
          <h2 className="font-semibold text-destructive">Zone dangereuse</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          La suppression de votre compte est irréversible et supprimera toutes vos données.
        </p>

        <AnimatePresence mode="wait">
          {!deleteConfirm ? (
            <motion.div key="btn" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Button
                variant="outline"
                className="border-destructive/40 text-destructive hover:bg-destructive/10 h-9"
                onClick={() => setDeleteConfirm(true)}
              >
                Supprimer mon compte
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-xl bg-destructive/5 border border-destructive/20 p-4 space-y-3"
            >
              <p className="text-sm font-semibold text-destructive">
                Êtes-vous sûr ? Cette action est irréversible.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1"
                  onClick={() => setDeleteConfirm(false)}
                  disabled={deleting}
                >
                  <X className="w-3 h-3" />Annuler
                </Button>
                <Button
                  size="sm"
                  className="h-8 text-xs bg-destructive hover:bg-destructive/90 text-white border-0 gap-1.5"
                  onClick={deleteAccount}
                  disabled={deleting}
                >
                  {deleting
                    ? <><Loader2 className="w-3 h-3 animate-spin" />Suppression…</>
                    : <><Trash2 className="w-3 h-3" />Confirmer la suppression</>}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
