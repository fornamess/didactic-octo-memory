import { getUserFromRequest } from '@/lib/auth';
import { ensureDbInitialized, getUserBalanceTransactions } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    await ensureDbInitialized();

    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const transactions = await getUserBalanceTransactions(user.id);

    return NextResponse.json({
      success: true,
      transactions,
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    return NextResponse.json({ error: 'Ошибка при получении транзакций' }, { status: 500 });
  }
}
