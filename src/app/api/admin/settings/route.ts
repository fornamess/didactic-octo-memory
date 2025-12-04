import { getUserFromRequest } from '@/lib/auth';
import { isAdmin } from '@/lib/config';
import { ensureDbInitialized, getSetting, setSetting } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    await ensureDbInitialized();

    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    if (!isAdmin(user.email)) {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
    }

    const emailVerificationRequired = await getSetting('email_verification_required');
    const userAgreementText = await getSetting('user_agreement_text');
    const contactsText = await getSetting('contacts_text');

    return NextResponse.json({
      success: true,
      settings: {
        email_verification_required: emailVerificationRequired,
        user_agreement_text: userAgreementText,
        contacts_text: contactsText,
      },
    });
  } catch (error) {
    console.error('Get settings error:', error);
    return NextResponse.json({ error: 'Ошибка получения настроек' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureDbInitialized();

    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    if (!isAdmin(user.email)) {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
    }

    const { emailVerificationRequired, agreementText, contactsText } = await request.json();

    await setSetting('email_verification_required', emailVerificationRequired ? '1' : '0');
    await setSetting('user_agreement_text', agreementText || '');
    await setSetting('contacts_text', contactsText || '');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Save settings error:', error);
    return NextResponse.json({ error: 'Ошибка сохранения настроек' }, { status: 500 });
  }
}
