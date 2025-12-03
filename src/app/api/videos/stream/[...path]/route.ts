import { VIDEO_STORAGE_PATH } from '@/lib/config';
import { ensureDbInitialized, getDb, get } from '@/lib/db';
import fs from 'fs';
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    // Ожидаем params (в Next.js 16 это Promise)
    const resolvedParams = await params;
    // Собираем путь из параметров
    const filePath = resolvedParams.path.join('/');

    // Безопасность: проверяем что путь не содержит опасные символы
    if (filePath.includes('..') || !filePath.match(/^[a-zA-Z0-9_/-]+\.mp4$/)) {
      console.log('Invalid video path:', filePath);
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }

    // Полный путь к файлу
    const fullPath = path.join(VIDEO_STORAGE_PATH, filePath);

    // Проверяем что файл существует
    if (!fs.existsSync(fullPath)) {
      console.log('Video file not found:', fullPath);
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Проверяем что это файл (не директория)
    const stats = fs.statSync(fullPath);
    if (!stats.isFile()) {
      return NextResponse.json({ error: 'Not a file' }, { status: 400 });
    }

    // Проверяем что файл находится внутри VIDEO_STORAGE_PATH (безопасность)
    const resolvedPath = path.resolve(fullPath);
    const resolvedStorage = path.resolve(VIDEO_STORAGE_PATH);
    if (!resolvedPath.startsWith(resolvedStorage)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Проверяем срок действия видео (только для final видео)
    if (filePath.startsWith('final/')) {
      await ensureDbInitialized();
      const orderIdMatch = filePath.match(/final_(\d+)\.mp4/);
      if (orderIdMatch) {
        const orderId = parseInt(orderIdMatch[1], 10);
        const db = await getDb();
        const order = await get(
          db,
          'SELECT video_expires_at FROM orders WHERE id = ?',
          [orderId]
        );
        db.close();

        if (order && order.video_expires_at) {
          const expiresAt = new Date(order.video_expires_at);
          if (expiresAt < new Date()) {
            // Видео истекло - удаляем файл и возвращаем 404
            try {
              fs.unlinkSync(fullPath);
              console.log(`🗑️ Deleted expired video: ${filePath}`);
            } catch (err) {
              console.error('Error deleting expired video:', err);
            }
            return NextResponse.json({ error: 'Video expired' }, { status: 410 });
          }
        }
      }
    }

    // Читаем файл
    const fileBuffer = fs.readFileSync(fullPath);

    // Определяем Content-Type
    const ext = path.extname(fullPath).toLowerCase();
    const contentType = ext === '.mp4' ? 'video/mp4' : 'application/octet-stream';

    // Генерируем ETag для кэширования
    const etag = `"${stats.mtime.getTime()}-${stats.size}"`;
    const ifNoneMatch = request.headers.get('if-none-match');
    if (ifNoneMatch === etag) {
      return new NextResponse(null, { status: 304 });
    }

    // Поддержка Range запросов для видео (для правильного воспроизведения)
    const range = request.headers.get('range');
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileBuffer.length - 1;
      const chunkSize = end - start + 1;
      const chunk = fileBuffer.slice(start, end + 1);

      return new NextResponse(chunk, {
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${end}/${fileBuffer.length}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkSize.toString(),
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000, immutable',
          'ETag': etag,
        },
      });
    }

    // Обычный запрос - возвращаем весь файл
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': fileBuffer.length.toString(),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'ETag': etag,
      },
    });
  } catch (error) {
    console.error('Video stream error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
