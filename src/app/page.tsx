// Server Component для главной страницы (PRF-002)
import AnimatedHeader from '@/components/home/AnimatedHeader';
import AnimatedSections from '@/components/home/AnimatedSections';
import UserHeader from '@/components/home/UserHeader';
import { getServerUser } from '@/lib/auth-server';
import { Suspense, lazy } from 'react';

// Lazy loading для компонентов
const Snowfall = lazy(() => import('@/components/Snowfall'));

// Указываем что страница динамическая (использует cookies)
export const dynamic = 'force-dynamic';

export default async function Home() {
  // Загружаем пользователя на сервере через cookies
  const user = await getServerUser();

  return (
    <main className="min-h-screen relative overflow-hidden">
      <Suspense
        fallback={
          <div className="fixed inset-0 bg-gradient-to-br from-[#0c1929] via-[#1a3a5c] to-[#0d2840]" />
        }
      >
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
      <header className="relative z-10 pt-4 sm:pt-8 pb-4">
        <UserHeader initialUser={user} />
        <AnimatedHeader />
      </header>

      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 relative z-10">
        <AnimatedSections user={user} />
      </div>

      {/* Декоративные ёлки */}
      <div className="fixed bottom-0 left-0 text-6xl md:text-8xl opacity-30 pointer-events-none">
        🌲
      </div>
      <div className="fixed bottom-0 right-0 text-6xl md:text-8xl opacity-30 pointer-events-none">
        🌲
      </div>
    </main>
  );
}
