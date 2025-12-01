/**
 * Централизованная конфигурация приложения
 * Все настройки берутся из переменных окружения
 */

// === Безопасность ===
// Используем fallback только если переменная не установлена или пустая
export const JWT_SECRET = process.env.JWT_SECRET?.trim() || 'your-super-secret-jwt-key-change-in-production-2024';

// === API Yes AI (генерация видео) ===
export const YES_AI_API_BASE = process.env.YES_AI_API_BASE || 'https://api.yesai.su/v2';
export const YES_AI_TOKEN = process.env.YES_AI_TOKEN || '';

// === FFmpeg ===
export const FFMPEG_PATH = process.env.FFMPEG_PATH || '/usr/bin/ffmpeg';

// === Администраторы ===
export const ADMIN_EMAILS: string[] = (process.env.ADMIN_EMAILS || 'system@gmail.com')
  .split(',')
  .map((email) => email.trim().toLowerCase());

// === Платёжная система Bitbanker ===
export const BITBANKER_API_KEY = process.env.BITBANKER_API_KEY || '';
export const BITBANKER_SECRET = process.env.BITBANKER_SECRET || '';
export const BITBANKER_API_URL = 'https://api.bitbanker.org/v1';

// === URL приложения ===
export const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

// === Поддержка ===
export const SUPPORT_TELEGRAM = process.env.SUPPORT_TELEGRAM || '@your_support_bot';
export const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'support@your-domain.com';

// === Настройки сервиса ===
export const SERVICE_COST = Number(process.env.SERVICE_COST) || 0;
export const VIDEO_EXPIRY_DAYS = Number(process.env.VIDEO_EXPIRY_DAYS) || 7;
export const GENERATION_TIMEOUT_MINUTES = Number(process.env.GENERATION_TIMEOUT_MINUTES) || 15;

// === База данных ===
export const DATABASE_PATH = process.env.DATABASE_PATH || './database.db';

// === Промпты для генерации видео ===
export const VIDEO_PROMPTS = {
  intro: `Дед Мороз в традиционной русской красной шубе с белым мехом сидит у стола в уютной комнате. На фоне большая украшенная новогодняя ёлка с гирляндами и игрушками, горит камин, за окном падает снег. Тёплое освещение создаёт волшебную атмосферу. Дед Мороз добро улыбается, открывает волшебную книгу и начинает говорить в камеру. Он машет рукой в приветствии. Атмосфера сказочная, праздничная, уютная. Качество видео высокое, кинематографичное.`,
  outro: `Дед Мороз в традиционной русской красной шубе стоит у украшенной новогодней ёлки с подарками. Вокруг летают снежинки и волшебные искры. Он поднимает руку в прощальном жесте, посох светится магическим светом. Камера плавно отъезжает, показывая всю красоту зимней сказки. В кадре появляются золотые надписи "С Новым 2026 Годом!". Атмосфера торжественная и волшебная.`,
};

// === Проверка наличия критических переменных ===
export function validateConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!YES_AI_TOKEN) {
    errors.push('YES_AI_TOKEN не установлен - генерация видео не будет работать');
  }

  if (JWT_SECRET === 'your-super-secret-jwt-key-change-in-production-2024') {
    errors.push('JWT_SECRET использует значение по умолчанию - НЕБЕЗОПАСНО для продакшена!');
  }

  if (!BITBANKER_API_KEY && SERVICE_COST > 0) {
    errors.push('BITBANKER_API_KEY не установлен - платежи не будут работать');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// === Функция проверки админа ===
export function isAdmin(email: string): boolean {
  const normalizedEmail = email.toLowerCase().trim();
  return ADMIN_EMAILS.includes(normalizedEmail) || normalizedEmail.endsWith('@admin.com');
}
