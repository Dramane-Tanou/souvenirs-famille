"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Crown, Users, LogOut } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { fadeInUp, staggerContainer } from "@/lib/motion";
import { UpcomingBirthdaysBanner } from "@/components/UpcomingBirthdaysBanner";
import { CardListSkeleton } from "@/components/Skeleton";

interface Family {
  id: number;
  name: string;
  invite_code: string;
  pivot: { role: "admin" | "contributor" };
  memories_count: number;
  memories_max_memory_date: string | null;
}

export default function DashboardPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [families, setFamilies] = useState<Family[] | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
      return;
    }
    if (!loading && user && (!user.birth_date || !user.gender)) {
      router.push("/complete-profile");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (user) {
      api<Family[]>("/families").then(setFamilies);
    }
  }, [user]);

  if (loading || !user || !user.birth_date || !user.gender) {
    return <p className="p-8 text-base">Chargement...</p>;
  }

  const initials = user.name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <main className="min-h-screen bg-brand-light p-4 sm:p-8">
      <div className="max-w-2xl mx-auto">
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          className="flex justify-between items-center mb-6"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-brand flex items-center justify-center text-white text-lg font-medium flex-shrink-0">
              {initials}
            </div>
            <div>
              <h1 className="text-xl font-semibold text-brand-dark">Bonjour, {user.name}</h1>
              <Link href="/profile" className="text-sm text-gray-500 hover:text-brand-dark transition-colors">
                Voir mon profil
              </Link>
            </div>
          </div>
          <button
            onClick={logout}
            aria-label="Se déconnecter"
            className="text-gray-400 hover:text-brand-dark p-2 rounded-lg hover:bg-white/60 transition-colors"
          >
            <LogOut size={20} />
          </button>
        </motion.div>

        <div className="mb-4">
          <UpcomingBirthdaysBanner />
        </div>

        {families === null && <CardListSkeleton />}

        {families !== null && families.length === 0 && (
          <motion.div
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            className="bg-white rounded-2xl p-8 shadow-sm border border-black/5 text-center"
          >
            <p className="text-lg text-gray-800 mb-4">
              Vous ne faites partie d&apos;aucun cercle familial pour l&apos;instant.
            </p>
            <Link
              href="/families/new"
              className="inline-block bg-brand text-white text-base font-medium px-6 py-3.5 rounded-xl hover:bg-brand-dark transition-colors"
            >
              Créer ou rejoindre une famille
            </Link>
          </motion.div>
        )}

        {families !== null && families.length > 0 && (
          <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-3">
            {families.map((family) => (
              <motion.div key={family.id} variants={fadeInUp} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                <Link
                  href={`/families/${family.id}`}
                  className="block bg-white rounded-2xl p-6 shadow-sm border border-black/5 hover:border-brand transition-colors"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-lg font-medium text-brand-dark">{family.name}</p>
                      <p className="text-sm text-gray-500 mt-1">
                        {family.memories_count} souvenir{family.memories_count > 1 ? "s" : ""}
                        {family.memories_max_memory_date &&
                          ` · dernier le ${new Date(family.memories_max_memory_date).toLocaleDateString("fr-FR")}`}
                      </p>
                    </div>
                    {family.pivot.role === "admin" ? (
                      <span className="flex items-center gap-1.5 text-sm font-medium text-amber-700 bg-amber-50 px-3 py-1.5 rounded-full flex-shrink-0">
                        <Crown size={14} /> Créateur
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-sm font-medium text-gray-600 bg-gray-100 px-3 py-1.5 rounded-full flex-shrink-0">
                        <Users size={14} /> Membre
                      </span>
                    )}
                  </div>
                </Link>
              </motion.div>
            ))}
            <Link
              href="/families/new"
              className="block text-center text-base text-brand font-medium py-3"
            >
              + Créer ou rejoindre une autre famille
            </Link>
          </motion.div>
        )}
      </div>
    </main>
  );
}
