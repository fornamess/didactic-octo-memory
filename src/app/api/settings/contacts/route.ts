import { ensureDbInitialized, getSetting } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    await ensureDbInitialized();

    const contactsText = await getSetting('contacts_text');

    return NextResponse.json({
      success: true,
      contacts_text: contactsText || '',
    });
  } catch (error) {
    console.error('Get contacts error:', error);
    return NextResponse.json({ error: 'Ошибка получения контактов' }, { status: 500 });
  }
}
