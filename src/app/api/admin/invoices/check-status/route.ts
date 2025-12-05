import { getUserFromRequest } from '@/lib/auth';
import { BITBANKER_API_KEY, BITBANKER_API_URL, isAdmin } from '@/lib/config';
import {
  completeBalanceTransaction,
  ensureDbInitialized,
  getAllTransactionsAdmin,
  getBalanceTransactionByInvoiceId,
  updateUserBalance,
} from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    await ensureDbInitialized();

    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    if (!isAdmin(user.email)) {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
    }

    // Получаем все pending инвойсы
    const pendingInvoices = await getAllTransactionsAdmin(undefined, undefined, 'pending');

    if (pendingInvoices.length === 0) {
      return NextResponse.json({ success: true, message: 'Нет неоплаченных инвойсов', processed: 0 });
    }

    let processedCount = 0;
    const errors: string[] = [];

    // Проверяем каждый инвойс через Bitbanker API
    for (const invoice of pendingInvoices) {
      if (!invoice.invoice_id) continue;

      try {
        // Проверяем статус инвойса через Bitbanker API
        if (BITBANKER_API_KEY) {
          const response = await fetch(`${BITBANKER_API_URL}/invoices/${invoice.invoice_id}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'X-API-KEY': BITBANKER_API_KEY,
            },
          });

          if (response.ok) {
            const data = await response.json();

            // Если инвойс оплачен
            if (data.result === 'success' && data.payed === true) {
              const transaction = await getBalanceTransactionByInvoiceId(invoice.invoice_id);

              if (transaction && transaction.status !== 'completed') {
                // Обновляем статус транзакции
                await completeBalanceTransaction(transaction.id);

                // Пополняем баланс пользователя
                await updateUserBalance(transaction.user_id, transaction.amount);

                processedCount++;
                console.log(`✅ Invoice ${invoice.invoice_id} marked as paid and processed`);
              }
            }
          }
        }
      } catch (error) {
        console.error(`Error checking invoice ${invoice.invoice_id}:`, error);
        errors.push(`Ошибка проверки инвойса ${invoice.invoice_id}`);
      }
    }

    return NextResponse.json({
      success: true,
      processed: processedCount,
      total: pendingInvoices.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Check invoices status error:', error);
    return NextResponse.json({ error: 'Ошибка проверки статуса инвойсов' }, { status: 500 });
  }
}
