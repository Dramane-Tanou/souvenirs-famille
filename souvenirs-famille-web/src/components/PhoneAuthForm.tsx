"use client";

import { useState, useEffect, FormEvent } from "react";
import { Smartphone } from "lucide-react";
import { motion } from "framer-motion";
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";
import fr from "react-phone-number-input/locale/fr.json";
import "react-phone-number-input/style.css";
import { api, ApiError } from "@/lib/api";
import { useAuth, Gender } from "@/context/AuthContext";
import { maxBirthDateForMinAge, MIN_ACCOUNT_AGE_YEARS } from "@/lib/date";
import { COUNTRIES } from "@/lib/countries";

interface RequestCodeResponse {
  message: string;
  debug_code?: string;
}

interface VerifyResponse {
  user: {
    id: number;
    name: string;
    first_name: string | null;
    last_name: string | null;
    email: string;
    birth_date: string | null;
    gender: Gender | null;
    country: string | null;
    city: string | null;
    avatar_path: string | null;
    is_admin: boolean;
    is_super_admin: boolean;
    is_root_super_admin: boolean;
  };
  token: string;
}

export function PhoneAuthForm() {
  const { setSession } = useAuth();
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState<string | undefined>(undefined);
  const [code, setCode] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState<Gender | "">("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [isNewPhone, setIsNewPhone] = useState(false);
  const [debugCode, setDebugCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api<{ country: string }>("/geo/currency")
      .then((geo) => setCountry((prev) => prev || geo.country))
      .catch(() => {});
  }, []);

  async function handleRequestCode(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api<RequestCodeResponse>("/auth/phone/request-code", {
        method: "POST",
        body: { phone },
      });
      setDebugCode(res.debug_code ?? null);
      setStep("code");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api<VerifyResponse>("/auth/phone/verify", {
        method: "POST",
        body: {
          phone,
          code,
          first_name: firstName || undefined,
          last_name: lastName || undefined,
          birth_date: birthDate || undefined,
          gender: gender || undefined,
          country: country || undefined,
          city: city || undefined,
        },
      });
      setSession(res.user, res.token);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 422 && !firstName) {
          setIsNewPhone(true);
        }
        setError(err.message);
      } else {
        setError("Une erreur est survenue.");
      }
    } finally {
      setLoading(false);
    }
  }

  if (step === "phone") {
    return (
      <motion.form
        onSubmit={handleRequestCode}
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        className="space-y-4"
      >
        <div>
          <label htmlFor="phone" className="block text-base font-medium mb-2 text-gray-800">
            Numéro de téléphone
          </label>
          <PhoneInput
            id="phone"
            international
            defaultCountry="CH"
            labels={fr}
            value={phone}
            onChange={setPhone}
            placeholder="07 01 02 03 04"
            className="souvenirs-phone-input w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base focus-within:border-brand"
          />
        </div>
        {error && <p className="text-red-700 text-sm font-medium">{error}</p>}
        <button
          type="submit"
          disabled={loading || !phone || !isValidPhoneNumber(phone)}
          className="w-full flex items-center justify-center gap-2 bg-brand text-white text-base font-medium py-3.5 rounded-xl hover:bg-brand-dark transition-colors disabled:opacity-50"
        >
          <Smartphone size={18} />
          {loading ? "Envoi..." : "Envoyer le code"}
        </button>
      </motion.form>
    );
  }

  return (
    <motion.form
      onSubmit={handleVerify}
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      className="space-y-4"
    >
      <p className="text-sm text-gray-500">
        Code envoyé au {phone}.{" "}
        <button type="button" onClick={() => setStep("phone")} className="text-brand font-medium hover:underline">
          Changer de numéro
        </button>
      </p>
      {debugCode && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
          Mode test : le code est <strong>{debugCode}</strong>.
        </p>
      )}
      <div>
        <label htmlFor="code" className="block text-base font-medium mb-2 text-gray-800">
          Code reçu
        </label>
        <input
          id="code"
          type="text"
          inputMode="numeric"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base focus:border-brand focus:outline-none tracking-widest"
          required
        />
      </div>
      {isNewPhone && (
        <>
          <div>
            <label htmlFor="phone-firstname" className="block text-base font-medium mb-2 text-gray-800">
              Prénom (nouveau numéro)
            </label>
            <input
              id="phone-firstname"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base focus:border-brand focus:outline-none"
              required
            />
          </div>
          <div>
            <label htmlFor="phone-lastname" className="block text-base font-medium mb-2 text-gray-800">
              Nom
            </label>
            <input
              id="phone-lastname"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base focus:border-brand focus:outline-none"
              required
            />
          </div>
          <div>
            <label htmlFor="phone-birthdate" className="block text-base font-medium mb-2 text-gray-800">
              Date de naissance
            </label>
            <input
              id="phone-birthdate"
              type="date"
              value={birthDate}
              max={maxBirthDateForMinAge()}
              onChange={(e) => setBirthDate(e.target.value)}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base focus:border-brand focus:outline-none"
              required
            />
            <p className="text-xs text-gray-500 mt-1">Tu dois avoir au moins {MIN_ACCOUNT_AGE_YEARS} ans.</p>
          </div>
          <div>
            <label htmlFor="phone-gender" className="block text-base font-medium mb-2 text-gray-800">
              Genre
            </label>
            <select
              id="phone-gender"
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
          <div>
            <label htmlFor="phone-country" className="block text-base font-medium mb-2 text-gray-800">
              Pays
            </label>
            <select
              id="phone-country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base focus:border-brand focus:outline-none bg-white"
              required
            >
              <option value="" disabled>
                Sélectionner...
              </option>
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="phone-city" className="block text-base font-medium mb-2 text-gray-800">
              Ville
            </label>
            <input
              id="phone-city"
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base focus:border-brand focus:outline-none"
              required
            />
          </div>
        </>
      )}
      {error && <p className="text-red-700 text-sm font-medium">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-brand text-white text-base font-medium py-3.5 rounded-xl hover:bg-brand-dark transition-colors disabled:opacity-50"
      >
        {loading ? "Vérification..." : "Vérifier"}
      </button>
    </motion.form>
  );
}
