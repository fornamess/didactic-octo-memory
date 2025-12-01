import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { initDb } from '@/lib/db';
import sqlite3 from 'sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'database.db');
const ADMIN_EMAILS = ['admin@example.com'];

function getDb(): Promise<sqlite3.Database> {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) reject(err);
      else resolve(db);
    });
  });
}

function all(db: sqlite3.Database, sql: string, params: any[] = []): Promise<any[]> {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    await ensureDbInitialized();

    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const isAdmin = ADMIN_EMAILS.includes(user.email) || user.email.endsWith('@admin.com');
    if (!isAdmin) {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
    }

    const { userId } = await params;
    const db = await getDb();

    const transactions = await all(
      db,
      `SELECT * FROM balance_transactions
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [userId]
    );

    db.close();

    return NextResponse.json({ success: true, transactions });
  } catch (error) {
    console.error('Get user transactions error:', error);
    return NextResponse.json({ error: 'Ошибка получения транзакций' }, { status: 500 });
  }
}
