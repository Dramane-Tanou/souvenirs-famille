import { api } from "@/lib/api";

export type Currency = "CHF" | "EUR" | "USD" | "XOF";

// Taux de repli, utilisés le temps que /currencies (taux live, rafraîchis
// toutes les 24h côté serveur — voir App\Support\CurrencyRates) réponde, ou
// si cet appel échoue. Le serveur reste seul responsable du prix facturé ;
// ceci ne sert qu'à l'aperçu affiché avant paiement.
export const CURRENCY_RATES: Record<Currency, number> = {
  CHF: 1,
  EUR: 1.05,
  USD: 1.15,
  XOF: 690,
};

/** Récupère les taux de change en direct depuis le backend, avec repli silencieux. */
export async function fetchLiveRates(): Promise<Record<Currency, number>> {
  try {
    const rates = await api<Record<Currency, number>>("/currencies");
    return { ...CURRENCY_RATES, ...rates };
  } catch {
    return CURRENCY_RATES;
  }
}

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  CHF: "CHF",
  EUR: "€",
  USD: "$",
  XOF: "FCFA",
};

export const ZERO_DECIMAL_CURRENCIES: Currency[] = ["XOF"];

export type PaymentMethod = "stripe" | "paypal" | "cinetpay";

export const PAYMENT_METHODS_BY_CURRENCY: Record<Currency, PaymentMethod[]> = {
  CHF: ["stripe", "paypal"],
  EUR: ["stripe", "paypal"],
  USD: ["stripe", "paypal"],
  XOF: ["cinetpay"],
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  stripe: "Carte bancaire",
  paypal: "PayPal",
  cinetpay: "Mobile Money",
};

/** Convertit un montant en centimes CHF vers la devise cible, dans sa plus petite unité. */
export function convertFromChfCents(
  chfCents: number,
  currency: Currency,
  rates: Record<Currency, number> = CURRENCY_RATES
): number {
  const converted = (chfCents / 100) * rates[currency];
  return ZERO_DECIMAL_CURRENCIES.includes(currency) ? Math.round(converted) : Math.round(converted * 100);
}

/** Formate un montant déjà dans sa plus petite unité (ex: price_cents d'une commande). */
export function formatCurrencyAmount(amount: number, currency: string): string {
  const symbol = CURRENCY_SYMBOLS[currency as Currency] ?? currency;
  const isZeroDecimal = ZERO_DECIMAL_CURRENCIES.includes(currency as Currency);
  const value = isZeroDecimal ? amount : amount / 100;
  const formatted = isZeroDecimal ? value.toLocaleString("fr-FR") : value.toFixed(2);
  return `${formatted} ${symbol}`;
}
