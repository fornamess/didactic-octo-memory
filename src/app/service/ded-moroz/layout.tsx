import type { Metadata } from 'next';
import { BASE_URL } from '@/lib/config';

export const metadata: Metadata = {
  title: 'Заказать видео от Деда Мороза',
  description:
    'Закажите персональное видео-поздравление от Деда Мороза. Имя ребёнка, ваши фото, поздравление с Новым Годом. Бесплатно!',
  keywords: [
    'заказать видео от Деда Мороза',
    'персонализированное видео поздравление',
    'новогоднее видео для детей',
    'Дед Мороз видео',
    'AI генератор видео',
    'видео подарок на Новый Год',
  ],
  openGraph: {
    title: 'Заказать видео от Деда Мороза',
    description:
      'Закажите персональное видео-поздравление от Деда Мороза. Имя ребёнка, ваши фото, поздравление с Новым Годом. Бесплатно!',
    url: `${BASE_URL}/service/ded-moroz`,
    type: 'website',
    images: [
      {
        url: `${BASE_URL}/og-image.jpg`,
        width: 1200,
        height: 630,
        alt: 'Видео-поздравление от Деда Мороза',
      },
    ],
  },
  alternates: {
    canonical: `${BASE_URL}/service/ded-moroz`,
  },
};

export default function DedMorozLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
