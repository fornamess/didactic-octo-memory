'use client';

import { motion } from 'framer-motion';
import { ArrowLeft, Mail, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!email) {
      setError('Введите email');
      return;
    }

    // Проверка формата email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Неверный формат email');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка при восстановлении пароля');
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen relative overflow-hidden bg-gradient-to-br from-[#0c1929] via-[#1a3a5c] to-[#0d2840]">
      {/* Декоративные элементы */}
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

      <div className="container mx-auto px-4 py-8 relative z-10">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-[#a8d8ea] hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          Назад к входу
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md mx-auto"
        >
          <div className="card-festive rounded-3xl p-8">
            <div className="text-center mb-6">
              <motion.div
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="inline-block mb-4"
              >
                <span className="text-6xl">🔐</span>
              </motion.div>
              <h1 className="text-3xl font-bold text-gradient font-display mb-2">
                Восстановление пароля
              </h1>
              <p className="text-[#a8d8ea]/80">
                Введите email, указанный при регистрации, и мы отправим инструкции по восстановлению
                пароля
              </p>
            </div>

            {success ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-6"
              >
                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-8 h-8 text-green-400" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Проверьте почту!</h2>
                <p className="text-[#a8d8ea] mb-6">
                  Если аккаунт с email <strong className="text-white">{email}</strong> существует,
                  мы отправили инструкции по восстановлению пароля.
                </p>
                <Link
                  href="/login"
                  className="btn-magic px-6 py-3 rounded-xl text-white inline-flex items-center gap-2"
                >
                  Вернуться к входу
                </Link>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-[#a8d8ea] mb-2 font-semibold">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#a8d8ea]/60" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      required
                      className="input-magic w-full pl-12 pr-5 py-4 rounded-xl text-[#f0f8ff]"
                    />
                  </div>
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 text-red-200"
                  >
                    ⚠️ {error}
                  </motion.div>
                )}

                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: loading ? 1 : 1.02 }}
                  whileTap={{ scale: loading ? 1 : 0.98 }}
                  className="btn-magic w-full py-4 rounded-xl text-lg font-bold text-white flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Sparkles className="w-5 h-5 animate-spin" />
                      <span>Отправка...</span>
                    </>
                  ) : (
                    <>
                      <Mail className="w-5 h-5" />
                      <span>Отправить инструкции</span>
                    </>
                  )}
                </motion.button>
              </form>
            )}

            <div className="mt-6 text-center">
              <p className="text-[#a8d8ea]/60 text-sm">
                Помните пароль?{' '}
                <Link href="/login" className="text-[#ffd700] hover:underline">
                  Войти
                </Link>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
