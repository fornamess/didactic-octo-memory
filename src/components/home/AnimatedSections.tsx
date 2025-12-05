// Client Component для анимированных секций (PRF-002)
'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Gift, Heart, Sparkles } from 'lucide-react';
import Link from 'next/link';
import ExampleVideoPlayer from '@/components/ExampleVideoPlayer';
import { Suspense } from 'react';

interface AnimatedSectionsProps {
  user: { id: number } | null;
}

export default function AnimatedSections({ user }: AnimatedSectionsProps) {
  return (
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
              Вы получите видео длиной <strong>2 минуты</strong>, в котором Дед Мороз обратится к
              вашему ребёнку по имени, покажет загруженные вами фотографии и поздравит с Новым
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
          <h4 className="text-base sm:text-lg font-bold text-white mb-2">Реалистичное AI видео</h4>
          <p className="text-[#a8d8ea] text-xs sm:text-sm">
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
          <h4 className="text-base sm:text-lg font-bold text-white mb-2">Полная персонализация</h4>
          <p className="text-[#a8d8ea] text-xs sm:text-sm">
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
          <p className="text-[#a8d8ea] text-xs sm:text-sm">
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
            <h4 className="text-sm sm:text-base font-semibold text-white mb-1">Зарегистрируйтесь</h4>
            <p className="text-[#a8d8ea]/90 text-xs sm:text-sm">Создайте аккаунт за минуту</p>
          </div>

          <div className="text-center">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#ffd700]/20 flex items-center justify-center mx-auto mb-2 sm:mb-3">
              <span className="text-xl sm:text-2xl font-bold text-[#ffd700]">2</span>
            </div>
            <h4 className="text-sm sm:text-base font-semibold text-white mb-1">Выберите услугу</h4>
            <p className="text-[#a8d8ea]/90 text-xs sm:text-sm">Сейчас видео бесплатно!</p>
          </div>

          <div className="text-center">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#ffd700]/20 flex items-center justify-center mx-auto mb-2 sm:mb-3">
              <span className="text-xl sm:text-2xl font-bold text-[#ffd700]">3</span>
            </div>
            <h4 className="text-sm sm:text-base font-semibold text-white mb-1">Заполните форму</h4>
            <p className="text-[#a8d8ea]/90 text-xs sm:text-sm">Имя ребёнка и 2 фотографии</p>
          </div>

          <div className="text-center">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#ffd700]/20 flex items-center justify-center mx-auto mb-2 sm:mb-3">
              <span className="text-xl sm:text-2xl font-bold text-[#ffd700]">4</span>
            </div>
            <h4 className="text-sm sm:text-base font-semibold text-white mb-1">Получите видео</h4>
            <p className="text-[#a8d8ea]/90 text-xs sm:text-sm">Скачайте из личного кабинета</p>
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
  );
}
