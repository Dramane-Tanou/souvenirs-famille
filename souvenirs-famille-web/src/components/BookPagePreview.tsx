"use client";

import { motion } from "framer-motion";
import { storageUrl } from "@/lib/api";
import { focalPointStyle } from "@/lib/imagePosition";
import { fadeInUp } from "@/lib/motion";
import type { BookTheme } from "@/lib/bookThemes";

interface Memory {
  id: number;
  image_path: string;
  caption: string | null;
  memory_date: string;
  focal_x: number;
  focal_y: number;
}

interface BookMemory {
  id: number;
  position: number;
  memory: Memory;
}

export interface BookPage {
  id: number;
  page_number: number;
  layout_type: "one" | "two" | "three" | "four";
  book_memories: BookMemory[];
}

export function BookPagePreview({ page, theme }: { page: BookPage; theme?: BookTheme }) {
  const photos = [...page.book_memories].sort((a, b) => a.position - b.position);

  const gridClass = {
    one: "grid-cols-1",
    two: "grid-cols-1",
    three: "grid-cols-2",
    four: "grid-cols-2",
  }[page.layout_type];

  return (
    <motion.div
      variants={fadeInUp}
      style={
        theme
          ? { background: theme.background, border: theme.border, fontFamily: theme.font }
          : undefined
      }
      className="rounded-2xl overflow-hidden shadow-sm border border-black/5"
    >
      <div className={`grid ${gridClass} gap-1 p-1`}>
        {photos.map((bm, idx) => (
          <div
            key={bm.id}
            className={page.layout_type === "three" && idx === 0 ? "col-span-2" : undefined}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={storageUrl(bm.memory.image_path)}
              alt={bm.memory.caption ?? "Souvenir"}
              style={{
                ...focalPointStyle(bm.memory.focal_x, bm.memory.focal_y),
                borderRadius: theme?.photo_radius,
                border: theme ? `1px solid ${theme.accent}` : undefined,
              }}
              className={`w-full object-cover ${theme ? "" : "rounded-lg"} ${
                page.layout_type === "three" && idx === 0 ? "aspect-[2/1]" : "aspect-square"
              }`}
            />
            {bm.memory.caption && (
              <p
                style={theme ? { color: theme.text, fontFamily: theme.font } : undefined}
                className={`text-center text-xs mt-1 px-1 truncate ${theme ? "" : "text-gray-500"}`}
              >
                {bm.memory.caption}
              </p>
            )}
          </div>
        ))}
      </div>
      <p
        style={theme ? { color: theme.accent } : undefined}
        className={`text-center text-sm py-2 ${theme ? "" : "text-gray-500"}`}
      >
        Page {page.page_number}
      </p>
    </motion.div>
  );
}
