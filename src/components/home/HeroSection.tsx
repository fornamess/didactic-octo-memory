// Client Component для hero секции (PRF-002)
'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Gift, Heart, Sparkles, Star, TreePine } from 'lucide-react';
import Link from 'next/link';

export default function HeroSection() {
  return (
    <div className="relative z-10 text-center px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16 lg:pt-24 pb-8 sm:pb-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-4xl mx-auto"
      >
        <div className="flex items-center justify-center gap-2 mb-4 sm:mb-6">
          <TreePine className="w-6 h-6 sm:w-8 sm:h-8 text-[#c41e3a] animate-pulse" />
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gradient font-display">
            Дед Мороз
          </h1>
          <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-[#ffd700] animate-pulse" />
        </div>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-lg sm:text-xl md:text-2xl text-[#a8d8ea] mb-6 sm:mb-8"
        >
          Персональное поздравление от Деда Мороза для вашего ребёнка
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8 sm:mb-12"
        >
          <Link
            href="/service/ded-moroz"
            className="btn-magic px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl text-lg sm:text-xl font-bold text-white flex items-center gap-2 sm:gap-3 group"
          >
            <Gift className="w-5 h-5 sm:w-6 sm:h-6 group-hover:rotate-12 transition-transform" />
            Создать поздравление
            <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            href="/login"
            className="btn-secondary px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl text-lg sm:text-xl font-bold text-white flex items-center gap-2 sm:gap-3"
          >
            <Heart className="w-5 h-5 sm:w-6 sm:h-6" />
            Войти в аккаунт
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-sm sm:text-base"
        >
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-[#ffd700] fill-[#ffd700]" />
            <span className="text-[#a8d8ea]">Персонализация</span>
          </div>
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-[#ffd700] fill-[#ffd700]" />
            <span className="text-[#a8d8ea]">Высокое качество</span>
          </div>
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-[#ffd700] fill-[#ffd700]" />
            <span className="text-[#a8d8ea]">Быстрая доставка</span>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
