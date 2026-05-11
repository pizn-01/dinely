import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { api } from '../services/api';

export type UserRole = 'super_admin' | 'admin' | 'manager' | 'host' | 'viewer' | 'customer';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  isVip?: boolean;
  restaurantId?: string;
  /** Organization slug for staff/host/manager — used in slug-scoped staff URLs */
  restaurantSlug?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Decode a JWT payload without external libraries.
 * Staff tokens carry `restaurantId`; the persisted `user` JSON may omit it
 * (older clients / API shape), so callers can merge claims on rehydrate.
 */
function decodeJwt(token: string): { exp?: number; sub?: string; restaurantId?: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    const payload = JSON.parse(atob(padded));
    return payload;
  } catch {
    return null;
  }
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ─── Rehydrate on mount ───────────────────────────
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUserStr = localStorage.getItem('user');

    if (storedToken && storedUserStr) {
      try {
        const storedUser = JSON.parse(storedUserStr) as User;

        // Check if token is expired
        const payload = decodeJwt(storedToken);
        if (payload?.exp && payload.exp * 1000 < Date.now()) {
          // Token expired — clear storage
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          return;
        }

        // Merge `restaurantId` from JWT when missing on stored user (staff sessions).
        let userToStore: User = storedUser;
        if (payload?.restaurantId && !storedUser.restaurantId) {
          userToStore = { ...storedUser, restaurantId: payload.restaurantId };
          localStorage.setItem('user', JSON.stringify(userToStore));
        }

        setToken(storedToken);
        setUser(userToStore);
      } catch (err) {
        console.error('Failed to parse stored user', err);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setIsLoading(false);
  }, []);

  // ─── Auto-refresh token when approaching expiry ───
  useEffect(() => {
    if (!token) return;

    const payload = decodeJwt(token);
    if (!payload?.exp) return;

    const expiresAt = payload.exp * 1000;
    const now = Date.now();
    // Refresh 1 day before expiry
    const refreshAt = expiresAt - (24 * 60 * 60 * 1000);
    const delay = Math.max(0, refreshAt - now);

    // If we're already past the refresh window but not expired, refresh immediately
    const timeoutId = setTimeout(async () => {
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const { data } = await api.post('/auth/refresh', { refreshToken });
          if (data.data?.token) {
            localStorage.setItem('token', data.data.token);
            setToken(data.data.token);
            if (data.data.refreshToken) {
              localStorage.setItem('refreshToken', data.data.refreshToken);
            }
          }
        }
      } catch (err) {
        console.error('Token refresh failed:', err);
        // Don't logout — token is still valid until actual expiry
      }
    }, delay);

    return () => clearTimeout(timeoutId);
  }, [token]);

  const login = useCallback((newToken: string, newUser: User) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('refreshToken');
    setToken(null);
    setUser(null);
  }, []);

  const isAuthenticated = !!token && !!user;

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
