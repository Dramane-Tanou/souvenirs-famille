export interface LayoutCell {
  colSpan?: number;
  rowSpan?: number;
}

export interface BookLayoutOption {
  id: string;
  label: string;
  photo_count: number;
  cols: number;
  rows: number;
  cells: LayoutCell[];
}

// Miroir du catalogue backend (app/Support/BookLayouts.php), avec en plus la
// forme de grille (cols/rows/cells) nécessaire au rendu web — le rendu PDF
// équivalent est câblé séparément dans resources/views/book-pdf.blade.php.
// Les deux DOIVENT rester visuellement cohérents.
export const BOOK_LAYOUTS: BookLayoutOption[] = [
  { id: "solo", label: "Photo pleine page", photo_count: 1, cols: 1, rows: 1, cells: [{}] },
  { id: "duo_vertical", label: "Duo côte à côte", photo_count: 2, cols: 2, rows: 1, cells: [{}, {}] },
  { id: "duo_horizontal", label: "Duo empilé", photo_count: 2, cols: 1, rows: 2, cells: [{}, {}] },
  {
    id: "trio_hero_left",
    label: "Trio — grande à gauche",
    photo_count: 3,
    cols: 2,
    rows: 2,
    cells: [{ rowSpan: 2 }, {}, {}],
  },
  {
    id: "trio_hero_top",
    label: "Trio — grande en haut",
    photo_count: 3,
    cols: 2,
    rows: 2,
    cells: [{ colSpan: 2 }, {}, {}],
  },
  { id: "strip_three", label: "Trio — bandeau", photo_count: 3, cols: 3, rows: 1, cells: [{}, {}, {}] },
  { id: "quad_grid", label: "Quatuor — grille 2×2", photo_count: 4, cols: 2, rows: 2, cells: [{}, {}, {}, {}] },
  {
    id: "quad_hero",
    label: "Quatuor — grande + 3",
    photo_count: 4,
    cols: 2,
    rows: 3,
    cells: [{ rowSpan: 3 }, {}, {}, {}],
  },
  { id: "strip_four", label: "Quatuor — bandeau", photo_count: 4, cols: 4, rows: 1, cells: [{}, {}, {}, {}] },
  {
    id: "quintet_mosaic",
    label: "Cinq photos — mosaïque",
    photo_count: 5,
    cols: 4,
    rows: 2,
    cells: [{ colSpan: 2, rowSpan: 2 }, {}, {}, {}, {}],
  },
  {
    id: "quintet_strip_top",
    label: "Cinq photos — grande en haut",
    photo_count: 5,
    cols: 4,
    rows: 2,
    cells: [{ colSpan: 4 }, {}, {}, {}, {}],
  },
  {
    id: "sextet_grid",
    label: "Six photos — grille 3×2",
    photo_count: 6,
    cols: 3,
    rows: 2,
    cells: [{}, {}, {}, {}, {}, {}],
  },
  {
    id: "sextet_hero_grid",
    label: "Six photos — grande + 5",
    photo_count: 6,
    cols: 3,
    rows: 3,
    cells: [{ colSpan: 2, rowSpan: 2 }, {}, {}, {}, {}, {}],
  },
  {
    id: "septet_mosaic",
    label: "Sept photos — mosaïque dense",
    photo_count: 7,
    cols: 3,
    rows: 3,
    cells: [{ rowSpan: 3 }, {}, {}, {}, {}, {}, {}],
  },
  {
    id: "septet_hero_top",
    label: "Sept photos — grande en haut",
    photo_count: 7,
    cols: 3,
    rows: 3,
    cells: [{ colSpan: 3 }, {}, {}, {}, {}, {}, {}],
  },
  {
    id: "octet_grid",
    label: "Huit photos — grille 4×2",
    photo_count: 8,
    cols: 4,
    rows: 2,
    cells: [{}, {}, {}, {}, {}, {}, {}, {}],
  },
  {
    id: "octet_banner_grid",
    label: "Huit photos — grande + 7",
    photo_count: 8,
    cols: 3,
    rows: 3,
    cells: [{ colSpan: 2 }, {}, {}, {}, {}, {}, {}, {}],
  },
  {
    id: "octet_filmstrip",
    label: "Huit photos — bandeau pellicule",
    photo_count: 8,
    cols: 8,
    rows: 1,
    cells: [{}, {}, {}, {}, {}, {}, {}, {}],
  },
];

// Anciennes valeurs de layout_type (avant ce catalogue), au cas où de vieilles
// données non re-générées circuleraient encore quelque part.
const LEGACY_LAYOUT_MAP: Record<string, string> = {
  one: "solo",
  two: "duo_vertical",
  three: "trio_hero_left",
  four: "quad_grid",
};

export function getBookLayout(id: string | null | undefined): BookLayoutOption {
  if (!id) return BOOK_LAYOUTS[6]; // quad_grid
  const resolved = LEGACY_LAYOUT_MAP[id] ?? id;
  return BOOK_LAYOUTS.find((l) => l.id === resolved) ?? BOOK_LAYOUTS[6];
}

export function layoutsForCount(count: number): BookLayoutOption[] {
  return BOOK_LAYOUTS.filter((l) => l.photo_count === count);
}
