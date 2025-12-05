import { z } from 'zod';

// Схемы валидации для API routes

// Регистрация
export const RegisterSchema = z.object({
  email: z.string().email('Неверный формат email').min(1).max(255),
  password: z.string().min(10, 'Пароль должен быть не менее 10 символов').max(128),
  nickname: z.string().min(1, 'Ник обязателен').max(50).trim(),
  firstName: z.string().min(1, 'Имя обязательно').max(100).trim(),
  lastName: z.string().min(1, 'Фамилия обязательна').max(100).trim(),
  agreedToTerms: z.boolean().refine((val) => val === true, {
    message: 'Необходимо согласиться с условиями использования',
  }),
});

// Логин
export const LoginSchema = z.object({
  email: z.string().email('Неверный формат email').min(1).max(255),
  password: z.string().min(1, 'Пароль обязателен').max(128),
});

// Генерация видео
export const GenerateVideoSchema = z.object({
  childName: z.string().min(1, 'Имя ребёнка обязательно').max(50).trim(),
  childAge: z.number().int().min(1).max(18).optional(),
  photo1: z.string().startsWith('data:image/', 'Фото 1 должно быть в формате base64'),
  photo1Comment: z
    .string()
    .min(5, 'Комментарий к фото 1 должен быть не менее 5 символов')
    .max(500)
    .trim(),
  photo2: z.string().startsWith('data:image/', 'Фото 2 должно быть в формате base64'),
  photo2Comment: z
    .string()
    .min(5, 'Комментарий к фото 2 должен быть не менее 5 символов')
    .max(500)
    .trim(),
});

// Создание платежа
const PaymentCurrencyEnum = z.enum(['BTC', 'ETH', 'USDT', 'USDC', 'TRX', 'ATOM', 'AVAX', 'LTC']);

export const CreatePaymentSchema = z.object({
  amount: z
    .number()
    .positive('Сумма должна быть положительной')
    .min(1, 'Минимальная сумма: 1 Койн'),
  paymentCurrency: z
    .union([
      PaymentCurrencyEnum,
      z.array(PaymentCurrencyEnum).min(1, 'Массив валют не может быть пустым'),
    ])
    .optional(),
});

// Пополнение баланса (админ)
export const TopupBalanceSchema = z.object({
  amount: z.number().positive('Сумма должна быть положительной').min(0.01),
});

// Поиск пользователей (админ)
export const SearchUsersSchema = z.object({
  q: z.string().min(1).max(100).optional(),
});

// Фильтры инвойсов (админ)
export const InvoiceFiltersSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.enum(['all', 'pending', 'paid', 'expired', 'cancelled']).optional(),
  nickname: z.string().max(100).optional(),
});

// Настройки (админ)
export const AdminSettingsSchema = z.object({
  emailVerificationRequired: z.boolean().optional(),
  agreementText: z.string().max(10000).optional(),
  contactsText: z.string().max(10000).optional(),
});

// Восстановление пароля
export const ForgotPasswordSchema = z.object({
  email: z.string().email('Неверный формат email').min(1).max(255),
});

// Сброс пароля
export const ResetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(10, 'Пароль должен быть не менее 10 символов').max(128),
});

// Вспомогательная функция для валидации с обработкой ошибок
export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const zodError = error as z.ZodError;
      return {
        success: false,
        error: zodError.issues.map((e) => e.message).join(', ') || 'Ошибка валидации данных',
      };
    }
    return { success: false, error: 'Неизвестная ошибка валидации' };
  }
}
