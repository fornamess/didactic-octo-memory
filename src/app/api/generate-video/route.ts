import { getUserFromRequest } from '@/lib/auth';
import { BASE_URL, SERVICE_COST, VIDEO_STORAGE_PATH } from '@/lib/config';
import {
  createOrder,
  ensureDbInitialized,
  getUniversalVideo,
  getUserBalance,
  setUniversalVideo,
  updateOrderTaskId,
  updateUserBalance,
} from '@/lib/db';
import { generateVideoRateLimit, checkRateLimit } from '@/lib/rate-limit';
import { GenerateVideoSchema, validateRequest } from '@/lib/validation';
import {
  checkUniversalVideosExist,
  createVideoTask,
  generateIntroVideo,
  generateOutroVideo,
  generatePersonalPrompt,
} from '@/lib/video-generator';
import fs from 'fs';
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';

// Функция для сохранения base64 изображения на сервер
async function saveBase64Image(
  base64Data: string,
  orderId: number,
  photoNumber: 1 | 2
): Promise<string | null> {
  try {
    // Проверяем формат base64
    const base64Match = base64Data.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!base64Match) {
      console.error('Invalid base64 image format');
      return null;
    }

    const [, imageType, base64String] = base64Match;
    const imageBuffer = Buffer.from(base64String, 'base64');

    // Создаём директорию для изображений
    const imagesDir = path.join(VIDEO_STORAGE_PATH, 'images');
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
    }

    // Сохраняем изображение
    const fileName = `photo${photoNumber}_order${orderId}.${
      imageType === 'jpeg' ? 'jpg' : imageType
    }`;
    const filePath = path.join(imagesDir, fileName);
    fs.writeFileSync(filePath, imageBuffer);

    // Возвращаем публичный URL
    const publicUrl = `${BASE_URL}/api/images/${fileName}`;
    return publicUrl;
  } catch (error) {
    console.error('Error saving base64 image:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureDbInitialized();

    // Проверка авторизации
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 });
    }

    // Rate limiting (SEC-010)
    const identifier = `${user.id}_${request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'anonymous'}`;
    const rateLimitResult = await checkRateLimit(generateVideoRateLimit, identifier);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Слишком много запросов на генерацию видео. Подождите немного.' },
        { status: 429 }
      );
    }

    const body = await request.json();

    // Валидация с помощью Zod
    const validation = validateRequest(GenerateVideoSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { childName, childAge, photo1, photo1Comment, photo2, photo2Comment } = validation.data;

    // Проверка баланса (если сервис платный)
    if (SERVICE_COST > 0) {
      const balance = await getUserBalance(user.id);
      if (balance < SERVICE_COST) {
        return NextResponse.json(
          { error: `Недостаточно средств. Требуется: ${SERVICE_COST} Койнов` },
          { status: 400 }
        );
      }
    }

    // Создаём заказ в БД
    const { orderId, orderNumber } = await createOrder(
      user.id,
      childName,
      photo1 || '',
      photo1Comment,
      photo2 || '',
      photo2Comment,
      SERVICE_COST
    );

    // Сохраняем изображения на сервер и получаем их URL
    let photo1Url: string | null = null;
    let photo2Url: string | null = null;

    if (photo1) {
      photo1Url = await saveBase64Image(photo1, orderId, 1);
      if (!photo1Url) {
        console.warn('Failed to save photo1, continuing without image reference');
      }
    }

    if (photo2) {
      photo2Url = await saveBase64Image(photo2, orderId, 2);
      if (!photo2Url) {
        console.warn('Failed to save photo2, continuing without image reference');
      }
    }

    // Списываем средства (если платно)
    if (SERVICE_COST > 0) {
      await updateUserBalance(user.id, -SERVICE_COST);
    }

    // Проверяем наличие универсальных видео (файлы на диске)
    const universalVideos = checkUniversalVideosExist();
    console.log('=== Universal Videos Check ===');
    console.log('Universal videos exist:', universalVideos);

    // Проверяем есть ли уже запущенная генерация универсальных видео
    let introDb = await getUniversalVideo('intro');
    let outroDb = await getUniversalVideo('outro');

    console.log('=== Universal Videos DB Status ===');
    console.log('introDb:', introDb);
    console.log('outroDb:', outroDb);

    // Проверка таймаута и сброс застрявших генераций происходит в check-status
    // Здесь мы просто проверяем статус из БД

    const customerId = `web_user_${user.id}`;
    const tasksToGenerate: { type: string; taskId?: number }[] = [];

    // Запускаем все задачи параллельно
    const generateTasks: Promise<void>[] = [];

    // Если нет intro файла и нет активной генерации - генерируем
    // Также перезапускаем если статус 'pending' (застрял) или 'failed'
    const shouldGenerateIntro = !universalVideos.intro && (!introDb || introDb.status === 'failed' || introDb.status === 'pending');
    console.log(
      'Should generate intro?',
      shouldGenerateIntro,
      '(file exists:',
      universalVideos.intro,
      ', db status:',
      introDb?.status,
      ')'
    );

    if (shouldGenerateIntro) {
      console.log('Intro video not found, will generate...');
      generateTasks.push(
        generateIntroVideo(customerId).then(async (result) => {
          if (result.success && result.taskId) {
            tasksToGenerate.push({ type: 'intro', taskId: result.taskId });
            await setUniversalVideo('intro', result.taskId, 'processing');
          } else {
            console.error('Failed to create intro task:', result.error);
          }
        })
      );
    } else if (introDb && introDb.task_id && introDb.status === 'processing') {
      // Есть активная генерация - добавляем в список для отслеживания
      tasksToGenerate.push({ type: 'intro', taskId: introDb.task_id });
    }

    // Если нет outro файла и нет активной генерации - генерируем
    // Также перезапускаем если статус 'pending' (застрял) или 'failed'
    const shouldGenerateOutro = !universalVideos.outro && (!outroDb || outroDb.status === 'failed' || outroDb.status === 'pending');
    console.log(
      'Should generate outro?',
      shouldGenerateOutro,
      '(file exists:',
      universalVideos.outro,
      ', db status:',
      outroDb?.status,
      ')'
    );

    if (shouldGenerateOutro) {
      console.log('Outro video not found, will generate...');
      generateTasks.push(
        generateOutroVideo(customerId).then(async (result) => {
          if (result.success && result.taskId) {
            tasksToGenerate.push({ type: 'outro', taskId: result.taskId });
            await setUniversalVideo('outro', result.taskId, 'processing');
          } else {
            console.error('Failed to create outro task:', result.error);
          }
        })
      );
    } else if (outroDb && outroDb.task_id) {
      // Есть активная генерация - добавляем в список для отслеживания
      tasksToGenerate.push({ type: 'outro', taskId: outroDb.task_id });
    }

    // Генерируем персональный блок с учётом возраста
    const personalPrompt = generatePersonalPrompt(
      childName,
      photo1Comment,
      photo2Comment,
      childAge
    );
    console.log('Creating personal video task for:', childName, childAge ? `age ${childAge}` : '');
    console.log('Personal prompt:', personalPrompt);

    // Используем первое изображение как референс для генерации видео (если доступно)
    // Sora API может использовать image_url для генерации видео по референсу
    let personalTaskId: number | undefined;
    generateTasks.push(
      createVideoTask(personalPrompt, customerId, {
        imageUrl: photo1Url || undefined, // Используем первое фото как референс
        resolution: 720, // Используем 720p для совместимости (fallback обработает если нужно)
        dimensions: '16:9',
        duration: 20, // Увеличена длительность для полного текста
        effectId: 0,
      }).then((result) => {
        if (result.success && result.taskId) {
          tasksToGenerate.push({ type: 'personal', taskId: result.taskId });
          personalTaskId = result.taskId;
        } else {
          console.error('Failed to create personal task:', result.error);
        }
      })
    );

    // Ждём завершения всех запросов
    await Promise.all(generateTasks);

    // Проверяем, что персональное видео создано
    if (!personalTaskId) {
      // Возвращаем средства при ошибке
      if (SERVICE_COST > 0) {
        await updateUserBalance(user.id, SERVICE_COST);
      }
      return NextResponse.json({ error: 'Ошибка создания персонального видео' }, { status: 500 });
    }

    // Обновляем заказ с основным task_id (персональный)
    await updateOrderTaskId(orderId, personalTaskId);

    // Находим taskId для intro и outro
    const introTask = tasksToGenerate.find((t) => t.type === 'intro');
    const outroTask = tasksToGenerate.find((t) => t.type === 'outro');

    // Получаем обновлённый баланс
    const newBalance = await getUserBalance(user.id);

    return NextResponse.json({
      success: true,
      taskId: personalTaskId,
      introTaskId: introTask?.taskId,
      outroTaskId: outroTask?.taskId,
      orderNumber: orderNumber,
      orderId: orderId,
      message: `Заказ #${orderNumber} создан! Генерация видео началась...`,
      childName: childName,
      tasks: tasksToGenerate,
      universalVideosExist: universalVideos,
      balance: newBalance,
    });
  } catch (error) {
    console.error('Error in generate-video:', error);
    return NextResponse.json(
      { error: 'Ошибка при создании видео. Попробуйте позже.' },
      { status: 500 }
    );
  }
}
