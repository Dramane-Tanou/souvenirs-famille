"use client";

import { useEffect, useRef, useState, FormEvent, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Camera, Users, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { api, storageUrl, ApiError } from "@/lib/api";
import { normalizeImageFile } from "@/lib/imageUtils";
import { focalPointStyle } from "@/lib/imagePosition";
import { fadeInUp, scaleIn, staggerContainer } from "@/lib/motion";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";
import { usePolling } from "@/hooks/usePolling";
import { BackHeader } from "@/components/BackHeader";
import { BottomNav } from "@/components/BottomNav";
import { PhotoLightbox } from "@/components/PhotoLightbox";
import { MemoryCard } from "@/components/MemoryCard";
import { PhotoCropper } from "@/components/PhotoCropper";
import { UpcomingBirthdaysBanner } from "@/components/UpcomingBirthdaysBanner";
import { FeedSkeleton } from "@/components/Skeleton";

interface Memory {
  id: number;
  image_path: string;
  caption: string | null;
  memory_date: string;
  focal_x: number;
  focal_y: number;
  zoom: number;
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
  const [files, setFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [focalPoint, setFocalPoint] = useState({ x: 50, y: 50, zoom: 1 });
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [preparingFile, setPreparingFile] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [filterUserId, setFilterUserId] = useState<string>("");

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

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
    const query = filterUserId ? `&user_id=${filterUserId}` : "";
    const memoriesData = await api<{ data: Memory[]; current_page: number; last_page: number }>(
      `/families/${familyId}/memories?page=1${query}`
    );
    setMemories(memoriesData.data);
    setPage(1);
    setHasMore(memoriesData.current_page < memoriesData.last_page);
  }, [familyId, filterUserId]);

  const loadMoreMemories = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const query = filterUserId ? `&user_id=${filterUserId}` : "";
      const memoriesData = await api<{ data: Memory[]; current_page: number; last_page: number }>(
        `/families/${familyId}/memories?page=${nextPage}${query}`
      );
      setMemories((prev) => [...prev, ...memoriesData.data]);
      setPage(memoriesData.current_page);
      setHasMore(memoriesData.current_page < memoriesData.last_page);
    } finally {
      setLoadingMore(false);
    }
  }, [familyId, filterUserId, page, hasMore, loadingMore]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    loadMemories();
  }, [loadMemories]);

  // Sonde régulièrement la première page pour voir apparaître les nouveaux
  // souvenirs et les likes d'autres membres sans recharger la page — fusionne
  // les nouveautés en tête du fil sans perturber la pagination déjà chargée
  // par le défilement infini (page/hasMore ne sont pas touchés ici).
  const refreshFeed = useCallback(async () => {
    const query = filterUserId ? `&user_id=${filterUserId}` : "";
    const memoriesData = await api<{ data: Memory[]; current_page: number; last_page: number }>(
      `/families/${familyId}/memories?page=1${query}`
    );
    setMemories((prev) => {
      const freshById = new Map(memoriesData.data.map((m) => [m.id, m]));
      const existingIds = new Set(prev.map((m) => m.id));
      const newOnes = memoriesData.data.filter((m) => !existingIds.has(m.id));
      const refreshedExisting = prev.map((m) => freshById.get(m.id) ?? m);
      return newOnes.length > 0 ? [...newOnes, ...refreshedExisting] : refreshedExisting;
    });
  }, [familyId, filterUserId]);

  usePolling(refreshFeed, 8000);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMoreMemories();
        }
      },
      { rootMargin: "300px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMoreMemories]);

  async function handleFileChange(selected: FileList | null) {
    setUploadError(null);
    setFiles([]);
    setPreviewUrls((prev) => {
      prev.forEach((u) => URL.revokeObjectURL(u));
      return [];
    });
    setFocalPoint({ x: 50, y: 50, zoom: 1 });

    if (!selected || selected.length === 0) return;

    setPreparingFile(true);
    try {
      const normalizedFiles = await Promise.all(Array.from(selected).map((f) => normalizeImageFile(f)));
      setFiles(normalizedFiles);
      setPreviewUrls(normalizedFiles.map((f) => URL.createObjectURL(f)));
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Erreur lors de la préparation des photos.");
    } finally {
      setPreparingFile(false);
    }
  }

  function removeSelectedFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviewUrls((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  }

  async function handleUpload(e: FormEvent) {
    e.preventDefault();
    setUploadError(null);

    if (files.length === 0) {
      setUploadError("Choisis au moins une photo d'abord.");
      return;
    }

    setUploading(true);
    setUploadProgress({ done: 0, total: files.length });
    let failures = 0;
    try {
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData();
        formData.append("photo", files[i]);
        if (caption) formData.append("caption", caption);
        formData.append("memory_date", memoryDate);
        // Le recadrage individuel n'est proposé que pour un envoi d'une seule photo.
        formData.append("focal_x", String(files.length === 1 ? focalPoint.x : 50));
        formData.append("focal_y", String(files.length === 1 ? focalPoint.y : 50));
        formData.append("zoom", String(files.length === 1 ? focalPoint.zoom : 1));

        try {
          await api(`/families/${familyId}/memories`, {
            method: "POST",
            body: formData,
            isFormData: true,
          });
        } catch {
          failures++;
        }
        setUploadProgress({ done: i + 1, total: files.length });
      }

      setCaption("");
      handleFileChange(null);
      setMemoryDate(todayDateString());
      setShowUpload(false);
      await Promise.all([loadData(), loadMemories()]);

      if (failures === 0) {
        showToast(files.length > 1 ? `${files.length} photos ajoutées !` : "Photo ajoutée !");
      } else {
        showToast(`${files.length - failures}/${files.length} photos ajoutées, ${failures} échec(s).`, "error");
      }
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
      setUploadProgress(null);
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
                  Photo{files.length > 1 ? "s" : ""}
                </label>
                <input
                  id="photo"
                  type="file"
                  accept="image/*,.heic,.heif"
                  multiple
                  onChange={(e) => handleFileChange(e.target.files)}
                  className="w-full text-base text-gray-700 file:mr-3 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:bg-brand file:text-white file:text-sm file:font-medium hover:file:bg-brand-dark file:cursor-pointer file:transition-colors"
                />
                <p className="text-sm text-gray-500 mt-1.5">
                  Tous formats acceptés (iPhone, Android, appareil photo). Sélection multiple possible.
                </p>
              </div>

              {preparingFile && (
                <p className="text-sm text-gray-500">Préparation des photos...</p>
              )}

              <AnimatePresence>
                {previewUrls.length === 1 && (
                  <motion.div
                    variants={fadeInUp}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                  >
                    <label className="block text-base font-medium mb-2 text-gray-800">
                      Cadrage
                    </label>
                    <PhotoCropper src={previewUrls[0]} value={focalPoint} onChange={setFocalPoint} />
                  </motion.div>
                )}
                {previewUrls.length > 1 && (
                  <motion.div
                    variants={fadeInUp}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                  >
                    <label className="block text-base font-medium mb-2 text-gray-800">
                      {previewUrls.length} photos sélectionnées
                    </label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {previewUrls.map((url, i) => (
                        <div key={url} className="relative aspect-square">
                          <img
                            src={url}
                            alt={`Sélection ${i + 1}`}
                            className="w-full h-full object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => removeSelectedFile(i)}
                            className="absolute -top-1.5 -right-1.5 bg-black/70 text-white rounded-full p-1 hover:bg-black transition-colors"
                            aria-label="Retirer cette photo"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
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
                {uploading
                  ? uploadProgress && uploadProgress.total > 1
                    ? `Envoi ${uploadProgress.done}/${uploadProgress.total}...`
                    : "Envoi..."
                  : "Publier"}
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
                <motion.div
                  key={m.id}
                  variants={fadeInUp}
                  onClick={() => setSelectedMemory(m)}
                  className="w-full aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={storageUrl(m.image_path)}
                    alt={m.caption ?? "Souvenir"}
                    style={focalPointStyle(m.focal_x, m.focal_y, m.zoom)}
                    className="w-full h-full object-cover"
                  />
                </motion.div>
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
          <div ref={sentinelRef} className="h-1" />
          {loadingMore && (
            <p className="text-sm text-gray-500 text-center mt-4">Chargement...</p>
          )}
          {!hasMore && memories.length > 0 && (
            <p className="text-sm text-gray-400 text-center mt-4">Tous les souvenirs sont affichés.</p>
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