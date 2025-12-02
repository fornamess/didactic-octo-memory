import { getUserFromRequest } from '@/lib/auth';
import { GENERATION_TIMEOUT_MINUTES, SERVICE_COST } from '@/lib/config';
import {
  createOrder,
  ensureDbInitialized,
  getUniversalVideo,
  getUserBalance,
  setUniversalVideo,
  updateOrderTaskId,
  updateUniversalVideoStatus,
  updateUserBalance,
} from '@/lib/db';
import {
  checkUniversalVideosExist,
  createVideoTask,
  generateIntroVideo,
  generateOutroVideo,
  generatePersonalPrompt,
} from '@/lib/video-generator';
import { NextRequest, NextResponse } from 'next/server';

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

    // Таймаут для застрявших генераций
    const TIMEOUT_MS = GENERATION_TIMEOUT_MINUTES * 60 * 1000;
    const now = Date.now();

    // Проверяем, не застряла ли генерация intro
    if (introDb && introDb.status === 'processing') {
      const dateStr = (introDb.updated_at || introDb.created_at).replace(' ', 'T') + 'Z';
      const updatedAt = new Date(dateStr).getTime();
      const timePassed = now - updatedAt;
      console.log(`Intro generation age: ${Math.round(timePassed / 60000)} minutes`);
      
      if (timePassed > TIMEOUT_MS) {
        console.log('Intro generation stuck, resetting to failed...');
        await updateUniversalVideoStatus('intro', 'failed');
        introDb = { ...introDb, status: 'failed' };
      }
    }

    // Проверяем, не застряла ли генерация outro
    if (outroDb && outroDb.status === 'processing') {
      const dateStr = (outroDb.updated_at || outroDb.created_at).replace(' ', 'T') + 'Z';
      const updatedAt = new Date(dateStr).getTime();
      const timePassed = now - updatedAt;
      console.log(`Outro generation age: ${Math.round(timePassed / 60000)} minutes`);
      
      if (timePassed > TIMEOUT_MS) {
        console.log('Outro generation stuck, resetting to failed...');
        await updateUniversalVideoStatus('outro', 'failed');
        outroDb = { ...outroDb, status: 'failed' };
      }
    }

    const customerId = `web_user_${user.id}`;
    const tasksToGenerate: { type: string; taskId?: number }[] = [];

    // Запускаем все задачи параллельно
    const generateTasks: Promise<void>[] = [];

    // Если нет intro файла и нет активной генерации - генерируем
    const shouldGenerateIntro = !universalVideos.intro && (!introDb || introDb.status === 'failed');
    console.log('Should generate intro?', shouldGenerateIntro, '(file exists:', universalVideos.intro, ', db status:', introDb?.status, ')');
    
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
    } else if (introDb && introDb.task_id) {
      // Есть активная генерация - добавляем в список для отслеживания
      tasksToGenerate.push({ type: 'intro', taskId: introDb.task_id });
    }

    // Если нет outro файла и нет активной генерации - генерируем
    const shouldGenerateOutro = !universalVideos.outro && (!outroDb || outroDb.status === 'failed');
    console.log('Should generate outro?', shouldGenerateOutro, '(file exists:', universalVideos.outro, ', db status:', outroDb?.status, ')');
    
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
