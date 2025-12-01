import { getUserFromRequest } from '@/lib/auth';
import { ensureDbInitialized, getUserBalance } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    await ensureDbInitialized();

    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const balance = await getUserBalance(user.id);

    return NextResponse.json({
      success: true,
      balance,
    });
  } catch (error) {
    console.error('Get balance error:', error);
    return NextResponse.json({ error: 'Ошибка при получении баланса' }, { status: 500 });
  }
}
