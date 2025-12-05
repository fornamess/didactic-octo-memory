// Client Component для хедера с пользователем (PRF-002)
'use client';

import { Coins, LogIn, User } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface UserHeaderProps {
  initialUser: {
    id: number;
    email: string;
    nickname?: string;
    balance?: number;
  } | null;
}

export default function UserHeader({ initialUser }: UserHeaderProps) {
  const [user, setUser] = useState(initialUser);

  // Обновляем баланс при монтировании если нужно
  useEffect(() => {
    if (user?.id && user.balance === undefined) {
      fetch('/api/user/balance')
        .then((res) => res.json())
        .then((data) => {
          if (data.balance !== undefined) {
            setUser((prev) => (prev ? { ...prev, balance: data.balance } : null));
          }
        })
        .catch(() => {});
    }
  }, [user]);

  return (
    <div className="absolute top-2 right-2 sm:top-4 sm:right-4 flex gap-2 sm:gap-3 z-20">
      {user ? (
        <Link
          href="/profile"
          className="glass px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[#f0f8ff] hover:bg-white/10 transition-colors flex items-center gap-1 sm:gap-2 text-sm sm:text-base"
        >
          <Coins className="w-4 h-4 sm:w-5 sm:h-5 text-[#ffd700]" />
          <span className="font-bold text-[#ffd700] hidden sm:inline">{user.balance || 0}</span>
          <span className="font-bold text-[#ffd700] sm:hidden">{user.balance || 0}</span>
          <User className="w-4 h-4 sm:w-5 sm:h-5 ml-1 sm:ml-2" />
          <span className="hidden sm:inline">{user.nickname || 'Профиль'}</span>
        </Link>
      ) : (
        <Link
          href="/login"
          className="btn-magic px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-white flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base"
        >
          <LogIn className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="hidden sm:inline">Войти</span>
          <span className="sm:hidden">Вход</span>
        </Link>
      )}
    </div>
  );
}
