// Server-side функции для получения пользователя (PRF-002)
import { cookies } from 'next/headers';
import { verifyToken } from './auth';
import { ensureDbInitialized, get, getDb } from './db';

export interface ServerUser {
  id: number;
  email: string;
  nickname?: string;
  firstName?: string;
  lastName?: string;
  balance?: number;
}

// Кэш для пользователей (в памяти, только для текущего запроса)
// В Next.js каждый запрос изолирован, поэтому кэш безопасен
const userCache = new Map<string, { user: ServerUser | null; timestamp: number }>();
const CACHE_TTL = 5000; // 5 секунд кэш для баланса

export async function getServerUser(): Promise<ServerUser | null> {
  try {
    const cookieStore = await cookies();
    const tokenCookie = cookieStore.get('token');

    if (!tokenCookie?.value) {
      return null;
    }

    // Проверяем кэш
    const cacheKey = tokenCookie.value;
    const cached = userCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.user;
    }

    const payload = verifyToken(tokenCookie.value);
    if (!payload) {
      return null;
    }

    // Инициализируем БД только если нужно
    await ensureDbInitialized();

    // Получаем полную информацию о пользователе из БД
    const db = await getDb();
    const user = await get(
      db,
      'SELECT id, email, nickname, first_name, last_name, balance FROM users WHERE id = ?',
      [payload.id]
    );
    db.close();

    if (!user) {
      userCache.set(cacheKey, { user: null, timestamp: Date.now() });
      return null;
    }

    const result: ServerUser = {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      firstName: user.first_name,
      lastName: user.last_name,
      balance: user.balance || 0,
    };

    // Сохраняем в кэш
    userCache.set(cacheKey, { user: result, timestamp: Date.now() });

    // Очищаем старые записи из кэша (больше 1 минуты)
    if (userCache.size > 100) {
      const now = Date.now();
      for (const [key, value] of userCache.entries()) {
        if (now - value.timestamp > 60000) {
          userCache.delete(key);
        }
      }
    }

    return result;
  } catch (error) {
    console.error('Get server user error:', error);
    return null;
  }
}
