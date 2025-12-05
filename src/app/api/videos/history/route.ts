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

    console.log(`[HISTORY] Getting orders for user ${user.id} (${user.email})`);

    // Получаем историю заказов
    const orders = await getUserOrders(user.id);

    console.log(`[HISTORY] Found ${orders.length} orders for user ${user.id}`);

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
