"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { api } from "@/lib/api";
import { fadeInUp } from "@/lib/motion";

const AUTO_HIDE_MS = 15_000;

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
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    api<UpcomingBirthday[]>("/me/upcoming-birthdays").then(setItems);
  }, []);

  const filtered = familyId ? items?.filter((b) => String(b.family.id) === familyId) : items;
  const visible = !!filtered && filtered.length > 0 && !dismissed;

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => setDismissed(true), AUTO_HIDE_MS);
    return () => clearTimeout(timer);
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          exit="hidden"
          className="relative bg-white rounded-2xl p-5 pr-10 shadow-sm border border-black/5"
        >
          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label="Fermer"
            className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={16} />
          </button>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">🎂</span>
            <p className="text-base font-medium text-brand-dark">Anniversaires à venir</p>
          </div>
          <div className="space-y-2.5">
            {filtered!.map((b) => (
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
      )}
    </AnimatePresence>
  );
}
