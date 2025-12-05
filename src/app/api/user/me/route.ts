// API endpoint для получения текущего пользователя (PRF-002)
import { getUserFromRequest } from '@/lib/auth';
import { ensureDbInitialized, getDb, get } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    await ensureDbInitialized();

    const user = getUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    // Получаем полную информацию о пользователе из БД
    const db = await getDb();
    const userData = await get(
      db,
      'SELECT id, email, nickname, first_name, last_name, balance FROM users WHERE id = ?',
      [user.id]
    );
    db.close();

    if (!userData) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    // Возвращаем только необходимые данные пользователя
    return NextResponse.json({
      user: {
        id: userData.id,
        email: userData.email,
        nickname: userData.nickname,
        firstName: userData.first_name,
        lastName: userData.last_name,
        balance: userData.balance || 0,
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json({ user: null }, { status: 200 });
  }
}
