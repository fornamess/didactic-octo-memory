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

    console.log(
      `🔎 [CHECK-STATUS] Starting status check for taskId: ${taskId}, userId: ${user.id}`
    );

    // Проверяем что заказ принадлежит пользователю
    const order = await getOrderByTaskId(Number(taskId));
    if (!order) {
      return NextResponse.json({ error: 'Заказ не найден' }, { status: 404 });
    }

    if (order.user_id !== user.id) {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
    }

    // ВАЖНО: Для завершенных заказов всегда проверяем размер финального видео
    // Это исправляет проблему со старыми 15-секундными видео
    console.log(`📋 Order status: ${order.status}, video_url: ${order.video_url || 'none'}`);
    if (order.status === 'completed' && order.video_url) {
      console.log(
        `🔍 [COMPLETED ORDER CHECK] Order ${order.id} is completed, checking final video size...`
      );
      console.log(`   Order video_url: ${order.video_url}`);
      const universalPaths = getUniversalVideoPaths();
      const finalPath = getFinalVideoPath(order.id);
      const personalPath = getPersonalVideoPath(order.id);
      console.log(`   Final path: ${finalPath}`);
      console.log(`   Personal path: ${personalPath}`);

      // Если финальное видео существует - проверяем его размер
      if (fs.existsSync(finalPath)) {
        // Проверяем размеры всех частей
        const introSize = fs.existsSync(universalPaths.intro)
          ? fs.statSync(universalPaths.intro).size
          : 0;
        const personalSize = fs.existsSync(personalPath) ? fs.statSync(personalPath).size : 0;
        const outroSize = fs.existsSync(universalPaths.outro)
          ? fs.statSync(universalPaths.outro).size
          : 0;

        // Если хотя бы одна часть существует, можем проверить размер
        if (introSize > 0 || personalSize > 0 || outroSize > 0) {
          const totalPartsSize = introSize + personalSize + outroSize;
          const expectedMinSize = totalPartsSize * 0.7;
          const finalSize = fs.statSync(finalPath).size;

          console.log(`📊 Final video size check for completed order:`);
          console.log(
            `   Final size: ${finalSize} bytes (${(finalSize / 1024 / 1024).toFixed(2)} MB)`
          );
          console.log(
            `   Expected min: ${expectedMinSize} bytes (${(expectedMinSize / 1024 / 1024).toFixed(
              2
            )} MB)`
          );
          console.log(
            `   Intro: ${introSize} bytes, Personal: ${personalSize} bytes, Outro: ${outroSize} bytes`
          );

          // Если финальное видео слишком маленькое - удаляем для пересоздания
          if (finalSize < expectedMinSize && expectedMinSize > 0) {
            console.log(
              `⚠️ Completed order has invalid final video size! ${finalSize} < ${expectedMinSize}`
            );
            console.log(`🗑️ Deleting incorrect final video to force recreation...`);
            try {
              fs.unlinkSync(finalPath);
              console.log(`✅ Deleted incorrect final video, will be recreated below`);
            } catch (err) {
              console.error(`❌ Failed to delete final video:`, err);
            }
          }
        }
      }
    }

    // Проверяем универсальные видео (файлы)
    const universalPaths = getUniversalVideoPaths();
    let introReady = universalPaths.introExists;
    let outroReady = universalPaths.outroExists;

    // Получаем информацию о генерации универсальных видео из БД
    const introDb = await getUniversalVideo('intro');
    const outroDb = await getUniversalVideo('outro');

    console.log('=== Check Status Debug ===');
    console.log('introReady:', introReady, 'outroReady:', outroReady);
    console.log('introDb:', introDb);
    console.log('outroDb:', outroDb);

    // Проверяем все задачи последовательно с задержками (чтобы избежать TOO_MANY_REQUESTS)
    const statusChecks: Promise<void>[] = [];

    // Функция для добавления задержки между запросами
    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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

      // ВСЕГДА проверяем реальный статус задачи через API
      statusChecks.push(
        delay(500).then(() =>
          checkTaskStatus(introDb.task_id).then(async (introStatus) => {
            console.log('Intro status from API:', introStatus);

            // Игнорируем TOO_MANY_REQUESTS - просто продолжаем ждать
            if (introStatus.error === 'TOO_MANY_REQUESTS') {
              console.log('Intro: TOO_MANY_REQUESTS, skipping check');
              return;
            }

            // Если задача завершена - скачиваем
            if (introStatus.status === 'completed' && introStatus.videoUrl) {
              console.log('Intro video completed, downloading...');
              const saved = await saveIntroVideo(introStatus.videoUrl);
              if (saved) {
                introReady = true;
                await updateUniversalVideoStatus('intro', 'completed', introStatus.videoUrl);
                console.log('Intro video saved successfully');
              }
            }
            // Если задача отклонена - помечаем как failed
            else if (
              introStatus.status === 'rejected with error' ||
              introStatus.status === 'rejected due to timeout'
            ) {
              console.log('Intro video rejected, marking as failed');
              await updateUniversalVideoStatus('intro', 'failed');
            }
            // Если задача всё ещё в процессе, но прошло много времени - проверяем таймаут
            else if (
              (introStatus.status === 'in queue' ||
                introStatus.status === 'in progress' ||
                introStatus.status === 'processing') &&
              timePassed > GENERATION_TIMEOUT_MS
            ) {
              console.log(
                `Intro still processing after ${Math.round(
                  timePassed / 60000
                )} min, marking as failed`
              );
              await updateUniversalVideoStatus('intro', 'failed');
            }
            // Если статус неизвестен и прошло много времени - сбрасываем
            else if (!introStatus.success && timePassed > GENERATION_TIMEOUT_MS) {
              console.log('Intro status check failed, marking as failed');
              await updateUniversalVideoStatus('intro', 'failed');
            }
          })
        )
      );
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

      // ВСЕГДА проверяем реальный статус задачи через API
      statusChecks.push(
        delay(1000).then(() =>
          checkTaskStatus(outroDb.task_id).then(async (outroStatus) => {
            console.log('Outro status from API:', outroStatus);

            // Игнорируем TOO_MANY_REQUESTS - просто продолжаем ждать
            if (outroStatus.error === 'TOO_MANY_REQUESTS') {
              console.log('Outro: TOO_MANY_REQUESTS, skipping check');
              return;
            }

            // Если задача завершена - скачиваем
            if (outroStatus.status === 'completed' && outroStatus.videoUrl) {
              console.log('Outro video completed, downloading...');
              const saved = await saveOutroVideo(outroStatus.videoUrl);
              if (saved) {
                outroReady = true;
                await updateUniversalVideoStatus('outro', 'completed', outroStatus.videoUrl);
                console.log('Outro video saved successfully');
              }
            }
            // Если задача отклонена - помечаем как failed
            else if (
              outroStatus.status === 'rejected with error' ||
              outroStatus.status === 'rejected due to timeout'
            ) {
              console.log('Outro video rejected, marking as failed');
              await updateUniversalVideoStatus('outro', 'failed');
            }
            // Если задача всё ещё в процессе, но прошло много времени - проверяем таймаут
            else if (
              (outroStatus.status === 'in queue' ||
                outroStatus.status === 'in progress' ||
                outroStatus.status === 'processing') &&
              timePassed > GENERATION_TIMEOUT_MS
            ) {
              console.log(
                `Outro still processing after ${Math.round(
                  timePassed / 60000
                )} min, marking as failed`
              );
              await updateUniversalVideoStatus('outro', 'failed');
            }
            // Если статус неизвестен и прошло много времени - сбрасываем
            else if (!outroStatus.success && timePassed > GENERATION_TIMEOUT_MS) {
              console.log('Outro status check failed, marking as failed');
              await updateUniversalVideoStatus('outro', 'failed');
            }
          })
        )
      );
    }

    // Ждём проверки универсальных видео
    await Promise.all(statusChecks);

    // Обновляем статус после проверки
    introReady = universalPaths.introExists || fs.existsSync(universalPaths.intro);
    outroReady = universalPaths.outroExists || fs.existsSync(universalPaths.outro);

    // Проверяем статус персонального видео (с задержкой после предыдущих проверок)
    await delay(1500);
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
      // Скачиваем персональное видео (если еще не скачано)
      const personalPath = getPersonalVideoPath(order.id);

      if (!fs.existsSync(personalPath)) {
        console.log(`📥 Personal video not found locally, downloading from: ${personalVideoUrl}`);
        console.log(`   Saving to: ${personalPath}`);
        const downloaded = await downloadVideo(personalVideoUrl, personalPath);
        if (!downloaded) {
          console.error('❌ Failed to download personal video');
          return NextResponse.json({
            success: true,
            taskId: Number(taskId),
            status: 1,
            statusDescription: 'processing',
            isCompleted: false,
            isFailed: false,
            message: 'Ошибка загрузки персонального видео',
          });
        }
        console.log(`✅ Personal video downloaded successfully`);
      } else {
        const personalFileSize = fs.statSync(personalPath).size;
        console.log(`✅ Personal video already exists locally: ${personalPath}`);
        console.log(
          `   File size: ${personalFileSize} bytes (${(personalFileSize / 1024 / 1024).toFixed(
            2
          )} MB)`
        );
      }

      // Если все части готовы - склеиваем
      if (introReady && outroReady && fs.existsSync(personalPath)) {
        const finalPath = getFinalVideoPath(order.id);

        // Проверяем размеры всех частей для валидации
        const introSize = fs.existsSync(universalPaths.intro)
          ? fs.statSync(universalPaths.intro).size
          : 0;
        const personalSize = fs.statSync(personalPath).size;
        const outroSize = fs.existsSync(universalPaths.outro)
          ? fs.statSync(universalPaths.outro).size
          : 0;

        // Исправленная формула: сумма всех частей * 0.7 (коэффициент учитывает перекодирование)
        const totalPartsSize = introSize + personalSize + outroSize;
        const expectedMinSize = totalPartsSize * 0.7;

        console.log('=== Video Size Validation ===');
        console.log(`Intro size: ${introSize} bytes (${(introSize / 1024 / 1024).toFixed(2)} MB)`);
        console.log(
          `Personal size: ${personalSize} bytes (${(personalSize / 1024 / 1024).toFixed(2)} MB)`
        );
        console.log(`Outro size: ${outroSize} bytes (${(outroSize / 1024 / 1024).toFixed(2)} MB)`);
        console.log(
          `Total parts size: ${totalPartsSize} bytes (${(totalPartsSize / 1024 / 1024).toFixed(
            2
          )} MB)`
        );
        console.log(
          `Expected minimum final size: ${expectedMinSize} bytes (${(
            expectedMinSize /
            1024 /
            1024
          ).toFixed(2)} MB)`
        );
        console.log(`Order status: ${order.status}`);

        let needsConcatenation = !fs.existsSync(finalPath);

        // Принудительная проверка размера даже для завершенных заказов
        // Если файл существует, проверяем его размер
        if (fs.existsSync(finalPath)) {
          const finalSize = fs.statSync(finalPath).size;
          console.log(
            `Final video exists: ${finalPath}, size: ${finalSize} bytes (${(
              finalSize /
              1024 /
              1024
            ).toFixed(2)} MB)`
          );
          console.log(
            `Expected min: ${expectedMinSize} bytes (${(expectedMinSize / 1024 / 1024).toFixed(
              2
            )} MB)`
          );

          // Если финальный файл слишком маленький (меньше 70% от суммы всех частей), пересоздаём
          if (finalSize < expectedMinSize) {
            console.log(
              `❌ Final video too small: ${finalSize} < ${expectedMinSize} (${(
                (finalSize / expectedMinSize) *
                100
              ).toFixed(1)}% of expected)`
            );
            console.log(`🗑️ Deleting incorrect final video and will recreate...`);
            // Удаляем неправильный файл
            fs.unlinkSync(finalPath);
            needsConcatenation = true;
          } else {
            console.log(
              `✅ Final video size is OK: ${finalSize} >= ${expectedMinSize} (${(
                (finalSize / expectedMinSize) *
                100
              ).toFixed(1)}% of expected)`
            );
          }
        } else {
          console.log(`Final video does not exist, will create: ${finalPath}`);
        }

        if (needsConcatenation) {
          console.log('🔄 All parts ready, starting video concatenation...');
          console.log(`   Intro: ${universalPaths.intro}`);
          console.log(`   Personal: ${personalPath}`);
          console.log(`   Outro: ${universalPaths.outro}`);
          console.log(`   Output: ${finalPath}`);

          const concatenated = await concatenateVideos(
            universalPaths.intro,
            personalPath,
            universalPaths.outro,
            finalPath
          );

          if (concatenated) {
            // Проверяем что файл создан и имеет правильный размер
            if (fs.existsSync(finalPath)) {
              const finalSize = fs.statSync(finalPath).size;
              console.log(`✅ Videos concatenated successfully!`);
              console.log(
                `   Final video size: ${finalSize} bytes (${(finalSize / 1024 / 1024).toFixed(
                  2
                )} MB)`
              );
              console.log(
                `   Expected minimum: ${expectedMinSize} bytes (${(
                  expectedMinSize /
                  1024 /
                  1024
                ).toFixed(2)} MB)`
              );

              if (finalSize < expectedMinSize) {
                console.error(
                  `⚠️ WARNING: Final video size (${finalSize} bytes = ${(
                    finalSize /
                    1024 /
                    1024
                  ).toFixed(2)} MB) is too small!`
                );
                console.error(
                  `   Expected at least: ${expectedMinSize} bytes (${(
                    expectedMinSize /
                    1024 /
                    1024
                  ).toFixed(2)} MB)`
                );
                console.error(`   Concatenation may have failed or video is incomplete.`);
              } else {
                console.log(`   ✅ Final video size validation passed!`);
              }
            }

            const finalVideoUrl = `/api/videos/stream/final/final_${order.id}.mp4`;
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
            const localPersonalUrl = `/api/videos/stream/personal/personal_${order.id}.mp4`;
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
          // Финальное видео уже существует и имеет правильный размер
          const finalVideoUrl = `/api/videos/stream/final/final_${order.id}.mp4`;
          console.log(`✅ Using existing final video (size validated): ${finalVideoUrl}`);

          // Обновляем URL в базе, если он отличается (например, был сохранен персональный или интро)
          if (order.video_url !== finalVideoUrl) {
            console.log(
              `📝 Updating video_url in DB from "${order.video_url}" to "${finalVideoUrl}"`
            );
            await updateOrderStatus(Number(taskId), 'completed', 'Видео готово', finalVideoUrl);
          }

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
      personalStatus.status === 'rejected due to timeout' ||
      personalStatus.status?.includes('rejected');

    if (isFailed) {
      const errorDetails = personalStatus.error || personalStatus.status || 'Неизвестная ошибка';
      console.error(`❌ Personal video task ${taskId} failed:`);
      console.error(`   Status: ${personalStatus.status}`);
      console.error(`   Error: ${errorDetails}`);
      console.error(`   Full status object:`, JSON.stringify(personalStatus, null, 2));

      await updateOrderStatus(
        Number(taskId),
        personalStatus.status || 'rejected with error',
        errorDetails,
        undefined,
        errorDetails
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
