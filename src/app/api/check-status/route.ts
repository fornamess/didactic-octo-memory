import { getUserFromRequest } from '@/lib/auth';
import {
  ensureDbInitialized,
  getOrderByTaskId,
  getUniversalVideo,
  setUniversalVideo,
  updateOrderStatus,
  updateUniversalVideoStatus,
} from '@/lib/db';
import {
  checkTaskStatus,
  concatenateVideos,
  deleteOrderPhotos,
  deletePersonalVideo,
  downloadVideo,
  generateIntroVideo,
  generateOutroVideo,
  getFFmpegLockStatus,
  getFinalVideoPath,
  getPersonalVideoPath,
  getUniversalVideoPaths,
  saveIntroVideo,
  saveOutroVideo,
} from '@/lib/video-generator';
import fs from 'fs';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    await ensureDbInitialized();

    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');

    if (!taskId) {
      return NextResponse.json({ error: 'taskId обязателен' }, { status: 400 });
    }

    console.log(`🔎 [CHECK-STATUS] taskId: ${taskId}, userId: ${user.id}`);

    const order = await getOrderByTaskId(Number(taskId));
    if (!order) {
      return NextResponse.json({ error: 'Заказ не найден' }, { status: 404 });
    }

    if (order.user_id !== user.id) {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
    }

    // Получаем пути
    const universalPaths = getUniversalVideoPaths();
    const finalPath = getFinalVideoPath(order.id);
    const personalPath = getPersonalVideoPath(order.id);

    // Проверяем статус FFmpeg лока
    const lockStatus = getFFmpegLockStatus();
    if (lockStatus.globalLocked) {
      console.log(`🔒 FFmpeg is busy (lock age: ${Math.round((lockStatus.lockAge || 0) / 1000)}s)`);
    }

    // ЕСЛИ ФИНАЛЬНОЕ ВИДЕО УЖЕ СУЩЕСТВУЕТ - возвращаем его
    if (fs.existsSync(finalPath)) {
      const finalSize = fs.statSync(finalPath).size;
      // Минимальный размер ~5MB для 45 сек видео
      if (finalSize > 5 * 1024 * 1024) {
        const finalVideoUrl = `/api/videos/stream/final/final_${order.id}.mp4`;

        // Обновляем статус если нужно
        if (order.status !== 'completed' || order.video_url !== finalVideoUrl) {
          await updateOrderStatus(Number(taskId), 'completed', 'Видео готово', finalVideoUrl);
        }

        // Очищаем временные файлы
        deleteOrderPhotos(order.id);
        deletePersonalVideo(order.id);

        return NextResponse.json({
          success: true,
          taskId: Number(taskId),
          status: 2,
          statusDescription: 'completed',
          videoUrl: finalVideoUrl,
          isCompleted: true,
          isFailed: false,
        });
      } else {
        // Файл слишком маленький - удаляем
        console.log(`⚠️ Final video too small (${finalSize} bytes), removing`);
        try {
          fs.unlinkSync(finalPath);
        } catch {}
      }
    }

    // Проверяем универсальные видео
    let introReady = universalPaths.introExists;
    let outroReady = universalPaths.outroExists;

    const introDb = await getUniversalVideo('intro');
    const outroDb = await getUniversalVideo('outro');

    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    const customerId = `web_user_${user.id}`;

    // Автозапуск генерации intro/outro если нужно
    // Также перезапускаем если статус 'pending' (застрял)
    if (!introReady && (!introDb || introDb.status === 'failed' || introDb.status === 'pending')) {
      console.log('Auto-starting intro generation...');
      const result = await generateIntroVideo(customerId);
      if (result.success && result.taskId) {
        await setUniversalVideo('intro', result.taskId, 'processing');
      }
    } else if (!introReady && introDb?.task_id && introDb.status === 'processing') {
      await delay(500);
      const introStatus = await checkTaskStatus(introDb.task_id);
      if (introStatus.status === 'completed' && introStatus.videoUrl) {
        const saved = await saveIntroVideo(introStatus.videoUrl);
        if (saved) {
          introReady = true;
          await updateUniversalVideoStatus('intro', 'completed', introStatus.videoUrl);
        }
      } else if (introStatus.status?.includes('rejected')) {
        await updateUniversalVideoStatus('intro', 'failed');
      }
    }

    if (!outroReady && (!outroDb || outroDb.status === 'failed' || outroDb.status === 'pending')) {
      console.log('Auto-starting outro generation...');
      const result = await generateOutroVideo(customerId);
      if (result.success && result.taskId) {
        await setUniversalVideo('outro', result.taskId, 'processing');
      }
    } else if (!outroReady && outroDb?.task_id && outroDb.status === 'processing') {
      await delay(1000);
      const outroStatus = await checkTaskStatus(outroDb.task_id);
      if (outroStatus.status === 'completed' && outroStatus.videoUrl) {
        const saved = await saveOutroVideo(outroStatus.videoUrl);
        if (saved) {
          outroReady = true;
          await updateUniversalVideoStatus('outro', 'completed', outroStatus.videoUrl);
        }
      } else if (outroStatus.status?.includes('rejected')) {
        await updateUniversalVideoStatus('outro', 'failed');
      }
    }

    // Обновляем флаги после проверок
    introReady = fs.existsSync(universalPaths.intro);
    outroReady = fs.existsSync(universalPaths.outro);

    // Проверяем персональное видео
    await delay(1500);
    const personalStatus = await checkTaskStatus(Number(taskId));

    if (!personalStatus.success) {
      if (!introReady || !outroReady) {
        return NextResponse.json({
          success: true,
          taskId: Number(taskId),
          status: 1,
          statusDescription: 'processing',
          isCompleted: false,
          isFailed: false,
          message: 'Ожидаем универсальные видео...',
          introReady,
          outroReady,
          personalReady: false,
        });
      }
      return NextResponse.json({ error: personalStatus.error }, { status: 400 });
    }

    const isPersonalCompleted = personalStatus.status === 'completed';
    const personalVideoUrl = personalStatus.videoUrl;

    // Персональное видео готово
    if (isPersonalCompleted && personalVideoUrl) {
      // Скачиваем если нет локально
      if (!fs.existsSync(personalPath)) {
        console.log('📥 Downloading personal video...');
        const downloaded = await downloadVideo(personalVideoUrl, personalPath);
        if (!downloaded) {
          return NextResponse.json({
            success: true,
            taskId: Number(taskId),
            status: 1,
            statusDescription: 'processing',
            isCompleted: false,
            isFailed: false,
            message: 'Ошибка загрузки персонального видео, повторяем...',
          });
        }
      }

      // Все части готовы - склеиваем
      if (introReady && outroReady && fs.existsSync(personalPath)) {
        // Проверяем не занят ли FFmpeg
        const lockStatus = getFFmpegLockStatus();
        if (lockStatus.globalLocked && (lockStatus.lockAge || 0) < 9 * 60 * 1000) {
          // FFmpeg занят менее 9 минут - ждём
          console.log('⏳ FFmpeg busy, will retry...');
          return NextResponse.json({
            success: true,
            taskId: Number(taskId),
            status: 1,
            statusDescription: 'processing',
            isCompleted: false,
            isFailed: false,
            message: 'Идёт обработка другого видео, ждём...',
            introReady,
            outroReady,
            personalReady: true,
            ffmpegBusy: true,
          });
        }

        console.log('🔄 Starting video concatenation...');

        const success = await concatenateVideos(
          universalPaths.intro,
          personalPath,
          universalPaths.outro,
          finalPath
        );

        if (success && fs.existsSync(finalPath)) {
          const finalVideoUrl = `/api/videos/stream/final/final_${order.id}.mp4`;
          await updateOrderStatus(Number(taskId), 'completed', 'Видео готово', finalVideoUrl);

          deleteOrderPhotos(order.id);
          deletePersonalVideo(order.id);

          return NextResponse.json({
            success: true,
            taskId: Number(taskId),
            status: 2,
            statusDescription: 'completed',
            videoUrl: finalVideoUrl,
            isCompleted: true,
            isFailed: false,
            message: 'Видео готово!',
          });
        } else {
          // Склейка не удалась - используем персональное видео как fallback
          console.log('⚠️ Concatenation failed, using personal video as fallback');

          const localPersonalUrl = `/api/videos/stream/personal/personal_${order.id}.mp4`;
          await updateOrderStatus(
            Number(taskId),
            'completed',
            'Видео готово (без склейки)',
            localPersonalUrl
          );

          deleteOrderPhotos(order.id);

          return NextResponse.json({
            success: true,
            taskId: Number(taskId),
            status: 2,
            statusDescription: 'completed',
            videoUrl: localPersonalUrl,
            isCompleted: true,
            isFailed: false,
            message: 'Видео готово!',
            fallback: true,
          });
        }
      } else {
        // Ждём универсальные видео
        return NextResponse.json({
          success: true,
          taskId: Number(taskId),
          status: 1,
          statusDescription: 'processing',
          isCompleted: false,
          isFailed: false,
          message: 'Персональное видео готово, ожидаем универсальные части...',
          introReady,
          outroReady,
          personalReady: true,
        });
      }
    }

    // Персональное видео ещё генерируется
    const isFailed = personalStatus.status?.includes('rejected');

    if (isFailed) {
      await updateOrderStatus(
        Number(taskId),
        personalStatus.status || 'rejected',
        personalStatus.error || 'Ошибка генерации',
        undefined,
        personalStatus.error
      );
    }

    return NextResponse.json({
      success: true,
      taskId: Number(taskId),
      status:
        personalStatus.status === 'in queue'
          ? 0
          : personalStatus.status === 'in progress'
          ? 1
          : personalStatus.status === 'completed'
          ? 2
          : isFailed
          ? 3
          : 4,
      statusDescription: personalStatus.status,
      isCompleted: false,
      isFailed,
      error: personalStatus.error,
      introReady,
      outroReady,
      personalReady: false,
    });
  } catch (error) {
    console.error('Error checking status:', error);
    return NextResponse.json({ error: 'Ошибка при проверке статуса' }, { status: 500 });
  }
}
