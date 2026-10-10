import React, { createContext, useContext, useEffect, useState } from 'react';
import { storage } from '@/lib/storage';
import { api, setUnauthorizedHandler } from '@/lib/api';
import type { AuthUser, LoginResponse } from '@/lib/types';

interface RegisterPayload {
  businessName: string;
  name: string;
  email: string;
  password: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session on app launch
  useEffect(() => {
    (async () => {
      try {
        const stored = await storage.getItem('jwt');
        const storedUser = await storage.getItem('user');
        // A JWT has three dot-separated parts; anything else (e.g. "undefined") is a broken session
        if (stored && stored.split('.').length === 3 && storedUser) {
          setToken(stored);
          setUser(JSON.parse(storedUser) as AuthUser);
        } else if (stored || storedUser) {
          await storage.removeItem('jwt');
          await storage.removeItem('user');
        }
      } catch {
        // ignore — will land on login
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    return () => setUnauthorizedHandler(null);
  }, []);

  async function persist(data: LoginResponse) {
    if (!data.accessToken) throw new Error('Login response did not include an access token');
    await storage.setItem('jwt', data.accessToken);
    await storage.setItem('user', JSON.stringify(data.user));
    setToken(data.accessToken);
    setUser(data.user);
  }

  async function login(identifier: string, password: string) {
    const { data } = await api.post<LoginResponse>('/auth/login', {
      identifier,
      password,
    });
    await persist(data);
  }

  async function register(payload: RegisterPayload) {
    const { data } = await api.post<LoginResponse>('/auth/register', payload);
    await persist(data);
  }

  async function logout() {
    await storage.removeItem('jwt');
    await storage.removeItem('user');
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
