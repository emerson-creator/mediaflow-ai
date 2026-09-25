import { useState, type ReactNode } from "react";
import * as authApi from "../api/auth";
import type { User } from "../types";
import { AuthContext } from "./auth-context";

function getStoredUser(): User | null {
  const storedUser = localStorage.getItem("user");
  if (!storedUser) return null;

  try {
    return JSON.parse(storedUser) as User;
  } catch {
    localStorage.removeItem("user");
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(getStoredUser);
  const [accessToken, setAccessToken] = useState<string | null>(() =>
    localStorage.getItem("accessToken"),
  );
  const isLoading = false;

  function persistSession(token: string, user: User) {
    localStorage.setItem("accessToken", token);
    localStorage.setItem("user", JSON.stringify(user));
    setAccessToken(token);
    setUser(user);
  }

  async function login(email: string, password: string) {
    const res = await authApi.login(email, password);
    persistSession(res.accessToken, res.user);
  }

  async function register(email: string, password: string) {
    const res = await authApi.register(email, password);
    persistSession(res.accessToken, res.user);
  }

  function logout() {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    setAccessToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{ user, accessToken, isLoading, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}
