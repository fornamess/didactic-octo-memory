'use client';

import { motion } from 'framer-motion';
import { ArrowLeft, Eye, EyeOff, Lock, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Токен не предоставлен');
      setValidating(false);
      return;
    }

    // Проверяем валидность токена
    fetch(`/api/auth/forgot-password?token=${token}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.valid) {
          setTokenValid(true);
        } else {
          setError(data.error || 'Токен недействителен или истёк');
        }
      })
      .catch(() => {
        setError('Ошибка при проверке токена');
      })
      .finally(() => {
        setValidating(false);
      });
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!password || !password2) {
      setError('Заполните все поля');
      return;
    }

    if (password.length < 6) {
      setError('Пароль должен быть не менее 6 символов');
      return;
    }

    if (password !== password2) {
      setError('Пароли не совпадают');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, newPassword: password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка при сбросе пароля');
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка');
    } finally {
      setLoading(false);
    }
  };

  if (validating) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0c1929] via-[#1a3a5c] to-[#0d2840]">
        <div className="text-center">
          <Sparkles className="w-12 h-12 text-[#ffd700] animate-spin mx-auto mb-4" />
          <p className="text-[#a8d8ea]">Проверка токена...</p>
        </div>
      </main>
    );
  }

  if (!tokenValid) {
    return (
      <main className="min-h-screen relative overflow-hidden bg-gradient-to-br from-[#0c1929] via-[#1a3a5c] to-[#0d2840]">
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
            <div className="card-festive rounded-3xl p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-red-400" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-4">Токен недействителен</h1>
              <p className="text-[#a8d8ea] mb-6">
                {error || 'Ссылка для сброса пароля недействительна или истёкла'}
              </p>
              <Link
                href="/forgot-password"
                className="btn-magic px-6 py-3 rounded-xl text-white inline-flex items-center gap-2"
              >
                Запросить новую ссылку
              </Link>
            </div>
          </motion.div>
        </div>
      </main>
    );
  }

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
                <span className="text-6xl">🔑</span>
              </motion.div>
              <h1 className="text-3xl font-bold text-gradient font-display mb-2">Новый пароль</h1>
              <p className="text-[#a8d8ea]/80">Введите новый пароль для вашего аккаунта</p>
            </div>

            {success ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-6"
              >
                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-8 h-8 text-green-400" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Пароль изменён!</h2>
                <p className="text-[#a8d8ea] mb-6">Перенаправление на страницу входа...</p>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-[#a8d8ea] mb-2 font-semibold">Новый пароль</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#a8d8ea]/60" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Минимум 6 символов"
                      required
                      minLength={6}
                      className="input-magic w-full pl-12 pr-12 py-4 rounded-xl text-[#f0f8ff]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#a8d8ea]/60 hover:text-[#a8d8ea]"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[#a8d8ea] mb-2 font-semibold">
                    Подтвердите пароль
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#a8d8ea]/60" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password2}
                      onChange={(e) => setPassword2(e.target.value)}
                      placeholder="Повторите пароль"
                      required
                      minLength={6}
                      className="input-magic w-full pl-12 pr-12 py-4 rounded-xl text-[#f0f8ff]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#a8d8ea]/60 hover:text-[#a8d8ea]"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
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
                      <span>Изменение...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-5 h-5" />
                      <span>Изменить пароль</span>
                    </>
                  )}
                </motion.button>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0c1929] via-[#1a3a5c] to-[#0d2840]">
          <div className="text-center">
            <Sparkles className="w-12 h-12 text-[#ffd700] animate-spin mx-auto mb-4" />
            <p className="text-[#a8d8ea]">Загрузка...</p>
          </div>
        </main>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
