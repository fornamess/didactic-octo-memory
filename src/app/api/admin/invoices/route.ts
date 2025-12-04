import { getUserFromRequest } from '@/lib/auth';
import { isAdmin } from '@/lib/config';
import { ensureDbInitialized, getAllTransactionsAdmin } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    await ensureDbInitialized();

    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    if (!isAdmin(user.email)) {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const status = (searchParams.get('status') as 'all' | 'completed' | 'pending') || 'all';
    const nickname = searchParams.get('nickname') || undefined;

    const invoices = await getAllTransactionsAdmin(startDate, endDate, status, nickname);

    return NextResponse.json({ success: true, invoices });
  } catch (error) {
    console.error('Get invoices error:', error);
    return NextResponse.json({ error: 'Ошибка получения инвойсов' }, { status: 500 });
  }
}
