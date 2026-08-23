"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { backdropFade, scaleIn, staggerContainer, fadeInUp } from "@/lib/motion";
import { layoutsForCount, type BookLayoutOption } from "@/lib/bookLayouts";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/context/ToastContext";

interface BookLayoutPickerProps {
  familyId: string;
  bookId: string;
  pageId: number;
  photoCount: number;
  currentLayoutType: string;
  onClose: () => void;
  onChanged: (layoutType: string) => void;
}

function LayoutShapePreview({ layout }: { layout: BookLayoutOption }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: layout.colTemplate ?? `repeat(${layout.cols}, 1fr)`,
        gridTemplateRows: layout.rowTemplate ?? `repeat(${layout.rows}, 1fr)`,
      }}
      className="gap-1 w-full aspect-[3/4]"
    >
      {layout.cells.map((cell, idx) => (
        <div
          key={idx}
          style={{
            gridColumn: cell.colSpan ? `span ${cell.colSpan}` : undefined,
            gridRow: cell.rowSpan ? `span ${cell.rowSpan}` : undefined,
            padding: layout.framePadding,
            background: layout.framePadding ? "#fff" : undefined,
          }}
          className={layout.framePadding ? "rounded-sm border border-gray-200" : "bg-brand/30 rounded-sm"}
        >
          {layout.framePadding && <div className="w-full h-full bg-brand/30 rounded-sm" />}
        </div>
      ))}
    </div>
  );
}

export function BookLayoutPicker({
  familyId,
  bookId,
  pageId,
  photoCount,
  currentLayoutType,
  onClose,
  onChanged,
}: BookLayoutPickerProps) {
  const [saving, setSaving] = useState<string | null>(null);
  const { showToast } = useToast();
  const options = layoutsForCount(photoCount);

  async function handlePick(layoutType: string) {
    setSaving(layoutType);
    try {
      await api(`/families/${familyId}/books/${bookId}/pages/${pageId}/layout`, {
        method: "PUT",
        body: { layout_type: layoutType },
      });
      onChanged(layoutType);
      showToast("Mise en page appliquée !");
      onClose();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Erreur lors de l'enregistrement.", "error");
    } finally {
      setSaving(null);
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
          className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <p className="text-lg font-medium text-brand-dark">Choisir la mise en page</p>
            <button onClick={onClose} aria-label="Fermer" className="text-gray-400 hover:text-gray-700 p-1">
              <X size={18} />
            </button>
          </div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-3 gap-3"
          >
            {options.map((layout) => {
              const selected = layout.id === currentLayoutType;
              return (
                <motion.button
                  key={layout.id}
                  type="button"
                  variants={fadeInUp}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handlePick(layout.id)}
                  disabled={saving !== null}
                  className={`relative rounded-xl overflow-hidden border-2 p-2 bg-gray-50 text-left disabled:opacity-60 ${
                    selected ? "border-brand" : "border-transparent"
                  }`}
                >
                  <LayoutShapePreview layout={layout} />
                  <p className="text-[10px] text-gray-600 text-center mt-1.5 leading-tight">{layout.label}</p>
                  {selected && (
                    <span className="absolute top-1 right-1 bg-brand text-white rounded-full p-0.5">
                      <Check size={10} />
                    </span>
                  )}
                  {saving === layout.id && (
                    <span className="absolute inset-0 bg-white/60 flex items-center justify-center text-xs text-brand-dark">
                      ...
                    </span>
                  )}
                </motion.button>
              );
            })}
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
