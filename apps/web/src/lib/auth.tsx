import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { User } from '@novelas/shared';
import { api, getToken, TOKEN_KEY } from './api';

interface AuthCtx {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (name: string, email: string, password: string) => Promise<User>;
  logout: () => void;
  setUser: (u: User) => void;
}

const Ctx = createContext<AuthCtx>(null as unknown as AuthCtx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(!!getToken());
  const qc = useQueryClient();

  useEffect(() => {
    if (!getToken()) return;
    api.auth
      .me()
      .then((r) => setUser(r.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const onLogout = () => setUser(null);
    window.addEventListener('tnv:logout', onLogout);
    return () => window.removeEventListener('tnv:logout', onLogout);
  }, []);

  const persist = useCallback(
    (token: string, u: User) => {
      try {
        localStorage.setItem(TOKEN_KEY, token);
      } catch {
        /* ignore */
      }
      setUser(u);
      qc.invalidateQueries();
      return u;
    },
    [qc],
  );

  const value: AuthCtx = {
    user,
    loading,
    login: async (email, password) => {
      const r = await api.auth.login(email, password);
      return persist(r.token, r.user);
    },
    register: async (name, email, password) => {
      const r = await api.auth.register(name, email, password);
      return persist(r.token, r.user);
    },
    logout: () => {
      try {
        localStorage.removeItem(TOKEN_KEY);
      } catch {
        /* ignore */
      }
      setUser(null);
      qc.clear();
    },
    setUser,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
