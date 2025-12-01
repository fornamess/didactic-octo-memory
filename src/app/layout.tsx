import type { Metadata } from 'next';
import { Nunito, Marck_Script } from 'next/font/google';
import './globals.css';

const nunito = Nunito({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '600', '700', '800'],
  variable: '--font-nunito',
  display: 'swap',
});

const marckScript = Marck_Script({
  subsets: ['latin', 'cyrillic'],
  weight: ['400'],
  variable: '--font-marck-script',
  display: 'swap',
});

export const metadata: Metadata = {
  title: '🎅 Видео-поздравление от Деда Мороза | AI Генератор',
  description:
    'Создайте волшебное персональное видео-поздравление для вашего ребёнка от настоящего Деда Мороза с помощью искусственного интеллекта!',
  keywords: 'Дед Мороз, Новый Год, видео поздравление, AI, детям, подарок',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className={`${nunito.variable} ${marckScript.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
