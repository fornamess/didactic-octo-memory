import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { getOrderByTaskId, initDb } from '@/lib/db';

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

    // Проксируем видео через наш сервер
    try {
      const videoResponse = await fetch(order.video_url);
      if (!videoResponse.ok) {
        throw new Error('Не удалось загрузить видео');
      }

      const videoBuffer = await videoResponse.arrayBuffer();

      // Исправляем имя файла для поддержки кириллицы
      const safeFileName = order.child_name
        .replace(/[^a-zA-Z0-9а-яА-ЯёЁ\s-]/g, '')
        .replace(/\s+/g, '-')
        .substring(0, 50); // Ограничиваем длину

      // Используем RFC 5987 для правильной кодировки кириллицы
      const encodedFileName = encodeURIComponent(`pozdravlenie-${safeFileName}.mp4`);
      const rfc5987FileName = `filename*=UTF-8''${encodedFileName}`;
      const asciiFileName = `pozdravlenie-${safeFileName}.mp4`.replace(/[^\x00-\x7F]/g, ''); // Fallback ASCII имя

      return new NextResponse(videoBuffer, {
        headers: {
          'Content-Type': 'video/mp4',
          'Content-Disposition': `attachment; filename="${asciiFileName}"; ${rfc5987FileName}`,
          'Content-Length': videoBuffer.byteLength.toString(),
        },
      });
    } catch (error) {
      console.error('Video download error:', error);
      // Если не удалось проксировать, возвращаем прямую ссылку
      return NextResponse.json({
        success: true,
        videoUrl: order.video_url,
        directDownload: true,
      });
    }
  } catch (error) {
    console.error('Download route error:', error);
    return NextResponse.json(
      { error: 'Ошибка при скачивании видео' },
      { status: 500 }
    );
  }
}
