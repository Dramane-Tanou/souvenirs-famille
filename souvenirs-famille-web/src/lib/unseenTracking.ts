// Repère "vu" générique pour un badge de messages non lus, sur le même
// principe partout dans l'app : un horodatage en local storage, mis à jour
// à chaque consultation du fil, comparé à la date des messages reçus pour
// savoir s'il y en a de nouveaux.

export function markSeen(storageKey: string, items: { created_at: string }[]) {
  if (items.length === 0) return;
  const latest = items.reduce((max, m) => (m.created_at > max ? m.created_at : max), "");
  localStorage.setItem(storageKey, latest);
}

export function getSeenAt(storageKey: string): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(storageKey);
}

export function countUnseen<T extends { created_at: string }>(
  items: T[],
  seenAt: string | null,
  isFromOther: (item: T) => boolean
): number {
  return items.filter((item) => isFromOther(item) && (!seenAt || item.created_at > seenAt)).length;
}
