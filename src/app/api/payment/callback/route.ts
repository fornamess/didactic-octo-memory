import { BITBANKER_SECRET } from '@/lib/config';
import {
  completeBalanceTransaction,
  ensureDbInitialized,
  getBalanceTransactionByInvoiceId,
  updateUserBalance,
} from '@/lib/db';
import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

// Верификация подписи от Bitbanker
function verifyBitbankerSignature(body: string, signature: string | null, secret: string): boolean {
  if (!signature || !secret) {
    return false;
  }

  try {
    const expectedSignature = crypto.createHmac('sha256', secret).update(body).digest('hex');

    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureDbInitialized();

    const bodyText = await request.text();
    let body: any;

    try {
      body = JSON.parse(bodyText);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    // Верификация подписи от Bitbanker (если секрет настроен)
    if (BITBANKER_SECRET) {
      const signature = request.headers.get('X-Bitbanker-Signature');
      if (!verifyBitbankerSignature(bodyText, signature, BITBANKER_SECRET)) {
        console.error('Invalid Bitbanker signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const { invoice_id, status, amount } = body;

    if (!invoice_id || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Только обрабатываем успешные платежи
    if (status !== 'paid' && status !== 'completed' && status !== 'success') {
      console.log(`Payment ${invoice_id} status: ${status} - skipping`);
      return NextResponse.json({ success: true, message: 'Status not completed' });
    }

    // Находим транзакцию
    const transaction = await getBalanceTransactionByInvoiceId(invoice_id);

    if (!transaction) {
      console.error(`Transaction not found: ${invoice_id}`);
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    // Проверяем, что транзакция ещё не обработана
    if (transaction.status === 'completed') {
      console.log(`Transaction ${invoice_id} already processed`);
      return NextResponse.json({ success: true, message: 'Already processed' });
    }

    // Обновляем статус транзакции
    await completeBalanceTransaction(transaction.id);

    // Пополняем баланс пользователя
    await updateUserBalance(transaction.user_id, transaction.amount);

    console.log(
      `Payment completed: user ${transaction.user_id}, amount ${transaction.amount} Coins`
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Payment callback error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET для проверки статуса эндпоинта
export async function GET() {
  return NextResponse.json({
    status: 'Callback endpoint active',
    timestamp: new Date().toISOString(),
  });
}
