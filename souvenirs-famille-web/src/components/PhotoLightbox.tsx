"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { motion } from "framer-motion";
import { MemoryComments } from "@/components/MemoryComments";

interface PhotoLightboxProps {
  imageUrl: string;
  caption: string | null;
  authorName: string;
  authorId: number;
  familyId: string;
  memoryId: number;
  canManage: boolean;
  date: string;
  onClose: () => void;
}

export function PhotoLightbox({
  imageUrl,
  caption,
  authorName,
  authorId,
  familyId,
  memoryId,
  canManage,
  date,
  onClose,
}: PhotoLightboxProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 bg-black/90 z-50 flex flex-col"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <button
        onClick={onClose}
        aria-label="Fermer"
        className="absolute top-4 right-4 text-white bg-white/10 rounded-full p-2.5 z-10 hover:bg-white/20 transition-colors"
      >
        <X size={22} />
      </button>
      <div
        className="flex-1 flex items-center justify-center p-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={caption ?? "Souvenir"}
          className="max-w-full max-h-[75vh] object-contain rounded-lg"
        />
      </div>
      <div
        className="bg-black/60 p-4 max-h-[40vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center mb-3">
          {caption && <p className="text-white text-base mb-1">{caption}</p>}
          <p className="text-white/70 text-sm">
            <Link href={`/families/${familyId}/members/${authorId}`} className="hover:underline hover:text-white">
              {authorName}
            </Link>
            {" · "}
            {date}
          </p>
        </div>
        <MemoryComments familyId={familyId} memoryId={memoryId} canManage={canManage} />
      </div>
    </motion.div>
  );
}
