export interface BookTheme {
  id: string;
  name: string;
  mood: string;
  background: string;
  accent: string;
  text: string;
  font: "serif" | "sans-serif";
  border: string;
  photo_radius: string;
  ornament: string;
}

// Miroir exact du catalogue backend (app/Support/BookThemes.php) — les deux
// DOIVENT rester synchronisés puisque le même thème doit rendre à l'identique
// dans l'aperçu web et dans le PDF généré côté serveur.
export const BOOK_THEMES: BookTheme[] = [
  {
    id: "classic_ivory",
    name: "Classique Ivoire",
    mood: "Sobre et intemporel",
    background: "#FDF8F3",
    accent: "#712B13",
    text: "#3A2A22",
    font: "serif",
    border: "2px solid #712B13",
    photo_radius: "8px",
    ornament: "❦",
  },
  {
    id: "terre_afrique",
    name: "Terre d'Afrique",
    mood: "Chaleureux et affirmé",
    background: "#B5651D",
    accent: "#E8B84B",
    text: "#2E1E10",
    font: "sans-serif",
    border: "6px solid #4E3524",
    photo_radius: "4px",
    ornament: "✺",
  },
  {
    id: "douceur_pastel",
    name: "Douceur Pastel",
    mood: "Doux, idéal bébé/enfant",
    background: "#FBEFF5",
    accent: "#C98CA6",
    text: "#4A2F3B",
    font: "sans-serif",
    border: "3px dotted #C98CA6",
    photo_radius: "16px",
    ornament: "✿",
  },
  {
    id: "noir_or",
    name: "Noir & Or",
    mood: "Premium, soirée / anniversaire",
    background: "#111111",
    accent: "#D4AF37",
    text: "#F3E3B3",
    font: "serif",
    border: "2px double #D4AF37",
    photo_radius: "4px",
    ornament: "✦",
  },
  {
    id: "bleu_marine",
    name: "Bleu Marine",
    mood: "Moderne et épuré",
    background: "#13294B",
    accent: "#9FB8D9",
    text: "#F5F5F0",
    font: "sans-serif",
    border: "1px solid #9FB8D9",
    photo_radius: "6px",
    ornament: "✧",
  },
  {
    id: "vert_olive",
    name: "Vert Olive Nature",
    mood: "Naturel et apaisant",
    background: "#EFEFE0",
    accent: "#5B6B3E",
    text: "#33361F",
    font: "serif",
    border: "3px double #5B6B3E",
    photo_radius: "6px",
    ornament: "❧",
  },
  {
    id: "blanc_minimal",
    name: "Blanc Minimal",
    mood: "Minimaliste, scandinave",
    background: "#FFFFFF",
    accent: "#111111",
    text: "#111111",
    font: "sans-serif",
    border: "1px solid #111111",
    photo_radius: "0px",
    ornament: "",
  },
  {
    id: "kraft_scrapbook",
    name: "Kraft Scrapbook",
    mood: "Album souvenir, décontracté",
    background: "#C8A165",
    accent: "#5A3E20",
    text: "#3A2A14",
    font: "serif",
    border: "10px solid #FFFFFF",
    photo_radius: "2px",
    ornament: "❉",
  },
  {
    id: "corail_vif",
    name: "Corail Vif",
    mood: "Énergique, famille nombreuse",
    background: "#FF6B4A",
    accent: "#FFD166",
    text: "#FFFFFF",
    font: "sans-serif",
    border: "6px solid #FFD166",
    photo_radius: "12px",
    ornament: "❊",
  },
  {
    id: "bordeaux_elegant",
    name: "Bordeaux Élégant",
    mood: "Formel et élégant",
    background: "#F7F0EC",
    accent: "#6E1423",
    text: "#2B1210",
    font: "serif",
    border: "2px double #6E1423",
    photo_radius: "4px",
    ornament: "❖",
  },
  {
    id: "emeraude_royal",
    name: "Émeraude Royal",
    mood: "Prestige, réception",
    background: "#0B3D2E",
    accent: "#C9A227",
    text: "#F1E9C9",
    font: "serif",
    border: "3px double #C9A227",
    photo_radius: "6px",
    ornament: "⚜",
  },
  {
    id: "rose_vintage",
    name: "Rose Vintage",
    mood: "Romantique, mariage / couple",
    background: "#F3E1E4",
    accent: "#8C4B5B",
    text: "#3B2226",
    font: "serif",
    border: "2px solid #8C4B5B",
    photo_radius: "10px",
    ornament: "❁",
  },
  {
    id: "graphite_argent",
    name: "Graphite Argent",
    mood: "Contemporain, professionnel",
    background: "#2B2E33",
    accent: "#C7CDD3",
    text: "#ECEFF2",
    font: "sans-serif",
    border: "1px solid #C7CDD3",
    photo_radius: "4px",
    ornament: "✵",
  },
  {
    id: "sepia_ancien",
    name: "Sépia Ancien",
    mood: "Album de famille rétro",
    background: "#E4D2B0",
    accent: "#6B4226",
    text: "#402A18",
    font: "serif",
    border: "8px ridge #6B4226",
    photo_radius: "2px",
    ornament: "☙",
  },
  {
    id: "lavande_douce",
    name: "Lavande Douce",
    mood: "Élégant et apaisant",
    background: "#EDE7F6",
    accent: "#6A4C93",
    text: "#2E1F45",
    font: "serif",
    border: "2px double #6A4C93",
    photo_radius: "8px",
    ornament: "✤",
  },
];

export function getBookTheme(id: string | null | undefined): BookTheme | null {
  return BOOK_THEMES.find((t) => t.id === id) ?? null;
}

export interface DedicationFontOption {
  id: string;
  label: string;
  font_family: "serif" | "sans-serif";
  font_style: "normal" | "italic";
}

// Miroir de BookThemes::dedicationFonts() côté backend — restreint aux
// familles de polices que dompdf sait rendre nativement.
export const DEDICATION_FONTS: DedicationFontOption[] = [
  { id: "classic", label: "Classique", font_family: "serif", font_style: "normal" },
  { id: "elegant_italic", label: "Élégant (italique)", font_family: "serif", font_style: "italic" },
  { id: "modern", label: "Moderne", font_family: "sans-serif", font_style: "normal" },
  { id: "modern_italic", label: "Moderne (italique)", font_family: "sans-serif", font_style: "italic" },
];

export function getDedicationFont(id: string | null | undefined): DedicationFontOption {
  return DEDICATION_FONTS.find((f) => f.id === id) ?? DEDICATION_FONTS[0];
}
