"use client";

import { useEffect, useState, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Mail, User as UserIcon, Cake, Pencil, X, Check, HelpCircle, Camera, UserRound } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth, Gender } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { api, ApiError } from "@/lib/api";
import { calculateAge } from "@/lib/date";
import { backdropFade, fadeInUp, scaleIn } from "@/lib/motion";
import { BackHeader } from "@/components/BackHeader";
import { BottomNav } from "@/components/BottomNav";
import { FaqAccordion } from "@/components/FaqAccordion";
import { Avatar } from "@/components/Avatar";

interface Family {
  id: number;
  name: string;
}

export default function ProfilePage() {
  const { user, loading, logout, updateProfile, updateUser } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const [primaryFamilyId, setPrimaryFamilyId] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [birthDateDraft, setBirthDateDraft] = useState("");
  const [genderDraft, setGenderDraft] = useState<Gender | "">("");
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (user) {
      api<Family[]>("/families").then((families) => {
        if (families.length > 0) {
          setPrimaryFamilyId(String(families[0].id));
        }
      });
      setNameDraft(user.name);
      setBirthDateDraft(user.birth_date ?? "");
      setGenderDraft(user.gender ?? "");
    }
  }, [user]);

  if (loading || !user) {
    return <p className="p-8 text-base">Chargement...</p>;
  }

  const genderLabels: Record<Gender, string> = {
    male: "Homme",
    female: "Femme",
    other: "Autre",
  };

  async function handleSave() {
    setError(null);
    setSaving(true);
    try {
      await updateProfile(nameDraft, birthDateDraft || null, genderDraft || null);
      setEditing(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("avatar", file);
      const updated = await api<NonNullable<typeof user>>("/profile/avatar", {
        method: "POST",
        body: formData,
        isFormData: true,
      });
      updateUser(updated);
      showToast("Photo de profil mise à jour !");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Erreur lors de l'envoi.", "error");
    } finally {
      setUploadingAvatar(false);
    }
  }

  return (
    <main className="min-h-screen bg-brand-light pb-24">
      <BackHeader
        title="Mon profil"
        backHref={primaryFamilyId ? `/families/${primaryFamilyId}` : "/dashboard"}
        backLabel={primaryFamilyId ? "Fil de souvenirs" : "Tableau de bord"}
      />

      <motion.div
        variants={fadeInUp}
        initial="hidden"
        animate="visible"
        className="max-w-2xl mx-auto px-4 sm:px-8 mt-6 space-y-4"
      >
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-black/5">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="relative flex-shrink-0">
                <Avatar name={user.name} avatarPath={user.avatar_path} size="lg" />
                <label
                  htmlFor="avatar-upload"
                  aria-label="Changer la photo de profil"
                  className="absolute -bottom-1 -right-1 bg-brand text-white rounded-full p-1.5 cursor-pointer hover:bg-brand-dark transition-colors border-2 border-white"
                >
                  <Camera size={13} />
                </label>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  disabled={uploadingAvatar}
                  className="hidden"
                />
              </div>
              <div>
                <p className="text-lg font-medium text-brand-dark">{user.name}</p>
                <p className="text-sm text-gray-500">
                  {uploadingAvatar ? "Envoi de la photo..." : "Membre de la famille"}
                </p>
              </div>
            </div>
            <button
              onClick={() => setEditing(true)}
              aria-label="Modifier le profil"
              className="text-gray-400 hover:text-brand p-2"
            >
              <Pencil size={18} />
            </button>
          </div>

          <div className="space-y-3 border-t border-gray-100 pt-4">
            <div className="flex items-center gap-3 text-base text-gray-700">
              <UserIcon size={18} className="text-gray-400 flex-shrink-0" />
              <span>{user.name}</span>
            </div>
            <div className="flex items-center gap-3 text-base text-gray-700">
              <Mail size={18} className="text-gray-400 flex-shrink-0" />
              <span>{user.email}</span>
            </div>
            <div className="flex items-center gap-3 text-base text-gray-700">
              <Cake size={18} className="text-gray-400 flex-shrink-0" />
              {user.birth_date ? (
                <span>
                  {new Date(user.birth_date).toLocaleDateString("fr-FR")} · {calculateAge(user.birth_date)} ans
                </span>
              ) : (
                <span className="text-gray-400">Date de naissance non renseignée</span>
              )}
            </div>
            <div className="flex items-center gap-3 text-base text-gray-700">
              <UserRound size={18} className="text-gray-400 flex-shrink-0" />
              {user.gender ? (
                <span>{genderLabels[user.gender]}</span>
              ) : (
                <span className="text-gray-400">Genre non renseigné</span>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 bg-white text-red-700 text-base font-medium py-3.5 rounded-xl border-2 border-red-100 hover:bg-red-50 transition-colors"
        >
          <LogOut size={19} />
          Se déconnecter
        </button>

        <div>
          <div className="flex items-center gap-2 mb-3 mt-4">
            <HelpCircle size={20} className="text-brand-dark" />
            <p className="text-lg font-medium text-brand-dark">Questions fréquentes</p>
          </div>
          <FaqAccordion />
        </div>
      </motion.div>

      <AnimatePresence>
        {editing && (
          <motion.div
            variants={backdropFade}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setEditing(false)}
          >
          <motion.div
            variants={scaleIn}
            className="bg-white rounded-2xl p-6 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-lg font-medium text-brand-dark mb-4">Modifier mon profil</p>

            <div className="mb-4">
              <label htmlFor="edit-name" className="block text-base font-medium mb-2 text-gray-800">
                Nom
              </label>
              <input
                id="edit-name"
                type="text"
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base focus:border-brand focus:outline-none"
              />
            </div>

            <div className="mb-4">
              <label htmlFor="edit-birthdate" className="block text-base font-medium mb-2 text-gray-800">
                Date de naissance
              </label>
              <input
                id="edit-birthdate"
                type="date"
                value={birthDateDraft}
                max={new Date().toISOString().split("T")[0]}
                onChange={(e) => setBirthDateDraft(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base focus:border-brand focus:outline-none"
              />
            </div>

            <div className="mb-4">
              <label htmlFor="edit-gender" className="block text-base font-medium mb-2 text-gray-800">
                Genre
              </label>
              <select
                id="edit-gender"
                value={genderDraft}
                onChange={(e) => setGenderDraft(e.target.value as Gender | "")}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base focus:border-brand focus:outline-none bg-white"
              >
                <option value="">Non renseigné</option>
                <option value="male">Homme</option>
                <option value="female">Femme</option>
                <option value="other">Autre</option>
              </select>
            </div>

            {error && <p className="text-red-700 text-sm font-medium mb-3">{error}</p>}

            <div className="flex gap-2">
              <button
                onClick={() => setEditing(false)}
                className="flex-1 flex items-center justify-center gap-1.5 bg-gray-100 text-gray-700 text-base font-medium py-3 rounded-xl"
              >
                <X size={16} /> Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-1.5 bg-brand text-white text-base font-medium py-3 rounded-xl disabled:opacity-50"
              >
                <Check size={16} /> {saving ? "..." : "Enregistrer"}
              </button>
            </div>
          </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {primaryFamilyId && <BottomNav familyId={primaryFamilyId} />}
    </main>
  );
}