"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { api, setToken, ApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

interface User {
  id: number;
  name: string;
  email: string;
  birth_date: string | null;
  gender: "male" | "female" | "other" | null;
  avatar_path: string | null;
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center bg-brand-light px-4">
          <p className="text-base text-gray-500">Chargement...</p>
        </main>
      }
    >
      <AuthCallbackInner />
    </Suspense>
  );
}

function AuthCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setSession } = useAuth();
  const [fetchError, setFetchError] = useState<string | null>(null);

  const token = searchParams.get("token");
  const providerError = searchParams.get("error");

  useEffect(() => {
    if (providerError || !token) return;

    setToken(token);
    api<User>("/me")
      .then((user) => setSession(user, token))
      .catch((err) => {
        setFetchError(err instanceof ApiError ? err.message : "Une erreur est survenue.");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, providerError]);

  const error = providerError || (!token ? "Connexion incomplète : aucun jeton reçu." : fetchError);

  return (
    <main className="min-h-screen flex items-center justify-center bg-brand-light px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="text-center max-w-sm"
      >
        {error ? (
          <>
            <p className="text-lg font-medium text-red-700 mb-2">Connexion impossible</p>
            <p className="text-base text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => router.push("/login")}
              className="bg-brand text-white text-base font-medium px-6 py-3 rounded-xl hover:bg-brand-dark transition-colors"
            >
              Retour à la connexion
            </button>
          </>
        ) : (
          <>
            <p className="text-2xl font-semibold text-brand-dark mb-2">Souvenirs Famille</p>
            <p className="text-base text-gray-500">Connexion en cours...</p>
          </>
        )}
      </motion.div>
    </main>
  );
}
