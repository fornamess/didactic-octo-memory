import { getUserFromRequest } from '@/lib/auth';
import { getUserOrders, initDb } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

let dbInitPromise: Promise<void> | null = null;
function ensureDbInitialized() {
  if (!dbInitPromise) {
    dbInitPromise = initDb().catch((err) => {
      console.error('DB init error:', err);
      dbInitPromise = null;
    });
  }
  return dbInitPromise;
}

export async function GET(request: NextRequest) {
  try {
    await ensureDbInitialized();

    // Проверка авторизации
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    // Получаем историю заказов
    const orders = await getUserOrders(user.id);

    return NextResponse.json({
      success: true,
      orders: orders.map((o) => ({
        id: o.id,
        orderNumber: o.order_number,
        serviceName: o.service_name,
        taskId: o.task_id,
        childName: o.child_name,
        videoUrl: o.video_url,
        status: o.status,
        statusDescription: o.status_description,
        createdAt: o.created_at,
        completedAt: o.completed_at,
      })),
    });
  } catch (error) {
    console.error('Get videos history error:', error);
    return NextResponse.json({ error: 'Ошибка при получении истории' }, { status: 500 });
  }
}
