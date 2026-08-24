"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Smartphone, Mail } from "lucide-react";
import { useAuth, Gender } from "@/context/AuthContext";
import { ApiError } from "@/lib/api";
import { maxBirthDateForMinAge, MIN_ACCOUNT_AGE_YEARS } from "@/lib/date";
import { fadeInUp } from "@/lib/motion";
import { SocialAuthButtons } from "@/components/SocialAuthButtons";
import { PhoneAuthForm } from "@/components/PhoneAuthForm";

export default function RegisterPage() {
  const { register } = useAuth();
  const [method, setMethod] = useState<"email" | "phone">("email");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState<Gender | "">("");
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrors({});
    if (!gender) {
      setErrors({ gender: ["Le genre est obligatoire."] });
      return;
    }
    setLoading(true);
    try {
      await register(firstName, lastName, email, password, passwordConfirmation, birthDate, gender);
    } catch (err) {
      if (err instanceof ApiError && err.errors) {
        setErrors(err.errors);
      } else {
        setErrors({ general: ["Une erreur est survenue. Réessaie."] });
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
          Créer votre espace famille
        </h1>
        <p className="text-center text-gray-600 mb-6 text-base">
          Gardez vos souvenirs, chaque jour.
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="first_name" className="block text-base font-medium mb-2 text-gray-800">
                Prénom
              </label>
              <input
                id="first_name"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base focus:border-brand focus:outline-none"
                required
              />
              {errors.first_name && (
                <p className="text-red-700 text-sm mt-1 font-medium">{errors.first_name[0]}</p>
              )}
            </div>
            <div>
              <label htmlFor="last_name" className="block text-base font-medium mb-2 text-gray-800">
                Nom
              </label>
              <input
                id="last_name"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base focus:border-brand focus:outline-none"
                required
              />
              {errors.last_name && (
                <p className="text-red-700 text-sm mt-1 font-medium">{errors.last_name[0]}</p>
              )}
            </div>
          </div>

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
            {errors.email && (
              <p className="text-red-700 text-sm mt-1 font-medium">{errors.email[0]}</p>
            )}
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
            {errors.password && (
              <p className="text-red-700 text-sm mt-1 font-medium">{errors.password[0]}</p>
            )}
          </div>

          <div>
            <label htmlFor="password_confirmation" className="block text-base font-medium mb-2 text-gray-800">
              Confirmez le mot de passe
            </label>
            <input
              id="password_confirmation"
              type="password"
              value={passwordConfirmation}
              onChange={(e) => setPasswordConfirmation(e.target.value)}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base focus:border-brand focus:outline-none"
              required
            />
          </div>

          <div>
            <label htmlFor="birth_date" className="block text-base font-medium mb-2 text-gray-800">
              Date de naissance
            </label>
            <input
              id="birth_date"
              type="date"
              value={birthDate}
              max={maxBirthDateForMinAge()}
              onChange={(e) => setBirthDate(e.target.value)}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base focus:border-brand focus:outline-none"
              required
            />
            <p className="text-xs text-gray-500 mt-1">Tu dois avoir au moins {MIN_ACCOUNT_AGE_YEARS} ans.</p>
            {errors.birth_date && (
              <p className="text-red-700 text-sm mt-1 font-medium">{errors.birth_date[0]}</p>
            )}
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
            {errors.gender && (
              <p className="text-red-700 text-sm mt-1 font-medium">{errors.gender[0]}</p>
            )}
          </div>

          {errors.general && (
            <p className="text-red-700 text-sm font-medium">{errors.general[0]}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand text-white text-base font-medium py-3.5 rounded-xl hover:bg-brand-dark transition-colors disabled:opacity-50"
          >
            {loading ? "Création en cours..." : "Créer mon compte"}
          </button>

          <p className="text-xs text-center text-gray-500">
            En créant un compte, tu acceptes nos{" "}
            <Link href="/terms" className="text-brand hover:underline">
              Conditions Générales d&apos;Utilisation
            </Link>{" "}
            et notre{" "}
            <Link href="/privacy" className="text-brand hover:underline">
              Politique de Confidentialité
            </Link>
            .
          </p>
        </form>
        )}

        <p className="text-base text-center mt-6 text-gray-700">
          Déjà un compte ?{" "}
          <Link href="/login" className="text-brand font-medium hover:underline">
            Se connecter
          </Link>
        </p>
      </motion.div>
    </main>
  );
}