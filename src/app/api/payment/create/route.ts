import { getUserFromRequest } from '@/lib/auth';
import {
  BASE_URL,
  BITBANKER_API_KEY,
  BITBANKER_API_URL,
  BITBANKER_PAYMENT_CURRENCIES,
  BITBANKER_SECRET,
  BitbankerCurrency,
} from '@/lib/config';
import { createBalanceTransaction, ensureDbInitialized, getUserById } from '@/lib/db';
import { checkRateLimit, paymentRateLimit } from '@/lib/rate-limit';
import type { BitbankerInvoiceResponse } from '@/lib/types';
import { CreatePaymentSchema, validateRequest } from '@/lib/validation';
import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

// Генерация подписи для Bitbanker API
// sign = hmac(currency + amount + header + description, api_key, sha256)
// Согласно документации Bitbanker, используется api_key, а не api_secret
function generateBitbankerSign(
  currency: string,
  amount: number,
  header: string,
  description: string,
  apiKey: string
): string {
  // Конвертируем amount в строку без десятичных знаков, если это целое число
  const amountStr = Number.isInteger(amount) ? amount.toString() : amount.toFixed(2);
  const signData = `${currency}${amountStr}${header}${description}`;
  return crypto.createHmac('sha256', apiKey).update(signData).digest('hex');
}

export async function POST(request: NextRequest) {
  try {
    await ensureDbInitialized();

    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    // Rate limiting (SEC-010)
    const identifier = `${user.id}_${
      request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'anonymous'
    }`;
    const rateLimitResult = await checkRateLimit(paymentRateLimit, identifier);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Слишком много запросов на создание платежей. Попробуйте позже.' },
        { status: 429 }
      );
    }

    const body = await request.json();

    // Валидация с помощью Zod
    const validation = validateRequest(CreatePaymentSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { amount, paymentCurrency } = validation.data;

    // Получаем полные данные пользователя для имени и фамилии
    const userData = await getUserById(user.id);
    const payerName = userData
      ? `${userData.first_name} ${userData.last_name}`.trim() || user.email
      : user.email;

    // Валидация выбранной криптовалюты
    let selectedCurrencies: BitbankerCurrency[] = ['BTC', 'USDT'];
    if (paymentCurrency) {
      if (Array.isArray(paymentCurrency)) {
        selectedCurrencies = paymentCurrency.filter((c: string) =>
          BITBANKER_PAYMENT_CURRENCIES.includes(c as BitbankerCurrency)
        ) as BitbankerCurrency[];
      } else if (BITBANKER_PAYMENT_CURRENCIES.includes(paymentCurrency as BitbankerCurrency)) {
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
        const description =
          "Payment for online platform services (top-up of the user's internal account balance)";

        // Генерируем подпись
        // Согласно документации Bitbanker, подпись формируется как:
        // hmac(currency + amount + header + description, api_key, sha256)
        const sign = generateBitbankerSign(
          currency,
          amount,
          header,
          description,
          BITBANKER_API_KEY
        );

        // Убрано логирование чувствительных данных (SEC-008)

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
        console.log('Bitbanker response status:', bitbankerResponse.status);
        console.log('Bitbanker response:', responseText);

        // Проверяем статус ответа
        if (!bitbankerResponse.ok) {
          if (bitbankerResponse.status === 401) {
            console.error(
              'Bitbanker API: Unauthorized - проверьте BITBANKER_API_KEY и BITBANKER_SECRET'
            );
            throw new Error('Ошибка авторизации в платёжной системе. Обратитесь к администратору.');
          }
          throw new Error(`Bitbanker API error: ${bitbankerResponse.status} ${responseText}`);
        }

        let invoiceData: BitbankerInvoiceResponse;
        try {
          invoiceData = JSON.parse(responseText) as BitbankerInvoiceResponse;
        } catch {
          console.error('Failed to parse Bitbanker response:', responseText);
          throw new Error('Неверный ответ от платёжной системы');
        }

        if (invoiceData.result !== 'success') {
          console.error('Bitbanker API error:', invoiceData);
          const errorMessage =
            invoiceData.message || invoiceData.code || 'Ошибка платёжной системы';
          throw new Error(errorMessage);
        }

        invoiceId = invoiceData.id || '';
        invoiceUrl = invoiceData.link || '';

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
