"use client";

import { useCallback, useState } from "react";
import { useParams } from "next/navigation";
import { Crown, Users, Image as ImageIcon, CalendarDays, Cake, UserRound, MapPin } from "lucide-react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { usePolling } from "@/hooks/usePolling";
import { fadeInUp } from "@/lib/motion";
import { calculateAge } from "@/lib/date";
import { countryName } from "@/lib/countries";
import { BackHeader } from "@/components/BackHeader";
import { Avatar } from "@/components/Avatar";
import { CardListSkeleton } from "@/components/Skeleton";

interface MemberProfile {
  id: number;
  name: string;
  avatar_path: string | null;
  birth_date: string | null;
  gender: "male" | "female" | "other" | null;
  country: string | null;
  city: string | null;
  role: "admin" | "contributor";
  joined_at: string;
  memories_count: number;
}

const genderLabels: Record<"male" | "female" | "other", string> = {
  male: "Homme",
  female: "Femme",
  other: "Autre",
};

export default function MemberProfilePage() {
  const params = useParams();
  const familyId = params.id as string;
  const memberId = params.memberId as string;
  const [member, setMember] = useState<MemberProfile | null>(null);

  const loadMember = useCallback(async () => {
    const data = await api<MemberProfile>(`/families/${familyId}/members/${memberId}`);
    setMember(data);
  }, [familyId, memberId]);

  usePolling(loadMember, 10000);

  return (
    <main className="min-h-screen bg-brand-light pb-24">
      <BackHeader title="Profil" backHref={`/families/${familyId}/members`} backLabel="Membres" />

      <div className="max-w-2xl mx-auto px-4 sm:px-8 mt-6">
        {member === null ? (
          <CardListSkeleton count={1} />
        ) : (
          <motion.div
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            className="bg-white rounded-2xl p-6 shadow-sm border border-black/5 text-center"
          >
            <div className="flex justify-center mb-4">
              <Avatar name={member.name} avatarPath={member.avatar_path} size="xl" expandable />
            </div>
            <p className="text-xl font-medium text-brand-dark mb-1">{member.name}</p>
            {member.role === "admin" ? (
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-700 bg-amber-50 px-3 py-1.5 rounded-full">
                <Crown size={14} /> Créateur de la famille
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 bg-gray-100 px-3 py-1.5 rounded-full">
                <Users size={14} /> Membre
              </span>
            )}

            <div className="grid grid-cols-2 gap-3 mt-6 text-left">
              <div className="bg-brand-light rounded-xl p-4">
                <ImageIcon size={18} className="text-brand mb-2" />
                <p className="text-2xl font-semibold text-brand-dark">{member.memories_count}</p>
                <p className="text-sm text-gray-600">souvenir{member.memories_count > 1 ? "s" : ""} ajouté{member.memories_count > 1 ? "s" : ""}</p>
              </div>
              <div className="bg-brand-light rounded-xl p-4">
                <CalendarDays size={18} className="text-brand mb-2" />
                <p className="text-base font-semibold text-brand-dark">
                  {new Date(member.joined_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                </p>
                <p className="text-sm text-gray-600">membre depuis</p>
              </div>
              <div className="bg-brand-light rounded-xl p-4">
                <Cake size={18} className="text-brand mb-2" />
                {member.birth_date ? (
                  <p className="text-base font-semibold text-brand-dark">
                    {new Date(member.birth_date).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                    {" · "}
                    {calculateAge(member.birth_date)} ans
                  </p>
                ) : (
                  <p className="text-base font-semibold text-gray-400">Non renseignée</p>
                )}
                <p className="text-sm text-gray-600">date de naissance</p>
              </div>
              <div className="bg-brand-light rounded-xl p-4">
                <UserRound size={18} className="text-brand mb-2" />
                <p className="text-base font-semibold text-brand-dark">
                  {member.gender ? genderLabels[member.gender] : <span className="text-gray-400">Non renseigné</span>}
                </p>
                <p className="text-sm text-gray-600">genre</p>
              </div>
              <div className="bg-brand-light rounded-xl p-4 col-span-2">
                <MapPin size={18} className="text-brand mb-2" />
                <p className="text-base font-semibold text-brand-dark">
                  {member.city || member.country ? (
                    [member.city, countryName(member.country)].filter(Boolean).join(", ")
                  ) : (
                    <span className="text-gray-400">Non renseignée</span>
                  )}
                </p>
                <p className="text-sm text-gray-600">localisation</p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </main>
  );
}
