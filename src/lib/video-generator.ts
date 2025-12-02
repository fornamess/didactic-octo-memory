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
function ensureVideoStorage() {
  const storageDirs = [
    VIDEO_STORAGE_PATH,
    path.join(VIDEO_STORAGE_PATH, 'intro'),
    path.join(VIDEO_STORAGE_PATH, 'outro'),
    path.join(VIDEO_STORAGE_PATH, 'personal'),
    path.join(VIDEO_STORAGE_PATH, 'final'),
    path.join(VIDEO_STORAGE_PATH, 'locks'), // Для файл-локов
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

ensureVideoStorage();

const INTRO_PATH = path.join(VIDEO_STORAGE_PATH, 'intro.mp4');
const OUTRO_PATH = path.join(VIDEO_STORAGE_PATH, 'outro.mp4');
const LOCK_DIR = path.join(VIDEO_STORAGE_PATH, 'locks');

// ============== ФАЙЛОВАЯ БЛОКИРОВКА ==============

// Глобальный лок для FFmpeg - только ОДИН процесс на сервере
const GLOBAL_FFMPEG_LOCK = path.join(LOCK_DIR, 'ffmpeg_global.lock');
const LOCK_TIMEOUT_MS = 10 * 60 * 1000; // 10 минут макс на одно видео

function acquireGlobalLock(): boolean {
  try {
    // Проверяем существующий лок
    if (fs.existsSync(GLOBAL_FFMPEG_LOCK)) {
      const lockData = fs.readFileSync(GLOBAL_FFMPEG_LOCK, 'utf8');
      const lockTime = parseInt(lockData, 10);

      // Если лок старше 10 минут - удаляем (процесс умер)
      if (Date.now() - lockTime > LOCK_TIMEOUT_MS) {
        console.log('⚠️ Removing stale FFmpeg lock');
        fs.unlinkSync(GLOBAL_FFMPEG_LOCK);
      } else {
        console.log('🔒 FFmpeg lock held by another process');
        return false;
      }
    }

    // Создаём лок атомарно (wx = exclusive)
    fs.writeFileSync(GLOBAL_FFMPEG_LOCK, Date.now().toString(), { flag: 'wx' });
    console.log('🔓 Acquired FFmpeg lock');
    return true;
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'EEXIST') {
      console.log('🔒 FFmpeg lock already exists');
      return false;
    }
    console.error('Lock error:', error);
    return false;
  }
}

function releaseGlobalLock(): void {
  try {
    if (fs.existsSync(GLOBAL_FFMPEG_LOCK)) {
      fs.unlinkSync(GLOBAL_FFMPEG_LOCK);
      console.log('🔓 Released FFmpeg lock');
    }
  } catch (error) {
    console.error('Error releasing lock:', error);
  }
}

// Лок для конкретного файла (предотвращает повторную обработку того же заказа)
function getFileLockPath(outputPath: string): string {
  const hash = Buffer.from(outputPath).toString('base64').replace(/[/+=]/g, '_');
  return path.join(LOCK_DIR, `file_${hash}.lock`);
}

function isFileLocked(outputPath: string): boolean {
  const lockPath = getFileLockPath(outputPath);
  if (fs.existsSync(lockPath)) {
    try {
      const lockTime = parseInt(fs.readFileSync(lockPath, 'utf8'), 10);
      if (Date.now() - lockTime > LOCK_TIMEOUT_MS) {
        fs.unlinkSync(lockPath);
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

function setFileLock(outputPath: string): void {
  const lockPath = getFileLockPath(outputPath);
  fs.writeFileSync(lockPath, Date.now().toString());
}

function removeFileLock(outputPath: string): void {
  const lockPath = getFileLockPath(outputPath);
  try {
    if (fs.existsSync(lockPath)) {
      fs.unlinkSync(lockPath);
    }
  } catch {}
}

// ============== ИНТЕРФЕЙСЫ ==============

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

// ============== API ФУНКЦИИ ==============

export function checkUniversalVideosExist(): { intro: boolean; outro: boolean } {
  return {
    intro: fs.existsSync(INTRO_PATH),
    outro: fs.existsSync(OUTRO_PATH),
  };
}

export async function createVideoTask(
  prompt: string,
  customerId: string,
  options?: {
    imageUrl?: string;
    resolution?: number;
    dimensions?: string;
    duration?: number;
    effectId?: number;
  }
): Promise<GenerationResult> {
  try {
    if (!YES_AI_TOKEN) {
      console.error('YES_AI_TOKEN not configured');
      return { success: false, error: 'API токен не настроен' };
    }

    const resolution = options?.resolution || 720;
    const dimensions = options?.dimensions || '16:9';
    const duration = options?.duration || 15;
    const effectId = options?.effectId || 0;

    const requestBody: {
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
      resolution: resolution,
      dimensions: dimensions,
      duration: duration,
      effect_id: effectId,
      version: 2,
    };

    if (options?.imageUrl) {
      requestBody.image_url = options.imageUrl;
    }

    console.log('Creating video task:', { customerId, resolution, dimensions, duration });

    const response = await fetch(`${YES_AI_API_BASE}/yesvideo/aniimage/sora`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${YES_AI_TOKEN}`,
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    if (!data.success) {
      // Fallback логика если параметры не поддерживаются
      if (data.message === 'PARAMETERS_IS_NOT_ALLOWED') {
        return await createVideoTaskFallback(prompt, customerId, options, data);
      }

      // Fallback без изображения
      if (data.message === 'IMAGE_NOT_FOUND' || data.message === 'IMAGE_FILE_SIZE_NOT_VALID') {
        delete requestBody.image_url;
        const retryResponse = await fetch(`${YES_AI_API_BASE}/yesvideo/aniimage/sora`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${YES_AI_TOKEN}`,
          },
          body: JSON.stringify(requestBody),
        });
        const retryData = await retryResponse.json();
        if (retryData.success) {
          return { success: true, taskId: retryData.results?.animation_data?.id };
        }
      }

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

async function createVideoTaskFallback(
  prompt: string,
  customerId: string,
  options:
    | {
        imageUrl?: string;
        resolution?: number;
        dimensions?: string;
        duration?: number;
        effectId?: number;
      }
    | undefined,
  errorData: {
    details?: {
      version_parameters?: {
        sora_resolutions?: number[];
        sora_dimensions?: string[];
        sora_durations?: number[];
      };
    };
  }
): Promise<GenerationResult> {
  const versionParams = errorData.details?.version_parameters;
  const availableResolutions = versionParams?.sora_resolutions || [720];
  const availableDimensions = versionParams?.sora_dimensions || ['16:9'];
  const availableDurations = versionParams?.sora_durations || [10, 15];

  const fallbackBody: {
    prompt: string;
    customer_id: string;
    resolution: number;
    dimensions: string;
    duration: number;
    effect_id: number;
    version: number;
  } = {
    prompt,
    customer_id: customerId,
    resolution: availableResolutions[availableResolutions.length - 1],
    dimensions: availableDimensions[0],
    duration: availableDurations[availableDurations.length - 1],
    effect_id: 0,
    version: 2,
  };

  const response = await fetch(`${YES_AI_API_BASE}/yesvideo/aniimage/sora`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${YES_AI_TOKEN}`,
    },
    body: JSON.stringify(fallbackBody),
  });

  const data = await response.json();
  if (!data.success) {
    return { success: false, error: data.message };
  }

  return { success: true, taskId: data.results?.animation_data?.id };
}

// Кэш статусов
const statusCache = new Map<number, { result: StatusResult; timestamp: number }>();
const STATUS_CACHE_TTL = 5000;
const MIN_REQUEST_INTERVAL = 2000;
let lastRequestTime = 0;

export async function checkTaskStatus(taskId: number): Promise<StatusResult> {
  try {
    if (!YES_AI_TOKEN) {
      return { success: false, status: 'error', error: 'API токен не настроен' };
    }

    const cached = statusCache.get(taskId);
    if (cached && Date.now() - cached.timestamp < STATUS_CACHE_TTL) {
      return cached.result;
    }

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

    if (!data.success) {
      const result: StatusResult = { success: false, status: 'error', error: data.message };
      statusCache.set(taskId, { result, timestamp: Date.now() });
      return result;
    }

    const animationData = data.results?.animation_data;
    if (!animationData) {
      const result: StatusResult = { success: false, status: 'error', error: 'Данные не найдены' };
      statusCache.set(taskId, { result, timestamp: Date.now() });
      return result;
    }

    const statusDescription = animationData.status_description || '';
    const isRejected = statusDescription.includes('rejected');

    const result: StatusResult = {
      success: true,
      status: statusDescription,
      videoUrl: animationData.result_url || undefined,
      error: isRejected ? animationData.error_message || 'Видео отклонено' : undefined,
    };

    statusCache.set(taskId, { result, timestamp: Date.now() });
    return result;
  } catch (error) {
    console.error('Check task status error:', error);
    return { success: false, status: 'error', error: 'Ошибка проверки статуса' };
  }
}

export async function downloadVideo(url: string, savePath: string): Promise<boolean> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to download video');
    }

    const buffer = await response.arrayBuffer();
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

// ============== ГЕНЕРАЦИЯ ПРОМПТОВ ==============

export function generatePersonalPrompt(
  childName: string,
  photo1Comment: string,
  photo2Comment: string,
  childAge?: number
): string {
  const ageText = childAge ? `, которому ${childAge} ${getAgeWord(childAge)}` : '';
  return `Дед Мороз в красной шубе сидит в уютной комнате с ёлкой. Он смотрит в камеру и произносит слова, обращаясь к ребёнку по имени ${childName}${ageText}. В кадре появляется мягкое сияние, показывающее воспоминание о ребёнке - "${photo1Comment}". Затем плавный снежный переход к другому моменту - "${photo2Comment}". Дед Мороз улыбается с теплотой и гордостью. Атмосфера волшебная, персональная, тёплая. Качество видео высокое, кинематографичное.`;
}

function getAgeWord(age: number): string {
  const lastDigit = age % 10;
  const lastTwoDigits = age % 100;
  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return 'лет';
  if (lastDigit === 1) return 'год';
  if (lastDigit >= 2 && lastDigit <= 4) return 'года';
  return 'лет';
}

export async function generateIntroVideo(customerId: string): Promise<GenerationResult> {
  return createVideoTask(VIDEO_PROMPTS.intro, customerId, {
    resolution: 720,
    dimensions: '16:9',
    duration: 15,
    effectId: 0,
  });
}

export async function generateOutroVideo(customerId: string): Promise<GenerationResult> {
  return createVideoTask(VIDEO_PROMPTS.outro, customerId, {
    resolution: 720,
    dimensions: '16:9',
    duration: 15,
    effectId: 0,
  });
}

export async function saveIntroVideo(videoUrl: string): Promise<boolean> {
  return downloadVideo(videoUrl, INTRO_PATH);
}

export async function saveOutroVideo(videoUrl: string): Promise<boolean> {
  return downloadVideo(videoUrl, OUTRO_PATH);
}

export function getUniversalVideoPaths() {
  const introExists = fs.existsSync(INTRO_PATH);
  const outroExists = fs.existsSync(OUTRO_PATH);

  return {
    intro: INTRO_PATH,
    outro: OUTRO_PATH,
    introPublic: '/videos/intro.mp4',
    outroPublic: '/videos/outro.mp4',
    introExists,
    outroExists,
  };
}

// ============== СКЛЕЙКА ВИДЕО (ОПТИМИЗИРОВАННАЯ) ==============

export async function concatenateVideos(
  introPath: string,
  personalPath: string,
  outroPath: string,
  outputPath: string
): Promise<boolean> {
  // Проверка что файл уже обрабатывается
  if (isFileLocked(outputPath)) {
    console.log(`⏳ File ${outputPath} is already being processed, skipping`);
    return false;
  }

  // Пробуем получить глобальный лок FFmpeg
  if (!acquireGlobalLock()) {
    console.log('⏳ Another FFmpeg process is running, will retry later');
    return false;
  }

  setFileLock(outputPath);

  try {
    // Проверяем входные файлы
    if (!fs.existsSync(introPath)) {
      console.error('Intro video not found:', introPath);
      releaseGlobalLock();
      removeFileLock(outputPath);
      return false;
    }
    if (!fs.existsSync(personalPath)) {
      console.error('Personal video not found:', personalPath);
      releaseGlobalLock();
      removeFileLock(outputPath);
      return false;
    }
    if (!fs.existsSync(outroPath)) {
      console.error('Outro video not found:', outroPath);
      releaseGlobalLock();
      removeFileLock(outputPath);
      return false;
    }

    const introSize = fs.statSync(introPath).size;
    const personalSize = fs.statSync(personalPath).size;
    const outroSize = fs.statSync(outroPath).size;

    console.log('=== Starting Video Concatenation ===');
    console.log(`Intro: ${(introSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Personal: ${(personalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Outro: ${(outroSize / 1024 / 1024).toFixed(2)} MB`);

    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Динамический импорт fluent-ffmpeg
    const ffmpegModule = await import('fluent-ffmpeg');
    const ffmpeg = ffmpegModule.default;

    ffmpeg.setFfmpegPath(FFMPEG_PATH);

    // Получаем длительность видео
    const getVideoDuration = (videoPath: string): Promise<number> => {
      return new Promise((resolve) => {
        ffmpeg.ffprobe(
          videoPath,
          (err: Error | null, metadata?: { format?: { duration?: number } }) => {
            if (err || !metadata?.format?.duration) {
              resolve(15);
            } else {
              resolve(metadata.format.duration);
            }
          }
        );
      });
    };

    const [introDuration, personalDuration, outroDuration] = await Promise.all([
      getVideoDuration(introPath),
      getVideoDuration(personalPath),
      getVideoDuration(outroPath),
    ]);

    console.log(
      `Durations - Intro: ${introDuration}s, Personal: ${personalDuration}s, Outro: ${outroDuration}s`
    );

    // Используем более короткий fade для экономии памяти
    const fadeDuration = 1.0; // Было 2.0, теперь 1.0
    const introFadeOutStart = Math.max(0, introDuration - fadeDuration);
    const personalFadeOutStart = Math.max(0, personalDuration - fadeDuration);

    // ОПТИМИЗИРОВАННЫЙ фильтр - меньше потребление памяти
    const filterComplex = [
      `[0:v]fade=t=out:st=${introFadeOutStart}:d=${fadeDuration}[v0]`,
      `[1:v]fade=t=in:st=0:d=${fadeDuration},fade=t=out:st=${personalFadeOutStart}:d=${fadeDuration}[v1]`,
      `[2:v]fade=t=in:st=0:d=${fadeDuration}[v2]`,
      `[v0][v1][v2]concat=n=3:v=1:a=0[outv]`,
      `[0:a][1:a][2:a]concat=n=3:v=0:a=1[outa]`,
    ].join('; ');

    return new Promise((resolve) => {
      const ffmpegCommand = ffmpeg()
        .input(introPath)
        .input(personalPath)
        .input(outroPath)
        .complexFilter(filterComplex)
        .outputOptions([
          '-map',
          '[outv]',
          '-map',
          '[outa]',
          '-c:v',
          'libx264',
          '-c:a',
          'aac',
          '-b:a',
          '128k', // Было 192k - снизили
          '-preset',
          'ultrafast', // Максимально быстрый пресет
          '-crf',
          '28', // Больше сжатие, меньше память
          '-pix_fmt',
          'yuv420p',
          '-threads',
          '1', // ОДИН поток - критично для 1GB RAM
          '-max_muxing_queue_size',
          '512', // Предотвращает переполнение буфера
          '-y',
        ])
        .output(outputPath);

      let lastProgress = 0;

      ffmpegCommand
        .on('start', () => {
          console.log('FFmpeg started (low-memory mode)');
        })
        .on('progress', (progress) => {
          const percent = Math.round(progress.percent || 0);
          if (percent > lastProgress + 10) {
            console.log(`Progress: ${percent}%`);
            lastProgress = percent;
          }
        })
        .on('end', () => {
          releaseGlobalLock();
          removeFileLock(outputPath);

          if (fs.existsSync(outputPath)) {
            const outputSize = fs.statSync(outputPath).size;
            const totalInput = introSize + personalSize + outroSize;

            // ИСПРАВЛЕННАЯ ВАЛИДАЦИЯ
            // При CRF 28 и ultrafast выходной файл может быть 30-60% от входного
            const minExpectedSize = totalInput * 0.25; // 25% минимум
            const maxExpectedSize = totalInput * 1.5; // 150% максимум

            console.log(`Output: ${(outputSize / 1024 / 1024).toFixed(2)} MB`);
            console.log(
              `Expected range: ${(minExpectedSize / 1024 / 1024).toFixed(2)} - ${(
                maxExpectedSize /
                1024 /
                1024
              ).toFixed(2)} MB`
            );

            if (outputSize < minExpectedSize) {
              console.error('❌ Output file too small, likely corrupted');
              try {
                fs.unlinkSync(outputPath);
              } catch {}
              resolve(false);
            } else if (outputSize < 1024 * 1024) {
              // Меньше 1MB точно битый
              console.error('❌ Output file suspiciously small (<1MB)');
              try {
                fs.unlinkSync(outputPath);
              } catch {}
              resolve(false);
            } else {
              console.log('✅ Video concatenation successful');
              resolve(true);
            }
          } else {
            console.error('❌ Output file not created');
            resolve(false);
          }
        })
        .on('error', (err: Error) => {
          releaseGlobalLock();
          removeFileLock(outputPath);

          console.error('FFmpeg error:', err.message);

          if (err.message.includes('SIGKILL') || err.message.includes('killed')) {
            console.error('⚠️ FFmpeg killed by system - OUT OF MEMORY');
            console.error('Consider upgrading server RAM or using simpler video processing');
          }

          // Проверяем может файл всё же создался
          if (fs.existsSync(outputPath)) {
            const outputSize = fs.statSync(outputPath).size;
            if (outputSize > 5 * 1024 * 1024) {
              // > 5MB
              console.log(
                '⚠️ File exists despite error, size:',
                (outputSize / 1024 / 1024).toFixed(2),
                'MB'
              );
              // Возможно ошибка была в финализации, но файл валидный
              resolve(true);
              return;
            }
            try {
              fs.unlinkSync(outputPath);
            } catch {}
          }

          resolve(false);
        })
        .run();
    });
  } catch (error) {
    releaseGlobalLock();
    removeFileLock(outputPath);
    console.error('Concatenate videos error:', error);
    return false;
  }
}

// ============== ПУТИ К ФАЙЛАМ ==============

export function getPersonalVideoPath(orderId: number): string {
  const personalDir = path.join(VIDEO_STORAGE_PATH, 'personal');
  if (!fs.existsSync(personalDir)) {
    fs.mkdirSync(personalDir, { recursive: true });
  }
  return path.join(personalDir, `personal_${orderId}.mp4`);
}

export function getFinalVideoPath(orderId: number): string {
  const finalDir = path.join(VIDEO_STORAGE_PATH, 'final');
  if (!fs.existsSync(finalDir)) {
    fs.mkdirSync(finalDir, { recursive: true });
  }
  return path.join(finalDir, `final_${orderId}.mp4`);
}

// ============== ОЧИСТКА ==============

export function deleteOrderPhotos(orderId: number): void {
  try {
    const imagesDir = path.join(VIDEO_STORAGE_PATH, 'images');
    if (!fs.existsSync(imagesDir)) return;

    const photoPatterns = [
      `photo1_order${orderId}.jpg`,
      `photo1_order${orderId}.png`,
      `photo2_order${orderId}.jpg`,
      `photo2_order${orderId}.png`,
    ];

    for (const fileName of photoPatterns) {
      const filePath = path.join(imagesDir, fileName);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          console.log(`🗑️ Deleted: ${fileName}`);
        } catch {}
      }
    }
  } catch (error) {
    console.error(`Error deleting photos for order ${orderId}:`, error);
  }
}

export function deletePersonalVideo(orderId: number): void {
  try {
    const personalPath = getPersonalVideoPath(orderId);
    if (fs.existsSync(personalPath)) {
      fs.unlinkSync(personalPath);
      console.log(`🗑️ Deleted personal video for order ${orderId}`);
    }
  } catch (error) {
    console.error(`Error deleting personal video for order ${orderId}:`, error);
  }
}

// ============== ЭКСПОРТ ХЕЛПЕРОВ ДЛЯ ОТЛАДКИ ==============

export function getFFmpegLockStatus(): { globalLocked: boolean; lockAge?: number } {
  if (fs.existsSync(GLOBAL_FFMPEG_LOCK)) {
    try {
      const lockTime = parseInt(fs.readFileSync(GLOBAL_FFMPEG_LOCK, 'utf8'), 10);
      return { globalLocked: true, lockAge: Date.now() - lockTime };
    } catch {
      return { globalLocked: true };
    }
  }
  return { globalLocked: false };
}

export function forceReleaseFFmpegLock(): void {
  releaseGlobalLock();
  console.log('⚠️ Force released FFmpeg lock');
}
