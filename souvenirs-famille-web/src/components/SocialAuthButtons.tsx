"use client";

import { motion } from "framer-motion";
import { API_URL } from "@/lib/api";
import { GoogleIcon, FacebookIcon, AppleIcon } from "@/components/icons/BrandIcons";

export function SocialAuthButtons() {
  return (
    <div className="space-y-2.5">
      <motion.a
        href={`${API_URL}/auth/google/redirect`}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-200 rounded-xl px-4 py-3 text-base font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <GoogleIcon size={20} />
        Continuer avec Google
      </motion.a>

      <motion.a
        href={`${API_URL}/auth/facebook/redirect`}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        className="w-full flex items-center justify-center gap-3 bg-[#1877F2] rounded-xl px-4 py-3 text-base font-medium text-white hover:bg-[#1565D8] transition-colors"
      >
        <FacebookIcon size={20} />
        Continuer avec Facebook
      </motion.a>

      <motion.a
        href={`${API_URL}/auth/apple/redirect`}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        className="w-full flex items-center justify-center gap-3 bg-black rounded-xl px-4 py-3 text-base font-medium text-white hover:bg-gray-900 transition-colors"
      >
        <AppleIcon size={20} />
        Continuer avec Apple
      </motion.a>
    </div>
  );
}
