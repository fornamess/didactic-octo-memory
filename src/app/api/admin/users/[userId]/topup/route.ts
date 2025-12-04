import { getUserFromRequest } from '@/lib/auth';
import { isAdmin } from '@/lib/config';
import { ensureDbInitialized, getUserById, updateUserBalance, createBalanceTransaction } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
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
    const { amount } = await request.json();

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ error: 'Некорректная сумма' }, { status: 400 });
    }

    const targetUser = await getUserById(Number(userId));
    if (!targetUser) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
    }

    // Создаем транзакцию пополнения
    await createBalanceTransaction(
      Number(userId),
      amount,
      'admin_topup',
      undefined,
      undefined
    );

    // Пополняем баланс
    await updateUserBalance(Number(userId), amount);

    // Отмечаем транзакцию как завершенную
    const { getDb, all, run } = await import('@/lib/db');
    const db = await getDb();
    const transactions = await all(
      db,
      'SELECT id FROM balance_transactions WHERE user_id = ? AND type = ? AND status = ? ORDER BY id DESC LIMIT 1',
      [Number(userId), 'admin_topup', 'pending']
    );
    if (transactions.length > 0) {
      await run(
        db,
        'UPDATE balance_transactions SET status = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?',
        ['completed', transactions[0].id]
      );
    }
    db.close();

    return NextResponse.json({ success: true, message: 'Баланс успешно пополнен' });
  } catch (error) {
    console.error('Topup error:', error);
    return NextResponse.json({ error: 'Ошибка пополнения баланса' }, { status: 500 });
  }
}
