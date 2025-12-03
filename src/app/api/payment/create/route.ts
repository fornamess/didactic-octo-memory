import { getUserFromRequest } from '@/lib/auth';
import {
  BASE_URL,
  BITBANKER_API_KEY,
  BITBANKER_SECRET,
  BITBANKER_API_URL,
  BITBANKER_PAYMENT_CURRENCIES,
  BitbankerCurrency,
} from '@/lib/config';
import { createBalanceTransaction, ensureDbInitialized, getUserById } from '@/lib/db';
import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

// Генерация подписи для Bitbanker API
// sign = hmac(currency + amount + header + description, api_key, sha256)
function generateBitbankerSign(
  currency: string,
  amount: number,
  header: string,
  description: string,
  apiSecret: string
): string {
  const signData = `${currency}${amount}${header}${description}`;
  return crypto.createHmac('sha256', apiSecret).update(signData).digest('hex');
}

export async function POST(request: NextRequest) {
  try {
    await ensureDbInitialized();

    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const body = await request.json();
    const { amount, paymentCurrency } = body;

    if (!amount || amount < 1) {
      return NextResponse.json({ error: 'Минимальная сумма пополнения: 1 Койн' }, { status: 400 });
    }

    // Получаем полные данные пользователя для имени и фамилии
    const userData = await getUserById(user.id);
    const payerName = userData
      ? `${userData.first_name} ${userData.last_name}`.trim() || user.email
      : user.email;

    // Валидация выбранной криптовалюты - только BTC и USDT
    let selectedCurrencies: BitbankerCurrency[] = ['BTC', 'USDT'];
    if (paymentCurrency) {
      if (Array.isArray(paymentCurrency)) {
        selectedCurrencies = paymentCurrency.filter((c: string) =>
          ['BTC', 'USDT'].includes(c)
        ) as BitbankerCurrency[];
      } else if (['BTC', 'USDT'].includes(paymentCurrency)) {
        selectedCurrencies = [paymentCurrency as BitbankerCurrency];
      }
    }

    if (selectedCurrencies.length === 0) {
      selectedCurrencies = ['BTC', 'USDT'];
    }

    let invoiceId: string;
    let invoiceUrl: string;

    // Проверяем наличие API ключа Bitbanker
    if (BITBANKER_API_KEY && BITBANKER_SECRET) {
      try {
        // Данные для счёта согласно требованиям
        const currency = 'USDT'; // Валюта счёта
        const header = 'Prizmabox';
        const description = "Payment for online platform services (top-up of the user's internal account balance)";

        // Генерируем подпись используя API Secret
        const sign = generateBitbankerSign(
          currency,
          amount,
          header,
          description,
          BITBANKER_SECRET
        );

        const payload = {
          payment_currencies: selectedCurrencies, // ["BTC", "USDT"]
          currency: currency, // "USDT"
          amount: amount,
          description: description, // "Payment for online platform services (top-up of the user's internal account balance)"
          language: 'en', // "en"
          header: header, // "Prizmabox"
          payer: payerName, // Имя и фамилия из личного кабинета
          is_convert_payments: false, // false
          data: {
            user_id: user.id,
            user_email: user.email,
            coins: amount,
          },
          sign: sign, // hmac(currency + amount + header + description, api_secret, sha256)
        };

        console.log('Creating Bitbanker invoice:', {
          ...payload,
          sign: sign.substring(0, 10) + '...',
        });

        const bitbankerResponse = await fetch(`${BITBANKER_API_URL}/invoices`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-KEY': BITBANKER_API_KEY,
          },
          body: JSON.stringify(payload),
        });

        const responseText = await bitbankerResponse.text();
        console.log('Bitbanker response:', responseText);

        let invoiceData;
        try {
          invoiceData = JSON.parse(responseText);
        } catch {
          console.error('Failed to parse Bitbanker response:', responseText);
          throw new Error('Invalid Bitbanker response');
        }

        if (invoiceData.result !== 'success') {
          console.error('Bitbanker API error:', invoiceData);
          throw new Error(invoiceData.message || 'Bitbanker API error');
        }

        invoiceId = invoiceData.id;
        invoiceUrl = invoiceData.link;

        if (!invoiceId || !invoiceUrl) {
          console.error('Missing invoice data:', invoiceData);
          throw new Error('Invalid Bitbanker response - missing id or link');
        }

        console.log('Invoice created:', { invoiceId, invoiceUrl });
      } catch (apiError) {
        console.error('Bitbanker integration error:', apiError);
        return NextResponse.json(
          {
            error:
              'Ошибка платёжной системы. Попробуйте позже. ' +
              (apiError instanceof Error ? apiError.message : ''),
          },
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
      paymentCurrencies: selectedCurrencies,
      message: 'Платёжная ссылка создана. После оплаты баланс будет пополнен автоматически.',
      isDemoMode: !BITBANKER_API_KEY,
    });
  } catch (error) {
    console.error('Create payment error:', error);
    return NextResponse.json({ error: 'Ошибка создания платежа' }, { status: 500 });
  }
}

// GET для получения списка доступных криптовалют
export async function GET() {
  return NextResponse.json({
    currencies: BITBANKER_PAYMENT_CURRENCIES,
    defaultCurrency: 'USDT',
  });
}
