"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BookOpen, Star, UserCircle } from "lucide-react";

export function BottomNav({ familyId }: { familyId: string }) {
  const pathname = usePathname();

  const items = [
    {
      href: `/families/${familyId}`,
      label: "Accueil",
      icon: Home,
      active: pathname === `/families/${familyId}`,
    },
    {
      href: `/families/${familyId}/books`,
      label: "Livres",
      icon: BookOpen,
      active: pathname.startsWith(`/families/${familyId}/books`),
    },
    {
      href: `/families/${familyId}/subscription`,
      label: "Abonnement",
      icon: Star,
      active: pathname.startsWith(`/families/${familyId}/subscription`),
    },
    {
      href: "/profile",
      label: "Profil",
      icon: UserCircle,
      active: pathname === "/profile",
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-black/10 z-20 pb-2">
      <div className="max-w-2xl mx-auto flex justify-around">
        {items.map(({ href, label, icon: Icon, active }) => (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center gap-1 py-2.5 px-3 flex-1"
          >
            <Icon size={21} className={active ? "text-brand" : "text-gray-400"} strokeWidth={active ? 2.5 : 2} />
            <span className={`text-[11px] font-medium ${active ? "text-brand" : "text-gray-500"}`}>
              {label}
            </span>
          </Link>
        ))}
      </div>
    </nav>
  );
}