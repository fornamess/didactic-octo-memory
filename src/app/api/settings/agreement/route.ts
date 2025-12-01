import { NextResponse } from 'next/server';
import { getSetting, initDb } from '@/lib/db';

let dbInitPromise: Promise<void> | null = null;
function ensureDbInitialized() {
  if (!dbInitPromise) {
    dbInitPromise = initDb().catch((err) => {
      console.error('DB init error:', err);
      dbInitPromise = null;
    });
  }
  return dbInitPromise;
}

export async function GET() {
  try {
    await ensureDbInitialized();
    const text = await getSetting('user_agreement_text');
    return NextResponse.json({ text: text || 'Текст соглашения пока не установлен' });
  } catch (error) {
    console.error('Get agreement error:', error);
    return NextResponse.json({ text: 'Ошибка загрузки соглашения' });
  }
}
