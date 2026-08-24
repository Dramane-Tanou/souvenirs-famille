"use client";

import { useCallback, useState } from "react";
import { Send, Trash2 } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { usePolling } from "@/hooks/usePolling";
import { Avatar } from "@/components/Avatar";

interface Comment {
  id: number;
  body: string;
  created_at: string;
  user: { id: number; name: string; first_name: string | null; avatar_path: string | null };
}

interface MemoryCommentsProps {
  familyId: string;
  memoryId: number;
  canManage: boolean;
}

const COMMENTS_POLL_MS = 8000;

export function MemoryComments({ familyId, memoryId, canManage }: MemoryCommentsProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshComments = useCallback(async () => {
    const data = await api<Comment[]>(`/families/${familyId}/memories/${memoryId}/comments`);
    setComments(data);
  }, [familyId, memoryId]);

  usePolling(refreshComments, COMMENTS_POLL_MS);

  async function handleSend() {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    try {
      const created = await api<Comment>(`/families/${familyId}/memories/${memoryId}/comments`, {
        method: "POST",
        body: { body },
      });
      setComments((prev) => (prev ? [...prev, created] : [created]));
      setText("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur lors de l'envoi.");
    } finally {
      setSending(false);
    }
  }

  async function handleDelete(commentId: number) {
    try {
      await api(`/families/${familyId}/memories/${memoryId}/comments/${commentId}`, { method: "DELETE" });
      setComments((prev) => (prev ? prev.filter((c) => c.id !== commentId) : prev));
    } catch {
      // silencieux : au pire le prochain sondage réconcilie l'état réel.
    }
  }

  return (
    <div className="max-w-lg mx-auto w-full">
      <div className="max-h-40 overflow-y-auto space-y-2 mb-2">
        {comments === null ? (
          <p className="text-white/50 text-xs text-center py-2">Chargement des commentaires...</p>
        ) : comments.length === 0 ? (
          <p className="text-white/50 text-xs text-center py-2">Aucun commentaire pour l&apos;instant.</p>
        ) : (
          comments.map((c) => {
            const canDelete = canManage || c.user.id === user?.id;
            return (
              <div key={c.id} className="flex items-start gap-2">
                <Avatar name={c.user.name} avatarPath={c.user.avatar_path} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs">
                    <span className="font-medium">{c.user.first_name || c.user.name}</span>{" "}
                    <span className="text-white/85">{c.body}</span>
                  </p>
                </div>
                {canDelete && (
                  <button
                    onClick={() => handleDelete(c.id)}
                    aria-label="Supprimer le commentaire"
                    className="text-white/40 hover:text-white/80 transition-colors flex-shrink-0"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
      {error && <p className="text-red-300 text-xs mb-1">{error}</p>}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSend();
          }}
          placeholder="Ajouter un commentaire..."
          className="flex-1 bg-white/10 text-white placeholder-white/40 text-sm rounded-full px-3.5 py-2 focus:outline-none focus:bg-white/15"
        />
        <button
          onClick={handleSend}
          disabled={sending || !text.trim()}
          aria-label="Envoyer"
          className="flex-shrink-0 bg-white/15 text-white p-2 rounded-full hover:bg-white/25 transition-colors disabled:opacity-40"
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  );
}
