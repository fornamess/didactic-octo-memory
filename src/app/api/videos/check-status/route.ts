import { getUserFromRequest } from '@/lib/auth';
import { ensureDbInitialized, getOrderById, updateOrderStatus } from '@/lib/db';
import { checkTaskStatus } from '@/lib/video-generator';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    await ensureDbInitialized();

    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const { taskId, orderId } = await request.json();

    if (!taskId) {
      return NextResponse.json({ error: 'taskId обязателен' }, { status: 400 });
    }

    // Получаем заказ для проверки прав доступа
    const order = orderId ? await getOrderById(orderId) : null;
    if (order && order.user_id !== user.id) {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
    }

    // Проверяем статус задачи
    const statusResult = await checkTaskStatus(Number(taskId));

    if (!statusResult.success) {
      return NextResponse.json({
        success: false,
        error: statusResult.error || 'Ошибка проверки статуса',
        status: statusResult.status,
      });
    }

    const isCompleted = statusResult.status === 'completed';
    const isFailed =
      statusResult.status === 'rejected with error' ||
      statusResult.status === 'rejected due to timeout' ||
      !!statusResult.error;

    // Если статус изменился на completed или failed, обновляем в БД
    if (order && (isCompleted || isFailed)) {
      await updateOrderStatus(
        Number(taskId),
        isCompleted ? 'completed' : 'failed',
        isCompleted ? 'Видео готово!' : statusResult.error || 'Ошибка генерации',
        statusResult.videoUrl && orderId
          ? `/api/videos/stream/personal/personal_${orderId}.mp4`
          : undefined
      );
    }

    return NextResponse.json({
      success: true,
      status: statusResult.status,
      statusDescription: isCompleted
        ? 'Видео готово!'
        : isFailed
        ? statusResult.error || 'Ошибка генерации'
        : statusResult.status,
      videoUrl: statusResult.videoUrl,
      completed: isCompleted,
      failed: isFailed,
    });
  } catch (error) {
    console.error('Check status error:', error);
    return NextResponse.json({ error: 'Ошибка проверки статуса' }, { status: 500 });
  }
}
