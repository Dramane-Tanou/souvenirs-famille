"use client";

import { useState, FormEvent } from "react";
import { Smartphone } from "lucide-react";
import { motion } from "framer-motion";
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";
import fr from "react-phone-number-input/locale/fr.json";
import "react-phone-number-input/style.css";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

interface RequestCodeResponse {
  message: string;
  debug_code?: string;
}

interface VerifyResponse {
  user: { id: number; name: string; email: string; birth_date: string | null; avatar_path: string | null };
  token: string;
}

export function PhoneAuthForm() {
  const { setSession } = useAuth();
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState<string | undefined>(undefined);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [isNewPhone, setIsNewPhone] = useState(false);
  const [debugCode, setDebugCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
        body: { phone, code, name: name || undefined },
      });
      setSession(res.user, res.token);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 422 && !name) {
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
        <div>
          <label htmlFor="phone-name" className="block text-base font-medium mb-2 text-gray-800">
            Ton nom (nouveau numéro)
          </label>
          <input
            id="phone-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base focus:border-brand focus:outline-none"
            required
          />
        </div>
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
