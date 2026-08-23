"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { api, setToken, clearToken } from "@/lib/api";

export type Gender = "male" | "female" | "other";

interface User {
  id: number;
  name: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  birth_date: string | null;
  gender: Gender | null;
  avatar_path: string | null;
  is_admin: boolean;
  is_super_admin: boolean;
  is_root_super_admin: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    firstName: string,
    lastName: string,
    email: string,
    password: string,
    passwordConfirmation: string,
    birthDate: string,
    gender: Gender
  ) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (name: string, birthDate: string | null, gender: Gender | null) => Promise<void>;
  setSession: (user: User, token: string) => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    api<User>("/me")
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const data = await api<{ user: User; token: string }>("/login", {
      method: "POST",
      body: { email, password },
    });
    setToken(data.token);
    setUser(data.user);
    router.push("/dashboard");
  }

  async function register(
    firstName: string,
    lastName: string,
    email: string,
    password: string,
    passwordConfirmation: string,
    birthDate: string,
    gender: Gender
  ) {
    const data = await api<{ user: User; token: string }>("/register", {
      method: "POST",
      body: {
        first_name: firstName,
        last_name: lastName,
        email,
        password,
        password_confirmation: passwordConfirmation,
        birth_date: birthDate,
        gender,
      },
    });
    setToken(data.token);
    setUser(data.user);
    router.push("/dashboard");
  }

  async function logout() {
    await api("/logout", { method: "POST" }).catch(() => {});
    clearToken();
    setUser(null);
    router.push("/login");
  }

  async function updateProfile(name: string, birthDate: string | null, gender: Gender | null) {
    const updated = await api<User>("/profile", {
      method: "PUT",
      body: { name, birth_date: birthDate, gender },
    });
    setUser(updated);
  }

  function setSession(newUser: User, token: string) {
    setToken(token);
    setUser(newUser);
    router.push("/dashboard");
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout, updateProfile, setSession, updateUser: setUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth doit être utilisé à l'intérieur d'un AuthProvider");
  return context;
}