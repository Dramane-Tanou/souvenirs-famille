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
 * Parse une date "YYYY-MM-DD" en heure locale plutôt qu'en UTC minuit —
 * `new Date("2026-03-01")` est interprété comme UTC minuit par la spec ES,
 * ce qui peut faire reculer le mois affiché d'un cran dans les fuseaux
 * horaires en retard sur UTC (ex. la veille au soir en UTC-x).
 */
function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
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
