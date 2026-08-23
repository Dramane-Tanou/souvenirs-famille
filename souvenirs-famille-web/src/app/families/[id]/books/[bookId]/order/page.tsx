"use client";

import { useEffect, useState, useCallback, FormEvent, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Download, Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { api, downloadFile, albumPdfFilename, ApiError } from "@/lib/api";
import { formatPeriodLabel } from "@/lib/date";
import { usePolling } from "@/hooks/usePolling";
import { useToast } from "@/context/ToastContext";
import { getBookTheme } from "@/lib/bookThemes";
import {
  type Currency,
  type PaymentMethod,
  CURRENCY_RATES,
  CURRENCY_SYMBOLS,
  PAYMENT_METHODS_BY_CURRENCY,
  PAYMENT_METHOD_LABELS,
  convertFromChfCents,
  formatCurrencyAmount,
  fetchLiveRates,
} from "@/lib/currency";
import { BackHeader } from "@/components/BackHeader";
import { BookPagePreview, type BookPage } from "@/components/BookPagePreview";
import { fadeInUp, scaleIn, staggerContainer } from "@/lib/motion";

type Format = "softcover" | "hardcover" | "pdf";

interface Order {
  id: number;
  format: Format;
  payment_method: PaymentMethod | null;
  price_cents: number;
  currency: string;
  payment_status: string;
  delivery_address: string | null;
  tracking_number: string | null;
  created_at: string;
}

interface Book {
  id: number;
  status: string;
  theme: string | null;
  period_start: string;
  period_end: string;
  pages: BookPage[];
  orders: Order[];
}

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  paid: "Payée",
  failed: "Échouée",
  refunded: "Remboursée",
};

const BASE_PRICE_CENTS: Record<Format, number> = {
  softcover: 2900,
  hardcover: 4900,
  pdf: 990,
};
const PRICE_PER_PAGE_CENTS = 50;
const PHYSICAL: Format[] = ["softcover", "hardcover"];

function estimateChfCents(format: Format, pageCount: number) {
  if (format === "pdf") return BASE_PRICE_CENTS.pdf;
  return BASE_PRICE_CENTS[format] + Math.max(0, pageCount - 10) * PRICE_PER_PAGE_CENTS;
}

export default function OrderPage() {
  return (
    <Suspense fallback={<p className="p-8 text-base">Chargement...</p>}>
      <OrderPageInner />
    </Suspense>
  );
}

function OrderPageInner() {
  const params = useParams();
  const searchParams = useSearchParams();
  const familyId = params.id as string;
  const bookId = params.bookId as string;
  const paymentReturn = searchParams.get("payment");

  const [book, setBook] = useState<Book | null>(null);
  const [familyName, setFamilyName] = useState("");
  const [format, setFormat] = useState<Format>(
    (searchParams.get("format") as Format) === "pdf" ? "pdf" : "softcover"
  );
  const [currency, setCurrency] = useState<Currency>("CHF");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("stripe");
  const [detectedCountry, setDetectedCountry] = useState<string | null>(null);
  const [rates, setRates] = useState<Record<Currency, number>>(CURRENCY_RATES);
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [verifying, setVerifying] = useState(Boolean(paymentReturn));
  const { showToast } = useToast();

  const loadBook = useCallback(async () => {
    const data = await api<Book>(`/families/${familyId}/books/${bookId}`);
    setBook(data);
    return data;
  }, [familyId, bookId]);

  usePolling(loadBook, 8000);

  useEffect(() => {
    api<{ name: string }>(`/families/${familyId}`).then((f) => setFamilyName(f.name));
  }, [familyId]);

  function handleCurrencyChange(next: Currency) {
    setCurrency(next);
    const allowed = PAYMENT_METHODS_BY_CURRENCY[next];
    if (!allowed.includes(paymentMethod)) {
      setPaymentMethod(allowed[0]);
    }
  }

  useEffect(() => {
    api<{ country: string; currency: Currency }>("/geo/currency").then((geo) => {
      setDetectedCountry(geo.country);
      handleCurrencyChange(geo.currency);
    });
    fetchLiveRates().then(setRates);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Après un retour de paiement (redirection du prestataire), le webhook peut
  // avoir un léger décalage : on re-sonde la commande quelques secondes.
  useEffect(() => {
    if (!paymentReturn) return;

    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      const fresh = await loadBook();
      const stillPending = fresh.orders.some((o) => o.payment_status === "pending");

      if (!stillPending || attempts >= 8) {
        clearInterval(interval);
        setVerifying(false);
        if (!stillPending) showToast("Paiement confirmé !");
      }
    }, 2000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentReturn]);

  const physicalOrder = book?.orders.find((o) => PHYSICAL.includes(o.format));
  const pdfOrder = book?.orders.find((o) => o.format === "pdf");
  const currentOrder = format === "pdf" ? pdfOrder : physicalOrder;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!book) return;
    setError(null);
    setSubmitting(true);

    try {
      if (book.status === "draft") {
        await api(`/families/${familyId}/books/${bookId}/validate`, { method: "POST" });
      }

      const { checkout_url } = await api<{ order: Order; checkout_url: string }>(
        `/families/${familyId}/books/${bookId}/order`,
        {
          method: "POST",
          body: {
            format,
            currency,
            payment_method: paymentMethod,
            delivery_address: format === "pdf" ? undefined : address,
          },
        }
      );

      window.location.href = checkout_url;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue.");
      setSubmitting(false);
    }
  }

  async function handleDownload() {
    setDownloading(true);
    try {
      await downloadFile(`/families/${familyId}/books/${bookId}/pdf`, albumPdfFilename(familyName));
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Le téléchargement a échoué.", "error");
    } finally {
      setDownloading(false);
    }
  }

  if (!book) {
    return <p className="p-8 text-base">Chargement...</p>;
  }

  const periodLabel = formatPeriodLabel(book.period_start, book.period_end);
  const theme = getBookTheme(book.theme);
  const pageCount = book.pages.length;
  const estimatedAmount = convertFromChfCents(estimateChfCents(format, pageCount), currency, rates);
  const availableMethods = PAYMENT_METHODS_BY_CURRENCY[currency];

  if (verifying) {
    return (
      <main className="min-h-screen bg-brand-light flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <Loader2 className="animate-spin mx-auto mb-4 text-brand" size={32} />
          <p className="text-lg font-medium text-brand-dark mb-1">Vérification du paiement...</p>
          <p className="text-sm text-gray-500">Ça ne prend que quelques secondes.</p>
        </motion.div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-brand-light pb-24">
      <BackHeader
        title={`Commander — ${periodLabel}`}
        backHref={`/families/${familyId}/books/${bookId}`}
        backLabel="Le livre"
      />

      <div className="max-w-2xl mx-auto px-4 sm:px-8 mt-6 space-y-6">
        {paymentReturn === "cancelled" && (
          <p className="bg-amber-50 border border-amber-100 text-amber-800 text-sm font-medium rounded-xl px-4 py-3">
            Paiement annulé — tu peux réessayer ci-dessous.
          </p>
        )}
        {!theme ? (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-black/5 text-center space-y-3">
            <p className="text-base text-gray-700">Choisis d&apos;abord un design pour ton livre.</p>
            <Link
              href={`/families/${familyId}/books/${bookId}`}
              className="inline-block bg-brand text-white text-base font-medium px-6 py-3 rounded-xl hover:bg-brand-dark transition-colors"
            >
              Choisir un design
            </Link>
          </div>
        ) : (
          <>
            <div>
              <p className="text-base font-medium text-gray-800 mb-3">Aperçu de votre livre</p>
              <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-3">
                {book.pages.map((page) => (
                  <BookPagePreview key={page.id} page={page} theme={theme} />
                ))}
              </motion.div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-black/5 space-y-5">
              <div>
                <label className="block text-base font-medium mb-3 text-gray-800">Format</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["softcover", "hardcover", "pdf"] as Format[]).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFormat(f)}
                      className={`text-sm font-medium py-3 rounded-xl border-2 transition-colors ${
                        format === f
                          ? "border-brand bg-brand-light text-brand-dark"
                          : "border-gray-200 text-gray-700"
                      }`}
                    >
                      {f === "softcover" ? "Souple" : f === "hardcover" ? "Rigide" : "PDF"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-base font-medium text-gray-800">Devise</label>
                  {detectedCountry && (
                    <span className="text-xs text-gray-400">Détecté : {detectedCountry}</span>
                  )}
                </div>
                <select
                  value={currency}
                  onChange={(e) => handleCurrencyChange(e.target.value as Currency)}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base focus:border-brand focus:outline-none"
                >
                  {(Object.keys(CURRENCY_SYMBOLS) as Currency[]).map((c) => (
                    <option key={c} value={c}>
                      {c} ({CURRENCY_SYMBOLS[c]})
                    </option>
                  ))}
                </select>
              </div>

              <AnimatePresence mode="wait">
                {currentOrder ? (
                  <motion.div
                    key="already-purchased"
                    variants={scaleIn}
                    initial="hidden"
                    animate="visible"
                    className="space-y-3"
                  >
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">
                        {currentOrder.payment_status === "pending" ? "En cours :" : "Déjà acheté :"}
                      </span>{" "}
                      {formatCurrencyAmount(currentOrder.price_cents, currentOrder.currency)} —{" "}
                      {PAYMENT_STATUS_LABELS[currentOrder.payment_status]}
                    </p>
                    {currentOrder.format === "pdf" && currentOrder.payment_status === "paid" && (
                      <motion.button
                        onClick={handleDownload}
                        disabled={downloading}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full flex items-center justify-center gap-2 bg-brand text-white text-base font-medium py-3.5 rounded-xl hover:bg-brand-dark transition-colors disabled:opacity-50"
                      >
                        <Download size={18} />
                        {downloading ? "Génération..." : "Télécharger maintenant"}
                      </motion.button>
                    )}
                    {currentOrder.delivery_address && (
                      <p className="text-sm text-gray-500">Livraison à : {currentOrder.delivery_address}</p>
                    )}
                  </motion.div>
                ) : (
                  <motion.form
                    key="order-form"
                    variants={fadeInUp}
                    initial="hidden"
                    animate="visible"
                    onSubmit={handleSubmit}
                    className="space-y-5"
                  >
                    <div>
                      <label className="block text-base font-medium mb-3 text-gray-800">Moyen de paiement</label>
                      <div className={`grid gap-2 ${availableMethods.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
                        {availableMethods.map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setPaymentMethod(m)}
                            className={`text-sm font-medium py-3 rounded-xl border-2 transition-colors ${
                              paymentMethod === m
                                ? "border-brand bg-brand-light text-brand-dark"
                                : "border-gray-200 text-gray-700"
                            }`}
                          >
                            {PAYMENT_METHOD_LABELS[m]}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between bg-brand-light rounded-xl px-4 py-3">
                      <span className="text-sm text-gray-700">
                        {format === "pdf" ? "Prix fixe" : `${pageCount} page${pageCount > 1 ? "s" : ""}`}
                      </span>
                      <AnimatePresence mode="wait">
                        <motion.span
                          key={`${estimatedAmount}-${currency}`}
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 6 }}
                          transition={{ duration: 0.2 }}
                          className="text-lg font-semibold text-brand-dark"
                        >
                          {formatCurrencyAmount(estimatedAmount, currency)}
                        </motion.span>
                      </AnimatePresence>
                    </div>

                    {format !== "pdf" && (
                      <div>
                        <label htmlFor="address" className="block text-base font-medium mb-2 text-gray-800">
                          Adresse de livraison
                        </label>
                        <textarea
                          id="address"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          rows={3}
                          placeholder="Rue, numéro, code postal, ville, pays"
                          className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base focus:border-brand focus:outline-none resize-none"
                          required
                        />
                      </div>
                    )}

                    {error && <p className="text-red-700 text-sm font-medium">{error}</p>}

                    <motion.button
                      type="submit"
                      disabled={submitting}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full bg-brand text-white text-base font-medium py-3.5 rounded-xl hover:bg-brand-dark transition-colors disabled:opacity-50"
                    >
                      {submitting ? "Redirection vers le paiement..." : "Confirmer et payer"}
                    </motion.button>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
