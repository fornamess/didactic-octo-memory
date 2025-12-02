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

// Создание задания на генерацию видео
export async function createVideoTask(
  prompt: string,
  customerId: string
): Promise<GenerationResult> {
  try {
    if (!YES_AI_TOKEN) {
      console.error('YES_AI_TOKEN not configured');
      return { success: false, error: 'API токен не настроен' };
    }

    const response = await fetch(`${YES_AI_API_BASE}/yesvideo/aniimage/sora`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${YES_AI_TOKEN}`,
      },
      body: JSON.stringify({
        version: 2,
        prompt: prompt,
        customer_id: customerId,
        resolution: 720,
        dimensions: '16:9',
        duration: 15, // Максимально доступное значение (10 или 15 секунд)
        effect_id: 0,
      }),
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

    const result: StatusResult = {
      success: true,
      status: animationData.status_description,
      videoUrl: animationData.result_url || undefined,
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
  photo2Comment: string
): string {
  return `Дед Мороз в красной шубе сидит в уютной комнате с ёлкой. Он смотрит в камеру и произносит слова, обращаясь к ребёнку по имени ${childName}. В кадре появляется мягкое сияние, показывающее воспоминание о ребёнке - "${photo1Comment}". Затем плавный снежный переход к другому моменту - "${photo2Comment}". Дед Мороз улыбается с теплотой и гордостью. Атмосфера волшебная, персональная, тёплая. Качество видео высокое.`;
}

// Генерация универсального интро (вызывается если файла нет)
export async function generateIntroVideo(customerId: string): Promise<GenerationResult> {
  console.log('Generating intro video...');
  return createVideoTask(VIDEO_PROMPTS.intro, customerId);
}

// Генерация универсального финала (вызывается если файла нет)
export async function generateOutroVideo(customerId: string): Promise<GenerationResult> {
  console.log('Generating outro video...');
  return createVideoTask(VIDEO_PROMPTS.outro, customerId);
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

// Склейка видео с помощью ffmpeg
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

          // Создаём временный файл со списком видео для конкатенации
          const listPath = path.join(path.dirname(outputPath), `concat_list_${Date.now()}.txt`);
          const listContent = `file '${introPath.replace(/\\/g, '/')}'
file '${personalPath.replace(/\\/g, '/')}'
file '${outroPath.replace(/\\/g, '/')}'`;

          console.log('Concat list content:\n', listContent);
          fs.writeFileSync(listPath, listContent);

          // Пробуем сначала конкатенацию без перекодирования (copy codec) - быстрее и надежнее
          // Если это не сработает из-за разных параметров видео, используем перекодирование
          ffmpeg()
            .input(listPath)
            .inputOptions(['-f', 'concat', '-safe', '0'])
            .outputOptions([
              '-c',
              'copy', // Копируем потоки без перекодирования - быстрее и надежнее
              '-y', // Перезаписывать выходной файл
            ])
            .output(outputPath)
            .on('start', (commandLine) => {
              console.log('FFmpeg started with command (copy mode):', commandLine);
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
                console.log(`Concatenation progress: ${Math.round(progress.percent)}%`);
              }
            })
            .on('end', () => {
              // Проверяем что выходной файл создан и имеет адекватный размер
              if (fs.existsSync(outputPath)) {
                const outputSize = fs.statSync(outputPath).size;
                console.log(
                  'Video concatenation completed (copy mode):',
                  outputPath,
                  'size:',
                  outputSize
                );

                // Проверяем что файл не слишком маленький (не был прерван)
                const expectedMinSize = (introSize + personalSize + outroSize) * 0.5;
                if (outputSize < expectedMinSize) {
                  console.error(
                    `Warning: Output file size (${outputSize}) is too small, expected at least ${expectedMinSize}`
                  );
                  // Удаляем некорректный файл и пробуем перекодирование
                  try {
                    fs.unlinkSync(outputPath);
                  } catch (e) {
                    console.error('Failed to delete incorrect output file:', e);
                  }

                  // Пробуем перекодирование как fallback
                  console.log('🔄 Copy mode produced small file, trying re-encoding mode...');
                  const listPath2 = path.join(
                    path.dirname(outputPath),
                    `concat_list_${Date.now()}.txt`
                  );
                  const listContent2 = `file '${introPath.replace(/\\/g, '/')}'
file '${personalPath.replace(/\\/g, '/')}'
file '${outroPath.replace(/\\/g, '/')}'`;
                  fs.writeFileSync(listPath2, listContent2);

                  ffmpeg()
                    .input(listPath2)
                    .inputOptions(['-f', 'concat', '-safe', '0'])
                    .outputOptions([
                      '-c:v',
                      'libx264',
                      '-c:a',
                      'aac',
                      '-preset',
                      'ultrafast',
                      '-crf',
                      '28',
                      '-threads',
                      '2',
                      '-y',
                    ])
                    .output(outputPath)
                    .on('start', (commandLine) => {
                      console.log('FFmpeg started with command (re-encode mode):', commandLine);
                    })
                    .on('stderr', (stderrLine) => {
                      if (
                        stderrLine.includes('error') ||
                        stderrLine.includes('Error') ||
                        stderrLine.includes('killed') ||
                        stderrLine.includes('frame=') ||
                        stderrLine.includes('time=')
                      ) {
                        console.log('FFmpeg stderr (re-encode):', stderrLine);
                      }
                    })
                    .on('progress', (progress) => {
                      if (progress.percent) {
                        console.log(`Re-encoding progress: ${Math.round(progress.percent)}%`);
                      }
                    })
                    .on('end', () => {
                      if (fs.existsSync(listPath2)) {
                        fs.unlinkSync(listPath2);
                      }
                      if (fs.existsSync(listPath)) {
                        fs.unlinkSync(listPath);
                      }

                      if (fs.existsSync(outputPath)) {
                        const outputSize2 = fs.statSync(outputPath).size;
                        console.log(
                          'Video concatenation completed (re-encode):',
                          outputPath,
                          'size:',
                          outputSize2
                        );
                        const expectedMinSize2 = (introSize + personalSize + outroSize) * 0.5;
                        if (outputSize2 < expectedMinSize2) {
                          console.error(
                            `Warning: Output file size (${outputSize2}) is too small, expected at least ${expectedMinSize2}`
                          );
                          try {
                            fs.unlinkSync(outputPath);
                          } catch (e) {
                            console.error('Failed to delete incorrect output file:', e);
                          }
                          resolve(false);
                          return;
                        }
                        resolve(true);
                      } else {
                        console.error('Output file was not created (re-encode):', outputPath);
                        resolve(false);
                      }
                    })
                    .on('error', (err2: Error, stdout2, stderr2) => {
                      console.error('FFmpeg error (re-encode mode):', err2.message);
                      console.error('FFmpeg stdout:', stdout2);
                      console.error('FFmpeg stderr:', stderr2);
                      if (fs.existsSync(listPath2)) {
                        fs.unlinkSync(listPath2);
                      }
                      if (fs.existsSync(listPath)) {
                        fs.unlinkSync(listPath);
                      }
                      if (fs.existsSync(outputPath)) {
                        try {
                          fs.unlinkSync(outputPath);
                        } catch (e) {
                          console.error('Error deleting output file:', e);
                        }
                      }
                      resolve(false);
                    })
                    .run();
                  return;
                }

                // Удаляем временный файл при успехе
                if (fs.existsSync(listPath)) {
                  fs.unlinkSync(listPath);
                }
                resolve(true);
              } else {
                console.error('Output file was not created (copy mode):', outputPath);
                // Пробуем перекодирование
                console.log('🔄 Copy mode did not create file, trying re-encoding mode...');
                const listPath2 = path.join(
                  path.dirname(outputPath),
                  `concat_list_${Date.now()}.txt`
                );
                const listContent2 = `file '${introPath.replace(/\\/g, '/')}'
file '${personalPath.replace(/\\/g, '/')}'
file '${outroPath.replace(/\\/g, '/')}'`;
                fs.writeFileSync(listPath2, listContent2);

                ffmpeg()
                  .input(listPath2)
                  .inputOptions(['-f', 'concat', '-safe', '0'])
                  .outputOptions([
                    '-c:v',
                    'libx264',
                    '-c:a',
                    'aac',
                    '-preset',
                    'ultrafast',
                    '-crf',
                    '28',
                    '-threads',
                    '2',
                    '-y',
                  ])
                  .output(outputPath)
                  .on('start', (commandLine) => {
                    console.log('FFmpeg started with command (re-encode mode):', commandLine);
                  })
                  .on('stderr', (stderrLine) => {
                    if (
                      stderrLine.includes('error') ||
                      stderrLine.includes('Error') ||
                      stderrLine.includes('killed') ||
                      stderrLine.includes('frame=') ||
                      stderrLine.includes('time=')
                    ) {
                      console.log('FFmpeg stderr (re-encode):', stderrLine);
                    }
                  })
                  .on('progress', (progress) => {
                    if (progress.percent) {
                      console.log(`Re-encoding progress: ${Math.round(progress.percent)}%`);
                    }
                  })
                  .on('end', () => {
                    if (fs.existsSync(listPath2)) {
                      fs.unlinkSync(listPath2);
                    }
                    if (fs.existsSync(listPath)) {
                      fs.unlinkSync(listPath);
                    }

                    if (fs.existsSync(outputPath)) {
                      const outputSize2 = fs.statSync(outputPath).size;
                      console.log(
                        'Video concatenation completed (re-encode):',
                        outputPath,
                        'size:',
                        outputSize2
                      );
                      const expectedMinSize2 = (introSize + personalSize + outroSize) * 0.5;
                      if (outputSize2 < expectedMinSize2) {
                        console.error(
                          `Warning: Output file size (${outputSize2}) is too small, expected at least ${expectedMinSize2}`
                        );
                        try {
                          fs.unlinkSync(outputPath);
                        } catch (e) {
                          console.error('Failed to delete incorrect output file:', e);
                        }
                        resolve(false);
                        return;
                      }
                      resolve(true);
                    } else {
                      console.error('Output file was not created (re-encode):', outputPath);
                      resolve(false);
                    }
                  })
                  .on('error', (err2: Error, stdout2, stderr2) => {
                    console.error('FFmpeg error (re-encode mode):', err2.message);
                    console.error('FFmpeg stdout:', stdout2);
                    console.error('FFmpeg stderr:', stderr2);
                    if (fs.existsSync(listPath2)) {
                      fs.unlinkSync(listPath2);
                    }
                    if (fs.existsSync(listPath)) {
                      fs.unlinkSync(listPath);
                    }
                    if (fs.existsSync(outputPath)) {
                      try {
                        fs.unlinkSync(outputPath);
                      } catch (e) {
                        console.error('Error deleting output file:', e);
                      }
                    }
                    resolve(false);
                  })
                  .run();
              }
            })
            .on('error', (err: Error, stdout, stderr) => {
              console.error('FFmpeg error (copy mode):', err.message);
              if (err.message.includes('killed') || err.message.includes('SIGKILL')) {
                console.error('⚠️ FFmpeg was killed by system (likely out of memory/timeout)');
              }
              console.error('FFmpeg stdout:', stdout);
              console.error('FFmpeg stderr:', stderr);

              // Удаляем некорректный выходной файл если он существует
              if (fs.existsSync(outputPath)) {
                try {
                  fs.unlinkSync(outputPath);
                } catch (e) {
                  console.error('Error deleting output file:', e);
                }
              }

              // Пробуем перекодирование как fallback
              console.log('🔄 Copy mode failed, trying re-encoding mode...');
              const listPath2 = path.join(
                path.dirname(outputPath),
                `concat_list_${Date.now()}.txt`
              );
              const listContent2 = `file '${introPath.replace(/\\/g, '/')}'
file '${personalPath.replace(/\\/g, '/')}'
file '${outroPath.replace(/\\/g, '/')}'`;
              fs.writeFileSync(listPath2, listContent2);

              ffmpeg()
                .input(listPath2)
                .inputOptions(['-f', 'concat', '-safe', '0'])
                .outputOptions([
                  '-c:v',
                  'libx264',
                  '-c:a',
                  'aac',
                  '-preset',
                  'ultrafast',
                  '-crf',
                  '28',
                  '-threads',
                  '2',
                  '-y',
                ])
                .output(outputPath)
                .on('start', (commandLine) => {
                  console.log('FFmpeg started with command (re-encode mode):', commandLine);
                })
                .on('stderr', (stderrLine) => {
                  if (
                    stderrLine.includes('error') ||
                    stderrLine.includes('Error') ||
                    stderrLine.includes('killed') ||
                    stderrLine.includes('frame=') ||
                    stderrLine.includes('time=')
                  ) {
                    console.log('FFmpeg stderr (re-encode):', stderrLine);
                  }
                })
                .on('progress', (progress) => {
                  if (progress.percent) {
                    console.log(`Re-encoding progress: ${Math.round(progress.percent)}%`);
                  }
                })
                .on('end', () => {
                  if (fs.existsSync(listPath2)) {
                    fs.unlinkSync(listPath2);
                  }
                  if (fs.existsSync(listPath)) {
                    fs.unlinkSync(listPath);
                  }

                  if (fs.existsSync(outputPath)) {
                    const outputSize = fs.statSync(outputPath).size;
                    console.log(
                      'Video concatenation completed (re-encode):',
                      outputPath,
                      'size:',
                      outputSize
                    );
                    const expectedMinSize = (introSize + personalSize + outroSize) * 0.5;
                    if (outputSize < expectedMinSize) {
                      console.error(
                        `Warning: Output file size (${outputSize}) is too small, expected at least ${expectedMinSize}`
                      );
                      try {
                        fs.unlinkSync(outputPath);
                      } catch (e) {
                        console.error('Failed to delete incorrect output file:', e);
                      }
                      resolve(false);
                      return;
                    }
                    resolve(true);
                  } else {
                    console.error('Output file was not created (re-encode):', outputPath);
                    resolve(false);
                  }
                })
                .on('error', (err2: Error, stdout2, stderr2) => {
                  console.error('FFmpeg error (re-encode mode):', err2.message);
                  console.error('FFmpeg stdout:', stdout2);
                  console.error('FFmpeg stderr:', stderr2);
                  if (fs.existsSync(listPath2)) {
                    fs.unlinkSync(listPath2);
                  }
                  if (fs.existsSync(listPath)) {
                    fs.unlinkSync(listPath);
                  }
                  if (fs.existsSync(outputPath)) {
                    try {
                      fs.unlinkSync(outputPath);
                    } catch (e) {
                      console.error('Error deleting output file:', e);
                    }
                  }
                  resolve(false);
                })
                .run();
            })
            .run();

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
