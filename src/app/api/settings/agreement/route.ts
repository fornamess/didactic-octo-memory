import { ensureDbInitialized, getSetting } from '@/lib/db';
import { NextResponse } from 'next/server';

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
