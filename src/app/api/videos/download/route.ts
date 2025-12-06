import { getUserFromRequest } from '@/lib/auth';
import { VIDEO_STORAGE_PATH } from '@/lib/config';
import { ensureDbInitialized, getOrderByTaskId } from '@/lib/db';
import fs from 'fs';
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    await ensureDbInitialized();

    // Проверка авторизации
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');

    if (!taskId) {
      return NextResponse.json({ error: 'taskId обязателен' }, { status: 400 });
    }

    // Проверяем что заказ принадлежит пользователю
    const order = await getOrderByTaskId(Number(taskId));
    if (!order) {
      return NextResponse.json({ error: 'Заказ не найден' }, { status: 404 });
    }

    if (order.user_id !== user.id) {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
    }

    if (!order.video_url) {
      return NextResponse.json({ error: 'Видео ещё не готово' }, { status: 400 });
    }

    try {
      let videoBuffer: Buffer;

      // Проверяем тип URL
      if (order.video_url.startsWith('/api/videos/stream/')) {
        // Локальный файл - читаем напрямую с диска
        // URL формат: /api/videos/stream/final/final_2.mp4 -> /data/videos/final/final_2.mp4
        const relativePath = order.video_url.replace('/api/videos/stream/', '');
        const filePath = path.join(VIDEO_STORAGE_PATH, relativePath);

        console.log('Reading local video file:', filePath);

        if (!fs.existsSync(filePath)) {
          console.error('Video file not found:', filePath);
          return NextResponse.json({ error: 'Файл видео не найден' }, { status: 404 });
        }

        // Проверяем размер файла
        const stats = fs.statSync(filePath);
        if (stats.size < 1024) {
          console.error('Video file too small:', stats.size);
          return NextResponse.json({ error: 'Файл видео повреждён' }, { status: 500 });
        }

        videoBuffer = fs.readFileSync(filePath);
      } else if (order.video_url.startsWith('http')) {
        // Внешний URL - скачиваем через fetch
        console.log('Fetching external video:', order.video_url);
        const videoResponse = await fetch(order.video_url);
        if (!videoResponse.ok) {
          throw new Error('Не удалось загрузить видео');
        }
        videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
      } else {
        // Относительный путь без /api/videos/stream/ - пробуем как путь к файлу
        const filePath = path.join(VIDEO_STORAGE_PATH, order.video_url.replace(/^\/videos\//, ''));
        console.log('Trying relative path:', filePath);

        if (fs.existsSync(filePath)) {
          videoBuffer = fs.readFileSync(filePath);
        } else {
          return NextResponse.json({ error: 'Видео не найдено' }, { status: 404 });
        }
      }

      // Исправляем имя файла для поддержки кириллицы
      const safeFileName = order.child_name
        .replace(/[^a-zA-Z0-9а-яА-ЯёЁ\s-]/g, '')
        .replace(/\s+/g, '-')
        .substring(0, 50);

      // Используем RFC 5987 для правильной кодировки кириллицы
      const encodedFileName = encodeURIComponent(`pozdravlenie-${safeFileName}.mp4`);
      const rfc5987FileName = `filename*=UTF-8''${encodedFileName}`;
      const asciiFileName = `pozdravlenie-${safeFileName}.mp4`.replace(/[^\x00-\x7F]/g, '');

      // Преобразуем Buffer в Uint8Array для NextResponse (принимается как BodyInit)
      const uint8Array = new Uint8Array(videoBuffer);

      return new NextResponse(uint8Array, {
        headers: {
          'Content-Type': 'video/mp4',
          'Content-Disposition': `attachment; filename="${asciiFileName}"; ${rfc5987FileName}`,
          'Content-Length': videoBuffer.byteLength.toString(),
        },
      });
    } catch (error) {
      console.error('Video download error:', error);
      // Если не удалось, возвращаем прямую ссылку
      return NextResponse.json({
        success: true,
        videoUrl: order.video_url,
        directDownload: true,
      });
    }
  } catch (error) {
    console.error('Download route error:', error);
    return NextResponse.json({ error: 'Ошибка при скачивании видео' }, { status: 500 });
  }
}
