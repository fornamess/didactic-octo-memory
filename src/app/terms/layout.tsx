import type { Metadata } from 'next';
import { BASE_URL } from '@/lib/config';

export const metadata: Metadata = {
  title: 'Условия использования | Видео-поздравления от Деда Мороза',
  description:
    'Условия использования сервиса создания персональных видео-поздравлений от Деда Мороза. Правила использования, политика конфиденциальности.',
  keywords: [
    'условия использования',
    'пользовательское соглашение',
    'правила',
    'политика конфиденциальности',
    'видео поздравление',
    'Дед Мороз',
  ],
  openGraph: {
    title: 'Условия использования | Видео-поздравления от Деда Мороза',
    description:
      'Условия использования сервиса создания персональных видео-поздравлений от Деда Мороза.',
    url: `${BASE_URL}/terms`,
    type: 'website',
    images: [
      {
        url: `${BASE_URL}/og-image.jpg`,
        width: 1200,
        height: 630,
        alt: 'Условия использования - Видео-поздравления от Деда Мороза',
      },
    ],
  },
  alternates: {
    canonical: `${BASE_URL}/terms`,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function TermsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
