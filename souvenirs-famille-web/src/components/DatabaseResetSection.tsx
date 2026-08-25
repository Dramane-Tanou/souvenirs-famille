"use client";

import { useState, FormEvent } from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { api, ApiError } from "@/lib/api";
import { backdropFade, scaleIn } from "@/lib/motion";

const CONFIRM_PHRASE = "SUPPRIMER TOUT";

/**
 * Réinitialisation complète de la base de données — réservée au seul
 * super-administrateur racine. Avant toute suppression, il doit créer les
 * identifiants du nouveau super-administrateur racine avec lequel se
 * reconnecter ensuite, et répondre explicitement à deux questions de
 * confirmation distinctes en plus de taper une phrase exacte — pour qu'une
 * telle action ne puisse jamais partir d'un clic précipité.
 */
export function DatabaseResetSection() {
  const [open, setOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirmation, setNewPasswordConfirmation] = useState("");
  const [confirmQuestion1, setConfirmQuestion1] = useState(false);
  const [confirmQuestion2, setConfirmQuestion2] = useState(false);
  const [confirmPhrase, setConfirmPhrase] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function resetForm() {
    setNewEmail("");
    setNewPassword("");
    setNewPasswordConfirmation("");
    setConfirmQuestion1(false);
    setConfirmQuestion2(false);
    setConfirmPhrase("");
    setError(null);
  }

  const canSubmit =
    newEmail.trim() &&
    newPassword.length >= 8 &&
    newPassword === newPasswordConfirmation &&
    confirmQuestion1 &&
    confirmQuestion2 &&
    confirmPhrase === CONFIRM_PHRASE;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit || busy) return;

    if (
      !confirm(
        "Dernière confirmation : toute la base de données va être supprimée définitivement. Continuer ?"
      )
    ) {
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("new_root_email", newEmail.trim());
      formData.append("new_root_password", newPassword);
      formData.append("new_root_password_confirmation", newPasswordConfirmation);
      formData.append("acknowledge", "1");
      formData.append("confirm_phrase", confirmPhrase);

      await api("/admin/reset-database", { method: "POST", body: formData, isFormData: true });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle size={18} className="text-red-700 flex-shrink-0" />
        <p className="text-base font-medium text-red-800">Zone dangereuse</p>
      </div>
      <p className="text-sm text-red-700 mb-3">
        Réinitialiser la base de données supprime définitivement toutes les familles, tous les souvenirs,
        tous les albums, toutes les commandes et tous les comptes — y compris le tien. Réservé au
        super-administrateur racine.
      </p>
      <button
        onClick={() => {
          resetForm();
          setDone(false);
          setOpen(true);
        }}
        className="flex items-center gap-1.5 bg-red-600 text-white text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-red-700 transition-colors"
      >
        <Trash2 size={15} />
        Réinitialiser toute la base de données
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            variants={backdropFade}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
            onClick={() => !busy && setOpen(false)}
          >
            <motion.div
              variants={scaleIn}
              className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[85vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {done ? (
                <div className="text-center py-4">
                  <p className="text-lg font-medium text-brand-dark mb-2">Base de données réinitialisée</p>
                  <p className="text-sm text-gray-600 mb-4">
                    Ta session actuelle vient d&apos;être supprimée avec le reste. Reconnecte-toi avec les
                    nouveaux identifiants que tu viens de créer.
                  </p>
                  <a
                    href="/login"
                    className="inline-block bg-brand text-white text-sm font-medium px-5 py-2.5 rounded-xl hover:bg-brand-dark transition-colors"
                  >
                    Aller à la connexion
                  </a>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-lg font-medium text-red-800 flex items-center gap-2">
                      <AlertTriangle size={18} />
                      Réinitialiser la base de données
                    </p>
                    <button
                      onClick={() => setOpen(false)}
                      disabled={busy}
                      aria-label="Fermer"
                      className="text-gray-400 hover:text-gray-700 p-1 flex-shrink-0"
                    >
                      <X size={18} />
                    </button>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    Cette action est <strong>irréversible</strong>. Crée d&apos;abord les identifiants du
                    nouveau super-administrateur racine avec lequel tu te reconnecteras juste après.
                  </p>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-800 mb-1.5">
                        Nouvel e-mail super-admin racine
                      </label>
                      <input
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-brand focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-800 mb-1.5">
                        Nouveau mot de passe (8 caractères minimum)
                      </label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-brand focus:outline-none"
                        required
                        minLength={8}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-800 mb-1.5">
                        Confirme le mot de passe
                      </label>
                      <input
                        type="password"
                        value={newPasswordConfirmation}
                        onChange={(e) => setNewPasswordConfirmation(e.target.value)}
                        className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-brand focus:outline-none"
                        required
                        minLength={8}
                      />
                      {newPasswordConfirmation && newPassword !== newPasswordConfirmation && (
                        <p className="text-xs text-red-600 mt-1">Les mots de passe ne correspondent pas.</p>
                      )}
                    </div>

                    <div className="border-t border-gray-100 pt-3 space-y-2.5">
                      <label className="flex items-start gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={confirmQuestion1}
                          onChange={(e) => setConfirmQuestion1(e.target.checked)}
                          className="mt-0.5 flex-shrink-0"
                        />
                        <span className="text-sm text-gray-700">
                          Je comprends que cette action supprime <strong>définitivement</strong> toutes les
                          familles, tous les souvenirs, tous les albums et tous les comptes existants.
                        </span>
                      </label>
                      <label className="flex items-start gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={confirmQuestion2}
                          onChange={(e) => setConfirmQuestion2(e.target.checked)}
                          className="mt-0.5 flex-shrink-0"
                        />
                        <span className="text-sm text-gray-700">
                          Je comprends qu&apos;une fois lancée, cette action est{" "}
                          <strong>irréversible</strong> et ne peut pas être annulée.
                        </span>
                      </label>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-800 mb-1.5">
                        Tape <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">{CONFIRM_PHRASE}</span>{" "}
                        pour confirmer
                      </label>
                      <input
                        type="text"
                        value={confirmPhrase}
                        onChange={(e) => setConfirmPhrase(e.target.value)}
                        className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-red-400 focus:outline-none font-mono"
                        placeholder={CONFIRM_PHRASE}
                        required
                      />
                    </div>

                    {error && <p className="text-red-700 text-sm font-medium">{error}</p>}

                    <button
                      type="submit"
                      disabled={!canSubmit || busy}
                      className="w-full flex items-center justify-center gap-1.5 bg-red-600 text-white text-sm font-medium py-3 rounded-xl hover:bg-red-700 transition-colors disabled:opacity-40"
                    >
                      <Trash2 size={15} />
                      {busy ? "Réinitialisation en cours..." : "Tout supprimer et créer le nouveau compte"}
                    </button>
                  </form>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
