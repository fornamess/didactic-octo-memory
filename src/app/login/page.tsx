'use client';

import { motion } from 'framer-motion';
import { Eye, EyeOff, LogIn, Sparkles, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function LoginPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    password2: '',
    nickname: '',
    firstName: '',
    lastName: '',
    agreedToTerms: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Валидация для регистрации
    if (!isLogin) {
      if (formData.password !== formData.password2) {
        setError('Пароли не совпадают');
        return;
      }
      if (!formData.agreedToTerms) {
        setError('Необходимо согласиться с условиями использования');
        return;
      }
      // Проверка формата email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        setError('Неверный формат email (пример: name@domain.com)');
        return;
      }
    }

    setLoading(true);

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const body = isLogin
        ? { email: formData.email, password: formData.password }
        : {
            email: formData.email,
            password: formData.password,
            nickname: formData.nickname,
            firstName: formData.firstName,
            lastName: formData.lastName,
            agreedToTerms: formData.agreedToTerms,
          };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка');
      }

      // Токен теперь хранится в httpOnly cookie, не нужно сохранять в localStorage
      // Сохраняем только данные пользователя для UI
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
      }

      // Перенаправляем на главную
      router.push('/');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      password2: '',
      nickname: '',
      firstName: '',
      lastName: '',
      agreedToTerms: false,
    });
    setError(null);
  };

  return (
    <main className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-[#0c1929] via-[#1a3a5c] to-[#0d2840] py-8">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="star"
            style={{
              left: `${(i * 5) % 100}%`,
              top: `${(i * 7) % 60}%`,
              animationDelay: `${i * 0.2}s`,
              animationDuration: `${2 + (i % 3)}s`,
            }}
          />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-festive rounded-3xl p-8 md:p-10 w-full max-w-md mx-4 relative z-10"
      >
        <div className="text-center mb-6">
          <motion.div
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="inline-block mb-4"
          >
            <span className="text-6xl">🎅</span>
          </motion.div>
          <h1 className="text-3xl md:text-4xl font-bold text-gradient font-display mb-2">
            {isLogin ? 'Вход' : 'Регистрация'}
          </h1>
          <p className="text-[#a8d8ea]/60">
            {isLogin ? 'Войдите в свой аккаунт' : 'Создайте аккаунт для заказа видео'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#a8d8ea] mb-1 text-sm font-semibold">Имя</label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="Иван"
                    required={!isLogin}
                    disabled={loading}
                    className="input-magic w-full px-4 py-3 rounded-xl text-[#f0f8ff] disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-[#a8d8ea] mb-1 text-sm font-semibold">Фамилия</label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="Иванов"
                    required={!isLogin}
                    disabled={loading}
                    className="input-magic w-full px-4 py-3 rounded-xl text-[#f0f8ff] disabled:opacity-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#a8d8ea] mb-1 text-sm font-semibold">
                  Ник (отображаемое имя)
                </label>
                <input
                  type="text"
                  value={formData.nickname}
                  onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                  placeholder="Ivan2025"
                  required={!isLogin}
                  disabled={loading}
                  className="input-magic w-full px-4 py-3 rounded-xl text-[#f0f8ff] disabled:opacity-50"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-[#a8d8ea] mb-1 text-sm font-semibold">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="your@email.com"
              required
              disabled={loading}
              className="input-magic w-full px-4 py-3 rounded-xl text-[#f0f8ff] disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-[#a8d8ea] mb-1 text-sm font-semibold">Пароль</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
                required
                minLength={10}
                disabled={loading}
                className="input-magic w-full px-4 py-3 pr-12 rounded-xl text-[#f0f8ff] disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a8d8ea]/60 hover:text-[#a8d8ea]"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {!isLogin && (
            <>
              <div>
                <label className="block text-[#a8d8ea] mb-1 text-sm font-semibold">
                  Повторите пароль
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password2}
                  onChange={(e) => setFormData({ ...formData, password2: e.target.value })}
                  placeholder="••••••••"
                  required={!isLogin}
                  minLength={10}
                  disabled={loading}
                  className="input-magic w-full px-4 py-3 rounded-xl text-[#f0f8ff] disabled:opacity-50"
                />
              </div>

              <div className="flex items-start gap-3 mt-4">
                <input
                  type="checkbox"
                  id="agree"
                  checked={formData.agreedToTerms}
                  onChange={(e) => setFormData({ ...formData, agreedToTerms: e.target.checked })}
                  className="mt-1 w-5 h-5 rounded accent-[#c41e3a]"
                />
                <label htmlFor="agree" className="text-[#a8d8ea]/80 text-sm">
                  Я соглашаюсь с{' '}
                  <Link href="/terms" target="_blank" className="text-[#ffd700] hover:underline">
                    условиями использования
                  </Link>{' '}
                  и политикой обработки персональных данных
                </label>
              </div>
            </>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 text-red-200"
            >
              ⚠️ {error}
            </motion.div>
          )}

          <motion.button
            type="submit"
            disabled={loading}
            whileHover={!loading ? { scale: 1.02 } : {}}
            whileTap={!loading ? { scale: 0.98 } : {}}
            className="btn-magic w-full py-4 rounded-xl text-lg font-bold text-white flex items-center justify-center gap-3 disabled:cursor-not-allowed mt-6"
          >
            {loading ? (
              <>
                <Sparkles className="w-6 h-6 animate-spin" />
                <span>Обработка...</span>
              </>
            ) : isLogin ? (
              <>
                <LogIn className="w-6 h-6" />
                <span>Войти</span>
              </>
            ) : (
              <>
                <UserPlus className="w-6 h-6" />
                <span>Зарегистрироваться</span>
              </>
            )}
          </motion.button>
        </form>

        <div className="mt-5 text-center">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              resetForm();
            }}
            className="text-[#a8d8ea]/60 hover:text-[#a8d8ea] transition-colors"
          >
            {isLogin ? 'Нет аккаунта? Зарегистрируйтесь' : 'Уже есть аккаунт? Войдите'}
          </button>
        </div>

        {isLogin && (
          <div className="mt-3 text-center">
            <Link
              href="/forgot-password"
              className="text-[#ffd700]/60 hover:text-[#ffd700] transition-colors text-sm"
            >
              Забыли пароль?
            </Link>
          </div>
        )}

        <div className="mt-4 text-center">
          <Link
            href="/"
            className="text-[#a8d8ea]/60 hover:text-[#a8d8ea] transition-colors text-sm"
          >
            ← Назад на главную
          </Link>
        </div>
      </motion.div>
    </main>
  );
}
