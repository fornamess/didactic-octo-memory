import { getUserFromRequest } from '@/lib/auth';
import { ensureDbInitialized, getUserOrders, updateOrderStatus } from '@/lib/db';
import { checkTaskStatus } from '@/lib/video-generator';
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

    // Проверяем статусы pending заказов в фоне
    const pendingOrders = orders.filter(
      (o: any) => o.status === 'pending' || o.status === 'in queue' || o.status === 'in progress'
    );

    // Проверяем статусы параллельно (но не ждём завершения для ответа)
    if (pendingOrders.length > 0) {
      // Запускаем проверку статусов асинхронно
      Promise.all(
        pendingOrders.map(async (order: any) => {
          if (!order.task_id) return;

          try {
            const statusResult = await checkTaskStatus(order.task_id);

            if (statusResult.success) {
              const isCompleted = statusResult.status === 'completed';
              const isFailed =
                statusResult.status === 'rejected with error' ||
                statusResult.status === 'rejected due to timeout' ||
                statusResult.error;

              if (isCompleted || isFailed) {
                // Обновляем статус в БД
                await updateOrderStatus(
                  order.task_id,
                  isCompleted ? 'completed' : 'failed',
                  isCompleted ? 'Видео готово!' : (statusResult.error || 'Ошибка генерации'),
                  statusResult.videoUrl ? `/api/videos/stream/personal/personal_${order.id}.mp4` : undefined
                );

                // Обновляем в массиве для немедленного ответа
                order.status = isCompleted ? 'completed' : 'failed';
                order.status_description = isCompleted
                  ? 'Видео готово!'
                  : statusResult.error || 'Ошибка генерации';
                if (statusResult.videoUrl) {
                  order.video_url = `/api/videos/stream/personal/personal_${order.id}.mp4`;
                }
              }
            }
          } catch (error) {
            console.error(`Error checking status for order ${order.id}:`, error);
          }
        })
      ).catch((err) => console.error('Background status check error:', err));
    }

    // Форматируем ответ
    const formattedOrders = orders.map((order: any) => ({
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
