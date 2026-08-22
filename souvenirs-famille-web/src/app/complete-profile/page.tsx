"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth, Gender } from "@/context/AuthContext";
import { ApiError } from "@/lib/api";
import { fadeInUp } from "@/lib/motion";

export default function CompleteProfilePage() {
  const { user, updateProfile } = useAuth();
  const router = useRouter();
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState<Gender | "">("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!gender) {
      setError("Le genre est obligatoire.");
      return;
    }
    setLoading(true);
    try {
      await updateProfile(user?.name ?? "", birthDate, gender);
      router.push("/dashboard");
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
        className="w-full max-w-md bg-white p-8 rounded-2xl shadow-sm border border-black/5"
      >
        <h1 className="text-2xl font-semibold mb-1 text-center text-brand-dark">
          Encore une étape
        </h1>
        <p className="text-center text-gray-600 mb-6 text-base">
          Pour finaliser ton compte, indique ta date de naissance et ton genre.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="birth_date" className="block text-base font-medium mb-2 text-gray-800">
              Date de naissance
            </label>
            <input
              id="birth_date"
              type="date"
              value={birthDate}
              max={new Date().toISOString().split("T")[0]}
              onChange={(e) => setBirthDate(e.target.value)}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base focus:border-brand focus:outline-none"
              required
            />
          </div>

          <div>
            <label htmlFor="gender" className="block text-base font-medium mb-2 text-gray-800">
              Genre
            </label>
            <select
              id="gender"
              value={gender}
              onChange={(e) => setGender(e.target.value as Gender | "")}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base focus:border-brand focus:outline-none bg-white"
              required
            >
              <option value="" disabled>
                Sélectionner...
              </option>
              <option value="male">Homme</option>
              <option value="female">Femme</option>
              <option value="other">Autre</option>
            </select>
          </div>

          {error && <p className="text-red-700 text-sm font-medium">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand text-white text-base font-medium py-3.5 rounded-xl hover:bg-brand-dark transition-colors disabled:opacity-50"
          >
            {loading ? "Enregistrement..." : "Continuer"}
          </button>
        </form>
      </motion.div>
    </main>
  );
}
