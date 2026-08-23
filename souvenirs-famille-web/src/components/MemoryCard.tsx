"use client";

import { useState } from "react";
import Link from "next/link";
import { MoreVertical, Trash2, Pencil, X, Check, Move, Heart } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { api, storageUrl, ApiError } from "@/lib/api";
import { focalPointStyle } from "@/lib/imagePosition";
import { backdropFade, fadeInUp, scaleIn } from "@/lib/motion";
import { PhotoCropper } from "@/components/PhotoCropper";
import { Avatar } from "@/components/Avatar";
import { LikersModal } from "@/components/LikersModal";

interface Memory {
  id: number;
  image_path: string;
  caption: string | null;
  memory_date: string;
  focal_x: number;
  focal_y: number;
  zoom: number;
  likes_count: number;
  liked_by_me: boolean;
  user: { id: number; name: string; avatar_path: string | null };
}

interface MemoryCardProps {
  memory: Memory;
  familyId: string;
  canManage: boolean;
  onDeleted: (id: number) => void;
  onUpdated: (memory: Memory) => void;
  onClick: () => void;
}

export function MemoryCard({ memory, familyId, canManage, onDeleted, onUpdated, onClick }: MemoryCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [cropping, setCropping] = useState(false);
  const [captionDraft, setCaptionDraft] = useState(memory.caption ?? "");
  const [focalDraft, setFocalDraft] = useState({ x: memory.focal_x, y: memory.focal_y, zoom: memory.zoom });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLikers, setShowLikers] = useState(false);

  async function handleDelete() {
    if (!confirm("Supprimer définitivement ce souvenir ?")) return;
    setBusy(true);
    try {
      await api(`/families/${familyId}/memories/${memory.id}`, { method: "DELETE" });
      onDeleted(memory.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur lors de la suppression.");
    } finally {
      setBusy(false);
      setMenuOpen(false);
    }
  }

  async function handleSaveCaption() {
    setBusy(true);
    setError(null);
    try {
      const updated = await api<Memory>(`/families/${familyId}/memories/${memory.id}`, {
        method: "PUT",
        body: { caption: captionDraft || null },
      });
      onUpdated(updated);
      setEditing(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur lors de la modification.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveFocalPoint() {
    setBusy(true);
    setError(null);
    try {
      const updated = await api<Memory>(`/families/${familyId}/memories/${memory.id}`, {
        method: "PUT",
        body: { focal_x: Math.round(focalDraft.x), focal_y: Math.round(focalDraft.y), zoom: focalDraft.zoom },
      });
      onUpdated(updated);
      setCropping(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur lors de la modification.");
    } finally {
      setBusy(false);
    }
  }

  async function handleToggleLike(e: React.MouseEvent) {
    e.stopPropagation();
    const optimistic = {
      ...memory,
      liked_by_me: !memory.liked_by_me,
      likes_count: memory.likes_count + (memory.liked_by_me ? -1 : 1),
    };
    onUpdated(optimistic);
    try {
      const res = await api<{ likes_count: number; liked_by_me: boolean }>(
        `/families/${familyId}/memories/${memory.id}/like`,
        { method: "POST" }
      );
      onUpdated({ ...memory, ...res });
    } catch {
      onUpdated(memory);
    }
  }

  return (
    <motion.div variants={fadeInUp} className="relative group">
      <div
        onClick={onClick}
        className="w-full aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={storageUrl(memory.image_path)}
          alt={memory.caption ?? "Souvenir"}
          style={focalPointStyle(memory.focal_x, memory.focal_y, memory.zoom)}
          className="w-full h-full object-cover"
        />
      </div>

      <Link
        href={`/families/${familyId}/members/${memory.user.id}`}
        onClick={(e) => e.stopPropagation()}
        aria-label={memory.user.name}
        className="absolute bottom-1.5 left-1.5 ring-2 ring-white rounded-full hover:scale-110 transition-transform"
      >
        <Avatar name={memory.user.name} avatarPath={memory.user.avatar_path} size="sm" />
      </Link>

      <div className="absolute bottom-1.5 right-1.5 flex items-center gap-1 bg-black/50 text-white rounded-full px-1.5 py-1 text-xs">
        <motion.button
          onClick={handleToggleLike}
          whileTap={{ scale: 1.3 }}
          aria-label={memory.liked_by_me ? "Retirer le like" : "Aimer"}
          className="flex items-center"
        >
          <Heart size={13} fill={memory.liked_by_me ? "currentColor" : "none"} className={memory.liked_by_me ? "text-red-400" : ""} />
        </motion.button>
        {memory.likes_count > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowLikers(true);
            }}
            aria-label="Voir qui a aimé"
          >
            {memory.likes_count}
          </button>
        )}
      </div>

      {showLikers && (
        <LikersModal
          familyId={familyId}
          memoryId={memory.id}
          onClose={() => setShowLikers(false)}
        />
      )}

      {canManage && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen(!menuOpen);
          }}
          aria-label="Options"
          className="absolute top-1.5 right-1.5 bg-brand text-white rounded-full p-1.5 shadow-md hover:bg-brand-dark transition-colors"
        >
          <MoreVertical size={14} />
        </button>
      )}

      {canManage && menuOpen && (
        <div
          className="absolute top-8 right-1.5 bg-white rounded-lg shadow-lg border border-black/10 py-1 z-10 min-w-[140px]"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              setEditing(true);
              setMenuOpen(false);
            }}
            disabled={busy}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <Pencil size={14} /> Modifier la légende
          </button>
          <button
            onClick={() => {
              setFocalDraft({ x: memory.focal_x, y: memory.focal_y, zoom: memory.zoom });
              setCropping(true);
              setMenuOpen(false);
            }}
            disabled={busy}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <Move size={14} /> Ajuster le cadrage
          </button>
          <button
            onClick={handleDelete}
            disabled={busy}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-700 hover:bg-red-50"
          >
            <Trash2 size={14} /> Supprimer
          </button>
        </div>
      )}

      <AnimatePresence>
        {editing && (
          <motion.div
            variants={backdropFade}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setEditing(false)}
          >
            <motion.div
              variants={scaleIn}
              className="bg-white rounded-2xl p-5 w-full max-w-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-base font-medium text-gray-800 mb-3">Modifier la légende</p>
              <input
                type="text"
                value={captionDraft}
                onChange={(e) => setCaptionDraft(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base focus:border-brand focus:outline-none mb-3"
                autoFocus
              />
              {error && <p className="text-red-700 text-sm font-medium mb-3">{error}</p>}
              <div className="flex gap-2">
                <button
                  onClick={() => setEditing(false)}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-gray-100 text-gray-700 text-base font-medium py-2.5 rounded-xl"
                >
                  <X size={16} /> Annuler
                </button>
                <button
                  onClick={handleSaveCaption}
                  disabled={busy}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-brand text-white text-base font-medium py-2.5 rounded-xl disabled:opacity-50"
                >
                  <Check size={16} /> {busy ? "..." : "Enregistrer"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {cropping && (
          <motion.div
            variants={backdropFade}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setCropping(false)}
          >
            <motion.div
              variants={scaleIn}
              className="bg-white rounded-2xl p-5 w-full max-w-sm max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-base font-medium text-gray-800 mb-3">Ajuster le cadrage</p>
              <PhotoCropper
                src={storageUrl(memory.image_path)}
                value={focalDraft}
                onChange={setFocalDraft}
              />
              {error && <p className="text-red-700 text-sm font-medium mt-3">{error}</p>}
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => setCropping(false)}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-gray-100 text-gray-700 text-base font-medium py-2.5 rounded-xl"
                >
                  <X size={16} /> Annuler
                </button>
                <button
                  onClick={handleSaveFocalPoint}
                  disabled={busy}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-brand text-white text-base font-medium py-2.5 rounded-xl disabled:opacity-50"
                >
                  <Check size={16} /> {busy ? "..." : "Enregistrer"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}