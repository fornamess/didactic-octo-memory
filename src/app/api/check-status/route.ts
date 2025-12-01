import { getUserFromRequest } from '@/lib/auth';
import { GENERATION_TIMEOUT_MINUTES } from '@/lib/config';
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
  downloadVideo,
  generateIntroVideo,
  generateOutroVideo,
  getFinalVideoPath,
  getPersonalVideoPath,
  getUniversalVideoPaths,
  saveIntroVideo,
  saveOutroVideo,
} from '@/lib/video-generator';
import fs from 'fs';
import { NextRequest, NextResponse } from 'next/server';

const GENERATION_TIMEOUT_MS = GENERATION_TIMEOUT_MINUTES * 60 * 1000;

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

    // Проверяем что заказ принадлежит пользователю
    const order = await getOrderByTaskId(Number(taskId));
    if (!order) {
      return NextResponse.json({ error: 'Заказ не найден' }, { status: 404 });
    }

    if (order.user_id !== user.id) {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
    }

    // Проверяем универсальные видео (файлы)
    const universalPaths = getUniversalVideoPaths();
    let introReady = universalPaths.introExists;
    let outroReady = universalPaths.outroExists;

    // Получаем информацию о генерации универсальных видео из БД
    const introDb = await getUniversalVideo('intro');
    const outroDb = await getUniversalVideo('outro');

    // Проверяем все задачи параллельно
    const statusChecks: Promise<void>[] = [];

    // customerId для генерации
    const customerId = `web_user_${user.id}`;

    // Если intro файла нет и нет активной генерации - автоматически запускаем
    if (!introReady && (!introDb || introDb.status === 'failed')) {
      console.log('Intro not found and no active generation, auto-starting...');
      statusChecks.push(
        generateIntroVideo(customerId).then(async (result) => {
          if (result.success && result.taskId) {
            await setUniversalVideo('intro', result.taskId, 'processing');
            console.log('Auto-generated intro task:', result.taskId);
          } else {
            console.error('Failed to auto-generate intro:', result.error);
          }
        })
      );
    }
    // Если intro файла нет, но есть активная генерация - проверяем
    else if (!introReady && introDb && introDb.task_id && introDb.status === 'processing') {
      const dateStr = (introDb.updated_at || introDb.created_at).replace(' ', 'T') + 'Z';
      const updatedAt = new Date(dateStr).getTime();
      const now = Date.now();
      const timePassed = now - updatedAt;

      console.log(
        `Intro check: updated ${Math.round(timePassed / 60000)} min ago, status: ${introDb.status}`
      );

      if (timePassed > GENERATION_TIMEOUT_MS) {
        console.log(
          `Intro generation timeout (${Math.round(timePassed / 60000)} min), resetting...`
        );
        await updateUniversalVideoStatus('intro', 'failed');
      } else {
        statusChecks.push(
          checkTaskStatus(introDb.task_id).then(async (introStatus) => {
            console.log('Intro status:', introStatus);
            if (introStatus.status === 'completed' && introStatus.videoUrl) {
              console.log('Intro video completed, downloading...');
              const saved = await saveIntroVideo(introStatus.videoUrl);
              if (saved) {
                introReady = true;
                await updateUniversalVideoStatus('intro', 'completed', introStatus.videoUrl);
                console.log('Intro video saved successfully');
              }
            } else if (
              introStatus.status === 'rejected with error' ||
              introStatus.status === 'rejected due to timeout'
            ) {
              await updateUniversalVideoStatus('intro', 'failed');
            }
          })
        );
      }
    }

    // Если outro файла нет и нет активной генерации - автоматически запускаем
    if (!outroReady && (!outroDb || outroDb.status === 'failed')) {
      console.log('Outro not found and no active generation, auto-starting...');
      statusChecks.push(
        generateOutroVideo(customerId).then(async (result) => {
          if (result.success && result.taskId) {
            await setUniversalVideo('outro', result.taskId, 'processing');
            console.log('Auto-generated outro task:', result.taskId);
          } else {
            console.error('Failed to auto-generate outro:', result.error);
          }
        })
      );
    }
    // Если outro файла нет, но есть активная генерация - проверяем
    else if (!outroReady && outroDb && outroDb.task_id && outroDb.status === 'processing') {
      const dateStr = (outroDb.updated_at || outroDb.created_at).replace(' ', 'T') + 'Z';
      const updatedAt = new Date(dateStr).getTime();
      const now = Date.now();
      const timePassed = now - updatedAt;

      console.log(
        `Outro check: updated ${Math.round(timePassed / 60000)} min ago, status: ${outroDb.status}`
      );

      if (timePassed > GENERATION_TIMEOUT_MS) {
        console.log(
          `Outro generation timeout (${Math.round(timePassed / 60000)} min), resetting...`
        );
        await updateUniversalVideoStatus('outro', 'failed');
      } else {
        statusChecks.push(
          checkTaskStatus(outroDb.task_id).then(async (outroStatus) => {
            console.log('Outro status:', outroStatus);
            if (outroStatus.status === 'completed' && outroStatus.videoUrl) {
              console.log('Outro video completed, downloading...');
              const saved = await saveOutroVideo(outroStatus.videoUrl);
              if (saved) {
                outroReady = true;
                await updateUniversalVideoStatus('outro', 'completed', outroStatus.videoUrl);
                console.log('Outro video saved successfully');
              }
            } else if (
              outroStatus.status === 'rejected with error' ||
              outroStatus.status === 'rejected due to timeout'
            ) {
              await updateUniversalVideoStatus('outro', 'failed');
            }
          })
        );
      }
    }

    // Ждём проверки универсальных видео
    await Promise.all(statusChecks);

    // Обновляем статус после проверки
    introReady = universalPaths.introExists || fs.existsSync(universalPaths.intro);
    outroReady = universalPaths.outroExists || fs.existsSync(universalPaths.outro);

    // Проверяем статус персонального видео
    const personalStatus = await checkTaskStatus(Number(taskId));
    console.log('Personal video status:', personalStatus);

    // Если API вернул ошибку TOO_MANY_REQUESTS, но intro ещё генерируется - продолжаем
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
          apiError: personalStatus.error,
        });
      }
      return NextResponse.json(
        {
          error: personalStatus.error,
          status: 'error',
          introReady,
          outroReady,
        },
        { status: 400 }
      );
    }

    const isPersonalCompleted = personalStatus.status === 'completed';
    const personalVideoUrl = personalStatus.videoUrl;

    // Если персональное видео готово
    if (isPersonalCompleted && personalVideoUrl) {
      // Скачиваем персональное видео
      const personalPath = getPersonalVideoPath(order.id);

      if (!fs.existsSync(personalPath)) {
        console.log('Downloading personal video...');
        await downloadVideo(personalVideoUrl, personalPath);
      }

      // Если все части готовы - склеиваем
      if (introReady && outroReady && fs.existsSync(personalPath)) {
        const finalPath = getFinalVideoPath(order.id);

        if (!fs.existsSync(finalPath)) {
          console.log('All parts ready, concatenating videos...');
          const concatenated = await concatenateVideos(
            universalPaths.intro,
            personalPath,
            universalPaths.outro,
            finalPath
          );

          if (concatenated) {
            console.log('Videos concatenated successfully!');
            const finalVideoUrl = `/videos/final/final_${order.id}.mp4`;
            await updateOrderStatus(Number(taskId), 'completed', 'Видео готово', finalVideoUrl);

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
            // Если склейка не удалась, возвращаем просто персональное видео
            console.log('Concatenation failed, using personal video only');
            const localPersonalUrl = `/videos/personal/personal_${order.id}.mp4`;
            await updateOrderStatus(
              Number(taskId),
              'completed',
              'Видео готово (без склейки)',
              localPersonalUrl
            );

            return NextResponse.json({
              success: true,
              taskId: Number(taskId),
              status: 2,
              statusDescription: 'completed',
              videoUrl: localPersonalUrl,
              isCompleted: true,
              isFailed: false,
              message: 'Видео готово!',
            });
          }
        } else {
          // Финальное видео уже существует
          const finalVideoUrl = `/videos/final/final_${order.id}.mp4`;
          return NextResponse.json({
            success: true,
            taskId: Number(taskId),
            status: 2,
            statusDescription: 'completed',
            videoUrl: finalVideoUrl,
            isCompleted: true,
            isFailed: false,
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
    const isFailed =
      personalStatus.status === 'rejected with error' ||
      personalStatus.status === 'rejected due to timeout';

    if (isFailed) {
      await updateOrderStatus(
        Number(taskId),
        personalStatus.status,
        personalStatus.status,
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
          : personalStatus.status === 'rejected with error'
          ? 3
          : 4,
      statusDescription: personalStatus.status,
      isCompleted: false,
      isFailed: isFailed,
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
