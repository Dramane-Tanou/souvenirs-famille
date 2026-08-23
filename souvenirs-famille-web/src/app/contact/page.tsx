"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { BackHeader } from "@/components/BackHeader";
import { ChatThread, type ChatMessage } from "@/components/ChatThread";

export default function ContactAdminPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);

  useEffect(() => {
    api<ChatMessage[]>("/contact-messages/mine").then(setMessages);
  }, []);

  async function handleSend(body: string, image: File | null) {
    try {
      const formData = new FormData();
      if (body) formData.append("body", body);
      if (image) formData.append("image", image);

      const created = await api<ChatMessage>("/contact-messages", {
        method: "POST",
        body: formData,
        isFormData: true,
      });
      setMessages((prev) => (prev ? [...prev, created] : [created]));
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Erreur lors de l'envoi.", "error");
    }
  }

  if (!user || messages === null) {
    return (
      <main className="h-screen flex flex-col bg-brand-light">
        <BackHeader title="Contacter l'administrateur" backHref="/profile" />
        <p className="p-8 text-base text-gray-400 text-center">Chargement...</p>
      </main>
    );
  }

  return (
    <main className="h-screen flex flex-col bg-brand-light">
      <BackHeader
        title="Contacter l'administrateur"
        subtitle="Retrait d'un membre, suppression d'une famille, question..."
        backHref="/profile"
      />
      <div className="flex-1 overflow-hidden">
        <ChatThread
          messages={messages}
          isMine={(m) => m.sender_id === user.id}
          onSend={handleSend}
          emptyLabel="Aucun message pour l'instant. Écris ci-dessous pour contacter l'administration."
        />
      </div>
    </main>
  );
}
