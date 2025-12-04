'use client';

import { ArrowRight, FileText, Gift, Info, MessageCircle, Shield, User } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function Footer() {
  const [user, setUser] = useState<{
    id: number;
    email: string;
    nickname?: string;
    balance?: number;
  } | null>(null);

  // Загружаем пользователя из localStorage только на клиенте после монтирования
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userData = localStorage.getItem('user');
      if (userData) {
        try {
          const parsedUser = JSON.parse(userData);
          setUser(parsedUser);
        } catch {
          setUser(null);
        }
      }
    }
  }, []);

  return (
    <footer className="relative z-10 py-8 sm:py-12 mt-8 sm:mt-12 border-t border-white/10 bg-black/20">
      <div className="container mx-auto px-3 sm:px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 mb-6">
          {/* О сервисе */}
          <div>
            <h3 className="text-white font-bold text-lg mb-3 flex items-center gap-2">
              <Info className="w-5 h-5 text-[#ffd700]" />О сервисе
            </h3>
            <p className="text-[#a8d8ea]/60 text-sm mb-3">
              Создаём персонализированные видео-поздравления от Деда Мороза с помощью искусственного
              интеллекта Sora 2
            </p>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/service/ded-moroz"
                className="text-[#a8d8ea]/60 hover:text-[#ffd700] transition-colors text-sm flex items-center gap-1"
              >
                <Gift className="w-4 h-4" />
                Заказать видео
              </Link>
            </div>
          </div>

          {/* Навигация */}
          <div>
            <h3 className="text-white font-bold text-lg mb-3 flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#ffd700]" />
              Навигация
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/"
                  className="text-[#a8d8ea]/60 hover:text-[#a8d8ea] transition-colors text-sm flex items-center gap-2"
                >
                  <ArrowRight className="w-3 h-3" />
                  Главная
                </Link>
              </li>
              <li>
                <Link
                  href="/service/ded-moroz"
                  className="text-[#a8d8ea]/60 hover:text-[#a8d8ea] transition-colors text-sm flex items-center gap-2"
                >
                  <ArrowRight className="w-3 h-3" />
                  Заказать видео
                </Link>
              </li>
              <li>
                <Link
                  href="/contacts"
                  className="text-[#a8d8ea]/60 hover:text-[#a8d8ea] transition-colors text-sm flex items-center gap-2"
                >
                  <MessageCircle className="w-3 h-3" />
                  Контакты
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-[#a8d8ea]/60 hover:text-[#a8d8ea] transition-colors text-sm flex items-center gap-2"
                >
                  <FileText className="w-3 h-3" />
                  Условия использования
                </Link>
              </li>
            </ul>
          </div>

          {/* Контакты и админка */}
          <div>
            <h3 className="text-white font-bold text-lg mb-3 flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-[#ffd700]" />
              Контакты
            </h3>
            <ul className="space-y-2 mb-4">
              <li>
                <Link
                  href="/contacts"
                  className="text-[#a8d8ea]/60 hover:text-[#a8d8ea] transition-colors text-sm flex items-center gap-2"
                >
                  <MessageCircle className="w-3 h-3" />
                  Связаться с нами
                </Link>
              </li>
              {user && (
                <li>
                  <Link
                    href="/profile"
                    className="text-[#a8d8ea]/60 hover:text-[#a8d8ea] transition-colors text-sm flex items-center gap-2"
                  >
                    <User className="w-3 h-3" />
                    Мой профиль
                  </Link>
                </li>
              )}
              {user?.email?.endsWith('@admin.com') && (
                <li>
                  <Link
                    href="/admin"
                    className="text-[#ffd700]/60 hover:text-[#ffd700] transition-colors text-sm flex items-center gap-2"
                  >
                    <Shield className="w-3 h-3" />
                    Админ-панель
                  </Link>
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Копирайт */}
        <div className="border-t border-white/10 pt-6 text-center">
          <p className="text-[#a8d8ea]/60 text-xs sm:text-sm mb-2">
            Видео создаётся с помощью технологии искусственного интеллекта Sora 2
          </p>
          <p className="text-[#a8d8ea]/60 text-xs sm:text-sm">
            Сделано с ❤️ для волшебных новогодних праздников © 2024-2025
          </p>
        </div>
      </div>
    </footer>
  );
}
