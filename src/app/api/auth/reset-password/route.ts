import { ensureDbInitialized, getUserByEmail, getDb, run } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { getResetTokenData, deleteResetToken } from '@/lib/reset-tokens';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/auth/reset-password
 * Сброс пароля по токену
 */
export async function POST(request: NextRequest) {
  try {
    await ensureDbInitialized();

    const { token, newPassword } = await request.json();

    if (!token || !newPassword) {
      return NextResponse.json(
        { error: 'Токен и новый пароль обязательны' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Пароль должен быть не менее 6 символов' },
        { status: 400 }
      );
    }

    // Проверяем токен
    const tokenData = getResetTokenData(token);

    if (!tokenData) {
      return NextResponse.json({ error: 'Токен не найден или истёк' }, { status: 404 });
    }

    if (tokenData.expiresAt < Date.now()) {
      deleteResetToken(token);
      return NextResponse.json({ error: 'Токен истёк' }, { status: 410 });
    }

    // Находим пользователя
    const user = await getUserByEmail(tokenData.email);
    if (!user) {
      deleteResetToken(token);
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
    }

    // Хешируем новый пароль
    const hashedPassword = await hashPassword(newPassword);

    // Обновляем пароль в БД
    const db = await getDb();
    await run(db, 'UPDATE users SET password = ? WHERE id = ?', [hashedPassword, user.id]);
    db.close();

    // Удаляем использованный токен
    deleteResetToken(token);

    return NextResponse.json({
      success: true,
      message: 'Пароль успешно изменён',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: 'Ошибка при сбросе пароля' }, { status: 500 });
  }
}
