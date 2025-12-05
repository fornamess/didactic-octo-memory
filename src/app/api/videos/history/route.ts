import { getUserFromRequest } from '@/lib/auth';
import { ensureDbInitialized, getUserOrders } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

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

    console.log(`[GET /api/videos/history] User ${user.id}, found ${orders.length} orders`);

    // Форматируем ответ
    const formattedOrders = orders.map((order: Record<string, unknown>) => ({
      id: order.id,
      orderNumber: order.order_number,
      serviceName: order.service_name,
      taskId: order.task_id || null,
      childName: order.child_name,
      videoUrl: order.video_url || null,
      status: order.status || 'pending',
      statusDescription: order.status_description || 'Ожидание генерации',
      createdAt: order.created_at,
      completedAt: order.completed_at || null,
    }));

    return NextResponse.json({ success: true, orders: formattedOrders });
  } catch (error) {
    console.error('Get videos history error:', error);
    return NextResponse.json({ error: 'Ошибка при получении истории' }, { status: 500 });
  }
}
