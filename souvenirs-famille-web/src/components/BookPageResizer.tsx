"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { backdropFade, scaleIn } from "@/lib/motion";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/context/ToastContext";
import type { BookPage } from "@/components/BookPagePreview";

const MAX_PHOTOS_PER_PAGE = 9;

interface BookPageResizerProps {
  familyId: string;
  bookId: string;
  pageId: number;
  currentPhotoCount: number;
  onClose: () => void;
  onApplied: (pages: BookPage[]) => void;
}

export function BookPageResizer({
  familyId,
  bookId,
  pageId,
  currentPhotoCount,
  onClose,
  onApplied,
}: BookPageResizerProps) {
  const [count, setCount] = useState(currentPhotoCount);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  async function handleApply() {
    setSaving(true);
    try {
      const updated = await api<{ pages: BookPage[] }>(
        `/families/${familyId}/books/${bookId}/pages/${pageId}/photo-count`,
        { method: "PUT", body: { photo_count: count } }
      );
      onApplied(updated.pages);
      showToast("Nombre de photos mis à jour !");
      onClose();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Erreur lors de l'enregistrement.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        variants={backdropFade}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          variants={scaleIn}
          className="bg-white rounded-2xl p-6 w-full max-w-sm"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-lg font-medium text-brand-dark">Nombre de photos sur cette page</p>
            <button onClick={onClose} aria-label="Fermer" className="text-gray-400 hover:text-gray-700 p-1">
              <X size={18} />
            </button>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Les photos en trop (ou manquantes) se répercutent automatiquement sur les pages suivantes.
          </p>

          <div className="grid grid-cols-5 gap-2 mb-5">
            {Array.from({ length: MAX_PHOTOS_PER_PAGE }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setCount(n)}
                className={`py-2.5 rounded-lg border-2 text-sm font-medium transition-colors ${
                  count === n ? "border-brand bg-brand-light text-brand-dark" : "border-gray-200 text-gray-600"
                }`}
              >
                {n}
              </button>
            ))}
          </div>

          <button
            onClick={handleApply}
            disabled={saving || count === currentPhotoCount}
            className="w-full bg-brand text-white text-base font-medium py-3 rounded-xl hover:bg-brand-dark transition-colors disabled:opacity-50"
          >
            {saving ? "Application en cours..." : "Appliquer"}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
