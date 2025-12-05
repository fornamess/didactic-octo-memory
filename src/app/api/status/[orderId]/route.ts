// Обычный GET endpoint для получения статуса заказа
import { getUserFromRequest } from '@/lib/auth';
import { ensureDbInitialized, getDb, get } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    await ensureDbInitialized();

    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const { orderId } = await params;
    const orderIdNum = parseInt(orderId, 10);

    if (isNaN(orderIdNum)) {
      return NextResponse.json({ error: 'Неверный ID заказа' }, { status: 400 });
    }

    // Проверяем что заказ принадлежит пользователю
    const db = await getDb();
    const order = await get(
      db,
      'SELECT id, status, status_description, video_url, task_id FROM orders WHERE id = ? AND user_id = ?',
      [orderIdNum, user.id]
    );
    db.close();

    if (!order) {
      return NextResponse.json({ error: 'Заказ не найден' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        status: order.status,
        statusDescription: order.status_description,
        videoUrl: order.video_url,
        taskId: order.task_id,
        completed: order.status === 'completed',
        failed: order.status === 'error' || order.status === 'failed',
      },
    });
  } catch (error) {
    console.error('Get order status error:', error);
    return NextResponse.json({ error: 'Ошибка получения статуса' }, { status: 500 });
  }
}
