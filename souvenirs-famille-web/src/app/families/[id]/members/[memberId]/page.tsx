"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Crown, Users, Image as ImageIcon, CalendarDays } from "lucide-react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { fadeInUp } from "@/lib/motion";
import { BackHeader } from "@/components/BackHeader";
import { Avatar } from "@/components/Avatar";
import { CardListSkeleton } from "@/components/Skeleton";

interface MemberProfile {
  id: number;
  name: string;
  avatar_path: string | null;
  role: "admin" | "contributor";
  joined_at: string;
  memories_count: number;
}

export default function MemberProfilePage() {
  const params = useParams();
  const familyId = params.id as string;
  const memberId = params.memberId as string;
  const [member, setMember] = useState<MemberProfile | null>(null);

  useEffect(() => {
    api<MemberProfile>(`/families/${familyId}/members/${memberId}`).then(setMember);
  }, [familyId, memberId]);

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
              <Avatar name={member.name} avatarPath={member.avatar_path} size="xl" />
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
            </div>
          </motion.div>
        )}
      </div>
    </main>
  );
}
