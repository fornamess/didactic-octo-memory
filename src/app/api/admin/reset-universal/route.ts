import { getUserFromRequest } from '@/lib/auth';
import { isAdmin } from '@/lib/config';
import { ensureDbInitialized, getDb, get, run } from '@/lib/db';
import fs from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/admin/reset-universal - сбросить универсальное видео
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

    const { videoType } = await request.json();

    if (!videoType || !['intro', 'outro'].includes(videoType)) {
      return NextResponse.json({ error: 'Укажите videoType: intro или outro' }, { status: 400 });
    }

    const db = await getDb();

    // Получаем текущий статус
    const current = await get(db, 'SELECT * FROM universal_videos WHERE video_type = ?', [
      videoType,
    ]);

    // Удаляем запись из БД
    await run(db, 'DELETE FROM universal_videos WHERE video_type = ?', [videoType]);

    db.close();

    console.log(`Universal video ${videoType} reset. Previous state:`, current);

    return NextResponse.json({
      success: true,
      message: `${videoType} сброшен. При следующей генерации создастся новая задача.`,
      previousState: current,
    });
  } catch (error) {
    console.error('Error resetting universal video:', error);
    return NextResponse.json({ error: 'Ошибка при сбросе' }, { status: 500 });
  }
}

// GET /api/admin/reset-universal - получить статус универсальных видео
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

    const db = await getDb();

    const intro = await get(db, 'SELECT * FROM universal_videos WHERE video_type = ?', ['intro']);
    const outro = await get(db, 'SELECT * FROM universal_videos WHERE video_type = ?', ['outro']);

    db.close();

    // Проверяем файлы
    const VIDEOS_DIR = path.join(process.cwd(), 'public', 'videos');
    const introFileExists = fs.existsSync(path.join(VIDEOS_DIR, 'intro.mp4'));
    const outroFileExists = fs.existsSync(path.join(VIDEOS_DIR, 'outro.mp4'));

    return NextResponse.json({
      success: true,
      intro: {
        db: intro,
        fileExists: introFileExists,
      },
      outro: {
        db: outro,
        fileExists: outroFileExists,
      },
    });
  } catch (error) {
    console.error('Error getting universal video status:', error);
    return NextResponse.json({ error: 'Ошибка при получении статуса' }, { status: 500 });
  }
}
