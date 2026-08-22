"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Heart } from "lucide-react";
import { api } from "@/lib/api";
import { backdropFade, scaleIn } from "@/lib/motion";
import { Avatar } from "@/components/Avatar";

interface Liker {
  id: number;
  name: string;
  avatar_path: string | null;
}

interface LikersModalProps {
  familyId: string;
  memoryId: number;
  onClose: () => void;
}

export function LikersModal({ familyId, memoryId, onClose }: LikersModalProps) {
  const [likers, setLikers] = useState<Liker[] | null>(null);

  useEffect(() => {
    api<Liker[]>(`/families/${familyId}/memories/${memoryId}/likers`).then(setLikers);
  }, [familyId, memoryId]);

  return (
    <AnimatePresence>
      <motion.div
        variants={backdropFade}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      >
        <motion.div
          variants={scaleIn}
          className="bg-white rounded-2xl p-5 w-full max-w-sm max-h-[70vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <p className="text-base font-medium text-gray-800 flex items-center gap-1.5">
              <Heart size={16} className="text-red-500" fill="currentColor" /> Ont aimé cette photo
            </p>
            <button onClick={onClose} aria-label="Fermer" className="text-gray-400 hover:text-gray-700 p-1">
              <X size={18} />
            </button>
          </div>

          {likers === null ? (
            <p className="text-sm text-gray-400">Chargement...</p>
          ) : likers.length === 0 ? (
            <p className="text-sm text-gray-400">Personne pour l&apos;instant.</p>
          ) : (
            <ul className="space-y-3">
              {likers.map((liker) => (
                <li key={liker.id} className="flex items-center gap-3">
                  <Avatar name={liker.name} avatarPath={liker.avatar_path} size="sm" />
                  <span className="text-sm text-gray-800">{liker.name}</span>
                </li>
              ))}
            </ul>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
