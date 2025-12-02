import fs from 'fs';
import path from 'path';
import {
  FFMPEG_PATH,
  VIDEO_PROMPTS,
  VIDEO_STORAGE_PATH,
  YES_AI_API_BASE,
  YES_AI_TOKEN,
} from './config';

// Инициализация хранилища видео (создание директорий)
// Симлинк создаётся в entrypoint.sh при старте контейнера
function ensureVideoStorage() {
  // Создаём директории в персистентном хранилище
  const storageDirs = [
    VIDEO_STORAGE_PATH,
    path.join(VIDEO_STORAGE_PATH, 'intro'),
    path.join(VIDEO_STORAGE_PATH, 'outro'),
    path.join(VIDEO_STORAGE_PATH, 'personal'),
    path.join(VIDEO_STORAGE_PATH, 'final'),
  ];

  for (const dir of storageDirs) {
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch (error) {
        console.warn(`Could not create directory ${dir}:`, error);
      }
    }
  }
}

// Инициализируем при первом импорте
ensureVideoStorage();

// Пути к универсальным видео (используем storage path для записи)
const INTRO_PATH = path.join(VIDEO_STORAGE_PATH, 'intro.mp4');
const OUTRO_PATH = path.join(VIDEO_STORAGE_PATH, 'outro.mp4');

interface GenerationResult {
  success: boolean;
  taskId?: number;
  error?: string;
}

interface StatusResult {
  success: boolean;
  status: string;
  videoUrl?: string;
  error?: string;
}

// Проверка существования универсальных видео
export function checkUniversalVideosExist(): { intro: boolean; outro: boolean } {
  return {
    intro: fs.existsSync(INTRO_PATH),
    outro: fs.existsSync(OUTRO_PATH),
  };
}

// Создание задания на генерацию видео с поддержкой Sora API
export async function createVideoTask(
  prompt: string,
  customerId: string,
  options?: {
    imageUrl?: string; // URL изображения для генерации видео по референсу
    resolution?: number; // Разрешение видео (480, 720, 1080)
    dimensions?: string; // Соотношение сторон ('1:1', '9:16', '16:9')
    duration?: number; // Длительность видео (5, 10, 15, 20)
    effectId?: number; // ID эффекта (0-5)
  }
): Promise<GenerationResult> {
  try {
    if (!YES_AI_TOKEN) {
      console.error('YES_AI_TOKEN not configured');
      return { success: false, error: 'API токен не настроен' };
    }

    // Параметры по умолчанию
    // Для версии 2 API используем более совместимые параметры: 720p + 15 секунд
    // Версия 2 обычно поддерживает duration только 10 или 15 секунд
    const resolution = options?.resolution || 720; // Используем 720p для совместимости
    const dimensions = options?.dimensions || '16:9';
    // Для версии 2 максимальная длительность обычно 15 секунд, но пробуем запрошенную
    const duration = options?.duration || 15;
    const effectId = options?.effectId || 0;

    // Формируем тело запроса согласно API Sora
    // Пробуем сначала с версией 2 (если поддерживается)
    const requestBody: {
      prompt: string;
      customer_id: string;
      resolution: number;
      dimensions: string;
      duration: number;
      effect_id: number;
      image_url?: string;
      version?: number;
    } = {
      prompt: prompt,
      customer_id: customerId,
      resolution: resolution,
      dimensions: dimensions,
      duration: duration,
      effect_id: effectId,
      version: 2, // Пробуем версию 2 для поддержки лучших параметров
    };

    // Если указан image_url, добавляем его (для генерации по референсу)
    if (options?.imageUrl) {
      requestBody.image_url = options.imageUrl;
      console.log('Using image reference for video generation:', options.imageUrl);
    }

    console.log('Creating video task with customer_id:', customerId);
    console.log('Request parameters:', { resolution, dimensions, duration, effectId, version: 2 });

    const response = await fetch(`${YES_AI_API_BASE}/yesvideo/aniimage/sora`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${YES_AI_TOKEN}`,
      },
      body: JSON.stringify(requestBody),
    });

    const responseText = await response.text();
    console.log('Yes AI API response status:', response.status);
    console.log('Yes AI API response:', responseText);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      return { success: false, error: `Ошибка парсинга ответа: ${responseText}` };
    }

    // Если параметры не разрешены, пробуем с другими параметрами
    if (!data.success && data.message === 'PARAMETERS_IS_NOT_ALLOWED') {
      console.log('⚠️ Parameters not allowed, trying fallback parameters...');

      // Извлекаем доступные параметры из ответа API
      const versionParams = data.details?.version_parameters;
      const availableResolutions = versionParams?.sora_resolutions || [720];
      const availableDimensions = versionParams?.sora_dimensions || ['16:9'];
      const availableDurations = versionParams?.sora_durations || [10, 15];
      const availableEffects = versionParams?.sora_effects || [0];

      console.log('Available parameters from API:', {
        resolutions: availableResolutions,
        dimensions: availableDimensions,
        durations: availableDurations,
        effects: availableEffects,
      });

      // Выбираем максимально близкие параметры к желаемым
      // Приоритет: dimensions -> resolution -> duration -> effect
      const fallbackResolution = availableResolutions.includes(resolution)
        ? resolution
        : availableResolutions[availableResolutions.length - 1]; // Берем максимальное доступное
      const fallbackDimensions = availableDimensions.includes(dimensions)
        ? dimensions
        : availableDimensions[0];
      // Выбираем максимальную доступную длительность, но не больше желаемой
      const fallbackDuration =
        availableDurations
          .filter((d: number) => d <= duration)
          .sort((a: number, b: number) => b - a)[0] ||
        availableDurations[availableDurations.length - 1];
      const fallbackEffectId = availableEffects.includes(effectId) ? effectId : availableEffects[0];

      // Пробуем с выбранными параметрами
      const fallbackBody: {
        prompt: string;
        customer_id: string;
        resolution: number;
        dimensions: string;
        duration: number;
        effect_id: number;
        version: number;
        image_url?: string;
      } = {
        prompt: prompt,
        customer_id: customerId,
        resolution: fallbackResolution,
        dimensions: fallbackDimensions,
        duration: fallbackDuration,
        effect_id: fallbackEffectId,
        version: 2,
      };

      if (options?.imageUrl) {
        fallbackBody.image_url = options.imageUrl;
      }

      console.log('Trying fallback parameters:', fallbackBody);

      const fallbackResponse = await fetch(`${YES_AI_API_BASE}/yesvideo/aniimage/sora`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${YES_AI_TOKEN}`,
        },
        body: JSON.stringify(fallbackBody),
      });

      const fallbackResponseText = await fallbackResponse.text();
      console.log('Fallback response status:', fallbackResponse.status);
      console.log('Fallback response:', fallbackResponseText);

      let fallbackData;
      try {
        fallbackData = JSON.parse(fallbackResponseText);
      } catch {
        return {
          success: false,
          error: `Ошибка парсинга ответа fallback: ${fallbackResponseText}`,
        };
      }

      // Если изображение недоступно или размер не валиден, пробуем без него
      if (
        !fallbackData.success &&
        (fallbackData.message === 'IMAGE_NOT_FOUND' ||
          fallbackData.message === 'IMAGE_FILE_SIZE_NOT_VALID')
      ) {
        console.log(`⚠️ Image error (${fallbackData.message}), trying without image reference...`);

        const fallbackWithoutImage: {
          prompt: string;
          customer_id: string;
          resolution: number;
          dimensions: string;
          duration: number;
          effect_id: number;
          version: number;
        } = {
          prompt: prompt,
          customer_id: customerId,
          resolution: fallbackResolution,
          dimensions: fallbackDimensions,
          duration: fallbackDuration,
          effect_id: fallbackEffectId,
          version: 2,
        };

        console.log('Trying fallback without image:', fallbackWithoutImage);

        const fallbackWithoutImageResponse = await fetch(
          `${YES_AI_API_BASE}/yesvideo/aniimage/sora`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${YES_AI_TOKEN}`,
            },
            body: JSON.stringify(fallbackWithoutImage),
          }
        );

        const fallbackWithoutImageText = await fallbackWithoutImageResponse.text();
        console.log('Fallback without image response status:', fallbackWithoutImageResponse.status);
        console.log('Fallback without image response:', fallbackWithoutImageText);

        let fallbackWithoutImageData;
        try {
          fallbackWithoutImageData = JSON.parse(fallbackWithoutImageText);
        } catch {
          return {
            success: false,
            error: `Ошибка парсинга ответа fallback без изображения: ${fallbackWithoutImageText}`,
          };
        }

        if (!fallbackWithoutImageData.success) {
          console.error(
            'Yes AI API fallback without image error:',
            fallbackWithoutImageData.message
          );
          return { success: false, error: fallbackWithoutImageData.message };
        }

        const fallbackWithoutImageTaskId = fallbackWithoutImageData.results?.animation_data?.id;
        if (!fallbackWithoutImageTaskId) {
          return { success: false, error: 'Не получен ID задания (fallback без изображения)' };
        }

        console.log('✅ Fallback without image worked, task ID:', fallbackWithoutImageTaskId);
        return { success: true, taskId: fallbackWithoutImageTaskId };
      }

      if (!fallbackData.success) {
        console.error('Yes AI API fallback error:', fallbackData.message);
        return { success: false, error: fallbackData.message };
      }

      const fallbackTaskId = fallbackData.results?.animation_data?.id;
      if (!fallbackTaskId) {
        return { success: false, error: 'Не получен ID задания (fallback)' };
      }

      console.log('✅ Fallback parameters worked, task ID:', fallbackTaskId);
      return { success: true, taskId: fallbackTaskId };
    }

    // Если изображение недоступно или размер не валиден в основном запросе, пробуем без него
    if (
      !data.success &&
      (data.message === 'IMAGE_NOT_FOUND' || data.message === 'IMAGE_FILE_SIZE_NOT_VALID')
    ) {
      console.log(
        `⚠️ Image error (${data.message}) in main request, trying without image reference...`
      );

      const requestBodyWithoutImage: {
        prompt: string;
        customer_id: string;
        resolution: number;
        dimensions: string;
        duration: number;
        effect_id: number;
        version: number;
      } = {
        prompt: prompt,
        customer_id: customerId,
        resolution: resolution,
        dimensions: dimensions,
        duration: duration,
        effect_id: effectId,
        version: 2,
      };

      console.log('Trying without image:', requestBodyWithoutImage);

      const responseWithoutImage = await fetch(`${YES_AI_API_BASE}/yesvideo/aniimage/sora`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${YES_AI_TOKEN}`,
        },
        body: JSON.stringify(requestBodyWithoutImage),
      });

      const responseWithoutImageText = await responseWithoutImage.text();
      console.log('Response without image status:', responseWithoutImage.status);
      console.log('Response without image:', responseWithoutImageText);

      let dataWithoutImage;
      try {
        dataWithoutImage = JSON.parse(responseWithoutImageText);
      } catch {
        return {
          success: false,
          error: `Ошибка парсинга ответа без изображения: ${responseWithoutImageText}`,
        };
      }

      if (!dataWithoutImage.success) {
        console.error('Yes AI API error without image:', dataWithoutImage.message);
        return { success: false, error: dataWithoutImage.message };
      }

      const taskIdWithoutImage = dataWithoutImage.results?.animation_data?.id;
      if (!taskIdWithoutImage) {
        return { success: false, error: 'Не получен ID задания (без изображения)' };
      }

      console.log('✅ Request without image worked, task ID:', taskIdWithoutImage);
      return { success: true, taskId: taskIdWithoutImage };
    }

    if (!data.success) {
      console.error('Yes AI API error:', data.message);
      return { success: false, error: data.message };
    }

    const taskId = data.results?.animation_data?.id;
    if (!taskId) {
      return { success: false, error: 'Не получен ID задания' };
    }

    return { success: true, taskId };
  } catch (error) {
    console.error('Create video task error:', error);
    return { success: false, error: 'Ошибка создания задания' };
  }
}

// Кэш для последних запросов статуса (чтобы избежать TOO_MANY_REQUESTS)
const statusCache = new Map<number, { result: StatusResult; timestamp: number }>();
const STATUS_CACHE_TTL = 5000; // 5 секунд кэш
const MIN_REQUEST_INTERVAL = 2000; // Минимум 2 секунды между запросами
let lastRequestTime = 0;

// Проверка статуса задания
export async function checkTaskStatus(taskId: number): Promise<StatusResult> {
  try {
    if (!YES_AI_TOKEN) {
      return { success: false, status: 'error', error: 'API токен не настроен' };
    }

    // Проверяем кэш
    const cached = statusCache.get(taskId);
    if (cached && Date.now() - cached.timestamp < STATUS_CACHE_TTL) {
      return cached.result;
    }

    // Защита от слишком частых запросов
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
      await new Promise((resolve) =>
        setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest)
      );
    }
    lastRequestTime = Date.now();

    const response = await fetch(`${YES_AI_API_BASE}/yesvideo/animations/${taskId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${YES_AI_TOKEN}`,
      },
    });

    const data = await response.json();

    // Логируем полный ответ для отладки отклонений
    if (!data.success || data.results?.animation_data?.status_description?.includes('rejected')) {
      console.log(`[CHECK-STATUS] Task ${taskId} API response:`, JSON.stringify(data, null, 2));
    }

    if (!data.success) {
      const result: StatusResult = {
        success: false,
        status: 'error',
        error: data.message,
      };
      // Кэшируем ошибки тоже, но на меньшее время
      statusCache.set(taskId, { result, timestamp: Date.now() });
      return result;
    }

    const animationData = data.results?.animation_data;
    if (!animationData) {
      const result: StatusResult = {
        success: false,
        status: 'error',
        error: 'Данные не найдены',
      };
      statusCache.set(taskId, { result, timestamp: Date.now() });
      return result;
    }

    // Извлекаем информацию об ошибке, если статус отклонен
    const statusDescription = animationData.status_description || '';
    const isRejected = statusDescription.includes('rejected');

    // Пытаемся извлечь информацию об ошибке из ответа API
    let errorMessage: string | undefined;
    if (isRejected) {
      // Проверяем разные возможные места, где может быть информация об ошибке
      errorMessage =
        animationData.error_message ||
        animationData.error ||
        animationData.rejection_reason ||
        data.message ||
        'Видео отклонено без указания причины';

      console.error(`❌ Task ${taskId} rejected with status: "${statusDescription}"`);
      console.error(`   Error details:`, {
        error_message: animationData.error_message,
        error: animationData.error,
        rejection_reason: animationData.rejection_reason,
        full_animation_data: animationData,
      });
    }

    const result: StatusResult = {
      success: true,
      status: statusDescription,
      videoUrl: animationData.result_url || undefined,
      error: errorMessage,
    };

    // Кэшируем результат
    statusCache.set(taskId, { result, timestamp: Date.now() });

    return result;
  } catch (error) {
    console.error('Check task status error:', error);
    return { success: false, status: 'error', error: 'Ошибка проверки статуса' };
  }
}

// Скачивание видео по URL
export async function downloadVideo(url: string, savePath: string): Promise<boolean> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to download video');
    }

    const buffer = await response.arrayBuffer();

    // Создаём директорию если не существует
    const dir = path.dirname(savePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(savePath, Buffer.from(buffer));
    return true;
  } catch (error) {
    console.error('Download video error:', error);
    return false;
  }
}

// Генерация промпта для персонального блока
export function generatePersonalPrompt(
  childName: string,
  photo1Comment: string,
  photo2Comment: string,
  childAge?: number
): string {
  const ageText = childAge ? `, которому ${childAge} ${getAgeWord(childAge)}` : '';
  return `Дед Мороз в красной шубе сидит в уютной комнате с ёлкой. Он смотрит в камеру и произносит слова, обращаясь к ребёнку по имени ${childName}${ageText}. В кадре появляется мягкое сияние, показывающее воспоминание о ребёнке - "${photo1Comment}". Затем плавный снежный переход к другому моменту - "${photo2Comment}". Дед Мороз улыбается с теплотой и гордостью. Атмосфера волшебная, персональная, тёплая. Качество видео высокое, кинематографичное. Дед Мороз говорит медленно и четко, делая паузы между фразами, чтобы все слова были понятны. ВАЖНО: Распределите речь и действия равномерно на всю длительность видео, не обрывайте видео раньше времени. Убедитесь, что Дед Мороз успевает полностью произнести все слова до конца видео.`;
}

// Вспомогательная функция для правильного склонения слова "год"
function getAgeWord(age: number): string {
  const lastDigit = age % 10;
  const lastTwoDigits = age % 100;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
    return 'лет';
  }
  if (lastDigit === 1) {
    return 'год';
  }
  if (lastDigit >= 2 && lastDigit <= 4) {
    return 'года';
  }
  return 'лет';
}

// Генерация универсального интро (вызывается если файла нет)
export async function generateIntroVideo(customerId: string): Promise<GenerationResult> {
  console.log('Generating intro video...');
  return createVideoTask(VIDEO_PROMPTS.intro, customerId, {
    resolution: 720, // Используем 720p для совместимости
    dimensions: '16:9',
    duration: 15, // Используем 15 секунд для совместимости с версией 2 API
    effectId: 0,
  });
}

// Генерация универсального финала (вызывается если файла нет)
export async function generateOutroVideo(customerId: string): Promise<GenerationResult> {
  console.log('Generating outro video...');
  return createVideoTask(VIDEO_PROMPTS.outro, customerId, {
    resolution: 720, // Используем 720p для совместимости
    dimensions: '16:9',
    duration: 15, // Используем 15 секунд для совместимости с версией 2 API
    effectId: 0,
  });
}

// Сохранение интро видео
export async function saveIntroVideo(videoUrl: string): Promise<boolean> {
  console.log('Saving intro video to:', INTRO_PATH);
  return downloadVideo(videoUrl, INTRO_PATH);
}

// Сохранение финала
export async function saveOutroVideo(videoUrl: string): Promise<boolean> {
  console.log('Saving outro video to:', OUTRO_PATH);
  return downloadVideo(videoUrl, OUTRO_PATH);
}

// Получение путей к универсальным видео
// Возвращаем пути к реальным файлам в storage для склейки
// И пути для Next.js статики для отображения
export function getUniversalVideoPaths() {
  // Проверяем существование в storage
  const introExists = fs.existsSync(INTRO_PATH);
  const outroExists = fs.existsSync(OUTRO_PATH);

  console.log('Checking universal video paths:');
  console.log('  INTRO_PATH:', INTRO_PATH, 'exists:', introExists);
  console.log('  OUTRO_PATH:', OUTRO_PATH, 'exists:', outroExists);

  return {
    // Используем storage paths для склейки (реальные файлы)
    intro: INTRO_PATH,
    outro: OUTRO_PATH,
    // Пути для веба (через public/videos)
    introPublic: '/videos/intro.mp4',
    outroPublic: '/videos/outro.mp4',
    introExists,
    outroExists,
  };
}

// Склейка видео с помощью ffmpeg с плавными переходами
export async function concatenateVideos(
  introPath: string,
  personalPath: string,
  outroPath: string,
  outputPath: string
): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      // Проверяем существование всех входных файлов
      console.log('=== Concatenation Debug ===');
      console.log('Intro path:', introPath, 'exists:', fs.existsSync(introPath));
      console.log('Personal path:', personalPath, 'exists:', fs.existsSync(personalPath));
      console.log('Outro path:', outroPath, 'exists:', fs.existsSync(outroPath));
      console.log('Output path:', outputPath);

      if (!fs.existsSync(introPath)) {
        console.error('Intro video not found:', introPath);
        resolve(false);
        return;
      }
      if (!fs.existsSync(personalPath)) {
        console.error('Personal video not found:', personalPath);
        resolve(false);
        return;
      }
      if (!fs.existsSync(outroPath)) {
        console.error('Outro video not found:', outroPath);
        resolve(false);
        return;
      }

      // Проверяем размеры файлов
      const introSize = fs.statSync(introPath).size;
      const personalSize = fs.statSync(personalPath).size;
      const outroSize = fs.statSync(outroPath).size;
      console.log('File sizes - Intro:', introSize, 'Personal:', personalSize, 'Outro:', outroSize);

      // Создаём директорию для выходного файла
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Динамический импорт fluent-ffmpeg
      import('fluent-ffmpeg')
        .then((ffmpegModule) => {
          const ffmpeg = ffmpegModule.default;

          // Устанавливаем путь к ffmpeg
          ffmpeg.setFfmpegPath(FFMPEG_PATH);
          console.log('FFmpeg path:', FFMPEG_PATH);

          // Получаем длительность видео для расчета переходов
          const getVideoDuration = (videoPath: string): Promise<number> => {
            return new Promise((resolveDuration) => {
              ffmpeg.ffprobe(videoPath, (err, metadata) => {
                if (err || !metadata?.format?.duration) {
                  console.warn(`Could not get duration for ${videoPath}, using default 15s`);
                  resolveDuration(15);
                } else {
                  resolveDuration(metadata.format.duration);
                }
              });
            });
          };

          // Используем filter_complex для создания плавных переходов с затемнением
          Promise.all([
            getVideoDuration(introPath),
            getVideoDuration(personalPath),
            getVideoDuration(outroPath),
          ]).then(([introDuration, personalDuration, outroDuration]) => {
            console.log(
              `Video durations - Intro: ${introDuration}s, Personal: ${personalDuration}s, Outro: ${outroDuration}s`
            );

            // Длительность перехода (2 секунды)
            const fadeDuration = 2.0;
            // Время начала затемнения в конце каждого видео
            const introFadeOutStart = Math.max(0, introDuration - fadeDuration);
            const personalFadeOutStart = Math.max(0, personalDuration - fadeDuration);

            // Создаём сложный фильтр для плавных переходов с затемнением
            // Видео: применяем fade out в конце каждого видео и fade in в начале следующего
            // Аудио: объединяем все аудио потоки
            const filterComplex = `[0:v]fade=t=out:st=${introFadeOutStart}:d=${fadeDuration}[v0]; [1:v]fade=t=in:st=0:d=${fadeDuration},fade=t=out:st=${personalFadeOutStart}:d=${fadeDuration}[v1]; [2:v]fade=t=in:st=0:d=${fadeDuration}[v2]; [v0][v1][v2]concat=n=3:v=1:a=0[outv]; [0:a][1:a][2:a]concat=n=3:v=0:a=1[outa]`;

            console.log('Using filter_complex for smooth transitions with fade effects');
            console.log('Filter:', filterComplex);

            // Используем перекодирование с улучшенным качеством и плавными переходами
            const ffmpegCommand = ffmpeg()
              .input(introPath)
              .input(personalPath)
              .input(outroPath)
              .complexFilter(filterComplex)
              .outputOptions([
                '-map',
                '[outv]', // Используем выходной видео поток из фильтра
                '-map',
                '[outa]', // Используем выходной аудио поток из фильтра
                '-c:v',
                'libx264', // Кодек H.264
                '-c:a',
                'aac', // Кодек AAC для аудио
                '-b:a',
                '192k', // Битрейт аудио для лучшего качества
                '-preset',
                'medium', // Улучшенное качество (было ultrafast)
                '-crf',
                '23', // Лучшее качество (было 28, меньше = лучше качество)
                '-pix_fmt',
                'yuv420p', // Совместимый формат пикселей
                // Убрали -movflags +faststart, так как он вызывает проблемы при перезаписи файла
                // Можно добавить быстрый старт отдельным проходом после создания файла если нужно
                '-threads',
                '4', // Используем больше потоков для лучшей производительности
                '-y', // Перезаписывать выходной файл
              ])
              .output(outputPath);
            ffmpegCommand
              .on('start', (commandLine) => {
                console.log(
                  'FFmpeg started with command (high quality with fade transitions):',
                  commandLine
                );
              })
              .on('stderr', (stderrLine) => {
                // Логируем все важные строки stderr для отладки
                if (
                  stderrLine.includes('error') ||
                  stderrLine.includes('Error') ||
                  stderrLine.includes('killed') ||
                  stderrLine.includes('frame=') ||
                  stderrLine.includes('time=') ||
                  stderrLine.includes('bitrate=')
                ) {
                  console.log('FFmpeg stderr:', stderrLine);
                }
              })
              .on('progress', (progress) => {
                if (progress.percent) {
                  console.log(`Video concatenation progress: ${Math.round(progress.percent)}%`);
                }
              })
              .on('end', () => {
                // Проверяем что выходной файл создан и имеет адекватный размер
                if (fs.existsSync(outputPath)) {
                  const outputSize = fs.statSync(outputPath).size;
                  console.log(
                    '✅ Video concatenation completed with fade transitions:',
                    outputPath,
                    'size:',
                    outputSize,
                    `(${(outputSize / 1024 / 1024).toFixed(2)} MB)`
                  );

                  // Проверяем что файл не слишком маленький (не был прерван)
                  // Используем коэффициент 0.7 (как в check-status) для учета перекодирования
                  const expectedMinSize = (introSize + personalSize + outroSize) * 0.7;
                  console.log(
                    `Validating output file size: ${outputSize} bytes, expected minimum: ${expectedMinSize} bytes`
                  );

                  if (outputSize < expectedMinSize) {
                    console.error(
                      `⚠️ Warning: Output file size (${outputSize} bytes = ${(
                        outputSize /
                        1024 /
                        1024
                      ).toFixed(
                        2
                      )} MB) is too small, expected at least ${expectedMinSize} bytes (${(
                        expectedMinSize /
                        1024 /
                        1024
                      ).toFixed(2)} MB)`
                    );
                    console.error(
                      `   This is ${((outputSize / expectedMinSize) * 100).toFixed(
                        1
                      )}% of expected minimum size`
                    );
                    try {
                      fs.unlinkSync(outputPath);
                      console.log('🗑️ Deleted incomplete output file');
                    } catch (e) {
                      console.error('Failed to delete incorrect output file:', e);
                    }
                    resolve(false);
                    return;
                  }
                  console.log(
                    `✅ Output file size validation passed: ${outputSize} >= ${expectedMinSize}`
                  );
                  resolve(true);
                } else {
                  console.error('❌ Output file was not created:', outputPath);
                  resolve(false);
                }
              })
              .on('error', (err: Error, stdout, stderr) => {
                console.error('❌ FFmpeg error:', err.message);
                if (err.message.includes('killed') || err.message.includes('SIGKILL')) {
                  console.error('⚠️ FFmpeg was killed by system (likely out of memory/timeout)');
                }
                console.error('FFmpeg stdout:', stdout);
                console.error('FFmpeg stderr:', stderr);

                // Проверяем, возможно файл всё равно создан и имеет нормальный размер
                // Это может произойти при ошибке в конце процесса (например, с faststart)
                if (fs.existsSync(outputPath)) {
                  const outputSize = fs.statSync(outputPath).size;
                  const expectedMinSize = (introSize + personalSize + outroSize) * 0.5;

                  console.log(
                    `⚠️ FFmpeg error occurred, but output file exists. Size: ${outputSize} bytes (${(
                      outputSize /
                      1024 /
                      1024
                    ).toFixed(2)} MB)`
                  );

                  // Если файл имеет нормальный размер, возможно процесс завершился успешно,
                  // но была ошибка при финальной обработке (например, faststart)
                  if (outputSize >= expectedMinSize) {
                    console.log(
                      `✅ Output file size is acceptable (>= ${expectedMinSize} bytes), considering success despite error`
                    );
                    // Проверяем, не связана ли ошибка с faststart или trailer
                    const stderrStr = typeof stderr === 'string' ? stderr : String(stderr || '');
                    if (
                      err.message.includes('trailer') ||
                      err.message.includes('Unable to re-open') ||
                      err.message.includes('Error writing trailer') ||
                      stderrStr.includes('Error writing trailer') ||
                      stderrStr.includes('Unable to re-open') ||
                      stderrStr.includes('re-open')
                    ) {
                      console.log(
                        '✅ Error appears to be related to file finalization, but file is complete. Considering success.'
                      );
                      resolve(true);
                      return;
                    }
                  }

                  // Если файл слишком маленький или ошибка критична, удаляем его
                  try {
                    fs.unlinkSync(outputPath);
                    console.log('❌ Deleted incomplete output file');
                  } catch (e) {
                    console.error('Error deleting output file:', e);
                  }
                }

                resolve(false);
              })
              .run();
          });

          // Сохраняем ссылку на процесс для возможного убийства при таймауте
          // (пока не реализуем таймаут, но оставляем возможность)
        })
        .catch((err) => {
          console.error('FFmpeg import error:', err);
          resolve(false);
        });
    } catch (error) {
      console.error('Concatenate videos error:', error);
      resolve(false);
    }
  });
}

// Путь к папке с персональными видео (используем storage для записи)
export function getPersonalVideoPath(orderId: number): string {
  const personalDir = path.join(VIDEO_STORAGE_PATH, 'personal');
  if (!fs.existsSync(personalDir)) {
    fs.mkdirSync(personalDir, { recursive: true });
  }
  return path.join(personalDir, `personal_${orderId}.mp4`);
}

// Путь к финальному склеенному видео (используем storage для записи)
export function getFinalVideoPath(orderId: number): string {
  const finalDir = path.join(VIDEO_STORAGE_PATH, 'final');
  if (!fs.existsSync(finalDir)) {
    fs.mkdirSync(finalDir, { recursive: true });
  }
  return path.join(finalDir, `final_${orderId}.mp4`);
}

// Удаление фотографий заказа после успешной генерации
export function deleteOrderPhotos(orderId: number): void {
  try {
    const imagesDir = path.join(VIDEO_STORAGE_PATH, 'images');
    if (!fs.existsSync(imagesDir)) {
      return;
    }

    // Ищем и удаляем фотографии для этого заказа
    const photoPatterns = [
      `photo1_order${orderId}.jpg`,
      `photo1_order${orderId}.png`,
      `photo2_order${orderId}.jpg`,
      `photo2_order${orderId}.png`,
    ];

    let deletedCount = 0;
    for (const fileName of photoPatterns) {
      const filePath = path.join(imagesDir, fileName);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          console.log(`🗑️ Deleted photo: ${fileName}`);
          deletedCount++;
        } catch (error) {
          console.error(`Error deleting photo ${fileName}:`, error);
        }
      }
    }

    if (deletedCount > 0) {
      console.log(`✅ Deleted ${deletedCount} photo(s) for order ${orderId}`);
    } else {
      console.log(`ℹ️ No photos found to delete for order ${orderId}`);
    }
  } catch (error) {
    console.error(`Error deleting photos for order ${orderId}:`, error);
  }
}

// Удаление персонального видео после успешной генерации финального видео
export function deletePersonalVideo(orderId: number): void {
  try {
    const personalPath = getPersonalVideoPath(orderId);
    if (fs.existsSync(personalPath)) {
      fs.unlinkSync(personalPath);
      console.log(`🗑️ Deleted personal video: ${personalPath}`);
      console.log(`✅ Personal video deleted for order ${orderId}`);
    } else {
      console.log(`ℹ️ Personal video not found for order ${orderId}, nothing to delete`);
    }
  } catch (error) {
    console.error(`Error deleting personal video for order ${orderId}:`, error);
  }
}
