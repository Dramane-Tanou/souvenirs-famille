"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { api, ApiError } from "@/lib/api";
import { usePolling } from "@/hooks/usePolling";
import { fadeInUp } from "@/lib/motion";
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
import { BottomNav } from "@/components/BottomNav";

const FAMILY_PLAN_CHF_CENTS = 690; // 6.90 CHF/mois — doit rester synchro avec config/plans.php

interface SubscriptionInfo {
  plan: "free" | "family";
  status: string;
  photo_count: number;
  max_photos: number | null;
  is_limit_reached: boolean;
  pending_subscription: { price_cents: number; currency: string } | null;
}

export default function SubscriptionPage() {
  return (
    <Suspense fallback={<p className="p-8 text-base">Chargement...</p>}>
      <SubscriptionPageInner />
    </Suspense>
  );
}

function SubscriptionPageInner() {
  const params = useParams();
  const searchParams = useSearchParams();
  const familyId = params.id as string;
  const paymentReturn = searchParams.get("payment");

  const [info, setInfo] = useState<SubscriptionInfo | null>(null);
  const [currency, setCurrency] = useState<Currency>("CHF");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("stripe");
  const [detectedCountry, setDetectedCountry] = useState<string | null>(null);
  const [rates, setRates] = useState<Record<Currency, number>>(CURRENCY_RATES);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(Boolean(paymentReturn));

  const loadInfo = useCallback(async () => {
    const data = await api<SubscriptionInfo>(`/families/${familyId}/subscription`);
    setInfo(data);
    return data;
  }, [familyId]);

  usePolling(loadInfo, 10000);

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

  useEffect(() => {
    if (!paymentReturn) return;

    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      const fresh = await loadInfo();

      if (fresh.plan === "family" || attempts >= 8) {
        clearInterval(interval);
        setVerifying(false);
      }
    }, 2000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentReturn]);

  async function handleUpgrade() {
    setError(null);
    setLoading(true);
    try {
      const { checkout_url } = await api<{ checkout_url: string }>(
        `/families/${familyId}/subscription/upgrade`,
        { method: "POST", body: { currency, payment_method: paymentMethod } }
      );
      window.location.href = checkout_url;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue.");
      setLoading(false);
    }
  }

  async function handleDowngrade() {
    setError(null);
    setLoading(true);
    try {
      await api(`/families/${familyId}/subscription/downgrade`, { method: "POST" });
      await loadInfo();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  }

  if (verifying) {
    return (
      <main className="min-h-screen bg-brand-light flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
          <Loader2 className="animate-spin mx-auto mb-4 text-brand" size={32} />
          <p className="text-lg font-medium text-brand-dark mb-1">Vérification du paiement...</p>
          <p className="text-sm text-gray-500">Ça ne prend que quelques secondes.</p>
        </motion.div>
      </main>
    );
  }

  if (!info) {
    return <p className="p-8 text-base">Chargement...</p>;
  }

  const usagePercent = info.max_photos ? Math.min(100, (info.photo_count / info.max_photos) * 100) : 0;
  const estimatedAmount = convertFromChfCents(FAMILY_PLAN_CHF_CENTS, currency, rates);
  const availableMethods = PAYMENT_METHODS_BY_CURRENCY[currency];

  return (
    <main className="min-h-screen bg-brand-light pb-24">
      <BackHeader title="Abonnement" backHref={`/families/${familyId}`} backLabel="Fil de souvenirs" />

      <motion.div
        variants={fadeInUp}
        initial="hidden"
        animate="visible"
        className="max-w-2xl mx-auto px-4 sm:px-8 mt-6 space-y-4"
      >
        {paymentReturn === "cancelled" && (
          <p className="bg-amber-50 border border-amber-100 text-amber-800 text-sm font-medium rounded-xl px-4 py-3">
            Paiement annulé — tu peux réessayer ci-dessous.
          </p>
        )}

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-black/5">
          <div className="flex justify-between items-center mb-4">
            <p className="text-lg font-medium text-brand-dark">
              Plan {info.plan === "family" ? "Famille" : "Gratuit"}
            </p>
            <span className="text-sm font-medium text-gray-600 bg-gray-100 px-3 py-1 rounded-full capitalize">
              {info.status}
            </span>
          </div>

          {info.plan === "free" && info.max_photos !== null && (
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-600 mb-1.5">
                <span>{info.photo_count} photos utilisées</span>
                <span>{info.max_photos} max</span>
              </div>
              <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${info.is_limit_reached ? "bg-red-500" : "bg-brand"}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${usagePercent}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                />
              </div>
              {info.is_limit_reached && (
                <p className="text-red-700 text-sm font-medium mt-2">
                  Limite atteinte. Passez au plan Famille pour continuer à ajouter des souvenirs.
                </p>
              )}
            </div>
          )}

          {info.plan === "family" && (
            <p className="text-base text-gray-600 mb-4">
              Stockage illimité, tous les membres peuvent contribuer sans restriction.
            </p>
          )}

          {info.pending_subscription && (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-4">
              Un paiement de {formatCurrencyAmount(info.pending_subscription.price_cents, info.pending_subscription.currency)}{" "}
              est en attente de confirmation.
            </p>
          )}

          {error && <p className="text-red-700 text-sm font-medium mb-3">{error}</p>}

          {info.plan === "free" ? (
            <AnimatePresence mode="wait">
              <motion.div
                key="upgrade-form"
                variants={fadeInUp}
                initial="hidden"
                animate="visible"
                className="space-y-4"
              >
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

                <div>
                  <label className="block text-base font-medium mb-2 text-gray-800">Moyen de paiement</label>
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
                  <span className="text-sm text-gray-700">Abonnement mensuel</span>
                  <span className="text-lg font-semibold text-brand-dark">
                    {formatCurrencyAmount(estimatedAmount, currency)} / mois
                  </span>
                </div>

                <motion.button
                  onClick={handleUpgrade}
                  disabled={loading}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full bg-brand text-white text-base font-medium py-3.5 rounded-xl hover:bg-brand-dark transition-colors disabled:opacity-50"
                >
                  {loading ? "Redirection vers le paiement..." : "Passer au plan Famille"}
                </motion.button>
              </motion.div>
            </AnimatePresence>
          ) : (
            <motion.button
              onClick={handleDowngrade}
              disabled={loading}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className="w-full bg-white text-gray-700 text-base font-medium py-3.5 rounded-xl border-2 border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {loading ? "Traitement..." : "Revenir au plan gratuit"}
            </motion.button>
          )}
        </div>
      </motion.div>

      <BottomNav familyId={familyId} />
    </main>
  );
}
