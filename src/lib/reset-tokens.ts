/**
 * Управление токенами сброса пароля
 * В продакшене лучше использовать Redis или БД
 */

interface ResetTokenData {
  email: string;
  expiresAt: number;
  token: string;
}

const resetTokens = new Map<string, ResetTokenData>();

// Очистка истекших токенов каждые 10 минут
setInterval(() => {
  const now = Date.now();
  for (const [token, data] of resetTokens.entries()) {
    if (data.expiresAt < now) {
      resetTokens.delete(token);
    }
  }
}, 10 * 60 * 1000);

export function createResetToken(email: string): string {
  const crypto = require('crypto');
  const resetToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + 60 * 60 * 1000; // 1 час

  resetTokens.set(resetToken, {
    email,
    expiresAt,
    token: resetToken,
  });

  return resetToken;
}

export function getResetTokenData(token: string): ResetTokenData | undefined {
  const tokenData = resetTokens.get(token);

  if (!tokenData) {
    return undefined;
  }

  if (tokenData.expiresAt < Date.now()) {
    resetTokens.delete(token);
    return undefined;
  }

  return tokenData;
}

export function deleteResetToken(token: string): void {
  resetTokens.delete(token);
}
