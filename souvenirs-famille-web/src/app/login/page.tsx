"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Smartphone, Mail } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/lib/api";
import { fadeInUp } from "@/lib/motion";
import { SocialAuthButtons } from "@/components/SocialAuthButtons";
import { PhoneAuthForm } from "@/components/PhoneAuthForm";

export default function LoginPage() {
  const { login } = useAuth();
  const [method, setMethod] = useState<"email" | "phone">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Une erreur est survenue. Réessaie.");
      }
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
        className="w-full max-w-md bg-white p-8 rounded-2xl shadow-sm border border-black/5"
      >
        <h1 className="text-2xl font-semibold mb-1 text-center text-brand-dark">
          Bon retour !
        </h1>
        <p className="text-center text-gray-600 mb-6 text-base">
          Connectez-vous à votre espace famille.
        </p>

        <SocialAuthButtons />

        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-sm text-gray-400">ou</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        <div className="flex mb-5 bg-gray-100 rounded-xl p-1">
          <button
            type="button"
            onClick={() => setMethod("email")}
            className={`flex-1 flex items-center justify-center gap-1.5 text-sm font-medium py-2.5 rounded-lg transition-colors ${
              method === "email" ? "bg-white text-brand-dark shadow-sm" : "text-gray-600"
            }`}
          >
            <Mail size={15} /> E-mail
          </button>
          <button
            type="button"
            onClick={() => setMethod("phone")}
            className={`flex-1 flex items-center justify-center gap-1.5 text-sm font-medium py-2.5 rounded-lg transition-colors ${
              method === "phone" ? "bg-white text-brand-dark shadow-sm" : "text-gray-600"
            }`}
          >
            <Smartphone size={15} /> Téléphone
          </button>
        </div>

        {method === "phone" ? (
          <PhoneAuthForm />
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-base font-medium mb-2 text-gray-800">
                Adresse e-mail
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base focus:border-brand focus:outline-none"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-base font-medium mb-2 text-gray-800">
                Mot de passe
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
              {loading ? "Connexion..." : "Se connecter"}
            </button>
          </form>
        )}

        <p className="text-base text-center mt-6 text-gray-700">
          Pas encore de compte ?{" "}
          <Link href="/register" className="text-brand font-medium hover:underline">
            Créer un compte
          </Link>
        </p>
      </motion.div>
    </main>
  );
}