"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { backdropFade, scaleIn } from "@/lib/motion";
import { api, storageUrl, ApiError } from "@/lib/api";
import { useToast } from "@/context/ToastContext";
import { PhotoCropper } from "@/components/PhotoCropper";
import { getBookLayout, estimateCellAspect } from "@/lib/bookLayouts";
import type { BookPage } from "@/components/BookPagePreview";

interface BookPageCropperProps {
  familyId: string;
  bookId: string;
  page: BookPage;
  orientation: "portrait" | "landscape";
  onClose: () => void;
  onUpdated: (memoryId: number, focalX: number, focalY: number, zoom: number) => void;
}

export function BookPageCropper({ familyId, bookId, page, orientation, onClose, onUpdated }: BookPageCropperProps) {
  const photos = [...page.book_memories].sort((a, b) => a.position - b.position);
  const layout = getBookLayout(page.layout_type);
  const pageAspect = orientation === "landscape" ? 4 / 3 : 3 / 4;

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  const selected = photos[selectedIndex];
  const [crop, setCrop] = useState({ x: selected.memory.focal_x, y: selected.memory.focal_y, zoom: selected.memory.zoom });

  function selectPhoto(index: number) {
    setSelectedIndex(index);
    const memory = photos[index].memory;
    setCrop({ x: memory.focal_x, y: memory.focal_y, zoom: memory.zoom });
  }

  async function handleSave() {
    setSaving(true);
    try {
      await api(`/families/${familyId}/books/${bookId}/pages/${page.id}/memories/${selected.memory.id}/crop`, {
        method: "PUT",
        body: { focal_x: crop.x, focal_y: crop.y, zoom: crop.zoom },
      });
      onUpdated(selected.memory.id, crop.x, crop.y, crop.zoom);
      showToast("Cadrage mis à jour !");
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
          className="bg-white rounded-2xl p-6 w-full max-w-sm max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <p className="text-lg font-medium text-brand-dark">Recadrer les photos de la page</p>
            <button onClick={onClose} aria-label="Fermer" className="text-gray-400 hover:text-gray-700 p-1">
              <X size={18} />
            </button>
          </div>

          {photos.length > 1 && (
            <div className="grid grid-cols-5 gap-1.5 mb-4">
              {photos.map((bm, index) => (
                <button
                  key={bm.id}
                  type="button"
                  onClick={() => selectPhoto(index)}
                  className={`relative aspect-square rounded-lg overflow-hidden border-2 ${
                    index === selectedIndex ? "border-brand" : "border-transparent"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={storageUrl(bm.memory.image_path)}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}

          <PhotoCropper
            src={storageUrl(selected.memory.image_path)}
            value={crop}
            onChange={setCrop}
            aspect={estimateCellAspect(layout, selectedIndex, pageAspect)}
          />

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full mt-4 flex items-center justify-center gap-1.5 bg-brand text-white text-base font-medium py-3 rounded-xl hover:bg-brand-dark transition-colors disabled:opacity-50"
          >
            <Check size={16} /> {saving ? "Enregistrement..." : "Enregistrer ce cadrage"}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
