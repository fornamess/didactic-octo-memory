import { getUserFromRequest } from '@/lib/auth';
import { isAdmin } from '@/lib/config';
import { VIDEO_STORAGE_PATH } from '@/lib/config';
import { ensureDbInitialized, getExpiredOrders, clearExpiredVideo } from '@/lib/db';
import fs from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    await ensureDbInitialized();

    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    if (!isAdmin(user.email)) {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
    }

    // Получаем все истекшие заказы
    const expiredOrders = await getExpiredOrders();

    let deletedCount = 0;
    let errors: string[] = [];

    for (const order of expiredOrders) {
      try {
        // Удаляем файл видео если он существует
        if (order.video_url && order.video_url.startsWith('/api/videos/stream/')) {
          const relativePath = order.video_url.replace('/api/videos/stream/', '');
          const filePath = path.join(VIDEO_STORAGE_PATH, relativePath);

          if (fs.existsSync(filePath)) {
            try {
              fs.unlinkSync(filePath);
              console.log(`🗑️ Deleted expired video file: ${filePath}`);
            } catch (fileError) {
              console.error(`Error deleting file ${filePath}:`, fileError);
              errors.push(`Ошибка удаления файла для заказа ${order.id}`);
            }
          }
        }

        // Очищаем запись в БД
        await clearExpiredVideo(order.id);
        deletedCount++;
      } catch (error) {
        console.error(`Error processing order ${order.id}:`, error);
        errors.push(`Ошибка обработки заказа ${order.id}`);
      }
    }

    return NextResponse.json({
      success: true,
      deletedCount,
      totalExpired: expiredOrders.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `Удалено ${deletedCount} истекших видео`,
    });
  } catch (error) {
    console.error('Cleanup videos error:', error);
    return NextResponse.json({ error: 'Ошибка очистки видео' }, { status: 500 });
  }
}

// GET для получения информации об истекших видео
export async function GET(request: NextRequest) {
  try {
    await ensureDbInitialized();

    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    if (!isAdmin(user.email)) {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
    }

    const expiredOrders = await getExpiredOrders();

    return NextResponse.json({
      success: true,
      expiredCount: expiredOrders.length,
      expiredOrders: expiredOrders.map((o) => ({
        id: o.id,
        expiresAt: o.video_expires_at,
      })),
    });
  } catch (error) {
    console.error('Get expired videos error:', error);
    return NextResponse.json({ error: 'Ошибка получения информации' }, { status: 500 });
  }
}
