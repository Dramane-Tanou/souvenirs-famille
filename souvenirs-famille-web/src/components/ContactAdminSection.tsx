"use client";

import { useEffect, useState, FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, X, Send } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/context/ToastContext";
import { backdropFade, scaleIn } from "@/lib/motion";

interface ContactMessage {
  id: number;
  message: string;
  status: "open" | "answered";
  admin_reply: string | null;
  replier: { id: number; name: string } | null;
  replied_at: string | null;
  created_at: string;
}

export function ContactAdminSection() {
  const { showToast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [myMessages, setMyMessages] = useState<ContactMessage[] | null>(null);

  useEffect(() => {
    api<ContactMessage[]>("/contact-messages/mine").then(setMyMessages).catch(() => {});
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSending(true);
    try {
      const created = await api<ContactMessage>("/contact-messages", {
        method: "POST",
        body: { message: text },
      });
      setMyMessages((prev) => (prev ? [created, ...prev] : [created]));
      setText("");
      setShowModal(false);
      showToast("Message envoyé à l'administration.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue.");
    } finally {
      setSending(false);
    }
  }

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div>
      <button
        onClick={() => setShowModal(true)}
        className="w-full flex items-center justify-center gap-2 bg-white text-brand-dark text-base font-medium py-3.5 rounded-xl border-2 border-brand/20 hover:bg-brand-light transition-colors"
      >
        <MessageCircle size={19} />
        Contacter l&apos;administrateur
      </button>

      {myMessages && myMessages.length > 0 && (
        <div className="mt-4 space-y-3">
          {myMessages.map((m) => (
            <div key={m.id} className="bg-white rounded-2xl p-4 shadow-sm border border-black/5">
              <div className="flex items-center justify-between mb-1.5">
                <span
                  className={`text-xs font-medium px-2 py-1 rounded-full ${
                    m.status === "answered" ? "text-green-700 bg-green-50" : "text-amber-700 bg-amber-50"
                  }`}
                >
                  {m.status === "answered" ? "Répondu" : "En attente de réponse"}
                </span>
                <span className="text-xs text-gray-400">{formatDate(m.created_at)}</span>
              </div>
              <p className="text-sm text-gray-700">{m.message}</p>
              {m.admin_reply && (
                <div className="mt-2 pt-2 border-t border-gray-100">
                  <p className="text-xs font-medium text-brand-dark mb-1">
                    Réponse de l&apos;administration{m.replier && <span className="font-normal text-gray-500"> — {m.replier.name}</span>}
                  </p>
                  <p className="text-sm text-gray-600">{m.admin_reply}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showModal && (
          <motion.div
            variants={backdropFade}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              variants={scaleIn}
              className="bg-white rounded-2xl p-6 w-full max-w-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-lg font-medium text-brand-dark">Contacter l&apos;administrateur</p>
                <button onClick={() => setShowModal(false)} aria-label="Fermer" className="text-gray-400 hover:text-gray-700 p-1">
                  <X size={18} />
                </button>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Par exemple pour demander le retrait d&apos;un membre d&apos;une famille ou la suppression d&apos;une
                famille, en expliquant la raison. Ton nom et tes coordonnées seront transmis avec le message.
              </p>
              <form onSubmit={handleSubmit}>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={4}
                  placeholder="Écris ton message..."
                  className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-brand focus:outline-none"
                  required
                />
                {error && <p className="text-red-700 text-sm font-medium mt-2">{error}</p>}
                <button
                  type="submit"
                  disabled={sending || !text.trim()}
                  className="w-full mt-3 flex items-center justify-center gap-1.5 bg-brand text-white text-sm font-medium py-2.5 rounded-xl hover:bg-brand-dark transition-colors disabled:opacity-50"
                >
                  <Send size={14} />
                  {sending ? "Envoi..." : "Envoyer"}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
