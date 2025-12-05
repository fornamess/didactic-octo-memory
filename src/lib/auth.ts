import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from './config';

export interface UserPayload {
  id: number;
  email: string;
  name: string;
}

// Генерация JWT токена
export function generateToken(user: UserPayload): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '30d' });
}

// Верификация JWT токена
export function verifyToken(token: string): UserPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as UserPayload;
  } catch {
    return null;
  }
}

// Хеширование пароля
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

// Проверка пароля
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Получить токен из cookies или Authorization header (для обратной совместимости)
export function getTokenFromRequest(
  request: Request | { cookies?: { get: (name: string) => { value: string } | undefined } }
): string | null {
  // Сначала пробуем получить из cookies (приоритет)
  // В Next.js App Router request.cookies имеет метод get()
  if ('cookies' in request && request.cookies && typeof request.cookies === 'object') {
    try {
      const cookies = request.cookies as { get: (name: string) => { value: string } | undefined };
      const tokenCookie = cookies.get('token');
      if (tokenCookie?.value) {
        return tokenCookie.value;
      }
    } catch {
      // Если cookies недоступны, продолжаем проверку Authorization header
    }
  }

  // Fallback на Authorization header для обратной совместимости
  if ('headers' in request && request.headers) {
    const authHeader = (request.headers as Headers).get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
  }

  return null;
}

// Получить пользователя из токена (для middleware)
export function getUserFromRequest(request: Request): UserPayload | null {
  const token = getTokenFromRequest(request);
  if (!token) {
    return null;
  }

  return verifyToken(token);
}
