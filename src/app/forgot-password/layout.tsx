import type { Metadata } from 'next';
import { BASE_URL } from '@/lib/config';

export const metadata: Metadata = {
  title: 'Восстановление пароля | Видео-поздравления от Деда Мороза',
  description:
    'Восстановите доступ к аккаунту. Введите email для получения инструкций по восстановлению пароля.',
  keywords: [
    'восстановление пароля',
    'забыл пароль',
    'сброс пароля',
    'видео поздравление',
  ],
  openGraph: {
    title: 'Восстановление пароля | Видео-поздравления от Деда Мороза',
    description: 'Восстановите доступ к аккаунту для создания видео-поздравлений.',
    url: `${BASE_URL}/forgot-password`,
    type: 'website',
    images: [
      {
        url: `${BASE_URL}/og-image.jpg`,
        width: 1200,
        height: 630,
        alt: 'Восстановление пароля - Видео-поздравления от Деда Мороза',
      },
    ],
  },
  alternates: {
    canonical: `${BASE_URL}/forgot-password`,
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function ForgotPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
