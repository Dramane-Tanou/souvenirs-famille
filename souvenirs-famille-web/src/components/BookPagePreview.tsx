"use client";

import { motion } from "framer-motion";
import { Pencil } from "lucide-react";
import { storageUrl } from "@/lib/api";
import { focalPointStyle } from "@/lib/imagePosition";
import { fadeInUp } from "@/lib/motion";
import type { BookTheme } from "@/lib/bookThemes";
import { getBookLayout } from "@/lib/bookLayouts";

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
  layout_type: string;
  book_memories: BookMemory[];
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

interface BookPagePreviewProps {
  page: BookPage;
  theme?: BookTheme;
  orientation?: "portrait" | "landscape";
  editable?: boolean;
  onEditLayout?: () => void;
}

export function BookPagePreview({ page, theme, orientation = "portrait", editable, onEditLayout }: BookPagePreviewProps) {
  const photos = [...page.book_memories].sort((a, b) => a.position - b.position);
  const layout = getBookLayout(page.layout_type);

  return (
    <motion.div
      variants={fadeInUp}
      style={
        theme
          ? { background: theme.background, border: theme.border, fontFamily: theme.font }
          : undefined
      }
      className="relative rounded-2xl overflow-hidden shadow-sm border border-black/5"
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: layout.colTemplate ?? `repeat(${layout.cols}, 1fr)`,
          gridTemplateRows: layout.rowTemplate ?? `repeat(${layout.rows}, 1fr)`,
        }}
        className={`gap-1 p-1 ${orientation === "landscape" ? "aspect-[4/3]" : "aspect-[3/4]"}`}
      >
        {photos.map((bm, idx) => {
          const cell = layout.cells[idx] ?? {};
          return (
            <div
              key={bm.id}
              style={{
                gridColumn: cell.colSpan ? `span ${cell.colSpan}` : undefined,
                gridRow: cell.rowSpan ? `span ${cell.rowSpan}` : undefined,
              }}
              className="flex flex-col"
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
                className={`w-full h-full flex-1 object-cover ${theme ? "" : "rounded-lg"}`}
              />
              {(bm.memory.caption || bm.memory.memory_date) && (
                <p
                  style={theme ? { color: theme.text, fontFamily: theme.font } : undefined}
                  className={`text-center text-[10px] mt-1 px-1 truncate ${theme ? "" : "text-gray-500"}`}
                >
                  {bm.memory.caption}
                  {bm.memory.caption && bm.memory.memory_date ? " — " : ""}
                  {bm.memory.memory_date && formatDate(bm.memory.memory_date)}
                </p>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-center gap-3 py-2 px-3 relative">
        <p
          style={theme ? { color: theme.accent } : undefined}
          className={`text-sm ${theme ? "" : "text-gray-500"}`}
        >
          Page {page.page_number}
        </p>
        {editable && onEditLayout && (
          <button
            onClick={onEditLayout}
            className="absolute right-3 flex items-center gap-1.5 text-sm font-medium bg-white text-brand px-3 py-1.5 rounded-lg border border-brand/30 shadow-sm hover:bg-brand-light transition-colors"
          >
            <Pencil size={13} /> Changer la mise en page
          </button>
        )}
      </div>
    </motion.div>
  );
}
