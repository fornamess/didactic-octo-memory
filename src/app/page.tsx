'use client';

import { motion } from 'framer-motion';
import {
  ArrowRight,
  Coins,
  Gift,
  Heart,
  LogIn,
  Shield,
  Sparkles,
  Star,
  TreePine,
  User,
} from 'lucide-react';
import Link from 'next/link';
import { lazy, useEffect, useRef, useState, Suspense } from 'react';

// Lazy loading для компонентов
const Snowfall = lazy(() => import('@/components/Snowfall'));

// Компонент для отображения примера видео
function ExampleVideoPlayer() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showPlaceholder, setShowPlaceholder] = useState(true);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Загружаем случайное видео при монтировании
  useEffect(() => {
    const loadRandomVideo = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/videos/example/random');
        const data = await response.json();
        if (data.success && data.videoUrl) {
          setVideoUrl(data.videoUrl);
        } else {
          // Fallback на дефолтное видео
          setVideoUrl('/api/videos/stream/final/final_2.mp4');
        }
      } catch (error) {
        console.error('Error loading random example video:', error);
        // Fallback на дефолтное видео
        setVideoUrl('/api/videos/stream/final/final_2.mp4');
      } finally {
        setIsLoading(false);
      }
    };

    loadRandomVideo();
  }, []);

  const handleVideoLoaded = () => {
    setShowPlaceholder(false);
    setIsLoading(false);
  };

  const handleVideoError = () => {
    setShowPlaceholder(true);
    setIsLoading(false);
    // Пробуем загрузить fallback видео
    if (videoUrl !== '/api/videos/stream/final/final_2.mp4') {
      setVideoUrl('/api/videos/stream/final/final_2.mp4');
    }
  };

  return (
    <div className="relative aspect-video rounded-2xl overflow-hidden bg-black group">
      {/* Видео */}
      {videoUrl && !isLoading && (
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          onLoadedData={handleVideoLoaded}
          onError={handleVideoError}
          style={{ display: showPlaceholder ? 'none' : 'block' }}
          key={videoUrl} // Ключ для перезагрузки видео при смене URL
        >
          <source src={videoUrl} type="video/mp4" />
          <source src={videoUrl.replace('/api/videos/stream/', '/videos/')} type="video/mp4" />
        </video>
      )}

      {/* Заглушка если видео не загрузилось или загружается */}
      {(showPlaceholder || isLoading) && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#1a3a5c] to-[#0c1929]">
          <div className="text-center">
            <span className="text-6xl mb-4 block">🎬</span>
            <p className="text-[#a8d8ea]">Пример готового видео</p>
            <p className="text-[#a8d8ea]/60 text-sm mt-2">
              {isLoading ? 'Загрузка...' : 'Персонализированное видео от Деда Мороза'}
            </p>
          </div>
        </div>
      )}

      {/* Градиент поверх видео */}
      {!showPlaceholder && (
        <>
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
          <div className="absolute bottom-4 left-4 right-4 pointer-events-none">
            <p className="text-white text-sm font-semibold drop-shadow-lg">Пример готового видео</p>
          </div>
        </>
      )}
    </div>
  );
}

export default function Home() {
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
      <header className="relative z-10 pt-8 pb-4">
        <div className="absolute top-4 right-4 flex gap-3 z-20">
          {user ? (
            <Link
              href="/profile"
              className="glass px-4 py-2 rounded-xl text-[#f0f8ff] hover:bg-white/10 transition-colors flex items-center gap-2"
            >
              <Coins className="w-5 h-5 text-[#ffd700]" />
              <span className="font-bold text-[#ffd700]">{user.balance || 0}</span>
              <User className="w-5 h-5 ml-2" />
              {user.nickname || 'Профиль'}
            </Link>
          ) : (
            <Link
              href="/login"
              className="btn-magic px-4 py-2 rounded-xl text-white flex items-center gap-2"
            >
              <LogIn className="w-5 h-5" />
              Войти
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
            className="inline-block mb-4"
          >
            <span className="text-7xl drop-shadow-lg">🎅</span>
          </motion.div>

          <h1 className="text-4xl md:text-6xl font-bold mb-3 font-display">
            <span className="text-gradient">Волшебные Видео-Поздравления</span>
          </h1>
          <h2 className="text-xl md:text-2xl text-[#a8d8ea] font-medium">
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

      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Главная услуга */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="max-w-4xl mx-auto"
        >
          <div className="card-festive rounded-3xl p-6 md:p-8 shadow-2xl mb-8">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              {/* Превью видео */}
              <ExampleVideoPlayer />

              {/* Информация */}
              <div>
                <h3 className="text-2xl md:text-3xl font-bold text-white mb-4 font-display">
                  Видео от Деда Мороза
                </h3>

                <p className="text-[#a8d8ea] mb-4">
                  Вы получите видео длиной <strong>2 минуты</strong>, в котором Дед Мороз обратится
                  к вашему ребёнку по имени, покажет загруженные вами фотографии и поздравит с Новым
                  Годом!
                </p>

                <div className="flex items-center gap-3 mb-6">
                  <Gift className="w-8 h-8 text-[#0d4f2b]" />
                  <span className="text-3xl font-bold text-[#0d4f2b]">БЕСПЛАТНО</span>
                  <span className="text-sm bg-[#c41e3a] text-white px-2 py-1 rounded-lg">
                    Акция!
                  </span>
                </div>

                <Link
                  href="/service/ded-moroz"
                  className="btn-magic px-8 py-4 rounded-xl text-lg font-bold text-white flex items-center justify-center gap-3 w-full md:w-auto"
                >
                  <span>Заказать</span>
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
            </div>
          </div>

          {/* Преимущества */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="glass-dark p-6 rounded-2xl text-center"
            >
              <Sparkles className="w-12 h-12 text-[#ffd700] mx-auto mb-4" />
              <h4 className="text-lg font-bold text-white mb-2">Реалистичное AI видео</h4>
              <p className="text-[#a8d8ea]/80 text-sm">
                Создано с помощью передовой технологии Sora 2
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="glass-dark p-6 rounded-2xl text-center"
            >
              <Heart className="w-12 h-12 text-[#c41e3a] mx-auto mb-4" />
              <h4 className="text-lg font-bold text-white mb-2">Полная персонализация</h4>
              <p className="text-[#a8d8ea]/80 text-sm">Имя ребёнка и ваши фотографии в видео</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="glass-dark p-6 rounded-2xl text-center"
            >
              <Gift className="w-12 h-12 text-[#0d4f2b] mx-auto mb-4" />
              <h4 className="text-lg font-bold text-white mb-2">Идеальный подарок</h4>
              <p className="text-[#a8d8ea]/80 text-sm">Скачайте и покажите ребёнку под ёлкой</p>
            </motion.div>
          </div>

          {/* Как это работает */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="card-festive rounded-3xl p-6 md:p-8"
          >
            <h3 className="text-2xl font-bold text-white mb-6 text-center font-display">
              Как это работает?
            </h3>

            <div className="grid md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-[#ffd700]/20 flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl font-bold text-[#ffd700]">1</span>
                </div>
                <h4 className="font-semibold text-white mb-1">Зарегистрируйтесь</h4>
                <p className="text-[#a8d8ea]/60 text-sm">Создайте аккаунт за минуту</p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-[#ffd700]/20 flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl font-bold text-[#ffd700]">2</span>
                </div>
                <h4 className="font-semibold text-white mb-1">Выберите услугу</h4>
                <p className="text-[#a8d8ea]/60 text-sm">Сейчас видео бесплатно!</p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-[#ffd700]/20 flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl font-bold text-[#ffd700]">3</span>
                </div>
                <h4 className="font-semibold text-white mb-1">Заполните форму</h4>
                <p className="text-[#a8d8ea]/60 text-sm">Имя ребёнка и 2 фотографии</p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-[#ffd700]/20 flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl font-bold text-[#ffd700]">4</span>
                </div>
                <h4 className="font-semibold text-white mb-1">Получите видео</h4>
                <p className="text-[#a8d8ea]/60 text-sm">Скачайте из личного кабинета</p>
              </div>
            </div>

            <div className="text-center mt-8">
              <Link
                href={user ? '/service/ded-moroz' : '/login'}
                className="btn-magic px-10 py-4 rounded-xl text-lg font-bold text-white inline-flex items-center gap-3"
              >
                <Sparkles className="w-6 h-6" />
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

      {/* Футер */}
      <footer className="relative z-10 py-8 mt-8 border-t border-white/10">
        <div className="container mx-auto px-4 text-center text-[#a8d8ea]/60 text-sm">
          <p className="mb-2">
            Видео создаётся с помощью технологии искусственного интеллекта Sora 2
          </p>
          <p>Сделано с ❤️ для волшебных новогодних праздников © 2024-2025</p>
          {user?.email?.endsWith('@admin.com') && (
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 text-[#ffd700]/60 hover:text-[#ffd700] mt-4"
            >
              <Shield className="w-4 h-4" />
              Админ-панель
            </Link>
          )}
        </div>
      </footer>
    </main>
  );
}
