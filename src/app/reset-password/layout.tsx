import type { Metadata } from 'next';
import { BASE_URL } from '@/lib/config';

export const metadata: Metadata = {
  title: 'Сброс пароля | Видео-поздравления от Деда Мороза',
  description:
    'Установите новый пароль для вашего аккаунта. Введите новый пароль для завершения восстановления доступа.',
  keywords: [
    'сброс пароля',
    'новый пароль',
    'восстановление доступа',
    'видео поздравление',
  ],
  openGraph: {
    title: 'Сброс пароля | Видео-поздравления от Деда Мороза',
    description: 'Установите новый пароль для вашего аккаунта.',
    url: `${BASE_URL}/reset-password`,
    type: 'website',
    images: [
      {
        url: `${BASE_URL}/og-image.jpg`,
        width: 1200,
        height: 630,
        alt: 'Сброс пароля - Видео-поздравления от Деда Мороза',
      },
    ],
  },
  alternates: {
    canonical: `${BASE_URL}/reset-password`,
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function ResetPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
