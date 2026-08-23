"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Download, Palette, Shuffle } from "lucide-react";
import { motion } from "framer-motion";
import { api, downloadFile, ApiError } from "@/lib/api";
import { useToast } from "@/context/ToastContext";
import { getBookTheme } from "@/lib/bookThemes";
import { BackHeader } from "@/components/BackHeader";
import { BottomNav } from "@/components/BottomNav";
import { BookPagePreview, type BookPage } from "@/components/BookPagePreview";
import { BookThemePicker } from "@/components/BookThemePicker";
import { BookCoverPreview } from "@/components/BookCoverPreview";
import { BookDedicationEditor } from "@/components/BookDedicationEditor";
import { BookLayoutPicker } from "@/components/BookLayoutPicker";
import { BookPageResizer } from "@/components/BookPageResizer";
import { BookPageCropper } from "@/components/BookPageCropper";
import { staggerContainer, fadeInUp } from "@/lib/motion";

interface Order {
  id: number;
  format: "softcover" | "hardcover" | "pdf";
  payment_status: string;
  price_cents: number;
  currency: string;
}

interface Book {
  id: number;
  status: string;
  theme: string | null;
  orientation: "portrait" | "landscape";
  dedication_message: string | null;
  dedication_font: string | null;
  period_start: string;
  period_end: string;
  pages: BookPage[];
  orders: Order[];
}

const STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon",
  validated: "Validé",
  ordered: "Commandé",
  printed: "Imprimé",
  delivered: "Livré",
};

export default function BookDetailPage() {
  const params = useParams();
  const familyId = params.id as string;
  const bookId = params.bookId as string;

  const [book, setBook] = useState<Book | null>(null);
  const [familyName, setFamilyName] = useState("");
  const [changingTheme, setChangingTheme] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [editingLayoutPageId, setEditingLayoutPageId] = useState<number | null>(null);
  const [editingPhotoCountPageId, setEditingPhotoCountPageId] = useState<number | null>(null);
  const [editingCropPageId, setEditingCropPageId] = useState<number | null>(null);
  const [relaying, setRelaying] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    api<Book>(`/families/${familyId}/books/${bookId}`).then(setBook);
    api<{ name: string }>(`/families/${familyId}`).then((f) => setFamilyName(f.name));
  }, [familyId, bookId]);

  async function handleDownloadPdf() {
    setDownloading(true);
    try {
      await downloadFile(`/families/${familyId}/books/${bookId}/pdf`, `livre-${periodLabel}.pdf`);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Le téléchargement a échoué.", "error");
    } finally {
      setDownloading(false);
    }
  }

  async function handleRelayout() {
    if (
      !confirm(
        "Réorganiser tout le livre ? Chaque page recevra un nombre de photos aléatoire (1 à 9), mais toujours avec des photos de même taille — les mises en page \"grande photo + petites\" ne seront plus utilisées."
      )
    ) {
      return;
    }
    setRelaying(true);
    try {
      const updated = await api<Book>(`/families/${familyId}/books/${bookId}/relayout`, { method: "POST" });
      setBook((prev) => (prev ? { ...prev, pages: updated.pages } : prev));
      showToast("Livre réorganisé !");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Erreur lors de la réorganisation.", "error");
    } finally {
      setRelaying(false);
    }
  }

  if (!book) {
    return <p className="p-8 text-base">Chargement...</p>;
  }

 function formatPeriodLabel(start: string, end: string) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const sameMonth = startDate.getMonth() === endDate.getMonth() && startDate.getFullYear() === endDate.getFullYear();

  if (sameMonth) {
    return startDate.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  }

  const startLabel = startDate.toLocaleDateString("fr-FR", { month: "short", year: "numeric" });
  const endLabel = endDate.toLocaleDateString("fr-FR", { month: "short", year: "numeric" });
  return `${startLabel} — ${endLabel}`;
}

const periodLabel = formatPeriodLabel(book.period_start, book.period_end);
const theme = getBookTheme(book.theme);
const canChangeTheme = book.status === "draft";
const pdfPurchased = book.orders.some((o) => o.format === "pdf" && o.payment_status === "paid");

  return (
    <main className="min-h-screen bg-brand-light pb-24">
      <BackHeader
        title={periodLabel}
        backHref={`/families/${familyId}/books`}
        backLabel="Livres"
        action={
          <span className="text-sm font-medium text-white bg-white/20 px-3 py-1 rounded-full">
            {STATUS_LABELS[book.status] ?? book.status}
          </span>
        }
      />

      <div className="max-w-2xl mx-auto px-4 sm:px-8 mt-6 space-y-4">
        {(!theme || changingTheme) ? (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-black/5">
            <BookThemePicker
              familyId={familyId}
              bookId={bookId}
              currentTheme={book.theme}
              onSelected={(newTheme) => {
                setBook((prev) => (prev ? { ...prev, theme: newTheme } : prev));
                setChangingTheme(false);
              }}
            />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <p className="text-base font-medium text-gray-800">Aperçu du design</p>
              {canChangeTheme && (
                <button
                  onClick={() => setChangingTheme(true)}
                  className="flex items-center gap-1.5 text-sm font-medium text-brand hover:underline"
                >
                  <Palette size={14} /> Changer le design
                </button>
              )}
            </div>

            <motion.div variants={fadeInUp} initial="hidden" animate="visible">
              <BookCoverPreview
                theme={theme}
                familyName={familyName}
                periodLabel={periodLabel}
                variant="cover"
                orientation={book.orientation}
                dedicationMessage={book.dedication_message}
                dedicationFont={book.dedication_font}
              />
            </motion.div>

            <BookDedicationEditor
              familyId={familyId}
              bookId={bookId}
              dedicationMessage={book.dedication_message}
              dedicationFont={book.dedication_font}
              editable={canChangeTheme}
              onSaved={(message, font) =>
                setBook((prev) => (prev ? { ...prev, dedication_message: message, dedication_font: font } : prev))
              }
            />

            {book.status === "draft" && (
              <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
                <Link
                  href={`/families/${familyId}/books/${book.id}/order`}
                  className="block text-center bg-brand text-white text-base font-medium py-3.5 rounded-xl hover:bg-brand-dark transition-colors"
                >
                  Valider et commander ce livre
                </Link>
              </motion.div>
            )}
            {book.status !== "draft" && (
              <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
                <Link
                  href={`/families/${familyId}/books/${book.id}/order`}
                  className="block text-center bg-white text-brand-dark text-base font-medium py-3.5 rounded-xl border-2 border-brand hover:bg-brand-light transition-colors"
                >
                  Voir la commande
                </Link>
              </motion.div>
            )}

            {pdfPurchased ? (
              <motion.button
                onClick={handleDownloadPdf}
                disabled={downloading}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="w-full flex items-center justify-center gap-2 bg-white text-brand-dark text-base font-medium py-3 rounded-xl border-2 border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <Download size={18} />
                {downloading ? "Génération du PDF..." : "Télécharger en PDF"}
              </motion.button>
            ) : (
              <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
                <Link
                  href={`/families/${familyId}/books/${book.id}/order?format=pdf`}
                  className="w-full flex items-center justify-center gap-2 bg-white text-brand-dark text-base font-medium py-3 rounded-xl border-2 border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <Download size={18} />
                  Acheter le PDF (9.90 CHF)
                </Link>
              </motion.div>
            )}

            <div>
              <div className="flex items-center justify-between">
                <p className="text-base font-medium text-gray-800">Pages du livre</p>
                {canChangeTheme && (
                  <button
                    onClick={handleRelayout}
                    disabled={relaying}
                    className="flex items-center gap-1.5 text-sm font-medium text-brand hover:underline disabled:opacity-50"
                  >
                    <Shuffle size={14} /> {relaying ? "Réorganisation..." : "Réorganiser"}
                  </button>
                )}
              </div>
              {canChangeTheme && (
                <p className="text-sm text-gray-500 mt-0.5">
                  Touche « Recadrer » pour ajuster le cadrage d&apos;une photo, « Nombre de photos »
                  pour changer combien de photos une page contient, « Changer la mise en page » pour
                  choisir parmi les gabarits disponibles, ou « Réorganiser » pour redistribuer tout le
                  livre avec des photos toujours de même taille.
                </p>
              )}
            </div>

            <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-4">
              {book.pages.map((page) => (
                <BookPagePreview
                  key={page.id}
                  page={page}
                  theme={theme}
                  orientation={book.orientation}
                  editable={canChangeTheme}
                  onEditLayout={() => setEditingLayoutPageId(page.id)}
                  onEditPhotoCount={() => setEditingPhotoCountPageId(page.id)}
                  onEditCrop={() => setEditingCropPageId(page.id)}
                />
              ))}
            </motion.div>

            <motion.div variants={fadeInUp} initial="hidden" animate="visible">
              <BookCoverPreview
                theme={theme}
                familyName={familyName}
                periodLabel={periodLabel}
                variant="back-cover"
                orientation={book.orientation}
                dedicationMessage={book.dedication_message}
                dedicationFont={book.dedication_font}
              />
            </motion.div>
          </>
        )}
      </div>

      {editingLayoutPageId && (() => {
        const editingPage = book.pages.find((p) => p.id === editingLayoutPageId);
        if (!editingPage) return null;
        return (
          <BookLayoutPicker
            familyId={familyId}
            bookId={bookId}
            pageId={editingPage.id}
            photoCount={editingPage.book_memories.length}
            currentLayoutType={editingPage.layout_type}
            onClose={() => setEditingLayoutPageId(null)}
            onChanged={(layoutType) =>
              setBook((prev) =>
                prev
                  ? {
                      ...prev,
                      pages: prev.pages.map((p) =>
                        p.id === editingPage.id ? { ...p, layout_type: layoutType } : p
                      ),
                    }
                  : prev
              )
            }
          />
        );
      })()}

      {editingPhotoCountPageId && (() => {
        const resizingPage = book.pages.find((p) => p.id === editingPhotoCountPageId);
        if (!resizingPage) return null;
        return (
          <BookPageResizer
            familyId={familyId}
            bookId={bookId}
            pageId={resizingPage.id}
            currentPhotoCount={resizingPage.book_memories.length}
            onClose={() => setEditingPhotoCountPageId(null)}
            onApplied={(pages) => setBook((prev) => (prev ? { ...prev, pages } : prev))}
          />
        );
      })()}

      {editingCropPageId && (() => {
        const croppingPage = book.pages.find((p) => p.id === editingCropPageId);
        if (!croppingPage) return null;
        return (
          <BookPageCropper
            familyId={familyId}
            bookId={bookId}
            page={croppingPage}
            orientation={book.orientation}
            onClose={() => setEditingCropPageId(null)}
            onUpdated={(memoryId, focalX, focalY, zoom) =>
              setBook((prev) =>
                prev
                  ? {
                      ...prev,
                      pages: prev.pages.map((p) =>
                        p.id !== croppingPage.id
                          ? p
                          : {
                              ...p,
                              book_memories: p.book_memories.map((bm) =>
                                bm.memory.id === memoryId
                                  ? { ...bm, memory: { ...bm.memory, focal_x: focalX, focal_y: focalY, zoom } }
                                  : bm
                              ),
                            }
                      ),
                    }
                  : prev
              )
            }
          />
        );
      })()}

      <BottomNav familyId={familyId} />
    </main>
  );
}
