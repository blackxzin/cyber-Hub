'use client';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, type ApiUser } from './api';

interface AuthCtx {
  user: ApiUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>(null as unknown as AuthCtx);
export const useAuth = () => useContext(Ctx);

// AuthProvider: mantém a sessão do usuário (cookie httpOnly da API).
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ user: ApiUser | null }>('/users/me')
      .then((d) => setUser(d.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const d = await api<{ user: ApiUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setUser(d.user);
  }

  async function register(email: string, password: string, name: string) {
    const d = await api<{ user: ApiUser }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
    setUser(d.user);
  }

  async function logout() {
    await api('/auth/logout', { method: 'POST' }).catch(() => {});
    setUser(null);
  }

  return <Ctx.Provider value={{ user, loading, login, register, logout }}>{children}</Ctx.Provider>;
}