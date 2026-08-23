"use client";

import { useEffect, useState, FormEvent, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Pencil, Check, X, Trash2, UserMinus, Crown, BookOpen, Image as ImageIcon, Users } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { api, ApiError } from "@/lib/api";
import { backdropFade, scaleIn, fadeInUp, staggerContainer } from "@/lib/motion";
import { BackHeader } from "@/components/BackHeader";
import { Avatar } from "@/components/Avatar";

interface FamilyDetail {
  id: number;
  name: string;
  invite_code: string;
  owner: { id: number; name: string; email: string } | null;
  members_count: number;
  memories_count: number;
  books_count: number;
  plan: "free" | "family";
  created_at: string;
}

interface FamilyMember {
  id: number;
  name: string;
  email: string;
  avatar_path: string | null;
  role: "admin" | "contributor";
  joined_at: string;
  memories_count: number;
}

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

export default function AdminFamilyDetailPage() {
  const params = useParams();
  const familyId = params.id as string;
  const router = useRouter();
  const { user, loading } = useAuth();
  const { showToast } = useToast();

  const [family, setFamily] = useState<FamilyDetail | null>(null);
  const [members, setMembers] = useState<FamilyMember[] | null>(null);

  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [savingName, setSavingName] = useState(false);

  const [memberTarget, setMemberTarget] = useState<FamilyMember | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [requestedMemberIds, setRequestedMemberIds] = useState<Set<number>>(new Set());

  const [showDeleteFamily, setShowDeleteFamily] = useState(false);
  const [familyRequested, setFamilyRequested] = useState(false);

  useEffect(() => {
    if (!loading && (!user || !(user.is_admin || user.is_super_admin))) {
      router.push("/dashboard");
    }
  }, [loading, user, router]);

  const load = useCallback(async () => {
    const [familyData, membersData] = await Promise.all([
      api<FamilyDetail>(`/admin/families/${familyId}`),
      api<FamilyMember[]>(`/admin/families/${familyId}/members`),
    ]);
    setFamily(familyData);
    setMembers(membersData);
  }, [familyId]);

  useEffect(() => {
    if (user?.is_admin || user?.is_super_admin) {
      load();
    }
  }, [user, load]);

  async function saveName(e: FormEvent) {
    e.preventDefault();
    if (!nameDraft.trim()) return;
    setSavingName(true);
    try {
      const updated = await api<FamilyDetail>(`/admin/families/${familyId}`, {
        method: "PUT",
        body: { name: nameDraft.trim() },
      });
      setFamily(updated);
      setEditingName(false);
      showToast("Nom de la famille mis à jour.");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Une erreur est survenue.", "error");
    } finally {
      setSavingName(false);
    }
  }

  function openMemberModal(member: FamilyMember) {
    setMemberTarget(member);
    setReason("");
    setActionError(null);
  }

  async function confirmRemoveMember() {
    if (!memberTarget) return;
    setActionError(null);
    setBusy(true);
    try {
      if (user?.is_super_admin) {
        await api(`/admin/families/${familyId}/members/${memberTarget.id}`, {
          method: "DELETE",
          body: { reason },
        });
        setMembers((prev) => prev?.filter((m) => m.id !== memberTarget.id) ?? prev);
        setFamily((prev) => (prev ? { ...prev, members_count: prev.members_count - 1 } : prev));
        showToast(`${memberTarget.name} a été retiré de la famille.`);
      } else {
        await api(`/admin/families/${familyId}/members/${memberTarget.id}/removal-requests`, {
          method: "POST",
          body: { reason },
        });
        setRequestedMemberIds((prev) => new Set(prev).add(memberTarget.id));
        showToast("Demande de retrait envoyée au super-administrateur.");
      }
      setMemberTarget(null);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Une erreur est survenue.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmDeleteFamily() {
    if (!family) return;
    setActionError(null);
    setBusy(true);
    try {
      if (user?.is_super_admin) {
        await api(`/admin/families/${family.id}`, { method: "DELETE", body: { reason } });
        showToast(`Famille "${family.name}" supprimée.`);
        router.push("/admin");
      } else {
        await api(`/admin/families/${family.id}/deletion-requests`, { method: "POST", body: { reason } });
        setFamilyRequested(true);
        setShowDeleteFamily(false);
        showToast("Demande de suppression envoyée au super-administrateur.");
      }
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Une erreur est survenue.");
    } finally {
      setBusy(false);
    }
  }

  if (!family || !members) {
    return (
      <main className="min-h-screen bg-brand-light pb-16">
        <BackHeader title="Famille" backHref="/admin" backLabel="Administration" />
        <p className="text-center text-gray-400 mt-10">Chargement...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-brand-light pb-16">
      <BackHeader
        title={family.name}
        subtitle={`Code d'invitation : ${family.invite_code}`}
        backHref="/admin"
        backLabel="Administration"
      />

      <div className="max-w-2xl mx-auto px-4 sm:px-8 mt-6 space-y-4">
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          className="bg-white rounded-2xl p-5 shadow-sm border border-black/5"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-base font-medium text-gray-800">Informations</p>
            {family.plan === "family" ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded-full">
                <Crown size={11} /> Famille
              </span>
            ) : (
              <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded-full">Gratuit</span>
            )}
          </div>

          {editingName ? (
            <form onSubmit={saveName} className="flex items-center gap-2 mb-4">
              <input
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                className="flex-1 border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-brand focus:outline-none"
                autoFocus
              />
              <button
                type="submit"
                disabled={savingName}
                aria-label="Enregistrer"
                className="text-green-700 hover:bg-green-50 rounded-lg p-2"
              >
                <Check size={16} />
              </button>
              <button
                type="button"
                onClick={() => setEditingName(false)}
                aria-label="Annuler"
                className="text-gray-400 hover:bg-gray-50 rounded-lg p-2"
              >
                <X size={16} />
              </button>
            </form>
          ) : (
            <button
              onClick={() => {
                setEditingName(true);
                setNameDraft(family.name);
              }}
              className="flex items-center gap-1.5 text-sm text-brand hover:underline mb-4"
            >
              <Pencil size={13} /> Modifier le nom
            </button>
          )}

          <div className="grid grid-cols-3 gap-3 text-center mb-4">
            <div>
              <p className="text-lg font-semibold text-brand-dark">{family.members_count}</p>
              <p className="text-xs text-gray-500 flex items-center justify-center gap-1">
                <Users size={11} /> Membres
              </p>
            </div>
            <div>
              <p className="text-lg font-semibold text-brand-dark">{family.memories_count}</p>
              <p className="text-xs text-gray-500 flex items-center justify-center gap-1">
                <ImageIcon size={11} /> Souvenirs
              </p>
            </div>
            <div>
              <p className="text-lg font-semibold text-brand-dark">{family.books_count}</p>
              <p className="text-xs text-gray-500 flex items-center justify-center gap-1">
                <BookOpen size={11} /> Livres
              </p>
            </div>
          </div>

          <div className="text-sm text-gray-600 space-y-1">
            <p>
              Propriétaire :{" "}
              {family.owner ? <span title={family.owner.email}>{family.owner.name}</span> : "—"}
            </p>
            <p>Créée le {formatDate(family.created_at)}</p>
          </div>
        </motion.div>

        <div>
          <p className="text-base font-medium text-gray-800 mb-3">Membres</p>
          <motion.ul variants={staggerContainer} initial="hidden" animate="visible" className="space-y-2">
            {members.map((member) => (
              <motion.li
                key={member.id}
                variants={fadeInUp}
                className="bg-white rounded-2xl p-4 shadow-sm border border-black/5 flex items-center gap-3"
              >
                <Avatar name={member.name} avatarPath={member.avatar_path} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-brand-dark truncate">{member.name}</p>
                  <p className="text-xs text-gray-500 truncate">{member.email}</p>
                </div>
                {member.role === "admin" ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded-full flex-shrink-0">
                    <Crown size={11} /> Créateur
                  </span>
                ) : (
                  <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded-full flex-shrink-0">
                    Membre
                  </span>
                )}
                {requestedMemberIds.has(member.id) ? (
                  <span className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded-full flex-shrink-0">
                    Retrait demandé
                  </span>
                ) : (
                  <button
                    onClick={() => openMemberModal(member)}
                    aria-label={`Retirer ${member.name}`}
                    className="text-red-600 hover:bg-red-50 rounded-lg p-1.5 flex-shrink-0"
                  >
                    <UserMinus size={15} />
                  </button>
                )}
              </motion.li>
            ))}
          </motion.ul>
        </div>

        <motion.div variants={fadeInUp} initial="hidden" animate="visible" className="pt-2">
          {familyRequested ? (
            <p className="text-center text-sm text-amber-700 bg-amber-50 rounded-xl py-3">
              Suppression de la famille demandée — en attente d&apos;approbation.
            </p>
          ) : (
            <button
              onClick={() => {
                setShowDeleteFamily(true);
                setReason("");
                setActionError(null);
              }}
              className="w-full flex items-center justify-center gap-2 bg-white text-red-700 text-sm font-medium py-3 rounded-xl border-2 border-red-100 hover:bg-red-50 transition-colors"
            >
              <Trash2 size={15} /> Supprimer cette famille
            </button>
          )}
        </motion.div>
      </div>

      <AnimatePresence>
        {memberTarget && (
          <motion.div
            variants={backdropFade}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setMemberTarget(null)}
          >
            <motion.div
              variants={scaleIn}
              className="bg-white rounded-2xl p-6 w-full max-w-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-lg font-medium text-brand-dark mb-1">Retirer {memberTarget.name} ?</p>
              <p className="text-sm text-gray-600 mb-4">
                {user?.is_super_admin
                  ? `Retire définitivement ${memberTarget.name} de la famille "${family.name}".`
                  : "Ta demande de retrait sera envoyée au super-administrateur pour approbation."}
              </p>
              <label htmlFor="member-reason" className="block text-sm font-medium mb-2 text-gray-800">
                Raison
              </label>
              <textarea
                id="member-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-brand focus:outline-none"
                required
              />
              {actionError && <p className="text-red-700 text-sm font-medium mt-2">{actionError}</p>}
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setMemberTarget(null)}
                  className="flex-1 bg-gray-100 text-gray-700 text-sm font-medium py-2.5 rounded-xl"
                >
                  Annuler
                </button>
                <button
                  onClick={confirmRemoveMember}
                  disabled={busy || !reason.trim()}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-red-600 text-white text-sm font-medium py-2.5 rounded-xl disabled:opacity-50"
                >
                  <Trash2 size={14} />
                  {busy ? "..." : user?.is_super_admin ? "Confirmer" : "Envoyer la demande"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDeleteFamily && (
          <motion.div
            variants={backdropFade}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowDeleteFamily(false)}
          >
            <motion.div
              variants={scaleIn}
              className="bg-white rounded-2xl p-6 w-full max-w-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-lg font-medium text-brand-dark mb-1">Supprimer &quot;{family.name}&quot; ?</p>
              <p className="text-sm text-gray-600 mb-4">
                {user?.is_super_admin
                  ? "Cette action supprime définitivement la famille, ses souvenirs, livres et commandes."
                  : "Ta demande sera envoyée au super-administrateur pour approbation."}
              </p>
              <label htmlFor="family-reason" className="block text-sm font-medium mb-2 text-gray-800">
                Raison
              </label>
              <textarea
                id="family-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-brand focus:outline-none"
                required
              />
              {actionError && <p className="text-red-700 text-sm font-medium mt-2">{actionError}</p>}
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setShowDeleteFamily(false)}
                  className="flex-1 bg-gray-100 text-gray-700 text-sm font-medium py-2.5 rounded-xl"
                >
                  Annuler
                </button>
                <button
                  onClick={confirmDeleteFamily}
                  disabled={busy || !reason.trim()}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-red-600 text-white text-sm font-medium py-2.5 rounded-xl disabled:opacity-50"
                >
                  <Trash2 size={14} />
                  {busy ? "..." : user?.is_super_admin ? "Confirmer" : "Envoyer la demande"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
