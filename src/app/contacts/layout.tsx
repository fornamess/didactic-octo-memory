import type { Metadata } from 'next';
import { BASE_URL } from '@/lib/config';

export const metadata: Metadata = {
  title: 'Контакты | Видео-поздравления от Деда Мороза',
  description:
    'Свяжитесь с нами для получения поддержки по созданию персональных видео-поздравлений от Деда Мороза. Telegram, Email и другие способы связи.',
  keywords: [
    'контакты',
    'поддержка',
    'связаться',
    'помощь',
    'техподдержка',
    'видео поздравление',
    'Дед Мороз',
  ],
  openGraph: {
    title: 'Контакты | Видео-поздравления от Деда Мороза',
    description:
      'Свяжитесь с нами для получения поддержки по созданию персональных видео-поздравлений от Деда Мороза.',
    url: `${BASE_URL}/contacts`,
    type: 'website',
    images: [
      {
        url: `${BASE_URL}/og-image.jpg`,
        width: 1200,
        height: 630,
        alt: 'Контакты - Видео-поздравления от Деда Мороза',
      },
    ],
  },
  alternates: {
    canonical: `${BASE_URL}/contacts`,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function ContactsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
