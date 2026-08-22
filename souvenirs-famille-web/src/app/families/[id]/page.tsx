"use client";

import { useEffect, useState, FormEvent, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Camera, Users } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { api, storageUrl, ApiError } from "@/lib/api";
import { normalizeImageFile } from "@/lib/imageUtils";
import { focalPointStyle } from "@/lib/imagePosition";
import { fadeInUp, scaleIn, staggerContainer } from "@/lib/motion";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";
import { BackHeader } from "@/components/BackHeader";
import { BottomNav } from "@/components/BottomNav";
import { PhotoLightbox } from "@/components/PhotoLightbox";
import { MemoryCard } from "@/components/MemoryCard";
import { FocalPointPicker } from "@/components/FocalPointPicker";
import { UpcomingBirthdaysBanner } from "@/components/UpcomingBirthdaysBanner";
import { FeedSkeleton } from "@/components/Skeleton";

interface Memory {
  id: number;
  image_path: string;
  caption: string | null;
  memory_date: string;
  focal_x: number;
  focal_y: number;
  likes_count: number;
  liked_by_me: boolean;
  user: { id: number; name: string; avatar_path: string | null };
}

interface Family {
  id: number;
  name: string;
  invite_code: string;
  members: { id: number; name: string; pivot: { role: "admin" | "contributor" } }[];
}

function todayDateString() {
  return new Date().toISOString().split("T")[0];
}

export default function FamilyFeedPage() {
  const params = useParams();
  const familyId = params.id as string;

  const [family, setFamily] = useState<Family | null>(null);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [onThisDay, setOnThisDay] = useState<Memory[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [caption, setCaption] = useState("");
  const [memoryDate, setMemoryDate] = useState(todayDateString());
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [focalPoint, setFocalPoint] = useState({ x: 50, y: 50 });
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [preparingFile, setPreparingFile] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [filterUserId, setFilterUserId] = useState<string>("");
  const { showToast } = useToast();
  const { user } = useAuth();

  const loadData = useCallback(async () => {
    const [familyData, onThisDayData] = await Promise.all([
      api<Family>(`/families/${familyId}`),
      api<Memory[]>(`/families/${familyId}/memories/on-this-day`),
    ]);
    setFamily(familyData);
    setOnThisDay(onThisDayData);
  }, [familyId]);

  const loadMemories = useCallback(async () => {
    const query = filterUserId ? `?user_id=${filterUserId}` : "";
    const memoriesData = await api<{ data: Memory[] }>(`/families/${familyId}/memories${query}`);
    setMemories(memoriesData.data);
  }, [familyId, filterUserId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    loadMemories();
  }, [loadMemories]);

  async function handleFileChange(selected: File | null) {
    setUploadError(null);
    setFile(null);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setFocalPoint({ x: 50, y: 50 });

    if (!selected) return;

    setPreparingFile(true);
    try {
      const normalizedFile = await normalizeImageFile(selected);
      setFile(normalizedFile);
      setPreviewUrl(URL.createObjectURL(normalizedFile));
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Erreur lors de la préparation de la photo.");
    } finally {
      setPreparingFile(false);
    }
  }

  async function handleUpload(e: FormEvent) {
    e.preventDefault();
    setUploadError(null);

    if (!file) {
      setUploadError("Choisis une photo d'abord.");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("photo", file);
      if (caption) formData.append("caption", caption);
      formData.append("memory_date", memoryDate);
      formData.append("focal_x", String(focalPoint.x));
      formData.append("focal_y", String(focalPoint.y));

      await api(`/families/${familyId}/memories`, {
        method: "POST",
        body: formData,
        isFormData: true,
      });

      setCaption("");
      handleFileChange(null);
      setMemoryDate(todayDateString());
      setShowUpload(false);
      await Promise.all([loadData(), loadMemories()]);
      showToast("Photo ajoutée !");
    } catch (err) {
      if (err instanceof ApiError) {
        setUploadError(err.message);
      } else if (err instanceof Error) {
        setUploadError(`Erreur technique : ${err.message}`);
      } else {
        setUploadError("Erreur lors de l'envoi.");
      }
    } finally {
      setUploading(false);
    }
  }

  if (!family) {
    return (
      <main className="min-h-screen bg-brand-light pb-24">
        <div className="max-w-2xl mx-auto px-4 sm:px-8 pt-8">
          <FeedSkeleton />
        </div>
      </main>
    );
  }

  const isAdmin = family.members.find((m) => m.id === user?.id)?.pivot.role === "admin";

  return (
    <main className="min-h-screen bg-brand-light pb-24">
      <BackHeader
        title={family.name}
        subtitle={`${family.members.length} membre${family.members.length > 1 ? "s" : ""} · Code : ${family.invite_code}`}
        backHref="/dashboard"
        backLabel="Mes familles"
        action={
          <Link
            href={`/families/${familyId}/members`}
            className="flex items-center gap-1.5 text-sm font-medium text-white bg-white/20 px-3 py-1.5 rounded-full hover:bg-white/30 transition-colors"
          >
            <Users size={14} /> Membres
          </Link>
        }
      />

      <div className="max-w-2xl mx-auto px-4 sm:px-8 mt-6 space-y-6">
        <UpcomingBirthdaysBanner familyId={familyId} />

        <motion.button
          onClick={() => setShowUpload(!showUpload)}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          className="w-full bg-brand text-white text-base font-medium py-3.5 rounded-xl hover:bg-brand-dark transition-colors flex items-center justify-center gap-2"
        >
          <Camera size={20} />
          Ajouter la photo du jour
        </motion.button>

        <AnimatePresence>
          {showUpload && (
            <motion.form
              variants={scaleIn}
              initial="hidden"
              animate="visible"
              exit="exit"
              onSubmit={handleUpload}
              className="bg-white rounded-2xl p-6 shadow-sm border border-black/5 space-y-4"
            >
              <div>
                <label htmlFor="photo" className="block text-base font-medium mb-2 text-gray-800">
                  Photo
                </label>
                <input
                  id="photo"
                  type="file"
                  accept="image/*,.heic,.heif"
                  onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
                  className="w-full text-base text-gray-700 file:mr-3 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:bg-brand file:text-white file:text-sm file:font-medium hover:file:bg-brand-dark file:cursor-pointer file:transition-colors"
                />
                <p className="text-sm text-gray-500 mt-1.5">
                  Tous formats acceptés (iPhone, Android, appareil photo).
                </p>
              </div>

              {preparingFile && (
                <p className="text-sm text-gray-500">Préparation de la photo...</p>
              )}

              <AnimatePresence>
                {previewUrl && (
                  <motion.div
                    variants={fadeInUp}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                  >
                    <label className="block text-base font-medium mb-2 text-gray-800">
                      Cadrage
                    </label>
                    <FocalPointPicker src={previewUrl} value={focalPoint} onChange={setFocalPoint} />
                  </motion.div>
                )}
              </AnimatePresence>

              <div>
                <label htmlFor="caption" className="block text-base font-medium mb-2 text-gray-800">
                  Légende (optionnel)
                </label>
                <input
                  id="caption"
                  type="text"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base focus:border-brand focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="memory_date" className="block text-base font-medium mb-2 text-gray-800">
                  Date du souvenir
                </label>
                <input
                  id="memory_date"
                  type="date"
                  value={memoryDate}
                  max={todayDateString()}
                  onChange={(e) => setMemoryDate(e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base focus:border-brand focus:outline-none"
                />
                <p className="text-sm text-gray-500 mt-1.5">
                  Utile pour ajouter une photo prise un autre jour.
                </p>
              </div>
              {uploadError && <p className="text-red-700 text-sm font-medium">{uploadError}</p>}
              <motion.button
                type="submit"
                disabled={uploading || preparingFile}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="w-full bg-brand text-white text-base font-medium py-3 rounded-xl hover:bg-brand-dark transition-colors disabled:opacity-50"
              >
                {uploading ? "Envoi..." : "Publier"}
              </motion.button>
            </motion.form>
          )}
        </AnimatePresence>

        {onThisDay.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-black/5">
            <p className="text-base font-medium text-brand-dark mb-3">
              Ce jour-là, il y a quelques années
            </p>
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-3 gap-1.5"
            >
              {onThisDay.map((m) => (
                <motion.img
                  key={m.id}
                  variants={fadeInUp}
                  src={storageUrl(m.image_path)}
                  alt={m.caption ?? "Souvenir"}
                  onClick={() => setSelectedMemory(m)}
                  style={focalPointStyle(m.focal_x, m.focal_y)}
                  className="w-full aspect-square object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                />
              ))}
            </motion.div>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-base font-medium text-gray-800">Fil de souvenirs</p>
            {family.members.length > 1 && (
              <select
                value={filterUserId}
                onChange={(e) => setFilterUserId(e.target.value)}
                className="text-sm border-2 border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-700 focus:border-brand focus:outline-none"
              >
                <option value="">Tous les membres</option>
                {family.members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          {memories.length === 0 ? (
            <p className="text-base text-gray-500">
              {filterUserId
                ? "Aucun souvenir de ce membre pour l'instant."
                : "Aucun souvenir pour l'instant. Ajoutez la première photo !"}
            </p>
          ) : (
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-3 gap-1.5"
            >
              {memories.map((m) => (
                <MemoryCard
                  key={m.id}
                  memory={m}
                  familyId={familyId}
                  canManage={isAdmin || m.user.id === user?.id}
                  onClick={() => setSelectedMemory(m)}
                  onDeleted={(id) => {
                    setMemories((prev) => prev.filter((mem) => mem.id !== id));
                    showToast("Souvenir supprimé.");
                  }}
                  onUpdated={(updated) =>
                    setMemories((prev) => prev.map((mem) => (mem.id === updated.id ? updated : mem)))
                  }
                />
              ))}
            </motion.div>
          )}
        </div>
      </div>

      {selectedMemory && (
        <PhotoLightbox
          imageUrl={storageUrl(selectedMemory.image_path)}
          caption={selectedMemory.caption}
          authorName={selectedMemory.user.name}
          authorId={selectedMemory.user.id}
          familyId={familyId}
          date={new Date(selectedMemory.memory_date).toLocaleDateString("fr-FR")}
          onClose={() => setSelectedMemory(null)}
        />
      )}

      <BottomNav familyId={familyId} />
    </main>
  );
}