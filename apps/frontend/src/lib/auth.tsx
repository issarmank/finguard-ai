"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export interface UserInfo {
  id: string;
  email: string;
  role: string;
  tenant_id: string;
}

interface AuthState {
  token: string | null;
  user: UserInfo | null;
  login: (token: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthState>({
  token: null,
  user: null,
  login: () => {},
  logout: () => {},
  isAuthenticated: false,
});

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserInfo | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("fg_token");
    if (stored) setToken(stored);
  }, []);

  useEffect(() => {
    if (!token) { setUser(null); return; }
    fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data) setUser(data); })
      .catch(() => {});
  }, [token]);

  const login = useCallback((t: string) => {
    localStorage.setItem("fg_token", t);
    setToken(t);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("fg_token");
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ token, user, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("fg_token");
}
