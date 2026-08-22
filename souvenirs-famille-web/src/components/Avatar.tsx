"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { storageUrl } from "@/lib/api";
import { backdropFade } from "@/lib/motion";

function initialsOf(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const SIZE_CLASSES: Record<"sm" | "md" | "lg" | "xl", string> = {
  sm: "w-6 h-6 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-16 h-16 text-xl",
  xl: "w-24 h-24 text-2xl",
};

interface AvatarProps {
  name: string;
  avatarPath?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  /** Si vrai et qu'une photo existe, cliquer dessus l'affiche en grand. */
  expandable?: boolean;
}

export function Avatar({ name, avatarPath, size = "md", className = "", expandable = false }: AvatarProps) {
  const sizeClass = SIZE_CLASSES[size];
  const [expanded, setExpanded] = useState(false);
  const clickable = expandable && !!avatarPath;

  const image = avatarPath ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={storageUrl(avatarPath)}
      alt={name}
      onClick={clickable ? () => setExpanded(true) : undefined}
      className={`${sizeClass} rounded-full object-cover flex-shrink-0 ${clickable ? "cursor-pointer hover:opacity-90 transition-opacity" : ""} ${className}`}
    />
  ) : (
    <div
      className={`${sizeClass} rounded-full bg-brand flex items-center justify-center text-white font-medium flex-shrink-0 ${className}`}
    >
      {initialsOf(name)}
    </div>
  );

  if (!clickable) {
    return image;
  }

  return (
    <>
      {image}
      <AnimatePresence>
        {expanded && (
          <motion.div
            variants={backdropFade}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
            onClick={() => setExpanded(false)}
            role="dialog"
            aria-modal="true"
          >
            <button
              onClick={() => setExpanded(false)}
              aria-label="Fermer"
              className="absolute top-4 right-4 text-white bg-white/10 rounded-full p-2.5 hover:bg-white/20 transition-colors"
            >
              <X size={22} />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={storageUrl(avatarPath as string)}
              alt={name}
              className="max-w-full max-h-[80vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
