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

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';

    const db = await getDb();

    const users = await all(
      db,
      `SELECT u.id, u.email, u.nickname, u.first_name, u.last_name, u.balance, u.created_at,
              (SELECT COUNT(*) FROM orders WHERE user_id = u.id) as orders_count
       FROM users u
       WHERE u.nickname LIKE ? OR u.email LIKE ?
       ORDER BY u.created_at DESC`,
      [`%${query}%`, `%${query}%`]
    );

    db.close();

    return NextResponse.json({ success: true, users });
  } catch (error) {
    console.error('Search users error:', error);
    return NextResponse.json({ error: 'Ошибка поиска' }, { status: 500 });
  }
}
