"use client";

import { useEffect, useMemo, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
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
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { api, ApiError } from "@/lib/api";
import { formatCurrencyAmount } from "@/lib/currency";
import { fadeInUp, backdropFade, scaleIn } from "@/lib/motion";
import { BackHeader } from "@/components/BackHeader";
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
}

interface DeletionRequest {
  id: number;
  family_id: number | null;
  family_name: string;
  requester: { id: number; name: string; email: string } | null;
  reason: string;
  status: "pending" | "approved" | "rejected";
  reviewer: { id: number; name: string } | null;
  review_note: string | null;
  reviewed_at: string | null;
  created_at: string;
}

type Tab = "families" | "subscriptions" | "orders" | "admins" | "deletions";

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
  const [addingAdmin, setAddingAdmin] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);

  const [deletionRequests, setDeletionRequests] = useState<DeletionRequest[] | null>(null);
  const [requestedFamilyIds, setRequestedFamilyIds] = useState<Set<number>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<AdminFamily | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [editingFamilyId, setEditingFamilyId] = useState<number | null>(null);
  const [nameDraft, setNameDraft] = useState("");
  const [saving, setSaving] = useState(false);

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
    }
    if (user?.is_super_admin) {
      api<AdminUser[]>("/admin/admins").then(setAdmins);
      api<DeletionRequest[]>("/admin/deletion-requests").then(setDeletionRequests);
    }
  }, [user]);

  async function addAdmin(e: FormEvent) {
    e.preventDefault();
    setAdminError(null);
    setAddingAdmin(true);
    try {
      const promoted = await api<AdminUser>("/admin/admins", {
        method: "POST",
        body: { email: newAdminEmail },
      });
      setAdmins((prev) => (prev ? [...prev.filter((a) => a.id !== promoted.id), promoted] : [promoted]));
      setNewAdminEmail("");
      showToast(`${promoted.name} est maintenant administrateur.`);
    } catch (err) {
      setAdminError(err instanceof ApiError ? err.message : "Une erreur est survenue.");
    } finally {
      setAddingAdmin(false);
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

  function openDeleteModal(family: AdminFamily) {
    setDeleteTarget(family);
    setDeleteReason("");
    setDeleteError(null);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleteError(null);
    setDeleting(true);
    try {
      if (user?.is_super_admin) {
        await api(`/admin/families/${deleteTarget.id}`, {
          method: "DELETE",
          body: { reason: deleteReason },
        });
        setFamilies((prev) => prev?.filter((f) => f.id !== deleteTarget.id) ?? prev);
        showToast(`Famille "${deleteTarget.name}" supprimée.`);
      } else {
        await api(`/admin/families/${deleteTarget.id}/deletion-requests`, {
          method: "POST",
          body: { reason: deleteReason },
        });
        setRequestedFamilyIds((prev) => new Set(prev).add(deleteTarget.id));
        showToast("Demande de suppression envoyée au super-administrateur.");
      }
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : "Une erreur est survenue.");
    } finally {
      setDeleting(false);
    }
  }

  async function approveDeletion(request: DeletionRequest) {
    try {
      await api(`/admin/deletion-requests/${request.id}/approve`, { method: "POST" });
      setDeletionRequests((prev) =>
        prev?.map((r) => (r.id === request.id ? { ...r, status: "approved" as const } : r)) ?? prev
      );
      setFamilies((prev) => prev?.filter((f) => f.id !== request.family_id) ?? prev);
      showToast(`Famille "${request.family_name}" supprimée.`);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Une erreur est survenue.", "error");
    }
  }

  async function rejectDeletion(request: DeletionRequest) {
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

        <div className="flex flex-wrap bg-gray-100 rounded-xl p-1 max-w-2xl gap-1">
          {([
            ["families", "Familles"],
            ["subscriptions", "Abonnements"],
            ["orders", "Commandes"],
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
              {key === "deletions" &&
                deletionRequests &&
                deletionRequests.filter((r) => r.status === "pending").length > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center text-[10px] font-bold bg-red-600 text-white rounded-full w-4 h-4">
                    {deletionRequests.filter((r) => r.status === "pending").length}
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
                            <span className="font-medium text-brand-dark">{family.name}</span>
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
                        {requestedFamilyIds.has(family.id) ? (
                          <span className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded-full">
                            Suppression demandée
                          </span>
                        ) : (
                          <button
                            onClick={() => openDeleteModal(family)}
                            aria-label={`Supprimer la famille ${family.name}`}
                            className="text-red-600 hover:bg-red-50 rounded-lg p-1.5"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
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
                La personne doit déjà avoir un compte Souvenirs Famille. Seul ton compte peut nommer ou retirer des administrateurs.
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
                          {admin.is_super_admin ? (
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
                          {!admin.is_super_admin && (
                            <button
                              onClick={() => removeAdmin(admin)}
                              className="inline-flex items-center gap-1 text-xs font-medium text-red-700 hover:bg-red-50 px-2 py-1 rounded-lg"
                            >
                              <ShieldMinus size={13} /> Retirer
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "deletions" && user.is_super_admin && (
          <div className="bg-white rounded-2xl shadow-sm border border-black/5 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="px-4 py-3 font-medium">Famille</th>
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
                      Aucune demande de suppression.
                    </td>
                  </tr>
                ) : (
                  deletionRequests.map((req) => (
                    <tr key={req.id} className="border-b border-gray-50 last:border-0">
                      <td className="px-4 py-3 font-medium text-brand-dark">{req.family_name}</td>
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
                          {req.status === "approved" ? "supprimée" : req.status === "rejected" ? "rejetée" : "en attente"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{formatDate(req.created_at)}</td>
                      <td className="px-4 py-3 text-right">
                        {req.status === "pending" && (
                          <div className="flex items-center gap-1.5 justify-end">
                            <button
                              onClick={() => approveDeletion(req)}
                              aria-label="Approuver la suppression"
                              className="inline-flex items-center gap-1 text-xs font-medium text-red-700 hover:bg-red-50 px-2 py-1 rounded-lg"
                            >
                              <ThumbsUp size={13} /> Approuver
                            </button>
                            <button
                              onClick={() => rejectDeletion(req)}
                              aria-label="Rejeter la suppression"
                              className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 hover:bg-gray-50 px-2 py-1 rounded-lg"
                            >
                              <ThumbsDown size={13} /> Rejeter
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
        )}
      </div>

      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            variants={backdropFade}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setDeleteTarget(null)}
          >
            <motion.div
              variants={scaleIn}
              className="bg-white rounded-2xl p-6 w-full max-w-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-lg font-medium text-brand-dark mb-1">
                Supprimer &quot;{deleteTarget.name}&quot; ?
              </p>
              <p className="text-sm text-gray-600 mb-4">
                {user.is_super_admin
                  ? "Cette action supprime définitivement la famille, ses souvenirs, livres et commandes."
                  : "Ta demande sera envoyée au super-administrateur pour approbation."}
              </p>
              <label htmlFor="delete-reason" className="block text-sm font-medium mb-2 text-gray-800">
                Raison (règles non respectées, etc.)
              </label>
              <textarea
                id="delete-reason"
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                rows={3}
                className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-brand focus:outline-none"
                required
              />
              {deleteError && <p className="text-red-700 text-sm font-medium mt-2">{deleteError}</p>}
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setDeleteTarget(null)}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-gray-100 text-gray-700 text-sm font-medium py-2.5 rounded-xl"
                >
                  Annuler
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={deleting || !deleteReason.trim()}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-red-600 text-white text-sm font-medium py-2.5 rounded-xl disabled:opacity-50"
                >
                  <Trash2 size={14} />
                  {deleting ? "..." : user.is_super_admin ? "Supprimer" : "Envoyer la demande"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
