'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Логируем ошибку для мониторинга (в продакшене можно отправить в Sentry)
    console.error('Application error:', error);
  }, [error]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0c1929] via-[#1a3a5c] to-[#0d2840] p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-festive rounded-3xl p-8 md:p-10 max-w-md w-full text-center"
      >
        <motion.div
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
          className="inline-block mb-6"
        >
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto" />
        </motion.div>

        <h1 className="text-3xl md:text-4xl font-bold text-gradient font-display mb-4">
          Что-то пошло не так!
        </h1>

        <p className="text-[#a8d8ea]/80 mb-6">
          Произошла непредвиденная ошибка. Мы уже работаем над её исправлением.
        </p>

        {process.env.NODE_ENV === 'development' && error.message && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 mb-6 text-left">
            <p className="text-red-200 text-sm font-mono break-all">{error.message}</p>
            {error.digest && (
              <p className="text-red-300/60 text-xs mt-2">Error ID: {error.digest}</p>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <motion.button
            onClick={reset}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="btn-magic px-6 py-3 rounded-xl text-white flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-5 h-5" />
            Попробовать снова
          </motion.button>

          <Link
            href="/"
            className="btn-magic px-6 py-3 rounded-xl text-white flex items-center justify-center gap-2 bg-[#1a3a5c] hover:bg-[#2a4a6c]"
          >
            <Home className="w-5 h-5" />
            На главную
          </Link>
        </div>
      </motion.div>
    </main>
  );
}

