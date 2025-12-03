import fs from 'fs';
import path from 'path';
import sqlite3 from 'sqlite3';
import { DATABASE_PATH, VIDEO_EXPIRY_DAYS } from './config';

const DB_PATH = DATABASE_PATH.startsWith('./')
  ? path.join(process.cwd(), DATABASE_PATH.slice(2))
  : DATABASE_PATH;

// Создаём директорию для БД если её нет
const dbDir = path.dirname(DB_PATH);
if (dbDir !== '.' && !fs.existsSync(dbDir)) {
  try {
    fs.mkdirSync(dbDir, { recursive: true });
  } catch (error) {
    console.warn(`Could not create database directory ${dbDir}:`, error);
  }
}

// === Базовые функции работы с БД ===

export function getDb(): Promise<sqlite3.Database> {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve(db);
      }
    });
  });
}

export function run(
  db: sqlite3.Database,
  sql: string,
  params: any[] = []
): Promise<sqlite3.RunResult> {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) {
        reject(err);
      } else {
        resolve(this);
      }
    });
  });
}

export function get(db: sqlite3.Database, sql: string, params: any[] = []): Promise<any> {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

export function all(db: sqlite3.Database, sql: string, params: any[] = []): Promise<any[]> {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows || []);
      }
    });
  });
}

// === Singleton для инициализации БД ===

let dbInitPromise: Promise<void> | null = null;

export function ensureDbInitialized(): Promise<void> {
  if (!dbInitPromise) {
    dbInitPromise = initDb().catch((err) => {
      console.error('DB init error:', err);
      dbInitPromise = null;
      throw err;
    });
  }
  return dbInitPromise;
}

// === Инициализация базы данных ===

export async function initDb() {
  const db = await getDb();

  // Таблица пользователей
  await run(
    db,
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      nickname TEXT NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      balance REAL DEFAULT 0,
      email_verified INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`
  );

  // Таблица заказов
  await run(
    db,
    `CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      order_number TEXT UNIQUE NOT NULL,
      service_name TEXT NOT NULL,
      task_id INTEGER,
      child_name TEXT NOT NULL,
      photo1_url TEXT,
      photo1_comment TEXT,
      photo2_url TEXT,
      photo2_comment TEXT,
      video_url TEXT,
      status TEXT DEFAULT 'pending',
      status_description TEXT,
      cost REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      video_expires_at DATETIME,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`
  );

  // Таблица пополнений баланса
  await run(
    db,
    `CREATE TABLE IF NOT EXISTS balance_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      type TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      invoice_id TEXT,
      invoice_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`
  );

  // Таблица настроек
  await run(
    db,
    `CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`
  );

  // Таблица очереди генерации видео
  await run(
    db,
    `CREATE TABLE IF NOT EXISTS video_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      task_type TEXT NOT NULL,
      task_id INTEGER,
      status TEXT DEFAULT 'pending',
      priority INTEGER DEFAULT 0,
      error_message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    )`
  );

  // Таблица для хранения универсальных видео (intro/outro)
  await run(
    db,
    `CREATE TABLE IF NOT EXISTS universal_videos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      video_type TEXT UNIQUE NOT NULL,
      task_id INTEGER,
      status TEXT DEFAULT 'pending',
      video_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`
  );

  // Индексы для быстрого поиска
  await run(db, `CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id)`);
  await run(db, `CREATE INDEX IF NOT EXISTS idx_orders_task_id ON orders(task_id)`);
  await run(db, `CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC)`);
  await run(db, `CREATE INDEX IF NOT EXISTS idx_balance_user_id ON balance_transactions(user_id)`);
  await run(db, `CREATE INDEX IF NOT EXISTS idx_balance_status ON balance_transactions(status)`);
  await run(db, `CREATE INDEX IF NOT EXISTS idx_video_queue_order_id ON video_queue(order_id)`);
  await run(db, `CREATE INDEX IF NOT EXISTS idx_video_queue_status ON video_queue(status)`);

  // Инициализация настроек по умолчанию
  await run(
    db,
    `INSERT OR IGNORE INTO settings (key, value) VALUES ('email_verification_required', '0')`
  );
  await run(
    db,
    `INSERT OR IGNORE INTO settings (key, value) VALUES ('user_agreement_text', 'Текст соглашения...')`
  );

  db.close();
  console.log('Database initialized successfully');
}

// === Функции для работы с пользователями ===

export async function getUserByEmail(email: string) {
  const db = await getDb();
  const user = await get(db, 'SELECT * FROM users WHERE email = ?', [email]);
  db.close();
  return user;
}

export async function getUserById(id: number) {
  const db = await getDb();
  const user = await get(
    db,
    'SELECT id, email, nickname, first_name, last_name, balance, email_verified, created_at FROM users WHERE id = ?',
    [id]
  );
  db.close();
  return user;
}

export async function createUser(
  email: string,
  password: string,
  nickname: string,
  firstName: string,
  lastName: string
) {
  const db = await getDb();
  const result = await run(
    db,
    'INSERT INTO users (email, password, nickname, first_name, last_name) VALUES (?, ?, ?, ?, ?)',
    [email, password, nickname, firstName, lastName]
  );
  db.close();
  return result.lastID;
}

// === Функции для работы с заказами ===

function generateOrderNumber(): string {
  return `ORD${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

export async function createOrder(
  userId: number,
  childName: string,
  photo1Url: string,
  photo1Comment: string,
  photo2Url: string,
  photo2Comment: string,
  cost: number
) {
  const db = await getDb();
  const orderNumber = generateOrderNumber();
  const result = await run(
    db,
    `INSERT INTO orders (user_id, order_number, service_name, child_name, photo1_url, photo1_comment, photo2_url, photo2_comment, cost, status)
     VALUES (?, ?, 'Создание Видео Дед Мороз', ?, ?, ?, ?, ?, ?, 'pending')`,
    [userId, orderNumber, childName, photo1Url, photo1Comment, photo2Url, photo2Comment, cost]
  );
  db.close();
  return { orderId: result.lastID, orderNumber };
}

export async function updateOrderTaskId(orderId: number, taskId: number) {
  const db = await getDb();
  await run(db, 'UPDATE orders SET task_id = ? WHERE id = ?', [taskId, orderId]);
  db.close();
}

export async function updateOrderStatus(
  taskId: number,
  status: string,
  statusDescription: string,
  videoUrl?: string,
  errorMessage?: string
) {
  const db = await getDb();
  const completedAt = status === 'completed' ? new Date().toISOString() : null;
  const expiresAt = videoUrl
    ? new Date(Date.now() + VIDEO_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString()
    : null;

  if (videoUrl) {
    await run(
      db,
      `UPDATE orders
       SET status = ?, status_description = ?, video_url = ?, completed_at = ?, video_expires_at = ?
       WHERE task_id = ?`,
      [status, statusDescription, videoUrl, completedAt, expiresAt, taskId]
    );
  } else {
    await run(
      db,
      `UPDATE orders
       SET status = ?, status_description = ?, completed_at = ?
       WHERE task_id = ?`,
      [status, statusDescription, completedAt, taskId]
    );
  }
  db.close();
}

export async function getUserOrders(userId: number, limit: number = 50) {
  const db = await getDb();
  const orders = await all(
    db,
    `SELECT id, order_number, service_name, task_id, child_name, status, status_description, created_at, completed_at, video_url
     FROM orders
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT ?`,
    [userId, limit]
  );
  db.close();
  return orders;
}

export async function getOrderByTaskId(taskId: number) {
  const db = await getDb();
  const order = await get(db, 'SELECT * FROM orders WHERE task_id = ?', [taskId]);
  db.close();
  return order;
}

export async function getOrderById(orderId: number) {
  const db = await getDb();
  const order = await get(db, 'SELECT * FROM orders WHERE id = ?', [orderId]);
  db.close();
  return order;
}

// === Функции для работы с балансом ===

export async function getUserBalance(userId: number): Promise<number> {
  const db = await getDb();
  const user = await get(db, 'SELECT balance FROM users WHERE id = ?', [userId]);
  db.close();
  return user?.balance || 0;
}

export async function updateUserBalance(userId: number, amount: number) {
  const db = await getDb();
  await run(db, 'UPDATE users SET balance = balance + ? WHERE id = ?', [amount, userId]);
  db.close();
}

export async function createBalanceTransaction(
  userId: number,
  amount: number,
  type: string,
  invoiceId?: string,
  invoiceUrl?: string
) {
  const db = await getDb();
  const result = await run(
    db,
    `INSERT INTO balance_transactions (user_id, amount, type, invoice_id, invoice_url, status)
     VALUES (?, ?, ?, ?, ?, 'pending')`,
    [userId, amount, type, invoiceId || null, invoiceUrl || null]
  );
  db.close();
  return result.lastID;
}

export async function getUserBalanceTransactions(userId: number) {
  const db = await getDb();
  const transactions = await all(
    db,
    `SELECT * FROM balance_transactions
     WHERE user_id = ?
     ORDER BY created_at DESC`,
    [userId]
  );
  db.close();
  return transactions;
}

export async function getBalanceTransactionByInvoiceId(invoiceId: string) {
  const db = await getDb();
  const transaction = await get(db, 'SELECT * FROM balance_transactions WHERE invoice_id = ?', [
    invoiceId,
  ]);
  db.close();
  return transaction;
}

export async function completeBalanceTransaction(transactionId: number) {
  const db = await getDb();
  await run(db, 'UPDATE balance_transactions SET status = ?, completed_at = ? WHERE id = ?', [
    'completed',
    new Date().toISOString(),
    transactionId,
  ]);
  db.close();
}

// === Функции для работы с настройками ===

export async function getSetting(key: string): Promise<string | null> {
  const db = await getDb();
  const setting = await get(db, 'SELECT value FROM settings WHERE key = ?', [key]);
  db.close();
  return setting?.value || null;
}

export async function setSetting(key: string, value: string) {
  const db = await getDb();
  await run(
    db,
    'INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
    [key, value]
  );
  db.close();
}

// === Функции для работы с очередью видео ===

export async function addToQueue(
  orderId: number,
  taskType: 'intro' | 'outro' | 'personal',
  priority: number = 0
): Promise<number> {
  const db = await getDb();
  const result = await run(
    db,
    `INSERT INTO video_queue (order_id, task_type, priority, status)
     VALUES (?, ?, ?, 'pending')`,
    [orderId, taskType, priority]
  );
  db.close();
  return result.lastID as number;
}

export async function getNextQueueTask(orderId: number): Promise<{
  id: number;
  order_id: number;
  task_type: 'intro' | 'outro' | 'personal';
  task_id: number | null;
  status: string;
  priority: number;
} | null> {
  const db = await getDb();
  const task = await get(
    db,
    `SELECT * FROM video_queue
     WHERE order_id = ? AND status = 'pending'
     ORDER BY priority DESC, id ASC
     LIMIT 1`,
    [orderId]
  );
  db.close();
  return task || null;
}

export async function getCurrentQueueTask(orderId: number): Promise<{
  id: number;
  order_id: number;
  task_type: 'intro' | 'outro' | 'personal';
  task_id: number | null;
  status: string;
  priority: number;
} | null> {
  const db = await getDb();
  const task = await get(
    db,
    `SELECT * FROM video_queue
     WHERE order_id = ? AND status = 'processing'
     LIMIT 1`,
    [orderId]
  );
  db.close();
  return task || null;
}

export async function updateQueueTaskStatus(
  queueId: number,
  status: 'pending' | 'processing' | 'completed' | 'failed',
  taskId?: number,
  errorMessage?: string
): Promise<void> {
  const db = await getDb();
  if (taskId !== undefined) {
    await run(
      db,
      `UPDATE video_queue SET status = ?, task_id = ?, error_message = ? WHERE id = ?`,
      [status, taskId, errorMessage || null, queueId]
    );
  } else {
    await run(db, `UPDATE video_queue SET status = ?, error_message = ? WHERE id = ?`, [
      status,
      errorMessage || null,
      queueId,
    ]);
  }
  db.close();
}

export async function getQueueProgress(orderId: number): Promise<{
  totalTasks: number;
  completedTasks: number;
  currentTask: {
    id: number;
    task_type: string;
    task_id: number | null;
    status: string;
  } | null;
  allTasks: Array<{
    id: number;
    task_type: string;
    task_id: number | null;
    status: string;
  }>;
}> {
  const db = await getDb();
  const allTasks = await all(
    db,
    `SELECT id, task_type, task_id, status FROM video_queue
     WHERE order_id = ?
     ORDER BY priority DESC, id ASC`,
    [orderId]
  );

  const completedTasks = allTasks.filter((t) => t.status === 'completed').length;
  const currentTask = allTasks.find((t) => t.status === 'processing') || null;

  db.close();
  return {
    totalTasks: allTasks.length,
    completedTasks,
    currentTask,
    allTasks,
  };
}

export async function getQueueTasks(orderId: number): Promise<
  Array<{
    id: number;
    order_id: number;
    task_type: string;
    task_id: number | null;
    status: string;
    priority: number;
    error_message: string | null;
  }>
> {
  const db = await getDb();
  const tasks = await all(
    db,
    `SELECT * FROM video_queue WHERE order_id = ? ORDER BY priority DESC, id ASC`,
    [orderId]
  );
  db.close();
  return tasks;
}

// === Функции для работы с универсальными видео ===

export async function setUniversalVideo(
  videoType: 'intro' | 'outro',
  taskId: number,
  status: 'pending' | 'processing' | 'completed' | 'failed' = 'pending'
): Promise<void> {
  const db = await getDb();
  await run(
    db,
    `INSERT OR REPLACE INTO universal_videos (video_type, task_id, status, updated_at)
     VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
    [videoType, taskId, status]
  );
  db.close();
}

export async function getUniversalVideo(videoType: 'intro' | 'outro'): Promise<{
  task_id: number;
  status: string;
  video_url: string | null;
  created_at: string;
  updated_at: string;
} | null> {
  const db = await getDb();
  const video = await get(
    db,
    `SELECT task_id, status, video_url, created_at, updated_at FROM universal_videos WHERE video_type = ?`,
    [videoType]
  );
  db.close();
  return video || null;
}

export async function updateUniversalVideoStatus(
  videoType: 'intro' | 'outro',
  status: 'pending' | 'processing' | 'completed' | 'failed',
  videoUrl?: string
): Promise<void> {
  const db = await getDb();
  if (videoUrl) {
    await run(
      db,
      `UPDATE universal_videos SET status = ?, video_url = ?, updated_at = CURRENT_TIMESTAMP WHERE video_type = ?`,
      [status, videoUrl, videoType]
    );
  } else {
    await run(
      db,
      `UPDATE universal_videos SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE video_type = ?`,
      [status, videoType]
    );
  }
  db.close();
}

// === Функции для админки ===

export async function getAllUsers() {
  const db = await getDb();
  const users = await all(
    db,
    `SELECT u.id, u.email, u.nickname, u.first_name, u.last_name, u.balance, u.created_at,
            (SELECT COUNT(*) FROM orders WHERE user_id = u.id) as orders_count
     FROM users u
     ORDER BY u.created_at DESC`
  );
  db.close();
  return users;
}

export async function searchUsers(query: string) {
  const db = await getDb();
  const searchPattern = `%${query}%`;
  const users = await all(
    db,
    `SELECT u.id, u.email, u.nickname, u.first_name, u.last_name, u.balance, u.created_at,
            (SELECT COUNT(*) FROM orders WHERE user_id = u.id) as orders_count
     FROM users u
     WHERE u.email LIKE ? OR u.nickname LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ?
     ORDER BY u.created_at DESC`,
    [searchPattern, searchPattern, searchPattern, searchPattern]
  );
  db.close();
  return users;
}

export async function getUserOrdersAdmin(userId: number) {
  const db = await getDb();
  const orders = await all(
    db,
    `SELECT id, order_number, service_name, status, created_at, video_url
     FROM orders WHERE user_id = ? ORDER BY created_at DESC`,
    [userId]
  );
  db.close();
  return orders;
}

export async function getUserTransactionsAdmin(userId: number) {
  const db = await getDb();
  const transactions = await all(
    db,
    `SELECT * FROM balance_transactions WHERE user_id = ? ORDER BY created_at DESC`,
    [userId]
  );
  db.close();
  return transactions;
}

// Получить все транзакции с информацией о пользователях для админки
export async function getAllTransactionsAdmin(
  startDate?: string,
  endDate?: string,
  status?: 'all' | 'completed' | 'pending'
) {
  const db = await getDb();
  let query = `
    SELECT
      bt.id,
      bt.user_id,
      bt.amount,
      bt.type,
      bt.status,
      bt.invoice_id,
      bt.invoice_url,
      bt.created_at,
      bt.completed_at,
      u.nickname,
      u.email,
      u.first_name,
      u.last_name
    FROM balance_transactions bt
    LEFT JOIN users u ON bt.user_id = u.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (startDate) {
    query += ` AND DATE(bt.created_at) >= DATE(?)`;
    params.push(startDate);
  }

  if (endDate) {
    query += ` AND DATE(bt.created_at) <= DATE(?)`;
    params.push(endDate);
  }

  if (status && status !== 'all') {
    query += ` AND bt.status = ?`;
    params.push(status);
  }

  query += ` ORDER BY bt.created_at DESC`;

  const transactions = await all(db, query, params);
  db.close();
  return transactions;
}

// Получить все завершенные заказы с финальными видео для примеров
export async function getCompletedOrdersWithFinalVideos(): Promise<
  Array<{
    id: number;
    video_url: string;
  }>
> {
  const db = await getDb();
  const orders = await all(
    db,
    `SELECT id, video_url
     FROM orders
     WHERE status = 'completed'
       AND video_url IS NOT NULL
       AND video_url LIKE '/api/videos/stream/final/%'
     ORDER BY completed_at DESC
     LIMIT 100`,
    []
  );
  db.close();
  return orders;
}

// Получить все истекшие заказы (видео старше 7 дней)
export async function getExpiredOrders(): Promise<
  Array<{
    id: number;
    video_url: string;
    video_expires_at: string;
  }>
> {
  const db = await getDb();
  const orders = await all(
    db,
    `SELECT id, video_url, video_expires_at
     FROM orders
     WHERE video_expires_at IS NOT NULL
       AND video_expires_at < datetime('now')
       AND video_url IS NOT NULL`,
    []
  );
  db.close();
  return orders;
}

// Удалить видео из заказа (очистить video_url и video_expires_at)
export async function clearExpiredVideo(orderId: number): Promise<void> {
  const db = await getDb();
  await run(db, `UPDATE orders SET video_url = NULL, video_expires_at = NULL WHERE id = ?`, [
    orderId,
  ]);
  db.close();
}
