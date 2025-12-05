'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface User {
  id: number;
  email: string;
  nickname?: string;
  firstName?: string;
  lastName?: string;
  balance?: number;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  refreshBalance: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Загружаем пользователя из localStorage при монтировании
    if (typeof window !== 'undefined') {
      const userData = localStorage.getItem('user');
      if (userData) {
        try {
          const parsedUser = JSON.parse(userData);
          setUser(parsedUser);

          // Загружаем баланс если не загружен
          if (parsedUser.id && parsedUser.balance === undefined) {
            refreshBalance();
          }
        } catch {
          setUser(null);
        }
      }
      setLoading(false);
    }
  }, []);

  const refreshBalance = async () => {
    if (!user?.id) return;

    try {
      const response = await fetch('/api/user/balance');
      const data = await response.json();
      if (data.balance !== undefined) {
        setUser((prev) => (prev ? { ...prev, balance: data.balance } : null));
        // Обновляем также в localStorage
        if (typeof window !== 'undefined') {
          const userData = localStorage.getItem('user');
          if (userData) {
            const parsedUser = JSON.parse(userData);
            parsedUser.balance = data.balance;
            localStorage.setItem('user', JSON.stringify(parsedUser));
          }
        }
      }
    } catch (error) {
      console.error('Failed to refresh balance:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, setUser, refreshBalance }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
