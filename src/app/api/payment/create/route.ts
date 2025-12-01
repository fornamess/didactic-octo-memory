import { getUserFromRequest } from '@/lib/auth';
import { BASE_URL, BITBANKER_API_KEY, BITBANKER_API_URL } from '@/lib/config';
import { createBalanceTransaction, ensureDbInitialized } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    await ensureDbInitialized();

    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const { amount } = await request.json();

    if (!amount || amount < 1) {
      return NextResponse.json({ error: 'Минимальная сумма пополнения: 1 Койн' }, { status: 400 });
    }

    let invoiceId: string;
    let invoiceUrl: string;

    // Проверяем наличие API ключа Bitbanker
    if (BITBANKER_API_KEY) {
      try {
        // Реальная интеграция с Bitbanker API
        const bitbankerResponse = await fetch(`${BITBANKER_API_URL}/invoices`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${BITBANKER_API_KEY}`,
          },
          body: JSON.stringify({
            amount: amount,
            currency: 'USD',
            callback_url: `${BASE_URL}/api/payment/callback`,
            success_url: `${BASE_URL}/profile?payment=success`,
            cancel_url: `${BASE_URL}/profile?payment=cancel`,
            description: `Пополнение баланса на ${amount} Койнов`,
            metadata: {
              user_id: user.id,
              user_email: user.email,
            },
          }),
        });

        if (!bitbankerResponse.ok) {
          const errorData = await bitbankerResponse.json().catch(() => ({}));
          console.error('Bitbanker API error:', errorData);
          throw new Error('Bitbanker API error');
        }

        const invoiceData = await bitbankerResponse.json();
        invoiceId = invoiceData.invoice_id || invoiceData.id;
        invoiceUrl = invoiceData.payment_url || invoiceData.url;

        if (!invoiceId || !invoiceUrl) {
          throw new Error('Invalid Bitbanker response');
        }
      } catch (apiError) {
        console.error('Bitbanker integration error:', apiError);
        return NextResponse.json(
          { error: 'Ошибка платёжной системы. Попробуйте позже.' },
          { status: 503 }
        );
      }
    } else {
      // Демо-режим (без реальных платежей)
      console.warn('BITBANKER_API_KEY not configured - using demo mode');
      invoiceId = `demo_${Date.now()}_${user.id}`;
      invoiceUrl = `${BASE_URL}/profile?payment=demo&amount=${amount}&invoice=${invoiceId}`;
    }

    // Создаём транзакцию в БД
    await createBalanceTransaction(user.id, amount, 'topup', invoiceId, invoiceUrl);

    return NextResponse.json({
      success: true,
      invoiceId,
      invoiceUrl,
      amount,
      message: 'Платёжная ссылка создана. После оплаты баланс будет пополнен автоматически.',
      isDemoMode: !BITBANKER_API_KEY,
    });
  } catch (error) {
    console.error('Create payment error:', error);
    return NextResponse.json({ error: 'Ошибка создания платежа' }, { status: 500 });
  }
}
