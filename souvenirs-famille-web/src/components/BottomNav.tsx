"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BookOpen, Star, UserCircle } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { CONTACT_SEEN_AT_KEY } from "@/lib/contactNotifications";

const POLL_INTERVAL_MS = 20000;

export function BottomNav({ familyId }: { familyId: string }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  // Badge "message non lu" sur l'onglet Profil, visible depuis n'importe où
  // dans l'appli : un admin peut répondre pendant que l'utilisateur consulte
  // le fil de souvenirs ou un livre, par exemple.
  useEffect(() => {
    if (!user) return;

    async function checkUnread() {
      try {
        const messages = await api<{ sender_id: number; created_at: string }[]>("/contact-messages/mine");
        const seenAt = localStorage.getItem(CONTACT_SEEN_AT_KEY);
        const unread = messages.filter(
          (m) => m.sender_id !== user!.id && (!seenAt || m.created_at > seenAt)
        ).length;
        setUnreadCount(unread);
      } catch {
        // silencieux (ex. session expirée) — pas critique pour un badge
      }
    }

    checkUnread();
    const interval = setInterval(checkUnread, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [user]);

  const items = [
    {
      href: `/families/${familyId}`,
      label: "Accueil",
      icon: Home,
      active: pathname === `/families/${familyId}`,
      badge: 0,
    },
    {
      href: `/families/${familyId}/books`,
      label: "Livres",
      icon: BookOpen,
      active: pathname.startsWith(`/families/${familyId}/books`),
      badge: 0,
    },
    {
      href: `/families/${familyId}/subscription`,
      label: "Abonnement",
      icon: Star,
      active: pathname.startsWith(`/families/${familyId}/subscription`),
      badge: 0,
    },
    {
      href: "/profile",
      label: "Profil",
      icon: UserCircle,
      active: pathname === "/profile",
      badge: unreadCount,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-black/10 z-20 pb-2">
      <div className="max-w-2xl mx-auto flex justify-around">
        {items.map(({ href, label, icon: Icon, active, badge }) => (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center gap-1 py-2.5 px-3 flex-1"
          >
            <div className="relative">
              <Icon size={21} className={active ? "text-brand" : "text-gray-400"} strokeWidth={active ? 2.5 : 2} />
              {badge > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-red-600 text-white text-[10px] font-semibold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center leading-none">
                  {badge}
                </span>
              )}
            </div>
            <span className={`text-[11px] font-medium ${active ? "text-brand" : "text-gray-500"}`}>
              {label}
            </span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
