import { ensureDbInitialized, getSetting } from '@/lib/db';
import { SUPPORT_EMAIL, SUPPORT_TELEGRAM } from '@/lib/config';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    await ensureDbInitialized();

    // Пытаемся получить из настроек админки
    const contactsText = await getSetting('contacts_text');

    // Парсим контакты из HTML если есть
    let telegram = SUPPORT_TELEGRAM;
    let email = SUPPORT_EMAIL;

    if (contactsText) {
      // Ищем Telegram ссылку
      const telegramMatch = contactsText.match(/https?:\/\/t\.me\/([a-zA-Z0-9_]+)/i) ||
                           contactsText.match(/@([a-zA-Z0-9_]+)/i);
      if (telegramMatch) {
        telegram = `@${telegramMatch[1]}`;
      }

      // Ищем email
      const emailMatch = contactsText.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
      if (emailMatch) {
        email = emailMatch[1];
      }
    }

    return NextResponse.json({
      telegram,
      email,
    });
  } catch (error) {
    console.error('Get support contacts error:', error);
    // Fallback на дефолтные значения
    return NextResponse.json({
      telegram: SUPPORT_TELEGRAM,
      email: SUPPORT_EMAIL,
    });
  }
}
