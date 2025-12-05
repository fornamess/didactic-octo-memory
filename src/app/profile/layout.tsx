import type { Metadata } from 'next';
import { BASE_URL } from '@/lib/config';

export const metadata: Metadata = {
  title: 'Мой профиль | Видео-поздравления от Деда Мороза',
  description:
    'Личный кабинет пользователя. Просмотр заказов, истории пополнений баланса и управление аккаунтом.',
  keywords: [
    'профиль',
    'личный кабинет',
    'мои заказы',
    'баланс',
    'история',
    'видео поздравление',
  ],
  openGraph: {
    title: 'Мой профиль | Видео-поздравления от Деда Мороза',
    description: 'Личный кабинет пользователя. Просмотр заказов и истории.',
    url: `${BASE_URL}/profile`,
    type: 'website',
    images: [
      {
        url: `${BASE_URL}/og-image.jpg`,
        width: 1200,
        height: 630,
        alt: 'Мой профиль - Видео-поздравления от Деда Мороза',
      },
    ],
  },
  alternates: {
    canonical: `${BASE_URL}/profile`,
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
