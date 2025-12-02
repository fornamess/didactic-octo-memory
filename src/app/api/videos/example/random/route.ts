import { ensureDbInitialized, getCompletedOrdersWithFinalVideos } from '@/lib/db';
import { getFinalVideoPath } from '@/lib/video-generator';
import fs from 'fs';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    await ensureDbInitialized();

    // Получаем все завершенные заказы с финальными видео
    const orders = await getCompletedOrdersWithFinalVideos();

    if (orders.length === 0) {
      // Если нет готовых видео, возвращаем заглушку или первый доступный вариант
      const response = NextResponse.json({
        success: true,
        videoUrl: '/api/videos/stream/final/final_2.mp4',
        fallback: true,
      });
      response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
      return response;
    }

    // Фильтруем только те заказы, у которых файл реально существует
    const validOrders = orders.filter((order) => {
      const finalPath = getFinalVideoPath(order.id);
      if (!fs.existsSync(finalPath)) {
        return false;
      }

      // Проверяем размер файла - он должен быть больше 1MB (не пустой/некорректный)
      try {
        const stats = fs.statSync(finalPath);
        return stats.size > 1024 * 1024; // Минимум 1MB
      } catch {
        return false;
      }
    });

    if (validOrders.length === 0) {
      // Если ни одно видео не прошло проверку, используем заглушку
      const response = NextResponse.json({
        success: true,
        videoUrl: '/api/videos/stream/final/final_2.mp4',
        fallback: true,
      });
      response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
      return response;
    }

    // Выбираем случайное видео
    const randomOrder = validOrders[Math.floor(Math.random() * validOrders.length)];

    const response = NextResponse.json({
      success: true,
      videoUrl: `/api/videos/stream/final/final_${randomOrder.id}.mp4`,
      orderId: randomOrder.id,
    });

    // Кэшируем на 5 минут (примерные видео меняются не часто)
    response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');

    return response;
  } catch (error) {
    console.error('Error getting random example video:', error);
    // В случае ошибки возвращаем заглушку
    const response = NextResponse.json({
      success: true,
      videoUrl: '/api/videos/stream/final/final_2.mp4',
      fallback: true,
      error: 'Failed to get random video',
    });
    response.headers.set('Cache-Control', 'public, s-maxage=60');
    return response;
  }
}
