import { getUserFromRequest } from '@/lib/auth';
import {
  createOrder,
  getUniversalVideo,
  initDb,
  setUniversalVideo,
  updateOrderTaskId,
} from '@/lib/db';
import {
  checkUniversalVideosExist,
  createVideoTask,
  generateIntroVideo,
  generateOutroVideo,
  generatePersonalPrompt,
} from '@/lib/video-generator';
import { NextRequest, NextResponse } from 'next/server';

// Инициализируем БД при первом импорте
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

interface RequestBody {
  childName: string;
  photo1: string;
  photo1Comment: string;
  photo2: string;
  photo2Comment: string;
}

export async function POST(request: NextRequest) {
  try {
    await ensureDbInitialized();

    // Проверка авторизации
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 });
    }

    const body: RequestBody = await request.json();
    const { childName, photo1, photo1Comment, photo2, photo2Comment } = body;

    // Валидация
    if (!childName || !photo1Comment || !photo2Comment) {
      return NextResponse.json(
        { error: 'Имя ребёнка и комментарии к фото обязательны' },
        { status: 400 }
      );
    }

    // БЕСПЛАТНО - без проверки баланса
    const COST = 0;

    // Создаём заказ в БД
    const { orderId, orderNumber } = await createOrder(
      user.id,
      childName,
      photo1 || '',
      photo1Comment,
      photo2 || '',
      photo2Comment,
      COST
    );

    // Проверяем наличие универсальных видео (файлы на диске)
    const universalVideos = checkUniversalVideosExist();
    console.log('Universal videos exist:', universalVideos);

    // Проверяем есть ли уже запущенная генерация универсальных видео
    const introDb = await getUniversalVideo('intro');
    const outroDb = await getUniversalVideo('outro');

    const customerId = `web_user_${user.id}`;
    const tasksToGenerate: { type: string; taskId?: number }[] = [];

    // Запускаем все задачи параллельно
    const generateTasks: Promise<void>[] = [];

    // Если нет intro файла и нет активной генерации - генерируем
    if (!universalVideos.intro && (!introDb || introDb.status === 'failed')) {
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
    } else if (introDb && introDb.task_id) {
      // Есть активная генерация - добавляем в список для отслеживания
      tasksToGenerate.push({ type: 'intro', taskId: introDb.task_id });
    }

    // Если нет outro файла и нет активной генерации - генерируем
    if (!universalVideos.outro && (!outroDb || outroDb.status === 'failed')) {
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

    // Генерируем персональный блок
    const personalPrompt = generatePersonalPrompt(childName, photo1Comment, photo2Comment);
    console.log('Creating personal video task for:', childName);
    console.log('Personal prompt:', personalPrompt);

    let personalTaskId: number | undefined;
    generateTasks.push(
      createVideoTask(personalPrompt, customerId).then((result) => {
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
      return NextResponse.json({ error: 'Ошибка создания персонального видео' }, { status: 500 });
    }

    // Обновляем заказ с основным task_id (персональный)
    await updateOrderTaskId(orderId, personalTaskId);

    // Находим taskId для intro и outro
    const introTask = tasksToGenerate.find((t) => t.type === 'intro');
    const outroTask = tasksToGenerate.find((t) => t.type === 'outro');

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
    });
  } catch (error) {
    console.error('Error in generate-video:', error);
    return NextResponse.json(
      { error: 'Ошибка при создании видео. Попробуйте позже.' },
      { status: 500 }
    );
  }
}
