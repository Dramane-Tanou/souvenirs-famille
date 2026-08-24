/** Âge minimum pour créer ou détenir un compte — voir App\Support\AgeRules côté backend, source de vérité. */
export const MIN_ACCOUNT_AGE_YEARS = 13;

/** Date la plus récente sélectionnable pour une naissance, pour avoir au moins MIN_ACCOUNT_AGE_YEARS ans aujourd'hui. */
export function maxBirthDateForMinAge(): string {
  const date = new Date();
  date.setFullYear(date.getFullYear() - MIN_ACCOUNT_AGE_YEARS);
  return date.toISOString().split("T")[0];
}

export function calculateAge(birthDate: string): number {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

/**
 * Parse une date en heure locale plutôt qu'en UTC minuit — `new
 * Date("2026-03-01")` est interprété comme UTC minuit par la spec ES, ce qui
 * peut faire reculer le mois affiché d'un cran dans les fuseaux horaires en
 * retard sur UTC (ex. la veille au soir en UTC-x). N'utilise que les 10
 * premiers caractères ("YYYY-MM-DD") : l'API renvoie parfois un timestamp
 * complet ("2026-03-01T00:00:00.000000Z") pour les dates de période de livre,
 * qu'un simple split("-") casse (le jour hérite du suffixe horaire → NaN).
 */
function parseDateOnly(value: string): Date {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Date(year, month - 1, day);
}

/** Libellé d'une période de livre photo (ex. "mars 2026" ou "jan. 2026 — mars 2026"). */
export function formatPeriodLabel(start: string, end: string): string {
  const startDate = parseDateOnly(start);
  const endDate = parseDateOnly(end);
  const sameMonth = startDate.getMonth() === endDate.getMonth() && startDate.getFullYear() === endDate.getFullYear();

  if (sameMonth) {
    return startDate.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  }

  const startLabel = startDate.toLocaleDateString("fr-FR", { month: "short", year: "numeric" });
  const endLabel = endDate.toLocaleDateString("fr-FR", { month: "short", year: "numeric" });
  return `${startLabel} — ${endLabel}`;
}
