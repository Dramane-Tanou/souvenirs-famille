"use client";

import { motion } from "framer-motion";
import type { BookTheme } from "@/lib/bookThemes";
import { getDedicationFont } from "@/lib/bookThemes";
import { fadeInUp } from "@/lib/motion";

interface BookCoverPreviewProps {
  theme: BookTheme;
  familyName: string;
  periodLabel: string;
  variant?: "cover" | "back-cover";
  dedicationMessage?: string | null;
  dedicationFont?: string | null;
}

export function BookCoverPreview({
  theme,
  familyName,
  periodLabel,
  variant = "cover",
  dedicationMessage,
  dedicationFont,
}: BookCoverPreviewProps) {
  const font = getDedicationFont(dedicationFont);
  const hasImage = !!theme.cover_image;

  return (
    <motion.div
      variants={fadeInUp}
      style={{
        background: hasImage
          ? `url(${theme.cover_image}) center / cover no-repeat, ${theme.background}`
          : theme.background,
        border: theme.border,
        fontFamily: theme.font,
        color: theme.text,
      }}
      className="relative rounded-2xl aspect-[3/4] flex flex-col items-center justify-center text-center px-6"
    >
      {theme.ornament && (
        <>
          <span style={{ color: theme.accent }} className="absolute top-3 left-3 text-lg">
            {theme.ornament}
          </span>
          <span style={{ color: theme.accent }} className="absolute top-3 right-3 text-lg">
            {theme.ornament}
          </span>
          <span style={{ color: theme.accent }} className="absolute bottom-3 left-3 text-lg">
            {theme.ornament}
          </span>
          <span style={{ color: theme.accent }} className="absolute bottom-3 right-3 text-lg">
            {theme.ornament}
          </span>
        </>
      )}

      <div className={hasImage ? "bg-white/85 rounded-xl px-5 py-4 mx-4" : undefined}>
        {variant === "cover" ? (
          <>
            <p style={{ color: theme.accent }} className="text-2xl font-bold mb-2">
              {familyName}
            </p>
            <p className="text-sm">Livre photo — {periodLabel}</p>
            {dedicationMessage && (
              <p
                style={{ fontFamily: font.font_family, fontStyle: font.font_style }}
                className="text-sm mt-4 px-4"
              >
                {dedicationMessage}
              </p>
            )}
          </>
        ) : (
          <>
            <p style={{ color: theme.accent }} className="text-lg tracking-widest mb-3">
              * * *
            </p>
            {dedicationMessage && (
              <p
                style={{ fontFamily: font.font_family, fontStyle: font.font_style }}
                className="text-sm mb-4 px-4"
              >
                {dedicationMessage}
              </p>
            )}
            <p className="text-sm">{familyName}</p>
            <p style={{ color: theme.accent }} className="text-xs mt-2">
              Créé avec Souvenirs Famille — par Dramane Tanou
            </p>
          </>
        )}
      </div>
    </motion.div>
  );
}
