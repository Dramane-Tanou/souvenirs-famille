"use client";

import { useEffect, useMemo, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Users,
  Home,
  CreditCard,
  BookOpen,
  Pencil,
  Check,
  X,
  Crown,
  Sparkles,
  ShieldPlus,
  ShieldMinus,
  ShieldCheck,
  Trash2,
  ThumbsUp,
  ThumbsDown,
  Eye,
  UserMinus,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { api, ApiError } from "@/lib/api";
import { formatCurrencyAmount } from "@/lib/currency";
import { fadeInUp, backdropFade, scaleIn } from "@/lib/motion";
import { BackHeader } from "@/components/BackHeader";
import { Avatar } from "@/components/Avatar";
import { DatabaseResetSection } from "@/components/DatabaseResetSection";
import { AnimatePresence } from "framer-motion";

interface Overview {
  total_users: number;
  total_families: number;
  active_subscriptions: number;
  free_families: number;
  total_memories: number;
  orders: { paid_pdf: number; paid_physical: number; pending: number; failed: number };
  book_revenue_chf: number;
  mrr_chf: number;
}

interface AdminFamily {
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

interface AdminSubscription {
  id: number;
  family: { id: number; name: string } | null;
  plan: string;
  status: string;
  payment_method: string | null;
  price_cents: number | null;
  currency: string | null;
  price_chf: number;
  starts_at: string | null;
  ends_at: string | null;
}

interface AdminOrder {
  id: number;
  family: { id: number; name: string } | null;
  user: { id: number; name: string; email: string } | null;
  format: string;
  payment_method: string | null;
  payment_status: string;
  price_cents: number | null;
  currency: string | null;
  price_chf: number;
  created_at: string;
}

interface AdminUser {
  id: number;
  name: string;
  email: string;
  is_admin: boolean;
  is_super_admin: boolean;
  is_root_super_admin: boolean;
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

interface DeletionRequest {
  id: number;
  type: "family_deletion" | "member_removal";
  family_id: number | null;
  family_name: string;
  target_user_id: number | null;
  target_user_name: string | null;
  requester: { id: number; name: string; email: string } | null;
  reason: string;
  status: "pending" | "approved" | "rejected";
  reviewer: { id: number; name: string } | null;
  review_note: string | null;
  reviewed_at: string | null;
  created_at: string;
}

interface Conversation {
  user: { id: number; name: string; email: string; phone: string | null; avatar_path: string | null } | null;
  last_message: { body: string | null; has_image: boolean; sender_id: number; created_at: string };
  message_count: number;
}

interface UserFamily {
  id: number;
  name: string;
  members_count: number;
}

type MinimalFamily = Pick<AdminFamily, "id" | "name">;

type DangerTarget =
  | { kind: "family"; family: AdminFamily }
  | { kind: "member"; family: MinimalFamily; member: FamilyMember };

type Tab = "families" | "subscriptions" | "orders" | "admins" | "deletions" | "my-requests" | "messages";

const formatDate = (value: string | null) =>
  value ? new Date(value).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "—";

export default function AdminPage() {
  const { user, loading } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const [tab, setTab] = useState<Tab>("families");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [families, setFamilies] = useState<AdminFamily[] | null>(null);
  const [subscriptions, setSubscriptions] = useState<AdminSubscription[] | null>(null);
  const [orders, setOrders] = useState<AdminOrder[] | null>(null);

  const [admins, setAdmins] = useState<AdminUser[] | null>(null);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminRole, setNewAdminRole] = useState<"admin" | "super_admin">("admin");
  const [addingAdmin, setAddingAdmin] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);

  const [deletionRequests, setDeletionRequests] = useState<DeletionRequest[] | null>(null);
  const [myRequests, setMyRequests] = useState<DeletionRequest[] | null>(null);
  const [requestedFamilyIds, setRequestedFamilyIds] = useState<Set<number>>(new Set());
  const [requestedMemberIds, setRequestedMemberIds] = useState<Set<number>>(new Set());

  const [membersTarget, setMembersTarget] = useState<AdminFamily | null>(null);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[] | null>(null);

  const [dangerTarget, setDangerTarget] = useState<DangerTarget | null>(null);
  const [dangerReason, setDangerReason] = useState("");
  const [dangerBusy, setDangerBusy] = useState(false);
  const [dangerError, setDangerError] = useState<string | null>(null);

  const [editingFamilyId, setEditingFamilyId] = useState<number | null>(null);
  const [nameDraft, setNameDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const [conversations, setConversations] = useState<Conversation[] | null>(null);

  const [removalPickerMessage, setRemovalPickerMessage] = useState<Conversation | null>(null);
  const [removalPickerFamilies, setRemovalPickerFamilies] = useState<UserFamily[] | null>(null);
  const [removalPickerFamily, setRemovalPickerFamily] = useState<UserFamily | null>(null);
  const [removalPickerMembers, setRemovalPickerMembers] = useState<FamilyMember[] | null>(null);

  // Horodatage du dernier passage sur chaque onglet notifié par badge : tant
  // qu'un élément n'est pas plus récent que ce repère, le badge le considère
  // déjà vu. Persisté en local pour survivre à un rechargement de page.
  const [seenMessagesAt, setSeenMessagesAt] = useState<string | null>(null);
  const [seenMyRequestsAt, setSeenMyRequestsAt] = useState<string | null>(null);
  const [seenDeletionsAt, setSeenDeletionsAt] = useState<string | null>(null);

  useEffect(() => {
    setSeenMessagesAt(localStorage.getItem("admin_seen_messages_at"));
    setSeenMyRequestsAt(localStorage.getItem("admin_seen_my_requests_at"));
    setSeenDeletionsAt(localStorage.getItem("admin_seen_deletions_at"));
  }, []);

  useEffect(() => {
    if (tab === "messages" && conversations && conversations.length > 0) {
      const latest = conversations.reduce(
        (max, c) => (c.last_message.created_at > max ? c.last_message.created_at : max),
        ""
      );
      localStorage.setItem("admin_seen_messages_at", latest);
      setSeenMessagesAt(latest);
    }
    if (tab === "my-requests" && myRequests) {
      const resolved = myRequests.filter((r) => r.status !== "pending" && r.reviewed_at);
      if (resolved.length > 0) {
        const latest = resolved.reduce((max, r) => ((r.reviewed_at as string) > max ? (r.reviewed_at as string) : max), "");
        localStorage.setItem("admin_seen_my_requests_at", latest);
        setSeenMyRequestsAt(latest);
      }
    }
    if (tab === "deletions" && deletionRequests && deletionRequests.length > 0) {
      const latest = deletionRequests.reduce((max, r) => (r.created_at > max ? r.created_at : max), "");
      localStorage.setItem("admin_seen_deletions_at", latest);
      setSeenDeletionsAt(latest);
    }
  }, [tab, conversations, myRequests, deletionRequests]);

  // Une conversation compte comme "non vue" si le dernier message vient du
  // client (la balle est dans le camp de l'administration) et est plus
  // récent que le dernier passage sur cet onglet.
  const unseenMessagesCount = (conversations ?? []).filter(
    (c) =>
      c.last_message.sender_id === c.user?.id &&
      (!seenMessagesAt || c.last_message.created_at > seenMessagesAt)
  ).length;
  const unseenMyRequestsCount = (myRequests ?? []).filter(
    (r) => r.status !== "pending" && r.reviewed_at && (!seenMyRequestsAt || r.reviewed_at > seenMyRequestsAt)
  ).length;
  const unseenDeletionsCount = (deletionRequests ?? []).filter(
    (r) => r.status === "pending" && (!seenDeletionsAt || r.created_at > seenDeletionsAt)
  ).length;

  useEffect(() => {
    if (!loading && (!user || !(user.is_admin || user.is_super_admin))) {
      router.push("/dashboard");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (user?.is_admin || user?.is_super_admin) {
      api<Overview>("/admin/overview").then(setOverview);
      api<AdminFamily[]>("/admin/families").then(setFamilies);
      api<AdminSubscription[]>("/admin/subscriptions").then(setSubscriptions);
      api<AdminOrder[]>("/admin/orders").then(setOrders);
      api<DeletionRequest[]>("/admin/my-requests").then(setMyRequests);
      api<Conversation[]>("/admin/contact-messages").then(setConversations);
    }
    if (user?.is_super_admin) {
      api<AdminUser[]>("/admin/admins").then(setAdmins);
      api<DeletionRequest[]>("/admin/deletion-requests").then(setDeletionRequests);
    }
  }, [user]);

  // Rafraîchit la liste des conversations pendant que l'onglet Messages est
  // ouvert, pour voir arriver les nouveaux messages sans recharger la page.
  useEffect(() => {
    if (tab !== "messages" || !(user?.is_admin || user?.is_super_admin)) return;
    const interval = setInterval(() => {
      api<Conversation[]>("/admin/contact-messages").then(setConversations);
    }, 8000);
    return () => clearInterval(interval);
  }, [tab, user]);

  async function addAdmin(e: FormEvent) {
    e.preventDefault();
    setAdminError(null);
    setAddingAdmin(true);
    try {
      const promoted = await api<AdminUser>("/admin/admins", {
        method: "POST",
        body: { email: newAdminEmail, role: newAdminRole },
      });
      setAdmins((prev) => (prev ? [...prev.filter((a) => a.id !== promoted.id), promoted] : [promoted]));
      setNewAdminEmail("");
      setNewAdminRole("admin");
      showToast(
        `${promoted.name} est maintenant ${promoted.is_super_admin ? "super-administrateur" : "administrateur"}.`
      );
    } catch (err) {
      setAdminError(err instanceof ApiError ? err.message : "Une erreur est survenue.");
    } finally {
      setAddingAdmin(false);
    }
  }

  async function demoteToAdmin(admin: AdminUser) {
    try {
      await api(`/admin/admins/${admin.id}/demote-to-admin`, { method: "POST" });
      setAdmins((prev) => prev?.map((a) => (a.id === admin.id ? { ...a, is_super_admin: false } : a)) ?? prev);
      showToast(`${admin.name} est maintenant administrateur simple.`);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Une erreur est survenue.", "error");
    }
  }

  async function removeAdmin(admin: AdminUser) {
    try {
      await api(`/admin/admins/${admin.id}`, { method: "DELETE" });
      setAdmins((prev) => prev?.filter((a) => a.id !== admin.id) ?? prev);
      showToast(`Droits administrateur retirés à ${admin.name}.`);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Une erreur est survenue.", "error");
    }
  }

  function openFamilyDangerModal(family: AdminFamily) {
    setDangerTarget({ kind: "family", family });
    setDangerReason("");
    setDangerError(null);
  }

  function openMemberDangerModal(family: MinimalFamily, member: FamilyMember, prefillReason = "") {
    setDangerTarget({ kind: "member", family, member });
    setDangerReason(prefillReason);
    setDangerError(null);
  }

  async function confirmDanger() {
    if (!dangerTarget) return;
    setDangerError(null);
    setDangerBusy(true);
    try {
      if (dangerTarget.kind === "family") {
        const { family } = dangerTarget;
        if (user?.is_super_admin) {
          await api(`/admin/families/${family.id}`, { method: "DELETE", body: { reason: dangerReason } });
          setFamilies((prev) => prev?.filter((f) => f.id !== family.id) ?? prev);
          showToast(`Famille "${family.name}" supprimée.`);
        } else {
          await api(`/admin/families/${family.id}/deletion-requests`, {
            method: "POST",
            body: { reason: dangerReason },
          });
          setRequestedFamilyIds((prev) => new Set(prev).add(family.id));
          showToast("Demande de suppression envoyée au super-administrateur.");
        }
      } else {
        const { family, member } = dangerTarget;
        if (user?.is_super_admin) {
          await api(`/admin/families/${family.id}/members/${member.id}`, {
            method: "DELETE",
            body: { reason: dangerReason },
          });
          setFamilyMembers((prev) => prev?.filter((m) => m.id !== member.id) ?? prev);
          setFamilies((prev) =>
            prev?.map((f) => (f.id === family.id ? { ...f, members_count: f.members_count - 1 } : f)) ?? prev
          );
          showToast(`${member.name} a été retiré de la famille.`);
        } else {
          await api(`/admin/families/${family.id}/members/${member.id}/removal-requests`, {
            method: "POST",
            body: { reason: dangerReason },
          });
          setRequestedMemberIds((prev) => new Set(prev).add(member.id));
          showToast("Demande de retrait envoyée au super-administrateur.");
        }
      }
      setDangerTarget(null);
    } catch (err) {
      setDangerError(err instanceof ApiError ? err.message : "Une erreur est survenue.");
    } finally {
      setDangerBusy(false);
    }
  }

  async function approveRequest(request: DeletionRequest) {
    try {
      await api(`/admin/deletion-requests/${request.id}/approve`, { method: "POST" });
      setDeletionRequests((prev) =>
        prev?.map((r) => (r.id === request.id ? { ...r, status: "approved" as const } : r)) ?? prev
      );
      if (request.type === "family_deletion") {
        setFamilies((prev) => prev?.filter((f) => f.id !== request.family_id) ?? prev);
        showToast(`Famille "${request.family_name}" supprimée.`);
      } else {
        setFamilyMembers((prev) => prev?.filter((m) => m.id !== request.target_user_id) ?? prev);
        showToast(`${request.target_user_name} retiré de "${request.family_name}".`);
      }
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Une erreur est survenue.", "error");
    }
  }

  async function rejectRequest(request: DeletionRequest) {
    try {
      await api(`/admin/deletion-requests/${request.id}/reject`, { method: "POST" });
      setDeletionRequests((prev) =>
        prev?.map((r) => (r.id === request.id ? { ...r, status: "rejected" as const } : r)) ?? prev
      );
      showToast("Demande rejetée.");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Une erreur est survenue.", "error");
    }
  }

  async function openMembersModal(family: AdminFamily) {
    setMembersTarget(family);
    setFamilyMembers(null);
    const members = await api<FamilyMember[]>(`/admin/families/${family.id}/members`);
    setFamilyMembers(members);
  }

  async function openRemovalPicker(message: Conversation) {
    if (!message.user) return;
    setRemovalPickerMessage(message);
    setRemovalPickerFamily(null);
    setRemovalPickerMembers(null);
    setRemovalPickerFamilies(null);
    const list = await api<UserFamily[]>(`/admin/users/${message.user.id}/families`);
    setRemovalPickerFamilies(list);
    if (list.length === 1) {
      await pickRemovalFamily(list[0]);
    }
  }

  async function pickRemovalFamily(family: UserFamily) {
    setRemovalPickerFamily(family);
    setRemovalPickerMembers(null);
    const members = await api<FamilyMember[]>(`/admin/families/${family.id}/members`);
    setRemovalPickerMembers(members);
  }

  function pickRemovalMember(member: FamilyMember) {
    if (!removalPickerFamily || !removalPickerMessage) return;
    const quote = removalPickerMessage.last_message.body ?? "(voir la conversation)";
    openMemberDangerModal(
      removalPickerFamily,
      member,
      `Demande transmise par ${removalPickerMessage.user?.name ?? "un utilisateur"} via le message : « ${quote} »`
    );
    setRemovalPickerMessage(null);
  }

  const subscribedFamilyNames = useMemo(
    () => new Set((subscriptions ?? []).filter((s) => s.status === "active").map((s) => s.family?.id)),
    [subscriptions]
  );

  if (loading || !user || !(user.is_admin || user.is_super_admin)) {
    return <p className="p-8 text-base">Chargement...</p>;
  }

  function startEditing(family: AdminFamily) {
    setEditingFamilyId(family.id);
    setNameDraft(family.name);
  }

  async function saveFamilyName(familyId: number) {
    setSaving(true);
    try {
      const updated = await api<{ id: number; name: string }>(`/admin/families/${familyId}`, {
        method: "PUT",
        body: { name: nameDraft },
      });
      setFamilies((prev) => prev?.map((f) => (f.id === familyId ? { ...f, name: updated.name } : f)) ?? prev);
      setEditingFamilyId(null);
      showToast("Nom de famille mis à jour.");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Erreur lors de l'enregistrement.", "error");
    } finally {
      setSaving(false);
    }
  }

  const statCards = overview
    ? [
        { label: "Familles", value: overview.total_families, icon: Home },
        { label: "Utilisateurs", value: overview.total_users, icon: Users },
        { label: "Abonnements actifs", value: overview.active_subscriptions, icon: Crown },
        { label: "Familles gratuites", value: overview.free_families, icon: Sparkles },
        { label: "Livres PDF vendus", value: overview.orders.paid_pdf, icon: BookOpen },
        { label: "Livres papier vendus", value: overview.orders.paid_physical, icon: BookOpen },
        { label: "Revenu livres (CHF)", value: overview.book_revenue_chf.toFixed(2), icon: CreditCard },
        { label: "Revenu récurrent mensuel (CHF)", value: overview.mrr_chf.toFixed(2), icon: CreditCard },
      ]
    : [];

  return (
    <main className="min-h-screen bg-brand-light pb-24">
      <BackHeader title="Administration" backHref="/dashboard" backLabel="Tableau de bord" />

      <div className="max-w-5xl mx-auto px-4 sm:px-8 mt-6 space-y-6">
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-2 md:grid-cols-4 gap-3"
        >
          {overview === null
            ? Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-black/5 h-24 animate-pulse" />
              ))
            : statCards.map((card) => (
                <div key={card.label} className="bg-white rounded-2xl p-4 shadow-sm border border-black/5">
                  <card.icon size={18} className="text-brand mb-2" />
                  <p className="text-xl font-semibold text-brand-dark">{card.value}</p>
                  <p className="text-sm text-gray-600">{card.label}</p>
                </div>
              ))}
        </motion.div>

        <div className="flex flex-wrap bg-gray-100 rounded-xl p-1 max-w-3xl gap-1">
          {([
            ["families", "Familles"],
            ["subscriptions", "Abonnements"],
            ["orders", "Commandes"],
            ["my-requests", "Mes demandes"],
            ["messages", "Messages"],
            ...(user.is_super_admin
              ? ([
                  ["admins", "Administrateurs"],
                  ["deletions", "Suppressions"],
                ] as [Tab, string][])
              : []),
          ] as [Tab, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 text-sm font-medium py-2.5 px-2 rounded-lg transition-colors whitespace-nowrap ${
                tab === key ? "bg-white text-brand-dark shadow-sm" : "text-gray-600"
              }`}
            >
              {label}
              {key === "deletions" && unseenDeletionsCount > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center text-[10px] font-bold bg-red-600 text-white rounded-full w-4 h-4">
                  {unseenDeletionsCount}
                </span>
              )}
              {key === "my-requests" && unseenMyRequestsCount > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center text-[10px] font-bold bg-brand text-white rounded-full w-4 h-4">
                  {unseenMyRequestsCount}
                </span>
              )}
              {key === "messages" && unseenMessagesCount > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center text-[10px] font-bold bg-red-600 text-white rounded-full w-4 h-4">
                  {unseenMessagesCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {tab === "families" && (
          <div className="bg-white rounded-2xl shadow-sm border border-black/5 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="px-4 py-3 font-medium">Nom</th>
                  <th className="px-4 py-3 font-medium">Propriétaire</th>
                  <th className="px-4 py-3 font-medium">Membres</th>
                  <th className="px-4 py-3 font-medium">Souvenirs</th>
                  <th className="px-4 py-3 font-medium">Livres</th>
                  <th className="px-4 py-3 font-medium">Plan</th>
                  <th className="px-4 py-3 font-medium">Créée le</th>
                  <th className="px-4 py-3 font-medium"></th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {families === null ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-6 text-center text-gray-400">
                      Chargement...
                    </td>
                  </tr>
                ) : families.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-6 text-center text-gray-400">
                      Aucune famille.
                    </td>
                  </tr>
                ) : (
                  families.map((family) => (
                    <tr key={family.id} className="border-b border-gray-50 last:border-0">
                      <td className="px-4 py-3">
                        {editingFamilyId === family.id ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              value={nameDraft}
                              onChange={(e) => setNameDraft(e.target.value)}
                              className="border-2 border-gray-200 rounded-lg px-2 py-1 text-sm focus:border-brand focus:outline-none w-40"
                              autoFocus
                            />
                            <button
                              onClick={() => saveFamilyName(family.id)}
                              disabled={saving}
                              aria-label="Enregistrer"
                              className="text-green-700 hover:bg-green-50 rounded p-1"
                            >
                              <Check size={15} />
                            </button>
                            <button
                              onClick={() => setEditingFamilyId(null)}
                              aria-label="Annuler"
                              className="text-gray-400 hover:bg-gray-50 rounded p-1"
                            >
                              <X size={15} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <Link
                              href={`/admin/families/${family.id}`}
                              className="font-medium text-brand-dark hover:underline"
                            >
                              {family.name}
                            </Link>
                            <button
                              onClick={() => startEditing(family)}
                              aria-label="Modifier le nom"
                              className="text-gray-400 hover:text-brand p-1"
                            >
                              <Pencil size={13} />
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {family.owner ? (
                          <span title={family.owner.email}>{family.owner.name}</span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{family.members_count}</td>
                      <td className="px-4 py-3 text-gray-600">{family.memories_count}</td>
                      <td className="px-4 py-3 text-gray-600">{family.books_count}</td>
                      <td className="px-4 py-3">
                        {family.plan === "family" || subscribedFamilyNames.has(family.id) ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded-full">
                            <Crown size={11} /> Famille
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
                            Gratuit
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{formatDate(family.created_at)}</td>
                      <td className="px-4 py-3 text-gray-400 font-mono text-xs">{family.invite_code}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => openMembersModal(family)}
                            aria-label={`Voir les membres de ${family.name}`}
                            className="text-gray-500 hover:bg-gray-100 rounded-lg p-1.5"
                          >
                            <Eye size={15} />
                          </button>
                          {requestedFamilyIds.has(family.id) ? (
                            <span className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded-full">
                              Suppression demandée
                            </span>
                          ) : (
                            <button
                              onClick={() => openFamilyDangerModal(family)}
                              aria-label={`Supprimer la famille ${family.name}`}
                              className="text-red-600 hover:bg-red-50 rounded-lg p-1.5"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === "subscriptions" && (
          <div className="bg-white rounded-2xl shadow-sm border border-black/5 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="px-4 py-3 font-medium">Famille</th>
                  <th className="px-4 py-3 font-medium">Plan</th>
                  <th className="px-4 py-3 font-medium">Statut</th>
                  <th className="px-4 py-3 font-medium">Moyen de paiement</th>
                  <th className="px-4 py-3 font-medium">Montant</th>
                  <th className="px-4 py-3 font-medium">Débute le</th>
                  <th className="px-4 py-3 font-medium">Se termine le</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions === null ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-gray-400">
                      Chargement...
                    </td>
                  </tr>
                ) : subscriptions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-gray-400">
                      Aucun abonnement.
                    </td>
                  </tr>
                ) : (
                  subscriptions.map((sub) => (
                    <tr key={sub.id} className="border-b border-gray-50 last:border-0">
                      <td className="px-4 py-3 font-medium text-brand-dark">{sub.family?.name ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-600">{sub.plan}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs font-medium px-2 py-1 rounded-full ${
                            sub.status === "active"
                              ? "text-green-700 bg-green-50"
                              : "text-gray-600 bg-gray-100"
                          }`}
                        >
                          {sub.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{sub.payment_method ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {sub.price_cents !== null && sub.currency
                          ? `${formatCurrencyAmount(sub.price_cents, sub.currency)} (≈ ${sub.price_chf.toFixed(2)} CHF)`
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{formatDate(sub.starts_at)}</td>
                      <td className="px-4 py-3 text-gray-500">{formatDate(sub.ends_at)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === "orders" && (
          <div className="bg-white rounded-2xl shadow-sm border border-black/5 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="px-4 py-3 font-medium">Famille</th>
                  <th className="px-4 py-3 font-medium">Client</th>
                  <th className="px-4 py-3 font-medium">Format</th>
                  <th className="px-4 py-3 font-medium">Moyen de paiement</th>
                  <th className="px-4 py-3 font-medium">Statut</th>
                  <th className="px-4 py-3 font-medium">Montant</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {orders === null ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-gray-400">
                      Chargement...
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-gray-400">
                      Aucune commande.
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => (
                    <tr key={order.id} className="border-b border-gray-50 last:border-0">
                      <td className="px-4 py-3 font-medium text-brand-dark">{order.family?.name ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {order.user ? <span title={order.user.email}>{order.user.name}</span> : "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{order.format}</td>
                      <td className="px-4 py-3 text-gray-600">{order.payment_method ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs font-medium px-2 py-1 rounded-full ${
                            order.payment_status === "paid"
                              ? "text-green-700 bg-green-50"
                              : order.payment_status === "failed"
                              ? "text-red-700 bg-red-50"
                              : "text-amber-700 bg-amber-50"
                          }`}
                        >
                          {order.payment_status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {order.price_cents !== null && order.currency
                          ? `${formatCurrencyAmount(order.price_cents, order.currency)} (≈ ${order.price_chf.toFixed(2)} CHF)`
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{formatDate(order.created_at)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === "admins" && user.is_super_admin && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-black/5">
              <p className="text-base font-medium text-brand-dark mb-3">Nommer un administrateur</p>
              <form onSubmit={addAdmin} className="flex flex-col sm:flex-row gap-2">
                <input
                  type="email"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  placeholder="adresse e-mail du compte à promouvoir"
                  className="flex-1 border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-brand focus:outline-none"
                  required
                />
                <select
                  value={newAdminRole}
                  onChange={(e) => setNewAdminRole(e.target.value as "admin" | "super_admin")}
                  className="border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-brand focus:outline-none bg-white"
                >
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super-admin</option>
                </select>
                <button
                  type="submit"
                  disabled={addingAdmin}
                  className="flex items-center justify-center gap-1.5 bg-brand text-white text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-brand-dark transition-colors disabled:opacity-50"
                >
                  <ShieldPlus size={16} />
                  {addingAdmin ? "..." : "Nommer"}
                </button>
              </form>
              {adminError && <p className="text-red-700 text-sm font-medium mt-2">{adminError}</p>}
              <p className="text-xs text-gray-500 mt-2">
                La personne doit déjà avoir un compte Souvenirs Famille. Un super-admin peut à son tour nommer
                d&apos;autres administrateurs — mais le super-admin racine (toi) ne peut jamais être rétrogradé.
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-black/5 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-100">
                    <th className="px-4 py-3 font-medium">Nom</th>
                    <th className="px-4 py-3 font-medium">E-mail</th>
                    <th className="px-4 py-3 font-medium">Rôle</th>
                    <th className="px-4 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {admins === null ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                        Chargement...
                      </td>
                    </tr>
                  ) : (
                    admins.map((admin) => (
                      <tr key={admin.id} className="border-b border-gray-50 last:border-0">
                        <td className="px-4 py-3 font-medium text-brand-dark">{admin.name}</td>
                        <td className="px-4 py-3 text-gray-600">{admin.email}</td>
                        <td className="px-4 py-3">
                          {admin.is_root_super_admin ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded-full">
                              <ShieldCheck size={11} /> Super-admin racine
                            </span>
                          ) : admin.is_super_admin ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded-full">
                              <ShieldCheck size={11} /> Super-admin
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
                              Admin
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {!admin.is_root_super_admin && (
                            <div className="flex items-center gap-1.5 justify-end">
                              {admin.is_super_admin && (
                                <button
                                  onClick={() => demoteToAdmin(admin)}
                                  className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 hover:bg-gray-50 px-2 py-1 rounded-lg"
                                >
                                  Déclasser en admin
                                </button>
                              )}
                              <button
                                onClick={() => removeAdmin(admin)}
                                className="inline-flex items-center gap-1 text-xs font-medium text-red-700 hover:bg-red-50 px-2 py-1 rounded-lg"
                              >
                                <ShieldMinus size={13} /> Retirer
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {user.is_root_super_admin && <DatabaseResetSection />}
          </div>
        )}

        {tab === "deletions" && user.is_super_admin && (
          <div className="bg-white rounded-2xl shadow-sm border border-black/5 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="px-4 py-3 font-medium">Demande</th>
                  <th className="px-4 py-3 font-medium">Demandé par</th>
                  <th className="px-4 py-3 font-medium">Raison</th>
                  <th className="px-4 py-3 font-medium">Statut</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {deletionRequests === null ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                      Chargement...
                    </td>
                  </tr>
                ) : deletionRequests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                      Aucune demande.
                    </td>
                  </tr>
                ) : (
                  deletionRequests.map((req) => (
                    <tr key={req.id} className="border-b border-gray-50 last:border-0">
                      <td className="px-4 py-3">
                        <p className="font-medium text-brand-dark">
                          {req.type === "member_removal"
                            ? `Retirer ${req.target_user_name}`
                            : `Supprimer "${req.family_name}"`}
                        </p>
                        <p className="text-xs text-gray-500">
                          {req.type === "member_removal" ? `de la famille "${req.family_name}"` : "famille entière"}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {req.requester ? <span title={req.requester.email}>{req.requester.name}</span> : "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-600 max-w-xs">{req.reason}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs font-medium px-2 py-1 rounded-full ${
                            req.status === "approved"
                              ? "text-red-700 bg-red-50"
                              : req.status === "rejected"
                              ? "text-gray-600 bg-gray-100"
                              : "text-amber-700 bg-amber-50"
                          }`}
                        >
                          {req.status === "approved" ? "approuvée" : req.status === "rejected" ? "rejetée" : "en attente"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{formatDate(req.created_at)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center gap-1.5 justify-end flex-wrap">
                          {req.type === "member_removal" && req.family_id !== null && (
                            <button
                              onClick={() => {
                                const family = families?.find((f) => f.id === req.family_id);
                                if (family) openMembersModal(family);
                                else showToast("Famille introuvable (peut-être déjà supprimée).", "error");
                              }}
                              className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:bg-brand-light px-2 py-1 rounded-lg"
                            >
                              <Eye size={13} /> Voir les membres
                            </button>
                          )}
                          {req.status === "pending" && (
                            <>
                              <button
                                onClick={() => approveRequest(req)}
                                aria-label="Approuver"
                                className="inline-flex items-center gap-1 text-xs font-medium text-red-700 hover:bg-red-50 px-2 py-1 rounded-lg"
                              >
                                <ThumbsUp size={13} /> Approuver
                              </button>
                              <button
                                onClick={() => rejectRequest(req)}
                                aria-label="Rejeter"
                                className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 hover:bg-gray-50 px-2 py-1 rounded-lg"
                              >
                                <ThumbsDown size={13} /> Rejeter
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === "my-requests" && (
          <div className="bg-white rounded-2xl shadow-sm border border-black/5 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="px-4 py-3 font-medium">Demande</th>
                  <th className="px-4 py-3 font-medium">Raison</th>
                  <th className="px-4 py-3 font-medium">Statut</th>
                  <th className="px-4 py-3 font-medium">Réponse du super-admin</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {myRequests === null ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                      Chargement...
                    </td>
                  </tr>
                ) : myRequests.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                      Tu n&apos;as soumis aucune demande pour l&apos;instant.
                    </td>
                  </tr>
                ) : (
                  myRequests.map((req) => (
                    <tr key={req.id} className="border-b border-gray-50 last:border-0">
                      <td className="px-4 py-3">
                        <p className="font-medium text-brand-dark">
                          {req.type === "member_removal"
                            ? `Retirer ${req.target_user_name}`
                            : `Supprimer "${req.family_name}"`}
                        </p>
                        <p className="text-xs text-gray-500">
                          {req.type === "member_removal" ? `de la famille "${req.family_name}"` : "famille entière"}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-gray-600 max-w-xs">{req.reason}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs font-medium px-2 py-1 rounded-full ${
                            req.status === "approved"
                              ? "text-green-700 bg-green-50"
                              : req.status === "rejected"
                              ? "text-red-700 bg-red-50"
                              : "text-amber-700 bg-amber-50"
                          }`}
                        >
                          {req.status === "approved" ? "approuvée" : req.status === "rejected" ? "rejetée" : "en attente"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 max-w-xs">
                        {req.status === "pending" ? (
                          <span className="text-gray-400">En attente de réponse</span>
                        ) : (
                          <>
                            {req.reviewer && <span>{req.reviewer.name}</span>}
                            {req.review_note && <span className="block text-xs text-gray-500">{req.review_note}</span>}
                          </>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{formatDate(req.created_at)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === "messages" && (
          <div className="space-y-2">
            {conversations === null ? (
              <p className="text-sm text-gray-400 text-center py-6">Chargement...</p>
            ) : conversations.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Aucun message pour l&apos;instant.</p>
            ) : (
              conversations.map((c) => {
                const isUnseen =
                  c.last_message.sender_id === c.user?.id &&
                  (!seenMessagesAt || c.last_message.created_at > seenMessagesAt);
                const preview = c.last_message.body ?? (c.last_message.has_image ? "📷 Image" : "");

                return (
                  <div key={c.user?.id ?? c.last_message.created_at} className="bg-white rounded-2xl p-4 shadow-sm border border-black/5">
                    <Link href={c.user ? `/admin/messages/${c.user.id}` : "#"} className="flex items-center gap-3">
                      <Avatar name={c.user?.name ?? "?"} avatarPath={c.user?.avatar_path} size="md" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium text-brand-dark truncate flex items-center gap-1.5">
                            {c.user?.name ?? "Utilisateur supprimé"}
                            {isUnseen && <span className="w-2 h-2 rounded-full bg-red-600 flex-shrink-0" />}
                          </p>
                          <span className="text-xs text-gray-400 flex-shrink-0">{formatDate(c.last_message.created_at)}</span>
                        </div>
                        <p className="text-xs text-gray-500 truncate">
                          {[c.user?.email, c.user?.phone].filter(Boolean).join(" · ")}
                        </p>
                        <p className="text-sm text-gray-600 truncate mt-0.5">{preview}</p>
                      </div>
                    </Link>

                    {c.user && (
                      <button
                        onClick={() => openRemovalPicker(c)}
                        className="mt-3 flex items-center gap-1.5 text-xs font-medium text-red-700 hover:bg-red-50 px-2.5 py-1.5 rounded-lg"
                      >
                        <UserMinus size={13} /> Lancer une demande de retrait de membre
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {dangerTarget && (
          <motion.div
            variants={backdropFade}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4"
            onClick={() => setDangerTarget(null)}
          >
            <motion.div
              variants={scaleIn}
              className="bg-white rounded-2xl p-6 w-full max-w-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-lg font-medium text-brand-dark mb-1">
                {dangerTarget.kind === "family"
                  ? `Supprimer "${dangerTarget.family.name}" ?`
                  : `Retirer ${dangerTarget.member.name} ?`}
              </p>
              <p className="text-sm text-gray-600 mb-4">
                {dangerTarget.kind === "family"
                  ? user.is_super_admin
                    ? "Cette action supprime définitivement la famille, ses souvenirs, livres et commandes."
                    : "Ta demande sera envoyée au super-administrateur pour approbation."
                  : user.is_super_admin
                  ? `Retire définitivement ${dangerTarget.member.name} de la famille "${dangerTarget.family.name}".`
                  : "Ta demande de retrait sera envoyée au super-administrateur pour approbation."}
              </p>
              <label htmlFor="danger-reason" className="block text-sm font-medium mb-2 text-gray-800">
                Raison (règles non respectées, etc.)
              </label>
              <textarea
                id="danger-reason"
                value={dangerReason}
                onChange={(e) => setDangerReason(e.target.value)}
                rows={3}
                className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-brand focus:outline-none"
                required
              />
              {dangerError && <p className="text-red-700 text-sm font-medium mt-2">{dangerError}</p>}
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setDangerTarget(null)}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-gray-100 text-gray-700 text-sm font-medium py-2.5 rounded-xl"
                >
                  Annuler
                </button>
                <button
                  onClick={confirmDanger}
                  disabled={dangerBusy || !dangerReason.trim()}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-red-600 text-white text-sm font-medium py-2.5 rounded-xl disabled:opacity-50"
                >
                  <Trash2 size={14} />
                  {dangerBusy ? "..." : user.is_super_admin ? "Confirmer" : "Envoyer la demande"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {membersTarget && (
          <motion.div
            variants={backdropFade}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setMembersTarget(null)}
          >
            <motion.div
              variants={scaleIn}
              className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <p className="text-lg font-medium text-brand-dark">
                  Membres de &quot;{membersTarget.name}&quot;
                </p>
                <button
                  onClick={() => setMembersTarget(null)}
                  aria-label="Fermer"
                  className="text-gray-400 hover:text-gray-700 p-1"
                >
                  <X size={18} />
                </button>
              </div>

              {familyMembers === null ? (
                <p className="text-sm text-gray-400">Chargement...</p>
              ) : familyMembers.length === 0 ? (
                <p className="text-sm text-gray-400">Aucun membre.</p>
              ) : (
                <ul className="space-y-3">
                  {familyMembers.map((member) => (
                    <li key={member.id} className="flex items-center gap-3">
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
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded-full flex-shrink-0">
                          Membre
                        </span>
                      )}
                      {requestedMemberIds.has(member.id) ? (
                        <span className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded-full flex-shrink-0">
                          Retrait demandé
                        </span>
                      ) : (
                        <button
                          onClick={() => membersTarget && openMemberDangerModal(membersTarget, member)}
                          aria-label={`Retirer ${member.name}`}
                          className="text-red-600 hover:bg-red-50 rounded-lg p-1.5 flex-shrink-0"
                        >
                          <UserMinus size={15} />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {removalPickerMessage && (
          <motion.div
            variants={backdropFade}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setRemovalPickerMessage(null)}
          >
            <motion.div
              variants={scaleIn}
              className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-1">
                <p className="text-lg font-medium text-brand-dark">
                  Retirer un membre — demande de {removalPickerMessage.user?.name}
                </p>
                <button
                  onClick={() => setRemovalPickerMessage(null)}
                  aria-label="Fermer"
                  className="text-gray-400 hover:text-gray-700 p-1 flex-shrink-0"
                >
                  <X size={18} />
                </button>
              </div>
              <p className="text-xs text-gray-500 italic mb-4">
                « {removalPickerMessage.last_message.body ?? "(voir la conversation)"} »
              </p>

              {!removalPickerFamily ? (
                removalPickerFamilies === null ? (
                  <p className="text-sm text-gray-400">Chargement...</p>
                ) : removalPickerFamilies.length === 0 ? (
                  <p className="text-sm text-gray-400">Cet utilisateur ne fait partie d&apos;aucune famille.</p>
                ) : (
                  <ul className="space-y-2">
                    {removalPickerFamilies.map((family) => (
                      <li key={family.id}>
                        <button
                          onClick={() => pickRemovalFamily(family)}
                          className="w-full flex items-center justify-between text-left border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm hover:border-brand transition-colors"
                        >
                          <span className="font-medium text-brand-dark">{family.name}</span>
                          <span className="text-xs text-gray-500">{family.members_count} membre{family.members_count > 1 ? "s" : ""}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )
              ) : (
                <>
                  {removalPickerFamilies && removalPickerFamilies.length > 1 && (
                    <button
                      onClick={() => {
                        setRemovalPickerFamily(null);
                        setRemovalPickerMembers(null);
                      }}
                      className="text-xs font-medium text-brand hover:underline mb-3"
                    >
                      ← Autres familles
                    </button>
                  )}
                  <p className="text-sm font-medium text-brand-dark mb-3">{removalPickerFamily.name}</p>
                  {removalPickerMembers === null ? (
                    <p className="text-sm text-gray-400">Chargement...</p>
                  ) : removalPickerMembers.length === 0 ? (
                    <p className="text-sm text-gray-400">Aucun membre.</p>
                  ) : (
                    <ul className="space-y-3">
                      {removalPickerMembers.map((member) => (
                        <li key={member.id} className="flex items-center gap-3">
                          <Avatar name={member.name} avatarPath={member.avatar_path} size="md" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-brand-dark truncate">{member.name}</p>
                            <p className="text-xs text-gray-500 truncate">{member.email}</p>
                          </div>
                          <button
                            onClick={() => pickRemovalMember(member)}
                            aria-label={`Retirer ${member.name}`}
                            className="text-red-600 hover:bg-red-50 rounded-lg p-1.5 flex-shrink-0"
                          >
                            <UserMinus size={15} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
