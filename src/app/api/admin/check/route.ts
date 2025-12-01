import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { initDb } from '@/lib/db';

// Список email администраторов (можно вынести в БД или env)
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

    // Проверяем, является ли пользователь админом
    // Для простоты проверяем email, в продакшене лучше добавить роль в БД
    const isAdmin = ADMIN_EMAILS.includes(user.email) || user.email.endsWith('@admin.com');

    if (!isAdmin) {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
    }

    return NextResponse.json({ success: true, isAdmin: true });
  } catch (error) {
    console.error('Admin check error:', error);
    return NextResponse.json({ error: 'Ошибка проверки доступа' }, { status: 500 });
  }
}
