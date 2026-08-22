"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { motion } from "framer-motion";
import { BOOK_THEMES } from "@/lib/bookThemes";
import { staggerContainer, fadeInUp } from "@/lib/motion";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/context/ToastContext";

interface BookThemePickerProps {
  familyId: string;
  bookId: string;
  currentTheme: string | null;
  onSelected: (theme: string) => void;
}

export function BookThemePicker({ familyId, bookId, currentTheme, onSelected }: BookThemePickerProps) {
  const [saving, setSaving] = useState<string | null>(null);
  const { showToast } = useToast();

  async function handlePick(themeId: string) {
    setSaving(themeId);
    try {
      await api(`/families/${familyId}/books/${bookId}/theme`, {
        method: "PUT",
        body: { theme: themeId },
      });
      onSelected(themeId);
      showToast("Design appliqué !");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Erreur lors de l'enregistrement.", "error");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div>
      <p className="text-base font-medium text-gray-800 mb-1">Choisis un design pour ton livre</p>
      <p className="text-sm text-gray-500 mb-4">
        Il s&apos;applique à la page de garde, la page de fin et la mise en page — sur le PDF comme sur l&apos;exemplaire imprimé.
      </p>
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 gap-3"
      >
        {BOOK_THEMES.map((theme) => {
          const selected = theme.id === currentTheme;
          return (
            <motion.button
              key={theme.id}
              type="button"
              variants={fadeInUp}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => handlePick(theme.id)}
              disabled={saving !== null}
              className={`relative rounded-2xl overflow-hidden border-2 text-left disabled:opacity-60 ${
                selected ? "border-brand" : "border-transparent"
              }`}
            >
              <div
                style={{
                  background: theme.background,
                  border: theme.border,
                  fontFamily: theme.font,
                }}
                className="h-20 flex items-center justify-center px-2"
              >
                <span style={{ color: theme.accent }} className="text-sm font-semibold text-center">
                  {theme.name}
                </span>
              </div>
              <div className="bg-white px-3 py-2">
                <p className="text-xs text-gray-500">{theme.mood}</p>
              </div>
              {selected && (
                <span className="absolute top-2 right-2 bg-brand text-white rounded-full p-1">
                  <Check size={12} />
                </span>
              )}
              {saving === theme.id && (
                <span className="absolute inset-0 bg-white/60 flex items-center justify-center text-sm text-brand-dark">
                  ...
                </span>
              )}
            </motion.button>
          );
        })}
      </motion.div>
    </div>
  );
}
