"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { api, ApiError } from "@/lib/api";
import { fadeInUp } from "@/lib/motion";

interface Family {
  id: number;
  name: string;
  invite_code: string;
}

export default function NewFamilyPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"create" | "join">("create");
  const [name, setName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const family = await api<Family>("/families", {
        method: "POST",
        body: { name },
      });
      router.push(`/families/${family.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const family = await api<Family>("/families/join", {
        method: "POST",
        body: { invite_code: inviteCode },
      });
      router.push(`/families/${family.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-brand-light px-4 py-10">
      <motion.div
        variants={fadeInUp}
        initial="hidden"
        animate="visible"
        className="w-full max-w-md"
      >
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-brand text-sm font-medium mb-4 hover:underline"
        >
          <ArrowLeft size={16} />
          Tableau de bord
        </Link>
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-black/5">
        <div className="flex mb-6 bg-gray-100 rounded-xl p-1">
          <button
            onClick={() => setMode("create")}
            className={`flex-1 text-base font-medium py-2.5 rounded-lg transition-colors ${
              mode === "create" ? "bg-white text-brand-dark shadow-sm" : "text-gray-600"
            }`}
          >
            Créer
          </button>
          <button
            onClick={() => setMode("join")}
            className={`flex-1 text-base font-medium py-2.5 rounded-lg transition-colors ${
              mode === "join" ? "bg-white text-brand-dark shadow-sm" : "text-gray-600"
            }`}
          >
            Rejoindre
          </button>
        </div>

        {mode === "create" ? (
          <form onSubmit={handleCreate} className="space-y-5">
            <div>
              <label htmlFor="name" className="block text-base font-medium mb-2 text-gray-800">
                Nom de votre famille
              </label>
              <input
                id="name"
                type="text"
                placeholder="Famille Dupont"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base focus:border-brand focus:outline-none"
                required
              />
            </div>
            {error && <p className="text-red-700 text-sm font-medium">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand text-white text-base font-medium py-3.5 rounded-xl hover:bg-brand-dark transition-colors disabled:opacity-50"
            >
              {loading ? "Création..." : "Créer la famille"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleJoin} className="space-y-5">
            <div>
              <label htmlFor="code" className="block text-base font-medium mb-2 text-gray-800">
                Code d&apos;invitation
              </label>
              <input
                id="code"
                type="text"
                placeholder="ABC12345"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base focus:border-brand focus:outline-none uppercase"
                required
              />
            </div>
            {error && <p className="text-red-700 text-sm font-medium">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand text-white text-base font-medium py-3.5 rounded-xl hover:bg-brand-dark transition-colors disabled:opacity-50"
            >
              {loading ? "Connexion..." : "Rejoindre la famille"}
            </button>
          </form>
        )}
        </div>
      </motion.div>
    </main>
  );
}