// Server-side функции для получения пользователя (PRF-002)
import { cookies } from 'next/headers';
import { verifyToken } from './auth';
import { ensureDbInitialized, getDb, get } from './db';

export interface ServerUser {
  id: number;
  email: string;
  nickname?: string;
  firstName?: string;
  lastName?: string;
  balance?: number;
}

export async function getServerUser(): Promise<ServerUser | null> {
  try {
    await ensureDbInitialized();

    const cookieStore = await cookies();
    const tokenCookie = cookieStore.get('token');

    if (!tokenCookie?.value) {
      return null;
    }

    const payload = verifyToken(tokenCookie.value);
    if (!payload) {
      return null;
    }

    // Получаем полную информацию о пользователе из БД
    const db = await getDb();
    const user = await get(
      db,
      'SELECT id, email, nickname, first_name, last_name, balance FROM users WHERE id = ?',
      [payload.id]
    );
    db.close();

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      firstName: user.first_name,
      lastName: user.last_name,
      balance: user.balance || 0,
    };
  } catch (error) {
    console.error('Get server user error:', error);
    return null;
  }
}
