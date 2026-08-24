export interface MentionCandidate {
  id: number;
  name: string;
}

export interface MentionSegment {
  text: string;
  isMention: boolean;
  isSelf: boolean;
}

/**
 * Découpe un texte de message en segments texte/mention, pour surligner les
 * `@Nom` qui correspondent à un membre réel de la famille (et distinguer
 * l'utilisateur courant, comme le fait WhatsApp).
 */
export function renderWithMentions(
  body: string,
  candidates: MentionCandidate[],
  currentUserId: number
): MentionSegment[] {
  if (candidates.length === 0 || !body) {
    return [{ text: body, isMention: false, isSelf: false }];
  }

  const sorted = [...candidates].sort((a, b) => b.name.length - a.name.length);
  const pattern = new RegExp(
    `@(${sorted.map((c) => c.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})(?![\\p{L}])`,
    "giu"
  );

  const segments: MentionSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(body)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: body.slice(lastIndex, match.index), isMention: false, isSelf: false });
    }
    const mentioned = sorted.find((c) => c.name.toLowerCase() === match![1].toLowerCase());
    segments.push({
      text: match[0],
      isMention: true,
      isSelf: mentioned?.id === currentUserId,
    });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < body.length) {
    segments.push({ text: body.slice(lastIndex), isMention: false, isSelf: false });
  }

  return segments;
}

/**
 * Filtre les candidats à l'autocomplete `@` en fonction du fragment déjà
 * tapé après le dernier `@` du texte, en tenant compte du bord de mot (un
 * `@` collé à une lettre précédente n'ouvre pas l'autocomplete, comme sur
 * WhatsApp).
 */
export function findActiveMentionQuery(text: string, cursor: number): string | null {
  const uptoCursor = text.slice(0, cursor);
  const at = uptoCursor.lastIndexOf("@");
  if (at === -1) return null;

  const before = uptoCursor[at - 1];
  if (before && /[\p{L}\p{N}]/u.test(before)) return null;

  const fragment = uptoCursor.slice(at + 1);
  if (/\s/.test(fragment)) return null;

  return fragment;
}

export function filterMentionCandidates(candidates: MentionCandidate[], query: string): MentionCandidate[] {
  const needle = query.trim().toLowerCase();
  return candidates
    .filter((c) => c.name.toLowerCase().startsWith(needle))
    .slice(0, 6);
}
