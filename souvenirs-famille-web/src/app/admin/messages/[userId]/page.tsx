"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { usePolling } from "@/hooks/usePolling";
import { BackHeader } from "@/components/BackHeader";
import { ChatThread, type ChatMessage } from "@/components/ChatThread";

interface Thread {
  user: { id: number; name: string; email: string; phone: string | null };
  messages: ChatMessage[];
}

const MESSAGES_POLL_MS = 4000;
const TYPING_POLL_MS = 2000;

export default function AdminConversationPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const userId = params.userId as string;
  const { showToast } = useToast();

  const [thread, setThread] = useState<Thread | null>(null);
  const [customerTyping, setCustomerTyping] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isAdmin = !!(user?.is_admin || user?.is_super_admin);

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      router.push("/dashboard");
    }
  }, [loading, user, isAdmin, router]);

  const refreshThread = useCallback(async () => {
    const latest = await api<Thread>(`/admin/contact-messages/${userId}`);
    setThread(latest);
  }, [userId]);

  const refreshTyping = useCallback(async () => {
    const { typing } = await api<{ typing: boolean }>(`/admin/contact-messages/${userId}/typing-status`);
    setCustomerTyping(typing);
  }, [userId]);

  usePolling(refreshThread, MESSAGES_POLL_MS, isAdmin);
  usePolling(refreshTyping, TYPING_POLL_MS, isAdmin);

  function handleTyping() {
    api(`/admin/contact-messages/${userId}/typing`, { method: "POST" }).catch(() => {});
  }

  async function handleSend(body: string, image: File | null) {
    try {
      const formData = new FormData();
      if (body) formData.append("body", body);
      if (image) formData.append("image", image);

      const created = await api<ChatMessage>(`/admin/contact-messages/${userId}/reply`, {
        method: "POST",
        body: formData,
        isFormData: true,
      });
      setThread((prev) => (prev ? { ...prev, messages: [...prev.messages, created] } : prev));
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Erreur lors de l'envoi.", "error");
    }
  }

  async function handleDeleteConversation() {
    if (!confirm("Effacer toute la conversation avec cet utilisateur ? Cette action est définitive.")) return;
    setDeleting(true);
    try {
      await api(`/admin/contact-messages/${userId}`, { method: "DELETE" });
      showToast("Conversation supprimée.");
      router.push("/admin");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Erreur lors de la suppression.", "error");
    } finally {
      setDeleting(false);
    }
  }

  if (loading || !user || !isAdmin || thread === null) {
    return (
      <main className="h-screen flex flex-col bg-brand-light">
        <BackHeader title="Conversation" backHref="/admin" />
        <p className="p-8 text-base text-gray-400 text-center">Chargement...</p>
      </main>
    );
  }

  return (
    <main className="h-screen flex flex-col bg-brand-light">
      <BackHeader
        title={thread.user.name}
        subtitle={[thread.user.email, thread.user.phone].filter(Boolean).join(" · ")}
        backHref="/admin"
        backLabel="Messages"
        action={
          <button
            onClick={handleDeleteConversation}
            disabled={deleting}
            aria-label="Supprimer la conversation"
            className="flex items-center gap-1.5 text-sm font-medium text-white bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-full transition-colors disabled:opacity-50"
          >
            <Trash2 size={14} />
            Terminer
          </button>
        }
      />
      <div className="flex-1 overflow-hidden">
        <ChatThread
          messages={thread.messages}
          isMine={(m) => m.sender.is_admin || m.sender.is_super_admin}
          onSend={handleSend}
          onTyping={handleTyping}
          otherTyping={customerTyping}
          otherPartyLabel={thread.user.name}
          emptyLabel="Aucun message dans cette conversation."
        />
      </div>
    </main>
  );
}
