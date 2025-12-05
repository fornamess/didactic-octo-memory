import type { Metadata } from 'next';
import { BASE_URL } from '@/lib/config';

export const metadata: Metadata = {
  title: 'Вход и регистрация | Видео-поздравления от Деда Мороза',
  description:
    'Войдите в аккаунт или зарегистрируйтесь для создания персональных видео-поздравлений от Деда Мороза. Бесплатно и быстро!',
  keywords: [
    'войти',
    'регистрация',
    'авторизация',
    'аккаунт',
    'видео поздравление',
    'Дед Мороз',
  ],
  openGraph: {
    title: 'Вход и регистрация | Видео-поздравления от Деда Мороза',
    description:
      'Войдите в аккаунт или зарегистрируйтесь для создания персональных видео-поздравлений от Деда Мороза.',
    url: `${BASE_URL}/login`,
    type: 'website',
    images: [
      {
        url: `${BASE_URL}/og-image.jpg`,
        width: 1200,
        height: 630,
        alt: 'Вход и регистрация - Видео-поздравления от Деда Мороза',
      },
    ],
  },
  alternates: {
    canonical: `${BASE_URL}/login`,
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
