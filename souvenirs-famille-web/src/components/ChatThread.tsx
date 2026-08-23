"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Send, Paperclip, X } from "lucide-react";
import { storageUrl } from "@/lib/api";
import { Avatar } from "@/components/Avatar";
import { backdropFade } from "@/lib/motion";

export interface ChatMessage {
  id: number;
  body: string | null;
  image_path: string | null;
  sender_id: number;
  sender: { id: number; name: string; is_admin: boolean; is_super_admin: boolean; avatar_path: string | null };
  created_at: string;
}

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface ChatThreadProps {
  messages: ChatMessage[];
  /** Détermine si un message apparaît "de mon côté" (bulle à droite) ou non. */
  isMine: (message: ChatMessage) => boolean;
  onSend: (body: string, image: File | null) => Promise<void>;
  emptyLabel: string;
  disabled?: boolean;
  /** Appelé (avec parcimonie) pendant la saisie, pour signaler "en train d'écrire". */
  onTyping?: () => void;
  /** Vrai si l'autre côté de la conversation est en train d'écrire. */
  otherTyping?: boolean;
  /** Nom affiché dans l'indicateur "... est en train d'écrire" (ex: "L'administration"). */
  otherPartyLabel?: string;
}

const TYPING_PING_THROTTLE_MS = 2000;

export function ChatThread({
  messages,
  isMine,
  onSend,
  emptyLabel,
  disabled = false,
  onTyping,
  otherTyping = false,
  otherPartyLabel = "",
}: ChatThreadProps) {
  const [text, setText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastTypingPingRef = useRef(0);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, otherTyping]);

  function handleTextChange(value: string) {
    setText(value);
    if (!onTyping) return;
    const now = Date.now();
    if (now - lastTypingPingRef.current > TYPING_PING_THROTTLE_MS) {
      lastTypingPingRef.current = now;
      onTyping();
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function removeImage() {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSend() {
    if (sending || (!text.trim() && !imageFile)) return;
    setSending(true);
    try {
      await onSend(text.trim(), imageFile);
      setText("");
      removeImage();
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-4">
        <div className="max-w-2xl mx-auto space-y-3">
          {messages.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">{emptyLabel}</p>
          ) : (
            messages.map((m) => {
              const mine = isMine(m);
              return (
                <div key={m.id} className={`flex items-end gap-2 ${mine ? "flex-row-reverse" : ""}`}>
                  {!mine && <Avatar name={m.sender.name} avatarPath={m.sender.avatar_path} size="sm" />}
                  <div className={`max-w-[75%] flex flex-col ${mine ? "items-end" : "items-start"}`}>
                    {!mine && <p className="text-xs text-gray-500 mb-0.5 px-1">{m.sender.name}</p>}
                    <div
                      className={`rounded-2xl px-3.5 py-2.5 ${
                        mine
                          ? "bg-brand text-white rounded-br-sm"
                          : "bg-white border border-black/5 text-gray-800 rounded-bl-sm"
                      }`}
                    >
                      {m.image_path && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={storageUrl(m.image_path)}
                          alt="Pièce jointe"
                          onClick={() => setExpandedImage(storageUrl(m.image_path as string))}
                          className={`rounded-lg max-w-full max-h-64 object-cover cursor-pointer ${m.body ? "mb-1.5" : ""}`}
                        />
                      )}
                      {m.body && <p className="text-sm whitespace-pre-wrap break-words">{m.body}</p>}
                    </div>
                    <p className="text-[11px] text-gray-400 mt-0.5 px-1">{formatTimestamp(m.created_at)}</p>
                  </div>
                </div>
              );
            })
          )}
          {otherTyping && (
            <div className="flex flex-col items-start">
              <div className="bg-white border border-black/5 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" />
              </div>
              <p className="text-xs text-gray-400 mt-0.5 px-1">
                {otherPartyLabel ? `${otherPartyLabel} est en train d'écrire...` : "En train d'écrire..."}
              </p>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {!disabled && (
        <div className="border-t border-black/5 bg-white px-4 sm:px-8 py-3">
          <div className="max-w-2xl mx-auto">
            {imagePreview && (
              <div className="relative inline-block mb-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagePreview}
                  alt="Aperçu"
                  className="h-16 w-16 object-cover rounded-lg border border-gray-200"
                />
                <button
                  onClick={removeImage}
                  aria-label="Retirer l'image"
                  className="absolute -top-1.5 -right-1.5 bg-black/70 text-white rounded-full p-1 hover:bg-black transition-colors"
                >
                  <X size={11} />
                </button>
              </div>
            )}
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                aria-label="Joindre une image"
                className="flex-shrink-0 text-gray-500 hover:text-brand p-2.5 rounded-full hover:bg-gray-100 transition-colors"
              >
                <Paperclip size={19} />
              </button>
              <input
                type="text"
                value={text}
                onChange={(e) => handleTextChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSend();
                }}
                placeholder="Écris un message..."
                className="flex-1 border-2 border-gray-200 rounded-full px-4 py-2.5 text-sm focus:border-brand focus:outline-none"
              />
              <button
                onClick={handleSend}
                disabled={sending || (!text.trim() && !imageFile)}
                aria-label="Envoyer"
                className="flex-shrink-0 bg-brand text-white p-2.5 rounded-full hover:bg-brand-dark transition-colors disabled:opacity-50"
              >
                <Send size={17} />
              </button>
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {expandedImage && (
          <motion.div
            variants={backdropFade}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
            onClick={() => setExpandedImage(null)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={expandedImage}
              alt="Pièce jointe"
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
