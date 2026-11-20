import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { AuthResponse, ShopProfile, UserProfile } from '../types';
import { authApi, getStoredToken, setStoredToken } from '../services/api';

interface AuthContextValue {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setSession: (auth: AuthResponse) => void;
  updateShopInSession: (shop: ShopProfile) => void;
  refreshUser: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const profile = await authApi.me();
      setUser(profile);
    } catch {
      setStoredToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  const setSession = useCallback((auth: AuthResponse) => {
    setStoredToken(auth.token);
    setUser(auth.user);
  }, []);

  const updateShopInSession = useCallback((shop: ShopProfile) => {
    setUser((prev) => (prev ? { ...prev, shop } : prev));
  }, []);

  const logout = useCallback(() => {
    setStoredToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: Boolean(user),
        setSession,
        updateShopInSession,
        refreshUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}

