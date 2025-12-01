import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { createBalanceTransaction, initDb } from '@/lib/db';

// Bitbanker API (заглушка - нужно заменить на реальный API)
// Документация: https://bitbanker.org/

let dbInitPromise: Promise<void> | null = null;
function ensureDbInitialized() {
  if (!dbInitPromise) {
    dbInitPromise = initDb().catch((err) => {
      console.error('DB init error:', err);
      dbInitPromise = null;
    });
  }
  return dbInitPromise;
}

export async function POST(request: NextRequest) {
  try {
    await ensureDbInitialized();

    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const { amount } = await request.json();

    if (!amount || amount < 1) {
      return NextResponse.json(
        { error: 'Минимальная сумма пополнения: 1 Койн' },
        { status: 400 }
      );
    }

    // TODO: Интеграция с Bitbanker API
    // Пример запроса к Bitbanker (нужно заменить на реальные данные):
    // const bitbankerResponse = await fetch('https://api.bitbanker.org/v1/invoices', {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'Authorization': `Bearer ${process.env.BITBANKER_API_KEY}`,
    //   },
    //   body: JSON.stringify({
    //     amount: amount,
    //     currency: 'USD',
    //     callback_url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/payment/callback`,
    //     success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/profile?payment=success`,
    //     cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/profile?payment=cancel`,
    //   }),
    // });
    // const invoiceData = await bitbankerResponse.json();

    // Заглушка для демо
    const invoiceId = `demo_${Date.now()}`;
    const invoiceUrl = `https://bitbanker.org/demo-payment?amount=${amount}`;

    // Создаём транзакцию в БД
    await createBalanceTransaction(
      user.id,
      amount,
      'topup',
      invoiceId,
      invoiceUrl
    );

    return NextResponse.json({
      success: true,
      invoiceId,
      invoiceUrl,
      amount,
      message: 'Платёжная ссылка создана. После оплаты баланс будет пополнен автоматически.',
    });
  } catch (error) {
    console.error('Create payment error:', error);
    return NextResponse.json(
      { error: 'Ошибка создания платежа' },
      { status: 500 }
    );
  }
}
