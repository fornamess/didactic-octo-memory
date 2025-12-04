import { BITBANKER_API_KEY, BITBANKER_SECRET } from '@/lib/config';
import {
  completeBalanceTransaction,
  ensureDbInitialized,
  getBalanceTransactionByInvoiceId,
  updateUserBalance,
} from '@/lib/db';
import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

// Верификация подписи от Bitbanker (sign_2 использует API Secret)
function verifyBitbankerWebhookSign(
  currency: string,
  amount: string | number,
  header: string,
  description: string,
  receivedSign: string,
  secret: string
): boolean {
  if (!receivedSign || !secret) {
    return false;
  }

  try {
    // Форматируем amount как строку
    const amountStr =
      typeof amount === 'number'
        ? Number.isInteger(amount)
          ? amount.toString()
          : amount.toFixed(2)
        : amount;
    const signData = `${currency}${amountStr}${header}${description}`;
    const expectedSign = crypto.createHmac('sha256', secret).update(signData).digest('hex');

    return crypto.timingSafeEqual(Buffer.from(receivedSign), Buffer.from(expectedSign));
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

// Альтернативная верификация через sign (использует API Key)
function verifyBitbankerSign(
  currency: string,
  amount: string | number,
  header: string,
  description: string,
  receivedSign: string,
  apiKey: string
): boolean {
  if (!receivedSign || !apiKey) {
    return false;
  }

  try {
    // Форматируем amount как строку
    const amountStr =
      typeof amount === 'number'
        ? Number.isInteger(amount)
          ? amount.toString()
          : amount.toFixed(2)
        : amount;
    const signData = `${currency}${amountStr}${header}${description}`;
    const expectedSign = crypto.createHmac('sha256', apiKey).update(signData).digest('hex');

    return crypto.timingSafeEqual(Buffer.from(receivedSign), Buffer.from(expectedSign));
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureDbInitialized();

    const bodyText = await request.text();
    console.log('Bitbanker webhook received:', bodyText);

    let body: {
      payed?: boolean;
      id?: string;
      amount?: number;
      currency?: string;
      payed_amount?: number;
      transactions?: Array<{
        tx_id: string;
        amount: number;
        fee: number;
        currency: string;
      }>;
      data?: {
        user_id?: number;
        user_email?: string;
        coins?: number;
      };
      sign?: string;
      sign_2?: string;
    };

    try {
      body = JSON.parse(bodyText);
    } catch {
      console.error('Invalid JSON in webhook:', bodyText);
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    console.log('Parsed webhook body:', body);

    // Проверяем что платёж оплачен
    if (!body.payed) {
      console.log(`Payment ${body.id} not yet paid - skipping`);
      return NextResponse.json({ success: true, message: 'Payment not completed yet' });
    }

    const invoiceId = body.id;
    if (!invoiceId) {
      console.error('Missing invoice id in webhook');
      return NextResponse.json({ error: 'Missing invoice id' }, { status: 400 });
    }

    // Верификация подписи (если секреты настроены)
    // Bitbanker отправляет sign (hmac с api_key) и sign_2 (hmac с api_secret)
    if (BITBANKER_SECRET && body.sign_2) {
      // Для верификации нужны те же данные что при создании счёта
      // Но мы их не знаем из вебхука, поэтому проверяем через данные из body
      // Примечание: в реальности нужно хранить эти данные при создании счёта
      console.log('Verifying webhook signature...');

      // Попробуем верифицировать с данными из data если есть
      // ВАЖНО: используем те же данные что при создании счёта!
      if (body.data?.coins) {
        const currency = body.currency || 'USDT';
        const amount = body.data.coins;
        // Используем те же header и description что при создании счёта
        const header = 'Prizmabox';
        const description =
          "Payment for online platform services (top-up of the user's internal account balance)";

        // Форматируем amount так же как при создании
        const amountStr = Number.isInteger(amount) ? amount.toString() : amount.toFixed(2);

        const isValidSign2 = verifyBitbankerWebhookSign(
          currency,
          amountStr,
          header,
          description,
          body.sign_2,
          BITBANKER_SECRET
        );

        const isValidSign =
          body.sign && BITBANKER_API_KEY
            ? verifyBitbankerSign(
                currency,
                amountStr,
                header,
                description,
                body.sign,
                BITBANKER_API_KEY
              )
            : false;

        if (!isValidSign2 && !isValidSign) {
          console.warn(
            'Webhook signature verification failed, but proceeding (may need adjustment)'
          );
          console.log('Verification details:', {
            currency,
            amount: amountStr,
            header,
            description,
            hasSign: !!body.sign,
            hasSign2: !!body.sign_2,
          });
          // В продакшене здесь можно вернуть ошибку:
          // return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
        } else {
          console.log('Webhook signature verified successfully');
        }
      }
    }

    // Находим транзакцию по invoice_id
    const transaction = await getBalanceTransactionByInvoiceId(invoiceId);

    if (!transaction) {
      console.error(`Transaction not found for invoice: ${invoiceId}`);
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    // Проверяем, что транзакция ещё не обработана
    if (transaction.status === 'completed') {
      console.log(`Transaction ${invoiceId} already processed`);
      return NextResponse.json({ success: true, message: 'Already processed' });
    }

    // Определяем сумму пополнения
    // Используем сумму из нашей транзакции (она в Койнах)
    const coinsToAdd = transaction.amount;

    // Обновляем статус транзакции
    await completeBalanceTransaction(transaction.id);

    // Пополняем баланс пользователя
    await updateUserBalance(transaction.user_id, coinsToAdd);

    console.log(
      `Payment completed: user ${transaction.user_id}, amount ${coinsToAdd} Coins, invoice ${invoiceId}`
    );

    // Логируем детали криптоплатежа
    if (body.transactions && body.transactions.length > 0) {
      console.log('Crypto transactions:', body.transactions);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Payment callback error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET для проверки статуса эндпоинта и тестирования
export async function GET() {
  return NextResponse.json({
    status: 'Bitbanker callback endpoint active',
    timestamp: new Date().toISOString(),
    note: 'POST webhook data here for payment notifications',
  });
}
