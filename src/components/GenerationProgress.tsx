"use client";

import { motion } from "framer-motion";
import { Sparkles, Clock, Loader2 } from "lucide-react";

interface GenerationProgressProps {
  progress: number;
  statusMessage?: string;
  taskId?: number | null;
}

const magicMessages = [
  "🎅 Дед Мороз читает ваше письмо...",
  "✨ Готовим волшебную пыльцу...",
  "🦌 Олени запрягаются в сани...",
  "❄️ Создаём снежное волшебство...",
  "🎄 Украшаем ёлку звёздами...",
  "🎁 Заворачиваем подарки...",
  "⭐ Добавляем искры счастья...",
  "🌟 Финальные штрихи магии...",
  "🎬 Записываем видео-послание...",
  "✅ Почти готово!",
];

export default function GenerationProgress({
  progress,
  statusMessage,
  taskId
}: GenerationProgressProps) {
  const messageIndex = Math.min(
    Math.floor(progress / 10),
    magicMessages.length - 1
  );

  const displayMessage = statusMessage || magicMessages[messageIndex];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-xl p-6"
    >
      <div className="flex items-center gap-3 mb-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <Sparkles className="w-6 h-6 text-[#ffd700]" />
        </motion.div>
        <span className="text-lg font-semibold text-[#f0f8ff]">
          {displayMessage}
        </span>
      </div>

      {/* Прогресс бар */}
      <div className="relative h-4 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            background: "linear-gradient(90deg, #c41e3a, #ffd700, #c41e3a)",
            backgroundSize: "200% 100%",
          }}
          animate={{
            width: `${Math.min(progress, 100)}%`,
            backgroundPosition: ["0% center", "100% center", "0% center"],
          }}
          transition={{
            width: { duration: 0.5 },
            backgroundPosition: { duration: 2, repeat: Infinity },
          }}
        />

        {/* Искры на прогресс баре */}
        {progress > 0 && progress < 100 && (
          <motion.div
            className="absolute inset-y-0 w-8"
            style={{ left: `calc(${Math.min(progress, 100)}% - 16px)` }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 0.5, repeat: Infinity }}
          >
            <div className="w-full h-full bg-gradient-to-r from-transparent via-white/50 to-transparent" />
          </motion.div>
        )}
      </div>

      <div className="flex justify-between items-center mt-2 text-sm text-[#a8d8ea]/60">
        <span className="flex items-center gap-1">
          {progress < 100 ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              Создание видео
            </>
          ) : (
            "✅ Готово!"
          )}
        </span>
        <span className="font-mono">{Math.round(progress)}%</span>
      </div>

      {/* ID задания */}
      {taskId && (
        <div className="flex items-center justify-center gap-2 mt-3 text-xs text-[#a8d8ea]/40">
          <Clock className="w-3 h-3" />
          <span>Задание #{taskId}</span>
        </div>
      )}

      {/* Декоративные элементы */}
      <div className="flex justify-center gap-2 mt-4">
        {[...Array(5)].map((_, i) => (
          <motion.span
            key={i}
            className="text-xl"
            animate={{
              y: [0, -10, 0],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: i * 0.2,
            }}
          >
            {["🎄", "⭐", "🎁", "❄️", "✨"][i]}
          </motion.span>
        ))}
      </div>

      {/* Предупреждение */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
        className="mt-4 text-center text-xs text-[#a8d8ea]/50"
      >
        <p>⏱️ Генерация занимает 1-5 минут</p>
        <p>Не закрывайте страницу!</p>
      </motion.div>
    </motion.div>
  );
}
