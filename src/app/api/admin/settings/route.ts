import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { getSetting, setSetting, initDb } from '@/lib/db';

const ADMIN_EMAILS = ['admin@example.com'];

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

export async function GET(request: NextRequest) {
  try {
    await ensureDbInitialized();

    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const isAdmin = ADMIN_EMAILS.includes(user.email) || user.email.endsWith('@admin.com');
    if (!isAdmin) {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
    }

    const emailVerificationRequired = await getSetting('email_verification_required');
    const userAgreementText = await getSetting('user_agreement_text');

    return NextResponse.json({
      success: true,
      settings: {
        email_verification_required: emailVerificationRequired,
        user_agreement_text: userAgreementText,
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

    const isAdmin = ADMIN_EMAILS.includes(user.email) || user.email.endsWith('@admin.com');
    if (!isAdmin) {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
    }

    const { emailVerificationRequired, agreementText } = await request.json();

    await setSetting('email_verification_required', emailVerificationRequired ? '1' : '0');
    await setSetting('user_agreement_text', agreementText || '');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Save settings error:', error);
    return NextResponse.json({ error: 'Ошибка сохранения настроек' }, { status: 500 });
  }
}
