import { getUserFromRequest } from '@/lib/auth';
import { isAdmin } from '@/lib/config';
import {
  completeBalanceTransaction,
  ensureDbInitialized,
  getBalanceTransactionByInvoiceId,
  updateUserBalance,
} from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
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

    const { invoiceId } = await params;

    // Находим транзакцию по invoice_id
    const transaction = await getBalanceTransactionByInvoiceId(invoiceId);

    if (!transaction) {
      return NextResponse.json({ error: 'Транзакция не найдена' }, { status: 404 });
    }

    // Проверяем, что транзакция ещё не обработана
    if (transaction.status === 'completed') {
      return NextResponse.json({
        success: true,
        message: 'Транзакция уже обработана',
        transaction
      });
    }

    // Определяем сумму пополнения
    const coinsToAdd = transaction.amount;

    // Обновляем статус транзакции
    await completeBalanceTransaction(transaction.id);

    // Пополняем баланс пользователя
    await updateUserBalance(transaction.user_id, coinsToAdd);

    console.log(
      `Manual payment completion: user ${transaction.user_id}, amount ${coinsToAdd} Coins, invoice ${invoiceId}`
    );

    return NextResponse.json({
      success: true,
      message: 'Транзакция успешно обработана',
      transaction: {
        ...transaction,
        status: 'completed',
      }
    });
  } catch (error) {
    console.error('Complete invoice error:', error);
    return NextResponse.json({ error: 'Ошибка обработки транзакции' }, { status: 500 });
  }
}
