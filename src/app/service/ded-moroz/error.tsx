'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

export default function ServiceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Service error:', error);
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
          Ошибка в сервисе
        </h1>

        <p className="text-[#a8d8ea]/80 mb-6">
          Произошла ошибка при работе с сервисом. Попробуйте обновить страницу или вернуться на главную.
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
          <button
            onClick={() => reset()}
            className="btn-magic px-6 py-3 rounded-xl text-white inline-flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-5 h-5" />
            Попробовать снова
          </button>
          <Link
            href="/"
            className="btn-secondary px-6 py-3 rounded-xl text-white inline-flex items-center justify-center gap-2"
          >
            <Home className="w-5 h-5" />
            На главную
          </Link>
        </div>
      </motion.div>
    </main>
  );
}
