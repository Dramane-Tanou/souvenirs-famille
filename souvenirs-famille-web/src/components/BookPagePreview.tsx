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

export type LayoutType =
  | "solo"
  | "duo_vertical"
  | "duo_horizontal"
  | "trio_hero_left"
  | "trio_hero_top"
  | "strip_three"
  | "quad_grid"
  | "quad_hero"
  | "strip_four"
  | "quintet_mosaic"
  | "sextet_grid"
  // Anciennes valeurs, gardées pour compatibilité avec de vieux livres non re-générés.
  | "one"
  | "two"
  | "three"
  | "four";

export interface BookPage {
  id: number;
  page_number: number;
  layout_type: LayoutType;
  book_memories: BookMemory[];
}

interface LayoutCell {
  colSpan?: number;
  rowSpan?: number;
}

interface LayoutConfig {
  cols: number;
  rows: number;
  cells: LayoutCell[];
}

const LAYOUTS: Record<string, LayoutConfig> = {
  solo: { cols: 1, rows: 1, cells: [{}] },
  duo_vertical: { cols: 2, rows: 1, cells: [{}, {}] },
  duo_horizontal: { cols: 1, rows: 2, cells: [{}, {}] },
  trio_hero_left: { cols: 2, rows: 2, cells: [{ rowSpan: 2 }, {}, {}] },
  trio_hero_top: { cols: 2, rows: 2, cells: [{ colSpan: 2 }, {}, {}] },
  strip_three: { cols: 3, rows: 1, cells: [{}, {}, {}] },
  quad_grid: { cols: 2, rows: 2, cells: [{}, {}, {}, {}] },
  quad_hero: { cols: 2, rows: 3, cells: [{ rowSpan: 3 }, {}, {}, {}] },
  strip_four: { cols: 4, rows: 1, cells: [{}, {}, {}, {}] },
  quintet_mosaic: { cols: 4, rows: 2, cells: [{ colSpan: 2, rowSpan: 2 }, {}, {}, {}, {}] },
  sextet_grid: { cols: 3, rows: 2, cells: [{}, {}, {}, {}, {}, {}] },
  // Anciennes valeurs : équivalents directs parmi les nouvelles mises en page.
  one: { cols: 1, rows: 1, cells: [{}] },
  two: { cols: 2, rows: 1, cells: [{}, {}] },
  three: { cols: 2, rows: 2, cells: [{ rowSpan: 2 }, {}, {}] },
  four: { cols: 2, rows: 2, cells: [{}, {}, {}, {}] },
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

export function BookPagePreview({ page, theme }: { page: BookPage; theme?: BookTheme }) {
  const photos = [...page.book_memories].sort((a, b) => a.position - b.position);
  const layout = LAYOUTS[page.layout_type] ?? LAYOUTS.quad_grid;

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
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${layout.cols}, 1fr)`,
          gridTemplateRows: `repeat(${layout.rows}, 1fr)`,
        }}
        className="gap-1 p-1 aspect-[3/4]"
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
      <p
        style={theme ? { color: theme.accent } : undefined}
        className={`text-center text-sm py-2 ${theme ? "" : "text-gray-500"}`}
      >
        Page {page.page_number}
      </p>
    </motion.div>
  );
}
