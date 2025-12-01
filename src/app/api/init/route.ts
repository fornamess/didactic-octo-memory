import { validateConfig } from '@/lib/config';
import { initDb } from '@/lib/db';
import { NextResponse } from 'next/server';

// Инициализация БД через API endpoint (для удобства)
export async function GET() {
  try {
    // Проверяем конфигурацию
    const configValidation = validateConfig();

    await initDb();

    return NextResponse.json({
      success: true,
      message: 'Database initialized',
      configValid: configValidation.valid,
      configWarnings: configValidation.errors,
    });
  } catch (error) {
    console.error('Init error:', error);
    return NextResponse.json({ error: 'Failed to initialize database' }, { status: 500 });
  }
}
