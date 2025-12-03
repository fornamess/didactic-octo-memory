import { getUserFromRequest } from '@/lib/auth';
import { isAdmin } from '@/lib/config';
import { ensureDbInitialized, getUserById } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    await ensureDbInitialized();

    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    if (!isAdmin(user.email)) {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
    }

    const { userId } = await params;
    const userData = await getUserById(Number(userId));

    if (!userData) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
    }

    // Получаем количество заказов
    const { getDb, all } = await import('@/lib/db');
    const dbInstance = await getDb();
    const ordersCount = await all(
      dbInstance,
      'SELECT COUNT(*) as count FROM orders WHERE user_id = ?',
      [userId]
    );
    dbInstance.close();

    return NextResponse.json({
      success: true,
      user: {
        ...userData,
        orders_count: ordersCount[0]?.count || 0,
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json({ error: 'Ошибка получения пользователя' }, { status: 500 });
  }
}
