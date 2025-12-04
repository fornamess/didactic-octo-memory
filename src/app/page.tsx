'use client';

import ExampleVideoPlayer from '@/components/ExampleVideoPlayer';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Coins,
  FileText,
  Gift,
  Heart,
  Info,
  LogIn,
  MessageCircle,
  Shield,
  Sparkles,
  Star,
  TreePine,
  User,
} from 'lucide-react';
import Link from 'next/link';
import { Suspense, lazy, useEffect, useState } from 'react';

// Lazy loading для компонентов
const Snowfall = lazy(() => import('@/components/Snowfall'));

export default function Home() {
  // Инициализируем пользователя синхронно из localStorage (не блокирует рендеринг)
  const [user, setUser] = useState<{
    id: number;
    email: string;
    nickname?: string;
    balance?: number;
  } | null>(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      const userData = localStorage.getItem('user');
      if (token && userData) {
        try {
          return JSON.parse(userData);
        } catch {
          return null;
        }
      }
    }
    return null;
  });

  // Обновляем баланс асинхронно после рендера (не блокирует)
  useEffect(() => {
    if (user?.id && typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        // Загружаем баланс с небольшой задержкой для приоритизации критического контента
        const timeoutId = setTimeout(() => {
          fetch('/api/user/balance', {
            headers: { Authorization: `Bearer ${token}` },
          })
            .then((res) => res.json())
            .then((data) => {
              if (data.balance !== undefined) {
                setUser((prev) => {
                  // Обновляем только если баланс действительно изменился
                  if (prev && prev.balance !== data.balance) {
                    return { ...prev, balance: data.balance };
                  }
                  return prev;
                });
              }
            })
            .catch(() => {});
        }, 200);

        return () => clearTimeout(timeoutId);
      }
    }
  }, [user?.id]); // Зависим только от ID пользователя, а не от всего объекта

  return (
    <main className="min-h-screen relative overflow-hidden">
      <Suspense fallback={null}>
        <Snowfall />
      </Suspense>

      {/* Декоративные звёзды */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            className="star"
            style={{
              left: `${(i * 3.3) % 100}%`,
              top: `${(i * 5) % 80}%`,
              animationDelay: `${i * 0.15}s`,
            }}
          />
        ))}
      </div>

      {/* Хедер */}
      <header className="relative z-10 pt-4 sm:pt-8 pb-4">
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

        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, type: 'spring' }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="inline-block mb-2 sm:mb-4"
          >
            <span className="text-5xl sm:text-7xl drop-shadow-lg">🎅</span>
          </motion.div>

          <h1 className="text-2xl sm:text-4xl md:text-6xl font-bold mb-2 sm:mb-3 font-display px-4">
            <span className="text-gradient">Волшебные Видео-Поздравления</span>
          </h1>
          <h2 className="text-base sm:text-xl md:text-2xl text-[#a8d8ea] font-medium px-4">
            Персонализированные видео от Деда Мороза для вашего ребёнка
          </h2>

          <motion.div
            className="flex justify-center gap-4 mt-4"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5 }}
          >
            <Sparkles className="text-[#ffd700] w-6 h-6 animate-pulse" />
            <TreePine className="text-[#0d4f2b] w-6 h-6" />
            <Gift className="text-[#c41e3a] w-6 h-6" />
            <Star className="text-[#ffd700] w-6 h-6 animate-pulse" />
          </motion.div>
        </motion.div>
      </header>

      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 relative z-10">
        {/* Главная услуга */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="max-w-4xl mx-auto"
        >
          <div className="card-festive rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 shadow-2xl mb-6 sm:mb-8">
            <div className="grid md:grid-cols-2 gap-4 sm:gap-8 items-center">
              {/* Превью видео - загружается асинхронно */}
              <div className="order-1 md:order-2">
                <Suspense
                  fallback={
                    <div className="relative aspect-video rounded-xl sm:rounded-2xl overflow-hidden bg-gradient-to-br from-[#1a3a5c] to-[#0c1929] flex items-center justify-center">
                      <div className="text-center">
                        <span className="text-4xl sm:text-6xl mb-2 sm:mb-4 block">🎬</span>
                        <p className="text-sm sm:text-base text-[#a8d8ea]">Загрузка...</p>
                      </div>
                    </div>
                  }
                >
                  <ExampleVideoPlayer />
                </Suspense>
              </div>

              {/* Информация */}
              <div className="order-2 md:order-1">
                <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-3 sm:mb-4 font-display">
                  Видео от Деда Мороза
                </h3>

                <p className="text-sm sm:text-base text-[#a8d8ea] mb-3 sm:mb-4">
                  Вы получите видео длиной <strong>2 минуты</strong>, в котором Дед Мороз обратится
                  к вашему ребёнку по имени, покажет загруженные вами фотографии и поздравит с Новым
                  Годом!
                </p>

                <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                  <Gift className="w-6 h-6 sm:w-8 sm:h-8 text-[#0d4f2b]" />
                  <span className="text-2xl sm:text-3xl font-bold text-[#0d4f2b]">БЕСПЛАТНО</span>
                  <span className="text-xs sm:text-sm bg-[#c41e3a] text-white px-2 py-1 rounded-lg">
                    Акция!
                  </span>
                </div>

                <Link
                  href="/service/ded-moroz"
                  className="btn-magic px-6 sm:px-8 py-3 sm:py-4 rounded-xl text-base sm:text-lg font-bold text-white flex items-center justify-center gap-2 sm:gap-3 w-full md:w-auto"
                >
                  <span>Заказать</span>
                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                </Link>
              </div>
            </div>
          </div>

          {/* Преимущества */}
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="glass-dark p-4 sm:p-6 rounded-xl sm:rounded-2xl text-center"
            >
              <Sparkles className="w-10 h-10 sm:w-12 sm:h-12 text-[#ffd700] mx-auto mb-3 sm:mb-4" />
              <h4 className="text-base sm:text-lg font-bold text-white mb-2">
                Реалистичное AI видео
              </h4>
              <p className="text-[#a8d8ea]/80 text-xs sm:text-sm">
                Создано с помощью передовой технологии Sora 2
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="glass-dark p-4 sm:p-6 rounded-xl sm:rounded-2xl text-center"
            >
              <Heart className="w-10 h-10 sm:w-12 sm:h-12 text-[#c41e3a] mx-auto mb-3 sm:mb-4" />
              <h4 className="text-base sm:text-lg font-bold text-white mb-2">
                Полная персонализация
              </h4>
              <p className="text-[#a8d8ea]/80 text-xs sm:text-sm">
                Имя ребёнка и ваши фотографии в видео
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="glass-dark p-4 sm:p-6 rounded-xl sm:rounded-2xl text-center sm:col-span-2 md:col-span-1"
            >
              <Gift className="w-10 h-10 sm:w-12 sm:h-12 text-[#0d4f2b] mx-auto mb-3 sm:mb-4" />
              <h4 className="text-base sm:text-lg font-bold text-white mb-2">Идеальный подарок</h4>
              <p className="text-[#a8d8ea]/80 text-xs sm:text-sm">
                Скачайте и покажите ребёнку под ёлкой
              </p>
            </motion.div>
          </div>

          {/* Как это работает */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="card-festive rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8"
          >
            <h3 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6 text-center font-display">
              Как это работает?
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              <div className="text-center">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#ffd700]/20 flex items-center justify-center mx-auto mb-2 sm:mb-3">
                  <span className="text-xl sm:text-2xl font-bold text-[#ffd700]">1</span>
                </div>
                <h4 className="text-sm sm:text-base font-semibold text-white mb-1">
                  Зарегистрируйтесь
                </h4>
                <p className="text-[#a8d8ea]/60 text-xs sm:text-sm">Создайте аккаунт за минуту</p>
              </div>

              <div className="text-center">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#ffd700]/20 flex items-center justify-center mx-auto mb-2 sm:mb-3">
                  <span className="text-xl sm:text-2xl font-bold text-[#ffd700]">2</span>
                </div>
                <h4 className="text-sm sm:text-base font-semibold text-white mb-1">
                  Выберите услугу
                </h4>
                <p className="text-[#a8d8ea]/60 text-xs sm:text-sm">Сейчас видео бесплатно!</p>
              </div>

              <div className="text-center">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#ffd700]/20 flex items-center justify-center mx-auto mb-2 sm:mb-3">
                  <span className="text-xl sm:text-2xl font-bold text-[#ffd700]">3</span>
                </div>
                <h4 className="text-sm sm:text-base font-semibold text-white mb-1">
                  Заполните форму
                </h4>
                <p className="text-[#a8d8ea]/60 text-xs sm:text-sm">Имя ребёнка и 2 фотографии</p>
              </div>

              <div className="text-center">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#ffd700]/20 flex items-center justify-center mx-auto mb-2 sm:mb-3">
                  <span className="text-xl sm:text-2xl font-bold text-[#ffd700]">4</span>
                </div>
                <h4 className="text-sm sm:text-base font-semibold text-white mb-1">
                  Получите видео
                </h4>
                <p className="text-[#a8d8ea]/60 text-xs sm:text-sm">Скачайте из личного кабинета</p>
              </div>
            </div>

            <div className="text-center mt-6 sm:mt-8">
              <Link
                href={user ? '/service/ded-moroz' : '/login'}
                className="btn-magic px-6 sm:px-10 py-3 sm:py-4 rounded-xl text-base sm:text-lg font-bold text-white inline-flex items-center gap-2 sm:gap-3"
              >
                <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
                {user ? 'Заказать видео' : 'Начать сейчас'}
              </Link>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Декоративные ёлки */}
      <div className="fixed bottom-0 left-0 text-6xl md:text-8xl opacity-30 pointer-events-none">
        🌲
      </div>
      <div className="fixed bottom-0 right-0 text-6xl md:text-8xl opacity-30 pointer-events-none">
        🌲
      </div>
    </main>
  );
}
