import { generateToken, hashPassword } from '@/lib/auth';
import { createUser, ensureDbInitialized, getUserByEmail } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    await ensureDbInitialized();

    const { email, password, nickname, firstName, lastName, agreedToTerms } = await request.json();

    // Валидация
    if (!email || !password || !nickname || !firstName || !lastName) {
      return NextResponse.json({ error: 'Все поля обязательны' }, { status: 400 });
    }

    // Проверка формата email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Неверный формат email' }, { status: 400 });
    }

    if (!agreedToTerms) {
      return NextResponse.json(
        { error: 'Необходимо согласиться с условиями использования' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Пароль должен быть не менее 6 символов' },
        { status: 400 }
      );
    }

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

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: userId,
        email,
        nickname,
        firstName,
        lastName,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Ошибка при регистрации' }, { status: 500 });
  }
}
