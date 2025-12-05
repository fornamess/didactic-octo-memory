import Footer from '@/components/Footer';
import { BASE_URL } from '@/lib/config';
import type { Metadata, Viewport } from 'next';
import { Marck_Script, Nunito } from 'next/font/google';
import Script from 'next/script';
import './globals.css';

// Оптимизация шрифтов через next/font (PRF-004)
const nunito = Nunito({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '600', '700', '800'],
  variable: '--font-nunito',
  display: 'swap',
  preload: true,
});

const marckScript = Marck_Script({
  subsets: ['latin', 'cyrillic'],
  weight: ['400'],
  variable: '--font-marck-script',
  display: 'swap',
  preload: true,
});

const siteName = 'Видео-поздравления от Деда Мороза';
// Оптимизированное описание для SEO (до 160 символов)
const siteDescription =
  'Персональное видео-поздравление от Деда Мороза для вашего ребёнка. AI генерация, имя ребёнка, ваши фото. Бесплатно!';
const siteUrl = BASE_URL;

const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: siteName,
  description: siteDescription,
  url: siteUrl,
  applicationCategory: 'MultimediaApplication',
  operatingSystem: 'Web',
  browserRequirements: 'Requires JavaScript. Requires HTML5.',
  softwareVersion: '1.0',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'RUB',
    availability: 'https://schema.org/InStock',
    priceValidUntil: '2026-12-31',
  },
  // Убрано fake rating (SEO-001) - будет добавлено когда появится реальная система отзывов
  // aggregateRating: {
  //   '@type': 'AggregateRating',
  //   ratingValue: '5',
  //   ratingCount: '1',
  //   bestRating: '5',
  //   worstRating: '1',
  // },
  featureList: [
    'Персонализированные видео-поздравления',
    'Использование имени ребёнка',
    'Загрузка фотографий',
    'AI генерация с помощью Sora 2',
    'HD качество видео',
  ],
  potentialAction: {
    '@type': 'UseAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${siteUrl}/service/ded-moroz`,
      actionPlatform: [
        'http://schema.org/DesktopWebPlatform',
        'http://schema.org/MobileWebPlatform',
      ],
    },
  },
  creator: {
    '@type': 'Organization',
    name: 'AI Video Generator',
    url: siteUrl,
  },
  inLanguage: 'ru',
  isAccessibleForFree: true,
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
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
    // bing: 'your-bing-verification-code',
  },
  other: {
    'dns-prefetch': siteUrl,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href={siteUrl} />
        <link rel="dns-prefetch" href={siteUrl} />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/favicon.ico" />
        <meta name="theme-color" content="#c41e3a" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Дед Мороз AI" />
      </head>
      <body
        className={`antialiased ${nunito.variable} ${marckScript.variable}`}
        suppressHydrationWarning
      >
        {/* Skip link для accessibility (A11Y-005) */}
        <a
          href="#main-content"
          className="skip-link sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:z-[100] focus:bg-black focus:text-white focus:px-4 focus:py-2 focus:m-2 focus:rounded"
        >
          Перейти к основному контенту
        </a>
        <div id="main-content">{children}</div>
        <Footer />
        <Script
          id="structured-data"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <Script
          id="organization-structured-data"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'AI Video Generator',
              url: siteUrl,
              logo: `${siteUrl}/favicon.ico`,
              contactPoint: {
                '@type': 'ContactPoint',
                contactType: 'Customer Service',
                availableLanguage: ['Russian', 'English'],
              },
              sameAs: [],
            }),
          }}
        />
      </body>
    </html>
  );
}
