// Rate limiting для API routes (SEC-010)
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Создаем Redis клиент (будет работать если установлены переменные окружения UPSTASH_REDIS_REST_URL и UPSTASH_REDIS_REST_TOKEN)
const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? Redis.fromEnv()
    : null;

// Rate limiters для разных эндпоинтов
export const authRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '1 m'), // 5 запросов в минуту
      analytics: true,
    })
  : null;

export const generateVideoRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(3, '1 m'), // 3 запроса в минуту
      analytics: true,
    })
  : null;

export const paymentRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '1 m'), // 10 запросов в минуту
      analytics: true,
    })
  : null;

export const generalApiRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(30, '1 m'), // 30 запросов в минуту
      analytics: true,
    })
  : null;

// Вспомогательная функция для проверки rate limit
export async function checkRateLimit(
  rateLimiter: Ratelimit | null,
  identifier: string
): Promise<{ success: boolean; remaining?: number; reset?: number }> {
  if (!rateLimiter) {
    // Если Redis не настроен, пропускаем rate limiting (для разработки)
    return { success: true };
  }

  const result = await rateLimiter.limit(identifier);
  return {
    success: result.success,
    remaining: result.remaining,
    reset: result.reset,
  };
}
