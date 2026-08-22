"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { fadeInUp } from "@/lib/motion";

interface UpcomingBirthday {
  user: { id: number; name: string };
  family: { id: number; name: string };
  birth_date: string;
  days_until: number;
  turning_age: number;
}

function daysLabel(daysUntil: number): string {
  if (daysUntil === 0) return "Aujourd'hui !";
  if (daysUntil === 1) return "Demain";
  return `Dans ${daysUntil} jours`;
}

export function UpcomingBirthdaysBanner({ familyId }: { familyId?: string }) {
  const [items, setItems] = useState<UpcomingBirthday[] | null>(null);

  useEffect(() => {
    api<UpcomingBirthday[]>("/me/upcoming-birthdays").then(setItems);
  }, []);

  const filtered = familyId ? items?.filter((b) => String(b.family.id) === familyId) : items;

  if (!filtered || filtered.length === 0) {
    return null;
  }

  return (
    <motion.div
      variants={fadeInUp}
      initial="hidden"
      animate="visible"
      className="bg-white rounded-2xl p-5 shadow-sm border border-black/5"
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">🎂</span>
        <p className="text-base font-medium text-brand-dark">Anniversaires à venir</p>
      </div>
      <div className="space-y-2.5">
        {filtered.map((b) => (
          <Link
            key={`${b.user.id}-${b.family.id}`}
            href={`/families/${b.family.id}`}
            className="flex items-center justify-between text-sm text-gray-700 hover:text-brand-dark transition-colors"
          >
            <span>
              {b.user.name}
              {!familyId && <span className="text-gray-400"> · {b.family.name}</span>}
            </span>
            <span className="font-medium flex-shrink-0 ml-2">
              {daysLabel(b.days_until)} · {b.turning_age} ans
            </span>
          </Link>
        ))}
      </div>
    </motion.div>
  );
}
