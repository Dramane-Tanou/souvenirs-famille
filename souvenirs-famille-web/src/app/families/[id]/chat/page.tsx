"use client";

import { useCallback, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { usePolling } from "@/hooks/usePolling";
import { markSeen } from "@/lib/unseenTracking";
import { familyChatSeenKey } from "@/lib/familyChat";
import { BackHeader } from "@/components/BackHeader";
import { ChatThread, type ChatMessage } from "@/components/ChatThread";

interface Member {
  id: number;
  name: string;
  first_name: string | null;
}

const MESSAGES_POLL_MS = 4000;
const TYPING_POLL_MS = 2000;

export default function FamilyChatPage() {
  const params = useParams();
  const familyId = params.id as string;
  const { user } = useAuth();
  const { showToast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [typingUserIds, setTypingUserIds] = useState<number[]>([]);

  const refreshMessages = useCallback(async () => {
    const latest = await api<ChatMessage[]>(`/families/${familyId}/messages`);
    setMessages(latest);
    // Marque tout comme vu en continu tant que la page est ouverte, pour que
    // le badge (en-tête de la page famille) ne se déclenche pas pour des
    // messages déjà lus ici — même principe que /contact.
    markSeen(familyChatSeenKey(familyId), latest);
  }, [familyId]);

  const refreshMembers = useCallback(async () => {
    const data = await api<Member[]>(`/families/${familyId}/members`);
    setMembers(data);
  }, [familyId]);

  const refreshTyping = useCallback(async () => {
    const { typing_user_ids } = await api<{ typing_user_ids: number[] }>(
      `/families/${familyId}/messages/typing-status`
    );
    setTypingUserIds(typing_user_ids);
  }, [familyId]);

  usePolling(refreshMessages, MESSAGES_POLL_MS);
  usePolling(refreshMembers, 30000);
  usePolling(refreshTyping, TYPING_POLL_MS);

  function handleTyping() {
    api(`/families/${familyId}/messages/typing`, { method: "POST" }).catch(() => {});
  }

  async function handleSend(body: string, image: File | null) {
    try {
      const formData = new FormData();
      if (body) formData.append("body", body);
      if (image) formData.append("image", image);

      const created = await api<ChatMessage>(`/families/${familyId}/messages`, {
        method: "POST",
        body: formData,
        isFormData: true,
      });
      setMessages((prev) => (prev ? [...prev, created] : [created]));
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Erreur lors de l'envoi.", "error");
    }
  }

  const mentionCandidates = useMemo(
    () => members.filter((m) => m.id !== user?.id).map((m) => ({ id: m.id, name: m.first_name || m.name })),
    [members, user?.id]
  );

  const typingLabel = useMemo(() => {
    if (typingUserIds.length === 0) return null;
    const names = typingUserIds
      .map((id) => members.find((m) => m.id === id))
      .filter((m): m is Member => !!m)
      .map((m) => m.first_name || m.name);
    if (names.length === 0) return null;
    if (names.length === 1) return `${names[0]} est en train d'écrire...`;
    return `${names.join(", ")} sont en train d'écrire...`;
  }, [typingUserIds, members]);

  if (!user || messages === null) {
    return (
      <main className="h-screen flex flex-col bg-brand-light">
        <BackHeader title="Chat de famille" backHref={`/families/${familyId}`} />
        <p className="p-8 text-base text-gray-400 text-center">Chargement...</p>
      </main>
    );
  }

  return (
    <main className="h-screen flex flex-col bg-brand-light">
      <BackHeader
        title="Chat de famille"
        subtitle="Discutez entre membres — mentionnez quelqu'un avec @"
        backHref={`/families/${familyId}`}
      />
      <div className="flex-1 overflow-hidden">
        <ChatThread
          messages={messages}
          isMine={(m) => m.sender_id === user.id}
          onSend={handleSend}
          onTyping={handleTyping}
          typingLabel={typingLabel}
          senderLabel={(m) => m.sender.first_name || m.sender.name}
          mentionCandidates={mentionCandidates}
          currentUserId={user.id}
          emptyLabel="Aucun message pour l'instant. Écris ci-dessous pour lancer la discussion !"
        />
      </div>
    </main>
  );
}
