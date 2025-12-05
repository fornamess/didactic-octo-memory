import { generateToken, hashPassword } from '@/lib/auth';
import { createUser, ensureDbInitialized, getUserByEmail } from '@/lib/db';
import { RegisterSchema, validateRequest } from '@/lib/validation';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    await ensureDbInitialized();

    const body = await request.json();

    // Валидация с помощью Zod
    const validation = validateRequest(RegisterSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { email, password, nickname, firstName, lastName } = validation.data;

    // Проверка существования пользователя
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        { error: 'Пользователь с таким email уже существует' },
        { status: 409 }
      );
    }

    // Хешируем пароль
    const hashedPassword = await hashPassword(password);

    // Создаём пользователя
    const userId = await createUser(email, hashedPassword, nickname, firstName, lastName);

    // Генерируем токен
    const token = generateToken({
      id: userId as number,
      email,
      name: nickname,
    });

    // Создаем response с данными пользователя
    const response = NextResponse.json({
      success: true,
      user: {
        id: userId,
        email,
        nickname,
        firstName,
        lastName,
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
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Ошибка при регистрации' }, { status: 500 });
  }
}
