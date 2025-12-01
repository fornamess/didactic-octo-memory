import { getUserFromRequest } from '@/lib/auth';
import { isAdmin } from '@/lib/config';
import { ensureDbInitialized, getUserOrdersAdmin } from '@/lib/db';
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
    const orders = await getUserOrdersAdmin(Number(userId));

    return NextResponse.json({ success: true, orders });
  } catch (error) {
    console.error('Get user orders error:', error);
    return NextResponse.json({ error: 'Ошибка получения заказов' }, { status: 500 });
  }
}
