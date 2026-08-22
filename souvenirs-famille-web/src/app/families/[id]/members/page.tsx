"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Crown, Users } from "lucide-react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { fadeInUp, staggerContainer } from "@/lib/motion";
import { BackHeader } from "@/components/BackHeader";
import { Avatar } from "@/components/Avatar";
import { CardListSkeleton } from "@/components/Skeleton";

interface Member {
  id: number;
  name: string;
  avatar_path: string | null;
  memories_count: number;
  pivot: { role: "admin" | "contributor" };
}

export default function FamilyMembersPage() {
  const params = useParams();
  const familyId = params.id as string;
  const [members, setMembers] = useState<Member[] | null>(null);

  useEffect(() => {
    api<Member[]>(`/families/${familyId}/members`).then(setMembers);
  }, [familyId]);

  return (
    <main className="min-h-screen bg-brand-light pb-24">
      <BackHeader title="Membres" backHref={`/families/${familyId}`} backLabel="Fil de souvenirs" />

      <div className="max-w-2xl mx-auto px-4 sm:px-8 mt-6">
        {members === null ? (
          <CardListSkeleton />
        ) : (
          <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-3">
            {members.map((member) => (
              <motion.div key={member.id} variants={fadeInUp} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                <Link
                  href={`/families/${familyId}/members/${member.id}`}
                  className="flex items-center gap-4 bg-white rounded-2xl p-4 shadow-sm border border-black/5 hover:border-brand transition-colors"
                >
                  <Avatar name={member.name} avatarPath={member.avatar_path} size="lg" />
                  <div className="flex-1">
                    <p className="text-lg font-medium text-brand-dark">{member.name}</p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {member.memories_count} souvenir{member.memories_count > 1 ? "s" : ""}
                    </p>
                  </div>
                  {member.pivot.role === "admin" ? (
                    <span className="flex items-center gap-1.5 text-sm font-medium text-amber-700 bg-amber-50 px-3 py-1.5 rounded-full flex-shrink-0">
                      <Crown size={14} /> Créateur
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-sm font-medium text-gray-600 bg-gray-100 px-3 py-1.5 rounded-full flex-shrink-0">
                      <Users size={14} /> Membre
                    </span>
                  )}
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </main>
  );
}
