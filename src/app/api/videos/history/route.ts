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

    return NextResponse.json({
      success: true,
      orders: orders.map((o) => ({
        id: o.id,
        orderNumber: o.order_number,
        serviceName: o.service_name,
        taskId: o.task_id || null,
        childName: o.child_name,
        videoUrl: o.video_url || null,
        status: o.status || 'pending',
        statusDescription: o.status_description || 'Ожидание генерации',
        createdAt: o.created_at,
        completedAt: o.completed_at || null,
      })),
    });
  } catch (error) {
    console.error('Get videos history error:', error);
    return NextResponse.json({ error: 'Ошибка при получении истории' }, { status: 500 });
  }
}
