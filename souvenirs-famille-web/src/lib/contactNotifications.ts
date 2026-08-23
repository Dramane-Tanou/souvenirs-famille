// Repère "vu" pour le badge de messages non lus (fil /contact), sur le même
// principe que les badges déjà utilisés côté admin : un horodatage en local
// storage, mis à jour à chaque consultation du fil, comparé à la date des
// messages reçus pour savoir s'il y en a de nouveaux.
export const CONTACT_SEEN_AT_KEY = "contact_seen_at";

export function markContactMessagesSeen(messages: { created_at: string }[]) {
  if (messages.length === 0) return;
  const latest = messages.reduce((max, m) => (m.created_at > max ? m.created_at : max), "");
  localStorage.setItem(CONTACT_SEEN_AT_KEY, latest);
}
