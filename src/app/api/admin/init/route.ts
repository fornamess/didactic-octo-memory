import { hashPassword } from '@/lib/auth';
import { createUser, ensureDbInitialized, getUserByEmail } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// Данные системного администратора (из скрипта)
const SYSTEM_ADMIN = {
  email: 'system@gmail.com',
  password: 'I8378HVGDSKAHGFIO473IEUWH@UKGHLFDHLKZ;O;L;',
  nickname: 'System Admin',
  firstName: 'System',
  lastName: 'Administrator',
};

/**
 * POST /api/admin/init
 * Инициализация БД и создание системного администратора
 * Можно вызвать только один раз (безопасно вызывать повторно - не создаст дубликат)
 */
export async function POST(request: NextRequest) {
  try {
    // Инициализируем БД
    await ensureDbInitialized();

    // Проверяем существование администратора
    const existingUser = await getUserByEmail(SYSTEM_ADMIN.email);

    if (existingUser) {
      return NextResponse.json({
        success: true,
        message: 'Системный администратор уже существует',
        email: existingUser.email,
        id: existingUser.id,
      });
    }

    // Хешируем пароль
    const hashedPassword = await hashPassword(SYSTEM_ADMIN.password);

    // Создаём администратора
    const userId = await createUser(
      SYSTEM_ADMIN.email,
      hashedPassword,
      SYSTEM_ADMIN.nickname,
      SYSTEM_ADMIN.firstName,
      SYSTEM_ADMIN.lastName
    );

    return NextResponse.json({
      success: true,
      message: 'Системный администратор успешно создан!',
      user: {
        id: userId,
        email: SYSTEM_ADMIN.email,
        nickname: SYSTEM_ADMIN.nickname,
      },
      credentials: {
        email: SYSTEM_ADMIN.email,
        password: SYSTEM_ADMIN.password,
      },
    });
  } catch (error) {
    console.error('Admin init error:', error);
    return NextResponse.json(
      {
        error: 'Ошибка при создании администратора',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/init
 * Проверка существования администратора
 */
export async function GET() {
  try {
    await ensureDbInitialized();

    const existingUser = await getUserByEmail(SYSTEM_ADMIN.email);

    if (existingUser) {
      return NextResponse.json({
        exists: true,
        email: existingUser.email,
        id: existingUser.id,
        nickname: existingUser.nickname,
      });
    }

    return NextResponse.json({
      exists: false,
      message: 'Администратор не найден. Используйте POST для создания.',
    });
  } catch (error) {
    console.error('Admin check error:', error);
    return NextResponse.json(
      {
        error: 'Ошибка при проверке',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
