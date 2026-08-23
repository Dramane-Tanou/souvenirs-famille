"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { BackHeader } from "@/components/BackHeader";
import { BottomNav } from "@/components/BottomNav";
import { Trash2, RectangleVertical, RectangleHorizontal } from "lucide-react";
import { CardListSkeleton } from "@/components/Skeleton";

interface Book {
  id: number;
  period_type: string;
  orientation: "portrait" | "landscape";
  period_start: string;
  period_end: string;
  status: string;
}

const STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon",
  validated: "Validé",
  ordered: "Commandé",
  printed: "Imprimé",
  delivered: "Livré",
};

const PERIOD_OPTIONS: { value: string; label: string }[] = [
  { value: "monthly", label: "1 mois" },
  { value: "quarterly", label: "3 mois" },
  { value: "semiannual", label: "6 mois" },
  { value: "yearly", label: "1 an" },
];

function formatPeriod(start: string, end: string) {
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

export default function BooksListPage() {
  const params = useParams();
  const familyId = params.id as string;

  const [books, setBooks] = useState<Book[] | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState("monthly");
  const [selectedOrientation, setSelectedOrientation] = useState<"portrait" | "landscape">("portrait");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadBooks = useCallback(async () => {
    const data = await api<Book[]>(`/families/${familyId}/books`);
    setBooks(data);
  }, [familyId]);

  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

  async function handleGenerate() {
    setError(null);
    setGenerating(true);
    try {
      await api(`/families/${familyId}/books`, {
        method: "POST",
        body: { period_type: selectedPeriod, orientation: selectedOrientation },
      });
      await loadBooks();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <main className="min-h-screen bg-brand-light pb-24">
      <BackHeader title="Livres photo" backHref={`/families/${familyId}`} backLabel="Fil de souvenirs" />

      <div className="max-w-2xl mx-auto px-4 sm:px-8 mt-6 space-y-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-black/5">
          <p className="text-base font-medium text-gray-800 mb-3">Générer un nouveau livre</p>
          <div className="grid grid-cols-4 gap-2 mb-4">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSelectedPeriod(opt.value)}
                className={`text-sm font-medium py-2.5 rounded-lg border-2 transition-colors ${
                  selectedPeriod === opt.value
                    ? "border-brand bg-brand-light text-brand-dark"
                    : "border-gray-200 text-gray-600"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <p className="text-sm font-medium text-gray-600 mb-2">Format du livre</p>
          <div className="grid grid-cols-2 gap-2 mb-4">
            <button
              onClick={() => setSelectedOrientation("portrait")}
              className={`flex items-center justify-center gap-1.5 text-sm font-medium py-2.5 rounded-lg border-2 transition-colors ${
                selectedOrientation === "portrait"
                  ? "border-brand bg-brand-light text-brand-dark"
                  : "border-gray-200 text-gray-600"
              }`}
            >
              <RectangleVertical size={16} /> Vertical
            </button>
            <button
              onClick={() => setSelectedOrientation("landscape")}
              className={`flex items-center justify-center gap-1.5 text-sm font-medium py-2.5 rounded-lg border-2 transition-colors ${
                selectedOrientation === "landscape"
                  ? "border-brand bg-brand-light text-brand-dark"
                  : "border-gray-200 text-gray-600"
              }`}
            >
              <RectangleHorizontal size={16} /> Horizontal
            </button>
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="w-full bg-brand text-white text-base font-medium py-3.5 rounded-xl hover:bg-brand-dark transition-colors disabled:opacity-50"
          >
            {generating ? "Génération en cours..." : "Générer le livre"}
          </button>
        </div>

        {error && (
          <p className="text-red-700 text-sm font-medium bg-white rounded-xl p-4 border border-red-100">
            {error}
          </p>
        )}

        {books === null && <CardListSkeleton />}

        {books !== null && books.length === 0 && (
          <p className="text-base text-gray-500 text-center py-8">
            Aucun livre pour l&apos;instant. Choisissez une période ci-dessus pour générer votre premier livre !
          </p>
        )}

        {books !== null && books.length > 0 && (
          <div className="space-y-3">
            {books.map((book) => {
  const canDelete = book.status === "draft" || book.status === "validated";
  return (
    <div
      key={book.id}
      className="relative bg-white rounded-2xl p-5 shadow-sm border border-black/5 hover:border-brand transition-colors"
    >
      <Link href={`/families/${familyId}/books/${book.id}`} className="block pr-8">
        <div className="flex justify-between items-center">
          <p className="text-lg font-medium text-brand-dark capitalize flex items-center gap-1.5">
            {book.orientation === "landscape" ? (
              <RectangleHorizontal size={15} className="text-gray-400 flex-shrink-0" />
            ) : (
              <RectangleVertical size={15} className="text-gray-400 flex-shrink-0" />
            )}
            {formatPeriod(book.period_start, book.period_end)}
          </p>
          <span className="text-sm font-medium text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
            {STATUS_LABELS[book.status] ?? book.status}
          </span>
        </div>
      </Link>
      {canDelete && (
        <button
          onClick={async (e) => {
            e.preventDefault();
            if (!confirm("Supprimer ce livre non commandé ?")) return;
            try {
              await api(`/families/${familyId}/books/${book.id}`, { method: "DELETE" });
              await loadBooks();
            } catch (err) {
              setError(err instanceof ApiError ? err.message : "Erreur lors de la suppression.");
            }
          }}
          aria-label="Supprimer le livre"
          className="absolute top-1/2 -translate-y-1/2 right-3 text-gray-400 hover:text-red-600 p-2"
        >
          <Trash2 size={18} />
        </button>
      )}
    </div>
  );
})}
          </div>
        )}
      </div>

      <BottomNav familyId={familyId} />
    </main>
  );
}