import { comparePassword, generateToken } from '@/lib/auth';
import { ensureDbInitialized, getUserByEmail } from '@/lib/db';
import { authRateLimit, checkRateLimit } from '@/lib/rate-limit';
import { LoginSchema, validateRequest } from '@/lib/validation';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    await ensureDbInitialized();

    // Rate limiting (SEC-010)
    const identifier = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'anonymous';
    const rateLimitResult = await checkRateLimit(authRateLimit, identifier);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Слишком много запросов. Попробуйте позже.' },
        { status: 429 }
      );
    }

    const body = await request.json();

    // Валидация с помощью Zod
    const validation = validateRequest(LoginSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { email, password } = validation.data;

    // Находим пользователя
    const user = await getUserByEmail(email);
    if (!user) {
      return NextResponse.json({ error: 'Неверный email или пароль' }, { status: 401 });
    }

    // Проверяем пароль
    const isValid = await comparePassword(password, user.password);
    if (!isValid) {
      return NextResponse.json({ error: 'Неверный email или пароль' }, { status: 401 });
    }

    // Генерируем токен
    const token = generateToken({
      id: user.id,
      email: user.email,
      name: user.nickname || user.first_name,
    });

    // Создаем response с данными пользователя
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        firstName: user.first_name,
        lastName: user.last_name,
        balance: user.balance || 0,
      },
    });

    // Устанавливаем httpOnly cookie с токеном
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 30, // 30 дней
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Ошибка при входе' }, { status: 500 });
  }
}
