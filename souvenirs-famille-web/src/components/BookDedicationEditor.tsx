"use client";

import { useState } from "react";
import { PenLine } from "lucide-react";
import { motion } from "framer-motion";
import { DEDICATION_FONTS } from "@/lib/bookThemes";
import { fadeInUp } from "@/lib/motion";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/context/ToastContext";

interface BookDedicationEditorProps {
  familyId: string;
  bookId: string;
  dedicationMessage: string | null;
  dedicationFont: string | null;
  editable: boolean;
  onSaved: (message: string | null, font: string | null) => void;
}

export function BookDedicationEditor({
  familyId,
  bookId,
  dedicationMessage,
  dedicationFont,
  editable,
  onSaved,
}: BookDedicationEditorProps) {
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState(dedicationMessage ?? "");
  const [font, setFont] = useState(dedicationFont ?? "classic");
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  if (!editable && !dedicationMessage) return null;

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await api<{ dedication_message: string | null; dedication_font: string | null }>(
        `/families/${familyId}/books/${bookId}/dedication`,
        { method: "PUT", body: { dedication_message: message, dedication_font: font } }
      );
      onSaved(updated.dedication_message, updated.dedication_font);
      setEditing(false);
      showToast("Dédicace enregistrée !");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Erreur lors de l'enregistrement.", "error");
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <motion.div
        variants={fadeInUp}
        initial="hidden"
        animate="visible"
        className="bg-white rounded-2xl p-5 shadow-sm border border-black/5"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-base font-medium text-gray-800">Dédicace</p>
            {dedicationMessage ? (
              <p className="text-sm text-gray-600 mt-1 italic">« {dedicationMessage} »</p>
            ) : (
              <p className="text-sm text-gray-500 mt-1">
                Ajoute une phrase touchante affichée sur les couvertures.
              </p>
            )}
          </div>
          {editable && (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 text-sm font-medium text-brand hover:underline flex-shrink-0 ml-3"
            >
              <PenLine size={14} /> {dedicationMessage ? "Modifier" : "Écrire"}
            </button>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={fadeInUp}
      initial="hidden"
      animate="visible"
      className="bg-white rounded-2xl p-5 shadow-sm border border-black/5 space-y-3"
    >
      <p className="text-base font-medium text-gray-800">Écris ta dédicace</p>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        maxLength={500}
        rows={3}
        placeholder="Une phrase touchante pour la couverture du livre..."
        className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base focus:border-brand focus:outline-none resize-none"
      />
      <div>
        <label className="block text-sm font-medium mb-2 text-gray-700">Style d&apos;écriture</label>
        <div className="grid grid-cols-2 gap-2">
          {DEDICATION_FONTS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFont(f.id)}
              style={{ fontFamily: f.font_family, fontStyle: f.font_style }}
              className={`text-sm py-2.5 rounded-lg border-2 transition-colors ${
                font === f.id ? "border-brand bg-brand-light text-brand-dark" : "border-gray-200 text-gray-600"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 bg-brand text-white text-base font-medium py-2.5 rounded-xl hover:bg-brand-dark transition-colors disabled:opacity-50"
        >
          {saving ? "Enregistrement..." : "Enregistrer"}
        </button>
        <button
          onClick={() => {
            setEditing(false);
            setMessage(dedicationMessage ?? "");
            setFont(dedicationFont ?? "classic");
          }}
          className="px-4 text-gray-500 text-base font-medium hover:text-gray-700 transition-colors"
        >
          Annuler
        </button>
      </div>
    </motion.div>
  );
}
