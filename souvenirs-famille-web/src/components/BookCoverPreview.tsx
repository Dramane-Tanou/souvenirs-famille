"use client";

import { motion } from "framer-motion";
import type { BookTheme } from "@/lib/bookThemes";
import { fadeInUp } from "@/lib/motion";

interface BookCoverPreviewProps {
  theme: BookTheme;
  familyName: string;
  periodLabel: string;
  variant?: "cover" | "back-cover";
}

export function BookCoverPreview({ theme, familyName, periodLabel, variant = "cover" }: BookCoverPreviewProps) {
  return (
    <motion.div
      variants={fadeInUp}
      style={{
        background: theme.background,
        border: theme.border,
        fontFamily: theme.font,
        color: theme.text,
      }}
      className="rounded-2xl aspect-[3/4] flex flex-col items-center justify-center text-center px-6"
    >
      {variant === "cover" ? (
        <>
          <p style={{ color: theme.accent }} className="text-2xl font-bold mb-2">
            {familyName}
          </p>
          <p className="text-sm">Livre photo — {periodLabel}</p>
        </>
      ) : (
        <>
          <p style={{ color: theme.accent }} className="text-lg tracking-widest mb-3">
            * * *
          </p>
          <p className="text-sm">{familyName}</p>
          <p className="text-xs mt-1">Créé avec Souvenirs Famille</p>
        </>
      )}
    </motion.div>
  );
}
