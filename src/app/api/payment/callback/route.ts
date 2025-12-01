import { NextRequest, NextResponse } from 'next/server';
import { updateUserBalance, initDb } from '@/lib/db';
import sqlite3 from 'sqlite3';
import path from 'path';

// Callback от Bitbanker для подтверждения оплаты
// Этот эндпоинт вызывается Bitbanker после успешной оплаты

const DB_PATH = path.join(process.cwd(), 'database.db');

function getDb(): Promise<sqlite3.Database> {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) reject(err);
      else resolve(db);
    });
  });
}

function run(db: sqlite3.Database, sql: string, params: any[] = []): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve();
    });
  });
}

function get(db: sqlite3.Database, sql: string, params: any[] = []): Promise<any> {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

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

    const body = await request.json();

    // TODO: Верификация подписи от Bitbanker
    // const signature = request.headers.get('X-Bitbanker-Signature');
    // if (!verifySignature(body, signature)) {
    //   return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    // }

    const { invoice_id, status, amount } = body;

    if (!invoice_id || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Только обрабатываем успешные платежи
    if (status !== 'paid' && status !== 'completed') {
      return NextResponse.json({ success: true, message: 'Status not completed' });
    }

    const db = await getDb();

    // Находим транзакцию
    const transaction = await get(
      db,
      'SELECT * FROM balance_transactions WHERE invoice_id = ?',
      [invoice_id]
    );

    if (!transaction) {
      db.close();
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    // Проверяем, что транзакция ещё не обработана
    if (transaction.status === 'completed') {
      db.close();
      return NextResponse.json({ success: true, message: 'Already processed' });
    }

    // Обновляем статус транзакции
    await run(
      db,
      'UPDATE balance_transactions SET status = ?, completed_at = ? WHERE id = ?',
      ['completed', new Date().toISOString(), transaction.id]
    );

    // Пополняем баланс пользователя
    await run(
      db,
      'UPDATE users SET balance = balance + ? WHERE id = ?',
      [transaction.amount, transaction.user_id]
    );

    db.close();

    console.log(`Payment completed: user ${transaction.user_id}, amount ${transaction.amount}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Payment callback error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET для проверки статуса (опционально)
export async function GET(request: NextRequest) {
  return NextResponse.json({ status: 'Callback endpoint active' });
}
