import type { Metadata } from 'next';
import { BASE_URL } from '@/lib/config';

export const metadata: Metadata = {
  title: 'Видео-поздравление от Деда Мороза | Заказать персонализированное видео',
  description:
    'Закажите уникальное персонализированное видео-поздравление от Деда Мороза для вашего ребёнка. Дед Мороз назовёт имя ребёнка, покажет ваши фотографии и поздравит с Новым 2026 Годом! Бесплатно!',
  keywords: [
    'заказать видео от Деда Мороза',
    'персонализированное видео поздравление',
    'новогоднее видео для детей',
    'Дед Мороз видео',
    'AI генератор видео',
    'видео подарок на Новый Год',
  ],
  openGraph: {
    title: 'Видео-поздравление от Деда Мороза | Заказать персонализированное видео',
    description:
      'Закажите уникальное персонализированное видео-поздравление от Деда Мороза для вашего ребёнка. Бесплатно!',
    url: `${BASE_URL}/service/ded-moroz`,
    type: 'website',
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
