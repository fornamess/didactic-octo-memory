import type { Metadata } from 'next';
import Script from 'next/script';
import { BASE_URL } from '@/lib/config';

const serviceStructuredData = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  name: 'Видео-поздравление от Деда Мороза',
  description:
    'Персональное видео-поздравление от Деда Мороза с использованием искусственного интеллекта Sora 2',
  provider: {
    '@type': 'Organization',
    name: 'AI Video Generator',
    url: BASE_URL,
  },
  areaServed: {
    '@type': 'Country',
    name: 'RU',
  },
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'RUB',
    availability: 'https://schema.org/InStock',
    priceValidUntil: '2026-12-31',
  },
  serviceType: 'Video Generation',
  category: 'Entertainment',
  inLanguage: 'ru',
};

const breadcrumbsStructuredData = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Главная',
      item: BASE_URL,
    },
    {
      '@type': 'ListItem',
      position: 2,
      name: 'Заказать видео',
      item: `${BASE_URL}/service/ded-moroz`,
    },
  ],
};

export const metadata: Metadata = {
  title: 'Заказать видео от Деда Мороза | Персональное поздравление с Новым Годом',
  description:
    'Закажите персональное видео-поздравление от Деда Мороза. Имя ребёнка, ваши фото, поздравление с Новым Годом. AI генерация, HD качество. Бесплатно!',
  keywords: [
    'заказать видео от Деда Мороза',
    'персонализированное видео поздравление',
    'новогоднее видео для детей',
    'Дед Мороз видео',
    'AI генератор видео',
    'видео подарок на Новый Год',
    'персональное поздравление',
    'Sora 2',
    'искусственный интеллект',
    'видео для ребёнка',
    'новогодний подарок',
    '2026 год',
  ],
  openGraph: {
    title: 'Заказать видео от Деда Мороза | Персональное поздравление',
    description:
      'Закажите персональное видео-поздравление от Деда Мороза. Имя ребёнка, ваши фото, поздравление с Новым Годом. AI генерация, HD качество. Бесплатно!',
    url: `${BASE_URL}/service/ded-moroz`,
    type: 'website',
    locale: 'ru_RU',
    siteName: 'Видео-поздравления от Деда Мороза',
    images: [
      {
        url: `${BASE_URL}/og-image.jpg`,
        width: 1200,
        height: 630,
        alt: 'Видео-поздравление от Деда Мороза',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Заказать видео от Деда Мороза',
    description:
      'Закажите персональное видео-поздравление от Деда Мороза. Имя ребёнка, ваши фото, поздравление с Новым Годом. Бесплатно!',
    images: [`${BASE_URL}/og-image.jpg`],
  },
  alternates: {
    canonical: `${BASE_URL}/service/ded-moroz`,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function DedMorozLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <Script
        id="service-structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceStructuredData) }}
      />
      <Script
        id="breadcrumbs-structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbsStructuredData) }}
      />
    </>
  );
}
