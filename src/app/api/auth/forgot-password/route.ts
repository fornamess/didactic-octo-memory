import { ensureDbInitialized, getUserByEmail } from '@/lib/db';
import { createResetToken } from '@/lib/reset-tokens';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/auth/forgot-password
 * Запрос на восстановление пароля
 */
export async function POST(request: NextRequest) {
  try {
    await ensureDbInitialized();

    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email обязателен' }, { status: 400 });
    }

    // Проверка формата email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Неверный формат email' }, { status: 400 });
    }

    // Проверяем существование пользователя
    const user = await getUserByEmail(email);

    // Для безопасности не сообщаем, существует ли пользователь
    // Всегда возвращаем успешный ответ
    if (user) {
      // Генерируем токен сброса
      const resetToken = createResetToken(user.email);

      // В реальном приложении здесь должна быть отправка email
      // Для MVP просто логируем токен (в продакшене убрать!)
      console.log(`[FORGOT PASSWORD] Reset token for ${email}: ${resetToken}`);
      console.log(
        `[FORGOT PASSWORD] Reset URL: ${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`
      );

      // TODO: Отправить email с ссылкой на сброс пароля
      // await sendResetPasswordEmail(user.email, resetToken);
    }

    // Всегда возвращаем успех для безопасности
    return NextResponse.json({
      success: true,
      message:
        'Если аккаунт с таким email существует, инструкции по восстановлению пароля отправлены на почту.',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Ошибка при обработке запроса' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/auth/forgot-password?token=...
 * Проверка валидности токена сброса
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Токен не предоставлен' }, { status: 400 });
    }

    const { getResetTokenData } = await import('@/lib/reset-tokens');
    const tokenData = getResetTokenData(token);

    if (!tokenData) {
      return NextResponse.json({ error: 'Токен не найден или истёк' }, { status: 404 });
    }

    return NextResponse.json({
      valid: true,
      email: tokenData.email,
    });
  } catch (error) {
    console.error('Check reset token error:', error);
    return NextResponse.json({ error: 'Ошибка при проверке токена' }, { status: 500 });
  }
}
