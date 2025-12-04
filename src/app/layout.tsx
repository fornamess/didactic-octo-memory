import type { Metadata } from 'next';
// import { Nunito, Marck_Script } from 'next/font/google';
import { BASE_URL } from '@/lib/config';
import Footer from '@/components/Footer';
import './globals.css';

// Временно отключены Google Fonts для сборки в Docker
// const nunito = Nunito({
//   subsets: ['latin', 'cyrillic'],
//   weight: ['400', '600', '700', '800'],
//   variable: '--font-nunito',
//   display: 'swap',
// });

// const marckScript = Marck_Script({
//   subsets: ['latin', 'cyrillic'],
//   weight: ['400'],
//   variable: '--font-marck-script',
//   display: 'swap',
// });

const siteName = 'Видео-поздравления от Деда Мороза';
// Оптимизированное описание для SEO (до 160 символов)
const siteDescription =
  'Персональное видео-поздравление от Деда Мороза для вашего ребёнка. AI генерация, имя ребёнка, ваши фото. Бесплатно!';
const siteUrl = BASE_URL;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
  },
  title: {
    default: '🎅 Видео-поздравление от Деда Мороза | AI Генератор',
    template: '%s | Видео-поздравления от Деда Мороза',
  },
  description: siteDescription,
  keywords: [
    'Дед Мороз',
    'Новый Год',
    'видео поздравление',
    'AI генератор видео',
    'персонализированное видео',
    'поздравление детям',
    'новогодний подарок',
    'Sora 2',
    'искусственный интеллект',
    'видео для детей',
    'новогоднее видео',
    '2026 год',
    'Год Лошади',
  ],
  authors: [{ name: 'AI Video Generator' }],
  creator: 'AI Video Generator',
  publisher: 'AI Video Generator',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    url: siteUrl,
    siteName,
    title: '🎅 Видео-поздравление от Деда Мороза | AI Генератор',
    description: siteDescription,
    images: [
      {
        url: `${siteUrl}/og-image.jpg`,
        width: 1200,
        height: 630,
        alt: 'Видео-поздравление от Деда Мороза',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '🎅 Видео-поздравление от Деда Мороза | AI Генератор',
    description: siteDescription,
    images: [`${siteUrl}/og-image.jpg`],
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
  alternates: {
    canonical: siteUrl,
  },
  verification: {
    // Добавьте ваши ключи верификации при необходимости
    // google: 'your-google-verification-code',
    // yandex: 'your-yandex-verification-code',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: siteName,
    description: siteDescription,
    url: siteUrl,
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'RUB',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '5',
      ratingCount: '1',
    },
    featureList: [
      'Персонализированные видео-поздравления',
      'Использование имени ребёнка',
      'Загрузка фотографий',
      'AI генерация с помощью Sora 2',
      'HD качество видео',
    ],
  };

  return (
    <html lang="ru">
      <head>
        {/* Preconnect для ускорения загрузки внешних ресурсов */}
        <link rel="preconnect" href={siteUrl} />
        <link rel="dns-prefetch" href={siteUrl} />

        {/* Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body className="antialiased">
        {children}
        <Footer />
      </body>
    </html>
  );
}
