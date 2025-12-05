// Client Component для анимированного хедера (PRF-002)
'use client';

import { motion } from 'framer-motion';
import { Sparkles, Star, TreePine, Gift } from 'lucide-react';

export default function AnimatedHeader() {
  return (
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
  );
}
