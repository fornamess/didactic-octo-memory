import { NextResponse } from 'next/server';
import { initDb } from '@/lib/db';

// Инициализация БД через API endpoint (для удобства)
export async function GET() {
  try {
    await initDb();
    return NextResponse.json({ success: true, message: 'Database initialized' });
  } catch (error) {
    console.error('Init error:', error);
    return NextResponse.json(
      { error: 'Failed to initialize database' },
      { status: 500 }
    );
  }
}
